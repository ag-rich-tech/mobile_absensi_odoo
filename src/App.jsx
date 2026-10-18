import React, { useState, useEffect, useCallback } from 'react';
import WelcomePage from './pages/WelcomePage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import LocationCheckPage from './pages/LocationCheckPage';
import AttendanceCapturePage from './pages/AttendanceCapturePage';
import FaceEnrollmentPage from './pages/FaceEnrollmentPage';
import NotchBar from './components/NotchBar';
import AccountDeactivatedScreen from './components/AccountDeactivatedScreen';
import { getToken, getStoredUser, clearAuth } from './services/api';
import api from './services/api';
import { preloadAttendanceSounds } from './services/soundService';

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
    preloadAttendanceSounds();
    return () => window.removeEventListener('account-deactivated', handleDeactivated);
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
        }
      }
    }).catch(() => {});
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {
      // Abaikan error jaringan saat logout
    }
    clearAuth();
    setUser(null);
    setCurrentScreen('login');
  };

  const [dashboardKey, setDashboardKey] = useState(0);

  const navigateToDashboard = () => {
    setDashboardKey((prev) => prev + 1);
    setCurrentScreen('dashboard');
  };

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
