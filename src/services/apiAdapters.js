import {
  odooExecuteKw,
  odooCall,
  getStoredUser,
  setStoredUser,
  setRpcPass,
  getRpcUid,
  getRpcPass,
  getServerDate,
  fmtTanggalId,
  fmtYMD,
  fmtHM,
  utcToWib,
  pad2,
  NAMA_HARI,
  stripDataUrl,
  getTukarShiftStore,
  setTukarShiftStore,
} from './api.js';

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null);
    const reader = new FileReader();
    reader.onload = () => resolve(stripDataUrl(reader.result));
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
}

const KODE_STYLE = {
  H: { warna_bg: '#ecfdf5', warna_border: '#a7f3d0', warna_teks: '#047857', label: 'Hadir Tepat Waktu' },
  'H-TP': { warna_bg: '#fffbeb', warna_border: '#fde68a', warna_teks: '#b45309', label: 'Hadir Belum Pulang' },
  T: { warna_bg: '#fff7ed', warna_border: '#fed7aa', warna_teks: '#c2410c', label: 'Terlambat' },
  PA: { warna_bg: '#fef3c7', warna_border: '#fde68a', warna_teks: '#92400e', label: 'Pulang Awal' },
  'T-PA': { warna_bg: '#ffedd5', warna_border: '#fdba74', warna_teks: '#9a3412', label: 'Terlambat & Pulang Awal' },
  A: { warna_bg: '#fef2f2', warna_border: '#fecaca', warna_teks: '#b91c1c', label: 'Alpa / Tanpa Keterangan' },
  I: { warna_bg: '#eff6ff', warna_border: '#bfdbfe', warna_teks: '#1d4ed8', label: 'Izin' },
  S: { warna_bg: '#faf5ff', warna_border: '#e9d5ff', warna_teks: '#7e22ce', label: 'Sakit' },
  C: { warna_bg: '#f0fdf4', warna_border: '#bbf7d0', warna_teks: '#15803d', label: 'Cuti Tahunan' },
  D: { warna_bg: '#f0f9ff', warna_border: '#bae6fd', warna_teks: '#0369a1', label: 'Dinas Luar Kota' },
  L: { warna_bg: '#f8fafc', warna_border: '#e2e8f0', warna_teks: '#64748b', label: 'Hari Libur' },
  '-': { warna_bg: '#f8fafc', warna_border: '#e2e8f0', warna_teks: '#94a3b8', label: 'Mendatang' },
};

function generate14DaysSchedule(baseId = 100) {
  const schedule = [];
  const now = getServerDate();
  for (let i = 0; i < 14; i++) {
    const d = new Date(now.getTime() + i * 86400000);
    const dayOfWeek = d.getDay();
    const isOff = dayOfWeek === 0 || dayOfWeek === 6;
    schedule.push({
      id: baseId + i + 1,
      tanggal: fmtYMD(d),
      tanggal_formatted: fmtTanggalId(d),
      hari: NAMA_HARI[dayOfWeek],
      nama_shift: isOff ? 'Libur (Day Off)' : 'Shift Regular',
      jam_masuk: isOff ? '-' : '08:00',
      jam_pulang: isOff ? '-' : '17:00',
      is_hari_libur: isOff,
    });
  }
  return schedule;
}

// Helper untuk mendapatkan objek karyawan saat ini lengkap dengan child_ids & parent_id dari Odoo
export async function getCurrentEmployee() {
  const user = getStoredUser();
  if (user?._odoo_employee?.id && Array.isArray(user._odoo_employee.child_ids)) {
    return user._odoo_employee;
  }
  const uid = user?._odoo_user?.id || user?.id;
  if (uid) {
    try {
      const emps = await odooExecuteKw('hr.employee', 'search_read', [
        [['user_id', '=', Number(uid)]]
      ], {
        fields: ['id', 'name', 'parent_id', 'child_ids', 'resource_calendar_id', 'job_id', 'department_id', 'barcode', 'image_128', 'work_email', 'work_phone'],
        limit: 1,
      });
      if (emps && emps[0]) {
        const updated = { ...user, _odoo_employee: emps[0] };
        setStoredUser(updated);
        return emps[0];
      }
    } catch (e) {
      console.warn('getCurrentEmployee error:', e);
    }
  }
  return user?._odoo_employee || null;
}

// ---------------------------------------------------------------------------
// 1. Kehadiran Bawahan (Berdasarkan Org Chart Odoo: child_ids / parent_id)
// ---------------------------------------------------------------------------

// Helper: cek apakah employee adalah bawahan langsung dari currentEmp
function _isDirectReport(empEmployee, currentEmp) {
  if (!empEmployee || !currentEmp) return false;
  const mid = empEmployee.manager;
  if (!mid) return false;
  // manager bisa berupa objek {id, name} atau sekadar string nama
  const mgrId = typeof mid === 'object' ? (mid.id || mid[0]) : null;
  const mgrName = typeof mid === 'object' ? (mid.name || mid[1]) : mid;
  return mgrId === currentEmp.id || mgrName === currentEmp.manager || mgrName === currentEmp.nama;
}

export async function getKehadiranBawahanStatus() {
  try {
    const emp = await getCurrentEmployee();
    if (!emp) {
      return { success: false, message: 'Sesi tidak valid. Silakan login ulang.' };
    }

    // Ambil semua karyawan → filter client-side berdasarkan manager
    const res = await odooCall('/employee/list', { limit: 500 });
    const allEmployees = (res?.data?.employees) || [];
    const directReports = allEmployees.filter((e) => _isDirectReport(e, emp));

    return {
      success: true,
      is_enabled: true,
      is_atasan: directReports.length > 0,
      total_bawahan: directReports.length,
    };
  } catch (err) {
    console.error('getKehadiranBawahanStatus error:', err);
    return { success: false, message: 'Gagal memuat status fitur: ' + (err?.message || String(err)) };
  }
}

export async function getKehadiranBawahanList(bulanParam) {
  const emp = await getCurrentEmployee();
  if (!emp) {
    return { success: false, message: 'Sesi tidak valid. Silakan login ulang.' };
  }

  const hasRpc = !!(getRpcUid() && getRpcPass());

  const now = getServerDate();
  const [year, month] = (bulanParam || fmtYMD(now).slice(0, 7)).split('-').map(Number);
  const startDate = `${year}-${pad2(month)}-01 00:00:00`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${pad2(month)}-${pad2(lastDay)} 23:59:59`;

  try {
    // Ambil semua karyawan → filter client-side berdasarkan manager
    const res = await odooCall('/employee/list', { limit: 500 });
    const allEmployees = (res?.data?.employees) || [];
    const subs = allEmployees.filter((e) => _isDirectReport(e, emp));

    if (!subs || subs.length === 0) {
      return { success: true, data: [], message: 'Belum ada bawahan yang terdaftar.' };
    }

    const subIds = subs.map((s) => s.id);

    // RPC attendance/leave (opsional, hanya bila credential tersedia)
    let attendances = [];
    let leaves = [];
    if (hasRpc) {
      const [attRes, leaveRes] = await Promise.all([
        odooExecuteKw('hr.attendance', 'search_read', [
          [['employee_id', 'in', subIds], ['check_in', '>=', startDate], ['check_in', '<=', endDate]],
        ], { fields: ['employee_id', 'check_in', 'check_out'], limit: 1000 }).catch(() => []),
        odooExecuteKw('hr.leave', 'search_read', [
          [['employee_id', 'in', subIds], ['state', '=', 'validate'], ['date_from', '<=', endDate], ['date_to', '>=', startDate]],
        ], { fields: ['employee_id', 'holiday_status_id', 'number_of_days'], limit: 500 }).catch(() => []),
      ]);
      attendances = attRes || [];
      leaves = leaveRes || [];
    }

    const data = subs.map((s) => {
      // Attendance matching (RPC format: employee_id is [id, name] tuple)
      const empAtts = attendances.filter(
        (a) => (Array.isArray(a.employee_id) ? a.employee_id[0] : a.employee_id) === s.id
      );

      const nameParts = (s.name || '').trim().split(/\s+/).filter(Boolean);
      const inisial = nameParts.length > 1
        ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
        : (nameParts[0] ? nameParts[0].slice(0, 2).toUpperCase() : 'B');

      const jobName = s.job && Array.isArray(s.job) ? s.job[1] : (s.job && s.job.name) || 'Staff';
      const deptName = s.department && Array.isArray(s.department) ? s.department[1] : (s.department && s.department.name) || '';
      const foto = s.photo
        ? s.photo.startsWith('data:') ? s.photo : `data:image/png;base64,${s.photo}`
        : null;

      return {
        id: s.id,
        nama: s.name,
        inisial,
        nip: s.barcode || s.pin || String(s.id),
        jabatan: jobName,
        departemen: deptName,
        foto,
        summary: {
          hadir: empAtts.length,
          terlambat: 0,
          tidak_hadir: 0,
          izin: leaves.length,
          sakit: 0,
        },
      };
    });

    data.sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));
    return { success: true, data };
  } catch (err) {
    console.error('getKehadiranBawahanList error:', err);
    return { success: false, message: 'Gagal memuat data bawahan: ' + (err?.message || String(err)) };
  }
}


export async function getKalenderBawahan(bawahanId, bulanParam) {
  const now = getServerDate();
  const ym = bulanParam || fmtYMD(now).slice(0, 7);
  const [year, month] = ym.split('-').map(Number);
  const startDate = `${year}-${pad2(month)}-01 00:00:00`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${pad2(month)}-${pad2(lastDay)} 23:59:59`;
  const todayStr = fmtYMD(now);

  let bawahan = null;
  let attendances = [];
  let leaves = [];

  try {
    const [empList, attList, leaveList] = await Promise.all([
      odooExecuteKw('hr.employee', 'search_read', [[['id', '=', Number(bawahanId)]]], {
        fields: ['id', 'name', 'job_id', 'department_id', 'barcode', 'pin'],
        limit: 1,
      }),
      odooExecuteKw('hr.attendance', 'search_read', [
        [
          ['employee_id', '=', Number(bawahanId)],
          ['check_in', '>=', startDate],
          ['check_in', '<=', endDate],
        ],
      ], {
        fields: ['check_in', 'check_out'],
        limit: 100,
      }),
      odooExecuteKw('hr.leave', 'search_read', [
        [
          ['employee_id', '=', Number(bawahanId)],
          ['state', '=', 'validate'],
          ['date_from', '<=', endDate],
          ['date_to', '>=', startDate],
        ],
      ], {
        fields: ['holiday_status_id', 'date_from', 'date_to', 'name'],
        limit: 50,
      }),
    ]);

    if (empList && empList[0]) {
      const e = empList[0];
      bawahan = {
        id: e.id,
        nama: e.name,
        nip: e.barcode || e.pin || String(e.id),
        jabatan: Array.isArray(e.job_id) ? e.job_id[1] : (e.job_id || 'Staff'),
        departemen: Array.isArray(e.department_id) ? e.department_id[1] : (e.department_id || ''),
      };
    }
    attendances = attList || [];
    leaves = leaveList || [];
  } catch {
    // fallback
  }

  const attMap = {};
  for (const a of attendances) {
    const inD = utcToWib(a.check_in);
    if (inD) {
      const dStr = fmtYMD(inD);
      attMap[dStr] = a;
    }
  }

  const summary = { H: 0, H_TP: 0, T: 0, PA: 0, A: 0, I: 0, S: 0, C: 0, D: 0 };
  const kalender = [];

  for (let day = 1; day <= lastDay; day++) {
    const dateStr = `${year}-${pad2(month)}-${pad2(day)}`;
    const dObj = new Date(year, month - 1, day);
    const dayOfWeek = dObj.getDay();
    const isToday = dateStr === todayStr;
    const isFuture = dateStr > todayStr;
    const att = attMap[dateStr];

    const lv = leaves.find((l) => {
      const fStr = (l.date_from || '').slice(0, 10);
      const tStr = (l.date_to || '').slice(0, 10);
      return dateStr >= fStr && dateStr <= tStr;
    });

    let kode = 'L';
    let label = 'Hari Libur';
    let deskripsi = null;
    let detail_absensi = null;

    if (att) {
      const inD = utcToWib(att.check_in);
      const outD = utcToWib(att.check_out);
      if (outD) {
        kode = 'H';
        label = 'Hadir Tepat Waktu';
        summary.H++;
      } else {
        kode = 'H-TP';
        label = 'Hadir (Belum Pulang)';
        summary.H_TP++;
      }
      detail_absensi = {
        jam_masuk: fmtHM(inD),
        jam_pulang: fmtHM(outD),
        shift: 'Shift Regular',
        status_masuk: 'tepat_waktu',
        menit_terlambat: 0,
        status_pulang: outD ? 'normal' : null,
        menit_pulang_cepat: 0,
      };
    } else if (lv) {
      const hId = Array.isArray(lv.holiday_status_id) ? lv.holiday_status_id[0] : lv.holiday_status_id;
      if (hId === 1) {
        kode = 'C';
        label = 'Cuti Tahunan';
        summary.C++;
      } else if (hId === 2) {
        kode = 'S';
        label = 'Sakit';
        summary.S++;
      } else if (hId === 3) {
        kode = 'D';
        label = 'Dinas Luar Kota';
        summary.D++;
      } else {
        kode = 'I';
        label = 'Izin / Dispensasi';
        summary.I++;
      }
      deskripsi = lv.name || label;
    } else if (dayOfWeek === 0 || dayOfWeek === 6) {
      kode = 'L';
      label = 'Hari Libur';
    } else if (isFuture) {
      kode = '-';
      label = 'Mendatang';
    } else {
      kode = 'A';
      label = 'Alpa / Tidak Hadir';
      summary.A++;
    }

    const style = KODE_STYLE[kode] || KODE_STYLE['-'];

    kalender.push({
      tanggal: dateStr,
      hari: pad2(day),
      nama_hari: NAMA_HARI[dayOfWeek],
      is_today: isToday,
      is_future: isFuture,
      kode,
      label: style.label || label,
      warna_bg: style.warna_bg,
      warna_border: style.warna_border,
      warna_teks: style.warna_teks,
      detail_absensi,
      deskripsi,
    });
  }

  return {
    success: true,
    bawahan: bawahan || { id: Number(bawahanId), nama: 'Bawahan', nip: '', jabatan: 'Staff', departemen: '' },
    summary,
    kalender,
  };
}

// ---------------------------------------------------------------------------
// 2. Reimbursement
// ---------------------------------------------------------------------------
export async function getReimbursementJenis() {
  try {
    const res = await odooCall('/reimbursement/jenis', {});
    const rawList = res?.data || [];
    const data = rawList.map((p) => ({
      id: p.id,
      kode: p.code || p.id,
      kode_jenis: p.code || p.id,
      nama: p.name || p.display_name,
      nama_jenis: p.name || p.display_name,
      wajib_bukti_nota: p.wajib_bukti_nota || false,
      maksimal_klaim: p.maksimal_klaim || null,
    }));
    return { success: true, data };
  } catch {
    return {
      success: true,
      data: [
        { id: 'transport', kode: 'transport', kode_jenis: 'transport', nama: 'Transport / Bensin', nama_jenis: 'Transport / Bensin', wajib_bukti_nota: true, maksimal_klaim: null },
        { id: 'medical', kode: 'medical', kode_jenis: 'medical', nama: 'Kesehatan / Medis', nama_jenis: 'Kesehatan / Medis', wajib_bukti_nota: true, maksimal_klaim: null },
        { id: 'meal', kode: 'meal', kode_jenis: 'meal', nama: 'Konsumsi / Meal', nama_jenis: 'Konsumsi / Meal', wajib_bukti_nota: true, maksimal_klaim: null },
        { id: 'operational', kode: 'operational', kode_jenis: 'operational', nama: 'Operasional Lainnya', nama_jenis: 'Operasional Lainnya', wajib_bukti_nota: false, maksimal_klaim: null },
      ],
    };
  }
}

export async function getReimbursement() {
  let list = [];

  try {
    const res = await odooCall('/reimbursement/list', {});
    const rawList = res?.data?.reimbursements || res?.data?.list || [];

    const catMap = {
      transport: 'Transport / Bensin',
      medical: 'Kesehatan / Medis',
      meal: 'Konsumsi / Meal',
      operational: 'Operasional Lainnya',
    };

    const stateMap = {
      draft: 'menunggu',
      submitted: 'menunggu',
      approved: 'disetujui',
      rejected: 'ditolak',
      paid: 'dicairkan',
      diajukan: 'menunggu',
      cancelled: 'ditolak',
    };

    list = rawList.map((r) => {
      const rawState = r.state || r.code || 'diajukan';
      const st = stateMap[rawState] || rawState;
      const labelState = st === 'disetujui' ? 'Disetujui' : (st === 'dicairkan' ? 'Dicairkan' : (st === 'ditolak' ? 'Ditolak' : 'Menunggu Approval'));

      // product_id bisa tuple [id, nama] atau string kategori
      let namaJenis = 'Klaim Operasional';
      if (Array.isArray(r.product_id)) namaJenis = r.product_id[1] || r.product_id[0];
      else if (typeof r.product_id === 'string') namaJenis = catMap[r.product_id] || r.product_id;
      else namaJenis = r.nama_jenis || namaJenis;

      return {
        id: r.id,
        nomor_pengajuan: r.name || `RMB-${r.id}`,
        nama_jenis: namaJenis,
        tanggal_kuitansi: r.expense_date || '',
        nominal: r.total_amount || r.total || 0,
        nominal_format: `Rp ${(r.total_amount || r.total || 0).toLocaleString('id-ID')}`,
        nominal_disetujui: r.approved_amount || r.nominal_disetujui || null,
        nominal_disetujui_format: r.approved_amount || r.nominal_disetujui ? `Rp ${Number(r.approved_amount || r.nominal_disetujui).toLocaleString('id-ID')}` : null,
        // Odoo mirrors name → description when user left it empty; strip that fallback
        keterangan: (r.description === r.name ? '' : r.description) || '',
        status: st,
        dokumen_nota_url: r.attachment ? `data:image/jpeg;base64,${r.attachment}` : null,
        approval: {
          step_current: 1,
          step_total: 1,
          status_label: labelState,
        },
      };
    });
  } catch {
    const cached = JSON.parse(localStorage.getItem('mobile_absensi_reimbursement') || '[]');
    list = cached;
  }

  const total_diajukan = list.reduce((sum, item) => sum + (Number(item.nominal) || 0), 0);
  const total_disetujui = list
    .filter((i) => i.status === 'disetujui' || i.status === 'dicairkan')
    .reduce((sum, item) => sum + (Number(item.nominal_disetujui || item.nominal) || 0), 0);
  const menunggu_count = list.filter((i) => i.status === 'menunggu').length;

  return {
    success: true,
    data: list,
    summary: {
      total_diajukan,
      total_diajukan_format: `Rp ${total_diajukan.toLocaleString('id-ID')}`,
      total_disetujui,
      total_disetujui_format: `Rp ${total_disetujui.toLocaleString('id-ID')}`,
      menunggu_count,
    },
  };
}
export async function ajukanReimbursement(payload) {
  let jenis = 'operational';
  let tanggal = fmtYMD(getServerDate());
  let nominal = 0;
  let keterangan = '';
  let docBase64 = null;
  let docName = 'nota.jpg';
  // Nama file deskriptif: {product}-{employee}-{date}.jpg
  const empNama = (payload?.employee_name || '').trim().replace(/\s+/g, '_') || 'unknown';
  const jenisLabel = (payload?.jenis_label || payload?.reimbursement_jenis_id || 'operational').replace(/\s+/g, '_');
  docName = `${jenisLabel}_${empNama}_${tanggal}.jpg`;

  if (payload instanceof FormData) {
    jenis = payload.get('reimbursement_jenis_id') || 'operational';
    tanggal = payload.get('tanggal_kuitansi') || tanggal;
    nominal = parseFloat(payload.get('nominal') || 0);
    keterangan = payload.get('keterangan') || '';
    const doc = payload.get('dokumen');
    if (doc && doc.size > 0) {
      // docName already set above with descriptive format
      docBase64 = await fileToBase64(doc);
    }
  } else if (payload && typeof payload === 'object') {
    jenis = payload.reimbursement_jenis_id || 'operational';
    tanggal = payload.tanggal_kuitansi || tanggal;
    nominal = parseFloat(payload.nominal || 0);
    keterangan = payload.keterangan || '';
    if (payload.dokumen instanceof File) {
      // docName already set above with descriptive format
      docBase64 = await fileToBase64(payload.dokumen);
    } else if (typeof payload.dokumen === 'string') {
      docBase64 = stripDataUrl(payload.dokumen);
    }
  }

  try {
    await odooCall('/reimbursement/submit', {
      name: `RMB-${tanggal}`,
      amount: nominal,
      product_id: jenis,
      date: tanggal,
      description: keterangan,
      attachment: docBase64,
      filename: docName,
    });
  } catch {
    const cached = JSON.parse(localStorage.getItem('mobile_absensi_reimbursement') || '[]');
    cached.unshift({
      id: Date.now(),
      nomor_pengajuan: `RMB-${Date.now()}`,
      nama_jenis: jenis,
      tanggal_kuitansi: tanggal,
      nominal,
      nominal_format: `Rp ${nominal.toLocaleString('id-ID')}`,
      nominal_disetujui: null,
      nominal_disetujui_format: null,
      keterangan,
      status: 'menunggu',
      dokumen_nota_url: docBase64 ? `data:image/jpeg;base64,${docBase64}` : null,
      approval: { step_current: 1, step_total: 1, status_label: 'Menunggu Approval' },
    });
    localStorage.setItem('mobile_absensi_reimbursement', JSON.stringify(cached));
  }

  return { success: true, message: 'Pengajuan klaim reimbursement berhasil dikirim.' };
}

export async function approveReimbursement(sheetId, action, reason) {
  const aksi = action === 'tolak' ? 'refuse' : 'approve';
  await odooCall('/reimbursement/approve', {
    sheet_id: sheetId,
    action: aksi,
    ...(reason ? { reason } : {}),
  });
  return { success: true, message: action === 'tolak' ? 'Pengajuan reimbursement ditolak.' : 'Persetujuan klaim reimbursement berhasil diproses.' };
}

export async function getReimbursementDetail(id) {
  const listRes = await getReimbursement();
  const item = (listRes.data || []).find((r) => String(r.id) === String(id));
  if (!item) throw new Error('Pengajuan reimbursement tidak ditemukan.');
  return { success: true, data: item };
}

// ---------------------------------------------------------------------------
// 3. Tukar Shift
// ---------------------------------------------------------------------------
export async function getTukarShiftCount() {
  const res = await getTukarShiftRiwayat();
  return { success: true, count: res.data?.pending_masuk_count || 0 };
}

export async function getTukarShiftInisiasi() {
  const user = getStoredUser();
  const empId = user?._odoo_employee?.id || user?.id || 1;
  let rekanList = [];

  try {
    const emps = await odooExecuteKw('hr.employee', 'search_read', [[['id', '!=', empId]]], {
      fields: ['id', 'name', 'job_id', 'department_id'],
      limit: 50,
    });
    rekanList = (emps || []).map((e) => ({
      id: e.id,
      nama_lengkap: e.name,
      jabatan: Array.isArray(e.job_id) ? e.job_id[1] : (e.job_id || 'Staff'),
      departemen: Array.isArray(e.department_id) ? e.department_id[1] : (e.department_id || ''),
    }));
  } catch {
    rekanList = [
      { id: 901, nama_lengkap: 'Budi Santoso', jabatan: 'Operator Lapangan', departemen: 'Operasional' },
      { id: 902, nama_lengkap: 'Siti Rahmawati', jabatan: 'Staff Administrasi', departemen: 'HR & GA' },
      { id: 903, nama_lengkap: 'Ahmad Fauzi', jabatan: 'Teknisi Support', departemen: 'IT' },
    ];
  }

  const jadwalPengaju = generate14DaysSchedule(100);
  const riwayat = await getTukarShiftRiwayat();

  return {
    success: true,
    data: {
      rekan_list: rekanList,
      jadwal_pengaju: jadwalPengaju,
      pending_masuk_count: riwayat.data?.pending_masuk_count || 0,
    },
  };
}

export async function getTukarShiftJadwalRekan(rekanId) {
  const jadwal = generate14DaysSchedule(Number(rekanId) * 100);
  return {
    success: true,
    data: { jadwal },
  };
}

export async function ajukanTukarShift(payload) {
  const user = getStoredUser();
  const empId = user?._odoo_employee?.id || user?.id || 1;
  const store = getTukarShiftStore();

  const mySchedule = generate14DaysSchedule(100);
  const rekanSchedule = generate14DaysSchedule(Number(payload.pegawai_tujuan_id) * 100);

  const shiftPengaju = mySchedule.find((s) => s.id === payload.penjadwalan_pengaju_id) || mySchedule[0];
  const shiftTujuan = rekanSchedule.find((s) => s.id === payload.penjadwalan_tujuan_id) || rekanSchedule[1];

  let rekan = { nama_lengkap: 'Rekan Kerja', jabatan: 'Staff', departemen: 'Divisi' };
  try {
    const rList = await odooExecuteKw('hr.employee', 'search_read', [[['id', '=', payload.pegawai_tujuan_id]]], {
      fields: ['id', 'name', 'job_id', 'department_id'],
      limit: 1,
    });
    if (rList && rList[0]) {
      rekan = {
        nama_lengkap: rList[0].name,
        jabatan: Array.isArray(rList[0].job_id) ? rList[0].job_id[1] : (rList[0].job_id || 'Staff'),
        departemen: Array.isArray(rList[0].department_id) ? rList[0].department_id[1] : (rList[0].department_id || ''),
      };
    }
  } catch {
    // fallback
  }

  const newItem = {
    id: Date.now(),
    kode_pengajuan: `TS-${Date.now().toString().slice(-6)}`,
    pengaju_id: empId,
    pegawai_tujuan_id: payload.pegawai_tujuan_id,
    rekan,
    status: 'menunggu_rekan',
    status_label: 'Menunggu Rekan',
    alasan: payload.alasan,
    catatan_rekan: null,
    shift_pengaju: {
      hari: shiftPengaju.hari,
      tanggal_formatted: shiftPengaju.tanggal_formatted,
      label: `${shiftPengaju.nama_shift} (${shiftPengaju.jam_masuk}-${shiftPengaju.jam_pulang})`,
      is_hari_libur: shiftPengaju.is_hari_libur,
    },
    shift_tujuan: {
      hari: shiftTujuan.hari,
      tanggal_formatted: shiftTujuan.tanggal_formatted,
      label: `${shiftTujuan.nama_shift} (${shiftTujuan.jam_masuk}-${shiftTujuan.jam_pulang})`,
      is_hari_libur: shiftTujuan.is_hari_libur,
    },
    created_at: new Date().toISOString(),
  };

  store.unshift(newItem);
  setTukarShiftStore(store);

  try {
    await odooExecuteKw('ess.shift.change', 'create', [{
      employee_id: empId,
      colleague_id: payload.pegawai_tujuan_id,
      reason: payload.alasan,
    }]);
  } catch {
    // non-blocking
  }

  return { success: true, message: 'Pengajuan tukar shift berhasil dikirim ke rekan kerja!' };
}

export async function getTukarShiftRiwayat() {
  const user = getStoredUser();
  const empId = user?._odoo_employee?.id || user?.id || 1;
  const store = getTukarShiftStore();

  const permintaan_masuk = store.filter((s) => s.pegawai_tujuan_id === empId);
  const pengajuan_saya = store.filter((s) => s.pengaju_id === empId);
  const pending_masuk_count = permintaan_masuk.filter((s) => s.status === 'menunggu_rekan').length;

  return {
    success: true,
    data: {
      permintaan_masuk,
      pengajuan_saya,
      pending_masuk_count,
    },
  };
}

export async function responTukarShift(id, aksi, catatan) {
  const store = getTukarShiftStore();
  const item = store.find((s) => s.id === Number(id));
  if (item) {
    item.status = aksi === 'setuju' ? 'disetujui' : 'ditolak';
    item.status_label = aksi === 'setuju' ? 'Disetujui Rekan' : 'Ditolak Rekan';
    item.catatan_rekan = catatan;
    setTukarShiftStore(store);
  }
  return {
    success: true,
    message: `Permintaan tukar shift berhasil di${aksi === 'setuju' ? 'setujui' : 'tolak'}.`,
  };
}

export async function batalkanTukarShift(id) {
  const store = getTukarShiftStore();
  const item = store.find((s) => s.id === Number(id));
  if (item) {
    item.status = 'dibatalkan';
    item.status_label = 'Dibatalkan';
    setTukarShiftStore(store);
  }
  return { success: true, message: 'Pengajuan tukar shift berhasil dibatalkan.' };
}

// ---------------------------------------------------------------------------
// 4. Penugasan Dinas
// ---------------------------------------------------------------------------
export async function getDinas() {
  const user = getStoredUser();
  const empId = user?._odoo_employee?.id || user?.id;
  let list = [];

  try {
    const leaves = await odooExecuteKw('hr.leave', 'search_read', [
      [
        ['holiday_status_id', '=', 3],
        ...(empId ? [['employee_id', '=', empId]] : []),
      ],
    ], {
      fields: ['id', 'name', 'date_from', 'date_to', 'state', 'number_of_days'],
      order: 'id desc',
    });

    const stateMap = {
      confirm: 'menunggu',
      validate1: 'menunggu',
      validate: 'disetujui',
      refuse: 'ditolak',
      cancel: 'ditolak',
      draft: 'menunggu',
    };

    list = (leaves || []).map((l) => {
      const fromD = utcToWib(l.date_from);
      const toD = utcToWib(l.date_to);
      return {
        id: l.id,
        kota_tujuan: (l.name || '').split('-')[0]?.trim() || 'Dinas Luar Kota',
        instansi_tujuan: (l.name || '').split('-')[1]?.trim() || 'Klien / Mitra Perusahaan',
        tanggal_mulai: fromD ? fmtTanggalId(fromD) : (l.date_from ? l.date_from.slice(0, 10) : ''),
        tanggal_selesai: toD ? fmtTanggalId(toD) : (l.date_to ? l.date_to.slice(0, 10) : ''),
        anggaran_biaya_formatted: 'Ditanggung Perusahaan',
        keperluan: l.name || 'Perjalanan Dinas',
        status: stateMap[l.state] || 'menunggu',
        dokumen_url: null,
      };
    });
  } catch {
    // fallback
  }

  const cached = JSON.parse(localStorage.getItem('mobile_absensi_dinas') || '[]');
  list = [...cached, ...list];
  return { success: true, dinas: list };
}

export async function ajukanDinas(payload) {
  const user = getStoredUser();
  const empId = user?._odoo_employee?.id || user?.id;

  let kota = '';
  let instansi = '';
  let keperluan = '';
  let tglMulai = fmtYMD(getServerDate());
  let tglSelesai = fmtYMD(getServerDate());
  let anggaran = 0;
  let docUrl = null;

  if (payload instanceof FormData) {
    kota = payload.get('kota_tujuan') || '';
    instansi = payload.get('instansi_tujuan') || '';
    keperluan = payload.get('keperluan') || '';
    tglMulai = payload.get('tanggal_mulai') || tglMulai;
    tglSelesai = payload.get('tanggal_selesai') || tglSelesai;
    anggaran = parseFloat(payload.get('anggaran_biaya') || 0);
    const doc = payload.get('dokumen');
    if (doc && doc.size > 0) {
      docUrl = URL.createObjectURL(doc);
    }
  } else if (payload && typeof payload === 'object') {
    kota = payload.kota_tujuan || '';
    instansi = payload.instansi_tujuan || '';
    keperluan = payload.keperluan || '';
    tglMulai = payload.tanggal_mulai || tglMulai;
    tglSelesai = payload.tanggal_selesai || tglSelesai;
    anggaran = parseFloat(payload.anggaran_biaya || 0);
  }

  const nameDesc = `${kota} - ${instansi}: ${keperluan}`;

  try {
    await odooExecuteKw('hr.leave', 'create', [{
      employee_id: empId,
      holiday_status_id: 3,
      date_from: `${tglMulai} 08:00:00`,
      date_to: `${tglSelesai} 17:00:00`,
      name: nameDesc,
    }]);
  } catch {
    const cached = JSON.parse(localStorage.getItem('mobile_absensi_dinas') || '[]');
    cached.unshift({
      id: Date.now(),
      kota_tujuan: kota,
      instansi_tujuan: instansi,
      tanggal_mulai: tglMulai,
      tanggal_selesai: tglSelesai,
      anggaran_biaya_formatted: anggaran > 0 ? `Rp ${anggaran.toLocaleString('id-ID')}` : 'Ditanggung Perusahaan',
      keperluan,
      status: 'menunggu',
      dokumen_url: docUrl,
    });
    localStorage.setItem('mobile_absensi_dinas', JSON.stringify(cached));
  }

  return { success: true, message: 'Pengajuan dinas berhasil dikirim.' };
}

// ---------------------------------------------------------------------------
// 5. Denda & Tata Tertib
// ---------------------------------------------------------------------------
export async function getDenda() {
  return {
    success: true,
    aturan_denda_masuk: [
      { id: 1, rentang: '1 - 15 Menit', keterangan: 'Toleransi keterlambatan ringan', nominal_formatted: 'Rp 10.000' },
      { id: 2, rentang: '16 - 30 Menit', keterangan: 'Keterlambatan sedang', nominal_formatted: 'Rp 25.000' },
      { id: 3, rentang: '> 30 Menit', keterangan: 'Keterlambatan berat tanpa izin', nominal_formatted: 'Rp 50.000' },
    ],
    aturan_denda_pulang: [
      { id: 1, rentang: '1 - 15 Menit', keterangan: 'Pulang awal sebelum jam shift usai', nominal_formatted: 'Rp 15.000' },
      { id: 2, rentang: '> 15 Menit', keterangan: 'Meninggalkan shift kerja tanpa izin atasan', nominal_formatted: 'Rp 50.000' },
    ],
  };
}
// ---------------------------------------------------------------------------
// 6. Pusat Kendala & Masalah
// ---------------------------------------------------------------------------
export async function getMasalah() {
  const raw = localStorage.getItem('mobile_absensi_masalah');
  let list = raw ? JSON.parse(raw) : null;
  if (!list) {
    list = [
      {
        id: 1,
        nomor_tiket: 'TKT-202610-001',
        kategori_masalah: 'gagal_absen_masuk',
        label_kategori: 'Gagal Absen Masuk',
        judul: 'Kamera tidak mendeteksi wajah di lokasi kantor',
        tanggal_kejadian: '2026-10-15',
        tanggal_kejadian_teks: '15 Okt 2026',
        jam_kejadian: '08:05',
        deskripsi: 'Pencahayaan redup di pintu gerbang menyebabkan face enrollment timeout.',
        foto_bukti_url: null,
        status: 'selesai',
        tindakan_admin: 'koreksi_absensi',
        tindakan_admin_label: 'Koreksi Absensi',
        catatan_admin: 'Sudah disesuaikan jam masuk oleh HRD.',
        created_at: '2026-10-15 08:30:00',
      },
    ];
    localStorage.setItem('mobile_absensi_masalah', JSON.stringify(list));
  }
  return { success: true, masalah: list };
}

export async function ajukanMasalah(payload) {
  let kategori = 'gagal_absen_masuk';
  let judul = '';
  let tgl = fmtYMD(getServerDate());
  let jam = '';
  let deskripsi = '';
  let fotoUrl = null;

  if (payload instanceof FormData) {
    kategori = payload.get('kategori_masalah') || kategori;
    judul = payload.get('judul') || '';
    tgl = payload.get('tanggal_kejadian') || tgl;
    jam = payload.get('jam_kejadian') || '';
    deskripsi = payload.get('deskripsi') || '';
    const file = payload.get('foto_bukti');
    if (file && file.size > 0) {
      fotoUrl = URL.createObjectURL(file);
    }
  } else if (payload && typeof payload === 'object') {
    kategori = payload.kategori_masalah || kategori;
    judul = payload.judul || '';
    tgl = payload.tanggal_kejadian || tgl;
    jam = payload.jam_kejadian || '';
    deskripsi = payload.deskripsi || '';
  }

  const catMap = {
    gagal_absen_masuk: 'Gagal Absen Masuk',
    gagal_absen_pulang: 'Gagal Absen Pulang',
    gps_tidak_akurat: 'GPS Tidak Akurat',
    sistem_error: 'Sistem / Aplikasi Error',
    lainnya: 'Kendala Lainnya',
  };

  const listRes = await getMasalah();
  const list = listRes.masalah || [];

  const newItem = {
    id: Date.now(),
    nomor_tiket: `TKT-${tgl.replace(/-/g, '').slice(0, 6)}-${pad2(list.length + 1)}`,
    kategori_masalah: kategori,
    label_kategori: catMap[kategori] || 'Kendala Presensi',
    judul,
    tanggal_kejadian: tgl,
    tanggal_kejadian_teks: fmtTanggalId(utcToWib(`${tgl} 00:00:00`)) || tgl,
    jam_kejadian: jam,
    deskripsi,
    foto_bukti_url: fotoUrl,
    status: 'menunggu',
    tindakan_admin: null,
    tindakan_admin_label: null,
    catatan_admin: null,
    created_at: fmtYMD(getServerDate()),
  };

  list.unshift(newItem);
  localStorage.setItem('mobile_absensi_masalah', JSON.stringify(list));
  return { success: true, message: 'Laporan kendala absensi berhasil dikirim.', data: newItem };
}

export async function getMasalahDetail(id) {
  const listRes = await getMasalah();
  const item = (listRes.masalah || []).find((m) => String(m.id) === String(id));
  if (!item) throw new Error('Tiket kendala tidak ditemukan.');
  return { success: true, data: item };
}

// ---------------------------------------------------------------------------
// 7. Penugasan
// ---------------------------------------------------------------------------
export async function getPenugasan() {
  const raw = localStorage.getItem('mobile_absensi_penugasan');
  let list = raw ? JSON.parse(raw) : null;
  if (!list) {
    list = [
      {
        id: 1,
        judul: 'Inspeksi Pemeliharaan Perangkat',
        deskripsi: 'Pemeriksaan rutin kelayakan operasional scanner absensi dan perangkat fingerprint cabang.',
        tenggat_waktu: '25 Okt 2026',
        status: 'berjalan',
        prioritas: 'tinggi',
        pemberi_tugas: 'Manager Operasional',
        progres: 40,
      },
    ];
    localStorage.setItem('mobile_absensi_penugasan', JSON.stringify(list));
  }
  const total_semua = list.length;
  const total_berjalan = list.filter((p) => p.status === 'berjalan').length;
  const total_selesai = list.filter((p) => p.status === 'selesai').length;
  return {
    success: true,
    penugasan: list,
    statistik: { total_semua, total_berjalan, total_selesai },
  };
}

export async function getPenugasanDetail(id) {
  const res = await getPenugasan();
  const item = (res.penugasan || []).find((p) => String(p.id) === String(id));
  if (!item) throw new Error('Penugasan tidak ditemukan.');
  return { success: true, penugasan: item };
}

export async function updateStatusPenugasan(id, payload) {
  const res = await getPenugasan();
  const list = res.penugasan || [];
  const idx = list.findIndex((p) => String(p.id) === String(id));
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...(payload || {}) };
    localStorage.setItem('mobile_absensi_penugasan', JSON.stringify(list));
  }
  return { success: true, message: 'Status penugasan berhasil diperbarui.' };
}
// ---------------------------------------------------------------------------
// 8. KPI, Dokumen, Profil
// ---------------------------------------------------------------------------
export async function getKpiTerbaru() {
  return {
    success: true,
    kpi: {
      nilai_akhir: 92.4,
      grade: 'A',
      status: 'Sangat Baik',
      periode: 'Q3 2026',
      pencapaian: [
        { indikator: 'Kedisiplinan Presensi Tepat Waktu', target: '95%', capaian: '98%', skor: 98 },
        { indikator: 'Penyelesaian Tugas Roster & Shift', target: '100%', capaian: '100%', skor: 100 },
        { indikator: 'Responsivitas Penugasan Lapangan', target: '90%', capaian: '88%', skor: 88 },
      ],
    },
  };
}

export async function getDokumenPreview() {
  return {
    success: true,
    dokumen_url: null,
    message: 'Dokumen belum dilampirkan atau format pratinjau belum didukung.',
  };
}

export async function updateFotoProfil(formData) {
  let fotoUrl = null;
  const file = formData instanceof FormData ? formData.get('foto_profil') : null;
  if (file && file.size > 0) {
    fotoUrl = await fileToBase64(file);
    const user = getStoredUser();
    if (user) {
      user.foto_profil = `data:image/jpeg;base64,${fotoUrl}`;
      setStoredUser(user);
    }
  }
  return { success: true, foto_url: fotoUrl, message: 'Foto profil berhasil diperbarui.' };
}

export async function changePassword({ password_baru }) {
  if (!password_baru || password_baru.length < 6) {
    throw new Error('Kata sandi baru minimal 6 karakter.');
  }
  setRpcPass(password_baru);
  return { success: true, message: 'Kata sandi berhasil diubah.' };
}

// ---------------------------------------------------------------------------
// 9. Employee Directory & Dynamic Calendar Shift Schedule
// ---------------------------------------------------------------------------
export async function getDaftarKaryawan() {
  try {
    const res = await odooCall('/employee/list', { limit: 100 });
    const employees = (res && res.data && res.data.employees) || [];
    const list = employees.map((e) => {
      const nameParts = (e.name || '').trim().split(/\s+/).filter(Boolean);
      const inisial = nameParts.length > 1
        ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
        : (nameParts[0] ? nameParts[0].slice(0, 2).toUpperCase() : 'K');
      // photo may already be data: URL or raw base64
      const foto = e.photo
        ? (e.photo.startsWith('data:') ? e.photo : `data:image/png;base64,${e.photo}`)
        : null;
      const employeeId = e.barcode || e.pin || `#${e.id}`;
      const jabatan = e.job && Array.isArray(e.job) ? e.job[1] : (e.job && e.job.name) || 'Staff';
      const departemen = e.department && Array.isArray(e.department) ? e.department[1] : (e.department && e.department.name) || '';
      return {
        id: e.id,
        nama: e.name,
        inisial,
        employee_id: employeeId,
        jabatan,
        departemen,
        foto,
        work_email: e.work_email || '',
        work_phone: e.work_phone || '',
        manager: e.manager,
        mobile_phone: e.mobile_phone || '',
      };
    });
    list.sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));
    return { success: true, data: list };
  } catch (err) {
    console.error('getDaftarKaryawan error:', err);
    return { success: false, data: [], message: err.message || 'Gagal memuat daftar karyawan' };
  }
}
export async function getJadwalKerjaOdoo(customEmp) {
  const now = getServerDate();
  const jsDay = now.getDay();
  const odooDay = String((jsDay + 6) % 7); // Mon(1)->'0', Tue(2)->'1', ..., Sun(0)->'6'
  const isWeekend = jsDay === 0 || jsDay === 6;

  try {
    const emp = customEmp || await getCurrentEmployee();
    const calendarId = Array.isArray(emp?.resource_calendar_id)
      ? emp.resource_calendar_id[0]
      : emp?.resource_calendar_id;
    const calendarName = Array.isArray(emp?.resource_calendar_id)
      ? emp.resource_calendar_id[1]
      : (emp?.resource_calendar_id ? 'Jadwal Standar' : 'Reguler');

    if (calendarId) {
      const lines = await odooExecuteKw('resource.calendar.attendance', 'search_read', [
        [
          ['calendar_id', '=', calendarId],
          ['dayofweek', '=', odooDay],
        ],
      ], {
        fields: ['name', 'dayofweek', 'hour_from', 'hour_to', 'day_period'],
        limit: 10,
      });

      if (lines && lines.length > 0) {
        const minFrom = Math.min(...lines.map((l) => l.hour_from));
        const maxTo = Math.max(...lines.map((l) => l.hour_to));

        const toHM = (num) => {
          const h = Math.floor(num);
          const m = Math.round((num - h) * 60);
          return `${pad2(h)}:${pad2(m)}`;
        };

        const jamMasuk = toHM(minFrom);
        const jamPulang = toHM(maxTo);

        const earlyH = Math.max(0, Math.floor(minFrom) - 1);
        const earlyM = Math.round((minFrom - Math.floor(minFrom)) * 60);
        const jamAwalMasuk = `${pad2(earlyH)}:${pad2(earlyM)}`;

        const lateH = Math.min(23, Math.floor(minFrom) + 1);
        const lateM = Math.round((minFrom - Math.floor(minFrom)) * 60);
        const jamAkhirMasuk = `${pad2(lateH)}:${pad2(lateM)}`;

        const endLateH = Math.min(23, Math.floor(maxTo) + 1);
        const endLateM = Math.round((maxTo - Math.floor(maxTo)) * 60);
        const jamAkhirPulang = `${pad2(endLateH)}:${pad2(endLateM)}`;

        return {
          id: calendarId,
          nama: calendarName,
          nama_shift: calendarName,
          jam_masuk: jamMasuk,
          jam_pulang: jamPulang,
          jam_awal_masuk: jamAwalMasuk,
          jam_akhir_masuk: jamAkhirMasuk,
          jam_awal_pulang: jamPulang,
          jam_akhir_pulang: jamAkhirPulang,
          is_hari_libur: false,
          is_today: true,
          tanggal: fmtYMD(now),
          tanggal_formatted: fmtTanggalId(now),
          hari: NAMA_HARI[jsDay],
          toleransi_menit: 15,
        };
      } else {
        return {
          id: calendarId,
          nama: calendarName,
          nama_shift: `${calendarName} (Day Off)`,
          jam_masuk: '-',
          jam_pulang: '-',
          jam_awal_masuk: '-',
          jam_akhir_masuk: '-',
          jam_awal_pulang: '-',
          jam_akhir_pulang: '-',
          is_hari_libur: true,
          is_today: true,
          tanggal: fmtYMD(now),
          tanggal_formatted: fmtTanggalId(now),
          hari: NAMA_HARI[jsDay],
          toleransi_menit: 0,
        };
      }
    }
  } catch (err) {
    console.warn('getJadwalKerjaOdoo error:', err);
  }

  return {
    id: 1,
    nama: 'Reguler',
    nama_shift: isWeekend ? 'Libur (Day Off)' : 'Reguler',
    jam_masuk: isWeekend ? '-' : '08:00',
    jam_pulang: isWeekend ? '-' : '17:00',
    jam_awal_masuk: isWeekend ? '-' : '07:00',
    jam_akhir_masuk: isWeekend ? '-' : '09:00',
    jam_awal_pulang: isWeekend ? '-' : '17:00',
    jam_akhir_pulang: isWeekend ? '-' : '18:00',
    is_hari_libur: isWeekend,
    is_today: true,
    tanggal: fmtYMD(now),
    tanggal_formatted: fmtTanggalId(now),
    hari: NAMA_HARI[jsDay],
    toleransi_menit: 15,
  };
}

export async function getCalendarScheduleDetails(customEmp) {
  try {
    const emp = customEmp || await getCurrentEmployee();
    const calendarId = Array.isArray(emp?.resource_calendar_id)
      ? emp.resource_calendar_id[0]
      : emp?.resource_calendar_id;

    if (!calendarId) return null;

    const lines = await odooExecuteKw('resource.calendar.attendance', 'search_read', [
      [['calendar_id', '=', calendarId]],
    ], {
      fields: ['name', 'dayofweek', 'hour_from', 'hour_to', 'day_period'],
      order: 'dayofweek asc, hour_from asc',
      limit: 50,
    });

    if (!lines || lines.length === 0) return null;

    const dayNames = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
    const activeDaysSet = new Set(lines.map((l) => Number(l.dayofweek)));

    const hari_kerja = [];
    const hari_libur = [];

    for (let i = 0; i < 7; i++) {
      if (activeDaysSet.has(i)) {
        hari_kerja.push(dayNames[i]);
      } else {
        hari_libur.push(dayNames[i]);
      }
    }

    const toHM = (num) => {
      const h = Math.floor(num);
      const m = Math.round((num - h) * 60);
      return `${pad2(h)}:${pad2(m)}`;
    };

    const daftar_shift = [];
    for (const d of activeDaysSet) {
      const dayLines = lines.filter((l) => Number(l.dayofweek) === d);
      const minFrom = Math.min(...dayLines.map((l) => l.hour_from));
      const maxTo = Math.max(...dayLines.map((l) => l.hour_to));
      daftar_shift.push({
        id: d + 1,
        nama: `Shift ${dayNames[d]}`,
        hari: dayNames[d],
        jam_masuk: toHM(minFrom),
        jam_pulang: toHM(maxTo),
        jam_awal_masuk: toHM(Math.max(0, minFrom - 1)),
        jam_akhir_pulang: toHM(Math.min(23, maxTo + 1)),
      });
    }

    return { hari_kerja, hari_libur, daftar_shift };
  } catch (e) {
    console.warn('getCalendarScheduleDetails error:', e);
    return null;
  }
}






