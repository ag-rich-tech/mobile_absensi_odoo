import React, { useState } from 'react';
import { ArrowLeft, Mail, Lock, Eye, EyeOff, Fingerprint, LogIn, ShieldAlert, CheckCircle2, Smartphone, UserX } from 'lucide-react';
import api, { setCustomDeviceId, getOrCreateDeviceId } from '../services/api';

export default function LoginPage({ onBack, onLoginSuccess }) {
  const [emailOrNip, setEmailOrNip] = useState('');
  const [password, setPassword] = useState('');
  const [deviceId] = useState(getOrCreateDeviceId());
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isDeviceLocked, setIsDeviceLocked] = useState(false);
  const [registeredDevice, setRegisteredDevice] = useState(null);
  const [isAccountInactive, setIsAccountInactive] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!emailOrNip || !password) {
      setErrorMessage('NIP / Email dan kata sandi wajib diisi.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setIsDeviceLocked(false);
    setIsAccountInactive(false);
    setRegisteredDevice(null);

    try {
      // Panggil REST API Laravel riil
      const res = await api.login({
        login: emailOrNip,
        password: password,
        device_id: deviceId,
      });

      if (res.success && res.pegawai) {
        // Double check status aktif pegawai (mapper kini membaca flag
        // server — bukan hardcode true — sehingga cabang ini hidup).
        if (res.pegawai.status_aktif === false || res.pegawai.status_aktif === 0) {
          // Token yang baru dibuat ikut dicabut: jangan tinggal token
          // valid untuk akun nonaktif di perangkat ini.
          try { await api.logout(); } catch { /* abaikan */ }
          setIsAccountInactive(true);
          setErrorMessage('Akun pegawai Anda sedang dinonaktifkan oleh administrator.');
          return;
        }
        onLoginSuccess(res.pegawai);
      } else {
        setErrorMessage(res.message || 'Login gagal.');
      }
    } catch (err) {
      if (err.data?.account_inactive || err.message?.toLowerCase().includes('nonaktif') || err.message?.toLowerCase().includes('non-aktif')) {
        setIsAccountInactive(true);
      }
      if (err.data?.device_locked) {
        setIsDeviceLocked(true);
        setRegisteredDevice(err.data?.registered_device || null);
      }
      setErrorMessage(err.message || 'Gagal terhubung ke server Aku Hadir.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="screen-scroll-area no-nav animate-fade-in" style={{ padding: '20px 20px', minHeight: '100%', justifyContent: 'center' }}>
      <div className="tablet-centered-card" style={{ width: '100%', padding: '12px 0' }}>
        {/* Top Header Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <button
            type="button"
            onClick={onBack}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg-slate)',
              border: '1px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-main)',
            }}
          >
            <ArrowLeft size={18} />
          </button>

          <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--primary-600)', backgroundColor: 'var(--primary-50)', padding: '4px 10px', borderRadius: 'var(--radius-full)' }}>
            Single Device Lock
          </span>
        </div>

        {/* Title (Clean & Minimal Text) */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.5px' }}>
            Masuk Akun
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Masuk dengan Email Terdaftar
          </p>
        </div>

        {/* Device Locked Warning Alert */}
        {/* Device Locked Warning Alert */}
        {isDeviceLocked && (
          <div style={{
            padding: '14px 16px',
            backgroundColor: '#fff1f2',
            border: '1.5px solid #fecdd3',
            borderRadius: 'var(--radius-md)',
            marginBottom: '16px',
            boxShadow: '0 4px 12px rgba(225, 29, 72, 0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#be123c', fontWeight: '800', fontSize: '13px', marginBottom: '6px' }}>
              <Smartphone size={18} />
              <span>Perangkat Terkunci (1 Device Only)</span>
            </div>
            <p style={{ fontSize: '12px', color: '#881337', lineHeight: '1.45', margin: 0 }}>
              {errorMessage}
            </p>
            {registeredDevice && (
              <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #fecdd3', fontSize: '11px', color: '#9f1239' }}>
                Perangkat terdaftar: <strong>{registeredDevice.model || 'HP Terdaftar'}</strong>
              </div>
            )}
          </div>
        )}

        {/* Account Inactive Warning Alert */}
        {isAccountInactive && (
          <div style={{
            padding: '14px 16px',
            backgroundColor: '#fff1f2',
            border: '1.5px solid #fecdd3',
            borderRadius: 'var(--radius-md)',
            marginBottom: '16px',
            boxShadow: '0 4px 12px rgba(225, 29, 72, 0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#be123c', fontWeight: '800', fontSize: '13px', marginBottom: '6px' }}>
              <UserX size={18} />
              <span>Akses Pegawai Nonaktif (OFF)</span>
            </div>
            <p style={{ fontSize: '12px', color: '#881337', lineHeight: '1.45', margin: 0 }}>
              {errorMessage}
            </p>
            <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #fecdd3', fontSize: '11px', color: '#9f1239' }}>
              Status akun Anda telah dinonaktifkan oleh Administrator. Hubungi HRD/SDM untuk aktivasi kembali.
            </div>
          </div>
        )}

        {/* Standard Error Alert */}
        {errorMessage && !isDeviceLocked && !isAccountInactive && (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            padding: '12px 14px',
            backgroundColor: 'var(--danger-bg)',
            border: '1px solid #fecaca',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--danger)',
            fontSize: '12px',
            fontWeight: '600',
            lineHeight: '1.4',
            marginBottom: '16px'
          }}>
            <ShieldAlert size={17} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* NIP / Email Input */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '6px' }}>
              NIP atau Email
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Mail size={18} style={{ position: 'absolute', left: '14px', color: 'var(--text-light)', pointerEvents: 'none' }} />
              <input
                type="text"
                value={emailOrNip}
                onChange={(e) => setEmailOrNip(e.target.value)}
                placeholder="youremail@gmail.com"
                required
                style={{
                  width: '100%',
                  height: '48px',
                  paddingLeft: '42px',
                  paddingRight: '14px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1.5px solid var(--border-light)',
                  backgroundColor: '#ffffff',
                  fontSize: '13px',
                  fontWeight: '500',
                  color: 'var(--text-main)',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--primary-600)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border-light)'}
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-main)' }}>
                Kata Sandi
              </label>
            </div>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Lock size={18} style={{ position: 'absolute', left: '14px', color: 'var(--text-light)', pointerEvents: 'none' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: '100%',
                  height: '48px',
                  paddingLeft: '42px',
                  paddingRight: '44px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1.5px solid var(--border-light)',
                  backgroundColor: '#ffffff',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: 'var(--text-main)',
                  outline: 'none',
                  fontFamily: showPassword ? 'var(--font-sans)' : 'var(--font-mono)'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--primary-600)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border-light)'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-light)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Device ID info */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 12px',
            backgroundColor: 'var(--bg-slate)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-light)',
            fontSize: '11px',
            color: 'var(--text-muted)'
          }}>
            <Smartphone size={15} style={{ color: 'var(--primary-600)', flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Device ID: <strong style={{ color: 'var(--text-main)' }}>{deviceId}</strong>
            </span>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              height: '50px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--primary-gradient)',
              border: 'none',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: 'var(--shadow-primary)',
              opacity: isLoading ? 0.7 : 1,
              marginTop: '4px'
            }}
          >
            {isLoading ? (
              <span>Menghubungi Server...</span>
            ) : (
              <>
                <LogIn size={18} strokeWidth={2.5} />
                <span>Masuk Sekarang</span>
              </>
            )}
          </button>
        </form>
      </div>


    </div>
  );
}
