import { test, expect, type APIRequestContext } from '@playwright/test';

// Phase 5/7 — Studio 360 page (/platform/studios/:id)
//
// Properties pinned against a real running app:
//   1. The page loads for a valid studio id, and three tabs are present:
//      Health / Memberships / Revenue.
//   2. The /studios/:id/memberships API does NOT include phone, email, or
//      payment_method in the response. The brief says "no PII on the
//      read side" for the platform admin's view.
//   3. The /studios/:id/health endpoint returns 404 (NOT a zeroed
//      "healthy" payload) for a UUID that doesn't exist in the DB.

const PLATFORM = { email: 'platform@e2e.test', password: 'E2ePassw0rd!seed' };

// Alpha Studio from the seed — see scripts/seed-e2e.js. Reusing the
// same id keeps this spec in lock-step with the cross-tenant isolation
// suite: when ALPHA-ONLY-CLIENT is the canary, the page under test is
// the page that surfaces it.
const ALPHA_ORG_ID = '0a000000-0000-4000-8000-000000000001';
const NONEXISTENT_UUID = '99999999-9999-9999-9999-999999999999';

async function loginPlatform(request: APIRequestContext) {
  const res = await request.post('/api/auth/login', { data: PLATFORM });
  expect(res.status(), 'platform login failed').toBe(200);
  const body = await res.json();
  return { Authorization: `Bearer ${body.token ?? body.accessToken}` };
}

test.describe('Studio 360 page', () => {
  let auth: Record<string, string>;

  test.beforeAll(async ({ playwright }) => {
    const api = await playwright.request.newContext({
      baseURL: process.env.E2E_API_URL ?? 'http://127.0.0.1:5100',
    });
    auth = await loginPlatform(api);
    await api.dispose();
  });

  test('the memberships API omits phone, email, payment_method — PII gate', async ({ request }) => {
    const res = await request.get(`/api/platform/studios/${ALPHA_ORG_ID}/memberships`, { headers: auth });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data).toBeInstanceOf(Array);
    for (const row of body.data) {
      // The PII gate is the only thing keeping a platform admin from
      // being a privacy incident. Pin all three columns.
      expect(row, 'phone must not be in a platform-admin row').not.toHaveProperty('phone');
      expect(row, 'email must not be in a platform-admin row').not.toHaveProperty('email');
      expect(row, 'payment_method must not be in a platform-admin row').not.toHaveProperty('payment_method');
    }
  });

  test('the health endpoint returns 404 NOT_FOUND for a non-existent studio', async ({ request }) => {
    // A typo'd id must not silently render a "0 events, healthy" card.
    // The 404 makes the typo visible.
    const res = await request.get(`/api/platform/studios/${NONEXISTENT_UUID}/health`, { headers: auth });
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.error?.code ?? body.code).toBe('NOT_FOUND');
  });

  test('the health endpoint rejects non-UUID ids with 400 BAD_ID before any DB work', async ({ request }) => {
    // The URL is the authorization. A non-UUID id is a malformed auth
    // boundary, and the route validates it before running the query.
    for (const bad of ['not-a-uuid', '12345', 'alpha-studio']) {
      const res = await request.get(`/api/platform/studios/${bad}/health`, { headers: auth });
      expect(res.status(), `expected 400 for ${bad}`).toBe(400);
    }
  });

  test('the page renders the 3 tabs for a valid studio id', async ({ page }) => {
    // The tabs are the page's primary navigation — they must be present
    // so a platform admin can switch between Health / Memberships / Revenue
    // without a page reload.
    await page.goto(`/platform/studios/${ALPHA_ORG_ID}`);
    // The tabs are rendered with text content; exact selector is the
    // page's concern. The contract is: at least 3 tab-like buttons.
    const tabs = page.getByRole('tab');
    await expect(tabs).toHaveCount(3, { timeout: 10_000 });
  });
});
