# Dashboard Audit — 619 ERP

**Date:** 2026-07-25
**Scope:** All four role dashboards and their backend endpoints:
- `/` → `PtOsDashboard` (admin/staff home) — `src/app/page.tsx`, `src/components/dashboards/PtOsDashboard.tsx`
- `/trainer/dashboard` — `src/app/trainer/dashboard/page.tsx`
- `/member/dashboard` — `src/app/member/dashboard/page.tsx`
- `/checkin/dashboard` (Attendance Dashboard) — `src/app/checkin/dashboard/page.tsx`
- `/admin/dashboard` (orphaned) — `src/app/admin/dashboard/page.tsx`

Backend: `619-erp-backend/src/modules/pt-os/{pt-os.routes.js,pt-os.service.js}`, `src/routes/qr-checkin.js`, `src/modules/bookings/bookings.routes.js`.

This is a focused, verified audit — every finding below was traced end-to-end (frontend call → API contract → backend handler/query) rather than inferred from surface reading.

---

## Critical

### 1. Trainer dashboard is broken — fetches the wrong endpoint, response shape doesn't exist
**File:** `src/app/trainer/dashboard/page.tsx:62-67`, `src/lib/api.ts:1615-1616`

`TrainerDashboardPage` calls `api.pt.dashboard()`, which hits `GET /api/pt-os/dashboard`. That is the **studio-wide admin endpoint** — the same one `PtOsDashboard` uses. Its backend handler (`pt-os.service.js:148` `getDashboardStats`) returns:

```
{ active_pt_clients, expired_clients, clients_with_balance, total_monthly_pt_revenue,
  total_monthly_commission, total_outstanding, trainers: [...], revenueTrend: [...] }
```

But `TrainerInner` destructures a completely different shape it expects to exist:

```ts
const d = (res as { data: DashboardData }).data;
setEarn(d.earnings); setToday(d.schedule); setClients(d.clients);
setEarningsHistory(d.earningsHistory); setStats(d.stats);
```

None of `earnings`, `schedule`, `clients`, `earningsHistory`, `stats` exist anywhere in the actual response — I grepped the entire backend and there is no route that returns that shape (no `earningsHistory`, no per-trainer `schedule`). The unsafe `as { data: DashboardData }` cast hides this from TypeScript.

At runtime every trainer login sets `stats` to `undefined` (`setStats(d.stats)`), then the render immediately does `stats.active_clients` → throws. The app's top-level `ErrorBoundary` (`src/components/ErrorBoundary.tsx`) catches it so the tab doesn't go fully white, but **every trainer sees a generic "something went wrong" screen instead of their dashboard** — this page cannot currently work for any trainer.

**Fix:** Build the actual trainer-scoped endpoint (self earnings, today's schedule, assigned clients, 6-month earnings history) and point `api.pt.dashboard()` — or a new `api.pt.trainerDashboard()` — at it. Do not reuse the admin aggregate endpoint.

### 2. Member dashboard silently renders empty forever — type/shape mismatch inside a swallowed `Promise.all`
**File:** `src/app/member/dashboard/page.tsx:53-70`, `src/lib/api.ts:1330-1331`, `619-erp-backend/src/modules/bookings/bookings.routes.js:15-21`

`api.bookings.list()` is typed `http<unknown[]>('/api/bookings...')` — declared to resolve to a bare array. The backend route it hits (`GET /api/bookings`) actually responds `res.json({ data })` — an **object** with a `data` key, not an array.

```ts
const [memberRes, bookings] = await Promise.all([api.member.get(memberId), api.bookings.list()]);
...
const all = (bookings as any[]) ?? [];
setToday(all.filter(...));       // all is really { data: [...] } → .filter throws TypeError
```

`.filter` on that object throws. Because both calls are inside one `Promise.all` wrapped in a bare `catch { /* API unavailable — leave empty state */ }`, the exception:
1. discards the bookings data (expected, if it were the only casualty), **and**
2. discards `memberRes` too, even though that fetch succeeded — so membership/plan info never renders either.

Net effect: the member dashboard **always** shows empty "no plan" / "no bookings" state, with zero indication anything failed — indistinguishable from a genuinely empty account.

**Fix:** Fix the type to `http<{ data: Booking[] }>` and unwrap `.data`; don't let one endpoint's failure discard another that already resolved (fetch independently, or `Promise.allSettled`).

### 3. Main dashboard has no error state — API failures render a permanent blank panel
**File:** `src/components/dashboards/PtOsDashboard.tsx:1128-1183`

`PtOsDashboard` fires three independent fetches (`dash`, `ops`, `consents` via `useAsync`) but never reads `.error` from any of them. The render logic is:

```tsx
{dash.loading && !d && <SkeletonDash />}
{d && ( ...entire dashboard... )}
```

If `/api/pt-os/dashboard` fails for any reason other than a 401 (network blip, 500, 403, timeout — 401 is handled globally elsewhere via the `session-expired` event), `dash.loading` becomes `false` and `d` stays `null` permanently. Neither branch above is true, so **the entire content area renders nothing** — no skeleton, no error message, no retry button — just the ambient background. This is a regression relative to the rest of the app: the trainer dashboard (`trainer/dashboard/page.tsx:91-103`) has a proper error branch with a Retry button; the main dashboard, the one every admin/staff user lands on after login, does not.

**Fix:** Surface `dash.error` (and `ops.error`) with a retry affordance, matching the pattern already used in `trainer/dashboard/page.tsx`.

---

## High

### 4. Studio-wide financial data has no role gate on the backend
**File:** `619-erp-backend/src/modules/pt-os/pt-os.routes.js:109-112, 1101-1104`

```js
router.get('/dashboard', auth, wrap(async (req, res) => { ... }));       // no adminOnly/adminOrManager
router.get('/dashboard/ops', auth, wrap(async (req, res) => { ... }));
```

Both routes use only `auth` (any authenticated user of the tenant — `admin`, `manager`, `trainer`, or `member` alike; see `middleware/auth.js:177-195` where `adminOnly`/`adminOrManager` are the actual role gates, applied elsewhere in this same file e.g. `POST /trainers` at line 95). `getDashboardStats` and `getOpsSummary` take only an org-level tenant `scope`, with no per-role filtering inside either service function (`pt-os.service.js:148,292`).

The frontend happens to only route admin/staff to `/` and trainers to `/trainer/dashboard` (`login/page.tsx:228-229`), so a normal trainer session never *calls* this endpoint through the UI — but nothing stops a trainer or member from calling `GET /api/pt-os/dashboard` directly with their own valid session cookie and receiving:
- every trainer's name, active client count, monthly revenue, and monthly commission (`trainers: [...]`)
- studio-wide revenue/commission trend
- `dashboard/ops` additionally returns `top_dues` (client names, mobile numbers, balances) and `renewals_due` for the whole org

This is a broken-access-control gap (OWASP A01): a trainer can see every colleague's earnings, and any authenticated tenant user can pull the full client debt list with phone numbers.

**Fix:** Add `adminOrManager` (or equivalent) to both routes, matching how sensitive financial endpoints are gated elsewhere in this same file.

### 5. `/admin/dashboard` redirects to a route that doesn't exist
**File:** `src/app/admin/dashboard/page.tsx`

```tsx
export default function AdminDashboardRedirect() {
  redirect('/dashboard');
}
```

There is no `src/app/dashboard/` route anywhere in the app (confirmed via full route tree — the studio home lives at `/`, not `/dashboard`). Hitting `/admin/dashboard` — via an old bookmark, external link, or search-engine index — currently 404s. The route is also not linked from anywhere in the app itself (`nav-config.ts`, `AppShell.tsx`, and all sidebar/topnav files have zero references to `/admin/dashboard`), so it's orphaned dead code with a broken target.

**Fix:** Either delete the page (nothing links to it) or point the redirect at `/`.

---

## Medium

### 6. Non-functional buttons on the trainer dashboard
**File:** `src/app/trainer/dashboard/page.tsx:171-177, 303-304`

- "Download payslip" and "Earnings history" buttons in the earnings hero card have no `onClick` at all.
- "Message" and "Schedule" buttons on each client card call only `onClick={e => e.preventDefault()}` (blocking the parent `<Link>` navigation) with no actual action.

All four render as live, clickable buttons with no visible disabled state, so trainers will click them expecting something to happen.

### 7. Silent-catch pattern hides real failures on `checkin/dashboard` and `member/dashboard`
**Files:** `src/app/checkin/dashboard/page.tsx:69` (`catch { /* keep stale data on error */ }`), `src/app/member/dashboard/page.tsx:71` (`catch { /* API unavailable — leave empty state */ }`)

The checkin dashboard's version is a reasonable, documented choice for a 30s-polling live view (stale data beats a jarring error state). The member dashboard's is not — it has no polling and no visible "stale/last updated" indicator, so a permanently-failing fetch (see Critical #2, which lives inside this exact `catch`) is indistinguishable from "you have no active plan." Matches the broader `.catch(() => {})` anti-pattern already flagged app-wide in `AUDIT-REPORT.md` §C1, but concretely responsible for masking Critical #2 above.

### 8. `checkin/dashboard`'s live attendance endpoint is also role-open
**File:** `619-erp-backend/src/routes/qr-checkin.js:326` — `router.get('/dashboard', auth, async (req, res) => {...})`

Same pattern as Finding 4 but lower sensitivity (attendance counts, not financials): any authenticated tenant user can pull org-wide attendance stats even though the frontend page is `Guard`-ed to `role="admin"` only.

---

## Summary

| # | Finding | File(s) | Severity |
|---|---|---|---|
| 1 | Trainer dashboard fetches wrong endpoint; response shape never existed → crashes for every trainer | `trainer/dashboard/page.tsx`, `api.ts` | Critical |
| 2 | Member dashboard: `bookings.list()` shape mismatch inside shared `Promise.all`/silent catch → dashboard always renders empty | `member/dashboard/page.tsx`, `api.ts`, `bookings.routes.js` | Critical |
| 3 | Main dashboard has no error state — API failure renders a permanent blank panel | `PtOsDashboard.tsx` | Critical |
| 4 | `/api/pt-os/dashboard` + `/dashboard/ops` lack role gate — any tenant user can read all trainers' revenue/commission and client debt+phone numbers | `pt-os.routes.js` | High |
| 5 | `/admin/dashboard` redirects to a nonexistent `/dashboard` route (dead, unlinked) | `admin/dashboard/page.tsx` | High |
| 6 | Four dead buttons on trainer dashboard (no-op onClick / missing onClick) | `trainer/dashboard/page.tsx` | Medium |
| 7 | Silent catch on member dashboard masks Critical #2 with no stale/error indicator | `member/dashboard/page.tsx` | Medium |
| 8 | Attendance dashboard endpoint has no role gate despite admin-only frontend page | `qr-checkin.js` | Medium |

**Recommended fix order:** 1 and 2 first (both dashboards are non-functional for their entire user base — every trainer and every member), then 4 (data exposure), then 3, 5, and the medium items.
