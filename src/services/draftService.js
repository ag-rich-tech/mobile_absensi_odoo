import { useState, useEffect, useCallback, useRef } from 'react';

// Draf form persisten (localStorage) — ganti rugi atas unmount tab yang
// menghilangkan state form di memori (pindah tab di tengah mengisi form
// lalu kembali = form kosong). Modul ini TIDAK dipakai view mana pun
// dulu: wiring dilakukan integrator/app-1 per form (lihat contoh di
// bawah). Kunci WAJIB mencakup id user (mis. `izin:12`) agar draf satu
// perangkat tidak bocor ke user lain yang login di perangkat sama.
const PREFIX = 'ag-form-draft:';

function readRaw(key) {
  try {
    return localStorage.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

// Baca draf tersimpan; kembalikan fallback bila tidak ada / rusak /
// bukan objek. Tidak pernah melempar (storage bisa penuh/diblokir).
export function loadDraft(key, fallback = {}) {
  const raw = readRaw(key);
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : fallback;
  } catch {
    return fallback;
  }
}

// Simpan draf (diam bila storage gagal — form tetap jalan di memori).
export function saveDraft(key, values) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(values || {}));
  } catch {
    // Abaikan: draf hanya kenyamanan, bukan data kritis.
  }
}

// Hapus draf — WAJIB dipanggil saat submit berhasil, agar form berikutnya
// tidak dibuka dengan isi pengajuan lama.
export function clearDraft(key) {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    // Abaikan.
  }
}

// Hook siap pakai — wiring per form cukup 2 baris:
//
//   1. Ganti useState form:
//        const [form, setForm, resetDraft] =
//          useFormDraft(`izin:${user.id}`, { jenis: '', tanggal: '', alasan: '' });
//      (setForm dipakai persis seperti setter useState lama; tiap
//      perubahan otomatis tersimpan ke localStorage.)
//   2. Di handler sukses submit, sebelum/bersamaan reset form:
//        resetDraft();
//
// Perilaku: saat mount, draf tersimpan (bila ada) menimpa nilai awal
// per-field; field baru yang belum ada di draf memakai nilai awal.
// Saat unmount (pindah tab), nilai terakhir sudah tersimpan, jadi
// kembali ke form = draf pulih. Draf TIDAK dihapus saat unmount —
// hanya saat submit berhasil (resetDraft) atau logout (clearAuth
// tidak menyentuh kunci ini; lihat catatan integrator di app2-notes).
export function useFormDraft(key, initialValues) {
  const initialRef = useRef(initialValues);
  const [values, setValues] = useState(() => {
    const saved = loadDraft(key, null);
    return saved && typeof saved === 'object'
      ? { ...initialRef.current, ...saved }
      : initialRef.current;
  });

  // Simpan tiap perubahan (form kecil; localStorage sinkron & cepat).
  useEffect(() => {
    saveDraft(key, values);
  }, [key, values]);

  const resetDraft = useCallback(() => {
    clearDraft(key);
    setValues(initialRef.current);
  }, [key]);

  return [values, setValues, resetDraft];
}

// Daftar kunci draf yang dipakai aplikasi (satu per form; integrator
// menambahkan form baru di sini agar mudah dilacak & dibersihkan).
export const DRAFT_KEYS = {
  izin: (userId) => `izin:${userId}`,
  dinas: (userId) => `dinas:${userId}`,
  lembur: (userId) => `lembur:${userId}`,
  reimbursement: (userId) => `reimbursement:${userId}`,
  tugas: (userId) => `tugas:${userId}`,
};
