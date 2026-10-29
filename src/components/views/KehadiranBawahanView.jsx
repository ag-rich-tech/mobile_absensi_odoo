import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronLeft, Users, Calendar, Search, ChevronRight, ChevronDown, X, Clock,
  MapPin, AlertTriangle, CheckCircle2, ShieldAlert, Sparkles,
  Info, RefreshCw, Coffee, AlertCircle, Building, UserCheck
} from 'lucide-react';
import api, { formatDurasiMenit } from '../../services/api';

const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

// Satu node pohon org chart (daftar bersarang, bisa expand/collapse).
// Node user login (id === meId) memakai efek radar: dua cincin denyut
// berulang di sekeliling avatar + chip "Anda" — penanda visual
// "Anda di sini", bukan perubahan data. Node lain tidak berubah gaya.
function OrgChartNode({ node, depth, meId, expanded, onToggle, meNodeRef }) {
  const kids = node.children || [];
  const isOpen = !!expanded[node.id];
  const isMe = node.id === meId;
  const [imgError, setImgError] = useState(false);
  return (
    <div>
      <div
        ref={isMe ? meNodeRef : null}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 12px',
          marginLeft: depth === 0 ? 0 : 12,
          marginBottom: '6px',
          backgroundColor: isMe ? '#f0f9ff' : '#ffffff',
          border: isMe ? '1.5px solid #bae6fd' : '1px solid var(--border-light)',
          borderRadius: '12px',
          cursor: kids.length ? 'pointer' : 'default',
        }}
        onClick={() => kids.length && onToggle(node.id)}
      >
        {/* Avatar + cincin radar (hanya node user login) */}
        <div style={{ position: 'relative', flexShrink: 0, width: '32px', height: '32px' }}>
          {isMe && (
            <>
              <span className="orgchart-radar-ring" style={{ animationDelay: '0s' }} />
              <span className="orgchart-radar-ring" style={{ animationDelay: '1s' }} />
            </>
          )}
          {node.foto && !imgError ? (
            <img
              src={node.foto}
              alt=""
              onError={() => setImgError(true)}
              style={{ position: 'relative', width: '32px', height: '32px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #e2e8f0' }}
            />
          ) : (
            <div style={{
              position: 'relative',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '800',
              fontSize: '12px'
            }}>
              {node.inisial}
            </div>
          )}
        </div>

        {/* Nama & jabatan */}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            fontSize: '13px',
            fontWeight: '700',
            color: '#0f172a',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{node.nama}</span>
            {isMe && (
              <span style={{
                fontSize: '10px',
                fontWeight: '800',
                color: '#0369a1',
                backgroundColor: '#e0f2fe',
                borderRadius: '999px',
                padding: '2px 8px',
                flexShrink: 0
              }}>
                Anda
              </span>
            )}
          </div>
          <div style={{
            fontSize: '10px',
            color: '#94a3b8',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {node.jabatan}{node.departemen ? ` • ${node.departemen}` : ''}
          </div>
        </div>

        {/* Chevron expand/collapse */}
        {kids.length > 0 && (
          <span style={{ color: '#94a3b8', flexShrink: 0, display: 'flex' }}>
            {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </span>
        )}
      </div>

      {/* Anak (hanya bila node terbuka).
          Garis pohon digambar per baris anak (bukan border container) agar
          tersambung: segmen vertikal + tick horizontal ke kartu, dan segmen
          berhenti tepat di tengah kartu anak terakhir (tidak menggantung).
          Geometri: container paddingLeft 8 + kartu marginLeft 12 → tick
          selebar 20px dari garis (kiri -8) ke tepi kartu; tengah kartu ≈ 26px
          (padding 10 + avatar/konten 32 / 2).
          Gap parent→spine: kartu punya marginBottom 6px sehingga segmen
          anak pertama dulu mulai 6px di bawah tepi bawah kartu induk —
          diperbaiki dengan menarik segmen anak pertama ke atas 6px
          (top -6px; bila sekaligus anak terakhir, tinggi 32px agar
          tetap berhenti di tengah kartu). */}
      {isOpen && kids.length > 0 && (
        <div style={{ marginLeft: '16px', paddingLeft: '8px' }}>
          {kids.map((child, idx) => {
            const isLast = idx === kids.length - 1;
            const isFirst = idx === 0;
            return (
              <div key={child.id} style={{ position: 'relative' }}>
                {/* Segmen vertikal: baris biasa sampai bawah baris; baris
                    terakhir hanya sampai tengah kartu (26px). Anak
                    pertama ditarik ke atas menutup marginBottom kartu. */}
                <span style={{
                  position: 'absolute',
                  left: '-8px',
                  top: isFirst ? '-6px' : 0,
                  ...(isLast ? { height: isFirst ? '32px' : '26px' } : { bottom: 0 }),
                  width: '1.5px',
                  backgroundColor: 'var(--border-light)',
                }} />
                {/* Tick horizontal dari garis ke tepi kartu. */}
                <span style={{
                  position: 'absolute',
                  left: '-8px',
                  top: '26px',
                  width: '20px',
                  height: '1.5px',
                  backgroundColor: 'var(--border-light)',
                }} />
                <OrgChartNode
                  node={child}
                  depth={depth + 1}
                  meId={meId}
                  expanded={expanded}
                  onToggle={onToggle}
                  meNodeRef={meNodeRef}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function KehadiranBawahanView({ onBack }) {
  const currentDate = new Date();
  const [selectedBulan, setSelectedBulan] = useState(currentDate.getMonth() + 1);
  const [selectedTahun, setSelectedTahun] = useState(currentDate.getFullYear());
  
  // State data utama
  const [statusFitur, setStatusFitur] = useState(null);
  const [daftarBawahan, setDaftarBawahan] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [apiError, setApiError] = useState(null);

  // State tampilan kalender bawahan spesifik (ketika tombol 'Detail' diklik)
  const [selectedBawahan, setSelectedBawahan] = useState(null);
  const [kalenderData, setKalenderData] = useState(null);
  const [isLoadingKalender, setIsLoadingKalender] = useState(false);
  const [selectedDayDetail, setSelectedDayDetail] = useState(null); // Modal detail tanggal

  // State tab Org Chart (di dalam Tim Bawahan; tidak mengubah Kehadiran)
  const [tabAktif, setTabAktif] = useState('kehadiran');
  const [orgTree, setOrgTree] = useState([]);
  const [orgMeId, setOrgMeId] = useState(null);
  const [orgLoading, setOrgLoading] = useState(false);
  const [orgError, setOrgError] = useState(null);
  const [orgLoaded, setOrgLoaded] = useState(false);
  const [orgExpanded, setOrgExpanded] = useState({});
  const meNodeRef = useRef(null);
  const orgScrolledRef = useRef(false);
  // Pencarian tab Org Chart (dulu tidak ada — 69 root tak ter-search).
  const [orgSearchQuery, setOrgSearchQuery] = useState('');

  // Muat pohon org chart (lazy: hanya saat tab pertama dibuka).
  // Default: root + anak level 1 terbuka, level lebih dalam tertutup,
  // DITAMBAH jalur dari root ke node user login agar node user selalu
  // terlihat (tidak tertutup di dalam cabang yang collapsed).
  const loadOrgChart = useCallback(async (silent = false) => {
    if (!silent) setOrgLoading(true);
    setOrgError(null);
    try {
      const res = await api.getTeamOrgChart();
      if (!res.success) {
        setOrgError(res.message || 'Gagal memuat org chart.');
        return;
      }
      const tree = res.tree || [];
      setOrgTree(tree);
      setOrgMeId(res.me_id || null);
      const next = {};
      const markLevel = (nodes, level) => {
        for (const n of nodes) {
          if (level <= 1) next[n.id] = true;
          markLevel(n.children || [], level + 1);
        }
      };
      markLevel(tree, 0);
      const findPath = (nodes, target, trail) => {
        for (const n of nodes) {
          if (n.id === target) return [...trail, n.id];
          const hit = findPath(n.children || [], target, [...trail, n.id]);
          if (hit) return hit;
        }
        return null;
      };
      const path = res.me_id ? findPath(tree, res.me_id, []) : null;
      if (path) for (const id of path) next[id] = true;
      setOrgExpanded(next);
      setOrgLoaded(true);
      orgScrolledRef.current = false;
    } catch (err) {
      console.error('Gagal memuat org chart:', err);
      setOrgError(err.message || 'Terjadi kesalahan jaringan.');
    } finally {
      setOrgLoading(false);
    }
  }, []);

  // Muat org chart sekali saat tab pertama dibuka.
  useEffect(() => {
    if (tabAktif === 'orgchart' && !orgLoaded && !orgLoading) {
      loadOrgChart();
    }
  }, [tabAktif, orgLoaded, orgLoading, loadOrgChart]);

  // Geser daftar ke node user saat tab Org Chart pertama dibuka
  // (sekali per pemuatan; tidak menarik scroll saat expand/collapse).
  useEffect(() => {
    if (tabAktif !== 'orgchart' || !orgLoaded || orgScrolledRef.current) return;
    const t = setTimeout(() => {
      if (meNodeRef.current && meNodeRef.current.scrollIntoView) {
        meNodeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      orgScrolledRef.current = true;
    }, 150);
    return () => clearTimeout(t);
  }, [tabAktif, orgLoaded, orgTree]);

  const toggleOrgNode = (id) => {
    setOrgExpanded((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = true;
      return next;
    });
  };

  const expandAllOrg = () => {
    const next = {};
    const walk = (nodes) => {
      for (const n of nodes) {
        if ((n.children || []).length) next[n.id] = true;
        walk(n.children || []);
      }
    };
    walk(orgTree);
    setOrgExpanded(next);
  };

  const collapseAllOrg = () => setOrgExpanded({});

  const countOrgNodes = (nodes) =>
    nodes.reduce((acc, n) => acc + 1 + countOrgNodes(n.children || []), 0);
  const orgCount = countOrgNodes(orgTree);

  // Filter pohon berdasarkan pencarian: node yang cocok tampil dengan
  // subtree penuhnya; node yang tidak cocok tampil hanya bila punya
  // turunan yang cocok (dengan subtree terfilter) agar hasil tetap
  // terjangkau dari root. Saat mencari, semua node hasil dipaksa
  // terbuka supaya hasil terlihat tanpa expand manual.
  const orgSearchActive = orgSearchQuery.trim().length > 0;
  const orgSearchQ = orgSearchQuery.trim().toLowerCase();
  const filterOrgTree = (nodes, q) => {
    const out = [];
    for (const n of nodes) {
      const hit = (n.nama || '').toLowerCase().includes(q)
        || (n.jabatan || '').toLowerCase().includes(q)
        || (n.departemen || '').toLowerCase().includes(q);
      if (hit) {
        out.push(n);
      } else {
        const kids = filterOrgTree(n.children || [], q);
        if (kids.length) out.push({ ...n, children: kids });
      }
    }
    return out;
  };
  const filteredOrgTree = orgSearchActive ? filterOrgTree(orgTree, orgSearchQ) : orgTree;
  const displayExpanded = (() => {
    if (!orgSearchActive) return orgExpanded;
    const next = { ...orgExpanded };
    const walk = (nodes) => {
      for (const n of nodes) {
        next[n.id] = true;
        walk(n.children || []);
      }
    };
    walk(filteredOrgTree);
    return next;
  })();

  // "Cari Saya": buka jalur root→node login-user (bila tertutup),
  // bersihkan filter pencarian (supaya node tidak tersembunyi),
  // lalu scroll ke node tersebut. Auto-scroll sekali-saat-load tetap
  // jalan lewat orgScrolledRef; tombol ini untuk sesudah Ciutkan.
  const scrollToMe = () => {
    if (!orgMeId) return;
    const findPath = (nodes, target, trail) => {
      for (const n of nodes) {
        if (n.id === target) return [...trail, n.id];
        const hit = findPath(n.children || [], target, [...trail, n.id]);
        if (hit) return hit;
      }
      return null;
    };
    const path = findPath(orgTree, orgMeId, []);
    if (path) {
      setOrgExpanded((prev) => {
        const next = { ...prev };
        for (const id of path) next[id] = true;
        return next;
      });
    }
    setOrgSearchQuery('');
    setTimeout(() => {
      if (meNodeRef.current && meNodeRef.current.scrollIntoView) {
        meNodeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 200);
  };

  const formatBulanTahunParam = (m, y) => {
    const mm = String(m).padStart(2, '0');
    return `${y}-${mm}`;
  };

  // Muat status dan list staf bawahan
  const loadDataBawahan = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      // 1. Cek status otorisasi & setting admin
      const statusRes = await api.getKehadiranBawahanStatus();
      setStatusFitur(statusRes);

      if (statusRes.message) {
        setApiError(statusRes.message);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }
      setApiError(null);

      if (statusRes.success && statusRes.is_enabled && statusRes.is_atasan) {
        const bulanParam = formatBulanTahunParam(selectedBulan, selectedTahun);
        const listRes = await api.getKehadiranBawahanList(bulanParam);
        if (listRes.message) {
          setApiError(listRes.message);
        } else if (listRes.success) {
          setDaftarBawahan(listRes.data || []);
          setApiError(null);
        } else {
          setDaftarBawahan([]);
          setApiError(listRes.message || 'Gagal memuat data bawahan.');
        }
      }
    } catch (err) {
      console.error('Gagal memuat data bawahan:', err);
      setApiError(err.message || 'Terjadi kesalahan jaringan.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Muat kalender detail saat bawahan dipilih atau bulan diganti
  const loadKalenderBawahan = async (bawahanId, m = selectedBulan, y = selectedTahun) => {
    setIsLoadingKalender(true);
    try {
      const bulanParam = formatBulanTahunParam(m, y);
      const res = await api.getKalenderBawahan(bawahanId, bulanParam);
      if (res.success) {
        setKalenderData(res);
      } else {
        setKalenderData(null);
      }
    } catch (err) {
      console.error('Gagal memuat kalender bawahan:', err);
    } finally {
      setIsLoadingKalender(false);
    }
  };

  useEffect(() => {
    loadDataBawahan();
  }, [selectedBulan, selectedTahun]);

  // Efek ganti bulan di view kalender
  const handlePilihBawahan = (bawahan) => {
    setSelectedBawahan(bawahan);
    loadKalenderBawahan(bawahan.id, selectedBulan, selectedTahun);
  };

  const handlePrevMonth = () => {
    let nextM = selectedBulan - 1;
    let nextY = selectedTahun;
    if (nextM < 1) {
      nextM = 12;
      nextY -= 1;
    }
    setSelectedBulan(nextM);
    setSelectedTahun(nextY);
    if (selectedBawahan) {
      loadKalenderBawahan(selectedBawahan.id, nextM, nextY);
    }
  };

  const handleNextMonth = () => {
    let nextM = selectedBulan + 1;
    let nextY = selectedTahun;
    if (nextM > 12) {
      nextM = 1;
      nextY += 1;
    }
    setSelectedBulan(nextM);
    setSelectedTahun(nextY);
    if (selectedBawahan) {
      loadKalenderBawahan(selectedBawahan.id, nextM, nextY);
    }
  };

  // Filter pencarian bawahan
  const filteredBawahan = daftarBawahan.filter((b) => {
    const q = searchQuery.toLowerCase();
    return (
      b.nama?.toLowerCase().includes(q) ||
      b.nip?.toLowerCase().includes(q) ||
      b.jabatan?.toLowerCase().includes(q) ||
      b.departemen?.toLowerCase().includes(q)
    );
  });

  // Tampilan 1: Loading Awal
  if (isLoading && !statusFitur) {
    return (
      <div style={{ padding: '24px 20px', minHeight: '380px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
        <RefreshCw size={28} className="animate-spin" color="var(--primary-600)" />
        <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>
          Memeriksa hak akses & data tim bawahan...
        </span>
      </div>
    );
  }

  // Tampilan 2: Fitur Dinonaktifkan oleh Admin di Panel Monitoring
  if (statusFitur && !statusFitur.is_enabled) {
    return (
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }} className="animate-fade-in">
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
          <h2 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
            Kehadiran Bawahan
          </h2>
        </div>

        <div style={{
          backgroundColor: '#fff7ed',
          border: '1.5px solid #fed7aa',
          borderRadius: '16px',
          padding: '24px 20px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          marginTop: '20px'
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: '#ffedd5',
            color: '#ea580c',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ShieldAlert size={28} />
          </div>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#9a3412', margin: '0 0 6px' }}>
              Fitur Dinonaktifkan
            </h3>
            <p style={{ fontSize: '12px', color: '#c2410c', margin: 0, lineHeight: 1.5 }}>
              Fitur riwayat absensi bawahan sedang dinonaktifkan oleh Administrator melalui menu monitoring di panel admin. Silakan hubungi admin jika Anda membutuhkan akses ini.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Tampilan 3: User Bukan Atasan / Tidak Ada Anggota Bawahan
  if (statusFitur && !statusFitur.is_atasan) {
    return (
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }} className="animate-fade-in">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={onBack}
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
          <h2 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
            Kehadiran Bawahan
          </h2>
        </div>

        <div style={{
          backgroundColor: '#f8fafc',
          border: '1.5px solid #e2e8f0',
          borderRadius: '16px',
          padding: '24px 20px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          marginTop: '20px'
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: '#e2e8f0',
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Users size={28} />
          </div>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#1e293b', margin: '0 0 6px' }}>
              Tidak Memiliki Staf Bawahan
            </h3>
            <p style={{ fontSize: '12px', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
              Akun Anda saat ini tidak tercatat sebagai atasan dari karyawan manapun dalam sistem kepegawaian.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // TAMPILAN 4: KALENDER KEHADIRAN BAWAHAN SPESIFIK (JIKA TOMBOL DETAIL SUDAH DIKLIK)
  if (selectedBawahan) {
    const summary = kalenderData?.summary || {};
    const kalenderHari = kalenderData?.kalender || [];

    // Helper hari pertama bulan jatuh pada hari apa untuk padding grid kalender (0 = Minggu, 1 = Senin, dst)
    const firstDayIndex = kalenderHari.length > 0 ? new Date(kalenderHari[0].tanggal).getDay() : 0;
    const paddingBlanks = Array.from({ length: firstDayIndex });

    return (
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }} className="animate-fade-in">
        {/* Header Navigasi Atas */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={() => {
                setSelectedBawahan(null);
                setKalenderData(null);
              }}
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
              <h2 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', margin: 0, letterSpacing: '-0.3px' }}>
                Kalender Kehadiran
              </h2>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
                Riwayat absensi harian staf bawahan
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => loadKalenderBawahan(selectedBawahan.id)}
            disabled={isLoadingKalender}
            title="Segarkan Kalender"
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
            <RefreshCw size={16} className={isLoadingKalender ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Profil Singkat Bawahan Terpilih */}
        <div style={{
          padding: '14px 16px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
          border: '1.5px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          {/* Avatar: inisial selalu di bawah; img menutupinya bila
              berhasil dimuat, hilang sendiri (onError) bila URL 404. */}
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '800',
            fontSize: '15px',
            position: 'relative',
            overflow: 'hidden',
            flexShrink: 0
          }}>
            {selectedBawahan.inisial || selectedBawahan.nama.substring(0, 2).toUpperCase()}
            {selectedBawahan.foto && (
              <img
                src={selectedBawahan.foto}
                alt={selectedBawahan.nama}
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', border: '1.5px solid #cbd5e1', borderRadius: '12px' }}
              />
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', margin: '0 0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {selectedBawahan.nama}
            </h3>
            <p style={{ fontSize: '11px', color: '#64748b', margin: '0 0 2px', fontWeight: '600' }}>
              NIP: {selectedBawahan.nip} • {selectedBawahan.jabatan}
            </p>
            <span style={{ fontSize: '10px', color: '#0284c7', fontWeight: '700', backgroundColor: '#e0f2fe', padding: '2px 6px', borderRadius: '4px' }}>
              {selectedBawahan.departemen}
            </span>
          </div>
        </div>

        {/* Switch Navigasi Bulan */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '8px 12px',
          border: '1.5px solid var(--border-light)'
        }}>
          <button
            type="button"
            onClick={handlePrevMonth}
            style={{
              padding: '6px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#f1f5f9',
              color: '#334155',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <ChevronLeft size={18} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={16} color="var(--primary-600)" />
            <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)' }}>
              {NAMA_BULAN[selectedBulan - 1]} {selectedTahun}
            </span>
          </div>

          <button
            type="button"
            onClick={handleNextMonth}
            style={{
              padding: '6px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#f1f5f9',
              color: '#334155',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Ringkasan Kode & Statistik Kehadiran Bulanan */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '8px'
        }}>
          {/* H */}
          <div style={{ padding: '8px 6px', borderRadius: '10px', backgroundColor: '#f0fdf4', border: '1px solid #86efac', textAlign: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: '#16a34a', display: 'block' }}>H</span>
            <span style={{ fontSize: '16px', fontWeight: '800', color: '#15803d', display: 'block' }}>{summary.H || 0}</span>
            <span style={{ fontSize: '9px', color: '#166534', fontWeight: '600' }}>Tepat Waktu</span>
          </div>

          {/* H-TP */}
          <div style={{ padding: '8px 6px', borderRadius: '10px', backgroundColor: '#fff7ed', border: '1px solid #fed7aa', textAlign: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: '#ea580c', display: 'block' }}>H-TP</span>
            <span style={{ fontSize: '16px', fontWeight: '800', color: '#c2410c', display: 'block' }}>{(summary.H_TP || 0) + (summary.TP || 0)}</span>
            <span style={{ fontSize: '9px', color: '#9a3412', fontWeight: '600' }}>Tdk Absen Plg</span>
          </div>

          {/* T */}
          <div style={{ padding: '8px 6px', borderRadius: '10px', backgroundColor: '#fffbeb', border: '1px solid #fde68a', textAlign: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: '#d97706', display: 'block' }}>T</span>
            <span style={{ fontSize: '16px', fontWeight: '800', color: '#b45309', display: 'block' }}>{(summary.T || 0) + (summary.T_TP || 0)}</span>
            <span style={{ fontSize: '9px', color: '#78350f', fontWeight: '600' }}>Terlambat</span>
          </div>

          {/* PA */}
          <div style={{ padding: '8px 6px', borderRadius: '10px', backgroundColor: '#eef2ff', border: '1px solid #c7d2fe', textAlign: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: '#6366f1', display: 'block' }}>PA</span>
            <span style={{ fontSize: '16px', fontWeight: '800', color: '#4f46e5', display: 'block' }}>{(summary.PA || 0) + (summary.T_PA || 0)}</span>
            <span style={{ fontSize: '9px', color: '#3730a3', fontWeight: '600' }}>Pulang Awal</span>
          </div>

          {/* A (TIDAK HADIR / MERAH) */}
          <div style={{ padding: '8px 6px', borderRadius: '10px', backgroundColor: '#fef2f2', border: '1.5px solid #fca5a5', textAlign: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: '#dc2626', display: 'block' }}>A</span>
            <span style={{ fontSize: '16px', fontWeight: '800', color: '#b91c1c', display: 'block' }}>{summary.A || 0}</span>
            <span style={{ fontSize: '9px', color: '#991b1b', fontWeight: '700' }}>Tidak Hadir</span>
          </div>

          {/* I */}
          <div style={{ padding: '8px 6px', borderRadius: '10px', backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', textAlign: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: '#0284c7', display: 'block' }}>I</span>
            <span style={{ fontSize: '16px', fontWeight: '800', color: '#0369a1', display: 'block' }}>{summary.I || 0}</span>
            <span style={{ fontSize: '9px', color: '#075985', fontWeight: '600' }}>Izin</span>
          </div>

          {/* S */}
          <div style={{ padding: '8px 6px', borderRadius: '10px', backgroundColor: '#fefce8', border: '1px solid #fef08a', textAlign: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: '#ca8a04', display: 'block' }}>S</span>
            <span style={{ fontSize: '16px', fontWeight: '800', color: '#a16207', display: 'block' }}>{summary.S || 0}</span>
            <span style={{ fontSize: '9px', color: '#854d0e', fontWeight: '600' }}>Sakit</span>
          </div>

          {/* C & D */}
          <div style={{ padding: '8px 6px', borderRadius: '10px', backgroundColor: '#f0fdfa', border: '1px solid #99f6e4', textAlign: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: '#0d9488', display: 'block' }}>C / D</span>
            <span style={{ fontSize: '16px', fontWeight: '800', color: '#0f766e', display: 'block' }}>{(summary.C || 0) + (summary.D || 0)}</span>
            <span style={{ fontSize: '9px', color: '#115e59', fontWeight: '600' }}>Cuti/Dinas</span>
          </div>
        </div>

        {/* Card Kalender Presensi Grid */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1.5px solid var(--border-light)',
          padding: '16px 12px',
          boxShadow: '0 4px 14px rgba(0,0,0,0.04)'
        }}>
          {isLoadingKalender ? (
            <div style={{ padding: '40px 0', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <RefreshCw size={24} className="animate-spin" color="var(--primary-600)" />
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Menyusun kalender kehadiran...</span>
            </div>
          ) : (
            <div>
              {/* Header Kolom Nama Hari */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '4px',
                textAlign: 'center',
                marginBottom: '8px'
              }}>
                {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((hari, idx) => (
                  <div
                    key={hari}
                    style={{
                      fontSize: '11px',
                      fontWeight: '800',
                      color: idx === 0 ? '#ef4444' : '#64748b',
                      padding: '4px 0'
                    }}
                  >
                    {hari}
                  </div>
                ))}
              </div>

              {/* Grid Kotak Tanggal */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '5px'
              }}>
                {/* Padding awal bulan */}
                {paddingBlanks.map((_, idx) => (
                  <div key={`blank-${idx}`} style={{ minHeight: '48px', opacity: 0.2 }} />
                ))}

                {/* Tanggal 1 s/d Hari Terakhir */}
                {kalenderHari.map((day) => {
                  const isAlfa = day.kode === 'A';
                  const isLibur = day.kode === 'L';
                  const isFuture = day.is_future;

                  return (
                    <div
                      key={day.tanggal}
                      onClick={() => setSelectedDayDetail(day)}
                      style={{
                        minHeight: '48px',
                        borderRadius: '8px',
                        backgroundColor: day.warna_bg || '#ffffff',
                        border: `1.5px solid ${day.warna_border || '#e2e8f0'}`,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '3px 2px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        position: 'relative',
                        boxShadow: day.is_today ? '0 0 0 2px var(--primary-600)' : 'none'
                      }}
                    >
                      {/* Nomor Tanggal */}
                      <span style={{
                        fontSize: '9px',
                        fontWeight: day.is_today ? '900' : '600',
                        color: day.is_today ? 'var(--primary-600)' : '#64748b',
                        alignSelf: 'flex-start',
                        paddingLeft: '2px',
                        lineHeight: 1
                      }}>
                        {day.hari}
                      </span>

                      {/* Kode Status Utama */}
                      <span style={{
                        fontSize: isAlfa ? '14px' : (day.kode?.length > 2 ? '10px' : '12px'),
                        fontWeight: '900',
                        color: day.warna_teks || '#1e293b',
                        lineHeight: 1,
                        margin: '2px 0'
                      }}>
                        {day.kode || ''}
                      </span>

                      {/* Indikator kecil detail absensi */}
                      <div style={{ height: '4px', display: 'flex', alignItems: 'center' }}>
                        {day.detail_absensi && (
                          <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: day.warna_teks }} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Panduan Legenda Status */}
        <div style={{
          backgroundColor: '#f8fafc',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <span style={{ fontSize: '11px', fontWeight: '800', color: '#334155', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Info size={14} color="#0284c7" /> Keterangan Kode Status Presensi:
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '10px', color: '#475569' }}>
            <div><b style={{ color: '#16a34a' }}>H</b> : Hadir</div>
            <div><b style={{ color: '#ea580c' }}>H-TP</b> : Hadir (Tdk Absen Pulang)</div>
            <div><b style={{ color: '#d97706' }}>T</b> : Telat Masuk</div>
            <div><b style={{ color: '#6366f1' }}>PA</b> : Pulang Awal</div>
            <div><b style={{ color: '#ef4444' }}>A</b> : Tidak Hadir / Alpha (Merah)</div>
            <div><b style={{ color: '#0284c7' }}>I</b> : Izin Resmi</div>
            <div><b style={{ color: '#ca8a04' }}>S</b> : Sakit</div>
            <div><b style={{ color: '#94a3b8' }}>L</b> : Hari Libur / Off Kerja</div>
          </div>
        </div>

        {/* Modal Center Dialog Detail Harian Saat Tanggal Disentuh */}
        {selectedDayDetail && (
          <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }} className="animate-fade-in">
            <div style={{
              width: '100%',
              maxWidth: '400px',
              backgroundColor: '#ffffff',
              borderRadius: '24px',
              padding: '20px',
              paddingBottom: '28px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              maxHeight: '85vh',
              overflowY: 'auto',
              overscrollBehavior: 'contain'
            }}>
              {/* Header Modal */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => { setSelectedDayDetail(null); setSelectedBawahan(null); }}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      backgroundColor: '#f1f5f9',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#64748b',
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)' }}>
                      Rincian Kehadiran Tanggal
                    </span>
                    <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: '2px 0 0' }}>
                      {selectedDayDetail.nama_hari}, {selectedDayDetail.hari} {NAMA_BULAN[selectedBulan - 1]} {selectedTahun}
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDayDetail(null)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: '#f1f5f9',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#64748b',
                    cursor: 'pointer'
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Status Badge */}
              <div style={{
                padding: '10px 14px',
                borderRadius: '12px',
                backgroundColor: selectedDayDetail.warna_bg,
                border: `1.5px solid ${selectedDayDetail.warna_border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <span style={{ fontSize: '10px', fontWeight: '700', color: selectedDayDetail.warna_teks, textTransform: 'uppercase' }}>
                    Status Harian
                  </span>
                  <h4 style={{ fontSize: '14px', fontWeight: '800', color: selectedDayDetail.warna_teks, margin: '2px 0 0' }}>
                    [{selectedDayDetail.kode}] {selectedDayDetail.label}
                  </h4>
                </div>
                {selectedDayDetail.kode === 'A' && (
                  <span style={{ backgroundColor: '#ef4444', color: '#ffffff', fontSize: '10px', fontWeight: '800', padding: '3px 8px', borderRadius: '6px' }}>
                    Alpha
                  </span>
                )}
              </div>

              {/* Keterangan / Deskripsi Izin/Dinas */}
              {selectedDayDetail.deskripsi && (
                <div style={{ padding: '10px 12px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '10px', fontWeight: '700', color: '#64748b' }}>Keterangan / Dokumen:</span>
                  <p style={{ fontSize: '12px', color: '#334155', margin: '2px 0 0', fontWeight: '600' }}>
                    {selectedDayDetail.deskripsi}
                  </p>
                </div>
              )}

              {/* Data Jam Masuk, Jam Pulang, Shift */}
              {selectedDayDetail.detail_absensi ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {/* Jam Masuk */}
                    <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '10px', fontWeight: '700', color: '#64748b' }}>Jam Masuk</span>
                      <p style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: '2px 0 0' }}>
                        {selectedDayDetail.detail_absensi.jam_masuk || '--:--'}
                      </p>
                      <span style={{
                        fontSize: '9px',
                        fontWeight: '700',
                        color: selectedDayDetail.detail_absensi.status_masuk === 'terlambat' ? '#ea580c' : (selectedDayDetail.detail_absensi.status_masuk === 'tepat_waktu' ? '#16a34a' : '#64748b')
                      }}>
                        {selectedDayDetail.detail_absensi.status_masuk === 'terlambat'
                          ? `Telat ${formatDurasiMenit(selectedDayDetail.detail_absensi.menit_terlambat)}`
                          : (selectedDayDetail.detail_absensi.status_masuk === 'tepat_waktu'
                            ? 'Tepat Waktu'
                            : 'Status tidak diketahui')}
                      </span>
                    </div>

                    {/* Jam Pulang */}
                    <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '10px', fontWeight: '700', color: '#64748b' }}>Jam Pulang</span>
                      <p style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: '2px 0 0' }}>
                        {selectedDayDetail.detail_absensi.jam_pulang || '--:--'}
                      </p>
                      <span style={{
                        fontSize: '9px',
                        fontWeight: '700',
                        color: !selectedDayDetail.detail_absensi.jam_pulang
                          ? '#ef4444'
                          : (selectedDayDetail.detail_absensi.status_pulang === 'pulang_cepat' ? '#6366f1' : '#16a34a')
                      }}>
                        {!selectedDayDetail.detail_absensi.jam_pulang
                          ? 'Tidak Absen Pulang (TP)'
                          : (selectedDayDetail.detail_absensi.status_pulang === 'pulang_cepat'
                              ? `Pulang Cepat ${formatDurasiMenit(selectedDayDetail.detail_absensi.menit_pulang_cepat)}`
                              : 'Normal')}
                      </span>
                    </div>
                  </div>

                  {/* Lokasi & Shift Info */}
                  <div style={{ padding: '8px 12px', borderRadius: '10px', backgroundColor: '#f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {selectedDayDetail.detail_absensi.shift ? (
                      <span style={{ fontSize: '11px', color: '#475569' }}>
                        Shift: <b>{selectedDayDetail.detail_absensi.shift}</b>
                      </span>
                    ) : null}
                    {selectedDayDetail.detail_absensi.lokasi ? (
                      <span style={{ fontSize: '11px', color: '#475569' }}>
                        Lokasi: <b>{selectedDayDetail.detail_absensi.lokasi}</b>
                      </span>
                    ) : null}
                  </div>

                  {selectedDayDetail.detail_absensi.total_denda > 0 && (
                    <div style={{ padding: '8px 12px', borderRadius: '8px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', color: '#b91c1c', fontWeight: '600' }}>Denda Keterlambatan:</span>
                      <span style={{ fontSize: '12px', color: '#b91c1c', fontWeight: '800' }}>
                        Rp {Number(selectedDayDetail.detail_absensi.total_denda).toLocaleString('id-ID')}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ padding: '16px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '10px', color: '#64748b', fontSize: '12px' }}>
                  Tidak ada catatan ketukan presensi pada tanggal ini.
                </div>
              )}

              <button
                type="button"
                onClick={() => setSelectedDayDetail(null)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  backgroundColor: '#0f172a',
                  color: '#ffffff',
                  fontWeight: '700',
                  fontSize: '13px',
                  border: 'none',
                  cursor: 'pointer',
                  marginTop: '4px'
                }}
              >
                Tutup Rincian
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // TAMPILAN 5: LIST KARYAWAN BAWAHAN DENGAN TOMBOL 'DETAIL'
  return (
    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }} className="animate-fade-in">
      {/* Header Utama */}
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
            <h2 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', margin: 0, letterSpacing: '-0.3px' }}>
              Kehadiran Bawahan
            </h2>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
              Monitoring riwayat absensi staf tim Anda
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => tabAktif === 'orgchart' ? loadOrgChart(true) : loadDataBawahan(true)}
          disabled={isRefreshing}
          title="Segarkan Data"
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
          <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Tab Kehadiran / Org Chart (di dalam Tim Bawahan) */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          type="button"
          onClick={() => setTabAktif('kehadiran')}
          style={{
            flex: 1,
            padding: '10px 12px',
            borderRadius: '12px',
            border: tabAktif === 'kehadiran' ? '1.5px solid #0284c7' : '1.5px solid var(--border-light)',
            backgroundColor: tabAktif === 'kehadiran' ? '#e0f2fe' : '#ffffff',
            color: tabAktif === 'kehadiran' ? '#0369a1' : '#64748b',
            fontSize: '12px',
            fontWeight: '800',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <Users size={16} />
          <span>Kehadiran</span>
        </button>
        <button
          type="button"
          onClick={() => setTabAktif('orgchart')}
          style={{
            flex: 1,
            padding: '10px 12px',
            borderRadius: '12px',
            border: tabAktif === 'orgchart' ? '1.5px solid #0284c7' : '1.5px solid var(--border-light)',
            backgroundColor: tabAktif === 'orgchart' ? '#e0f2fe' : '#ffffff',
            color: tabAktif === 'orgchart' ? '#0369a1' : '#64748b',
            fontSize: '12px',
            fontWeight: '800',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <Building size={16} />
          <span>Org Chart</span>
        </button>
      </div>

      {/* Error banner */}
      {apiError && (
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
          <span style={{ fontSize: '12px', color: '#991b1b', flex: 1 }}>{apiError}</span>
          <button
            type="button"
            onClick={() => loadDataBawahan(true)}
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
            重试
          </button>
        </div>
      )}

      {tabAktif === 'kehadiran' && (
      <>
      {/* Baris Pemilih Bulan & Input Pencarian */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Switch Bulan */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '8px 12px',
          border: '1.5px solid var(--border-light)'
        }}>
          <button
            type="button"
            onClick={handlePrevMonth}
            style={{
              padding: '6px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#f1f5f9',
              color: '#334155',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <ChevronLeft size={18} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={16} color="var(--primary-600)" />
            <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)' }}>
              {NAMA_BULAN[selectedBulan - 1]} {selectedTahun}
            </span>
          </div>

          <button
            type="button"
            onClick={handleNextMonth}
            style={{
              padding: '6px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#f1f5f9',
              color: '#334155',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Input Cari Karyawan */}
        <div style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center'
        }}>
          <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px' }} />
          <input
            type="text"
            placeholder="Cari nama, NIP, atau jabatan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px 10px 36px',
              borderRadius: '12px',
              border: '1.5px solid var(--border-light)',
              backgroundColor: '#ffffff',
              fontSize: '12px',
              color: 'var(--text-main)',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '10px',
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Ringkasan Jumlah Tim */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-main)' }}>
          Daftar Staf Bawahan ({filteredBawahan.length})
        </span>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          Periode: {NAMA_BULAN[selectedBulan - 1]} {selectedTahun}
        </span>
      </div>

      {/* List Kartu Karyawan */}
      {isLoading ? (
        <div style={{ padding: '40px 0', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <RefreshCw size={24} className="animate-spin" color="var(--primary-600)" />
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Memuat staf bawahan...</span>
        </div>
      ) : filteredBawahan.length === 0 ? (
        <div style={{
          padding: '30px 20px',
          textAlign: 'center',
          backgroundColor: '#f8fafc',
          borderRadius: '16px',
          border: '1.5px dashed #cbd5e1',
          color: '#64748b'
        }}>
          <Users size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
          <p style={{ fontSize: '13px', fontWeight: '700', margin: '0 0 4px', color: '#334155' }}>
            {searchQuery ? 'Karyawan Tidak Ditemukan' : 'Belum Ada Data Staf'}
          </p>
          <span style={{ fontSize: '11px' }}>
            {searchQuery ? 'Coba gunakan kata kunci pencarian yang lain.' : 'Tidak ada anggota staf bawahan yang terdaftar.'}
          </span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {/* Header Baris Tabel */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '44px 1fr repeat(5, 44px) 60px',
            gap: '0',
            padding: '8px 14px',
            backgroundColor: '#f8fafc',
            borderRadius: '12px 12px 0 0',
            borderBottom: '1.5px solid var(--border-light)',
            fontSize: '10px',
            fontWeight: '800',
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.04em'
          }}>
            <span></span>
            <span>Nama</span>
            <span style={{ textAlign: 'center' }}>H</span>
            <span style={{ textAlign: 'center' }}>T</span>
            <span style={{ textAlign: 'center' }}>A</span>
            <span style={{ textAlign: 'center' }}>Iz</span>
            <span style={{ textAlign: 'center' }}>Sk</span>
            <span></span>
          </div>

          {/* Baris Data */}
          {filteredBawahan.map((bawahan) => {
            const sum = bawahan.summary || {};
            return (
              <div
                key={bawahan.id}
                onClick={() => handlePilihBawahan(bawahan)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '44px 1fr repeat(5, 44px) 60px',
                  gap: '0',
                  padding: '10px 14px',
                  backgroundColor: '#ffffff',
                  borderBottom: '1px solid var(--border-light)',
                  cursor: 'pointer',
                  transition: 'background-color 0.1s ease',
                  alignItems: 'center'
                }}
              >
                {/* Foto Avatar: inisial di bawah, img menutupinya
                    bila termuat; onError menyembunyikan img bila 404. */}
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '800',
                  fontSize: '12px',
                  position: 'relative',
                  overflow: 'hidden',
                  flexShrink: 0
                }}>
                  {bawahan.inisial}
                  {bawahan.foto && (
                    <img
                      src={bawahan.foto}
                      alt={bawahan.nama}
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                    />
                  )}
                </div>

                {/* Nama & Jabatan */}
                <div style={{ minWidth: 0, marginRight: '8px' }}>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: '700',
                    color: '#0f172a',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {bawahan.nama}
                  </div>
                  <div style={{
                    fontSize: '10px',
                    color: '#94a3b8',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {bawahan.nip} · {bawahan.jabatan}
                  </div>
                </div>

                {/* Hadir */}
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: '14px', fontWeight: '800', color: '#15803d' }}>{sum.hadir ?? 0}</span>
                </div>

                {/* Telat */}
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: '14px', fontWeight: '800', color: '#b45309' }}>{sum.terlambat ?? 0}</span>
                </div>

                {/* Alpha */}
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: '14px', fontWeight: '800', color: '#b91c1c' }}>{sum.tidak_hadir ?? 0}</span>
                </div>

                {/* Izin */}
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: '14px', fontWeight: '800', color: '#0369a1' }}>{sum.izin ?? 0}</span>
                </div>

                {/* Sakit */}
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: '14px', fontWeight: '800', color: '#a16207' }}>{sum.sakit ?? 0}</span>
                </div>

                {/* Detail Button */}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => handlePilihBawahan(bawahan)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                      border: 'none',
                      color: '#ffffff',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      boxShadow: '0 2px 6px rgba(2, 132, 199, 0.2)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <Calendar size={12} />
                    <span>Detail</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </>)}
      {tabAktif === 'orgchart' && (
        <>
          <style>{`
            .orgchart-radar-ring {
              position: absolute;
              inset: -4px;
              border: 2px solid #0284c7;
              border-radius: 12px;
              animation: orgchart-radar 2s ease-out infinite;
              pointer-events: none;
            }
            @keyframes orgchart-radar {
              0% { transform: scale(1); opacity: 0.8; }
              100% { transform: scale(1.5); opacity: 0; }
            }
          `}</style>

          {/* Baris judul + Expand/Ciutkan/Cari Saya */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-main)' }}>
              {orgSearchActive
                ? `Hasil: ${countOrgNodes(filteredOrgTree)} karyawan`
                : `Struktur Tim (${orgCount} karyawan)`}
            </span>
            <span style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={scrollToMe}
                disabled={!orgMeId}
                title="Buka jalur dan geser ke node Anda"
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid #bae6fd',
                  backgroundColor: '#f0f9ff',
                  color: '#0369a1',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: !orgMeId ? 'not-allowed' : 'pointer',
                  opacity: !orgMeId ? 0.5 : 1
                }}
              >
                Cari Saya
              </button>
              <button
                type="button"
                onClick={expandAllOrg}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-light)',
                  backgroundColor: '#ffffff',
                  color: '#334155',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Expand semua
              </button>
              <button
                type="button"
                onClick={collapseAllOrg}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-light)',
                  backgroundColor: '#ffffff',
                  color: '#334155',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Ciutkan
              </button>
            </span>
          </div>

          {/* Input Cari di Org Chart (dulu tidak ada) */}
          <div style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center'
          }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px' }} />
            <input
              type="text"
              placeholder="Cari nama, jabatan, atau departemen..."
              value={orgSearchQuery}
              onChange={(e) => setOrgSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 36px',
                borderRadius: '12px',
                border: '1.5px solid var(--border-light)',
                backgroundColor: '#ffffff',
                fontSize: '12px',
                color: 'var(--text-main)',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            {orgSearchQuery && (
              <button
                type="button"
                onClick={() => setOrgSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Isi tab Org Chart */}
          {orgLoading ? (
            <div style={{ padding: '40px 0', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <RefreshCw size={24} className="animate-spin" color="var(--primary-600)" />
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Memuat org chart...</span>
            </div>
          ) : orgError ? (
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
              <span style={{ fontSize: '12px', color: '#991b1b', flex: 1 }}>{orgError}</span>
              <button
                type="button"
                onClick={() => loadOrgChart()}
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
                Coba lagi
              </button>
            </div>
          ) : orgTree.length === 0 ? (
            <div style={{
              padding: '30px 20px',
              textAlign: 'center',
              backgroundColor: '#f8fafc',
              borderRadius: '16px',
              border: '1.5px dashed #cbd5e1',
              color: '#64748b'
            }}>
              <Users size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
              <p style={{ fontSize: '13px', fontWeight: '700', margin: '0 0 4px', color: '#334155' }}>
                Belum Ada Data Struktur Tim
              </p>
              <span style={{ fontSize: '11px' }}>
                Tidak ada data org chart yang bisa ditampilkan.
              </span>
            </div>
          ) : orgSearchActive && filteredOrgTree.length === 0 ? (
            <div style={{
              padding: '30px 20px',
              textAlign: 'center',
              backgroundColor: '#f8fafc',
              borderRadius: '16px',
              border: '1.5px dashed #cbd5e1',
              color: '#64748b'
            }}>
              <Search size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
              <p style={{ fontSize: '13px', fontWeight: '700', margin: '0 0 4px', color: '#334155' }}>
                Karyawan Tidak Ditemukan
              </p>
              <span style={{ fontSize: '11px' }}>
                Coba gunakan kata kunci pencarian yang lain.
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {filteredOrgTree.map((node) => (
                <OrgChartNode
                  key={node.id}
                  node={node}
                  depth={0}
                  meId={orgMeId}
                  expanded={displayExpanded}
                  onToggle={toggleOrgNode}
                  meNodeRef={meNodeRef}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
