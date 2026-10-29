/**
 * Adapter fitur lanjutan untuk aplikasi "Ali Attendance" (branch odoo 18.0).
 *
 * SEMUA fungsi di sini memanggil endpoint modul BARU `ag_rest_api` di Odoo 18
 * lewat odooCall (session + JSON biasa). Tidak ada lagi:
 *   - direct /jsonrpc execute_kw (dihapus total),
 *   - password/uid RPC di localStorage (dihapus total),
 *   - seed/fallback localStorage untuk tukar shift, dinas, masalah,
 *     penugasan (server adalah sumber kebenaran; gagal = error jujur),
 *   - angka statis untuk KPI/denda (dihitung/dikirim server).
 *
 * Bentuk return dipertahankan sama dengan kontrak UI lama sehingga
 * TIDAK ADA view yang perlu diubah.
 */
import {
  odooCall,
  getToken,
  getStoredUser,
  setStoredUser,
  getServerDate,
  fmtTanggalId,
  fmtYMD,
  fmtHMWib,
  fmtYMDWib,
  utcToWib,
  pad2,
  NAMA_HARI,
  stripDataUrl,
} from './api.js';
import { photoUrl } from '../config.js';

// C23: error auth TIDAK BOLEH ditelan jadi {success:false} (dashboard
// kosong sukses-palsu). Lempar ulang + beri tahu App agar kembali ke
// login. Dipanggil di awal tiap catch yang mengembalikan success:false.
function throwIfAuth(err) {
  if (err && (err.status === 401
    || ['NO_TOKEN', 'INVALID_TOKEN', 'TOKEN_EXPIRED', 'NO_SESSION'].includes(err.code))) {
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('auth-expired'));
    throw err;
  }
}

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null);
    const reader = new FileReader();
    reader.onload = () => resolve(stripDataUrl(reader.result));
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
}

// Nama login pegawai dari sesi Odoo (auth.me). Fallback 'unknown'.
function getEmployeeName() {
  try {
    const u = getStoredUser();
    const n = u && (u.name || u.login || u.display_name || '');
    return String(n || '').trim().replace(/[^\w.-]+/g, '_').replace(/^_+|_+$/g, '') || 'unknown';
  } catch {
    return 'unknown';
  }
}
// 'YYYY-MM-DD' -> 'dd.mm.yyyy'
function fmtDdmmyyyy(ymd) {
  const m = String(ymd || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : '';
}
// ekstensi dari MIME type
function extFromType(t) {
  const m = String(t || '').match(/(?:image|application)\/([a-zA-Z0-9.+-]+)/);
  if (!m) return '';
  const sub = m[1].toLowerCase();
  const map = { jpeg: 'jpg', jpg: 'jpg', png: 'png', heic: 'heic', heif: 'heif', pdf: 'pdf' };
  return map[sub] || sub;
}
// ekstensi dari nama file asli
function extFromName(name) {
  const m = String(name || '').match(/\.([a-zA-Z0-9]+)$/);
  return m ? m[1].toLowerCase() : '';
}
// ekstensi dari dataURL (data:image/jpeg;base64,...)
function extFromDataUrl(dataUrl) {
  const m = String(dataUrl || '').match(/^data:([^;]+)/);
  return m ? extFromType(m[1]) : '';
}

const KODE_STYLE = {
  H: { warna_bg: '#ecfdf5', warna_border: '#a7f3d0', warna_teks: '#047857', label: 'Hadir Tepat Waktu' },
  'H-TP': { warna_bg: '#fffbeb', warna_border: '#fde68a', warna_teks: '#b45309', label: 'Hadir Belum Pulang' },
  T: { warna_bg: '#fff7ed', warna_border: '#fed7aa', warna_teks: '#c2410c', label: 'Terlambat' },
  PA: { warna_bg: '#fef3c7', warna_border: '#fde68a', warna_teks: '#92400e', label: 'Pulang Awal' },
  'T-PA': { warna_bg: '#ffedd5', warna_border: '#fdba74', warna_teks: '#9a3412', label: 'Terlambat & Pulang Awal' },
  A: { warna_bg: '#fef2f2', warna_border: '#fecaca', warna_teks: '#b91c1c', label: 'Alpa / Tanpa Keterangan' },
  I: { warna_bg: '#eff6ff', warna_border: '#bfdbfe', warna_teks: '#1d4ed8', label: 'Izin' },
  S: { warna_bg: '#faf5ff', warna_border: '#e9d5ff', warna_teks: '#7e22ce', label: 'Sakit' },
  C: { warna_bg: '#f0fdf4', warna_border: '#bbf7d0', warna_teks: '#15803d', label: 'Cuti Tahunan' },
  D: { warna_bg: '#f0f9ff', warna_border: '#bae6fd', warna_teks: '#0369a1', label: 'Dinas Luar Kota' },
  L: { warna_bg: '#f8fafc', warna_border: '#e2e8f0', warna_teks: '#64748b', label: 'Hari Libur' },
  '-': { warna_bg: '#f8fafc', warna_border: '#e2e8f0', warna_teks: '#94a3b8', label: 'Mendatang' },
};

/** Jadwal server {tanggal, hari, nama_shift, jam_masuk, jam_pulang,
 *  is_hari_libur} -> bentuk lama view (id, tanggal_formatted, hari ID). */
function enrichSchedule(days, baseId = 100) {
  return (days || []).map((s, i) => {
    const d = s.tanggal ? new Date(`${s.tanggal}T00:00:00`) : null;
    return {
      id: baseId + i + 1,
      tanggal: s.tanggal,
      tanggal_formatted: fmtTanggalId(d),
      hari: d ? NAMA_HARI[d.getDay()] : (s.hari || ''),
      nama_shift: s.nama_shift || '',
      jam_masuk: s.jam_masuk,
      jam_pulang: s.jam_pulang,
      is_hari_libur: !!s.is_hari_libur,
    };
  });
}

function inisialDariNama(nama) {
  const parts = (nama || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length > 1) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return parts[0] ? parts[0].slice(0, 2).toUpperCase() : 'K';
}

// Helper: employee user saat ini (dari profil tersimpan / server).
export async function getCurrentEmployee() {
  const user = getStoredUser();
  if (user?._odoo_employee?.id) return user._odoo_employee;
  try {
    const prof = await odooCall('/employee/profile');
    const emp = prof.data && prof.data.employee;
    if (emp) {
      const updated = { ...(user || {}), _odoo_employee: emp };
      setStoredUser(updated);
      return emp;
    }
  } catch (e) {
    console.warn('getCurrentEmployee error:', e);
  }
  return user?._odoo_employee || null;
}

// ---------------------------------------------------------------------------
// 1. Kehadiran Bawahan (server-side: /subordinates/*)
// ---------------------------------------------------------------------------
export async function getKehadiranBawahanStatus() {
  try {
    const res = await odooCall('/subordinates/list');
    const subs = (res.data && res.data.employees) || [];
    // Server TIDAK mengirim flag is_enabled (tidak ada setting semacam
    // itu) — jangan hardcode true; view tidak lagi bercabang padanya.
    return {
      success: true,
      is_atasan: subs.length > 0,
      total_bawahan: subs.length,
    };
  } catch (err) {
    throwIfAuth(err);
    console.error('getKehadiranBawahanStatus error:', err);
    return { success: false, message: 'Gagal memuat status fitur: ' + (err?.message || String(err)) };
  }
}

export async function getKehadiranBawahanList(bulanParam) {
  try {
    const now = getServerDate();
    const [year, month] = (bulanParam || fmtYMD(now).slice(0, 7)).split('-').map(Number);
    const [subsRes, allRes] = await Promise.all([
      odooCall('/subordinates/list'),
      odooCall('/employee/list', { limit: 500 }),
    ]);
    const subs = (subsRes.data && subsRes.data.employees) || [];
    if (subs.length === 0) {
      return { success: true, data: [], message: 'Belum ada bawahan yang terdaftar.' };
    }
    const fotoById = {};
    const nipById = {};
    for (const e of (allRes.data && allRes.data.employees) || []) {
      fotoById[e.id] = e.photo;
      // NIP dari server (barcode/PIN), bukan id Odoo. /employee/list
      // mengirim barcode + pin; /subordinates/list tidak mengirim NIP.
      nipById[e.id] = e.nip || e.barcode || e.pin || '-';
    }
    // Paralel per batch (Okt 2026: loop await sekuensial membuat daftar
    // bawahan lambat — N round-trip berurutan, tiap call memindai DB
    // lewat _find_token_db. Batch 10 menjaga server tetap waras.)
    const BATCH = 10;
    const data = [];
    for (let start = 0; start < subs.length; start += BATCH) {
      const chunk = subs.slice(start, start + BATCH);
      const chunkData = await Promise.all(chunk.map(async (s) => {
        let hadir = 0;
        let izin = 0;
        let terlambat = 0;
        let tidakHadir = 0;
        let sakit = 0;
        try {
          const m = await odooCall('/subordinates/month', { employee_id: s.id, month, year });
          const st = m.data && m.data.statistik;
          const leaves = (m.data && m.data.leaves) || [];
          const att = (m.data && m.data.attendance) || [];
          // Izin & sakit dihitung PER-HARI (sama satuannya dengan
          // kalender detail): tiap cuti dipotong ke bulan tampil, lalu
          // dihitung harinya; sakit dipisah dari izin (dulu izin =
          // jumlah RECORD sehingga 1 cuti sakit 3 hari tampil Iz=1
          // sekaligus Sk=3). Dinas masuk kolom izin (daftar ini tak
          // punya kolom dinas sendiri).
          const monthStart = `${year}-${pad2(month)}-01`;
          const monthEnd = `${year}-${pad2(month)}-${new Date(year, month, 0).getDate()}`;
          let izinDays = 0;
          let sakitDays = 0;
          for (const l of leaves) {
            const f = (l.date_from || '').slice(0, 10);
            const t = (l.date_to || '').slice(0, 10);
            if (!f || !t) continue;
            const a = f < monthStart ? monthStart : f;
            const b = t > monthEnd ? monthEnd : t;
            if (b < a) continue;
            const days = Math.round((new Date(`${b}T00:00:00`) - new Date(`${a}T00:00:00`)) / 86400000) + 1;
            const tName = (l.type && l.type.name) || l.type_name || '';
            if (/sakit/i.test(tName)) sakitDays += days;
            else izinDays += days;
          }
          // Hadir fallback = hari distinct yang punya check-out (bukan
          // attendance.length — satu hari bisa punya banyak baris).
          const hadirDays = new Set(
            att.filter((x) => x.check_out).map((x) => {
              try { return fmtYMDWib(utcToWib(x.check_in)); } catch { return ''; }
            }).filter(Boolean),
          ).size;
          hadir = st ? (st.hadir || 0) : hadirDays;
          izin = izinDays;
          terlambat = st ? (st.terlambat || 0) : 0;
          tidakHadir = st ? (st.tidak_hadir || 0) : 0;
          sakit = st ? (st.sakit || 0) : sakitDays;
        } catch {
          // ringkasan boleh kosong bila bulan itu gagal dimuat
        }
        return {
          id: s.id,
          nama: s.name,
          inisial: inisialDariNama(s.name),
          nip: s.nip || nipById[s.id] || '-',
          jabatan: (typeof s.job === 'string' ? s.job : (s.job && s.job.name)) || 'Staff',
          departemen: (typeof s.department === 'string' ? s.department : (s.department && s.department.name)) || '',
          foto: photoUrl(fotoById[s.id], getToken()),
          summary: { hadir, terlambat, tidak_hadir: tidakHadir, izin, sakit },
        };
      }));
      data.push(...chunkData);
    }
    data.sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));
    return { success: true, data };
  } catch (err) {
    throwIfAuth(err);
    console.error('getKehadiranBawahanList error:', err);
    return { success: false, message: 'Gagal memuat data bawahan: ' + (err?.message || String(err)) };
  }
}

// 1b. Org Chart Tim Bawahan (server-side: /team/org-chart).
// Server sudah mengirim pohon bersarang (children rekursif) + me_id
// (employee user login); adapter hanya menormalisasi field ke bentuk
// yang dipakai view (nama/jabatan/departemen/foto/inisial) dan
// menyelesaikan URL foto. Foto memakai pola yang sama seperti daftar
// bawahan (photoUrl), avatar inisial sebagai fallback.
function normalizeOrgNode(node) {
  if (!node) return null;
  return {
    id: node.id,
    nama: node.name || 'Karyawan',
    jabatan: (typeof node.job === 'string' ? node.job : (node.job && node.job.name)) || 'Staff',
    departemen: (typeof node.department === 'string' ? node.department : (node.department && node.department.name)) || '',
    foto: photoUrl(node.photo, getToken()),
    inisial: inisialDariNama(node.name || '?'),
    children: (node.children || []).map(normalizeOrgNode).filter(Boolean),
  };
}

// Cache org chart per sesi login: kunci user+token sehingga logout
// (token hilang) otomatis menginvalidasi — user berikutnya tidak pernah
// melihat pohon user sebelumnya.
let orgChartCache = null;
export function clearOrgChartCache() { orgChartCache = null; }

export async function getTeamOrgChart() {
  try {
    const cacheKey = `${getStoredUser()?.id || ''}|${getToken() || ''}`;
    if (orgChartCache && orgChartCache.key === cacheKey) {
      return { success: true, tree: orgChartCache.tree, me_id: orgChartCache.me_id, cached: true };
    }
    const res = await odooCall('/team/org-chart');
    const tree = ((res.data && res.data.tree) || []).map(normalizeOrgNode).filter(Boolean);
    const me_id = (res.data && res.data.me_id) || null;
    orgChartCache = { key: cacheKey, tree, me_id };
    return { success: true, tree, me_id };
  } catch (err) {
    throwIfAuth(err);
    console.error('getTeamOrgChart error:', err);
    return { success: false, message: 'Gagal memuat org chart: ' + (err?.message || String(err)) };
  }
}

export async function getKalenderBawahan(bawahanId, bulanParam) {
  const now = getServerDate();
  const ym = bulanParam || fmtYMD(now).slice(0, 7);
  const [year, month] = ym.split('-').map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  const todayStr = fmtYMD(now);

  const res = await odooCall('/subordinates/month', { employee_id: Number(bawahanId), month, year });
  const d = res.data || {};
  const emp = d.employee || {};
  const bawahan = {
    id: emp.id || Number(bawahanId),
    nama: emp.name || 'Bawahan',
    // Server 1.2.20 mengirim nip = identification_id di _emp_brief.
    nip: emp.nip || emp.barcode || emp.pin || '-',
    jabatan: (emp.job && emp.job.name) || 'Staff',
    departemen: (emp.department && emp.department.name) || '',
  };

  const attMap = {};
  for (const a of d.attendance || []) {
    const inD = utcToWib(a.check_in);
    if (inD) attMap[fmtYMDWib(inD)] = a;
  }
  const leaves = d.leaves || [];

  const summary = { H: 0, H_TP: 0, T: 0, PA: 0, A: 0, I: 0, S: 0, C: 0, D: 0 };
  const kalender = [];

  for (let day = 1; day <= lastDay; day++) {
    const dateStr = `${year}-${pad2(month)}-${pad2(day)}`;
    const dObj = new Date(year, month - 1, day);
    const dayOfWeek = dObj.getDay();
    const isToday = dateStr === todayStr;
    const isFuture = dateStr > todayStr;
    const att = attMap[dateStr];

    const lv = leaves.find((l) => {
      const fStr = (l.date_from || '').slice(0, 10);
      const tStr = (l.date_to || '').slice(0, 10);
      return dateStr >= fStr && dateStr <= tStr;
    });

    let kode = 'L';
    let label = 'Hari Libur';
    let deskripsi = null;
    let detail_absensi = null;

    if (att) {
      const inD = utcToWib(att.check_in);
      const outD = utcToWib(att.check_out);
      if (outD) {
        kode = 'H';
        // Jujur: keterlambatan per tanggal TIDAK bisa dihitung app-side
        // (jadwal bawahan tak tersedia lewat API) — label netral 'Hadir',
        // bukan klaim 'Tepat Waktu' palsu.
        label = 'Hadir';
        summary.H++;
      } else {
        kode = 'H-TP';
        label = 'Hadir (Belum Pulang)';
        summary.H_TP++;
      }
      detail_absensi = {
        jam_masuk: fmtHMWib(inD),
        jam_pulang: fmtHMWib(outD),
        shift: '',
        // Status masuk/pulang per tanggal TIDAK DIKETAHUI app-side
        // (jadwal bawahan tak tersedia lewat API) — null, bukan vonis
        // 'normal'/'tepat_waktu' palsu. View menampilkan 'Jadwal tidak
        // tersedia' bila null.
        status_masuk: null,
        menit_terlambat: null,
        status_pulang: null,
        menit_pulang_cepat: null,
      };
    } else if (lv) {
      const typeName = (lv.type && lv.type.name) || '';
      if (/sakit/i.test(typeName)) {
        kode = 'S';
        label = 'Sakit';
        summary.S++;
      } else if (/dinas/i.test(typeName)) {
        kode = 'D';
        label = 'Dinas Luar Kota';
        summary.D++;
      } else if (/cuti|paid|tahunan/i.test(typeName)) {
        kode = 'C';
        label = 'Cuti Tahunan';
        summary.C++;
      } else {
        kode = 'I';
        label = 'Izin / Dispensasi';
        summary.I++;
      }
      deskripsi = lv.name || label;
    } else if (dayOfWeek === 0 || dayOfWeek === 6) {
      kode = 'L';
      label = 'Hari Libur';
    } else if (isFuture) {
      kode = '-';
      label = 'Mendatang';
    } else {
      kode = 'A';
      label = 'Alpa / Tidak Hadir';
      summary.A++;
    }

    const style = KODE_STYLE[kode] || KODE_STYLE['-'];
    kalender.push({
      tanggal: dateStr,
      hari: pad2(day),
      nama_hari: NAMA_HARI[dayOfWeek],
      is_today: isToday,
      is_future: isFuture,
      kode,
      label: style.label || label,
      warna_bg: style.warna_bg,
      warna_border: style.warna_border,
      warna_teks: style.warna_teks,
      detail_absensi,
      deskripsi,
    });
  }

  return { success: true, bawahan, summary, kalender };
}

// ---------------------------------------------------------------------------
// 2. Reimbursement (server-side: /reimbursement/*)
// ---------------------------------------------------------------------------
export async function getReimbursementJenis() {
  const res = await odooCall('/reimbursement/jenis', {});
  const items = (res.data && res.data.items) || [];
  const data = items.map((p) => ({
    id: p.id,
    kode: p.id,
    kode_jenis: p.id,
    nama: p.name,
    nama_jenis: p.name,
    // R5: ikuti data server bila ada; null = tak diketahui (gerbang
    // tidak ditegakkan), BUKAN hardcode false.
    wajib_bukti_nota: p.wajib_bukti_nota ?? p.requires_attachment ?? null,
    maksimal_klaim: null,
  }));
  return { success: true, data };
}

const REIMB_STATE_MAP = {
  draft: 'menunggu',
  reported: 'menunggu',
  submitted: 'menunggu',
  approved: 'disetujui',
  refused: 'ditolak',
  done: 'dicairkan',
  paid: 'dicairkan',
  cancelled: 'ditolak',
};

function mapReimbursementItem(r) {
  const st = REIMB_STATE_MAP[r.state] || r.state || 'menunggu';
  const labelState = st === 'disetujui' ? 'Disetujui' : (st === 'dicairkan' ? 'Dicairkan' : (st === 'ditolak' ? 'Ditolak' : 'Menunggu Approval'));
  return {
    id: r.id,
    // C1: preview nota memakai id SHEET (pengajuan_id), bukan id expense.
    pengajuan_id: r.sheet_id ?? r.pengajuan_id ?? null,
    nomor_pengajuan: r.name || `RMB-${r.id}`,
    nama_jenis: r.product || 'Klaim Operasional',
    tanggal_kuitansi: r.date || '',
    nominal: r.total_amount || 0,
    nominal_format: `Rp ${(r.total_amount || 0).toLocaleString('id-ID')}`,
    // Server menulis keterangan ke description DAN name (ag 1.2.19);
    // description kosong di data lama -> fallback ke name.
    keterangan: r.description || r.name || '',
    dokumen_terlampir: (r.attachment_count || 0) > 0 || !!r.dokumen_ada,
    dokumen_ada: !!r.dokumen_ada || (r.attachment_count || 0) > 0,
    dokumen_id: r.dokumen_id ?? r.attachment_id ?? null,
    status: st,
    approval: { step_current: 1, step_total: 1, status_label: labelState },
  };
}

export async function getReimbursement() {
  const res = await odooCall('/reimbursement/list', {});
  const rawList = (res.data && res.data.items) || [];
  const list = rawList.map(mapReimbursementItem);
  const total_diajukan = list.reduce((sum, item) => sum + (Number(item.nominal) || 0), 0);
  const total_disetujui = list
    .filter((i) => i.status === 'disetujui' || i.status === 'dicairkan')
    .reduce((sum, item) => sum + (Number(item.nominal_disetujui || item.nominal) || 0), 0);
  const menunggu_count = list.filter((i) => i.status === 'menunggu').length;
  return {
    success: true,
    data: list,
    summary: {
      total_diajukan,
      total_diajukan_format: `Rp ${total_diajukan.toLocaleString('id-ID')}`,
      total_disetujui,
      total_disetujui_format: `Rp ${total_disetujui.toLocaleString('id-ID')}`,
      menunggu_count,
    },
  };
}

export async function ajukanReimbursement(payload) {
  let jenis = null;
  let tanggal = fmtYMD(getServerDate());
  let nominal = 0;
  let keterangan = '';
  let docBase64 = null;
  let docExt = 'jpg'; // default ekstensi

  if (payload instanceof FormData) {
    const j = payload.get('reimbursement_jenis_id');
    jenis = j && !Number.isNaN(Number(j)) ? Number(j) : null;
    tanggal = payload.get('tanggal_kuitansi') || tanggal;
    nominal = parseFloat(payload.get('nominal') || 0);
    keterangan = payload.get('keterangan') || '';
    const doc = payload.get('dokumen');
    if (doc && doc.size > 0) {
      docBase64 = await fileToBase64(doc);
      docExt = extFromType(doc.type) || extFromName(doc.name) || 'jpg';
    }
  } else if (payload && typeof payload === 'object') {
    const j = payload.reimbursement_jenis_id;
    jenis = j && !Number.isNaN(Number(j)) ? Number(j) : null;
    tanggal = payload.tanggal_kuitansi || tanggal;
    nominal = parseFloat(payload.nominal || 0);
    keterangan = payload.keterangan || '';
    if (payload.dokumen instanceof File) {
      docBase64 = await fileToBase64(payload.dokumen);
      docExt = extFromType(payload.dokumen.type) || extFromName(payload.dokumen.name) || 'jpg';
    } else if (typeof payload.dokumen === 'string') {
      docBase64 = stripDataUrl(payload.dokumen);
      docExt = extFromDataUrl(payload.dokumen) || 'jpg';
    }
  }

  // Nama dokumen di Odoo: namakaryawan_reimbursement_dd.mm.yyyy.<ext>
  const empNama = getEmployeeName();
  const tglFmt = fmtDdmmyyyy(tanggal);
  const docName = `${empNama}_reimbursement_${tglFmt}.${docExt}`;

  const res = await odooCall('/reimbursement/submit', {
    description: keterangan,
    total_amount: nominal,
    total_amount_currency: nominal,
    quantity: 1,
    expense_date: tanggal,
    ...(jenis ? { product_id: jenis } : {}),
    ...(docBase64 ? { attachment: docBase64, filename: docName } : {}),
  });
  return {
    success: true,
    message: res.message || 'Pengajuan klaim reimbursement berhasil dikirim.',
    // Server melaporkan apakah lampiran benar tersimpan; view memberi
    // peringatan bila dokumen dikirim tapi attachment_saved === false.
    attachment_saved: (res.data && res.data.attachment_saved) ?? null,
  };
}

export async function approveReimbursement(sheetId, action, reason) {
  const aksi = action === 'tolak' ? 'refuse' : 'approve';
  await odooCall('/reimbursement/approve', {
    sheet_id: sheetId,
    action: aksi,
    ...(reason ? { reason } : {}),
  });
  return { success: true, message: action === 'tolak' ? 'Pengajuan reimbursement ditolak.' : 'Persetujuan klaim reimbursement berhasil diproses.' };
}

export async function getReimbursementDetail(id) {
  const res = await odooCall('/reimbursement/detail', { expense_id: id });
  const e = res.data && res.data.expense;
  if (!e) throw new Error('Pengajuan reimbursement tidak ditemukan.');
  return { success: true, data: mapReimbursementItem(e) };
}

// ---------------------------------------------------------------------------
// 3. Tukar Shift (server-side: /swap/* — tanpa store lokal lagi)
// ---------------------------------------------------------------------------
export async function getTukarShiftCount() {
  const res = await odooCall('/swap/count');
  return { success: true, count: (res.data && res.data.count) || 0 };
}

export async function getTukarShiftInisiasi() {
  const res = await odooCall('/swap/init');
  const d = res.data || {};
  return {
    success: true,
    data: {
      rekan_list: d.rekan_list || [],
      jadwal_pengaju: enrichSchedule(d.jadwal_pengaju, 100),
      pending_masuk_count: d.pending_masuk_count || 0,
    },
  };
}

export async function getTukarShiftJadwalRekan(rekanId) {
  const res = await odooCall('/swap/colleague-schedule', { colleague_id: rekanId });
  const jadwal = (res.data && res.data.jadwal) || [];
  return {
    success: true,
    data: { jadwal: enrichSchedule(jadwal, Number(rekanId) * 100) },
  };
}

export async function ajukanTukarShift(payload) {
  const res = await odooCall('/swap/submit', {
    pegawai_tujuan_id: payload.pegawai_tujuan_id,
    alasan: payload.alasan || '',
    ...(payload.tanggal_pengaju ? { tanggal_pengaju: payload.tanggal_pengaju } : {}),
    ...(payload.tanggal_tujuan ? { tanggal_tujuan: payload.tanggal_tujuan } : {}),
  });
  return { success: true, message: res.message || 'Pengajuan tukar shift berhasil dikirim ke rekan kerja!' };
}

function mapSwapItem(s) {
  // C20 (server 1.2.20 MENGIRIM tanggal): bangun kartu shift dari
  // tanggal_pengaju/tanggal_tujuan server. Placeholder lama ('Info shift
  // tidak tersedia' + 'Diajukan: null') dihapus — bila tanggal tak ada,
  // kartu shift = null dan view menyembunyikan barisnya.
  const fmtShift = (ymd) => {
    if (!ymd) return null;
    const d = new Date(`${ymd}T00:00:00`);
    const ok = !Number.isNaN(d.getTime());
    return {
      hari: ok ? NAMA_HARI[d.getDay()] : '',
      tanggal: ymd,
      tanggal_formatted: ok ? fmtTanggalId(d) : ymd,
      label: ok ? fmtTanggalId(d) : ymd,
      is_hari_libur: false,
    };
  };
  return {
    id: s.id,
    kode_pengajuan: `TS-${s.id}`,
    pengaju_id: s.pengaju_id,
    pegawai_tujuan_id: s.pegawai_tujuan_id,
    // PERHATIAN: `rekan` = colleague (lawan tukar), BUKAN pengaju.
    // Untuk kartu 'Permintaan Masuk', view menampilkan pengaju lewat
    // pengaju_id (lookup rekanList) — jangan tampilkan rekan sebagai
    // pengaju (bug lama: admin melihat namanya sendiri).
    rekan: s.rekan || { nama_lengkap: 'Rekan Kerja' },
    pengaju_nama: s.pengaju_nama || s.pengaju?.nama_lengkap || s.pengaju?.nama || null,
    status: s.status,
    status_label: s.status_label || s.status,
    alasan: s.alasan || '',
    catatan_rekan: s.catatan_rekan || null,
    tanggal_pengaju: s.tanggal_pengaju || null,
    tanggal_tujuan: s.tanggal_tujuan || null,
    shift_pengaju: fmtShift(s.tanggal_pengaju),
    shift_tujuan: fmtShift(s.tanggal_tujuan),
    // Server tidak mengirim tanggal dibuat -> null, view menyembunyikan
    // baris 'Diajukan' (bukan 'Diajukan: null').
    created_at: s.created_at || s.tanggal_diajukan || null,
  };
}

export async function getTukarShiftRiwayat() {
  const res = await odooCall('/swap/history');
  const d = res.data || {};
  return {
    success: true,
    data: {
      permintaan_masuk: (d.permintaan_masuk || []).map(mapSwapItem),
      pengajuan_saya: (d.pengajuan_saya || []).map(mapSwapItem),
      pending_masuk_count: d.pending_masuk_count || 0,
    },
  };
}

export async function responTukarShift(id, aksi, catatan) {
  const res = await odooCall('/swap/respond', { id, aksi, catatan: catatan || '' });
  return {
    success: true,
    message: res.message || `Permintaan tukar shift berhasil di${aksi === 'setuju' ? 'setujui' : 'tolak'}.`,
  };
}

export async function batalkanTukarShift(id) {
  const res = await odooCall('/swap/cancel', { id });
  return { success: true, message: res.message || 'Pengajuan tukar shift berhasil dibatalkan.' };
}

// ---------------------------------------------------------------------------
// 4. Penugasan Dinas (server-side: /dinas/*)
// ---------------------------------------------------------------------------
function fmtTanggalDariYMD(ymd) {
  if (!ymd) return '';
  const d = new Date(`${ymd}T00:00:00`);
  return Number.isNaN(d.getTime()) ? ymd : fmtTanggalId(d);
}

export async function getDinas() {
  const res = await odooCall('/dinas/list');
  const items = (res.data && res.data.items) || [];
  const list = items.map((l) => {
    // Server mengodekan name = 'kota - instansi: keperluan' lalu
    // mengirim keperluan = name LENGKAP, sehingga kartu menampilkan
    // prefix kota+instansi dua kali. Kupas prefix itu bila persis cocok.
    let keperluan = l.keperluan || 'Perjalanan Dinas';
    const prefix = `${l.kota_tujuan} - ${l.instansi_tujuan}: `;
    if (l.kota_tujuan && l.instansi_tujuan && keperluan.startsWith(prefix)) {
      keperluan = keperluan.slice(prefix.length) || keperluan;
    }
    const anggaran = l.anggaran_biaya ?? l.anggaran ?? null;
    return {
      id: l.id,
      kota_tujuan: l.kota_tujuan || 'Dinas Luar Kota',
      instansi_tujuan: l.instansi_tujuan || 'Klien / Mitra Perusahaan',
      tanggal_mulai: fmtTanggalDariYMD(l.tanggal_mulai),
      tanggal_selesai: fmtTanggalDariYMD(l.tanggal_selesai),
      anggaran_biaya: anggaran,
      anggaran_biaya_formatted: anggaran != null
        ? `Rp ${Number(anggaran).toLocaleString('id-ID')}`
        : '-',
      keperluan,
      status: l.status || 'menunggu',
      dokumen_ada: !!l.dokumen_ada,
      dokumen_id: l.dokumen_id ?? l.attachment_id ?? null,
      dokumen_url: l.dokumen_url || null,
    };
  });
  return { success: true, dinas: list };
}

export async function ajukanDinas(payload) {
  let kota = '';
  let instansi = '';
  let keperluan = '';
  let tglMulai = fmtYMD(getServerDate());
  let tglSelesai = fmtYMD(getServerDate());
  let anggaran = null;
  let dokumen = null;
  let dokumenNama = null;

  if (payload instanceof FormData) {
    kota = payload.get('kota_tujuan') || '';
    instansi = payload.get('instansi_tujuan') || '';
    keperluan = payload.get('keperluan') || '';
    tglMulai = payload.get('tanggal_mulai') || tglMulai;
    tglSelesai = payload.get('tanggal_selesai') || tglSelesai;
    const ang = payload.get('anggaran_biaya');
    anggaran = ang !== null && ang !== '' ? Number(ang) : null;
    const doc = payload.get('dokumen');
    if (doc && doc.size > 0) {
      dokumen = await fileToBase64(doc);
      dokumenNama = doc.name;
    }
  } else if (payload && typeof payload === 'object') {
    kota = payload.kota_tujuan || '';
    instansi = payload.instansi_tujuan || '';
    keperluan = payload.keperluan || '';
    tglMulai = payload.tanggal_mulai || tglMulai;
    tglSelesai = payload.tanggal_selesai || tglSelesai;
    anggaran = payload.anggaran_biaya ?? null;
    if (typeof payload.dokumen === 'string' && payload.dokumen) dokumen = payload.dokumen;
  }

  // Anggaran + dokumen yang dibuang adapter lama kini diteruskan.
  // Server lama mengabaikan kunci ini; server baru dapat menyimpannya
  // tanpa perubahan app.
  const res = await odooCall('/dinas/request', {
    kota_tujuan: kota,
    instansi_tujuan: instansi,
    keperluan,
    tanggal_mulai: tglMulai,
    tanggal_selesai: tglSelesai,
    ...(anggaran != null ? { anggaran_biaya: anggaran } : {}),
    // Server membaca `filename` DAN `dokumen_nama` (sejak 1.2.25) —
    // kirim keduanya.
    ...(dokumen ? { dokumen, filename: dokumenNama, dokumen_nama: dokumenNama } : {}),
  });
  return { success: true, message: res.message || 'Pengajuan dinas berhasil dikirim.' };
}

// ---------------------------------------------------------------------------
// 5. Denda & Tata Tertib (dari server, bukan statis)
// ---------------------------------------------------------------------------
export async function getDenda() {
  const res = await odooCall('/denda/rules');
  const d = res.data || {};
  return {
    success: true,
    aturan_denda_masuk: d.aturan_denda_masuk || [],
    aturan_denda_pulang: d.aturan_denda_pulang || [],
  };
}

// ---------------------------------------------------------------------------
// 6. Pusat Kendala & Masalah (server-side: /issue/*)
// ---------------------------------------------------------------------------
function mapIssue(m) {
  return {
    ...m,
    tanggal_kejadian_teks: m.tanggal_kejadian ? fmtTanggalDariYMD(m.tanggal_kejadian) : '',
    // View detail membaca `foto_bukti`; server mengirim `foto_bukti_id`
    // (kontrak C1 — dipakai view untuk preview) dan `foto_bukti_url`
    // sebagai fallback bila ada.
    foto_bukti: m.foto_bukti_url || m.foto_bukti || null,
    // C20: id lampiran dipakai view untuk membuka preview dokumen
    // (kontrak C1) — jangan dibuang walau url-nya null.
    foto_bukti_id: m.foto_bukti_id ?? m.attachment_id ?? null,
    foto_ada: !!m.foto_ada || !!(m.foto_bukti_id ?? m.attachment_id),
  };
}

export async function getMasalah() {
  const res = await odooCall('/issue/list');
  const items = (res.data && res.data.items) || [];
  return { success: true, masalah: items.map(mapIssue) };
}

export async function ajukanMasalah(payload) {
  let kategori = 'gagal_absen_masuk';
  let judul = '';
  let tgl = fmtYMD(getServerDate());
  let jam = '';
  let deskripsi = '';
  let fotoBukti = null;

  if (payload instanceof FormData) {
    kategori = payload.get('kategori_masalah') || kategori;
    judul = payload.get('judul') || '';
    tgl = payload.get('tanggal_kejadian') || tgl;
    jam = payload.get('jam_kejadian') || '';
    deskripsi = payload.get('deskripsi') || '';
    const file = payload.get('foto_bukti');
    if (file && file.size > 0) fotoBukti = await fileToBase64(file);
  } else if (payload && typeof payload === 'object') {
    kategori = payload.kategori_masalah || kategori;
    judul = payload.judul || '';
    tgl = payload.tanggal_kejadian || tgl;
    jam = payload.jam_kejadian || '';
    deskripsi = payload.deskripsi || '';
    if (typeof payload.foto_bukti === 'string') fotoBukti = stripDataUrl(payload.foto_bukti);
  }

  const res = await odooCall('/issue/submit', {
    judul,
    kategori_masalah: kategori,
    deskripsi,
    tanggal_kejadian: tgl,
    jam_kejadian: jam,
    ...(fotoBukti ? { foto_bukti: fotoBukti } : {}),
  });
  return { success: true, message: res.message || 'Laporan kendala absensi berhasil dikirim.', data: res.data || {} };
}

export async function getMasalahDetail(id) {
  const res = await odooCall('/issue/detail', { id });
  const item = res.data && res.data.issue;
  if (!item) throw new Error('Tiket kendala tidak ditemukan.');
  return { success: true, data: mapIssue(item) };
}

// ---------------------------------------------------------------------------
// 7. Penugasan (server-side: /task/*)
// ---------------------------------------------------------------------------
function mapPenugasanItem(i) {
  // C19: view membaca atasan.nama_lengkap, tenggat_waktu_formatted,
  // dan anggota — petakan dari kunci server (pemberi_tugas,
  // tenggat_waktu, anggota/pelaksana). Tanpa ini kartu menampilkan
  // 'Oleh: Atasan', 'Batas: ' kosong, dan '1 Pelaksana' permanen.
  return {
    ...i,
    atasan: i.atasan || { nama_lengkap: i.pemberi_tugas || '', jabatan: '' },
    pemberi_tugas: i.pemberi_tugas || '',
    tenggat_waktu_formatted: i.tenggat_waktu_formatted
      || (i.tenggat_waktu ? fmtTanggalId(new Date(`${i.tenggat_waktu}T00:00:00`)) : ''),
    anggota: i.anggota ?? i.pelaksana ?? [],
  };
}

export async function getPenugasan(opts = {}) {
  // C7: scope 'team' untuk tab 'Tugas Tim' (403 -> view sembunyikan tab).
  const res = await odooCall('/task/list', opts && opts.scope ? { scope: opts.scope } : {});
  const d = res.data || {};
  const items = (d.items || []).map(mapPenugasanItem);
  // View membaca tugas_berjalan/tugas_selesai; adapter lama hanya
  // mengembalikan `penugasan`, sehingga daftar tugas selalu kosong.
  return {
    success: true,
    penugasan: items,
    tugas_berjalan: items.filter((i) => i.status === 'berjalan' || i.status === 'menunggu_review'),
    tugas_selesai: items.filter((i) => i.status === 'selesai'),
    tugas_dibatalkan: items.filter((i) => i.status === 'dibatalkan'),
    tugas_tim: items,
    statistik: d.statistik || { total_semua: 0, total_berjalan: 0, total_selesai: 0 },
  };
}

export async function getPenugasanDetail(id) {
  const res = await odooCall('/task/detail', { id });
  const item = res.data && res.data.task;
  if (!item) throw new Error('Penugasan tidak ditemukan.');
  return { success: true, penugasan: mapPenugasanItem(item) };
}

export async function updateStatusPenugasan(id, payload) {
  const res = await odooCall('/task/update-status', {
    id,
    ...(payload?.status ? { status: payload.status } : {}),
    ...(payload?.progres != null ? { progres: payload.progres } : {}),
    // Catatan review diteruskan (server lama mengabaikannya; server
    // baru dapat menyimpannya tanpa perubahan app).
    ...(payload?.catatan ? { catatan: payload.catatan } : {}),
  });
  return { success: true, message: res.message || 'Status penugasan berhasil diperbarui.' };
}

// ---------------------------------------------------------------------------
// 8. KPI, Dokumen, Profil
// ---------------------------------------------------------------------------
export async function getKpiTerbaru() {
  const res = await odooCall('/kpi/latest');
  const d = res.data || {};
  // Server mengirim nilai_akhir (%), grade, status (teks predikat,
  // mis. 'Sangat Baik'), periode, pencapaian[]. View membaca
  // total_nilai/grade/predikat + baris status approval — petakan tanpa
  // memalsukan state approval (nilai server tidak punya state itu).
  // C14: ProfileView membaca res.data, adapter lama hanya mengirim
  // res.kpi -> kartu KPI selalu 'Belum ada penilaian'. Kirim keduanya.
  const kpi = {
    ...d,
    total_nilai: d.nilai_akhir ?? d.total_nilai ?? null,
    predikat: d.status ?? d.predikat ?? '',
    status_label: d.status ?? '',
  };
  return { success: true, kpi, data: kpi };
}

export async function getDokumenPreview(a, b) {
  // C1 (KOREKSI — menang atas brief awal): PERTAHANKAN signature
  // getDokumenPreview(modul, id) seperti yang dipakai DocumentPreviewModal
  // (modal TIDAK diubah). Adapter POST /dokumen/preview dengan body
  // {modul, id}, lalu KONVERSI respons server {filename, mimetype,
  // data_base64} menjadi bentuk yang diharapkan modal:
  // {success, data_url, nama_dokumen, is_pdf}.
  // Jalur view: cuti/dinas -> id leave; reimbursement -> id sheet
  // (pengajuan_id); masalah -> id tiket (tombol 'Lihat Foto').
  // Alternatif: getDokumenPreview(attachmentId) atau {attachmentId} ->
  // body {attachment_id} (untuk kasus langsung).
  let body;
  if (a && typeof a === 'object') {
    body = { attachment_id: a.attachmentId ?? a.dokumen_id ?? a.attachment_id ?? null };
  } else if ((typeof a === 'number' || (typeof a === 'string' && /^\d+$/.test(a))) && b == null) {
    body = { attachment_id: a };
  } else {
    body = { modul: a, id: b };
  }
  if ((!body.attachment_id && (body.modul == null || body.id == null))
    || (body.attachment_id == null && body.modul == null)) {
    return { success: false, message: 'Dokumen tidak tersedia.' };
  }
  const res = await odooCall('/dokumen/preview', body);
  const d = res.data || {};
  // Server mengembalikan data_base64; toleransi data_url bila ada.
  const dataUrl = d.data_base64
    ? `data:${d.mimetype || 'application/octet-stream'};base64,${d.data_base64}`
    : (d.data_url || null);
  if (!dataUrl) {
    return { success: false, message: 'Dokumen tidak tersedia di server.' };
  }
  return {
    success: true,
    data_url: dataUrl,
    nama_dokumen: d.filename || d.nama_dokumen || '',
    is_pdf: d.mimetype === 'application/pdf',
  };
}

export async function updateFotoProfil(formData) {
  const file = formData instanceof FormData ? formData.get('foto_profil') : null;
  if (!file) throw new Error('Tidak ada file foto yang dipilih.');
  // File 0-byte -> error eksplisit, bukan sukses palsu.
  if (file.size === 0) throw new Error('File foto kosong (0 byte). Pilih foto lain.');
  const b64 = await fileToBase64(file);
  // Kirim ke server (bukan hanya localStorage seperti dulu).
  await odooCall('/employee/photo', { photo: b64 });
  // Muat ulang foto dari server (path foto + token) — JANGAN simpan
  // base64 data-URL di localStorage (membengkak + basi).
  let foto = null;
  try {
    const prof = await odooCall('/employee/profile');
    const emp = prof && prof.data && prof.data.employee;
    if (emp && emp.photo) foto = photoUrl(emp.photo, getToken());
  } catch {
    // Profil gagal dimuat ulang: pakai foto lama (bukan base64 baru).
    foto = getStoredUser()?.foto_profil || null;
  }
  const user = getStoredUser();
  if (user && foto) {
    user.foto_profil = foto;
    setStoredUser(user);
  }
  return {
    success: true,
    foto_url: foto,
    foto_profil: foto,
    message: 'Foto profil berhasil diperbarui.',
  };
}

export async function changePassword({ password_lama, password_baru }) {
  if (!password_baru || password_baru.length < 6) {
    throw new Error('Kata sandi baru minimal 6 karakter.');
  }
  // NYATA ke server (dulu: hanya set password RPC lokal, server tak berubah).
  const res = await odooCall('/auth/change-password', {
    old_password: password_lama || '',
    new_password: password_baru,
  });
  return { success: true, message: res.message || 'Kata sandi berhasil diubah.' };
}

// ---------------------------------------------------------------------------
// 9. Employee Directory & Dynamic Calendar Shift Schedule
// ---------------------------------------------------------------------------
export async function getDaftarKaryawan() {
  try {
    const res = await odooCall('/employee/list', { limit: 100 });
    const employees = (res && res.data && res.data.employees) || [];
    const list = employees.map((e) => ({
      id: e.id,
      nama: e.name,
      inisial: inisialDariNama(e.name),
      // C13: tanpa barcode/PIN -> '-', BUKAN `#id`.
      employee_id: e.barcode || e.pin || '-',
      // Server baru kirim job/department sebagai STRING (bukan tuple).
      jabatan: (typeof e.job === 'string' ? e.job : (e.job && e.job.name)) || 'Staff',
      departemen: (typeof e.department === 'string' ? e.department : (e.department && e.department.name)) || '',
      foto: photoUrl(e.photo, getToken()),
      work_email: e.work_email || '',
      work_phone: e.work_phone || '',
      manager: e.manager,
      mobile_phone: e.mobile_phone || '',
    }));
    list.sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));
    return { success: true, data: list };
  } catch (err) {
    throwIfAuth(err);
    console.error('getDaftarKaryawan error:', err);
    return { success: false, data: [], message: err.message || 'Gagal memuat daftar karyawan' };
  }
}

export async function getJadwalKerjaOdoo() {
  const now = getServerDate();
  const jsDay = now.getDay();
  const isWeekend = jsDay === 0 || jsDay === 6;

  try {
    const res = await odooCall('/shift/today');
    const items = (res.data && res.data.items) || [];
    if (items.length > 0) {
      const s = items[0];
      const jamMasuk = s.jam_masuk;
      const jamPulang = s.jam_pulang;
      const shiftHM = (hm, deltaJam) => {
        const [h, m] = String(hm).split(':').map(Number);
        const total = Math.max(0, Math.min(23 * 60 + 59, h * 60 + m + deltaJam * 60));
        return `${pad2(Math.floor(total / 60))}:${pad2(total % 60)}`;
      };
      return {
        id: 1,
        nama: s.nama_shift || 'Reguler',
        nama_shift: s.nama_shift || 'Reguler',
        jam_masuk: jamMasuk,
        jam_pulang: jamPulang,
        jam_awal_masuk: shiftHM(jamMasuk, -1),
        jam_akhir_masuk: shiftHM(jamMasuk, 1),
        jam_awal_pulang: jamPulang,
        jam_akhir_pulang: shiftHM(jamPulang, 1),
        is_hari_libur: false,
        is_today: true,
        tanggal: fmtYMD(now),
        tanggal_formatted: fmtTanggalId(now),
        hari: NAMA_HARI[jsDay],
        toleransi_menit: 15,
      };
    }
  } catch (err) {
    throwIfAuth(err);
    console.warn('getJadwalKerjaOdoo error:', err);
  }

  return {
    id: 1,
    nama: 'Reguler',
    nama_shift: isWeekend ? 'Libur (Day Off)' : 'Reguler',
    jam_masuk: isWeekend ? '-' : '08:00',
    jam_pulang: isWeekend ? '-' : '17:00',
    jam_awal_masuk: isWeekend ? '-' : '07:00',
    jam_akhir_masuk: isWeekend ? '-' : '09:00',
    jam_awal_pulang: isWeekend ? '-' : '17:00',
    jam_akhir_pulang: isWeekend ? '-' : '18:00',
    is_hari_libur: isWeekend,
    is_today: true,
    tanggal: fmtYMD(now),
    tanggal_formatted: fmtTanggalId(now),
    hari: NAMA_HARI[jsDay],
    toleransi_menit: 15,
  };
}

export async function getCalendarScheduleDetails() {
  try {
    const res = await odooCall('/calendar/schedule');
    const d = res.data || {};
    const lines = d.daftar_shift || [];
    if (lines.length === 0) return null;

    const dayNames = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
    const activeDaysSet = new Set(lines.map((l) => Number(l.dayofweek)));
    const hari_kerja = [];
    const hari_libur = [];
    for (let i = 0; i < 7; i++) {
      if (activeDaysSet.has(i)) hari_kerja.push(dayNames[i]);
      else hari_libur.push(dayNames[i]);
    }

    const daftar_shift = [];
    for (const day of activeDaysSet) {
      const dayLines = lines.filter((l) => Number(l.dayofweek) === day);
      const minFrom = dayLines.map((l) => l.hour_from).sort()[0];
      const maxTo = dayLines.map((l) => l.hour_to).sort().slice(-1)[0];
      const shiftHM = (hm, deltaJam) => {
        const [h, m] = String(hm).split(':').map(Number);
        const total = Math.max(0, Math.min(23 * 60 + 59, h * 60 + m + deltaJam * 60));
        return `${pad2(Math.floor(total / 60))}:${pad2(total % 60)}`;
      };
      daftar_shift.push({
        id: day + 1,
        nama: `Shift ${dayNames[day]}`,
        hari: dayNames[day],
        jam_masuk: minFrom,
        jam_pulang: maxTo,
        jam_awal_masuk: shiftHM(minFrom, -1),
        jam_akhir_pulang: shiftHM(maxTo, 1),
      });
    }

    return { hari_kerja, hari_libur, daftar_shift };
  } catch (e) {
    throwIfAuth(e);
    console.warn('getCalendarScheduleDetails error:', e);
    return null;
  }
}
