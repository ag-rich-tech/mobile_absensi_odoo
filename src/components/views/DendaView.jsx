import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  CircleDollarSign, 
  ShieldAlert, 
  Info, 
  LogIn, 
  LogOut, 
  HelpCircle
} from 'lucide-react';
import api from '../../services/api';

export default function DendaView({ onBack }) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDenda = async () => {
      setIsLoading(true);
      try {
        const res = await api.getDenda();
        if (res.success) {
          setData(res);
        }
      } catch (err) {
        console.error('Gagal memuat informasi aturan denda:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDenda();
  }, []);

  const aturanMasuk = data?.aturan_denda_masuk || [];
  const aturanPulang = data?.aturan_denda_pulang || [];

  return (
    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }} className="animate-fade-in">
      {/* Header Navigasi */}
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
            Informasi Aturan Denda
          </h2>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
            Kebijakan & pedoman sanksi keterlambatan kerja
          </p>
        </div>
      </div>

      {isLoading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
          Memuat informasi ketentuan denda...
        </div>
      ) : (
        <>
          {/* Banner Informasi Kebijakan Perusahaan */}
          <div style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            color: '#ffffff',
            boxShadow: '0 4px 16px rgba(15, 23, 42, 0.15)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#f87171',
                flexShrink: 0
              }}>
                <ShieldAlert size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <h3 style={{ fontSize: '13px', fontWeight: '800', color: '#ffffff', margin: 0 }}>
                    Pedoman Kedisiplinan Presensi
                  </h3>
                  <span style={{ fontSize: '9px', fontWeight: '700', color: '#93c5fd', backgroundColor: 'rgba(59, 130, 246, 0.2)', padding: '2px 7px', borderRadius: '999px' }}>
                    Standar Perusahaan
                  </span>
                </div>
                <p style={{ fontSize: '11px', color: '#cbd5e1', margin: 0, lineHeight: '1.45' }}>
                  Sistem menerapkan ketentuan denda secara transparan berdasarkan waktu presensi aktual terhadap jam kerja shift Anda. Halaman ini memuat daftar acuan besaran tarif denda resmi yang berlaku di perusahaan.
                </p>
              </div>
            </div>
          </div>

          {/* Bagian 1: Ketentuan Denda Terlambat Masuk */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-light)',
            padding: '16px',
            boxShadow: '0 1px 4px rgba(0, 0, 0, 0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#fff1f2',
                color: '#e11d48',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <LogIn size={16} />
              </div>
              <div>
                <h4 style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
                  Denda Terlambat Masuk
                </h4>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
                  Dihitung setelah melewati batas jam akhir masuk shift
                </p>
              </div>
            </div>

            <div style={{
              padding: '10px 12px',
              backgroundColor: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: '8px',
              fontSize: '11px',
              color: '#92400e',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '6px'
            }}>
              <Info size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>
                Presensi masuk yang dilakukan <strong>sebelum atau tepat pada batas akhir masuk</strong> dinyatakan tepat waktu dan bebas dari denda.
              </span>
            </div>

            {aturanMasuk.length === 0 ? (
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', margin: '8px 0' }}>
                Belum ada aturan denda masuk yang aktif.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {aturanMasuk.map((a, idx) => (
                  <div
                    key={a.id || idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 12px',
                      backgroundColor: 'var(--bg-slate)',
                      border: '1px solid var(--border-light)',
                      borderRadius: '8px',
                      fontSize: '11px'
                    }}
                  >
                    <div>
                      <span style={{ color: 'var(--text-main)', fontWeight: '700', display: 'block' }}>
                        Terlambat {a.rentang}
                      </span>
                      {a.keterangan && (
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          {a.keterangan}
                        </span>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontWeight: '800', color: '#be123c', fontSize: '12px', fontFamily: 'monospace' }}>
                        {a.nominal_formatted}
                      </span>
                      {(a.jenis || a.label_jenis) && (
                        <span style={{ display: 'block', fontSize: '9px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                          {(a.jenis || a.label_jenis).replace('_', ' ')}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bagian 2: Ketentuan Denda Pulang Cepat */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-light)',
            padding: '16px',
            boxShadow: '0 1px 4px rgba(0, 0, 0, 0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <LogOut size={16} />
              </div>
              <div>
                <h4 style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
                  Denda Pulang Cepat
                </h4>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
                  Dikenakan jika presensi pulang mendahului jam awal pulang shift
                </p>
              </div>
            </div>

            <div style={{
              padding: '10px 12px',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '8px',
              fontSize: '11px',
              color: '#1e40af',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '6px'
            }}>
              <Info size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>
                Presensi pulang <strong>setelah jam awal pulang</strong> dinyatakan selesai sesuai jam kerja dan bebas dari denda pulang cepat.
              </span>
            </div>

            {aturanPulang.length === 0 ? (
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', margin: '8px 0' }}>
                Tidak ada aturan denda pulang cepat.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {aturanPulang.map((a, idx) => (
                  <div
                    key={a.id || idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 12px',
                      backgroundColor: 'var(--bg-slate)',
                      border: '1px solid var(--border-light)',
                      borderRadius: '8px',
                      fontSize: '11px'
                    }}
                  >
                    <div>
                      <span style={{ color: 'var(--text-main)', fontWeight: '700', display: 'block' }}>
                        Mendahului {a.rentang}
                      </span>
                      {a.keterangan && (
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          {a.keterangan}
                        </span>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontWeight: '800', color: '#2563eb', fontSize: '12px', fontFamily: 'monospace' }}>
                        {a.nominal_formatted}
                      </span>
                      {(a.jenis || a.label_jenis) && (
                        <span style={{ display: 'block', fontSize: '9px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                          {(a.jenis || a.label_jenis).replace('_', ' ')}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bagian 3: Tips & Panduan Menghindari Denda */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-light)',
            padding: '16px',
            boxShadow: '0 1px 4px rgba(0, 0, 0, 0.02)'
          }}>
            <h4 style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <HelpCircle size={15} style={{ color: '#0284c7' }} />
              <span>Panduan Menghindari Denda</span>
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.45' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                <span style={{ color: '#16a34a', fontWeight: 'bold' }}>✓</span>
                <span><strong>Cek Jadwal Shift:</strong> Selalu periksa jam masuk & batas akhir masuk pada menu <em>Jadwal Kerja</em> sebelum jam kerja dimulai.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                <span style={{ color: '#16a34a', fontWeight: 'bold' }}>✓</span>
                <span><strong>Ajukan Izin / Cuti:</strong> Jika berhalangan hadir atau ada urusan mendadak, ajukan permohonan izin lebih awal pada menu <em>Izin & Cuti</em>.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                <span style={{ color: '#16a34a', fontWeight: 'bold' }}>✓</span>
                <span><strong>Tugas Dinas Luar:</strong> Apabila ditugaskan dinas di luar kantor, gunakan fitur <em>Dinas Luar</em> agar presensi tercatat resmi tanpa pemotongan denda.</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
