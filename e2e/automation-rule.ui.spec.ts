import { test, expect, type Page } from '@playwright/test';
import { gotoApp, apiToken, apiGet, apiDelete, doubleTap } from './helpers/session';

/**
 * Journey 15 — WhatsApp automation rule creation.
 *
 * §9. A rule's template is rendered by the engine against the context of ONE
 * trigger, and the placeholders that resolve differ per trigger. `{{amount}}`
 * resolves on a payment and is delivered to a member as literal braces on a
 * birthday — so "does this placeholder exist" is not a question the form can
 * answer without knowing which trigger is selected.
 *
 * The journeys below change the trigger and check that the form's answer
 * changes with it, then prove the rule that is saved is the rule that was
 * typed.
 */

type Rule = {
  id: string; name?: string; trigger_event?: string;
  template?: string; delay_minutes?: number | string; channel?: string;
};

async function rules(token: string): Promise<Rule[]> {
  const body = await apiGet<{ data?: Rule[] }>('/api/automation/rules', token);
  return body.data ?? [];
}

const byName = async (token: string, name: string) =>
  (await rules(token)).filter((r) => r.name === name);

// A counter as well as the clock: two calls in the same millisecond
// produced the SAME "unique" name, and a test that then counted rows by
// that name found two where it expected one — reported as a duplicate
// submit, which is exactly the defect these journeys exist to catch.
let seq = 0;
function uniqueName(): string {
  seq += 1;
  return `E2E-RULE-${Date.now().toString(36).toUpperCase()}-${seq}`;
}

async function openForm(page: Page) {
  await page.getByRole('button', { name: 'New Rule' }).click();
  await expect(page.getByLabel(/^Rule name/)).toBeVisible();
}

const save = (page: Page) => page.getByRole('button', { name: /^Create Rule/ });

test.describe('WhatsApp automation rule', () => {
  let token: string;
  const created: string[] = [];

  test.afterAll(async () => {
    const t = await apiToken();
    for (const id of created) await apiDelete(`/api/automation/rules/${id}`, t);
  });

  test.beforeEach(async ({ page }) => {
    token = await apiToken();
    await gotoApp(page, '/engagement/automation');
    await expect(page.getByRole('button', { name: 'New Rule' })).toBeVisible({ timeout: 20_000 });
  });

  test('a rule reaches the database with the template exactly as typed', async ({ page }) => {
    const name = uniqueName();
    const template = 'Hi {{name}}, we received ₹{{amount}} — thank you!';

    await openForm(page);
    await page.getByLabel(/^Rule name/).fill(name);
    await page.getByLabel(/^Trigger/).selectOption('payment_received');
    await page.getByLabel(/^Message/).fill(template);
    await page.getByLabel(/^Delay/).fill('0');
    await save(page).click();

    await expect.poll(async () => (await byName(token, name)).length, { timeout: 15_000 }).toBe(1);
    const [rule] = await byName(token, name);
    created.push(rule.id);

    // Byte for byte. A template the platform "helpfully" rewrites is a message
    // the studio did not write being sent under its name.
    expect(rule.template).toBe(template);
    expect(rule.trigger_event).toBe('payment_received');
    expect(Number(rule.delay_minutes)).toBe(0);
  });

  test('a placeholder the selected trigger cannot provide is refused', async ({ page }) => {
    // `{{amount}}` on a birthday is delivered to the member as the six
    // characters {{ a m o u n t }}. The form knows which trigger is selected,
    // so it is the only place that can catch it.
    const name = uniqueName();
    let posted = 0;
    await page.route('**/api/automation/rules', (route) => {
      if (route.request().method() === 'POST') posted += 1;
      return route.continue();
    });

    await openForm(page);
    await page.getByLabel(/^Rule name/).fill(name);
    await page.getByLabel(/^Trigger/).selectOption('birthday');
    await page.getByLabel(/^Message/).fill('Happy birthday {{name}}! Your balance is ₹{{amount}}.');
    await page.getByLabel(/^Delay/).fill('0');
    await save(page).click();

    await page.waitForTimeout(1200);
    expect(posted, 'nothing was sent').toBe(0);
    expect((await byName(token, name)).length).toBe(0);
  });

  test('the same placeholder is accepted on the trigger that provides it', async ({ page }) => {
    // The other half of the previous test: the check is about the TRIGGER, not
    // a blanket list of approved words.
    const name = uniqueName();
    await openForm(page);
    await page.getByLabel(/^Rule name/).fill(name);
    await page.getByLabel(/^Trigger/).selectOption('payment_received');
    await page.getByLabel(/^Message/).fill('Thanks {{name}} — ₹{{amount}} received.');
    await page.getByLabel(/^Delay/).fill('0');
    await save(page).click();

    await expect.poll(async () => (await byName(token, name)).length, { timeout: 15_000 }).toBe(1);
    created.push((await byName(token, name))[0].id);
  });

  test('the help text names the variables of the trigger actually selected', async ({ page }) => {
    // The list was a fixed vocabulary that matched no trigger. A studio owner
    // reading it wrote a template against variables that would never resolve.
    await openForm(page);

    // Scoped to the field's own description. Unscoped, this matched the
    // template text of every rule already in the list behind the form.
    const help = page.locator('[id$="-description"]').first();

    await page.getByLabel(/^Trigger/).selectOption('payment_received');
    await expect(help).toContainText('{{amount}}');

    await page.getByLabel(/^Trigger/).selectOption('membership_expiring');
    await expect(help).toContainText('{{days}}');
    await expect(help, 'amount does not resolve on an expiry').not.toContainText('{{amount}}');

    await page.getByLabel(/^Trigger/).selectOption('birthday');
    await expect(help).toContainText(/only \{\{name\}\}/i);
  });

  test('a delay beyond a week is refused', async ({ page }) => {
    // The backend takes `parseInt(delay_minutes) || 0`, unbounded: 100080
    // instead of 1008 enqueues a message that fires ten weeks late, about a
    // membership that lapsed.
    let posted = 0;
    await page.route('**/api/automation/rules', (route) => {
      if (route.request().method() === 'POST') posted += 1;
      return route.continue();
    });

    await openForm(page);
    await page.getByLabel(/^Rule name/).fill(uniqueName());
    await page.getByLabel(/^Message/).fill('Hi {{name}}');
    await page.getByLabel(/^Delay/).fill('100080');
    await save(page).click();

    await page.waitForTimeout(1200);
    expect(posted).toBe(0);
  });

  test('an empty delay is not zero-by-accident', async ({ page }) => {
    // Zero is a real answer here — send immediately — which is exactly why an
    // EMPTY box must not silently become it.
    await openForm(page);
    await page.getByLabel(/^Rule name/).fill(uniqueName());
    await page.getByLabel(/^Message/).fill('Hi {{name}}');
    await page.getByLabel(/^Delay/).fill('');
    await save(page).click();
    await expect(page.getByLabel(/^Rule name/)).toBeVisible();
  });

  test('a double-tap creates one rule, not two', async ({ page }) => {
    const name = uniqueName();
    await openForm(page);
    await page.getByLabel(/^Rule name/).fill(name);
    await page.getByLabel(/^Message/).fill('Hi {{name}}');
    await page.getByLabel(/^Delay/).fill('5');
    await doubleTap(save(page));

    await page.waitForTimeout(3000);
    const found = await byName(token, name);
    for (const r of found) created.push(r.id);
    expect(found.length, 'exactly one rule').toBe(1);
  });

  test('a server failure is reported, leaks nothing, and persists nothing', async ({ page }) => {
    const name = uniqueName();
    await page.route('**/api/automation/rules', (route) =>
      route.request().method() === 'POST'
        ? route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: '{"error":"ERROR: insert or update violates foreign key at /srv/api/src/routes/campaigns.js:44"}',
          })
        : route.continue());

    await openForm(page);
    await page.getByLabel(/^Rule name/).fill(name);
    await page.getByLabel(/^Message/).fill('Hi {{name}}');
    await page.getByLabel(/^Delay/).fill('0');
    await save(page).click();

    await expect(page.getByRole('alert').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('body')).not.toContainText('foreign key');
    await expect(page.locator('body')).not.toContainText('/srv/api/src');

    await page.unroute('**/api/automation/rules');
    expect((await byName(token, name)).length).toBe(0);
  });

  test('editing one rule then another does not carry the first one over', async ({ page }) => {
    // §7 Edit A → Edit B. `resetTo` rebuilds the form from the record AND
    // clears errors, so a red message from rule A cannot survive onto rule B.
    const first = uniqueName();
    const second = uniqueName();

    for (const [name, template] of [[first, 'Hi {{name}} — FIRST'], [second, 'Hi {{name}} — SECOND']]) {
      await openForm(page);
      await page.getByLabel(/^Rule name/).fill(name);
      await page.getByLabel(/^Message/).fill(template);
      await page.getByLabel(/^Delay/).fill('0');
      await save(page).click();
      await expect.poll(async () => (await byName(token, name)).length, { timeout: 15_000 }).toBe(1);
      created.push((await byName(token, name))[0].id);
    }

    await page.reload();
    await page.getByRole('button', { name: `Edit ${first}` }).click();
    await expect(page.getByLabel(/^Message/)).toHaveValue('Hi {{name}} — FIRST');

    await page.getByRole('button', { name: 'Cancel' }).click();
    await page.getByRole('button', { name: `Edit ${second}` }).click();
    await expect(page.getByLabel(/^Message/)).toHaveValue('Hi {{name}} — SECOND');
    await expect(page.getByLabel(/^Rule name/)).toHaveValue(second);
  });
  test('creating a rule then starting another shows an empty form', async ({ page }) => {
    // §7 Success → New entity. Cancel has always reset this form; SUCCESS did
    // not — so the owner who saved a rule and clicked New Rule was handed the
    // rule they had just created, and the obvious next move (change a word,
    // save) produced a near-duplicate that fires alongside the first.
    const name = uniqueName();
    await openForm(page);
    await page.getByLabel(/^Rule name/).fill(name);
    await page.getByLabel(/^Trigger/).selectOption('payment_received');
    await page.getByLabel(/^Message/).fill('Thanks {{name}} for ₹{{amount}}');
    await page.getByLabel(/^Delay/).fill('30');
    await save(page).click();

    await expect.poll(async () => (await byName(token, name)).length, { timeout: 15_000 }).toBe(1);
    created.push((await byName(token, name))[0].id);

    await openForm(page);
    await expect(page.getByLabel(/^Rule name/)).toHaveValue('');
    await expect(page.getByLabel(/^Message/)).toHaveValue('');
    await expect(page.getByLabel(/^Delay/)).toHaveValue('0');
  });
});
