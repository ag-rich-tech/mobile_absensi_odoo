## Screenshots App
<div align="center">
  <img src="public/images/screenshoots_app/dashboard.png" alt="Dashboard" />
</div>

## Features
### Autentikasi
- Login dengan NIP dan PIN
- Deteksi akun dinonaktifkan secara realtime (aplikasi otomatis keluar)
- Session management dengan Bearer token

### Biometrik Wajah
- Pendaftaran wajah (Face Enrollment) dengan 3 tahap pemotretan
- Face descriptor tersimpan di device & server
- Auto-check status wajah saat login
- Selfie recognition saat absen masuk & pulang

### Presensi (Attendance)
- Absen masuk & pulang dengan verifkasi geofence
- Tampilan peta lokasi kantor & radius radius presensi
- Capture foto selfie saat absen
- Audio feedback (suara berhasil/gagal)
- Anti spoofing: deteksi mock GPS
- Live tracking ping saat sesi clock-in aktif

### Riwayat Kehadiran
- Filter per bulan & tahun
- Status: Tepat Waktu, Terlambat, Cepat Pulang
- Detail riwayat per hari

### Jadwal Kerja
- Tampilan jadwal shift / roster mingguan
- Notifikasi cuti & lembur di jadwal
- Indikator jam masuk & pulang
- Request tukar shift dengan rekan kerja

### Pengumuman
- Daftar pengumuman perusahaan
- Filter: Semua / Belum Dibaca / Penting
- Badge notifikasi unread count
- Preview dokumen lampiran inline
- Mark as read & refresh manual

### Tugas / Penugasan
- Tab Berjalan & Selesai
- Statistik ringkas tugas
- Detail tugas lengkap (deskripsi, deadline, assignee)
- Update status tugas

### Approval (Cut / Izin / Lembur)
- Ajukan cuti dengan tanggal & alasan
- Ajukan izin keluar dengan alasan
- Ajukan lembur dengan durasi & alasan
- Status approval real-time

### Reimbursement
- List pengajuan reimbursement
- Detail pengajuan per item
- Preview dokumen pendukung

### Slip Gaji
- Histori slip gaji per periode
- Preview detail pembayaran

### Denda & Masalah
- Ringkasan denda yang berlaku
- Form laporan masalah / keluhan

### Monitoring Bawahan (Manager)
- Status kehadiran bawahan realtime
- Kalender kehadiran tim
- KPI pegawai terbaru

### Profile
- Info lengkap pegawai (nama, NIP, divisi, jabatan)
- Ubah kata sandi
- Info device & session
- Logout

---

## How to Compile

### For Android APP
1. First compile for folder /dist
```bash  
   npm run build  
``` 

2. Compile & sync android
```bash  
   npx cap sync android  
```

3. Build apk
```bash  
   cd android; .\gradlew.bat assembleDebug  
```
Folder output app
```bash
android\app\build\outputs\apk\debug\app-debug.apk
```