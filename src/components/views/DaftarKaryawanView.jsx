import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, Search, RefreshCw, Users } from 'lucide-react';
import api from '../../services/api';

export default function DaftarKaryawanView({ onBack }) {
  const [karyawanList, setKaryawanList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchKaryawan = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const res = await api.getDaftarKaryawan();
      if (res && res.success) {
        setKaryawanList(res.data || []);
        setError(null);
      } else {
        setKaryawanList([]);
        setError(res?.message || 'Gagal memuat data dari server.');
      }
    } catch (err) {
      console.error('Gagal memuat daftar karyawan:', err);
      setKaryawanList([]);
      setError(err.message || 'Terjadi kesalahan jaringan.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchKaryawan();
  }, []);

  const filteredList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return karyawanList;
    return karyawanList.filter((item) => {
      const nama = (item.nama || '').toLowerCase();
      const idStr = String(item.employee_id || item.id || '').toLowerCase();
      const jabatan = (item.jabatan || '').toLowerCase();
      const dept = (item.departemen || '').toLowerCase();
      return nama.includes(q) || idStr.includes(q) || jabatan.includes(q) || dept.includes(q);
    });
  }, [karyawanList, searchQuery]);

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
              cursor: 'pointer',
            }}
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.3px', margin: 0 }}>
              Daftar Karyawan
            </h2>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
              {isLoading ? 'Memuat data...' : `${karyawanList.length} Karyawan Terdaftar`}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => fetchKaryawan(true)}
          disabled={isLoading || isRefreshing}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            backgroundColor: 'var(--bg-slate)',
            border: '1px solid var(--border-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary-600)',
            cursor: isLoading || isRefreshing ? 'default' : 'pointer',
          }}
          title="Segarkan data"
        >
          <RefreshCw size={17} className={isRefreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 'var(--radius-md)',
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <AlertCircle size={18} style={{ color: '#b91c1c', flexShrink: 0 }} />
          <span style={{ fontSize: '12px', color: '#991b1b', flex: 1 }}>{error}</span>
          <button
            type="button"
            onClick={() => fetchKaryawan(true)}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              border: '1px solid #fca5a5',
              backgroundColor: '#fff',
              color: '#b91c1c',
              fontSize: '11px',
              fontWeight: '700',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* Pencarian */}
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari nama, ID, posisi, divisi..."
          style={{
            width: '100%',
            padding: '11px 14px 11px 40px',
            borderRadius: '12px',
            backgroundColor: 'var(--bg-slate)',
            border: '1px solid var(--border-light)',
            fontSize: '12px',
            color: 'var(--text-main)',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        <Search
          size={18}
          style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-light)',
          }}
        />
      </div>

      {/* Content Table View */}
      {isLoading ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
          Memuat daftar karyawan dari Odoo...
        </div>
      ) : filteredList.length === 0 ? (
        <div style={{ padding: '40px 20px', textAlign: 'center', backgroundColor: '#fff', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
          <Users size={36} style={{ color: 'var(--text-light)', margin: '0 auto 10px', display: 'block' }} />
          <h4 style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)', margin: '0 0 4px 0' }}>
            {searchQuery ? 'Tidak Ada Karyawan Ditemukan' : 'Belum Ada Data Karyawan'}
          </h4>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
            {searchQuery ? `Tidak ada hasil untuk "${searchQuery}".` : 'Daftar karyawan belum tersedia dari Odoo.'}
          </p>
        </div>
      ) : (
        <div style={{ backgroundColor: '#fff', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px', minWidth: '400px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border-light)' }}>
                  <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Karyawan</th>
                  <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', width: '100px' }}>ID Employee</th>
                  <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Position</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((emp, idx) => (
                  <tr key={emp.id || idx} style={{ borderBottom: idx === filteredList.length - 1 ? 'none' : '1px solid var(--border-light)' }}>
                    <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: '#ffedd5', border: '1.5px solid #fed7aa', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden', fontWeight: '800', fontSize: '12px', color: 'var(--primary-700)' }}>
                          {emp.foto ? <img src={emp.foto} alt={emp.nama} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span>{emp.inisial || 'K'}</span>}
                        </div>
                        <div>
                          <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', display: 'block' }}>{emp.nama}</span>
                          {(emp.work_email || emp.work_phone) && <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>{emp.work_email || emp.work_phone}</span>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                      <span style={{ display: 'inline-block', padding: '3px 8px', backgroundColor: '#f1f5f9', borderRadius: '6px', fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: '700', color: '#334155', border: '1px solid #e2e8f0' }}>
                        {emp.employee_id || `#${emp.id}`}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                      <span style={{ display: 'inline-block', padding: '2px 8px', backgroundColor: '#eef2ff', borderRadius: '6px', fontSize: '11px', fontWeight: '700', color: '#4338ca', border: '1px solid #c7d2fe', marginBottom: emp.departemen ? '2px' : '0' }}>
                        {emp.jabatan || 'Staff'}
                      </span>
                      {emp.departemen && <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>{emp.departemen}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
