// Swallowed failures, counted — so the number can only go down.
//
// ── The shape ──────────────────────────────────────────────────────────────
//
// `.catch(() => {})`, `.catch(() => [])`, `.catch(() => null)`. Each one turns
// a failed request into a value the UI renders as fact. Most are harmless —
// `markUsed().catch(() => {})` is fire-and-forget telemetry and nobody reads
// the result — and a blanket ban would be noise. The dangerous ones are where
// the fallback FEEDS A DISPLAYED NUMBER, because then a failure and a quiet
// day are the same pixels.
//
// Two were exactly that when this was written, both on money screens:
//
//   sales/today                 the outer catch set rows to [] and the hero
//                               rendered "Total Revenue Today ₹0" at 56px.
//   finance/collected-payments  the same catch, over the whole ledger, under a
//                               KPI row whose comment explains at length why
//                               the figures are trustworthy.
//
// A studio owner reading ₹0 acts on it — chases staff, checks the card machine
// — and the number was never a reading at all. Both now distinguish "failed"
// from "empty" and say so. finance/dues already did, which is what the shape
// looks like when it is right.
//
// ── Why a ratchet rather than a ban ────────────────────────────────────────
//
// The same device the backend uses for SQL-in-adapters: the debt is listed,
// the list may shrink, and a new entry has to be added by hand — which is the
// moment somebody asks whether this one renders as data. A count alone would
// let a fixed site pay for a new one, so the LIST is pinned, not the number.

import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC = join(process.cwd(), 'src');

/** `.catch(() => <empty>)` — a rejection turned into a renderable value. */
const SILENT_CATCH =
  /\.catch\(\s*\(\s*\)\s*=>\s*(\{\s*\}|\[\s*\]|null|undefined|0|''|"")\s*\)/;

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name !== '__tests__') walk(p, out);
    } else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

function sites(): string[] {
  const found: string[] = [];
  for (const file of walk(SRC)) {
    readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
      // Comments that DESCRIBE the pattern are not instances of it. Several
      // exist deliberately, explaining why a previous one was removed.
      const code = line.trim();
      if (code.startsWith('//') || code.startsWith('*')) return;
      if (SILENT_CATCH.test(line)) {
        found.push(`${relative(SRC, file).replace(/\\/g, '/')}:${i + 1}`);
      }
    });
  }
  return found.sort();
}

/**
 * Every silent catch in the tree, as `path:line`.
 *
 * Line numbers move when a file is edited above the site, so a churned entry
 * is expected and is fixed by updating the line — the point is that adding a
 * NEW file/line pair takes a deliberate edit here.
 *
 * When a wide change shifts many of them at once — adding one import line to
 * eighty-nine files did exactly that — regenerate the numbers, but check the
 * FILE SET and the per-file COUNT first. Those are what the list is actually
 * pinning; if both are unchanged, every difference is a line number and the
 * regeneration is safe. If either moved, a catch was added or removed and it
 * wants reading, not renumbering.
 */
const KNOWN = [
  'app/(bare)/start-free/page.tsx:66',
  'app/(chrome)/ai-coach/knowledge/page.tsx:75',
  'app/(chrome)/ai/progress-analysis/page.tsx:61',
  'app/(chrome)/checkin/qr-scanner/page.tsx:384',
  'app/(chrome)/checkin/qr-scanner/page.tsx:398',
  'app/(chrome)/engagement/notifications/page.tsx:41',
  // The three /stats catches are the reasoned ones: when the SQL aggregate is
  // unavailable the page falls back to summing the rows it has, which is
  // correct under the endpoint's own row cap and is documented at each site.
  // They are the fallback, not the failure — the OUTER catch is what used to
  // render a failure as zero, and that is gone from all three.
  'app/(chrome)/finance/collected-payments/page.tsx:85',
  'app/(chrome)/finance/dues/page.tsx:95',
  'app/(chrome)/pay/[orderId]/page.tsx:195',
  'app/(chrome)/pt-os/clients/[id]/page.tsx:367',
  'app/(chrome)/pt-os/clients/[id]/workout-log/page.tsx:80',
  'app/(chrome)/pt-os/diet-plans/page.tsx:197',
  'app/(chrome)/pt-os/diet-plans/page.tsx:198',
  'app/(chrome)/pt-os/diet-plans/page.tsx:199',
  'app/(chrome)/pt-os/exercise-library/[id]/edit/page.tsx:27',
  'app/(chrome)/pt-os/exercise-library/new/page.tsx:28',
  'app/(chrome)/pt-os/workout-plans/[id]/page.tsx:48',
  'app/(chrome)/sales/today/page.tsx:73',
  'app/(chrome)/settings/integrations/page.tsx:429',
  'app/(chrome)/settings/page.tsx:237',
  'app/(chrome)/settings/page.tsx:437',
  'app/(chrome)/settings/page.tsx:633',
  'app/(chrome)/settings/page.tsx:876',
  'app/(chrome)/settings/profile/page.tsx:1726',
  'app/(chrome)/settings/profile/page.tsx:2002',
  'app/(chrome)/settings/profile/page.tsx:902',
  'app/(chrome)/settings/profile/page.tsx:903',
  'app/(platform)/platform/_shared/CommandBar.tsx:84',
  'app/(platform)/platform/_shared/CommandBar.tsx:85',
  'app/(platform)/platform/_tabs/ActivityTab.tsx:47',
  'app/(platform)/platform/_tabs/CouponsTab.tsx:64',
  'app/(platform)/platform/_tabs/FinanceTab.tsx:343',
  'app/(platform)/platform/_tabs/FinanceTab.tsx:99',
  'app/(platform)/platform/_tabs/StudiosTab.tsx:383',
  'components/LandingPage.tsx:58',
  'components/LandingPage.tsx:65',
  'components/TrialBanner.tsx:19',
  'components/fitness/AiCoachPanel.tsx:127',
  'components/fitness/AiCoachPanel.tsx:133',
  'components/pt-os/analytics/LandmarkEditor.tsx:82',
  'components/pt-os/builder/NewProgrammeDialog.tsx:205',
  'components/pt-os/builder/NewProgrammeDialog.tsx:208',
  'components/pt-os/workout-log/ExercisePicker.tsx:274',
  'components/pt-os/workout-log/ExercisePicker.tsx:288',
  'lib/auth-context.tsx:166',
  'lib/auth-context.tsx:168',
].sort();

describe('silent catches are listed, and the list only shrinks', () => {
  it('finds the pattern at all, so this cannot pass vacuously', () => {
    expect(sites().length).toBeGreaterThan(20);
  });

  it('has no silent catch that is not on the list', () => {
    const added = sites().filter((s) => !KNOWN.includes(s));
    expect(added).toEqual([]);
  });

  it('has no list entry that is no longer a silent catch', () => {
    // A stale entry is a slot a new one can occupy without anybody noticing.
    const current = new Set(sites());
    expect(KNOWN.filter((k) => !current.has(k))).toEqual([]);
  });
});

describe('the two money screens tell a failure from an empty day', () => {
  const read = (...p: string[]) => readFileSync(join(SRC, ...p), 'utf8');

  it.each([
    ['app/(chrome)/sales/today/page.tsx', "Total Revenue Today"],
    ['app/(chrome)/finance/collected-payments/page.tsx', 'Collected payments could not be loaded'],
  ])('%s records the failure instead of rendering zero', (file) => {
    const src = read(...file.split('/'));
    // The catch must set an error, not only clear the rows.
    expect(src).toMatch(/setLoadError\(/);
    expect(src).toMatch(/role="alert"/);
    // And it must not silently swallow: a bare `catch {` with only a reset.
    expect(src).not.toMatch(/\}\s*catch\s*\{\s*set\w+\(\[\]\);\s*\}/);
  });

  it('finance/dues already did this, and still does', () => {
    // The shape when it is right, kept under test so it does not regress into
    // the shape the other two had.
    expect(read('app', '(chrome)', 'finance', 'dues', 'page.tsx')).toMatch(/setError\(e\.message\)/);
  });
});
