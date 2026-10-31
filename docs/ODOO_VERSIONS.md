# Supported Odoo Versions & Porting Notes

This document answers the most common first question about this project: **which Odoo version does the mobile attendance app work with?**

## TL;DR

| Odoo version | Status |
| --- | --- |
| **Odoo 14** | ✅ Supported — the app is developed and tested against Odoo 14 |
| Odoo 15 / 16 / 17 | ⚠️ Not tested — expected to work only after the backend API module is ported and verified |
| Odoo 18 | 🚧 Not yet — a backend port is required first (see below; field notes from testing are being collected in this document) |

## How the app connects to Odoo

The mobile app itself is **not** where the version dependency lives. The app is a Capacitor (Android/iOS) client that only talks HTTP/JSON-RPC. All Odoo-version coupling sits in a **custom server-side module**:

- **Backend module:** `t_hris_mobile_api_muse` (installed on the Odoo server)
- **API base:** `/api/hris/v1/*` on the Odoo instance, called with Odoo's JSON-RPC envelope (`{"jsonrpc": "2.0", "method": "call", "params": {...}}`)
- **App configuration:** `ODOO_BASE` and `ODOO_DB` constants in `src/services/api.js`

A stock Odoo installation does **not** provide these endpoints — without the backend module, the app has nothing to talk to, on any Odoo version.

### What the backend API provides

Endpoints the app currently uses under `/api/hris/v1`:

- **Auth & config:** `/auth/login`, `/auth/logout`, `/auth/me`, `/config/public`, `/server-time`
- **Employee:** `/employee/profile`, `/employee/list`
- **Attendance:** `/attendance/status`, `/attendance/break`, `/attendance/history`, `/tracking/ping` (live location ping while clocked in)
- **Face recognition:** `/face/enroll`, `/face/status` (face descriptors are stored and matched server-side)
- **Shifts:** `/shift/today`, `/shift/upcoming`
- **Time off & overtime:** `/timeoff/types`, `/timeoff/request`, `/timeoff/history`, `/overtime/request`, `/overtime/history`
- **Approvals:** `/approvals/inbox`, `/approvals/act`
- **Announcements:** `/announcement/list`
- **Payslips:** `/payslip/list`, `/payslip/detail`
- **Reimbursement:** `/reimbursement/jenis`, `/reimbursement/list`, `/reimbursement/submit`, `/reimbursement/approve`
- **Dashboard:** `/dashboard/summary`

In addition, a few calls go through Odoo's standard `/jsonrpc` `execute_kw` interface (`hr.attendance`, `hr.employee`, `hr.leave`, `resource.calendar.attendance`, and the custom `ess.shift.change` model). Those standard models exist in newer Odoo versions too, but field-level details still need verification per version.

## What an Odoo 18 port involves

1. **Port the backend module** `t_hris_mobile_api_muse` to Odoo 18: manifest, models, and the `/api/hris/v1` controllers. This is the main work — the API contract above should stay identical so the app keeps working unchanged.
2. **Verify the `execute_kw` calls** against Odoo 18 model fields (attendance, employee, leave, calendar) and adjust for any renamed/removed fields.
3. **Re-test the auth flow** end-to-end (login, token handling, session/device checks) on the new version.
4. **Point the app at the new instance** by updating `ODOO_BASE` / `ODOO_DB` in `src/services/api.js`, then run a full attendance cycle test: enroll face → check in (geofence + selfie) → check out → history, leave and overtime requests, approvals, payslip view.

## Odoo 18 field notes

<!-- @ag-rich-tech: this section is yours. Setup, what you tried in your fork, errors you hit, what worked — a few honest lines are exactly what future users need. -->

- **Setup:** _TODO — Odoo 18 Community or Enterprise? Self-hosted or Odoo Online?_
- **What I tried:** _TODO_
- **Errors / blockers found:** _TODO_
- **What already works:** _TODO_

## FAQ

**Can I just change `ODOO_BASE` to my Odoo 18 server and use the app today?**
No — the `/api/hris/v1/*` endpoints come from the custom backend module. Until that module is installed on your server (ported to your Odoo version), the app cannot log in or sync anything.

**Does Community vs Enterprise matter?**
The app relies on the HR apps (Employees, Attendances, Time Off) plus the custom module. If your edition provides those, the porting work above is the same; note your edition in the field notes so it gets verified.

#tester
doe tester

---

*Co-authored by @ghozali25 (Odoo 14 architecture and API inventory) and @ag-rich-tech (Odoo 18 testing and field notes).*
