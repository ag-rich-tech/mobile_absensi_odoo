import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Plus, Calendar, Clock, CheckCircle2, XCircle, AlertCircle,
  Receipt, Send, UploadCloud, FileCheck, ExternalLink, X,
  Eye, RefreshCw, ChevronRight, Wallet, Info, Sparkles, Building
} from 'lucide-react';
import api, { getStoredUser } from '../../services/api';
import { loadDraft, saveDraft, clearDraft, DRAFT_KEYS } from '../../services/draftService';
import DocumentPreviewModal from '../DocumentPreviewModal';

export default function ReimbursementView({ onBack }) {
  // Draf form (1.2.23): bertahan saat tab switch/unmount; dihapus saat submit sukses.
  const draftKey = getStoredUser()?.id ? DRAFT_KEYS.reimbursement(getStoredUser().id) : null;
  const draft0 = draftKey ? loadDraft(draftKey, {}) : {};
  const [activeTab, setActiveTab] = useState('riwayat'); // 'riwayat' | 'ajukan'
  const [summary, setSummary] = useState({ total_diajukan: 0, total_disetujui: 0, menunggu_count: 0 });
  const [list, setList] = useState([]);
  const [jenisList, setJenisList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [previewModal, setPreviewModal] = useState({ isOpen: false, id: null, title: '', modul: 'reimbursement' });
  const [toastMessage, setToastMessage] = useState({ type: '', text: '' });
  const [detailItem, setDetailItem] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Detail pengajuan: klik kartu -> ambil detail server; bila gagal,
  // tetap tampilkan data dari daftar (bukan layar kosong).
  const openDetail = async (item) => {
    setDetailItem(item);
    setDetailLoading(true);
    try {
      const res = await api.getReimbursementDetail(item.id);
      if (res.success && res.data) setDetailItem(res.data);
    } catch {
      // abaikan: data daftar sudah cukup untuk modal
    } finally {
      setDetailLoading(false);
    }
  };

  // Form State
  const [selectedJenisId, setSelectedJenisId] = useState(draft0.selectedJenisId || '');
  const [tanggalKuitansi, setTanggalKuitansi] = useState(draft0.tanggalKuitansi || new Date().toISOString().split('T')[0]);
  const [nominal, setNominal] = useState(draft0.nominal || '');
  const [keterangan, setKeterangan] = useState(draft0.keterangan || '');
  const [dokumenFile, setDokumenFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    setFormError('');
    try {
      const [resList, resJenis] = await Promise.all([
        api.getReimbursement(),
        api.getReimbursementJenis(),
      ]);

      if (resList.success) {
        setList(resList.data || []);
        if (resList.summary) setSummary(resList.summary);
      }
      if (resJenis.success) {
        const jData = resJenis.data || [];
        setJenisList(jData);
        if (jData.length > 0 && !selectedJenisId) {
          setSelectedJenisId(jData[0].id);
        }
      }
    } catch (err) {
      console.error('Gagal memuat data reimbursement:', err);
      setToastMessage({ type: 'error', text: 'Gagal menghubungkan ke server.' });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        setFormError('Ukuran file nota melebihi batas 5MB.');
        return;
      }
      setDokumenFile(file);
      setFormError('');

      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (ev) => setFilePreview(ev.target.result);
        reader.readAsDataURL(file);
      } else {
        setFilePreview(null);
      }
    }
  };

  // Simpan draf tiap perubahan field (file tidak ikut — tidak bisa JSON).
  useEffect(() => {
    if (!draftKey) return;
    saveDraft(draftKey, { selectedJenisId, tanggalKuitansi, nominal, keterangan });
  }, [draftKey, selectedJenisId, tanggalKuitansi, nominal, keterangan]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!selectedJenisId) {
      setFormError('Silakan pilih kategori jenis reimbursement.');
      return;
    }

    const numVal = parseFloat(nominal);
    if (!numVal || numVal <= 0) {
      setFormError('Mohon masukkan nominal klaim yang valid.');
      return;
    }

    if (!keterangan.trim()) {
      setFormError('Mohon tuliskan keterangan / rincian pengeluaran.');
      return;
    }

    const selectedJenis = jenisList.find(j => j.id == selectedJenisId);
    if (selectedJenis && selectedJenis.wajib_bukti_nota && !dokumenFile) {
      setFormError(`Kategori '${selectedJenis.nama_jenis || selectedJenis.nama || selectedJenis.id}' mewajibkan unggah bukti nota / kuitansi.`);
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('reimbursement_jenis_id', selectedJenisId);
      formData.append('tanggal_kuitansi', tanggalKuitansi);
      formData.append('nominal', numVal);
      formData.append('keterangan', keterangan.trim());
      if (dokumenFile) {
        formData.append('dokumen', dokumenFile);
      }

      const res = await api.ajukanReimbursement(formData);

      if (res.success) {
        // Dokumen dikirim tapi server melaporkan lampiran TIDAK
        // tersimpan -> peringatan eksplisit (bukan sukses penuh).
        if (dokumenFile && res.attachment_saved === false) {
          setFormError('Pengajuan terkirim, tetapi lampiran bukti nota GAGAL tersimpan di server. Silakan hubungi admin / kirim ulang dengan lampiran.');
        } else {
          setToastMessage({ type: 'success', text: res.message || 'Pengajuan klaim berhasil dikirim.' });
        }
        if (draftKey) clearDraft(draftKey);
        setTimeout(() => setToastMessage({ type: '', text: '' }), 4000);

        // Reset form
        setNominal('');
        setKeterangan('');
        setDokumenFile(null);
        setFilePreview(null);
        setActiveTab('riwayat');
        loadData();
      } else {
        setFormError(res.message || 'Gagal mengirim pengajuan reimbursement.');
      }
    } catch (err) {
      setFormError(err.message || 'Terjadi gangguan koneksi jaringan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeJenis = jenisList.find(j => j.id == selectedJenisId);

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
              Klaim Reimbursement
            </h2>
            <p style={{ fontSize: '11px', color: '#64748b', margin: 0, fontWeight: '500' }}>
              Penggantian Biaya Operasional & Medis
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

      {/* Toast Alert */}
      {toastMessage.text && (
        <div style={{
          margin: '12px 16px 0',
          padding: '10px 14px',
          borderRadius: '12px',
          backgroundColor: toastMessage.type === 'success' ? '#ecfdf5' : '#fef2f2',
          border: toastMessage.type === 'success' ? '1px solid #a7f3d0' : '1px solid #fecdd3',
          color: toastMessage.type === 'success' ? '#047857' : '#b91c1c',
          fontSize: '12px',
          fontWeight: '700',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {toastMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Ringkasan Klaim */}
      <div style={{ padding: '14px 16px 8px' }}>
        <div style={{
          padding: '16px',
          borderRadius: '18px',
          background: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)',
          color: '#ffffff',
          boxShadow: '0 8px 20px rgba(15, 118, 110, 0.25)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#99f6e4' }}>
                Total Klaim Disetujui
              </span>
              <span style={{
                fontSize: '10px',
                fontWeight: '800',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                padding: '2px 8px',
                borderRadius: '8px'
              }}>
                {summary.menunggu_count} Menunggu
              </span>
            </div>
            <div style={{ fontSize: '22px', fontWeight: '900', letterSpacing: '-0.5px' }}>
              Rp {Number(summary.total_disetujui || 0).toLocaleString('id-ID')}
            </div>
            <div style={{ fontSize: '11px', color: '#ccfbf1', marginTop: '4px' }}>
              Total akumulasi pengajuan: Rp {Number(summary.total_diajukan || 0).toLocaleString('id-ID')}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ padding: '8px 16px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          padding: '4px',
          borderRadius: '14px',
          backgroundColor: '#e2e8f0',
          gap: '4px'
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('riwayat')}
            style={{
              padding: '9px 12px',
              borderRadius: '10px',
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
              boxShadow: activeTab === 'riwayat' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <Clock size={14} color={activeTab === 'riwayat' ? '#0f766e' : '#64748b'} />
            <span>Riwayat Klaim</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ajukan')}
            style={{
              padding: '9px 12px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: activeTab === 'ajukan' ? '#ffffff' : 'transparent',
              color: activeTab === 'ajukan' ? '#0f172a' : '#64748b',
              fontSize: '12px',
              fontWeight: '800',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: activeTab === 'ajukan' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <Plus size={14} color={activeTab === 'ajukan' ? '#0f766e' : '#64748b'} />
            <span>Ajukan Baru</span>
          </button>
        </div>
      </div>

      {/* KONTEN TAB: RIWAYAT KLAIM */}
      {activeTab === 'riwayat' && (
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
              <RefreshCw size={24} className="animate-spin text-teal-600" />
              <span style={{ fontSize: '12px', fontWeight: '600' }}>Memuat riwayat reimbursement...</span>
            </div>
          ) : list.length === 0 ? (
            <div style={{
              padding: '40px 20px',
              textAlign: 'center',
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{
                width: '54px',
                height: '54px',
                borderRadius: '16px',
                backgroundColor: '#f0fdf4',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Receipt size={28} />
              </div>
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b', margin: 0 }}>
                  Belum Ada Pengajuan Klaim
                </h4>
                <p style={{ fontSize: '11px', color: '#64748b', margin: '4px 0 0', maxWidth: '260px', lineHeight: 1.4 }}>
                  Anda belum pernah mengajukan reimbursement biaya medis atau operasional.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('ajukan')}
                style={{
                  marginTop: '6px',
                  padding: '8px 16px',
                  borderRadius: '10px',
                  backgroundColor: '#0f766e',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Plus size={14} />
                <span>Ajukan Reimbursement</span>
              </button>
            </div>
          ) : (
            list.map(item => {

              return (
                <div
                  key={item.id}
                  onClick={() => openDetail(item)}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                    overflow: 'hidden',
                    cursor: 'pointer'
                  }}
                >
                  {/* Header Card */}
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
                        backgroundColor: '#f0fdf4',
                        color: '#15803d',
                        border: '1px solid #bbf7d0'
                      }}>
                        {item.nama_jenis}
                      </span>
                      <span style={{ fontSize: '10px', color: '#94a3b8' }}>•</span>
                      <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '600' }}>
                        {item.nomor_pengajuan}
                      </span>
                    </div>

                    <span style={{
                      fontSize: '10px',
                      fontWeight: '800',
                      color: item.status === 'disetujui' ? '#059669' : (item.status === 'dicairkan' ? '#4f46e5' : (item.status === 'ditolak' ? '#dc2626' : '#ea580c')),
                      backgroundColor: item.status === 'disetujui' ? '#ecfdf5' : (item.status === 'dicairkan' ? '#eef2ff' : (item.status === 'ditolak' ? '#fef2f2' : '#fff7ed')),
                      padding: '2px 8px',
                      borderRadius: '6px'
                    }}>
                      {item.status === 'dicairkan'
                        ? 'Telah Dicairkan'
                        : (item.status === 'disetujui'
                          ? 'Disetujui'
                          : (item.status === 'ditolak' ? 'Ditolak' : 'Menunggu Admin'))}
                    </span>
                  </div>

                  {/* Body Detail Card */}
                  <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>Nominal Diajukan:</span>
                      <span style={{ fontSize: '15px', fontWeight: '900', color: '#0f172a' }}>
                        {item.nominal_format}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                      <span style={{ color: '#64748b' }}>Tanggal Nota:</span>
                      <span style={{ fontWeight: '600', color: '#334155' }}>{item.tanggal_kuitansi}</span>
                    </div>

                    <div style={{ paddingTop: '6px', borderTop: '1px dashed #f1f5f9' }}>
                      <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block' }}>Keterangan / Keperluan:</span>
                      <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#334155', fontWeight: '500', lineHeight: 1.4 }}>
                        "{item.keterangan}"
                      </p>
                    </div>

                    {item.dokumen_terlampir && item.pengajuan_id && (
                      <button
                        type="button"
                        onClick={() => setPreviewModal({
                          isOpen: true,
                          id: item.pengajuan_id,
                          title: `Nota - ${item.nama_jenis}`,
                          modul: 'reimbursement'
                        })}
                        style={{
                          alignSelf: 'flex-start',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '11px',
                          fontWeight: '700',
                          color: '#0284c7',
                          backgroundColor: '#e0f2fe',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          border: '1px solid #bae6fd',
                          cursor: 'pointer'
                        }}
                      >
                        📎 Lihat Dokumen Nota
                      </button>
                    )}
                    {item.dokumen_terlampir && !item.pengajuan_id && (
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        📎 Dokumen nota terlampir
                      </div>
                    )}

                    {/* Catatan Admin jika ada */}
                    {item.catatan_admin && (
                      <div style={{
                        padding: '8px 10px',
                        backgroundColor: '#fffbeb',
                        borderRadius: '8px',
                        border: '1px solid #fef3c7',
                        fontSize: '11px',
                        color: '#92400e'
                      }}>
                        <span style={{ fontWeight: '700', display: 'block', marginBottom: '2px' }}>Catatan Verifikator:</span>
                        <span>{item.catatan_admin}</span>
                      </div>
                    )}

                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* KONTEN TAB: FORM PENGAJUAN BARU */}
      {activeTab === 'ajukan' && (
        <div style={{ padding: '8px 16px' }}>
          <form onSubmit={handleSubmit} style={{
            backgroundColor: '#ffffff',
            borderRadius: '18px',
            border: '1px solid #e2e8f0',
            padding: '16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}>
            {formError && (
              <div style={{
                padding: '10px 12px',
                borderRadius: '10px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecdd3',
                color: '#b91c1c',
                fontSize: '11px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <AlertCircle size={16} />
                <span>{formError}</span>
              </div>
            )}

            {/* Pilihan Jenis Reimbursement */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', fontWeight: '800', color: '#1e293b' }}>
                Kategori Jenis Klaim <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                value={selectedJenisId}
                onChange={(e) => setSelectedJenisId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#f8fafc',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#0f172a',
                  outline: 'none'
                }}
              >
                {jenisList.map(j => (
                  <option key={j.id} value={j.id}>
                    {j.nama_jenis || j.nama || j.id} {j.kode_jenis || j.kode ? `(${j.kode_jenis || j.kode})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Info Plafon & Aturan Kategori yang Dipilih */}
            {activeJenis && (activeJenis.plafon || activeJenis.aturan) && (
              <div style={{
                padding: '10px 12px',
                borderRadius: '12px',
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                fontSize: '11px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}>
                {activeJenis.plafon && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#15803d', fontWeight: '800' }}>
                      <Wallet size={14} />
                      <span>Informasi Batasan Plafon:</span>
                    </div>
                    <div style={{ color: '#166534', fontSize: '10px', lineHeight: 1.4 }}>
                      • Per Klaim: <strong>{activeJenis.plafon?.per_klaim_format || '-'}</strong><br />
                      • Per Bulan: <strong>{activeJenis.plafon?.per_bulan_format || '-'}</strong> (Sisa Kuota: <strong>{activeJenis.kuota_saya?.sisa_bulan_ini_format || '-'}</strong>)<br />
                      • Per Tahun: <strong>{activeJenis.plafon?.per_tahun_format || '-'}</strong> (Sisa Kuota: <strong>{activeJenis.kuota_saya?.sisa_tahun_ini_format || '-'}</strong>)
                    </div>
                  </>
                )}
                {activeJenis.aturan && (
                  <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: activeJenis.plafon ? '1px dashed #bbf7d0' : 'none', color: '#166534', fontSize: '10px', whiteSpace: 'pre-line' }}>
                    <strong>Syarat & Ketentuan:</strong><br />
                    {activeJenis.aturan}
                  </div>
                )}
              </div>
            )}

            {/* Tanggal Nota */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', fontWeight: '800', color: '#1e293b' }}>
                Tanggal Transaksi / Nota <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="date"
                max={new Date().toISOString().split('T')[0]}
                value={tanggalKuitansi}
                onChange={(e) => setTanggalKuitansi(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#f8fafc',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#0f172a',
                  outline: 'none'
                }}
              />
            </div>

            {/* Nominal Klaim */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', fontWeight: '800', color: '#1e293b' }}>
                Jumlah Biaya (Rupiah) <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', fontWeight: '800', color: '#64748b' }}>
                  Rp
                </span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="0"
                  value={nominal}
                  onChange={(e) => setNominal(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 38px',
                    borderRadius: '12px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#f8fafc',
                    fontSize: '14px',
                    fontWeight: '800',
                    color: '#0f172a',
                    outline: 'none'
                  }}
                />
              </div>
              {nominal && (
                <span style={{ fontSize: '11px', color: '#0f766e', fontWeight: '700' }}>
                  Terbilang: Rp {Number(nominal).toLocaleString('id-ID')}
                </span>
              )}
            </div>

            {/* Keterangan / Keperluan */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', fontWeight: '800', color: '#1e293b' }}>
                Keterangan Keperluan <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Jelaskan kebutuhan pengeluaran, nomor resep dokter, atau rute dinas..."
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#f8fafc',
                  fontSize: '12px',
                  color: '#0f172a',
                  outline: 'none',
                  resize: 'none'
                }}
              />
            </div>

            {/* Unggah Bukti Nota */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: '800', color: '#1e293b' }}>
                Bukti Nota Kuitansi / Struk {activeJenis?.wajib_bukti_nota && <span style={{ color: '#ef4444' }}>* (Wajib)</span>}
              </label>
              <label style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '18px 12px',
                borderRadius: '14px',
                border: '1.5px dashed #0f766e',
                backgroundColor: '#f0fdfa',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s ease'
              }}>
                <UploadCloud size={24} color="#0f766e" />
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#0f766e', marginTop: '6px' }}>
                  {dokumenFile ? dokumenFile.name : 'Pilih Foto Nota atau Dokumen PDF'}
                </span>
                <span style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                  Maksimal 5MB (JPG, PNG, WEBP, PDF)
                </span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </label>

              {filePreview && (
                <div style={{ marginTop: '6px', textAlign: 'center' }}>
                  <img src={filePreview} alt="Preview Nota" style={{ maxHeight: '120px', borderRadius: '10px', objectFit: 'contain', border: '1px solid #e2e8f0' }} />
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                marginTop: '8px',
                width: '100%',
                padding: '13px',
                borderRadius: '14px',
                backgroundColor: isSubmitting ? '#94a3b8' : '#0f766e',
                border: 'none',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: '800',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: isSubmitting ? 'none' : '0 4px 12px rgba(15, 118, 110, 0.3)',
                transition: 'all 0.2s ease'
              }}
            >
              <Send size={16} />
              <span>{isSubmitting ? 'Mengirim Pengajuan...' : 'Kirim Pengajuan Reimbursement'}</span>
            </button>
          </form>
        </div>
      )}
      <br></br><br></br><br></br><br></br><br></br>
      {/* Modal Detail Pengajuan (klik kartu) */}
      {detailItem && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9998,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
          }}
          onClick={() => setDetailItem(null)}
        >
          <div
            style={{
              backgroundColor: '#ffffff', width: '100%', maxWidth: '480px',
              maxHeight: '85vh', overflowY: 'auto',
              borderRadius: '20px 20px 0 0', padding: '20px 16px 32px 16px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Detail {detailItem.nomor_pengajuan || 'Pengajuan'}
              </h3>
              <button
                type="button"
                onClick={() => setDetailItem(null)}
                style={{ border: 'none', background: '#f1f5f9', borderRadius: '999px', width: '32px', height: '32px', cursor: 'pointer', fontSize: '16px', color: '#334155' }}
              >
                ×
              </button>
            </div>
            {detailLoading && (
              <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 10px 0' }}>Memuat detail terbaru...</p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: '#334155' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Jenis</span>
                <strong style={{ color: '#0f172a' }}>{detailItem.nama_jenis || '-'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Nominal</span>
                <strong style={{ color: '#0f172a' }}>{detailItem.nominal_format || '-'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Tanggal Kuitansi</span>
                <strong style={{ color: '#0f172a' }}>{detailItem.tanggal_kuitansi || '-'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Status</span>
                <strong style={{ color: '#0f172a' }}>{detailItem.status_label || detailItem.status || '-'}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', marginBottom: '4px' }}>Keterangan</span>
                <span>{detailItem.keterangan || '-'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b' }}>Dokumen Nota</span>
                {detailItem.dokumen_terlampir && detailItem.pengajuan_id ? (
                  <button
                    type="button"
                    onClick={() => setPreviewModal({
                      isOpen: true,
                      id: detailItem.pengajuan_id,
                      title: `Nota - ${detailItem.nama_jenis || ''}`,
                      modul: 'reimbursement'
                    })}
                    style={{
                      fontSize: '11px',
                      fontWeight: '700',
                      color: '#0284c7',
                      backgroundColor: '#e0f2fe',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: '1px solid #bae6fd',
                      cursor: 'pointer'
                    }}
                  >
                    📎 Lihat Nota
                  </button>
                ) : (
                  <strong style={{ color: detailItem.dokumen_terlampir ? '#15803d' : '#64748b' }}>
                    {detailItem.dokumen_terlampir ? 'Terlampir' : 'Tidak ada dokumen'}
                  </strong>
                )}
              </div>
              {detailItem.catatan_admin && (
                <div>
                  <span style={{ color: '#64748b', display: 'block', marginBottom: '4px' }}>Catatan Verifikator</span>
                  <span>{detailItem.catatan_admin}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Modal In-App Document Preview */}
      <DocumentPreviewModal
        isOpen={previewModal.isOpen}
        onClose={() => setPreviewModal({ isOpen: false, id: null, title: '', modul: 'reimbursement' })}
        modul={previewModal.modul}
        id={previewModal.id}
        title={previewModal.title}
      />
    </div>
  );
}
