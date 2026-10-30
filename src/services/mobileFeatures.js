/**
 * Fitur mobile (on/off per fitur, dikelola admin di Odoo) — KONTRAK BARU.
 *
 * Endpoint: GET {API_BASE}/mobile/features dengan Bearer token.
 * API_BASE = prefix yang sama dipakai endpoint ag lain (src/config.js:
 * apiUrl(path) = API_ROOT + API_BASE + path; di dev path relatif lewat
 * vite proxy, di produksi/APK absolut ke VITE_ODOO_URL). Header mengikuti
 * pola odooCall di src/services/api.js: Accept + Content-Type JSON,
 * Authorization: Bearer <token> (token 'session'/'mock' lama TIDAK
 * dikirim sebagai Bearer), credentials: 'omit', timeout 30 detik.
 * odooCall sendiri TIDAK dipakai di sini karena ia POST JSON dan
 * mengharapkan amplop {status, data} — kontrak endpoint ini GET dan
 * datanya LIST, jadi fetch ditulis eksplisit dengan pola yang sama.
 *
 * Respons data = LIST objek {code, name, active}. Bentuk amplop
 * diterima longgar (list mentah, {data: [...]}, atau
 * {data: {features: [...]}}) karena server paralel belum final;
 * yang dipegang teguh: hanya active === false (atau 0/'false') yang
 * mematikan fitur. Kode tak dikenal / nilai lain -> fitur TAMPIL
 * (fail-open), tidak pernah disembunyikan karena bentuk tak dikenal.
 *
 * FAIL-OPEN (kontrak): fetch gagal (jaringan, timeout, non-2xx,
 * badan bukan list, tanpa token) -> kembalikan null, BUKAN {} dan
 * BUKAN map kosong. null berarti "belum diketahui" sehingga UI
 * menampilkan SEMUA menu seperti sekarang. Kegagalan TIDAK pernah
 * melempar, TIDAK menghapus auth, dan TIDAK memicu layar login —
 * kedaluwarsa token tetap ditangani jalur dashboard (odooCall 401).
 * Mode mock (VITE_USE_MOCK=true) tidak punya server -> null juga.
 *
 * State disimpan di DashboardPage (useState, bukan hardcode, bukan
 * localStorage) dan diambil SETIAP kali dashboard dimuat — mount,
 * kembali ke Beranda, fokus kembali, dan refresh berkala — sehingga
 * toggle di Odoo langsung terasa tanpa relogin. Nilai lama TIDAK
 * dipertahankan melewati fetch gagal: gagal -> null -> semua tampil.
 */

import { apiUrl, USE_MOCK } from '../config.js';
import { getToken } from './api.js';

// Kode fitur kontrak GET /mobile/features (semua active=True default
// di server). 'shift' dan 'ticket' adalah nama kontrak; nama lama dari
// objek fitur dashboard summary ('tasks', 'helpdesk') hanya dipakai
// sebagai alias legacy di mergeMobileFeatures, bukan di UI.
export const MOBILE_FEATURE_CODES = [
  'attendance', 'history', 'leave', 'overtime', 'payslip', 'approval',
  'announcement', 'reimbursement', 'team', 'shift', 'task', 'dinas',
  'ticket',
];

// Subview DashboardPage -> kode fitur kontrak. null = selalu tampil
// (bukan fitur yang bisa dimatikan): 'home' dan 'profile' sesuai
// kontrak. 'karyawan' (Daftar Karyawan) dan 'denda' (tanpa entri UI —
// prop onOpenDenda di ProfileView tidak dirender) TIDAK punya kode
// kontrak, jadi dipetakan null: selalu tampil sampai server menambah
// kodenya (cukup tambah satu baris di peta ini + satu isOn di UI).
export const NAV_FEATURE_MAP = {
  home: null,
  profile: null,
  history: 'history',
  izin: 'leave',
  dinas: 'dinas',
  lembur: 'overtime',
  slip_gaji: 'payslip',
  masalah: 'ticket',
  tugas: 'task',
  approval: 'approval',
  pengumuman: 'announcement',
  reimbursement: 'reimbursement',
  kehadiran_bawahan: 'team',
  karyawan: null,
  jadwal: 'shift',
  denda: null,
};

/** Kode fitur kontrak untuk satu subview, atau null bila selalu tampil. */
export function navFeatureCode(nav) {
  if (!nav || !(nav in NAV_FEATURE_MAP)) return null;
  return NAV_FEATURE_MAP[nav];
}

/**
 * Apakah fitur tampil? features === null (belum dimuat / fetch gagal)
 * -> true (fail-open). Kode tak ada di map -> true. Hanya nilai false
 * eksplisit yang menyembunyikan.
 */
export function isMobileFeatureOn(features, code) {
  if (!features) return true;
  return features[code] !== false;
}

function extractFeatureList(json) {
  if (Array.isArray(json)) return json;
  if (json && Array.isArray(json.data)) return json.data;
  if (json && json.data && Array.isArray(json.data.features)) return json.data.features;
  return null;
}

function normalizeFeatureList(list) {
  const map = {};
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const code = String(item.code || '').trim().toLowerCase();
    if (!code) continue;
    // Hanya false eksplisit (boolean, 0, atau string 'false') yang
    // mematikan; active hilang / true / nilai lain -> tampil.
    const off = item.active === false || item.active === 0 || item.active === 'false';
    map[code] = !off;
  }
  return map;
}

/**
 * Ambil peta kode -> boolean dari GET /mobile/features.
 * Sukses -> map (bisa kosong bila server mengirim list kosong, yang
 * berarti semua kode tak dikenal -> semua tampil via isMobileFeatureOn).
 * Gagal apa pun -> null (fail-open). Tidak pernah melempar.
 */
export async function fetchMobileFeatures() {
  if (USE_MOCK) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30000);
  try {
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    const tok = getToken();
    if (tok && tok !== 'session' && tok !== 'mock') {
      headers.Authorization = `Bearer ${tok}`;
    }
    const res = await fetch(apiUrl('/mobile/features'), {
      method: 'GET',
      headers,
      credentials: 'omit',
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    let json;
    try {
      json = await res.json();
    } catch {
      return null;
    }
    const list = extractFeatureList(json);
    if (!list) return null;
    return normalizeFeatureList(list);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Nama lama dari objek fitur dashboard summary -> kode kontrak.
// Hanya dipakai untuk kode yang TIDAK ada di peta kontrak (saat ini
// 'karyawan'), agar perilaku lama untuk kartu itu tidak hilang diam-diam.
const LEGACY_FEATURE_ALIASES = {
  helpdesk: 'ticket',
  tasks: 'task',
};

/**
 * Gabung peta kontrak (otoritatif) dengan objek fitur legacy dari
 * dashboard summary. Dipanggil HANYA bila fetch kontrak sukses:
 * bila fetch gagal (fetched === null), kembalikan null — legacy TIDAK
 * boleh menyembunyikan menu saat jalur kontrak gagal (fail-open).
 */
export function mergeMobileFeatures(fetched, legacyFitur) {
  if (!fetched) return null;
  const merged = { ...fetched };
  if (legacyFitur && typeof legacyFitur === 'object') {
    for (const [raw, val] of Object.entries(legacyFitur)) {
      const code = LEGACY_FEATURE_ALIASES[raw] || raw;
      if (!(code in merged) && typeof val === 'boolean') {
        merged[code] = val;
      }
    }
  }
  return merged;
}
