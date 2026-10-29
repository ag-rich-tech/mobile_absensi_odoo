import React, { useState, useEffect } from 'react';
import { ChevronLeft, Plus, Timer, Clock, CircleDollarSign, CheckCircle2, XCircle, Send, Sparkles } from 'lucide-react';
import api, { getStoredUser } from '../../services/api';
import { loadDraft, saveDraft, clearDraft, DRAFT_KEYS } from '../../services/draftService';

// Komponen Pemilih Jam Format 24 Jam (00:00 - 23:59)
function TimeInput24({ label, value, onChange, iconColor = '#d97706' }) {
  const parts = (value || '00:00').split(':');
  const h = parts[0] ? parts[0].padStart(2, '0') : '17';
  const m = parts[1] ? parts[1].padStart(2, '0') : '00';

  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const baseMinutes = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));
  const minutes = Array.from(new Set([...baseMinutes, m])).sort((a, b) => Number(a) - Number(b));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Clock size={12} style={{ color: iconColor }} />
          <span>{label}</span>
        </label>
        <span style={{ fontSize: '9px', fontWeight: '800', color: '#b45309', backgroundColor: '#fef3c7', padding: '1px 5px', borderRadius: '4px', letterSpacing: '0.2px' }}>
          24 JAM
        </span>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        backgroundColor: '#f8fafc',
        border: '1.5px solid #e2e8f0',
        borderRadius: '8px',
        padding: '6px 8px',
      }}>
        {/* Dropdown Jam 00-23 */}
        <div style={{ flex: 1 }}>
          <select
            value={h}
            onChange={(e) => onChange(`${e.target.value}:${m}`)}
            style={{
              width: '100%',
              padding: '6px 2px',
              fontSize: '13px',
              fontWeight: '700',
              fontFamily: 'monospace',
              color: 'var(--text-main)',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              textAlign: 'center',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {hours.map((hour) => (
              <option key={hour} value={hour}>
                {hour}
              </option>
            ))}
          </select>
          <span style={{ display: 'block', fontSize: '9px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '2px', fontWeight: '600' }}>
            Jam (00-23)
          </span>
        </div>

        <span style={{ fontSize: '14px', fontWeight: '800', color: '#94a3b8', marginBottom: '12px' }}>:</span>

        {/* Dropdown Menit 00-55 */}
        <div style={{ flex: 1 }}>
          <select
            value={m}
            onChange={(e) => onChange(`${h}:${e.target.value}`)}
            style={{
              width: '100%',
              padding: '6px 2px',
              fontSize: '13px',
              fontWeight: '700',
              fontFamily: 'monospace',
              color: 'var(--text-main)',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              textAlign: 'center',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {minutes.map((min) => (
              <option key={min} value={min}>
                {min}
              </option>
            ))}
          </select>
          <span style={{ display: 'block', fontSize: '9px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '2px', fontWeight: '600' }}>
            Menit
          </span>
        </div>

        <div style={{
          padding: '4px 6px',
          backgroundColor: '#f1f5f9',
          border: '1px solid #e2e8f0',
          borderRadius: '5px',
          color: '#475569',
          fontSize: '10px',
          fontWeight: '700',
          marginBottom: '12px',
          userSelect: 'none'
        }}>
          WIB
        </div>
      </div>
    </div>
  );
}

export default function LemburView({ onBack }) {
  // Draf form (1.2.23): bertahan saat tab switch/unmount; dihapus saat submit sukses.
  const draftKey = getStoredUser()?.id ? DRAFT_KEYS.lembur(getStoredUser().id) : null;
  const draft0 = draftKey ? loadDraft(draftKey, {}) : {};
  const [list, setList] = useState([]);
  // D2-12: ringkasan/tarif HANYA bila server mengirimnya (null = sembunyikan).
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [ringkasan, setRingkasan] = useState(null);
  const [tarifPerJam, setTarifPerJam] = useState(null);

  // Form State (Format 24 Jam)
  const [tanggalLembur, setTanggalLembur] = useState(draft0.tanggalLembur || new Date().toISOString().split('T')[0]);
  const [jamMulai, setJamMulai] = useState(draft0.jamMulai || '17:30');
  const [jamSelesai, setJamSelesai] = useState(draft0.jamSelesai || '20:30');
  const [keteranganTugas, setKeteranganTugas] = useState(draft0.keteranganTugas || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState({ type: '', text: '' });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await api.getLembur();
      if (res.success) {
        if (res.tarif_upah_per_jam) setTarifPerJam(Number(res.tarif_upah_per_jam));
        if (res.ringkasan || res.ringkasan_bulan_ini) setRingkasan(res.ringkasan || res.ringkasan_bulan_ini);
        if (res.lembur) setList(res.lembur);
      }
    } catch (err) {
      console.error('Gagal memuat data lembur:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const calculateHours = () => {
    try {
      const [h1, m1] = jamMulai.split(':').map(Number);
      const [h2, m2] = jamSelesai.split(':').map(Number);
      let totalMinutes = (h2 * 60 + m2) - (h1 * 60 + m1);
      if (totalMinutes < 0) {
        // Melintasi tengah malam (misal lembur 21:00 s/d 01:00)
        totalMinutes += 24 * 60;
      }
      return totalMinutes > 0 ? (totalMinutes / 60).toFixed(1) : '1.0';
    } catch {
      return '1.0';
    }
  };

  const handleApplyPreset = (mulai, pulang) => {
    setJamMulai(mulai);
    setJamSelesai(pulang);
  };

  // Simpan draf tiap perubahan field (file tidak ikut — tidak bisa JSON).
  useEffect(() => {
    if (!draftKey) return;
    saveDraft(draftKey, { tanggalLembur, jamMulai, jamSelesai, keteranganTugas });
  }, [draftKey, tanggalLembur, jamMulai, jamSelesai, keteranganTugas]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!keteranganTugas.trim()) {
      setFormMessage({ type: 'error', text: 'Mohon isi uraian tugas pekerjaan lembur.' });
      return;
    }

    setIsSubmitting(true);
    setFormMessage({ type: '', text: '' });

    try {
      const res = await api.ajukanLembur({
        tanggal_lembur: tanggalLembur,
        jam_mulai: jamMulai,
        jam_selesai: jamSelesai,
        keterangan_tugas: keteranganTugas.trim(),
      });

      if (res.success) {
        setFormMessage({ type: 'success', text: res.message || 'Pengajuan lembur berhasil dikirim.' });
        if (draftKey) clearDraft(draftKey);
        setKeteranganTugas('');
        setShowForm(false);
        loadData();
      }
    } catch (err) {
      setFormMessage({ type: 'error', text: err.message || 'Gagal mengirim pengajuan lembur.' });
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
              Lembur Karyawan
            </h2>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
              Format 24 Jam • Jam kerja tambahan & upah
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
            background: showForm ? 'var(--bg-slate)' : 'linear-gradient(135deg, #d97706, #b45309)',
            border: showForm ? '1px solid var(--border-light)' : 'none',
            color: showForm ? 'var(--text-main)' : '#ffffff',
            fontSize: '11px',
            fontWeight: '700',
            cursor: 'pointer',
            boxShadow: showForm ? 'none' : '0 2px 8px rgba(217, 119, 6, 0.25)'
          }}
        >
          {showForm ? 'Tutup' : (
            <>
              <Plus size={14} strokeWidth={2.5} />
              <span>Ajukan Lembur</span>
            </>
          )}
        </button>
      </div>

      {/* Card Ringkasan Bulan Ini — hanya bila server mengirim ringkasan (D2-12) */}
      {ringkasan && (
      <div style={{
        background: 'linear-gradient(135deg, #78350f 0%, #451a03 100%)',
        borderRadius: 'var(--radius-md)',
        padding: '16px',
        color: '#ffffff',
        boxShadow: '0 4px 14px rgba(120, 53, 15, 0.15)',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px'
      }}>
        <div style={{ padding: '10px', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: '10px' }}>
          <span style={{ fontSize: '10px', color: '#fde68a', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Timer size={12} /> Total Jam Lembur
          </span>
          <span style={{ fontSize: '22px', fontWeight: '900', color: '#ffffff', marginTop: '4px', display: 'block' }}>
            {ringkasan.total_jam} <span style={{ fontSize: '12px', fontWeight: '500' }}>Jam</span>
          </span>
        </div>
        <div style={{ padding: '10px', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: '10px' }}>
          <span style={{ fontSize: '10px', color: '#fde68a', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CircleDollarSign size={12} /> Estimasi Upah
          </span>
          <span style={{ fontSize: '18px', fontWeight: '800', color: '#fef08a', marginTop: '4px', display: 'block' }}>
            {ringkasan.total_upah_formatted || '–'}
          </span>
        </div>
      </div>
      )}

      {/* Form Lembur */}
      {showForm && (
        <form onSubmit={handleSubmit} style={{
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
          border: '1.5px solid #fde68a',
          boxShadow: '0 4px 16px rgba(217, 119, 6, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }} className="animate-fade-in">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#d97706', fontSize: '13px', fontWeight: '800' }}>
              <Timer size={16} />
              <span>Formulir Pengajuan Lembur</span>
            </div>
            <span style={{ fontSize: '10px', fontWeight: '700', color: '#92400e', backgroundColor: '#fef3c7', padding: '2px 8px', borderRadius: '12px' }}>
              Format 24 Jam
            </span>
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
              Tanggal Lembur
            </label>
            <input
              type="date"
              value={tanggalLembur}
              onChange={(e) => setTanggalLembur(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '8px',
                border: '1px solid var(--border-light)',
                fontSize: '12px',
                outline: 'none',
                backgroundColor: '#ffffff'
              }}
            />
          </div>

          {/* Input Jam Mulai & Jam Pulang (Format 24 Jam) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <TimeInput24
              label="Jam Mulai"
              value={jamMulai}
              onChange={setJamMulai}
              iconColor="#d97706"
            />
            <TimeInput24
              label="Jam Pulang"
              value={jamSelesai}
              onChange={setJamSelesai}
              iconColor="#b45309"
            />
          </div>

          {/* Quick Presets Jam Lembur Populer */}
          <div>
            <span style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Pilihan Jam Cepat (Format 24 Jam):
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {[
                { label: '17:00 - 20:00 (3 Jam)', mulai: '17:00', pulang: '20:00' },
                { label: '17:30 - 20:30 (3 Jam)', mulai: '17:30', pulang: '20:30' },
                { label: '17:30 - 21:30 (4 Jam)', mulai: '17:30', pulang: '21:30' },
                { label: '18:00 - 22:00 (4 Jam)', mulai: '18:00', pulang: '22:00' },
              ].map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(p.mulai, p.pulang)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: jamMulai === p.mulai && jamSelesai === p.pulang ? '1px solid #d97706' : '1px solid var(--border-light)',
                    backgroundColor: jamMulai === p.mulai && jamSelesai === p.pulang ? '#fef3c7' : 'var(--bg-slate)',
                    color: jamMulai === p.mulai && jamSelesai === p.pulang ? '#92400e' : 'var(--text-main)',
                    fontSize: '10px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Ringkasan Durasi & Estimasi Upah */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 12px',
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '8px',
            fontSize: '11px'
          }}>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Durasi Terhitung: </span>
              <strong style={{ color: '#d97706', fontSize: '12px' }}>{calculateHours()} Jam</strong>
              <span style={{ display: 'block', fontSize: '9px', color: '#92400e' }}>
                {tarifPerJam != null ? `Tarif: Rp ${tarifPerJam.toLocaleString('id-ID')} / Jam` : 'Tarif dari server belum tersedia'}
              </span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ color: 'var(--text-muted)' }}>Estimasi Upah: </span>
              <strong style={{ color: '#16a34a', fontSize: '13px', display: 'block' }}>
                {tarifPerJam != null ? `Rp ${(parseFloat(calculateHours()) * tarifPerJam).toLocaleString('id-ID')}` : '–'}
              </strong>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '4px' }}>
              Uraian Tugas Pekerjaan Lembur
            </label>
            <textarea
              value={keteranganTugas}
              onChange={(e) => setKeteranganTugas(e.target.value)}
              placeholder="Jelaskan pekerjaan atau target tugas lembur..."
              rows={3}
              required
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '8px',
                border: '1px solid var(--border-light)',
                fontSize: '12px',
                resize: 'none',
                fontFamily: 'inherit',
                outline: 'none',
                backgroundColor: '#ffffff'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              padding: '10px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #d97706, #b45309)',
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
                <span>Kirim Permohonan Lembur</span>
              </>
            )}
          </button>
        </form>
      )}

      {/* Riwayat Lembur */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)' }}>
            Riwayat Lembur (Format 24 Jam)
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {list.length} Tercatat
          </span>
        </div>

        {isLoading ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
            Memuat data lembur...
          </div>
        ) : list.length === 0 ? (
          <div style={{
            padding: '28px 16px',
            textAlign: 'center',
            backgroundColor: 'var(--bg-slate)',
            borderRadius: 'var(--radius-md)',
            border: '1px dashed var(--border-light)'
          }}>
            <Timer size={28} style={{ color: 'var(--text-light)', margin: '0 auto 8px auto' }} />
            <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-main)', margin: '0 0 4px 0' }}>
              Belum Ada Catatan Lembur
            </p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
              Tekan tombol "Ajukan Lembur" jika Anda melaksanakan jam kerja tambahan.
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
                  <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)' }}>
                    {item.tanggal_lembur}
                  </span>
                  {getStatusBadge(item.status)}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                  <span>
                    Jam: <strong style={{ color: 'var(--text-main)', fontFamily: 'monospace', fontWeight: '700' }}>
                      {item.jam_mulai || '-'} - {item.jam_selesai || '-'} WIB
                    </strong> ({item.durasi_jam} Jam)
                  </span>
                  {item.total_upah_lembur_formatted && (
                    <span style={{ color: '#d97706', fontWeight: '700' }}>{item.total_upah_lembur_formatted}</span>
                  )}
                </div>

                <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, lineHeight: '1.4' }}>
                  "{item.keterangan_tugas}"
                </p>

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
    </div>
  );
}
