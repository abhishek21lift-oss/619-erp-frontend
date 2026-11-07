# Member Self-Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A member can request a plan pause, request account deletion, and download their own records.

**Architecture:** Requests reuse the renewal pattern — an unread trainer notification, no new table. Export is one read-only JSON endpoint built from existing member reads plus four narrow queries. Two small member components carry the UI.

**Tech Stack:** Express 4 + node-postgres; Jest + Supertest with a mocked pool. Next.js / React; Vitest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-05-member-profile-expansion-design.md` (Phase B)

## Global Constraints

- Client and org ids come from `selfOf(req)`; query strings and bodies never supply them.
- Request validation happens before any notification insert. A refused request writes nothing.
- `GET /api/me/export` is read-only: no INSERT, UPDATE or DELETE may run. It must not mark messages read.
- Export headers: `Cache-Control: private, no-store` and `Content-Disposition: attachment; filename="my-pt-studio-data-YYYY-MM-DD.json"`.
- No new dependency. No migration.
- Member UI uses `Section` / `Card` / `MC` / `longDate` from the member UI module; no new colours.
- Commits are part of each task. Push and open PRs only after the owner's explicit go-ahead (RULES §3).

## Review Focus

1. A pause with an end before its start, or a start in the past, is refused with 400 and writes no notification.
2. Asking twice while the trainer has not read the first request sends nothing new (`sent: false`).
3. Opening the export does not clear the unread message badge.
4. Exporting runs no write statement of any kind.
5. A deletion request deletes nothing; it only notifies the trainer.
6. A member with no records gets `[]` and `null`, never an error.

---

### Task 1: Backend — pause and deletion requests

**Files:**
- Create: `619-erp-backend/src/modules/client-portal/member-requests.service.js`
- Modify: `619-erp-backend/src/modules/client-portal/client-portal.routes.js` (after the renewal routes, ~line 633)
- Test: `619-erp-backend/src/__tests__/memberRequests.routes.test.js` (create)

**Interfaces:**
- Consumes: `today()` from `../../lib/appTime`, `pool`, `selfOf(req)`, `inputError(res, err, Kind)`.
- Produces:
  - `requestPause(clientId: string, orgId: string, input: { start_date?: string; end_date?: string | null; reason?: string | null }): Promise<{ sent: boolean }>`
  - `myPause(clientId: string, orgId: string): Promise<{ requested_at: string | null }>`
  - `requestDeletion(clientId: string, orgId: string): Promise<{ sent: boolean }>`
  - `myDeletion(clientId: string, orgId: string): Promise<{ requested_at: string | null }>`
  - `class RequestError extends Error { status: number }`

- [ ] **Step 1: Write the failing test**

```js
'use strict';
// Pause and deletion requests are unread trainer notifications, nothing more.
const CLIENT = 'cl-self';
const ORG = '11111111-1111-4111-8111-111111111111';
const queries = [];
let responder = () => ({ rows: [], rowCount: 0 });

jest.mock('../db/pool', () => ({
  query: jest.fn(async (sql, params) => {
    queries.push({ sql: String(sql).replace(/\s+/g, ' ').trim(), params: params || [] });
    return responder(queries[queries.length - 1].sql);
  }),
}));
jest.mock('../lib/appTime', () => ({
  ...jest.requireActual('../lib/appTime'),
  today: () => '2026-11-05',
}));

const express = require('express');
const request = require('supertest');

function app() {
  const a = express();
  a.use(express.json());
  a.use((req, _res, next) => {
    req.user = { id: 'usr-m', role: 'member', pt_client_id: CLIENT, organization_id: ORG };
    next();
  });
  a.use('/api/me', require('../modules/client-portal/client-portal.routes'));
  a.use((err, _req, res, _next) => res.status(500).json({ error: err.message }));
  return a;
}

const inserts = () => queries.filter((q) => /INSERT INTO notifications/.test(q.sql));

beforeEach(() => { queries.length = 0; responder = () => ({ rows: [], rowCount: 0 }); });

describe('pause requests', () => {
  it('notifies the trainers with the dates and reason, from the session identity', async () => {
    responder = () => ({ rows: [], rowCount: 1 });
    const res = await request(app()).post('/api/me/pause/request')
      .send({ start_date: '2026-11-10', end_date: '2026-11-24', reason: 'Travel' })
      .expect(200);

    expect(res.body.data).toEqual({ sent: true });
    expect(inserts()).toHaveLength(1);
    const q = inserts()[0];
    expect(q.params[0]).toBe(CLIENT);
    expect(q.params[1]).toBe(ORG);
    expect(q.params[2]).toBe('pause_request');
    expect(q.params[4]).toContain('2026-11-10');
    expect(q.params[4]).toContain('2026-11-24');
    expect(q.params[4]).toContain('Travel');
  });

  it('refuses an end before the start without writing anything', async () => {
    await request(app()).post('/api/me/pause/request')
      .send({ start_date: '2026-11-10', end_date: '2026-11-09' })
      .expect(400);
    expect(inserts()).toHaveLength(0);
  });

  it('refuses a start in the past without writing anything', async () => {
    await request(app()).post('/api/me/pause/request')
      .send({ start_date: '2026-11-04' })
      .expect(400);
    expect(inserts()).toHaveLength(0);
  });

  it('refuses a request with no start date', async () => {
    await request(app()).post('/api/me/pause/request').send({ reason: 'Travel' }).expect(400);
    expect(inserts()).toHaveLength(0);
  });

  it('reports sent: false when the trainer already has an unread request', async () => {
    responder = () => ({ rows: [], rowCount: 0 });
    const res = await request(app()).post('/api/me/pause/request')
      .send({ start_date: '2026-11-10' }).expect(200);
    expect(res.body.data).toEqual({ sent: false });
  });

  it('reports the unread request time', async () => {
    responder = (sql) => (/FROM notifications/.test(sql)
      ? { rows: [{ at: '2026-11-05T09:00:00.000Z' }], rowCount: 1 }
      : { rows: [], rowCount: 0 });
    const res = await request(app()).get('/api/me/pause').expect(200);
    expect(res.body.data.requested_at).toBe('2026-11-05T09:00:00.000Z');
  });
});

describe('deletion requests', () => {
  it('notifies the trainers and deletes nothing', async () => {
    responder = () => ({ rows: [], rowCount: 1 });
    const res = await request(app()).post('/api/me/deletion/request').expect(200);
    expect(res.body.data).toEqual({ sent: true });
    expect(inserts()[0].params[2]).toBe('deletion_request');
    expect(queries.some((q) => /^(DELETE|UPDATE)/i.test(q.sql))).toBe(false);
  });

  it('ignores a client id in the query string', async () => {
    responder = () => ({ rows: [], rowCount: 1 });
    await request(app()).post('/api/me/deletion/request?client_id=other').expect(200);
    expect(inserts()[0].params[0]).toBe(CLIENT);
    expect(inserts()[0].params).not.toContain('other');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd 619-erp-backend && npx jest src/__tests__/memberRequests.routes.test.js --runInBand`
Expected: FAIL — 404 (routes absent).

- [ ] **Step 3: Implement the service**

Create `member-requests.service.js`. Signatures as in Interfaces. Validation rules:

- `start_date` must match `^\d{4}-\d{2}-\d{2}$`, parse to a real date, and be `>= today()`.
- `end_date` is optional; when present it must match the same shape and be `> start_date`.
- `reason` is trimmed; `> 300` characters is refused; empty becomes `null`.
- Each refusal throws `new RequestError(message, 400)`.
- Pause body: `Pause from ${start}${end ? ` until ${end}` : ''}.${reason ? ` Reason: ${reason}` : ''}`
- Deletion body: `Account deletion requested from the member app.`

Shared notification helper (exact SQL, tenant-sensitive):

```js
async function notifyTrainersOnce({ clientId, orgId, type, titleSuffix, body }) {
  const { rowCount } = await pool.query(
    `INSERT INTO notifications (user_id, type, title, body, link)
     SELECT u.id, $3, COALESCE(c.name, 'A member') || $4, $5, '/pt-os/clients/' || c.id
       FROM pt_clients c
       JOIN users u ON u.organization_id = c.organization_id AND u.role = 'trainer'
                   AND u.is_active = TRUE AND u.deleted_at IS NULL
      WHERE c.id = $1 AND c.organization_id = $2
        AND NOT EXISTS (
          SELECT 1 FROM notifications n
           WHERE n.user_id = u.id AND n.type = $3 AND n.is_read = FALSE
             AND n.link = '/pt-os/clients/' || c.id)`,
    [clientId, orgId, type, titleSuffix, body],
  );
  return { sent: rowCount > 0 };
}
```

Type and title suffix pairs: `('pause_request', ' wants to pause their plan')` and
`('deletion_request', ' asked to delete their account')`.

Unread request time:

```js
async function pendingAt(clientId, orgId, type) {
  const { rows } = await pool.query(
    `SELECT MAX(n.created_at) AS at
       FROM notifications n
       JOIN users u ON u.id = n.user_id AND u.organization_id = $2 AND u.role = 'trainer'
      WHERE n.type = $3 AND n.link = '/pt-os/clients/' || $1 AND n.is_read = FALSE`,
    [clientId, orgId, type],
  );
  return { requested_at: rows[0]?.at || null };
}
```

Export all five names (`RequestError`, `requestPause`, `myPause`, `requestDeletion`, `myDeletion`).

- [ ] **Step 4: Add the routes**

In `client-portal.routes.js`, `const requests = require('./member-requests.service');` at the top, and after the renewal routes:

```js
// GET /api/me/pause — whether a pause request is still waiting
router.get('/pause', wrap(async (req, res) => {
  const { clientId, orgId } = selfOf(req);
  res.json({ data: await requests.myPause(clientId, orgId) });
}));

// POST /api/me/pause/request — ask the trainer to pause the plan
router.post('/pause/request', wrap(async (req, res) => {
  const { clientId, orgId } = selfOf(req);
  try {
    res.json({ data: await requests.requestPause(clientId, orgId, req.body || {}) });
  } catch (err) {
    if (!inputError(res, err, requests.RequestError)) throw err;
  }
}));

// GET /api/me/deletion — whether a deletion request is still waiting
router.get('/deletion', wrap(async (req, res) => {
  const { clientId, orgId } = selfOf(req);
  res.json({ data: await requests.myDeletion(clientId, orgId) });
}));

// POST /api/me/deletion/request — ask the studio to delete the account
router.post('/deletion/request', wrap(async (req, res) => {
  const { clientId, orgId } = selfOf(req);
  try {
    res.json({ data: await requests.requestDeletion(clientId, orgId) });
  } catch (err) {
    if (!inputError(res, err, requests.RequestError)) throw err;
  }
}));
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd 619-erp-backend && npx jest src/__tests__/memberRequests.routes.test.js --runInBand`
Expected: PASS (8 tests).

- [ ] **Step 6: Commit (backend repo)**

```bash
git add src/modules/client-portal/member-requests.service.js \
        src/modules/client-portal/client-portal.routes.js \
        src/__tests__/memberRequests.routes.test.js
git commit -m "feat(member): pause and account-deletion requests"
```

---

### Task 2: Backend — data export

**Files:**
- Create: `619-erp-backend/src/modules/client-portal/member-privacy.service.js`
- Modify: `619-erp-backend/src/modules/client-portal/client-portal.service.js` (add `myMeasurements`, export it)
- Modify: `619-erp-backend/src/modules/client-portal/client-portal.routes.js` (measurements route + `/export`)
- Test: `619-erp-backend/src/__tests__/memberPrivacy.routes.test.js` (create)

**Interfaces:**
- Consumes: `portal.mySessions`, `portal.myCheckins`, `portal.myPhotos(clientId, orgId, userId)`, `portal.myForms`, `portal.myAchievements`, `formChecks.listForClient`, `today()`.
- Produces:
  - `portal.myMeasurements(clientId: string, orgId: string): Promise<object[]>`
  - `exportEverything(clientId: string, orgId: string, userId: string): Promise<{ exported_at: string; member: object | null; membership: object | null; payments: object[]; attendance: object[]; measurements: object[]; sessions: object[]; checkins: object; goals: object[]; progress_photos: object[]; form_checks: object[]; forms: object; messages: object[]; achievements: object | null }>`

- [ ] **Step 1: Extract `myMeasurements`**

Move the SQL currently inside `router.get('/measurements')` (including its long explanatory comment) into `client-portal.service.js` as `myMeasurements(clientId, orgId)` returning `rows`. The route becomes:

```js
router.get('/measurements', wrap(async (req, res) => {
  const { clientId, orgId } = selfOf(req);
  res.json({ data: await portal.myMeasurements(clientId, orgId) });
}));
```

Add `myMeasurements` to the service's `module.exports`. No behaviour change; params and SQL stay byte-identical.

- [ ] **Step 2: Write the failing export test**

```js
'use strict';
// GET /api/me/export — the member's own records, in one read-only document.
const CLIENT = 'cl-self';
const ORG = '11111111-1111-4111-8111-111111111111';
const queries = [];

jest.mock('../db/pool', () => ({
  query: jest.fn(async (sql, params) => {
    queries.push({ sql: String(sql).replace(/\s+/g, ' ').trim(), params: params || [] });
    return { rows: [], rowCount: 0 };
  }),
}));
jest.mock('../lib/appTime', () => ({
  ...jest.requireActual('../lib/appTime'),
  today: () => '2026-11-05',
}));

const express = require('express');
const request = require('supertest');

function app() {
  const a = express();
  a.use(express.json());
  a.use((req, _res, next) => {
    req.user = { id: 'usr-m', role: 'member', pt_client_id: CLIENT, organization_id: ORG };
    next();
  });
  a.use('/api/me', require('../modules/client-portal/client-portal.routes'));
  a.use((err, _req, res, _next) => res.status(500).json({ error: err.message }));
  return a;
}

beforeEach(() => { queries.length = 0; });

describe('GET /api/me/export', () => {
  it('downloads one JSON document with every section and the right headers', async () => {
    const res = await request(app()).get('/api/me/export?client_id=other').expect(200);

    expect(res.headers['cache-control']).toBe('private, no-store');
    expect(res.headers['content-disposition'])
      .toBe('attachment; filename="my-pt-studio-data-2026-11-05.json"');

    const data = res.body.data;
    expect(Object.keys(data).sort()).toEqual([
      'achievements', 'attendance', 'checkins', 'exported_at', 'form_checks', 'forms',
      'goals', 'measurements', 'member', 'membership', 'messages', 'payments',
      'progress_photos', 'sessions',
    ]);
    expect(data.messages).toEqual([]);
    expect(data.exported_at).toBeTruthy();
  });

  it('is read-only: no write statement and no message read-marking', async () => {
    await request(app()).get('/api/me/export').expect(200);
    expect(queries.some((q) => /^(INSERT|UPDATE|DELETE)/i.test(q.sql))).toBe(false);
    expect(queries.some((q) => /FROM client_messages/.test(q.sql))).toBe(true);
  });

  it('binds every read to the session client and studio', async () => {
    await request(app()).get('/api/me/export').expect(200);
    expect(queries.length).toBeGreaterThan(0);
    for (const q of queries) {
      expect(q.params).not.toContain('other');
    }
    expect(queries.some((q) => /FROM pt_assessments/.test(q.sql))).toBe(true);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd 619-erp-backend && npx jest src/__tests__/memberPrivacy.routes.test.js --runInBand`
Expected: FAIL — 404.

- [ ] **Step 4: Implement `exportEverything`**

Create `member-privacy.service.js`. Queries, with these exact shapes:

- `member`: `SELECT client_id AS member_code, name, email, mobile, whatsapp, gender, dob, address, package_type, goal, height, weight, joining_date, pt_start_date, pt_end_date, duration_months, status FROM pt_clients WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`
- `membership`: the same column list as `GET /api/me/membership`.
- `payments`: the same query as `GET /api/me/payments`, without the `LIMIT 200` (an export is whole).
- `attendance`: the same query as `GET /api/me/attendance`, without the `LIMIT 200`.
- `goals`: `SELECT id, kind, exercise_name, start_value, target_value, target_date, achieved_at, created_at FROM member_goals WHERE client_id = $1 AND organization_id = $2 ORDER BY created_at`
- `messages`: `SELECT sender, body, created_at, read_at FROM client_messages WHERE organization_id = $1 AND client_id = $2 ORDER BY created_at`
  — a direct read **because** `messages.memberThread()` marks the other side read on open.
- `achievements`: `portal.myAchievements(clientId, orgId)`.
- The rest call the existing functions named in Interfaces.

`exported_at` is `new Date().toISOString()`.

- [ ] **Step 5: Add the export route**

After the deletion routes:

```js
// GET /api/me/export — everything the studio holds about the member
router.get('/export', wrap(async (req, res) => {
  const { clientId, orgId } = selfOf(req);
  const data = await privacy.exportEverything(clientId, orgId, req.user.id);
  res.set('Cache-Control', 'private, no-store');
  res.set('Content-Disposition', `attachment; filename="my-pt-studio-data-${today()}.json"`);
  res.json({ data });
}));
```

Require `const privacy = require('./member-privacy.service');` and `const { today } = require('../../lib/appTime');` at the top if `today` is not already imported.

- [ ] **Step 6: Run the test to verify it passes**

Run: `cd 619-erp-backend && npx jest src/__tests__/memberPrivacy.routes.test.js --runInBand`
Expected: PASS (3 tests).

- [ ] **Step 7: Commit (backend repo)**

```bash
git add src/modules/client-portal/member-privacy.service.js \
        src/modules/client-portal/client-portal.service.js \
        src/modules/client-portal/client-portal.routes.js \
        src/__tests__/memberPrivacy.routes.test.js
git commit -m "feat(member): download my data"
```

---

### Task 3: Frontend — API methods and types

**Files:**
- Modify: `619-erp-frontend/src/lib/api/types.ts` (next to `MeRenewal`)
- Modify: `619-erp-frontend/src/lib/api/endpoints/platform.ts` (inside `me`, next to `renewal`)

**Interfaces:**
- Produces:
  - `MeRequestState = { requested_at: string | null }`
  - `MePauseInput = { start_date: string; end_date?: string | null; reason?: string | null }`
  - `api.me.pause(): Promise<{ data: MeRequestState }>`
  - `api.me.requestPause(body: MePauseInput): Promise<{ data: { sent: boolean } }>`
  - `api.me.deletion(): Promise<{ data: MeRequestState }>`
  - `api.me.requestDeletion(): Promise<{ data: { sent: boolean } }>`
  - `api.me.exportUrl(): string`

- [ ] **Step 1: Add the types and methods**

```ts
/** Whether the member's pause or deletion request is still waiting for the trainer. */
export type MeRequestState = { requested_at: string | null };

export type MePauseInput = {
  start_date: string;
  end_date?: string | null;
  reason?: string | null;
};
```

In `platform.ts`:

```ts
pause: () => http<{ data: MeRequestState }>('/api/me/pause'),
requestPause: (body: MePauseInput) =>
  http<{ data: { sent: boolean } }>('/api/me/pause/request', { method: 'POST', body: JSON.stringify(body) }),
deletion: () => http<{ data: MeRequestState }>('/api/me/deletion'),
requestDeletion: () =>
  http<{ data: { sent: boolean } }>('/api/me/deletion/request', { method: 'POST' }),
exportUrl: () => `${apiBase()}/api/me/export`,
```

- [ ] **Step 2: Typecheck**

Run: `cd 619-erp-frontend && npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit (frontend repo)**

```bash
git add src/lib/api/types.ts src/lib/api/endpoints/platform.ts
git commit -m "feat(member): pause, deletion and export API"
```

---

### Task 4: Frontend — pause card on `/member/renew`

**Files:**
- Create: `619-erp-frontend/src/components/member/MemberPauseCard.tsx`
- Modify: `619-erp-frontend/src/app/(bare)/member/renew/page.tsx`
- Test: `619-erp-frontend/src/__tests__/member-pause-card.test.tsx` (create)

**Interfaces:**
- Consumes: `api.me.requestPause`, `Section`, `Card`, `MC`, `longDate`, `useToast`, `TextField`, `TextAreaField`, `useStandaloneField`.
- Produces: `<MemberPauseCard requestedAt={string | null} onSent={() => void} />`.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

const requestPause = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', () => ({ api: { me: { requestPause } } }));

import MemberPauseCard from '@/components/member/MemberPauseCard';
import { ToastProvider } from '@/lib/toast';

beforeEach(() => { requestPause.mockReset().mockResolvedValue({ data: { sent: true } }); });

describe('<MemberPauseCard />', () => {
  it('sends the dates and reason the member chose', async () => {
    const onSent = vi.fn();
    render(<ToastProvider><MemberPauseCard requestedAt={null} onSent={onSent} /></ToastProvider>);

    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-11-10' } });
    fireEvent.change(screen.getByLabelText('Until (optional)'), { target: { value: '2026-11-24' } });
    fireEvent.change(screen.getByLabelText('Reason (optional)'), { target: { value: 'Travel' } });
    fireEvent.click(screen.getByRole('button', { name: 'Request pause' }));

    await vi.waitFor(() => expect(requestPause).toHaveBeenCalledWith({
      start_date: '2026-11-10', end_date: '2026-11-24', reason: 'Travel',
    }));
    expect(onSent).toHaveBeenCalled();
  });

  it('sends null for a blank end date and reason', async () => {
    render(<ToastProvider><MemberPauseCard requestedAt={null} onSent={vi.fn()} /></ToastProvider>);
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-11-10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Request pause' }));

    await vi.waitFor(() => expect(requestPause).toHaveBeenCalledWith({
      start_date: '2026-11-10', end_date: null, reason: null,
    }));
  });

  it('shows the waiting state instead of the form', () => {
    render(<ToastProvider>
      <MemberPauseCard requestedAt="2026-11-05T09:00:00.000Z" onSent={vi.fn()} />
    </ToastProvider>);
    expect(screen.getByText('Pause requested')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Request pause' })).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd 619-erp-frontend && npx vitest run src/__tests__/member-pause-card.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `MemberPauseCard`**

A `Section title="Pause your plan"` with a `Card`:

- Waiting state when `requestedAt`: green check tile, title `Pause requested`, body `Your trainer will confirm the dates. Nothing changes until they do.`, and `Requested on {longDate(requestedAt)}`.
- Otherwise: a short line (`Travelling or injured? Ask your studio to pause your plan.`), then `TextField type="date" label="From" required`, `TextField type="date" label="Until (optional)"`, `TextAreaField label="Reason (optional)" maxLength={300} rows={2}`, then a full-width `Request pause` button with `Loader2` while busy.
- `send()` refuses an empty start with `toast.error('Choose the first day of your pause.')` and otherwise calls `api.me.requestPause({ start_date: start, end_date: end || null, reason: reason.trim() || null })`, then `toast.success("Sent — your trainer will confirm")` and `onSent()`.
- On failure: `toast.error(errorMessage(err, 'Could not send your request. Try again, or message your trainer.'))`.

Use `useStandaloneField('pause-start', start, setStart)` and siblings, as `form-check` does.

- [ ] **Step 4: Render it on the renew page**

In `RenewBody`, add a **separate** state and load — a pause failure must not blank the page the way a renewal failure does:

```ts
const [pause, setPause] = useState<MeRequestState | null>(null);

const loadPause = () => api.me.pause()
  .then((r) => setPause(r.data))
  .catch(() => setPause({ requested_at: null }));
useEffect(() => { void loadPause(); }, []);
```

Render it between the offer/ask line and the `Also owed` section:

```tsx
{data.offer ? <OfferCard offer={data.offer} /> : <AskCard requestedAt={data.requested_at} onSent={load} />}
<MemberPauseCard requestedAt={pause?.requested_at ?? null} onSent={loadPause} />
{data.plan.balance > 0 && (
```

Import `MemberPauseCard` from `@/components/member/MemberPauseCard` and `MeRequestState` from `@/lib/api`.

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd 619-erp-frontend && npx vitest run src/__tests__/member-pause-card.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit (frontend repo)**

```bash
git add src/components/member/MemberPauseCard.tsx \
        src/app/\(bare\)/member/renew/page.tsx \
        src/__tests__/member-pause-card.test.tsx
git commit -m "feat(member): request a plan pause from the renew screen"
```

---

### Task 5: Frontend — privacy section on `/member/account`

**Files:**
- Create: `619-erp-frontend/src/components/member/MemberPrivacy.tsx`
- Modify: `619-erp-frontend/src/app/(bare)/member/account/page.tsx`
- Test: `619-erp-frontend/src/__tests__/member-privacy.test.tsx` (create)

**Interfaces:**
- Consumes: `api.me.deletion`, `api.me.requestDeletion`, `api.me.exportUrl`, `Section`, `Card`, `MC`, `longDate`, `useToast`.
- Produces: `<MemberPrivacy />`.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  deletion: vi.fn(),
  requestDeletion: vi.fn(),
}));
vi.mock('@/lib/api', () => ({
  api: {
    me: {
      deletion: mocks.deletion,
      requestDeletion: mocks.requestDeletion,
      exportUrl: () => 'http://api.test/api/me/export',
    },
  },
}));

import MemberPrivacy from '@/components/member/MemberPrivacy';
import { ToastProvider } from '@/lib/toast';

beforeEach(() => {
  mocks.deletion.mockReset().mockResolvedValue({ data: { requested_at: null } });
  mocks.requestDeletion.mockReset().mockResolvedValue({ data: { sent: true } });
});

describe('<MemberPrivacy />', () => {
  it('links the export to the download endpoint', async () => {
    render(<ToastProvider><MemberPrivacy /></ToastProvider>);
    const link = await screen.findByRole('link', { name: /Download my data/ });
    expect(link.getAttribute('href')).toBe('http://api.test/api/me/export');
    expect(link.hasAttribute('download')).toBe(true);
  });

  it('asks before requesting deletion, then shows the requested state', async () => {
    render(<ToastProvider><MemberPrivacy /></ToastProvider>);
    fireEvent.click(await screen.findByRole('button', { name: 'Request account deletion' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, request deletion' }));

    await vi.waitFor(() => expect(mocks.requestDeletion).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/Deletion requested/)).toBeTruthy();
  });

  it('shows an existing request without the action', async () => {
    mocks.deletion.mockResolvedValue({ data: { requested_at: '2026-11-05T09:00:00.000Z' } });
    render(<ToastProvider><MemberPrivacy /></ToastProvider>);
    expect(await screen.findByText(/Deletion requested/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Request account deletion' })).toBeNull();
  });

  it('renders the export even when the deletion read fails', async () => {
    mocks.deletion.mockRejectedValue(new Error('offline'));
    render(<ToastProvider><MemberPrivacy /></ToastProvider>);
    expect(await screen.findByRole('link', { name: /Download my data/ })).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd 619-erp-frontend && npx vitest run src/__tests__/member-privacy.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `MemberPrivacy`**

`Section title="Privacy and data"`, one `Card`:

- Row 1: `<a href={api.me.exportUrl()} download>` — 56px row, `Download` icon tile, title `Download my data`, sub `A JSON copy of your profile, plan and records`.
- Row 2: when `requested_at` is null, a button `Request account deletion` with sub `Your studio deletes the account and its records`. Clicking reveals the confirm block: `This asks your studio to delete your account and training history. It does not happen immediately.` with `Yes, request deletion` and `Cancel`.
- When `requested_at` is set: a status row `Deletion requested` + `Requested on {longDate(requested_at)} · your studio will process it.`, no action button.
- `deletion()` is read once on mount; a failure leaves the export row usable and hides the deletion action (no false claim).
- `requestDeletion()` success sets the returned state locally (`{ requested_at: new Date().toISOString() }`) and toasts `Sent — your studio will be in touch`.

- [ ] **Step 4: Render it on the account page**

In `MemberAccountPage`, render `<MemberPrivacy />` after `<PasswordForm />` and before the sign-out button.

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd 619-erp-frontend && npx vitest run src/__tests__/member-privacy.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 6: Typecheck and lint**

Run:
```bash
cd 619-erp-frontend
npx tsc --noEmit
npx eslint src/components/member/MemberPauseCard.tsx src/components/member/MemberPrivacy.tsx \
  "src/app/(bare)/member/renew/page.tsx" "src/app/(bare)/member/account/page.tsx" \
  src/__tests__/member-pause-card.test.tsx src/__tests__/member-privacy.test.tsx
```
Expected: exit 0; no new warnings.

- [ ] **Step 7: Commit (frontend repo)**

```bash
git add src/components/member/MemberPrivacy.tsx \
        src/app/\(bare\)/member/account/page.tsx \
        src/__tests__/member-privacy.test.tsx
git commit -m "feat(member): download data and request account deletion"
```
