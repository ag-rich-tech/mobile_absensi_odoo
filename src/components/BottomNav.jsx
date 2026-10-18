import React from 'react';
import { Home, Calendar, Briefcase, User, FileText } from 'lucide-react';

export default function BottomNav({ activeNav = 'home', onNavChange, onChangeNav }) {
  const handleNav = (tab) => {
    if (typeof onChangeNav === 'function') {
      onChangeNav(tab);
    } else if (typeof onNavChange === 'function') {
      onNavChange(tab);
    }
  };

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
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1.2fr 1fr 1fr',
        alignItems: 'center',
        padding: '0 8px',
        boxSizing: 'border-box'
      }}>
      {/* 1. Riwayat Presensi (Kiri 1) */}
      <button
        type="button"
        onClick={() => handleNav('history')}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '3px',
          background: 'none',
          border: 'none',
          color: activeNav === 'history' ? 'var(--primary-600)' : '#94a3b8',
          fontSize: '10px',
          fontWeight: activeNav === 'history' ? '800' : '600',
          padding: '6px 0',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
      >
        <Calendar size={19} strokeWidth={activeNav === 'history' ? 2.5 : 2} />
        <span>Riwayat</span>
        {activeNav === 'history' && (
          <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--primary-600)' }}></span>
        )}
      </button>

      {/* 2. Pengajuan Izin / Cuti (Kiri 2) */}
      <button
        type="button"
        onClick={() => handleNav('izin')}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '3px',
          background: 'none',
          border: 'none',
          color: activeNav === 'izin' ? 'var(--primary-600)' : '#94a3b8',
          fontSize: '10px',
          fontWeight: activeNav === 'izin' ? '800' : '600',
          padding: '6px 0',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
      >
        <FileText size={19} strokeWidth={activeNav === 'izin' ? 2.5 : 2} />
        <span>Izin</span>
        {activeNav === 'izin' && (
          <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--primary-600)' }}></span>
        )}
      </button>

      {/* 3. HOME / BERANDA UTAMA (TEPAT DI TENGAH - FLOATING ELEVATED BUTTON) */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: '-22px'
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

      {/* 4. Tugas Kerja (Kanan 1 - Menggantikan Jadwal yang dipindah ke Profil) */}
      <button
        type="button"
        onClick={() => handleNav('tugas')}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '3px',
          background: 'none',
          border: 'none',
          color: activeNav === 'tugas' ? 'var(--primary-600)' : '#94a3b8',
          fontSize: '10px',
          fontWeight: activeNav === 'tugas' ? '800' : '600',
          padding: '6px 0',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
      >
        <Briefcase size={19} strokeWidth={activeNav === 'tugas' ? 2.5 : 2} />
        <span>Tugas</span>
        {activeNav === 'tugas' && (
          <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--primary-600)' }}></span>
        )}
      </button>

      {/* 5. Profil Pegawai (Kanan 2) */}
      <button
        type="button"
        onClick={() => handleNav('profile')}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '3px',
          background: 'none',
          border: 'none',
          color: activeNav === 'profile' ? 'var(--primary-600)' : '#94a3b8',
          fontSize: '10px',
          fontWeight: activeNav === 'profile' ? '800' : '600',
          padding: '6px 0',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
      >
        <User size={19} strokeWidth={activeNav === 'profile' ? 2.5 : 2} />
        <span>Profil</span>
        {activeNav === 'profile' && (
          <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--primary-600)' }}></span>
        )}
      </button>
      </div>
    </nav>
  );
}
