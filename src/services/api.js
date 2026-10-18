/**
 * API Client Service untuk Mobile Absensi — ADAPTER ODOO
 * Terhubung ke modul `t_hris_mobile_api_muse` di Odoo 14:
 *   https://odoo14.hiddenlab.me/api/hris/v1/*
 *
 * Pola Odoo: JSON-RPC envelope {"jsonrpc":"2.0","method":"call","params":{...}}
 * dengan "db" WAJIB di setiap params + header Authorization: Bearer <token>.
 * Response: {"jsonrpc":"2.0","id":..,"result":{"status":"success"|"error",...}}
 *
 * Nama fungsi & bentuk response disamakan dengan kontrak UI yang sudah ada
 * (res.success, res.pegawai, res.riwayat, dst) sehingga TIDAK ADA komponen
 * UI yang perlu diubah.
 */

// ---------------------------------------------------------------------------
// Konfigurasi — sesuaikan bila server/database berubah
// ---------------------------------------------------------------------------
export const ODOO_BASE = 'https://odoo14.hiddenlab.me';
export const ODOO_DB = 'HLB';
const API_BASE = `${ODOO_BASE}/api/hris/v1`;

// ---------------------------------------------------------------------------
// Storage (localStorage; key khusus Odoo agar tidak bentrok sesi lama)
// ---------------------------------------------------------------------------
const LS_TOKEN = 'mobile_absensi_odoo_token';
const LS_USER = 'mobile_absensi_odoo_user';
const LS_DEVICE = 'mobile_absensi_odoo_device_id';

export function getToken() {
  return localStorage.getItem(LS_TOKEN) || '';
}

export function setToken(token) {
  if (token) localStorage.setItem(LS_TOKEN, token);
  else localStorage.removeItem(LS_TOKEN);
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(LS_USER);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user) {
  if (user) localStorage.setItem(LS_USER, JSON.stringify(user));
  else localStorage.removeItem(LS_USER);
}

export function clearAuth() {
  localStorage.removeItem(LS_TOKEN);
  localStorage.removeItem(LS_USER);
}

// Kompatibilitas: dulu ada API key Laravel — tidak dipakai di Odoo.
export const DEFAULT_API_KEY = '';
export function getApiKey() { return ''; }
export function setApiKey() {}

// ---------------------------------------------------------------------------
// Device helpers
// ---------------------------------------------------------------------------
export function getOrCreateDeviceId() {
  let deviceId = localStorage.getItem(LS_DEVICE);
  if (!deviceId) {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      deviceId = 'DEV-' + crypto.randomUUID().toUpperCase();
    } else {
      const randPart = Math.random().toString(36).substring(2, 10).toUpperCase();
      const timePart = Date.now().toString(36).toUpperCase();
      deviceId = `DEV-${randPart}-${timePart}`;
    }
    localStorage.setItem(LS_DEVICE, deviceId);
  }
  return deviceId;
}

export function setCustomDeviceId(deviceId) {
  localStorage.setItem(LS_DEVICE, deviceId);
}

export function getDeviceModelName() {
  if (typeof navigator === 'undefined') return 'Mobile Web Client';
  const ua = navigator.userAgent;
  if (/iPhone/i.test(ua)) return 'Apple iPhone';
  if (/iPad/i.test(ua)) return 'Apple iPad';
  if (/Android/i.test(ua)) {
    const match = ua.match(/Android.*?; ([^;)]+)(?:;|\))/);
    if (match && match[1] && !match[1].includes('K')) return match[1].trim();
    return 'Android Smartphone';
  }
  if (/Windows/i.test(ua)) return 'Windows PC Client';
  if (/Macintosh/i.test(ua)) return 'macOS Client';
  return 'Smart Mobile Client';
}

// ---------------------------------------------------------------------------
// Waktu server (offset WIB)
// ---------------------------------------------------------------------------
let serverTimeOffset = 0;

export function setServerTime(serverTimestamp) {
  if (serverTimestamp) {
    serverTimeOffset = Number(serverTimestamp) - Date.now();
  }
}

export function getServerDate() {
  return new Date(Date.now() + serverTimeOffset);
}

export function formatTime24(dateObj) {
  const d = dateObj || getServerDate();
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

// ---------------------------------------------------------------------------
// Helper tanggal/waktu (Odoo kirim UTC "YYYY-MM-DD HH:MM:SS")
// ---------------------------------------------------------------------------
const NAMA_HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const NAMA_BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/** "YYYY-MM-DD HH:MM:SS" (UTC) -> Date (WIB = UTC+7). */
function utcToWib(dateTimeStr) {
  if (!dateTimeStr) return null;
  const m = String(dateTimeStr).match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return null;
  const utc = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0));
  return new Date(utc + 7 * 3600 * 1000);
}

function pad2(n) { return String(n).padStart(2, '0'); }

function fmtHM(date) {
  return date ? `${pad2(date.getHours())}:${pad2(date.getMinutes())}` : null;
}

function fmtTanggalId(date) {
  if (!date) return null;
  return `${pad2(date.getDate())} ${NAMA_BULAN[date.getMonth()]} ${date.getFullYear()}`;
}

function fmtHariTanggal(date) {
  if (!date) return null;
  return `${NAMA_HARI[date.getDay()]}, ${fmtTanggalId(date)}`;
}

function fmtYMD(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** Ambil base64 murni dari data URL "data:image/jpeg;base64,...." */
function stripDataUrl(dataUrl) {
  if (!dataUrl) return null;
  const idx = String(dataUrl).indexOf('base64,');
  return idx >= 0 ? String(dataUrl).slice(idx + 7) : String(dataUrl);
}

/** Panggil aman: gagal -> null (untuk komposisi dashboard). */
async function safe(promise) {
  try {
    return await promise;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Feature flags (on/off per fitur, dikelola admin di Odoo)
// ---------------------------------------------------------------------------
let featureFlagsCache = null;

export async function getFeatureFlags() {
  if (featureFlagsCache) return featureFlagsCache;
  try {
    const cfg = await odooCall('/config/public', {}, { auth: false });
    featureFlagsCache = (cfg.data && cfg.data.features) || {};
  } catch {
    featureFlagsCache = {};
  }
  return featureFlagsCache;
}

export function clearFeatureFlagsCache() {
  featureFlagsCache = null;
}

// ---------------------------------------------------------------------------
// JSON-RPC caller Odoo
// ---------------------------------------------------------------------------
async function odooCall(path, params = {}, { auth = true, timeoutMs = 30000 } = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  if (auth && token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const body = {
    jsonrpc: '2.0',
    method: 'call',
    params: { db: ODOO_DB, ...params },
    id: Date.now(),
  };

  let json;
  try {
    // Timeout agar tidak hang selamanya di koneksi mati.
    // Untuk upload foto (enroll), pakai timeout pendek agar cepat fallback
    // ke mode tanpa foto bila koneksi lambat (mis. masalah fallback IPv6).
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      json = await res.json().catch(() => ({}));
    } finally {
      clearTimeout(timer);
    }
  } catch (err) {
    const isTimeout = err && err.name === 'AbortError';
    const e = new Error(
      isTimeout
        ? 'Koneksi ke server timeout. Coba lagi, atau pindah ke WiFi bila pakai data seluler IPv6.'
        : 'Gagal terhubung ke server Odoo. Periksa koneksi internet.'
    );
    e.status = 0;
    e.timeout = isTimeout;
    throw e;
  }

  const result = json.result || {};
  if (result.status === 'error') {
    const err = new Error(result.message || 'Terjadi kesalahan pada server Odoo.');
    err.code = result.code || 'ERROR';
    if (['NO_TOKEN', 'INVALID_TOKEN', 'TOKEN_EXPIRED'].includes(err.code)) {
      clearAuth();
      err.status = 401;
    }
    throw err;
  }
  return result; // {status:'success', message, data}
}

// ---------------------------------------------------------------------------
// Mapper: Odoo -> bentuk yang diharapkan UI
// ---------------------------------------------------------------------------
function mapPegawai(user, employeeBrief, profile) {
  const emp = profile || {};
  const dept = emp.department || {};
  const empName = emp.name || (employeeBrief && employeeBrief.name) || (user && user.name) || '';
  // Inisial untuk avatar: 2 huruf pertama dari nama depan & belakang
  const nameParts = empName.trim().split(/\s+/).filter(Boolean);
  const inisial = nameParts.length > 1
    ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
    : (nameParts[0] ? nameParts[0].slice(0, 2).toUpperCase() : 'P');
  return {
    id: emp.id || (employeeBrief && employeeBrief.id) || (user && user.id),
    nama: empName,
    nama_lengkap: empName,
    inisial,
    // NIP: pakai barcode / PIN karyawan dari Odoo, fallback ke ID
    nip: emp.barcode || emp.pin || (emp.id ? String(emp.id) : ''),
    email: (user && user.login) || emp.work_email || '',
    no_hp: emp.mobile_phone || emp.work_phone || '',
    jabatan: (emp.job && emp.job.name) || '',
    departemen: dept.name || '',
    divisi: dept.name || '',
    perusahaan: (emp.company && emp.company.name) || '',
    foto_profil: emp.photo || null,
    status_aktif: true,
    // profil lengkap (bila UI butuh)
    work_email: emp.work_email || '',
    work_phone: emp.work_phone || '',
    manager: (emp.manager && emp.manager.name) || '',
    coach: (emp.coach && emp.coach.name) || '',
    alamat: emp.address || null,
    tanggal_lahir: emp.birthday || null,
    gender: emp.gender || '',
    status_kawin: emp.marital || '',
    nik: emp.nik || '',
    npwp: emp.npwp || '',
    bpjs_ketenagakerjaan: emp.bpjs_ketenagakerjaan || '',
    bpjs_kesehatan: emp.bpjs_kesehatan || '',
    ptkp_status: emp.ptkp_status || '',
    pin: emp.pin || '',
    // status wajah biometrik (dari server)
    is_face_registered: !!emp.is_face_registered,
    face_enrolled_at: emp.face_enrolled_at || null,
    // mentah (bila UI butuh)
    _odoo_user: user || null,
    _odoo_employee: emp || null,
  };
}

function mapAttendanceItem(att) {
  const inD = utcToWib(att.check_in);
  const outD = utcToWib(att.check_out);
  let jamKerja = null;
  if (inD && outD) {
    const menit = Math.round((outD - inD) / 60000);
    jamKerja = `${Math.floor(menit / 60)}j ${menit % 60}m`;
  }
  return {
    id: att.id,
    tanggal: inD ? fmtYMD(inD) : null,
    hari_tanggal: fmtHariTanggal(inD),
    jam_masuk: fmtHM(inD),
    jam_pulang: fmtHM(outD),
    jam_kerja: jamKerja,
    // Odoo tidak menghitung keterlambatan tanpa acuan shift:
    // netral agar tidak menyesatkan statistik.
    status_masuk: inD ? 'tepat_waktu' : null,
    status_pulang: outD ? 'normal' : null,
    menit_terlambat: 0,
    menit_pulang_cepat: 0,
    jarak_masuk_meter: att.distance_in_m || 0,
    jarak_pulang_meter: att.distance_out_m || 0,
    mock_masuk: !!att.mock_in,
    mock_pulang: !!att.mock_out,
    _raw: att,
  };
}

function stateLabelId(state) {
  const map = {
    draft: 'Draft', confirm: 'Menunggu', validate1: 'Persetujuan 1',
    validate: 'Disetujui', refuse: 'Ditolak', cancel: 'Dibatalkan',
  };
  return map[state] || state;
}

function mapLeave(lv) {
  return {
    id: lv.id,
    jenis_izin: lv.type ? lv.type.name : '',
    label_jenis: lv.type ? lv.type.name : '',
    tanggal_mulai: lv.date_from ? fmtTanggalId(utcToWib(lv.date_from)) : '',
    tanggal_selesai: lv.date_to ? fmtTanggalId(utcToWib(lv.date_to)) : '',
    alasan: lv.name || '',
    status: lv.state,
    total_hari: lv.number_of_days,
    approval_info: { status_label: lv.state_label || stateLabelId(lv.state) },
    catatan_approval: '',
    dokumen_url: null,
    nama_dokumen: null,
    _raw: lv,
  };
}

function mapApprovalItem(lv) {
  return {
    id: lv.id,
    pengajuan_id: lv.id,
    modul: 'cuti',
    label_modul: 'Cuti / Izin',
    pemohon: lv.employee_name || '',
    created_at: lv.date_from ? fmtTanggalId(utcToWib(lv.date_from)) : '',
    status: lv.state,
    detail: {
      jenis: lv.type ? lv.type.name : '',
      periode: `${lv.date_from ? fmtTanggalId(utcToWib(lv.date_from)) : ''} s/d ${lv.date_to ? fmtTanggalId(utcToWib(lv.date_to)) : ''}`,
      durasi: lv.number_of_days,
      alasan: lv.name || '',
    },
    alur_steps: [],
    catatan_saya: '',
    is_current: true,
    step_ke: 1,
    total_step: 1,
    _raw: lv,
  };
}

function mapAnnouncement(a) {
  const body = a.body || '';
  return {
    id: a.id,
    judul: a.title || '',
    ringkasan: body.replace(/<[^>]*>/g, '').slice(0, 140),
    isi: body,
    tanggal_mulai: a.publish_date ? fmtTanggalId(utcToWib(a.publish_date + ' 00:00:00')) : '',
    created_at_human: a.publish_date ? fmtTanggalId(utcToWib(a.publish_date + ' 00:00:00')) : '',
    is_pinned: !!a.pinned,
    is_dibaca: false,
    is_khusus: false,
    has_lampiran: false,
    gambar_url: null,
    pembuat: 'HRD',
    _raw: a,
  };
}

function mapSlip(s) {
  const periode = s.date_from && s.date_to
    ? `${fmtTanggalId(utcToWib(s.date_from + ' 00:00:00'))} – ${fmtTanggalId(utcToWib(s.date_to + ' 00:00:00'))}`
    : (s.name || '');
  return {
    id: s.id,
    nomor_slip: s.name || `#${s.id}`,
    periode,
    status_pembayaran: s.state_label || s.state,
    _raw: s,
  };
}

function mapSlipDetail(s) {
  const lines = s.lines || [];
  const tunjangan = lines.filter((l) => (l.category || '').toLowerCase().includes('allow') || (l.amount || 0) > 0);
  const potongan = lines.filter((l) => (l.amount || 0) < 0);
  return {
    nomor_slip: s.name || `#${s.id}`,
    periode: s.date_from && s.date_to
      ? `${fmtTanggalId(utcToWib(s.date_from + ' 00:00:00'))} – ${fmtTanggalId(utcToWib(s.date_to + ' 00:00:00'))}`
      : '',
    gaji_pokok: s.gross || 0,
    total_tunjangan: Math.max(0, (s.gross || 0) - 0),
    total_potongan: (s.employee_deductions || 0) + (s.tax_withheld || 0),
    gaji_bersih: s.net_pay || 0,
    total_kehadiran: null,
    total_jam_lembur: null,
    total_menit_terlambat: null,
    rincian_tunjangan: tunjangan.map((l) => ({ label: l.name, nominal: l.amount })),
    rincian_potongan: potongan.map((l) => ({ label: l.name, nominal: Math.abs(l.amount) })),
    status_pembayaran: s.state_label || s.state,
    metode_pembayaran: s.currency || '',
    _raw: s,
  };
}

function mapOvertime(ot) {
  return {
    id: ot.id,
    tanggal_lembur: ot.date ? fmtTanggalId(utcToWib(ot.date + ' 00:00:00')) : '',
    jam_mulai: null,
    jam_selesai: null,
    durasi_jam: ot.approved_hours || ot.proposed_hours || 0,
    keterangan_tugas: ot.name || '',
    status: ot.state_label || ot.state,
    approval_info: { status_label: ot.state_label || ot.state },
    total_upah_lembur_formatted: null,
    _raw: ot,
  };
}

function mapShift(sh, isToday) {
  const start = utcToWib(sh.start);
  const end = utcToWib(sh.end);
  const date = sh.date ? utcToWib(sh.date + ' 00:00:00') : start;
  return {
    nama_shift: sh.name || '',
    tanggal: sh.date || null,
    tanggal_formatted: fmtTanggalId(date),
    hari: date ? NAMA_HARI[date.getDay()] : '',
    jam_masuk: fmtHM(start),
    jam_pulang: fmtHM(end),
    is_today: !!isToday,
    is_hari_libur: false,
    _raw: sh,
  };
}

function notAvailable(fitur) {
  return new Error(`Fitur "${fitur}" belum tersedia pada integrasi Odoo.`);
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------
export const api = {
  // ---- Auth ----
  async login(credentials) {
    const res = await odooCall('/auth/login', {
      login: credentials.login,
      password: credentials.password,
      device_id: credentials.device_id || getOrCreateDeviceId(),
      device_name: getDeviceModelName(),
    }, { auth: false });

    const d = res.data || {};
    if (d.token) setToken(d.token);

    let pegawai = null;
    try {
      const prof = await odooCall('/employee/profile');
      pegawai = mapPegawai(d.user, d.employee, prof.data && prof.data.employee);
    } catch {
      pegawai = mapPegawai(d.user, d.employee, null);
    }
    setStoredUser(pegawai);
    return { success: true, token: d.token, pegawai, message: res.message || 'Login berhasil.' };
  },

  async logout() {
    try {
      await odooCall('/auth/logout');
    } catch {
      // token mungkin sudah tidak valid — tetap bersihkan sesi lokal
    } finally {
      clearAuth();
    }
    return { success: true };
  },

  async getMe() {
    const [me, prof] = await Promise.all([
      odooCall('/auth/me'),
      safe(odooCall('/employee/profile')),
    ]);
    const d = me.data || {};
    const pegawai = mapPegawai(d.user, d.employee, prof && prof.data && prof.data.employee);
    setStoredUser(pegawai);
    return { success: true, pegawai };
  },

  // ---- Dashboard ----
  // v2: 1 request ke /dashboard/summary (menggantikan 7 request terpisah).
  // Fallback ke cara lama bila server belum update (endpoint tidak ada).
  async getDashboard() {
    try {
      const res = await odooCall('/dashboard/summary');
      const d = res.data || {};
      if (!d.user) throw new Error('summary kosong');

      if (d.server_time && d.server_time.timestamp) {
        setServerTime(d.server_time.timestamp * 1000);
      }

      const pegawai = mapPegawai(d.user, d.employee_brief, d.employee);
      const stData = d.attendance || {};
      const openAtt = stData.open_attendance || null;
      const inD = openAtt ? utcToWib(openAtt.check_in) : null;
      const absensi_hari_ini = {
        sudah_masuk: !!stData.checked_in,
        jam_masuk: fmtHM(inD),
        sudah_pulang: false,
        jam_pulang: null,
        menit_terlambat: 0,
        menit_pulang_cepat: 0,
      };

      const shifts = d.shifts_today || [];
      const jam_kerja_hari_ini = shifts.length ? mapShift(shifts[0], true) : null;

      const cfgData = d.config || {};
      const lokasi_kantor = (cfgData.office_lat || cfgData.office_lng)
        ? {
            latitude: cfgData.office_lat,
            longitude: cfgData.office_lng,
            radius_m: cfgData.office_radius_m || 100,
            nama: 'Kantor',
          }
        : null;

      const riwayat_terakhir = (d.history || []).map(mapAttendanceItem);

      return {
        success: true,
        pegawai,
        lokasi_kantor,
        jam_kerja_hari_ini,
        absensi_hari_ini,
        riwayat_terakhir,
        server_time: d.server_time,
        fitur: cfgData.features || {},
      };
    } catch {
      return this.getDashboardLegacy();
    }
  },

  // Cara lama: 7 request terpisah (untuk server < 14.0.9.5.0).
  async getDashboardLegacy() {
    const [st, prof, shiftToday, srvTime, cfg] = await Promise.all([
      safe(odooCall('/attendance/status')),
      safe(odooCall('/employee/profile')),
      safe(odooCall('/shift/today')),
      safe(odooCall('/server-time')),
      safe(odooCall('/config/public', {}, { auth: false })),
    ]);

    if (srvTime && srvTime.data && srvTime.data.timestamp) {
      setServerTime(srvTime.data.timestamp * 1000);
    }

    const meData = (await safe(odooCall('/auth/me')) || {}).data || {};
    const pegawai = mapPegawai(meData.user, meData.employee, prof && prof.data && prof.data.employee);

    const stData = (st && st.data) || {};
    const openAtt = stData.open_attendance || null;
    const inD = openAtt ? utcToWib(openAtt.check_in) : null;
    const absensi_hari_ini = {
      sudah_masuk: !!stData.checked_in,
      jam_masuk: fmtHM(inD),
      sudah_pulang: false,
      jam_pulang: null,
      menit_terlambat: 0,
      menit_pulang_cepat: 0,
    };

    const shifts = (shiftToday && shiftToday.data && shiftToday.data.items) || [];
    const jam_kerja_hari_ini = shifts.length ? mapShift(shifts[0], true) : null;

    const cfgData = (cfg && cfg.data) || {};
    const lokasi_kantor = (cfgData.office_lat || cfgData.office_lng)
      ? {
          latitude: cfgData.office_lat,
          longitude: cfgData.office_lng,
          radius_m: cfgData.office_radius_m || 100,
          nama: 'Kantor',
        }
      : null;

    // riwayat 7 hari terakhir untuk kartu dashboard
    let riwayat_terakhir = [];
    try {
      const now = new Date();
      const from = new Date(now); from.setDate(from.getDate() - 6);
      const h = await odooCall('/attendance/history', {
        date_from: fmtYMD(from),
        date_to: fmtYMD(now),
        limit: 7,
      });
      riwayat_terakhir = ((h.data && h.data.items) || []).map(mapAttendanceItem);
    } catch { /* opsional */ }

    return {
      success: true,
      pegawai,
      lokasi_kantor,
      jam_kerja_hari_ini,
      absensi_hari_ini,
      riwayat_terakhir,
      server_time: srvTime && srvTime.data,
      // on/off per fitur dari admin Odoo (kode -> boolean)
      fitur: cfgData.features || {},
    };
  },

  async getLokasiPresensi() {
    const cfg = await odooCall('/config/public', {}, { auth: false });
    const d = cfg.data || {};
    return {
      success: true,
      lokasi_kantor: (d.office_lat || d.office_lng)
        ? { latitude: d.office_lat, longitude: d.office_lng, radius_m: d.office_radius_m || 100, nama: 'Kantor' }
        : null,
      semua_lokasi: [],
      ijinkan_wfa: false,
    };
  },

  // ---- Absensi ----
  async absen(data) {
    const tipe = data.tipe === 'pulang' ? 'pulang' : 'masuk';
    const path = tipe === 'pulang' ? '/attendance/clock-out' : '/attendance/clock-in';
    const res = await odooCall(path, {
      latitude: data.latitude || 0,
      longitude: data.longitude || 0,
      mock_detected: false,
      device_name: getDeviceModelName(),
      face_score: data.face_similarity != null ? Number(data.face_similarity) : 0,
      photo: stripDataUrl(data.foto),
      client_uuid: getOrCreateDeviceId(),
    });
    const att = res.data && res.data.attendance;
    return {
      success: true,
      message: res.message || (tipe === 'pulang' ? 'Clock-out tercatat.' : 'Clock-in tercatat.'),
      data: att ? mapAttendanceItem(att) : null,
      warnings: (res.data && res.data.warnings) || [],
    };
  },

  async catatIstirahat() {
    throw notAvailable('Istirahat');
  },

  async getRiwayat(bulan = null, tahun = null) {
    const now = new Date();
    const m = bulan || now.getMonth() + 1;
    const y = tahun || now.getFullYear();
    const lastDay = new Date(y, m, 0).getDate();
    const res = await odooCall('/attendance/history', {
      date_from: `${y}-${pad2(m)}-01`,
      date_to: `${y}-${pad2(m)}-${pad2(lastDay)}`,
      limit: 100,
    });
    const items = (res.data && res.data.items) || [];
    return { success: true, riwayat: items.map(mapAttendanceItem) };
  },

  // ---- Izin / Cuti ----
  async getIzin() {
    const [hist, types] = await Promise.all([
      odooCall('/timeoff/history', { limit: 50 }),
      safe(odooCall('/timeoff/types')),
    ]);
    const items = (hist.data && hist.data.items) || [];
    const typeItems = (types && types.data && types.data.items) || [];
    const withBalance = typeItems.find((t) => t.requires_allocation);
    return {
      success: true,
      kuota_cuti: withBalance
        ? { sisa: withBalance.virtual_remaining_leaves || 0, nama: withBalance.name }
        : { sisa: 0, nama: '' },
      pengajuan: items.map(mapLeave),
      tipe_cuti: typeItems,
    };
  },

  async ajukanIzin(data) {
    // data: FormData {jenis_izin, tanggal_mulai, tanggal_selesai, alasan, dokumen?}
    const get = (k) => (data instanceof FormData ? data.get(k) : data[k]);
    const jenis = String(get('jenis_izin') || 'cuti').toLowerCase();
    const types = await odooCall('/timeoff/types');
    const items = (types.data && types.data.items) || [];
    const match = items.find((t) => t.name.toLowerCase().includes(jenis))
      || items.find((t) => jenis.includes(t.name.toLowerCase().split(' ')[0]))
      || items[0];
    if (!match) throw new Error('Tipe cuti tidak tersedia di Odoo.');
    const res = await odooCall('/timeoff/request', {
      type_id: match.id,
      date_from: get('tanggal_mulai'),
      date_to: get('tanggal_selesai'),
      reason: get('alasan') || match.name,
    });
    return { success: true, message: res.message || 'Pengajuan terkirim.', data: res.data };
  },

  // ---- Approval ----
  async getApprovalCount() {
    const res = await odooCall('/approvals/inbox', { limit: 50 });
    return { success: true, count: (res.data && res.data.count) || 0 };
  },

  async getApprovals() {
    const res = await odooCall('/approvals/inbox', { limit: 50 });
    const items = (res.data && res.data.items) || [];
    return { success: true, data: items.map(mapApprovalItem) };
  },

  async submitApprovalAction(id, data) {
    const aksi = data && data.aksi === 'tolak' ? 'refuse' : 'approve';
    const res = await odooCall('/approvals/act', { leave_id: id, action: aksi });
    return { success: true, message: res.message || 'Berhasil diproses.' };
  },

  // ---- Pengumuman ----
  async getPengumuman() {
    const res = await odooCall('/announcement/list', { limit: 50 });
    const items = (res.data && res.data.items) || [];
    return { success: true, data: items.map(mapAnnouncement), unread_count: items.length };
  },

  async getPengumumanCount() {
    const res = await odooCall('/announcement/list', { limit: 50 });
    const count = (res.data && res.data.count) || 0;
    return { success: true, unread_count: count, urgent_count: 0 };
  },

  async getPengumumanDetail(id) {
    const res = await odooCall('/announcement/list', { limit: 100 });
    const items = (res.data && res.data.items) || [];
    const found = items.find((a) => String(a.id) === String(id));
    if (!found) throw new Error('Pengumuman tidak ditemukan.');
    return { success: true, data: mapAnnouncement(found) };
  },

  // ---- Slip gaji ----
  async getSlipGaji() {
    const res = await odooCall('/payslip/list', { limit: 24 });
    const items = (res.data && res.data.items) || [];
    return { success: true, slip_gaji: items.map(mapSlip) };
  },

  async getSlipGajiDetail(id) {
    const res = await odooCall('/payslip/detail', { slip_id: id });
    const s = res.data && res.data.payslip;
    if (!s) throw new Error('Slip gaji tidak ditemukan.');
    return { success: true, slip: mapSlipDetail(s) };
  },

  // ---- Lembur ----
  async getLembur() {
    const res = await odooCall('/overtime/history', { limit: 50 });
    const items = (res.data && res.data.items) || [];
    return { success: true, lembur: items.map(mapOvertime) };
  },

  async ajukanLembur() {
    throw notAvailable('Pengajuan lembur');
  },

  // ---- Jadwal / Shift ----
  async getJadwal() {
    const [today, upcoming] = await Promise.all([
      safe(odooCall('/shift/today')),
      safe(odooCall('/shift/upcoming', { days: 30 })),
    ]);
    const todayItems = (today && today.data && today.data.items) || [];
    const upItems = (upcoming && upcoming.data && upcoming.data.items) || [];
    return {
      success: true,
      is_roster: true,
      shift_aktif: todayItems.length ? mapShift(todayItems[0], true) : null,
      roster_bulan_ini: upItems.map((s) => mapShift(s, false)),
      daftar_shift: [],
      hari_kerja: [],
      hari_libur: [],
    };
  },

  // ---- Wajah (pendaftaran ke Odoo; verifikasi harian tetap on-device) ----
  // Strategi tahan koneksi lambat: coba dengan foto dulu; bila gagal karena
  // jaringan (bukan error server), ulangi TANPA foto — descriptor saja
  // (1.5KB) pasti sampai, dan server memang memperlakukan foto sebagai opsional.
  async registerFace(data) {
    const payload = {
      face_descriptor: (data && data.face_descriptor) || [],
      photo: stripDataUrl(data && data.foto),
      device_name: getDeviceModelName(),
    };
    let res;
    try {
      // Timeout pendek (12 dtk): bila koneksi lambat (IPv6 fallback dll),
      // cepat gagal dan langsung coba tanpa foto (hanya 1.5KB).
      res = await odooCall('/face/enroll', payload, { timeoutMs: 12000 });
    } catch (err) {
      // Hanya ulangi tanpa foto bila ini kegagalan jaringan (status 0),
      // bukan penolakan server (mis. token invalid / descriptor invalid).
      if (err && err.status === 0 && payload.photo) {
        const retry = {
          face_descriptor: payload.face_descriptor,
          photo: null,
          device_name: payload.device_name,
        };
        res = await odooCall('/face/enroll', retry);
      } else {
        throw err;
      }
    }
    // Tandai user lokal sebagai sudah terdaftar agar banner enroll hilang
    const stored = getStoredUser();
    if (stored) {
      stored.is_face_registered = true;
      stored.face_descriptor = payload.face_descriptor;
      setStoredUser(stored);
    }
    return {
      success: true,
      message: res.message || 'Wajah terdaftar di server.',
      pegawai: getStoredUser(),
      data: res.data || {},
    };
  },

  async getFaceStatus() {
    const res = await odooCall('/face/status');
    return { success: true, ...(res.data || {}) };
  },

  // ---- Live Tracking ----
  // Kirim ping lokasi berkala saat sesi clock-in aktif.
  // Server menolak bila tidak ada sesi berjalan (NOT_CHECKED_IN) dan
  // mendup interval < tracking_min_interval_s (default 30 detik).
  async sendTrackingPing({ latitude, longitude, accuracy_m, battery_level, mock_detected }) {
    const res = await odooCall('/tracking/ping', {
      latitude,
      longitude,
      accuracy_m: accuracy_m || 0,
      battery_level: battery_level != null ? battery_level : null,
      mock_detected: !!mock_detected,
      client_uuid: getOrCreateDeviceId(),
    });
    return { success: true, ...(res.data || {}) };
  },

  // ---- Belum tersedia di modul Odoo ----
  async getDinas() { throw notAvailable('Dinas luar'); },
  async ajukanDinas() { throw notAvailable('Dinas luar'); },
  async getDenda() { throw notAvailable('Denda'); },
  async getMasalah() { throw notAvailable('Laporan masalah'); },
  async ajukanMasalah() { throw notAvailable('Laporan masalah'); },
  async getMasalahDetail() { throw notAvailable('Laporan masalah'); },
  async getPenugasan() { throw notAvailable('Penugasan'); },
  async getPenugasanDetail() { throw notAvailable('Penugasan'); },
  async updateStatusPenugasan() { throw notAvailable('Penugasan'); },
  async getKehadiranBawahanStatus() { throw notAvailable('Monitoring bawahan'); },
  async getKehadiranBawahanList() { throw notAvailable('Monitoring bawahan'); },
  async getKalenderBawahan() { throw notAvailable('Monitoring bawahan'); },
  async getKpiTerbaru() { throw notAvailable('KPI'); },
  async getTukarShiftCount() { throw notAvailable('Tukar shift'); },
  async getTukarShiftInisiasi() { throw notAvailable('Tukar shift'); },
  async getTukarShiftJadwalRekan() { throw notAvailable('Tukar shift'); },
  async ajukanTukarShift() { throw notAvailable('Tukar shift'); },
  async getTukarShiftRiwayat() { throw notAvailable('Tukar shift'); },
  async responTukarShift() { throw notAvailable('Tukar shift'); },
  async batalkanTukarShift() { throw notAvailable('Tukar shift'); },
  async getReimbursement() { throw notAvailable('Reimbursement'); },
  async getReimbursementJenis() { throw notAvailable('Reimbursement'); },
  async ajukanReimbursement() { throw notAvailable('Reimbursement'); },
  async getReimbursementDetail() { throw notAvailable('Reimbursement'); },
  async getDokumenPreview() { throw notAvailable('Preview dokumen'); },
  async updateFotoProfil() { throw notAvailable('Ubah foto profil'); },
  async changePassword() { throw notAvailable('Ubah kata sandi'); },
};

export default api;
