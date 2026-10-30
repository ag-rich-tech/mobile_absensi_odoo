import React from 'react';
import { Home, Calendar, Briefcase, User, FileText } from 'lucide-react';

// BottomNav 5 tab: Riwayat (history), Izin (leave), Home (selalu),
// Tugas (task), Profil (selalu). Home + Profil BUKAN fitur yang bisa
// dimatikan, jadi selalu dirender.
//
// Penyembunyian fitur mobile (kontrak GET /mobile/features):
// DashboardPage mengoper isFeatureOn(kode) — tab yang fiturnya off
// TIDAK dirender sama sekali (bukan di-disable abu-abu, bukan slot
// kosong). Bila isFeatureOn tidak dioper, semua tab tampil (fail-open).
//
// Home tetap di tengah apa pun kombinasinya: bar memakai flex tiga
// kolom — sisi kiri (flex:1), tombol Home tengah (lebar tetap), sisi
// kanan (flex:1). Sisi yang tabnya habis tetap menjadi spacer flex:1
// sehingga Home tidak bergeser; tab yang tersisa merapat di sisinya
// masing-masing (space-around) tanpa menyisakan slot kosong.
export default function BottomNav({ activeNav = 'home', onNavChange, onChangeNav, isFeatureOn }) {
  const handleNav = (tab) => {
    if (typeof onChangeNav === 'function') {
      onChangeNav(tab);
    } else if (typeof onNavChange === 'function') {
      onNavChange(tab);
    }
  };

  const showFeature = (code) => (
    typeof isFeatureOn !== 'function' || isFeatureOn(code)
  );

  const tabStyle = (active) => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '3px',
    background: 'none',
    border: 'none',
    color: active ? 'var(--primary-600)' : '#94a3b8',
    fontSize: '10px',
    fontWeight: active ? '800' : '600',
    padding: '6px 0',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  });

  const tabDot = (active) => active && (
    <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--primary-600)' }}></span>
  );

  return (
    <nav className="bottom-nav-bar" style={{
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      width: '100%',
      backgroundColor: 'rgba(255, 255, 255, 0.98)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderTop: '1px solid rgba(226, 232, 240, 0.9)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 50,
      boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.06)',
      boxSizing: 'border-box'
    }}>
      <div style={{
        maxWidth: '580px',
        width: '100%',
        height: '62px',
        display: 'flex',
        alignItems: 'center',
        padding: '0 8px',
        boxSizing: 'border-box'
      }}>
      {/* Sisi kiri: Riwayat + Izin (masing-masing bisa hilang). */}
      <div style={{
        flex: 1,
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
      }}>
      {/* 1. Riwayat Presensi */}
      {showFeature('history') && (
      <button
        type="button"
        onClick={() => handleNav('history')}
        style={tabStyle(activeNav === 'history')}
      >
        <Calendar size={19} strokeWidth={activeNav === 'history' ? 2.5 : 2} />
        <span>Riwayat</span>
        {tabDot(activeNav === 'history')}
      </button>
      )}

      {/* 2. Pengajuan Izin / Cuti */}
      {showFeature('leave') && (
      <button
        type="button"
        onClick={() => handleNav('izin')}
        style={tabStyle(activeNav === 'izin')}
      >
        <FileText size={19} strokeWidth={activeNav === 'izin' ? 2.5 : 2} />
        <span>Izin</span>
        {tabDot(activeNav === 'izin')}
      </button>
      )}
      </div>

      {/* 3. HOME / BERANDA UTAMA (TEPAT DI TENGAH - FLOATING ELEVATED BUTTON) */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: '-22px',
        flexShrink: 0,
      }}>
        <button
          type="button"
          onClick={() => handleNav('home')}
          title="Beranda Utama"
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            background: activeNav === 'home'
              ? 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)'
              : 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)',
            border: '4px solid #ffffff',
            boxShadow: activeNav === 'home'
              ? '0 8px 24px rgba(234, 88, 12, 0.45)'
              : '0 6px 18px rgba(234, 88, 12, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            cursor: 'pointer',
            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            transform: activeNav === 'home' ? 'scale(1.05)' : 'scale(1)'
          }}
        >
          <Home size={22} strokeWidth={2.4} />
        </button>
        <span style={{
          fontSize: '10px',
          fontWeight: '800',
          color: activeNav === 'home' ? 'var(--primary-600)' : '#64748b',
          marginTop: '2px',
          letterSpacing: '-0.2px'
        }}>
          Home
        </span>
      </div>

      {/* Sisi kanan: Tugas + Profil (hanya Tugas yang bisa hilang). */}
      <div style={{
        flex: 1,
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
      }}>
      {/* 4. Tugas Kerja */}
      {showFeature('task') && (
      <button
        type="button"
        onClick={() => handleNav('tugas')}
        style={tabStyle(activeNav === 'tugas')}
      >
        <Briefcase size={19} strokeWidth={activeNav === 'tugas' ? 2.5 : 2} />
        <span>Tugas</span>
        {tabDot(activeNav === 'tugas')}
      </button>
      )}

      {/* 5. Profil Pegawai (selalu tampil) */}
      <button
        type="button"
        onClick={() => handleNav('profile')}
        style={tabStyle(activeNav === 'profile')}
      >
        <User size={19} strokeWidth={activeNav === 'profile' ? 2.5 : 2} />
        <span>Profil</span>
        {tabDot(activeNav === 'profile')}
      </button>
      </div>
      </div>
    </nav>
  );
}
