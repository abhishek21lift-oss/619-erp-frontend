import { test, expect, type Page, type Locator } from '@playwright/test';
import { gotoApp, apiToken, apiGet, apiPost, apiDelete } from './helpers/session';

/**
 * Journey — the K11 four-test flexibility battery on Step 7 of the fitness
 * assessment (protocol k11-2026.01):
 *
 *   Quadriceps → Hamstrings 70° Reach → Hip Flexors (Thomas) → YMCA Sit and Reach
 *
 * Real browser, real API, real Postgres. The client and its screening are
 * arranged through the API (the intake journeys belong to client-interview and
 * client-journey.api.spec); the battery is recorded only through the screens
 * and read back from the API — raw values in, derived values out.
 *
 * The step is reached the way a trainer reaches it: walked from step 1. The
 * stepper deliberately allows only one step past the current one, so there is
 * no jump-to-7 shortcut — the walk costs two readings and five dropdowns.
 */

interface Row {
  id: string;
  flexibility_test_data: unknown;
}

/** The stored v3 battery, only the parts this journey asserts. */
interface Battery {
  protocol_version?: string;
  overall_status?: string;
  recorded_at?: string | null;
  assessor_id?: string | null;
  override?: { used?: boolean; reason?: string | null };
  tests: {
    quadriceps: { overall_interpretation?: string | null };
    hamstrings: {
      sides: { left: { hip_flexion_deg?: number | null }; right: { hip_flexion_deg?: number | null } };
      sides_validity: { left?: string; right?: string };
    };
    hip_flexors: { sides_interpretation: { left?: string | null; right?: string | null } };
    sit_and_reach: {
      best_attempt_index?: number | null;
      best_raw_inches?: number | null;
      score_inches?: number | null;
      norm?: { category?: string | null; message?: string | null };
    };
  };
}

let seq = 0;
const uniqueName = () => `E2E-FLEX-${Date.now().toString(36).toUpperCase()}-${++seq}`;
const uniqueMobile = () => `9${String(Date.now() + ++seq).slice(-9)}`;

/** The four tests, in the protocol's fixed order. */
const NAMES = ['Quadriceps', 'Hamstrings 70° Reach', 'Hip Flexors — Thomas', 'YMCA Sit and Reach'] as const;

test.describe('K11 flexibility battery (fitness assessment step 7)', () => {
  let token = '';
  let clientId = '';
  const created: string[] = [];

  test.beforeEach(async () => {
    token = await apiToken();
    const name = uniqueName();
    const mobile = uniqueMobile();

    const res = await apiPost<{ data: { id: string } }>('/api/pt-os/clients', token, { name, mobile, gender: 'male' });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    clientId = res.body.data.id;
    created.push(clientId);

    // The screening gate refuses to test a new client until the PAR-Q and the
    // informed consent are in. Arrange those through the API so this journey
    // can be about the battery rather than about the intake forms.
    const parq = await apiPost('/api/pt-os/parq/forms', token, {
      client_id: clientId, full_name: name, gender: 'male', mobile,
      height_cm: 175, weight_kg: 70,
      parq_answers: Array.from({ length: 10 }, (_, i) => ({ question_id: i + 1, answer: 'no' })),
      status: 'submitted',
    });
    expect(parq.status, JSON.stringify(parq.body)).toBeLessThan(300);

    const consent = await apiPost('/api/pt-os/informed-consent', token, {
      client_id: clientId, full_name: name, mobile,
      consent_date: new Date().toISOString().slice(0, 10),
    });
    expect(consent.status, JSON.stringify(consent.body)).toBeLessThan(300);
  });

  test.afterAll(async () => {
    const t = await apiToken();
    for (const id of created) await apiDelete(`/api/pt-os/clients/${id}`, t);
  });

  const batteries = async (): Promise<Row[]> =>
    (await apiGet<{ data?: Row[] }>(`/api/progress/assessments?client_id=${clientId}&limit=5`, token)).data ?? [];

  const batteryOf = (row: Row): Battery =>
    (typeof row.flexibility_test_data === 'string'
      ? JSON.parse(row.flexibility_test_data)
      : row.flexibility_test_data) as Battery;

  /* ── Locators over structure, not classes ────────────────────────────────
   * No test ids on these screens, so each one scopes by the text the trainer
   * reads: nested matches are ordered outer-to-inner in the DOM, so `last()`
   * picks the innermost container — exactly the card or chip row wanted. */

  /** The overview card for one test: the innermost container of its name and its action button. */
  const card = (page: Page, name: string): Locator =>
    page.locator('div')
      .filter({ has: page.getByText(name, { exact: true }) })
      .filter({ has: page.getByRole('button', { name: /^(Start|Continue|Edit result)$/ }) })
      .last();

  /** One side's card on a test screen (its "Left leg" / "Right leg" panel). */
  const side = (page: Page, which: 'Left' | 'Right'): Locator =>
    page.locator('div').filter({ has: page.getByText(`${which} leg`, { exact: true }) }).last();

  /** The chip row for one question, scoped to where it was asked. */
  const chipRow = (scope: Locator, label: string): Locator =>
    scope.locator('div').filter({ has: scope.page().getByText(label, { exact: true }) }).last();

  const answer = async (scope: Locator, label: string, yes: boolean): Promise<void> => {
    await chipRow(scope, label).getByRole('button', { name: yes ? 'Yes' : 'No', exact: true }).click();
  };

  /** A Sit and Reach attempt's own row — the innermost grid holding both its reach and its Valid chips. */
  const attemptRow = (page: Page, n: number): Locator =>
    page.locator('div.grid').filter({ has: page.getByLabel(`Attempt ${n} reach`) }).last();

  /** Walk 1 → 7 with the least valid data each step asks for. */
  async function walkToStep7(page: Page): Promise<void> {
    await gotoApp(page, `/pt-os/assessment?client_id=${clientId}`);
    await expect(page.getByLabel('Systolic (mmHg)')).toBeVisible({ timeout: 25_000 });

    const next = page.getByRole('button', { name: 'Next', exact: true });
    await page.getByLabel('Systolic (mmHg)').fill('120');
    await page.getByLabel('Diastolic (mmHg)').fill('80');
    await next.click(); // 1 → 2
    await next.click(); // 2 → 3
    await next.click(); // 3 → 4

    // 4: a cardiorespiratory test is the step's only requirement.
    await page.getByRole('button', { name: 'Test', exact: true }).click();
    await page.getByRole('button', { name: 'YMCA 3-Minute Step Test', exact: true }).click();
    await next.click(); // 4 → 5

    // 5: two distinct strength exercises.
    await page.getByRole('button', { name: 'Exercise', exact: true }).first().click();
    await page.getByRole('button', { name: 'Bench Press', exact: true }).click();
    await page.getByRole('button', { name: 'Exercise', exact: true }).nth(1).click();
    await page.getByRole('button', { name: 'Leg Press', exact: true }).click();
    await next.click(); // 5 → 6

    // 6: two distinct endurance tests. Both pickers are labelled "Test", and
    // the first one's exit animation keeps its options mounted for ~150ms —
    // long enough for "Curl Up Test" to match twice if the second picker
    // opens straight away. Wait for the first picker to be gone.
    await page.getByRole('button', { name: 'Test', exact: true }).first().click();
    await page.getByRole('button', { name: 'Push Up Test', exact: true }).click();
    await expect(page.getByLabel('Search Test')).toHaveCount(0);
    await page.getByRole('button', { name: 'Test', exact: true }).nth(1).click();
    await page.getByRole('button', { name: 'Curl Up Test', exact: true }).click();
    await next.click(); // 6 → 7
  }

  test('records the four K11 tests, keeps a negative Sit and Reach, and stores the battery', async ({ page }) => {
    await walkToStep7(page);

    // ── The overview: the four tests, in the protocol's fixed order ────────
    for (const name of NAMES) await expect(page.getByText(name, { exact: true })).toBeVisible({ timeout: 20_000 });
    const ys = await Promise.all(NAMES.map(async (n) => (await page.getByText(n, { exact: true }).boundingBox())?.y ?? NaN));
    expect(ys, 'the tests are listed in the K11 order').toEqual([...ys].sort((a, b) => a - b));

    // ── Quadriceps: an empty test cannot be marked complete ────────────────
    await card(page, 'Quadriceps').getByRole('button', { name: 'Start', exact: true }).click();
    await page.getByRole('button', { name: 'Mark Test Complete', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('choose Yes or No');
    await expect(page.getByRole('button', { name: 'Mark Test Complete', exact: true })).toBeVisible();

    // Contact on both sides; pelvis and pain clear. Contact Yes means no gap to measure.
    const qLeft = side(page, 'Left');
    const qRight = side(page, 'Right');
    await answer(qLeft, 'Heel touched the buttock (contact)', true);
    await answer(qLeft, 'Pelvic compensation', false);
    await answer(qLeft, 'Pain reported', false);
    await answer(qRight, 'Heel touched the buttock (contact)', true);
    await answer(qRight, 'Pelvic compensation', false);
    await answer(qRight, 'Pain reported', false);
    await page.getByRole('button', { name: 'Mark Test Complete', exact: true }).click();

    // ── Hamstrings: a bent knee is a repeat, and correcting it clears the flag ──
    await card(page, 'Hamstrings 70° Reach').getByRole('button', { name: 'Start', exact: true }).click();
    const hLeft = side(page, 'Left');
    await page.getByLabel('Hip flexion angle (left)').fill('72');
    await answer(hLeft, 'Knee stayed fully extended', false);
    await answer(hLeft, 'Pelvic compensation', false);
    await answer(hLeft, 'Pain reported', false);
    await expect(page.getByText('repeat (knee or pelvis)')).toBeVisible();
    await answer(hLeft, 'Knee stayed fully extended', true);
    await expect(page.getByText('repeat (knee or pelvis)')).toBeHidden();

    const hRight = side(page, 'Right');
    await page.getByLabel('Hip flexion angle (right)').fill('75');
    await answer(hRight, 'Knee stayed fully extended', true);
    await answer(hRight, 'Pelvic compensation', false);
    await answer(hRight, 'Pain reported', false);
    await page.getByRole('button', { name: 'Mark Test Complete', exact: true }).click();

    // ── Hip flexors: both thighs below the table line, pelvis controlled ───
    await card(page, 'Hip Flexors — Thomas').getByRole('button', { name: 'Start', exact: true }).click();
    await page.getByLabel('Thigh position (left)').selectOption('below');
    await answer(side(page, 'Left'), 'Pelvic compensation', false);
    await answer(side(page, 'Left'), 'Pain reported', false);
    await page.getByLabel('Thigh position (right)').selectOption('below');
    await answer(side(page, 'Right'), 'Pelvic compensation', false);
    await answer(side(page, 'Right'), 'Pain reported', false);
    await page.getByRole('button', { name: 'Mark Test Complete', exact: true }).click();

    // ── Sit and Reach: 8, 12 valid and 15 invalid — best VALID is 12, so ────
    // the score is 12 − 15 = −3: the box's zero point makes a short reach a
    // real negative result, and an invalid higher attempt must not score.
    await card(page, 'YMCA Sit and Reach').getByRole('button', { name: 'Start', exact: true }).click();
    await page.getByLabel('Attempt 1 reach').fill('8');
    await page.getByRole('button', { name: 'Add attempt', exact: true }).click();
    await page.getByLabel('Attempt 2 reach').fill('12');
    await page.getByRole('button', { name: 'Add attempt', exact: true }).click();
    await page.getByLabel('Attempt 3 reach').fill('15');
    await attemptRow(page, 3).getByRole('button', { name: 'No', exact: true }).click();
    await expect(page.getByText('-3.0 in')).toBeVisible();
    await expect(page.getByText('Norm classification unavailable')).toBeVisible();
    await page.getByRole('button', { name: 'Mark Test Complete', exact: true }).click();

    // ── The summary: overall status and the arithmetic, as stored ──────────
    await expect(page.getByText('All tests recorded')).toBeVisible();
    await page.getByRole('button', { name: 'Summary', exact: true }).click();
    await expect(page.getByText('All tests recorded')).toBeVisible();
    await expect(page.getByText('-3.0 in')).toBeVisible();
    await expect(page.getByText('Norm classification unavailable')).toBeVisible();
    await page.getByRole('button', { name: 'All tests', exact: true }).click();

    // ── Save through the wizard, then read the row back ────────────────────
    await page.getByRole('button', { name: 'Review', exact: true }).click();
    await page.getByRole('button', { name: 'Save Assessment', exact: true }).click();
    await expect(page.getByText('Assessment Saved')).toBeVisible({ timeout: 20_000 });

    await expect.poll(async () => (await batteries()).length, { timeout: 15_000 }).toBe(1);
    const [row] = await batteries();
    const f = batteryOf(row);

    expect(f.protocol_version).toBe('k11-2026.01');
    expect(f.overall_status).toBe('all_tests_recorded');
    expect(f.override?.used).toBe(false);
    expect(f.tests.quadriceps.overall_interpretation).toBe('Normal');
    expect(f.tests.hamstrings.sides.left.hip_flexion_deg).toBe(72);
    expect(f.tests.hamstrings.sides.right.hip_flexion_deg).toBe(75);
    expect(f.tests.hamstrings.sides_validity.left).toBe('valid');
    expect(f.tests.hip_flexors.sides_interpretation.left).toBe('Clear');
    expect(f.tests.hip_flexors.sides_interpretation.right).toBe('Clear');
    expect(f.tests.sit_and_reach.best_attempt_index).toBe(1);
    expect(f.tests.sit_and_reach.best_raw_inches).toBe(12);
    expect(f.tests.sit_and_reach.score_inches).toBe(-3);
    expect(f.tests.sit_and_reach.norm).toMatchObject({ category: null, message: 'Norm classification unavailable' });
    // Provenance is the server's to stamp — the client never sent these.
    expect(f.recorded_at).toBeTruthy();
    expect(f.assessor_id).toBeTruthy();
  });

  test.describe('on a 390px phone', () => {
    test.use({ viewport: { width: 390, height: 844 } });

    const sideways = (page: Page): Promise<number> =>
      page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

    test('step 7 offers the four tests without sideways scrolling', async ({ page }) => {
      await walkToStep7(page);
      await expect(page.getByText('YMCA Sit and Reach', { exact: true })).toBeVisible({ timeout: 20_000 });
      expect(await sideways(page), 'the overview scrolls sideways on a phone').toBeLessThanOrEqual(1);

      // The widest screen is a test's own: protocol beside fields on desktop,
      // stacked here. If anything overflows, it overflows there.
      await card(page, 'Hamstrings 70° Reach').getByRole('button', { name: 'Start', exact: true }).click();
      await expect(page.getByLabel('Hip flexion angle (left)')).toBeVisible();
      expect(await sideways(page), 'the hamstrings screen scrolls sideways on a phone').toBeLessThanOrEqual(1);
    });
  });
});
