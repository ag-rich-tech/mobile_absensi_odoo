import React, { useState, useEffect } from 'react';
import { 
  X, FileText, Image as ImageIcon, Download, ZoomIn, ZoomOut, 
  RotateCw, RefreshCw, AlertCircle, ExternalLink, ShieldCheck 
} from 'lucide-react';
import api from '../services/api';

export default function DocumentPreviewModal({ isOpen, onClose, modul, id, title = 'Dokumen Pendukung' }) {
  const [isLoading, setIsLoading] = useState(true);
  const [docData, setDocData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (isOpen && modul && id) {
      loadDocument();
    } else {
      // Reset state saat modal ditutup
      setDocData(null);
      setErrorMessage('');
      setZoomLevel(1);
      setRotation(0);
    }
  }, [isOpen, modul, id]);

  const loadDocument = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const res = await api.getDokumenPreview(modul, id);
      if (res && res.success) {
        setDocData(res);
      } else {
        setErrorMessage(res?.message || 'Dokumen tidak dapat dimuat dari server.');
      }
    } catch (err) {
      console.error('Gagal mengambil preview dokumen:', err);
      setErrorMessage(err.message || 'Terjadi gangguan hak akses atau jaringan saat memuat berkas.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!docData?.data_url) return;
    const a = document.createElement('a');
    a.href = docData.data_url;
    a.download = docData.nama_dokumen || 'dokumen_pendukung';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      backgroundColor: 'rgba(15, 23, 42, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      flexDirection: 'column',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      {/* Top Bar Header */}
      <div style={{
        height: '56px',
        backgroundColor: '#0f172a',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '0 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        color: '#ffffff',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '10px',
            backgroundColor: docData?.is_pdf ? 'rgba(239, 68, 68, 0.2)' : 'rgba(14, 165, 233, 0.2)',
            color: docData?.is_pdf ? '#f87171' : '#38bdf8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            {docData?.is_pdf ? <FileText size={18} /> : <ImageIcon size={18} />}
          </div>
          <div style={{ minWidth: 0 }}>
            <h3 style={{
              fontSize: '13px',
              fontWeight: '800',
              color: '#f8fafc',
              margin: 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {title}
            </h3>
            <p style={{
              fontSize: '10px',
              color: '#94a3b8',
              margin: '1px 0 0',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {docData?.nama_dokumen || 'Memuat berkas...'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {docData?.data_url && (
            <button
              type="button"
              onClick={handleDownload}
              title="Unduh Berkas"
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <Download size={16} />
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            title="Tutup Preview"
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: 'rgba(239, 68, 68, 0.2)',
              color: '#f87171',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{
        flex: 1,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        backgroundColor: '#090d16'
      }}>
        {isLoading ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            color: '#94a3b8'
          }}>
            <RefreshCw size={32} className="animate-spin text-orange-500" />
            <p style={{ fontSize: '12px', fontWeight: '600', margin: 0, color: '#e2e8f0' }}>
              Membuka dokumen di dalam aplikasi...
            </p>
            <span style={{ fontSize: '10px', color: '#64748b' }}>
              Memverifikasi otorisasi & hak akses berkas
            </span>
          </div>
        ) : errorMessage ? (
          <div style={{
            padding: '24px 20px',
            maxWidth: '340px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '16px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px'
          }}>
            <AlertCircle size={32} color="#f87171" />
            <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#fecdd3', margin: 0 }}>
              Gagal Membuka Dokumen
            </h4>
            <p style={{ fontSize: '11px', color: '#fda4af', margin: 0, lineHeight: 1.4 }}>
              {errorMessage}
            </p>
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={loadDocument}
                style={{
                  padding: '7px 14px',
                  borderRadius: '10px',
                  backgroundColor: '#e11d48',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Coba Lagi
              </button>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '7px 14px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Tutup
              </button>
            </div>
          </div>
        ) : docData?.is_pdf ? (
          /* PDF Viewer In-App */
          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <iframe
              src={docData.data_url}
              title={docData.nama_dokumen || 'PDF Preview'}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                backgroundColor: '#ffffff'
              }}
            />
          </div>
        ) : (
          /* Image Viewer In-App dengan Zoom & Rotate */
          <div style={{
            width: '100%',
            height: '100%',
            overflow: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}>
            <img
              src={docData?.data_url}
              alt={docData?.nama_dokumen || 'Dokumen Preview'}
              style={{
                maxWidth: zoomLevel === 1 ? '100%' : 'none',
                maxHeight: zoomLevel === 1 ? '100%' : 'none',
                transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                transformOrigin: 'center center',
                transition: 'transform 0.15s ease',
                borderRadius: '8px',
                boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)',
                objectFit: 'contain'
              }}
            />
          </div>
        )}
      </div>

      {/* Floating Toolbar untuk Gambar */}
      {!isLoading && !errorMessage && !docData?.is_pdf && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '999px',
          padding: '6px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.4)',
          zIndex: 20
        }}>
          <button
            type="button"
            onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.25))}
            title="Zoom Out"
            style={{
              background: 'none',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <ZoomOut size={16} />
          </button>

          <span style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', minWidth: '36px', textAlign: 'center' }}>
            {Math.round(zoomLevel * 100)}%
          </span>

          <button
            type="button"
            onClick={() => setZoomLevel(prev => Math.min(3, prev + 0.25))}
            title="Zoom In"
            style={{
              background: 'none',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <ZoomIn size={16} />
          </button>

          <div style={{ width: '1px', height: '14px', backgroundColor: 'rgba(255,255,255,0.2)' }} />

          <button
            type="button"
            onClick={() => setRotation(prev => (prev + 90) % 360)}
            title="Putar 90 Derajat"
            style={{
              background: 'none',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <RotateCw size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
