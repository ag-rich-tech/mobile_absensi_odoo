import React, { useState, useEffect } from 'react';
import { ChevronLeft, Plus, PlaneTakeoff, Building2, MapPin, Calendar, CircleDollarSign, CheckCircle2, XCircle, Clock, Send, UploadCloud, FileCheck, Paperclip, ExternalLink, X, Eye } from 'lucide-react';
import api from '../../services/api';
import DocumentPreviewModal from '../DocumentPreviewModal';

export default function DinasView({ onBack }) {
  const [list, setList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [previewModal, setPreviewModal] = useState({ isOpen: false, id: null, title: '' });

  // Form State
  const [kotaTujuan, setKotaTujuan] = useState('');
  const [instansiTujuan, setInstansiTujuan] = useState('');
  const [keperluan, setKeperluan] = useState('');
  const [tanggalMulai, setTanggalMulai] = useState(new Date().toISOString().split('T')[0]);
  const [tanggalSelesai, setTanggalSelesai] = useState(new Date().toISOString().split('T')[0]);
  const [anggaranBiaya, setAnggaranBiaya] = useState('');
  const [dokumenFile, setDokumenFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState({ type: '', text: '' });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await api.getDinas();
      if (res.success && res.dinas) {
        setList(res.dinas);
      }
    } catch (err) {
      console.error('Gagal memuat data dinas:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        setFormMessage({ type: 'error', text: 'Ukuran file surat tugas dinas melebihi batas 5MB.' });
        return;
      }
      setDokumenFile(file);
      setFormMessage({ type: '', text: '' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!kotaTujuan || !instansiTujuan || !keperluan) {
      setFormMessage({ type: 'error', text: 'Mohon lengkapi seluruh formulir penugasan dinas.' });
      return;
    }

    setIsSubmitting(true);
    setFormMessage({ type: '', text: '' });

    try {
      const formData = new FormData();
      formData.append('kota_tujuan', kotaTujuan);
      formData.append('instansi_tujuan', instansiTujuan);
      formData.append('keperluan', keperluan);
      formData.append('tanggal_mulai', tanggalMulai);
      formData.append('tanggal_selesai', tanggalSelesai);
      formData.append('anggaran_biaya', anggaranBiaya ? parseFloat(anggaranBiaya) : 0);
      if (dokumenFile) {
        formData.append('dokumen', dokumenFile);
      }

      const res = await api.ajukanDinas(formData);

      if (res.success) {
        setFormMessage({ type: 'success', text: res.message || 'Pengajuan dinas berhasil dikirim.' });
        setKotaTujuan('');
        setInstansiTujuan('');
        setKeperluan('');
        setAnggaranBiaya('');
        setDokumenFile(null);
        setShowForm(false);
        loadData();
      }
    } catch (err) {
      setFormMessage({ type: 'error', text: err.message || 'Gagal mengirim pengajuan dinas.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
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
      default:
        return (
          <span style={{ fontSize: '10px', fontWeight: '700', color: '#0284c7', backgroundColor: '#e0f2fe', padding: '3px 8px', borderRadius: '999px', display: 'flex', alignItems: 'center', gap: '4px' }}>
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
              Kunjungan Dinas
            </h2>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
              Penugasan luar kota & instansi
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
            background: showForm ? 'var(--bg-slate)' : 'linear-gradient(135deg, #0284c7, #0369a1)',
            border: showForm ? '1px solid var(--border-light)' : 'none',
            color: showForm ? 'var(--text-main)' : '#ffffff',
            fontSize: '11px',
            fontWeight: '700',
            cursor: 'pointer',
            boxShadow: showForm ? 'none' : '0 2px 8px rgba(2, 132, 199, 0.25)'
          }}
        >
          {showForm ? 'Tutup' : (
            <>
              <Plus size={14} strokeWidth={2.5} />
              <span>Ajukan Dinas</span>
            </>
          )}
        </button>
      </div>

      {/* Form Tambah Dinas */}
      {showForm && (
        <form onSubmit={handleSubmit} style={{
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
          border: '1.5px solid #bae6fd',
          boxShadow: '0 4px 16px rgba(2, 132, 199, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }} className="animate-fade-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0284c7', fontSize: '13px', fontWeight: '800' }}>
            <PlaneTakeoff size={16} />
            <span>Form Pengajuan Dinas Luar</span>
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

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '4px' }}>
              Kota / Wilayah Tujuan
            </label>
            <input
              type="text"
              value={kotaTujuan}
              onChange={(e) => setKotaTujuan(e.target.value)}
              placeholder="Contoh: Bandung / Surabaya"
              required
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '8px',
                border: '1px solid var(--border-light)',
                fontSize: '12px',
                color: 'var(--text-main)'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '4px' }}>
              Instansi / Mitra / Klien Tujuan
            </label>
            <input
              type="text"
              value={instansiTujuan}
              onChange={(e) => setInstansiTujuan(e.target.value)}
              placeholder="Contoh: PT Telekomunikasi Indonesia"
              required
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '8px',
                border: '1px solid var(--border-light)',
                fontSize: '12px',
                color: 'var(--text-main)'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '4px' }}>
                Mulai Tanggal
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
                  fontSize: '12px'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '4px' }}>
                Selesai Tanggal
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
                  fontSize: '12px'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '4px' }}>
              Estimasi Anggaran / Biaya Perjalanan (Rp)
            </label>
            <input
              type="number"
              value={anggaranBiaya}
              onChange={(e) => setAnggaranBiaya(e.target.value)}
              placeholder="Contoh: 2500000"
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '8px',
                border: '1px solid var(--border-light)',
                fontSize: '12px'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '4px' }}>
              Keperluan Tugas Dinas
            </label>
            <textarea
              value={keperluan}
              onChange={(e) => setKeperluan(e.target.value)}
              placeholder="Jelaskan agenda kerja dan tujuan penugasan..."
              rows={3}
              required
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '8px',
                border: '1px solid var(--border-light)',
                fontSize: '12px',
                resize: 'none',
                fontFamily: 'inherit'
              }}
            />
          </div>

          {/* Unggah Dokumen Surat Tugas */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '4px' }}>
              Dokumen Surat Tugas / SPT <span style={{ fontWeight: '400', color: 'var(--text-muted)' }}>(Opsional)</span>
            </label>
            {!dokumenFile ? (
              <label style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '14px',
                borderRadius: '8px',
                border: '1.5px dashed #bae6fd',
                backgroundColor: '#f0f9ff',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}>
                <UploadCloud size={24} style={{ color: '#0284c7', marginBottom: '4px' }} />
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#0369a1' }}>
                  Pilih Surat Tugas / SPT / Undangan
                </span>
                <span style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
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
              background: 'linear-gradient(135deg, #0284c7, #0369a1)',
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
            {isSubmitting ? 'Mengirim...' : (
              <>
                <Send size={15} />
                <span>Kirim Permohonan Dinas</span>
              </>
            )}
          </button>
        </form>
      )}

      {/* Daftar Dinas */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)' }}>
            Daftar Penugasan Dinas
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {list.length} Tercatat
          </span>
        </div>

        {isLoading ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
            Memuat data penugasan dinas...
          </div>
        ) : list.length === 0 ? (
          <div style={{
            padding: '28px 16px',
            textAlign: 'center',
            backgroundColor: 'var(--bg-slate)',
            borderRadius: 'var(--radius-md)',
            border: '1px dashed var(--border-light)'
          }}>
            <PlaneTakeoff size={28} style={{ color: 'var(--text-light)', margin: '0 auto 8px auto' }} />
            <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-main)', margin: '0 0 4px 0' }}>
              Tidak Ada Penugasan Aktif
            </p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
              Tekan tombol "Ajukan Dinas" untuk merekam jadwal tugas luar kota.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {list.map((item) => (
              <div
                key={item.id}
                style={{
                  padding: '14px',
                  backgroundColor: '#ffffff',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)',
                  boxShadow: '0 1px 4px rgba(0, 0, 0, 0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={15} style={{ color: '#0284c7' }} />
                    <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)' }}>
                      {item.kota_tujuan}
                    </span>
                  </div>
                  {getStatusBadge(item.status)}
                </div>

                <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Building2 size={13} />
                  <span>{item.instansi_tujuan}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', backgroundColor: 'var(--bg-slate)', padding: '8px 10px', borderRadius: '6px' }}>
                  <span>Periode: <strong>{item.tanggal_mulai} - {item.tanggal_selesai}</strong></span>
                  <span style={{ color: '#0284c7', fontWeight: '700' }}>{item.anggaran_biaya_formatted}</span>
                </div>

                <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, lineHeight: '1.4' }}>
                  "{item.keperluan}"
                </p>

                {item.dokumen_url && (
                  <div style={{ marginTop: '2px' }}>
                    <button
                      type="button"
                      onClick={() => setPreviewModal({ 
                        isOpen: true, 
                        id: item.id, 
                        title: `Surat Tugas - ${item.instansi_tujuan || item.kota_tujuan}` 
                      })}
                      style={{
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
                        cursor: 'pointer',
                        maxWidth: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        boxShadow: '0 1px 2px rgba(2, 132, 199, 0.08)'
                      }}
                    >
                      <Eye size={13} />
                      <span>Buka Surat Tugas: {item.nama_dokumen || 'Lihat Dokumen'}</span>
                    </button>
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
        onClose={() => setPreviewModal({ isOpen: false, id: null, title: '' })}
        modul="dinas"
        id={previewModal.id}
        title={previewModal.title}
      />
    </div>
  );
}
