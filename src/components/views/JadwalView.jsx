import React, { useState, useEffect } from 'react';
import { ChevronLeft, CalendarDays, Clock, CheckCircle2, AlertCircle, Building2, Calendar, Coffee, Sparkles, ArrowLeftRight, ChevronRight } from 'lucide-react';
import api, { getServerDate } from '../../services/api';
import TukarShiftModal from './TukarShiftModal';

// Nama bulan Indonesia untuk label navigasi bulan.
const NAMA_BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

export default function JadwalView({ onBack }) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isTukarShiftOpen, setIsTukarShiftOpen] = useState(false);
  const [pendingTukarCount, setPendingTukarCount] = useState(0);
  // Bulan yang ditampilkan ('YYYY-MM') — BUKAN lagi jendela 30 hari:
  // prev/next mengambil bulan yang dituju dari server (cache per bulan).
  const currentMonth = (() => {
    try {
      const d = new Date(getServerDate().getTime() + 7 * 3600 * 1000);
      return d.toISOString().slice(0, 7);
    } catch {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
  })();
  const [activeMonth, setActiveMonth] = useState(currentMonth);
  const monthCacheRef = React.useRef({});

  const fetchJadwal = async (ym, { force = false } = {}) => {
    const target = (typeof ym === 'string' && ym) ? ym : activeMonthRef.current;
    // Cache per bulan: kembali ke bulan yang sudah dimuat tanpa network
    // (kecuali force — tombol refresh / sesudah submit swap).
    if (!force && monthCacheRef.current[target]) {
      setData(monthCacheRef.current[target]);
      setLoadError('');
      return;
    }
    setIsLoading(true);
    setLoadError('');
    try {
      const [y, m] = target.split('-').map(Number);
      const days = new Date(y, m, 0).getDate();
      const res = await api.getJadwal({ start: `${target}-01`, days });
      if (res.success) {
        setLoadError('');
        setData(res);
        monthCacheRef.current[target] = res;
        // Badge jumlah permintaan swap: adapter mengembalikan `count`
        // (bukan `pending_count`); hitung tidak bergantung pada roster.
        api.getTukarShiftCount()
          .then(countRes => {
            if (countRes.success) {
              setPendingTukarCount(countRes.count ?? countRes.pending_count ?? 0);
            }
          })
          .catch(() => { });
      } else {
        // getJadwal mengembalikan success:false (bukan throw) bila
        // endpoint gagal — dulu jatuh ke kartu netral "tidak ada
        // jadwal" sehingga gagal muat disamarkan jadi data kosong.
        setLoadError(res.message || 'Gagal memuat jadwal kerja.');
      }
    } catch (err) {
      console.error('Gagal memuat jadwal kerja:', err);
      setLoadError(err.message || 'Gagal memuat jadwal kerja. Periksa koneksi Anda.');
    } finally {
      setIsLoading(false);
    }
  };

  const activeMonthRef = React.useRef(activeMonth);
  activeMonthRef.current = activeMonth;

  useEffect(() => {
    fetchJadwal(currentMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pindah bulan: set state + fetch bulan tujuan (cache bila sudah ada).
  const goToMonth = (ym) => {
    setActiveMonth(ym);
    activeMonthRef.current = ym;
    fetchJadwal(ym);
  };
  const shiftMonth = (delta) => {
    const [y, m] = activeMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    goToMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const shift = data?.shift_aktif;
  const isRoster = Boolean(data?.is_roster);
  const rosterList = data?.roster_bulan_ini || [];
  const daftarShift = data?.daftar_shift || [];
  const hariKerja = data?.hari_kerja || [];
  const hariLibur = data?.hari_libur || [];

  // C4: tanpa kalender → empty state, BUKAN 30 kartu Day Off.
  // Sinyal utama: flag server has_calendar=false (kontrak agen server).
  // Cadangan (server lama belum mengirim flag): daftar terisi penuh
  // TAPI semuanya libur = kalender tanpa jam kerja sama sekali
  // (server mengembalikan baris libur untuk tiap hari bila tak ada
  // kalender). Keduanya berarti "tidak ada jadwal yang bisa dipakai",
  // sehingga pesan "hubungi HRD" benar untuk keduanya.
  const noCalendar = data?.has_calendar === false
    || (rosterList.length > 0 && rosterList.every((r) => r.is_hari_libur));

  // Hari ini (WIB) — dihitung di view karena adapter selalu mengirim
  // is_today=false untuk daftar (mapShift(s, false)). Rumus ini
  // mencerminkan perhitungan todayWib di getJadwal (server date + 7 jam).
  const todayStr = (() => {
    try {
      const d = new Date(getServerDate().getTime() + 7 * 3600 * 1000);
      return d.toISOString().slice(0, 10);
    } catch {
      const d = new Date();
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
  })();

  // Roster yang tampil = roster bulan aktif (sudah di-fetch per bulan,
  // bukan filter jendela 30 hari).
  const shownMonth = activeMonth;
  const visibleRoster = rosterList;
  const monthLabel = (ym) => {
    if (!ym) return '';
    const [y, m] = ym.split('-');
    return `${NAMA_BULAN[Number(m) - 1] || ''} ${y}`;
  };

  // Pola mingguan: utamakan hari_kerja server bila adapter sudah
  // meneruskannya (kontrak agen app-1); sonst diturunkan dari daftar
  // 30 hari — hari = Kerja bila ADA SATU baris kerja pada hari itu.
  // (Hari_kerja server mentah memakai weekday Python Sen=0; konversi
  // ke getDay() JS Min=0 ada di bawah.)
  const workWeekdays = (() => {
    const set = new Set();
    if (hariKerja.length > 0) {
      for (const h of hariKerja) {
        if (typeof h === 'number' && h >= 0 && h <= 6) {
          set.add((h + 1) % 7);
        } else if (typeof h === 'string') {
          const idx = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu']
            .indexOf(h.toLowerCase());
          if (idx >= 0) set.add(idx);
        }
      }
      return set;
    }
    for (const r of rosterList) {
      if (!r.is_hari_libur && r.tanggal) {
        set.add(new Date(`${r.tanggal}T00:00:00`).getDay());
      }
    }
    return set;
  })();

  // Gagal muat yang disamarkan: adapter selalu success:true, tapi
  // jendela kosong + shift null praktis hanya terjadi bila endpoint
  // gagal (server sehat selalu mengembalikan baris — 30 baris libur
  // untuk tanpa-kalender). Syarat has_calendar=false dicek dulu di
  // atas (noCalendar), jadi kasus server-baru "[] + flag" tidak
  // jatuh ke sini. Butuh hariKerja kosong juga: bila pola mingguan
  // nyata tersedia, tampilkan itu, bukan error.
  const maskedFailure = !isLoading && !loadError && !noCalendar
    && rosterList.length === 0 && !shift && hariKerja.length === 0;
  const errorText = loadError || 'Server tidak mengembalikan jadwal.';
  const errorPanel = (
    <div style={{
      backgroundColor: '#ffffff',
      borderRadius: 'var(--radius-md)',
      border: '1px solid #fecaca',
      padding: '24px 18px',
      textAlign: 'center'
    }}>
      <AlertCircle size={28} style={{ margin: '0 auto 8px auto', color: '#dc2626' }} />
      <p style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: 'var(--text-main)' }}>
        Gagal memuat jadwal kerja
      </p>
      <p style={{ margin: '6px 0 14px 0', fontSize: '12px', color: 'var(--text-muted)' }}>
        {errorText}
      </p>
      <button
        type="button"
        onClick={() => fetchJadwal(undefined, { force: true })}
        style={{
          padding: '9px 20px',
          borderRadius: '10px',
          backgroundColor: 'var(--primary-600)',
          color: '#ffffff',
          border: 'none',
          fontSize: '12px',
          fontWeight: '800',
          cursor: 'pointer'
        }}
      >
        Coba Lagi
      </button>
    </div>
  );
  const noCalendarPanel = (
    <div style={{
      backgroundColor: '#ffffff',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--border-light)',
      padding: '24px 18px',
      textAlign: 'center'
    }}>
      <CalendarDays size={28} style={{ margin: '0 auto 8px auto', color: 'var(--text-muted)', opacity: 0.5 }} />
      <p style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: 'var(--text-main)' }}>
        Belum ada jadwal — hubungi HRD
      </p>
      <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
        Anda belum memiliki kalender kerja, sehingga tidak ada jadwal
        yang bisa ditampilkan. Hubungi HRD untuk pengaturan kalender
        kerja Anda.
      </p>
    </div>
  );

  return (
    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }} className="animate-fade-in">
      {loadError && !isLoading && (
        <div style={{ padding: '12px 14px', borderRadius: '12px', backgroundColor: '#fef2f2', border: '1px solid #fecdd3', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#be123c' }}>{loadError}</span>
          <button
            type="button"
            onClick={() => fetchJadwal(undefined, { force: true })}
            style={{ padding: '6px 12px', borderRadius: '8px', backgroundColor: '#e11d48', border: 'none', color: '#ffffff', fontSize: '11px', fontWeight: '700', cursor: 'pointer', flexShrink: 0 }}
          >
            Coba Lagi
          </button>
        </div>
      )}
      {/* Header */}
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
            Jadwal Jam Kerja
          </h2>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
            Jadwal 30 hari ke depan
          </p>
        </div>
      </div>

      {isLoading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
          Memuat jadwal kerja Anda...
        </div>
      ) : loadError || maskedFailure ? (
        errorPanel
      ) : noCalendar ? (
        noCalendarPanel
      ) : (
        <>
          {/* Card Shift Aktif Hari Ini */}
          {shift?.is_hari_libur ? (
            /* Card Jika Hari Libur / Day Off */
            <div style={{
              background: 'linear-gradient(135deg, #991b1b 0%, #7f1d1d 100%)',
              borderRadius: 'var(--radius-md)',
              padding: '18px',
              color: '#ffffff',
              boxShadow: '0 4px 14px rgba(153, 27, 27, 0.25)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '10px', fontWeight: '800', color: '#fecaca', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Coffee size={13} />
                  <span>Jadwal Hari Ini</span>
                </span>
                <span style={{ fontSize: '11px', fontWeight: '800', color: '#fee2e2', backgroundColor: 'rgba(255, 255, 255, 0.2)', padding: '2px 8px', borderRadius: '999px' }}>
                  🛑 Libur (Day Off)
                </span>
              </div>

              <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#ffffff', margin: '0 0 6px 0' }}>
                Hari Libur (Day Off)
              </h3>
              <p style={{ fontSize: '12px', color: '#fecaca', margin: '0 0 12px 0', lineHeight: '1.4' }}>
                {shift?.keterangan || 'Anda dijadwalkan libur hari ini.'}
              </p>
              <div style={{ paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.2)', fontSize: '11px', color: '#fee2e2', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={14} />
                <span>Selamat beristirahat dan menyegarkan stamina Anda!</span>
              </div>
            </div>
          ) : shift ? (
            /* Card Shift Kerja Aktif */
            <div style={{
              background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
              borderRadius: 'var(--radius-md)',
              padding: '18px',
              color: '#ffffff',
              boxShadow: '0 4px 14px rgba(234, 88, 12, 0.25)',
              position: 'relative'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '10px', fontWeight: '800', color: '#fed7aa', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Shift Kerja Anda Hari Ini
                </span>
                <span style={{ fontSize: '11px', fontWeight: '800', color: '#ffffff', backgroundColor: 'rgba(255, 255, 255, 0.25)', padding: '2px 8px', borderRadius: '999px' }}>
                  Aktif
                </span>
              </div>

              <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#ffffff', margin: '0 0 14px 0' }}>
                {shift?.nama || 'Shift Reguler'}
              </h3>

              {/* Format Waktu Grid — nilai dari server; '-' bila tidak
                  dikirim (dulu undefined tampil kosong, dan toleransi
                  tampil "0 Menit" palsu karena `|| 0`). Server saat ini
                  hanya mengirim jam_masuk/jam_pulang (alias Awal/Batas
                  = jam yang sama); toleransi & pembatasan belum ada di
                  baris _schedule_days (kontrak agen server + app-1). */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div style={{ padding: '10px', backgroundColor: 'rgba(255, 255, 255, 0.12)', borderRadius: '8px' }}>
                  <span style={{ fontSize: '10px', color: '#ffedd5', display: 'block' }}>Awal Masuk</span>
                  <span style={{ fontSize: '18px', fontWeight: '800', fontFamily: 'var(--font-mono)' }}>
                    {shift?.jam_awal_masuk ?? '-'}
                  </span>
                  <span style={{ fontSize: '9px', color: '#fed7aa', display: 'block' }}>Buka Absen</span>
                </div>

                <div style={{ padding: '10px', backgroundColor: 'rgba(255, 255, 255, 0.12)', borderRadius: '8px', borderLeft: '3px solid #fecaca' }}>
                  <span style={{ fontSize: '10px', color: '#ffedd5', display: 'block' }}>Jam Masuk Resmi</span>
                  <span style={{ fontSize: '18px', fontWeight: '800', fontFamily: 'var(--font-mono)', color: '#ffffff' }}>
                    {shift?.jam_masuk ?? '-'}
                  </span>
                  <span style={{ fontSize: '9px', color: '#fed7aa', display: 'block' }}>Acuan Denda</span>
                </div>

                <div style={{ padding: '10px', backgroundColor: 'rgba(255, 255, 255, 0.12)', borderRadius: '8px', borderLeft: '3px solid #fca5a5' }}>
                  <span style={{ fontSize: '10px', color: '#ffedd5', display: 'block' }}>Batas Akhir Masuk</span>
                  <span style={{ fontSize: '18px', fontWeight: '800', fontFamily: 'var(--font-mono)', color: '#ffffff' }}>
                    {shift?.jam_akhir_masuk ?? '-'}
                  </span>
                  <span style={{ fontSize: '9px', color: '#fed7aa', display: 'block' }}>Batas Tutup Masuk</span>
                </div>

                <div style={{ padding: '10px', backgroundColor: 'rgba(255, 255, 255, 0.12)', borderRadius: '8px' }}>
                  <span style={{ fontSize: '10px', color: '#ffedd5', display: 'block' }}>Jam Pulang Resmi</span>
                  <span style={{ fontSize: '18px', fontWeight: '800', fontFamily: 'var(--font-mono)' }}>
                    {shift?.jam_pulang ?? '-'}
                  </span>
                  <span style={{ fontSize: '9px', color: '#fed7aa', display: 'block' }}>Acuan Cepat</span>
                </div>
              </div>

              <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.2)', fontSize: '11px', color: '#fed7aa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Toleransi Keterlambatan: <strong>{(() => {
                  const t = shift?.toleransi_menit ?? shift?._raw?.toleransi_menit;
                  return t == null ? '-' : `${t} Menit`;
                })()}</strong></span>
                {shift?.batasi_absen && (
                  <span style={{ backgroundColor: '#ef4444', color: '#ffffff', fontSize: '9px', fontWeight: '800', padding: '1px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>
                    Pembatasan Aktif
                  </span>
                )}
              </div>
            </div>
          ) : (
            /* Kartu netral: server tidak mengirim jadwal hari ini
               (bukan kartu Shift Kerja dengan jam undefined). */
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-light)',
              padding: '18px',
              boxShadow: '0 1px 4px rgba(0, 0, 0, 0.02)'
            }}>
              <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-main)', margin: '0 0 6px 0' }}>
                Tidak ada jadwal kerja hari ini
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, lineHeight: '1.5' }}>
                Server tidak mengirim jadwal untuk hari ini. Bila Anda seharusnya bekerja hari ini, hubungi HRD untuk memeriksa kalender kerja Anda.
              </p>
            </div>
          )}

          {/* Daftar Jadwal 30 Hari ke Depan (dulu dilabeli "roster" —
              tidak ada model roster di server; ini kalender mingguan
              berulang yang dirender 30 hari ke depan). */}
          {isRoster && (
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-light)',
              padding: '16px',
              boxShadow: '0 1px 4px rgba(0, 0, 0, 0.02)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
                    Kalender Jadwal Anda
                  </h4>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                    Jadwal 30 hari ke depan
                  </p>
                </div>
                <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--primary-700)', backgroundColor: 'var(--primary-50)', padding: '3px 8px', borderRadius: '6px' }}>
                  {rosterList.filter((i) => !i.is_hari_libur).length} Hari Kerja Terjadwal
                </span>
              </div>

              {/* Tombol Ajukan Tukar Shift */}
              <div style={{ marginBottom: '14px' }}>
                <button
                  type="button"
                  onClick={() => setIsTukarShiftOpen(true)}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                    color: '#ffffff',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 3px 10px rgba(2, 132, 199, 0.22)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <ArrowLeftRight size={16} />
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <span style={{ fontSize: '12px', fontWeight: '800', display: 'block', lineHeight: 1.2 }}>
                        Ajukan Tukar Shift
                      </span>
                      <span style={{ fontSize: '10px', color: '#e0f2fe', display: 'block' }}>
                        Tukar jadwal dengan rekan kerja
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {pendingTukarCount > 0 && (
                      <span style={{
                        backgroundColor: '#ef4444',
                        color: '#ffffff',
                        fontSize: '10px',
                        fontWeight: '900',
                        padding: '2px 8px',
                        borderRadius: '999px',
                        boxShadow: '0 2px 5px rgba(239, 68, 68, 0.4)'
                      }}>
                        {pendingTukarCount} Permintaan
                      </span>
                    )}
                    <ChevronRight size={16} style={{ opacity: 0.8 }} />
                  </div>
                </button>
              </div>

              {/* Navigasi bulan: prev/next mengambil bulan yang dituju
                  dari server (cache per bulan) — bukan filter jendela. */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <button
                  type="button"
                  onClick={() => shiftMonth(-1)}
                  disabled={isLoading}
                  style={{
                    width: '30px', height: '30px', borderRadius: '8px',
                    backgroundColor: 'var(--bg-slate)', border: '1px solid var(--border-light)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--text-main)', cursor: isLoading ? 'not-allowed' : 'pointer',
                    opacity: isLoading ? 0.4 : 1
                  }}
                >
                  <ChevronLeft size={16} />
                </button>
                <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-main)' }}>
                  {monthLabel(shownMonth)} ({visibleRoster.length} hari)
                </span>
                <button
                  type="button"
                  onClick={() => shiftMonth(1)}
                  disabled={isLoading}
                  style={{
                    width: '30px', height: '30px', borderRadius: '8px',
                    backgroundColor: 'var(--bg-slate)', border: '1px solid var(--border-light)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--text-main)',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    opacity: isLoading ? 0.4 : 1
                  }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {rosterList.length === 0 ? (
                <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', backgroundColor: 'var(--bg-slate)', borderRadius: '8px' }}>
                  <CalendarDays size={24} style={{ margin: '0 auto 8px auto', opacity: 0.4 }} />
                  <p style={{ margin: 0, fontWeight: '600' }}>Belum ada jadwal untuk periode ini.</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '11px' }}>Coba lagi nanti atau hubungi HRD.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '340px', overflowY: 'auto' }}>
                  {visibleRoster.map((item) => {
                    // Highlight "Hari Ini" dihitung di view dari tanggal
                    // (adapter selalu mengirim is_today=false).
                    const isToday = item.tanggal === todayStr;
                    return (
                    <div
                      key={item.tanggal}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: isToday ? '2px solid var(--primary-500)' : '1px solid var(--border-light)',
                        backgroundColor: isToday ? 'var(--primary-50)' : (item.is_hari_libur ? '#fff1f2' : '#ffffff'),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          backgroundColor: isToday ? 'var(--primary-600)' : (item.is_hari_libur ? '#fecdd3' : '#f1f5f9'),
                          color: isToday ? '#ffffff' : (item.is_hari_libur ? '#be123c' : '#334155'),
                          fontWeight: '800',
                          fontSize: '13px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontFamily: 'var(--font-mono)'
                        }}>
                          {item.tanggal.slice(-2)}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-main)' }}>
                              {item.hari}, {item.tanggal_formatted}
                            </span>
                            {isToday && (
                              <span style={{ fontSize: '9px', fontWeight: '800', color: '#ffffff', backgroundColor: 'var(--primary-600)', padding: '1px 6px', borderRadius: '4px' }}>
                                Hari Ini
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: '11px', color: item.is_hari_libur ? '#e11d48' : 'var(--text-muted)', fontWeight: item.is_hari_libur ? '700' : '500' }}>
                            {item.nama_shift}
                          </span>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        {item.is_hari_libur ? (
                          <span style={{ fontSize: '10px', fontWeight: '800', color: '#be123c', backgroundColor: '#ffe4e6', padding: '2px 8px', borderRadius: '6px' }}>
                            OFF (Libur)
                          </span>
                        ) : (
                          <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--primary-700)', fontFamily: 'var(--font-mono)' }}>
                            {item.jam_masuk} - {item.jam_pulang}
                          </span>
                        )}
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Pola Hari Kerja Mingguan — HANYA bila ada data nyata
              (hari_kerja server yang diteruskan adapter). Dulu grid ini
              selalu tampil dengan hardcode Senin–Jumat walau karyawan
              berpola lain, dan tampil pula saat jadwal gagal dimuat
              (seksi ini dulu dirender untuk !isRoster, yang praktis
              hanya terjadi saat endpoint gagal). Bila tidak ada data,
              seksi disembunyikan (kasus gagal muat ditangani panel
              error di atas, kasus tanpa-kalender oleh panel HRD). */}
          {!isRoster && hariKerja.length > 0 && (
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-light)',
              padding: '16px',
              boxShadow: '0 1px 4px rgba(0, 0, 0, 0.02)'
            }}>
              <h4 style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '10px' }}>
                Pola Hari Kerja Mingguan
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center' }}>
                {/* Urutan tampil Senin-dulu (konvensi Indonesia); indeks
                    getDay() JS = (idx tampil + 1) % 7. */}
                {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((day, idx) => {
                  const isWorkDay = workWeekdays.has((idx + 1) % 7);
                  return (
                    <div
                      key={day}
                      style={{
                        padding: '8px 2px',
                        borderRadius: '8px',
                        backgroundColor: isWorkDay ? 'var(--primary-50)' : 'var(--bg-slate)',
                        border: isWorkDay ? '1px solid var(--primary-200)' : '1px solid var(--border-light)'
                      }}
                    >
                      <span style={{ fontSize: '11px', fontWeight: '800', color: isWorkDay ? 'var(--primary-700)' : 'var(--text-muted)', display: 'block' }}>
                        {day}
                      </span>
                      <span style={{ fontSize: '9px', color: isWorkDay ? 'var(--primary-600)' : 'var(--text-light)' }}>
                        {isWorkDay ? 'Kerja' : 'Libur'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Libur Mingguan Terdekat — dulu salah label "Hari Libur
              Nasional": baris ini adalah akhir pekan biasa dari daftar
              30 hari (server tidak punya konsep hari libur nasional).
              Tanggal memakai tanggal_formatted, bukan ISO mentah. */}
          {hariLibur.length > 0 && (
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-light)',
              padding: '16px',
              boxShadow: '0 1px 4px rgba(0, 0, 0, 0.02)'
            }}>
              <h4 style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '10px' }}>
                Libur Mingguan Terdekat
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {hariLibur.map((hl) => (
                  <div key={hl.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', backgroundColor: 'var(--bg-slate)', borderRadius: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-main)' }}>{hl.nama}</span>
                    <span style={{ fontSize: '11px', color: '#dc2626', fontWeight: '700' }}>{hl.tanggal_formatted || hl.tanggal}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal Tukar Shift */}
      <TukarShiftModal
        isOpen={isTukarShiftOpen}
        onClose={() => setIsTukarShiftOpen(false)}
        onSuccess={() => {
          fetchJadwal(undefined, { force: true });
        }}
      />
    </div>
  );
}
