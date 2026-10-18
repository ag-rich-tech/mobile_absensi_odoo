import React, { useState, useEffect } from 'react';
import {
  ChevronLeft, Calendar, Clock, MapPin, CheckCircle2, AlertTriangle,
  Camera, Filter, ChevronRight, X, Info, RefreshCw, CalendarDays
} from 'lucide-react';
import api from '../../services/api';

const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export default function RiwayatView({ onBack }) {
  const currentDate = new Date();
  const [selectedBulan, setSelectedBulan] = useState(currentDate.getMonth() + 1);
  const [selectedTahun, setSelectedTahun] = useState(currentDate.getFullYear());
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'tepat' | 'terlambat' | 'cepat'
  const [riwayatList, setRiwayatList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDetail, setSelectedDetail] = useState(null); // Modal detail item

  const loadRiwayat = async () => {
    setIsLoading(true);
    try {
      const res = await api.getRiwayat(selectedBulan, selectedTahun);
      if (res.success && res.riwayat) {
        setRiwayatList(res.riwayat);
      } else {
        setRiwayatList([]);
      }
    } catch (err) {
      console.error('Gagal memuat riwayat:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRiwayat();
  }, [selectedBulan, selectedTahun]);

  // Statistik bulan ini
  const totalHadir = riwayatList.length;
  const totalTepat = riwayatList.filter((r) => r.status_masuk === 'tepat_waktu').length;
  const totalTerlambat = riwayatList.filter((r) => r.status_masuk === 'terlambat').length;
  const totalPulangCepat = riwayatList.filter((r) => r.status_pulang === 'pulang_cepat').length;

  // Filter list
  const filteredList = riwayatList.filter((item) => {
    if (activeFilter === 'tepat') return item.status_masuk === 'tepat_waktu';
    if (activeFilter === 'terlambat') return item.status_masuk === 'terlambat';
    if (activeFilter === 'cepat') return item.status_pulang === 'pulang_cepat';
    return true;
  });

  return (
    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }} className="animate-fade-in">
      {/* Header */}
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
            <h2 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.3px', margin: 0 }}>
              Riwayat Presensi
            </h2>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
              Rekap kehadiran & kepatuhan lokasi
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadRiwayat}
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
            color: 'var(--primary-600)',
            cursor: 'pointer'
          }}
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Filter Periode Bulan & Tahun */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.4fr 1fr',
        gap: '8px',
        padding: '10px 12px',
        backgroundColor: '#ffffff',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-light)',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)'
      }}>
        <div>
          <label style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '3px' }}>
            Pilih Bulan
          </label>
          <select
            value={selectedBulan}
            onChange={(e) => setSelectedBulan(Number(e.target.value))}
            style={{
              width: '100%',
              padding: '6px 8px',
              borderRadius: '6px',
              border: '1px solid var(--border-light)',
              fontSize: '12px',
              fontWeight: '700',
              color: 'var(--text-main)',
              backgroundColor: 'var(--bg-slate)',
              outline: 'none'
            }}
          >
            {NAMA_BULAN.map((bulan, idx) => (
              <option key={idx + 1} value={idx + 1}>
                {bulan}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '3px' }}>
            Tahun
          </label>
          <select
            value={selectedTahun}
            onChange={(e) => setSelectedTahun(Number(e.target.value))}
            style={{
              width: '100%',
              padding: '6px 8px',
              borderRadius: '6px',
              border: '1px solid var(--border-light)',
              fontSize: '12px',
              fontWeight: '700',
              color: 'var(--text-main)',
              backgroundColor: 'var(--bg-slate)',
              outline: 'none'
            }}
          >
            {[2024, 2025, 2026, 2027].map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Card Ringkasan Statistik Bulan Ini */}
      <div style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        borderRadius: 'var(--radius-md)',
        padding: '16px',
        color: '#ffffff',
        boxShadow: '0 4px 14px rgba(15, 23, 42, 0.15)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Rekap {NAMA_BULAN[selectedBulan - 1]} {selectedTahun}
          </span>
          <span style={{ fontSize: '11px', fontWeight: '800', color: '#38bdf8' }}>
            Total {totalHadir} Hari Hadir
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', textAlign: 'center' }}>
          <div style={{ padding: '8px 4px', backgroundColor: 'rgba(255, 255, 255, 0.06)', borderRadius: '8px' }}>
            <span style={{ fontSize: '10px', color: '#86efac', display: 'block' }}>Tepat Waktu</span>
            <span style={{ fontSize: '18px', fontWeight: '900', color: '#4ade80' }}>{totalTepat}</span>
          </div>
          <div style={{ padding: '8px 4px', backgroundColor: 'rgba(255, 255, 255, 0.06)', borderRadius: '8px' }}>
            <span style={{ fontSize: '10px', color: '#fca5a5', display: 'block' }}>Terlambat</span>
            <span style={{ fontSize: '18px', fontWeight: '900', color: '#f87171' }}>{totalTerlambat}</span>
          </div>
          <div style={{ padding: '8px 4px', backgroundColor: 'rgba(255, 255, 255, 0.06)', borderRadius: '8px' }}>
            <span style={{ fontSize: '10px', color: '#93c5fd', display: 'block' }}>Pulang Cepat</span>
            <span style={{ fontSize: '18px', fontWeight: '900', color: '#60a5fa' }}>{totalPulangCepat}</span>
          </div>
        </div>
      </div>

      {/* Pill Filter Cepat */}
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
        {[
          { id: 'all', label: `Semua (${totalHadir})` },
          { id: 'tepat', label: `Tepat Waktu (${totalTepat})` },
          { id: 'terlambat', label: `Terlambat (${totalTerlambat})` },
          { id: 'cepat', label: `Pulang Cepat (${totalPulangCepat})` },
        ].map((btn) => (
          <button
            key={btn.id}
            type="button"
            onClick={() => setActiveFilter(btn.id)}
            style={{
              padding: '6px 12px',
              borderRadius: '999px',
              fontSize: '11px',
              fontWeight: '700',
              border: activeFilter === btn.id ? '1px solid var(--primary-600)' : '1px solid var(--border-light)',
              backgroundColor: activeFilter === btn.id ? 'var(--primary-50)' : '#ffffff',
              color: activeFilter === btn.id ? 'var(--primary-700)' : 'var(--text-muted)',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Daftar Kartu Riwayat Presensi */}
      <div>
        {isLoading ? (
          <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
            Memuat data riwayat dari database...
          </div>
        ) : filteredList.length === 0 ? (
          <div style={{
            padding: '28px 16px',
            textAlign: 'center',
            backgroundColor: 'var(--bg-slate)',
            borderRadius: 'var(--radius-md)',
            border: '1px dashed var(--border-light)'
          }}>
            <Calendar size={28} style={{ color: 'var(--text-light)', margin: '0 auto 8px auto' }} />
            <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-main)', margin: '0 0 4px 0' }}>
              Tidak Ada Rekaman Presensi
            </p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
              Tidak ditemukan data absensi untuk filter dan periode {NAMA_BULAN[selectedBulan - 1]} {selectedTahun}.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredList.map((item) => {
              const isTerlambat = item.status_masuk === 'terlambat';
              const isPulangCepat = item.status_pulang === 'pulang_cepat';

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedDetail(item)}
                  style={{
                    padding: '14px',
                    backgroundColor: '#ffffff',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-light)',
                    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    cursor: 'pointer',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                  }}
                >
                  {/* Baris Atas: Hari/Tanggal & Badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)' }}>
                      {item.hari_tanggal || item.tanggal}
                    </span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {isTerlambat ? (
                        <span style={{
                          fontSize: '10px',
                          fontWeight: '700',
                          color: 'var(--danger)',
                          backgroundColor: 'var(--danger-bg)',
                          padding: '2px 8px',
                          borderRadius: '999px'
                        }}>
                          Terlambat {item.menit_terlambat}m
                        </span>
                      ) : (
                        <span style={{
                          fontSize: '10px',
                          fontWeight: '700',
                          color: 'var(--success)',
                          backgroundColor: 'var(--success-bg)',
                          padding: '2px 8px',
                          borderRadius: '999px'
                        }}>
                          Tepat Waktu
                        </span>
                      )}

                      {isPulangCepat && (
                        <span style={{
                          fontSize: '10px',
                          fontWeight: '700',
                          color: '#2563eb',
                          backgroundColor: '#eff6ff',
                          padding: '2px 8px',
                          borderRadius: '999px'
                        }}>
                          Cepat {item.menit_pulang_cepat}m
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Baris Waktu Masuk & Pulang */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                    backgroundColor: 'var(--bg-slate)',
                    padding: '10px',
                    borderRadius: '8px'
                  }}>
                    <div>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>Jam Masuk</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <span style={{ fontSize: '14px', fontWeight: '800', fontFamily: 'var(--font-mono)', color: isTerlambat ? 'var(--danger)' : 'var(--text-main)' }}>
                          {item.jam_masuk || '--:--'}
                        </span>
                        {item.jarak_masuk_meter !== null && (
                          <span style={{ fontSize: '9px', color: 'var(--text-light)' }}>
                            ({item.jarak_masuk_meter}m)
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>Jam Pulang</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <span style={{ fontSize: '14px', fontWeight: '800', fontFamily: 'var(--font-mono)', color: isPulangCepat ? '#2563eb' : 'var(--text-main)' }}>
                          {item.jam_pulang || '--:--'}
                        </span>
                        {item.jarak_pulang_meter !== null && (
                          <span style={{ fontSize: '9px', color: 'var(--text-light)' }}>
                            ({item.jarak_pulang_meter}m)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Keterangan Denda jika ada */}
                  {item.aturan_denda_masuk && (
                    <div style={{
                      fontSize: '10px',
                      color: 'var(--danger)',
                      backgroundColor: 'var(--danger-bg)',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <AlertTriangle size={12} />
                      <span>{item.aturan_denda_masuk}</span>
                    </div>
                  )}

                  {/* Footer Card */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    <span>Shift: <strong>{item.jam_kerja || 'Reguler'}</strong></span>
                    <span style={{ color: 'var(--primary-600)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '2px' }}>
                      Detail Presensi <ChevronRight size={12} />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Detail Presensi Harian */}
      {selectedDetail && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 100
        }} className="animate-fade-in">
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: 'var(--radius-lg)',
            width: '100%',
            maxWidth: '360px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '20px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
                  Detail Presensi
                </h3>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {selectedDetail.hari_tanggal || selectedDetail.tanggal}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDetail(null)}
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
                <X size={18} />
              </button>
            </div>

            {/* Foto Presensi Masuk & Pulang */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {/* Foto Masuk */}
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Foto Masuk
                </span>
                <div style={{
                  width: '100%',
                  height: '110px',
                  borderRadius: '10px',
                  backgroundColor: '#0f172a',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid var(--border-light)'
                }}>
                  {selectedDetail.foto_masuk ? (
                    <img
                      src={selectedDetail.foto_masuk}
                      alt="Selfie Masuk"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <Camera size={24} style={{ color: '#64748b' }} />
                  )}
                </div>
                <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-main)', marginTop: '4px', display: 'block' }}>
                  {selectedDetail.jam_masuk || '-'}
                </span>
              </div>

              {/* Foto Pulang */}
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Foto Pulang
                </span>
                <div style={{
                  width: '100%',
                  height: '110px',
                  borderRadius: '10px',
                  backgroundColor: '#0f172a',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid var(--border-light)'
                }}>
                  {selectedDetail.foto_pulang ? (
                    <img
                      src={selectedDetail.foto_pulang}
                      alt="Selfie Pulang"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <Camera size={24} style={{ color: '#64748b' }} />
                  )}
                </div>
                <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-main)', marginTop: '4px', display: 'block' }}>
                  {selectedDetail.jam_pulang || '-'}
                </span>
              </div>
            </div>

            {/* Informasi Rinci */}
            <div style={{
              backgroundColor: 'var(--bg-slate)',
              borderRadius: '8px',
              padding: '10px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              fontSize: '11px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Status Masuk:</span>
                <strong style={{ color: selectedDetail.status_masuk === 'terlambat' ? 'var(--danger)' : 'var(--success)' }}>
                  {selectedDetail.status_masuk === 'terlambat' ? `Terlambat (${selectedDetail.menit_terlambat}m)` : 'Tepat Waktu'}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Status Pulang:</span>
                <strong style={{ color: selectedDetail.status_pulang === 'pulang_cepat' ? '#2563eb' : 'var(--text-main)' }}>
                  {selectedDetail.status_pulang === 'pulang_cepat' ? `Pulang Cepat (${selectedDetail.menit_pulang_cepat}m)` : 'Normal'}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Jarak GPS Masuk:</span>
                <strong style={{ color: 'var(--text-main)' }}>{selectedDetail.jarak_masuk_meter || 0} meter dari kantor</strong>
              </div>
              {selectedDetail.aturan_denda_masuk && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--danger)' }}>
                  <span>Denda Terlambat:</span>
                  <strong>{selectedDetail.aturan_denda_masuk}</strong>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSelectedDetail(null)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                background: 'var(--primary-gradient)',
                border: 'none',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer'
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
