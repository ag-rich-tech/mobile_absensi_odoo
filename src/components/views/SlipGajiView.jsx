import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  Receipt,
  Wallet,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Printer,
  ChevronRight,
  Sparkles,
  Info,
  ArrowRight,
  Coins,
  Building,
  CreditCard,
  User
} from 'lucide-react';
import api, { formatDurasiMenit } from '../../services/api';
import DocumentPreviewModal from '../DocumentPreviewModal';

export default function SlipGajiView({ onBack }) {
  const [slipList, setSlipList] = useState([]);
  const [selectedSlipId, setSelectedSlipId] = useState(null);
  const [slipDetail, setSlipDetail] = useState(null);
  const [detailError, setDetailError] = useState('');
  const [previewSlip, setPreviewSlip] = useState({ isOpen: false, id: null });
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Format Helper Rupiah
  const formatRupiah = (val) => {
    return 'Rp ' + Number(val || 0).toLocaleString('id-ID');
  };

  // Muat daftar slip gaji saat inisialisasi
  useEffect(() => {
    const fetchSlipList = async () => {
      setIsLoadingList(true);
      try {
        const res = await api.getSlipGaji();
        if (res.success && res.slip_gaji) {
          setSlipList(res.slip_gaji);
        } else {
          setSlipList([]);
        }
      } catch (err) {
        console.error('Gagal mengambil daftar slip gaji:', err);
      } finally {
        setIsLoadingList(false);
      }
    };
    fetchSlipList();
  }, []);

  // Muat detail saat pengguna mengklik salah satu card periode
  const handleSelectSlip = async (slipId) => {
    setSelectedSlipId(slipId);
    setIsLoadingDetail(true);
    setDetailError('');
    try {
      const res = await api.getSlipGajiDetail(slipId);
      if (res.success && res.slip) {
        setSlipDetail(res.slip);
      }
    } catch (err) {
      console.error('Gagal mengambil rincian detail slip gaji:', err);
      // S7: gagal muat = pesan error + tombol coba lagi, BUKAN spinner abadi.
      setDetailError(err.message || 'Gagal memuat rincian slip gaji.');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Tombol kembali ke daftar kartu slip
  const handleBackToList = () => {
    setSelectedSlipId(null);
    setSlipDetail(null);
    setDetailError('');
  };

  // C15: tombol Cetak (window.print, no-op di Capacitor) DIHAPUS.
  // Diganti tombol Unduh yang hanya tampil bila server menyediakan
  // dokumen slip (dokumen_id). Modul 'payslip' = asumsi penamaan
  // (kontrak C1 belum merinci modul slip) — bila server belum
  // mendukungnya, modal menampilkan error server secara jujur.
  const handleDownloadSlip = () => {
    if (!slipDetail || !slipDetail.dokumen_id) return;
    setPreviewSlip({ isOpen: true, id: slipDetail.id || selectedSlipId });
  };

  // =========================================================================
  // VIEW LEVEL 2: DETAIL SLIP GAJI (MUNCUL SAAT CARD PERIODE DI-KLIK)
  // =========================================================================
  if (selectedSlipId !== null) {
    return (
      <div style={{ padding: '16px 20px 40px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }} className="animate-fade-in">
        {/* Header Detail Slip */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              onClick={handleBackToList}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                backgroundColor: 'var(--bg-slate, #f1f5f9)',
                border: '1px solid var(--border-light, #e2e8f0)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-main, #0f172a)',
                cursor: 'pointer'
              }}
              title="Kembali ke Daftar Slip"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: '800', color: 'var(--text-main, #0f172a)', margin: 0, letterSpacing: '-0.3px' }}>
                Detail Slip Gaji
              </h2>
              <p style={{ fontSize: '11px', color: 'var(--text-sub, #64748b)', margin: 0 }}>
                {slipDetail ? `Periode ${slipDetail.periode}` : 'Memuat rincian slip...'}
              </p>
            </div>
          </div>

          {slipDetail && slipDetail.dokumen_id && (
            <button
              type="button"
              onClick={handleDownloadSlip}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                borderRadius: '10px',
                backgroundColor: 'rgba(2, 132, 199, 0.08)',
                border: '1px solid rgba(2, 132, 199, 0.2)',
                color: '#0284c7',
                fontSize: '11px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              <Printer size={14} />
              <span>Unduh Slip</span>
            </button>
          )}
        </div>

        {isLoadingDetail ? (
          <div style={{ padding: '80px 0', textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid #e2e8f0', borderTopColor: '#0284c7', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <p style={{ fontSize: '12px', marginTop: '12px', fontWeight: '600' }}>Mengambil data detail slip gaji...</p>
          </div>
        ) : detailError ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', backgroundColor: '#fef2f2', borderRadius: '16px', border: '1px solid #fecdd3' }}>
            <p style={{ fontSize: '12px', fontWeight: '700', color: '#be123c', margin: '0 0 12px 0' }}>{detailError}</p>
            <button
              type="button"
              onClick={() => handleSelectSlip(selectedSlipId)}
              style={{ padding: '8px 16px', borderRadius: '10px', backgroundColor: '#e11d48', border: 'none', color: '#ffffff', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
            >
              Coba Lagi
            </button>
          </div>
        ) : !slipDetail ? (
          <div style={{ padding: '80px 0', textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid #e2e8f0', borderTopColor: '#0284c7', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <p style={{ fontSize: '12px', marginTop: '12px', fontWeight: '600' }}>Mengambil data detail slip gaji...</p>
          </div>
        ) : (
          <>
            {/* Card Utama Total Take Home Pay */}
            <div
              style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                borderRadius: '22px',
                padding: '22px 20px',
                color: '#ffffff',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 12px 28px -6px rgba(15, 23, 42, 0.45)'
              }}
            >
              <div style={{ position: 'absolute', top: '-25px', right: '-25px', width: '130px', height: '130px', borderRadius: '50%', background: 'rgba(2, 132, 199, 0.25)', filter: 'blur(35px)' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <span style={{ fontSize: '10px', fontWeight: '800', letterSpacing: '0.8px', textTransform: 'uppercase', color: '#94a3b8' }}>
                    Gaji Bersih (Take Home Pay)
                  </span>
                  <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#f8fafc', margin: '2px 0 0' }}>
                    {slipDetail.periode}
                  </h3>
                </div>
                <span
                  style={{
                    padding: '4px 10px',
                    borderRadius: '8px',
                    fontSize: '10px',
                    fontWeight: '800',
                    textTransform: 'uppercase',
                    backgroundColor: slipDetail.status_pembayaran === 'dibayar' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                    color: slipDetail.status_pembayaran === 'dibayar' ? '#34d399' : '#60a5fa',
                    border: `1px solid ${slipDetail.status_pembayaran === 'dibayar' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`
                  }}
                >
                  {slipDetail.status_pembayaran === 'dibayar' ? 'Dibayar' : (slipDetail.state_label || '-')}
                </span>
              </div>

              <div style={{ fontSize: '28px', fontWeight: '900', color: '#34d399', letterSpacing: '-0.5px', marginBottom: '16px' }}>
                {formatRupiah(slipDetail.gaji_bersih)}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: '11px', color: '#94a3b8' }}>
                <span style={{ fontFamily: 'monospace', fontWeight: '700', color: '#cbd5e1' }}>{slipDetail.nomor_slip}</span>
                {slipDetail.metode_pembayaran ? (<span>{slipDetail.metode_pembayaran}</span>) : null}
              </div>
            </div>

            {/* Statistik Kehadiran, Lembur & Denda — hanya bila server mengirim (S3) */}
            {(slipDetail.total_kehadiran != null || slipDetail.total_jam_lembur != null || slipDetail.total_menit_terlambat != null) && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              <div style={{ background: '#ffffff', borderRadius: '16px', padding: '12px', textAlign: 'center', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                <span style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Hadir</span>
                <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>
                  {slipDetail.total_kehadiran} <span style={{ fontSize: '10px', fontWeight: '600', color: '#94a3b8' }}>Hari</span>
                </div>
              </div>

              <div style={{ background: '#fffbeb', borderRadius: '16px', padding: '12px', textAlign: 'center', border: '1px solid #fef3c7', boxShadow: '0 2px 6px rgba(217, 119, 6, 0.05)' }}>
                <span style={{ fontSize: '10px', fontWeight: '700', color: '#b45309', textTransform: 'uppercase' }}>Lembur</span>
                <div style={{ fontSize: '16px', fontWeight: '800', color: '#92400e', marginTop: '2px' }}>
                  {slipDetail.total_jam_lembur} <span style={{ fontSize: '10px', fontWeight: '600', color: '#b45309' }}>Jam</span>
                </div>
              </div>

              <div style={{ background: '#fff1f2', borderRadius: '16px', padding: '12px', textAlign: 'center', border: '1px solid #fee2e2', boxShadow: '0 2px 6px rgba(225, 29, 72, 0.05)' }}>
                <span style={{ fontSize: '10px', fontWeight: '700', color: '#be123c', textTransform: 'uppercase' }}>Terlambat</span>
                <div style={{ fontSize: '16px', fontWeight: '800', color: '#9f1239', marginTop: '2px' }}>
                  {formatDurasiMenit(slipDetail.total_menit_terlambat)}
                </div>
              </div>
            </div>
            )}

            {/* Rincian Komponen Penerimaan & Tunjangan */}
            <div style={{ background: '#ffffff', borderRadius: '18px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
              <div
                style={{
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#f8fafc',
                  borderBottom: '1px solid #e2e8f0'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <TrendingUp size={16} />
                  </div>
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>Penerimaan (Tunjangan)</span>
                    <span style={{ fontSize: '11px', color: '#059669', fontWeight: '700', marginLeft: '6px' }}>
                      +{formatRupiah(Number(slipDetail.gaji_pokok) + Number(slipDetail.total_tunjangan))}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Gaji Pokok Dasar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', paddingBottom: '8px', borderBottom: '1px dashed #f1f5f9' }}>
                  <div>
                    <span style={{ color: '#0f172a', fontWeight: '800' }}>Gaji Pokok Dasar</span>
                    <span style={{ display: 'block', fontSize: '10px', color: '#94a3b8' }}>Gaji pokok dasar bulanan</span>
                  </div>
                  <span style={{ fontWeight: '800', color: '#0f172a' }}>{formatRupiah(slipDetail.gaji_pokok)}</span>
                </div>

                {/* Daftar Tunjangan */}
                {slipDetail.rincian_tunjangan && slipDetail.rincian_tunjangan.map((t, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', paddingBottom: '8px', borderBottom: '1px dashed #f1f5f9' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: '#334155', fontWeight: '600' }}>{t.nama}</span>
                        {t.tipe === 'lembur_otomatis' && (
                          <span style={{ fontSize: '9px', fontWeight: '800', padding: '2px 5px', borderRadius: '4px', background: '#fef3c7', color: '#92400e' }}>
                            Lembur Otomatis
                          </span>
                        )}
                      </div>
                      {t.keterangan && (
                        <span style={{ fontSize: '10px', color: '#94a3b8' }}>{t.keterangan}</span>
                      )}
                    </div>
                    <span style={{ fontWeight: '700', color: '#059669' }}>+{formatRupiah(t.nominal)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Rincian Komponen Potongan */}
            <div style={{ background: '#ffffff', borderRadius: '18px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
              <div
                style={{
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#f8fafc',
                  borderBottom: '1px solid #e2e8f0'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#fff1f2', color: '#e11d48', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <TrendingDown size={16} />
                  </div>
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>Potongan Gaji</span>
                    <span style={{ fontSize: '11px', color: '#e11d48', fontWeight: '700', marginLeft: '6px' }}>
                      -{formatRupiah(slipDetail.total_potongan)}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {slipDetail.rincian_potongan && slipDetail.rincian_potongan.length > 0 ? (
                  slipDetail.rincian_potongan.map((p, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', paddingBottom: '8px', borderBottom: '1px dashed #f1f5f9' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ color: '#334155', fontWeight: '600' }}>{p.nama}</span>
                          {p.tipe === 'denda_otomatis' && (
                            <span style={{ fontSize: '9px', fontWeight: '800', padding: '2px 5px', borderRadius: '4px', background: '#fee2e2', color: '#991b1b' }}>
                              Denda Keterlambatan
                            </span>
                          )}
                        </div>
                        {p.keterangan && (
                          <span style={{ fontSize: '10px', color: '#94a3b8' }}>{p.keterangan}</span>
                        )}
                      </div>
                      <span style={{ fontWeight: '700', color: '#e11d48' }}>-{formatRupiah(p.nominal)}</span>
                    </div>
                  ))
                ) : (
                  <p style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic', margin: 0 }}>
                    Tidak ada potongan pada periode ini.
                  </p>
                )}
              </div>
            </div>

            {/* Tombol Aksi Bawah */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={handleBackToList}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '14px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#475569',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Kembali ke Daftar
              </button>
              {slipDetail && slipDetail.dokumen_id && (
              <button
                type="button"
                onClick={handleDownloadSlip}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)'
                }}
              >
                <Printer size={16} />
                <span>Unduh Slip Gaji</span>
              </button>
              )}
            </div>
          </>
        )}
        <DocumentPreviewModal
          isOpen={previewSlip.isOpen}
          onClose={() => setPreviewSlip({ isOpen: false, id: null })}
          modul="payslip"
          id={previewSlip.id}
          title="Dokumen Slip Gaji"
        />
      </div>
    );
  }

  // =========================================================================
  // VIEW LEVEL 1: DAFTAR CARD GAJI PERIODE & RUPIAH
  // =========================================================================
  return (
    <div style={{ padding: '16px 20px 40px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }} className="animate-fade-in">
      {/* Header Halaman Utama Slip Gaji */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          type="button"
          onClick={onBack}
          className="btn-back-action"
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '12px',
            backgroundColor: 'var(--bg-slate, #f1f5f9)',
            border: '1px solid var(--border-light, #e2e8f0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-main, #0f172a)',
            cursor: 'pointer'
          }}
          title="Kembali ke Beranda"
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main, #0f172a)', margin: 0, letterSpacing: '-0.3px' }}>
            Slip Gaji Saya
          </h2>
          <p style={{ fontSize: '11px', color: 'var(--text-sub, #64748b)', margin: 0 }}>
            Pilih periode untuk melihat rincian detail slip gaji
          </p>
        </div>
      </div>

      {isLoadingList ? (
        <div style={{ padding: '70px 0', textAlign: 'center', color: '#94a3b8' }}>
          <div style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid #e2e8f0', borderTopColor: '#0284c7', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <p style={{ fontSize: '12px', marginTop: '12px', fontWeight: '600' }}>Memuat daftar riwayat slip gaji...</p>
        </div>
      ) : slipList.length === 0 ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', background: '#f8fafc', borderRadius: '22px', border: '1px dashed #cbd5e1' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '18px', background: '#e2e8f0', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Receipt size={30} />
          </div>
          <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px' }}>Belum Ada Data Slip Gaji</h3>
          <p style={{ fontSize: '12px', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
            Slip gaji Anda belum diterbitkan atau diproses oleh HRD untuk periode saat ini.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Banner Informasi */}
          <div style={{ padding: '12px 14px', borderRadius: '14px', background: '#f0f9ff', border: '1px solid #bae6fd', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Sparkles size={16} />
            </div>
            <p style={{ fontSize: '11px', color: '#0369a1', margin: 0, fontWeight: '600', lineHeight: 1.4 }}>
              Ditemukan <strong>{slipList.length} periode slip gaji</strong>. Klik salah satu card di bawah untuk melihat rincian detail penerimaan dan potongan.
            </p>
          </div>

          {/* DAFTAR CARD SLIP GAJI PERIODE & RUPIAH */}
          {slipList.map((item) => (
            <div
              key={item.id}
              onClick={() => handleSelectSlip(item.id)}
              style={{
                background: '#ffffff',
                borderRadius: '20px',
                padding: '18px 18px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 14px -2px rgba(0, 0, 0, 0.05)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.borderColor = '#0284c7';
                e.currentTarget.style.boxShadow = '0 8px 20px -3px rgba(2, 132, 199, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.boxShadow = '0 4px 14px -2px rgba(0, 0, 0, 0.05)';
              }}
            >
              {/* Header Card: Periode & Badge Status */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Calendar size={16} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.2px' }}>
                      {item.periode}
                    </h4>
                    <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#64748b', fontWeight: '700' }}>
                      {item.nomor_slip}
                    </span>
                  </div>
                </div>

                <span
                  style={{
                    padding: '4px 10px',
                    borderRadius: '8px',
                    fontSize: '10px',
                    fontWeight: '800',
                    textTransform: 'uppercase',
                    backgroundColor: item.status_pembayaran === 'dibayar' ? '#ecfdf5' : '#eff6ff',
                    color: item.status_pembayaran === 'dibayar' ? '#059669' : '#2563eb',
                    border: `1px solid ${item.status_pembayaran === 'dibayar' ? '#a7f3d0' : '#bfdbfe'}`
                  }}
                >
                  {item.status_pembayaran === 'dibayar' ? 'Dibayar' : (item.state_label || '-')}
                </span>
              </div>

              {/* Badan Card: Nominal Rupiah Gaji Bersih */}
              <div style={{ padding: '12px 14px', borderRadius: '14px', background: '#f8fafc', border: '1px solid #f1f5f9', marginBottom: '12px' }}>
                <span style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b', display: 'block' }}>
                  Gaji Bersih Diterima
                </span>
                <div style={{ fontSize: '22px', fontWeight: '900', color: '#059669', letterSpacing: '-0.5px', marginTop: '2px' }}>
                  {formatRupiah(item.gaji_bersih)}
                </div>

                {/* Sub info ringkas */}
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #e2e8f0', fontSize: '11px', color: '#64748b' }}>
                  <span>Gaji Pokok: <strong style={{ color: '#0f172a' }}>{formatRupiah(item.gaji_pokok)}</strong></span>
                  {item.total_upah_lembur > 0 && (
                    <span style={{ color: '#b45309' }}>Lembur: <strong>+{formatRupiah(item.total_upah_lembur)}</strong></span>
                  )}
                  {item.total_denda_keterlambatan > 0 && (
                    <span style={{ color: '#be123c' }}>Denda: <strong>-{formatRupiah(item.total_denda_keterlambatan)}</strong></span>
                  )}
                </div>
              </div>

              {/* Footer Card: Tombol Klik Rincian Detail */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', fontWeight: '700', color: '#0284c7' }}>
                {item.tanggal_bayar ? (
                  <span style={{ color: '#94a3b8', fontWeight: '600' }}>
                    Dibayar pada {item.tanggal_bayar}
                  </span>
                ) : null}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>Lihat Detail Slip</span>
                  <ChevronRight size={16} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
