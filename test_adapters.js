import assert from 'node:assert';

// Mock localStorage for Node test
const store = new Map();
const storageMock = {
  getItem: (k) => store.get(k) ?? null,
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
};
Object.defineProperty(globalThis, 'localStorage', {
  value: storageMock,
  configurable: true,
  writable: true,
});

const { default: api } = await import('./src/services/api.js');

async function runChecks() {
  console.log('Running adapter self-checks...');

  // 1. Kehadiran Bawahan Status
  const statusRes = await api.getKehadiranBawahanStatus();
  assert.strictEqual(statusRes.success, true);
  assert.strictEqual(statusRes.is_enabled, true);

  // 2. Kehadiran Bawahan List
  const listRes = await api.getKehadiranBawahanList('2026-10');
  assert.strictEqual(listRes.success, true);
  assert.ok(Array.isArray(listRes.data));

  // 3. Kalender Bawahan
  const kalenderRes = await api.getKalenderBawahan(1, '2026-10');
  assert.strictEqual(kalenderRes.success, true);
  assert.strictEqual(kalenderRes.kalender.length, 31);
  assert.ok(kalenderRes.summary);
  assert.ok('H' in kalenderRes.summary);

  // 4. Reimbursement Jenis & List
  const jenisRes = await api.getReimbursementJenis();
  assert.strictEqual(jenisRes.success, true);
  assert.strictEqual(jenisRes.data.length, 4);
  assert.strictEqual(jenisRes.data[0].nama_jenis, 'Transport / Bensin');
  assert.strictEqual(jenisRes.data[0].kode_jenis, 'transport');

  const rmbRes = await api.getReimbursement();
  assert.strictEqual(rmbRes.success, true);
  assert.ok(Array.isArray(rmbRes.data));
  assert.ok(rmbRes.summary);

  // 5. Ajukan Reimbursement
  const ajukanRmb = await api.ajukanReimbursement({
    reimbursement_jenis_id: 'transport',
    tanggal_kuitansi: '2026-10-18',
    nominal: 50000,
    keterangan: 'Bensin survey lapangan'
  });
  assert.strictEqual(ajukanRmb.success, true);

  // 6. Tukar Shift Inisiasi & Riwayat
  const initTs = await api.getTukarShiftInisiasi();
  assert.strictEqual(initTs.success, true);
  assert.ok(Array.isArray(initTs.data.rekan_list));
  assert.strictEqual(initTs.data.jadwal_pengaju.length, 14);

  const submitTs = await api.ajukanTukarShift({
    pegawai_tujuan_id: 901,
    penjadwalan_pengaju_id: initTs.data.jadwal_pengaju[0].id,
    penjadwalan_tujuan_id: 201,
    alasan: 'Ada urusan keluarga penting'
  });
  assert.strictEqual(submitTs.success, true);

  const riwayatTs = await api.getTukarShiftRiwayat();
  assert.strictEqual(riwayatTs.success, true);
  assert.strictEqual(riwayatTs.data.pengajuan_saya.length, 1);

  // 7. Denda & Dinas
  const dendaRes = await api.getDenda();
  assert.strictEqual(dendaRes.success, true);
  assert.strictEqual(dendaRes.aturan_denda_masuk.length, 3);

  const dinasRes = await api.getDinas();
  assert.strictEqual(dinasRes.success, true);
  assert.ok(Array.isArray(dinasRes.dinas));

  // 8. Masalah & Penugasan
  const masalahRes = await api.getMasalah();
  assert.strictEqual(masalahRes.success, true);
  assert.ok(masalahRes.masalah.length > 0);

  const tugasRes = await api.getPenugasan();
  assert.strictEqual(tugasRes.success, true);
  assert.ok(tugasRes.penugasan.length > 0);

  console.log('All adapter self-checks passed!');
}

runChecks().catch((err) => {
  console.error('Self-check failed:', err);
  process.exit(1);
});

