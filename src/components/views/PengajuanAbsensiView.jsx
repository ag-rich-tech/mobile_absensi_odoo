import React, { useState, useEffect } from 'react';
import { ChevronLeft, Plus, CalendarClock, Clock, CheckCircle2, XCircle, Send } from 'lucide-react';
import api, { getStoredUser, fmtTanggalId } from '../../services/api';
import { loadDraft, saveDraft, clearDraft, DRAFT_KEYS } from '../../services/draftService';

// Kode fitur untuk kartu "Pengajuan Absensi" di Dashboard.
// Kartu ini digerbang isOn(FEATURE_CODE) di DashboardPage mengikuti
// pola kartu lain (sistem Fitur Mobile), dan subview-nya dipetakan di
// NAV_FEATURE_MAP (mobileFeatures.js) sehingga penjaga navigasi ikut
// mengalihkan ke Beranda bila fitur dimatikan. Nilai konstanta ini
// adalah kode fitur server-nya (model hrms.mobile.feature, kode
// `attendance_request`).
export const FEATURE_CODE = 'attendance_request';

// Tanggal lokal perangkat sebagai 'YYYY-MM-DD' (bukan UTC —
// toISOString() di pagi WIB masih tanggal kemarin).
function localYMD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

// Validasi client untuk form pengajuan (kontrak fitur):
// - tanggal wajib & tidak di masa depan,
// - minimal satu jam terisi (masuk dan/atau pulang),
// - pulang > masuk bila keduanya terisi,
// - alasan wajib (payload submit mengirim reason tanpa nullable).
// Mengembalikan pesan error, atau '' bila valid. Sengaja TIDAK diekspor:
// ekspor fungsi non-komponen dari file view memicu warning oxlint
// react(only-export-components); validasi hanya dipakai di file ini.
function validatePengajuanAbsensi({ requestDate, checkIn, checkOut, reason }) {
  if (!requestDate) return 'Pilih tanggal pengajuan.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(requestDate)) return 'Format tanggal tidak valid.';
  if (requestDate > localYMD(new Date())) return 'Tanggal pengajuan tidak boleh di masa depan.';
  if (!checkIn && !checkOut) return 'Isi minimal satu jam: jam masuk atau jam pulang.';
  if (checkIn && !HHMM_RE.test(checkIn)) return 'Format jam masuk tidak valid (HH:MM).';
  if (checkOut && !HHMM_RE.test(checkOut)) return 'Format jam pulang tidak valid (HH:MM).';
  if (checkIn && checkOut && checkOut <= checkIn) return 'Jam pulang harus lebih besar dari jam masuk.';
  if (!String(reason || '').trim()) return 'Isi alasan pengajuan.';
  return '';
}

function fmtTanggalStr(ymd) {
  if (!ymd) return '-';
  const d = new Date(`${String(ymd).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return String(ymd).slice(0, 10);
  return fmtTanggalId(d);
}

function getStatusPill(status) {
  switch (status) {
    case 'disetujui':
      return (
        <span style={{ fontSize: '10px', fontWeight: '700', color: '#16a34a', backgroundColor: '#dcfce7', padding: '3px 8px', borderRadius: '999px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <CheckCircle2 size={12} /> Disetujui
        </span>
      );
    case 'ditolak':
      return (
        <span style={{ fontSize: '10px', fontWeight: '700', color: '#dc2626', backgroundColor: '#fee2e2', padding: '3px 8px', borderRadius: '999px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <XCircle size={12} /> Ditolak
        </span>
      );
    case 'dibatalkan':
      return (
        <span style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', backgroundColor: '#f1f5f9', padding: '3px 8px', borderRadius: '999px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <XCircle size={12} /> Dibatalkan
        </span>
      );
    default:
      return (
        <span style={{ fontSize: '10px', fontWeight: '700', color: '#d97706', backgroundColor: '#fef3c7', padding: '3px 8px', borderRadius: '999px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Clock size={12} /> Menunggu
        </span>
      );
  }
}

export default function PengajuanAbsensiView({ onBack }) {
  const draftKey = getStoredUser()?.id ? DRAFT_KEYS.pengajuan_absensi(getStoredUser().id) : null;
  const draft0 = draftKey ? loadDraft(draftKey, {}) : {};
  const today = localYMD(new Date());

  const [list, setList] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [showForm, setShowForm] = useState(false);

  // Form state. Jam bersifat opsional: toggle mati = null saat kirim
  // (karyawan bisa lupa masuk saja, pulang saja, atau keduanya).
  const [requestDate, setRequestDate] = useState(draft0.requestDate || today);
  const [hasCheckIn, setHasCheckIn] = useState(draft0.hasCheckIn !== false);
  const [checkIn, setCheckIn] = useState(draft0.checkIn || '08:00');
  const [hasCheckOut, setHasCheckOut] = useState(draft0.hasCheckOut === true);
  const [checkOut, setCheckOut] = useState(draft0.checkOut || '17:00');
  const [reason, setReason] = useState(draft0.reason || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState({ type: '', text: '' });
  const [cancelMessage, setCancelMessage] = useState({ type: '', text: '' });
  const [cancellingId, setCancellingId] = useState(null);

  // Detail singkat per item (panel expand di bawah kartu; data segar
  // dari endpoint detail, fallback ke data list bila fetch gagal).
  const [detailId, setDetailId] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  const loadData = async (append = false) => {
    if (append) setIsLoadingMore(true);
    else setIsLoading(true);
    setLoadError('');
    try {
      const res = await api.getPengajuanAbsensi({ limit: 50, offset: append ? list.length : 0 });
      if (res.success) {
        setList((prev) => (append ? [...prev, ...(res.data || [])] : (res.data || [])));
        setHasMore(!!res.has_more);
      }
    } catch (err) {
      if (!append) setLoadError(err.message || 'Gagal memuat riwayat pengajuan absensi.');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    loadData(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Simpan draf tiap perubahan field (pindah tab = unmount = form
  // hilang tanpa ini; pola yang sama dengan LemburView/IzinView).
  useEffect(() => {
    if (!draftKey) return;
    saveDraft(draftKey, { requestDate, hasCheckIn, checkIn, hasCheckOut, checkOut, reason });
  }, [draftKey, requestDate, hasCheckIn, checkIn, hasCheckOut, checkOut, reason]);

  const handleToggleDetail = async (item) => {
    if (detailId === item.id) {
      setDetailId(null);
      setDetailData(null);
      setDetailError('');
      return;
    }
    setDetailId(item.id);
    setDetailData(null);
    setDetailError('');
    setDetailLoading(true);
    try {
      const res = await api.getPengajuanAbsensiDetail(item.id);
      if (res.success && res.data) setDetailData(res.data);
      else setDetailData(item);
    } catch (err) {
      // Detail tetap tampil dari data list; kegagalan fetch ditulis
      // jujur, bukan menutup panel atau menampilkan data kosong.
      setDetailData(item);
      setDetailError(err.message || 'Gagal memuat detail terbaru; menampilkan data riwayat.');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCancel = async (item) => {
    if (!window.confirm('Batalkan pengajuan absensi ini? Pengajuan yang dibatalkan tidak dapat diajukan ulang dari riwayat.')) return;
    setCancellingId(item.id);
    setCancelMessage({ type: '', text: '' });
    try {
      await api.batalkanPengajuanAbsensi(item.id);
      setCancelMessage({ type: 'success', text: 'Pengajuan absensi dibatalkan.' });
      if (detailId === item.id) {
        setDetailId(null);
        setDetailData(null);
      }
      loadData(false);
    } catch (err) {
      setCancelMessage({ type: 'error', text: err.message || 'Gagal membatalkan pengajuan.' });
    } finally {
      setCancellingId(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      requestDate,
      checkIn: hasCheckIn ? checkIn : null,
      checkOut: hasCheckOut ? checkOut : null,
      reason: reason.trim(),
    };
    const errMsg = validatePengajuanAbsensi(payload);
    if (errMsg) {
      setFormMessage({ type: 'error', text: errMsg });
      return;
    }
    setIsSubmitting(true);
    setFormMessage({ type: '', text: '' });
    try {
      // Waktu dikirim sebagai string "HH:MM" atau null — persis
      // kontrak endpoint submit (bukan datetime, bukan detik).
      const res = await api.ajukanPengajuanAbsensi({
        request_date: requestDate,
        check_in_time: payload.checkIn,
        check_out_time: payload.checkOut,
        reason: payload.reason,
      });
      if (res.success) {
        setFormMessage({ type: 'success', text: res.message || 'Pengajuan absensi berhasil dikirim.' });
        if (draftKey) clearDraft(draftKey);
        setRequestDate(today);
        setHasCheckIn(true);
        setCheckIn('08:00');
        setHasCheckOut(false);
        setCheckOut('17:00');
        setReason('');
        setShowForm(false);
        loadData(false);
      }
    } catch (err) {
      setFormMessage({ type: 'error', text: err.message || 'Gagal mengirim pengajuan absensi.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--text-main)',
    backgroundColor: '#ffffff',
    border: '1.5px solid #e2e8f0',
    borderRadius: '10px',
    outline: 'none',
    boxSizing: 'border-box',
  };

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
              Pengajuan Absensi
            </h2>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
              Untuk karyawan yang kelupaan absensi
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => { setShowForm(!showForm); setFormMessage({ type: '', text: '' }); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 12px',
            borderRadius: 'var(--radius-full)',
            background: showForm ? 'var(--bg-slate)' : 'linear-gradient(135deg, #6d28d9, #5b21b6)',
            border: showForm ? '1px solid var(--border-light)' : 'none',
            color: showForm ? 'var(--text-main)' : '#ffffff',
            fontSize: '11px',
            fontWeight: '700',
            cursor: 'pointer',
            boxShadow: showForm ? 'none' : '0 2px 8px rgba(109, 40, 217, 0.25)'
          }}
        >
          {showForm ? 'Tutup' : (
            <>
              <Plus size={14} strokeWidth={2.5} />
              <span>Ajukan</span>
            </>
          )}
        </button>
      </div>

      {/* Form pengajuan */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #ede9fe',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CalendarClock size={16} style={{ color: '#6d28d9' }} />
            <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)' }}>Form Pengajuan Absensi</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-main)' }} htmlFor="pa-tanggal">
              Tanggal Absensi <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              id="pa-tanggal"
              type="date"
              value={requestDate}
              max={today}
              onChange={(e) => setRequestDate(e.target.value)}
              style={inputStyle}
            />
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Tanggal tidak boleh di masa depan.</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="checkbox"
                  checked={hasCheckIn}
                  onChange={(e) => setHasCheckIn(e.target.checked)}
                />
                <Clock size={12} style={{ color: '#6d28d9' }} /> Jam Masuk
              </label>
              <input
                type="time"
                value={checkIn}
                disabled={!hasCheckIn}
                onChange={(e) => setCheckIn(e.target.value)}
                style={{ ...inputStyle, opacity: hasCheckIn ? 1 : 0.45 }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="checkbox"
                  checked={hasCheckOut}
                  onChange={(e) => setHasCheckOut(e.target.checked)}
                />
                <Clock size={12} style={{ color: '#6d28d9' }} /> Jam Pulang
              </label>
              <input
                type="time"
                value={checkOut}
                disabled={!hasCheckOut}
                onChange={(e) => setCheckOut(e.target.value)}
                style={{ ...inputStyle, opacity: hasCheckOut ? 1 : 0.45 }}
              />
            </div>
          </div>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '-6px' }}>
            Isi minimal satu jam. Bila keduanya terisi, jam pulang harus lebih besar dari jam masuk.
          </span>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-main)' }} htmlFor="pa-alasan">
              Alasan <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <textarea
              id="pa-alasan"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Contoh: Lupa absen masuk karena antrean verifikasi wajah di lobi."
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          {formMessage.text && (
            <div style={{
              padding: '10px 12px',
              borderRadius: '10px',
              fontSize: '12px',
              fontWeight: '600',
              backgroundColor: formMessage.type === 'error' ? '#fef2f2' : '#f0fdf4',
              border: `1px solid ${formMessage.type === 'error' ? '#fecaca' : '#bbf7d0'}`,
              color: formMessage.type === 'error' ? '#b91c1c' : '#15803d',
            }}>
              {formMessage.text}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #6d28d9, #5b21b6)',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: '800',
              cursor: isSubmitting ? 'default' : 'pointer',
              opacity: isSubmitting ? 0.7 : 1,
            }}
          >
            <Send size={15} />
            {isSubmitting ? 'Mengirim...' : 'Kirim Pengajuan'}
          </button>
        </form>
      )}

      {/* Pesan batal */}
      {cancelMessage.text && (
        <div style={{
          padding: '10px 12px',
          borderRadius: '10px',
          fontSize: '12px',
          fontWeight: '600',
          backgroundColor: cancelMessage.type === 'error' ? '#fef2f2' : '#f0fdf4',
          border: `1px solid ${cancelMessage.type === 'error' ? '#fecaca' : '#bbf7d0'}`,
          color: cancelMessage.type === 'error' ? '#b91c1c' : '#15803d',
        }}>
          {cancelMessage.text}
        </div>
      )}

      {/* Riwayat pengajuan sendiri */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)' }}>Riwayat Pengajuan Saya</span>

        {isLoading && (
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>Memuat riwayat...</p>
        )}
        {!isLoading && loadError && (
          <div style={{
            padding: '10px 12px',
            borderRadius: '10px',
            fontSize: '12px',
            fontWeight: '600',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
          }}>
            {loadError}
          </div>
        )}
        {!isLoading && !loadError && list.length === 0 && (
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
            Belum ada pengajuan absensi. Tekan “Ajukan” bila Anda kelupaan absensi.
          </p>
        )}

        {list.map((item) => {
          const expanded = detailId === item.id;
          const detail = expanded && detailData ? detailData : item;
          return (
            <div
              key={item.id}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleToggleDetail(item)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    textAlign: 'left',
                  }}
                >
                  <CalendarClock size={16} style={{ color: '#6d28d9', flexShrink: 0 }} />
                  <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)' }}>
                    {fmtTanggalStr(item.request_date)}
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)' }}>
                    {item.check_in_time ? `${item.check_in_time} WIB` : '-'}
                    {' – '}
                    {item.check_out_time ? `${item.check_out_time} WIB` : '-'}
                  </span>
                </button>
                {getStatusPill(item.status)}
              </div>

              {/* Detail singkat: tanggal, jam, alasan, status, alasan tolak */}
              {expanded && (
                <div style={{
                  marginTop: '2px',
                  padding: '10px 12px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '12px',
                  border: '1px solid #f1f5f9',
                  fontSize: '11px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                  {detailLoading && (
                    <span style={{ color: '#64748b' }}>Memuat detail terbaru...</span>
                  )}
                  {detailError && (
                    <span style={{ color: '#b91c1c', fontWeight: '600' }}>{detailError}</span>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Tanggal:</span>
                    <span style={{ fontWeight: '700', color: '#0f172a' }}>{fmtTanggalStr(detail.request_date)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Jam Masuk:</span>
                    <span style={{ fontWeight: '700', color: '#0f172a' }}>{detail.check_in_time ? `${detail.check_in_time} WIB` : '-'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Jam Pulang:</span>
                    <span style={{ fontWeight: '700', color: '#0f172a' }}>{detail.check_out_time ? `${detail.check_out_time} WIB` : '-'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Status:</span>
                    <span style={{ fontWeight: '700', color: '#0f172a' }}>
                      {detail.status === 'disetujui' ? 'Disetujui'
                        : detail.status === 'ditolak' ? 'Ditolak'
                        : detail.status === 'dibatalkan' ? 'Dibatalkan' : 'Menunggu'}
                    </span>
                  </div>
                  <div style={{ marginTop: '2px', paddingTop: '6px', borderTop: '1px dashed #e2e8f0' }}>
                    <span style={{ color: '#64748b', display: 'block', marginBottom: '2px' }}>Alasan:</span>
                    <p style={{ margin: 0, color: '#334155', fontWeight: '500', lineHeight: 1.4 }}>
                      {detail.reason ? `"${detail.reason}"` : '-'}
                    </p>
                  </div>
                  {detail.status === 'ditolak' && detail.rejection_reason && (
                    <div style={{ marginTop: '2px', paddingTop: '6px', borderTop: '1px dashed #e2e8f0' }}>
                      <span style={{ color: '#b91c1c', display: 'block', marginBottom: '2px', fontWeight: '700' }}>Alasan Penolakan:</span>
                      <p style={{ margin: 0, color: '#7f1d1d', fontWeight: '500', lineHeight: 1.4 }}>
                        {detail.rejection_reason}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleToggleDetail(item)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '999px',
                    border: '1px solid #ddd6fe',
                    backgroundColor: '#f5f3ff',
                    color: '#5b21b6',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                >
                  {expanded ? 'Tutup Detail' : 'Lihat Detail'}
                </button>
                {item.status === 'menunggu' && (
                  <button
                    type="button"
                    onClick={() => handleCancel(item)}
                    disabled={cancellingId === item.id}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '999px',
                      border: '1px solid #fecaca',
                      backgroundColor: '#ffffff',
                      color: '#dc2626',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: cancellingId === item.id ? 'default' : 'pointer',
                      opacity: cancellingId === item.id ? 0.6 : 1,
                    }}
                  >
                    {cancellingId === item.id ? 'Membatalkan...' : 'Batalkan'}
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {hasMore && (
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={isLoadingMore}
            style={{
              padding: '10px',
              borderRadius: '10px',
              border: '1px solid var(--border-light)',
              backgroundColor: '#ffffff',
              color: 'var(--text-main)',
              fontSize: '12px',
              fontWeight: '700',
              cursor: isLoadingMore ? 'default' : 'pointer',
            }}
          >
            {isLoadingMore ? 'Memuat...' : 'Muat lagi'}
          </button>
        )}
      </div>
    </div>
  );
}
