/**
 * API Client Service untuk Mobile Absensi — ADAPTER ODOO 18
 * Terhubung ke modul BARU `ag_rest_api` di Odoo 18:
 *   {VITE_ODOO_URL}/ag_rest_api/v1/*
 *
 * Pola baru: POST JSON biasa (body = params), response
 * {"status":"success"|"error","message":...,"data":...}.
 * Auth: token Bearer (modul ag_rest_api 18.0.1.2.3, pindah penuh dari
 * session) — login via POST {API_BASE}/auth/token (db + login +
 * password) -> token; semua endpoint memakai header
 * Authorization: Bearer <token>. Cookie sesi TIDAK lagi dipakai
 * (credentials: 'omit'); token disimpan di localStorage (bukan
 * password). 401 NO_TOKEN / INVALID_TOKEN / TOKEN_EXPIRED ->
 * clearAuth (app kembali ke layar login). Direct /jsonrpc
 * execute_kw tetap tidak ada di branch ini.
 *
 * Semua target server dibaca dari .env lewat src/config.js.
 * Mode mock: VITE_USE_MOCK=true -> mock JSON lokal (src/mocks/).
 *
 * Nama fungsi & bentuk response disamakan dengan kontrak UI yang sudah ada
 * (res.success, res.pegawai, res.riwayat, dst) sehingga TIDAK ADA komponen
 * UI yang perlu diubah.
 */

// ---------------------------------------------------------------------------
// Konfigurasi — sesuaikan bila server/database berubah
// ---------------------------------------------------------------------------
import * as adapters from './apiAdapters.js';
import { ODOO_URL, ODOO_DB, API_BASE, USE_MOCK, apiUrl, photoUrl } from '../config.js';
import { getMockResponse, MOCK_USER, MOCK_EMPLOYEE } from '../mocks.js';

// Kompatibilitas: kode lama mengimpor ODOO_BASE/ODOO_DB dari modul ini.
export const ODOO_BASE = ODOO_URL;
export { ODOO_DB, ODOO_URL, API_BASE };

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
export const NAMA_HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
export const NAMA_BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/** "YYYY-MM-DD HH:MM:SS" (UTC) -> Date (WIB = UTC+7). */
export function utcToWib(dateTimeStr) {
  if (!dateTimeStr) return null;
  const m = String(dateTimeStr).match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return null;
  const utc = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0));
  return new Date(utc + 7 * 3600 * 1000);
}

export function pad2(n) { return String(n).padStart(2, '0'); }

export function fmtHM(date) {
  return date ? `${pad2(date.getHours())}:${pad2(date.getMinutes())}` : null;
}

export function fmtTanggalId(date) {
  if (!date) return null;
  return `${pad2(date.getDate())} ${NAMA_BULAN[date.getMonth()]} ${date.getFullYear()}`;
}

export function fmtHariTanggal(date) {
  if (!date) return null;
  return `${NAMA_HARI[date.getDay()]}, ${fmtTanggalId(date)}`;
}

export function fmtYMD(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

// Formatter WIB — HANYA untuk output utcToWib(). utcToWib menggeser
// epoch +7 jam sehingga komponen UTC tanggalnya = jam dinding WIB;
// getter UTC di bawah ini membacanya tanpa geseran kedua (bug +14 jam
// Okt 2026: fmtHM/fmtYMD lama memakai getter lokal sehingga di HP WIB
// hasilnya UTC + 7 (fungsi) + 7 (render lokal)). Jangan dipakai untuk
// tanggal lokal perangkat (now, getServerDate): itu tetap memakai
// fmtHM/fmtTanggalId/fmtHariTanggal/fmtYMD dengan getter lokal.
export function fmtHMWib(date) {
  return date ? `${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}` : null;
}

export function fmtYMDWib(date) {
  return date ? `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}` : null;
}

export function fmtTanggalIdWib(date) {
  if (!date) return null;
  return `${pad2(date.getUTCDate())} ${NAMA_BULAN[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

export function fmtHariTanggalWib(date) {
  if (!date) return null;
  return `${NAMA_HARI[date.getUTCDay()]}, ${fmtTanggalIdWib(date)}`;
}

/** Ambil base64 murni dari data URL "data:image/jpeg;base64,...." */
export function stripDataUrl(dataUrl) {
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
    const cfg = await odooCall('/config/public');
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
export async function odooCall(path, params = {}, { timeoutMs = 30000 } = {}) {
  // Mode mock: kembalikan mock JSON lokal tanpa network.
  if (USE_MOCK) {
    const mock = getMockResponse(path);
    if (mock) return mock;
    const err = new Error(`Mock untuk ${path} belum tersedia.`);
    err.code = 'MOCK_MISSING';
    throw err;
  }

  let json;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      // Token Bearer eksplisit (18.0.1.2.3). Penanda lama 'session'
      // dari versi app sebelumnya TIDAK dikirim sebagai Bearer —
      // server akan menjawab NO_TOKEN dan app kembali ke login
      // (pengguna wajib login ulang satu kali sesudah update app).
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };
      const tok = getToken();
      if (tok && tok !== 'session' && tok !== 'mock') {
        headers['Authorization'] = `Bearer ${tok}`;
      }
      const res = await fetch(apiUrl(path), {
        method: 'POST',
        headers,
        // Pindah penuh ke token: tidak ada lagi ketergantungan cookie.
        credentials: 'omit',
        body: JSON.stringify(params || {}),
        signal: ctrl.signal,
      });
      // Baca body sebagai teks dulu: bila server menjawab HTML (mis.
      // error validasi Odoo yang lolos tanpa amplop JSON), pesan aslinya
      // masih bisa diekstrak alih-alih hilang jadi pesan generik.
      const text = await res.text();
      try {
        json = JSON.parse(text);
      } catch {
        json = {};
      }
      // Server menjawab JSON error juga untuk status non-2xx (mis. 401).
      if (!res.ok && json.status !== 'error') {
        const stripped = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);
        json = {
          status: 'error',
          code: res.status === 401 ? 'NO_TOKEN' : 'ERROR',
          message: stripped || `Server menjawab HTTP ${res.status}.`,
        };
      }
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

  const result = json || {};
  if (result.status === 'error') {
    const err = new Error(result.message || 'Terjadi kesalahan pada server Odoo.');
    err.code = result.code || 'ERROR';
    // Token hilang / salah / kedaluwarsa -> bersihkan auth lokal agar
    // app kembali ke layar login. NO_SESSION dipertahankan untuk
    // kompatibilitas dengan server lama (pra-1.2.3) selama transisi.
    if (['NO_TOKEN', 'INVALID_TOKEN', 'TOKEN_EXPIRED', 'NO_SESSION'].includes(err.code)) {
      clearAuth();
      err.status = 401;
    }
    throw err;
  }
  return result; // {status:'success', message, data}
}

// Direct /jsonrpc execute_kw DIHAPUS di branch odoo 18.0: semua akses data
// lewat endpoint ag_rest_api (server adalah sumber kebenaran, tanpa
// kredensial tersimpan di perangkat). Fungsi ini sengaja tidak ada lagi.

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
    foto_profil: photoUrl(emp.photo, getToken()),
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
    // kode pendek pendaftaran wajah (barcode di form employee Odoo)
    face_code: emp.face_code || '',
    // policy lokasi (dari server, ag_rest_api): 'wfo' | 'anywhere'
    location_policy: emp.location_policy || 'wfo',
    // lokasi yang diizinkan (wfo): kosong = semua lokasi perusahaan
    allowed_location_ids: emp.allowed_location_ids || [],
    allowed_locations: emp.allowed_locations || [],
    // Akses WFA diturunkan dari policy (audit Bug 4: field ini tidak
    // pernah ditempel ke objek pegawai, sehingga Profil selalu tampil
    // "Wajib di Radius Kantor" dan LocationCheckPage memblokir WFA di
    // luar radius). Semua jalur (login, getMe, dashboard) memakai
    // mapPegawai ini, jadi satu tempat ini menyembuhkan semuanya.
    ijinkan_wfa: (emp.location_policy || 'wfo') === 'anywhere',
    // Ringkasan pola jadwal dari server (ag 1.2.20: jadwal_ringkasan +
    // jadwal_hari); kosong bila server belum mengirim.
    jadwal_ringkasan: emp.jadwal_ringkasan || '',
    jadwal_hari: emp.jadwal_hari || [],
    // mentah (bila UI butuh)
    _odoo_user: user || null,
    _odoo_employee: emp || null,
  };
}

// ---------------------------------------------------------------------------
// Mapper lokasi: config server (multi-lokasi, 18.0.1.2.0) -> bentuk UI.
// - locations: [{id, name, lat, lng, radius_m}] dari config/public.
// - policy wfo + allowed_location_ids terisi -> hanya lokasi itu.
// - policy wfo + allowed kosong -> SEMUA lokasi perusahaan.
// - policy anywhere -> semua lokasi (tapi ijinkan_wfa = true).
// - fallback titik legacy tunggal (office_lat/lng) -> satu lokasi 'Kantor'.
// Objek lokasi membawa kunci ganda (nama/nama_lokasi, radius_m/
// radius_meter) karena halaman lama membaca kunci yang berbeda.
// ---------------------------------------------------------------------------
function mapLocations(cfgData, employee) {
  const raw = Array.isArray(cfgData.locations) ? cfgData.locations : [];
  const policy = (employee && employee.location_policy)
    || cfgData.location_policy || 'wfo';
  const allowedIds = (employee && employee.allowed_location_ids)
    || cfgData.allowed_location_ids || [];
  let list = raw;
  if (policy === 'wfo' && allowedIds.length) {
    const picked = raw.filter((l) => allowedIds.includes(l.id));
    if (picked.length) list = picked;
  }
  const mapped = list.map((l) => ({
    id: l.id ?? null,
    latitude: l.lat,
    longitude: l.lng,
    radius_m: l.radius_m || 100,
    radius_meter: l.radius_m || 100,
    nama: l.name || 'Kantor',
    nama_lokasi: l.name || 'Kantor',
  }));
  if (!mapped.length && (cfgData.office_lat || cfgData.office_lng)) {
    mapped.push({
      id: null,
      latitude: cfgData.office_lat,
      longitude: cfgData.office_lng,
      radius_m: cfgData.office_radius_m || 100,
      radius_meter: cfgData.office_radius_m || 100,
      nama: 'Kantor',
      nama_lokasi: 'Kantor',
    });
  }
  return { list: mapped, policy };
}

// Status presensi dari shift hari itu (jam 'HH:MM' server). Tidak ada
// toleransi di server (_schedule_days hanya mengembalikan jam_masuk /
// jam_pulang), jadi deadline = jam_masuk, pulang cepat = sebelum
// jam_pulang. inD/outD adalah output utcToWib (komponen UTC-nya = jam
// dinding WIB) sehingga deadline dibangun dari komponen UTC yang sama —
// selisih +7 jam saling meniadakan. shift null (jadwal tak tersedia) ->
// null: pemanggil memakai nilai lama sebagai fallback.
function computeAttendanceStatus(inD, outD, shift) {
  if (!shift || !shift.jam_masuk || shift.jam_masuk === '-') return null;
  const res = {};
  if (inD) {
    const [h, m] = shift.jam_masuk.split(':').map(Number);
    const deadline = new Date(Date.UTC(
      inD.getUTCFullYear(), inD.getUTCMonth(), inD.getUTCDate(), h, m));
    const diff = Math.round((inD - deadline) / 60000);
    res.status_masuk = diff > 0 ? 'terlambat' : 'tepat_waktu';
    res.menit_terlambat = diff > 0 ? diff : 0;
  } else {
    res.status_masuk = null;
    res.menit_terlambat = 0;
  }
  if (outD && shift.jam_pulang && shift.jam_pulang !== '-') {
    const [h, m] = shift.jam_pulang.split(':').map(Number);
    const batas = new Date(Date.UTC(
      outD.getUTCFullYear(), outD.getUTCMonth(), outD.getUTCDate(), h, m));
    const diff = Math.round((batas - outD) / 60000);
    res.status_pulang = diff > 0 ? 'pulang_cepat' : 'normal';
    res.menit_pulang_cepat = diff > 0 ? diff : 0;
  } else {
    res.status_pulang = outD ? 'normal' : null;
    res.menit_pulang_cepat = 0;
  }
  return res;
}

/**
 * Kartu presensi hari ini (dipakai getDashboard + getDashboardLegacy).
 * Prioritas: (1) sesi TERBUKA (open_attendance) — perilaku lama;
 * (2) bila tidak ada sesi terbuka, rekaman TERTUTUP hari ini dari
 * history (kasus: sudah pulang). Tanpa (2), kartu langsung kosong
 * sesudah check-out — padahal history dari server benar — dan
 * tetap kosong sesudah logout+login, karena login hanya memuat
 * ulang getDashboard yang juga hanya membaca open_attendance.
 * "Hari ini" = tanggal WIB server (epoch server + 7 jam, dibaca
 * lewat getter UTC) supaya tidak geser di batas hari dan tidak
 * bergantung zona waktu HP.
 */
function buildAbsensiHariIni(stData, inD, shift, historyItems) {
  if (stData && stData.open_attendance && inD) {
    const inSt = computeAttendanceStatus(inD, null, shift);
    return {
      sudah_masuk: !!stData.checked_in,
      jam_masuk: fmtHMWib(inD),
      sudah_pulang: false,
      jam_pulang: null,
      status_masuk: inSt ? inSt.status_masuk : null,
      menit_terlambat: inSt ? inSt.menit_terlambat : 0,
      menit_pulang_cepat: 0,
    };
  }
  const todayWib = fmtYMDWib(new Date(getServerDate().getTime() + 7 * 3600 * 1000));
  const closedToday = (historyItems || [])
    .filter((a) => a.check_in && fmtYMDWib(utcToWib(a.check_in)) === todayWib)
    .sort((a, b) => String(b.check_in).localeCompare(String(a.check_in)))[0];
  if (closedToday) {
    const inD2 = utcToWib(closedToday.check_in);
    const outD2 = utcToWib(closedToday.check_out);
    const st2 = computeAttendanceStatus(inD2, outD2, shift);
    return {
      sudah_masuk: true,
      jam_masuk: fmtHMWib(inD2),
      sudah_pulang: !!outD2,
      jam_pulang: fmtHMWib(outD2),
      status_masuk: st2 ? st2.status_masuk : null,
      menit_terlambat: st2 ? st2.menit_terlambat : 0,
      status_pulang: st2 ? st2.status_pulang : null,
      menit_pulang_cepat: st2 ? st2.menit_pulang_cepat : 0,
    };
  }
  return {
    sudah_masuk: false,
    jam_masuk: null,
    sudah_pulang: false,
    jam_pulang: null,
    status_masuk: null,
    menit_terlambat: 0,
    menit_pulang_cepat: 0,
  };
}

function mapAttendanceItem(att, shift = null) {
  const inD = utcToWib(att.check_in);
  const outD = utcToWib(att.check_out);
  let jamKerja = null;
  if (inD && outD) {
    const menit = Math.round((outD - inD) / 60000);
    jamKerja = `${Math.floor(menit / 60)}j ${menit % 60}m`;
  }
  const st = computeAttendanceStatus(inD, outD, shift);
  return {
    id: att.id,
    tanggal: inD ? fmtYMDWib(inD) : null,
    hari_tanggal: fmtHariTanggalWib(inD),
    jam_masuk: fmtHMWib(inD),
    jam_pulang: fmtHMWib(outD),
    jam_kerja: jamKerja,
    // Bila shift tersedia, status dihitung sungguhan; bila tidak
    // (jadwal gagal dimuat), pakai nilai lama agar tampilan tidak crash
    // — tapi nilai itu BUKAN hasil hitung, jangan dibaca sebagai fakta.
    status_masuk: st ? st.status_masuk : (inD ? 'tepat_waktu' : null),
    status_pulang: st ? st.status_pulang : (outD ? 'normal' : null),
    menit_terlambat: st ? st.menit_terlambat : 0,
    menit_pulang_cepat: st ? st.menit_pulang_cepat : 0,
    jarak_masuk_meter: att.distance_in_m || 0,
    jarak_pulang_meter: att.distance_out_m || 0,
    mock_masuk: !!att.mock_in,
    mock_pulang: !!att.mock_out,
    // Foto presensi (path server ag 1.2.14; token ditempel photoUrl
    // karena <img> tidak bisa mengirim header Bearer).
    foto_masuk: att.foto_masuk ? photoUrl(att.foto_masuk, getToken()) : null,
    foto_pulang: att.foto_pulang ? photoUrl(att.foto_pulang, getToken()) : null,
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
    tanggal_mulai: lv.date_from ? fmtTanggalIdWib(utcToWib(lv.date_from)) : '',
    tanggal_selesai: lv.date_to ? fmtTanggalIdWib(utcToWib(lv.date_to)) : '',
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

// Pemetaan state Odoo -> state app untuk menu Approval.
// Server (ag 1.2.20) mengirim status_app; server lama hanya state mentah.
function mapApprovalStatus(lv, modul) {
  if (lv.status_app) return lv.status_app;
  if (modul === 'reimbursement') {
    const m = { draft: 'menunggu', reported: 'menunggu', submitted: 'menunggu',
      approved: 'disetujui', refused: 'ditolak', cancelled: 'ditolak',
      done: 'dicairkan', paid: 'dicairkan' };
    return m[lv.state] || 'menunggu';
  }
  const m = { confirm: 'menunggu', validate1: 'menunggu', validate: 'disetujui',
    refuse: 'ditolak', cancel: 'dibatalkan', draft: 'menunggu' };
  return m[lv.state] || 'menunggu';
}

// Tahap persetujuan: dari info server bila ada; dari validation_type
// bila ada (both + validate1 = tahap 2 dari 2); bila tak ada info,
// kembalikan null/null agar view menampilkan netral, bukan angka palsu.
function mapApprovalSteps(lv) {
  if (lv.step_ke && lv.total_step) {
    return { step_ke: lv.step_ke, total_step: lv.total_step };
  }
  if (lv.validation_type === 'both') {
    return lv.state === 'validate1'
      ? { step_ke: 2, total_step: 2 }
      : { step_ke: 1, total_step: 2 };
  }
  return { step_ke: null, total_step: null };
}

function mapApprovalItem(lv) {
  const modul = lv.kategori === 'dinas' ? 'dinas'
    : (lv.modul === 'reimbursement' ? 'reimbursement' : 'cuti');
  if (modul === 'reimbursement') {
    const emp = lv.employee || {};
    const status = mapApprovalStatus(lv, 'reimbursement');
    const steps = mapApprovalSteps(lv);
    return {
      id: lv.id,
      pengajuan_id: lv.pengajuan_id || lv.sheet_id || lv.id,
      modul: 'reimbursement',
      label_modul: 'Klaim Reimbursement',
      pemohon: {
        nama: emp.name || lv.employee_name || '',
        jabatan: emp.job ? (emp.job.name || emp.job[1]) : '',
        departemen: emp.department ? (emp.department.name || emp.department[1]) : '',
        nip: emp.nip || '',
        foto: emp.photo || null,
      },
      created_at: lv.submit_date ? fmtTanggalId(utcToWib(lv.submit_date)) : '',
      status,
      detail: {
        jenis_pengajuan: lv.product ? (Array.isArray(lv.product) ? lv.product[1] || lv.product[0] : lv.product) || 'Klaim Operasional' : 'Klaim Operasional',
        nominal: `Rp ${Number(lv.total_amount || 0).toLocaleString('id-ID')}`,
        nominal_raw: Number(lv.total_amount || 0),
        tanggal_kuitansi: lv.expense_date || '',
        keterangan: lv.description || '',
        dokumen_url: lv.attachment || lv.dokumen_url || null,
      },
      alur_steps: [],
      catatan_saya: lv.catatan_saya || '',
      is_current: true,
      step_ke: steps.step_ke,
      total_step: steps.total_step,
      _raw: lv,
    };
  }
  const pemohon = lv.pemohon || {};
  const status = mapApprovalStatus(lv, modul);
  const steps = mapApprovalSteps(lv);
  const tanggalMulai = lv.tanggal_mulai
    || (lv.date_from ? fmtTanggalId(utcToWib(lv.date_from)) : '');
  const tanggalSelesai = lv.tanggal_selesai
    || (lv.date_to ? fmtTanggalId(utcToWib(lv.date_to)) : '');
  return {
    id: lv.id,
    pengajuan_id: lv.id,
    modul,
    label_modul: modul === 'dinas' ? 'Dinas Luar Kota' : 'Cuti / Izin',
    pemohon: {
      nama: pemohon.nama || lv.employee_name || '',
      jabatan: pemohon.jabatan || '',
      departemen: pemohon.departemen || '',
      nip: pemohon.nip || '',
      foto: pemohon.foto || null,
    },
    created_at: lv.date_from ? fmtTanggalId(utcToWib(lv.date_from)) : '',
    status,
    detail: {
      jenis: lv.jenis || (lv.type ? lv.type.name : ''),
      tanggal_mulai: tanggalMulai,
      tanggal_selesai: tanggalSelesai,
      periode: `${tanggalMulai} s/d ${tanggalSelesai}`,
      durasi: lv.number_of_days,
      keterangan: lv.keterangan || lv.name || '',
      alasan: lv.keterangan || lv.name || '',
      kota_tujuan: lv.kota_tujuan || null,
      instansi_tujuan: lv.instansi_tujuan || null,
      anggaran_biaya: lv.anggaran_biaya || null,
    },
    alur_steps: [],
    catatan_saya: lv.catatan_saya || '',
    is_current: true,
    step_ke: steps.step_ke,
    total_step: steps.total_step,
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
    // Status baca dari server (ag 1.2.20: per user pemanggil); server
    // lama tidak mengirimnya -> default false (perilaku lama).
    is_dibaca: !!a.is_dibaca,
    is_khusus: false,
    // Server lama tidak mengirim lampiran -> false secara jujur.
    has_lampiran: !!a.has_lampiran,
    gambar_url: null,
    pembuat: 'HRD',
    // View (modal detail) membaca `konten`; mapper lama hanya mengisi
    // `isi`, sehingga isi detail selalu kosong.
    konten: body,
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
    // Angka dari server (bila dikirim). Server lama tidak mengirim angka
    // sama sekali -> tetap 0 secara jujur, bukan angka karangan.
    gaji_bersih: s.net_pay ?? s.total ?? s.net ?? 0,
    gaji_pokok: s.gross ?? s.basic ?? 0,
    _raw: s,
  };
}

function mapSlipDetail(s) {
  const lines = s.lines || [];
  // Kategori OCA payroll: BASIC (pokok), ALW (tunjangan), DED (potongan),
  // GROSS, NET. Bila server tidak mengirim kategori, fallback ke tanda
  // amount (positif = penerimaan, negatif = potongan).
  const cat = (l) => (l.category || '').toUpperCase();
  const isBasic = (l) => cat(l) === 'BASIC';
  const isAlw = (l) => cat(l) === 'ALW';
  const isDed = (l) => cat(l) === 'DED';
  const hasCat = lines.some((l) => cat(l));
  const basicLines = hasCat ? lines.filter(isBasic) : [];
  const alwLines = hasCat ? lines.filter(isAlw) : lines.filter((l) => (l.amount || 0) > 0 && !isBasic(l));
  const dedLines = hasCat
    ? lines.filter(isDed)
    : lines.filter((l) => (l.amount || 0) < 0);
  const sum = (arr) => arr.reduce((a, l) => a + Math.abs(l.amount || 0), 0);
  const gross = s.gross || 0;
  const alwTotal = sum(alwLines);
  // Perbaikan penggandaan (audit Bug 2 K7): mapper lama mengeset
  // gaji_pokok = gross DAN total_tunjangan = gross, sehingga header
  // penerimaan (pokok + tunjangan) = 2x gross. Sekarang pokok dan
  // tunjangan adalah komponen yang berbeda dan jumlahnya = gross.
  const gajiPokok = basicLines.length > 0
    ? sum(basicLines)
    : Math.max(0, gross - alwTotal);
  return {
    nomor_slip: s.name || `#${s.id}`,
    periode: s.date_from && s.date_to
      ? `${fmtTanggalId(utcToWib(s.date_from + ' 00:00:00'))} – ${fmtTanggalId(utcToWib(s.date_to + ' 00:00:00'))}`
      : '',
    gaji_pokok: gajiPokok,
    total_tunjangan: alwTotal,
    total_potongan: sum(dedLines),
    gaji_bersih: s.net_pay ?? 0,
    total_kehadiran: null,
    total_jam_lembur: null,
    total_menit_terlambat: null,
    rincian_tunjangan: alwLines.map((l) => ({ label: l.name, nominal: l.amount })),
    rincian_potongan: dedLines.map((l) => ({ label: l.name, nominal: Math.abs(l.amount) })),
    status_pembayaran: s.state_label || s.state,
    metode_pembayaran: s.currency || '',
    _raw: s,
  };
}

function mapOvertime(ot) {
  // Badge view membandingkan status huruf kecil ('disetujui'/'ditolak',
  // default "Menunggu"). Mapper lama mengirim label kapital server
  // ('Menunggu'/'Disetujui'/'Ditolak') sehingga SEMUA badge jatuh ke
  // default "Menunggu". Petakan dari state, bukan dari label.
  const stateMap = {
    confirm: 'menunggu', draft: 'menunggu',
    validate: 'disetujui', approved: 'disetujui',
    refuse: 'ditolak', refused: 'ditolak',
  };
  const status = stateMap[ot.state]
    || (ot.state ? String(ot.state).toLowerCase() : 'menunggu');
  return {
    id: ot.id,
    tanggal_lembur: ot.date ? fmtTanggalId(utcToWib(ot.date + ' 00:00:00')) : '',
    jam_mulai: null,
    jam_selesai: null,
    durasi_jam: ot.approved_hours || ot.proposed_hours || 0,
    keterangan_tugas: ot.name || '',
    status,
    approval_info: { status_label: ot.state_label || ot.state },
    total_upah_lembur_formatted: null,
    _raw: ot,
  };
}

function mapShift(sh, isToday) {
  // Bentuk baru ag_rest_api: {tanggal, hari, nama_shift, jam_masuk,
  // jam_pulang, is_hari_libur} — jam sudah string 'HH:MM'.
  if (sh && sh.jam_masuk !== undefined) {
    const d = sh.tanggal ? new Date(`${sh.tanggal}T00:00:00`) : null;
    return {
      nama_shift: sh.nama_shift || '',
      tanggal: sh.tanggal || null,
      tanggal_formatted: fmtTanggalId(d),
      hari: d ? NAMA_HARI[d.getDay()] : (sh.hari || ''),
      jam_masuk: sh.jam_masuk,
      jam_pulang: sh.jam_pulang,
      is_today: !!isToday,
      is_hari_libur: !!sh.is_hari_libur,
      _raw: sh,
      // Alias bentuk lama yang dibaca DashboardPage/JadwalView
      // (id, nama, jendela masuk/pulang). Tanpa ini halaman
      // menampilkan "undefined" + selalu "Hari Libur" (Okt 2026).
      id: sh.tanggal || null,
      nama: sh.nama_shift || '',
      jam_awal_masuk: sh.jam_masuk,
      jam_akhir_masuk: sh.jam_masuk,
      jam_awal_pulang: sh.jam_pulang,
      jam_akhir_pulang: sh.jam_pulang,
      ada_jadwal_kerja: !sh.is_hari_libur,
    };
  }
  const start = utcToWib(sh.start);
  const end = utcToWib(sh.end);
  const date = sh.date ? utcToWib(sh.date + ' 00:00:00') : start;
  return {
    nama_shift: sh.name || '',
    tanggal: sh.date || null,
    tanggal_formatted: fmtTanggalIdWib(date),
    hari: date ? NAMA_HARI[date.getUTCDay()] : '',
    jam_masuk: fmtHMWib(start),
    jam_pulang: fmtHMWib(end),
    is_today: !!isToday,
    is_hari_libur: false,
    _raw: sh,
    id: sh.date || null,
    nama: sh.name || '',
    jam_awal_masuk: fmtHMWib(start),
    jam_akhir_masuk: fmtHMWib(start),
    jam_awal_pulang: fmtHMWib(end),
    jam_akhir_pulang: fmtHMWib(end),
    ada_jadwal_kerja: true,
  };
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------
export const api = {
  // ---- Auth ----
  async login(credentials) {
    // Mode mock: tanpa network, user mock langsung disimpan.
    if (USE_MOCK) {
      const pegawai = mapPegawai(MOCK_USER, MOCK_EMPLOYEE, MOCK_EMPLOYEE);
      setToken('mock');
      setStoredUser(pegawai);
      return { success: true, token: 'mock', pegawai, message: 'Login berhasil (mode mock).' };
    }

    // 1) Token Bearer dari modul ag_rest_api (18.0.1.2.3).
    //    odooCall melempar Error berkode INVALID_CREDENTIALS bila
    //    kredensial salah (pesan server diteruskan ke UI).
    const tokRes = await odooCall('/auth/token', {
      db: ODOO_DB,
      login: credentials.login,
      password: credentials.password,
      device: getOrCreateDeviceId(),
    });
    const realToken = tokRes.data && tokRes.data.token;
    if (!realToken) {
      throw new Error('Login gagal: server tidak mengembalikan token.');
    }

    // 2) Profil dari ag_rest_api (Bearer sudah aktif).
    setToken(realToken);
    let pegawai = null;
    try {
      const prof = await odooCall('/employee/profile');
      pegawai = mapPegawai(null, null, prof.data && prof.data.employee);
    } catch {
      try {
        const me = await odooCall('/auth/me');
        pegawai = mapPegawai(me.data && me.data.user, me.data && me.data.employee, null);
      } catch {
        pegawai = mapPegawai(tokRes.data && tokRes.data.user, null, null);
      }
    }
    // Pertahankan referensi wajah lokal: server tidak pernah mengirim
    // face_descriptor kembali, jadi login fresh tidak boleh menghapusnya.
    // Tanpa ini, absen tidak akan pernah cocok sampai enroll ulang.
    // Hanya bila server masih bilang terdaftar — bila server bilang tidak
    // terdaftar (dicabut admin), descriptor lokal ikut dibuang.
    if (pegawai.is_face_registered) {
      const prevStored = getStoredUser();
      if (prevStored && prevStored.face_descriptor) {
        pegawai.face_descriptor = prevStored.face_descriptor;
      }
    }
    setStoredUser(pegawai);
    return { success: true, token: realToken, pegawai, message: 'Login berhasil.' };
  },

  async logout() {
    try {
      // Mencabut token Bearer di server (endpoint /auth/logout).
      await odooCall('/auth/logout');
    } catch {
      // token mungkin sudah tidak valid — tetap bersihkan lokal
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
    // Sama seperti login: jangan hapus referensi wajah lokal bila server
    // masih bilang terdaftar (server tidak mengirim face_descriptor).
    if (pegawai.is_face_registered) {
      const prevStored = getStoredUser();
      if (prevStored && prevStored.face_descriptor) {
        pegawai.face_descriptor = prevStored.face_descriptor;
      }
    }
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

      const shifts = d.shifts_today || [];
      const jam_kerja_hari_ini = shifts.length ? mapShift(shifts[0], true) : null;

      // Status kartu hari ini dihitung dari shift hari ini (bukan hardcode).
      // Bila sesi sudah tertutup, buildAbsensiHariIni memakai rekaman
      // tertutup hari ini dari history (lihat helper di atas).
      const absensi_hari_ini = buildAbsensiHariIni(
        stData, inD, jam_kerja_hari_ini, d.history || []
      );

      const cfgData = d.config || {};
      const { list: semua_lokasi, policy } = mapLocations(cfgData, d.employee);
      const lokasi_kantor = semua_lokasi.length ? semua_lokasi[0] : null;

      // Jadwal 7 hari ke belakang untuk status riwayat kartu (ag 1.2.14:
      // /shift/upcoming menerima start). Dibungkus safe() agar dashboard
      // tidak jatuh ke legacy bila jadwal gagal dimuat — item tanpa shift
      // memakai nilai lama sebagai fallback.
      const weekAgo = new Date(getServerDate().getTime() - 7 * 86400000);
      const schedRes = await safe(odooCall('/shift/upcoming', {
        days: 8, start: fmtYMD(weekAgo),
      }));
      const shiftMap = {};
      if (schedRes && schedRes.data && schedRes.data.items) {
        for (const s of schedRes.data.items) {
          if (s.tanggal) shiftMap[s.tanggal] = s;
        }
      }
      const riwayat_terakhir = (d.history || []).map((a) => {
        const inD0 = utcToWib(a.check_in);
        const key = inD0 ? fmtYMDWib(inD0) : null;
        return mapAttendanceItem(a, (key && shiftMap[key]) || null);
      });

      return {
        success: true,
        pegawai,
        lokasi_kantor,
        semua_lokasi,
        location_policy: policy,
        ijinkan_wfa: policy === 'anywhere',
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
      safe(odooCall('/config/public')),
    ]);

    if (srvTime && srvTime.data && srvTime.data.timestamp) {
      setServerTime(srvTime.data.timestamp * 1000);
    }

    const meData = (await safe(odooCall('/auth/me')) || {}).data || {};
    const pegawai = mapPegawai(meData.user, meData.employee, prof && prof.data && prof.data.employee);

    const stData = (st && st.data) || {};
    const openAtt = stData.open_attendance || null;
    const inD = openAtt ? utcToWib(openAtt.check_in) : null;

    const shifts = (shiftToday && shiftToday.data && shiftToday.data.items) || [];
    const jam_kerja_hari_ini = shifts.length ? mapShift(shifts[0], true) : null;

    // Riwayat 7 hari terakhir untuk kartu dashboard — dimuat di awal
    // agar bisa dipakai fallback kartu hari ini bila sesi sudah
    // tertutup (lihat buildAbsensiHariIni). Jendela yang sama dengan
    // yang dipakai seksi "Presensi Terakhir", jadi kartu dan history
    // tidak mungkin berbeda sumber.
    let riwayat_terakhir = [];
    let historyItems = [];
    try {
      const now = getServerDate(); /* B#1b: jendela riwayat kartu dashboard pakai server time */
      const from = new Date(now); from.setDate(from.getDate() - 6);
      const h = await odooCall('/attendance/history', {
        date_from: fmtYMD(from),
        date_to: fmtYMD(now),
        limit: 7,
      });
      historyItems = (h.data && h.data.items) || [];
      riwayat_terakhir = historyItems.map(mapAttendanceItem);
    } catch { /* opsional */ }

    const absensi_hari_ini = buildAbsensiHariIni(
      stData, inD, jam_kerja_hari_ini, historyItems
    );

    const cfgData = (cfg && cfg.data) || {};
    const { list: semua_lokasi, policy } = mapLocations(
      cfgData, prof && prof.data && prof.data.employee);
    const lokasi_kantor = semua_lokasi.length ? semua_lokasi[0] : null;

    return {
      success: true,
      pegawai,
      lokasi_kantor,
      semua_lokasi,
      location_policy: policy,
      ijinkan_wfa: policy === 'anywhere',
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
    // config/public sudah memuat policy + allowed ids user sesi.
    const { list: semua_lokasi, policy } = mapLocations(d, null);
    return {
      success: true,
      lokasi_kantor: semua_lokasi.length ? semua_lokasi[0] : null,
      semua_lokasi,
      location_policy: policy,
      ijinkan_wfa: policy === 'anywhere',
    };
  },

  // ---- Absensi ----
  async absen(data) {
    const tipe = data.tipe === 'pulang' ? 'pulang' : 'masuk';
    const path = tipe === 'pulang' ? '/attendance/clock-out' : '/attendance/clock-in';
    const res = await odooCall(path, {
      latitude: data.latitude || 0,
      longitude: data.longitude || 0,
      mock_detected: !!data.mock_detected,
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

  async catatIstirahat(aksi) {
    // JANGAN menelan error jadi sukses (audit Bug 2 M16): DashboardPage
    // sudah menampilkan alert di catch-nya, jadi biarkan error naik.
    const res = await odooCall('/attendance/break', { action: aksi });
    return { success: true, message: res.message || 'Waktu istirahat berhasil dicatat.' };
  },

  async getRiwayat(bulan = null, tahun = null) {
    const now = getServerDate(); /* B#1: akurat di semua zona/jam device (server time) */
    const m = bulan || now.getMonth() + 1;
    const y = tahun || now.getFullYear();
    const lastDay = new Date(y, m, 0).getDate();
    // Riwayat + jadwal bulan itu (ag 1.2.14: /shift/upcoming menerima
    // start) agar status tiap item dihitung dari shift tanggalnya,
    // bukan hardcode. Jadwal dibungkus safe(): gagal -> fallback lama.
    const [res, schedRes] = await Promise.all([
      odooCall('/attendance/history', {
        date_from: `${y}-${pad2(m)}-01`,
        date_to: `${y}-${pad2(m)}-${pad2(lastDay)}`,
        limit: 100,
      }),
      safe(odooCall('/shift/upcoming', {
        days: lastDay, start: `${y}-${pad2(m)}-01`,
      })),
    ]);
    const shiftMap = {};
    if (schedRes && schedRes.data && schedRes.data.items) {
      for (const s of schedRes.data.items) {
        if (s.tanggal) shiftMap[s.tanggal] = s;
      }
    }
    const items = (res.data && res.data.items) || [];
    return {
      success: true,
      riwayat: items.map((a) => {
        const inD0 = utcToWib(a.check_in);
        const key = inD0 ? fmtYMDWib(inD0) : null;
        return mapAttendanceItem(a, (key && shiftMap[key]) || null);
      }),
    };
  },

  // ---- Izin / Cuti ----
  async getIzin() {
    const [hist, types] = await Promise.all([
      odooCall('/timeoff/history', { limit: 50 }),
      safe(odooCall('/timeoff/types')),
    ]);
    const items = (hist.data && hist.data.items) || [];
    const typeItems = (types && types.data && types.data.items) || [];
    // Kuota yang ditampilkan = tipe tahunan bila ada, else tipe
    // requires_allocation pertama (bukan hardcode "Cuti Tahunan" dari
    // tipe sembarang). Bila server tidak mengirim saldo, sisa = null
    // agar view menampilkan netral, bukan angka fiktif.
    const withBalance = typeItems.find((t) => t.requires_allocation
      && /tahunan|annual/i.test(t.name || ''))
      || typeItems.find((t) => t.requires_allocation);
    return {
      success: true,
      kuota_cuti: withBalance
        ? { sisa: withBalance.virtual_remaining_leaves ?? null, nama: withBalance.name, tahun: new Date().getFullYear() }
        : { sisa: null, nama: '', tahun: new Date().getFullYear() },
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
      || items.find((t) => jenis.includes(t.name.toLowerCase().split(' ')[0]));
    // JANGAN fallback diam-diam ke jenis pertama: jenis yang tidak
    // dikenali harus gagal dengan pesan jelas, bukan terkirim sebagai
    // jenis yang salah.
    if (!match) throw new Error('Tipe cuti tidak tersedia di Odoo.');
    // Dokumen yang dipilih form ikut terkirim (base64). Server lama
    // mengabaikan kunci ini; server baru dapat menyimpannya sebagai
    // lampiran cuti tanpa perubahan app.
    let dokumen = null;
    let dokumenNama = null;
    const docRaw = get('dokumen');
    if (docRaw && typeof docRaw !== 'string' && docRaw.name) {
      dokumen = await adapters.fileToBase64(docRaw);
      dokumenNama = docRaw.name;
    } else if (typeof docRaw === 'string' && docRaw) {
      dokumen = docRaw;
    }
    const res = await odooCall('/timeoff/request', {
      type_id: match.id,
      date_from: get('tanggal_mulai'),
      date_to: get('tanggal_selesai'),
      reason: get('alasan') || match.name,
      ...(dokumen ? { dokumen, dokumen_nama: dokumenNama } : {}),
    });
    return { success: true, message: res.message || 'Pengajuan terkirim.', data: res.data };
  },

  // ---- Approval ----
  async getApprovalCount() {
    const res = await odooCall('/approvals/inbox', { limit: 50 });
    return { success: true, count: (res.data && res.data.count) || 0 };
  },

  async getApprovals(tab) {
    // Tab 'riwayat' memakai route history (ag 1.2.20); tab lain memakai
    // inbox. Mapper lama mengabaikan argumen tab sehingga Riwayat
    // selalu menampilkan item menunggu.
    const path = tab === 'riwayat' ? '/approvals/history' : '/approvals/inbox';
    const res = await odooCall(path, { limit: 50 });
    const items = (res.data && res.data.items) || [];
    return { success: true, data: items.map(mapApprovalItem) };
  },

  async submitApprovalAction(id, data) {
    const aksi = data && data.aksi === 'tolak' ? 'refuse' : 'approve';
    // Catatan penolakan diteruskan (server lama mengabaikannya; server
    // baru menyimpannya). Tanpa ini, alasan tolak yang diketik user
    // hilang di semua jalur.
    const res = await odooCall('/approvals/act', {
      leave_id: id,
      action: aksi,
      ...(data && data.catatan ? { catatan: data.catatan, reason: data.catatan } : {}),
    });
    return { success: true, message: res.message || 'Berhasil diproses.' };
  },

  // ---- Pengumuman ----
  async getPengumuman(filter) {
    const res = await odooCall('/announcement/list', { limit: 50, filter: filter || 'semua' });
    const allItems = ((res.data && res.data.items) || []).map(mapAnnouncement);
    // Filter benar-benar diterapkan (mapper lama mengabaikan argumen).
    let items = allItems;
    if (filter === 'belum_dibaca') items = allItems.filter((i) => !i.is_dibaca);
    else if (filter === 'penting') items = allItems.filter((i) => i.is_pinned);
    const unread = (res.data && typeof res.data.unread_count === 'number')
      ? res.data.unread_count
      : allItems.filter((i) => !i.is_dibaca).length;
    return { success: true, data: items, unread_count: unread };
  },

  async getPengumumanCount() {
    const res = await odooCall('/announcement/list', { limit: 50 });
    const items = ((res.data && res.data.items) || []).map(mapAnnouncement);
    const unread = (res.data && typeof res.data.unread_count === 'number')
      ? res.data.unread_count
      : items.filter((i) => !i.is_dibaca).length;
    const urgent = items.filter((i) => i.is_pinned && !i.is_dibaca).length;
    return { success: true, unread_count: unread, urgent_count: urgent };
  },

  async getPengumumanDetail(id) {
    const res = await odooCall('/announcement/list', { limit: 100 });
    const items = (res.data && res.data.items) || [];
    const found = items.find((a) => String(a.id) === String(id));
    if (!found) throw new Error('Pengumuman tidak ditemukan.');
    // Tandai dibaca di server (ag 1.2.20: POST /announcement/mark_read).
    // Kegagalan mark-read tidak boleh menggagalkan pembukaan detail.
    await safe(odooCall('/announcement/mark_read', { announcement_id: id }));
    return { success: true, data: { ...mapAnnouncement(found), is_dibaca: true } };
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

  async ajukanLembur(payload) {
    // Kontrak ag_rest_api: {date, notes, proposed_hours}.
    // proposed_hours dihitung dari jam_mulai/jam_selesai bila ada.
    let proposed = Number(payload.durasi_jam || payload.proposed_hours || 0);
    if (!proposed && payload.jam_mulai && payload.jam_selesai) {
      const [h1, m1] = String(payload.jam_mulai).split(':').map(Number);
      const [h2, m2] = String(payload.jam_selesai).split(':').map(Number);
      // Lembur lintas tengah malam: selesai < mulai -> tambah 24 jam
      // (mapper lama memotong jadi 0, padahal form menampilkan 4 jam).
      let diff = h2 * 60 + m2 - h1 * 60 - m1;
      if (diff < 0) diff += 24 * 60;
      proposed = diff / 60;
    }
    const res = await odooCall('/overtime/request', {
      date: payload.tanggal_lembur,
      notes: payload.keterangan_tugas,
      proposed_hours: proposed,
    });
    return { success: true, message: res.message || 'Pengajuan lembur berhasil dikirim.' };
  },

  // ---- Jadwal / Shift ----
  async getJadwal() {
    const [today, upcoming] = await Promise.all([
      safe(odooCall('/shift/today')),
      safe(odooCall('/shift/upcoming', { days: 30 })),
    ]);
    const todayItems = (today && today.data && today.data.items) || [];
    const upItems = (upcoming && upcoming.data && upcoming.data.items) || [];
    // is_roster dari data nyata, bukan hardcode true: roster = ada
    // jadwal (hari ini atau 30 hari ke depan).
    const isRoster = todayItems.length > 0 || upItems.length > 0;
    // /shift/today membuang hari libur, jadi pada hari libur shift_aktif
    // jatuh ke null dan view merender kartu mati. Cari dulu di daftar
    // upcoming tanggal hari ini (yang memuat baris libur) agar kartu
    // Day Off bisa tampil; bila tetap tidak ada, null dan view
    // menampilkan kartu netral.
    const todayWib = fmtYMDWib(new Date(getServerDate().getTime() + 7 * 3600 * 1000));
    const todayFromUpcoming = upItems.find((s) => s.tanggal === todayWib);
    return {
      success: true,
      is_roster: isRoster,
      shift_aktif: todayItems.length
        ? mapShift(todayItems[0], true)
        : (todayFromUpcoming ? mapShift(todayFromUpcoming, true) : null),
      roster_bulan_ini: upItems.map((s) => mapShift(s, false)),
      daftar_shift: [],
      hari_kerja: [],
      hari_libur: upItems.filter((s) => s.is_hari_libur).map((s) => mapShift(s, false)),
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

  // ---- Extended Features & Odoo Direct Adapters ----
  getKehadiranBawahanStatus: adapters.getKehadiranBawahanStatus,
  getKehadiranBawahanList: adapters.getKehadiranBawahanList,
  getKalenderBawahan: adapters.getKalenderBawahan,
  getTeamOrgChart: adapters.getTeamOrgChart,
  getReimbursementJenis: adapters.getReimbursementJenis,
  getReimbursement: adapters.getReimbursement,
  ajukanReimbursement: adapters.ajukanReimbursement,
  getReimbursementDetail: adapters.getReimbursementDetail,
  approveReimbursement: adapters.approveReimbursement,
  getTukarShiftCount: adapters.getTukarShiftCount,
  getTukarShiftInisiasi: adapters.getTukarShiftInisiasi,
  getTukarShiftJadwalRekan: adapters.getTukarShiftJadwalRekan,
  ajukanTukarShift: adapters.ajukanTukarShift,
  getTukarShiftRiwayat: adapters.getTukarShiftRiwayat,
  responTukarShift: adapters.responTukarShift,
  batalkanTukarShift: adapters.batalkanTukarShift,
  getDinas: adapters.getDinas,
  ajukanDinas: adapters.ajukanDinas,
  getDenda: adapters.getDenda,
  getMasalah: adapters.getMasalah,
  ajukanMasalah: adapters.ajukanMasalah,
  getMasalahDetail: adapters.getMasalahDetail,
  getPenugasan: adapters.getPenugasan,
  getPenugasanDetail: adapters.getPenugasanDetail,
  updateStatusPenugasan: adapters.updateStatusPenugasan,
  getKpiTerbaru: adapters.getKpiTerbaru,
  getDokumenPreview: adapters.getDokumenPreview,
  updateFotoProfil: adapters.updateFotoProfil,
  changePassword: adapters.changePassword,
  getDaftarKaryawan: adapters.getDaftarKaryawan,
};

export default api;