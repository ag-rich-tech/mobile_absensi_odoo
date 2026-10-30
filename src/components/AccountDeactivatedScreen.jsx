import React from 'react';
import { ShieldAlert, UserX, ArrowRight, Building2, PhoneCall } from 'lucide-react';

export default function AccountDeactivatedScreen({ message, onClose }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        backgroundColor: 'rgba(15, 23, 42, 0.96)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 20px',
        animation: 'fadeIn 0.3s ease-out forwards',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '380px',
          backgroundColor: '#1e293b',
          borderRadius: '28px',
          border: '1.5px solid rgba(244, 63, 94, 0.3)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 40px rgba(225, 29, 72, 0.2)',
          padding: '32px 24px',
          textAlign: 'center',
          color: '#ffffff',
          position: 'relative',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* Glow Ambient Top */}
        <div
          style={{
            position: 'absolute',
            top: '-50px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '160px',
            height: '160px',
            background: 'radial-gradient(circle, rgba(225, 29, 72, 0.35) 0%, transparent 70%)',
            borderRadius: '50%',
            pointerEvents: 'none',
          }}
        />

        {/* Badge Status OFF */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '999px', backgroundColor: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', marginBottom: '20px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f43f5e' }}></span>
          <span style={{ fontSize: '11px', fontWeight: '800', color: '#fda4af', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            Akses Otomatis Nonaktif (OFF)
          </span>
        </div>

        {/* Icon Container */}
        <div
          style={{
            width: '84px',
            height: '84px',
            borderRadius: '24px',
            backgroundColor: 'rgba(225, 29, 72, 0.12)',
            border: '2px solid rgba(244, 63, 94, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            color: '#fb7185',
            boxShadow: '0 10px 25px -5px rgba(225, 29, 72, 0.3)',
          }}
        >
          <UserX size={44} strokeWidth={2.2} />
        </div>

        {/* Judul Utama */}
        <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.3px', margin: '0 0 10px' }}>
          Aplikasi Dinonaktifkan
        </h2>

        {/* Pesan Keterangan */}
        <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.55', margin: '0 0 20px' }}>
          {message || 'Status pegawai Anda saat ini berstatus NONAKTIF di sistem kepegawaian.'}
        </p>

        {/* Kotak Informasi Tambahan */}
        <div
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            borderRadius: '16px',
            border: '1px solid rgba(51, 65, 85, 0.8)',
            padding: '14px',
            textAlign: 'left',
            marginBottom: '24px',
            fontSize: '11px',
            color: '#94a3b8',
            lineHeight: '1.5',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e2e8f0', fontWeight: '700', marginBottom: '4px' }}>
            <Building2 size={14} style={{ color: '#fb7185' }} />
            <span>Akses Aplikasi Dicabut</span>
          </div>
          Seluruh modul presensi GPS, kamera selfie, jadwal kerja, dan riwayat telah dinonaktifkan oleh Administrator. Hubungi HRD/SDM jika ini kekeliruan.
        </div>

        {/* Tombol Tutup / Kembali */}
        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '14px 20px',
            borderRadius: '16px',
            backgroundColor: '#f43f5e',
            color: '#ffffff',
            border: 'none',
            fontSize: '13px',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 10px 20px -5px rgba(244, 63, 94, 0.4)',
            transition: 'all 0.2s',
          }}
          onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#e11d48'; }}
          onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#f43f5e'; }}
        >
          <span>Keluar ke Halaman Awal</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
