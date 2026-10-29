// Registry navigasi dashboard (tanpa prop drilling):
// - DashboardPage melaporkan subview aktifnya ke sini;
// - Back handler Android di App.jsx membacanya (subview -> Beranda,
//   Beranda -> exitApp);
// - Deep link (appUrlOpen) menitipkan subview tujuan yang dikonsumsi
//   DashboardPage saat mount berikutnya.
let currentDashboardNav = 'home';
let pendingDashboardNav = null;

export function setDashboardNav(nav) {
  currentDashboardNav = nav || 'home';
}
export function getDashboardNav() {
  return currentDashboardNav;
}
export function setPendingDashboardNav(nav) {
  pendingDashboardNav = nav || 'home';
}
export function consumePendingDashboardNav() {
  const nav = pendingDashboardNav;
  pendingDashboardNav = null;
  return nav;
}
export function requestDashboardBackToHome() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('dashboard-back-to-home'));
  }
}

// Peta segmen deep link -> subview DashboardPage (tidak dikenal -> Beranda).
const DEEP_LINK_MAP = {
  dashboard: 'home', beranda: 'home', home: 'home',
  riwayat: 'history', history: 'history',
  profil: 'profile', profile: 'profile',
  izin: 'izin', cuti: 'izin',
  jadwal: 'jadwal',
  dinas: 'dinas',
  lembur: 'lembur',
  denda: 'denda',
  slip: 'slip_gaji', slip_gaji: 'slip_gaji', gaji: 'slip_gaji',
  masalah: 'masalah', tiket: 'masalah',
  tugas: 'tugas',
  approval: 'approval', persetujuan: 'approval',
  pengumuman: 'pengumuman',
  reimbursement: 'reimbursement', klaim: 'reimbursement',
  bawahan: 'kehadiran_bawahan', tim: 'kehadiran_bawahan',
  karyawan: 'karyawan',
};
export function deepLinkToDashboardNav(url) {
  try {
    const clean = String(url || '').split('?')[0].split('#')[0];
    const seg = decodeURIComponent(clean.split('/').filter(Boolean).pop() || '');
    return DEEP_LINK_MAP[seg.toLowerCase()] || 'home';
  } catch {
    return 'home';
  }
}
