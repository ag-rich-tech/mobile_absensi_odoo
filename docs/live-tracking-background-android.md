# Live Tracking Background Android (Audit)

Patch ini mengubah live tracking dari "foreground 60 detik" menjadi
**audit tracking 1 jam**: ping foreground tiap 1 jam + pelacakan background
Android selama sesi clock-in berjalan, dengan deteksi GPS palsu yang
sesungguhnya. iOS TIDAK termasuk (fase 2).

## Yang diubah

| File | Perubahan |
|---|---|
| `src/pages/DashboardPage.jsx` | Interval ping foreground 60 detik -> 1 jam (`setInterval 3600000`); `mock_detected` kini dari `checkFakeGps` (bukan lagi hardcode `false`); watcher background dimulai/dihentikan bersama sesi (`sudahMasuk`). |
| `src/services/backgroundTracking.js` | BARU. Watcher background via plugin `@capacitor-community/background-geolocation` + throttle kiriman bersama (maksimal 1 ping/jam foreground + background). |
| `package.json` | Tambah dependensi `@capacitor-community/background-geolocation@^1.2.27` (MIT, gratis, mendukung Capacitor 8). |
| `capacitor.config.json` | `android.useLegacyBridge: true` (per README plugin: mencegah update lokasi berhenti setelah 5 menit di background). |
| `android/app/src/main/AndroidManifest.xml` | Tambah `ACCESS_BACKGROUND_LOCATION`, `POST_NOTIFICATIONS`, `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION`. |

Tidak ada perubahan server, endpoint, maupun bentuk payload — hanya nilai
`mock_detected` yang kini sesungguhnya dan interval yang berubah.

## Cara kerja

1. **Sesi dimulai (clock-in)** — Dashboard mengirim 1 ping langsung, lalu:
   - timer foreground tiap 1 jam (hanya saat aplikasi dibuka), dan
   - watcher background Android (foreground service + notifikasi permanen
     "Ali Attendance — Pelacakan Absensi") yang mengirim saat perangkat
     berpindah >= 100 m.
2. **Throttle bersama** — foreground dan background berbagi stempel kiriman
   terakhir, sehingga total kiriman ke server maksimal 1/jam. Kiriman
   pertama setiap sesi baru selalu lolos (throttle di-reset saat sesi
   dimulai).
3. **Sesi berakhir (check-out)** — timer dibersihkan dan watcher dihapus
   (`removeWatcher`). Pelacakan berhenti total di luar jam kerja.
4. **Deteksi GPS palsu** — foreground: `checkFakeGps` (plugin native repo
   sendiri + heuristik). Background: flag `simulated` dari plugin
   (Location.isFromMockProvider di baliknya).
5. **Hemat baterai** — ping rutin pakai akurasi rendah (posisi Wi-Fi/seluler,
   tanpa kunci GPS presisi; watcher background memakai fused provider tanpa
   opsi high-accuracy). GPS presisi tetap hanya di jalur check-in/out.

## Instalasi (setelah `git apply`)

```bash
npm install          # mengambil plugin baru + update package-lock.json
npx cap sync android # sinkronisasi plugin native ke proyek Android
# lalu build APK seperti biasa
```

## Izin di HP (Android) — wajib dijelaskan ke karyawan

1. Buka aplikasi, lakukan clock-in. Saat diminta, izinkan lokasi
   ("Saat aplikasi digunakan").
2. **Izin "sepanjang waktu"**: Android 11+ TIDAK menampilkan dialog langsung
   untuk ini. Buka **Settings -> Apps -> Ali Attendance -> Permissions ->
   Location -> Allow all the time**. (Bila watcher mengembalikan
   NOT_AUTHORIZED, aplikasi mengarahkan ke layar Settings lewat
   `openSettings()`.)
3. **Notifikasi (Android 13+)**: izinkan notifikasi supaya notifikasi
   permanen foreground service tampil.
4. **Hemat baterai / autostart (terutama Xiaomi/Oppo/Vivo)**: matikan
   optimasi baterai untuk aplikasi ini dan aktifkan autostart — kalau tidak,
   sistem bisa membunuh layanan background walau foreground service jalan.

## Cara verifikasi di HP

1. Clock-in, lalu **minimize aplikasi** (jangan swipe tutup).
2. Berpindah tempat > 100 m, tunggu. Ping background masuk ke server
   sebagai `ag.rest.event` event `tracking_ping` (maksimal 1/jam).
3. Buka dashboard 1 jam (foreground): ping jam berikutnya masuk.
4. Uji GPS palsu: aktifkan aplikasi fake GPS, lakukan clock-in / tunggu
   ping — server harus menerima `mock_detected = true`.
5. Check-out: pastikan tidak ada ping baru sesudahnya (watcher berhenti).

## Batasan jujur (dibaca sebelum mengklaim "seperti Find My")

- **Watcher berbasis jarak, bukan alarm per jam.** Plugin gratis ini tidak
  punya opsi interval waktu. Perangkat yang diam di background tidak
  menghasilkan callback baru — posisi terakhir tetap valid dan viewer
  menampilkan waktu terakhir terlihat, tetapi tidak ada titik baru tiap jam
  saat perangkat tidak bergerak. Jaminan per jam yang ketat saat aplikasi
  dibuka dipegang timer foreground. Alarm per jam yang dijamin sistem
  (AlarmManager + HTTP native) adalah tahap 2 dan butuh plugin native
  buatan sendiri yang belum bisa diverifikasi dari sandbox.
- **HTTP WebView di-throttle Android setelah 5 menit di background**
  (per README plugin). Kiriman ping background bisa tertunda; bila di HP
  nyata ping background sering hilang/terlambat, tindak lanjutnya adalah
  migrasi `odooCall` ke CapacitorHttp (native, tidak di-throttle) —
  perubahan terpisah, tidak termasuk patch ini.
- **Force-stop total (Settings -> Force Stop) menghentikan semuanya**,
  begitu juga lokasi yang dimatikan total dan HP yang mati. Tidak ada
  aplikasi pihak ketiga yang bisa melacak dalam kondisi itu (hanya Find My
  milik Apple/Google yang punya hak sistem).
- **iOS tidak termasuk.** Watcher sengaja hanya dimulai di Android.
