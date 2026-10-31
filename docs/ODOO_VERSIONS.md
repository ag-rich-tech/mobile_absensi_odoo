# Supported Odoo Versions & Porting Notes

This document answers the most common first question about this project: **which Odoo version does the mobile attendance app work with?**

> **Correction (Oct 31, 2026):** the first version of this document said Odoo 18 support "still requires a backend port". That was incomplete — an Odoo 18 adaptation already exists in this repository on the **`odoo-18.0` branch** (using the `ag_rest_api` module). This revision documents both adapters accurately.

## TL;DR

| Odoo version | Status |
| --- | --- |
| **Odoo 14** | ✅ Supported — the `master` branch is developed and tested against Odoo 14 |
| **Odoo 18** | 🚧 Adaptation in progress — use the **`odoo-18.0` branch** (backend module `ag_rest_api`); testers and field reports welcome |
| Odoo 15 / 16 / 17 | ⚠️ Not tested — no adapter exists for these versions |

## How the app connects to Odoo

The mobile app is a Capacitor (Android/iOS) client that only talks HTTP. All Odoo-version coupling sits in a **server-side backend module**, and each supported version has its own adapter:

### Odoo 14 — `master` branch

- **Backend module:** `t_hris_mobile_api_muse`
- **API base:** `/api/hris/v1/*` on the Odoo instance, called with Odoo's JSON-RPC envelope (`{"jsonrpc": "2.0", "method": "call", "params": {...}}`)
- **App configuration:** `ODOO_BASE` and `ODOO_DB` constants in `src/services/api.js`
- A few calls also go through the standard `/jsonrpc` `execute_kw` interface (`hr.attendance`, `hr.employee`, `hr.leave`, `resource.calendar.attendance`, and the custom `ess.shift.change` model)

Endpoints used under `/api/hris/v1`:

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

### Odoo 18 — `odoo-18.0` branch

- **Backend module:** `ag_rest_api` (a separate, newer module — not a port of the Odoo 14 one)
- **API base:** `/ag_rest_api/v1/*`, plain POST JSON (no JSON-RPC envelope); responses look like `{"status": "success"|"error", "message": ..., "data": ...}`
- **Auth:** Bearer token — login via `POST /ag_rest_api/v1/auth/token` (db + login + password), then every request sends `Authorization: Bearer <token>`. Session cookies are no longer used, and this branch makes no direct `/jsonrpc` `execute_kw` calls.
- **App configuration:** centralized in `.env` via `src/config.js` — `VITE_ODOO_URL`, `VITE_ODOO_DB`, `VITE_API_BASE` (default `/ag_rest_api/v1`). No server URL is hardcoded in the code.
- **Mock mode:** set `VITE_USE_MOCK=true` to run the app against local mock JSON (`src/mocks/`) with no server at all — handy for trying the UI before your backend is ready.
- The UI layer is unchanged: the adapter keeps the same function names and response shapes as the Odoo 14 adapter, so no UI components had to change.

A stock Odoo installation provides **neither** backend module — on any version, the app has nothing to talk to until the matching module is installed on the server.

## Trying the Odoo 18 adaptation

1. Check out the **`odoo-18.0`** branch (this fork has it too — forks inherit all branches).
2. Install the **`ag_rest_api`** module on your Odoo 18 server.
3. Copy `.env.example` to `.env` and set `VITE_ODOO_URL` / `VITE_ODOO_DB` to your instance (or leave `VITE_USE_MOCK=true` for a UI-only trial).
4. Run a full attendance cycle: login (token) → face enroll → check in (geofence + selfie) → check out → history, leave/overtime requests, approvals, payslip view.
5. Report what you find in the field-notes section below or in Discussions — setup, errors, what works. That feedback is what moves Odoo 18 from 🚧 to ✅.

## Odoo 18 field notes

<!-- Testers — @ag-rich-tech first: this section is yours. Setup, what you tried, errors you hit, what worked — a few honest lines are exactly what future users need. -->

- **Setup:** _TODO — Odoo 18 Community
- **What I tried:** nothing, all good
- **Errors / blockers found:** what do u think?
- **What already works:** yes

## FAQ

**Can I use the app with Odoo 18 today?**
Experimentally, yes — check out the `odoo-18.0` branch and install the `ag_rest_api` module on your Odoo 18 server, then configure `.env`. It is still a work in progress, so please report what you find. The stable, tested path remains Odoo 14 on `master`.

**Can I just change the server URL on `master` to my Odoo 18 server?**
No — `master` speaks to the Odoo 14 module's `/api/hris/v1/*` endpoints, which a stock Odoo 18 doesn't have. Use the `odoo-18.0` branch for Odoo 18.

**Does Community vs Enterprise matter?**
The app relies on the HR apps (Employees, Attendances, Time Off) plus the custom backend module. If your edition provides those, the steps above are the same; note your edition in the field notes so it gets verified.

## test
done tester, nothing problem

---

*Maintained by @ghozali25 (adapters and API inventory) with field testing by @ag-rich-tech and other Odoo 18 testers.*
