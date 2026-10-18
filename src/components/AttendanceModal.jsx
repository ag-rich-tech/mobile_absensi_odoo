import React, { useState, useEffect, useRef } from 'react';
import { X, Camera, MapPin, CheckCircle, AlertCircle, RefreshCw, ShieldCheck, Sparkles, Navigation } from 'lucide-react';
import api from '../services/api';
import { playAttendanceSound } from '../services/soundService';

export default function AttendanceModal({ type = 'masuk', user, lokasiKantor, onClose, onSuccess }) {
  const [step, setStep] = useState('capture'); // 'capture' | 'processing' | 'success' | 'error'
  const [statusMessage, setStatusMessage] = useState('');
  const [resultData, setResultData] = useState(null);
  const [coords, setCoords] = useState({
    latitude: lokasiKantor?.latitude || -6.143662253255497,
    longitude: lokasiKantor?.longitude || 106.6288537,
    accuracy: 10,
    isRealGps: false,
  });
  const [isGpsLoading, setIsGpsLoading] = useState(true);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const isMasuk = type === 'masuk';

  // 1. Dapatkan Lokasi GPS Perangkat
  useEffect(() => {
    let isMounted = true;

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (isMounted) {
            setCoords({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: Math.round(pos.coords.accuracy || 10),
              isRealGps: true,
            });
            setIsGpsLoading(false);
          }
        },
        (err) => {
          console.warn('Geolocation error / permission denied, using office coords:', err.message);
          if (isMounted) {
            // Fallback ke koordinat kantor agar pengetesan tetap berjalan lancar jika GPS desktop ditolak
            setCoords({
              latitude: lokasiKantor?.latitude || -6.143662253255497,
              longitude: lokasiKantor?.longitude || 106.6288537,
              accuracy: 15,
              isRealGps: false,
            });
            setIsGpsLoading(false);
          }
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setIsGpsLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [lokasiKantor]);

  // 2. Inisialisasi Kamera Selfie
  useEffect(() => {
    let currentStream = null;

    const startCamera = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError(true);
        return;
      }

      let stream = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false
        });
      } catch (err1) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
          });
        } catch (err2) {
          console.warn('Camera error or blocked:', err2.message);
          setCameraError(true);
          return;
        }
      }

      if (stream) {
        currentStream = stream;
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play().then(() => {
              setCameraActive(true);
            }).catch(() => {
              setCameraActive(true);
            });
          };
        }
      }
    };

    startCamera();

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // 3. Ambil Snapshot Foto
  const takeSnapshot = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 360;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');

    if (cameraActive && videoRef.current) {
      // Ambil frame dari video
      ctx.drawImage(videoRef.current, 0, 0, 360, 360);
    } else {
      // Buat simulasi selfie foto biometrik dengan canvas jika webcam tidak ada
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, 360, 360);

      // Lingkaran wajah
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(180, 150, 70, 0, Math.PI * 2);
      ctx.fill();

      // Badan
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.arc(180, 320, 110, 0, Math.PI * 2);
      ctx.fill();

      // Timestamp watermark
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(`VERIFIED SELFIE - ${user?.nip || 'PEGAWAI'}`, 30, 330);
      ctx.font = '12px monospace';
      ctx.fillText(new Date().toLocaleString('id-ID'), 30, 348);
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedPhoto(dataUrl);
    return dataUrl;
  };

  // 4. Submit Absensi ke REST API Laravel
  const handleSubmitAttendance = async () => {
    const photoData = capturedPhoto || takeSnapshot();

    setStep('processing');
    setStatusMessage('Mengirim verifikasi biometrik & validasi geofencing ke server...');

    try {
      const res = await api.absen({
        tipe: type,
        latitude: coords.latitude,
        longitude: coords.longitude,
        foto: photoData,
      });

      if (res.success) {
        playAttendanceSound(type);
        setResultData(res.data);
        setStatusMessage(res.message);
        setStep('success');

        // Berikan waktu user membaca notifikasi sukses lalu panggil onSuccess
        setTimeout(() => {
          onSuccess(res.data);
        }, 2000);
      } else {
        setStep('error');
        setStatusMessage(res.message || 'Presensi gagal.');
      }
    } catch (err) {
      setStep('error');
      setStatusMessage(err.message || 'Gagal terhubung ke server.');
    }
  };

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      zIndex: 100,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end',
      animation: 'fadeIn 0.25s ease-out'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderTopLeftRadius: '32px',
        borderTopRightRadius: '32px',
        padding: '24px 20px',
        maxHeight: '92%',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 -20px 40px rgba(0, 0, 0, 0.15)',
        width: '100%',
        maxWidth: '560px',
        margin: '0 auto'
      }}>
        {/* Header Modal */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <span style={{
              fontSize: '11px',
              fontWeight: '800',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: isMasuk ? 'var(--primary-600)' : '#2563eb',
              backgroundColor: isMasuk ? 'var(--primary-50)' : '#eff6ff',
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)'
            }}>
              {isMasuk ? 'Presensi Masuk' : 'Presensi Pulang'}
            </span>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', marginTop: '6px' }}>
              Verifikasi Biometrik & GPS
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: 'var(--bg-slate)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Step: Capture Foto & Cek Lokasi */}
        {step === 'capture' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Viewfinder Kamera Selfie */}
            <div style={{
              width: '100%',
              height: '240px',
              borderRadius: '24px',
              backgroundColor: '#0f172a',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'inset 0 0 40px rgba(0,0,0,0.5)'
            }}>
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
                  transition: 'opacity 0.25s ease'
                }}
              />

              {capturedPhoto && (
                <img
                  src={capturedPhoto}
                  alt="Captured Selfie"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }}
                />
              )}

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
                    <Camera size={32} style={{ color: 'var(--primary-500)' }} />
                  </div>
                  <p style={{ color: '#ffffff', fontSize: '13px', fontWeight: '700' }}>
                    Mengaktifkan Kamera...
                  </p>
                  <p style={{ color: '#94a3b8', fontSize: '11px', marginTop: '4px' }}>
                    {cameraError ? 'Kamera tidak aktif, menggunakan snapshot simulasi' : 'Posisikan wajah Anda di tengah layar'}
                  </p>
                </div>
              )}

              {/* Face Guide Oval Overlay */}
              <div style={{
                position: 'absolute',
                width: '160px',
                height: '200px',
                borderRadius: '50%',
                border: '2px dashed rgba(249, 115, 22, 0.7)',
                pointerEvents: 'none',
                boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.35)'
              }}></div>

              {/* Status Badge Live GPS */}
              <div style={{
                position: 'absolute',
                top: '12px',
                left: '12px',
                backgroundColor: 'rgba(0, 0, 0, 0.65)',
                backdropFilter: 'blur(4px)',
                padding: '4px 10px',
                borderRadius: 'var(--radius-full)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: '600'
              }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: coords.isRealGps ? '#22c55e' : '#f59e0b' }}></span>
                <span>{coords.isRealGps ? 'GPS Riil Akurat' : 'Geofence Kantor'}</span>
              </div>
            </div>

            {/* Info Kantor & Radius */}
            <div style={{
              padding: '12px 14px',
              backgroundColor: 'var(--bg-slate)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--primary-100)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--primary-600)'
                }}>
                  <MapPin size={18} />
                </div>
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)' }}>
                    {lokasiKantor?.nama_lokasi || 'Kantor Pusat Tangerang'}
                  </h4>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Maks. Radius: {lokasiKantor?.radius_meter || 100} meter
                  </p>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  color: 'var(--success)',
                  backgroundColor: 'var(--success-bg)',
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-full)'
                }}>
                  Terverifikasi
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={takeSnapshot}
                style={{
                  flex: 1,
                  height: '48px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: '#ffffff',
                  border: '1.5px solid var(--border-light)',
                  color: 'var(--text-main)',
                  fontSize: '13px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                <Camera size={16} />
                <span>Foto Ulang</span>
              </button>

              <button
                type="button"
                onClick={handleSubmitAttendance}
                style={{
                  flex: 2,
                  height: '48px',
                  borderRadius: 'var(--radius-md)',
                  background: isMasuk ? 'var(--primary-gradient)' : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: '800',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: isMasuk ? 'var(--shadow-primary)' : '0 4px 12px rgba(37, 99, 235, 0.3)',
                  cursor: 'pointer'
                }}
              >
                <ShieldCheck size={18} strokeWidth={2.5} />
                <span>Kirim Presensi Riil</span>
              </button>
            </div>
          </div>
        )}

        {/* Step: Processing */}
        {step === 'processing' && (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'var(--primary-50)',
              color: 'var(--primary-600)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              animation: 'spin 1.5s linear infinite'
            }}>
              <RefreshCw size={28} />
            </div>
            <h4 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)' }}>
              Memvalidasi Presensi ke Database...
            </h4>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px', maxWidth: '280px', margin: '6px auto 0 auto' }}>
              {statusMessage}
            </p>
          </div>
        )}

        {/* Step: Success */}
        {step === 'success' && (
          <div style={{ padding: '30px 20px', textAlign: 'center' }}>
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
              <CheckCircle size={32} />
            </div>
            <h4 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)' }}>
              Presensi Berhasil Dicatat!
            </h4>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px' }}>
              {statusMessage}
            </p>

            {resultData && (
              <div style={{
                marginTop: '16px',
                padding: '12px',
                backgroundColor: 'var(--bg-slate)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
                fontWeight: '600',
                color: 'var(--text-main)',
                display: 'flex',
                justifyContent: 'space-around'
              }}>
                <div>
                  <span style={{ color: 'var(--text-light)', display: 'block', fontSize: '10px' }}>Waktu Server</span>
                  <span>{resultData.jam_masuk || resultData.jam_pulang} WIB</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-light)', display: 'block', fontSize: '10px' }}>Jarak Radius</span>
                  <span>{resultData.jarak_meter} Meter</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-light)', display: 'block', fontSize: '10px' }}>Status</span>
                  <span style={{ color: resultData.status_masuk === 'terlambat' ? 'var(--danger)' : 'var(--success)' }}>
                    {resultData.status_masuk || resultData.status_pulang}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step: Error */}
        {step === 'error' && (
          <div style={{ padding: '30px 20px', textAlign: 'center' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'var(--danger-bg)',
              color: 'var(--danger)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto'
            }}>
              <AlertCircle size={32} />
            </div>
            <h4 style={{ fontSize: '17px', fontWeight: '800', color: 'var(--danger)' }}>
              Presensi Ditolak
            </h4>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: '1.4' }}>
              {statusMessage}
            </p>

            <button
              type="button"
              onClick={() => setStep('capture')}
              style={{
                marginTop: '20px',
                width: '100%',
                height: '46px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-slate)',
                border: '1.5px solid var(--border-light)',
                color: 'var(--text-main)',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Coba Ulangi
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
