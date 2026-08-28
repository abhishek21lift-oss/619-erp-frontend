import { test, expect, type APIRequestContext } from '@playwright/test';

// Cross-tenant isolation, proved against a real API and a real database.
//
// This is the test the product most needed and did not have. Multi-tenancy is
// enforced ENTIRELY in application code here: the API connects to Postgres as a
// role with BYPASSRLS, and of 247 RLS policies in `public` not one is
// organization-scoped (audit finding C-2, verified against production). So the
// only thing separating six live studios is that every query remembers its
// WHERE clause — and until now, that was checked exclusively by unit tests that
// mock the database away, i.e. by tests that cannot fail for the real reason.
//
// These run against a live backend and a migrated, seeded Postgres. The seed
// gives studio A a client called ALPHA-ONLY-CLIENT and studio B one called
// BRAVO-ONLY-CLIENT, so an assertion cannot pass by coincidence and a failure
// names exactly what crossed the boundary.
//
// Each test is written as an ATTACK, not as a happy path. A happy-path test
// ("A sees A's client") passes just as well when isolation is broken.

const OWNER_A = { email: 'owner-a@e2e.test', password: 'E2ePassw0rd!seed' };
const OWNER_B = { email: 'owner-b@e2e.test', password: 'E2ePassw0rd!seed' };

const ORG_B_ID = '0b000000-0000-4000-8000-000000000002';
const A_CLIENT = 'ptc-e2e-alpha';
const B_CLIENT = 'ptc-e2e-bravo';
const B_NAME = 'BRAVO-ONLY-CLIENT';
const A_NAME = 'ALPHA-ONLY-CLIENT';

// Money and staffing fixtures, seeded by backend scripts/seed-e2e.js.
const A_TRAINER = 'ALPHA-ONLY-TRAINER';
const B_TRAINER = 'BRAVO-ONLY-TRAINER';
const B_TRAINER_ID = 'trn-e2e-bravo';
const B_PAYOUT_ID = 'pyt-e2e-bravo';
const B_LEAVE_ID = 'lv-e2e-bravo';

/** The month the payout/commission fixtures are seeded into. */
function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

async function login(request: APIRequestContext, who: { email: string; password: string }) {
  const res = await request.post('/api/auth/login', { data: who });
  expect(res.status(), `login failed for ${who.email}`).toBe(200);
  const body = await res.json();
  const token = body.token ?? body.accessToken;
  expect(token, 'no token in login response').toBeTruthy();
  return { Authorization: `Bearer ${token}` };
}

test.describe('cross-tenant isolation', () => {
  let authA: Record<string, string>;
  let authB: Record<string, string>;

  test.beforeAll(async ({ playwright }) => {
    const api = await playwright.request.newContext({ baseURL: process.env.E2E_API_URL ?? 'http://127.0.0.1:5100' });
    authA = await login(api, OWNER_A);
    authB = await login(api, OWNER_B);
    await api.dispose();
  });

  test('the fixture is real — each studio sees its own client', async ({ request }) => {
    // Not the isolation proof, a sanity check. If this fails the rest of the
    // file is meaningless, because "A cannot see B" passes trivially when A
    // sees nothing at all.
    const a = await request.get('/api/pt-os/clients', { headers: authA });
    const b = await request.get('/api/pt-os/clients', { headers: authB });

    expect(await a.text()).toContain(A_NAME);
    expect(await b.text()).toContain(B_NAME);
  });

  test("A's client list never contains B's client", async ({ request }) => {
    const res = await request.get('/api/pt-os/clients', { headers: authA });

    expect(res.status()).toBe(200);
    expect(await res.text()).not.toContain(B_NAME);
  });

  test("A cannot fetch B's client by id", async ({ request }) => {
    // IDOR. 404 rather than 403 is the correct answer and is asserted as such:
    // 403 would confirm the id exists in another tenant, which is itself a
    // disclosure.
    const res = await request.get(`/api/pt-os/clients/${B_CLIENT}`, { headers: authA });

    expect(res.status()).toBe(404);
    expect(await res.text()).not.toContain(B_NAME);
  });

  test('A cannot widen its scope with an x-org-id header', async ({ request }) => {
    // tenantScope() honours x-org-id ONLY for super_admin. A tenant admin
    // sending it must stay pinned to their own organization — silently, not by
    // erroring, so the header is simply ignored.
    const res = await request.get('/api/pt-os/clients', {
      headers: { ...authA, 'x-org-id': ORG_B_ID },
    });

    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).not.toContain(B_NAME);
    expect(body).toContain(A_NAME);
  });

  test("A cannot record a payment against B's client", async ({ request }) => {
    // A cross-tenant WRITE is worse than a read: it would put A's money on B's
    // ledger and corrupt B's balance.
    const res = await request.post('/api/payments', {
      headers: authA,
      data: { client_id: B_CLIENT, amount: 500, date: '2026-08-06' },
    });

    expect(res.status()).toBe(404);
  });

  test("A cannot invoice B's client", async ({ request }) => {
    // Regression test for a real defect found while writing route tests: the
    // client lookup in POST /api/invoices had no organization predicate, so A
    // could invoice B's client and read that client's NAME back in the 201.
    const res = await request.post('/api/invoices', {
      headers: authA,
      data: { client_id: B_CLIENT, items: [{ description: 'x', unit_price: 100, quantity: 1 }] },
    });

    expect(res.status()).toBe(404);
    expect(await res.text()).not.toContain(B_NAME);
  });

  test("B's data is unchanged after every attempt above", async ({ request }) => {
    // The attacks must not have partially succeeded. A cross-tenant write that
    // is rejected AFTER touching a row is still a breach.
    const res = await request.get('/api/pt-os/clients', { headers: authB });
    const body = await res.text();

    expect(body).toContain(B_NAME);
    expect(body).not.toContain(A_NAME);
  });
});

// ── Money ────────────────────────────────────────────────────────────────
//
// pt_payouts and pt_commissions carry no organization_id of their own: the
// tenant boundary runs through trainer_id into pt_trainers.organization_id.
// Every route below was unscoped until this remediation, and mark-all-paid
// was the worst of them — a bulk UPDATE over every studio's pending payouts
// for the month, reachable by any studio's admin in a single call.
//
// The decisive assertion is not the response code, it is B's row afterwards:
// a bulk write that reports "1 updated" to A while quietly moving B's
// paid_at is the exact failure this suite exists to catch.
test.describe('cross-tenant isolation — payouts and commissions', () => {
  let authA: Record<string, string>;
  let authB: Record<string, string>;

  test.beforeAll(async ({ playwright }) => {
    const api = await playwright.request.newContext({ baseURL: process.env.E2E_API_URL ?? 'http://127.0.0.1:5100' });
    authA = await login(api, OWNER_A);
    authB = await login(api, OWNER_B);
    await api.dispose();
  });

  test("A's payout list never contains B's trainer", async ({ request }) => {
    const res = await request.get('/api/pt-os/payouts', { headers: authA });
    const body = await res.text();

    expect(body).toContain(A_TRAINER);
    expect(body).not.toContain(B_TRAINER);
  });

  test("A's commission history never contains B's client", async ({ request }) => {
    const body = await (await request.get('/api/pt-os/commissions', { headers: authA })).text();
    expect(body).not.toContain(B_NAME);
  });

  test("mark-all-paid does not touch B's payout", async ({ request }) => {
    // The whole point. A calls the bulk endpoint; B's pending payout must
    // still be pending afterwards, with no paid_at.
    const before = await payoutStatusFor(request, authB);
    expect(before, 'fixture: B must start with a pending payout').toBe('pending');

    const res = await request.post('/api/pt-os/payouts/mark-all-paid', {
      headers: authA,
      data: { month: currentMonth() },
    });
    expect(res.status()).toBe(200);

    expect(await payoutStatusFor(request, authB)).toBe('pending');
  });

  test("A cannot mark B's payout paid by trainer id", async ({ request }) => {
    const res = await request.put(`/api/pt-os/payouts/${B_TRAINER_ID}`, {
      headers: authA,
      data: { payout_status: 'paid', month: currentMonth() },
    });

    expect(res.status()).toBe(404);
    expect(await payoutStatusFor(request, authB)).toBe('pending');
  });

  test("A cannot approve B's payout by payout id", async ({ request }) => {
    const res = await request.post(`/api/pt-os/payouts/${B_PAYOUT_ID}/approve`, {
      headers: authA,
      data: { payment_method: 'CASH' },
    });

    expect(res.status()).toBe(404);
    expect(await payoutStatusFor(request, authB)).toBe('pending');
  });

  test('recalculating commissions does not rewrite B\'s ledger', async ({ request }) => {
    const res = await request.post('/api/pt-os/commissions/calculate', {
      headers: authA,
      data: { month: currentMonth() },
    });
    expect(res.status()).toBe(200);

    // B's commission row is still B's, and A's recalculation did not fold
    // B's client into its own totals.
    const body = await (await request.get('/api/pt-os/commissions', { headers: authA })).text();
    expect(body).not.toContain(B_NAME);
  });

  /** B's payout status, read as B so the read itself cannot be the leak. */
  async function payoutStatusFor(request: APIRequestContext, auth: Record<string, string>) {
    const res = await request.get(`/api/pt-os/payouts?month=${currentMonth()}`, { headers: auth });
    const rows = (await res.json()).data as Array<{ trainer_name: string; payout_status: string }>;
    return rows.find((r) => r.trainer_name === B_TRAINER)?.payout_status;
  }
});

// ── Staffing ─────────────────────────────────────────────────────────────
//
// leave_requests had no organization_id at all until migration 168, so the
// four /api/leave handlers could not be tenant-scoped even in principle.
// adminOrManager is a role gate, not a tenant gate: it answers "may this
// person approve leave", never "whose leave".
test.describe('cross-tenant isolation — leave requests', () => {
  let authA: Record<string, string>;
  let authB: Record<string, string>;

  test.beforeAll(async ({ playwright }) => {
    const api = await playwright.request.newContext({ baseURL: process.env.E2E_API_URL ?? 'http://127.0.0.1:5100' });
    authA = await login(api, OWNER_A);
    authB = await login(api, OWNER_B);
    await api.dispose();
  });

  test("A's leave list never contains B's request", async ({ request }) => {
    const body = await (await request.get('/api/leave', { headers: authA })).text();
    expect(body).toContain(A_TRAINER);
    expect(body).not.toContain(B_TRAINER);
  });

  test("B's leave list never contains A's request", async ({ request }) => {
    const body = await (await request.get('/api/leave', { headers: authB })).text();
    expect(body).toContain(B_TRAINER);
    expect(body).not.toContain(A_TRAINER);
  });

  test("A cannot read B's leave request by id", async ({ request }) => {
    const res = await request.get(`/api/leave/${B_LEAVE_ID}`, { headers: authA });
    expect(res.status()).toBe(404);
    expect(await res.text()).not.toContain(B_TRAINER);
  });

  test("A cannot approve B's leave request", async ({ request }) => {
    const res = await request.post(`/api/leave/${B_LEAVE_ID}/approve`, {
      headers: authA,
      data: { admin_note: 'approved by the wrong studio' },
    });

    expect(res.status()).toBe(404);
    expect(await leaveStatusFor(request, authB)).toBe('pending');
  });

  test("A cannot reject B's leave request", async ({ request }) => {
    const res = await request.post(`/api/leave/${B_LEAVE_ID}/reject`, {
      headers: authA,
      data: { admin_note: 'rejected by the wrong studio' },
    });

    expect(res.status()).toBe(404);
    expect(await leaveStatusFor(request, authB)).toBe('pending');
  });

  test("A cannot file leave against B's trainer", async ({ request }) => {
    const res = await request.post('/api/leave', {
      headers: authA,
      data: {
        trainer_id: B_TRAINER_ID,
        from_date: '2026-09-01',
        to_date: '2026-09-02',
        leave_type: 'sick',
      },
    });

    expect(res.status()).toBe(404);
  });

  /** B's leave status, read as B. */
  async function leaveStatusFor(request: APIRequestContext, auth: Record<string, string>) {
    const rows = await (await request.get('/api/leave', { headers: auth })).json();
    return (rows as Array<{ id: string; status: string }>).find((r) => r.id === B_LEAVE_ID)?.status;
  }
});

// ── Reporting and AI ─────────────────────────────────────────────────────
//
// An aggregate leaks differently from a row read: there is no id to guess
// and nothing to enumerate, so a single missing predicate hands over the
// whole ledger in one call and looks like a reconciliation bug rather than a
// breach. The AI assistant is the same risk with a natural-language front
// door — it answers from whatever its retrieval step is allowed to see.
test.describe('cross-tenant isolation — reporting and AI', () => {
  let authA: Record<string, string>;

  test.beforeAll(async ({ playwright }) => {
    const api = await playwright.request.newContext({ baseURL: process.env.E2E_API_URL ?? 'http://127.0.0.1:5100' });
    authA = await login(api, OWNER_A);
    await api.dispose();
  });

  test("A's revenue report does not sum B's payments", async ({ request }) => {
    const res = await request.get('/api/pt-os/revenue', { headers: authA });
    expect(res.status()).toBe(200);

    // B's seeded payment is 22222 and A's is 11111. If B's money is in the
    // total, the number carries a digit sequence that A's own data cannot
    // produce.
    const total = ((await res.json()).data as Array<{ revenue: string }>)
      .reduce((sum, row) => sum + Number(row.revenue), 0);
    expect(total).toBe(11111);
  });

  test("A's trainer performance report does not list B's trainer", async ({ request }) => {
    const body = await (await request.get('/api/pt-os/trainer-performance', { headers: authA })).text();
    expect(body).not.toContain(B_TRAINER);
  });

  test("A's balance sheet does not list B's client", async ({ request }) => {
    const body = await (await request.get('/api/pt-os/balance-sheet', { headers: authA })).text();
    expect(body).not.toContain(B_NAME);
  });
});

test.describe('platform-destructive routes are closed to tenant admins', () => {
  test('a Studio Owner cannot reach the platform data-wipe route', async ({ request }) => {
    // Audit finding C-1, CVSS 9.6. /api/admin/reset-all-data runs DELETE across
    // attendance_logs, payments, invoices and clients with NO organization
    // filter. It was guarded by `adminOnly` — role === 'admin', the ordinary
    // Studio Owner role granted to every self-serve trial signup — so any
    // signup could wipe every studio on the platform. It now requires
    // super_admin + MFA.
    const api = await request;
    const res0 = await api.post('/api/auth/login', { data: OWNER_A });
    const token = (await res0.json()).token;

    const res = await api.post('/api/admin/reset-all-data', {
      headers: { Authorization: `Bearer ${token}` },
      data: { otp: '123456' },
    });

    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(JSON.stringify(body)).toMatch(/super admin/i);
  });
});
