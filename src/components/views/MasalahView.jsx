import React, { useState, useEffect } from 'react';
import {
  ChevronLeft, Plus, Clock, CheckCircle2, XCircle, AlertCircle,
  FileText, Send, Sparkles, UploadCloud, Paperclip, ExternalLink, X,
  HelpCircle, Camera, MapPin, RefreshCw, AlertTriangle, ShieldCheck,
  CheckCircle, MessageSquareWarning, Eye, Calendar, Info
} from 'lucide-react';
import api, { getStoredUser } from '../../services/api';
import { loadDraft, saveDraft, clearDraft, DRAFT_KEYS } from '../../services/draftService';
import DocumentPreviewModal from '../DocumentPreviewModal';

const KATEGORI_OPTIONS = [
  { id: 'gagal_absen_masuk', label: 'Gagal Absen Masuk', desc: 'Kendala saat check-in kehadiran pagi' },
  { id: 'gagal_absen_pulang', label: 'Gagal Absen Pulang', desc: 'Kendala saat check-out kepulangan' },
  { id: 'gps_tidak_terdeteksi', label: 'GPS / Lokasi Error', desc: 'Sinyal GPS hilang atau titik melompat' },
  { id: 'gps_tidak_akurat', label: 'GPS Tidak Akurat', desc: 'Titik lokasi meleset dari posisi sebenarnya' },
  { id: 'kamera_face_error', label: 'Kamera / Wajah Gagal', desc: 'Kamera gelap atau face recognition gagal' },
  { id: 'sistem_error', label: 'Gangguan Aplikasi / Server', desc: 'Aplikasi tertutup sendiri atau jaringan putus' },
  { id: 'lainnya', label: 'Kendala Lainnya', desc: 'Masalah lain seputar akun atau aplikasi' },
];

// Label kategori untuk tampil: opsi app dulu (memuat kedua id yang
// tidak dikenal peta server), lalu label server bila bukan ID mentah,
// terakhir humanisasi ID — jangan pernah tampilkan ID mentah.
function labelKategori(item) {
  if (!item) return '';
  const opt = KATEGORI_OPTIONS.find((o) => o.id === item.kategori_masalah);
  if (opt) return opt.label;
  if (item.label_kategori && !String(item.label_kategori).includes('_')) return item.label_kategori;
  if (item.kategori_masalah) {
    return String(item.kategori_masalah).split('_')
      .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(' ');
  }
  return item.label_kategori || '';
}

export default function MasalahView({ onBack }) {
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'form'
  const [masalahList, setMasalahList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [previewFoto, setPreviewFoto] = useState({ isOpen: false, id: null });

  // Form State (draf persisten — foto tidak ikut, tidak bisa JSON).
  const draftKey = getStoredUser()?.id ? DRAFT_KEYS.masalah(getStoredUser().id) : null;
  const draft0 = draftKey ? loadDraft(draftKey, {}) : {};
  const [kategori, setKategori] = useState(draft0.kategori || 'gagal_absen_masuk');
  const [judul, setJudul] = useState(draft0.judul || '');
  const [tanggalKejadian, setTanggalKejadian] = useState(draft0.tanggalKejadian || new Date().toISOString().split('T')[0]);
  const [jamKejadian, setJamKejadian] = useState(draft0.jamKejadian || (() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  })());
  const [deskripsi, setDeskripsi] = useState(draft0.deskripsi || '');

  // Simpan draf tiap perubahan field.
  useEffect(() => {
    if (!draftKey) return;
    saveDraft(draftKey, { kategori, judul, tanggalKejadian, jamKejadian, deskripsi });
  }, [draftKey, kategori, judul, tanggalKejadian, jamKejadian, deskripsi]);
  const [fotoBukti, setFotoBukti] = useState(null);
  const [previewBukti, setPreviewBukti] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alertMsg, setAlertMsg] = useState({ type: '', text: '' });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await api.getMasalah();
      if (res.success) {
        setMasalahList(res.masalah || []);
      }
    } catch (err) {
      console.error('Gagal memuat daftar kendala:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFotoChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        setAlertMsg({ type: 'error', text: 'Ukuran foto bukti tidak boleh lebih dari 5MB.' });
        return;
      }
      setFotoBukti(file);
      setPreviewBukti(URL.createObjectURL(file));
      setAlertMsg({ type: '', text: '' });
    }
  };

  const removeFotoBukti = () => {
    setFotoBukti(null);
    if (previewBukti) {
      URL.revokeObjectURL(previewBukti);
      setPreviewBukti(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!judul.trim()) {
      setAlertMsg({ type: 'error', text: 'Mohon isi ringkasan judul kendala.' });
      return;
    }
    if (!deskripsi.trim() || deskripsi.trim().length < 5) {
      setAlertMsg({ type: 'error', text: 'Mohon jelaskan rincian kendala minimal 5 karakter.' });
      return;
    }

    setIsSubmitting(true);
    setAlertMsg({ type: '', text: '' });

    try {
      const formData = new FormData();
      formData.append('kategori_masalah', kategori);
      formData.append('judul', judul.trim());
      formData.append('tanggal_kejadian', tanggalKejadian);
      if (jamKejadian) {
        formData.append('jam_kejadian', jamKejadian);
      }
      formData.append('deskripsi', deskripsi.trim());
      if (fotoBukti) {
        formData.append('foto_bukti', fotoBukti);
      }

      const res = await api.ajukanMasalah(formData);

      if (res.success) {
        setAlertMsg({ type: 'success', text: res.message || 'Pengajuan kendala berhasil dikirim!' });
        if (draftKey) clearDraft(draftKey);
        // Reset form
        setJudul('');
        setDeskripsi('');
        removeFotoBukti();
        await loadData();
        // Beralih ke tab riwayat setelah 1 detik
        setTimeout(() => {
          setActiveTab('list');
          setAlertMsg({ type: '', text: '' });
        }, 1200);
      }
    } catch (err) {
      setAlertMsg({ type: 'error', text: err.message || 'Gagal mengirim pengajuan kendala.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'selesai':
        return (
          <span style={{
            fontSize: '11px',
            fontWeight: '700',
            color: '#059669',
            backgroundColor: '#d1fae5',
            padding: '4px 10px',
            borderRadius: '999px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <CheckCircle2 size={13} /> Selesai
          </span>
        );
      case 'ditolak':
        return (
          <span style={{
            fontSize: '11px',
            fontWeight: '700',
            color: '#dc2626',
            backgroundColor: '#fee2e2',
            padding: '4px 10px',
            borderRadius: '999px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <XCircle size={13} /> Ditolak
          </span>
        );
      case 'diproses':
        return (
          <span style={{
            fontSize: '11px',
            fontWeight: '700',
            color: '#2563eb',
            backgroundColor: '#dbeafe',
            padding: '4px 10px',
            borderRadius: '999px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <RefreshCw size={13} className="spin-slow" /> Diproses
          </span>
        );
      default:
        return (
          <span style={{
            fontSize: '11px',
            fontWeight: '700',
            color: '#d97706',
            backgroundColor: '#fef3c7',
            padding: '4px 10px',
            borderRadius: '999px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <Clock size={13} /> Menunggu
          </span>
        );
    }
  };

  const renderTindakanBadge = (tindakan) => {
    switch (tindakan) {
      case 'koreksi_absensi':
        return (
          <span style={{
            fontSize: '10px',
            fontWeight: '700',
            color: '#7c3aed',
            backgroundColor: '#ede9fe',
            padding: '2px 8px',
            borderRadius: '6px'
          }}>
            Koreksi Absensi
          </span>
        );
      case 'tambah_absensi':
        return (
          <span style={{
            fontSize: '10px',
            fontWeight: '700',
            color: '#0284c7',
            backgroundColor: '#e0f2fe',
            padding: '2px 8px',
            borderRadius: '6px'
          }}>
            Tambah Rekap Presensi
          </span>
        );
      case 'hanya_laporan':
        return (
          <span style={{
            fontSize: '10px',
            fontWeight: '700',
            color: '#475569',
            backgroundColor: '#f1f5f9',
            padding: '2px 8px',
            borderRadius: '6px'
          }}>
            Laporan Dicatat
          </span>
        );
      case 'ditolak':
        return (
          <span style={{
            fontSize: '10px',
            fontWeight: '700',
            color: '#dc2626',
            backgroundColor: '#fee2e2',
            padding: '2px 8px',
            borderRadius: '6px'
          }}>
            Pengajuan Ditolak
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div style={{ paddingBottom: '30px' }}>
      {/* Header Sticky */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #f1f5f9',
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={onBack}
            className="btn-back-action"
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              width: '38px',
              height: '38px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#334155'
            }}
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              Ajukan Permasalahan
            </h1>
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              Helpdesk & Kendala Presensi
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={loadData}
          style={{
            background: 'none',
            border: 'none',
            color: '#64748b',
            cursor: 'pointer',
            padding: '6px'
          }}
          title="Muat Ulang"
        >
          <RefreshCw size={18} className={isLoading ? 'spin-slow' : ''} />
        </button>
      </div>

      <div style={{ padding: '16px' }}>
        {/* Banner Edukatif */}
        <div style={{
          background: 'linear-gradient(135deg, #eff6ff 0%, #e0f2fe 100%)',
          borderRadius: '16px',
          padding: '14px 16px',
          border: '1px solid #bae6fd',
          marginBottom: '16px',
          display: 'flex',
          gap: '12px',
          alignItems: 'flex-start'
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            backgroundColor: '#0284c7',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <HelpCircle size={20} />
          </div>
          <div>
            <h4 style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: '800', color: '#0369a1' }}>
              Pusat Kendala Presensi
            </h4>
            <p style={{ margin: 0, fontSize: '11px', color: '#0c4a6e', lineHeight: 1.5 }}>
              Sampaikan kendala teknis saat absensi. Admin akan meninjau dan menentukan tindakan: <strong>Koreksi Absensi</strong>, <strong>Tambah Absen</strong>, atau <strong>Pencatatan Gangguan Sistem</strong>.
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          backgroundColor: '#f1f5f9',
          padding: '4px',
          borderRadius: '12px',
          marginBottom: '18px'
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            style={{
              padding: '10px 12px',
              borderRadius: '9px',
              border: 'none',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s',
              backgroundColor: activeTab === 'list' ? '#ffffff' : 'transparent',
              color: activeTab === 'list' ? '#0f172a' : '#64748b',
              boxShadow: activeTab === 'list' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <span>Riwayat Tiket</span>
            {masalahList.length > 0 && (
              <span style={{
                backgroundColor: activeTab === 'list' ? '#f97316' : '#cbd5e1',
                color: '#ffffff',
                fontSize: '10px',
                fontWeight: '800',
                padding: '1px 6px',
                borderRadius: '999px'
              }}>
                {masalahList.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('form')}
            style={{
              padding: '10px 12px',
              borderRadius: '9px',
              border: 'none',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s',
              backgroundColor: activeTab === 'form' ? '#ffffff' : 'transparent',
              color: activeTab === 'form' ? '#f97316' : '#64748b',
              boxShadow: activeTab === 'form' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <Plus size={15} />
            <span>Buat Ajuan Baru</span>
          </button>
        </div>

        {/* TAB 1: FORM AJUKAN PERMASALAHAN */}
        {activeTab === 'form' && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {alertMsg.text && (
              <div style={{
                padding: '12px 14px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: alertMsg.type === 'error' ? '#fee2e2' : '#dcfce7',
                color: alertMsg.type === 'error' ? '#b91c1c' : '#15803d',
                border: `1px solid ${alertMsg.type === 'error' ? '#fecaca' : '#bbf7d0'}`
              }}>
                {alertMsg.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
                <span>{alertMsg.text}</span>
              </div>
            )}

            {/* Kategori Kendala */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#1e293b', marginBottom: '8px' }}>
                Kategori Permasalahan <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '8px'
              }}>
                {KATEGORI_OPTIONS.map((opt) => {
                  const isSelected = kategori === opt.id;
                  return (
                    <button
                      type="button"
                      key={opt.id}
                      onClick={() => setKategori(opt.id)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '12px',
                        border: isSelected ? '2px solid #f97316' : '1px solid #e2e8f0',
                        backgroundColor: isSelected ? '#fff7ed' : '#ffffff',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                    >
                      <div style={{
                        fontSize: '11px',
                        fontWeight: '800',
                        color: isSelected ? '#c2410c' : '#1e293b',
                        marginBottom: '2px'
                      }}>
                        {opt.label}
                      </div>
                      <div style={{ fontSize: '9px', color: '#64748b', lineHeight: 1.2 }}>
                        {opt.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Judul Masalah */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#1e293b', marginBottom: '6px' }}>
                Ringkasan Masalah <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                placeholder="Contoh: Kamera black screen saat verifikasi wajah pagi"
                value={judul}
                onChange={(e) => setJudul(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none',
                  backgroundColor: '#ffffff',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Waktu & Tanggal Kejadian */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#1e293b', marginBottom: '6px' }}>
                  Tanggal Kejadian <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="date"
                    value={tanggalKejadian}
                    onChange={(e) => setTanggalKejadian(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '12px',
                      border: '1px solid #cbd5e1',
                      fontSize: '12px',
                      outline: 'none',
                      backgroundColor: '#ffffff',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#1e293b', marginBottom: '6px' }}>
                  Jam Kejadian (WIB)
                </label>
                <input
                  type="time"
                  value={jamKejadian}
                  onChange={(e) => setJamKejadian(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12px',
                    outline: 'none',
                    backgroundColor: '#ffffff',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Deskripsi Kronologi */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#1e293b', marginBottom: '6px' }}>
                Kronologi / Penjelasan Detail <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <textarea
                rows={4}
                placeholder="Ceritakan kejadian secara rinci: apa pesan error yang muncul, sudah mencoba refresh berapa kali, posisi saat kejadian, dsb..."
                value={deskripsi}
                onChange={(e) => setDeskripsi(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none',
                  backgroundColor: '#ffffff',
                  boxSizing: 'border-box',
                  resize: 'none',
                  lineHeight: 1.5
                }}
              />
            </div>

            {/* Unggah Foto Bukti / Screenshot */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#1e293b', marginBottom: '6px' }}>
                Foto Bukti Kendala / Screenshot (Opsional)
              </label>

              {previewBukti ? (
                <div style={{
                  position: 'relative',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#f8fafc',
                  padding: '8px'
                }}>
                  <img
                    src={previewBukti}
                    alt="Preview Bukti"
                    style={{
                      width: '100%',
                      maxHeight: '220px',
                      objectFit: 'contain',
                      borderRadius: '10px',
                      display: 'block'
                    }}
                  />
                  <button
                    type="button"
                    onClick={removeFotoBukti}
                    style={{
                      position: 'absolute',
                      top: '14px',
                      right: '14px',
                      background: 'rgba(15, 23, 42, 0.75)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '50%',
                      width: '28px',
                      height: '28px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <X size={16} />
                  </button>
                  <div style={{ textAlign: 'center', marginTop: '6px', fontSize: '11px', color: '#64748b' }}>
                    {fotoBukti?.name}
                  </div>
                </div>
              ) : (
                <label style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '20px 14px',
                  border: '2px dashed #cbd5e1',
                  borderRadius: '14px',
                  backgroundColor: '#f8fafc',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    backgroundColor: '#e2e8f0',
                    color: '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '8px'
                  }}>
                    <Camera size={20} />
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#1e293b' }}>
                    Sentuh untuk Ambil / Unggah Foto
                  </span>
                  <span style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
                    Screenshot error atau foto lokasi (Maks. 5MB)
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFotoChange}
                    style={{ display: 'none' }}
                  />
                </label>
              )}
            </div>

            {/* Tombol Kirim */}
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                marginTop: '8px',
                padding: '14px',
                borderRadius: '14px',
                border: 'none',
                background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: '800',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.7 : 1,
                boxShadow: '0 4px 14px rgba(249, 115, 22, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={18} className="spin-slow" />
                  <span>Mengirimkan Laporan...</span>
                </>
              ) : (
                <>
                  <Send size={18} />
                  <span>Kirim Pengajuan Kendala</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* TAB 2: DAFTAR RIWAYAT TIKET */}
        {activeTab === 'list' && (
          <div>
            {isLoading ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b' }}>
                <RefreshCw size={28} className="spin-slow" style={{ margin: '0 auto 12px', color: '#f97316' }} />
                <p style={{ margin: 0, fontSize: '13px', fontWeight: '600' }}>Memuat riwayat pengajuan kendala...</p>
              </div>
            ) : masalahList.length === 0 ? (
              <div style={{
                padding: '40px 20px',
                textAlign: 'center',
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                border: '1px dashed #cbd5e1'
              }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  backgroundColor: '#fff7ed',
                  color: '#ea580c',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 14px'
                }}>
                  <MessageSquareWarning size={28} />
                </div>
                <h4 style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: '800', color: '#1e293b' }}>
                  Belum Ada Laporan Kendala
                </h4>
                <p style={{ margin: '0 0 16px', fontSize: '12px', color: '#64748b', lineHeight: 1.5 }}>
                  Anda belum pernah mengajukan masalah absensi. Jika mengalami error sistem atau gagal absen, laporkan segera.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('form')}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#f97316',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Plus size={14} /> Ajukan Kendala Sekarang
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {masalahList.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '16px',
                      padding: '14px 16px',
                      border: '1px solid #f1f5f9',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    {/* Header Card: Nomor Tiket & Status */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: '800',
                        fontFamily: 'monospace',
                        color: '#475569',
                        backgroundColor: '#f1f5f9',
                        padding: '2px 8px',
                        borderRadius: '6px'
                      }}>
                        #{item.nomor_tiket}
                      </span>
                      {renderStatusBadge(item.status)}
                    </div>

                    {/* Judul & Kategori */}
                    <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>
                      {item.judul}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#64748b', marginBottom: '10px' }}>
                      <span style={{ fontWeight: '600', color: '#ea580c' }}>
                        {labelKategori(item)}
                      </span>
                      <span>•</span>
                      <span>{item.tanggal_kejadian_teks}</span>
                      {item.jam_kejadian && <span>({item.jam_kejadian} WIB)</span>}
                    </div>

                    {/* Rangkuman Hasil Tindakan Admin jika sudah diproses */}
                    {item.tindakan_admin && (
                      <div style={{
                        backgroundColor: '#f8fafc',
                        borderRadius: '10px',
                        padding: '8px 10px',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '10px', fontWeight: '700', color: '#475569' }}>Tindakan:</span>
                          {renderTindakanBadge(item.tindakan_admin)}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#0284c7', fontWeight: '700' }}>
                          <span>Detail</span>
                          <Eye size={12} />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL POP-UP DETAIL TIKET */}
      {selectedItem && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(3px)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            width: '100%',
            maxWidth: '480px',
            borderTopLeftRadius: '24px',
            borderTopRightRadius: '24px',
            maxHeight: '88vh',
            overflowY: 'auto',
            padding: '20px 18px 30px',
            boxShadow: '0 -10px 25px rgba(0,0,0,0.1)'
          }}>
            {/* Header Modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
              <div>
                <span style={{
                  fontSize: '10px',
                  fontWeight: '800',
                  fontFamily: 'monospace',
                  color: '#475569',
                  backgroundColor: '#f1f5f9',
                  padding: '2px 8px',
                  borderRadius: '6px'
                }}>
                  #{selectedItem.nomor_tiket}
                </span>
                <h3 style={{ margin: '4px 0 0', fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                  Detail Pengajuan Kendala
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#475569'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Status & Kategori */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <span style={{
                fontSize: '11px',
                fontWeight: '700',
                color: '#c2410c',
                backgroundColor: '#fff7ed',
                padding: '4px 10px',
                borderRadius: '8px',
                border: '1px solid #fed7aa'
              }}>
                {labelKategori(selectedItem)}
              </span>
              {renderStatusBadge(selectedItem.status)}
            </div>

            {/* Judul & Waktu Kejadian */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
                Ringkasan Permasalahan
              </div>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>
                {selectedItem.judul}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={12} />
                <span>Waktu Kejadian: {selectedItem.tanggal_kejadian_teks} {selectedItem.jam_kejadian ? `pukul ${selectedItem.jam_kejadian} WIB` : ''}</span>
              </div>
            </div>

            {/* Deskripsi Kronologi */}
            <div style={{ marginBottom: '16px', backgroundColor: '#f8fafc', padding: '12px 14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                Kronologi / Deskripsi Pegawai:
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: '#1e293b', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                {selectedItem.deskripsi}
              </p>
            </div>

            {/* Foto Bukti jika ada — URL langsung (bila dikirim server) */}
            {selectedItem.foto_bukti && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', marginBottom: '6px' }}>
                  Lampiran Foto Bukti Kendala:
                </div>
                <a
                  href={selectedItem.foto_bukti}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: 'block', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', position: 'relative' }}
                >
                  <img
                    src={selectedItem.foto_bukti}
                    alt="Bukti Kendala"
                    style={{ width: '100%', maxHeight: '220px', objectFit: 'contain', backgroundColor: '#0f172a' }}
                  />
                  <div style={{
                    position: 'absolute',
                    bottom: '8px',
                    right: '8px',
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    color: '#ffffff',
                    fontSize: '10px',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <ExternalLink size={10} /> Buka Gambar Penuh
                  </div>
                </a>
              </div>
            )}

            {/* C1/C20: foto tersimpan tapi tanpa URL langsung -> tombol
                'Lihat Foto' membuka preview via modul='masalah', id tiket. */}
            {!selectedItem.foto_bukti && (selectedItem.foto_ada || !!selectedItem.foto_bukti_id) && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', marginBottom: '6px' }}>
                  Lampiran Foto Bukti Kendala:
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewFoto({ isOpen: true, id: selectedItem.id })}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '11px',
                    fontWeight: '700',
                    color: '#0284c7',
                    backgroundColor: '#e0f2fe',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid #bae6fd',
                    cursor: 'pointer'
                  }}
                >
                  <Eye size={13} /> Lihat Foto Bukti
                </button>
              </div>
            )}

            {/* Keputusan Admin & Solusi */}
            <div style={{
              marginTop: '16px',
              padding: '14px',
              borderRadius: '14px',
              backgroundColor: selectedItem.status === 'selesai' ? '#f0fdf4' : (selectedItem.status === 'ditolak' ? '#fef2f2' : '#f8fafc'),
              border: `1px solid ${selectedItem.status === 'selesai' ? '#bbf7d0' : (selectedItem.status === 'ditolak' ? '#fecaca' : '#e2e8f0')}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{
                  fontSize: '11px',
                  fontWeight: '800',
                  color: selectedItem.status === 'selesai' ? '#15803d' : (selectedItem.status === 'ditolak' ? '#b91c1c' : '#475569')
                }}>
                  Keputusan & Tanggapan Admin
                </span>
                {selectedItem.tindakan_admin && renderTindakanBadge(selectedItem.tindakan_admin)}
              </div>

              {selectedItem.status === 'menunggu' ? (
                <p style={{ margin: 0, fontSize: '11px', color: '#64748b', fontStyle: 'italic' }}>
                  Tiket belum ditinjau oleh administrator. Anda akan menerima tanggapan dan tindakan setelah diverifikasi.
                </p>
              ) : (
                <>
                  <div style={{ fontSize: '12px', color: '#1e293b', lineHeight: 1.5, marginTop: '4px', fontWeight: '500' }}>
                    {selectedItem.catatan_admin || 'Tidak ada catatan tertulis dari admin.'}
                  </div>
                </>
              )}
            </div>

            {/* Tombol Tutup */}
            <button
              type="button"
              onClick={() => setSelectedItem(null)}
              style={{
                marginTop: '16px',
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: '#0f172a',
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
      <DocumentPreviewModal
        isOpen={previewFoto.isOpen}
        onClose={() => setPreviewFoto({ isOpen: false, id: null })}
        modul="masalah"
        id={previewFoto.id}
        title="Foto Bukti Kendala"
      />
    </div>
  );
}
