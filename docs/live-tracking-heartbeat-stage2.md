# Live Tracking — Heartbeat Tahap 2 (alarm per jam, Android)

## Masalah yang dipecahkan

Watcher background tahap 1 (`backgroundTracking.js`, plugin
`@capacitor-community/background-geolocation`) **berbasis jarak**:
callback hanya datang bila perangkat berpindah >= 100 m. Karyawan yang
diam di office seharian tidak pernah tercapture — gap 13:15 → 17:36
pada 29 Okt 2026 adalah buktinya (koordinat sama persis, bukan service
mati).

Heartbeat tahap 2 menambahkan **alarm native tiap jam** yang berbunyi
walau user diam di tempat, di luar WebView, sehingga tetap jalan saat
app diminimize / di-swipe. Ini ADITIF: timer foreground 1 jam dan
watcher jarak tetap jalan seperti dulu.

## Arsitektur

```
Dashboard (sesi aktif)
  └─ startHeartbeat() ──► Plugin "Heartbeat" (MainActivity, eksplisit)
       ├─ simpan token + baseUrl + interval + clientUuid (SharedPreferences)
       └─ AlarmManager one-shot (sekarang + 1 jam)
            └─ HeartbeatReceiver (goAsync + thread + wake lock 60 dtk)
                 ├─ flag aktif? tidak -> berhenti (alarm yatim)
                 ├─ jadwalkan ulang alarm berikutnya DULU (rantai anti-putus)
                 ├─ lokasi: Fused getCurrentLocation (akurasi tinggi,
                 │   timeout 20 dtk) -> fallback lastLocation (5 dtk)
                 ├─ baterai: BatteryManager (tanpa izin tambahan)
                 ├─ mock: Location.isMock() (API 31+) / isFromMockProvider()
                 └─ POST {baseUrl}/tracking/ping (replika payload JS)
                      ├─ 401 / NOT_CHECKED_IN -> hentikan rantai total
                      └─ gagal lain -> lewati, coba lagi jam depan
HeartbeatBootReceiver: reboot / update APK -> jadwalkan ulang HANYA
  bila flag aktif tersimpan (tanpa flag = tidak ada ping zombie).
```

File:

| File | Peran |
|---|---|
| `android/.../HeartbeatPlugin.java` | Plugin Capacitor lokal `Heartbeat`: `start` / `stop` / `status`. Didaftarkan eksplisit di `MainActivity` (template ini tidak auto-registrasi plugin lokal). |
| `android/.../HeartbeatScheduler.java` | Satu-satunya penjadwal: SharedPreferences + AlarmManager + PendingIntent. |
| `android/.../HeartbeatReceiver.java` | Kerja tiap bunyi alarm: lokasi + kirim + self-stop. |
| `android/.../HeartbeatBootReceiver.java` | Pulihkan jadwal sesudah reboot / update APK. |
| `android/.../MainActivity.java` | + `registerPlugin(HeartbeatPlugin.class)`. |
| `android/.../AndroidManifest.xml` | + 2 receiver + 3 izin baru (di bawah). |
| `android/.../app/build.gradle` | + `play-services-location:21.0.1` (versi SAMA dengan plugin background-geolocation; `implementation` di modul plugin tidak bocor ke classpath modul app). |
| `src/services/heartbeat.js` | Bungkus JS: guard Android, ambil token/baseUrl/clientUuid dari JS (native tidak bisa membaca localStorage WebView), start/stop/status. |
| `src/pages/DashboardPage.jsx` | Start saat sesi aktif (berdampingan watcher), stop saat cleanup efek + penjaga tanpa-sesi. |
| `src/App.jsx` | Stop saat logout (jaring pengaman supaya token tidak tertinggal). |

## Pemetaan payload native vs JS

Endpoint SAMA (`POST {ODOO_URL}{API_BASE}/tracking/ping`, header
`Authorization: Bearer <token>`, body JSON mentah — bukan JSON-RPC).
Server memberi stempel waktu sendiri (`create_date`); native TIDAK
mengirim field waktu, jadi tidak ada risiko salah zona.

| Field | Jalur JS (`api.sendTrackingPing`) | Jalur native (HeartbeatReceiver) |
|---|---|---|
| `latitude` | `pos.coords.latitude` | `location.getLatitude()` |
| `longitude` | `pos.coords.longitude` | `location.getLongitude()` |
| `accuracy_m` | `coords.accuracy \|\| 0` | `hasAccuracy() ? accuracy : 0` |
| `battery_level` | Device API (`batteryLevel * 100`, null bila gagal) | BatteryManager `level*100/scale`, null bila tak terbaca |
| `mock_detected` | `checkFakeGps` (foreground) / `simulated` plugin (background) | `isMock()` / `isFromMockProvider()` |
| `client_uuid` | `getOrCreateDeviceId()` (localStorage `DEV-...`) | Sama, dikirim JS saat `start()`; bila kosong, native buat format `DEV-` + UUID dan simpan |

Server: menolak bila tidak ada sesi berjalan (`NOT_CHECKED_IN`),
mendup interval < `live_tracking_interval_s` (default 30 dtk),
meng-clamp baterai 0–100. Karena dedup server hanya 30 detik (bukan
1 jam), kasus terburuk saat app terbuka adalah ~2 ping/jam (timer JS
+ alarm native) — itu wajar untuk audit, bukan spam.

## Izin

Baru di tahap 2 (ditambahkan ke `AndroidManifest.xml`):

- `SCHEDULE_EXACT_ALARM` (Android 12+): alarm tepat-waktu. Bila user
  mencabutnya (Settings > Aplikasi > Ali Attendance > Alarm &
  pengingat), kode jatuh ke `setAndAllowWhileIdle` (inexact): alarm
  tetap jalan tapi bisa bergeser, terutama saat Doze. Tidak crash.
- `RECEIVE_BOOT_COMPLETED`: pulihkan jadwal sesudah reboot.
- `WAKE_LOCK`: tahan CPU sebentar saat receiver bekerja (timeout 60 dtk).

Sudah ada dari patch background 28 Okt (tidak diduplikasi):
`INTERNET`, `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`,
`ACCESS_BACKGROUND_LOCATION`, `FOREGROUND_SERVICE`,
`FOREGROUND_SERVICE_LOCATION`, `POST_NOTIFICATIONS`.

## Setting HP wajib (khususnya Xiaomi / HyperOS)

Tanpa ini, MIUI tetap bisa menunda/membunuh alarm walau kode sudah
benar (berlaku juga untuk tahap 1):

1. Setelan > Aplikasi > Kelola aplikasi > Ali Attendance >
   **Mulai otomatis: ON**.
2. Di layar yang sama > **Penghemat baterai: Tanpa batasan**.
3. Recent apps > tahan kartu Ali Attendance > **ikon gembok**
   (kunci supaya swipe tidak membunuhnya).
4. Izin lokasi app: **Sepanjang waktu**.
5. Settings > Aplikasi > Ali Attendance > **Alarm & pengingat:
   Izinkan** (supaya alarm tetap exact; bila dicabut, fallback inexact).

## Langkah king

```bash
git apply <patch-tahap-2>.patch
npx cap sync android
# rebuild APK (tidak ada dependensi npm baru — plugin ini lokal,
# hanya memakai Play Services location yang sudah dipakai plugin existing)
```

Tidak ada `npm install` baru yang wajib (tidak ada paket npm baru);
`cap sync` wajib supaya file Java + manifest masuk ke proyek Android.

## Rencana tes HP (bukti akhir di HP king, bukan sandbox)

1. **Diam di office (tes utama):** clock-in, tutup app (minimize,
   jangan dibuka lagi), diam di office 1–2 jam, cek peta / daftar
   Live Tracking. Harus ada ping baru tiap jam walau tidak bergerak.
2. **Swipe + bergerak:** swipe dari recent, jalan >100 m tanpa buka
   app, cek peta. Harus ada ping (watcher jarak + heartbeat).
3. **Reboot:** restart HP (sesi masih terbuka), tunggu 1 jam tanpa
   buka app, cek peta. Harus ada ping (BootReceiver).
4. **Clock-out:** sesudah pulang, tidak boleh ada ping baru lagi.
5. **Logout:** sesudah logout, tidak boleh ada ping baru lagi
   (token sudah dihapus dari SharedPreferences).

## Batas jujur

- **Force Stop via Settings membunuh segalanya** (sistem menghapus
  alarm; receiver tidak jalan sampai app dibuka lagi). Tidak ada app
  yang kebal ini.
- **Xiaomi tanpa setting di atas tetap bisa menunda** alarm (Doze +
  MIUI agresif). Bila tes 1 gagal padahal setting sudah benar,
  laporkan — itu level OEM, bukan lagi kode.
- **Fallback inexact bisa bergeser** dari tepat 1 jam bila izin exact
  dicabut (terutama saat Doze).
- **Token kedaluwarsa menghentikan rantai** (401 -> stop). Login ulang
  memulai lagi otomatis lewat Dashboard.
- **Auto-check-out server menghentikan rantai** (`NOT_CHECKED_IN` ->
  stop). Clock-in berikutnya memulai lagi.
- **iOS TIDAK dicakup** tahap ini (hanya Android; plugin tidak punya
  kode iOS, dan JS meng-guard platform Android saja).
- **Kompilasi native tidak terverifikasi dari sandbox** (tidak ada
  Android SDK di sana) — kompilasi pertama terjadi di PC king saat
  `cap sync` + build APK. Bila ada error kompilasi, kirimkan lognya.
