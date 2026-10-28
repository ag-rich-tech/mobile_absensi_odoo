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
  fmtHM,
  utcToWib,
  pad2,
  NAMA_HARI,
  stripDataUrl,
} from './api.js';
import { photoUrl } from '../config.js';

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null);
    const reader = new FileReader();
    reader.onload = () => resolve(stripDataUrl(reader.result));
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
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
    return {
      success: true,
      is_enabled: true,
      is_atasan: subs.length > 0,
      total_bawahan: subs.length,
    };
  } catch (err) {
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
    for (const e of (allRes.data && allRes.data.employees) || []) fotoById[e.id] = e.photo;
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
        try {
          const m = await odooCall('/subordinates/month', { employee_id: s.id, month, year });
          hadir = ((m.data && m.data.attendance) || []).length;
          izin = ((m.data && m.data.leaves) || []).length;
        } catch {
          // ringkasan boleh kosong bila bulan itu gagal dimuat
        }
        return {
          id: s.id,
          nama: s.name,
          inisial: inisialDariNama(s.name),
          nip: String(s.id),
          jabatan: (typeof s.job === 'string' ? s.job : (s.job && s.job.name)) || 'Staff',
          departemen: (typeof s.department === 'string' ? s.department : (s.department && s.department.name)) || '',
          foto: photoUrl(fotoById[s.id], getToken()),
          summary: { hadir, terlambat: 0, tidak_hadir: 0, izin, sakit: 0 },
        };
      }));
      data.push(...chunkData);
    }
    data.sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));
    return { success: true, data };
  } catch (err) {
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

export async function getTeamOrgChart() {
  try {
    const res = await odooCall('/team/org-chart');
    const tree = ((res.data && res.data.tree) || []).map(normalizeOrgNode).filter(Boolean);
    return { success: true, tree, me_id: (res.data && res.data.me_id) || null };
  } catch (err) {
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
    nip: String(emp.id || bawahanId),
    jabatan: (emp.job && emp.job.name) || 'Staff',
    departemen: (emp.department && emp.department.name) || '',
  };

  const attMap = {};
  for (const a of d.attendance || []) {
    const inD = utcToWib(a.check_in);
    if (inD) attMap[fmtYMD(inD)] = a;
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
        label = 'Hadir Tepat Waktu';
        summary.H++;
      } else {
        kode = 'H-TP';
        label = 'Hadir (Belum Pulang)';
        summary.H_TP++;
      }
      detail_absensi = {
        jam_masuk: fmtHM(inD),
        jam_pulang: fmtHM(outD),
        shift: 'Shift Regular',
        status_masuk: 'tepat_waktu',
        menit_terlambat: 0,
        status_pulang: outD ? 'normal' : null,
        menit_pulang_cepat: 0,
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
    wajib_bukti_nota: false,
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
    nomor_pengajuan: r.name || `RMB-${r.id}`,
    nama_jenis: r.product || 'Klaim Operasional',
    tanggal_kuitansi: r.date || '',
    nominal: r.total_amount || 0,
    nominal_format: `Rp ${(r.total_amount || 0).toLocaleString('id-ID')}`,
    nominal_disetujui: null,
    nominal_disetujui_format: null,
    keterangan: (r.description === r.name ? '' : r.description) || '',
    status: st,
    dokumen_nota_url: null,
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
  let docName = 'nota.jpg';
  const empNama = (payload?.employee_name || '').trim().replace(/\s+/g, '_') || 'unknown';
  const jenisLabel = String(payload?.jenis_label || payload?.reimbursement_jenis_id || 'operational').replace(/\s+/g, '_');
  docName = `${jenisLabel}_${empNama}_${tanggal}.jpg`;

  if (payload instanceof FormData) {
    const j = payload.get('reimbursement_jenis_id');
    jenis = j && !Number.isNaN(Number(j)) ? Number(j) : null;
    tanggal = payload.get('tanggal_kuitansi') || tanggal;
    nominal = parseFloat(payload.get('nominal') || 0);
    keterangan = payload.get('keterangan') || '';
    const doc = payload.get('dokumen');
    if (doc && doc.size > 0) docBase64 = await fileToBase64(doc);
  } else if (payload && typeof payload === 'object') {
    const j = payload.reimbursement_jenis_id;
    jenis = j && !Number.isNaN(Number(j)) ? Number(j) : null;
    tanggal = payload.tanggal_kuitansi || tanggal;
    nominal = parseFloat(payload.nominal || 0);
    keterangan = payload.keterangan || '';
    if (payload.dokumen instanceof File) {
      docBase64 = await fileToBase64(payload.dokumen);
    } else if (typeof payload.dokumen === 'string') {
      docBase64 = stripDataUrl(payload.dokumen);
    }
  }

  const res = await odooCall('/reimbursement/submit', {
    description: keterangan,
    total_amount: nominal,
    expense_date: tanggal,
    ...(jenis ? { product_id: jenis } : {}),
    ...(docBase64 ? { attachment: docBase64, filename: docName } : {}),
  });
  return { success: true, message: res.message || 'Pengajuan klaim reimbursement berhasil dikirim.' };
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
  return {
    id: s.id,
    kode_pengajuan: `TS-${s.id}`,
    pengaju_id: s.pengaju_id,
    pegawai_tujuan_id: s.pegawai_tujuan_id,
    rekan: s.rekan || { nama_lengkap: 'Rekan Kerja' },
    status: s.status,
    status_label: s.status_label || s.status,
    alasan: s.alasan || '',
    catatan_rekan: s.catatan_rekan || null,
    shift_pengaju: null,
    shift_tujuan: null,
    created_at: null,
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
  const list = items.map((l) => ({
    id: l.id,
    kota_tujuan: l.kota_tujuan || 'Dinas Luar Kota',
    instansi_tujuan: l.instansi_tujuan || 'Klien / Mitra Perusahaan',
    tanggal_mulai: fmtTanggalDariYMD(l.tanggal_mulai),
    tanggal_selesai: fmtTanggalDariYMD(l.tanggal_selesai),
    anggaran_biaya_formatted: 'Ditanggung Perusahaan',
    keperluan: l.keperluan || 'Perjalanan Dinas',
    status: l.status || 'menunggu',
    dokumen_url: l.dokumen_url || null,
  }));
  return { success: true, dinas: list };
}

export async function ajukanDinas(payload) {
  let kota = '';
  let instansi = '';
  let keperluan = '';
  let tglMulai = fmtYMD(getServerDate());
  let tglSelesai = fmtYMD(getServerDate());

  if (payload instanceof FormData) {
    kota = payload.get('kota_tujuan') || '';
    instansi = payload.get('instansi_tujuan') || '';
    keperluan = payload.get('keperluan') || '';
    tglMulai = payload.get('tanggal_mulai') || tglMulai;
    tglSelesai = payload.get('tanggal_selesai') || tglSelesai;
  } else if (payload && typeof payload === 'object') {
    kota = payload.kota_tujuan || '';
    instansi = payload.instansi_tujuan || '';
    keperluan = payload.keperluan || '';
    tglMulai = payload.tanggal_mulai || tglMulai;
    tglSelesai = payload.tanggal_selesai || tglSelesai;
  }

  const res = await odooCall('/dinas/request', {
    kota_tujuan: kota,
    instansi_tujuan: instansi,
    keperluan,
    tanggal_mulai: tglMulai,
    tanggal_selesai: tglSelesai,
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
export async function getPenugasan() {
  const res = await odooCall('/task/list');
  const d = res.data || {};
  return {
    success: true,
    penugasan: d.items || [],
    statistik: d.statistik || { total_semua: 0, total_berjalan: 0, total_selesai: 0 },
  };
}

export async function getPenugasanDetail(id) {
  const res = await odooCall('/task/detail', { id });
  const item = res.data && res.data.task;
  if (!item) throw new Error('Penugasan tidak ditemukan.');
  return { success: true, penugasan: item };
}

export async function updateStatusPenugasan(id, payload) {
  const res = await odooCall('/task/update-status', {
    id,
    ...(payload?.status ? { status: payload.status } : {}),
    ...(payload?.progres != null ? { progres: payload.progres } : {}),
  });
  return { success: true, message: res.message || 'Status penugasan berhasil diperbarui.' };
}

// ---------------------------------------------------------------------------
// 8. KPI, Dokumen, Profil
// ---------------------------------------------------------------------------
export async function getKpiTerbaru() {
  const res = await odooCall('/kpi/latest');
  return { success: true, kpi: res.data || {} };
}

export async function getDokumenPreview() {
  return {
    success: true,
    dokumen_url: null,
    message: 'Dokumen belum dilampirkan atau format pratinjau belum didukung.',
  };
}

export async function updateFotoProfil(formData) {
  let fotoUrl = null;
  const file = formData instanceof FormData ? formData.get('foto_profil') : null;
  if (file && file.size > 0) {
    const b64 = await fileToBase64(file);
    fotoUrl = `data:image/jpeg;base64,${b64}`;
    // Kirim ke server (bukan hanya localStorage seperti dulu).
    await odooCall('/employee/photo', { photo: b64 });
    const user = getStoredUser();
    if (user) {
      user.foto_profil = fotoUrl;
      setStoredUser(user);
    }
  }
  return { success: true, foto_url: fotoUrl, message: 'Foto profil berhasil diperbarui.' };
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
      employee_id: e.barcode || e.pin || `#${e.id}`,
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
    console.warn('getCalendarScheduleDetails error:', e);
    return null;
  }
}
