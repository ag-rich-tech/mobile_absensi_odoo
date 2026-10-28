import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, Camera, RefreshCw, CheckCircle2, AlertCircle,
  Clock, ShieldCheck, MapPin, Sparkles, AlertTriangle, Upload, Image as ImageIcon,
  Eye, UserCheck, ShieldAlert, Check
} from 'lucide-react';
import api, { getServerDate, formatTime24 } from '../services/api';
import {
  loadFaceModels,
  detectSingleFaceWithDescriptor,
  checkBlink,
  verifyFaceMatch
} from '../services/faceService';
import { playAttendanceSound } from '../services/soundService';

export default function AttendanceCapturePage({
  type = 'masuk',
  user,
  locationData,
  jamKerja,
  onBack,
  onSuccess,
  onNavigateToEnrollment
}) {
  const isMasuk = type === 'masuk';
  const isWajibFace = user?.wajib_face_recognition !== false;
  const hasFaceEnrolled = isWajibFace && Boolean(user?.face_descriptor || user?.is_face_registered);

  const [currentTime, setCurrentTime] = useState(getServerDate());
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(true);
  const [cameraError, setCameraError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successResult, setSuccessResult] = useState(null);

  // States Biometrik Face Recognition Client-Side
  const [modelReady, setModelReady] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [faceMatched, setFaceMatched] = useState(false);
  const [blinkDetected, setBlinkDetected] = useState(false);
  const [faceSimilarity, setFaceSimilarity] = useState(0);
  const [faceStatusText, setFaceStatusText] = useState(
    hasFaceEnrolled ? 'Mempersiapkan AI biometrik...' : 'Biometrik belum terdaftar'
  );
  const [isFaceVerified, setIsFaceVerified] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);
  const isScanningRef = useRef(false);
  const scanIntervalRef = useRef(null);
  const hasBlinkedRef = useRef(false);
  const eyeWasOpenRef = useRef(false);
  const isVerifiedRef = useRef(false);
  const isAutoSubmittingRef = useRef(false);

  // Jam digital real-time tersinkronisasi 100% dengan Server Laravel WIB
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(getServerDate()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeString = formatTime24(currentTime);

  // Inisialisasi Kamera Selfie (Depan) dengan Fallback Handal
  const startCamera = async () => {
    setCameraLoading(true);
    setCameraError('');

    // Hentikan stream sebelumnya jika ada
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Browser ini tidak mendukung akses kamera langsung. Silakan gunakan tombol Ambil dari Kamera HP di bawah.');
      setCameraLoading(false);
      return;
    }

    let stream = null;

    // Strategi 1: Coba kamera selfie depan
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 640 }
        },
        audio: false
      });
    } catch (err1) {
      console.warn('Gagal membuka facingMode: user, mencoba fallback kamera default:', err1);
      // Strategi 2: Coba kamera default apapun yang tersedia
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      } catch (err2) {
        console.warn('Kamera ditolak atau tidak tersedia:', err2);
        setCameraError('Kamera tidak dapat diakses atau izin ditolak. Anda dapat menggunakan tombol foto di bawah.');
        setCameraLoading(false);
        return;
      }
    }

    if (stream) {
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().then(() => {
            setCameraActive(true);
            setCameraLoading(false);
          }).catch((e) => {
            console.warn('Gagal auto-play video:', e);
            setCameraActive(true);
            setCameraLoading(false);
          });
        };
      }
    }
  };

  useEffect(() => {
    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  // Pemuatan Model AI Biometrik Ringan
  useEffect(() => {
    let isMounted = true;
    if (hasFaceEnrolled) {
      loadFaceModels()
        .then(() => {
          if (isMounted) {
            setModelReady(true);
            setFaceStatusText('Posisikan wajah Anda di dalam lingkaran oval');
          }
        })
        .catch((err) => {
          console.warn('Face models load warning:', err);
          if (isMounted) {
            setFaceStatusText('Modul biometrik berjalan dalam mode standar');
          }
        });
    }

    return () => {
      isMounted = false;
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
    };
  }, [hasFaceEnrolled]);

  // Scan Wajah Otomatis dengan Throttling 350ms (Super Ringan & Anti-Lag di HP)
  useEffect(() => {
    if (!cameraActive || !modelReady || !hasFaceEnrolled || capturedPhoto) {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
      return;
    }

    scanIntervalRef.current = setInterval(async () => {
      if (
        isScanningRef.current ||
        isVerifiedRef.current ||
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
          setFaceDetected(false);
          setFaceMatched(false);
          setFaceStatusText('Posisikan wajah Anda di dalam lingkaran oval');
          isScanningRef.current = false;
          return;
        }

        setFaceDetected(true);

        // Verifikasi kecocokan wajah (1:1 matching dengan masterDescriptor user)
        const masterDescriptor = user?.face_descriptor;
        if (masterDescriptor) {
          const matchResult = verifyFaceMatch(detection.descriptor, masterDescriptor);
          setFaceSimilarity(matchResult.similarityScore);

          if (matchResult.isMatch) {
            // TIDAK auto-submit lagi: posisi yang kurang pas ikut
            // terkirim saat match pertama langsung memproses.
            // Verifikasi hanya mengunci status; pengiriman tetap lewat
            // tombol "Absen Sekarang" yang ditekan user (jalur manual
            // handleAbsenSubmit sudah lengkap: foto dari video +
            // cek Fake GPS + cek verifikasi + kirim).
            setFaceMatched(true);
            setIsFaceVerified(true);
            isVerifiedRef.current = true;
            setFaceStatusText(`Wajah Cocok (${matchResult.similarityScore}%)! Tekan "Absen Sekarang" untuk mengirim.`);
          } else {
            setFaceMatched(false);
            setFaceStatusText(`Wajah tidak sesuai (${matchResult.similarityScore}%). Mohon arahkan pas di tengah`);
          }
        } else {
          // Tanpa referensi lokal, pencocokan tidak pernah dicoba.
          setFaceStatusText('Wajah belum terdaftar di perangkat ini — daftar ulang dulu');
        }
      } catch (e) {
        console.warn('Attendance face scan error:', e);
      } finally {
        isScanningRef.current = false;
      }
    }, 160);

    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
    };
  }, [cameraActive, modelReady, hasFaceEnrolled, capturedPhoto, user?.face_descriptor]);

  // Ambil Frame Foto Snapshot dari Video
  const capturePhotoFromVideo = () => {
    if (!videoRef.current) return null;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    const width = video.videoWidth || 480;
    const height = video.videoHeight || 480;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');

    // Cermin (mirror) hasil selfie agar sesuai tampilan layar
    ctx.save();
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, width, height);
    ctx.restore();

    // Berikan watermark timestamp
    ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
    ctx.fillRect(0, height - 36, width, 36);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(`${user?.nama_lengkap || user?.nip} • ${timeString} WIB • GPS: ${locationData?.distance || 14}m`, 14, height - 14);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedPhoto(dataUrl);
    return dataUrl;
  };

  // Fallback upload foto dari kamera HP / file picker
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setCapturedPhoto(event.target.result);
      setCameraError('');
    };
    reader.readAsDataURL(file);
  };

  // Buat Foto Biometrik Simulasi jika perangkat tidak memiliki kamera sama sekali
  const generateSimulatedPhoto = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 400, 400);

    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.arc(200, 160, 80, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ea580c';
    ctx.beginPath();
    ctx.arc(200, 360, 130, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(`FOTO VERIFIKASI: ${user?.nama_lengkap || user?.nip}`, 24, 350);
    ctx.font = '12px monospace';
    ctx.fillText(`${timeString} WIB • GPS ${locationData?.distance || 14}m`, 24, 374);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedPhoto(dataUrl);
    return dataUrl;
  };

  // Kirim Absen ke Server & Validasi Aturan
  const handleAbsenSubmit = async () => {
    if (isAutoSubmittingRef.current) return;

    if (locationData?.isFakeGps) {
      setErrorMessage('Presensi dibatalkan: Terdeteksi manipulasi lokasi (Fake GPS).');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    // Dapatkan data foto
    let photoData = capturedPhoto;
    if (!photoData) {
      if (cameraActive && videoRef.current) {
        photoData = capturePhotoFromVideo();
      } else {
        photoData = generateSimulatedPhoto();
      }
    }

    // Validasi apakah wajah biometrik diwajibkan
    let finalFaceVerified = true;
    if (hasFaceEnrolled) {
      if (faceMatched || isFaceVerified) {
        finalFaceVerified = true;
      } else if (!user?.face_descriptor) {
        // Terdaftar di server tapi perangkat ini tidak punya referensi
        // wajah (mis. habis login ulang / install ulang): pencocokan tidak
        // pernah dicoba, jadi jangan tuduh wajahnya tidak cocok.
        setErrorMessage('Wajah belum terdaftar di perangkat ini. Silakan daftar ulang wajah Anda, lalu absen kembali.');
        setIsSubmitting(false);
        return;
      } else {
        setErrorMessage('Verifikasi wajah belum cocok. Pastikan wajah Anda berada di tengah kamera.');
        setIsSubmitting(false);
        return;
      }
    }

    try {
      const coords = locationData?.coords || {
        latitude: -6.143662253255497,
        longitude: 106.6288537
      };

      // Panggil endpoint REST API Laravel dengan data biometrik
      const res = await api.absen({
        tipe: type,
        latitude: coords.latitude,
        longitude: coords.longitude,
        foto: photoData,
        face_matched: hasFaceEnrolled ? finalFaceVerified : true,
        face_similarity: hasFaceEnrolled ? faceSimilarity : null,
      });

      if (res.success) {
        playAttendanceSound(type);
        setSuccessResult(res);
        // Tampilkan dialog konfirmasi sukses lalu panggil onSuccess
        setTimeout(() => {
          onSuccess(res.data);
        }, 2000);
      } else {
        setErrorMessage(res.message || 'Presensi tidak dapat diproses.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Gagal memproses absensi. Periksa koneksi ke server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Estimasi status aturan jam saat ini
  const jamSekarangStr = currentTime.toTimeString().slice(0, 8);
  let statusAturanText = 'Sesuai Aturan Jam Kerja';
  let isWarningAturan = false;

  if (isMasuk) {
    const jamAkhirMasuk = jamKerja?.jam_akhir_masuk || '08:00';
    if (jamSekarangStr.slice(0, 5) > jamAkhirMasuk) {
      statusAturanText = `Melewati jam masuk normal (${jamAkhirMasuk} WIB). Dihitung keterlambatan.`;
      isWarningAturan = true;
    } else {
      statusAturanText = `Masuk tepat waktu (Batas akhir masuk: ${jamAkhirMasuk} WIB).`;
    }
  } else {
    const jamAwalPulang = jamKerja?.jam_awal_pulang || '17:00';
    if (jamSekarangStr.slice(0, 5) < jamAwalPulang) {
      statusAturanText = `Sebelum jam pulang normal (${jamAwalPulang} WIB). Dihitung pulang cepat.`;
      isWarningAturan = true;
    } else {
      statusAturanText = `Jam pulang normal (Mulai pukul ${jamAwalPulang} WIB).`;
    }
  }

  // Rentang batas: bila awal == akhir (tidak ada toleransi di server,
  // _schedule_days hanya mengembalikan jam_masuk/jam_pulang), tampilkan
  // satu nilai saja, bukan "08:30 - 08:30".
  const batasMasukText = (() => {
    const a = jamKerja?.jam_awal_masuk || '07:00';
    const b = jamKerja?.jam_akhir_masuk || '08:00';
    return a === b ? a : `${a} - ${b}`;
  })();
  const batasPulangText = (() => {
    const a = jamKerja?.jam_awal_pulang || '17:00';
    const b = jamKerja?.jam_akhir_pulang || '20:00';
    return a === b ? a : `${a} - ${b}`;
  })();

  return (
    <div className="screen-scroll-area no-nav animate-fade-in" style={{
      backgroundColor: '#ffffff',
      minHeight: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      paddingTop: 'max(42px, calc(env(safe-area-inset-top, 0px) + 14px))',
      paddingBottom: 'max(52px, calc(env(safe-area-inset-bottom, 0px) + 24px))',
      paddingLeft: '18px',
      paddingRight: '18px',
      boxSizing: 'border-box'
    }}>
      <div>
        {/* Top Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <button
            type="button"
            onClick={onBack}
            disabled={isSubmitting}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg-slate)',
              border: '1px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-main)',
              cursor: isSubmitting ? 'not-allowed' : 'pointer'
            }}
          >
            <ArrowLeft size={18} />
          </button>

          <span style={{
            fontSize: '11px',
            fontWeight: '800',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            color: isMasuk ? 'var(--primary-600)' : '#2563eb',
            backgroundColor: isMasuk ? 'var(--primary-50)' : '#eff6ff',
            padding: '4px 12px',
            borderRadius: 'var(--radius-full)'
          }}>
            {isMasuk ? 'Langkah 2: Foto Presensi Masuk' : 'Langkah 2: Foto Presensi Pulang'}
          </span>

          <div style={{ width: '40px' }}></div>
        </div>

        {/* Section Title */}
        <div style={{ marginBottom: '14px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.3px' }}>
            {isMasuk ? 'Kamera Absen Masuk' : 'Kamera Absen Pulang'}
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Posisikan wajah Anda di depan kamera dan tekan tombol Absen Sekarang
          </p>
        </div>

        {/* Error Alert jika validasi server menolak */}
        {errorMessage && (
          <div style={{
            marginBottom: '14px',
            padding: '12px 14px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--danger-bg)',
            border: '1.5px solid #fecaca',
            color: 'var(--danger)',
            fontSize: '12px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            lineHeight: '1.4'
          }}>
            <AlertCircle size={17} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Banner Status On/Off Face Recognition dari Admin */}
        {!isWajibFace && (
          <div style={{
            marginBottom: '14px',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: '#f0fdf4',
            border: '1.5px solid #bbf7d0',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#15803d',
            fontSize: '12px',
            fontWeight: '600'
          }}>
            <CheckCircle2 size={18} style={{ flexShrink: 0, color: '#16a34a' }} />
            <div>
              <span style={{ fontWeight: '800', display: 'block' }}>Face Recognition Dinonaktifkan Admin</span>
              <span style={{ fontSize: '11px', color: '#166534' }}>Anda dapat melakukan presensi dengan foto selfie biasa tanpa validasi biometrik.</span>
            </div>
          </div>
        )}

        {/* Banner Ajakan Registrasi Wajah jika Belum Terdaftar */}
        {isWajibFace && !hasFaceEnrolled && (
          <div style={{
            marginBottom: '14px',
            padding: '12px 14px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: '#fffbeb',
            border: '1.5px solid #fde68a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert size={22} style={{ color: '#d97706', flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: '12px', fontWeight: '800', color: '#92400e', margin: 0 }}>
                  Wajah Biometrik Belum Terdaftar
                </p>
                <p style={{ fontSize: '11px', color: '#b45309', margin: '2px 0 0 0' }}>
                  Daftarkan wajah 1 kali di HP untuk presensi biometrik.
                </p>
              </div>
            </div>
            {onNavigateToEnrollment && (
              <button
                type="button"
                onClick={onNavigateToEnrollment}
                style={{
                  padding: '7px 12px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: '#d97706',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                Daftar Wajah
              </button>
            )}
          </div>
        )}

        {/* Banner: terdaftar di server tapi perangkat ini tanpa referensi wajah */}
        {isWajibFace && hasFaceEnrolled && !user?.face_descriptor && (
          <div style={{
            marginBottom: '14px',
            padding: '12px 14px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: '#fffbeb',
            border: '1.5px solid #fde68a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert size={22} style={{ color: '#d97706', flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: '12px', fontWeight: '800', color: '#92400e', margin: 0 }}>
                  Wajah Belum Terdaftar di Perangkat Ini
                </p>
                <p style={{ fontSize: '11px', color: '#b45309', margin: '2px 0 0 0' }}>
                  Server bilang wajah Anda terdaftar, tapi HP ini tidak punya
                  pembandingnya (mis. habis login ulang). Daftar ulang 1 kali,
                  lalu absen kembali.
                </p>
              </div>
            </div>
            {onNavigateToEnrollment && (
              <button
                type="button"
                onClick={onNavigateToEnrollment}
                style={{
                  padding: '7px 12px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: '#d97706',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                Daftar Ulang
              </button>
            )}
          </div>
        )}

        {/* CARD CAMERA CONTAINER (Selalu Render Video di DOM) */}
        <div className="tablet-camera-card" style={{
          width: '100%',
          height: '380px',
          borderRadius: '24px',
          backgroundColor: '#0f172a',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)'
        }}>
          {/* Elemen Video Live Stream (Selalu Aktif di DOM) */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: 'scaleX(-1)',
              display: capturedPhoto ? 'none' : 'block',
              opacity: cameraActive ? 1 : 0,
              transition: 'opacity 0.3s ease'
            }}
          />

          {/* Gambar Pratinjau Snapshot jika foto sudah diambil */}
          {capturedPhoto && (
            <img
              src={capturedPhoto}
              alt="Snapshot Selfie"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                position: 'absolute',
                inset: 0
              }}
            />
          )}

          {/* Loading / Placeholder jika kamera sedang dibuka atau gagal */}
          {!cameraActive && !capturedPhoto && (
            <div style={{ textAlign: 'center', padding: '20px', zIndex: 2 }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'rgba(249, 115, 22, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px auto'
              }}>
                {cameraLoading ? (
                  <RefreshCw size={28} className="animate-spin" style={{ color: 'var(--primary-400)' }} />
                ) : (
                  <Camera size={32} style={{ color: 'var(--primary-400)' }} />
                )}
              </div>
              <p style={{ color: '#ffffff', fontSize: '13px', fontWeight: '800' }}>
                {cameraLoading ? 'Mengaktifkan Kamera Selfie...' : 'Kamera Perangkat'}
              </p>
              <p style={{ color: '#94a3b8', fontSize: '11px', marginTop: '4px', maxWidth: '240px', margin: '4px auto 0 auto' }}>
                {cameraError || 'Mohon izinkan akses kamera pada peramban Anda'}
              </p>

              {/* Tombol aktifkan ulang kamera jika gagal */}
              {cameraError && (
                <div style={{ marginTop: '12px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                  <button
                    type="button"
                    onClick={startCamera}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'var(--primary-600)',
                      border: 'none',
                      color: '#ffffff',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <RefreshCw size={13} />
                    <span>Coba Ulang Kamera</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'rgba(255, 255, 255, 0.15)',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      color: '#ffffff',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Upload size={13} />
                    <span>Ambil Foto HP</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* FaceID Scanner Circular Overlay */}
          {hasFaceEnrolled && cameraActive && !capturedPhoto && (
            <div style={{
              position: 'absolute',
              width: 'min(240px, 62vw)',
              height: 'min(240px, 62vw)',
              borderRadius: '50%',
              border: isFaceVerified ? '3px solid #22c55e' : '3px solid rgba(56,189,248,0.6)',
              boxShadow: isFaceVerified
                ? '0 0 30px rgba(34,197,94,0.6), inset 0 0 20px rgba(34,197,94,0.1)'
                : '0 0 25px rgba(56,189,248,0.35), inset 0 0 20px rgba(56,189,248,0.1)',
              pointerEvents: 'none',
              zIndex: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.4s ease'
            }}>
              {/* Rotating ring (FaceID style) */}
              <div className="face-id-ring" />
              {/* Scanning line */}
              {!isFaceVerified && <div className="face-id-scan-line" />}
              {/* Corner brackets */}
              <div className={`face-id-corners${isFaceVerified ? ' verified' : ''}`}>
                <div className="face-id-corner face-id-corner--tl" />
                <div className="face-id-corner face-id-corner--tr" />
                <div className="face-id-corner face-id-corner--bl" />
                <div className="face-id-corner face-id-corner--br" />
              </div>
              {/* Center icon */}
              <div style={{ zIndex: 1 }}>
                {isFaceVerified
                  ? <CheckCircle2 size={24} style={{ color: '#22c55e' }} />
                  : faceMatched && !blinkDetected
                    ? <Sparkles size={20} style={{ color: '#facc15' }} />
                    : faceDetected
                      ? <Eye size={22} style={{ color: '#38bdf8', opacity: 0.85 }} />
                      : <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.3)' }} />}
              </div>
              {/* Status label below circle */}
              <div style={{
                position: 'absolute',
                bottom: '-26px',
                fontSize: '9px',
                fontWeight: '800',
                color: isFaceVerified ? '#22c55e' : '#38bdf8',
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap'
              }}>
                {isFaceVerified ? '✓ Terverifikasi' : '● Meminda'}
              </div>
            </div>
          )}

          {/* Floating Pill Status Biometrik di Bawah Kamera */}
          {hasFaceEnrolled && cameraActive && !capturedPhoto && (
            <div style={{
              position: 'absolute',
              bottom: '12px',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: 'rgba(15, 23, 42, 0.88)',
              border: `1px solid ${isFaceVerified ? 'rgba(34, 197, 94, 0.5)' : 'rgba(255, 255, 255, 0.15)'}`,
              borderRadius: '20px',
              padding: '6px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              zIndex: 4,
              backdropFilter: 'blur(8px)',
              whiteSpace: 'nowrap',
              maxWidth: '90%'
            }}>
              <div style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: isFaceVerified ? '#22c55e' : (faceMatched ? '#facc15' : (faceDetected ? '#38bdf8' : '#94a3b8')),
                boxShadow: isFaceVerified ? '0 0 6px #22c55e' : 'none'
              }} />
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {faceStatusText}
              </span>
            </div>
          )}

          {/* Jam Digital Real-Time di Atas Kamera */}
          <div style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(6px)',
            padding: '5px 12px',
            borderRadius: 'var(--radius-full)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: '#ffffff',
            fontSize: '12px',
            fontWeight: '800',
            fontFamily: 'var(--font-mono)',
            zIndex: 4
          }}>
            <Clock size={13} style={{ color: 'var(--primary-400)' }} />
            <span>{timeString} WIB</span>
          </div>

          {/* Badge GPS Terverifikasi di Pojok Kanan Atas */}
          <div style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            backgroundColor: 'rgba(34, 197, 94, 0.95)',
            backdropFilter: 'blur(6px)',
            padding: '5px 10px',
            borderRadius: 'var(--radius-full)',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            color: '#ffffff',
            fontSize: '11px',
            fontWeight: '800',
            zIndex: 4
          }}>
            <MapPin size={12} />
            <span>{locationData?.distance || 14}m</span>
          </div>

          {/* Tombol Ambil Ulang jika foto sudah diambil */}
          {capturedPhoto && (
            <button
              type="button"
              onClick={() => {
                setCapturedPhoto(null);
                isVerifiedRef.current = false;
                isAutoSubmittingRef.current = false;
                startCamera();
              }}
              style={{
                position: 'absolute',
                bottom: '12px',
                right: '12px',
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                border: 'none',
                color: '#ffffff',
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                fontSize: '11px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                zIndex: 4
              }}
            >
              <RefreshCw size={13} />
              <span>Foto Ulang</span>
            </button>
          )}
        </div>

        {/* Hidden File Input untuk Ambil Foto Kamera HP Asli */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="user"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        {/* CARD ATURAN & VALIDASI JAM KERJA */}
        <div style={{
          marginTop: '14px',
          padding: '12px 14px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: isWarningAturan ? 'var(--warning-bg)' : 'var(--bg-slate)',
          border: isWarningAturan ? '1px solid #fed7aa' : '1px solid var(--border-light)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Aturan Jam Kerja
            </span>
            <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--primary-600)' }}>
              {jamKerja?.nama || 'Jam Kantor Reguler'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-main)', fontWeight: '700' }}>
            <span>Batas Masuk: {batasMasukText}</span>
            <span>Batas Pulang: {batasPulangText}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: isWarningAturan ? 'var(--warning)' : 'var(--text-muted)', marginTop: '2px' }}>
            {isWarningAturan ? (
              <AlertTriangle size={14} style={{ flexShrink: 0 }} />
            ) : (
              <CheckCircle2 size={14} style={{ color: 'var(--success)', flexShrink: 0 }} />
            )}
            <span>{statusAturanText}</span>
          </div>
        </div>
      </div>

      {/* TOMBOL ABSEN SEKARANG */}
      <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button
          type="button"
          onClick={handleAbsenSubmit}
          disabled={isSubmitting}
          style={{
            width: '100%',
            height: '52px',
            borderRadius: 'var(--radius-md)',
            background: isMasuk ? 'var(--primary-gradient)' : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            border: 'none',
            color: '#ffffff',
            fontSize: '15px',
            fontWeight: '800',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: isMasuk ? 'var(--shadow-primary)' : '0 6px 16px rgba(37, 99, 235, 0.35)',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            opacity: isSubmitting ? 0.75 : 1
          }}
        >
          {isSubmitting ? (
            <>
              <RefreshCw size={18} className="animate-spin" />
              <span>Memvalidasi Absensi & Jam...</span>
            </>
          ) : (
            <>
              <ShieldCheck size={20} strokeWidth={2.5} />
              <span>Absen Sekarang</span>
            </>
          )}
        </button>

        {/* Opsi Tambahan: Buka Kamera Ponsel / Upload Foto */}
        {!cameraActive && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: '100%',
              height: '42px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: '#ffffff',
              border: '1.5px solid var(--border-light)',
              color: 'var(--text-main)',
              fontSize: '12px',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <Camera size={16} style={{ color: 'var(--primary-600)' }} />
            <span>Ambil Foto Langsung dari Kamera HP</span>
          </button>
        )}
      </div>

      {/* MODAL SUKSES VALIDASI */}
      {successResult && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          zIndex: 999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '340px',
            backgroundColor: '#ffffff',
            borderRadius: '24px',
            padding: '24px 20px',
            textAlign: 'center',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            animation: 'scaleIn 0.25s ease-out'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'var(--success-bg)',
              color: 'var(--success)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto'
            }}>
              <CheckCircle2 size={36} />
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)' }}>
              Absensi Berhasil!
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
              {successResult.message}
            </p>

            <div style={{
              marginTop: '16px',
              padding: '12px',
              backgroundColor: 'var(--bg-slate)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '12px',
              display: 'flex',
              justifyContent: 'space-around',
              fontWeight: '700'
            }}>
              <div>
                <span style={{ color: 'var(--text-light)', display: 'block', fontSize: '10px' }}>Waktu</span>
                <span>{successResult.data?.jam_masuk || successResult.data?.jam_pulang} WIB</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-light)', display: 'block', fontSize: '10px' }}>Jarak GPS</span>
                <span>{successResult.data?.jarak_meter}m</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-light)', display: 'block', fontSize: '10px' }}>Status</span>
                <span style={{ color: successResult.data?.status_masuk === 'terlambat' ? 'var(--danger)' : 'var(--success)' }}>
                  {successResult.data?.status_masuk || successResult.data?.status_pulang}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
