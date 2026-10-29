import React, { useState, useEffect, useCallback, useRef } from 'react';
import WelcomePage from './pages/WelcomePage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import LocationCheckPage from './pages/LocationCheckPage';
import AttendanceCapturePage from './pages/AttendanceCapturePage';
import FaceEnrollmentPage from './pages/FaceEnrollmentPage';
import NotchBar from './components/NotchBar';
import AccountDeactivatedScreen from './components/AccountDeactivatedScreen';
import { getToken, getStoredUser, setStoredUser, clearAuth } from './services/api';
import api from './services/api';
import { preloadAttendanceSounds } from './services/soundService';
import { App as CapacitorApp } from '@capacitor/app';
import { clearAllDrafts } from './services/draftService';
import { stopHeartbeat } from './services/heartbeat.js';
import {
  getDashboardNav, requestDashboardBackToHome,
  setPendingDashboardNav, deepLinkToDashboardNav,
} from './services/navState';

function App() {
  const [user, setUser] = useState(() => {
    const token = getToken();
    const stored = getStoredUser();
    return (token && stored) ? stored : null;
  });

  const [currentScreen, setCurrentScreen] = useState(() => {
    const token = getToken();
    const stored = getStoredUser();
    return (token && stored) ? 'dashboard' : 'welcome';
  });

  const [deactivatedModal, setDeactivatedModal] = useState({
    isOpen: false,
    message: '',
  });

  const [isFullScreen, setIsFullScreen] = useState(false);

  // Alur Presensi Baru
  const [attendanceType, setAttendanceType] = useState('masuk'); // 'masuk' | 'pulang'
  const [attendanceLocationData, setAttendanceLocationData] = useState(null);
  const [dashboardContext, setDashboardContext] = useState({
    officeLocation: null,
    jamKerja: null,
  });

  // C5 (restore descriptor, jalur dashboard): bila server MENGIRIM
  // face_descriptor milik user login (sejak ag 1.2.23 server memang
  // mengirimnya; api.js mem-parse string JSON-nya) dan user tersimpan
  // belum memilikinya, simpan ke localStorage. Dijaga ketat: hanya
  // descriptor non-kosong, hanya bila tersimpan belum punya, dan hanya
  // dari res.pegawai dashboard sesi login sendiri — tidak pernah
  // descriptor orang lain.
  const restoreFaceDescriptor = (pegawai) => {
    const desc = pegawai?.face_descriptor;
    const incomingValid = Array.isArray(desc) ? desc.length > 0 : Boolean(desc);
    if (!incomingValid) return;
    try {
      const stored = getStoredUser();
      if (!stored) return;
      const storedDesc = stored.face_descriptor;
      const storedValid = Array.isArray(storedDesc) ? storedDesc.length > 0 : Boolean(storedDesc);
      if (!storedValid) setStoredUser({ ...stored, face_descriptor: desc });
    } catch {
      // Storage gagal — abaikan, state tetap jalan.
    }
  };

  // Global Listener: Deteksi jika akun dinonaktifkan oleh Admin secara realtime
  useEffect(() => {
    const handleDeactivated = (e) => {
      clearAuth();
      setUser(null);
      setDeactivatedModal({
        isOpen: true,
        message: e.detail?.message || 'Status pegawai Anda telah dinonaktifkan oleh administrator.',
      });
    };

    window.addEventListener('account-deactivated', handleDeactivated);
    // C23: error auth dari adapter/view mana pun -> kembali ke login.
    const handleAuthExpired = () => handleLogout();
    window.addEventListener('auth-expired', handleAuthExpired);
    preloadAttendanceSounds();
    return () => {
      window.removeEventListener('account-deactivated', handleDeactivated);
      window.removeEventListener('auth-expired', handleAuthExpired);
    };
  }, []);

  useEffect(() => {
    const token = getToken();
    const storedUser = getStoredUser();
    if (token && storedUser) {
      setUser(storedUser);
      // Muat data konteks kantor dan jam kerja secara background
      api.getDashboard().then((res) => {
        if (res.pegawai && res.pegawai.status_aktif === false) {
          clearAuth();
          setUser(null);
          setDeactivatedModal({
            isOpen: true,
            message: 'Status pegawai Anda telah dinonaktifkan oleh administrator.',
          });
          return;
        }

        if (res.success) {
          setDashboardContext({
            officeLocation: res.lokasi_kantor,
            allLocations: res.semua_lokasi || [],
            jamKerja: res.jam_kerja_hari_ini,
          });
          if (res.pegawai) {
            setUser((prev) => ({ ...prev, ...res.pegawai }));
            restoreFaceDescriptor(res.pegawai);
          }
        }
      }).catch((err) => {
        if (err?.data?.account_inactive || err?.message?.toLowerCase().includes('nonaktif')) {
          clearAuth();
          setUser(null);
          setDeactivatedModal({
            isOpen: true,
            message: err?.message || 'Status pegawai Anda telah dinonaktifkan oleh administrator.',
          });
        } else if (err?.status === 401) {
          handleLogout();
        }
      });
    }
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setCurrentScreen('dashboard');
    api.getDashboard().then((res) => {
      if (res.success) {
        setDashboardContext({
          officeLocation: res.lokasi_kantor,
          allLocations: res.semua_lokasi || [],
          jamKerja: res.jam_kerja_hari_ini,
        });
        if (res.pegawai) {
          setUser((prev) => ({ ...prev, ...res.pegawai }));
          restoreFaceDescriptor(res.pegawai);
        }
      }
    }).catch(() => {});
  };

  const handleLogout = async () => {
    // Heartbeat native harus berhenti di logout (alarm bertahan melewati
    // restart app; Dashboard yang ter-unmount juga menghentikannya lewat
    // cleanup efek, tapi logout eksplisit di sini adalah jaring pengaman
    // supaya token tidak tertinggal di SharedPreferences sesudah keluar).
    // Fire-and-forget: tidak boleh menunda logout bila plugin gagal.
    stopHeartbeat().catch(() => {});
    try {
      await api.logout();
    } catch {
      // Abaikan error jaringan saat logout
    }
    clearAllDrafts();
    clearAuth();
    setUser(null);
    setCurrentScreen('login');
  };

  const [dashboardKey, setDashboardKey] = useState(0);

  const navigateToDashboard = () => {
    setDashboardKey((prev) => prev + 1);
    setCurrentScreen('dashboard');
  };

  // Ref layar aktif untuk handler back (menghindari closure basi:
  // listener didaftarkan sekali, tapi layar berubah-ubah).
  const screenRef = useRef(currentScreen);
  screenRef.current = currentScreen;

  // Tombol Back Android (plugin @capacitor/app — wajib npm install +
  // npx cap sync sebelum rebuild APK). Sadar subview DashboardPage
  // (registry navState): subview -> kembali ke Beranda; Beranda ->
  // exitApp. Layar alur presensi -> dashboard; login -> welcome.
  // Deep link (appUrlOpen): segmen dikenal -> subview itu (atau
  // Beranda bila belum login — pending dikonsumsi DashboardPage saat
  // mount sesudah login); segmen tak dikenal -> Beranda.
  useEffect(() => {
    let backHandle = null;
    let linkHandle = null;
    const onBackButton = () => {
      const screen = screenRef.current;
      if (screen === 'dashboard') {
        if (getDashboardNav() !== 'home') {
          requestDashboardBackToHome();
        } else if (typeof CapacitorApp.exitApp === 'function') {
          CapacitorApp.exitApp();
        }
      } else if (
        screen === 'location_check'
        || screen === 'attendance_capture'
        || screen === 'face_enrollment'
      ) {
        navigateToDashboard();
      } else if (screen === 'login') {
        setCurrentScreen('welcome');
      } else if (typeof CapacitorApp.exitApp === 'function') {
        CapacitorApp.exitApp();
      }
    };
    const onAppUrlOpen = ({ url }) => {
      const nav = deepLinkToDashboardNav(url);
      setPendingDashboardNav(nav);
      navigateToDashboard();
    };
    try {
      const p1 = CapacitorApp.addListener('backButton', onBackButton);
      if (p1 && typeof p1.then === 'function') {
        p1.then((h) => { backHandle = h; }).catch((err) => { console.warn('Gagal mendaftarkan listener backButton @capacitor/app:', err); });
      } else { backHandle = p1; }
      const p2 = CapacitorApp.addListener('appUrlOpen', onAppUrlOpen);
      if (p2 && typeof p2.then === 'function') {
        p2.then((h) => { linkHandle = h; }).catch((err) => { console.warn('Gagal mendaftarkan listener appUrlOpen @capacitor/app:', err); });
      } else { linkHandle = p2; }
    } catch (err) {
      // Bukan Android / plugin belum sync — web tetap jalan, tapi
      // degradasi kini terlihat di log (bukan diam-diam).
      console.warn('Listener backButton/appUrlOpen @capacitor/app tidak terdaftar (bukan Android / plugin belum cap sync):', err);
    }
    return () => {
      if (backHandle && typeof backHandle.remove === 'function') backHandle.remove();
      if (linkHandle && typeof linkHandle.remove === 'function') linkHandle.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Status koneksi untuk banner offline (navigator.onLine + event
  // online/offline). Banner dirender di bawah; tombol "Coba lagi"
  // memuat ulang halaman (boot ulang dari token tersimpan) sehingga
  // layar apa pun yang gagal muat bisa dicoba lagi.
  const [isOnline, setIsOnline] = useState(
    () => (typeof navigator !== 'undefined' ? navigator.onLine : true)
  );
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // Navigasi Alur Presensi:
  // 1. Dari Dashboard: klik Absen Masuk/Pulang -> Masuk ke Menu Lokasi (Maps & Titik Karyawan)
  const handleStartAttendance = (type) => {
    setAttendanceType(type);
    setCurrentScreen('location_check');
  };

  // 2. Dari Menu Lokasi: tombol "Lanjutkan" ditekan setelah berada di lokasi -> Menuju Halaman Kamera Absensi
  const handleProceedToCapture = (locationResult) => {
    setAttendanceLocationData(locationResult);
    setCurrentScreen('attendance_capture');
  };

  // 3. Dari Halaman Kamera: setelah absen sukses divalidasi server -> Kembali ke Dashboard dengan data fresh
  const handleAttendanceSuccess = () => {
    navigateToDashboard();
  };

  // 4. Navigasi Pendaftaran Wajah Master
  const handleNavigateToEnrollment = () => {
    setCurrentScreen('face_enrollment');
  };

  // Handler sinkronisasi titik lokasi kantor (memoized agar referensi stabil)
  const handleOfficeLocationUpdate = useCallback((freshOffice, freshAll) => {
    setDashboardContext((prev) => ({
      ...prev,
      officeLocation: freshOffice,
      allLocations: freshAll || prev.allLocations,
    }));
  }, []);

  return (
    <div className="app-viewport-wrapper">
      {/* Smartphone & Tablet Device Container */}
      <main className="mobile-device-container">
        {/* Banner offline: tampil saat navigator.onLine false. */}
        {!isOnline && (
          <div
            role="alert"
            style={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              padding: '10px 16px',
              backgroundColor: '#fef2f2',
              borderBottom: '1px solid #fecaca',
              color: '#991b1b',
              fontSize: '12px',
              fontWeight: '700',
              zIndex: 60
            }}
          >
            <span>Tidak ada koneksi internet.</span>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                padding: '4px 12px',
                borderRadius: '6px',
                border: '1px solid #fca5a5',
                backgroundColor: '#ffffff',
                color: '#b91c1c',
                fontSize: '11px',
                fontWeight: '800',
                cursor: 'pointer',
                flexShrink: 0
              }}
            >
              Coba lagi
            </button>
          </div>
        )}
        {/* Page Switcher */}
        {currentScreen === 'welcome' && (
          <WelcomePage onStartLogin={() => setCurrentScreen('login')} />
        )}

        {currentScreen === 'login' && (
          <LoginPage
            onBack={() => setCurrentScreen('welcome')}
            onLoginSuccess={(userData) => {
              setDashboardKey((prev) => prev + 1);
              handleLoginSuccess(userData);
            }}
          />
        )}

        {currentScreen === 'dashboard' && (
          <DashboardPage
            key={dashboardKey}
            user={user}
            onLogout={handleLogout}
            onStartAttendance={handleStartAttendance}
            onNavigateToEnrollment={handleNavigateToEnrollment}
          />
        )}

        {/* ALUR 1: Menu Lokasi Peta & Verifikasi Geofence */}
        {currentScreen === 'location_check' && (
          <LocationCheckPage
            type={attendanceType}
            user={user}
            officeLocation={dashboardContext.officeLocation}
            allLocations={dashboardContext.allLocations}
            jamKerja={dashboardContext.jamKerja}
            onOfficeLocationUpdate={handleOfficeLocationUpdate}
            onBack={navigateToDashboard}
            onProceed={handleProceedToCapture}
          />
        )}

        {/* ALUR 2: Halaman Kamera Selfie & Tombol Absen Sekarang */}
        {currentScreen === 'attendance_capture' && (
          <AttendanceCapturePage
            type={attendanceType}
            user={user}
            locationData={attendanceLocationData}
            jamKerja={dashboardContext.jamKerja}
            onBack={() => setCurrentScreen('location_check')}
            onSuccess={handleAttendanceSuccess}
            onNavigateToEnrollment={handleNavigateToEnrollment}
          />
        )}

        {/* ALUR 3: Pendaftaran Wajah Biometrik (Face Enrollment) */}
        {currentScreen === 'face_enrollment' && (
          <FaceEnrollmentPage
            user={user}
            onBack={navigateToDashboard}
            onSuccess={(updatedPegawai) => {
              if (updatedPegawai) {
                setUser((prev) => ({ ...prev, ...updatedPegawai }));
              }
              navigateToDashboard();
            }}
          />
        )}

        {/* LAYAR KHUSUS AKUN DINONAKTIFKAN (APLIKASI OFF OTOMATIS) */}
        {deactivatedModal.isOpen && (
          <AccountDeactivatedScreen
            message={deactivatedModal.message}
            onClose={() => {
              setDeactivatedModal({ isOpen: false, message: '' });
              setCurrentScreen('welcome');
            }}
          />
        )}
      </main>
    </div>
  );
}

export default App;
