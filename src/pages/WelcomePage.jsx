import React, { useState, useEffect } from 'react';
import { 
  MapPin, ShieldCheck, Clock, ArrowRight, Sparkles, Smartphone, 
  Camera, HardDrive, CheckCircle2, X, RefreshCw, ChevronRight
} from 'lucide-react';

export default function WelcomePage({ onStartLogin }) {
  const [activeSlide, setActiveSlide] = useState(0);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [isRequestingPermissions, setIsRequestingPermissions] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState({
    gps: 'prompt', // 'granted' | 'prompt' | 'denied'
    camera: 'prompt',
    storage: 'granted',
  });
  const [isGrantedSuccess, setIsGrantedSuccess] = useState(false);

  const isGpsGranted = permissionStatus.gps === 'granted';
  const isCameraGranted = permissionStatus.camera === 'granted';
  const allGranted = isGpsGranted && isCameraGranted;

  // Periksa izin sistem dan buka modal secara otomatis saat pertama kali dibuka
  useEffect(() => {
    let isMounted = true;

    const checkSystemPermissions = async () => {
      let gpsState = 'prompt';
      let cameraState = 'prompt';

      try {
        if (navigator?.permissions?.query) {
          try {
            const gpsPerm = await navigator.permissions.query({ name: 'geolocation' });
            gpsState = gpsPerm.state;
          } catch (_) {}

          try {
            const camPerm = await navigator.permissions.query({ name: 'camera' });
            cameraState = camPerm.state;
          } catch (_) {}
        }
      } catch (e) {
        console.warn('Query permissions unsupported:', e);
      }

      if (isMounted) {
        const fullyGranted = gpsState === 'granted' && cameraState === 'granted';
        setPermissionStatus({
          gps: gpsState,
          camera: cameraState,
          storage: 'granted',
        });

        // Tampilkan pop-up izin otomatis setelah transisi halaman selesai
        // jika izin belum diberikan dan belum di-dismiss pada sesi ini
        const dismissed = sessionStorage.getItem('welcome_perm_modal_dismissed');
        if (!fullyGranted && !dismissed) {
          const timer = setTimeout(() => {
            if (isMounted) {
              setShowPermissionModal(true);
            }
          }, 500);
          return () => clearTimeout(timer);
        }
      }
    };

    checkSystemPermissions();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleStartClick = () => {
    if (allGranted) {
      onStartLogin();
    } else {
      setShowPermissionModal(true);
    }
  };

  const handleCloseModal = (proceedToLogin = false) => {
    setShowPermissionModal(false);
    sessionStorage.setItem('welcome_perm_modal_dismissed', 'true');
    if (proceedToLogin) {
      onStartLogin();
    }
  };

  const handleGrantPermissions = async () => {
    setIsRequestingPermissions(true);
    let updatedGps = permissionStatus.gps;
    let updatedCamera = permissionStatus.camera;

    try {
      // 1. Minta Izin GPS Lokasi
      if ('geolocation' in navigator) {
        await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            () => {
              updatedGps = 'granted';
              resolve(true);
            },
            () => {
              resolve(false);
            },
            { enableHighAccuracy: true, timeout: 5000 }
          );
        });
      }

      // 2. Minta Izin Kamera Selfie
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user' },
            audio: false,
          });
          updatedCamera = 'granted';
          stream.getTracks().forEach((track) => track.stop());
        } catch (e) {
          console.warn('Camera permission prompt error:', e);
        }
      }

      const isNowFullyGranted = updatedGps === 'granted' && updatedCamera === 'granted';
      setPermissionStatus({
        gps: updatedGps,
        camera: updatedCamera,
        storage: 'granted',
      });

      if (isNowFullyGranted) {
        setIsGrantedSuccess(true);
        localStorage.setItem('smart_presensi_permissions_granted', 'true');
      }
      localStorage.setItem('smart_presensi_permissions_requested', 'true');
      sessionStorage.setItem('welcome_perm_modal_dismissed', 'true');

      // Tampilkan feedback sukses sejenak lalu arahkan ke login
      setTimeout(() => {
        setIsRequestingPermissions(false);
        setShowPermissionModal(false);
        onStartLogin();
      }, 700);
    } catch (err) {
      console.error('Error requesting permissions:', err);
      setIsRequestingPermissions(false);
    }
  };

  const slides = [
    {
      icon: MapPin,
      badge: 'Geofencing GPS',
      title: 'Presensi Akurat Berbasis Radius Kantor',
      desc: 'Verifikasi lokasi kehadiran otomatis dengan koordinat GPS presisi tinggi.',
    },
    {
      icon: ShieldCheck,
      badge: 'Selfie & Anti-Fraud',
      title: 'Verifikasi Wajah & Single Device Lock',
      desc: 'Kehadiran aman dengan foto selfie kamera depan dan penguncian perangkat.',
    },
    {
      icon: Clock,
      badge: 'Fleksibel 24 Jam',
      title: 'Mendukung Shift & Jam Lintas Hari',
      desc: 'Sistem cerdas mengatur jadwal kerja reguler, paruh waktu, hingga shift malam.',
    },
  ];

  const current = slides[activeSlide];
  const IconComponent = current.icon;

  return (
    <div className="screen-scroll-area no-nav animate-fade-in" style={{
      paddingTop: 'max(40px, calc(env(safe-area-inset-top, 0px) + 16px))',
      paddingBottom: 'max(40px, calc(env(safe-area-inset-bottom, 0px) + 16px))',
      paddingLeft: '20px',
      paddingRight: '20px',
      minHeight: '100%',
      justifyContent: 'center'
    }}>
      <div className="tablet-centered-card" style={{ width: '100%', minHeight: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        {/* Top Bar Branding */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img
              src="/images/Logo_AG.png"
              alt="Ali Attendandce"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '12px',
                objectFit: 'contain',
                boxShadow: 'var(--shadow-primary)'
              }}
            />
            <span style={{ fontWeight: '800', fontSize: '18px', letterSpacing: '-0.5px', color: 'var(--text-main)' }}>
              Ali <span style={{ color: 'var(--primary-600)' }}>Attendance</span>
            </span>
          </div>

          <div style={{
            padding: '4px 10px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--primary-50)',
            color: 'var(--primary-700)',
            fontSize: '11px',
            fontWeight: '700',
            border: '1px solid var(--primary-100)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <Sparkles size={12} />
            <span>v2.0 Mobile</span>
          </div>
        </div>

        {/* Center Hero Visual Card */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '20px 0' }}>
          {/* Animated Visual Circle */}
          <div style={{
            position: 'relative',
            width: '200px',
            height: '200px',
            marginBottom: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {/* Ambient Glow */}
            <div style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(249, 115, 22, 0.18) 0%, rgba(255, 255, 255, 0) 70%)',
              filter: 'blur(10px)',
            }}></div>

            {/* Outer Ring */}
            <div style={{
              position: 'absolute',
              width: '180px',
              height: '180px',
              borderRadius: '50%',
              border: '2px dashed var(--primary-200)',
            }}></div>

            {/* Inner Card Icon */}
            <div style={{
              width: '120px',
              height: '120px',
              borderRadius: '32px',
              background: 'linear-gradient(145deg, #ffffff, #fff7ed)',
              border: '2px solid var(--primary-100)',
              boxShadow: '0 20px 35px -10px rgba(234, 88, 12, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary-600)',
              zIndex: 2,
              transition: 'all 0.3s ease'
            }}>
              <IconComponent size={56} strokeWidth={2.2} />
            </div>
          </div>

          {/* Feature Badge */}
          <div style={{
            padding: '4px 12px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--primary-50)',
            color: 'var(--primary-700)',
            fontSize: '11px',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '12px'
          }}>
            {current.badge}
          </div>

          {/* Title & Desc */}
          <h2 style={{
            fontSize: '22px',
            fontWeight: '800',
            lineHeight: '1.25',
            color: 'var(--text-main)',
            marginBottom: '10px',
            letterSpacing: '-0.5px'
          }}>
            {current.title}
          </h2>

          <p style={{
            fontSize: '13px',
            lineHeight: '1.5',
            color: 'var(--text-muted)',
            maxWidth: '300px',
          }}>
            {current.desc}
          </p>

          {/* Pagination Dots */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '28px' }}>
            {slides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveSlide(idx)}
                style={{
                  width: activeSlide === idx ? '24px' : '8px',
                  height: '8px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: activeSlide === idx ? 'var(--primary-600)' : 'var(--border-light)',
                  border: 'none',
                  transition: 'all 0.3s ease',
                  padding: 0,
                  cursor: 'pointer'
                }}
              />
            ))}
          </div>
        </div>

        {/* Bottom Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', paddingBottom: '8px' }}>
          {/* Status Hak Akses Perangkat Quick Strip */}
          <button
            type="button"
            onClick={() => setShowPermissionModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderRadius: '16px',
              backgroundColor: allGranted ? '#f0fdf4' : '#fff7ed',
              border: `1px solid ${allGranted ? '#bbf7d0' : '#fed7aa'}`,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              width: '100%',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
              textAlign: 'left'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '30px',
                height: '30px',
                borderRadius: '10px',
                backgroundColor: allGranted ? '#16a34a' : '#ea580c',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                flexShrink: 0
              }}>
                <ShieldCheck size={18} />
              </div>
              <div>
                <div style={{ fontSize: '12px', fontWeight: '800', color: allGranted ? '#166534' : '#9a3412', lineHeight: 1.2 }}>
                  {allGranted ? 'Hak Akses Perangkat Siap' : 'Izin Hak Akses Perangkat'}
                </div>
                <div style={{ fontSize: '10px', color: allGranted ? '#15803d' : '#c2410c', marginTop: '1px' }}>
                  GPS Lokasi • Kamera • Penyimpanan
                </div>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '8px',
              backgroundColor: '#ffffff',
              border: `1px solid ${allGranted ? '#bbf7d0' : '#fed7aa'}`,
              fontSize: '11px',
              fontWeight: '700',
              color: allGranted ? '#16a34a' : '#ea580c',
              flexShrink: 0
            }}>
              <span>{allGranted ? 'Lengkap ✓' : 'Atur Izin'}</span>
              <ChevronRight size={13} />
            </div>
          </button>

          {/* Tombol Mulai Presensi */}
          <button
            type="button"
            onClick={handleStartClick}
            style={{
              width: '100%',
              height: '52px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--primary-gradient)',
              border: 'none',
              color: '#ffffff',
              fontSize: '15px',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: 'var(--shadow-primary)',
              cursor: 'pointer'
            }}
          >
            <span>Mulai Presensi</span>
            <ArrowRight size={18} strokeWidth={2.5} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: 'var(--text-light)', fontSize: '11px' }}>
            <Smartphone size={13} />
            <span>Single Device Security Enabled</span>
          </div>
        </div>
      </div>

      {/* Modal Popup Izin Hak Akses Android / Web */}
      {showPermissionModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          animation: 'fadeIn 0.25s ease-out'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '28px',
            padding: '24px 20px',
            width: '100%',
            maxWidth: '430px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid rgba(226, 232, 240, 0.8)',
            maxHeight: '90vh',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            {/* Header Popup */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '14px',
                  background: allGranted 
                    ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' 
                    : 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
                  border: `1px solid ${allGranted ? '#bbf7d0' : '#fed7aa'}`,
                  color: allGranted ? '#16a34a' : 'var(--primary-600)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(234, 88, 12, 0.15)'
                }}>
                  <ShieldCheck size={26} strokeWidth={2.4} />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', margin: 0, letterSpacing: '-0.3px' }}>
                    Izin Hak Akses Perangkat
                  </h3>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                    Diperlukan untuk fitur absensi mobile
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleCloseModal(false)}
                style={{
                  width: '32px',
                  height: '32px',
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
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: '12px', color: '#475569', lineHeight: 1.5, margin: 0 }}>
              Untuk menjamin keakuratan presensi anti-fraud dan keamanan data pegawai, aplikasi memerlukan hak akses berikut pada perangkat Anda:
            </p>

            {/* List 3 Izin */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* 1. Izin GPS Lokasi */}
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '12px',
                borderRadius: '16px',
                backgroundColor: isGpsGranted ? '#f0fdf4' : '#fff7ed',
                border: `1px solid ${isGpsGranted ? '#bbf7d0' : '#fed7aa'}`,
                transition: 'all 0.2s ease'
              }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '12px',
                  backgroundColor: isGpsGranted ? '#16a34a' : '#ea580c',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <MapPin size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: isGpsGranted ? '#166534' : '#9a3412' }}>
                      Lokasi GPS Presisi
                    </span>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: '800',
                      color: isGpsGranted ? '#16a34a' : '#ea580c',
                      backgroundColor: '#ffffff',
                      padding: '2px 7px',
                      borderRadius: '6px',
                      border: `1px solid ${isGpsGranted ? '#bbf7d0' : '#fed7aa'}`
                    }}>
                      {isGpsGranted ? 'Diizinkan ✓' : 'Wajib'}
                    </span>
                  </div>
                  <p style={{ fontSize: '11px', color: isGpsGranted ? '#15803d' : '#c2410c', margin: '3px 0 0 0', lineHeight: 1.35 }}>
                    Memverifikasi posisi keberadaan Anda di radius area kantor (Geofencing).
                  </p>
                </div>
              </div>

              {/* 2. Izin Kamera */}
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '12px',
                borderRadius: '16px',
                backgroundColor: isCameraGranted ? '#f0fdf4' : '#eff6ff',
                border: `1px solid ${isCameraGranted ? '#bbf7d0' : '#bfdbfe'}`,
                transition: 'all 0.2s ease'
              }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '12px',
                  backgroundColor: isCameraGranted ? '#16a34a' : '#2563eb',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Camera size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: isCameraGranted ? '#166534' : '#1e40af' }}>
                      Kamera Selfie & Biometrik
                    </span>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: '800',
                      color: isCameraGranted ? '#16a34a' : '#2563eb',
                      backgroundColor: '#ffffff',
                      padding: '2px 7px',
                      borderRadius: '6px',
                      border: `1px solid ${isCameraGranted ? '#bbf7d0' : '#bfdbfe'}`
                    }}>
                      {isCameraGranted ? 'Diizinkan ✓' : 'Wajib'}
                    </span>
                  </div>
                  <p style={{ fontSize: '11px', color: isCameraGranted ? '#15803d' : '#1d4ed8', margin: '3px 0 0 0', lineHeight: 1.35 }}>
                    Mengambil foto selfie kehadiran dan validasi biometrik wajah anti-titip absen.
                  </p>
                </div>
              </div>

              {/* 3. Izin Penyimpanan */}
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '12px',
                borderRadius: '16px',
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0'
              }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '12px',
                  backgroundColor: '#16a34a',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <HardDrive size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: '#166534' }}>
                      Penyimpanan Perangkat
                    </span>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: '800',
                      color: '#16a34a',
                      backgroundColor: '#ffffff',
                      padding: '2px 7px',
                      borderRadius: '6px',
                      border: '1px solid #bbf7d0'
                    }}>
                      Aktif ✓
                    </span>
                  </div>
                  <p style={{ fontSize: '11px', color: '#15803d', margin: '3px 0 0 0', lineHeight: 1.35 }}>
                    Mengunggah foto profil, berkas izin/cuti, dan mengunduh berkas slip gaji.
                  </p>
                </div>
              </div>
            </div>

            {/* Tombol Aksi */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
              <button
                type="button"
                disabled={isRequestingPermissions}
                onClick={allGranted ? () => handleCloseModal(true) : handleGrantPermissions}
                style={{
                  width: '100%',
                  height: '48px',
                  borderRadius: 'var(--radius-md)',
                  background: allGranted 
                    ? 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)' 
                    : 'var(--primary-gradient)',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: isRequestingPermissions ? 'wait' : 'pointer',
                  boxShadow: allGranted 
                    ? '0 10px 20px -5px rgba(22, 163, 74, 0.4)' 
                    : 'var(--shadow-primary)',
                  opacity: isRequestingPermissions ? 0.75 : 1,
                  transition: 'all 0.3s ease'
                }}
              >
                {isRequestingPermissions ? (
                  <>
                    <RefreshCw size={17} className="animate-spin" />
                    <span>Meminta Izin Sistem...</span>
                  </>
                ) : allGranted || isGrantedSuccess ? (
                  <>
                    <CheckCircle2 size={18} strokeWidth={2.4} />
                    <span>Hak Akses Siap! Lanjut ke Login</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} strokeWidth={2.4} />
                    <span>Izinkan Semua Hak Akses</span>
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={isRequestingPermissions}
                onClick={() => handleCloseModal(true)}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                {allGranted ? 'Tutup & Masuk' : 'Lanjutkan Nanti'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
