import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft, Megaphone, Bell, CheckCircle2, Clock, AlertCircle,
  FileText, Calendar, ChevronRight, RefreshCw, Eye,
  Sparkles, Pin, Flame, ShieldAlert, Download, X, ExternalLink, Image as ImageIcon
} from 'lucide-react';
import api from '../../services/api';
import { sanitizeHtml } from '../../services/sanitizeHtml';


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
  // Fitur pengumuman kaya: isi detail HANYA dari endpoint detail baru
  // (detailItem), bukan dari item list. Selama detail belum kembali,
  // modal menampilkan loading — TIDAK PERNAH teks polos list sebagai
  // isi detail. detailError = detail gagal (mis. 404 pengumuman tak
  // tampil): modal menampilkan pesan error, bukan isi lama.
  const [detailItem, setDetailItem] = useState(null);
  const [detailError, setDetailError] = useState('');

  const closeDetail = () => {
    setSelectedItem(null);
    setDetailItem(null);
    setDetailError('');
  };

  // HTML detail tersanitasi (useMemo: sanitasi jalan sekali per detail,
  // bukan tiap render). Sumber: endpoint detail -> body_html.
  const htmlPengumuman = useMemo(
    () => (detailItem ? sanitizeHtml(detailItem.body_html || detailItem.konten_html || '') : ''),
    [detailItem],
  );

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
    setDetailItem(null);
    setDetailError('');
    try {
      const res = await api.getPengumumanDetail(item.id);
      if (res && res.success) {
        setDetailItem(res.data);
        // PNG-4/5: badge berkurang HANYA bila item sebelumnya belum
        // dibaca DAN server mengonfirmasi mark_read (bukan tiap buka
        // detail, bukan saat mark_read gagal).
        if (!item.is_dibaca && res.data.is_dibaca) {
          setItems((prev) =>
            prev.map((it) => (it.id === item.id ? { ...it, is_dibaca: true } : it))
          );
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      }
    } catch (err) {
      console.error('Error load detail pengumuman:', err);
      setDetailError(err.message || 'Gagal memuat detail pengumuman.');
    } finally {
      setIsDetailLoading(false);
    }
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

                        {/* Penanda ada-gambar (list tidak membawa URL
                            gambar; gambarnya tampil di detail kaya). */}
                        {item.has_image && !item.gambar_url && (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            backgroundColor: '#f1f5f9',
                            color: '#475569',
                            fontSize: '9px',
                            fontWeight: '700',
                            padding: '2px 6px',
                            borderRadius: '6px',
                            border: '1px solid #e2e8f0'
                          }}>
                            <ImageIcon size={10} />
                            Ada gambar
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span>Rilis {item.tanggal_rilis || item.created_at_human || item.tanggal_mulai}</span>
                        <span>•</span>
                        <span>{item.pembuat}</span>
                        {item.tanggal_expired && (
                          <>
                            <span>•</span>
                            <span>Berlaku s.d. {item.tanggal_expired}</span>
                          </>
                        )}
                      </div>
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
                    {(detailItem && (detailItem.tanggal_rilis || detailItem.tanggal_mulai))
                      || selectedItem.tanggal_rilis
                      || selectedItem.tanggal_mulai
                      || 'Resmi'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={closeDetail}
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
              {/* Selama detail dimuat: spinner saja — JANGAN tampilkan
                  teks polos item list sebagai isi detail. */}
              {isDetailLoading && !detailItem && (
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
                    Memuat detail pengumuman...
                  </p>
                </div>
              )}

              {/* Detail gagal (mis. 404 pengumuman tak tampil): pesan
                  error, bukan isi lama / teks polos. */}
              {!isDetailLoading && detailError && (
                <div style={{
                  padding: '16px',
                  borderRadius: '16px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fee2e2',
                  color: '#b91c1c',
                  fontSize: '12px',
                  textAlign: 'center'
                }}>
                  <AlertCircle size={24} style={{ margin: '0 auto 6px', display: 'block' }} />
                  <p style={{ margin: 0, fontWeight: '700' }}>{detailError}</p>
                </div>
              )}

              {detailItem && (
                <>
                  {/* Gambar Flyer Banner Besar (kompat server lama;
                      endpoint detail baru tidak mengirim gambar_url —
                      gambarnya ada di dalam body_html ter-embed). */}
                  {detailItem.gambar_url && (
                    <div style={{
                      borderRadius: '16px',
                      overflow: 'hidden',
                      marginBottom: '16px',
                      border: '1px solid #e2e8f0',
                      backgroundColor: '#0f172a'
                    }}>
                      <img
                        src={detailItem.gambar_url}
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
                    {detailItem.is_pinned && (
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
                      {detailItem.label_tipe || 'Informasi'}
                    </span>
                    {detailItem.has_image && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                        backgroundColor: '#f1f5f9',
                        color: '#475569',
                        fontSize: '9px',
                        fontWeight: '800',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0'
                      }}>
                        <ImageIcon size={10} />
                        Ada gambar
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
                    {detailItem.judul}
                  </h2>

                  <p style={{ fontSize: '11px', color: '#94a3b8', margin: '0 0 4px 0' }}>
                    Diterbitkan oleh <strong style={{ color: '#475569' }}>{detailItem.pembuat}</strong> • {detailItem.created_at_formatted || detailItem.created_at_human}
                  </p>
                  <p style={{ fontSize: '11px', color: '#94a3b8', margin: '0 0 14px 0' }}>
                    Rilis {detailItem.tanggal_rilis || detailItem.tanggal_mulai || '-'}
                    {detailItem.tanggal_expired && (
                      <> • Berlaku s.d. {detailItem.tanggal_expired}</>
                    )}
                  </p>

                  {/* Isi KAYA: HTML detail tersanitasi (judul/format/
                      gambar dari body_html). body_text TIDAK dirender
                      di sini — hanya untuk list/snippet. Bila server
                      mengirim body_html kosong, tampil placeholder,
                      bukan fallback teks polos. */}
                  <style>{`
                    .pengumuman-rich { font-size: 13px; color: #334155; line-height: 1.65; word-wrap: break-word; overflow-wrap: break-word; }
                    .pengumuman-rich p { margin: 0 0 10px 0; }
                    .pengumuman-rich h1, .pengumuman-rich h2, .pengumuman-rich h3, .pengumuman-rich h4 { color: #0f172a; line-height: 1.35; margin: 14px 0 8px 0; }
                    .pengumuman-rich h1 { font-size: 17px; } .pengumuman-rich h2 { font-size: 16px; }
                    .pengumuman-rich h3 { font-size: 15px; } .pengumuman-rich h4 { font-size: 14px; }
                    .pengumuman-rich ul, .pengumuman-rich ol { margin: 0 0 10px 0; padding-left: 20px; }
                    .pengumuman-rich li { margin-bottom: 4px; }
                    .pengumuman-rich img { max-width: 100%; height: auto; border-radius: 12px; display: block; margin: 10px auto; }
                    .pengumuman-rich a { color: #2563eb; text-decoration: underline; }
                    .pengumuman-rich blockquote { margin: 10px 0; padding: 8px 12px; border-left: 3px solid #3b82f6; background: #f8fafc; border-radius: 0 8px 8px 0; }
                    .pengumuman-rich table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 12px; display: block; overflow-x: auto; }
                    .pengumuman-rich th, .pengumuman-rich td { border: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; }
                    .pengumuman-rich th { background: #f8fafc; font-weight: 700; }
                    .pengumuman-rich hr { border: none; border-top: 1px solid #f1f5f9; margin: 12px 0; }
                  `}</style>
                  <div
                    className="pengumuman-rich"
                    style={{
                      paddingTop: '10px',
                      borderTop: '1px solid #f1f5f9'
                    }}
                    dangerouslySetInnerHTML={{ __html: htmlPengumuman || '<p>Tidak ada isi pengumuman.</p>' }}
                  />
                </>
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
                onClick={closeDetail}
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
    </div>
  );
}
