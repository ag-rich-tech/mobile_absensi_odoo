import React, { useState, useEffect } from 'react';
import { ChevronLeft, CalendarDays, Clock, CheckCircle2, AlertCircle, Building2, Calendar, Coffee, Sparkles, ArrowLeftRight, ChevronRight } from 'lucide-react';
import api from '../../services/api';
import TukarShiftModal from './TukarShiftModal';

export default function JadwalView({ onBack }) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTukarShiftOpen, setIsTukarShiftOpen] = useState(false);
  const [pendingTukarCount, setPendingTukarCount] = useState(0);

  const fetchJadwal = async () => {
    setIsLoading(true);
    try {
      const res = await api.getJadwal();
      if (res.success) {
        setData(res);
        if (res.is_roster) {
          api.getTukarShiftCount()
            .then(countRes => {
              if (countRes.success) {
                setPendingTukarCount(countRes.pending_count || 0);
              }
            })
            .catch(() => { });
        }
      }
    } catch (err) {
      console.error('Gagal memuat jadwal kerja:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJadwal();
  }, []);

  const shift = data?.shift_aktif;
  const isRoster = Boolean(data?.is_roster);
  const rosterList = data?.roster_bulan_ini || [];
  const daftarShift = data?.daftar_shift || [];
  const hariKerja = data?.hari_kerja || [];
  const hariLibur = data?.hari_libur || [];

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
            Jadwal Jam Kerja
          </h2>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
            {isRoster ? 'Jadwal shift dinamis roster bulanan' : 'Jam kerja operasional resmi'}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
          Memuat jadwal kerja Anda...
        </div>
      ) : (
        <>
          {/* Card Shift Aktif Hari Ini */}
          {shift?.is_hari_libur ? (
            /* Card Jika Hari Libur / Day Off */
            <div style={{
              background: 'linear-gradient(135deg, #991b1b 0%, #7f1d1d 100%)',
              borderRadius: 'var(--radius-md)',
              padding: '18px',
              color: '#ffffff',
              boxShadow: '0 4px 14px rgba(153, 27, 27, 0.25)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '10px', fontWeight: '800', color: '#fecaca', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Coffee size={13} />
                  <span>Jadwal Hari Ini</span>
                </span>
                <span style={{ fontSize: '11px', fontWeight: '800', color: '#fee2e2', backgroundColor: 'rgba(255, 255, 255, 0.2)', padding: '2px 8px', borderRadius: '999px' }}>
                  🛑 Libur (Day Off)
                </span>
              </div>

              <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#ffffff', margin: '0 0 6px 0' }}>
                Hari Libur (Day Off)
              </h3>
              <p style={{ fontSize: '12px', color: '#fecaca', margin: '0 0 12px 0', lineHeight: '1.4' }}>
                {shift?.keterangan || 'Anda dijadwalkan Day Off (Libur) pada kalender roster kerja hari ini.'}
              </p>
              <div style={{ paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.2)', fontSize: '11px', color: '#fee2e2', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={14} />
                <span>Selamat beristirahat dan menyegarkan stamina Anda!</span>
              </div>
            </div>
          ) : (
            /* Card Shift Kerja Aktif */
            <div style={{
              background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
              borderRadius: 'var(--radius-md)',
              padding: '18px',
              color: '#ffffff',
              boxShadow: '0 4px 14px rgba(234, 88, 12, 0.25)',
              position: 'relative'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '10px', fontWeight: '800', color: '#fed7aa', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {isRoster ? '★ Shift Roster Khusus Hari Ini' : 'Shift Kerja Anda Hari Ini'}
                </span>
                <span style={{ fontSize: '11px', fontWeight: '800', color: '#ffffff', backgroundColor: 'rgba(255, 255, 255, 0.25)', padding: '2px 8px', borderRadius: '999px' }}>
                  Aktif
                </span>
              </div>

              <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#ffffff', margin: '0 0 14px 0' }}>
                {shift?.nama || 'Shift Reguler'}
              </h3>

              {/* Format Waktu Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div style={{ padding: '10px', backgroundColor: 'rgba(255, 255, 255, 0.12)', borderRadius: '8px' }}>
                  <span style={{ fontSize: '10px', color: '#ffedd5', display: 'block' }}>Awal Masuk</span>
                  <span style={{ fontSize: '18px', fontWeight: '800', fontFamily: 'var(--font-mono)' }}>
                    {shift?.jam_awal_masuk}
                  </span>
                  <span style={{ fontSize: '9px', color: '#fed7aa', display: 'block' }}>Buka Absen</span>
                </div>

                <div style={{ padding: '10px', backgroundColor: 'rgba(255, 255, 255, 0.12)', borderRadius: '8px', borderLeft: '3px solid #fecaca' }}>
                  <span style={{ fontSize: '10px', color: '#ffedd5', display: 'block' }}>Jam Masuk Resmi</span>
                  <span style={{ fontSize: '18px', fontWeight: '800', fontFamily: 'var(--font-mono)', color: '#ffffff' }}>
                    {shift?.jam_masuk}
                  </span>
                  <span style={{ fontSize: '9px', color: '#fed7aa', display: 'block' }}>Acuan Denda</span>
                </div>

                <div style={{ padding: '10px', backgroundColor: 'rgba(255, 255, 255, 0.12)', borderRadius: '8px', borderLeft: '3px solid #fca5a5' }}>
                  <span style={{ fontSize: '10px', color: '#ffedd5', display: 'block' }}>Batas Akhir Masuk</span>
                  <span style={{ fontSize: '18px', fontWeight: '800', fontFamily: 'var(--font-mono)', color: '#ffffff' }}>
                    {shift?.jam_akhir_masuk}
                  </span>
                  <span style={{ fontSize: '9px', color: '#fed7aa', display: 'block' }}>Batas Tutup Masuk</span>
                </div>

                <div style={{ padding: '10px', backgroundColor: 'rgba(255, 255, 255, 0.12)', borderRadius: '8px' }}>
                  <span style={{ fontSize: '10px', color: '#ffedd5', display: 'block' }}>Jam Pulang Resmi</span>
                  <span style={{ fontSize: '18px', fontWeight: '800', fontFamily: 'var(--font-mono)' }}>
                    {shift?.jam_pulang}
                  </span>
                  <span style={{ fontSize: '9px', color: '#fed7aa', display: 'block' }}>Acuan Cepat</span>
                </div>
              </div>

              <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.2)', fontSize: '11px', color: '#fed7aa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Toleransi Keterlambatan: <strong>{shift?.toleransi_menit || 0} Menit</strong></span>
                {shift?.batasi_absen && (
                  <span style={{ backgroundColor: '#ef4444', color: '#ffffff', fontSize: '9px', fontWeight: '800', padding: '1px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>
                    Pembatasan Aktif
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Bagian Khusus Karyawan Roster: Daftar Jadwal Roster Bulan Ini */}
          {isRoster && (
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-light)',
              padding: '16px',
              boxShadow: '0 1px 4px rgba(0, 0, 0, 0.02)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
                    Kalender Roster Pribadi Anda
                  </h4>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                    Jadwal shift dinamis yang ditetapkan untuk Anda
                  </p>
                </div>
                <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--primary-700)', backgroundColor: 'var(--primary-50)', padding: '3px 8px', borderRadius: '6px' }}>
                  {rosterList.length} Hari Terjadwal
                </span>
              </div>

              {/* Tombol Ajukan Tukar Shift Roster */}
              <div style={{ marginBottom: '14px' }}>
                <button
                  type="button"
                  onClick={() => setIsTukarShiftOpen(true)}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                    color: '#ffffff',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 3px 10px rgba(2, 132, 199, 0.22)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <ArrowLeftRight size={16} />
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <span style={{ fontSize: '12px', fontWeight: '800', display: 'block', lineHeight: 1.2 }}>
                        Ajukan Tukar Shift Roster
                      </span>
                      <span style={{ fontSize: '10px', color: '#e0f2fe', display: 'block' }}>
                        Tukar jadwal shift dengan rekan sesama roster
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {pendingTukarCount > 0 && (
                      <span style={{
                        backgroundColor: '#ef4444',
                        color: '#ffffff',
                        fontSize: '10px',
                        fontWeight: '900',
                        padding: '2px 8px',
                        borderRadius: '999px',
                        boxShadow: '0 2px 5px rgba(239, 68, 68, 0.4)'
                      }}>
                        {pendingTukarCount} Permintaan
                      </span>
                    )}
                    <ChevronRight size={16} style={{ opacity: 0.8 }} />
                  </div>
                </button>
              </div>

              {rosterList.length === 0 ? (
                <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', backgroundColor: 'var(--bg-slate)', borderRadius: '8px' }}>
                  <CalendarDays size={24} style={{ margin: '0 auto 8px auto', opacity: 0.4 }} />
                  <p style={{ margin: 0, fontWeight: '600' }}>Belum ada jadwal roster khusus untuk bulan ini.</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '11px' }}>Admin operasional belum menginput jadwal roster Anda.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '340px', overflowY: 'auto' }}>
                  {rosterList.map((item) => (
                    <div
                      key={item.tanggal}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: item.is_today ? '2px solid var(--primary-500)' : '1px solid var(--border-light)',
                        backgroundColor: item.is_today ? 'var(--primary-50)' : (item.is_hari_libur ? '#fff1f2' : '#ffffff'),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          backgroundColor: item.is_today ? 'var(--primary-600)' : (item.is_hari_libur ? '#fecdd3' : '#f1f5f9'),
                          color: item.is_today ? '#ffffff' : (item.is_hari_libur ? '#be123c' : '#334155'),
                          fontWeight: '800',
                          fontSize: '13px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontFamily: 'var(--font-mono)'
                        }}>
                          {item.tanggal.slice(-2)}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-main)' }}>
                              {item.hari}, {item.tanggal_formatted}
                            </span>
                            {item.is_today && (
                              <span style={{ fontSize: '9px', fontWeight: '800', color: '#ffffff', backgroundColor: 'var(--primary-600)', padding: '1px 6px', borderRadius: '4px' }}>
                                Hari Ini
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: '11px', color: item.is_hari_libur ? '#e11d48' : 'var(--text-muted)', fontWeight: item.is_hari_libur ? '700' : '500' }}>
                            {item.nama_shift}
                          </span>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        {item.is_hari_libur ? (
                          <span style={{ fontSize: '10px', fontWeight: '800', color: '#be123c', backgroundColor: '#ffe4e6', padding: '2px 8px', borderRadius: '6px' }}>
                            OFF (Libur)
                          </span>
                        ) : (
                          <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--primary-700)', fontFamily: 'var(--font-mono)' }}>
                            {item.jam_masuk} - {item.jam_pulang}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Pola Hari Kerja Mingguan (Untuk Pegawai Non-Roster) */}
          {!isRoster && (
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-light)',
              padding: '16px',
              boxShadow: '0 1px 4px rgba(0, 0, 0, 0.02)'
            }}>
              <h4 style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '10px' }}>
                Pola Hari Kerja Mingguan
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center' }}>
                {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((day, idx) => {
                  const isWorkDay = idx < 5; // Default Senin - Jumat
                  return (
                    <div
                      key={day}
                      style={{
                        padding: '8px 2px',
                        borderRadius: '8px',
                        backgroundColor: isWorkDay ? 'var(--primary-50)' : 'var(--bg-slate)',
                        border: isWorkDay ? '1px solid var(--primary-200)' : '1px solid var(--border-light)'
                      }}
                    >
                      <span style={{ fontSize: '11px', fontWeight: '800', color: isWorkDay ? 'var(--primary-700)' : 'var(--text-muted)', display: 'block' }}>
                        {day}
                      </span>
                      <span style={{ fontSize: '9px', color: isWorkDay ? 'var(--primary-600)' : 'var(--text-light)' }}>
                        {isWorkDay ? 'Kerja' : 'Libur'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Hari Libur Nasional Mendatang */}
          {hariLibur.length > 0 && (
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-light)',
              padding: '16px',
              boxShadow: '0 1px 4px rgba(0, 0, 0, 0.02)'
            }}>
              <h4 style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '10px' }}>
                Hari Libur Nasional Terdekat
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {hariLibur.map((hl) => (
                  <div key={hl.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', backgroundColor: 'var(--bg-slate)', borderRadius: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-main)' }}>{hl.nama}</span>
                    <span style={{ fontSize: '11px', color: '#dc2626', fontWeight: '700' }}>{hl.tanggal}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal Tukar Shift Roster */}
      <TukarShiftModal
        isOpen={isTukarShiftOpen}
        onClose={() => setIsTukarShiftOpen(false)}
        onSuccess={() => {
          fetchJadwal();
        }}
      />
    </div>
  );
}
