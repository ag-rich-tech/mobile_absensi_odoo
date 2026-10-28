/**
 * Konfigurasi terpusat aplikasi "Ali Attendance" (branch odoo 18.0).
 *
 * SEMUA target server dibaca dari file .env — tidak ada lagi URL Odoo
 * yang tersebar di kode (dulu: hardcoded di api.js + vite.config.js).
 *
 * Kunci .env (lihat .env.example):
 *   VITE_ODOO_URL  - base URL Odoo 18 (default https://odoo18.hiddenlab.me)
 *   VITE_ODOO_DB   - nama database Odoo (default tester)
 *   VITE_API_BASE  - prefix API modul ag_rest_api (default /ag_rest_api/v1)
 *   VITE_USE_MOCK  - 'true' = pakai mock JSON lokal tanpa network
 *
 * Perilaku dev vs produksi:
 *   - `npm run dev` (import.meta.env.DEV): fetch memakai path RELATIF
 *     sehingga vite proxy (vite.config.js) meneruskannya ke VITE_ODOO_URL
 *     dalam satu origin.
 *   - build produksi / APK: fetch memakai URL ABSOLUT VITE_ODOO_URL.
 * Auth token Bearer (modul ag_rest_api 18.0.1.2.3): token dikirim
 * eksplisit lewat header Authorization, jadi tidak ada lagi masalah
 * cookie lintas origin di WebView Capacitor dan tidak perlu reverse
 * proxy satu origin. Jangan pernah mematikan auth untuk mengatasi ini.
 */

const env = import.meta.env || {};

export const ODOO_URL = (env.VITE_ODOO_URL || 'https://odoo18.hiddenlab.me').replace(/\/$/, '');
export const ODOO_DB = env.VITE_ODOO_DB || 'tester';
export const API_BASE = env.VITE_API_BASE || '/ag_rest_api/v1';
export const USE_MOCK = String(env.VITE_USE_MOCK || '').toLowerCase() === 'true';
export const IS_DEV = !!env.DEV;

// Di dev, path relatif -> vite proxy (satu origin, cookie ikut).
// Di produksi/APK, path absolut ke VITE_ODOO_URL.
const API_ROOT = IS_DEV ? '' : ODOO_URL;

/** URL lengkap untuk satu endpoint ag_rest_api, mis. apiUrl('/attendance/status'). */
export function apiUrl(path) {
  return `${API_ROOT}${API_BASE}${path}`;
}

/** URL lengkap untuk route bawaan Odoo, mis. sessionUrl('/web/session/authenticate'). */
export function sessionUrl(path) {
  return `${API_ROOT}${path}`;
}

/**
 * URL foto profil dari path /web/image/... yang dikirim server.
 * Di dev: path relatif (ikut proxy /web).
 * Di produksi: absolut ke VITE_ODOO_URL.
 */
/**
 * URL foto profil dari path yang dikirim server.
 * Di dev: path relatif (ikut proxy).
 * Di produksi: absolut ke VITE_ODOO_URL.
 * Foto employee ag_rest_api 18.0.1.2.9: /ag_rest_api/v1/employee/photo/<id>
 * memakai token query ?token= karena tag <img> tidak bisa mengirim
 * header Authorization (Okt 2026: /web/image selalu 404 tanpa sesi).
 * Token HANYA ditempel ke path foto employee itu, bukan URL lain.
 */
export function photoUrl(path, token) {
  if (!path) return null;
  if (path.startsWith('data:') || path.startsWith('http')) return path;
  let url = IS_DEV ? path : `${ODOO_URL}${path}`;
  if (token && path.startsWith('/ag_rest_api/v1/employee/photo/')) {
    url += `?token=${encodeURIComponent(token)}`;
  }
  return url;
}

// Kompatibilitas: nama lama yang dipakai kode lama.
export const ODOO_BASE = ODOO_URL;
