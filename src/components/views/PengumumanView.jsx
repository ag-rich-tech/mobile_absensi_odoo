import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Megaphone, Bell, CheckCircle2, Clock, AlertCircle,
  FileText, Calendar, Paperclip, ChevronRight, RefreshCw, Eye,
  Sparkles, Pin, Flame, ShieldAlert, Download, X, ExternalLink
} from 'lucide-react';
import api from '../../services/api';
import DocumentPreviewModal from '../DocumentPreviewModal';

export default function PengumumanView({ onBack }) {
  const [filter, setFilter] = useState('semua'); // 'semua' | 'belum_dibaca' | 'penting'
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // State Modal Detail
  const [selectedItem, setSelectedItem] = useState(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  // State In-App Document Preview Modal
  const [previewDoc, setPreviewDoc] = useState({
    isOpen: false,
    modul: 'pengumuman',
    id: null,
    title: ''
  });

  const loadPengumuman = async (activeFilter = filter) => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const res = await api.getPengumuman(activeFilter);
      if (res && res.success) {
        setItems(res.data || []);
        setUnreadCount(res.unread_count || 0);
      } else {
        setErrorMessage(res?.message || 'Gagal memuat pengumuman.');
      }
    } catch (err) {
      console.error('Error load pengumuman:', err);
      setErrorMessage(err.message || 'Terjadi gangguan koneksi internet saat memuat pengumuman.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadPengumuman(filter);
  }, [filter]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadPengumuman(filter);
  };

  const handleOpenDetail = async (item) => {
    setIsDetailLoading(true);
    setSelectedItem(item);
    try {
      const res = await api.getPengumumanDetail(item.id);
      if (res && res.success) {
        setSelectedItem(res.data);
        // Perbarui item di list lokal menjadi sudah dibaca
        setItems((prev) =>
          prev.map((it) => (it.id === item.id ? { ...it, is_dibaca: true } : it))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Error load detail pengumuman:', err);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleOpenDocPreview = (e, item) => {
    e.stopPropagation();
    setPreviewDoc({
      isOpen: true,
      modul: 'pengumuman',
      id: item.id,
      title: item.lampiran_nama || 'Dokumen Pengumuman'
    });
  };

  // Helper warna badge tipe
  const getTipeBadge = (tipe) => {
    switch (tipe) {
      case 'penting':
        return {
          bg: '#fee2e2',
          border: '#fca5a5',
          text: '#b91c1c',
          label: 'Penting',
          icon: ShieldAlert
        };
      case 'mendesak':
        return {
          bg: '#fef3c7',
          border: '#fde68a',
          text: '#b45309',
          label: 'Mendesak',
          icon: Flame
        };
      case 'acara':
        return {
          bg: '#dcfce7',
          border: '#86efac',
          text: '#15803d',
          label: 'Kegiatan',
          icon: Sparkles
        };
      default:
        return {
          bg: '#e0f2fe',
          border: '#bae6fd',
          text: '#0369a1',
          label: 'Informasi',
          icon: Megaphone
        };
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--bg-main, #f8fafc)',
      paddingBottom: '90px'
    }}>
      {/* Top Header Bar */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #f1f5f9',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={onBack}
            className="btn-back-action"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              backgroundColor: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#475569',
              cursor: 'pointer'
            }}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              Pengumuman
            </h1>
            <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0 0' }}>
              Pusat Informasi & Edaran Resmi
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={isLoading || isRefreshing}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#64748b',
            cursor: 'pointer'
          }}
          title="Segarkan data"
        >
          <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      <div style={{ padding: '16px' }}>
        {/* Banner Motivasi / Ringkasan */}
        <div style={{
          background: 'linear-gradient(135deg, #4338ca 0%, #3b82f6 50%, #06b6d4 100%)',
          borderRadius: '20px',
          padding: '18px',
          color: '#ffffff',
          position: 'relative',
          overflow: 'hidden',
          marginBottom: '16px',
          boxShadow: '0 8px 20px -4px rgba(59, 130, 246, 0.35)'
        }}>
          <div style={{
            position: 'absolute',
            right: '-15px',
            bottom: '-15px',
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.1)',
            filter: 'blur(10px)'
          }} />
          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: '8px',
              padding: '3px 8px',
              fontSize: '10px',
              fontWeight: '800',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '8px'
            }}>
              <Megaphone size={12} />
              Papan Pengumuman
            </div>
            <h2 style={{ fontSize: '16px', fontWeight: '800', margin: '0 0 4px 0', lineHeight: 1.3 }}>
              Informasi Terkini Perusahaan
            </h2>
            <p style={{ fontSize: '11px', margin: 0, opacity: 0.9, lineHeight: 1.4 }}>
              Pastikan membaca setiap edaran resmi dan kebijakan terbaru dari manajemen.
            </p>
          </div>
        </div>

        {/* Filter Segmented Control */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '6px',
          backgroundColor: '#e2e8f0',
          padding: '4px',
          borderRadius: '14px',
          marginBottom: '16px'
        }}>
          <button
            type="button"
            onClick={() => setFilter('semua')}
            style={{
              padding: '8px 4px',
              fontSize: '11px',
              fontWeight: filter === 'semua' ? '800' : '600',
              color: filter === 'semua' ? '#1e293b' : '#64748b',
              backgroundColor: filter === 'semua' ? '#ffffff' : 'transparent',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: filter === 'semua' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none'
            }}
          >
            Semua
          </button>

          <button
            type="button"
            onClick={() => setFilter('belum_dibaca')}
            style={{
              padding: '8px 4px',
              fontSize: '11px',
              fontWeight: filter === 'belum_dibaca' ? '800' : '600',
              color: filter === 'belum_dibaca' ? '#4338ca' : '#64748b',
              backgroundColor: filter === 'belum_dibaca' ? '#ffffff' : 'transparent',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              boxShadow: filter === 'belum_dibaca' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none'
            }}
          >
            <span>Belum Dibaca</span>
            {unreadCount > 0 && (
              <span style={{
                backgroundColor: '#ef4444',
                color: '#ffffff',
                fontSize: '9px',
                fontWeight: '800',
                padding: '1px 5px',
                borderRadius: '999px',
                lineHeight: '1.2'
              }}>
                {unreadCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setFilter('penting')}
            style={{
              padding: '8px 4px',
              fontSize: '11px',
              fontWeight: filter === 'penting' ? '800' : '600',
              color: filter === 'penting' ? '#b91c1c' : '#64748b',
              backgroundColor: filter === 'penting' ? '#ffffff' : 'transparent',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: filter === 'penting' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none'
            }}
          >
            Penting & Urgent
          </button>
        </div>

        {/* State Loading */}
        {isLoading && (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <div style={{
              width: '36px',
              height: '36px',
              margin: '0 auto 12px',
              borderRadius: '50%',
              border: '3px solid #e2e8f0',
              borderTopColor: '#3b82f6',
              animation: 'spin 1s linear infinite'
            }} />
            <p style={{ fontSize: '12px', color: '#64748b', margin: 0, fontWeight: '600' }}>
              Memuat pengumuman...
            </p>
          </div>
        )}

        {/* State Error */}
        {!isLoading && errorMessage && (
          <div style={{
            padding: '16px',
            borderRadius: '16px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fee2e2',
            color: '#b91c1c',
            fontSize: '12px',
            textAlign: 'center',
            marginBottom: '16px'
          }}>
            <AlertCircle size={24} style={{ margin: '0 auto 6px', display: 'block' }} />
            <p style={{ margin: '0 0 8px 0', fontWeight: '700' }}>{errorMessage}</p>
            <button
              type="button"
              onClick={() => loadPengumuman(filter)}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #fca5a5',
                color: '#b91c1c',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Coba Lagi
            </button>
          </div>
        )}

        {/* State Kosong */}
        {!isLoading && !errorMessage && items.length === 0 && (
          <div style={{
            padding: '48px 24px',
            textAlign: 'center',
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            border: '1px solid #f1f5f9'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '18px',
              backgroundColor: '#f1f5f9',
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px'
            }}>
              <Megaphone size={26} />
            </div>
            <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b', margin: '0 0 4px 0' }}>
              Tidak Ada Pengumuman
            </h3>
            <p style={{ fontSize: '11px', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
              {filter === 'belum_dibaca'
                ? 'Semua pengumuman aktif sudah Anda baca.'
                : 'Belum ada pengumuman yang diterbitkan untuk kategori ini.'}
            </p>
          </div>
        )}

        {/* Daftar Kartu Pengumuman */}
        {!isLoading && !errorMessage && items.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {items.map((item) => {
              const badge = getTipeBadge(item.tipe);
              const BadgeIcon = badge.icon;

              return (
                <div
                  key={item.id}
                  onClick={() => handleOpenDetail(item)}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '18px',
                    border: item.is_pinned ? '1.5px solid #fcd34d' : '1px solid #f1f5f9',
                    overflow: 'hidden',
                    boxShadow: item.is_pinned
                      ? '0 4px 14px rgba(245, 158, 11, 0.12)'
                      : '0 2px 6px rgba(0,0,0,0.03)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    position: 'relative'
                  }}
                >
                  {/* Banner Flyer Thumbnail jika ada */}
                  {item.gambar_url && (
                    <div style={{
                      width: '100%',
                      height: '110px',
                      position: 'relative',
                      backgroundColor: '#0f172a'
                    }}>
                      <img
                        src={item.gambar_url}
                        alt="Banner"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 60%)'
                      }} />
                    </div>
                  )}

                  <div style={{ padding: '14px' }}>
                    {/* Header Badges */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '8px',
                      flexWrap: 'wrap',
                      gap: '6px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {item.is_pinned && (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            backgroundColor: '#fef3c7',
                            color: '#b45309',
                            fontSize: '9px',
                            fontWeight: '800',
                            padding: '2px 6px',
                            borderRadius: '6px',
                            border: '1px solid #fde68a'
                          }}>
                            <Pin size={10} fill="#b45309" />
                            PINNED
                          </span>
                        )}

                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          backgroundColor: badge.bg,
                          color: badge.text,
                          border: `1px solid ${badge.border}`,
                          fontSize: '9px',
                          fontWeight: '800',
                          padding: '2px 6px',
                          borderRadius: '6px'
                        }}>
                          <BadgeIcon size={10} />
                          {badge.label}
                        </span>

                        {item.is_khusus && (
                          <span style={{
                            backgroundColor: '#f3e8ff',
                            color: '#7e22ce',
                            fontSize: '9px',
                            fontWeight: '700',
                            padding: '2px 6px',
                            borderRadius: '6px',
                            border: '1px solid #e9d5ff'
                          }}>
                            Khusus
                          </span>
                        )}
                      </div>

                      {/* Status Dibaca */}
                      {!item.is_dibaca ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          backgroundColor: '#fee2e2',
                          color: '#dc2626',
                          fontSize: '9px',
                          fontWeight: '800',
                          padding: '2px 6px',
                          borderRadius: '6px',
                          border: '1px solid #fca5a5'
                        }}>
                          <span style={{
                            width: '5px',
                            height: '5px',
                            borderRadius: '50%',
                            backgroundColor: '#dc2626'
                          }} />
                          BARU
                        </span>
                      ) : (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '2px',
                          color: '#10b981',
                          fontSize: '10px',
                          fontWeight: '700'
                        }}>
                          <CheckCircle2 size={12} />
                          Dibaca
                        </span>
                      )}
                    </div>

                    {/* Judul Pengumuman */}
                    <h3 style={{
                      fontSize: '13px',
                      fontWeight: '800',
                      color: '#0f172a',
                      margin: '0 0 4px 0',
                      lineHeight: 1.35
                    }}>
                      {item.judul}
                    </h3>

                    {/* Ringkasan */}
                    {item.ringkasan && (
                      <p style={{
                        fontSize: '11px',
                        color: '#64748b',
                        margin: '0 0 8px 0',
                        lineHeight: 1.4,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {item.ringkasan}
                      </p>
                    )}

                    {/* Footer Info */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: '8px',
                      paddingTop: '8px',
                      borderTop: '1px solid #f8fafc',
                      fontSize: '10px',
                      color: '#94a3b8'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{item.created_at_human || item.tanggal_mulai}</span>
                        <span>•</span>
                        <span>{item.pembuat}</span>
                      </div>

                      {item.has_lampiran && (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          color: '#2563eb',
                          fontWeight: '700'
                        }}>
                          <Paperclip size={11} />
                          Lampiran
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL DETAIL PENGUMUMAN */}
      {selectedItem && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          zIndex: 50,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            width: '100%',
            maxWidth: '480px',
            maxHeight: '90vh',
            borderTopLeftRadius: '24px',
            borderTopRightRadius: '24px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 -8px 30px rgba(0,0,0,0.25)',
            animation: 'slideUp 0.25s ease-out'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '14px 16px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#ffffff'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  backgroundColor: '#eff6ff',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Megaphone size={16} />
                </div>
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                    Detail Pengumuman
                  </h4>
                  <span style={{ fontSize: '10px', color: '#64748b' }}>
                    {selectedItem.tanggal_mulai || 'Resmi'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#ffffff',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div style={{
              padding: '16px',
              overflowY: 'auto',
              flex: 1
            }}>
              {/* Gambar Flyer Banner Besar (Jika ada) */}
              {selectedItem.gambar_url && (
                <div style={{
                  borderRadius: '16px',
                  overflow: 'hidden',
                  marginBottom: '16px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#0f172a'
                }}>
                  <img
                    src={selectedItem.gambar_url}
                    alt="Flyer Pengumuman"
                    style={{
                      width: '100%',
                      maxHeight: '260px',
                      objectFit: 'cover',
                      display: 'block'
                    }}
                  />
                </div>
              )}

              {/* Badges Info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
                {selectedItem.is_pinned && (
                  <span style={{
                    backgroundColor: '#fef3c7',
                    color: '#b45309',
                    fontSize: '9px',
                    fontWeight: '800',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    border: '1px solid #fde68a'
                  }}>
                    PINNED
                  </span>
                )}
                <span style={{
                  backgroundColor: '#e0f2fe',
                  color: '#0369a1',
                  fontSize: '9px',
                  fontWeight: '800',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  border: '1px solid #bae6fd'
                }}>
                  {selectedItem.label_tipe || 'Informasi'}
                </span>
                {selectedItem.is_khusus && (
                  <span style={{
                    backgroundColor: '#f3e8ff',
                    color: '#7e22ce',
                    fontSize: '9px',
                    fontWeight: '800',
                    padding: '2px 8px',
                    borderRadius: '6px'
                  }}>
                    Khusus Karyawan Tertentu
                  </span>
                )}
              </div>

              {/* Judul Pengumuman */}
              <h2 style={{
                fontSize: '16px',
                fontWeight: '800',
                color: '#0f172a',
                lineHeight: 1.35,
                margin: '0 0 6px 0'
              }}>
                {selectedItem.judul}
              </h2>

              <p style={{ fontSize: '11px', color: '#94a3b8', margin: '0 0 14px 0' }}>
                Diterbitkan oleh <strong style={{ color: '#475569' }}>{selectedItem.pembuat}</strong> • {selectedItem.created_at_formatted || selectedItem.created_at_human}
              </p>

              {/* Ringkasan jika ada */}
              {selectedItem.ringkasan && (
                <div style={{
                  padding: '10px 12px',
                  backgroundColor: '#f8fafc',
                  borderLeft: '3px solid #3b82f6',
                  borderRadius: '8px',
                  fontSize: '11px',
                  color: '#334155',
                  fontStyle: 'italic',
                  marginBottom: '14px',
                  lineHeight: 1.45
                }}>
                  "{selectedItem.ringkasan}"
                </div>
              )}

              {/* Konten Lengkap */}
              <div style={{
                fontSize: '12px',
                color: '#334155',
                lineHeight: 1.6,
                whiteSpace: 'pre-line',
                paddingTop: '10px',
                borderTop: '1px solid #f1f5f9'
              }}>
                {selectedItem.konten}
              </div>

              {/* Kartu Dokumen Lampiran jika ada */}
              {selectedItem.has_lampiran && (
                <div style={{
                  marginTop: '18px',
                  padding: '12px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '14px',
                  border: '1px solid #e2e8f0'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '8px'
                  }}>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Paperclip size={12} />
                      Dokumen Surat / Berkas
                    </span>
                  </div>

                  <div style={{
                    backgroundColor: '#ffffff',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <FileText size={18} color="#2563eb" style={{ shrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <p style={{
                          fontSize: '11px',
                          fontWeight: '700',
                          color: '#0f172a',
                          margin: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {selectedItem.lampiran_nama || 'Dokumen_Lampiran.pdf'}
                        </p>
                        <span style={{ fontSize: '9px', color: '#94a3b8' }}>
                          Buka langsung di aplikasi
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleOpenDocPreview(e, selectedItem)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#eff6ff',
                        color: '#2563eb',
                        border: '1px solid #bfdbfe',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        flexShrink: 0
                      }}
                    >
                      <Eye size={12} />
                      Buka
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '12px 16px',
              borderTop: '1px solid #f1f5f9',
              backgroundColor: '#f8fafc'
            }}>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '12px',
                  backgroundColor: '#0f172a',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: '700',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Tutup Pengumuman
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-App Preview Modal untuk Dokumen Lampiran Pengumuman */}
      <DocumentPreviewModal
        isOpen={previewDoc.isOpen}
        onClose={() => setPreviewDoc({ ...previewDoc, isOpen: false })}
        modul={previewDoc.modul}
        id={previewDoc.id}
        title={previewDoc.title}
      />
    </div>
  );
}
