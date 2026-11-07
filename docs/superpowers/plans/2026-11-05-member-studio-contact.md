# Member Studio Contact Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The trainer can publish the studio's phone, address and hours, and a member sees them in the profile hub.

**Architecture:** Three nullable columns on `organizations`, one lib module holding the SQL (the layering test caps `routes/profile.js`), a trainer-only GET/PATCH pair, and an extended member profile read. UI is one small card on each side.

**Tech Stack:** Express 4 + node-postgres; Jest + Supertest with a mocked pool. Next.js / React; Vitest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-05-member-profile-expansion-design.md` (Phase C)

## Global Constraints

- The trainer's organization comes from `req.user.organization_id`; a request body never supplies it.
- `GET /api/me/profile` stays scoped by `selfOf(req)`.
- All three columns are optional and nullable; empty string is stored as `NULL`.
- `PUT /api/profile/studio` replaces the whole contact block: all three fields are written on every save, and an omitted field is stored as `NULL`. The card always sends all three.
- Length caps: phone 20, address 300, hours 120 characters. Over the cap is refused with 400; nothing is written.
- No new dependency.
- Trainer UI uses `TextField` / `TextAreaField` from `@/components/ui/form`. `GlassCard` and `SectionHeader` are local to `settings/profile/page.tsx` (lines 162 and 419), so the page wraps the card and the component owns only the form.
- Member UI uses `Section` / `Card` / `MC` from `@/components/member/MemberUI`; no new colours or hex values.
- Commits are part of each task. Push and open PRs only after the owner's explicit go-ahead (RULES §3).
- **The migration is not run as part of this plan.** `npm run migrate` needs a database and the owner's approval (RULES §4).

## Review Focus

1. A member cannot read or write another studio's contact details.
2. A member cannot call `PATCH /api/profile/studio` at all (`requireTrainer`).
3. Clearing a field stores `NULL` and the member card drops that row instead of rendering an empty line.
4. An over-long value is refused before any UPDATE runs.
5. A studio with nothing published renders no card for the member — never three blank rows.
6. `routes/profile.js` gains no new SQL literal (its budget is 28).

---

### Task 1: Backend — columns, studio routes, member profile fields

**Files:**
- Create: `619-erp-backend/src/db/migrations/265_organization_contact.sql`
- Create: `619-erp-backend/src/lib/studioDetails.js`
- Modify: `619-erp-backend/src/routes/profile.js` (after the studio-logo routes, ~line 517)
- Modify: `619-erp-backend/src/modules/client-portal/client-portal.routes.js` (the `/profile` SELECT, ~line 90)
- Test: `619-erp-backend/src/__tests__/profile.studioContact.test.js` (create)
- Test: `619-erp-backend/src/__tests__/clientAuth.isolation.test.js` (one added case)

**Interfaces:**
- Consumes: `requireTrainer`, `logActivity`, `pool`, `selfOf(req)`.
- Produces:
  - `getStudio(db, orgId: string): Promise<{ name: string; phone: string | null; address: string | null; hours: string | null } | null>`
  - `setStudio(db, orgId: string, input: { phone: string | null; address: string | null; hours: string | null }): Promise<same row | null>`
  - `GET /api/profile/studio` → the row above
  - `PUT /api/profile/studio` → the updated row
  - `/api/me/profile` gains `studio_phone`, `studio_address`, `studio_hours`

- [ ] **Step 1: Write the migration**

```sql
-- ============================================================
-- 265_organization_contact.sql
-- Studio contact details — what a member sees in their profile hub.
--
-- Three free-text columns on the studio itself. `hours` is deliberately not a
-- structured schedule: a studio writes "Mon–Sat 6am–9pm" and the member reads
-- it, which is the whole requirement.
--
-- Additive and nullable. Idempotent; safe to re-run.
-- ============================================================

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS phone   TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS hours   TEXT;

COMMENT ON COLUMN organizations.hours IS
  'Free-text opening hours shown to members. Not a structured schedule.';
```

**Do not run the migration.** It is applied by the normal deploy path after the owner approves.

- [ ] **Step 2: Write the failing route test**

```js
'use strict';
// The studio's contact details: the trainer writes them, the member reads them
// through their own profile, and nobody else can reach the write.
const ORG = '11111111-1111-4111-8111-111111111111';
const queries = [];
let mockRow = null;

jest.mock('../db/pool', () => ({
  query: jest.fn(async (sql, params) => {
    queries.push({ sql: String(sql).replace(/\s+/g, ' ').trim(), params });
    if (/FROM organizations/.test(sql)) return { rows: mockRow ? [mockRow] : [], rowCount: mockRow ? 1 : 0 };
    if (/UPDATE organizations/.test(sql)) return { rows: mockRow ? [mockRow] : [], rowCount: mockRow ? 1 : 0 };
    return { rows: [], rowCount: 0 };
  }),
  connect: jest.fn(),
}));
jest.mock('../lib/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(), fatal: jest.fn() }));
jest.mock('../lib/activityLog', () => ({ logActivity: jest.fn() }));
jest.mock('../lib/fileStorage', () => ({ saveFile: jest.fn(), deleteFile: jest.fn() }));

const express = require('express');
const request = require('supertest');

function app(user) {
  const a = express();
  a.use(express.json());
  a.use((req, _res, next) => { req.user = user; next(); });
  a.use('/api/profile', require('../routes/profile'));
  return a;
}

const TRAINER = { id: 'usr-t', role: 'trainer', organization_id: ORG };
const MEMBER = { id: 'usr-m', role: 'member', pt_client_id: 'cl-1', organization_id: ORG };

beforeEach(() => { queries.length = 0; mockRow = null; });

describe('GET /api/profile/studio', () => {
  it('returns the trainer studio contact details', async () => {
    mockRow = { name: 'Iron Studio', phone: '9876543210', address: '2nd floor, MG Road', hours: 'Mon–Sat 6am–9pm' };
    const res = await request(app(TRAINER)).get('/api/profile/studio').expect(200);
    expect(res.body).toEqual(mockRow);
    expect(queries[0].params).toEqual([ORG]);
  });

  it('refuses a member', async () => {
    await request(app(MEMBER)).get('/api/profile/studio').expect(403);
    expect(queries).toHaveLength(0);
  });
});

describe('PUT /api/profile/studio', () => {
  it('writes the trimmed values and returns the stored row', async () => {
    mockRow = { name: 'Iron Studio', phone: '9876543210', address: 'MG Road', hours: 'Mon–Sat' };
    const res = await request(app(TRAINER)).put('/api/profile/studio')
      .send({ phone: '  9876543210 ', address: ' MG Road ', hours: 'Mon–Sat' })
      .expect(200);

    expect(res.body).toEqual(mockRow);
    const q = queries.find((x) => /UPDATE organizations/.test(x.sql));
    expect(q.params).toEqual([ORG, '9876543210', 'MG Road', 'Mon–Sat']);
  });

  it('stores null for a blank or missing field', async () => {
    mockRow = { name: 'Iron Studio', phone: null, address: null, hours: 'Mon–Sat' };
    await request(app(TRAINER)).put('/api/profile/studio')
      .send({ phone: '   ', hours: 'Mon–Sat' })
      .expect(200);

    const q = queries.find((x) => /UPDATE organizations/.test(x.sql));
    expect(q.params).toEqual([ORG, null, null, 'Mon–Sat']);
  });

  it('refuses a value over its cap without writing', async () => {
    await request(app(TRAINER)).put('/api/profile/studio')
      .send({ address: 'x'.repeat(301) })
      .expect(400);
    expect(queries.some((x) => /UPDATE organizations/.test(x.sql))).toBe(false);
  });

  it('refuses a member', async () => {
    await request(app(MEMBER)).put('/api/profile/studio').send({ phone: '9876543210' }).expect(403);
    expect(queries.some((x) => /UPDATE organizations/.test(x.sql))).toBe(false);
  });
});
```

These mocks mirror `profile.studioLogo.test.js`, which mounts this same router. If the module graph complains about another collaborator, copy its mock from that file rather than inventing one.

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd 619-erp-backend && npx jest src/__tests__/profile.studioContact.test.js --runInBand`
Expected: FAIL — 404 (routes absent).

- [ ] **Step 4: Implement `studioDetails.js`**

The SQL lives here, not in the route: `architecture.layering.convention.test.js` caps `routes/profile.js` at 28 SQL literals and raising a budget is never correct. Same reason `studioBranding.js` exists.

```js
'use strict';
// A studio's contact details, set by its own trainer and shown to its members.
//
// The SQL lives here rather than in routes/profile.js, which the layering
// convention test caps. Free text on purpose: "hours" is what the studio says,
// not a schedule this app parses.

async function getStudio(db, orgId) {
  const { rows } = await db.query(
    `SELECT name, phone, address, hours FROM organizations WHERE id = $1`,
    [orgId]
  );
  return rows[0] || null;
}

async function setStudio(db, orgId, { phone, address, hours }) {
  const { rows } = await db.query(
    `UPDATE organizations
        SET phone = $2, address = $3, hours = $4, updated_at = NOW()
      WHERE id = $1
      RETURNING name, phone, address, hours`,
    [orgId, phone, address, hours]
  );
  return rows[0] || null;
}

module.exports = { getStudio, setStudio };
```

- [ ] **Step 5: Add the routes**

In `routes/profile.js`, require `const studioDetails = require('../lib/studioDetails');` at the top and place these directly after the studio-logo routes:

```js
// ── Studio contact details ───────────────────────────────────────────────────
// What a member sees when they need to call or visit. Free text; the cap is
// there so a card cannot be pushed off the screen, not to validate a format.
const STUDIO_FIELDS = [
  { body: 'phone', col: 'phone', max: 20 },
  { body: 'address', col: 'address', max: 300 },
  { body: 'hours', col: 'hours', max: 120 },
];

function studioInput(body) {
  const out = {};
  for (const f of STUDIO_FIELDS) {
    const raw = body[f.body];
    if (raw === undefined || raw === null) { out[f.col] = null; continue; }
    const v = String(raw).trim();
    if (v.length > f.max) return { error: `${f.body} is too long (${f.max} characters max)` };
    out[f.col] = v || null;
  }
  return { value: out };
}

router.get('/studio', requireTrainer, async (req, res, next) => {
  try {
    res.json(await studioDetails.getStudio(pool, req.user.organization_id));
  } catch (err) {
    next(err);
  }
});

router.put('/studio', requireTrainer, async (req, res, next) => {
  try {
    const parsed = studioInput(req.body || {});
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    const saved = await studioDetails.setStudio(pool, req.user.organization_id, parsed.value);
    await logActivity(req, 'profile.studio.update', 'organization', req.user.organization_id);
    res.json(saved);
  } catch (err) {
    next(err);
  }
});
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `cd 619-erp-backend && npx jest src/__tests__/profile.studioContact.test.js --runInBand`
Expected: PASS (7 tests).

- [ ] **Step 7: Extend the member profile read**

In `client-portal.routes.js`, the `/profile` query already joins `organizations o`. Add to its SELECT list:

```sql
o.phone AS studio_phone, o.address AS studio_address, o.hours AS studio_hours
```

This edits an existing SQL literal — no new statement, so no budget change.

- [ ] **Step 8: Add the member-side assertion**

`clientAuth.isolation.test.js` already mounts the member router with an injected session and reads `pool.query` mock calls — that is the established home for "what the profile query may touch". Append to the `the client portal reads only the caller` describe:

```js
it('carries the studio contact details on the member profile', async () => {
  // The member's own read is the only place these appear. The columns are the
  // studio's, so a SELECT * or a wider join would expose more than intended.
  pool.query.mockResolvedValue({ rows: [{ id: 'ptc-1' }] });
  await request(portalApp(CLIENT_USER)).get('/api/me/profile');

  const [sql] = pool.query.mock.calls[0];
  expect(sql).toMatch(/o\.phone AS studio_phone/);
  expect(sql).toMatch(/o\.address AS studio_address/);
  expect(sql).toMatch(/o\.hours AS studio_hours/);
});
```

- [ ] **Step 9: Run the touched backend suites**

Run:
```bash
cd 619-erp-backend
npx jest src/__tests__/profile.studioContact.test.js src/__tests__/clientAuth.isolation.test.js \
         src/__tests__/architecture.layering.convention.test.js --runInBand
```
Expected: PASS. The layering test proves `routes/profile.js` did not grow past 28.

- [ ] **Step 10: Commit (backend repo)**

```bash
git add src/db/migrations/265_organization_contact.sql \
        src/lib/studioDetails.js src/routes/profile.js \
        src/modules/client-portal/client-portal.routes.js \
        src/__tests__/profile.studioContact.test.js \
        src/__tests__/clientAuth.isolation.test.js
git commit -m "feat(studio): contact details the trainer sets and the member sees"
```

---

### Task 2: Frontend — API methods and the trainer's Studio details card

**Files:**
- Modify: `619-erp-frontend/src/lib/api/types.ts` (near `ProfileMe`, ~line 101)
- Modify: `619-erp-frontend/src/lib/api/endpoints/auth.ts` (inside `profile`, ~line 186)
- Create: `619-erp-frontend/src/components/profile/StudioDetailsCard.tsx`
- Modify: `619-erp-frontend/src/app/(chrome)/settings/profile/page.tsx` (overview tab)
- Test: `619-erp-frontend/src/__tests__/studio-details-card.test.tsx` (create)

**Interfaces:**
- Consumes: `api.profile.studio`, `api.profile.updateStudio`, `TextField`, `TextAreaField`, `useStandaloneField`, `useToast`, `errorMessage`.
- Produces:
  - `StudioContact = { name: string; phone: string | null; address: string | null; hours: string | null }`
  - `StudioContactInput = { phone: string | null; address: string | null; hours: string | null }`
  - `api.profile.studio(): Promise<StudioContact>`
  - `api.profile.updateStudio(body: StudioContactInput): Promise<StudioContact>`
  - `<StudioDetailsCard />`

- [ ] **Step 1: Add the types and methods**

In `types.ts`:

```ts
/** The studio's own contact details (GET/PATCH /api/profile/studio). */
export type StudioContact = {
  name: string;
  phone: string | null;
  address: string | null;
  hours: string | null;
};

export type StudioContactInput = Pick<StudioContact, 'phone' | 'address' | 'hours'>;
```

In `endpoints/auth.ts`, inside `profile`:

```ts
/** The studio's contact details — the trainer's to write, shown to members. */
studio: () => http<StudioContact>('/api/profile/studio'),
updateStudio: (data: StudioContactInput) =>
  http<StudioContact>('/api/profile/studio', { method: 'PUT', body: JSON.stringify(data) }),
```

- [ ] **Step 2: Write the failing component test**

```tsx
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

const mocks = vi.hoisted(() => ({ studio: vi.fn(), updateStudio: vi.fn() }));
vi.mock('@/lib/api', () => ({
  api: { profile: { studio: mocks.studio, updateStudio: mocks.updateStudio } },
}));

import StudioDetailsCard from '@/components/profile/StudioDetailsCard';
import { ToastProvider } from '@/lib/toast';

const ROW = {
  name: 'Iron Studio', phone: '9876543210', address: 'MG Road', hours: 'Mon–Sat 6am–9pm',
};

beforeEach(() => {
  mocks.studio.mockReset().mockResolvedValue(ROW);
  mocks.updateStudio.mockReset().mockResolvedValue(ROW);
});

describe('<StudioDetailsCard />', () => {
  it('shows what the studio has published', async () => {
    render(<ToastProvider><StudioDetailsCard /></ToastProvider>);
    expect(await screen.findByDisplayValue('9876543210')).toBeTruthy();
    expect(screen.getByDisplayValue('MG Road')).toBeTruthy();
    expect(screen.getByDisplayValue('Mon–Sat 6am–9pm')).toBeTruthy();
  });

  it('saves trimmed values and sends null for a cleared field', async () => {
    render(<ToastProvider><StudioDetailsCard /></ToastProvider>);
    const phone = await screen.findByLabelText('Phone');
    fireEvent.change(phone, { target: { value: '  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save studio details' }));

    await vi.waitFor(() => expect(mocks.updateStudio).toHaveBeenCalledWith({
      phone: null, address: 'MG Road', hours: 'Mon–Sat 6am–9pm',
    }));
  });

  it('keeps the form usable when the read fails', async () => {
    mocks.studio.mockRejectedValue(new Error('offline'));
    render(<ToastProvider><StudioDetailsCard /></ToastProvider>);
    expect(await screen.findByLabelText('Phone')).toBeTruthy();
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd 619-erp-frontend && npx vitest run src/__tests__/studio-details-card.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement `StudioDetailsCard`**

The component renders the three fields and the save button only — no card chrome. `GlassCard` and `SectionHeader` are local to `settings/profile/page.tsx`, so the page supplies those; keeping the form separate is what makes it testable.

- Fields: `TextField label="Phone" type="tel" maxLength={20}`, `TextAreaField label="Address" rows={2} maxLength={300}`, `TextAreaField label="Opening hours" rows={2} maxLength={120}`.
- Save: `api.profile.updateStudio({ phone: phone.trim() || null, address: address.trim() || null, hours: hours.trim() || null })`; success toasts `Studio details saved`; failure uses `errorMessage(err, 'Could not save studio details')`.
- Read failure is silent and leaves the form empty and usable — the trainer may still fill it in.
- While busy the button is disabled and shows `Loader2`.
- The form is `<form onSubmit={...} noValidate className="space-y-4">` with a `Button type="submit"` labelled `Save studio details`.

Keep the copy terse — one line above the fields at most (`What members see when they need to call or visit.`), because this page's cards are dense.

- [ ] **Step 5: Render it on the profile overview tab**

In `settings/profile/page.tsx`, inside `{tab === 'overview' && ( … )}`, after the Personal Information card:

```tsx
<FadeUp>
  <GlassCard className="p-6" tone="mint">
    <SectionHeader tone="mint" icon={<Building2 size={15} />} title="Studio details" />
    <StudioDetailsCard />
  </GlassCard>
</FadeUp>
```

Import `StudioDetailsCard` from `@/components/profile/StudioDetailsCard` and `Building2` from `lucide-react`. The tone key is `mint`, not `emerald` — `profileTheme.ts` has no `emerald`.

- [ ] **Step 6: Run the test to verify it passes**

Run: `cd 619-erp-frontend && npx vitest run src/__tests__/studio-details-card.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 7: Typecheck and lint**

Run:
```bash
cd 619-erp-frontend
npx tsc --noEmit
npx eslint src/components/profile/StudioDetailsCard.tsx src/lib/api/endpoints/auth.ts \
  src/lib/api/types.ts src/__tests__/studio-details-card.test.tsx \
  "src/app/(chrome)/settings/profile/page.tsx"
```
Expected: exit 0; no new warnings.

- [ ] **Step 8: Commit (frontend repo)**

```bash
git add src/components/profile/StudioDetailsCard.tsx src/lib/api/endpoints/auth.ts \
        src/lib/api/types.ts src/__tests__/studio-details-card.test.tsx \
        "src/app/(chrome)/settings/profile/page.tsx"
git commit -m "feat(studio): let the trainer publish contact details"
```

---

### Task 3: Frontend — the member's studio card

**Files:**
- Modify: `619-erp-frontend/src/lib/api/types.ts` (`MeProfile`, ~line 3317)
- Modify: `619-erp-frontend/src/app/(bare)/member/more/page.tsx`
- Test: `619-erp-frontend/src/__tests__/member-more-page.test.tsx`

**Interfaces:**
- Consumes: the new `studio_phone` / `studio_address` / `studio_hours` fields on `MeProfile`; `Section`, `Card`, `MC`.
- Produces: a `StudioCard` local component rendered only when at least one field is set.

- [ ] **Step 1: Extend `MeProfile`**

```ts
  studio_name: string | null;
  studio_logo: string | null;
  /** What the studio published for members; any of them may be null. */
  studio_phone: string | null;
  studio_address: string | null;
  studio_hours: string | null;
```

Add the same three fields to the test fixture in `member-more-page.test.tsx` as `null` so the existing cases keep passing. Run `npx tsc --noEmit` after this step: any object literal typed as `MeProfile` elsewhere must gain the fields too.

- [ ] **Step 2: Add the failing test cases**

```tsx
describe('<MemberMorePage /> studio contact', () => {
  it('shows the phone, address and hours the studio published', async () => {
    apiMocks.profile.mockResolvedValue({
      data: {
        ...baseProfile,
        studio_phone: '9876543210', studio_address: 'MG Road', studio_hours: 'Mon–Sat 6am–9pm',
      },
    });
    renderPage();
    const card = await screen.findByRole('region', { name: 'Studio contact' });
    expect(within(card).getByText('9876543210')).toBeTruthy();
    expect(within(card).getByText('MG Road')).toBeTruthy();
    expect(within(card).getByText('Mon–Sat 6am–9pm')).toBeTruthy();
  });

  it('renders no studio card when nothing is published', async () => {
    renderPage();
    await screen.findByRole('region', { name: 'Your membership' });
    expect(screen.queryByRole('region', { name: 'Studio contact' })).toBeNull();
  });

  it('drops only the rows that are empty', async () => {
    apiMocks.profile.mockResolvedValue({
      data: { ...baseProfile, studio_phone: '9876543210', studio_address: null, studio_hours: null },
    });
    renderPage();
    const card = await screen.findByRole('region', { name: 'Studio contact' });
    expect(within(card).getByText('9876543210')).toBeTruthy();
    expect(within(card).queryByText(/MG Road/)).toBeNull();
  });
});
```

Where `baseProfile` is the fixture the file already builds — extract it to a module-level const rather than duplicating it.

**Naming collision:** the page's `GROUPS` already renders an `<h2>Your studio</h2>` above the Studio rows. Give the contact card `aria-label="Studio contact"` instead, and assert on that name to keep the two apart.

- [ ] **Step 3: Run the test file to verify it fails**

Run: `cd 619-erp-frontend && npx vitest run src/__tests__/member-more-page.test.tsx`
Expected: FAIL — no region named `Studio contact`.

- [ ] **Step 4: Implement the card**

In `more/page.tsx`, after `<CoachCard …>` and before the `GROUPS.map`:

```tsx
{profile && <StudioCard profile={profile} delay={0.1} />}
```

```tsx
/**
 * What the studio published: a phone number, an address, opening hours.
 * Whole rows only — a published studio should read as a card, not as three
 * labels with two blanks. Omitted entirely when the studio published nothing.
 */
function StudioCard({ profile, delay }: { profile: MeProfile; delay: number }) {
  const rows: [LucideIcon, string][] = [
    [Phone, profile.studio_phone ?? ''],
    [MapPin, profile.studio_address ?? ''],
    [Clock, profile.studio_hours ?? ''],
  ].filter(([, v]) => v) as [LucideIcon, string][];
  if (rows.length === 0) return null;

  return (
    <m.section aria-label="Studio contact" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE, delay }} className="mb-4">
      <div className="rounded-[18px] p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <p className="mb-2 text-[11px] font-[780] uppercase tracking-[0.12em]" style={{ color: MC.muted }}>
          {profile.studio_name ?? 'Your studio'}
        </p>
        <ul className="space-y-2">
          {rows.map(([Icon, value]) => (
            <li key={value} className="flex items-start gap-2.5 text-[13px]" style={{ color: MC.ink }}>
              <Icon size={15} className="mt-0.5 shrink-0" style={{ color: MC.muted }} aria-hidden />
              {Icon === Phone ? <a href={`tel:${value}`} style={{ color: MC.primary }}>{value}</a> : <span>{value}</span>}
            </li>
          ))}
        </ul>
      </div>
    </m.section>
  );
}
```

Import `Phone`, `MapPin`, `Clock` from `lucide-react` (the page already imports `LucideIcon`).

- [ ] **Step 5: Run the test file to verify it passes**

Run: `cd 619-erp-frontend && npx vitest run src/__tests__/member-more-page.test.tsx`
Expected: PASS (existing cases plus 3 new).

- [ ] **Step 6: Typecheck and lint**

Run:
```bash
cd 619-erp-frontend
npx tsc --noEmit
npx eslint "src/app/(bare)/member/more/page.tsx" src/lib/api/types.ts \
  src/__tests__/member-more-page.test.tsx
```
Expected: exit 0; no new warnings.

- [ ] **Step 7: Commit (frontend repo)**

```bash
git add "src/app/(bare)/member/more/page.tsx" src/lib/api/types.ts \
        src/__tests__/member-more-page.test.tsx
git commit -m "feat(member): show the studio's contact details in the profile hub"
```

---

## What this plan deliberately does not do

- No structured opening hours, no per-day schedule, no "open now" indicator.
- No map link or geocoding — the address is text.
- No studio contact on any other member screen; the profile hub is the one place.
- No change to the platform console, which can already edit the studio name and logo.
