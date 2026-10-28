import { registerPlugin, Capacitor } from '@capacitor/core';
import api from './api.js';

// ---------------------------------------------------------------------------
// Pelacakan background Android untuk audit (live tracking 1 jam).
//
// Plugin: @capacitor-community/background-geolocation v1.2.27 (MIT, gratis,
// mendukung Capacitor 8) — didaftarkan by-name persis seperti README plugin,
// BUKAN import dari paketnya, supaya modul ini tidak crash saat bundel bila
// plugin belum ter-install: registerPlugin hanya membuat proxy malas, error
// baru muncul saat method dipanggil, dan itu ditangkap di bawah sehingga
// ping foreground tetap jalan.
//
// Cara kerja plugin (per README): addWatcher dengan backgroundMessage yang
// terdefinisi membuat update lokasi tetap dikirim saat aplikasi di-background
// (di Android lewat foreground service + notifikasi permanen). Watcher ini
// BERBASIS JARAK (distanceFilter), bukan alarm waktu: callback hanya datang
// bila perangkat berpindah >= distanceFilter. Karena itu "sejam sekali"
// di sini ditegakkan sebagai BATAS ATAS kiriman (throttle 1 jam di bawah),
// bukan sebagai alarm per jam yang dijamin sistem:
//   - perangkat bergerak  -> maksimal 1 ping/jam ke server (hemat baterai);
//   - perangkat diam di background -> tidak ada callback baru, posisi
//     terakhir tetap valid (viewer menampilkan waktu terakhir terlihat).
// Jaminan per jam yang ketat saat aplikasi dibuka tetap dipegang timer
// foreground di DashboardPage (setInterval 1 jam) yang memakai throttle
// yang sama, sehingga total kiriman foreground + background <= 1/jam.
//
// Hemat baterai: plugin memakai fused location provider (tidak ada opsi
// high-accuracy di addWatcher, jadi tidak ada kunci GPS presisi); ping
// rutin TIDAK memakai GPS presisi — GPS presisi tetap hanya di jalur
// check-in/out yang sudah ada (tidak diubah patch ini).
//
// iOS SENGAJA tidak diaktifkan di sini (fase 2): startBackgroundTracking
// hanya jalan di platform Android.
// ---------------------------------------------------------------------------

// Plugin didaftarkan by-name sesuai README
// (https://github.com/capacitor-community/background-geolocation).
const BackgroundGeolocation = registerPlugin('BackgroundGeolocation');

// Interval ping audit: 1 JAM (keputusan user — bukan 15 menit).
export const TRACKING_PING_INTERVAL_MS = 3600000;

// Perpindahan minimum (meter) antar callback watcher background.
const BG_DISTANCE_FILTER_M = 100;

// Throttle bersama foreground + background: stempel kiriman terakhir yang
// berhasil. Dipakai kedua jalur supaya total kiriman <= 1/jam.
let lastSentAtMs = 0;

// ID watcher background yang sedang aktif (null bila tidak jalan).
let watcherId = null;
let running = false;

// Dipanggil saat sesi clock-in baru dimulai: kiriman pertama sesi baru
// harus langsung lolos (tidak tertahan throttle sesi sebelumnya).
export function resetTrackingPingThrottle() {
  lastSentAtMs = 0;
}

export function shouldSendTrackingPing(now = Date.now()) {
  return now - lastSentAtMs >= TRACKING_PING_INTERVAL_MS;
}

export function markTrackingPingSent(now = Date.now()) {
  lastSentAtMs = now;
}

export function isBackgroundTrackingRunning() {
  return running;
}

// Kirim satu ping background. lastSentAt HANYA diubah bila kirim berhasil:
// server menolak (sesi berakhir / duplikat interval / offline) berarti
// callback berikutnya harus mencoba lagi, bukan menunggu 1 jam.
async function sendBackgroundPing(location) {
  if (!shouldSendTrackingPing()) return;
  try {
    await api.sendTrackingPing({
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy_m: location.accuracy || 0,
      battery_level: null,
      // Flag `simulated` dari plugin = lokasi dari mock provider Android
      // (Location.isFromMockProvider di baliknya, per README plugin).
      // Ini deteksi GPS palsu jalur background; jalur foreground memakai
      // checkFakeGps (plugin native repo sendiri + heuristik).
      mock_detected: location.simulated === true,
    });
    markTrackingPingSent();
  } catch {
    // Abaikan: Dashboard effect menghentikan watcher saat sesi berakhir,
    // dan callback berikutnya akan mencoba lagi (throttle tidak diubah).
  }
}

// Mulai watcher background. Harus dipanggil saat sesi clock-in aktif, dan
// dihentikan via stopBackgroundTracking() saat check-out (lihat Dashboard).
// Gagal mulai (bukan Android, plugin belum di-install/sync, izin ditolak)
// TIDAK melempar: mengembalikan { started: false } supaya ping foreground
// tetap jalan. Khusus izin: bila callback mengembalikan NOT_AUTHORIZED,
// pemanggil bisa mengarahkan user ke Settings via openBackgroundSettings()
// — Android 11+ hanya memberi izin "sepanjang waktu" lewat layar Settings,
// bukan lewat dialog langsung.
export async function startBackgroundTracking() {
  if (Capacitor.getPlatform() !== 'android') {
    return { started: false, reason: 'unsupported-platform' };
  }
  if (running) {
    return { started: true, watcherId };
  }
  try {
    watcherId = await BackgroundGeolocation.addWatcher(
      {
        // backgroundMessage yang terdefinisi = update tetap jalan di
        // background (per README plugin); di Android ini JUGA menjadi
        // teks notifikasi permanen foreground service.
        backgroundMessage:
          'Lokasi Anda dilacak selama jam kerja untuk audit absensi.',
        backgroundTitle: 'Ali Attendance — Pelacakan Absensi',
        requestPermissions: true,
        stale: false,
        distanceFilter: BG_DISTANCE_FILTER_M,
      },
      (location, error) => {
        if (error) {
          if (error && error.code === 'NOT_AUTHORIZED') {
            console.warn(
              'Background tracking tidak punya izin lokasi. ' +
                'Arahkan user ke Settings untuk memilih "sepanjang waktu".',
            );
          }
          return;
        }
        if (location) {
          void sendBackgroundPing(location);
        }
      },
    );
    running = true;
    return { started: true, watcherId };
  } catch (err) {
    console.warn('Background tracking gagal dimulai:', err);
    return { started: false, reason: 'start-failed' };
  }
}

// Hentikan watcher background (dipanggil saat check-out / sesi berakhir).
// Selalu aman dipanggil walau watcher tidak jalan.
export async function stopBackgroundTracking() {
  if (watcherId !== null && watcherId !== undefined) {
    try {
      await BackgroundGeolocation.removeWatcher({ id: watcherId });
    } catch {
      // Watcher sudah hilang (mis. service dimatikan sistem) — abaikan.
    }
  }
  watcherId = null;
  running = false;
  resetTrackingPingThrottle();
}

// Buka layar Settings lokasi aplikasi (untuk memilih "sepanjang waktu").
export async function openBackgroundSettings() {
  try {
    await BackgroundGeolocation.openSettings();
  } catch (err) {
    console.warn('Gagal membuka Settings lokasi:', err);
  }
}
