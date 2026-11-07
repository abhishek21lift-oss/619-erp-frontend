# Member Membership Depth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A member can see their remaining PT sessions and reach Payments from the profile hub.

**Architecture:** One read-only member endpoint backed by `session_balance`, and two small UI additions on `/member/more`. Identity comes from the session in the existing client-portal style.

**Tech Stack:** Express 4 + node-postgres; Jest + Supertest with a mocked pool. Next.js / React; Vitest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-05-member-profile-expansion-design.md` (Phase A)

## Global Constraints

- Client and org ids come from `selfOf(req)`; a `client_id` in the query string is never read.
- Every query is scoped by `client_id = $1 AND organization_id = $2`.
- No new dependency. No migration.
- Member UI uses `Section` / `Card` / `MC` from `@/components/member/MemberUI` and the `longDate()` helper; do not introduce new colours or hex values.
- A failed sessions read must not change the membership card's existing content.
- Commits are part of each task. Push and open PRs only after the owner's explicit go-ahead (RULES §3).

## Review Focus

1. A member with zero packages sees no session line — never `0 of 0`.
2. `session_balance` rows holding a legacy client id do not appear for anyone.
3. A member with two active packages sees two lines, each with its own end date.
4. A failed `/api/me/session-balance` leaves the balance and plan dates intact.
5. Payments is reachable from the profile hub, not only the bottom tab.

---

### Task 1: Backend — `GET /api/me/session-balance`

**Files:**
- Modify: `619-erp-backend/src/modules/client-portal/member-training.service.js`
- Modify: `619-erp-backend/src/modules/client-portal/client-portal.routes.js` (near `router.get('/sessions')`, ~line 519)
- Test: `619-erp-backend/src/__tests__/memberSessionBalance.routes.test.js` (create)

**Interfaces:**
- Consumes: `selfOf(req)`, the `training` require already at the top of the routes file.
- Produces: `mySessionBalance(clientId: string, orgId: string): Promise<MeSessionBalanceRow[]>` where a row is
  `{ package_name: string | null; total_sessions: number; used_sessions: number; remaining_sessions: number; start_date: string; end_date: string | null; status: string }`.

- [ ] **Step 1: Write the failing test**

```js
'use strict';
// The member's own PT session packages: session identity only, active rows only.
const CLIENT = 'cl-self';
const ORG = '11111111-1111-4111-8111-111111111111';
const queries = [];
let responder = () => ({ rows: [], rowCount: 0 });

jest.mock('../db/pool', () => ({
  query: jest.fn(async (sql, params) => {
    queries.push({ sql: String(sql).replace(/\s+/g, ' ').trim(), params: params || [] });
    return responder();
  }),
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
  return a;
}

beforeEach(() => { queries.length = 0; responder = () => ({ rows: [], rowCount: 0 }); });

describe('GET /api/me/session-balance', () => {
  it('reads only the session client, in the session studio, active packages only', async () => {
    responder = () => ({
      rows: [{
        package_name: 'PT 12', total_sessions: 12, used_sessions: 4, remaining_sessions: 8,
        start_date: '2026-10-01', end_date: '2026-12-31', status: 'active',
      }],
      rowCount: 1,
    });
    const res = await request(app())
      .get('/api/me/session-balance?client_id=someone-else&organization_id=other')
      .expect(200);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].remaining_sessions).toBe(8);
    expect(res.body.data[0].end_date).toBe('2026-12-31');

    expect(queries).toHaveLength(1);
    const q = queries[0];
    expect(q.params[0]).toBe(CLIENT);
    expect(q.params[1]).toBe(ORG);
    expect(q.params).not.toContain('someone-else');
    expect(q.sql).toMatch(/status = 'active'/);
    expect(q.sql).toMatch(/end_date::text/);
  });

  it('answers an empty list when the studio does not track packages', async () => {
    const res = await request(app()).get('/api/me/session-balance').expect(200);
    expect(res.body.data).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd 619-erp-backend && npx jest src/__tests__/memberSessionBalance.routes.test.js --runInBand`
Expected: FAIL — 404 (route absent).

- [ ] **Step 3: Implement the service and route**

In `member-training.service.js`, before `module.exports`:

```js
/**
 * The member's active PT session packages. `session_balance` has no row-level
 * tenancy of its own beyond organization_id, and its client_id once pointed at
 * the dropped legacy `clients` table — migration 174 backfilled org from
 * pt_clients, so an old row that does not resolve simply does not appear.
 */
async function mySessionBalance(clientId, orgId) {
  const { rows } = await pool.query(
    `SELECT package_name, total_sessions, used_sessions, remaining_sessions,
            start_date::text AS start_date, end_date::text AS end_date, status
       FROM session_balance
      WHERE client_id = $1 AND organization_id = $2 AND status = 'active'
      ORDER BY end_date NULLS LAST, created_at`,
    [clientId, orgId],
  );
  return rows;
}
```

Export it: add `mySessionBalance` to `module.exports`.

In `client-portal.routes.js`, after `router.get('/sessions', …)`:

```js
// GET /api/me/session-balance — PT session packages the member still holds
router.get('/session-balance', wrap(async (req, res) => {
  const { clientId, orgId } = selfOf(req);
  res.json({ data: await training.mySessionBalance(clientId, orgId) });
}));
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd 619-erp-backend && npx jest src/__tests__/memberSessionBalance.routes.test.js --runInBand`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit (backend repo)**

```bash
git add src/modules/client-portal/member-training.service.js \
        src/modules/client-portal/client-portal.routes.js \
        src/__tests__/memberSessionBalance.routes.test.js
git commit -m "feat(member): expose the member's active session packages"
```

---

### Task 2: Frontend — Payments row and sessions on the membership card

**Files:**
- Modify: `619-erp-frontend/src/lib/api/types.ts` (after `MeMembership`, ~line 3394)
- Modify: `619-erp-frontend/src/lib/api/endpoints/platform.ts` (after `membership`, ~line 922)
- Modify: `619-erp-frontend/src/app/(bare)/member/more/page.tsx`
- Test: `619-erp-frontend/src/__tests__/member-more-page.test.tsx`

**Interfaces:**
- Consumes: `api.me.sessionBalance()` from Task 1; `longDate` from MemberUI.
- Produces: `MeSessionBalance` type, used by the card.

- [ ] **Step 1: Add the failing test cases**

In `member-more-page.test.tsx`:

1. Add `sessionBalance: vi.fn()` to `apiMocks` and to the mocked `api.me`.
2. Reset it in `beforeEach`: `apiMocks.sessionBalance.mockReset().mockResolvedValue({ data: [] });`
3. Append these cases:

```tsx
describe('<MemberMorePage /> sessions and payments', () => {
  it('shows each active package with its own remaining count and end date', async () => {
    apiMocks.sessionBalance.mockResolvedValue({
      data: [{
        package_name: 'PT 12', total_sessions: 12, used_sessions: 4, remaining_sessions: 8,
        start_date: '2026-10-01', end_date: '2026-12-31', status: 'active',
      }],
    });
    renderPage();
    const card = await screen.findByRole('region', { name: 'Your membership' });
    expect(await within(card).findByText('8 of 12 sessions left')).toBeTruthy();
    expect(within(card).getByText(/ends 31 Dec 2026/)).toBeTruthy();
  });

  it('shows no session line when the studio does not track packages', async () => {
    renderPage();
    const card = await screen.findByRole('region', { name: 'Your membership' });
    expect(within(card).queryByText(/sessions left/)).toBeNull();
  });

  it('keeps the balance and plan dates when the session read fails', async () => {
    apiMocks.sessionBalance.mockRejectedValue(new Error('offline'));
    renderPage();
    const card = await screen.findByRole('region', { name: 'Your membership' });
    expect(within(card).getByText('₹1,200')).toBeTruthy();
    expect(within(card).getByText('Ends 12 Mar 2027')).toBeTruthy();
    expect(within(card).queryByText(/sessions left/)).toBeNull();
  });

  it('links to Payments from the membership group', async () => {
    renderPage();
    const link = await screen.findByRole('link', { name: /Payments/ });
    expect(link.getAttribute('href')).toBe('/member/payments');
  });
});
```

- [ ] **Step 2: Run the test file to verify it fails**

Run: `cd 619-erp-frontend && npx vitest run src/__tests__/member-more-page.test.tsx`
Expected: FAIL — `api.me.sessionBalance` is not a function / Payments link missing.

- [ ] **Step 3: Add the type and endpoint**

In `types.ts`:

```ts
/** One PT session package the member still holds (/api/me/session-balance). */
export type MeSessionBalance = {
  package_name: string | null;
  total_sessions: number;
  used_sessions: number;
  remaining_sessions: number;
  start_date: string;
  end_date: string | null;
  status: string;
};
```

In `platform.ts`, inside `me`, after `membership`:

```ts
sessionBalance: () => http<{ data: MeSessionBalance[] }>('/api/me/session-balance'),
```

Import the type in the endpoint file the same way its siblings are imported.

- [ ] **Step 4: Implement the UI**

In `more/page.tsx`:

- Import `Receipt` from `lucide-react` and `MeSessionBalance` from `@/lib/api`.
- In `GROUPS`, Membership rows become:

```tsx
rows: [
  { href: '/member/renew', label: 'Renew', sub: 'Your plan dates and renewal', icon: RefreshCw },
  { href: '/member/payments', label: 'Payments', sub: 'Receipts and payment history', icon: Receipt },
  { href: '/member/card', label: 'Membership card', sub: 'Check-in code and days left', icon: IdCard },
],
```

- In `ProfileBody`, add `const [sessions, setSessions] = useState<MeSessionBalance[]>([]);`
  and inside the existing profile effect, after the membership read:

```ts
api.me.sessionBalance()
  .then((r) => { if (live) setSessions(r.data); })
  .catch(() => { /* sessions are additive: the plan card stands without them */ });
```

- Change the call to `<MembershipCard plan={plan} profile={profile} sessions={sessions} />` and the signature to accept `sessions: MeSessionBalance[]`.
- Inside the card, after the plan-dates block and before its closing tag:

```tsx
{sessions.length > 0 && (
  <div className="mt-3 space-y-1" aria-label="Session balance">
    {sessions.map((s, i) => (
      <p key={i} className="text-[12.5px]" style={{ color: MC.muted }}>
        <span className="font-[750]" style={{ color: MC.ink }}>
          {s.remaining_sessions} of {s.total_sessions} sessions left
        </span>
        {s.end_date && <> · ends {longDate(s.end_date)}</>}
      </p>
    ))}
  </div>
)}
```

- [ ] **Step 5: Run the test file to verify it passes**

Run: `cd 619-erp-frontend && npx vitest run src/__tests__/member-more-page.test.tsx`
Expected: PASS (existing cases plus 4 new).

- [ ] **Step 6: Typecheck and lint the touched files**

Run:
```bash
cd 619-erp-frontend
npx tsc --noEmit
npx eslint "src/app/(bare)/member/more/page.tsx" src/lib/api/endpoints/platform.ts src/__tests__/member-more-page.test.tsx
```
Expected: exit 0; no new warnings.

- [ ] **Step 7: Commit (frontend repo)**

```bash
git add src/app/\(bare\)/member/more/page.tsx src/lib/api/endpoints/platform.ts \
        src/lib/api/types.ts src/__tests__/member-more-page.test.tsx
git commit -m "feat(member): show session balance and link Payments from profile"
```
