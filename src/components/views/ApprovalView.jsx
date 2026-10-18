import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, CheckCircle2, XCircle, Clock, AlertCircle, FileText, 
  Calendar, MapPin, Briefcase, ChevronRight, User, ShieldCheck, 
  Paperclip, ExternalLink, MessageSquare, Check, X, RefreshCw, Eye
} from 'lucide-react';
import api from '../../services/api';
import DocumentPreviewModal from '../DocumentPreviewModal';

export default function ApprovalView({ onBack }) {
  const [activeTab, setActiveTab] = useState('menunggu'); // 'menunggu' | 'riwayat'
  const [filterModul, setFilterModul] = useState('semua');
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successToast, setSuccessToast] = useState('');
  const [previewModal, setPreviewModal] = useState({ isOpen: false, modul: '', id: null, title: '' });

  // Modal Aksi
  const [actionModal, setActionModal] = useState({
    isOpen: false,
    item: null,
    type: 'setuju', // 'setuju' | 'tolak'
    catatan: '',
    isSubmitting: false,
    errorMessage: '',
  });

  const loadApprovals = async (tab = activeTab) => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await api.getApprovals(tab);
      if (res.success) {
        setItems(res.data || []);
      } else {
        setErrorMsg(res.message || 'Gagal memuat daftar pengajuan approval.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Terjadi gangguan jaringan saat memuat pengajuan.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadApprovals(activeTab);
  }, [activeTab]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadApprovals(activeTab);
  };

  const openActionModal = (item, type) => {
    setActionModal({
      isOpen: true,
      item,
      type,
      catatan: '',
      isSubmitting: false,
      errorMessage: '',
    });
  };

  const closeActionModal = () => {
    if (actionModal.isSubmitting) return;
    setActionModal({
      isOpen: false,
      item: null,
      type: 'setuju',
      catatan: '',
      isSubmitting: false,
      errorMessage: '',
    });
  };

  const handleExecuteAction = async () => {
    if (!actionModal.item) return;

    if (actionModal.type === 'tolak' && !actionModal.catatan.trim()) {
      setActionModal(prev => ({ ...prev, errorMessage: 'Harap sertakan alasan atau catatan penolakan.' }));
      return;
    }

    setActionModal(prev => ({ ...prev, isSubmitting: true, errorMessage: '' }));

    try {
      const res = await api.submitApprovalAction(actionModal.item.id, {
        aksi: actionModal.type,
        catatan: actionModal.catatan.trim() || (actionModal.type === 'setuju' ? 'Disetujui' : 'Ditolak'),
      });

      if (res.success) {
        setSuccessToast(res.message || 'Persetujuan pengajuan berhasil diproses.');
        setTimeout(() => setSuccessToast(''), 4000);
        closeActionModal();
        loadApprovals(activeTab);
      } else {
        setActionModal(prev => ({ ...prev, isSubmitting: false, errorMessage: res.message || 'Gagal memproses aksi.' }));
      }
    } catch (err) {
      setActionModal(prev => ({ ...prev, isSubmitting: false, errorMessage: err.message || 'Terjadi kesalahan sistem.' }));
    }
  };

  // Filter items berdasarkan modul
  const filteredItems = items.filter(item => {
    if (filterModul === 'semua') return true;
    if (filterModul === 'izin_cuti') return item.modul === 'izin' || item.modul === 'cuti';
    return item.modul === filterModul;
  });

  const getModulBadge = (modul) => {
    switch (modul) {
      case 'izin':
      case 'cuti':
        return {
          bg: '#ecfdf5',
          border: '#a7f3d0',
          text: '#047857',
          label: modul === 'cuti' ? 'Cuti Karyawan' : 'Izin / Sakit',
        };
      case 'dinas':
        return {
          bg: '#eff6ff',
          border: '#bfdbfe',
          text: '#1d4ed8',
          label: 'Dinas Luar',
        };
      case 'lembur':
        return {
          bg: '#fffbeb',
          border: '#fde68a',
          text: '#b45309',
          label: 'Lembur Pegawai',
        };
      case 'reimbursement':
        return {
          bg: '#f0fdf4',
          border: '#bbf7d0',
          text: '#15803d',
          label: 'Klaim Reimbursement',
        };
      default:
        return {
          bg: '#f8fafc',
          border: '#e2e8f0',
          text: '#475569',
          label: modul,
        };
    }
  };

  return (
    <div style={{
      minHeight: '100%',
      backgroundColor: '#f8fafc',
      paddingBottom: '90px',
      animation: 'fadeIn 0.2s ease-out',
    }}>
      {/* Header Sticky */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button 
            type="button" 
            onClick={onBack}
            className="btn-back-action"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              backgroundColor: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#334155'
            }}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: 0, lineHeight: 1.2 }}>
              Persetujuan Pengajuan
            </h2>
            <p style={{ fontSize: '11px', color: '#64748b', margin: 0, fontWeight: '500' }}>
              Alur Approval Bertingkat Mobile
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          style={{
            padding: '7px 10px',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
            color: '#475569',
            fontSize: '11px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
          <span>Muat Ulang</span>
        </button>
      </div>

      {/* Toast Notifikasi Sukses */}
      {successToast && (
        <div style={{
          margin: '12px 16px',
          padding: '10px 14px',
          borderRadius: '12px',
          backgroundColor: '#ecfdf5',
          border: '1px solid #a7f3d0',
          color: '#065f46',
          fontSize: '12px',
          fontWeight: '700',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 2px 6px rgba(16, 185, 129, 0.15)'
        }}>
          <CheckCircle2 size={16} color="#059669" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Tabs Pilihan: Menunggu vs Riwayat */}
      <div style={{ padding: '12px 16px 6px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '6px',
          backgroundColor: '#e2e8f0',
          padding: '4px',
          borderRadius: '14px'
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('menunggu')}
            style={{
              padding: '9px 12px',
              borderRadius: '11px',
              border: 'none',
              backgroundColor: activeTab === 'menunggu' ? '#ffffff' : 'transparent',
              color: activeTab === 'menunggu' ? '#0f172a' : '#64748b',
              fontSize: '12px',
              fontWeight: '800',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: activeTab === 'menunggu' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <Clock size={14} color={activeTab === 'menunggu' ? '#ea580c' : '#64748b'} />
            <span>Menunggu Approval</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('riwayat')}
            style={{
              padding: '9px 12px',
              borderRadius: '11px',
              border: 'none',
              backgroundColor: activeTab === 'riwayat' ? '#ffffff' : 'transparent',
              color: activeTab === 'riwayat' ? '#0f172a' : '#64748b',
              fontSize: '12px',
              fontWeight: '800',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: activeTab === 'riwayat' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <CheckCircle2 size={14} color={activeTab === 'riwayat' ? '#059669' : '#64748b'} />
            <span>Riwayat Aksi</span>
          </button>
        </div>

        {/* Filter Chip Modul */}
        <div style={{
          display: 'flex',
          gap: '6px',
          overflowX: 'auto',
          paddingTop: '10px',
          paddingBottom: '4px'
        }}>
          {[
            { id: 'semua', label: 'Semua' },
            { id: 'izin_cuti', label: 'Izin & Cuti' },
            { id: 'lembur', label: 'Lembur' },
            { id: 'dinas', label: 'Dinas Luar' },
            { id: 'reimbursement', label: 'Reimbursement' },
          ].map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilterModul(f.id)}
              style={{
                padding: '5px 12px',
                borderRadius: '999px',
                fontSize: '11px',
                fontWeight: '700',
                border: filterModul === f.id ? '1.5px solid #ea580c' : '1px solid #cbd5e1',
                backgroundColor: filterModul === f.id ? '#fff7ed' : '#ffffff',
                color: filterModul === f.id ? '#c2410c' : '#475569',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Konten Daftar Pengajuan */}
      <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {isLoading ? (
          <div style={{
            padding: '40px 20px',
            textAlign: 'center',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            color: '#64748b',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px'
          }}>
            <RefreshCw size={24} className="animate-spin text-orange-500" />
            <span style={{ fontSize: '12px', fontWeight: '600' }}>Memuat daftar pengajuan...</span>
          </div>
        ) : errorMsg ? (
          <div style={{
            padding: '24px 16px',
            textAlign: 'center',
            backgroundColor: '#fff1f2',
            borderRadius: '16px',
            border: '1px solid #fecdd3',
            color: '#be123c',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={24} />
            <span style={{ fontSize: '12px', fontWeight: '700' }}>{errorMsg}</span>
            <button
              type="button"
              onClick={() => loadApprovals(activeTab)}
              style={{
                marginTop: '4px',
                padding: '6px 14px',
                borderRadius: '8px',
                backgroundColor: '#e11d48',
                border: 'none',
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Coba Lagi
            </button>
          </div>
        ) : filteredItems.length === 0 ? (
          <div style={{
            padding: '48px 20px',
            textAlign: 'center',
            backgroundColor: '#ffffff',
            borderRadius: '18px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px'
          }}>
            <div style={{
              width: '54px',
              height: '54px',
              borderRadius: '16px',
              backgroundColor: '#f1f5f9',
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <ShieldCheck size={28} />
            </div>
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b', margin: 0 }}>
                {activeTab === 'menunggu' ? 'Tidak Ada Pengajuan Menunggu' : 'Belum Ada Riwayat Aksi'}
              </h4>
              <p style={{ fontSize: '11px', color: '#64748b', margin: '4px 0 0', maxWidth: '280px', lineHeight: 1.4 }}>
                {activeTab === 'menunggu' 
                  ? 'Saat ini tidak ada pengajuan izin, cuti, lembur, atau dinas yang menugaskan Anda sebagai approver aktif.' 
                  : 'Pengajuan yang telah Anda setujui atau tolak akan tercatat rapi di halaman ini.'}
              </p>
            </div>
          </div>
        ) : (
          filteredItems.map(item => {
            const badge = getModulBadge(item.modul);
            const pemohon = item.pemohon || {};
            const detail = item.detail || {};

            return (
              <div 
                key={item.id}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '16px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0'
                }}
              >
                {/* Header Card: Modul Badge & Tahapan Step */}
                <div style={{
                  padding: '12px 14px',
                  borderBottom: '1px solid #f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#fcfcfd'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: '800',
                      padding: '3px 8px',
                      borderRadius: '8px',
                      backgroundColor: badge.bg,
                      color: badge.text,
                      border: `1px solid ${badge.border}`
                    }}>
                      {detail.jenis_pengajuan || badge.label}
                    </span>
                    <span style={{ fontSize: '10px', color: '#94a3b8' }}>•</span>
                    <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '600' }}>
                      {item.created_at || '-'}
                    </span>
                  </div>

                  <span style={{
                    fontSize: '10px',
                    fontWeight: '800',
                    color: item.status === 'disetujui' ? '#059669' : (item.status === 'ditolak' ? '#dc2626' : '#ea580c'),
                    backgroundColor: item.status === 'disetujui' ? '#ecfdf5' : (item.status === 'ditolak' ? '#fef2f2' : '#fff7ed'),
                    padding: '2px 8px',
                    borderRadius: '6px'
                  }}>
                    {item.status === 'menunggu' 
                      ? `Tahap ${item.step_ke} dari ${item.total_step}` 
                      : (item.status === 'disetujui' ? 'Telah Disetujui' : 'Telah Ditolak')}
                  </span>
                </div>

                {/* Profil Pemohon */}
                <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    backgroundColor: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#64748b',
                    fontWeight: '800',
                    fontSize: '14px',
                    flexShrink: 0,
                    overflow: 'hidden'
                  }}>
                    {pemohon.foto ? (
                      <img src={pemohon.foto} alt={pemohon.nama} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span>{(pemohon.nama || '?').slice(0, 2).toUpperCase()}</span>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {pemohon.nama || 'Nama Pegawai'}
                    </h4>
                    <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {pemohon.jabatan} • {pemohon.departemen}
                    </p>
                    <span style={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace' }}>
                      NIP: {pemohon.nip || '-'}
                    </span>
                  </div>
                </div>

                {/* Detail Rincian Pengajuan */}
                <div style={{
                  margin: '0 14px 12px',
                  padding: '10px 12px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '12px',
                  border: '1px solid #f1f5f9',
                  fontSize: '11px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                  {/* Tanggal / Periode (jika bukan reimbursement) */}
                  {item.modul !== 'reimbursement' && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Waktu Pelaksanaan:</span>
                      <span style={{ fontWeight: '700', color: '#0f172a' }}>
                        {detail.tanggal_lembur ? (
                          `${detail.tanggal_lembur} (${detail.jam_mulai} - ${detail.jam_selesai})`
                        ) : (
                          `${detail.tanggal_mulai || '-'} s/d ${detail.tanggal_selesai || '-'}`
                        )}
                      </span>
                    </div>
                  )}

                  {/* Khusus Reimbursement */}
                  {item.modul === 'reimbursement' && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b' }}>Nominal Biaya:</span>
                        <span style={{ fontWeight: '800', color: '#16a34a', fontSize: '13px' }}>{detail.nominal}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b' }}>Tanggal Nota:</span>
                        <span style={{ fontWeight: '700', color: '#0f172a' }}>{detail.tanggal_kuitansi || '-'}</span>
                      </div>
                    </>
                  )}

                  {/* Durasi */}
                  {detail.durasi && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Durasi:</span>
                      <span style={{ fontWeight: '700', color: '#0f172a' }}>{detail.durasi}</span>
                    </div>
                  )}

                  {/* Kota / Instansi Khusus Dinas */}
                  {item.modul === 'dinas' && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b' }}>Tujuan Dinas:</span>
                        <span style={{ fontWeight: '700', color: '#0f172a' }}>{detail.kota_tujuan} - {detail.instansi_tujuan}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b' }}>Anggaran:</span>
                        <span style={{ fontWeight: '700', color: '#059669' }}>{detail.anggaran_biaya}</span>
                      </div>
                    </>
                  )}

                  {/* Estimasi Upah Lembur */}
                  {item.modul === 'lembur' && detail.estimasi_upah && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Estimasi Upah:</span>
                      <span style={{ fontWeight: '700', color: '#d97706' }}>{detail.estimasi_upah}</span>
                    </div>
                  )}

                  {/* Keterangan / Alasan */}
                  <div style={{ marginTop: '2px', paddingTop: '6px', borderTop: '1px dashed #e2e8f0' }}>
                    <span style={{ color: '#64748b', display: 'block', marginBottom: '2px' }}>Alasan / Uraian Tugas:</span>
                    <p style={{ margin: 0, color: '#334155', fontWeight: '500', lineHeight: 1.4 }}>
                      "{detail.keterangan || '-'}"
                    </p>
                  </div>

                  {/* Lampiran Dokumen */}
                  {detail.dokumen_url && (
                    <div style={{ marginTop: '4px', paddingTop: '6px', borderTop: '1px dashed #e2e8f0' }}>
                      <button
                        type="button"
                        onClick={() => setPreviewModal({
                          isOpen: true,
                          modul: item.modul,
                          id: item.pengajuan_id,
                          title: `Dokumen ${item.label_modul} - ${pemohon.nama}`
                        })}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          color: '#2563eb',
                          backgroundColor: '#eff6ff',
                          border: '1px solid #bfdbfe',
                          borderRadius: '8px',
                          padding: '6px 12px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          fontSize: '11px',
                          boxShadow: '0 1px 2px rgba(37, 99, 235, 0.08)'
                        }}
                      >
                        <Eye size={13} />
                        <span>Buka Dokumen Pendukung</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Timeline Alur Persetujuan Bertingkat */}
                {item.alur_steps && item.alur_steps.length > 0 && (
                  <div style={{ margin: '0 14px 12px' }}>
                    <span style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: '6px' }}>
                      Alur Persetujuan ({item.alur_steps.length} Tahapan):
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {item.alur_steps.map((st, idx) => (
                        <div 
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '6px 10px',
                            borderRadius: '8px',
                            backgroundColor: st.is_current ? '#fff7ed' : '#f8fafc',
                            border: st.is_current ? '1px solid #fed7aa' : '1px solid #f1f5f9',
                            fontSize: '10px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{
                              width: '16px',
                              height: '16px',
                              borderRadius: '4px',
                              backgroundColor: st.status === 'disetujui' ? '#059669' : (st.status === 'ditolak' ? '#dc2626' : (st.is_current ? '#ea580c' : '#94a3b8')),
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '9px',
                              fontWeight: '800'
                            }}>
                              {st.step_ke}
                            </span>
                            <span style={{ fontWeight: '700', color: '#334155' }}>
                              {st.approver_nama} ({st.label})
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{
                              fontWeight: '700',
                              color: st.status === 'disetujui' ? '#059669' : (st.status === 'ditolak' ? '#dc2626' : (st.is_current ? '#ea580c' : '#94a3b8'))
                            }}>
                              {st.status === 'disetujui' ? 'Setuju' : (st.status === 'ditolak' ? 'Tolak' : (st.is_current ? 'Giliran Aktif' : 'Menunggu'))}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Catatan Tindakan (Pada Tab Riwayat) */}
                {activeTab === 'riwayat' && item.catatan_saya && (
                  <div style={{
                    margin: '0 14px 12px',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    backgroundColor: '#f1f5f9',
                    fontSize: '10px',
                    color: '#475569'
                  }}>
                    <strong>Catatan Anda:</strong> "{item.catatan_saya}"
                  </div>
                )}

                {/* Tombol Aksi Persetujuan (Hanya muncul jika is_current = true & status = menunggu) */}
                {item.is_current && item.status === 'menunggu' && (
                  <div style={{
                    padding: '12px 14px',
                    borderTop: '1px solid #f1f5f9',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1.6fr',
                    gap: '10px',
                    backgroundColor: '#fcfcfd'
                  }}>
                    <button
                      type="button"
                      onClick={() => openActionModal(item, 'tolak')}
                      style={{
                        padding: '10px',
                        borderRadius: '12px',
                        border: '1.5px solid #fecdd3',
                        backgroundColor: '#fff1f2',
                        color: '#e11d48',
                        fontSize: '12px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <X size={15} />
                      <span>Tolak</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => openActionModal(item, 'setuju')}
                      style={{
                        padding: '10px',
                        borderRadius: '12px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: '#ffffff',
                        fontSize: '12px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        boxShadow: '0 3px 8px rgba(16, 185, 129, 0.25)'
                      }}
                    >
                      <Check size={15} />
                      <span>Setujui Pengajuan</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* MODAL KONFIRMASI AKSI (SETUJU / TOLAK) */}
      {actionModal.isOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            maxWidth: '380px',
            width: '100%',
            overflow: 'hidden',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            animation: 'zoomIn 0.2s ease-out'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '14px 18px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: actionModal.type === 'setuju' ? '#f0fdf4' : '#fff1f2'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {actionModal.type === 'setuju' ? (
                  <CheckCircle2 size={18} color="#059669" />
                ) : (
                  <XCircle size={18} color="#e11d48" />
                )}
                <h3 style={{
                  fontSize: '14px',
                  fontWeight: '800',
                  color: actionModal.type === 'setuju' ? '#065f46' : '#9f1239',
                  margin: 0
                }}>
                  {actionModal.type === 'setuju' ? 'Konfirmasi Persetujuan' : 'Konfirmasi Penolakan'}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeActionModal}
                disabled={actionModal.isSubmitting}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '2px'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ fontSize: '12px', color: '#475569', margin: 0, lineHeight: 1.4 }}>
                {actionModal.type === 'setuju' ? (
                  <>
                    Apakah Anda yakin ingin menyetujui pengajuan dari <strong>{actionModal.item?.pemohon?.nama}</strong>?
                    {actionModal.item?.step_ke < actionModal.item?.total_step && (
                      <span style={{ display: 'block', marginTop: '4px', color: '#ea580c', fontWeight: '600' }}>
                        *Pengajuan akan diteruskan ke approver tahapan berikutnya.
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    Apakah Anda yakin ingin menolak pengajuan dari <strong>{actionModal.item?.pemohon?.nama}</strong>?
                    <span style={{ display: 'block', marginTop: '4px', color: '#dc2626', fontWeight: '600' }}>
                      *Pengajuan akan langsung berstatus ditolak.
                    </span>
                  </>
                )}
              </p>

              {/* Input Catatan */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Catatan {actionModal.type === 'tolak' ? <span style={{ color: '#e11d48' }}>*</span> : '(Opsional)'}:
                </label>
                <textarea
                  value={actionModal.catatan}
                  onChange={(e) => setActionModal(prev => ({ ...prev, catatan: e.target.value }))}
                  rows={3}
                  placeholder={actionModal.type === 'setuju' ? 'Berikan catatan persetujuan jika ada...' : 'Sebutkan alasan penolakan pengajuan...'}
                  disabled={actionModal.isSubmitting}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12px',
                    color: '#0f172a',
                    fontFamily: 'inherit',
                    resize: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {actionModal.errorMessage && (
                <div style={{
                  padding: '8px 10px',
                  borderRadius: '8px',
                  backgroundColor: '#fff1f2',
                  border: '1px solid #fecdd3',
                  color: '#e11d48',
                  fontSize: '11px',
                  fontWeight: '600'
                }}>
                  {actionModal.errorMessage}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '12px 18px',
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '8px',
              backgroundColor: '#f8fafc'
            }}>
              <button
                type="button"
                onClick={closeActionModal}
                disabled={actionModal.isSubmitting}
                style={{
                  padding: '8px 14px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleExecuteAction}
                disabled={actionModal.isSubmitting}
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: actionModal.type === 'setuju' ? '#059669' : '#e11d48',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {actionModal.isSubmitting ? (
                  <span>Memproses...</span>
                ) : (
                  <span>{actionModal.type === 'setuju' ? 'Setujui' : 'Tolak Pengajuan'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal In-App Preview Dokumen Pendukung */}
      <DocumentPreviewModal
        isOpen={previewModal.isOpen}
        onClose={() => setPreviewModal({ isOpen: false, modul: '', id: null, title: '' })}
        modul={previewModal.modul}
        id={previewModal.id}
        title={previewModal.title}
      />
    </div>
  );
}
