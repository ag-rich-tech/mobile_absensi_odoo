import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin, Clock, Camera, LogOut, Calendar, User, Briefcase,
  CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck, RefreshCw,
  ChevronRight, Building, Award, History, CalendarDays, FileText,
  PlaneTakeoff, Timer, CircleDollarSign, ChevronLeft, Info, ShieldAlert,
  Receipt, HelpCircle, Coffee, Check, Sparkles, CheckCheck, Megaphone, Bell, Wallet, Users
} from 'lucide-react';
import AttendanceModal from '../components/AttendanceModal';
import BottomNav from '../components/BottomNav';
import api, { getServerDate, formatTime24 } from '../services/api';
import { checkFakeGps } from '../services/fakeGpsService.js';
import {
  startBackgroundTracking,
  stopBackgroundTracking,
  shouldSendTrackingPing,
  markTrackingPingSent,
  resetTrackingPingThrottle,
} from '../services/backgroundTracking.js';
import RiwayatView from '../components/views/RiwayatView';
import IzinView from '../components/views/IzinView';
import DinasView from '../components/views/DinasView';
import LemburView from '../components/views/LemburView';
import JadwalView from '../components/views/JadwalView';
import DendaView from '../components/views/DendaView';
import SlipGajiView from '../components/views/SlipGajiView';
import MasalahView from '../components/views/MasalahView';
import ProfileView from '../components/views/ProfileView';
import TugasView from '../components/views/TugasView';
import ApprovalView from '../components/views/ApprovalView';
import PengumumanView from '../components/views/PengumumanView';
import ReimbursementView from '../components/views/ReimbursementView';
import KehadiranBawahanView from '../components/views/KehadiranBawahanView';
import DaftarKaryawanView from '../components/views/DaftarKaryawanView';
// Komponen Vektor Awan untuk Animasi Berjalan di Card Presensi
const CloudSvgA = ({ style = {} }) => (
  <svg viewBox="0 0 120 50" fill="#ffffff" style={{ display: 'block', ...style }}>
    <path d="M22 40h76a16 16 0 0 0 15-20 18 18 0 0 0-21-12 25 25 0 0 0-47-2 16 16 0 0 0-18 16 14 14 0 0 0-5 18z" />
  </svg>
);

const CloudSvgB = ({ style = {} }) => (
  <svg viewBox="0 0 140 45" fill="#ffffff" style={{ display: 'block', ...style }}>
    <path d="M18 36h104a14 14 0 0 0 13-17 17 17 0 0 0-22-10 24 24 0 0 0-42-3 20 20 0 0 0-27 8 15 15 0 0 0-18 12 12 12 0 0 0-8 10z" />
  </svg>
);

const CloudSvgC = ({ style = {} }) => (
  <svg viewBox="0 0 90 35" fill="#ffffff" style={{ display: 'block', ...style }}>
    <path d="M14 28h62a12 12 0 0 0 11-14 14 14 0 0 0-18-8 18 18 0 0 0-32-1 12 12 0 0 0-15 11 10 10 0 0 0-8 12z" />
  </svg>
);

function AnimatedCloudsBackground({ isNight = false }) {
  return (
    <div className="clouds-container" aria-hidden="true">
      {/* Taburan Bintang Berkelap-Kelip (Khusus Malam Hari) */}
      {isNight && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <span className="twinkle-star" style={{ top: '14%', left: '10%', width: '3px', height: '3px', animationDelay: '0.2s' }} />
          <span className="twinkle-star" style={{ top: '26%', left: '22%', width: '2px', height: '2px', animationDelay: '1.2s' }} />
          <span className="twinkle-star" style={{ top: '12%', left: '46%', width: '3.5px', height: '3.5px', animationDelay: '0.6s' }} />
          <span className="twinkle-star" style={{ top: '34%', left: '66%', width: '2.5px', height: '2.5px', animationDelay: '1.8s' }} />
          <span className="twinkle-star" style={{ top: '16%', left: '82%', width: '3px', height: '3px', animationDelay: '2.3s' }} />
          <span className="twinkle-star" style={{ top: '48%', left: '32%', width: '2px', height: '2px', animationDelay: '1.5s' }} />
          <span className="twinkle-star" style={{ top: '64%', left: '76%', width: '2.5px', height: '2.5px', animationDelay: '0.9s' }} />
          <span className="twinkle-star" style={{ top: '56%', left: '16%', width: '3px', height: '3px', animationDelay: '2.0s' }} />
        </div>
      )}

      {/* Layer 1: Awan Lambat Latar Belakang */}
      <div className="clouds-track-slow" style={{ opacity: isNight ? 0.12 : 0.16 }}>
        <div style={{ width: '50%', height: '100%', position: 'relative' }}>
          <CloudSvgB style={{ position: 'absolute', top: '8%', left: '5%', width: '130px' }} />
          <CloudSvgA style={{ position: 'absolute', top: '40%', left: '54%', width: '110px' }} />
        </div>
        <div style={{ width: '50%', height: '100%', position: 'relative' }}>
          <CloudSvgB style={{ position: 'absolute', top: '8%', left: '5%', width: '130px' }} />
          <CloudSvgA style={{ position: 'absolute', top: '40%', left: '54%', width: '110px' }} />
        </div>
      </div>

      {/* Layer 2: Awan Sedang Tengah */}
      <div className="clouds-track-medium" style={{ opacity: isNight ? 0.16 : 0.22 }}>
        <div style={{ width: '50%', height: '100%', position: 'relative' }}>
          <CloudSvgA style={{ position: 'absolute', top: '2%', left: '36%', width: '120px' }} />
          <CloudSvgC style={{ position: 'absolute', top: '50%', left: '10%', width: '80px' }} />
          <CloudSvgB style={{ position: 'absolute', bottom: '-8px', left: '70%', width: '135px' }} />
        </div>
        <div style={{ width: '50%', height: '100%', position: 'relative' }}>
          <CloudSvgA style={{ position: 'absolute', top: '2%', left: '36%', width: '120px' }} />
          <CloudSvgC style={{ position: 'absolute', top: '50%', left: '10%', width: '80px' }} />
          <CloudSvgB style={{ position: 'absolute', bottom: '-8px', left: '70%', width: '135px' }} />
        </div>
      </div>

      {/* Layer 3: Awan Cepat Halus Depan */}
      <div className="clouds-track-foreground" style={{ opacity: isNight ? 0.10 : 0.15 }}>
        <div style={{ width: '50%', height: '100%', position: 'relative' }}>
          <CloudSvgC style={{ position: 'absolute', top: '20%', left: '82%', width: '70px' }} />
          <CloudSvgA style={{ position: 'absolute', top: '65%', left: '42%', width: '90px' }} />
        </div>
        <div style={{ width: '50%', height: '100%', position: 'relative' }}>
          <CloudSvgC style={{ position: 'absolute', top: '20%', left: '82%', width: '70px' }} />
          <CloudSvgA style={{ position: 'absolute', top: '65%', left: '42%', width: '90px' }} />
        </div>
      </div>
    </div>
  );
}

// Helper penentuan tema warna & atmosfer langit waktu sistem:
// 1. Pagi: 06:00 - 12:00 -> Biru Langit Cerah
// 2. Siang/Sore: 12:01 - 18:00 -> Orange Hangat Energik
// 3. Malam: 18:01 - 05:59 -> Biru Gelap Midnight Night Sky
const getTimeTheme = (date) => {
  const hour = date.getHours();
  const minute = date.getMinutes();
  const totalMinutes = hour * 60 + minute;

  // 1. Pagi: 06:00 - 12:00 (360 s/d 720 menit)
  if (totalMinutes >= 360 && totalMinutes <= 720) {
    return {
      period: 'pagi',
      badgeText: 'Pagi',
      background: 'linear-gradient(135deg, #0284c7 0%, #0ea5e9 45%, #38bdf8 100%)',
      boxShadow: '0 12px 28px -4px rgba(2, 132, 199, 0.4)',
      sunColor: '#fef08a',
      sunGlow: 'rgba(254, 240, 138, 0.35)',
      isNight: false,
    };
  }

  // 2. Siang: 12:01 - 18:00 (721 s/d 1080 menit)
  if (totalMinutes > 720 && totalMinutes <= 1080) {
    return {
      period: 'siang',
      badgeText: 'Siang',
      background: 'linear-gradient(135deg, #ea580c 0%, #f97316 50%, #fb923c 100%)',
      boxShadow: '0 12px 28px -4px rgba(234, 88, 12, 0.4)',
      sunColor: '#fed7aa',
      sunGlow: 'rgba(254, 215, 170, 0.35)',
      isNight: false,
    };
  }

  // 3. Malam: 18:01 - 05:59
  return {
    period: 'malam',
    badgeText: 'Malam',
    background: 'linear-gradient(135deg, #090d16 0%, #0f172a 45%, #1e1b4b 100%)',
    boxShadow: '0 12px 28px -4px rgba(15, 23, 42, 0.65)',
    sunColor: '#c7d2fe',
    sunGlow: 'rgba(199, 210, 254, 0.25)',
    isNight: true,
  };
};

export default function DashboardPage({ user: initialUser, onLogout, onStartAttendance, onNavigateToEnrollment }) {
  const [currentTime, setCurrentTime] = useState(getServerDate());
  const [activeNav, setActiveNav] = useState('home'); // 'home' | 'history' | 'profile'
  const [exitingNav, setExitingNav] = useState(null);
  const screenScrollRef = useRef(null);

  const handleNavBack = (targetNav = 'home', callback) => {
    if (exitingNav) return;
    setExitingNav(activeNav);
    setTimeout(() => {
      setActiveNav(targetNav);
      setExitingNav(null);
      if (screenScrollRef.current) {
        screenScrollRef.current.scrollTop = 0;
      }
      if (typeof callback === 'function') callback();
    }, 220);
  };

  const handleNavChange = (newNav) => {
    if (exitingNav) {
      setExitingNav(null);
    }
    setActiveNav(newNav);
  };

  const [modalType, setModalType] = useState(null); // 'masuk' | 'pulang' | null
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [distanceToOffice, setDistanceToOffice] = useState(null);
  // Lokasi terdekat dari daftar yang diizinkan (multi-lokasi 18.0.1.2.0).
  const [nearestOffice, setNearestOffice] = useState(null);
  const [riwayatBulan, setRiwayatBulan] = useState([]);
  const [isLoadingRiwayat, setIsLoadingRiwayat] = useState(false);
  const [pendingApprovalCount, setPendingApprovalCount] = useState(0);
  const [featureFlags, setFeatureFlags] = useState({});
  const [unreadPengumumanCount, setUnreadPengumumanCount] = useState(0);
  const [urgentPengumumanCount, setUrgentPengumumanCount] = useState(0);
  const [statusBawahan, setStatusBawahan] = useState(null);

  // Digital clock tersinkronisasi 100% dengan Server Laravel WIB
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(getServerDate()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeString = formatTime24(currentTime);
  const dateString = currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
  const timeTheme = getTimeTheme(currentTime);

  const loadPendingApprovalCount = async () => {
    try {
      const res = await api.getApprovalCount();
      if (res && res.success) {
        setPendingApprovalCount(res.count || 0);
      }
    } catch {
      // Abaikan jika token/jaringan offline
    }
  };

  const loadPengumumanCount = async () => {
    try {
      const res = await api.getPengumumanCount();
      if (res && res.success) {
        setUnreadPengumumanCount(res.unread_count || 0);
        setUrgentPengumumanCount(res.urgent_count || 0);
      }
    } catch {
      // Abaikan jika token/jaringan offline
    }
  };

  const loadStatusBawahan = async () => {
    try {
      const res = await api.getKehadiranBawahanStatus();
      if (res && res.success) {
        setStatusBawahan(res);
      }
    } catch {
      // Abaikan jika token/jaringan offline
    }
  };

  // 1. Muat Data Dashboard Riil dari Backend dengan Deteksi Status Nonaktif Otomatis
  // On/off fitur dari admin Odoo. Default tampil bila flag belum termuat
  // atau kode tidak dikenal (agar tidak ada menu hilang misterius).
  const isOn = (code) => featureFlags[code] !== false;
  const FEATURE_CODES = ['attendance', 'history', 'leave', 'dinas', 'overtime',
    'payslip', 'helpdesk', 'tasks', 'approval', 'announcement',
    'reimbursement', 'team', 'karyawan'];

  const loadDashboardData = async (showLoading = true) => {
    try {
      if (showLoading) {
        if (!dashboardData) setIsLoading(true);
        else setIsRefreshing(true);
      }
      const res = await api.getDashboard();

      // Cek apakah pegawai telah dinonaktifkan oleh Administrator
      if (res.pegawai && (res.pegawai.status_aktif === false || res.pegawai.status_aktif === 0)) {
        window.dispatchEvent(new CustomEvent('account-deactivated', {
          detail: { message: 'Status akun pegawai Anda telah dinonaktifkan oleh Administrator.' }
        }));
        return;
      }

      if (res.success) {
        setDashboardData(res);
        if (res.fitur) setFeatureFlags(res.fitur);
      }
      loadPendingApprovalCount();
      loadPengumumanCount();
    } catch (err) {
      console.error('Gagal memuat dashboard:', err);
      if (err.data?.account_inactive || err.message?.toLowerCase().includes('nonaktif') || err.message?.toLowerCase().includes('non-aktif')) {
        window.dispatchEvent(new CustomEvent('account-deactivated', {
          detail: { message: err.message || 'Status akun pegawai Anda telah dinonaktifkan oleh Administrator.' }
        }));
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Muat data saat dashboard pertama kali diakses
  useEffect(() => {
    loadDashboardData(true);
    loadPendingApprovalCount();
    loadPengumumanCount();
    loadStatusBawahan();

    // Auto-check status keaktifan akun setiap 15 detik secara background
    const interval = setInterval(() => {
      loadDashboardData(false);
      loadPendingApprovalCount();
      loadPengumumanCount();
      loadStatusBawahan();
    }, 15000);

    // Cek seketika saat aplikasi dibuka kembali dari background/pindah tab/fokus
    const handleTriggerRefresh = () => {
      if (document.visibilityState === 'visible') {
        loadDashboardData(false);
        loadStatusBawahan();
      }
    };

    window.addEventListener('focus', handleTriggerRefresh);
    window.addEventListener('pageshow', handleTriggerRefresh);
    document.addEventListener('visibilitychange', handleTriggerRefresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleTriggerRefresh);
      window.removeEventListener('pageshow', handleTriggerRefresh);
      document.removeEventListener('visibilitychange', handleTriggerRefresh);
    };
  }, []);

  // Selalu segarkan data dashboard setiap kali berpindah kembali ke tab Beranda (home)
  useEffect(() => {
    if (activeNav === 'home') {
      loadDashboardData(false);
      loadStatusBawahan();
    }
  }, [activeNav]);

  // 2. Deteksi GPS pengguna dan hitung jarak ke lokasi TERDEKAT dari
  // daftar yang diizinkan (multi-lokasi 18.0.1.2.0 — bukan satu radius
  // global). Geofence + nama kantor memakai lokasi terdekat itu.
  useEffect(() => {
    const candidates = (dashboardData?.semua_lokasi?.length
      ? dashboardData.semua_lokasi
      : (dashboardData?.lokasi_kantor ? [dashboardData.lokasi_kantor] : []));
    if (!candidates.length) return;

    const haversine = (lat, lon, office) => {
      const R = 6371000;
      const dLat = (office.latitude - lat) * (Math.PI / 180);
      const dLon = (office.longitude - lon) * (Math.PI / 180);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat * (Math.PI / 180)) * Math.cos(office.latitude * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
    };

    // watchPosition (bukan one-shot): badge Dalam/Luar Area ikut
    // berubah saat perangkat BERGERAK masuk/keluar zona. One-shot
    // membuat badge basi bila app dibuka di luar zona lalu pemakai
    // berjalan masuk (Okt 2026: "Luar Area" tidak auto-sync).
    const handlePosition = (pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      setUserLocation({ lat, lon });

      let nearest = null;
      let nearestDist = null;
      for (const office of candidates) {
        const d = haversine(lat, lon, office);
        if (nearestDist === null || d < nearestDist) {
          nearest = office;
          nearestDist = d;
        }
      }
      setNearestOffice(nearest);
      setDistanceToOffice(nearestDist);
    };
    const handlePositionError = (err) => {
      console.warn('GPS location fallback to office simulator:', err.message);
      setNearestOffice(candidates[0]);
      setDistanceToOffice(14); // Fallback jarak dekat untuk pengetesan desktop
    };

    if ('geolocation' in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        handlePosition,
        handlePositionError,
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    } else {
      setNearestOffice(candidates[0]);
      setDistanceToOffice(14);
    }
  }, [dashboardData?.semua_lokasi, dashboardData?.lokasi_kantor]);

  // 3. Muat Riwayat saat tab History aktif
  useEffect(() => {
    if (activeNav === 'history') {
      const fetchRiwayat = async () => {
        setIsLoadingRiwayat(true);
        try {
          const res = await api.getRiwayat();
          if (res.success) {
            setRiwayatBulan(res.riwayat || []);
          }
        } catch (err) {
          console.error('Gagal memuat riwayat:', err);
        } finally {
          setIsLoadingRiwayat(false);
        }
      };
      fetchRiwayat();
    }
  }, [activeNav]);

  const handleAttendanceSuccess = (result) => {
    setModalType(null);
    // Refresh data dashboard riil dari server
    loadDashboardData();
  };

  const [isSubmittingIstirahat, setIsSubmittingIstirahat] = useState(false);

  const handleCatatIstirahat = async (aksi) => {
    if (isSubmittingIstirahat) return;

    if (aksi === 'mulai') {
      const ok = window.confirm('Mulai sesi istirahat sekarang? Jam istirahat Anda akan tercatat dalam sistem.');
      if (!ok) return;
    } else if (aksi === 'lewati') {
      const ok = window.confirm('Lewati sesi istirahat hari ini dan langsung lanjut bekerja?');
      if (!ok) return;
    } else if (aksi === 'selesai') {
      const ok = window.confirm('Selesaikan sesi istirahat dan kembali bekerja?');
      if (!ok) return;
    }

    try {
      setIsSubmittingIstirahat(true);
      const res = await api.catatIstirahat(aksi);
      if (res.success) {
        await loadDashboardData();
      }
    } catch (err) {
      alert(err.message || 'Gagal memproses sesi istirahat');
    } finally {
      setIsSubmittingIstirahat(false);
    }
  };

  const handleLogoutClick = async () => {
    await api.logout();
    onLogout();
  };

  const pegawai = dashboardData?.pegawai || initialUser;
  const jamKerja = dashboardData?.jam_kerja_hari_ini;
  // Lokasi yang ditampilkan + dipakai modal absensi = lokasi terdekat
  // (bila GPS sudah jalan), fallback lokasi pertama dari server.
  const lokasi = nearestOffice || dashboardData?.lokasi_kantor;
  const absensiHariIni = dashboardData?.absensi_hari_ini;
  const stats = dashboardData?.statistik_bulan_ini;
  const riwayatList = dashboardData?.riwayat_terakhir || [];

  const sudahMasukRaw = absensiHariIni?.sudah_masuk;
  const sudahPulang = absensiHariIni?.sudah_pulang;

  const jamMulaiIstirahat = jamKerja?.jam_mulai_istirahat;
  const jamSelesaiIstirahat = jamKerja?.jam_selesai_istirahat;
  const statusIstirahat = absensiHariIni?.status_istirahat || 'belum';
  const jamIstirahatMulai = absensiHariIni?.jam_istirahat_mulai;
  const jamIstirahatSelesai = absensiHariIni?.jam_istirahat_selesai;

  // Cek apakah jam kerja ini memiliki pengaturan jam istirahat
  const adaSettingIstirahat = Boolean(jamMulaiIstirahat);

  // Waktu saat ini dibandingkan dengan jam mulai istirahat setting
  const currentTimeHHMM = timeString.slice(0, 5);
  const isSudahWaktuIstirahat = adaSettingIstirahat && (currentTimeHHMM >= jamMulaiIstirahat);

  // Deteksi apakah batas akhir absen pulang telah terlewati (baik dari flag backend maupun kalkulasi waktu riil)
  const isBatasPulangTerlewati = Boolean(
    absensiHariIni?.is_batas_pulang_terlewati || (
      jamKerja?.batasi_absen &&
      jamKerja?.jam_akhir_pulang &&
      absensiHariIni?.jam_masuk &&
      !absensiHariIni?.jam_pulang &&
      !absensiHariIni?.is_lintas_hari &&
      currentTimeHHMM > jamKerja.jam_akhir_pulang
    )
  );

  // KUNCI: Jika batas akhir pulang telah terlewati, status masuk di-reset agar kembali ke status Absen Masuk untuk sesi berikutnya!
  const sudahMasuk = Boolean(sudahMasukRaw) && !isBatasPulangTerlewati;

  // Live Tracking: kirim ping lokasi tiap 1 JAM selama sesi clock-in aktif.
  // Server (hris.tracking.ping) hanya menerima bila ada sesi berjalan.
  // Hemat baterai: ping rutin pakai akurasi rendah (enableHighAccuracy:
  // false = posisi Wi-Fi/seluler, tanpa kunci GPS presisi); GPS presisi
  // tetap hanya di jalur check-in/out. Throttle 1 jam dipakai BERSAMA
  // watcher background (backgroundTracking.js) supaya total kiriman ke
  // server maksimal 1/jam, baik dari foreground maupun background.
  useEffect(() => {
    if (!sudahMasuk) return;
    let stopped = false;
    resetTrackingPingThrottle();

    const sendPing = () => {
      if (stopped || !navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          if (stopped) return;
          // Deteksi GPS palsu yang sesungguhnya (plugin native Android
          // + heuristik di fakeGpsService). Gagal deteksi = tetap kirim
          // dengan flag false supaya ping audit tidak hilang hanya
          // karena detector error.
          let isFake = false;
          try {
            const fake = await checkFakeGps(pos.coords);
            isFake = Boolean(fake && fake.isFake);
          } catch {
            isFake = false;
          }
          if (stopped) return;
          if (!shouldSendTrackingPing()) return;
          try {
            await api.sendTrackingPing({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy_m: pos.coords.accuracy || 0,
              battery_level: null,
              mock_detected: isFake,
            });
            markTrackingPingSent();
          } catch {
            // Server menolak bila sesi berakhir / duplikat interval — abaikan
          }
        },
        () => {},
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 }
      );
    };

    sendPing(); // langsung kirim sekali saat mulai
    const trackInterval = setInterval(sendPing, 3600000); // 1 jam
    // Pelacakan background Android (foreground service + notifikasi
    // permanen, plugin @capacitor-community/background-geolocation).
    // Gagal mulai (plugin belum di-install/sync, bukan Android, izin
    // ditolak) TIDAK menghentikan ping foreground di atas.
    startBackgroundTracking().catch(() => {});
    return () => {
      stopped = true;
      clearInterval(trackInterval);
      stopBackgroundTracking().catch(() => {});
    };
  }, [sudahMasuk]);

  // Tombol Istirahat & Lewati aktif menggantikan tombol Masuk & Pulang
  const tampilkanOpsiIstirahat = sudahMasuk && !sudahPulang && isSudahWaktuIstirahat && statusIstirahat === 'belum';
  const sedangIstirahat = sudahMasuk && !sudahPulang && statusIstirahat === 'istirahat';

  // Server mengirim radius_m (bukan radius_meter) — pakai kunci yang benar.
  const isInsideGeofence = distanceToOffice !== null ? distanceToOffice <= (lokasi?.radius_m || 100) : true;

  // Status Hari Libur & Hari Kerja
  const isHariLibur = Boolean(jamKerja?.is_hari_libur || !jamKerja?.id || jamKerja?.ada_jadwal_kerja === false);
  const isLiburNasional = Boolean(jamKerja?.is_libur_nasional);
  const namaHariLibur = jamKerja?.nama_libur || jamKerja?.keterangan_jadwal || (isLiburNasional ? 'Libur Nasional' : 'Hari Libur (Day Off)');
  const adaJadwalKerja = !isHariLibur && Boolean(jamKerja?.id);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
      position: 'relative',
      overflow: 'hidden',
      backgroundColor: '#ffffff'
    }}>
      {/* Top Header Profile & Actions */}
      <div className="dashboard-top-header" style={{
        padding: '16px 20px 12px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--border-subtle)',
        backgroundColor: '#ffffff',
        flexShrink: 0,
        zIndex: 30
      }}>
        {/* User Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #f97316, #ea580c)',
              color: '#ffffff',
              fontWeight: '800',
              fontSize: '15px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 10px rgba(234, 88, 12, 0.25)',
              overflow: 'hidden',
              position: 'relative'
            }}>
              {pegawai?.inisial || pegawai?.avatar || 'P'}
              {pegawai?.foto_profil && (
                <img
                  src={pegawai.foto_profil}
                  alt={pegawai?.nama_lengkap || 'Pegawai'}
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                />
              )}
            </div>
            {/* Status Online Green Dot */}
            <span style={{
              position: 'absolute',
              bottom: '-2px',
              right: '-2px',
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: 'var(--success)',
              border: '2px solid #ffffff'
            }}></span>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.3px' }}>
                {pegawai?.nama_lengkap || pegawai?.nama || 'Pegawai'}
              </h3>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '500' }}>
              {pegawai?.nip} • {pegawai?.jabatan || 'Staff'}
            </p>
            {pegawai?.wajib_face_recognition === false ? (
              <span style={{ fontSize: '10px', color: '#0284c7', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
                <CheckCircle2 size={11} /> Bebas Face (Admin)
              </span>
            ) : (pegawai?.is_face_registered || pegawai?.face_descriptor) ? (
              <span style={{ fontSize: '10px', color: '#16a34a', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
                <CheckCircle2 size={11} /> Wajah Terdaftar
              </span>
            ) : (
              <span style={{ fontSize: '10px', color: '#d97706', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
                <ShieldAlert size={11} /> Belum Daftar Wajah
              </span>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Tombol Segarkan / Refresh Data Dashboard */}
          <button
            type="button"
            onClick={() => loadDashboardData(true)}
            disabled={isRefreshing || isLoading}
            title="Segarkan Data Terkini"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg-slate)',
              border: '1px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isRefreshing ? 'var(--primary-600)' : 'var(--text-main)',
              cursor: isRefreshing ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <RefreshCw size={15} style={{ animation: (isRefreshing || isLoading) ? 'spin 1s linear infinite' : 'none' }} />
          </button>

          <button
            type="button"
            onClick={handleLogoutClick}
            title="Keluar Akun"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg-slate)',
              border: '1px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--danger)',
              cursor: 'pointer'
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* Area Konten Scrollable */}
      <div ref={screenScrollRef} className="screen-scroll-area" style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        position: 'relative',
        paddingBottom: '90px'
      }}>
        {/* Main Content View Switcher */}
        {activeNav === 'home' && !exitingNav && (
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }} className="animate-fade-in">
            {/* Card Notifikasi Registrasi Biometrik Wajah jika Belum Terdaftar & Diwajibkan */}
            {(pegawai?.wajib_face_recognition !== false && !pegawai?.is_face_registered && !pegawai?.face_descriptor) && (
              <div style={{
                background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
                borderRadius: '20px',
                padding: '14px 16px',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                boxShadow: '0 8px 20px -4px rgba(49, 46, 129, 0.35)',
                border: '1px solid rgba(165, 180, 252, 0.2)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#a5b4fc',
                    flexShrink: 0
                  }}>
                    <ShieldCheck size={22} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '13px', fontWeight: '800', margin: '0 0 2px 0', color: '#ffffff' }}>
                      Daftarkan Wajah Biometrik
                    </h4>
                    <p style={{ fontSize: '11px', color: '#c7d2fe', margin: 0, lineHeight: 1.3 }}>
                      Scan 1x untuk aktivasi presensi wajah anti-titip absen
                    </p>
                  </div>
                </div>

                {onNavigateToEnrollment && (
                  <button
                    type="button"
                    onClick={onNavigateToEnrollment}
                    style={{
                      backgroundColor: '#f97316',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '8px 14px',
                      fontSize: '11px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      boxShadow: '0 4px 10px rgba(249, 115, 22, 0.35)'
                    }}
                  >
                    Daftar
                  </button>
                )}
              </div>
            )}

            {/* Card Jam Digital & Live Status dengan Dinamika Langit Pagi/Siang/Malam */}
            <div className="hero-weather-card" style={{
              background: timeTheme.background,
              borderRadius: '24px',
              padding: '20px',
              color: '#ffffff',
              boxShadow: timeTheme.boxShadow,
              position: 'relative',
              overflow: 'hidden',
              transition: 'background 1.2s ease, box-shadow 1.2s ease'
            }}>
              {/* Animasi Awan Berjalan (+ Bintang Berkelap-Kelip di Malam Hari) */}
              <AnimatedCloudsBackground isNight={timeTheme.isNight} />

              {/* Matahari (Pagi/Siang) atau Bulan Sabit Anggun (Malam Hari) */}
              <div style={{
                position: 'absolute',
                top: '-15px',
                right: '-15px',
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                background: `radial-gradient(circle, ${timeTheme.sunGlow} 0%, rgba(255, 255, 255, 0.03) 65%, transparent 70%)`,
                pointerEvents: 'none',
                zIndex: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 1s ease'
              }}>
                {timeTheme.isNight ? (
                  /* Bulan Sabit Indah di Malam Hari */
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    boxShadow: 'inset 8px -3px 0 0 #e0e7ff',
                    transform: 'rotate(-25deg)',
                    filter: 'drop-shadow(0 0 10px rgba(199, 210, 254, 0.75))',
                    marginTop: '12px',
                    marginRight: '12px'
                  }}></div>
                ) : (
                  /* Matahari Bersinar Lembut */
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: timeTheme.sunColor,
                    boxShadow: `0 0 24px 6px ${timeTheme.sunGlow}`,
                    marginTop: '12px',
                    marginRight: '12px',
                    opacity: 0.88
                  }}></div>
                )}
              </div>

              {/* Foreground Content Wrapper */}
              <div style={{ position: 'relative', zIndex: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.9 }}>
                        Waktu Sistem Presensi
                      </span>
                      <span style={{
                        fontSize: '9px',
                        fontWeight: '800',
                        textTransform: 'uppercase',
                        padding: '1px 6px',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: 'rgba(255, 255, 255, 0.22)',
                        border: '1px solid rgba(255, 255, 255, 0.35)',
                        letterSpacing: '0.4px'
                      }}>
                        {timeTheme.badgeText}
                      </span>
                    </div>
                    <h1 style={{ fontSize: '32px', fontWeight: '900', letterSpacing: '-1px', margin: '4px 0 2px 0', fontFamily: 'var(--font-mono)' }}>
                      {timeString}
                    </h1>
                    <p style={{ fontSize: '12px', fontWeight: '500', opacity: 0.95 }}>
                      {dateString}
                    </p>
                  </div>

                  {/* Status Geofencing Badge dengan Animasi Icon */}
                  <div style={{
                    backgroundColor: isInsideGeofence ? 'rgba(34, 197, 94, 0.28)' : 'rgba(239, 68, 68, 0.25)',
                    border: isInsideGeofence ? '1.5px solid rgba(74, 222, 128, 0.65)' : '1px solid rgba(255, 255, 255, 0.3)',
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-full)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '11px',
                    fontWeight: '700',
                    boxShadow: isInsideGeofence ? '0 0 16px rgba(74, 222, 128, 0.35)' : 'none',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    transition: 'all 0.3s ease'
                  }}>
                    {isInsideGeofence ? (
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {/* Ripple Radar Wave Effect */}
                        <span style={{
                          position: 'absolute',
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          backgroundColor: 'rgba(74, 222, 128, 0.45)',
                          animation: 'radarWave 2s infinite cubic-bezier(0, 0.2, 0.8, 1)',
                          pointerEvents: 'none'
                        }}></span>
                        {/* Animating Glowing Icon */}
                        <div className="animate-icon-pulse" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <ShieldCheck size={15} color="#4ade80" strokeWidth={2.6} />
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <AlertTriangle size={14} color="#f87171" strokeWidth={2.4} />
                      </div>
                    )}
                    <span style={{
                      color: '#ffffff',
                      textShadow: isInsideGeofence ? '0 1px 2px rgba(0, 0, 0, 0.3)' : 'none',
                      letterSpacing: '0.2px'
                    }}>
                      {isInsideGeofence ? 'Dalam Area' : 'Luar Area'}
                    </span>
                  </div>
                </div>

                {/* Jam Kerja & Lokasi Acuan */}
                <div style={{
                  marginTop: '16px',
                  paddingTop: '12px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '11px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <Clock size={14} style={{ opacity: 0.8 }} />
                    <span>
                      {jamKerja?.is_hari_libur ? (
                        <strong style={{ color: '#fed7aa' }}>🛑 Hari Libur (Day Off)</strong>
                      ) : (
                        jamKerja ? `${jamKerja.jam_awal_masuk} - ${jamKerja.jam_akhir_pulang} (${jamKerja?.nama?.slice(0, 16)})` : '08:00 - 17:00 (Reguler)'
                      )}
                    </span>
                    {jamKerja?.is_roster && (
                      <span style={{
                        backgroundColor: 'rgba(251, 146, 60, 0.35)',
                        border: '1px solid rgba(255, 255, 255, 0.4)',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        fontSize: '9px',
                        fontWeight: '800',
                        letterSpacing: '0.3px',
                        textTransform: 'uppercase'
                      }}>
                        Roster
                      </span>
                    )}
                    {jamKerja?.batasi_absen && (
                      <span style={{
                        backgroundColor: 'rgba(239, 68, 68, 0.35)',
                        border: '1px solid rgba(255, 255, 255, 0.4)',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        fontSize: '9px',
                        fontWeight: '800',
                        letterSpacing: '0.3px',
                        textTransform: 'uppercase'
                      }}>
                        Dibatasi
                      </span>
                    )}
                    {jamKerja?.jam_mulai_istirahat && (
                      <span style={{
                        backgroundColor: 'rgba(245, 158, 11, 0.45)',
                        border: '1px solid rgba(255, 255, 255, 0.4)',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        fontSize: '9px',
                        fontWeight: '800',
                        letterSpacing: '0.3px',
                        textTransform: 'uppercase'
                      }}>
                        ☕ {jamKerja.jam_mulai_istirahat}
                      </span>
                    )}
                    {(jamKerja?.lintas_hari || absensiHariIni?.is_lintas_hari) && (
                      <span style={{
                        backgroundColor: 'rgba(99, 102, 241, 0.45)',
                        border: '1px solid rgba(255, 255, 255, 0.4)',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        fontSize: '9px',
                        fontWeight: '800',
                        letterSpacing: '0.3px',
                        textTransform: 'uppercase'
                      }}>
                        🌙 Lintas Hari
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={14} style={{ opacity: 0.8 }} />
                    <span>{(lokasi?.nama_lokasi || lokasi?.nama || 'Kantor Pusat').slice(0, 16)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Banner Shift Lintas Hari (Overnight Session Alert) */}
            {absensiHariIni?.is_lintas_hari && (
              <div style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '15px' }}>🌙</span>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '800', color: '#166534' }}>
                      Sesi Shift Malam Lintas Hari
                    </div>
                    <div style={{ fontSize: '10px', color: '#15803d', fontWeight: '500' }}>
                      {absensiHariIni?.is_sesi_kemarin
                        ? `Sesi Tanggal: ${absensiHariIni?.tanggal_sesi || 'Kemarin'} • Masuk Pukul ${absensiHariIni?.jam_masuk?.slice(0, 5) || '21:00'}`
                        : 'Presensi mencakup kepulangan di keesokan harinya'}
                    </div>
                  </div>
                </div>
                <span style={{
                  fontSize: '9px',
                  fontWeight: '800',
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: sudahPulang ? '#22c55e' : (sudahMasuk ? '#3b82f6' : '#f97316'),
                  color: '#ffffff',
                  textTransform: 'uppercase',
                  letterSpacing: '0.3px'
                }}>
                  {sudahPulang ? 'Selesai' : (sudahMasuk ? 'Siap Pulang' : 'Belum Masuk')}
                </span>
              </div>
            )}

            {/* Banner Batas Akhir Pulang Terlewati Alert */}
            {isBatasPulangTerlewati && (
              <div style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: '#fff1f2',
                border: '1px solid #fecdd3',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '15px' }}>⏰</span>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '800', color: '#9f1239' }}>
                      Batas Waktu Pulang Telah Berakhir
                    </div>
                    <div style={{ fontSize: '10px', color: '#be123c', fontWeight: '500' }}>
                      Sesi kepulangan ditutup pukul {jamKerja?.jam_akhir_pulang ? jamKerja.jam_akhir_pulang.slice(0, 5) : '20:00'} WIB. Status di-reset ke Absen Masuk untuk sesi kerja berikutnya.
                    </div>
                  </div>
                </div>
                <span style={{
                  fontSize: '9px',
                  fontWeight: '800',
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: '#e11d48',
                  color: '#ffffff',
                  textTransform: 'uppercase',
                  letterSpacing: '0.3px',
                  whiteSpace: 'nowrap'
                }}>
                  Reset Masuk
                </span>
              </div>
            )}

            {/* Banner Hari Libur / Hari Libur Nasional */}
            {isHariLibur && (
              <div style={{
                background: isLiburNasional
                  ? 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)'
                  : 'linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%)',
                border: isLiburNasional ? '1.5px solid #fecdd3' : '1.5px solid #bae6fd',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
              }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '12px',
                  backgroundColor: isLiburNasional ? '#e11d48' : '#0284c7',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {isLiburNasional ? <Sparkles size={20} /> : <Coffee size={20} />}
                </div>
                <div>
                  <h4 style={{ fontSize: '12px', fontWeight: '800', color: isLiburNasional ? '#9f1239' : '#0369a1', margin: 0 }}>
                    {isLiburNasional ? `Hari Libur Nasional: ${namaHariLibur}` : namaHariLibur}
                  </h4>
                  <p style={{ fontSize: '11px', color: isLiburNasional ? '#be123c' : '#0284c7', margin: '2px 0 0 0', fontWeight: '500' }}>
                    Tidak ada jadwal presensi kerja hari ini
                  </p>
                </div>
              </div>
            )}

            {/* Status Presensi Hari Ini (Check-In & Check-Out) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px'
            }}>
              {/* Card Masuk */}
              <div style={{
                padding: '16px 14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: sudahMasuk ? 'var(--primary-50)' : 'var(--bg-slate)',
                border: sudahMasuk ? '1.5px solid var(--primary-300)' : '1px solid var(--border-light)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Presensi Masuk
                    </span>
                    {absensiHariIni?.is_sesi_kemarin && sudahMasuk && (
                      <span style={{ fontSize: '9px', fontWeight: '700', color: '#2563eb', backgroundColor: '#dbeafe', padding: '1px 5px', borderRadius: '4px' }}>
                        Kemarin
                      </span>
                    )}
                    {isBatasPulangTerlewati && (
                      <span style={{ fontSize: '9px', fontWeight: '700', color: '#16a34a', backgroundColor: '#dcfce7', padding: '1px 5px', borderRadius: '4px' }}>
                        Sesi Baru
                      </span>
                    )}
                  </div>
                  <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                    {isBatasPulangTerlewati ? '--:--' : (absensiHariIni?.jam_masuk ? absensiHariIni.jam_masuk.slice(0, 5) : '--:--')}
                  </h3>
                  {isBatasPulangTerlewati && absensiHariIni?.jam_masuk && (
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600' }}>
                      Sesi tadi: {absensiHariIni.jam_masuk.slice(0, 5)} WIB
                    </span>
                  )}
                </div>

                <div style={{ marginTop: '10px' }}>
                  {sudahMasuk ? (
                    <span style={{
                      display: 'inline-block',
                      fontSize: '10px',
                      fontWeight: '700',
                      color: absensiHariIni?.status_masuk === 'terlambat' ? 'var(--danger)' : 'var(--success)',
                      backgroundColor: absensiHariIni?.status_masuk === 'terlambat' ? 'var(--danger-bg)' : 'var(--success-bg)',
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-full)'
                    }}>
                      {absensiHariIni?.status_masuk === 'terlambat' ? `Terlambat ${absensiHariIni.menit_terlambat}m` : 'Tepat Waktu'}
                    </span>
                  ) : isHariLibur ? (
                    <div>
                      <span style={{
                        display: 'inline-block',
                        fontSize: '10px',
                        fontWeight: '700',
                        color: isLiburNasional ? '#dc2626' : '#64748b',
                        backgroundColor: isLiburNasional ? '#fee2e2' : '#f1f5f9',
                        padding: '4px 8px',
                        borderRadius: 'var(--radius-full)'
                      }}>
                        {isLiburNasional ? '🔴 Libur Nasional' : 'Hari Libur'}
                      </span>
                      <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block', textAlign: 'center', marginTop: '4px', fontWeight: '600' }}>
                        Tidak Ada Jadwal
                      </span>
                    </div>
                  ) : (
                    <div>
                      <button
                        type="button"
                        onClick={() => onStartAttendance ? onStartAttendance('masuk') : setModalType('masuk')}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--primary-gradient)',
                          border: 'none',
                          color: '#ffffff',
                          fontSize: '12px',
                          fontWeight: '800',
                          cursor: 'pointer',
                          boxShadow: 'var(--shadow-primary)'
                        }}
                      >
                        Absen Masuk
                      </button>
                      {jamKerja?.batasi_absen && (
                        <span style={{ fontSize: '9px', color: 'var(--primary-700)', display: 'block', textAlign: 'center', marginTop: '4px', fontWeight: '700' }}>
                          Batas: s/d {jamKerja.jam_akhir_masuk}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Card Pulang */}
              <div style={{
                padding: '16px 14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: sudahPulang ? '#eff6ff' : (isBatasPulangTerlewati ? '#fef2f2' : 'var(--bg-slate)'),
                border: sudahPulang ? '1.5px solid #93c5fd' : (isBatasPulangTerlewati ? '1px solid #fecaca' : '1px solid var(--border-light)'),
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <div>
                  <span style={{ fontSize: '10px', fontWeight: '800', color: isBatasPulangTerlewati ? '#dc2626' : 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Presensi Pulang
                  </span>
                  <h3 style={{ fontSize: '20px', fontWeight: '800', color: isBatasPulangTerlewati ? '#dc2626' : 'var(--text-main)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                    {absensiHariIni?.jam_pulang ? absensiHariIni.jam_pulang.slice(0, 5) : (isBatasPulangTerlewati ? 'Ditutup' : '--:--')}
                  </h3>
                </div>

                <div style={{ marginTop: '10px' }}>
                  {sudahPulang ? (
                    <span style={{
                      display: 'inline-block',
                      fontSize: '10px',
                      fontWeight: '700',
                      color: '#2563eb',
                      backgroundColor: '#eff6ff',
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-full)'
                    }}>
                      {absensiHariIni?.status_pulang === 'pulang_cepat' ? `Pulang Cepat ${absensiHariIni.menit_pulang_cepat}m` : 'Pulang Normal'}
                    </span>
                  ) : isBatasPulangTerlewati ? (
                    <div>
                      <span style={{
                        display: 'inline-block',
                        fontSize: '10px',
                        fontWeight: '700',
                        color: '#dc2626',
                        backgroundColor: '#fee2e2',
                        padding: '3px 8px',
                        borderRadius: 'var(--radius-full)'
                      }}>
                        Batas Pulang Terlewati
                      </span>
                      <span style={{ fontSize: '9px', color: '#b91c1c', display: 'block', textAlign: 'center', marginTop: '4px', fontWeight: '600' }}>
                        Batas s/d {jamKerja?.jam_akhir_pulang ? jamKerja.jam_akhir_pulang.slice(0, 5) : '20:00'} WIB
                      </span>
                    </div>
                  ) : sudahMasuk ? (
                    tampilkanOpsiIstirahat ? (
                      <div>
                        <span style={{
                          display: 'inline-block',
                          fontSize: '10px',
                          fontWeight: '700',
                          color: '#b45309',
                          backgroundColor: '#fef3c7',
                          padding: '4px 8px',
                          borderRadius: 'var(--radius-full)'
                        }}>
                          ☕ Waktu Istirahat
                        </span>
                        <span style={{ fontSize: '9px', color: '#b45309', display: 'block', marginTop: '4px', fontWeight: '600' }}>
                          Pilih opsi di bawah
                        </span>
                      </div>
                    ) : sedangIstirahat ? (
                      <div>
                        <span style={{
                          display: 'inline-block',
                          fontSize: '10px',
                          fontWeight: '700',
                          color: '#047857',
                          backgroundColor: '#d1fae5',
                          padding: '4px 8px',
                          borderRadius: 'var(--radius-full)'
                        }}>
                          ☕ Sedang Istirahat
                        </span>
                        <span style={{ fontSize: '9px', color: '#047857', display: 'block', marginTop: '4px', fontWeight: '600' }}>
                          Mulai: {jamIstirahatMulai ? jamIstirahatMulai.slice(0, 5) : '--:--'} WIB
                        </span>
                      </div>
                    ) : (
                      <div>
                        <button
                          type="button"
                          onClick={() => onStartAttendance ? onStartAttendance('pulang') : setModalType('pulang')}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: '#2563eb',
                            border: 'none',
                            color: '#ffffff',
                            fontSize: '12px',
                            fontWeight: '800',
                            cursor: 'pointer',
                            boxShadow: '0 4px 10px rgba(37, 99, 235, 0.25)'
                          }}
                        >
                          Absen Pulang
                        </button>
                        {statusIstirahat === 'selesai' && (
                          <span style={{ fontSize: '9px', color: '#16a34a', display: 'block', textAlign: 'center', marginTop: '4px', fontWeight: '700' }}>
                            Istirahat: {jamIstirahatMulai?.slice(0, 5)} - {jamIstirahatSelesai?.slice(0, 5)}
                          </span>
                        )}
                        {statusIstirahat === 'dilewati' && (
                          <span style={{ fontSize: '9px', color: '#64748b', display: 'block', textAlign: 'center', marginTop: '4px', fontWeight: '700' }}>
                            Istirahat dilewati
                          </span>
                        )}
                        {adaSettingIstirahat && !isSudahWaktuIstirahat && (
                          <span style={{ fontSize: '9px', color: '#b45309', display: 'block', textAlign: 'center', marginTop: '4px', fontWeight: '700' }}>
                            Istirahat buka pukul {jamMulaiIstirahat}
                          </span>
                        )}
                        {jamKerja?.batasi_absen && (
                          <span style={{ fontSize: '9px', color: '#0284c7', display: 'block', textAlign: 'center', marginTop: '4px', fontWeight: '700' }}>
                            Batas: s/d {jamKerja.jam_akhir_pulang}
                          </span>
                        )}
                      </div>
                    )
                  ) : isHariLibur ? (
                    <span style={{
                      display: 'inline-block',
                      fontSize: '10px',
                      fontWeight: '700',
                      color: isLiburNasional ? '#dc2626' : '#64748b',
                      backgroundColor: isLiburNasional ? '#fee2e2' : '#f1f5f9',
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-full)'
                    }}>
                      Tidak Aktif
                    </span>
                  ) : (
                    <span style={{ fontSize: '10px', color: 'var(--text-light)', fontWeight: '600' }}>
                      Menunggu Absen Masuk
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Panel Pilihan Sesi Istirahat & Lewati saat Waktu Istirahat Tiba */}
            {tampilkanOpsiIstirahat && (
              <div style={{
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                border: '1.5px solid #fde68a',
                boxShadow: '0 4px 14px rgba(245, 158, 11, 0.15)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '10px',
                      backgroundColor: '#f59e0b',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 6px rgba(245, 158, 11, 0.3)'
                    }}>
                      <Coffee size={18} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '13px', fontWeight: '800', color: '#92400e', margin: 0 }}>
                        Sesi Waktu Istirahat
                      </h4>
                      <p style={{ fontSize: '11px', color: '#b45309', margin: 0, fontWeight: '500' }}>
                        Jadwal: {jamMulaiIstirahat} - {jamSelesaiIstirahat || 'Selesai'}
                      </p>
                    </div>
                  </div>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: '800',
                    color: '#b45309',
                    backgroundColor: 'rgba(245, 158, 11, 0.2)',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)'
                  }}>
                    Dibuka
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    disabled={isSubmittingIstirahat}
                    onClick={() => handleCatatIstirahat('mulai')}
                    style={{
                      padding: '11px 14px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                      border: 'none',
                      color: '#ffffff',
                      fontSize: '13px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      boxShadow: '0 4px 12px rgba(217, 119, 6, 0.35)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <Coffee size={16} />
                    <span>{isSubmittingIstirahat ? 'Memproses...' : 'Istirahat'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={isSubmittingIstirahat}
                    onClick={() => handleCatatIstirahat('lewati')}
                    style={{
                      padding: '11px 14px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: '#ffffff',
                      border: '1.5px solid #d1d5db',
                      color: '#4b5563',
                      fontSize: '13px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <span>Lewati</span>
                  </button>
                </div>
              </div>
            )}

            {/* Panel Sedang Beristirahat Aktif */}
            {sedangIstirahat && (
              <div style={{
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                border: '1.5px solid #a7f3d0',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.15)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '10px',
                      backgroundColor: '#10b981',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)'
                    }}>
                      <Coffee size={18} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '13px', fontWeight: '800', color: '#065f46', margin: 0 }}>
                        Sedang Beristirahat
                      </h4>
                      <p style={{ fontSize: '11px', color: '#047857', margin: 0, fontWeight: '500' }}>
                        Mulai pukul {jamIstirahatMulai ? jamIstirahatMulai.slice(0, 5) : '--:--'} WIB
                      </p>
                    </div>
                  </div>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: '800',
                    color: '#065f46',
                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)'
                  }}>
                    Aktif
                  </span>
                </div>

                <button
                  type="button"
                  disabled={isSubmittingIstirahat}
                  onClick={() => handleCatatIstirahat('selesai')}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Check size={16} />
                  <span>{isSubmittingIstirahat ? 'Memproses...' : 'Selesai Istirahat (Kembali Bekerja)'}</span>
                </button>
              </div>
            )}

            {/* Banner Notifikasi Pending Approval Khusus Karyawan Approver */}
            {pendingApprovalCount > 0 && (
              <div
                onClick={() => setActiveNav('approval')}
                style={{
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
                  border: '1.5px solid #fed7aa',
                  boxShadow: '0 4px 12px rgba(234, 88, 12, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    backgroundColor: '#ea580c',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 2px 6px rgba(234, 88, 12, 0.3)'
                  }}>
                    <CheckCheck size={18} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '12px', fontWeight: '800', color: '#9a3412', margin: 0 }}>
                      {pendingApprovalCount} Pengajuan Menunggu Persetujuan
                    </h4>
                    <p style={{ fontSize: '10px', color: '#c2410c', margin: '2px 0 0', fontWeight: '600' }}>
                      Ada pengajuan karyawan yang memerlukan approval Anda
                    </p>
                  </div>
                </div>
                <div style={{
                  padding: '5px 10px',
                  borderRadius: '8px',
                  backgroundColor: '#ffffff',
                  color: '#ea580c',
                  fontSize: '11px',
                  fontWeight: '800',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
                }}>
                  Tinjau
                </div>
              </div>
            )}

            {/* Card Navigasi Menu Utama */}
            {/* Banner Pengumuman Interaktif (Jika ada yang belum dibaca) */}
            {unreadPengumumanCount > 0 && (
              <div
                onClick={() => setActiveNav('pengumuman')}
                style={{
                  background: urgentPengumumanCount > 0
                    ? 'linear-gradient(135deg, #fff1f2 0%, #fee2e2 100%)'
                    : 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
                  border: urgentPengumumanCount > 0
                    ? '1.5px solid #fca5a5'
                    : '1.5px solid #c7d2fe',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.08)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  marginBottom: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '12px',
                    backgroundColor: urgentPengumumanCount > 0 ? '#ef4444' : '#4f46e5',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: urgentPengumumanCount > 0
                      ? '0 3px 8px rgba(239, 68, 68, 0.3)'
                      : '0 3px 8px rgba(79, 70, 229, 0.3)'
                  }}>
                    <Megaphone size={18} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: '800',
                        color: urgentPengumumanCount > 0 ? '#b91c1c' : '#3730a3'
                      }}>
                        {urgentPengumumanCount > 0 ? 'Pengumuman Penting!' : 'Pengumuman Baru'}
                      </span>
                      <span style={{
                        backgroundColor: '#ef4444',
                        color: '#ffffff',
                        fontSize: '8px',
                        fontWeight: '800',
                        padding: '1px 5px',
                        borderRadius: '999px'
                      }}>
                        {unreadPengumumanCount} Baru
                      </span>
                    </div>
                    <p style={{
                      fontSize: '10px',
                      color: urgentPengumumanCount > 0 ? '#991b1b' : '#4338ca',
                      margin: '1px 0 0 0',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      Ada edaran resmi terbaru dari manajemen. Ketuk untuk membaca.
                    </p>
                  </div>
                </div>
                <ChevronRight size={18} color={urgentPengumumanCount > 0 ? '#b91c1c' : '#4338ca'} style={{ flexShrink: 0 }} />
              </div>
            )}

            {/* 8. Menu Utama / Shortcuts */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-light)',
              padding: '16px 14px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '14px'
              }}>
                <div>
                  <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.2px' }}>
                    Menu Utama
                  </span>
                  <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)' }}>
                    Akses Cepat Layanan Pegawai
                  </span>
                </div>
                <span style={{
                  fontSize: '10px',
                  fontWeight: '700',
                  color: 'var(--primary-700)',
                  backgroundColor: 'var(--primary-50)',
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid var(--primary-200)'
                }}>
                  {FEATURE_CODES.filter(isOn).length} Menu Layanan
                </span>
              </div>

              {/* Grid 4 Kolom Menu Utama (8 Kolom di Layar Tab) */}
              <div className="main-menu-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '14px 6px',
                textAlign: 'center'
              }}>
                {/* 1. Absen GPS */}
                {isOn('attendance') && (
<button
                  type="button"
                  onClick={() => {
                    if (isHariLibur && !sudahMasuk) {
                      alert(`Hari ini adalah hari libur (${namaHariLibur}). Anda tidak memiliki jadwal presensi kerja hari ini.`);
                      return;
                    }
                    if (onStartAttendance) {
                      onStartAttendance(sudahMasuk ? 'pulang' : 'masuk');
                    } else {
                      setModalType(sudahMasuk ? 'pulang' : 'masuk');
                    }
                  }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    background: 'none',
                    border: 'none',
                    cursor: (isHariLibur && !sudahMasuk) ? 'default' : 'pointer',
                    padding: '2px',
                    opacity: (isHariLibur && !sudahMasuk) ? 0.65 : 1
                  }}
                >
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '14px',
                    background: (isHariLibur && !sudahMasuk)
                      ? 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)'
                      : 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
                    border: (isHariLibur && !sudahMasuk) ? '1px solid #cbd5e1' : '1px solid #fed7aa',
                    color: (isHariLibur && !sudahMasuk) ? '#94a3b8' : 'var(--primary-600)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: (isHariLibur && !sudahMasuk) ? 'none' : '0 4px 10px rgba(234, 88, 12, 0.12)',
                    position: 'relative'
                  }}>
                    <MapPin size={22} strokeWidth={2.2} />
                    {isHariLibur && !sudahMasuk && (
                      <span style={{
                        position: 'absolute',
                        top: '-4px',
                        right: '-6px',
                        backgroundColor: '#ef4444',
                        color: '#ffffff',
                        fontSize: '8px',
                        fontWeight: '800',
                        padding: '1px 4px',
                        borderRadius: '6px'
                      }}>
                        Libur
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: (isHariLibur && !sudahMasuk) ? '#94a3b8' : 'var(--text-main)', marginTop: '6px' }}>
                    Absen GPS
                  </span>
                </button>
)}

                {/* 2. Riwayat */}
                {isOn('history') && (
<button
                  type="button"
                  onClick={() => setActiveNav('history')}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '2px'
                  }}
                >
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                    border: '1px solid #bfdbfe',
                    color: '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 10px rgba(37, 99, 235, 0.12)'
                  }}>
                    <Calendar size={22} strokeWidth={2.2} />
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-main)', marginTop: '6px' }}>
                    Riwayat
                  </span>
                </button>
)}

                {/* 3. Izin & Cuti */}
                {isOn('leave') && (
<button
                  type="button"
                  onClick={() => setActiveNav('izin')}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '2px'
                  }}
                >
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                    border: '1px solid #bbf7d0',
                    color: '#16a34a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 10px rgba(22, 163, 74, 0.12)'
                  }}>
                    <FileText size={22} strokeWidth={2.2} />
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-main)', marginTop: '6px' }}>
                    Izin & Cuti
                  </span>
                </button>
)}

                {/* 5. Dinas Luar */}
                {isOn('dinas') && (
<button
                  type="button"
                  onClick={() => setActiveNav('dinas')}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '2px'
                  }}
                >
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                    border: '1px solid #bae6fd',
                    color: '#0284c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 10px rgba(2, 132, 199, 0.12)'
                  }}>
                    <PlaneTakeoff size={22} strokeWidth={2.2} />
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-main)', marginTop: '6px' }}>
                    Dinas Luar
                  </span>
                </button>
)}

                {/* 6. Lembur */}
                {isOn('overtime') && (
<button
                  type="button"
                  onClick={() => setActiveNav('lembur')}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '2px'
                  }}
                >
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                    border: '1px solid #fde68a',
                    color: '#d97706',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 10px rgba(217, 119, 6, 0.12)'
                  }}>
                    <Timer size={22} strokeWidth={2.2} />
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-main)', marginTop: '6px' }}>
                    Lembur
                  </span>
                </button>
)}

                {/* 7. Slip Gaji */}
                {isOn('payslip') && (
<button
                  type="button"
                  onClick={() => setActiveNav('slip_gaji')}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '2px'
                  }}
                >
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                    border: '1px solid #a7f3d0',
                    color: '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 10px rgba(5, 150, 105, 0.15)'
                  }}>
                    <Receipt size={22} strokeWidth={2.2} />
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-main)', marginTop: '6px' }}>
                    Slip Gaji
                  </span>
                </button>
)}

                {/* 8. Kendala & Bantuan */}
                {isOn('helpdesk') && (
<button
                  type="button"
                  onClick={() => setActiveNav('masalah')}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '2px'
                  }}
                >
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
                    border: '1px solid #fed7aa',
                    color: '#c2410c',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 10px rgba(194, 65, 12, 0.15)'
                  }}>
                    <HelpCircle size={22} strokeWidth={2.2} />
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-main)', marginTop: '6px' }}>
                    Kendala
                  </span>
                </button>
)}

                {/* 9. Penugasan Kerja (Tugas Berjalan & Selesai) */}
                {isOn('tasks') && (
<button
                  type="button"
                  onClick={() => setActiveNav('tugas')}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '2px'
                  }}
                >
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                    border: '1.5px solid #93c5fd',
                    color: '#1d4ed8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 10px rgba(29, 78, 216, 0.18)'
                  }}>
                    <Briefcase size={22} strokeWidth={2.2} />
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-main)', marginTop: '6px' }}>
                    Tugas Kerja
                  </span>
                </button>
)}

                {/* 10. Persetujuan / Approval Pengajuan */}
                {isOn('approval') && (
<button
                  type="button"
                  onClick={() => setActiveNav('approval')}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '2px',
                    position: 'relative'
                  }}
                >
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                    border: '1.5px solid #86efac',
                    color: '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 10px rgba(5, 150, 105, 0.18)',
                    position: 'relative'
                  }}>
                    <CheckCheck size={22} strokeWidth={2.2} />
                    {pendingApprovalCount > 0 && (
                      <span style={{
                        position: 'absolute',
                        top: '-5px',
                        right: '-5px',
                        backgroundColor: '#ef4444',
                        color: '#ffffff',
                        fontSize: '9px',
                        fontWeight: '800',
                        padding: '1px 5px',
                        borderRadius: '999px',
                        border: '2px solid #ffffff',
                        boxShadow: '0 2px 4px rgba(239, 68, 68, 0.4)'
                      }}>
                        {pendingApprovalCount}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-main)', marginTop: '6px' }}>
                    Approval
                  </span>
                </button>
)}

                {/* 11. Pengumuman Resmi & Broadcast */}
                {isOn('announcement') && (
<button
                  type="button"
                  onClick={() => setActiveNav('pengumuman')}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '2px',
                    position: 'relative'
                  }}
                >
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
                    border: '1.5px solid #a5b4fc',
                    color: '#4f46e5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 10px rgba(79, 70, 229, 0.18)',
                    position: 'relative'
                  }}>
                    <Megaphone size={22} strokeWidth={2.2} />
                    {unreadPengumumanCount > 0 && (
                      <span style={{
                        position: 'absolute',
                        top: '-5px',
                        right: '-5px',
                        backgroundColor: '#ef4444',
                        color: '#ffffff',
                        fontSize: '9px',
                        fontWeight: '800',
                        padding: '1px 5px',
                        borderRadius: '999px',
                        border: '2px solid #ffffff',
                        boxShadow: '0 2px 4px rgba(239, 68, 68, 0.4)'
                      }}>
                        {unreadPengumumanCount}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-main)', marginTop: '6px' }}>
                    Pengumuman
                  </span>
                </button>
)}

                {/* 12. Klaim Reimbursement */}
                {isOn('reimbursement') && (
<button
                  type="button"
                  onClick={() => setActiveNav('reimbursement')}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '2px',
                    position: 'relative'
                  }}
                >
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, #f0fdf4 0%, #ccfbf1 100%)',
                    border: '1.5px solid #99f6e4',
                    color: '#0f766e',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 10px rgba(15, 118, 110, 0.18)',
                    position: 'relative'
                  }}>
                    <Wallet size={22} strokeWidth={2.2} />
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-main)', marginTop: '6px' }}>
                    Reimburse
                  </span>
                </button>
)}

                {/* 13. Kehadiran Tim / Bawahan */}
                {isOn('team') && (
<button
                  type="button"
                  onClick={() => setActiveNav('kehadiran_bawahan')}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '2px',
                    position: 'relative'
                  }}
                >
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
                    border: '1.5px solid #7dd3fc',
                    color: '#0284c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 10px rgba(2, 132, 199, 0.18)',
                    position: 'relative'
                  }}>
                    <Users size={22} strokeWidth={2.2} />
                    {statusBawahan?.total_bawahan > 0 && (
                      <span style={{
                        position: 'absolute',
                        top: '-3px',
                        right: '-3px',
                        backgroundColor: '#0284c7',
                        color: '#ffffff',
                        fontSize: '9px',
                        fontWeight: '800',
                        borderRadius: '10px',
                        padding: '1px 5px',
                        border: '1.5px solid #ffffff'
                      }}>
                        {statusBawahan.total_bawahan}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-main)', marginTop: '6px' }}>
                    Tim Bawahan
                  </span>
                </button>
              )}
                {/* 14. Daftar Karyawan */}
                {isOn('karyawan') && (
                <button
                  type='button'
                  onClick={() => setActiveNav('karyawan')}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '2px',
                    position: 'relative'
                  }}
                >
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                    border: '1.5px solid #fcd34d',
                    color: '#92400e',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 10px rgba(146, 64, 14, 0.15)',
                    position: 'relative'
                  }}>
                    <Users size={22} strokeWidth={2.2} />
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-main)', marginTop: '6px' }}>
                    Daftar Karyawan
                  </span>
                </button>
              )}
              </div>
            </div>

            {/* Riwayat Terakhir dari Database */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-main)' }}>
                  Presensi Terakhir
                </span>
                <button
                  type="button"
                  onClick={() => setActiveNav('history')}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '11px',
                    fontWeight: '700',
                    color: 'var(--primary-600)',
                    cursor: 'pointer'
                  }}
                >
                  Lihat Semua
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {riwayatList.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                    Belum ada rekaman presensi.
                  </div>
                ) : (
                  riwayatList.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        backgroundColor: '#ffffff',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-light)'
                      }}
                    >
                      <div>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-main)', display: 'block' }}>
                          {item.hari_tanggal || item.tanggal}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          Masuk: {item.jam_masuk || '-'} • Pulang: {item.jam_pulang || '-'}
                        </span>
                      </div>

                      <div>
                        {item.status_masuk === 'terlambat' ? (
                          <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--danger)', backgroundColor: 'var(--danger-bg)', padding: '3px 8px', borderRadius: 'var(--radius-full)' }}>
                            Terlambat
                          </span>
                        ) : (
                          <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--success)', backgroundColor: 'var(--success-bg)', padding: '3px 8px', borderRadius: 'var(--radius-full)' }}>
                            Tepat Waktu
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Subviews Container dengan Animasi Transisi Slide-Out ke Beranda */}
        {activeNav !== 'home' && (
          <div className={exitingNav ? 'animate-slide-out-right' : ''} style={{ width: '100%', minHeight: '100%' }}>
            {/* Tab: Riwayat Presensi Lengkap */}
            {activeNav === 'history' && (
              <RiwayatView onBack={() => handleNavBack('home')} />
            )}

            {/* Tab: Profil Pegawai */}
            {activeNav === 'profile' && (
              <ProfileView
                user={pegawai}
                onBack={() => handleNavBack('home')}
                onLogout={handleLogoutClick}
                onOpenDenda={() => setActiveNav('denda')}
                onOpenJadwal={() => setActiveNav('jadwal')}
                onPhotoUpdated={(newPhotoUrl) => {
                  setDashboardData((prev) => prev ? {
                    ...prev,
                    pegawai: {
                      ...prev.pegawai,
                      foto_profil: newPhotoUrl
                    }
                  } : prev);
                }}
              />
            )}

            {/* Tab: Pengajuan Izin & Cuti */}
            {activeNav === 'izin' && (
              <IzinView onBack={() => handleNavBack('home')} />
            )}

            {/* Tab: Jadwal Kerja & Shift (Navigasi Dari Profil) */}
            {activeNav === 'jadwal' && (
              <JadwalView onBack={() => handleNavBack('profile')} />
            )}

            {/* Tab: Kunjungan Dinas */}
            {activeNav === 'dinas' && (
              <DinasView onBack={() => handleNavBack('home')} />
            )}

            {/* Tab: Lembur Karyawan */}
            {activeNav === 'lembur' && (
              <LemburView onBack={() => handleNavBack('home')} />
            )}

            {/* Tab: Informasi Aturan Denda */}
            {activeNav === 'denda' && (
              <DendaView onBack={() => handleNavBack('profile')} />
            )}

            {/* Tab: Slip Gaji Karyawan */}
            {activeNav === 'slip_gaji' && (
              <SlipGajiView onBack={() => handleNavBack('home')} />
            )}

            {/* Tab: Ajukan Permasalahan / Kendala */}
            {activeNav === 'masalah' && (
              <MasalahView onBack={() => handleNavBack('home')} />
            )}

            {/* Tab: Penugasan Kerja (Tugas Berjalan & Tugas Selesai) */}
            {activeNav === 'tugas' && (
              <TugasView onBack={() => handleNavBack('home')} />
            )}

            {/* Tab: Persetujuan / Approval Pengajuan Mobile */}
            {activeNav === 'approval' && (
              <ApprovalView onBack={() => handleNavBack('home', () => loadPendingApprovalCount())} />
            )}

            {/* Tab: Pengumuman Resmi Perusahaan */}
            {activeNav === 'pengumuman' && (
              <PengumumanView onBack={() => handleNavBack('home', () => loadPengumumanCount())} />
            )}

            {/* Tab: Klaim Reimbursement */}
            {activeNav === 'reimbursement' && (
              <ReimbursementView onBack={() => handleNavBack('home')} />
            )}

            {/* Tab: Monitoring Kehadiran Bawahan (Atasan) */}
            {activeNav === 'kehadiran_bawahan' && (
              <KehadiranBawahanView onBack={() => handleNavBack('home', () => loadStatusBawahan())} />
            )}

            {/* Tab: Daftar Karyawan */}
            {activeNav === 'karyawan' && (
              <DaftarKaryawanView onBack={() => handleNavBack('home')} />
            )}
          </div>
        )}
      </div>

      {/* Floating Bottom Navigation (Statis di Bawah) */}
      <BottomNav activeNav={activeNav} onChangeNav={handleNavChange} />

      {/* Modal Absensi Riil */}
      {modalType && (
        <AttendanceModal
          type={modalType}
          user={pegawai}
          lokasiKantor={lokasi}
          onClose={() => setModalType(null)}
          onSuccess={handleAttendanceSuccess}
        />
      )}
    </div>
  );
}
