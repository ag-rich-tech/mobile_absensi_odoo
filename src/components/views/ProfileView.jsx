import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft, User, Lock, Smartphone, ShieldCheck, Mail, Phone,
  MapPin, Building, KeyRound, LogOut, CheckCircle2, AlertCircle,
  CircleDollarSign, ChevronRight, Camera, RefreshCw, Check, X,
  CalendarDays, Award, TrendingUp, Navigation
} from 'lucide-react';
import api, { getOrCreateDeviceId } from '../../services/api';

export default function ProfileView({ user, onBack, onLogout, onOpenDenda, onOpenJadwal, onPhotoUpdated }) {
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordLama, setPasswordLama] = useState('');
  const [passwordBaru, setPasswordBaru] = useState('');
  const [passwordBaruConfirmation, setPasswordBaruConfirmation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // State Skor KPI Periode Terbaru
  const [kpiData, setKpiData] = useState(user?.kpi_terbaru || null);
  const [isLoadingKpi, setIsLoadingKpi] = useState(!user?.kpi_terbaru);

  useEffect(() => {
    if (user?.kpi_terbaru) {
      setKpiData(user.kpi_terbaru);
      setIsLoadingKpi(false);
      return;
    }

    let isMounted = true;
    api.getKpiTerbaru()
      .then(res => {
        if (isMounted && res.success) {
          setKpiData(res.data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoadingKpi(false);
      });

    return () => { isMounted = false; };
  }, [user]);

  // State Foto Profil
  const [fotoProfilUrl, setFotoProfilUrl] = useState(user?.foto_profil || null);
  const [previewFoto, setPreviewFoto] = useState(null);
  const [fileFoto, setFileFoto] = useState(null);
  const [isUploadingFoto, setIsUploadingFoto] = useState(false);
  const [fotoMessage, setFotoMessage] = useState({ type: '', text: '' });
  const fileInputRef = useRef(null);

  const deviceId = getOrCreateDeviceId();

  const handleFotoSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        setFotoMessage({ type: 'error', text: 'Ukuran foto melebihi batas maksimal 5MB.' });
        return;
      }
      setFileFoto(file);
      setPreviewFoto(URL.createObjectURL(file));
      setFotoMessage({ type: '', text: '' });
    }
  };

  const handleCancelFoto = () => {
    if (previewFoto) URL.revokeObjectURL(previewFoto);
    setPreviewFoto(null);
    setFileFoto(null);
    setFotoMessage({ type: '', text: '' });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveFoto = async () => {
    if (!fileFoto) return;
    setIsUploadingFoto(true);
    setFotoMessage({ type: '', text: '' });

    try {
      const formData = new FormData();
      formData.append('foto_profil', fileFoto);
      const res = await api.updateFotoProfil(formData);

      if (res.success) {
        setFotoProfilUrl(res.foto_profil);
        setPreviewFoto(null);
        setFileFoto(null);
        setFotoMessage({ type: 'success', text: 'Foto profil Anda berhasil disimpan!' });
        if (onPhotoUpdated) {
          onPhotoUpdated(res.foto_profil);
        }
        setTimeout(() => setFotoMessage({ type: '', text: '' }), 3500);
      }
    } catch (err) {
      setFotoMessage({ type: 'error', text: err.message || 'Gagal menyimpan foto profil.' });
    } finally {
      setIsUploadingFoto(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordBaru !== passwordBaruConfirmation) {
      setMessage({ type: 'error', text: 'Konfirmasi kata sandi baru tidak cocok.' });
      return;
    }

    if (passwordBaru.length < 6) {
      setMessage({ type: 'error', text: 'Kata sandi minimal 6 karakter.' });
      return;
    }

    setIsSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await api.changePassword({
        password_lama: passwordLama,
        password_baru: passwordBaru,
        password_baru_confirmation: passwordBaruConfirmation,
      });

      if (res.success) {
        setMessage({ type: 'success', text: res.message || 'Kata sandi berhasil diubah.' });
        setPasswordLama('');
        setPasswordBaru('');
        setPasswordBaruConfirmation('');
        setTimeout(() => setShowPasswordForm(false), 2000);
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Gagal mengubah kata sandi.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }} className="animate-fade-in">
      {/* Header */}
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
            Profil Pegawai
          </h2>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
            Informasi akun & keamanan perangkat
          </p>
        </div>
      </div>

      {/* Profile Card Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        borderRadius: 'var(--radius-md)',
        padding: '20px 16px',
        color: '#ffffff',
        textAlign: 'center',
        boxShadow: '0 4px 14px rgba(15, 23, 42, 0.15)',
        position: 'relative'
      }}>
        {/* Avatar dengan Tombol Ganti Foto Mandiri */}
        <div style={{ position: 'relative', width: '74px', height: '74px', margin: '0 auto 10px auto' }}>
          <div style={{
            width: '74px',
            height: '74px',
            borderRadius: '24px',
            background: 'var(--primary-gradient)',
            color: '#ffffff',
            fontSize: '26px',
            fontWeight: '900',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 6px 16px rgba(234, 88, 12, 0.35)',
            overflow: 'hidden',
            border: '2.5px solid rgba(255, 255, 255, 0.2)'
          }}>
            {previewFoto ? (
              <img
                src={previewFoto}
                alt="Preview Foto Baru"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : fotoProfilUrl ? (
              <img
                src={fotoProfilUrl}
                alt={user?.nama_lengkap || 'Pegawai'}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              user?.inisial || 'P'
            )}
          </div>

          {/* Tombol Kamera untuk Ubah Foto Profil Mandiri */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Ubah Foto Profil Mandiri"
            style={{
              position: 'absolute',
              bottom: '-3px',
              right: '-3px',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: '#f97316',
              border: '2px solid #0f172a',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
              transition: 'transform 0.15s'
            }}
          >
            <Camera size={14} />
          </button>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/jpg,image/webp"
            onChange={handleFotoSelect}
            style={{ display: 'none' }}
          />
        </div>

        {/* Bilah Konfirmasi Foto Baru */}
        {previewFoto && (
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(8px)',
            borderRadius: '12px',
            padding: '8px 12px',
            margin: '0 auto 10px auto',
            maxWidth: '240px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}>
            <button
              type="button"
              onClick={handleSaveFoto}
              disabled={isUploadingFoto}
              style={{
                backgroundColor: '#16a34a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '6px 14px',
                fontSize: '11px',
                fontWeight: '700',
                cursor: isUploadingFoto ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              {isUploadingFoto ? <RefreshCw size={12} className="spin-slow" /> : <Check size={12} />}
              <span>{isUploadingFoto ? 'Menyimpan...' : 'Simpan Foto'}</span>
            </button>
            <button
              type="button"
              onClick={handleCancelFoto}
              disabled={isUploadingFoto}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '11px',
                fontWeight: '700',
                cursor: isUploadingFoto ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <X size={12} /> Batal
            </button>
          </div>
        )}

        {/* Notifikasi Status Unggah Foto */}
        {fotoMessage.text && (
          <div style={{
            margin: '0 auto 10px auto',
            maxWidth: '280px',
            padding: '6px 10px',
            borderRadius: '8px',
            fontSize: '11px',
            fontWeight: '700',
            backgroundColor: fotoMessage.type === 'success' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            color: fotoMessage.type === 'success' ? '#4ade80' : '#f87171',
            border: `1px solid ${fotoMessage.type === 'success' ? 'rgba(74, 222, 128, 0.3)' : 'rgba(248, 113, 113, 0.3)'}`
          }}>
            {fotoMessage.text}
          </div>
        )}

        <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#ffffff', margin: 0 }}>
          {user?.nama_lengkap || user?.nama || 'Pegawai'}
        </h3>
        <p style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0 0 0' }}>
          {user?.nip} • {user?.jabatan || 'Staff Operasional'}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(34, 197, 94, 0.15)', padding: '4px 12px', borderRadius: '999px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#4ade80' }}></span>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#4ade80' }}>Akun Pegawai Aktif</span>
          </div>
          {(user?.is_petugas_lapangan || user?.ijinkan_wfa) && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', backgroundColor: 'rgba(99, 102, 241, 0.2)', border: '1px solid rgba(129, 140, 248, 0.3)', padding: '4px 12px', borderRadius: '999px' }}>
              <Navigation size={11} color="#a5b4fc" />
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#c7d2fe' }}>Petugas Lapangan</span>
            </div>
          )}
        </div>
      </div>

      {/* Kartu Skor Kinerja (KPI) Periode Terbaru */}
      <div style={{
        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-light)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* Dekorasi Aksen Halus di Pojok Atas */}
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '80px',
          height: '80px',
          background: 'radial-gradient(circle at top right, rgba(245, 158, 11, 0.12), transparent 70%)',
          pointerEvents: 'none'
        }} />

        {/* Header Kartu */}
        <div style={{
          padding: '12px 14px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Award size={16} strokeWidth={2.5} />
            </div>
            <div>
              <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.2px' }}>
                Skor Kinerja (KPI)
              </span>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>
                Periode Terbaru
              </span>
            </div>
          </div>

          <span style={{
            fontSize: '11px',
            fontWeight: '700',
            backgroundColor: 'rgba(15, 23, 42, 0.06)',
            color: '#334155',
            padding: '3px 9px',
            borderRadius: '999px',
            border: '1px solid rgba(15, 23, 42, 0.08)'
          }}>
            {kpiData?.periode || 'Semester Berjalan'}
          </span>
        </div>

        {/* Isi Kartu: Nilai Total & Grade */}
        <div style={{ padding: '14px 16px' }}>
          {isLoadingKpi ? (
            <div style={{ padding: '8px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--text-muted)' }}>
              <RefreshCw size={14} className="animate-spin" />
              <span style={{ fontSize: '11px', fontWeight: '600' }}>Memuat evaluasi kinerja...</span>
            </div>
          ) : kpiData ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {/* Skor Total */}
                <div>
                  <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Total Skor Akhir
                  </span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '2px' }}>
                    <span style={{
                      fontSize: '32px',
                      fontWeight: '900',
                      color: '#0f172a',
                      lineHeight: 1,
                      letterSpacing: '-1px'
                    }}>
                      {typeof kpiData.total_nilai === 'number' ? kpiData.total_nilai.toFixed(1) : kpiData.total_nilai}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#94a3b8' }}>/ 100</span>
                  </div>
                </div>

                {/* Grade & Predikat Badge */}
                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    display: 'inline-block',
                    padding: '4px 12px',
                    borderRadius: '8px',
                    fontWeight: '900',
                    fontSize: '13px',
                    backgroundColor: kpiData.grade === 'A' ? 'rgba(34, 197, 94, 0.15)' :
                                     kpiData.grade === 'B' ? 'rgba(59, 130, 246, 0.15)' :
                                     kpiData.grade === 'C' ? 'rgba(245, 158, 11, 0.15)' :
                                     kpiData.grade === 'D' ? 'rgba(249, 115, 22, 0.15)' :
                                     'rgba(239, 68, 68, 0.15)',
                    color: kpiData.grade === 'A' ? '#16a34a' :
                           kpiData.grade === 'B' ? '#2563eb' :
                           kpiData.grade === 'C' ? '#d97706' :
                           kpiData.grade === 'D' ? '#ea580c' :
                           '#dc2626',
                    border: kpiData.grade === 'A' ? '1px solid rgba(34, 197, 94, 0.3)' :
                            kpiData.grade === 'B' ? '1px solid rgba(59, 130, 246, 0.3)' :
                            kpiData.grade === 'C' ? '1px solid rgba(245, 158, 11, 0.3)' :
                            kpiData.grade === 'D' ? '1px solid rgba(249, 115, 22, 0.3)' :
                            '1px solid rgba(239, 68, 68, 0.3)'
                  }}>
                    Grade {kpiData.grade || '-'}
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginTop: '4px' }}>
                    {kpiData.predikat || 'Hasil Evaluasi'}
                  </span>
                </div>
              </div>

              {/* Progress Bar Visual Mini */}
              <div style={{ marginTop: '12px' }}>
                <div style={{
                  width: '100%',
                  height: '6px',
                  backgroundColor: '#e2e8f0',
                  borderRadius: '999px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${Math.min(Math.max(parseFloat(kpiData.total_nilai) || 0, 0), 100)}%`,
                    height: '100%',
                    borderRadius: '999px',
                    background: kpiData.grade === 'A' ? 'linear-gradient(90deg, #22c55e, #16a34a)' :
                                kpiData.grade === 'B' ? 'linear-gradient(90deg, #3b82f6, #2563eb)' :
                                kpiData.grade === 'C' ? 'linear-gradient(90deg, #f59e0b, #d97706)' :
                                'linear-gradient(90deg, #ef4444, #dc2626)',
                    transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
                  }} />
                </div>
              </div>

              {/* Status Validasi & Tanggal Evaluasi */}
              <div style={{
                marginTop: '10px',
                paddingTop: '8px',
                borderTop: '1px dashed var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '10px',
                color: 'var(--text-muted)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 size={12} color="#16a34a" />
                  <span style={{ fontWeight: '600', color: '#16a34a' }}>
                    {kpiData.status === 'approved' ? 'Disetujui HRD' : (kpiData.status === 'submitted' ? 'Diserahkan' : 'Draf Evaluasi')}
                  </span>
                </div>
                {kpiData.tanggal_penilaian && (
                  <span>Tgl: {kpiData.tanggal_penilaian}</span>
                )}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '6px 0' }}>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
                Belum ada penilaian evaluasi KPI untuk periode ini.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Informasi Kepegawaian */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-light)',
        boxShadow: '0 1px 4px rgba(0, 0, 0, 0.02)',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Departemen</span>
          <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-main)' }}>{user?.departemen || 'Operasional'}</span>
        </div>
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Divisi</span>
          <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-main)' }}>{user?.divisi || 'Umum'}</span>
        </div>
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Pola Jadwal</span>
          <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-main)' }}>{user?.tipe_jadwal || 'Fleksibel'}</span>
        </div>
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Flag Denda</span>
          <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--primary-600)' }}>{user?.label_flag_denda || 'Denda Masuk & Pulang'}</span>
        </div>
        <div style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Akses WFA</span>
          <span style={{ fontSize: '12px', fontWeight: '700', color: user?.ijinkan_wfa ? 'var(--success)' : 'var(--text-muted)' }}>
            {user?.ijinkan_wfa ? 'Bebas Radius Kantor' : 'Wajib di Radius Kantor'}
          </span>
        </div>
      </div>

      {/* Data Pribadi & Administrasi (dari Odoo) */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-light)',
        boxShadow: '0 1px 4px rgba(0, 0, 0, 0.02)',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>Data Pribadi</span>
        </div>
        {[
          ['NIK', user?.nik],
          ['NPWP', user?.npwp],
          ['BPJS Ketenagakerjaan', user?.bpjs_ketenagakerjaan],
          ['BPJS Kesehatan', user?.bpjs_kesehatan],
          ['Status PTKP', user?.ptkp_status],
          ['Tanggal Lahir', user?.tanggal_lahir],
          ['Jenis Kelamin', user?.gender],
          ['Status Kawin', user?.status_kawin],
          ['No. HP', user?.no_hp],
          ['Email', user?.email],
          ['Atasan', user?.manager],
          ['Coach', user?.coach],
        ].map(([label, val], i, arr) => (
          <div key={label} style={{ padding: '12px 14px', borderBottom: i < arr.length - 1 ? '1px solid var(--border-subtle)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{label}</span>
            <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-main)' }}>{val || '-'}</span>
          </div>
        ))}
      </div>

      {/* Menu Akses: Jadwal Kerja & Shift Pegawai */}
      <div
        onClick={onOpenJadwal}
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-md)',
          border: '1.5px solid #ddd6fe',
          padding: '14px 16px',
          boxShadow: '0 2px 10px rgba(124, 58, 237, 0.06)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #ffffff 0%, #faf5ff 100%)',
          transition: 'all 0.2s'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #faf5ff 0%, #ede9fe 100%)',
            border: '1px solid #ddd6fe',
            color: '#7c3aed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 10px rgba(124, 58, 237, 0.12)',
            flexShrink: 0
          }}>
            <CalendarDays size={22} strokeWidth={2.2} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>
                Jadwal Kerja & Shift
              </span>
              <span style={{
                fontSize: '9px',
                fontWeight: '800',
                color: '#7c3aed',
                backgroundColor: '#ede9fe',
                padding: '2px 6px',
                borderRadius: '6px'
              }}>
                Jam Kerja
              </span>
            </div>
            <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0', lineHeight: 1.3 }}>
              Lihat jadwal shift kerja, batas jam absen & istirahat
            </p>
          </div>
        </div>

        <div style={{
          width: '30px',
          height: '30px',
          borderRadius: '8px',
          backgroundColor: '#ffffff',
          border: '1px solid #ddd6fe',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#7c3aed',
          flexShrink: 0
        }}>
          <ChevronRight size={18} />
        </div>
      </div>

      {/* Menu Akses: Info Aturan & Akumulasi Denda */}
      <div
        onClick={onOpenDenda}
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-md)',
          border: '1.5px solid #fecdd3',
          padding: '14px 16px',
          boxShadow: '0 2px 10px rgba(225, 29, 72, 0.06)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #ffffff 0%, #fff1f2 100%)',
          transition: 'all 0.2s'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)',
            border: '1px solid #fecdd3',
            color: '#e11d48',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 10px rgba(225, 29, 72, 0.12)',
            flexShrink: 0
          }}>
            <CircleDollarSign size={22} strokeWidth={2.2} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>
                Info Aturan & Denda
              </span>
              <span style={{
                fontSize: '9px',
                fontWeight: '800',
                color: '#e11d48',
                backgroundColor: '#ffe4e6',
                padding: '2px 6px',
                borderRadius: '6px'
              }}>
                Kedisiplinan
              </span>
            </div>
            <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0', lineHeight: 1.3 }}>
              Ketentuan keterlambatan, pulang cepat & total denda
            </p>
          </div>
        </div>

        <div style={{
          width: '30px',
          height: '30px',
          borderRadius: '8px',
          backgroundColor: '#ffffff',
          border: '1px solid #fecdd3',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#e11d48',
          flexShrink: 0
        }}>
          <ChevronRight size={18} />
        </div>
      </div>

      {/* Status Keamanan Lock Device */}
      <div style={{
        padding: '14px 16px',
        backgroundColor: '#f8fafc',
        borderRadius: 'var(--radius-md)',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', fontWeight: '800', fontSize: '12px', marginBottom: '4px' }}>
          <ShieldCheck size={16} style={{ color: 'var(--primary-600)' }} />
          <span>Status Keamanan Perangkat</span>
        </div>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '0 0 8px 0', lineHeight: '1.4' }}>
          Akun Anda telah dikunci pada smartphone ini (Single Device Policy) untuk mencegah penyalahgunaan akun & titip absen.
        </p>
        <div style={{ fontSize: '10px', color: '#64748b', fontFamily: 'var(--font-mono)', wordBreak: 'break-all', backgroundColor: '#ffffff', padding: '6px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
          Device UUID: {deviceId}
        </div>
      </div>

      {/* Fitur Ubah Password */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-light)',
        padding: '16px',
        boxShadow: '0 1px 4px rgba(0, 0, 0, 0.02)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <KeyRound size={17} style={{ color: 'var(--primary-600)' }} />
            <div>
              <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)', display: 'block' }}>
                Ubah Kata Sandi
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Perbarui kata sandi akun secara berkala
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { setShowPasswordForm(!showPasswordForm); setMessage({ type: '', text: '' }); }}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              backgroundColor: showPasswordForm ? 'var(--bg-slate)' : 'var(--primary-50)',
              border: 'none',
              fontSize: '11px',
              fontWeight: '700',
              color: showPasswordForm ? 'var(--text-muted)' : 'var(--primary-700)',
              cursor: 'pointer'
            }}
          >
            {showPasswordForm ? 'Batal' : 'Ubah'}
          </button>
        </div>

        {showPasswordForm && (
          <form onSubmit={handlePasswordSubmit} style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }} className="animate-fade-in">
            {message.text && (
              <div style={{
                padding: '8px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '600',
                backgroundColor: message.type === 'success' ? '#dcfce7' : '#fee2e2',
                color: message.type === 'success' ? '#16a34a' : '#dc2626',
              }}>
                {message.text}
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '4px' }}>
                Kata Sandi Saat Ini
              </label>
              <input
                type="password"
                value={passwordLama}
                onChange={(e) => setPasswordLama(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-light)',
                  fontSize: '12px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '4px' }}>
                Kata Sandi Baru
              </label>
              <input
                type="password"
                value={passwordBaru}
                onChange={(e) => setPasswordBaru(e.target.value)}
                placeholder="Minimal 6 karakter"
                required
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-light)',
                  fontSize: '12px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '4px' }}>
                Konfirmasi Kata Sandi Baru
              </label>
              <input
                type="password"
                value={passwordBaruConfirmation}
                onChange={(e) => setPasswordBaruConfirmation(e.target.value)}
                placeholder="Ulangi kata sandi baru"
                required
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-light)',
                  fontSize: '12px'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                marginTop: '4px',
                padding: '9px',
                borderRadius: '6px',
                background: 'var(--primary-gradient)',
                border: 'none',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                opacity: isSubmitting ? 0.7 : 1
              }}
            >
              {isSubmitting ? 'Memproses...' : 'Simpan Kata Sandi Baru'}
            </button>
          </form>
        )}
      </div>

      {/* Tombol Logout */}
      <button
        type="button"
        onClick={onLogout}
        style={{
          width: '100%',
          height: '46px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: '#fff1f2',
          border: '1.5px solid #fecdd3',
          color: '#be123c',
          fontSize: '13px',
          fontWeight: '800',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          cursor: 'pointer'
        }}
      >
        <LogOut size={16} />
        <span>Keluar dari Aplikasi</span>
      </button>
    </div>
  );
}
