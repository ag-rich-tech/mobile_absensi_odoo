## Screenshots App
<div align="center">
  <img src="public/images/screenshoots_app/dashboard.png" alt="Dashboard" />
</div>

## Features
- Deteksi akun dinonaktifkan secara realtime
- Pendaftaran wajah (Face Enrollment)
- Face descriptor
- Selfie recognition saat absen masuk & pulang
- Absen masuk & pulang dengan verifkasi geofence
- Tampilan peta lokasi kantor & radius radius presensi
- Capture foto selfie saat absen
- Anti spoofing: deteksi mock GPS
- Live tracking ping saat sesi clock-in aktif
- Status: Tepat Waktu, Terlambat, Cepat Pulang
- Detail riwayat per hari
- Tampilan jadwal shift / roster mingguan
- Notifikasi cuti & lembur di jadwal
- Indikator jam masuk & pulang
- Request tukar shift dengan rekan kerja
- Daftar pengumuman perusahaan
- Badge notifikasi unread count
- Preview dokumen lampiran inline
- Ajukan cuti dengan tanggal & alasan
- Ajukan izin keluar dengan alasan
- Ajukan lembur dengan durasi & alasan
- Status approval real-time
- List pengajuan reimbursement
- Detail pengajuan per item
- Histori slip gaji per periode
- Preview detail pembayaran
- Ringkasan denda yang berlaku
- Form laporan masalah / keluhan
- Status kehadiran bawahan realtime
- Kalender kehadiran tim
- KPI pegawai terbaru- Info device & session

## How to Compile
### For Android APP
- First compile for folder /dist
```bash  
   npm run build  
``` 
- Compile & sync android
```bash  
   npx cap sync android  
```
- Build apk
```bash  
   cd android; .\gradlew.bat assembleDebug  
```
- Folder output app
```bash
android\app\build\outputs\apk\debug\app-debug.apk
```