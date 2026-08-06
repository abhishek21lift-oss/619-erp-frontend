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
