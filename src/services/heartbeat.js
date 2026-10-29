import { registerPlugin, Capacitor } from '@capacitor/core';
import { getToken, getOrCreateDeviceId } from './api.js';
import { ODOO_URL, API_BASE } from '../config.js';

// ---------------------------------------------------------------------------
// Heartbeat live tracking tahap 2 (Android saja, aditif).
//
// Masalah yang dipecahkan: watcher background (backgroundTracking.js)
// BERBASIS JARAK — callback hanya datang bila perangkat berpindah
// >= 100 m. Karyawan yang diam di office seharian tidak pernah
// tercapture walau service-nya hidup. Heartbeat ini memakai alarm
// native (AlarmManager) yang berbunyi TIAP JAM walau diam, di luar
// WebView, sehingga tetap jalan saat app diminimize / di-swipe.
//
// Plugin native lokal "Heartbeat" didaftarkan by-name (pola sama seperti
// backgroundTracking.js): registerPlugin hanya membuat proxy malas,
// error baru muncul saat method dipanggil dan itu ditangkap di bawah,
// sehingga gagal mulai heartbeat TIDAK PERNAH menghentikan ping
// foreground / watcher jarak yang sudah ada.
//
// Kontrak plugin (android/.../HeartbeatPlugin.java):
//   start({ token, baseUrl, intervalMs, clientUuid })
//     -> { started, active, intervalMs, nextFireAtMs }
//   stop() -> { started: false, active: false }
//   status() -> { active, intervalMs, nextFireAtMs }
//
// - baseUrl: root API produksi (ODOO_URL + API_BASE); native menambah
//   "/tracking/ping" sendiri. Token + clientUuid dikirim dari JS karena
//   native TIDAK bisa membaca localStorage WebView.
// - Payload native adalah replika persis jalur JS (endpoint, header
//   Bearer, field latitude/longitude/accuracy_m/battery_level/
//   mock_detected/client_uuid). Server memberi stempel waktu sendiri,
//   jadi tidak ada field waktu yang bisa salah zona.
// - Alarm bersifat one-shot + dijadwalkan ulang tiap bunyi; server yang
//   menjawab 401 / NOT_CHECKED_IN menghentikan rantai (token mati /
//   sesi berakhir) dan app memulai ulang saat clock-in berikutnya.
// - Heartbeat TIDAK menggantikan timer foreground 1 jam maupun watcher
//   jarak — ketiganya jalan berdampingan. Kasus terburuk saat app
//   terbuka: ~2 ping/jam (timer JS + alarm native); server mendup
//   interval < 30 detik, jadi tidak ada spam.
// ---------------------------------------------------------------------------

const Heartbeat = registerPlugin('Heartbeat');

// Interval heartbeat: 1 JAM, sama dengan timer foreground Dashboard.
export const TRACKING_HEARTBEAT_INTERVAL_MS = 3600000;

// Flag JS saja (bukan sumber kebenaran): status asli ada di native
// (SharedPreferences) dan bertahan melewati restart app.
let started = false;

export function isHeartbeatRunning() {
  return started;
}

// Mulai heartbeat. Harus dipanggil saat sesi clock-in aktif (Dashboard).
// Gagal mulai (bukan Android, belum login, plugin belum di-sync)
// TIDAK melempar: mengembalikan { started: false } supaya jalur
// tracking yang sudah ada tetap jalan.
export async function startHeartbeat() {
  if (Capacitor.getPlatform() !== 'android') {
    return { started: false, reason: 'unsupported-platform' };
  }
  if (started) {
    return { started: true };
  }
  const token = getToken();
  if (!token || token === 'session' || token === 'mock') {
    return { started: false, reason: 'no-token' };
  }
  try {
    await Heartbeat.start({
      token,
      // URL absolut (ODOO_URL + API_BASE), BUKAN apiUrl(''): di dev,
      // apiUrl memakai path relatif (vite proxy) yang tidak bisa
      // dipakai HttpURLConnection native. Produksi: nilai yang sama
      // persis dengan yang dipakai odooCall.
      baseUrl: `${ODOO_URL}${API_BASE}`,
      intervalMs: TRACKING_HEARTBEAT_INTERVAL_MS,
      clientUuid: getOrCreateDeviceId(),
    });
    started = true;
    return { started: true };
  } catch (err) {
    console.warn('Heartbeat gagal dimulai:', err);
    return { started: false, reason: 'start-failed' };
  }
}

// Hentikan heartbeat (clock-out / logout / sesi berakhir).
// Selalu aman dipanggil walau tidak jalan; selalu mencoba stop native
// (flag JS bisa basi sesudah restart app, sementara alarm native
// masih aktif) — dan tidak pernah melempar.
export async function stopHeartbeat() {
  try {
    await Heartbeat.stop();
  } catch {
    // Plugin belum di-sync / sudah hilang — abaikan.
  }
  started = false;
}

// Status native (diagnostik; tidak dipakai UI).
export async function statusHeartbeat() {
  try {
    return await Heartbeat.status();
  } catch {
    return { active: false, intervalMs: 0, nextFireAtMs: 0 };
  }
}
