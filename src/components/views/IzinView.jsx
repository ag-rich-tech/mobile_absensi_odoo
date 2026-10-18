import React, { useState, useEffect } from 'react';
import { ChevronLeft, Plus, Calendar, Clock, CheckCircle2, XCircle, AlertCircle, FileText, Send, Sparkles, UploadCloud, FileCheck, Paperclip, ExternalLink, X, Eye } from 'lucide-react';
import api from '../../services/api';
import DocumentPreviewModal from '../DocumentPreviewModal';

export default function IzinView({ onBack }) {
  const [kuota, setKuota] = useState({ total: 12, terpakai: 0, sisa: 12, tahun: new Date().getFullYear() });
  const [list, setList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [previewModal, setPreviewModal] = useState({ isOpen: false, id: null, title: '', modul: 'izin' });

  // Form State
  const [jenisIzin, setJenisIzin] = useState('cuti');
  const [tanggalMulai, setTanggalMulai] = useState(new Date().toISOString().split('T')[0]);
  const [tanggalSelesai, setTanggalSelesai] = useState(new Date().toISOString().split('T')[0]);
  const [alasan, setAlasan] = useState('');
  const [dokumenFile, setDokumenFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState({ type: '', text: '' });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await api.getIzin();
      if (res.success) {
        if (res.kuota_cuti) setKuota(res.kuota_cuti);
        if (res.pengajuan) setList(res.pengajuan);
      }
    } catch (err) {
      console.error('Gagal memuat data izin:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const calculateDays = () => {
    try {
      const d1 = new Date(tanggalMulai);
      const d2 = new Date(tanggalSelesai);
      const diff = Math.floor((d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
      return diff > 0 ? diff : 1;
    } catch {
      return 1;
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        setFormMessage({ type: 'error', text: 'Ukuran file melebihi batas maksimal 5MB.' });
        return;
      }
      setDokumenFile(file);
      setFormMessage({ type: '', text: '' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!alasan.trim()) {
      setFormMessage({ type: 'error', text: 'Mohon tuliskan alasan pengajuan secara jelas.' });
      return;
    }

    const durasiHari = calculateDays();
    if (jenisIzin === 'cuti' && durasiHari > (kuota.sisa || 0)) {
      setFormMessage({
        type: 'error',
        text: `Sisa kuota cuti tahunan Anda (${kuota.sisa || 0} hari) tidak mencukupi untuk pengajuan selama ${durasiHari} hari.`
      });
      return;
    }

    setIsSubmitting(true);
    setFormMessage({ type: '', text: '' });

    try {
      const formData = new FormData();
      formData.append('jenis_izin', jenisIzin);
      formData.append('tanggal_mulai', tanggalMulai);
      formData.append('tanggal_selesai', tanggalSelesai);
      formData.append('alasan', alasan.trim());
      if (dokumenFile) {
        formData.append('dokumen', dokumenFile);
      }

      const res = await api.ajukanIzin(formData);

      if (res.success) {
        setFormMessage({ type: 'success', text: res.message || 'Pengajuan berhasil dikirim.' });
        setAlasan('');
        setDokumenFile(null);
        setShowForm(false);
        loadData();
      }
    } catch (err) {
      setFormMessage({ type: 'error', text: err.message || 'Gagal mengirim pengajuan izin.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'disetujui':
      case 'disetujui_hrd':
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
      default:
        return (
          <span style={{ fontSize: '10px', fontWeight: '700', color: '#d97706', backgroundColor: '#fef3c7', padding: '3px 8px', borderRadius: '999px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={12} /> Menunggu
          </span>
        );
    }
  };

  return (
    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }} className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.3px', margin: 0 }}>
              Izin & Cuti
            </h2>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
              Pengajuan ketidakhadiran resmi
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
            background: showForm ? 'var(--bg-slate)' : 'var(--primary-gradient)',
            border: showForm ? '1px solid var(--border-light)' : 'none',
            color: showForm ? 'var(--text-main)' : '#ffffff',
            fontSize: '11px',
            fontWeight: '700',
            cursor: 'pointer',
            boxShadow: showForm ? 'none' : '0 2px 8px rgba(234, 88, 12, 0.25)'
          }}
        >
          {showForm ? 'Tutup Form' : (
            <>
              <Plus size={14} strokeWidth={2.5} />
              <span>Buat Izin</span>
            </>
          )}
        </button>
      </div>

      {/* Card Kuota Cuti Tahunan */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        borderRadius: 'var(--radius-md)',
        padding: '16px',
        color: '#ffffff',
        boxShadow: '0 4px 14px rgba(15, 23, 42, 0.15)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Kuota Cuti Tahunan {kuota.tahun}
          </span>
          <span style={{ fontSize: '11px', fontWeight: '800', color: '#38bdf8', backgroundColor: 'rgba(56, 189, 248, 0.15)', padding: '2px 8px', borderRadius: '999px' }}>
            Sisa {kuota.sisa} Hari
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', textAlign: 'center' }}>
          <div style={{ padding: '8px', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px' }}>
            <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block' }}>Hak Kuota</span>
            <span style={{ fontSize: '18px', fontWeight: '800', color: '#ffffff' }}>{kuota.total}</span>
            {kuota.tambahan > 0 && (
              <span style={{ fontSize: '9px', color: '#c084fc', display: 'block', fontWeight: '700' }}>
                +{kuota.tambahan} Bonus
              </span>
            )}
          </div>
          <div style={{ padding: '8px', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px' }}>
            <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block' }}>Terpakai</span>
            <span style={{ fontSize: '18px', fontWeight: '800', color: '#f59e0b' }}>{kuota.terpakai}</span>
          </div>
          <div style={{ padding: '8px', backgroundColor: 'rgba(56, 189, 248, 0.1)', borderRadius: '8px' }}>
            <span style={{ fontSize: '10px', color: '#38bdf8', display: 'block' }}>Sisa Cuti</span>
            <span style={{ fontSize: '18px', fontWeight: '800', color: '#38bdf8' }}>{kuota.sisa}</span>
          </div>
        </div>
      </div>

      {/* Form Pengajuan Izin (Toggle) */}
      {showForm && (
        <form onSubmit={handleSubmit} style={{
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
          border: '1.5px solid var(--primary-300)',
          boxShadow: '0 4px 16px rgba(234, 88, 12, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }} className="animate-fade-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary-600)', fontSize: '13px', fontWeight: '800' }}>
            <Sparkles size={16} />
            <span>Formulir Pengajuan Baru</span>
          </div>

          {formMessage.text && (
            <div style={{
              padding: '10px 12px',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: '600',
              backgroundColor: formMessage.type === 'success' ? '#dcfce7' : '#fee2e2',
              color: formMessage.type === 'success' ? '#16a34a' : '#dc2626',
              border: `1px solid ${formMessage.type === 'success' ? '#bbf7d0' : '#fecaca'}`
            }}>
              {formMessage.text}
            </div>
          )}

          {/* Jenis Izin */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '6px' }}>
              Jenis Pengajuan
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
              {[
                { id: 'cuti', label: 'Cuti Tahunan' },
                { id: 'sakit', label: 'Izin Sakit' },
                { id: 'izin', label: 'Keperluan Lain' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setJenisIzin(item.id)}
                  style={{
                    padding: '8px 4px',
                    fontSize: '11px',
                    fontWeight: '700',
                    borderRadius: '8px',
                    border: jenisIzin === item.id ? '1.5px solid var(--primary-600)' : '1px solid var(--border-light)',
                    backgroundColor: jenisIzin === item.id ? 'var(--primary-50)' : '#ffffff',
                    color: jenisIzin === item.id ? 'var(--primary-700)' : 'var(--text-muted)',
                    cursor: 'pointer'
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Rentang Tanggal */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '4px' }}>
                Dari Tanggal
              </label>
              <input
                type="date"
                value={tanggalMulai}
                onChange={(e) => setTanggalMulai(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-light)',
                  fontSize: '12px',
                  color: 'var(--text-main)',
                  backgroundColor: '#ffffff'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '4px' }}>
                Sampai Tanggal
              </label>
              <input
                type="date"
                value={tanggalSelesai}
                onChange={(e) => setTanggalSelesai(e.target.value)}
                required
                min={tanggalMulai}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-light)',
                  fontSize: '12px',
                  color: 'var(--text-main)',
                  backgroundColor: '#ffffff'
                }}
              />
            </div>
          </div>

          <div style={{
            padding: '10px 12px',
            borderRadius: '10px',
            backgroundColor: jenisIzin === 'cuti' && calculateDays() > (kuota.sisa || 0)
              ? '#fef2f2'
              : '#f8fafc',
            border: jenisIzin === 'cuti' && calculateDays() > (kuota.sisa || 0)
              ? '1px solid #fecaca'
              : '1px solid #e2e8f0',
            fontSize: '11px',
            display: 'flex',
            flexDirection: 'column',
            gap: '3px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)' }}>Durasi Pengajuan:</span>
              <strong style={{ color: 'var(--primary-600)', fontSize: '12px' }}>
                {calculateDays()} Hari Kerja
              </strong>
            </div>

            {jenisIzin === 'cuti' && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '4px',
                borderTop: '1px dashed #cbd5e1',
                marginTop: '3px'
              }}>
                <span style={{ color: 'var(--text-muted)' }}>Sisa Kuota Cuti Anda:</span>
                <span style={{
                  fontWeight: '800',
                  color: calculateDays() > (kuota.sisa || 0) ? '#dc2626' : '#16a34a'
                }}>
                  {calculateDays() > (kuota.sisa || 0)
                    ? `Kurang ${calculateDays() - (kuota.sisa || 0)} Hari (Sisa ${kuota.sisa || 0})`
                    : `Sisa ${kuota.sisa - calculateDays()} Hari`}
                </span>
              </div>
            )}

            {jenisIzin === 'cuti' && calculateDays() > (kuota.sisa || 0) && (
              <p style={{
                margin: '4px 0 0 0',
                color: '#dc2626',
                fontSize: '10px',
                fontWeight: '700',
                lineHeight: 1.3
              }}>
                ⚠️ Durasi pengajuan melebihi sisa kuota cuti tahunan Anda ({kuota.sisa || 0} hari).
              </p>
            )}
          </div>

          {/* Alasan */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '4px' }}>
              Alasan / Keterangan
            </label>
            <textarea
              value={alasan}
              onChange={(e) => setAlasan(e.target.value)}
              placeholder="Jelaskan alasan izin / cuti..."
              rows={3}
              required
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '8px',
                border: '1px solid var(--border-light)',
                fontSize: '12px',
                color: 'var(--text-main)',
                resize: 'none',
                fontFamily: 'inherit'
              }}
            />
          </div>

          {/* Unggah Dokumen Pendukung */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '4px' }}>
              Dokumen Pendukung <span style={{ fontWeight: '400', color: 'var(--text-muted)' }}>(Opsional)</span>
            </label>
            {!dokumenFile ? (
              <label style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '14px',
                borderRadius: '8px',
                border: '1.5px dashed rgba(234, 88, 12, 0.4)',
                backgroundColor: 'rgba(255, 247, 237, 0.5)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}>
                <UploadCloud size={24} style={{ color: 'var(--primary-600)', marginBottom: '4px' }} />
                <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--primary-700)' }}>
                  Pilih Dokumen / Surat Dokter
                </span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Format PDF, JPG, PNG (Maksimal 5MB)
                </span>
                <input
                  type="file"
                  accept=".pdf,image/png,image/jpeg,image/jpg"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </label>
            ) : (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: '8px',
                backgroundColor: '#f8fafc',
                border: '1px solid #cbd5e1'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                  <FileCheck size={18} style={{ color: '#16a34a', flexShrink: 0 }} />
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {dokumenFile.name}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      {(dokumenFile.size / (1024 * 1024)).toFixed(2)} MB
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDokumenFile(null)}
                  style={{
                    border: 'none',
                    background: '#fee2e2',
                    color: '#dc2626',
                    borderRadius: '6px',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    flexShrink: 0
                  }}
                  title="Hapus file"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              padding: '10px',
              borderRadius: '8px',
              background: 'var(--primary-gradient)',
              border: 'none',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              opacity: isSubmitting ? 0.7 : 1
            }}
          >
            {isSubmitting ? 'Mengirim Pengajuan...' : (
              <>
                <Send size={15} />
                <span>Kirim Pengajuan Izin</span>
              </>
            )}
          </button>
        </form>
      )}

      {/* Riwayat Pengajuan Izin */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)' }}>
            Riwayat Pengajuan
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {list.length} Tercatat
          </span>
        </div>

        {isLoading ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
            Memuat riwayat pengajuan...
          </div>
        ) : list.length === 0 ? (
          <div style={{
            padding: '28px 16px',
            textAlign: 'center',
            backgroundColor: 'var(--bg-slate)',
            borderRadius: 'var(--radius-md)',
            border: '1px dashed var(--border-light)'
          }}>
            <FileText size={28} style={{ color: 'var(--text-light)', margin: '0 auto 8px auto' }} />
            <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-main)', margin: '0 0 4px 0' }}>
              Belum Ada Pengajuan
            </p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
              Tekan tombol "Buat Izin" di atas untuk mengajukan izin atau cuti baru.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {list.map((item) => (
              <div
                key={item.id}
                style={{
                  padding: '12px 14px',
                  backgroundColor: '#ffffff',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)',
                  boxShadow: '0 1px 4px rgba(0, 0, 0, 0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: '800',
                      color: item.jenis_izin === 'sakit' ? '#dc2626' : (item.jenis_izin === 'cuti' ? 'var(--primary-700)' : '#2563eb'),
                      backgroundColor: item.jenis_izin === 'sakit' ? '#fee2e2' : (item.jenis_izin === 'cuti' ? 'var(--primary-50)' : '#eff6ff'),
                      padding: '2px 8px',
                      borderRadius: '6px'
                    }}>
                      {item.label_jenis}
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)' }}>
                      {item.total_hari} Hari
                    </span>
                  </div>
                  {getStatusBadge(item.status)}
                </div>

                <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-main)' }}>
                  {item.tanggal_mulai} s/d {item.tanggal_selesai}
                </div>

                <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, lineHeight: '1.4' }}>
                  "{item.alasan}"
                </p>

                {item.dokumen_url && (
                  <div style={{ marginTop: '2px' }}>
                    <button
                      type="button"
                      onClick={() => setPreviewModal({ 
                        isOpen: true, 
                        id: item.id, 
                        title: `Dokumen ${item.label_jenis}`,
                        modul: ['cuti_tahunan', 'cuti', 'melahirkan'].includes(item.jenis_izin) ? 'cuti' : 'izin'
                      })}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '11px',
                        fontWeight: '700',
                        color: 'var(--primary-700)',
                        backgroundColor: 'var(--primary-50)',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--primary-200)',
                        cursor: 'pointer',
                        maxWidth: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        boxShadow: '0 1px 2px rgba(234, 88, 12, 0.08)'
                      }}
                    >
                      <Eye size={13} />
                      <span>Buka Dokumen: {item.nama_dokumen || 'Lihat Berkas'}</span>
                    </button>
                  </div>
                )}

                {item.catatan_approval && (
                  <div style={{ fontSize: '10px', color: '#1e293b', backgroundColor: '#f1f5f9', padding: '6px 8px', borderRadius: '6px', marginTop: '2px' }}>
                    <strong>Catatan HRD:</strong> {item.catatan_approval}
                  </div>
                )}

                {item.approval_info?.is_bertingkat && (
                  <div style={{
                    marginTop: '2px',
                    padding: '6px 8px',
                    borderRadius: '8px',
                    backgroundColor: '#fff7ed',
                    border: '1px solid #fed7aa',
                    fontSize: '10px'
                  }}>
                    <span style={{ fontWeight: '800', color: '#c2410c', display: 'block', marginBottom: '2px' }}>
                      Alur Approval Bertingkat:
                    </span>
                    <span style={{ color: '#9a3412', fontWeight: '600' }}>
                      {item.approval_info.status_label}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal In-App Preview Dokumen */}
      <DocumentPreviewModal
        isOpen={previewModal.isOpen}
        onClose={() => setPreviewModal({ isOpen: false, id: null, title: '', modul: 'izin' })}
        modul={previewModal.modul}
        id={previewModal.id}
        title={previewModal.title}
      />
    </div>
  );
}
