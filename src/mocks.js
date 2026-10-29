/**
 * Dispatcher mock lokal (VITE_USE_MOCK=true).
 *
 * Mengembalikan isi src/mocks/*.json tanpa network, sehingga aplikasi
 * bisa dijalankan/dites tanpa server Odoo. Dipakai oleh odooCall di
 * api.js saat USE_MOCK aktif. Login mock ditangani di api.login
 * (tidak lewat dispatcher ini).
 *
 * Kembalikan null bila path tidak punya mock -> pemanggil boleh
 * memutuskan fallback (mis. tetap error jaringan).
 */
import auth from './mocks/auth.json' with { type: 'json' };
import dashboard from './mocks/dashboard.json' with { type: 'json' };
import attendance from './mocks/attendance.json' with { type: 'json' };
import face from './mocks/face.json' with { type: 'json' };
import timeoff from './mocks/timeoff.json' with { type: 'json' };
import approvals from './mocks/approvals.json' with { type: 'json' };
import announcements from './mocks/announcements.json' with { type: 'json' };
import payslip from './mocks/payslip.json' with { type: 'json' };
import overtime from './mocks/overtime.json' with { type: 'json' };
import shift from './mocks/shift.json' with { type: 'json' };
import employee from './mocks/employee.json' with { type: 'json' };
import reimbursement from './mocks/reimbursement.json' with { type: 'json' };
import dinas from './mocks/dinas.json' with { type: 'json' };
import swap from './mocks/swap.json' with { type: 'json' };
import misc from './mocks/misc.json' with { type: 'json' };

const TABLE = {
  '/auth/me': auth.me,
  '/auth/logout': misc.logout,
  '/auth/change-password': misc.change_password,
  '/employee/profile': auth.profile,
  '/employee/photo': misc.logout,
  '/config/public': dashboard.config,
  '/server-time': dashboard.server_time,
  '/dashboard/summary': dashboard.summary,
  '/attendance/status': attendance.status,
  '/attendance/clock-in': attendance.clock_in,
  '/attendance/clock-out': attendance.clock_out,
  '/attendance/history': attendance.history,
  '/tracking/ping': attendance.tracking,
  '/face/enroll': face.enroll,
  '/face/status': face.status,
  '/timeoff/types': timeoff.types,
  '/timeoff/history': timeoff.history,
  '/timeoff/request': timeoff.request,
  '/approvals/inbox': approvals.inbox,
  '/approvals/act': approvals.act,
  '/announcement/list': announcements.list,
  '/payslip/list': payslip.list,
  '/payslip/detail': payslip.detail,
  '/overtime/history': overtime.history,
  '/overtime/request': overtime.request,
  '/shift/today': shift.today,
  '/shift/upcoming': shift.upcoming,
  '/employee/list': employee.list,
  '/subordinates/list': employee.subordinates,
  '/subordinates/month': employee.month,
  '/calendar/schedule': shift.calendar,
  '/reimbursement/jenis': reimbursement.jenis,
  '/reimbursement/list': reimbursement.list,
  '/reimbursement/detail': reimbursement.detail,
  '/reimbursement/submit': reimbursement.submit,
  '/reimbursement/approve': reimbursement.approve,
  '/dinas/list': dinas.list,
  '/dinas/request': dinas.request,
  '/swap/count': swap.count,
  '/swap/init': swap.init,
  '/swap/colleague-schedule': swap.colleague_schedule,
  '/swap/submit': swap.submit,
  '/swap/history': swap.history,
  '/swap/respond': swap.respond,
  '/swap/cancel': swap.cancel,
  '/denda/rules': misc.denda,
  '/issue/list': misc.issue_list,
  '/issue/detail': misc.issue_detail,
  '/issue/submit': misc.issue_submit,
  '/task/list': misc.task_list,
  '/task/detail': misc.task_detail,
  '/task/update-status': misc.task_update,
  '/kpi/latest': misc.kpi,
};

export function getMockResponse(path) {
  const hit = TABLE[path];
  if (!hit) return null;
  // Salinan dalam agar pemanggil tidak memutasi mock asli.
  return JSON.parse(JSON.stringify(hit));
}

export const MOCK_USER = auth.me.data.user;
export const MOCK_EMPLOYEE = auth.me.data.employee;
