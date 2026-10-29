import React, { useState, useEffect } from 'react';
import {
  X, ChevronLeft, ArrowLeftRight, Calendar, User, Clock, Check,
  AlertCircle, CheckCircle2, Send, RefreshCw, AlertTriangle, Sparkles,
  ChevronRight, Coffee, Info
} from 'lucide-react';
import api from '../../services/api';

export default function TukarShiftModal({ isOpen, onClose, onSuccess }) {
  const [activeTab, setActiveTab] = useState('ajukan'); // 'ajukan' | 'masuk' | 'saya'
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Data Form Inisiasi
  const [rekanList, setRekanList] = useState([]);
  const [jadwalPengaju, setJadwalPengaju] = useState([]);
  const [pendingMasukCount, setPendingMasukCount] = useState(0);

  // Form State
  const [selectedRekanId, setSelectedRekanId] = useState('');
  const [jadwalRekan, setJadwalRekan] = useState([]);
  const [isLoadingRekanJadwal, setIsLoadingRekanJadwal] = useState(false);
  const [selectedJadwalPengajuId, setSelectedJadwalPengajuId] = useState('');
  const [selectedJadwalRekanId, setSelectedJadwalRekanId] = useState('');
  const [alasan, setAlasan] = useState('');

  // Riwayat State
  const [permintaanMasuk, setPermintaanMasuk] = useState([]);
  const [pengajuanSaya, setPengajuanSaya] = useState([]);
  const [isLoadingRiwayat, setIsLoadingRiwayat] = useState(false);

  // Modal Respon Rekan (Setuju / Tolak)
  const [responModal, setResponModal] = useState({
    isOpen: false,
    item: null,
    aksi: 'setuju', // 'setuju' | 'tolak'
    catatan: '',
    isProcessing: false
  });

  // Muat data inisiasi saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      loadInisiasi();
      loadRiwayat();
    }
  }, [isOpen]);

  const loadInisiasi = async () => {
    setIsLoading(true);
    setFeedback({ type: '', message: '' });
    try {
      const res = await api.getTukarShiftInisiasi();
      if (res.success && res.data) {
        setRekanList(res.data.rekan_list || []);
        setJadwalPengaju(res.data.jadwal_pengaju || []);
        setPendingMasukCount(res.data.pending_masuk_count || 0);

        // Jika ada permintaan masuk yang belum direspon, arahkan user ke tab 'masuk'
        if ((res.data.pending_masuk_count || 0) > 0 && activeTab === 'ajukan') {
          // Tetap di tab ajukan atau user bisa switch sendiri
        }
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Gagal memuat data inisiasi tukar shift.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadRiwayat = async () => {
    setIsLoadingRiwayat(true);
    try {
      const res = await api.getTukarShiftRiwayat();
      if (res.success && res.data) {
        setPermintaanMasuk(res.data.permintaan_masuk || []);
        setPengajuanSaya(res.data.pengajuan_saya || []);
        setPendingMasukCount(res.data.pending_masuk_count || 0);
      }
    } catch (err) {
      console.error('Gagal memuat riwayat tukar shift:', err);
    } finally {
      setIsRiwayatLoadingSafe();
    }
  };

  const setIsRiwayatLoadingSafe = () => {
    setIsLoadingRiwayat(false);
  };

  // Saat rekan dipilih, ambil jadwal milik rekan
  const handleSelectRekan = async (e) => {
    const rekanId = e.target.value;
    setSelectedRekanId(rekanId);
    setSelectedJadwalRekanId('');
    setJadwalRekan([]);

    if (!rekanId) return;

    setIsLoadingRekanJadwal(true);
    try {
      const res = await api.getTukarShiftJadwalRekan(rekanId);
      if (res.success && res.data) {
        setJadwalRekan(res.data.jadwal || []);
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Gagal memuat jadwal shift rekan kerja.'
      });
    } finally {
      setIsLoadingRekanJadwal(false);
    }
  };

  // Submit pengajuan tukar shift
  const handleSubmitPengajuan = async (e) => {
    e.preventDefault();
    if (!selectedRekanId) {
      setFeedback({ type: 'error', message: 'Silakan pilih rekan kerja sesama roster.' });
      return;
    }
    if (!selectedJadwalPengajuId) {
      setFeedback({ type: 'error', message: 'Silakan pilih shift Anda yang ingin ditukar.' });
      return;
    }
    if (!selectedJadwalRekanId) {
      setFeedback({ type: 'error', message: 'Silakan pilih shift rekan kerja yang ingin Anda ambil.' });
      return;
    }
    if (!alasan.trim() || alasan.trim().length < 4) {
      setFeedback({ type: 'error', message: 'Berikan alasan pengajuan tukar shift (minimal 4 karakter).' });
      return;
    }

    setIsSubmitting(true);
    setFeedback({ type: '', message: '' });

    try {
      // Server /swap/submit membaca tanggal_pengaju/tanggal_tujuan
      // (bukan id penjadwalan). Id dropdown adalah id SINTETIS dari
      // enrichSchedule (baseId+i+1), bukan id record Odoo, sehingga
      // tidak bermakna bagi server — kirim tanggal dari item terpilih.
      const shiftPengaju = (jadwalPengaju || []).find((s) => String(s.id) === String(selectedJadwalPengajuId));
      const shiftRekan = (jadwalRekan || []).find((s) => String(s.id) === String(selectedJadwalRekanId));
      const payload = {
        pegawai_tujuan_id: Number(selectedRekanId),
        alasan: alasan.trim(),
        ...(shiftPengaju && shiftPengaju.tanggal ? { tanggal_pengaju: shiftPengaju.tanggal } : {}),
        ...(shiftRekan && shiftRekan.tanggal ? { tanggal_tujuan: shiftRekan.tanggal } : {}),
      };

      const res = await api.ajukanTukarShift(payload);
      if (res.success) {
        setFeedback({
          type: 'success',
          message: 'Pengajuan tukar shift berhasil dikirim ke rekan kerja!'
        });
        // Reset form
        setSelectedRekanId('');
        setSelectedJadwalPengajuId('');
        setSelectedJadwalRekanId('');
        setJadwalRekan([]);
        setAlasan('');
        // Refresh data
        loadInisiasi();
        loadRiwayat();
        if (onSuccess) onSuccess();
        // Beralih ke tab 'saya' setelah 1.5 detik
        setTimeout(() => {
          setActiveTab('saya');
        }, 1200);
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Gagal mengirim pengajuan tukar shift.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Batalkan pengajuan sendiri
  const handleBatalkan = async (id) => {
    if (!window.confirm('Apakah Anda yakin ingin membatalkan pengajuan tukar shift ini?')) {
      return;
    }

    try {
      const res = await api.batalkanTukarShift(id);
      if (res.success) {
        loadRiwayat();
        loadInisiasi();
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      alert(err?.message || 'Gagal membatalkan pengajuan.');
    }
  };

  // Konfirmasi Respon Rekan (Setuju / Tolak)
  const handleConfirmRespon = async () => {
    if (!responModal.item) return;

    setResponModal(prev => ({ ...prev, isProcessing: true }));
    try {
      const res = await api.responTukarShift(
        responModal.item.id,
        responModal.aksi,
        responModal.catatan?.trim() || null
      );

      if (res.success) {
        setResponModal({ isOpen: false, item: null, aksi: 'setuju', catatan: '', isProcessing: false });
        alert(res.message || 'Respon berhasil dikirim.');
        loadRiwayat();
        loadInisiasi();
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      alert(err?.message || 'Gagal memproses respon.');
      setResponModal(prev => ({ ...prev, isProcessing: false }));
    }
  };

  if (!isOpen) return null;

  const currentPengajuShift = jadwalPengaju.find(j => String(j.id) === String(selectedJadwalPengajuId));
  const currentRekanShift = jadwalRekan.find(j => String(j.id) === String(selectedJadwalRekanId));
  const currentRekanObj = rekanList.find(r => String(r.id) === String(selectedRekanId));

  // C20: kartu 'Permintaan Masuk' harus menampilkan PENGAJU, bukan rekan
  // (server mengirim rekan = colleague = viewer sendiri untuk permintaan
  // masuk, sehingga admin lama melihat namanya sendiri). Nama pengaju
  // dari pengaju_nama server, atau lookup rekanList by pengaju_id.
  const infoPengaju = (item) => {
    const dariList = rekanList.find((r) => String(r.id) === String(item.pengaju_id));
    return {
      nama: item.pengaju_nama || dariList?.nama_lengkap || item.rekan?.nama_lengkap || 'Rekan Kerja',
      sub: [dariList?.jabatan, dariList?.departemen].filter(Boolean).join(' • '),
    };
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderTopLeftRadius: '24px',
        borderTopRightRadius: '24px',
        maxHeight: '92vh',
        height: '92vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.2)',
        overflow: 'hidden'
      }}>
        {/* Header Modal */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-light)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#ffffff'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 10px rgba(2, 132, 199, 0.25)'
            }}>
              <ArrowLeftRight size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
                Tukar Shift Roster
              </h3>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '1px 0 0 0' }}>
                Pengajuan jadwal antar rekan kerja sesama roster
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
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

        {/* Tab Navigasi */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 1.2fr 1fr',
          padding: '8px 16px',
          backgroundColor: 'var(--bg-slate)',
          borderBottom: '1px solid var(--border-light)',
          gap: '6px'
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('ajukan')}
            style={{
              padding: '8px 4px',
              borderRadius: '10px',
              fontSize: '11px',
              fontWeight: activeTab === 'ajukan' ? '800' : '600',
              backgroundColor: activeTab === 'ajukan' ? '#ffffff' : 'transparent',
              color: activeTab === 'ajukan' ? 'var(--primary-700)' : 'var(--text-muted)',
              border: activeTab === 'ajukan' ? '1px solid var(--border-light)' : 'none',
              boxShadow: activeTab === 'ajukan' ? '0 2px 4px rgba(0,0,0,0.04)' : 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px'
            }}
          >
            <Send size={13} />
            <span>Ajukan</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('masuk')}
            style={{
              padding: '8px 4px',
              borderRadius: '10px',
              fontSize: '11px',
              fontWeight: activeTab === 'masuk' ? '800' : '600',
              backgroundColor: activeTab === 'masuk' ? '#ffffff' : 'transparent',
              color: activeTab === 'masuk' ? '#ea580c' : 'var(--text-muted)',
              border: activeTab === 'masuk' ? '1px solid var(--border-light)' : 'none',
              boxShadow: activeTab === 'masuk' ? '0 2px 4px rgba(0,0,0,0.04)' : 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              position: 'relative'
            }}
          >
            <span>Permintaan Masuk</span>
            {pendingMasukCount > 0 && (
              <span style={{
                backgroundColor: '#ef4444',
                color: '#ffffff',
                fontSize: '9px',
                fontWeight: '900',
                padding: '1px 5px',
                borderRadius: '999px',
                lineHeight: 1
              }}>
                {pendingMasukCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('saya')}
            style={{
              padding: '8px 4px',
              borderRadius: '10px',
              fontSize: '11px',
              fontWeight: activeTab === 'saya' ? '800' : '600',
              backgroundColor: activeTab === 'saya' ? '#ffffff' : 'transparent',
              color: activeTab === 'saya' ? 'var(--primary-700)' : 'var(--text-muted)',
              border: activeTab === 'saya' ? '1px solid var(--border-light)' : 'none',
              boxShadow: activeTab === 'saya' ? '0 2px 4px rgba(0,0,0,0.04)' : 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px'
            }}
          >
            <span>Pengajuan Saya</span>
          </button>
        </div>

        {/* Content Body Scrollable */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', backgroundColor: '#fafbfc' }}>
          {feedback.message && (
            <div style={{
              padding: '12px 14px',
              borderRadius: '12px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '12px',
              fontWeight: '600',
              backgroundColor: feedback.type === 'error' ? '#fef2f2' : '#f0fdf4',
              color: feedback.type === 'error' ? '#991b1b' : '#166534',
              border: feedback.type === 'error' ? '1px solid #fecaca' : '1px solid #bbf7d0'
            }}>
              {feedback.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
              <span style={{ flex: 1 }}>{feedback.message}</span>
            </div>
          )}

          {/* TAB 1: FORM AJUKAN TUKAR SHIFT */}
          {activeTab === 'ajukan' && (
            <form onSubmit={handleSubmitPengajuan} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Petunjuk Ringkas */}
              <div style={{
                padding: '10px 12px',
                borderRadius: '10px',
                backgroundColor: 'var(--primary-50)',
                border: '1px solid var(--primary-100)',
                display: 'flex',
                gap: '8px',
                alignItems: 'flex-start'
              }}>
                <Info size={16} style={{ color: 'var(--primary-700)', flexShrink: 0, marginTop: '2px' }} />
                <p style={{ margin: 0, fontSize: '11px', color: 'var(--primary-800)', lineHeight: '1.4' }}>
                  Pilih rekan kerja roster, tentukan tanggal shift Anda yang ingin ditukar, dan pilih tanggal shift rekan yang ingin Anda ambil.
                </p>
              </div>

              {/* Langkah 1: Pilih Rekan Roster */}
              <div style={{
                backgroundColor: '#ffffff',
                padding: '14px',
                borderRadius: '14px',
                border: '1px solid var(--border-light)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
              }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '8px' }}>
                  1. Pilih Rekan Kerja (Sesama Roster) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <select
                    value={selectedRekanId}
                    onChange={handleSelectRekan}
                    disabled={isLoading}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1.5px solid var(--border-light)',
                      backgroundColor: '#ffffff',
                      fontSize: '13px',
                      color: selectedRekanId ? 'var(--text-main)' : 'var(--text-muted)',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="">-- Ketuk untuk memilih rekan roster --</option>
                    {rekanList.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nama_lengkap} ({r.jabatan} - {r.departemen})
                      </option>
                    ))}
                  </select>
                </div>
                {rekanList.length === 0 && !isLoading && (
                  <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: '#be123c' }}>
                    Tidak ditemukan rekan kerja lain dengan jadwal fleksibel roster.
                  </p>
                )}
              </div>

              {/* Langkah 2: Pilih Shift Anda yang Ingin Ditukar */}
              <div style={{
                backgroundColor: '#ffffff',
                padding: '14px',
                borderRadius: '14px',
                border: '1px solid var(--border-light)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
                    2. Shift Anda yang Ingin Ditukar <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    {jadwalPengaju.length} Jadwal Tersedia
                  </span>
                </div>

                <div style={{ position: 'relative' }}>
                  <select
                    value={selectedJadwalPengajuId}
                    onChange={(e) => setSelectedJadwalPengajuId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1.5px solid var(--border-light)',
                      backgroundColor: '#ffffff',
                      fontSize: '13px',
                      color: selectedJadwalPengajuId ? 'var(--text-main)' : 'var(--text-muted)',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="">-- Pilih tanggal shift Anda --</option>
                    {jadwalPengaju.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.hari}, {item.tanggal_formatted} — {item.is_hari_libur ? 'Libur (Day Off)' : `${item.nama_shift} (${item.jam_masuk}-${item.jam_pulang})`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Langkah 3: Pilih Shift Rekan yang Ingin Diambil */}
              <div style={{
                backgroundColor: '#ffffff',
                padding: '14px',
                borderRadius: '14px',
                border: '1px solid var(--border-light)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                opacity: selectedRekanId ? 1 : 0.6
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
                    3. Shift Rekan yang Ingin Anda Ambil <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  {isLoadingRekanJadwal && (
                    <span style={{ fontSize: '10px', color: 'var(--primary-600)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <RefreshCw size={10} className="animate-spin" /> Memuat...
                    </span>
                  )}
                </div>

                <div style={{ position: 'relative' }}>
                  <select
                    value={selectedJadwalRekanId}
                    onChange={(e) => setSelectedJadwalRekanId(e.target.value)}
                    disabled={!selectedRekanId || isLoadingRekanJadwal}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1.5px solid var(--border-light)',
                      backgroundColor: !selectedRekanId ? 'var(--bg-slate)' : '#ffffff',
                      fontSize: '13px',
                      color: selectedJadwalRekanId ? 'var(--text-main)' : 'var(--text-muted)',
                      outline: 'none',
                      cursor: selectedRekanId ? 'pointer' : 'not-allowed'
                    }}
                  >
                    <option value="">
                      {!selectedRekanId
                        ? '-- Harap pilih rekan kerja terlebih dahulu --'
                        : jadwalRekan.length === 0
                          ? '-- Rekan belum memiliki jadwal roster mendatang --'
                          : '-- Pilih tanggal shift rekan --'}
                    </option>
                    {jadwalRekan.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.hari}, {item.tanggal_formatted} — {item.is_hari_libur ? 'Libur (Day Off)' : `${item.nama_shift} (${item.jam_masuk}-${item.jam_pulang})`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Preview Pertukaran Shift (Jika Kedua Shift Telah Dipilih) */}
              {currentPengajuShift && currentRekanShift && (
                <div style={{
                  background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
                  padding: '14px',
                  borderRadius: '14px',
                  border: '1.5px dashed #86efac'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', color: '#166534', fontWeight: '800', fontSize: '12px' }}>
                    <Sparkles size={16} />
                    <span>Pratinjau Hasil Pertukaran Shift:</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '8px', alignItems: 'center' }}>
                    {/* Sisi Pengaju */}
                    <div style={{ backgroundColor: '#ffffff', padding: '10px', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                      <span style={{ fontSize: '9px', fontWeight: '800', color: '#15803d', textTransform: 'uppercase' }}>Shift Anda Lepas</span>
                      <p style={{ margin: '2px 0 0 0', fontSize: '11px', fontWeight: '800', color: 'var(--text-main)' }}>
                        {currentPengajuShift.tanggal_formatted}
                      </p>
                      <p style={{ margin: '1px 0 0 0', fontSize: '10px', color: currentPengajuShift.is_hari_libur ? '#be123c' : 'var(--primary-700)', fontWeight: '700' }}>
                        {currentPengajuShift.nama_shift}
                      </p>
                    </div>

                    <ArrowLeftRight size={18} style={{ color: '#16a34a' }} />

                    {/* Sisi Rekan */}
                    <div style={{ backgroundColor: '#ffffff', padding: '10px', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                      <span style={{ fontSize: '9px', fontWeight: '800', color: '#0369a1', textTransform: 'uppercase' }}>Shift Anda Ambil</span>
                      <p style={{ margin: '2px 0 0 0', fontSize: '11px', fontWeight: '800', color: 'var(--text-main)' }}>
                        {currentRekanShift.tanggal_formatted}
                      </p>
                      <p style={{ margin: '1px 0 0 0', fontSize: '10px', color: currentRekanShift.is_hari_libur ? '#be123c' : 'var(--primary-700)', fontWeight: '700' }}>
                        {currentRekanShift.nama_shift}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Langkah 4: Alasan Penukaran */}
              <div style={{
                backgroundColor: '#ffffff',
                padding: '14px',
                borderRadius: '14px',
                border: '1px solid var(--border-light)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
              }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '8px' }}>
                  4. Alasan Penukaran Shift <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <textarea
                  value={alasan}
                  onChange={(e) => setAlasan(e.target.value)}
                  placeholder="Jelaskan alasan penukaran shift (misal: ada keperluan keluarga mendesak)..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1.5px solid var(--border-light)',
                    fontSize: '12px',
                    color: 'var(--text-main)',
                    outline: 'none',
                    resize: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Tombol Kirim */}
              <button
                type="submit"
                disabled={isSubmitting || !selectedRekanId || !selectedJadwalPengajuId || !selectedJadwalRekanId}
                style={{
                  width: '100%',
                  padding: '13px',
                  borderRadius: '12px',
                  background: isSubmitting || !selectedRekanId || !selectedJadwalPengajuId || !selectedJadwalRekanId
                    ? '#cbd5e1'
                    : 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: '800',
                  border: 'none',
                  cursor: isSubmitting || !selectedRekanId || !selectedJadwalPengajuId || !selectedJadwalRekanId
                    ? 'not-allowed'
                    : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
                  marginTop: '4px'
                }}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Mengirimkan Pengajuan...</span>
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    <span>Kirim Pengajuan ke Rekan</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* TAB 2: PERMINTAAN MASUK DARI REKAN */}
          {activeTab === 'masuk' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-main)' }}>
                  Daftar Permintaan Masuk ({permintaanMasuk.length})
                </span>
                <button
                  type="button"
                  onClick={loadRiwayat}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    fontSize: '11px',
                    fontWeight: '700',
                    color: 'var(--primary-700)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer'
                  }}
                >
                  <RefreshCw size={12} className={isLoadingRiwayat ? 'animate-spin' : ''} />
                  <span>Segarkan</span>
                </button>
              </div>

              {permintaanMasuk.length === 0 ? (
                <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-muted)', backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid var(--border-light)' }}>
                  <ArrowLeftRight size={32} style={{ margin: '0 auto 10px auto', opacity: 0.3 }} />
                  <p style={{ margin: 0, fontWeight: '700', fontSize: '13px' }}>Belum ada permintaan tukar shift masuk</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '11px' }}>Jika ada rekan kerja yang mengajak bertukar shift, akan muncul di sini.</p>
                </div>
              ) : (
                permintaanMasuk.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '14px',
                      border: item.status === 'menunggu_rekan' ? '1.5px solid #fdba74' : '1px solid var(--border-light)',
                      padding: '14px',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}
                  >
                    {/* Header Item */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', fontWeight: '700', color: 'var(--text-muted)' }}>
                          {item.kode_pengajuan}
                        </span>
                        <h4 style={{ margin: '2px 0 0 0', fontSize: '13px', fontWeight: '800', color: 'var(--text-main)' }}>
                          {infoPengaju(item).nama}
                        </h4>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          {infoPengaju(item).sub}
                        </span>
                      </div>

                      <span style={{
                        fontSize: '10px',
                        fontWeight: '800',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        backgroundColor: item.status === 'menunggu_rekan' ? '#ffedd5' : item.status === 'disetujui' ? '#dcfce7' : '#fee2e2',
                        color: item.status === 'menunggu_rekan' ? '#c2410c' : item.status === 'disetujui' ? '#15803d' : '#b91c1c'
                      }}>
                        {item.status_label}
                      </span>
                    </div>

                    {/* Pertukaran Shift Box */}
                    <div style={{
                      backgroundColor: 'var(--bg-slate)',
                      padding: '10px',
                      borderRadius: '10px',
                      display: 'grid',
                      gridTemplateColumns: '1fr auto 1fr',
                      gap: '8px',
                      alignItems: 'center'
                    }}>
                      {item.shift_pengaju && (
                      <div>
                        <span style={{ fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Rekan Berikan:</span>
                        <p style={{ margin: '2px 0 0 0', fontSize: '11px', fontWeight: '800', color: 'var(--text-main)' }}>
                          {item.shift_pengaju.hari}, {item.shift_pengaju.tanggal_formatted}
                        </p>
                        <span style={{ fontSize: '10px', fontWeight: '700', color: item.shift_pengaju.is_hari_libur ? '#be123c' : 'var(--primary-700)' }}>
                          {item.shift_pengaju.label}
                        </span>
                      </div>
                      )}

                      <ArrowLeftRight size={16} style={{ color: 'var(--text-muted)' }} />

                      {item.shift_tujuan && (
                      <div>
                        <span style={{ fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Shift Anda Diminta:</span>
                        <p style={{ margin: '2px 0 0 0', fontSize: '11px', fontWeight: '800', color: 'var(--text-main)' }}>
                          {item.shift_tujuan.hari}, {item.shift_tujuan.tanggal_formatted}
                        </p>
                        <span style={{ fontSize: '10px', fontWeight: '700', color: item.shift_tujuan.is_hari_libur ? '#be123c' : 'var(--primary-700)' }}>
                          {item.shift_tujuan.label}
                        </span>
                      </div>
                      )}
                    </div>

                    {/* Alasan */}
                    <div style={{ fontSize: '11px', color: 'var(--text-main)', backgroundColor: '#fff7ed', padding: '8px 10px', borderRadius: '8px', borderLeft: '3px solid #f97316' }}>
                      <span style={{ fontWeight: '800', color: '#c2410c' }}>Alasan: </span>
                      <span>"{item.alasan}"</span>
                    </div>

                    {/* Catatan Balasan jika ada */}
                    {item.catatan_rekan && (
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        Catatan Respon: "{item.catatan_rekan}"
                      </div>
                    )}

                    {/* Tombol Aksi jika status menunggu_rekan */}
                    {item.status === 'menunggu_rekan' && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
                        <button
                          type="button"
                          onClick={() => setResponModal({ isOpen: true, item, aksi: 'tolak', catatan: '', isProcessing: false })}
                          style={{
                            padding: '9px',
                            borderRadius: '8px',
                            backgroundColor: '#fee2e2',
                            color: '#b91c1c',
                            fontSize: '11px',
                            fontWeight: '800',
                            border: '1px solid #fca5a5',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                          }}
                        >
                          <X size={14} />
                          <span>Tolak</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setResponModal({ isOpen: true, item, aksi: 'setuju', catatan: '', isProcessing: false })}
                          style={{
                            padding: '9px',
                            borderRadius: '8px',
                            backgroundColor: '#16a34a',
                            color: '#ffffff',
                            fontSize: '11px',
                            fontWeight: '800',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            boxShadow: '0 2px 6px rgba(22, 163, 74, 0.25)'
                          }}
                        >
                          <Check size={14} />
                          <span>Setujui Tukar</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: PENGAJUAN SAYA (YANG DIKIRIM KE REKAN) */}
          {activeTab === 'saya' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-main)' }}>
                  Pengajuan Saya ({pengajuanSaya.length})
                </span>
                <button
                  type="button"
                  onClick={loadRiwayat}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    fontSize: '11px',
                    fontWeight: '700',
                    color: 'var(--primary-700)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer'
                  }}
                >
                  <RefreshCw size={12} className={isLoadingRiwayat ? 'animate-spin' : ''} />
                  <span>Segarkan</span>
                </button>
              </div>

              {pengajuanSaya.length === 0 ? (
                <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-muted)', backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid var(--border-light)' }}>
                  <Send size={32} style={{ margin: '0 auto 10px auto', opacity: 0.3 }} />
                  <p style={{ margin: 0, fontWeight: '700', fontSize: '13px' }}>Belum ada pengajuan tukar shift</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '11px' }}>Gunakan tab "Ajukan" di atas untuk mengirimkan permintaan tukar shift.</p>
                </div>
              ) : (
                pengajuanSaya.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '14px',
                      border: '1px solid var(--border-light)',
                      padding: '14px',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}
                  >
                    {/* Header Item */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', fontWeight: '700', color: 'var(--text-muted)' }}>
                          {item.kode_pengajuan}
                        </span>
                        <h4 style={{ margin: '2px 0 0 0', fontSize: '13px', fontWeight: '800', color: 'var(--text-main)' }}>
                          Tujuan: {item.rekan.nama_lengkap}
                        </h4>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          {[item.rekan.jabatan, (item.shift_pengaju && item.shift_tujuan) ? `${item.shift_pengaju.tanggal_formatted} ↔ ${item.shift_tujuan.tanggal_formatted}` : null].filter(Boolean).join(' • ')}
                        </span>
                      </div>

                      <span style={{
                        fontSize: '10px',
                        fontWeight: '800',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        backgroundColor: item.status === 'menunggu_rekan' ? '#fef3c7' : item.status === 'disetujui' ? '#dcfce7' : '#fee2e2',
                        color: item.status === 'menunggu_rekan' ? '#b45309' : item.status === 'disetujui' ? '#15803d' : '#b91c1c'
                      }}>
                        {item.status_label}
                      </span>
                    </div>

                    {/* Shift Info Box */}
                    <div style={{
                      backgroundColor: 'var(--bg-slate)',
                      padding: '10px',
                      borderRadius: '10px',
                      display: 'grid',
                      gridTemplateColumns: '1fr auto 1fr',
                      gap: '8px',
                      alignItems: 'center'
                    }}>
                      {item.shift_pengaju && (
                      <div>
                        <span style={{ fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Shift Anda Lepas:</span>
                        <p style={{ margin: '2px 0 0 0', fontSize: '11px', fontWeight: '800', color: 'var(--text-main)' }}>
                          {item.shift_pengaju.hari}, {item.shift_pengaju.tanggal_formatted}
                        </p>
                        <span style={{ fontSize: '10px', fontWeight: '700', color: item.shift_pengaju.is_hari_libur ? '#be123c' : 'var(--primary-700)' }}>
                          {item.shift_pengaju.label}
                        </span>
                      </div>
                      )}

                      <ArrowLeftRight size={16} style={{ color: 'var(--text-muted)' }} />

                      {item.shift_tujuan && (
                      <div>
                        <span style={{ fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Shift Rekan Diminta:</span>
                        <p style={{ margin: '2px 0 0 0', fontSize: '11px', fontWeight: '800', color: 'var(--text-main)' }}>
                          {item.shift_tujuan.hari}, {item.shift_tujuan.tanggal_formatted}
                        </p>
                        <span style={{ fontSize: '10px', fontWeight: '700', color: item.shift_tujuan.is_hari_libur ? '#be123c' : 'var(--primary-700)' }}>
                          {item.shift_tujuan.label}
                        </span>
                      </div>
                      )}
                    </div>

                    {/* Alasan */}
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      <strong>Alasan:</strong> {item.alasan}
                    </div>

                    {/* Catatan Rekan jika ada */}
                    {item.catatan_rekan && (
                      <div style={{ fontSize: '11px', color: '#be123c', backgroundColor: '#fff1f2', padding: '6px 10px', borderRadius: '6px' }}>
                        <strong>Catatan Rekan:</strong> "{item.catatan_rekan}"
                      </div>
                    )}

                    {/* Tombol Batalkan Pengajuan jika masih menunggu */}
                    {item.status === 'menunggu_rekan' && (
                      <button
                        type="button"
                        onClick={() => handleBatalkan(item.id)}
                        style={{
                          alignSelf: 'flex-start',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          backgroundColor: '#f1f5f9',
                          color: '#64748b',
                          fontSize: '11px',
                          fontWeight: '700',
                          border: '1px solid var(--border-light)',
                          cursor: 'pointer'
                        }}
                      >
                        Batalkan Pengajuan
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal Respon (Setuju / Tolak) */}
      {responModal.isOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10000,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '18px',
            padding: '20px',
            width: '100%',
            maxWidth: '360px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
          }}>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: '800', color: 'var(--text-main)' }}>
              {responModal.aksi === 'setuju' ? 'Setujui Tukar Shift?' : 'Tolak Tukar Shift?'}
            </h4>
            <p style={{ margin: '0 0 14px 0', fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              {responModal.aksi === 'setuju'
                ? `Permintaan dicatat dan menunggu persetujuan. Jadwal baru berlaku setelah disetujui HRD/manager.`
                : `Berikan catatan (opsional) mengapa Anda menolak permintaan tukar shift ini.`}
            </p>

            <textarea
              value={responModal.catatan}
              onChange={(e) => setResponModal(prev => ({ ...prev, catatan: e.target.value }))}
              placeholder={responModal.aksi === 'setuju' ? 'Catatan tambahan (opsional)...' : 'Alasan penolakan (opsional)...'}
              rows={2}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-light)',
                fontSize: '12px',
                boxSizing: 'border-box',
                outline: 'none',
                marginBottom: '14px'
              }}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setResponModal({ isOpen: false, item: null, aksi: 'setuju', catatan: '', isProcessing: false })}
                disabled={responModal.isProcessing}
                style={{
                  padding: '10px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--bg-slate)',
                  color: 'var(--text-main)',
                  fontWeight: '700',
                  fontSize: '12px',
                  border: '1px solid var(--border-light)',
                  cursor: 'pointer'
                }}
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleConfirmRespon}
                disabled={responModal.isProcessing}
                style={{
                  padding: '10px',
                  borderRadius: '10px',
                  backgroundColor: responModal.aksi === 'setuju' ? '#16a34a' : '#dc2626',
                  color: '#ffffff',
                  fontWeight: '800',
                  fontSize: '12px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                {responModal.isProcessing ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <span>{responModal.aksi === 'setuju' ? 'Ya, Setujui' : 'Ya, Tolak'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
