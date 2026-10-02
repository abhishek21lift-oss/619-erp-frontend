import { test, expect, type APIRequestContext, type APIResponse } from '@playwright/test';

// The PT client lifecycle, end to end, through the real API (Phase 2).
//
//   Registration → Informed Consent → PAR-Q → Client Interview →
//   Fitness Assessment → Goals → PT Enrolment → Workout Plan
//
// Every step here is taken the way the app takes it — the consent is
// acknowledged and signed by both parties through its own routes, the PAR-Q
// is submitted through its own route — never by writing rows. Nothing is
// fabricated: the screening a client passes is screening this spec submitted.
//
// What it proves, each against a client it made itself:
//
//   · the whole journey in order, with the server's `next` step at each point,
//     and every gate refusing the step that comes too early
//   · a revoked consent stops training, and the journey says why
//   · a high-risk PAR-Q blocks enrolment until clearance
//   · a pending client and an expired client cannot be trained or activated
//   · two enrolments in flight together make one term; two lead conversions
//     in flight together make one client
//   · a retried request does not repeat its effect
//   · the other studio can read or change none of it
//   · a per-channel opt-out is stored, audited and honoured by a broadcast
//
// The API under test is the backend's `e2e:setup` (real Postgres, real
// migrations, served as app_tenant with RLS enforced in CI).

const OWNER_A = { email: 'owner-a@e2e.test', password: 'E2ePassw0rd!seed' };
const OWNER_B = { email: 'owner-b@e2e.test', password: 'E2ePassw0rd!seed' };

let seq = 0;
const RUN = Date.now().toString(36).toUpperCase();
const uniqueName = (tag: string) => `LIFECYCLE-${tag}-${RUN}-${++seq}`;
/** A valid Indian mobile no other row in this run holds. */
const uniqueMobile = () => `9${String(Date.now() + ++seq).slice(-9)}`;

/** A calendar date in the studio's own timezone, `days` from today. */
function day(days: number): string {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

type Auth = { headers: Record<string, string> };
type Step = { key: string; state: string; detail?: string };
type Journey = { steps: Step[]; next: string | null };

async function login(api: APIRequestContext, who: { email: string; password: string }): Promise<Auth> {
  const res = await api.post('/api/auth/login', { data: who });
  expect(res.status(), `login failed for ${who.email}`).toBe(200);
  const body = await res.json();
  return { headers: { Authorization: `Bearer ${body.token ?? body.accessToken}` } };
}

const errorCode = async (res: APIResponse) => {
  const body = await res.json().catch(() => ({}));
  return body?.error?.code ?? body?.code;
};

test.describe('the PT client lifecycle, through the real API', () => {
  let api: APIRequestContext;
  let A: Auth;
  let B: Auth;
  const clients: string[] = [];
  const leads: string[] = [];

  test.beforeAll(async ({ playwright }) => {
    api = await playwright.request.newContext({ baseURL: process.env.E2E_API_URL ?? 'http://127.0.0.1:5100' });
    A = await login(api, OWNER_A);
    B = await login(api, OWNER_B);
  });

  test.afterAll(async () => {
    for (const id of leads) await api.delete(`/api/pt-os/leads/${id}`, A).catch(() => {});
    for (const id of clients) await api.delete(`/api/pt-os/clients/${id}`, A).catch(() => {});
    await api.dispose();
  });

  // ── The steps, each through its own route ──────────────────────────────

  async function newClient(tag: string): Promise<string> {
    const res = await api.post('/api/pt-os/clients', { ...A, data: { name: uniqueName(tag), mobile: uniqueMobile(), gender: 'female' } });
    expect(res.status(), await res.text()).toBe(201);
    const id = (await res.json()).data.id as string;
    clients.push(id);
    return id;
  }

  /** Draft → acknowledgements → client signature → trainer signature. */
  async function signConsent(clientId: string): Promise<string> {
    const created = await api.post('/api/pt-os/informed-consent', { ...A, data: { client_id: clientId } });
    expect(created.status(), await created.text()).toBe(201);
    const id = (await created.json()).data.id as string;
    const acked = await api.patch(`/api/pt-os/informed-consent/${id}`, {
      ...A,
      data: {
        acknowledgements: { understands_confidentiality: true, voluntary_participation: true, final_declaration: true },
        exercise_consent_checked: true,
      },
    });
    expect(acked.status(), await acked.text()).toBe(200);
    for (const signer of ['client', 'trainer']) {
      const signed = await api.post(`/api/pt-os/informed-consent/${id}/sign`, { ...A, data: { signer, signature: `data:${signer}` } });
      expect(signed.status(), await signed.text()).toBe(200);
    }
    return id;
  }

  /** A submitted PAR-Q with all ten questions answered `answer`. */
  async function submitParq(clientId: string, answer: 'yes' | 'no') {
    const res = await api.post('/api/pt-os/parq/forms', {
      ...A,
      data: {
        client_id: clientId, full_name: 'Lifecycle Client', gender: 'female', height_cm: 165, weight_kg: 62,
        parq_answers: Array.from({ length: 10 }, (_, i) => ({ question_id: i + 1, answer })),
        status: 'submitted',
      },
    });
    expect(res.status(), await res.text()).toBe(201);
    return (await res.json()).data;
  }

  const enrol = (clientId: string, auth: Auth = A, dates = { from: day(-5), to: day(85) }, status = 'active') =>
    api.patch(`/api/pt-os/clients/${clientId}`, {
      ...auth,
      data: { status, pt_start_date: dates.from, pt_end_date: dates.to, duration_months: 3, final_amount: 9000, paid_amount: 0 },
    });

  const bookSession = (clientId: string, auth: Auth = A) =>
    api.post('/api/pt-os/sessions', { ...auth, data: { client_id: clientId, date: day(1), start_time: '07:00', duration_minutes: 60 } });

  async function journey(clientId: string): Promise<Journey> {
    const res = await api.get(`/api/pt-os/clients/${clientId}/journey`, A);
    expect(res.status(), await res.text()).toBe(200);
    return (await res.json()).data;
  }
  const stateOf = (j: Journey, key: string) => j.steps.find((s) => s.key === key);

  // ── The whole journey ──────────────────────────────────────────────────

  test('a new client walks the journey in order; every early step is refused', async () => {
    const id = await newClient('JOURNEY');
    let j = await journey(id);
    expect(j.next).toBe('consent');
    expect(stateOf(j, 'enrolment')?.state).toBe('blocked');

    // Too early: enrolment and training both refused, with the reason.
    const early = await enrol(id);
    expect(early.status()).toBe(403);
    expect(await errorCode(early)).toBe('SCREENING_REQUIRED');
    expect((await early.json()).error.missing).toEqual(['informed_consent', 'parq']);
    expect(await errorCode(await bookSession(id))).toBe('CLIENT_NOT_ENROLLED');

    await signConsent(id);
    j = await journey(id);
    expect(stateOf(j, 'consent')?.state).toBe('done');
    expect(j.next).toBe('parq');
    expect((await (await enrol(id)).json()).error.missing).toEqual(['parq']);

    const parq = await submitParq(id, 'no');
    expect(parq.risk_level).not.toBe('high');
    j = await journey(id);
    expect(stateOf(j, 'parq')?.state).toBe('done');
    expect(j.next).toBe('interview');

    const iv = await api.post(`/api/pt-os/clients/${id}/interviews`, { ...A, data: { training_history: 'Swims twice a week' } });
    expect(iv.status()).toBe(201);
    const done = await api.patch(`/api/pt-os/interviews/${(await iv.json()).data.id}`, { ...A, data: { status: 'completed' } });
    expect(done.status()).toBe(200);
    j = await journey(id);
    expect(stateOf(j, 'interview')?.state).toBe('done');
    expect(j.next).toBe('assessment');

    const enrolled = await enrol(id);
    expect(enrolled.status(), await enrolled.text()).toBe(200);
    j = await journey(id);
    expect(stateOf(j, 'enrolment')?.state).toBe('done');
    expect(stateOf(j, 'workout_plan')?.state).toBe('todo');

    // Read back, not inferred from the 200.
    const client = (await (await api.get(`/api/pt-os/clients/${id}`, A)).json()).data;
    expect(client.status).toBe('active');
    expect(client.screening.complete).toBe(true);

    const booked = await bookSession(id);
    expect(booked.status(), await booked.text()).toBe(201);
  });

  test('the interview is optional: a screened client enrols without one', async () => {
    const id = await newClient('NO-INTERVIEW');
    await signConsent(id);
    await submitParq(id, 'no');
    expect((await enrol(id)).status()).toBe(200);
    expect(stateOf(await journey(id), 'interview')?.state).toBe('todo');
  });

  // ── Medical stops ──────────────────────────────────────────────────────

  test('a revoked consent stops training, and the journey says why', async () => {
    const id = await newClient('REVOKED');
    const consentId = await signConsent(id);
    await submitParq(id, 'no');
    expect((await enrol(id)).status()).toBe(200);
    expect((await bookSession(id)).status()).toBe(201);

    const revoked = await api.post(`/api/pt-os/informed-consent/${consentId}/revoke`, { ...A, data: { reason: 'Client withdrew' } });
    expect(revoked.status(), await revoked.text()).toBe(200);

    const refused = await bookSession(id);
    expect(refused.status()).toBe(403);
    expect(await errorCode(refused)).toBe('CONSENT_REVOKED');
    const consent = stateOf(await journey(id), 'consent');
    expect(consent?.state).toBe('blocked');
    expect(consent?.detail).toMatch(/revoked/i);

    // A revoked consent cannot be revoked or signed again.
    expect((await api.post(`/api/pt-os/informed-consent/${consentId}/revoke`, { ...A, data: {} })).status()).toBe(409);
    expect(await errorCode(await api.post(`/api/pt-os/informed-consent/${consentId}/sign`, { ...A, data: { signer: 'client', signature: 'x' } })))
      .toBe('NOT_SIGNABLE');
  });

  test('a high-risk PAR-Q blocks enrolment until clearance', async () => {
    const id = await newClient('HIGH-RISK');
    await signConsent(id);
    const parq = await submitParq(id, 'yes');
    expect(parq.risk_level).toBe('high');

    const refused = await enrol(id);
    expect(refused.status()).toBe(403);
    expect(await errorCode(refused)).toBe('PARQ_BLOCKED');
    const step = stateOf(await journey(id), 'parq');
    expect(step?.state).toBe('blocked');
    expect(step?.detail).toBeTruthy();

    // Nothing was written by the refused enrolment.
    const client = (await (await api.get(`/api/pt-os/clients/${id}`, A)).json()).data;
    expect(client.status).toBe('pending');
    expect(client.pt_end_date ?? null).toBeNull();
  });

  // ── Status: pending and expired ────────────────────────────────────────

  test('a pending client cannot be trained or made active without a term', async () => {
    const id = await newClient('PENDING');
    await signConsent(id);
    await submitParq(id, 'no');
    expect(await errorCode(await bookSession(id))).toBe('CLIENT_NOT_ENROLLED');
    const activate = await api.patch(`/api/pt-os/clients/${id}`, { ...A, data: { status: 'active' } });
    expect(activate.status()).toBe(409);
    expect(await errorCode(activate)).toBe('CLIENT_NOT_ENROLLED');
  });

  test('an expired client cannot be trained or reactivated; the journey offers renewal', async () => {
    const id = await newClient('EXPIRED');
    await signConsent(id);
    await submitParq(id, 'no');
    const ended = await enrol(id, A, { from: day(-100), to: day(-10) }, 'expired');
    expect(ended.status(), await ended.text()).toBe(200);

    const refused = await bookSession(id);
    expect(refused.status()).toBe(409);
    expect(await errorCode(refused)).toBe('TERM_EXPIRED');
    expect(await errorCode(await api.patch(`/api/pt-os/clients/${id}`, { ...A, data: { status: 'active' } }))).toBe('TERM_EXPIRED');
    expect(stateOf(await journey(id), 'enrolment')?.state).toBe('renew');
  });

  test('an end date before the start date is refused', async () => {
    const id = await newClient('BAD-RANGE');
    await signConsent(id);
    await submitParq(id, 'no');
    const res = await enrol(id, A, { from: day(10), to: day(1) });
    expect(res.status()).toBe(400);
  });

  // ── Concurrency and retries ────────────────────────────────────────────

  test('two enrolments in flight together make one term', async () => {
    const id = await newClient('CONCURRENT');
    await signConsent(id);
    await submitParq(id, 'no');
    const results = await Promise.all([enrol(id), enrol(id)]);
    expect(results.some((r) => r.status() === 200)).toBe(true);
    for (const r of results) expect(r.status(), 'neither request may fail as a server error').toBeLessThan(500);
    const subs = (await (await api.get(`/api/pt-os/clients/${id}/subscriptions`, A)).json()).data as unknown[];
    expect(subs).toHaveLength(1);
  });

  test('two conversions of one lead in flight together make one client; a retry says so', async () => {
    const mobile = uniqueMobile();
    const lead = await api.post('/api/pt-os/leads', { ...A, data: { name: uniqueName('LEAD'), mobile } });
    expect(lead.status(), await lead.text()).toBe(201);
    const leadId = (await lead.json()).data.id as string;
    leads.push(leadId);

    const [one, two] = await Promise.all([
      api.post(`/api/pt-os/leads/${leadId}/convert`, A),
      api.post(`/api/pt-os/leads/${leadId}/convert`, A),
    ]);
    const statuses = [one.status(), two.status()].sort();
    expect(statuses).toEqual([201, 409]);
    const loser = one.status() === 409 ? one : two;
    expect(await errorCode(loser)).toBe('ALREADY_CONVERTED');

    const retry = await api.post(`/api/pt-os/leads/${leadId}/convert`, A);
    expect(await errorCode(retry)).toBe('ALREADY_CONVERTED');

    const list = (await (await api.get(`/api/pt-os/clients?search=${mobile}`, A)).json()).data as { id: string; mobile: string }[];
    const made = list.filter((c) => c.mobile === mobile);
    expect(made).toHaveLength(1);
    clients.push(made[0].id);
    // A converted client is pending: conversion is not enrolment.
    expect(await errorCode(await bookSession(made[0].id))).toBe('CLIENT_NOT_ENROLLED');
  });

  test('a completed session and a completed interview cannot be reopened', async () => {
    const id = await newClient('FINAL');
    await signConsent(id);
    await submitParq(id, 'no');
    expect((await enrol(id)).status()).toBe(200);
    const session = (await (await bookSession(id)).json()).data;
    expect((await api.patch(`/api/pt-os/sessions/${session.id}`, { ...A, data: { status: 'completed' } })).status()).toBe(200);
    const reopen = await api.patch(`/api/pt-os/sessions/${session.id}`, { ...A, data: { status: 'scheduled' } });
    expect(reopen.status()).toBe(409);
    expect(await errorCode(reopen)).toBe('INVALID_SESSION_TRANSITION');

    const iv = (await (await api.post(`/api/pt-os/clients/${id}/interviews`, { ...A, data: { status: 'completed', motivation: 'Marathon' } })).json()).data;
    expect((await api.patch(`/api/pt-os/interviews/${iv.id}`, { ...A, data: { status: 'draft' } })).status()).toBe(409);
  });

  // ── Tenant isolation ───────────────────────────────────────────────────

  test('the other studio can read or change none of the lifecycle', async () => {
    const id = await newClient('TENANT');
    const consentId = await signConsent(id);
    const iv = (await (await api.post(`/api/pt-os/clients/${id}/interviews`, { ...A, data: { notes: 'private' } })).json()).data;

    expect((await api.get(`/api/pt-os/clients/${id}/journey`, B)).status()).toBe(404);
    expect((await api.get(`/api/pt-os/clients/${id}/interviews`, B)).status()).toBe(404);
    expect((await api.post(`/api/pt-os/clients/${id}/interviews`, { ...B, data: { notes: 'x' } })).status()).toBe(404);
    expect((await api.patch(`/api/pt-os/interviews/${iv.id}`, { ...B, data: { notes: 'hijack' } })).status()).toBe(404);
    expect((await api.post(`/api/pt-os/informed-consent/${consentId}/revoke`, { ...B, data: {} })).status()).toBe(404);
    expect([403, 404]).toContain((await enrol(id, B)).status());
    expect([403, 404]).toContain((await bookSession(id, B)).status());
    expect([403, 404]).toContain((await api.patch(`/api/pt-os/clients/${id}`, { ...B, data: { whatsapp_opt_out: true } })).status());

    // And nothing changed.
    const after = (await (await api.get(`/api/pt-os/clients/${id}`, A)).json()).data;
    expect(after.whatsapp_opt_out).toBe(false);
    expect(after.screening.consent.status).toBe('completed');
    const ivs = (await (await api.get(`/api/pt-os/clients/${id}/interviews`, A)).json()).data;
    expect(ivs[0].notes).toBe('private');
  });

  // ── Messaging opt-out ──────────────────────────────────────────────────

  test('an opt-out is stored per channel, audited, and honoured by a broadcast', async () => {
    const id = await newClient('OPT-OUT');
    expect((await api.patch(`/api/pt-os/clients/${id}`, { ...A, data: { whatsapp_opt_out: 'yes' } })).status()).toBe(400);

    const off = await api.patch(`/api/pt-os/clients/${id}`, { ...A, data: { whatsapp_opt_out: true } });
    expect(off.status(), await off.text()).toBe(200);
    const client = (await (await api.get(`/api/pt-os/clients/${id}`, A)).json()).data;
    expect(client.whatsapp_opt_out).toBe(true);
    expect(client.email_opt_out).toBe(false);
    expect(client.comm_prefs_updated_at).toBeTruthy();

    // A promotional WhatsApp to this client is suppressed, not sent; the
    // in-app channel, which has no opt-out, still goes.
    const wa = await api.post('/api/v1/notifications/broadcast', {
      ...A, data: { type: 'membership_expiring', member_ids: [id], data: { days: 3, plan: 'PT' }, channels: ['whatsapp'] },
    });
    expect(wa.status(), await wa.text()).toBe(200);
    expect((await wa.json()).data).toMatchObject({ count: 1, skipped: 0, suppressed: 1 });

    // Opting back in is the same switch, and is audited the same way.
    expect((await api.patch(`/api/pt-os/clients/${id}`, { ...A, data: { whatsapp_opt_out: false } })).status()).toBe(200);
    expect((await (await api.get(`/api/pt-os/clients/${id}`, A)).json()).data.whatsapp_opt_out).toBe(false);
  });
});
