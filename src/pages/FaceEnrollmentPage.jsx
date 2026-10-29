import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, Camera, RefreshCw, CheckCircle2, AlertCircle, 
  ShieldCheck, Sparkles, Eye, UserCheck 
} from 'lucide-react';
import api from '../services/api';
import { 
  loadFaceModels, 
  detectSingleFaceWithDescriptor, 
  checkBlink 
} from '../services/faceService';

export default function FaceEnrollmentPage({ user, onBack, onSuccess }) {
  const [modelLoading, setModelLoading] = useState(true);
  const [cameraLoading, setCameraLoading] = useState(true);
  const [cameraError, setCameraError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [submitPhase, setSubmitPhase] = useState('uploading'); // 'uploading' | 'fallback' | 'done'

  // Status proses pendaftaran: 'posisikan_wajah' | 'berkedip' | 'memproses' | 'selesai'
  const [enrollStep, setEnrollStep] = useState('posisikan_wajah');
  const [guideText, setGuideText] = useState('Posisikan wajah Anda tepat di dalam lingkaran oval');
  const [detectedConfidence, setDetectedConfidence] = useState(0);
  const [canCapture, setCanCapture] = useState(false);
  const [isEyeClosed, setIsEyeClosed] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const isScanningRef = useRef(false);
  const hasBlinkedRef = useRef(false);
  const eyeWasOpenRef = useRef(false);
  const lastDescriptorRef = useRef(null);
  const scanIntervalRef = useRef(null);

  // 1. Inisialisasi Model AI & Kamera
  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        setGuideText('Memuat modul biometrik AI lokal...');
        await loadFaceModels();
        if (!isMounted) return;
        setModelLoading(false);
        await startCamera();
      } catch (err) {
        console.error('Inisialisasi error:', err);
        if (isMounted) {
          setCameraError('Gagal memuat sistem biometrik. Pastikan koneksi atau peramban mendukung WebGL.');
          setModelLoading(false);
          setCameraLoading(false);
        }
      }
    }

    init();

    return () => {
      isMounted = false;
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const startCamera = async () => {
    setCameraLoading(true);
    setCameraError('');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Browser ini tidak mendukung akses kamera langsung.');
      setCameraLoading(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 640 }
        },
        audio: false
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().then(() => {
            setCameraLoading(false);
            setGuideText('Posisikan wajah Anda di dalam lingkaran oval');
            startFaceScanLoop();
          }).catch((e) => {
            console.warn('Gagal autoplay video:', e);
            setCameraLoading(false);
            startFaceScanLoop();
          });
        };
      }
    } catch (err) {
      console.error('Kamera error:', err);
      setCameraError('Tidak dapat membuka kamera selfie. Harap berikan izin akses kamera.');
      setCameraLoading(false);
    }
  };

  // Loop deteksi wajah dengan interval 300ms (tetap responsif menangkap
  // kedipan mata, tapi separuh beban CPU dibanding 160ms)
  const startFaceScanLoop = () => {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);

    scanIntervalRef.current = setInterval(async () => {
      if (
        isScanningRef.current || 
        hasBlinkedRef.current || 
        !videoRef.current || 
        videoRef.current.paused || 
        videoRef.current.ended
      ) {
        return;
      }

      isScanningRef.current = true;

      try {
        const detection = await detectSingleFaceWithDescriptor(videoRef.current);

        if (!detection) {
          setDetectedConfidence(0);
          setCanCapture(false);
          setGuideText('Posisikan wajah Anda di dalam lingkaran oval');
          isScanningRef.current = false;
          return;
        }

        const score = Math.round(detection.detection.score * 100);
        setDetectedConfidence(score);
        lastDescriptorRef.current = detection.descriptor;
        setCanCapture(true);

        // Tahap 1: Wajah terdeteksi jelas
        if (!hasBlinkedRef.current) {
          setEnrollStep('berkedip');

          // Deteksi kedipan (Eye Aspect Ratio)
          const blinkInfo = checkBlink(detection.landmarks);
          setIsEyeClosed(blinkInfo.isClosed);

          if (!blinkInfo.isClosed) {
            eyeWasOpenRef.current = true;
            setGuideText('Wajah pas! Silakan berkedip atau tekan tombol Simpan');
          } else if (eyeWasOpenRef.current && blinkInfo.isClosed) {
            // Kedipan mata valid terdeteksi (Transisi Terbuka -> Tertutup)
            hasBlinkedRef.current = true;
            setEnrollStep('memproses');
            setGuideText('Kedipan terverifikasi! Menyimpan biometrik wajah...');

            // Ambil snapshot foto dan daftarkan
            handleCaptureAndEnroll(detection.descriptor);
            return;
          }
        }
      } catch (e) {
        console.warn('Scan loop error:', e);
      } finally {
        isScanningRef.current = false;
      }
    }, 300);
  };

  // Ambil snapshot dan daftarkan ke backend Laravel
  const handleCaptureAndEnroll = async (customDescriptor = null) => {
    const descriptorToSave = customDescriptor || lastDescriptorRef.current;
    if (!descriptorToSave) {
      setErrorMessage('Wajah belum terdeteksi. Posisikan wajah Anda di depan kamera.');
      return;
    }

    // Validasi descriptor SEBELUM kirim: face-api = 128 angka.
    // [] / string kosong / tipe lain JANGAN dikirim — server lama
    // menerima [] dan menandai terdaftar palsu (flag true tanpa data).
    const isValidDescriptor = (d) => {
      if (Array.isArray(d) || ArrayBuffer.isView(d)) {
        const arr = Array.from(d);
        return arr.length > 0
          && arr.every((v) => typeof v === 'number' && Number.isFinite(v));
      }
      if (typeof d === 'string') {
        return d.trim().length > 0;
      }
      return false;
    };
    if (!isValidDescriptor(descriptorToSave)) {
      setErrorMessage('Data wajah tidak valid (descriptor kosong). Posisikan wajah Anda dan coba lagi.');
      hasBlinkedRef.current = false;
      eyeWasOpenRef.current = false;
      setEnrollStep('posisikan_wajah');
      startFaceScanLoop();
      return;
    }

    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setSubmitPhase('uploading');
    setGuideText('Mengunggah foto wajah ke server...');

    try {
      // Ambil foto snapshot dari video canvas — downscale dulu agar upload
      // cepat (koneksi lambat): sisi terpanjang max 320px, JPEG 0.65.
      // Untuk arsip wajah HR, 480px sudah lebih dari cukup.
      const video = videoRef.current;
      const srcW = video?.videoWidth || 480;
      const srcH = video?.videoHeight || 480;
      const MAX_SIDE = 320;
      const scale = Math.min(1, MAX_SIDE / Math.max(srcW, srcH));
      const width = Math.max(1, Math.round(srcW * scale));
      const height = Math.max(1, Math.round(srcH * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      // Mirror canvas agar sama seperti tampilan kamera depan
      ctx.save();
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
      if (video) {
        ctx.drawImage(video, 0, 0, width, height);
      }
      ctx.restore();

      const photoData = canvas.toDataURL('image/jpeg', 0.65);

      // Konversi Float32Array ke Array murni agar JSON serializable
      const descriptorArray = Array.from(descriptorToSave);

      const res = await api.registerFace({
        face_descriptor: descriptorArray,
        foto: photoData
      });

      if (res.success) {
        setIsSuccess(true);
        setSubmitPhase('done');
        setGuideText('Pendaftaran wajah biometrik berhasil!');
        stopCamera();

        // Callback setelah 1.2 detik agar user melihat konfirmasi
        setTimeout(() => {
          if (onSuccess) {
            onSuccess(res.pegawai);
          }
        }, 1200);
      } else {
        throw new Error(res.message || 'Gagal menyimpan data biometrik');
      }
    } catch (err) {
      console.error('Enroll error:', err);
      // Tampilkan pesan spesifik berdasarkan tipe error
      if (err.status === 0 || err.name === 'AbortError') {
        if (submitPhase === 'fallback') {
          setErrorMessage('Koneksi tidak stabil. Enroll gagal setelah percobaan kedua.');
        } else {
          // F-2: gagal jaringan PERTAMA dulu me-rethrow di sini —
          // reset + restart loop di bawah jadi tak tercapai, dan
          // pemanggil jalur blink (tanpa await/catch) menghasilkan
          // unhandled rejection + scan loop mati (hasBlinkedRef
          // macet true). Sekarang: TANPA throw — tampilkan error
          // yang benar, tandai fase fallback (percobaan kedua yang
          // gagal masuk cabang di atas), reset, dan hidupkan lagi
          // loop scan supaya user bisa berkedip ulang / tekan Simpan.
          setSubmitPhase('fallback');
          setErrorMessage('Koneksi tidak stabil. Silakan berkedip lagi atau tekan Simpan untuk mencoba lagi.');
          setGuideText('Koneksi lambat, coba lagi...');
        }
      } else {
        setErrorMessage(err.message || 'Terjadi kesalahan saat menyimpan pendaftaran wajah.');
      }
      hasBlinkedRef.current = false;
      eyeWasOpenRef.current = false;
      setEnrollStep('posisikan_wajah');
      startFaceScanLoop();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
      backgroundColor: '#0f172a',
      color: '#ffffff',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Top Header */}
      <div style={{
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 20,
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
      }}>
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            borderRadius: '10px',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            cursor: 'pointer'
          }}
        >
          <ArrowLeft size={18} />
        </button>

        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '700', margin: 0, color: '#f8fafc' }}>
            Pendaftaran Biometrik Wajah
          </h2>
          <p style={{ fontSize: '11px', margin: 0, color: '#94a3b8' }}>
            {user?.nama_lengkap || user?.nip}
          </p>
        </div>

        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          background: 'rgba(59, 130, 246, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#60a5fa'
        }}>
          <ShieldCheck size={18} />
        </div>
      </div>

      {/* Area Kamera Viewport */}
      <div style={{
        flex: 1,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        backgroundColor: '#020617'
      }}>
        {/* Video Element */}
        <video
          ref={videoRef}
          playsInline
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: 'scaleX(-1)' // Mirroring tampilan kamera depan
          }}
        />

        {/* Loading Spinner saat memuat Model / Kamera */}
        {(modelLoading || cameraLoading) && (
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: '#0f172a',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 15,
            padding: '24px',
            textAlign: 'center'
          }}>
            <RefreshCw size={36} className="spin-animation" style={{ color: '#f97316', marginBottom: '16px' }} />
            <h4 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '6px' }}>
              {modelLoading ? 'Memuat Modul AI Lokal...' : 'Menghubungkan Kamera...'}
            </h4>
            <p style={{ fontSize: '12px', color: '#94a3b8', maxWidth: '260px' }}>
              {modelLoading
                ? 'Model biometrik ringan sedang diinisialisasi di perangkat Anda.'
                : 'Membuka kamera selfie depan.'}
            </p>
          </div>
        )}

        {/* Error Kamera */}
        {cameraError && (
          <div style={{
            position: 'absolute',
            inset: '24px',
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            borderRadius: '20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 20,
            padding: '24px',
            textAlign: 'center'
          }}>
            <AlertCircle size={44} style={{ color: '#ef4444', marginBottom: '12px' }} />
            <h4 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '6px' }}>Izin Kamera Dibutuhkan</h4>
            <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '16px' }}>{cameraError}</p>
            <button
              type="button"
              onClick={startCamera}
              style={{
                backgroundColor: '#f97316',
                color: '#ffffff',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Coba Lagi
            </button>
          </div>
        )}

        {/* HUD Scanner Oval Overlay */}
        {!modelLoading && !cameraLoading && !cameraError && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            zIndex: 10
          }}>
            {/* Animated FaceID Circle Scanner (sheepymeh style) */}
            {!isSuccess && enrollStep !== 'memproses' && (
              <div style={{
                position: 'absolute',
                width: '110px',
                height: '110px',
                borderRadius: '50%',
                border: detectedConfidence > 0 ? '2px solid rgba(255,255,255,0.3)' : '2px solid rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
                zIndex: 11
              }}>
                {/* Outer spinning ring */}
                <div className="enroll-scanner-circle" />
                {/* Inner ring with different delay */}
                <div className="enroll-scanner-circle enroll-scanner-circle-1" />
                {/* Scan line when face detected */}
                {detectedConfidence > 0 && !isEyeClosed && (
                  <div style={{
                    position: 'absolute',
                    left: '15%', right: '15%',
                    height: '2px',
                    background: 'linear-gradient(90deg, transparent, #38bdf8, #a78bfa, transparent)',
                    animation: 'faceIdScanLine 1.6s ease-in-out infinite',
                    boxShadow: '0 0 6px rgba(56,189,248,0.5)',
                    zIndex: 12
                  }} />
                )}
                {/* Center icon */}
                <div style={{ zIndex: 13 }}>
                  {isEyeClosed
                    ? <CheckCircle2 size={26} style={{ color: '#22c55e' }} />
                    : detectedConfidence > 0
                      ? <Eye size={24} style={{ color: '#38bdf8', opacity: 0.85 }} />
                      : <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.3)' }} />}
                </div>
              </div>
            )}

            {/* Status Liveness Pill */}
            <div style={{
              marginTop: '16px',
              backgroundColor: 'rgba(15, 23, 42, 0.88)',
              border: `1px solid ${detectedConfidence > 0 ? 'rgba(250, 204, 21, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
              borderRadius: '20px',
              padding: '7px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backdropFilter: 'blur(8px)',
              maxWidth: '85%'
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: detectedConfidence > 0 ? (isEyeClosed ? '#22c55e' : '#facc15') : '#ef4444',
                boxShadow: detectedConfidence > 0 ? '0 0 8px #facc15' : 'none'
              }} />
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#f8fafc', textAlign: 'center' }}>
                {guideText}
              </span>
            </div>
          </div>
        )}

        {/* Sukses Overlay */}
        {isSuccess && (
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.94)',
            zIndex: 30,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            textAlign: 'center'
          }}>
            <div style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              backgroundColor: 'rgba(34, 197, 94, 0.2)',
              border: '2px solid #22c55e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#22c55e',
              marginBottom: '16px'
            }}>
              <CheckCircle2 size={40} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 8px 0', color: '#f8fafc' }}>
              Wajah Berhasil Didaftarkan!
            </h3>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 20px 0', maxWidth: '280px' }}>
              Data biometrik Anda telah tersimpan secara aman di server. Mulai sekarang Anda dapat melakukan absensi dengan verifikasi wajah.
            </p>
          </div>
        )}
      </div>

      {/* Footer Controls & Manual Capture Button */}
      <div style={{
        padding: '16px 20px',
        backgroundColor: '#0f172a',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        zIndex: 20
      }}>
        {errorMessage && (
          <div style={{
            padding: '10px 14px',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#fca5a5',
            fontSize: '12px',
            marginBottom: '10px'
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* TOMBOL MANUAL UTAMA: BISA KLIK KAPAN SAJA SAAT WAJAH TERDETEKSI */}
        <button
          type="button"
          onClick={() => handleCaptureAndEnroll()}
          disabled={!canCapture || isSubmitting}
          style={{
            width: '100%',
            height: '48px',
            borderRadius: '12px',
            background: canCapture 
              ? 'linear-gradient(135deg, #f97316, #ea580c)' 
              : 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: '800',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: canCapture && !isSubmitting ? 'pointer' : 'not-allowed',
            boxShadow: canCapture ? '0 4px 16px rgba(249, 115, 22, 0.4)' : 'none',
            marginBottom: '10px',
            transition: 'all 0.2s ease',
            opacity: canCapture ? 1 : 0.6
          }}
        >
          {isSubmitting ? (
            <>
              <RefreshCw size={17} className="spin-animation" />
              <span>{submitPhase === 'fallback' ? 'Mengirim ulang...' : 'Mengunggah Foto...'}</span>
            </>
          ) : (
            <>
              <Camera size={18} />
              <span>{canCapture ? 'Simpan Foto Wajah Sekarang' : 'Arahkan Wajah ke Lingkaran...'}</span>
            </>
          )}
        </button>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          borderRadius: '10px',
          padding: '8px 12px'
        }}>
          <Sparkles size={16} style={{ color: '#f97316', flexShrink: 0 }} />
          <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0, lineHeight: 1.3 }}>
            Sistem otomatis mendeteksi kedipan mata, atau Anda dapat menekan tombol oranye di atas kapan saja.
          </p>
        </div>
      </div>
    </div>
  );
}
