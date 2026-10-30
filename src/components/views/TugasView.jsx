import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft,
  Briefcase,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle, 
  RefreshCw, 
  ExternalLink, 
  Calendar, 
  User, 
  Users, 
  FileText, 
  FileSpreadsheet, 
  ChevronRight, 
  Send, 
  X, 
  AlertTriangle,
  Download,
  Info
} from 'lucide-react';
import api, { getStoredUser } from '../../services/api';
import { loadDraft, saveDraft, clearDraft, DRAFT_KEYS } from '../../services/draftService';

export default function TugasView({ onBack }) {
  const [activeTab, setActiveTab] = useState('berjalan'); // 'berjalan' | 'selesai' | 'dibatalkan' | 'tim'
  // C7: tab 'Tugas Tim' hanya bila scope=team tidak 403.
  const [showTeamTab, setShowTeamTab] = useState(true);
  const [tugasTim, setTugasTim] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tugasBerjalan, setTugasBerjalan] = useState([]);
  const [tugasSelesai, setTugasSelesai] = useState([]);
  const [tugasDibatalkan, setTugasDibatalkan] = useState([]);
  const [selectedTugas, setSelectedTugas] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState({ type: '', text: '' });
  const [catatanReview, setCatatanReview] = useState('');
  const draftReviewKey = getStoredUser()?.id ? DRAFT_KEYS.tugas_review(getStoredUser().id) : null;

  // Draf catatan review: muat saat detail dibuka, simpan tiap ketik,
  // hapus saat submit sukses (di handleAjukanReview).
  useEffect(() => {
    if (!selectedTugas || !draftReviewKey) return;
    const d = loadDraft(draftReviewKey, {});
    if (d.catatan) setCatatanReview(d.catatan);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTugas?.id]);
  useEffect(() => {
    if (!selectedTugas || !draftReviewKey) return;
    saveDraft(draftReviewKey, { catatan: catatanReview });
    // Disengaja (audit 5 R-A5): dep memakai selectedTugas?.id, bukan
    // objeknya — simpan draf hanya saat id/catatan berubah, bukan
    // tiap identitas objek berganti.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catatanReview, draftReviewKey, selectedTugas?.id]);

  const loadData = async () => {
    setIsLoading(true);
    setActionMessage({ type: '', text: '' });
    try {
      const res = await api.getPenugasan();
      if (res.success) {
        // Label/kartu dihitung dari panjang daftar nyata (bukan
        // statistik server yang hanya menghitung status 'berjalan').
        setTugasBerjalan(res.tugas_berjalan || []);
        setTugasSelesai(res.tugas_selesai || []);
        setTugasDibatalkan(res.tugas_dibatalkan || []);
      }
    } catch (err) {
      console.error('Gagal memuat data penugasan:', err);
      setActionMessage({ type: 'error', text: 'Gagal memuat daftar penugasan.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // C7: coba muat tugas tim; 403 -> sembunyikan tab (bukan error).
    api.getPenugasan({ scope: 'team' }).then((res) => {
      if (res.success) setTugasTim(res.tugas_tim || []);
    }).catch((err) => {
      const msg = err?.message || '';
      if (err?.status === 403 || err?.code === 'FORBIDDEN' || msg.includes('403')) {
        setShowTeamTab(false);
        if (activeTab === 'tim') setActiveTab('berjalan');
      }
    // Mount-only disengaja (audit 5 R-A5): loader didefinisikan ulang
    // tiap render; mendaftarkannya sebagai dep memicu fetch berulang.
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAjukanReview = async (tugasId) => {
    if (!window.confirm('Ajukan tugas ini untuk direview dan dinilai oleh atasan?')) return;

    setIsSubmitting(true);
    try {
      const res = await api.updateStatusPenugasan(tugasId, {
        status: 'menunggu_review',
        catatan: catatanReview.trim() || undefined
      });

      if (res.success) {
        alert(res.message || 'Tugas berhasil diajukan untuk evaluasi atasan!');
        if (draftReviewKey) clearDraft(draftReviewKey);
        setCatatanReview('');
        setSelectedTugas(null);
        await loadData();
      }
    } catch (err) {
      alert(err.message || 'Gagal mengajukan review tugas.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMediaBadge = (tipe) => {
    if (tipe === 'spreadsheet') {
      return {
        label: 'Google Sheets',
        icon: FileSpreadsheet,
        color: '#059669',
        bg: '#ecfdf5',
        border: '#a7f3d0'
      };
    }
    if (tipe === 'dokumen_online') {
      return {
        label: 'Google Docs',
        icon: FileText,
        color: '#2563eb',
        bg: '#eff6ff',
        border: '#bfdbfe'
      };
    }
    return {
      label: 'Upload Dokumen',
      icon: FileText,
      color: '#ea580c',
      bg: '#fff7ed',
      border: '#fed7aa'
    };
  };

  const currentList = activeTab === 'berjalan' ? tugasBerjalan : (activeTab === 'selesai' ? tugasSelesai : (activeTab === 'dibatalkan' ? tugasDibatalkan : tugasTim));

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: '#f8fafc',
      position: 'relative',
      overflow: 'hidden'
    }}>
      
      {/* Top Header */}
      <div style={{
        padding: '16px 20px',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        zIndex: 20
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={onBack}
            className="btn-back-action"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '12px',
              backgroundColor: '#f1f5f9',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#334155',
              cursor: 'pointer'
            }}
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              Penugasan Kerja
            </h2>
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              Daftar Tugas & Kolaborasi Tim
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={isLoading}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '12px',
            backgroundColor: '#f1f5f9',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#334155',
            cursor: 'pointer'
          }}
          title="Muat Ulang Data"
        >
          <RefreshCw size={17} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Konten Scrollable */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px 16px 30px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
      }}>

        {/* Ringkasan Metrik Kartu */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '8px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            padding: '12px 10px',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}>
            <span style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', display: 'block' }}>
              Semua
            </span>
            <span style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a', marginTop: '2px', display: 'block' }}>
              {tugasBerjalan.length + tugasSelesai.length + tugasDibatalkan.length}
            </span>
          </div>

          <div 
            onClick={() => setActiveTab('berjalan')}
            style={{
              backgroundColor: activeTab === 'berjalan' ? '#eff6ff' : '#ffffff',
              padding: '12px 10px',
              borderRadius: '14px',
              border: activeTab === 'berjalan' ? '1.5px solid #3b82f6' : '1px solid #e2e8f0',
              textAlign: 'center',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}
          >
            <span style={{ fontSize: '10px', fontWeight: '700', color: '#2563eb', textTransform: 'uppercase', display: 'block' }}>
              Berjalan
            </span>
            <span style={{ fontSize: '18px', fontWeight: '900', color: '#2563eb', marginTop: '2px', display: 'block' }}>
              {tugasBerjalan.length}
            </span>
          </div>

          <div 
            onClick={() => setActiveTab('selesai')}
            style={{
              backgroundColor: activeTab === 'selesai' ? '#ecfdf5' : '#ffffff',
              padding: '12px 10px',
              borderRadius: '14px',
              border: activeTab === 'selesai' ? '1.5px solid #10b981' : '1px solid #e2e8f0',
              textAlign: 'center',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}
          >
            <span style={{ fontSize: '10px', fontWeight: '700', color: '#059669', textTransform: 'uppercase', display: 'block' }}>
              Selesai
            </span>
            <span style={{ fontSize: '18px', fontWeight: '900', color: '#059669', marginTop: '2px', display: 'block' }}>
              {tugasSelesai.length}
            </span>
          </div>
        </div>

        {/* Segmented Control Tabs */}
        <div style={{
          backgroundColor: '#e2e8f0',
          padding: '4px',
          borderRadius: '12px',
          display: 'grid',
          gridTemplateColumns: showTeamTab ? '1fr 1fr 1fr 1fr' : '1fr 1fr 1fr',
          gap: '4px'
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('berjalan')}
            style={{
              padding: '9px 12px',
              borderRadius: '9px',
              border: 'none',
              backgroundColor: activeTab === 'berjalan' ? '#ffffff' : 'transparent',
              color: activeTab === 'berjalan' ? '#0f172a' : '#64748b',
              fontSize: '12px',
              fontWeight: '800',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: activeTab === 'berjalan' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <Clock size={15} color={activeTab === 'berjalan' ? '#2563eb' : '#64748b'} />
            <span>Tugas Berjalan ({tugasBerjalan.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('selesai')}
            style={{
              padding: '9px 12px',
              borderRadius: '9px',
              border: 'none',
              backgroundColor: activeTab === 'selesai' ? '#ffffff' : 'transparent',
              color: activeTab === 'selesai' ? '#0f172a' : '#64748b',
              fontSize: '12px',
              fontWeight: '800',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: activeTab === 'selesai' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <CheckCircle2 size={15} color={activeTab === 'selesai' ? '#10b981' : '#64748b'} />
            <span>Tugas Selesai ({tugasSelesai.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('dibatalkan')}
            style={{
              padding: '9px 12px',
              borderRadius: '9px',
              border: 'none',
              backgroundColor: activeTab === 'dibatalkan' ? '#ffffff' : 'transparent',
              color: activeTab === 'dibatalkan' ? '#0f172a' : '#64748b',
              fontSize: '12px',
              fontWeight: '800',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: activeTab === 'dibatalkan' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <XCircle size={15} color={activeTab === 'dibatalkan' ? '#dc2626' : '#64748b'} />
            <span>Tugas Dibatalkan ({tugasDibatalkan.length})</span>
          </button>

          {showTeamTab && (
            <button
              type="button"
              onClick={() => setActiveTab('tim')}
              style={{
                padding: '9px 12px',
                borderRadius: '9px',
                border: 'none',
                backgroundColor: activeTab === 'tim' ? '#ffffff' : 'transparent',
                color: activeTab === 'tim' ? '#0f172a' : '#64748b',
                fontSize: '12px',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: activeTab === 'tim' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              <Users size={15} color={activeTab === 'tim' ? '#7c3aed' : '#64748b'} />
              <span>Tugas Tim ({tugasTim.length})</span>
            </button>
          )}
        </div>

        {/* Notifikasi Alert Error/Info */}
        {actionMessage.text && (
          <div style={{
            padding: '10px 14px',
            borderRadius: '12px',
            backgroundColor: actionMessage.type === 'error' ? '#fef2f2' : '#f0fdf4',
            border: `1px solid ${actionMessage.type === 'error' ? '#fecaca' : '#bbf7d0'}`,
            color: actionMessage.type === 'error' ? '#b91c1c' : '#15803d',
            fontSize: '12px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={16} />
            <span>{actionMessage.text}</span>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            <div className="animate-spin" style={{
              width: '32px',
              height: '32px',
              border: '3px solid #ea580c',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              margin: '0 auto 12px auto'
            }}></div>
            <span style={{ fontSize: '12px', fontWeight: '600' }}>Memuat daftar penugasan...</span>
          </div>
        ) : currentList.length === 0 ? (
          /* Empty State */
          <div style={{
            padding: '40px 20px',
            textAlign: 'center',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1px dashed #cbd5e1',
            margin: '10px 0'
          }}>
            <div style={{
              width: '54px',
              height: '54px',
              borderRadius: '16px',
              backgroundColor: activeTab === 'berjalan' ? '#eff6ff' : (activeTab === 'dibatalkan' ? '#fef2f2' : '#ecfdf5'),
              color: activeTab === 'berjalan' ? '#3b82f6' : (activeTab === 'dibatalkan' ? '#dc2626' : '#10b981'),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px auto'
            }}>
              {activeTab === 'berjalan' ? <Briefcase size={26} /> : (activeTab === 'dibatalkan' ? <XCircle size={26} /> : <CheckCircle2 size={26} />)}
            </div>
            <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b', margin: '0 0 4px 0' }}>
              {activeTab === 'berjalan' ? 'Tidak Ada Tugas Berjalan' : (activeTab === 'dibatalkan' ? 'Tidak Ada Tugas Dibatalkan' : 'Belum Ada Tugas Selesai')}
            </h4>
            <p style={{ fontSize: '11px', color: '#64748b', margin: 0, maxWidth: '280px', marginInline: 'auto' }}>
              {activeTab === 'berjalan'
                ? 'Semua penugasan dari atasan telah selesai atau belum ada tugas baru untuk Anda.'
                : (activeTab === 'dibatalkan'
                  ? 'Penugasan yang dibatalkan atasan akan muncul di sini.'
                  : 'Daftar penugasan yang telah diselesaikan dan disetujui atasan akan muncul di sini.')}
            </p>
          </div>
        ) : (
          /* List Kartu Penugasan */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {currentList.map((tugas) => {
              const media = getMediaBadge(tugas.tipe_media);
              const MediaIcon = media.icon;

              return (
                <div
                  key={tugas.id}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    padding: '16px',
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    position: 'relative'
                  }}
                >
                  {/* Top Bar Card: Kode & Badges */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', fontFamily: 'monospace' }}>
                      {tugas.kode_penugasan}
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {/* Prioritas Badge */}
                      <span style={{
                        fontSize: '9px',
                        fontWeight: '800',
                        padding: '2px 7px',
                        borderRadius: '9999px',
                        backgroundColor: tugas.badge_prioritas?.bg || '#f1f5f9',
                        color: tugas.badge_prioritas?.text || '#334155',
                        border: `1px solid ${tugas.badge_prioritas?.border || '#cbd5e1'}`,
                        textTransform: 'uppercase'
                      }}>
                        {tugas.badge_prioritas?.label || tugas.prioritas}
                      </span>

                      {/* Status Badge */}
                      <span style={{
                        fontSize: '9px',
                        fontWeight: '800',
                        padding: '2px 7px',
                        borderRadius: '9999px',
                        backgroundColor: tugas.badge_status?.bg || '#f1f5f9',
                        color: tugas.badge_status?.text || '#334155',
                        border: `1px solid ${tugas.badge_status?.border || '#cbd5e1'}`,
                        textTransform: 'uppercase'
                      }}>
                        {tugas.badge_status?.label || tugas.status}
                      </span>
                    </div>
                  </div>

                  {/* Judul & Deskripsi Tugas */}
                  <div>
                    <h3 
                      onClick={() => setSelectedTugas(tugas)}
                      style={{
                        fontSize: '14px',
                        fontWeight: '800',
                        color: '#0f172a',
                        margin: '0 0 6px 0',
                        cursor: 'pointer',
                        lineHeight: 1.4
                      }}
                    >
                      {tugas.judul}
                    </h3>
                    <p style={{
                      fontSize: '11px',
                      color: '#64748b',
                      margin: 0,
                      lineHeight: 1.5,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {tugas.deskripsi || 'Tidak ada deskripsi rincian khusus.'}
                    </p>
                  </div>

                  {/* Info Metadata: Media & Atasan & Tenggat Waktu */}
                  <div style={{
                    paddingTop: '10px',
                    borderTop: '1px solid #f1f5f9',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    fontSize: '11px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      {/* Media Tag */}
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        backgroundColor: media.bg,
                        color: media.color,
                        border: `1px solid ${media.border}`,
                        fontWeight: '700',
                        fontSize: '10px'
                      }}>
                        <MediaIcon size={12} />
                        <span>{media.label}</span>
                      </div>

                      {/* Atasan Info */}
                      <div style={{ color: '#475569', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <User size={12} color="#94a3b8" />
                        <span>Oleh: <strong>{tugas.atasan?.nama_lengkap || '-'}</strong></span>
                      </div>
                    </div>

                    {/* Deadline Waktu */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: '2px'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        color: tugas.is_terlambat ? '#dc2626' : '#64748b',
                        fontWeight: tugas.is_terlambat ? '800' : '500'
                      }}>
                        <Calendar size={13} color={tugas.is_terlambat ? '#dc2626' : '#94a3b8'} />
                        <span>Batas: {tugas.tenggat_waktu_formatted || '-'}</span>
                        {tugas.is_terlambat && (
                          <span style={{ fontSize: '9px', color: '#dc2626', backgroundColor: '#fee2e2', padding: '1px 5px', borderRadius: '4px' }}>
                            Lewat Batas
                          </span>
                        )}
                      </div>

                      {/* Tim Anggota Count — hanya bila server mengirim anggota */}
                      {tugas.anggota && tugas.anggota.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#64748b' }}>
                          <Users size={12} color="#94a3b8" />
                          <span>{tugas.anggota.length} Pelaksana</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tombol Aksi Bawah */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    paddingTop: '6px'
                  }}>
                    {/* Buka Tautan Eksternal Jika Ada */}
                    {tugas.tautan_eksternal && (
                      <a
                        href={tugas.tautan_eksternal}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          borderRadius: '10px',
                          backgroundColor: '#f1f5f9',
                          color: '#1e293b',
                          fontSize: '11px',
                          fontWeight: '700',
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '5px',
                          border: '1px solid #e2e8f0'
                        }}
                      >
                        <ExternalLink size={13} color="#2563eb" />
                        <span>Buka {media.label}</span>
                      </a>
                    )}

                    {/* Tombol Detail Lengkap */}
                    <button
                      type="button"
                      onClick={() => setSelectedTugas(tugas)}
                      style={{
                        flex: tugas.tautan_eksternal ? '0 0 auto' : 1,
                        padding: '8px 14px',
                        borderRadius: '10px',
                        backgroundColor: '#0f172a',
                        color: '#ffffff',
                        fontSize: '11px',
                        fontWeight: '800',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px'
                      }}
                    >
                      <span>Rincian</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}

        {/* Spacer anti-bottom-nav (elemen nyata, bukan padding):
            TugasView punya scroller sendiri (flex column + overflow-y
            auto) sehingga spacer bersama di DashboardPage tidak
            menolong halaman ini — padding-bottom scroller ini pun
            diabaikan Chrome/WebView dengan alasan yang sama.
            Tinggi = tinggi visual nav + jarak aman, sama seperti
            spacer di DashboardPage. */}
        <div aria-hidden="true" style={{ height: 'calc(112px + env(safe-area-inset-bottom, 0px))', flexShrink: 0 }} />
      </div>

      {/* MODAL DETAIL PENUGASAN LENGKAP */}
      {selectedTugas && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(4px)',
          zIndex: 60,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderTopLeftRadius: '24px',
            borderTopRightRadius: '24px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 -10px 30px rgba(0,0,0,0.2)'
          }}>
            
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0
            }}>
              <div>
                <span style={{ fontSize: '10px', fontWeight: '800', color: '#64748b', fontFamily: 'monospace' }}>
                  {selectedTugas.kode_penugasan}
                </span>
                <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: '2px 0 0 0' }}>
                  Detail Penugasan
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTugas(null)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
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

            {/* Modal Body Scrollable */}
            <div style={{
              padding: '20px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              fontSize: '12px'
            }}>
              {/* Judul & Status */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: '800',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    backgroundColor: selectedTugas.badge_prioritas?.bg || '#f1f5f9',
                    color: selectedTugas.badge_prioritas?.text || '#334155',
                    border: `1px solid ${selectedTugas.badge_prioritas?.border || '#cbd5e1'}`
                  }}>
                    Prioritas {selectedTugas.badge_prioritas?.label || selectedTugas.prioritas}
                  </span>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: '800',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    backgroundColor: selectedTugas.badge_status?.bg || '#f1f5f9',
                    color: selectedTugas.badge_status?.text || '#334155',
                    border: `1px solid ${selectedTugas.badge_status?.border || '#cbd5e1'}`
                  }}>
                    {selectedTugas.badge_status?.label || selectedTugas.status}
                  </span>
                </div>
                <h2 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                  {selectedTugas.judul}
                </h2>
              </div>

              {/* Deskripsi */}
              <div style={{
                backgroundColor: '#f8fafc',
                padding: '12px 14px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0'
              }}>
                <span style={{ fontSize: '10px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                  Deskripsi / Instruksi Tugas:
                </span>
                <p style={{ margin: 0, color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                  {selectedTugas.deskripsi || 'Tidak ada instruksi khusus.'}
                </p>
              </div>

              {/* Tautan Dokumen Eksternal (Google Sheets / Docs) */}
              {selectedTugas.tautan_eksternal && (
                <div style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  backgroundColor: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px'
                }}>
                  <div>
                    <span style={{ fontSize: '10px', fontWeight: '800', color: '#1d4ed8', textTransform: 'uppercase', display: 'block' }}>
                      Dokumen Pengerjaan Resmi:
                    </span>
                    <span style={{ fontSize: '11px', color: '#1e40af', wordBreak: 'break-all' }}>
                      {selectedTugas.tipe_media === 'spreadsheet' ? 'Google Spreadsheet' : 'Google Docs'}
                    </span>
                  </div>
                  <a
                    href={selectedTugas.tautan_eksternal}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      fontWeight: '800',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11px',
                      flexShrink: 0
                    }}
                  >
                    <span>Buka</span>
                    <ExternalLink size={13} />
                  </a>
                </div>
              )}

              {/* Atasan & Deadline Info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', padding: '10px 12px', borderRadius: '12px' }}>
                  <span style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', display: 'block' }}>Atasan Pembuat:</span>
                  <span style={{ fontWeight: '800', color: '#0f172a', display: 'block', marginTop: '2px' }}>
                    {selectedTugas.atasan?.nama_lengkap || '-'}
                  </span>
                  <span style={{ fontSize: '10px', color: '#94a3b8' }}>{selectedTugas.atasan?.jabatan || ''}</span>
                </div>

                <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', padding: '10px 12px', borderRadius: '12px' }}>
                  <span style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', display: 'block' }}>Tenggat Waktu:</span>
                  <span style={{ fontWeight: '800', color: selectedTugas.is_terlambat ? '#dc2626' : '#0f172a', display: 'block', marginTop: '2px' }}>
                    {selectedTugas.tenggat_waktu_formatted || '-'}
                  </span>
                  <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                    {selectedTugas.is_terlambat ? 'Terlambat' : 'Tenggat Normal'}
                  </span>
                </div>
              </div>

              {/* Anggota Tim Pelaksana */}
              <div>
                <span style={{ fontSize: '11px', fontWeight: '800', color: '#0f172a', display: 'block', marginBottom: '8px' }}>
                  Anggota Tim Pelaksana ({selectedTugas.anggota?.length || 0}):
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {selectedTugas.anggota?.map((ang) => (
                    <div key={ang.id} style={{
                      padding: '8px 10px',
                      borderRadius: '8px',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '8px',
                          backgroundColor: '#ffedd5',
                          color: '#ea580c',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '800',
                          fontSize: '11px'
                        }}>
                          {ang.nama_lengkap.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <span style={{ fontWeight: '700', color: '#1e293b', display: 'block', fontSize: '11px' }}>
                            {ang.nama_lengkap}
                          </span>
                          <span style={{ fontSize: '10px', color: '#64748b' }}>{ang.jabatan}</span>
                        </div>
                      </div>
                      <span style={{
                        fontSize: '9px',
                        fontWeight: '700',
                        color: ang.peran === 'koordinator' ? '#7c3aed' : '#475569',
                        backgroundColor: ang.peran === 'koordinator' ? '#ede9fe' : '#f1f5f9',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        textTransform: 'capitalize'
                      }}>
                        {ang.peran}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Berkas Lampiran Dokumen Jika Ada */}
              {selectedTugas.dokumen_list && selectedTugas.dokumen_list.length > 0 && (
                <div>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: '#0f172a', display: 'block', marginBottom: '8px' }}>
                    Berkas Lampiran ({selectedTugas.dokumen_list.length}):
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {selectedTugas.dokumen_list.map((dok) => (
                      <a
                        key={dok.id}
                        href={dok.download_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          padding: '8px 12px',
                          borderRadius: '8px',
                          backgroundColor: '#f1f5f9',
                          textDecoration: 'none',
                          color: '#334155',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          border: '1px solid #e2e8f0',
                          fontSize: '11px'
                        }}
                      >
                        <span style={{ fontWeight: '600', truncate: true }}>📎 {dok.nama_asli}</span>
                        <Download size={14} color="#ea580c" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Catatan Evaluasi Atasan (Jika Ada) */}
              {selectedTugas.catatan_atasan && (
                <div style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  backgroundColor: '#fffbeb',
                  border: '1px solid #fde68a'
                }}>
                  <span style={{ fontSize: '10px', fontWeight: '800', color: '#b45309', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                    Catatan Evaluasi Atasan:
                  </span>
                  <p style={{ margin: 0, color: '#92400e', lineHeight: 1.5 }}>
                    {selectedTugas.catatan_atasan}
                  </p>
                </div>
              )}

              {/* Form Ajukan Review HANYA untuk status berjalan
                  (dibatalkan/selesai/menunggu_review tidak boleh). */}
              {selectedTugas.status === 'berjalan' && (
                <div style={{
                  padding: '14px',
                  borderRadius: '14px',
                  backgroundColor: '#f8fafc',
                  border: '1.5px solid #cbd5e1',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  marginTop: '6px'
                }}>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: '#0f172a' }}>
                    Ajukan Selesai ke Atasan:
                  </span>
                  <textarea
                    rows={2}
                    value={catatanReview}
                    onChange={(e) => setCatatanReview(e.target.value)}
                    placeholder="Tulis catatan pengerjaan atau pesan untuk atasan (opsional)..."
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '12px',
                      fontFamily: 'inherit',
                      resize: 'none',
                      outline: 'none'
                    }}
                  />
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleAjukanReview(selectedTugas.id)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #ea580c, #c2410c)',
                      border: 'none',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      boxShadow: '0 4px 12px rgba(234, 88, 12, 0.25)'
                    }}
                  >
                    <Send size={14} />
                    <span>{isSubmitting ? 'Mengirim...' : 'Kirim & Ajukan Review'}</span>
                  </button>
                </div>
              )}

            </div>

            {/* Modal Footer Close */}
            <div style={{
              padding: '12px 20px',
              borderTop: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              textAlign: 'right'
            }}>
              <button
                type="button"
                onClick={() => setSelectedTugas(null)}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontWeight: '700',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Tutup
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
