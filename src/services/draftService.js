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

// Daftar kunci draf yang dipakai aplikasi (satu per form; integrator
// menambahkan form baru di sini agar mudah dilacak & dibersihkan).
export const DRAFT_KEYS = {
  izin: (userId) => `izin:${userId}`,
  dinas: (userId) => `dinas:${userId}`,
  lembur: (userId) => `lembur:${userId}`,
  reimbursement: (userId) => `reimbursement:${userId}`,
  // Catatan review tugas (textarea detail tugas) + form masalah.
  tugas_review: (userId) => `tugas_review:${userId}`,
  masalah: (userId) => `masalah:${userId}`,
};

// Hapus SEMUA draf (dipanggil saat logout — draf tidak boleh menetap
// tanpa batas / bocor ke user berikutnya di perangkat yang sama).
export function clearAllDrafts() {
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX)) keys.push(k);
    }
    for (const k of keys) localStorage.removeItem(k);
  } catch {
    // Abaikan.
  }
}
