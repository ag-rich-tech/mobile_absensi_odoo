import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ArrowLeft, MapPin, RefreshCw, Navigation, CheckCircle2,
  AlertCircle, ShieldCheck, ShieldAlert, Lock, ArrowRight, Building, Sparkles,
  AlertTriangle, X, Info
} from 'lucide-react';
import AttendanceMap from '../components/AttendanceMap';
import api from '../services/api';
import { checkFakeGps } from '../services/fakeGpsService';

export default function LocationCheckPage({
  type = 'masuk',
  user,
  officeLocation,
  allLocations = [],
  jamKerja,
  onBack,
  onProceed,
  onOfficeLocationUpdate
}) {
  const isMasuk = type === 'masuk';

  // Ref untuk callback parent agar tidak memicu re-render / re-trigger loop
  const onOfficeLocationUpdateRef = useRef(onOfficeLocationUpdate);
  useEffect(() => {
    onOfficeLocationUpdateRef.current = onOfficeLocationUpdate;
  }, [onOfficeLocationUpdate]);

  // Ref penanda sinkronisasi awal hanya berjalan 1 kali saja
  const hasSyncedOnceRef = useRef(false);

  // State Titik Lokasi Kantor Acuan Real-Time (Dapat di-force update langsung dari server)
  const [currentOfficeLocation, setCurrentOfficeLocation] = useState(officeLocation || null);
  const [locationsList, setLocationsList] = useState(allLocations || []);
  const [isFetchingOffice, setIsFetchingOffice] = useState(false);
  const [isOfficeUpdated, setIsOfficeUpdated] = useState(false);

  // State posisi user — dideklarasikan di atas memo pemilihan target
  // karena memo itu membaca userCoords saat render.
  const [userCoords, setUserCoords] = useState(null);
  const [distance, setDistance] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [gpsError, setGpsError] = useState('');

  // Kalkulasi jarak Haversine (Meter) — didefinisikan di atas
  // officeCoords karena memo pemilihan target memakainya saat render.
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000; // Radius bumi dalam meter
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  };

  // AUTO-SWITCH LOKASI TERDEKAT (perbaikan bug multi-kantor):
  // dulu target validasi SELALU lokasi_kantor = semua_lokasi[0]
  // (Kantor 1), sehingga karyawan yang diizinkan di Kantor 1 +
  // Kantor 2 tapi berdiri di Kantor 2 tetap diblokir "Di Luar
  // Radius". Sekarang target = lokasi yang mengandung titik
  // (jarak <= radius-nya); bila beberapa mengandung, yang
  // terdekat; bila tidak ada yang mengandung, yang terdekat
  // secara keseluruhan (agar pesan jaraknya jujur). Ini cerminan
  // _match_location server — clock-in sendiri sudah begitu, jadi
  // tidak perlu perubahan server. Satu lokasi = perilaku lama.
  const candidateLocations = useMemo(() => {
    const list = Array.isArray(locationsList) ? locationsList : [];
    const valid = list.filter((loc) =>
      loc && loc.latitude != null && loc.longitude != null &&
      !isNaN(Number(loc.latitude)) && !isNaN(Number(loc.longitude)));
    if (valid.length) return valid;
    if (currentOfficeLocation) return [currentOfficeLocation];
    return [];
  }, [locationsList, currentOfficeLocation]);

  // Target validasi absensi: lokasi terpilih (bukan lagi selalu
  // lokasi_kantor). Tanpa GPS / tanpa kandidat, pakai lokasi_kantor
  // (perilaku lama) agar peta tetap punya target awal.
  // Ada lokasi server bila daftar kandidat terisi ATAU lokasi kantor
  // konteks punya koordinat. Tanpa keduanya, fallback di bawah adalah
  // null (TIDAK ADA lagi pin hardcode): peta tidak menggambar pin
  // kantor, jarak dinyatakan tidak diketahui dan gerbang masuk
  // tertutup (fail-closed).
  const officeFromServer = candidateLocations.length > 0
    || (currentOfficeLocation?.latitude != null && currentOfficeLocation?.longitude != null);
  const officeCoords = useMemo(() => {
    const fallback = (currentOfficeLocation?.latitude != null && currentOfficeLocation?.longitude != null) ? {
      id: currentOfficeLocation?.id,
      latitude: Number(currentOfficeLocation.latitude),
      longitude: Number(currentOfficeLocation.longitude),
      nama: currentOfficeLocation?.nama_lokasi || 'Kantor',
      radius: currentOfficeLocation?.radius_meter != null ? Number(currentOfficeLocation.radius_meter) : 100
    } : null;
    if (!userCoords || !candidateLocations.length) return fallback;
    const toCoords = (loc) => ({
      id: loc?.id ?? null,
      latitude: Number(loc.latitude),
      longitude: Number(loc.longitude),
      nama: loc?.nama_lokasi || loc?.nama || 'Kantor',
      radius: loc?.radius_meter != null ? Number(loc.radius_meter) : (loc?.radius_m != null ? Number(loc.radius_m) : 100),
    });
    let nearest = null;
    let nearestDist = Infinity;
    let nearestInside = null;
    let nearestInsideDist = Infinity;
    for (const loc of candidateLocations) {
      const c = toCoords(loc);
      const d = calculateDistance(
        userCoords.latitude, userCoords.longitude, c.latitude, c.longitude);
      if (d < nearestDist) { nearestDist = d; nearest = c; }
      if (d <= c.radius && d < nearestInsideDist) { nearestInsideDist = d; nearestInside = c; }
    }
    return nearestInside || nearest || fallback;
  }, [userCoords, candidateLocations, currentOfficeLocation]);

  const officeCoordsRef = useRef(officeCoords);
  useEffect(() => {
    officeCoordsRef.current = officeCoords;
  }, [officeCoords]);

  // Fungsi: Mengambil Titik Lokasi Kantor & Radius TERBARU Secara Paksa dari Server (Bypass Cache) - Dijalankan 1 kali saja
  const fetchFreshOfficeLocation = useCallback(async () => {
    setIsFetchingOffice(true);
    try {
      const res = await api.getLokasiPresensi();
      if (res && res.success && res.lokasi_kantor) {
        setCurrentOfficeLocation(res.lokasi_kantor);
        if (Array.isArray(res.semua_lokasi)) {
          setLocationsList(res.semua_lokasi);
        }
        setIsOfficeUpdated(true);

        if (typeof onOfficeLocationUpdateRef.current === 'function') {
          onOfficeLocationUpdateRef.current(res.lokasi_kantor, res.semua_lokasi);
        }
      }
    } catch (err) {
      console.warn('Gagal sinkronisasi titik lokasi kantor dari server:', err);
    } finally {
      setIsFetchingOffice(false);
    }
  }, []);

  // Titik lokasi lainnya: semua kandidat KECUALI target terpilih
  // (dulu: semua kecuali lokasi_kantor — karena target selalu
  // lokasi_kantor, lokasi terpilih yang lain tampil sebagai
  // "Lokasi Lain" padahal seharusnya jadi target).
  const otherLocations = useMemo(() => {
    if (!officeCoords) return [];
    return candidateLocations.filter(loc => {
      if (officeCoords.id != null && loc.id != null && loc.id === officeCoords.id) return false;
      if (Math.abs(Number(loc.latitude) - Number(officeCoords.latitude)) < 0.0001 &&
        Math.abs(Number(loc.longitude) - Number(officeCoords.longitude)) < 0.0001) {
        return false;
      }
      return true;
    });
  }, [candidateLocations, officeCoords]);

  // States Anti-Fraud Fake GPS & Mock Location
  const [isCheckingFakeGps, setIsCheckingFakeGps] = useState(false);
  const [isFakeGps, setIsFakeGps] = useState(false);
  const [fakeGpsReason, setFakeGpsReason] = useState('');
  const [showFakeGpsModal, setShowFakeGpsModal] = useState(false);

  // Ambil Posisi GPS Karyawan Real-Time & Lakukan Deteksi Fake GPS
  const fetchLocation = useCallback(async () => {
    setIsRefreshing(true);
    setGpsError('');
    setIsCheckingFakeGps(true);

    if (!('geolocation' in navigator)) {
      setGpsError('Perangkat tidak mendukung geolokasi GPS.');
      setIsRefreshing(false);
      setIsCheckingFakeGps(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy || 10)
        };
        setUserCoords(coords);

        const targetOffice = officeCoordsRef.current;
        if (targetOffice && targetOffice.latitude != null && targetOffice.longitude != null) {
          const dist = calculateDistance(
            coords.latitude,
            coords.longitude,
            targetOffice.latitude,
            targetOffice.longitude
          );
          setDistance(dist);
        } else {
          setDistance(null);
        }
        setIsRefreshing(false);

        // Validasi Anti-Fraud Fake GPS
        try {
          const fakeResult = await checkFakeGps(coords);
          if (fakeResult && fakeResult.isFake) {
            setIsFakeGps(true);
            setFakeGpsReason(fakeResult.reason || 'Terdeteksi manipulasi sinyal GPS atau Mock Location.');
            setShowFakeGpsModal(true);
          } else {
            setIsFakeGps(false);
            setFakeGpsReason('');
          }
        } catch (e) {
          console.warn('Gagal memverifikasi fake GPS:', e);
        } finally {
          setIsCheckingFakeGps(false);
        }
      },
      async (err) => {
        console.warn('Geolocation error:', err.message);
        setGpsError('Tidak dapat mendeteksi GPS. Pastikan izin lokasi aktif dan GPS menyala.');
        setIsRefreshing(false);

        // Periksa native plugin jika ada
        try {
          const fakeResult = await checkFakeGps(null);
          if (fakeResult && fakeResult.isFake) {
            setIsFakeGps(true);
            setFakeGpsReason(fakeResult.reason);
          }
        } catch (_) { }
        setIsCheckingFakeGps(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
    );
  }, []);

  // Kalkulasi jarak otomatis setiap kali userCoords ATAU titik kantor server (officeCoords) berubah.
  // Tanpa lokasi server, jarak = tidak diketahui (null) — gerbang masuk
  // tertutup; tidak ada lagi titik fallback yang dipakai sebagai gerbang.
  useEffect(() => {
    if (!officeFromServer) {
      setDistance(null);
      return;
    }
    if (userCoords && officeCoords && officeCoords.latitude && officeCoords.longitude) {
      const dist = calculateDistance(
        userCoords.latitude,
        userCoords.longitude,
        officeCoords.latitude,
        officeCoords.longitude
      );
      setDistance(dist);
    }
  }, [userCoords, officeCoords, officeFromServer]);

  // Sinkronisasi Titik Lokasi & Deteksi GPS HANYA 1 KALI SAJA saat halaman dibuka
  useEffect(() => {
    if (hasSyncedOnceRef.current) return;
    hasSyncedOnceRef.current = true;

    fetchFreshOfficeLocation();
    fetchLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handler Refresh Total: Tarik data titik kantor dari server sekaligus update GPS perangkat secara manual
  const handleFullRefresh = useCallback(async () => {
    await Promise.allSettled([
      fetchFreshOfficeLocation(),
      fetchLocation()
    ]);
  }, [fetchFreshOfficeLocation, fetchLocation]);

  // Evaluasi apakah karyawan berada di dalam radius atau berstatus Petugas Lapangan (Bebas Radius)
  const isPetugasLapangan = Boolean(user?.is_petugas_lapangan || user?.ijinkan_wfa);
  const radius = officeCoords?.radius ?? 100;
  const isInside = distance !== null ? (distance <= radius || isPetugasLapangan) : false;
  // C24: clock-out TIDAK dibatasi radius (cerminan server — clock-out
  // dari 22 km terbukti sukses). Gate radius hanya untuk 'masuk'.
  // Gate fake-GPS tetap berlaku untuk keduanya; jarak tetap ditampilkan
  // dan direkam untuk pulang.
  const isPulang = !isMasuk;
  const gateOk = isPulang || isInside;
  // Proceed terkunci selama pengecekan Fake GPS masih berjalan
  // (tombol bisa ditekan saat cek belum selesai = lolos tanpa verifikasi).
  const canProceed = gateOk && !isFakeGps && !isCheckingFakeGps;

  const handleProceedClick = () => {
    // Kunci selama pengecekan Fake GPS masih berjalan (jangan lolos
    // tanpa verifikasi) — pelengkap canProceed di tombol.
    if (isCheckingFakeGps) return;
    if (isFakeGps) {
      setShowFakeGpsModal(true);
      return;
    }
    if (!gateOk) return;

    onProceed({
      type,
      // Tanpa GPS dan tanpa lokasi server, koordinat = null (jujur)
      // alih-alih titik palsu; gerbang masuk sudah tertutup di kondisi
      // ini, dan pulang tanpa GPS memang tidak punya titik kantor.
      coords: userCoords || (officeCoords ? {
        latitude: officeCoords.latitude,
        longitude: officeCoords.longitude
      } : { latitude: null, longitude: null }),
      distance: distance || 0,
      officeLocation: officeCoords,
      // Hasil deteksi yang sebenarnya (bukan hardcode false): proceed
      // hanya bisa dipanggil saat isFakeGps false (lihat penjaga di
      // atas), tapi nilai asli tetap diteruskan untuk audit server.
      isFakeGps,
      mock_detected: isFakeGps,
      antiFraudVerified: !isFakeGps,
    });
  };

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
              cursor: 'pointer'
            }}
          >
            <ArrowLeft size={18} />
          </button>

          <div style={{ textAlign: 'center' }}>
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
              {isMasuk ? 'Langkah 1: Cek Lokasi Masuk' : 'Langkah 1: Cek Lokasi Pulang'}
            </span>
          </div>

          <button
            type="button"
            onClick={handleFullRefresh}
            title="Refresh GPS & Sinkronisasi Titik Kantor"
            disabled={isRefreshing || isCheckingFakeGps || isFetchingOffice}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg-slate)',
              border: '1px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary-600)',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={17} className={isRefreshing || isCheckingFakeGps || isFetchingOffice ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Section Title */}
        <div style={{ marginBottom: '10px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.3px', margin: 0 }}>
            Titik Lokasi Presensi
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', margin: 0 }}>
            Pastikan Anda berada di area kantor untuk membuka sesi absensi
          </p>
        </div>

        {/* Status Verifikasi Keaslian GPS (Anti-Fake GPS Strip) */}
        <div style={{
          marginBottom: '12px',
          padding: '8px 12px',
          borderRadius: '12px',
          backgroundColor: isFakeGps
            ? '#fef2f2'
            : isCheckingFakeGps
              ? '#eff6ff'
              : '#f0fdf4',
          border: `1px solid ${isFakeGps ? '#fca5a5' : isCheckingFakeGps ? '#bfdbfe' : '#bbf7d0'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          transition: 'all 0.25s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isFakeGps ? (
              <ShieldAlert size={16} color="#dc2626" style={{ flexShrink: 0 }} />
            ) : isCheckingFakeGps ? (
              <RefreshCw size={14} color="#2563eb" className="animate-spin" style={{ flexShrink: 0 }} />
            ) : (
              <ShieldCheck size={16} color="#16a34a" style={{ flexShrink: 0 }} />
            )}
            <span style={{
              fontSize: '11px',
              fontWeight: '700',
              color: isFakeGps ? '#b91c1c' : isCheckingFakeGps ? '#1d4ed8' : '#15803d'
            }}>
              {isFakeGps
                ? 'Peringatan: Fake GPS / Mock Location Terdeteksi!'
                : isCheckingFakeGps
                  ? 'Memeriksa Keaslian Sinyal GPS...'
                  : 'Anti-Fake GPS Aktif: Koordinat Asli Terverifikasi'}
            </span>
          </div>

          {isFakeGps && (
            <button
              type="button"
              onClick={() => setShowFakeGpsModal(true)}
              style={{
                background: '#dc2626',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '3px 8px',
                fontSize: '10px',
                fontWeight: '800',
                cursor: 'pointer'
              }}
            >
              Detail
            </button>
          )}
        </div>

        {/* Banner Peringatan Keras Jika Fake GPS Terdeteksi */}
        {isFakeGps && (
          <div style={{
            marginBottom: '14px',
            padding: '12px 14px',
            borderRadius: '16px',
            backgroundColor: '#fff1f2',
            border: '1.5px solid #fecdd3',
            boxShadow: '0 4px 14px rgba(225, 29, 72, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            animation: 'fadeIn 0.25s ease-out'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={18} color="#e11d48" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '13px', fontWeight: '800', color: '#9f1239' }}>
                Manipulasi Lokasi Terdeteksi!
              </span>
            </div>
            <p style={{ fontSize: '11px', color: '#be123c', margin: 0, lineHeight: 1.45 }}>
              {fakeGpsReason || 'Aplikasi Fake GPS atau Mock Location aktif pada perangkat Anda.'}
            </p>
            <div style={{ fontSize: '11px', color: '#881337', fontWeight: '600', marginTop: '2px' }}>
              Presensi diblokir. Harap nonaktifkan Fake GPS dan matikan Mock Location di Opsi Pengembang untuk melanjutkan.
            </div>
          </div>
        )}

        {/* Card Maps Container (height 400px) */}
        <div style={{
          width: '100%',
          height: '400px',
          borderRadius: '24px',
          border: `1.5px solid ${isFakeGps ? '#fca5a5' : 'var(--border-light)'}`,
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: '#f1f5f9',
          boxShadow: '0 10px 28px rgba(0, 0, 0, 0.08)'
        }}>
          {userCoords ? (
            <AttendanceMap
              officeCoords={officeCoords}
              userCoords={userCoords}
              otherLocations={otherLocations}
              radius={radius}
              isInside={isInside && !isFakeGps}
            />
          ) : gpsError ? (
            // B14: GPS gagal JANGAN spinner abadi — tampilkan status
            // gagal + tombol Periksa Ulang yang jelas.
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', padding: '0 16px', boxSizing: 'border-box' }}>
              <AlertCircle size={28} style={{ color: '#dc2626', marginBottom: '8px' }} />
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#dc2626' }}>GPS tidak tersedia</span>
              <span style={{ fontSize: '11px', marginTop: '4px', textAlign: 'center' }}>{gpsError}</span>
              <button
                type="button"
                onClick={handleFullRefresh}
                disabled={isRefreshing || isCheckingFakeGps || isFetchingOffice}
                style={{
                  marginTop: '14px',
                  height: '40px',
                  padding: '0 18px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: '#ffffff',
                  border: '2px solid var(--primary-600)',
                  color: 'var(--primary-600)',
                  fontSize: '12px',
                  fontWeight: '800',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={15} className={isRefreshing || isCheckingFakeGps || isFetchingOffice ? 'animate-spin' : ''} />
                <span>Periksa Ulang</span>
              </button>
            </div>
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              <Navigation size={28} className="animate-spin" style={{ color: 'var(--primary-500)', marginBottom: '8px' }} />
              <span style={{ fontSize: '12px', fontWeight: '600' }}>Mendeteksi Titik GPS Anda...</span>
            </div>
          )}

          {/* Floating Badge Status Di Pojok Atas Peta */}
          <div style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            zIndex: 10,
            backdropFilter: 'blur(6px)',
            backgroundColor: isFakeGps ? '#fef2f2' : (isPetugasLapangan ? '#eef2ff' : (isInside ? 'var(--success-bg)' : '#fef2f2')),
            border: isFakeGps ? '1px solid #fecaca' : (isPetugasLapangan ? '1px solid #c7d2fe' : (isInside ? '1px solid #bbf7d0' : '1px solid #fecaca')),
            borderRadius: 'var(--radius-full)',
            padding: '5px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)'
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isFakeGps ? '#dc2626' : (isPetugasLapangan ? '#4f46e5' : (isInside ? '#22c55e' : '#ef4444'))
            }}></span>
            <span style={{
              fontSize: '11px',
              fontWeight: '800',
              color: isFakeGps ? '#dc2626' : (isPetugasLapangan ? '#4338ca' : (isInside ? 'var(--success)' : 'var(--danger)'))
            }}>
              {isFakeGps ? 'Fake GPS Terdeteksi' : (isPetugasLapangan ? 'Petugas Lapangan (Bebas Radius)' : (isInside ? 'Dalam Radius Kantor' : 'Di Luar Radius Kantor'))}
            </span>
          </div>

          {/* Legenda Titik Lokasi Floating di Pojok Kiri Bawah Peta */}
          {otherLocations.length > 0 && (
            <div style={{
              position: 'absolute',
              bottom: '12px',
              left: '12px',
              zIndex: 10,
              backgroundColor: 'rgba(255, 255, 255, 0.92)',
              backdropFilter: 'blur(6px)',
              borderRadius: '12px',
              padding: '6px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '10px',
              fontWeight: '700',
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
              border: '1px solid rgba(226, 232, 240, 0.8)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f97316' }}></span>
                <span style={{ color: '#0f172a' }}>Target Anda</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#64748b' }}></span>
                <span style={{ color: '#64748b' }}>{otherLocations.length} Lokasi Lain</span>
              </div>
            </div>
          )}
        </div>

        {/* Card Detail Status Geofencing */}
        <div style={{
          marginTop: '14px',
          padding: '14px 16px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: isFakeGps
            ? '#fef2f2'
            : isPetugasLapangan
              ? '#eef2ff'
              : isInside
                ? 'var(--success-bg)'
                : 'var(--bg-slate)',
          border: isFakeGps
            ? '1.5px solid #fecaca'
            : isPetugasLapangan
              ? '1.5px solid #c7d2fe'
              : isInside
                ? '1.5px solid #bbf7d0'
                : '1px solid var(--border-light)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building size={16} style={{ color: isFakeGps ? '#dc2626' : (isPetugasLapangan ? '#4f46e5' : (isInside ? 'var(--success)' : 'var(--primary-600)')) }} />
              <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)' }}>
                {officeCoords?.nama || 'Lokasi kantor belum tersedia dari server'}
              </span>
            </div>

            <span style={{
              fontSize: '12px',
              fontWeight: '900',
              color: isFakeGps ? '#dc2626' : (isPetugasLapangan ? '#4f46e5' : (isInside ? 'var(--success)' : 'var(--danger)')),
              fontFamily: 'var(--font-mono)'
            }}>
              {distance !== null ? `${distance} Meter` : '-- Meter'}
            </span>
          </div>

          {/* Indikator Status Sinkronisasi Titik Kantor & Radius Real-Time */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '4px',
            borderTop: '1px dashed var(--border-light)',
            fontSize: '11px'
          }}>
            <span style={{ color: 'var(--text-muted)' }}>
              Radius Acuan: <strong style={{ color: 'var(--text-main)', fontWeight: '800' }}>{radius} Meter</strong>
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {isFetchingOffice ? (
                <span style={{ fontSize: '10px', color: 'var(--primary-600)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <RefreshCw size={10} className="animate-spin" /> Menyinkronkan Radius...
                </span>
              ) : isOfficeUpdated ? (
                <span style={{
                  fontSize: '10px',
                  color: '#16a34a',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  backgroundColor: '#f0fdf4',
                  padding: '2px 6px',
                  borderRadius: '6px',
                  border: '1px solid #bbf7d0'
                }}>
                  <CheckCircle2 size={10} /> Radius Terkini
                </span>
              ) : null}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: isFakeGps ? '#b91c1c' : (isPetugasLapangan ? '#3730a3' : (isInside ? '#15803d' : 'var(--text-muted)')) }}>
            {isFakeGps ? (
              <>
                <ShieldAlert size={15} style={{ color: '#dc2626', flexShrink: 0 }} />
                <span>Posisi tidak valid karena manipulasi koordinat Fake GPS.</span>
              </>
            ) : isPetugasLapangan ? (
              <>
                <Navigation size={15} style={{ color: '#4f46e5', flexShrink: 0 }} />
                <span>Mode Petugas Lapangan Aktif: Anda bebas melakukan presensi di luar radius kantor!</span>
              </>
            ) : isInside ? (
              <>
                <CheckCircle2 size={15} style={{ color: 'var(--success)', flexShrink: 0 }} />
                <span>Titik lokasi valid! Anda berada dalam batas radius {radius}m.</span>
              </>
            ) : isPulang ? (
              <>
                <AlertCircle size={15} style={{ color: 'var(--warning)', flexShrink: 0 }} />
                <span>
                  {distance !== null
                    ? `Clock-out tidak dibatasi radius — Anda berada ${distance}m dari kantor, lokasi tetap direkam.`
                    : 'Mendeteksi posisi GPS...'}
                </span>
              </>
            ) : (
              <>
                <AlertCircle size={15} style={{ color: 'var(--warning)', flexShrink: 0 }} />
                <span>
                  {distance !== null
                    ? `Anda berada ${distance}m dari kantor (Batas: ${radius}m. Selisih ${Math.max(0, distance - radius)}m).`
                    : 'Mendeteksi posisi GPS...'}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Error jika GPS bermasalah */}
        {gpsError && (
          <div style={{
            marginTop: '10px',
            padding: '10px 12px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--danger-bg)',
            border: '1px solid #fecaca',
            color: 'var(--danger)',
            fontSize: '11px',
            fontWeight: '600'
          }}>
            {gpsError}
          </div>
        )}
      </div>

      {/* Bagian Tombol Aksi di Bawah */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
        {/* KASUS 1: FAKE GPS TERDETEKSI (Tombol Diblokir Keras) */}
        {isFakeGps ? (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={handleFullRefresh}
              disabled={isRefreshing || isCheckingFakeGps || isFetchingOffice}
              style={{
                width: '50px',
                height: '50px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-slate)',
                border: '1px solid var(--border-light)',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              title="Periksa Ulang"
            >
              <RefreshCw size={18} className={isRefreshing || isCheckingFakeGps || isFetchingOffice ? 'animate-spin' : ''} />
            </button>

            <button
              type="button"
              onClick={() => setShowFakeGpsModal(true)}
              style={{
                flex: 1,
                height: '50px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: '#fee2e2',
                border: '1.5px solid #fca5a5',
                color: '#dc2626',
                fontSize: '14px',
                fontWeight: '800',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(220, 38, 38, 0.15)'
              }}
            >
              <ShieldAlert size={18} />
              <span>Fake GPS Terdeteksi (Lihat Solusi)</span>
            </button>
          </div>
        ) : !gateOk ? (
          /* KASUS 2: BELUM DI DALAM RADIUS KANTOR (hanya untuk 'masuk';
             'pulang' lolos lewat gateOk sehingga masuk KASUS 3) */
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={handleFullRefresh}
              disabled={isRefreshing || isCheckingFakeGps || isFetchingOffice}
              style={{
                flex: 1,
                height: '50px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: '#ffffff',
                border: '2px solid var(--primary-600)',
                color: 'var(--primary-600)',
                fontSize: '14px',
                fontWeight: '800',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <RefreshCw size={18} className={isRefreshing || isCheckingFakeGps || isFetchingOffice ? 'animate-spin' : ''} />
              <span>{isFetchingOffice ? 'Sinkronisasi Server...' : 'Periksa Ulang'}</span>
            </button>

            <button
              type="button"
              disabled={isMasuk}
              onClick={isMasuk ? undefined : handleProceedClick}
              title={isMasuk ? 'Dekati lokasi kantor agar tombol aktif' : 'Pulang dapat dilakukan dari lokasi mana saja'}
              style={{
                flex: 1,
                height: '50px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: isMasuk ? 'var(--bg-slate)' : 'var(--primary-gradient)',
                border: isMasuk ? '1px solid var(--border-light)' : 'none',
                color: isMasuk ? 'var(--text-light)' : '#ffffff',
                fontSize: '14px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: isMasuk ? 'not-allowed' : 'pointer',
                opacity: isMasuk ? 0.6 : 1
              }}
            >
              {isMasuk ? <Lock size={16} /> : <ArrowRight size={16} />}
              <span>{isMasuk ? 'Lanjutkan' : 'Lanjutkan Pulang'}</span>
            </button>
          </div>
        ) : (
          /* KASUS 3: AMAN & BERADA DI DALAM RADIUS KANTOR */
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={fetchLocation}
              disabled={isRefreshing || isCheckingFakeGps}
              title="Perbarui GPS"
              style={{
                width: '50px',
                height: '50px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-slate)',
                border: '1px solid var(--border-light)',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={18} className={isRefreshing || isCheckingFakeGps ? 'animate-spin' : ''} />
            </button>

            <button
              type="button"
              onClick={handleProceedClick}
              disabled={!canProceed}
              style={{
                flex: 1,
                height: '50px',
                borderRadius: 'var(--radius-md)',
                background: isMasuk ? 'var(--primary-gradient)' : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                border: 'none',
                color: '#ffffff',
                fontSize: '15px',
                fontWeight: '800',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                cursor: 'pointer',
                boxShadow: isMasuk ? 'var(--shadow-primary)' : '0 6px 16px rgba(37, 99, 235, 0.35)',
                animation: 'scaleIn 0.25s ease-out'
              }}
            >
              <span>Lanjutkan ke Kamera</span>
              <ArrowRight size={18} strokeWidth={2.5} />
            </button>
          </div>
        )}
      </div>

      {/* Modal Popup Peringatan Anti-Fraud Fake GPS */}
      {showFakeGpsModal && (
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
            border: '1px solid rgba(254, 202, 202, 0.8)',
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
                  background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                  border: '1px solid #fca5a5',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(220, 38, 38, 0.15)'
                }}>
                  <ShieldAlert size={28} strokeWidth={2.3} />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#991b1b', margin: 0, letterSpacing: '-0.3px' }}>
                    Peringatan Anti-Fraud
                  </h3>
                  <p style={{ fontSize: '11px', color: '#b91c1c', margin: '2px 0 0 0', fontWeight: '600' }}>
                    Fake GPS / Mock Location Terdeteksi
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowFakeGpsModal(false)}
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

            <div style={{
              padding: '12px 14px',
              borderRadius: '14px',
              backgroundColor: '#fff1f2',
              border: '1px solid #fecdd3',
              fontSize: '12px',
              color: '#9f1239',
              lineHeight: 1.45
            }}>
              <strong>Detail Temuan Sistem:</strong>
              <div style={{ marginTop: '4px', color: '#e11d48' }}>
                {fakeGpsReason || 'Koordinat lokasi perangkat berasal dari aplikasi Mock Location atau provider tiruan.'}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-main)' }}>
                Langkah yang Harus Dilakukan:
              </span>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '11px', color: '#475569' }}>
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', flexShrink: 0, color: 'var(--primary-600)' }}>1</div>
                <div>Tutup atau copot pemasangan aplikasi pemalsu lokasi (Fake GPS / GPS Joystick) dari perangkat Anda.</div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '11px', color: '#475569' }}>
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', flexShrink: 0, color: 'var(--primary-600)' }}>2</div>
                <div>Buka <strong>Pengaturan HP &gt; Opsi Pengembang (Developer Options)</strong> dan pilih <em>Tidak Ada</em> pada opsi <strong>Pilih aplikasi lokasi palsu (Mock location app)</strong>.</div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '11px', color: '#475569' }}>
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', flexShrink: 0, color: 'var(--primary-600)' }}>3</div>
                <div>Nyalakan GPS lokasi fisik asli Anda lalu tekan tombol <strong>Cek Ulang Lokasi</strong> di bawah.</div>
              </div>
            </div>

            {/* Tombol Aksi */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => {
                  setShowFakeGpsModal(false);
                  fetchLocation();
                }}
                style={{
                  width: '100%',
                  height: '46px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--primary-gradient)',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-primary)'
                }}
              >
                <RefreshCw size={17} />
                <span>Cek Ulang Lokasi Sekarang</span>
              </button>

              <button
                type="button"
                onClick={() => setShowFakeGpsModal(false)}
                style={{
                  width: '100%',
                  padding: '8px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                Tutup Peringatan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
