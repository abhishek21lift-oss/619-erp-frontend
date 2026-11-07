# Member profile expansion — design

Date: 2026-11-05
Scope: `619-erp-frontend` member portal + `619-erp-backend` client portal.
Status: awaiting approval.

## Why

The profile hub (`/member/more`) now covers identity, plan, balance, coach and
twelve destinations, but three member needs still end in "ask your trainer":

1. **Membership depth.** A member cannot see how many PT sessions are left,
   and Payments has no row in the hub (only the bottom tab).
2. **Self-service.** No way to request a pause, download their own data, or ask
   for account deletion. Passkeys and plan changes are trainer-assisted.
3. **Studio contact.** The only way to reach the studio is the Messages tab.
   The studio's phone, address and hours are not stored anywhere.

## Non-goals

- Notification preferences, quiet hours, kg/lb units, Hindi, dark-mode
  preference. All need a preference store and app-wide formatting changes.
- Referral / invite-a-friend.
- Self-service pause approval, immediate self-deletion, or a trainer queue.
- Any change to the trainer client profile beyond the studio-details form.

## Phase A — Membership depth

### A1. Payments row

`GROUPS` → Membership gains
`{ href: '/member/payments', label: 'Payments', sub: 'Receipts and payment history', icon: Receipt }`.
No API change; the page and receipt links already exist.

### A2. Sessions left

**API** `GET /api/me/session-balance` (client-portal.routes.js):

```sql
SELECT package_name, total_sessions, used_sessions, remaining_sessions,
       start_date, end_date, status
  FROM session_balance
 WHERE client_id = $1 AND organization_id = $2 AND status = 'active'
 ORDER BY end_date NULLS LAST, created_at
```

Identity comes from `selfOf(req)` — no client id in the request. Returns
`{ data: [...] }`; an empty array is a valid answer.

**UI** `MembershipCard` gains a `sessions` prop. When non-empty it renders one
compact line per package under the plan dates: `8 of 12 sessions left · ends
12 Dec`. Nothing renders when the array is empty, so a studio that does not
track packages sees no change.

**Why not aggregate:** packages can expire on different dates, so a single
total would be a true number with a misleading deadline. Per-package lines are
the honest shape.

**Risk:** `session_balance.client_id` was declared against the legacy `clients`
table (dropped in migration 170). Rows created before migration 174 may hold
ids that do not resolve to `pt_clients`; those simply do not appear. No new
write path is introduced.

## Phase B — Self-service

### B1. Pause request

Mirrors the existing renewal request exactly: an unread trainer notification,
no new table.

- `POST /api/me/pause/request` `{ start_date, end_date?, reason? }`.
  Validates `start_date >= today`, `end_date > start_date` when present,
  reason ≤ 300 chars. Creates one notification of type `pause_request` for
  each active trainer in the org, deduped while unread, body carries the dates
  and reason, link `/pt-os/clients/:id`.
- `GET /api/me/pause` → `{ requested_at }` from the latest unread
  `pause_request` notification for this client.
- UI: a "Pause your plan" card at the bottom of `/member/renew`, below the
  renewal offer. Two date fields, an optional reason, and a "Request pause"
  button. After sending it shows "Pause requested on <date>" instead of the
  form, the same way `AskCard` handles renewal.

**Accepted limitation:** there is no approve/reject state and no audit row.
The trainer reads the notification and edits the plan dates; the member sees
"requested" until the trainer reads it, then the form returns. This is the
renewal behaviour already shipped. If the studio needs a durable request log
and an explicit approve/reject, that is a table + trainer queue in a later
phase, not this one.

### B2. Data export

`GET /api/me/export` returns one JSON document of the member's own records:

```
exported_at, member (narrow allow-list), membership, payments, attendance,
measurements, sessions, checkins, goals, progress_photos (metadata + URLs),
form_checks (metadata), forms (PAR-Q / consent metadata), messages
```

Implement in a new `member-privacy.service.js`; reuse `mySessions`,
`myCheckins`, `myPhotos`, `myForms`, `myAchievements` from
`client-portal.service`, and add narrow queries for the rest. Response headers
`Cache-Control: private, no-store` and
`Content-Disposition: attachment; filename="my-pt-studio-data-YYYY-MM-DD.json"`.
No BLOBs — photos and form-check videos stay URLs.

### B3. Account deletion request

`POST /api/me/deletion/request` creates one unread `deletion_request`
notification for the trainers (deduped while unread), link
`/pt-os/clients/:id`. `GET /api/me/deletion` → `{ requested_at }`.
No deletion happens automatically and no trainer UI changes: the trainer
deletes the client through the existing flow.

### B4. Privacy UI

Account page gains a "Privacy and data" section below Password:

- **Download my data** — a plain `<a download href={api.me.exportUrl()}>`, the
  way the receipt links already work: the session cookie authorises it, and
  the server's `Content-Disposition` supplies the filename.
- **Request account deletion** — an inline confirm block (no modal) saying that
  the studio processes it and the record stays until then; after sending, the
  row shows "Requested on <date>" and the action is gone.

## Phase C — Studio contact

### C1. Data

Migration `265_organization_contact.sql` (additive, reversible by dropping the
columns):

```sql
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS phone   TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS hours   TEXT;
```

`hours` is free text ("Mon–Sat, 6–10 am and 4–9 pm"), not a schedule model.

### C2. Trainer editing

- `GET /api/profile/studio` and `PUT /api/profile/studio` in
  `src/routes/profile.js`, scoped to `req.user.organization_id`, validating
  lengths (phone ≤ 20, address ≤ 300, hours ≤ 120). `PUT` replaces the whole
  contact block — all three fields are written on every save, and an omitted
  field becomes `NULL`. The SQL lives in `src/lib/studioDetails.js` because the
  layering test caps `routes/profile.js` at 28 SQL literals.
- `/settings/profile` gains a compact "Studio details" card in the overview
  tab, after Personal Information: phone, address, hours, save.

### C3. Member view

`/api/me/profile` adds `studio_phone`, `studio_address`, `studio_hours` from
the existing `organizations` join (allow-list stays explicit). The profile hub
renders a "Your studio" card after the coach card, with tap-to-call, the
address, and the hours. The card is hidden entirely when all three are empty,
so an unfilled studio sees no change.

## Tests

| Layer | Test |
|---|---|
| Backend | mocked-pool route tests for `/me/session-balance`, `/me/export`, pause/deletion requests (session identity, no cross-client param, no write on export), and the trainer's studio routes (member refused); realDb integration suites for the same paths are BLOCKED until a local Postgres exists |
| Frontend | extend `member-more-page.test.tsx`: Payments row, sessions line, studio card hidden/filled; new account privacy test (export download, deletion confirm); renew pause request state |

Local runs: `npx tsc --noEmit`, ESLint on changed files, targeted Vitest,
targeted Jest, `node scripts/api-contract-check.mjs`, `git diff --check`.
Real-DB suites run only if a local Postgres is available; otherwise they are
reported as BLOCKED, not passed.

## Rollout

Three independent PRs off `origin/main`, each in a worktree, because both local
trees carry unrelated user changes:

1. **A** — frontend row + sessions block; backend one route + service query.
2. **B** — backend pause/deletion/export; frontend renew card + account
   privacy section.
3. **C** — backend migration + studio routes; frontend settings form + member
   card. Migration is additive and needs explicit approval before it runs
   anywhere.

A needs no migration and can ship first. Backend deploys run migrations
automatically, so C must be reviewed with that in mind.

## Decisions taken (change these if wrong)

1. Pause and deletion are notification requests, not approval workflows.
2. Export is JSON, includes the member's messages, excludes media bytes.
3. `hours` is free text, not structured opening hours.
4. Sessions are shown per package, active packages only.
