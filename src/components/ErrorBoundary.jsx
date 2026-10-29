import React from 'react';

// ErrorBoundary minimal: satu crash render (mis. variabel tak terdefinisi)
// tidak lagi memutihkan seluruh app. Menangkap error di subtree-nya,
// mencatat ke console, dan menampilkan fallback dengan tombol muat ulang.
// Dipakai membungkus <App /> di main.jsx.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error && error.message ? error.message : 'Terjadi kesalahan.' };
  }

  componentDidCatch(error, info) {
    // Jangan ditelan diam-diam: error tetap terlihat di log perangkat.
    console.error('ErrorBoundary menangkap crash render:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          padding: '24px',
          textAlign: 'center',
          fontFamily: 'system-ui, sans-serif',
        }}>
          <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
            Terjadi kesalahan pada aplikasi
          </div>
          <div style={{ fontSize: '13px', color: '#64748b', maxWidth: '420px' }}>
            {this.state.message}
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              height: '44px',
              padding: '0 22px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: '#0f172a',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: '700',
              cursor: 'pointer',
            }}
          >
            Muat Ulang
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
