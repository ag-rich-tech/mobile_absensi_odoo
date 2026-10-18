import React, { useState, useEffect } from 'react';
import {
  ChevronLeft, Users, Calendar, Search, ChevronRight, X, Clock,
  MapPin, AlertTriangle, CheckCircle2, ShieldAlert, Sparkles,
  Info, RefreshCw, Coffee, AlertCircle, Building, UserCheck
} from 'lucide-react';
import api from '../../services/api';

const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export default function KehadiranBawahanView({ onBack }) {
  const currentDate = new Date();
  const [selectedBulan, setSelectedBulan] = useState(currentDate.getMonth() + 1);
  const [selectedTahun, setSelectedTahun] = useState(currentDate.getFullYear());
  
  // State data utama
  const [statusFitur, setStatusFitur] = useState(null);
  const [daftarBawahan, setDaftarBawahan] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // State tampilan kalender bawahan spesifik (ketika tombol 'Detail' diklik)
  const [selectedBawahan, setSelectedBawahan] = useState(null);
  const [kalenderData, setKalenderData] = useState(null);
  const [isLoadingKalender, setIsLoadingKalender] = useState(false);
  const [selectedDayDetail, setSelectedDayDetail] = useState(null); // Modal detail tanggal

  const formatBulanTahunParam = (m, y) => {
    const mm = String(m).padStart(2, '0');
    return `${y}-${mm}`;
  };

  // Muat status dan list staf bawahan
  const loadDataBawahan = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      // 1. Cek status otorisasi & setting admin
      const statusRes = await api.getKehadiranBawahanStatus();
      setStatusFitur(statusRes);

      if (statusRes.success && statusRes.is_enabled && statusRes.is_atasan) {
        const bulanParam = formatBulanTahunParam(selectedBulan, selectedTahun);
        const listRes = await api.getKehadiranBawahanList(bulanParam);
        if (listRes.success) {
          setDaftarBawahan(listRes.data || []);
        } else {
          setDaftarBawahan([]);
        }
      }
    } catch (err) {
      console.error('Gagal memuat data bawahan:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Muat kalender detail saat bawahan dipilih atau bulan diganti
  const loadKalenderBawahan = async (bawahanId, m = selectedBulan, y = selectedTahun) => {
    setIsLoadingKalender(true);
    try {
      const bulanParam = formatBulanTahunParam(m, y);
      const res = await api.getKalenderBawahan(bawahanId, bulanParam);
      if (res.success) {
        setKalenderData(res);
      } else {
        setKalenderData(null);
      }
    } catch (err) {
      console.error('Gagal memuat kalender bawahan:', err);
    } finally {
      setIsLoadingKalender(false);
    }
  };

  useEffect(() => {
    loadDataBawahan();
  }, [selectedBulan, selectedTahun]);

  // Efek ganti bulan di view kalender
  const handlePilihBawahan = (bawahan) => {
    setSelectedBawahan(bawahan);
    loadKalenderBawahan(bawahan.id, selectedBulan, selectedTahun);
  };

  const handlePrevMonth = () => {
    let nextM = selectedBulan - 1;
    let nextY = selectedTahun;
    if (nextM < 1) {
      nextM = 12;
      nextY -= 1;
    }
    setSelectedBulan(nextM);
    setSelectedTahun(nextY);
    if (selectedBawahan) {
      loadKalenderBawahan(selectedBawahan.id, nextM, nextY);
    }
  };

  const handleNextMonth = () => {
    let nextM = selectedBulan + 1;
    let nextY = selectedTahun;
    if (nextM > 12) {
      nextM = 1;
      nextY += 1;
    }
    setSelectedBulan(nextM);
    setSelectedTahun(nextY);
    if (selectedBawahan) {
      loadKalenderBawahan(selectedBawahan.id, nextM, nextY);
    }
  };

  // Filter pencarian bawahan
  const filteredBawahan = daftarBawahan.filter((b) => {
    const q = searchQuery.toLowerCase();
    return (
      b.nama?.toLowerCase().includes(q) ||
      b.nip?.toLowerCase().includes(q) ||
      b.jabatan?.toLowerCase().includes(q) ||
      b.departemen?.toLowerCase().includes(q)
    );
  });

  // Tampilan 1: Loading Awal
  if (isLoading && !statusFitur) {
    return (
      <div style={{ padding: '24px 20px', minHeight: '380px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
        <RefreshCw size={28} className="animate-spin" color="var(--primary-600)" />
        <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>
          Memeriksa hak akses & data tim bawahan...
        </span>
      </div>
    );
  }

  // Tampilan 2: Fitur Dinonaktifkan oleh Admin di Panel Monitoring
  if (statusFitur && !statusFitur.is_enabled) {
    return (
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }} className="animate-fade-in">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={onBack}
            className="btn-back-action"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: 'var(--bg-slate)',
              border: '1px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-main)',
              cursor: 'pointer'
            }}
          >
            <ChevronLeft size={20} />
          </button>
          <h2 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
            Kehadiran Bawahan
          </h2>
        </div>

        <div style={{
          backgroundColor: '#fff7ed',
          border: '1.5px solid #fed7aa',
          borderRadius: '16px',
          padding: '24px 20px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          marginTop: '20px'
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: '#ffedd5',
            color: '#ea580c',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ShieldAlert size={28} />
          </div>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#9a3412', margin: '0 0 6px' }}>
              Fitur Dinonaktifkan
            </h3>
            <p style={{ fontSize: '12px', color: '#c2410c', margin: 0, lineHeight: 1.5 }}>
              Fitur riwayat absensi bawahan sedang dinonaktifkan oleh Administrator melalui menu monitoring di panel admin. Silakan hubungi admin jika Anda membutuhkan akses ini.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Tampilan 3: User Bukan Atasan / Tidak Ada Anggota Bawahan
  if (statusFitur && !statusFitur.is_atasan) {
    return (
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }} className="animate-fade-in">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={onBack}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: 'var(--bg-slate)',
              border: '1px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-main)',
              cursor: 'pointer'
            }}
          >
            <ChevronLeft size={20} />
          </button>
          <h2 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
            Kehadiran Bawahan
          </h2>
        </div>

        <div style={{
          backgroundColor: '#f8fafc',
          border: '1.5px solid #e2e8f0',
          borderRadius: '16px',
          padding: '24px 20px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          marginTop: '20px'
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: '#e2e8f0',
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Users size={28} />
          </div>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#1e293b', margin: '0 0 6px' }}>
              Tidak Memiliki Staf Bawahan
            </h3>
            <p style={{ fontSize: '12px', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
              Akun Anda saat ini tidak tercatat sebagai atasan dari karyawan manapun dalam sistem kepegawaian.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // TAMPILAN 4: KALENDER KEHADIRAN BAWAHAN SPESIFIK (JIKA TOMBOL DETAIL SUDAH DIKLIK)
  if (selectedBawahan) {
    const summary = kalenderData?.summary || {};
    const kalenderHari = kalenderData?.kalender || [];

    // Helper hari pertama bulan jatuh pada hari apa untuk padding grid kalender (0 = Minggu, 1 = Senin, dst)
    const firstDayIndex = kalenderHari.length > 0 ? new Date(kalenderHari[0].tanggal).getDay() : 0;
    const paddingBlanks = Array.from({ length: firstDayIndex });

    return (
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }} className="animate-fade-in">
        {/* Header Navigasi Atas */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={() => {
                setSelectedBawahan(null);
                setKalenderData(null);
              }}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: 'var(--bg-slate)',
                border: '1px solid var(--border-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-main)',
                cursor: 'pointer'
              }}
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', margin: 0, letterSpacing: '-0.3px' }}>
                Kalender Kehadiran
              </h2>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
                Riwayat absensi harian staf bawahan
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => loadKalenderBawahan(selectedBawahan.id)}
            disabled={isLoadingKalender}
            title="Segarkan Kalender"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: 'var(--bg-slate)',
              border: '1px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-main)',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={16} className={isLoadingKalender ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Profil Singkat Bawahan Terpilih */}
        <div style={{
          padding: '14px 16px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
          border: '1.5px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          {selectedBawahan.foto ? (
            <img
              src={selectedBawahan.foto}
              alt={selectedBawahan.nama}
              style={{ width: '46px', height: '46px', borderRadius: '12px', objectFit: 'cover', border: '1.5px solid #cbd5e1' }}
            />
          ) : (
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '800',
              fontSize: '15px'
            }}>
              {selectedBawahan.inisial || selectedBawahan.nama.substring(0, 2).toUpperCase()}
            </div>
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', margin: '0 0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {selectedBawahan.nama}
            </h3>
            <p style={{ fontSize: '11px', color: '#64748b', margin: '0 0 2px', fontWeight: '600' }}>
              NIP: {selectedBawahan.nip} • {selectedBawahan.jabatan}
            </p>
            <span style={{ fontSize: '10px', color: '#0284c7', fontWeight: '700', backgroundColor: '#e0f2fe', padding: '2px 6px', borderRadius: '4px' }}>
              {selectedBawahan.departemen}
            </span>
          </div>
        </div>

        {/* Switch Navigasi Bulan */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '8px 12px',
          border: '1.5px solid var(--border-light)'
        }}>
          <button
            type="button"
            onClick={handlePrevMonth}
            style={{
              padding: '6px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#f1f5f9',
              color: '#334155',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <ChevronLeft size={18} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={16} color="var(--primary-600)" />
            <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)' }}>
              {NAMA_BULAN[selectedBulan - 1]} {selectedTahun}
            </span>
          </div>

          <button
            type="button"
            onClick={handleNextMonth}
            style={{
              padding: '6px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#f1f5f9',
              color: '#334155',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Ringkasan Kode & Statistik Kehadiran Bulanan */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '8px'
        }}>
          {/* H */}
          <div style={{ padding: '8px 6px', borderRadius: '10px', backgroundColor: '#f0fdf4', border: '1px solid #86efac', textAlign: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: '#16a34a', display: 'block' }}>H</span>
            <span style={{ fontSize: '16px', fontWeight: '800', color: '#15803d', display: 'block' }}>{summary.H || 0}</span>
            <span style={{ fontSize: '9px', color: '#166534', fontWeight: '600' }}>Tepat Waktu</span>
          </div>

          {/* H-TP */}
          <div style={{ padding: '8px 6px', borderRadius: '10px', backgroundColor: '#fff7ed', border: '1px solid #fed7aa', textAlign: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: '#ea580c', display: 'block' }}>H-TP</span>
            <span style={{ fontSize: '16px', fontWeight: '800', color: '#c2410c', display: 'block' }}>{(summary.H_TP || 0) + (summary.TP || 0)}</span>
            <span style={{ fontSize: '9px', color: '#9a3412', fontWeight: '600' }}>Tdk Absen Plg</span>
          </div>

          {/* T */}
          <div style={{ padding: '8px 6px', borderRadius: '10px', backgroundColor: '#fffbeb', border: '1px solid #fde68a', textAlign: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: '#d97706', display: 'block' }}>T</span>
            <span style={{ fontSize: '16px', fontWeight: '800', color: '#b45309', display: 'block' }}>{(summary.T || 0) + (summary.T_TP || 0)}</span>
            <span style={{ fontSize: '9px', color: '#78350f', fontWeight: '600' }}>Terlambat</span>
          </div>

          {/* PA */}
          <div style={{ padding: '8px 6px', borderRadius: '10px', backgroundColor: '#eef2ff', border: '1px solid #c7d2fe', textAlign: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: '#6366f1', display: 'block' }}>PA</span>
            <span style={{ fontSize: '16px', fontWeight: '800', color: '#4f46e5', display: 'block' }}>{(summary.PA || 0) + (summary.T_PA || 0)}</span>
            <span style={{ fontSize: '9px', color: '#3730a3', fontWeight: '600' }}>Pulang Awal</span>
          </div>

          {/* A (TIDAK HADIR / MERAH) */}
          <div style={{ padding: '8px 6px', borderRadius: '10px', backgroundColor: '#fef2f2', border: '1.5px solid #fca5a5', textAlign: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: '#dc2626', display: 'block' }}>A</span>
            <span style={{ fontSize: '16px', fontWeight: '800', color: '#b91c1c', display: 'block' }}>{summary.A || 0}</span>
            <span style={{ fontSize: '9px', color: '#991b1b', fontWeight: '700' }}>Tidak Hadir</span>
          </div>

          {/* I */}
          <div style={{ padding: '8px 6px', borderRadius: '10px', backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', textAlign: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: '#0284c7', display: 'block' }}>I</span>
            <span style={{ fontSize: '16px', fontWeight: '800', color: '#0369a1', display: 'block' }}>{summary.I || 0}</span>
            <span style={{ fontSize: '9px', color: '#075985', fontWeight: '600' }}>Izin</span>
          </div>

          {/* S */}
          <div style={{ padding: '8px 6px', borderRadius: '10px', backgroundColor: '#fefce8', border: '1px solid #fef08a', textAlign: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: '#ca8a04', display: 'block' }}>S</span>
            <span style={{ fontSize: '16px', fontWeight: '800', color: '#a16207', display: 'block' }}>{summary.S || 0}</span>
            <span style={{ fontSize: '9px', color: '#854d0e', fontWeight: '600' }}>Sakit</span>
          </div>

          {/* C & D */}
          <div style={{ padding: '8px 6px', borderRadius: '10px', backgroundColor: '#f0fdfa', border: '1px solid #99f6e4', textAlign: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: '#0d9488', display: 'block' }}>C / D</span>
            <span style={{ fontSize: '16px', fontWeight: '800', color: '#0f766e', display: 'block' }}>{(summary.C || 0) + (summary.D || 0)}</span>
            <span style={{ fontSize: '9px', color: '#115e59', fontWeight: '600' }}>Cuti/Dinas</span>
          </div>
        </div>

        {/* Card Kalender Presensi Grid */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1.5px solid var(--border-light)',
          padding: '16px 12px',
          boxShadow: '0 4px 14px rgba(0,0,0,0.04)'
        }}>
          {isLoadingKalender ? (
            <div style={{ padding: '40px 0', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <RefreshCw size={24} className="animate-spin" color="var(--primary-600)" />
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Menyusun kalender kehadiran...</span>
            </div>
          ) : (
            <div>
              {/* Header Kolom Nama Hari */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '4px',
                textAlign: 'center',
                marginBottom: '8px'
              }}>
                {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((hari, idx) => (
                  <div
                    key={hari}
                    style={{
                      fontSize: '11px',
                      fontWeight: '800',
                      color: idx === 0 ? '#ef4444' : '#64748b',
                      padding: '4px 0'
                    }}
                  >
                    {hari}
                  </div>
                ))}
              </div>

              {/* Grid Kotak Tanggal */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '5px'
              }}>
                {/* Padding awal bulan */}
                {paddingBlanks.map((_, idx) => (
                  <div key={`blank-${idx}`} style={{ minHeight: '48px', opacity: 0.2 }} />
                ))}

                {/* Tanggal 1 s/d Hari Terakhir */}
                {kalenderHari.map((day) => {
                  const isAlfa = day.kode === 'A';
                  const isLibur = day.kode === 'L';
                  const isFuture = day.is_future;

                  return (
                    <div
                      key={day.tanggal}
                      onClick={() => setSelectedDayDetail(day)}
                      style={{
                        minHeight: '48px',
                        borderRadius: '8px',
                        backgroundColor: day.warna_bg || '#ffffff',
                        border: `1.5px solid ${day.warna_border || '#e2e8f0'}`,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '3px 2px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        position: 'relative',
                        boxShadow: day.is_today ? '0 0 0 2px var(--primary-600)' : 'none'
                      }}
                    >
                      {/* Nomor Tanggal */}
                      <span style={{
                        fontSize: '9px',
                        fontWeight: day.is_today ? '900' : '600',
                        color: day.is_today ? 'var(--primary-600)' : '#64748b',
                        alignSelf: 'flex-start',
                        paddingLeft: '2px',
                        lineHeight: 1
                      }}>
                        {day.hari}
                      </span>

                      {/* Kode Status Utama */}
                      <span style={{
                        fontSize: isAlfa ? '14px' : (day.kode?.length > 2 ? '10px' : '12px'),
                        fontWeight: '900',
                        color: day.warna_teks || '#1e293b',
                        lineHeight: 1,
                        margin: '2px 0'
                      }}>
                        {day.kode || ''}
                      </span>

                      {/* Indikator kecil detail absensi */}
                      <div style={{ height: '4px', display: 'flex', alignItems: 'center' }}>
                        {day.detail_absensi && (
                          <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: day.warna_teks }} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Panduan Legenda Status */}
        <div style={{
          backgroundColor: '#f8fafc',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <span style={{ fontSize: '11px', fontWeight: '800', color: '#334155', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Info size={14} color="#0284c7" /> Keterangan Kode Status Presensi:
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '10px', color: '#475569' }}>
            <div><b style={{ color: '#16a34a' }}>H</b> : Hadir Tepat Waktu</div>
            <div><b style={{ color: '#ea580c' }}>H-TP</b> : Hadir (Tdk Absen Pulang)</div>
            <div><b style={{ color: '#d97706' }}>T</b> : Telat Masuk</div>
            <div><b style={{ color: '#6366f1' }}>PA</b> : Pulang Awal</div>
            <div><b style={{ color: '#ef4444' }}>A</b> : Tidak Hadir / Alpha (Merah)</div>
            <div><b style={{ color: '#0284c7' }}>I</b> : Izin Resmi</div>
            <div><b style={{ color: '#ca8a04' }}>S</b> : Sakit</div>
            <div><b style={{ color: '#94a3b8' }}>L</b> : Hari Libur / Off Kerja</div>
          </div>
        </div>

        {/* Modal Bottom Sheet Detail Harian Saat Tanggal Disentuh */}
        {selectedDayDetail && (
          <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            padding: 0
          }}>
            <div style={{
              width: '100%',
              maxWidth: '500px',
              backgroundColor: '#ffffff',
              borderTopLeftRadius: '24px',
              borderTopRightRadius: '24px',
              padding: '20px',
              boxShadow: '0 -10px 25px rgba(0,0,0,0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
              {/* Header Modal */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)' }}>
                    Rincian Kehadiran Tanggal
                  </span>
                  <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: '2px 0 0' }}>
                    {selectedDayDetail.nama_hari}, {selectedDayDetail.hari} {NAMA_BULAN[selectedBulan - 1]} {selectedTahun}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDayDetail(null)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: '#f1f5f9',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#64748b',
                    cursor: 'pointer'
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Status Badge */}
              <div style={{
                padding: '10px 14px',
                borderRadius: '12px',
                backgroundColor: selectedDayDetail.warna_bg,
                border: `1.5px solid ${selectedDayDetail.warna_border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <span style={{ fontSize: '10px', fontWeight: '700', color: selectedDayDetail.warna_teks, textTransform: 'uppercase' }}>
                    Status Harian
                  </span>
                  <h4 style={{ fontSize: '14px', fontWeight: '800', color: selectedDayDetail.warna_teks, margin: '2px 0 0' }}>
                    [{selectedDayDetail.kode}] {selectedDayDetail.label}
                  </h4>
                </div>
                {selectedDayDetail.kode === 'A' && (
                  <span style={{ backgroundColor: '#ef4444', color: '#ffffff', fontSize: '10px', fontWeight: '800', padding: '3px 8px', borderRadius: '6px' }}>
                    Alpha
                  </span>
                )}
              </div>

              {/* Keterangan / Deskripsi Izin/Dinas */}
              {selectedDayDetail.deskripsi && (
                <div style={{ padding: '10px 12px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '10px', fontWeight: '700', color: '#64748b' }}>Keterangan / Dokumen:</span>
                  <p style={{ fontSize: '12px', color: '#334155', margin: '2px 0 0', fontWeight: '600' }}>
                    {selectedDayDetail.deskripsi}
                  </p>
                </div>
              )}

              {/* Data Jam Masuk, Jam Pulang, Shift */}
              {selectedDayDetail.detail_absensi ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {/* Jam Masuk */}
                    <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '10px', fontWeight: '700', color: '#64748b' }}>Jam Masuk</span>
                      <p style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: '2px 0 0' }}>
                        {selectedDayDetail.detail_absensi.jam_masuk || '--:--'}
                      </p>
                      <span style={{
                        fontSize: '9px',
                        fontWeight: '700',
                        color: selectedDayDetail.detail_absensi.status_masuk === 'terlambat' ? '#ea580c' : '#16a34a'
                      }}>
                        {selectedDayDetail.detail_absensi.status_masuk === 'terlambat'
                          ? `Telat ${selectedDayDetail.detail_absensi.menit_terlambat} mnt`
                          : 'Tepat Waktu'}
                      </span>
                    </div>

                    {/* Jam Pulang */}
                    <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '10px', fontWeight: '700', color: '#64748b' }}>Jam Pulang</span>
                      <p style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: '2px 0 0' }}>
                        {selectedDayDetail.detail_absensi.jam_pulang || '--:--'}
                      </p>
                      <span style={{
                        fontSize: '9px',
                        fontWeight: '700',
                        color: !selectedDayDetail.detail_absensi.jam_pulang
                          ? '#ef4444'
                          : (selectedDayDetail.detail_absensi.status_pulang === 'pulang_cepat' ? '#6366f1' : '#16a34a')
                      }}>
                        {!selectedDayDetail.detail_absensi.jam_pulang
                          ? 'Tidak Absen Pulang (TP)'
                          : (selectedDayDetail.detail_absensi.status_pulang === 'pulang_cepat'
                              ? `Pulang Cepat ${selectedDayDetail.detail_absensi.menit_pulang_cepat} mnt`
                              : 'Normal')}
                      </span>
                    </div>
                  </div>

                  {/* Lokasi & Shift Info */}
                  <div style={{ padding: '8px 12px', borderRadius: '10px', backgroundColor: '#f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#475569' }}>
                      Shift: <b>{selectedDayDetail.detail_absensi.shift}</b>
                    </span>
                    <span style={{ fontSize: '11px', color: '#475569' }}>
                      Lokasi: <b>{selectedDayDetail.detail_absensi.lokasi}</b>
                    </span>
                  </div>

                  {selectedDayDetail.detail_absensi.total_denda > 0 && (
                    <div style={{ padding: '8px 12px', borderRadius: '8px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', color: '#b91c1c', fontWeight: '600' }}>Denda Keterlambatan:</span>
                      <span style={{ fontSize: '12px', color: '#b91c1c', fontWeight: '800' }}>
                        Rp {Number(selectedDayDetail.detail_absensi.total_denda).toLocaleString('id-ID')}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ padding: '16px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '10px', color: '#64748b', fontSize: '12px' }}>
                  Tidak ada catatan ketukan presensi pada tanggal ini.
                </div>
              )}

              <button
                type="button"
                onClick={() => setSelectedDayDetail(null)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  backgroundColor: '#0f172a',
                  color: '#ffffff',
                  fontWeight: '700',
                  fontSize: '13px',
                  border: 'none',
                  cursor: 'pointer',
                  marginTop: '4px'
                }}
              >
                Tutup Rincian
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // TAMPILAN 5: LIST KARYAWAN BAWAHAN DENGAN TOMBOL 'DETAIL'
  return (
    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }} className="animate-fade-in">
      {/* Header Utama */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={onBack}
            className="btn-back-action"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: 'var(--bg-slate)',
              border: '1px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-main)',
              cursor: 'pointer'
            }}
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', margin: 0, letterSpacing: '-0.3px' }}>
              Kehadiran Bawahan
            </h2>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
              Monitoring riwayat absensi staf tim Anda
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => loadDataBawahan(true)}
          disabled={isRefreshing}
          title="Segarkan Data"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            backgroundColor: 'var(--bg-slate)',
            border: '1px solid var(--border-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-main)',
            cursor: 'pointer'
          }}
        >
          <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Baris Pemilih Bulan & Input Pencarian */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Switch Bulan */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '8px 12px',
          border: '1.5px solid var(--border-light)'
        }}>
          <button
            type="button"
            onClick={handlePrevMonth}
            style={{
              padding: '6px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#f1f5f9',
              color: '#334155',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <ChevronLeft size={18} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={16} color="var(--primary-600)" />
            <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)' }}>
              {NAMA_BULAN[selectedBulan - 1]} {selectedTahun}
            </span>
          </div>

          <button
            type="button"
            onClick={handleNextMonth}
            style={{
              padding: '6px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#f1f5f9',
              color: '#334155',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Input Cari Karyawan */}
        <div style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center'
        }}>
          <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px' }} />
          <input
            type="text"
            placeholder="Cari nama, NIP, atau jabatan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px 10px 36px',
              borderRadius: '12px',
              border: '1.5px solid var(--border-light)',
              backgroundColor: '#ffffff',
              fontSize: '12px',
              color: 'var(--text-main)',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '10px',
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Ringkasan Jumlah Tim */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-main)' }}>
          Daftar Staf Bawahan ({filteredBawahan.length})
        </span>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          Periode: {NAMA_BULAN[selectedBulan - 1]} {selectedTahun}
        </span>
      </div>

      {/* List Kartu Karyawan */}
      {isLoading ? (
        <div style={{ padding: '40px 0', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <RefreshCw size={24} className="animate-spin" color="var(--primary-600)" />
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Memuat staf bawahan...</span>
        </div>
      ) : filteredBawahan.length === 0 ? (
        <div style={{
          padding: '30px 20px',
          textAlign: 'center',
          backgroundColor: '#f8fafc',
          borderRadius: '16px',
          border: '1.5px dashed #cbd5e1',
          color: '#64748b'
        }}>
          <Users size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
          <p style={{ fontSize: '13px', fontWeight: '700', margin: '0 0 4px', color: '#334155' }}>
            {searchQuery ? 'Karyawan Tidak Ditemukan' : 'Belum Ada Data Staf'}
          </p>
          <span style={{ fontSize: '11px' }}>
            {searchQuery ? 'Coba gunakan kata kunci pencarian yang lain.' : 'Tidak ada anggota staf bawahan yang terdaftar.'}
          </span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredBawahan.map((bawahan) => {
            const sum = bawahan.summary || {};
            return (
              <div
                key={bawahan.id}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '16px',
                  border: '1.5px solid var(--border-light)',
                  padding: '14px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  transition: 'transform 0.15s ease'
                }}
              >
                {/* Header Profil Karyawan */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {bawahan.foto ? (
                    <img
                      src={bawahan.foto}
                      alt={bawahan.nama}
                      style={{ width: '44px', height: '44px', borderRadius: '12px', objectFit: 'cover', border: '1.5px solid #cbd5e1' }}
                    />
                  ) : (
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '800',
                      fontSize: '14px'
                    }}>
                      {bawahan.inisial}
                    </div>
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)', margin: '0 0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {bawahan.nama}
                    </h3>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '0 0 4px' }}>
                      {bawahan.nip} • {bawahan.jabatan}
                    </p>
                    <span style={{ fontSize: '10px', color: '#0369a1', fontWeight: '700', backgroundColor: '#e0f2fe', padding: '2px 6px', borderRadius: '4px' }}>
                      {bawahan.departemen}
                    </span>
                  </div>
                </div>

                {/* Ringkasan Mini Kehadiran Bulan Ini */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(5, 1fr)',
                  gap: '6px',
                  backgroundColor: '#f8fafc',
                  padding: '8px',
                  borderRadius: '10px'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: '9px', color: '#16a34a', fontWeight: '700', display: 'block' }}>Hadir</span>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: '#15803d' }}>{sum.hadir || 0}</span>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: '9px', color: '#d97706', fontWeight: '700', display: 'block' }}>Telat</span>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: '#b45309' }}>{sum.terlambat || 0}</span>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: '9px', color: '#dc2626', fontWeight: '700', display: 'block' }}>Alpha</span>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: '#b91c1c' }}>{sum.tidak_hadir || 0}</span>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: '9px', color: '#0284c7', fontWeight: '700', display: 'block' }}>Izin</span>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: '#0369a1' }}>{sum.izin || 0}</span>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: '9px', color: '#ca8a04', fontWeight: '700', display: 'block' }}>Sakit</span>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: '#a16207' }}>{sum.sakit || 0}</span>
                  </div>
                </div>

                {/* Tombol Detail (Membuka Kalender Kehadiran Karyawan) */}
                <button
                  type="button"
                  onClick={() => handlePilihBawahan(bawahan)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: '800',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    boxShadow: '0 3px 10px rgba(2, 132, 199, 0.25)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Calendar size={15} />
                  <span>Detail Kalender Kehadiran</span>
                  <ChevronRight size={15} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
