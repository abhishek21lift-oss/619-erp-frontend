# K11 Client Onboarding Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the client intake journey follow the K11 onboarding sequence — welcome/tour, provisional PT enrolment, screening, goals, assessment, program design — without rebuilding the assessment, retest, workout-log, diet or cardio modules.

**Architecture:** The backend journey service owns the order and every step state; the frontend mirrors the keys and renders the server's answer. Provisional enrolment writes the term but forces `status = 'pending'` until a new `maybeActivateClient` helper sees completed consent, a fully answered PAR-Q and no hard block. Program design is a read-only calculator hub over existing endpoints; its only saved artifacts remain the workout and diet plans.

**Tech Stack:** Node/Express + PostgreSQL (backend), Next.js App Router + React + TypeScript + Vitest (frontend).

**Spec:** `619-erp-frontend/docs/superpowers/specs/2026-10-23-k11-onboarding-flow-design.md`

## Global Constraints

- Work on branch `feat/k11-onboarding-flow` in both repos, branched from updated `origin/main`.
- Exactly one migration: `237_client_welcome_tour.sql`, additive nullable column, no backfill, no destructive SQL.
- Deploy the backend before the frontend. The frontend drops the old `registration` and `workout_plan` journey keys; that is safe only because the backend is live first.
- Preserve tenant isolation (`orgIdOf` / `tenantScope`) and activity logging on every write.
- Existing clients with a PT term are grandfathered: welcome tour reads `done`, status unchanged, screening stays warn-only.
- Program-design values are display-only; persist nothing new.
- Reuse the existing assessment, retest, workout-log, diet-plan and cardio-calculator modules; do not fork them.
- Backend verification: `npx jest --forceExit --runInBand --testPathPatterns='<file>' --watchAll=false`.
- Frontend verification: `npx vitest run <file>`, then `npm run typecheck`, `npm run lint`, `npm run build`.
- Real-DB suites skip when `RLS_TEST_DATABASE_URL` is absent; that is expected locally.

## Review Focus

1. **Pending client with a term** — training, assessment, session booking and plan assignment must return 409 `CLIENT_PENDING_ACTIVATION`, not `CLIENT_NOT_ENROLLED`. Pinned in Task 3 (unit) and Task 4 (real DB).
2. **Activation after provisional enrolment** — the client must flip to `active` when the *last* missing piece lands, whether that is consent, a PAR-Q submit/edit, or an approved clearance, and must never activate through a hard block. Pinned in Task 4.
3. **Pending client with an ended term** — the journey must show `renew`, never `done`. Pinned in Task 1.
4. **Missing profile/assessment data on Program Design** — no DOB, sex, height, weight, BMR or resting HR must render “—” and a prompt, never `NaN` or a crash. Pinned in Task 9 (calculations) and Task 10 (render).
5. **Cross-tenant or deleted client on the new welcome-tour route** — must 404 and write nothing. Pinned in Task 2.

---

## Backend

### Task 1: Migration and journey model

**Files:**
- Create: `619-erp-backend/src/db/migrations/237_client_welcome_tour.sql`
- Modify: `619-erp-backend/src/modules/pt-os/client-journey.service.js:142-219`
- Test: `619-erp-backend/src/__tests__/clientJourney.realDb.integration.test.js`

**Interfaces:**
- Produces: `STEP_ORDER = Object.freeze(['welcome_tour', 'enrolment', 'consent', 'parq', 'interview', 'goals', 'assessment', 'program_design'])`.
- Produces: each journey step is still `{ key, state, detail?, optional? }`; `next` is the first step whose state is not `done`.
- Produces: `welcome_tour` is `done` when `pt_clients.welcome_tour_completed_at` is set **or** the client has a PT term; otherwise `todo`.
- Produces: `program_design` replaces `workout_plan`; `done` when an active `workout_assignments` row exists, `todo` when the client may train, `blocked` otherwise with the existing “Enrol the client in PT before assigning a plan.” detail.
- Leaves the `enrolment` state rule unchanged in this task; Task 4 changes it.

- [ ] **Step 1: Write the migration**

```sql
-- 237_client_welcome_tour.sql
-- K11 onboarding step 1: the trainer recorded a welcome and gym tour.
-- Additive and nullable; existing clients are grandfathered in the journey
-- service when they already have a PT term, so no backfill is needed.

ALTER TABLE pt_clients
  ADD COLUMN IF NOT EXISTS welcome_tour_completed_at TIMESTAMPTZ;

COMMENT ON COLUMN pt_clients.welcome_tour_completed_at IS
  'When the trainer completed the K11 welcome and gym tour (step 1). NULL for not recorded.';
```

- [ ] **Step 2: Update the journey test first**

In `clientJourney.realDb.integration.test.js`, replace the expected state maps and walk order:

```js
expect(states(j)).toEqual({
  welcome_tour: 'todo', enrolment: 'blocked', consent: 'todo', parq: 'todo',
  interview: 'todo', goals: 'todo', assessment: 'todo', program_design: 'blocked',
});
expect(j.next).toBe('welcome_tour');
```

The walk is now: mark the tour (`UPDATE pt_clients SET welcome_tour_completed_at = NOW() WHERE id = $1`), screen, enrol, interview, goals, assessment, assign a plan. Assert `next` is `welcome_tour → enrolment → interview → goals → assessment → program_design → null`. Keep the old early-enrolment refusal assertion in this task; Task 4 changes it.

Add the ended-term regression:

```js
it('a pending client with an ended term shows renew, not done', async () => {
  const id = await newClient();
  await pool.query(
    `UPDATE pt_clients SET status = 'pending', pt_end_date = CURRENT_DATE - 1, duration_months = 1 WHERE id = $1`,
    [id],
  );
  expect((await journey(id)).steps.find((s) => s.key === 'enrolment').state).toBe('renew');
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx jest --forceExit --runInBand --testPathPatterns='clientJourney.realDb' --watchAll=false`
Expected: FAIL or SKIP without `RLS_TEST_DATABASE_URL`. The assertion must fail on the old key set when a DB is present.

- [ ] **Step 4: Implement the new order and states**

In `client-journey.service.js`:
- Replace `STEP_ORDER` with the new array.
- Add `c.welcome_tour_completed_at` to the journey SELECT.
- Build `welcomeTourState = c.welcome_tour_completed_at || c.has_pt_term ? 'done' : 'todo'`.
- Rename the `workout_plan` step to `program_design` and use this state:

```js
const canTrain = c.status === 'active' && !c.ended;
const programDesignState = c.has_active_plan ? 'done'
  : enrolmentState === 'done' && canTrain ? 'todo' : 'blocked';
const programDesignDetail = c.has_active_plan ? undefined
  : enrolmentState !== 'done' ? 'Enrol the client in PT before assigning a plan.'
  : 'Activate the client (complete screening) before assigning a plan.';
```

- Keep the existing `enrolmentState` expression untouched.
- Update the file-header comment to the new order.

- [ ] **Step 5: Run the test to verify it passes**

Run the same command. Expected: PASS when a DB is present, SKIP otherwise.

- [ ] **Step 6: Commit**

```bash
git add src/db/migrations/237_client_welcome_tour.sql src/modules/pt-os/client-journey.service.js src/__tests__/clientJourney.realDb.integration.test.js
git commit -m "feat: reorder the client journey to the K11 sequence"
```

---

### Task 2: Welcome & Gym Tour endpoint

**Files:**
- Modify: `619-erp-backend/src/modules/pt-os/client-journey.service.js`
- Modify: `619-erp-backend/src/modules/pt-os/client-journey.routes.js`
- Test: `619-erp-backend/src/__tests__/clientJourney.realDb.integration.test.js`

**Interfaces:**
- Produces: `markWelcomeTour(orgId: string, clientId: string): Promise<null | { id: string, welcome_tour_completed_at: string }>`.
- Produces: `POST /api/pt-os/clients/:id/welcome-tour` → `{ data: { id, welcome_tour_completed_at } }`.
- Consumes: migration 237.

- [ ] **Step 1: Write the failing tests**

```js
it('marks the welcome tour once and keeps the first timestamp', async () => {
  const id = await newClient();
  const first = await request().post(`/api/pt-os/clients/${id}/welcome-tour`);
  expect(first.status).toBe(200);
  expect(first.body.data.welcome_tour_completed_at).toBeTruthy();
  const second = await request().post(`/api/pt-os/clients/${id}/welcome-tour`);
  expect(second.body.data.welcome_tour_completed_at).toBe(first.body.data.welcome_tour_completed_at);
  const { rows: [log] } = await pool.query(
    `SELECT action FROM activity_log WHERE entity_id = $1 AND action = 'client.welcome_tour.complete'`, [id],
  );
  expect(log).toBeTruthy();
});

it('another studio\\'s client is a 404 and is not marked', async () => {
  const id = await newClient();
  const res = await request().post(`/api/pt-os/clients/${id}/welcome-tour`)
    .set('x-test-org', OTHER_ORG); // use the suite's existing cross-tenant request helper
  expect(res.status).toBe(404);
  const { rows: [c] } = await pool.query('SELECT welcome_tour_completed_at FROM pt_clients WHERE id = $1', [id]);
  expect(c.welcome_tour_completed_at).toBeNull();
});
```

Use the same tenant-switch mechanism the suite already uses for `OTHER_ORG`; do not invent a header if the suite has a helper.

- [ ] **Step 2: Run to verify failure**

Run: `npx jest --forceExit --runInBand --testPathPatterns='clientJourney.realDb' --watchAll=false`
Expected: 404 from the missing route.

- [ ] **Step 3: Implement the service and route**

Service:

```js
async function markWelcomeTour(orgId, clientId) {
  const { rows } = await pool.query(
    `UPDATE pt_clients
        SET welcome_tour_completed_at = COALESCE(welcome_tour_completed_at, NOW()),
            updated_at = NOW()
      WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
      RETURNING id, welcome_tour_completed_at`,
    [clientId, orgId],
  );
  return rows[0] || null;
}
```

Export it. In `client-journey.routes.js`, add behind the router's existing `auth, requireTrainer`:

```js
router.post('/clients/:id/welcome-tour', wrap(async (req, res) => {
  const row = await svc.markWelcomeTour(orgIdOf(req), req.params.id);
  if (!row) return res.status(404).json(NOT_FOUND);
  await logActivity(req, 'client.welcome_tour.complete', 'pt_client', row.id, {});
  res.json({ data: row });
}));
```

- [ ] **Step 4: Run to verify pass**

Run the same command. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/pt-os/client-journey.service.js src/modules/pt-os/client-journey.routes.js src/__tests__/clientJourney.realDb.integration.test.js
git commit -m "feat: record the K11 welcome and gym tour"
```

---

### Task 3: Pending-activation gate and activation helper

**Files:**
- Modify: `619-erp-backend/src/lib/screeningGate.js:229-339, 377-405`
- Test: `619-erp-backend/src/__tests__/screeningGate.test.js`

**Interfaces:**
- Produces: `ELIGIBILITY_BLOCKS.CLIENT_PENDING_ACTIVATION`.
- Produces: `statusBlock({ has_pt_term, status, ended })` returns `CLIENT_PENDING_ACTIVATION` when `has_pt_term && status === 'pending'`, before the expired/frozen checks; `CLIENT_NOT_ENROLLED` when there is no term.
- Produces: `maybeActivateClient(req, clientId): Promise<boolean>` — true only when it moved the client from `pending` to `active`.
- Produces: `screeningSummary(...).missing: ('informed_consent' | 'parq')[]` (additive), reusing `missingScreening`.

- [ ] **Step 1: Extend the test mock and write failing tests**

Add to the mock in `screeningGate.test.js`:

```js
let mockClient = null;
// inside query:
if (/FROM pt_clients/i.test(sql)) return { rows: mockClient ? [mockClient] : [] };
if (/UPDATE pt_clients/i.test(sql)) {
  return { rows: mockClient && mockClient.status === 'pending' ? [{ id: mockClient.id }] : [] };
}
```

Tests:

```js
test('a pending client with a term is CLIENT_PENDING_ACTIVATION', () => {
  expect(statusBlock({ has_pt_term: true, status: 'pending', ended: false }))
    .toBe('CLIENT_PENDING_ACTIVATION');
  expect(statusBlock({ has_pt_term: false, status: 'pending', ended: false }))
    .toBe('CLIENT_NOT_ENROLLED');
});

test('maybeActivateClient activates a provisionally enrolled, fully screened client', async () => {
  mockClient = { id: 'c1', status: 'pending', has_pt_term: true, ended: false };
  mockParq = cleanParq;
  mockConsent = completed;
  await expect(maybeActivateClient(req, 'c1')).resolves.toBe(true);
  expect(mockQueries.some((q) => /UPDATE pt_clients[\s\S]*status = 'active'/.test(q.sql))).toBe(true);
  expect(logActivity).toHaveBeenCalledWith(req, 'client.activated', 'pt_client', 'c1', {});
});

test('maybeActivateClient leaves a client pending without consent, a full PAR-Q, or with a hard block', async () => {
  mockClient = { id: 'c1', status: 'pending', has_pt_term: true, ended: false };
  mockConsent = { status: null, physician_block: false };
  expect(await maybeActivateClient(req, 'c1')).toBe(false);
  mockConsent = completed;
  mockParq = { ...cleanParq, answered_count: 3 };
  expect(await maybeActivateClient(req, 'c1')).toBe(false);
  mockParq = { ...cleanParq, risk_level: 'high', has_valid_clearance: false };
  expect(await maybeActivateClient(req, 'c1')).toBe(false);
});

test('maybeActivateClient does nothing for an active client or one with no term', async () => {
  mockClient = { id: 'c1', status: 'active', has_pt_term: true, ended: false };
  expect(await maybeActivateClient(req, 'c1')).toBe(false);
  mockClient = { id: 'c1', status: 'pending', has_pt_term: false, ended: false };
  expect(await maybeActivateClient(req, 'c1')).toBe(false);
});
```

Import `statusBlock`, `maybeActivateClient` and the mocked `logActivity`.

- [ ] **Step 2: Run to verify failure**

Run: `npx jest --forceExit --runInBand --testPathPatterns='screeningGate.test' --watchAll=false`
Expected: FAIL — `maybeActivateClient is not a function`.

- [ ] **Step 3: Implement**

In `screeningGate.js`:

```js
const ELIGIBILITY_BLOCKS = {
  CLIENT_NOT_ENROLLED: 'This client is not enrolled in PT yet. Enrol them before assigning or starting training.',
  CLIENT_PENDING_ACTIVATION: 'This client is enrolled but not active yet. Complete their Informed Consent and PAR-Q to activate them.',
  // ...existing entries unchanged
};
```

```js
function statusBlock(facts) {
  if (facts.status === 'pending') return facts.has_pt_term ? 'CLIENT_PENDING_ACTIVATION' : 'CLIENT_NOT_ENROLLED';
  if (!facts.has_pt_term) return 'CLIENT_NOT_ENROLLED';
  // ...existing expired/frozen/other checks unchanged
}
```

```js
async function maybeActivateClient(req, clientId) {
  const facts = await loadClientFacts(require('./tenant-db').orgIdOf(req), clientId);
  if (!facts || !facts.has_pt_term || facts.status !== 'pending') return false;
  const { code, parq, consent } = await evaluate(clientId);
  if (code || missingScreening(parq, consent).length) return false;
  const { rows } = await pool.query(
    `UPDATE pt_clients SET status = 'active', updated_at = NOW()
      WHERE id = $1 AND organization_id = $2 AND status = 'pending' AND deleted_at IS NULL
      RETURNING id`,
    [clientId, require('./tenant-db').orgIdOf(req)],
  );
  if (!rows[0]) return false;
  await logActivity(req, 'client.activated', 'pt_client', clientId, {});
  return true;
}
```

Add `missing: missingScreening(parq, consent)` to the `screeningSummary` return and export `maybeActivateClient`.

- [ ] **Step 4: Run to verify pass**

Run the same command. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/screeningGate.js src/__tests__/screeningGate.test.js
git commit -m "feat: block training until a provisional enrolment is activated"
```

---

### Task 4: Provisional enrolment and activation wiring

**Files:**
- Modify: `619-erp-backend/src/modules/pt-os/pt-os.routes.js:447-642, 707-1113`
- Modify: `619-erp-backend/src/modules/pt-os/informed-consent.routes.js:457-490`
- Modify: `619-erp-backend/src/modules/pt-os/parq.routes.js:340-350, 426-470, 555-630`
- Modify: `619-erp-backend/src/modules/pt-os/client-journey.service.js:190-215`
- Test: `619-erp-backend/src/__tests__/trainingEligibility.realDb.integration.test.js`
- Test: `619-erp-backend/src/__tests__/clientJourney.realDb.integration.test.js`

**Interfaces:**
- Consumes: `maybeActivateClient(req, clientId)`, `screeningSummary(clientId).missing`.
- Produces: first enrolment without complete screening succeeds with `status = 'pending'`.
- Produces: PATCH and POST responses add `activation_pending: boolean`, `screening_missing: string[]`, `screening_block: { code, message } | null` to `data`.
- Produces: journey `enrolment` is `done` for `active` or `pending` with a term, `renew` for ended/expired (checked first), `blocked` for frozen/inactive.

- [ ] **Step 1: Rewrite the failing integration tests**

In `trainingEligibility.realDb.integration.test.js`, replace the “enrolling a NEW client needs completed screening” describe:

```js
it('enrols provisionally as pending, and nothing trains yet', async () => {
  const id = await client({ status: 'pending', term: false });
  const res = await enroll(id);
  expect(res.status).toBe(200);
  expect(res.body.data.status).toBe('pending');
  expect(res.body.data.activation_pending).toBe(true);
  expect(res.body.data.screening_missing).toEqual(['informed_consent', 'parq']);
  expect((await assign(id)).status).toBe(409);
  expect(code(await assign(id))).toBe('CLIENT_PENDING_ACTIVATION');
});

it('a draft PAR-Q is still missing', async () => {
  const id = await client({ status: 'pending', term: false });
  await pool.query(`INSERT INTO pt_informed_consents (client_id, organization_id, full_name, status)
                    VALUES ($1, $2, 'X', 'completed')`, [id, ORG]);
  await pool.query(`INSERT INTO pt_parq_forms (client_id, organization_id, full_name, status)
                    VALUES ($1, $2, 'X', 'draft')`, [id, ORG]);
  const res = await enroll(id);
  expect(res.body.data.status).toBe('pending');
  expect(res.body.data.screening_missing).toEqual(['parq']);
});

it('activates on PAR-Q submit after a provisional enrolment', async () => {
  const id = await client({ status: 'pending', term: false });
  await enroll(id);
  await pool.query(`INSERT INTO pt_informed_consents (client_id, organization_id, full_name, status)
                    VALUES ($1, $2, 'X', 'completed')`, [id, ORG]);
  const answers = Array.from({ length: 10 }, (_, i) => ({ question_id: `q${i + 1}`, answer: 'no' }));
  const res = await request().post('/api/pt-os/parq/forms')
    .send({ client_id: id, full_name: 'X', status: 'submitted', parq_answers: answers });
  expect(res.status).toBe(201);
  const { rows: [c] } = await pool.query('SELECT status FROM pt_clients WHERE id = $1', [id]);
  expect(c.status).toBe('active');
});

it('activates when the consent is completed after a provisional enrolment', async () => {
  const id = await client({ status: 'pending', term: false });
  await enroll(id);
  await pool.query(`INSERT INTO pt_parq_forms (client_id, organization_id, full_name, parq_answers, status, risk_level, workout_gate_status)
                    VALUES ($1, $2, 'X', $3::jsonb, 'submitted', 'low', 'cleared')`,
    [id, ORG, JSON.stringify(Array.from({ length: 10 }, (_, i) => ({ question_id: `q${i + 1}`, answer: 'no' })))]);
  const created = await request().post('/api/pt-os/informed-consent').send({ client_id: id });
  const cid = created.body.data.id;
  const sig = 'data:image/png;base64,iVBORw0KGgo=';
  await request().post(`/api/pt-os/informed-consent/${cid}/sign`).send({ signer: 'client', signature: sig });
  const res = await request().post(`/api/pt-os/informed-consent/${cid}/sign`).send({ signer: 'trainer', signature: sig });
  expect(res.status).toBe(200);
  const { rows: [c] } = await pool.query('SELECT status FROM pt_clients WHERE id = $1', [id]);
  expect(c.status).toBe('active');
});
```

In `clientJourney.realDb.integration.test.js`, change the early-enrolment block to expect `200` and `status = 'pending'`, then assert the journey’s `enrolment` is `done` with detail `PT enrolled — activation pending screening.` Keep the rest of the walk.

- [ ] **Step 2: Run to verify failure**

Run: `npx jest --forceExit --runInBand --testPathPatterns='trainingEligibility.realDb|clientJourney.realDb' --watchAll=false`
Expected: FAIL — the first enrolment is still refused with `SCREENING_REQUIRED`.

- [ ] **Step 3: Implement provisional enrolment in PATCH**

In `pt-os.routes.js` PATCH, replace the `enrolmentScreeningBlock` call with:

```js
let provisional = false;
if (establishingTerm && !existing.has_pt_term) {
  const screening = await screeningSummary(req.params.id);
  if (screening.block || screening.missing.length) {
    provisional = true;
    body.status = 'pending';
  }
}
```

Leave the existing `looksEnrolled` auto-promotion unchanged. Because the provisional branch sets `body.status = 'pending'`, the allowlist loop stores `status = 'pending'` instead of letting the auto-promotion write `active`.

After `COMMIT` and before `res.json`, compute the response fields:

```js
const screening = await screeningSummary(rows[0].id);
const activationPending = rows[0].status === 'pending' && (existing.has_pt_term || looksEnrolled);
res.json({ data: {
  ...rows[0],
  activation_pending: activationPending,
  screening_missing: screening.missing,
  screening_block: screening.block,
} });
```

- [ ] **Step 4: Implement provisional enrolment in POST**

Define a term the same way `hasPtTermSql` does — a charged amount is a term too:

```js
const wantsTerm = Boolean(pt_end_date) || Number(duration_months) > 0
  || Boolean(pt_package_id) || Number(base_amount) > 0;
```

Add this test to `ptTerm.enrollRenew.realDb.integration.test.js`:

```js
it('a charged amount alone is a term: create still needs screening', async () => {
  const res = await request().post('/api/pt-os/clients').send({
    name: 'Priced Client', mobile: `94${String(Date.now()).slice(-8)}`, base_amount: 5000,
  });
  expect(res.status).toBe(409);
  expect(res.body.error.code).toBe('SCREENING_REQUIRED');
});
```

Replace the `enrolmentScreeningBlock` branch for `wantsTerm && client_id`:

```js
let provisional = false;
if (wantsTerm && client_id) {
  const tParams = [client_id];
  const tOrg = orgWhere(req, tParams, 'c.organization_id');
  const { rows: [termRow] } = await pool.query(
    `SELECT ${hasPtTermSql('c')} AS has_pt_term FROM pt_clients c
      WHERE c.id = $1 AND c.deleted_at IS NULL${tOrg}`, tParams);
  if (!termRow) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Client not found' } });
  if (!termRow.has_pt_term) {
    const screening = await screeningSummary(client_id);
    provisional = Boolean(screening.block || screening.missing.length);
  }
}
```

Keep the `!client_id` refusal but change its message to `Add the client first, then enrol them from their profile.`

In the UPDATE, replace the `status = CASE ... END` expression with `status = COALESCE($32, status)`. Bind `$32` as:

```js
const termPromotes = Boolean(endDate) || finalAmt > 0 || Number(resolvedDurationMonths) > 0;
const nextStatus = termPromotes ? (provisional ? 'pending' : 'active') : null;
```

Append `nextStatus` after `orgIdOf(req)` in the parameter list. After the UPDATE, return the same three fields using `screeningSummary(rows[0].id)`.

- [ ] **Step 5: Wire activation**

- `informed-consent.routes.js`: import `maybeActivateClient`; after `completeConsent` reports `completed`, call `await maybeActivateClient(req, record.client_id)`.
- `parq.routes.js`: make `recomputeGateStatus` select and return `client_id` (`SELECT risk_level, client_id` and `RETURNING workout_gate_status, risk_level, client_id`). Import `maybeActivateClient`; after each `recomputeGateStatus` that follows a create, update, clearance create or clearance update, call `await maybeActivateClient(req, gate.client_id)`.
- `client-journey.service.js`: replace the enrolment state expression with:

```js
let enrolmentState;
if (c.has_pt_term && (c.status === 'expired' || c.ended)) enrolmentState = 'renew';
else if (c.has_pt_term && c.status === 'frozen') enrolmentState = 'blocked';
else if (c.has_pt_term && c.status === 'inactive') enrolmentState = 'blocked';
else if (c.has_pt_term && (c.status === 'active' || c.status === 'pending')) enrolmentState = 'done';
else enrolmentState = 'todo';
const enrolmentDetail = enrolmentState === 'blocked'
  ? (c.status === 'frozen'
    ? 'This client\'s membership is frozen. Unfreeze it before enrolling.'
    : 'This client is inactive. Reactivate them before enrolling.')
  : c.status === 'pending' && c.has_pt_term
    ? 'PT enrolled — activation pending screening.'
    : undefined;
```

- [ ] **Step 6: Run to verify pass**

Run the same command. Expected: PASS, or SKIP without a DB.

- [ ] **Step 7: Commit**

```bash
git add src/modules/pt-os/pt-os.routes.js src/modules/pt-os/informed-consent.routes.js src/modules/pt-os/parq.routes.js src/modules/pt-os/client-journey.service.js src/__tests__/trainingEligibility.realDb.integration.test.js src/__tests__/clientJourney.realDb.integration.test.js
git commit -m "feat: allow provisional PT enrolment until screening completes"
```

---

### Task 5: Client list returns `has_pt_term`

**Files:**
- Modify: `619-erp-backend/src/modules/pt-os/pt-os.service.js:1-2, 90-131`
- Test: `619-erp-backend/src/__tests__/ptOs.clientPage.test.js`

**Interfaces:**
- Produces: every row from `getActiveClients` carries `has_pt_term: boolean`.

- [ ] **Step 1: Write the failing test**

```js
it('returns has_pt_term so the list can tell pending from not enrolled', async () => {
  respond([{ id: 'ptc-1', has_pt_term: true }]);
  await svc.getActiveClients({ orgId: ORG }, {});
  const [{ sql }] = calls;
  expect(sql).toMatch(/AS has_pt_term/);
  expect(sql).toMatch(/pt_client_subscriptions/);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx jest --forceExit --runInBand --testPathPatterns='ptOs.clientPage' --watchAll=false`
Expected: FAIL — the SELECT has no `has_pt_term`.

- [ ] **Step 3: Implement**

Add `const { hasPtTermSql } = require('../../lib/ptTerm');` and select `${hasPtTermSql('c')} AS has_pt_term` next to `c.status` in `getActiveClients`.

- [ ] **Step 4: Run to verify pass**

Run the same command. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/pt-os/pt-os.service.js src/__tests__/ptOs.clientPage.test.js
git commit -m "feat: expose has_pt_term on the client list"
```

---

## Frontend

### Task 6: Journey keys, card and completed footer

**Files:**
- Modify: `619-erp-frontend/src/lib/journey.ts`
- Modify: `619-erp-frontend/src/components/pt-os/client/ClientJourneyCard.tsx`
- Test: `619-erp-frontend/src/__tests__/client-journey.test.tsx`

**Interfaces:**
- Produces: `JourneyStepKey = 'welcome_tour' | 'enrolment' | 'consent' | 'parq' | 'interview' | 'goals' | 'assessment' | 'program_design'`.
- Produces: `stepHref('welcome_tour', id)` → `/pt-os/welcome-tour?client_id=<id>`; `stepHref('program_design', id)` → `/pt-os/program-design?client_id=<id>`.
- Produces: `stepAfter` follows the new order.
- Produces: when `journey.next === null`, the card shows “Onboarding complete — client is active.” and buttons **Workout Log** → `/pt-os/clients/<id>/workout-log` and **Progress & Retest** → `/pt-os/progress?client_id=<id>`.

- [ ] **Step 1: Update the failing test**

```js
const keys: JourneyStep['key'][] = [
  'welcome_tour', 'enrolment', 'consent', 'parq', 'interview', 'goals', 'assessment', 'program_design',
];

it('runs welcome/tour → enrolment → consent → PAR-Q → interview → goals → assessment → program design', () => {
  expect(stepAfter('welcome_tour')).toBe('enrolment');
  expect(stepAfter('enrolment')).toBe('consent');
  expect(stepAfter('parq')).toBe('interview');
  expect(stepAfter('interview')).toBe('goals');
  expect(stepAfter('goals')).toBe('assessment');
  expect(stepAfter('program_design')).toBeNull();
});

it('every step has a page', () => {
  expect(stepHref('welcome_tour', 'c1')).toBe('/pt-os/welcome-tour?client_id=c1');
  expect(stepHref('program_design', 'c1')).toBe('/pt-os/program-design?client_id=c1');
  expect(stepHref('enrolment', 'c1', 'renew')).toBe('/pt-os/clients/c1/renew');
});

it('a completed journey links to the ongoing tools', async () => {
  mockJourney.mockResolvedValue(journeyOf(
    { welcome_tour: 'done', enrolment: 'done', consent: 'done', parq: 'done', interview: 'done',
      goals: 'done', assessment: 'done', program_design: 'done' }, null));
  render(<ClientJourneyCard clientId="c1" />);
  expect(await screen.findByText(/Onboarding complete/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /Workout Log/ }));
  expect(mockPush).toHaveBeenCalledWith('/pt-os/clients/c1/workout-log');
  fireEvent.click(screen.getByRole('button', { name: /Progress & Retest/ }));
  expect(mockPush).toHaveBeenCalledWith('/pt-os/progress?client_id=c1');
});
```

Update the existing card tests to the new key set and next steps. Add a pending-enrolment test (build the journey object directly; the helper only attaches `detail` to blocked steps):

```js
it('shows a provisional enrolment as done, with the activation note', async () => {
  mockJourney.mockResolvedValue({ data: {
    steps: [
      { key: 'welcome_tour', state: 'done' },
      { key: 'enrolment', state: 'done', detail: 'PT enrolled — activation pending screening.' },
      { key: 'consent', state: 'done' },
      { key: 'parq', state: 'todo' },
      { key: 'interview', state: 'todo', optional: true },
      { key: 'goals', state: 'todo' },
      { key: 'assessment', state: 'todo' },
      { key: 'program_design', state: 'blocked' },
    ],
    next: 'parq',
    screening: {},
  } });
  render(<ClientJourneyCard clientId="c1" />);
  expect(await screen.findByText(/activation pending screening/)).toBeTruthy();
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/__tests__/client-journey.test.tsx`
Expected: FAIL on the new keys and footer.

- [ ] **Step 3: Implement the lib and card**

- `journey.ts`: new union, `STEP_LABEL` (`Welcome & Gym Tour`, `PT Enrolment`, `Informed Consent`, `PAR-Q screening`, `Client Interview`, `Goals`, `Fitness Assessment`, `Program Design`), new `stepHref` cases, new `stepAfter` order.
- `ClientJourneyCard.tsx`: icon/colour entries for `welcome_tour` (`Sparkles`, `emerald[500]`) and `program_design` (`Dumbbell`, `blue[600]`); keep the other entries.
- Replace `{next && (...)}` with `{next ? (...) : (<footer>...)}` using the copy and two buttons above.

- [ ] **Step 4: Run to verify pass**

Run the same command. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/journey.ts src/components/pt-os/client/ClientJourneyCard.tsx src/__tests__/client-journey.test.tsx
git commit -m "feat: show the K11 journey order and ongoing tools"
```

---

### Task 7: Welcome & Gym Tour page

**Files:**
- Modify: `619-erp-frontend/src/lib/api/endpoints/ptOs.ts`
- Create: `619-erp-frontend/src/app/(chrome)/pt-os/welcome-tour/page.tsx`
- Test: `619-erp-frontend/src/__tests__/welcome-tour.test.tsx`

**Interfaces:**
- Produces: `api.pt.completeWelcomeTour(id: string) => http<{ data: { id: string; welcome_tour_completed_at: string } }>('/api/pt-os/clients/${id}/welcome-tour', { method: 'POST' })`.
- Consumes: `api.pt.client(id)`, `api.pt.journey(id)` (via `JourneyNextButton`), `api.pt.completeWelcomeTour(id)`.

- [ ] **Step 1: Write the failing test**

Render the page with `useSearchParams` returning `client_id=c1`, `api.pt.client` returning `{ data: { id: 'c1', name: 'Mina Rao', welcome_tour_completed_at: null } }`, and `api.pt.journey` returning a journey whose next is `enrolment`. Assert:

```js
expect(await screen.findByText('Mina Rao')).toBeTruthy();
expect(screen.getByText(/arrive 15 minutes early/i)).toBeTruthy();
expect(screen.getByText(/ask about well-being, sleep quality and last meal/i)).toBeTruthy();
expect(screen.getByText(/equipment introduction/i)).toBeTruthy();
fireEvent.click(screen.getByRole('button', { name: /Mark tour complete/ }));
await waitFor(() => expect(mockComplete).toHaveBeenCalledWith('c1'));
expect(await screen.findByRole('button', { name: /Continue to PT Enrolment/ })).toBeTruthy();
```

Add a second test: a client whose `welcome_tour_completed_at` is set shows the read-only completed state and no “Mark tour complete” button.

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/__tests__/welcome-tour.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Add the API method. Build the page with the existing shell (`Guard`, `PageContainer`, `PageHero`, `Card`, `Button`). Use `useSearchParams()` for `client_id`, load the client with `api.pt.client`, and render the three K11 groups from the spec §9.3. The primary button calls `completeWelcomeTour`, sets the local completed state, and renders `<JourneyNextButton clientId={clientId} current="welcome_tour" />`. Missing client → the standard not-found state.

- [ ] **Step 4: Run to verify pass**

Run the same command. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/api/endpoints/ptOs.ts "src/app/(chrome)/pt-os/welcome-tour/page.tsx" src/__tests__/welcome-tour.test.tsx
git commit -m "feat: add the K11 welcome and gym tour page"
```

---

### Task 8: Enrol page provisional enrolment

**Files:**
- Modify: `619-erp-frontend/src/app/(chrome)/pt-os/clients/[id]/enroll/page.tsx:288-297, 427-508, 585-690`
- Modify: `619-erp-frontend/src/lib/screening.ts`
- Test: `619-erp-frontend/src/__tests__/client-journey.test.tsx`

**Interfaces:**
- Consumes: PATCH response `data.activation_pending`.
- Produces: no hard stop on missing screening; a warning banner and a post-save pending state with links to consent and PAR-Q.

- [ ] **Step 1: Update the failing source test**

Replace the “enrol page stops a new client” test with:

```js
it('the enrol page warns about missing screening instead of stopping', () => {
  const src = read('clients/[id]/enroll/page.tsx');
  expect(src).not.toMatch(/if \(screeningMissing\) \{/);
  expect(src).toMatch(/activation pending screening/i);
  expect(src).toMatch(/Complete Informed Consent/);
  expect(src).toMatch(/Complete PAR-Q/);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/__tests__/client-journey.test.tsx`
Expected: FAIL — the hard stop is still present.

- [ ] **Step 3: Implement**

- Add `missing: ('informed_consent' | 'parq')[]` to `ScreeningSummary`.
- Delete the `if (screeningMissing) { return (...) }` block.
- Keep the `screeningMissing` state and render it as a warning banner above the form: “Screening is incomplete. The client will be enrolled but activated only after Informed Consent and PAR-Q.” with links to `/pt-os/informed-consent?client_id=...` and `/pt-os/parq?client_id=...`.
- Add `const [activationPending, setActivationPending] = useState(false)`.
- In `attemptSave`, read the response and set it: `setActivationPending(Boolean((res as { data?: { activation_pending?: boolean } })?.data?.activation_pending))`.
- In the `enrolled` success block, when `activationPending`, show a `role="status"` warning: “Enrolled — activation pending screening.” with the same two links; otherwise keep the current copy.
- Update the file’s comments that say screening is required before enrolment.

- [ ] **Step 4: Run to verify pass**

Run the same command. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(chrome)/pt-os/clients/[id]/enroll/page.tsx" src/lib/screening.ts src/__tests__/client-journey.test.tsx
git commit -m "feat: enrol provisionally and explain pending activation"
```

---

### Task 9: Program-design calculations

**Files:**
- Create: `619-erp-frontend/src/lib/program-design.ts`
- Test: `619-erp-frontend/src/__tests__/program-design.test.ts`

**Interfaces:**
- Produces:

```ts
export type Sex = 'male' | 'female';
export interface ProgramDesignInput {
  sex: Sex | null; age: number | null; weightKg: number | null; heightCm: number | null;
  measuredBmr: number | null; restingHeartRate: number | null;
  trainingDays: number | null; goal: string | null;
}
export interface MacroTargets { protein_g: number; fat_g: number; carbs_g: number }
export interface KarvonenZone { label: string; low: number; high: number }

export function mifflinStJeor(i: ProgramDesignInput): number | null;
export function basalMetabolicRate(i: ProgramDesignInput): number | null;
export function activityFactor(trainingDays: number | null): number;
export function tdee(bmr: number | null, factor: number): number | null;
export function goalAdjustment(goal: string | null): number;
export function calorieTarget(tdee: number | null, goal: string | null, sex: Sex | null): number | null;
export function macroTargets(calories: number | null, weightKg: number | null): MacroTargets | null;
export function splitForDays(days: number | null): { name: string; sessions: string[] } | null;
export function karvonen(age: number | null, restingHeartRate: number | null): { maxHr: number; zones: KarvonenZone[] } | null;
```

- [ ] **Step 1: Write the failing tests**

```ts
it('computes Mifflin-St Jeor and prefers a measured BMR', () => {
  expect(Math.round(mifflinStJeor({ ...base, sex: 'male', weightKg: 80, heightCm: 180, age: 30 })!)).toBe(1780);
  expect(Math.round(mifflinStJeor({ ...base, sex: 'female', weightKg: 60, heightCm: 165, age: 30 })!)).toBe(1320);
  expect(basalMetabolicRate({ ...base, measuredBmr: 1900 })).toBe(1900);
});

it('maps training days to an activity factor and computes TDEE', () => {
  expect([0, 1, 2, 3, 4, 5, 6].map(activityFactor)).toEqual([1.2, 1.2, 1.375, 1.375, 1.55, 1.55, 1.725]);
  expect(tdee(1800, 1.55)).toBe(2790);
});

it('applies the goal adjustment and never goes below the calorie floor', () => {
  expect(goalAdjustment('fat_loss')).toBe(-500);
  expect(goalAdjustment('muscle_gain')).toBe(300);
  expect(goalAdjustment('general_fitness')).toBe(0);
  expect(calorieTarget(1400, 'fat_loss', 'female')).toBe(1200);
  expect(calorieTarget(1400, 'fat_loss', 'male')).toBe(1500);
});

it('splits protein, fat and carbs from the calorie target', () => {
  expect(macroTargets(2000, 80)).toEqual({ protein_g: 144, fat_g: 56, carbs_g: 224 });
});

it('picks a split from available days', () => {
  expect(splitForDays(3)?.name).toBe('Full body');
  expect(splitForDays(4)?.name).toBe('Upper / lower');
  expect(splitForDays(5)?.name).toBe('Push / pull / legs');
  expect(splitForDays(null)).toBeNull();
});

it('computes Karvonen zones, and returns null without age or resting HR', () => {
  const out = karvonen(30, 60)!;
  expect(out.maxHr).toBe(190);
  expect(out.zones[0]).toEqual({ label: '50–60%', low: 125, high: 138 });
  expect(karvonen(null, 60)).toBeNull();
  expect(karvonen(30, null)).toBeNull();
});

it('returns nulls, never NaN, when the profile is incomplete', () => {
  expect(mifflinStJeor({ ...base, sex: null })).toBeNull();
  expect(macroTargets(null, 80)).toBeNull();
  expect(macroTargets(2000, null)).toBeNull();
});
```

`base` is `{ sex: null, age: null, weightKg: null, heightCm: null, measuredBmr: null, restingHeartRate: null, trainingDays: null, goal: null }`.

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/__tests__/program-design.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Use the spec §12.3 values verbatim: protein `1.8 g/kg`, fat `25% / 9`, carbs `remaining / 4`, floors `1200` female / `1500` male, activity factors `1.2/1.375/1.55/1.725/1.9`, goal adjustments `-500/0/+300`, Karvonen zones `50–60/60–70/70–80/80–90`, MHR `220 − age`. Round all displayed values with `Math.round`. Return `null` whenever an input is missing or non-positive.

- [ ] **Step 4: Run to verify pass**

Run the same command. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/program-design.ts src/__tests__/program-design.test.ts
git commit -m "feat: add K11 program-design calculations"
```

---

### Task 10: Program Design hub page

**Files:**
- Create: `619-erp-frontend/src/app/(chrome)/pt-os/program-design/page.tsx`
- Test: `619-erp-frontend/src/__tests__/program-design-page.test.tsx`

**Interfaces:**
- Consumes: `api.pt.client(id)`, `api.progress.assessments.list({ client_id, limit: 1 })`, `api.pt.interviews.list(id)`, `api.progress.goals.list({ client_id })`, `api.training.assignments.list({ client_id, status: 'active' })`, the Task 9 functions, `JourneyNextButton`.
- Produces: five sections — Baseline, Nutrition targets, Workout schedule, Cardio target zone, Completion.

- [ ] **Step 1: Write the failing render test**

Mock the five endpoints plus `next/navigation` and `Guard`. Use a complete client and assessment, then assert:

```js
expect(await screen.findByText(/Nutrition targets/i)).toBeTruthy();
expect(screen.getByText(/2,790 kcal|2790 kcal/)).toBeTruthy();
expect(screen.getByText(/Full body/)).toBeTruthy();
expect(screen.getByText(/Push \/ pull \/ legs/)).toBeTruthy(); // or the split matching the days
expect(screen.getByText(/50–60%/)).toBeTruthy();
expect(screen.getByRole('button', { name: /Continue to/ })).toBeTruthy();
```

Add a second test with `{ id: 'c1', name: 'Mina', gender: null, dob: null, weight: null, height: null }` and empty assessments: assert the page renders, shows `—` for the missing targets, and shows a “Complete the assessment” link to `/pt-os/assessment?client_id=c1`. It must not throw.

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/__tests__/program-design-page.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Use the existing page shell. Read the latest assessment (`height_cm`, `weight`, `body_fat_pct`, `bmr`, `resting_heart_rate`) and the newest interview (`lifestyle_training_days`). Derive age with `ageFrom(dob)` from `@/lib/enrollment`.

The Baseline section shows the latest assessment date and key results plus the active SMART goal (goal type and target). If either is missing, show a “Complete the assessment” link to `/pt-os/assessment?client_id=<id>` or a “Set a goal” link to `/pt-os/goals?client_id=<id>`; do not block the page.

The Workout schedule section carries the K11 beginner note verbatim: “Beginners: 15–20 RM, stop short of muscular failure.”

Render the Task 9 outputs, with `—` for every null. Link:

- Diet Plans → `/pt-os/diet-plans?client_id=<id>`
- Workout Generator → `/pt-os/workout-generator?client_id=<id>`
- Workout Plans → `/pt-os/workout-plans?client_id=<id>`
- Cardio calculator → `/pt-os/cardio-calculator`

The completion section renders `<JourneyNextButton clientId={clientId} current="program_design" />`.

- [ ] **Step 4: Run to verify pass**

Run the same command. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(chrome)/pt-os/program-design/page.tsx" src/__tests__/program-design-page.test.tsx
git commit -m "feat: add the K11 program design hub"
```

---

### Task 11: Pending labels, new-client CTA and interview next step

**Files:**
- Modify: `619-erp-frontend/src/lib/api/types.ts:476-498`
- Modify: `619-erp-frontend/src/app/(chrome)/pt-os/clients/page.tsx:57-58, 110-122`
- Modify: `619-erp-frontend/src/app/(chrome)/pt-os/clients/[id]/page.tsx:112-120, 612`
- Modify: `619-erp-frontend/src/app/(chrome)/pt-os/new-client/page.tsx:345-356`
- Modify: `619-erp-frontend/src/app/(chrome)/pt-os/interview/page.tsx:315-335`
- Test: `619-erp-frontend/src/__tests__/client-journey.test.tsx`

**Interfaces:**
- Consumes: `has_pt_term` from the client list (Task 5) and profile.
- Produces: `pending + has_pt_term` renders **Activation Pending**; `pending` without a term renders **Not Enrolled**; the pending filter pill reads **Pending**.
- Produces: new-client success CTA → `/pt-os/welcome-tour?client_id=<id>`, label **Start Welcome & Tour**.
- Produces: the interview screen ends with `<JourneyNextButton clientId={clientId} current="interview" />`.

- [ ] **Step 1: Update the failing source tests**

```js
it('the new-client success screen starts the welcome tour', () => {
  const src = read('new-client/page.tsx');
  expect(src).toMatch(/createdId\}\/welcome-tour/);
  expect(src).toMatch(/Start Welcome & Tour/);
  expect(src).not.toMatch(/createdId\}\/enroll/);
});

it('the interview ends with the server-driven next step', () => {
  const src = read('interview/page.tsx');
  expect(src).toMatch(/current="interview"/);
  expect(src).not.toMatch(/stepHref\('assessment', clientId\)/);
});

it('the client list distinguishes a provisional enrolment from a bare add', () => {
  const src = read('clients/page.tsx');
  expect(src).toMatch(/Activation Pending/);
  expect(src).toMatch(/has_pt_term/);
  expect(src).toMatch(/label: 'Pending'/);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/__tests__/client-journey.test.tsx`
Expected: FAIL on all three.

- [ ] **Step 3: Implement**

- `types.ts`: add `has_pt_term?: boolean` to `PtClientBase` (optional so a cached page against an older API still type-checks).
- Clients list: `getStatusInfo(status, days_left, has_pt_term = false)`; `pending && has_pt_term` → `{ label: 'Activation Pending', color: '#d97706', ... }`; pass `client.has_pt_term` at the row call site; filter pill label `Pending`.
- Profile: `getStatusConfig(status, days_left, pt_end_date, has_pt_term)`; `pending && has_pt_term` → `{ label: 'Activation Pending', dot: amber[400] }`; pass `client.has_pt_term` at the call site.
- New-client success: push `/pt-os/welcome-tour?client_id=${createdId}`, label `Start Welcome & Tour`, update the comment.
- Interview: replace the hard-coded `stepHref('assessment', clientId)` button with `JourneyNextButton`; remove the now-unused `stepHref` import.

- [ ] **Step 4: Run to verify pass**

Run the same command. Expected: PASS.

- [ ] **Step 5: Run the full frontend gates**

Run: `npm run typecheck && npm run lint && npm test`
Expected: all PASS. Then `npm run build` with `NEXT_PUBLIC_API_URL` set.

- [ ] **Step 6: Commit**

```bash
git add src/lib/api/types.ts "src/app/(chrome)/pt-os/clients/page.tsx" "src/app/(chrome)/pt-os/clients/[id]/page.tsx" "src/app/(chrome)/pt-os/new-client/page.tsx" "src/app/(chrome)/pt-os/interview/page.tsx" src/__tests__/client-journey.test.tsx
git commit -m "feat: show activation-pending clients and start onboarding at the tour"
```

---

## Final verification

- [ ] Backend: `node --check` every changed JS file.
- [ ] Backend: `npx jest --forceExit --runInBand --testPathPatterns='screeningGate|clientJourney|trainingEligibility|ptTerm|ptOs.clientPage' --watchAll=false` (real-DB suites SKIP without `RLS_TEST_DATABASE_URL`).
- [ ] Frontend: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.
- [ ] Manual (when a DB and both apps are running): new client → welcome tour → provisional enrolment (status pending) → consent + PAR-Q → active → goals → assessment → program design → workout assignment → journey complete footer links.
- [ ] Release note: provisional enrolments count as `pending`, not `active`, until screening completes, so they are absent from active-client counts until activation.
