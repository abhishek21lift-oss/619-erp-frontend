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
  'app/(bare)/start-free/page.tsx:67',
  'app/(chrome)/ai-coach/knowledge/page.tsx:75',
  'app/(chrome)/engagement/notifications/page.tsx:45',
  // The three /stats catches are the reasoned ones: when the SQL aggregate is
  // unavailable the page falls back to summing the rows it has, which is
  // correct under the endpoint's own row cap and is documented at each site.
  // They are the fallback, not the failure — the OUTER catch is what used to
  // render a failure as zero, and that is gone from all three.
  'app/(chrome)/finance/collected-payments/page.tsx:113',
  'app/(chrome)/finance/dues/page.tsx:95',
  'components/payments/UpiPayScreen.tsx:210',
  // Line moved 587 -> 592 -> 597 -> 584 -> 572: the Check-in QR print popup
  // above gained five lines of escaping plus two imports, the premium hero pass
  // added a colour note and a card-shadow comment above it, the unused hero stat
  // helper was removed, and the client-profile dedup removed the unused photo
  // state above it. The entry itself is unchanged — still one silent catch,
  // still the same statement.
  'app/(chrome)/pt-os/clients/[id]/page.tsx:604',
  'app/(chrome)/pt-os/clients/[id]/workout-log/page.tsx:83',
  'app/(chrome)/pt-os/diet-plans/page.tsx:187',
  'app/(chrome)/pt-os/diet-plans/page.tsx:188',
  'app/(chrome)/pt-os/diet-plans/page.tsx:189',
  'app/(chrome)/pt-os/exercise-library/[id]/edit/page.tsx:28',
  'app/(chrome)/pt-os/exercise-library/new/page.tsx:56',
  // The goal wizard reads the Client Interview and the Module 5 re-test
  // schedule as optional context. Neither is a number the trainer acts on:
  // the step shows "Not recorded"/"No re-test scheduled" and the goal can
  // still be set without them. Both reads are allowed to fail on their own
  // so a missing module cannot block the goal. Only the re-test fallback is
  // the bare `null` shape this ratchet pins; the interview fallback is an
  // object literal and does not match.
  'app/(chrome)/pt-os/goals/page.tsx:279',
  'app/(chrome)/pt-os/workout-plans/[id]/page.tsx:51',
  // 442 -> 436: the side-tab stripe removal deleted the six-line category
  // colour table above this site. File set and per-file count unchanged.
  'app/(chrome)/settings/integrations/page.tsx:436',
  // Two remain on the Security page (the session count on each panel); the
  // other two went with the account-management UI.
  // 1864 -> 1859 -> 1856 and 2156 -> 2151 -> 2148: a UI-copy pass removed
  // five lines above each site, then the side-tab stripe removal deleted a
  // three-line comment-plus-property above them. File set and per-file count
  // unchanged — line numbers only.
  'app/(chrome)/settings/profile/page.tsx:1856',
  'app/(chrome)/settings/profile/page.tsx:2148',
  'app/(chrome)/settings/profile/page.tsx:947',
  'app/(chrome)/settings/profile/page.tsx:948',
  'app/(platform)/platform/_shared/CommandBar.tsx:103',
  'app/(platform)/platform/_shared/CommandBar.tsx:104',
  'app/(platform)/platform/_tabs/ActivityTab.tsx:47',
  'app/(platform)/platform/_tabs/CouponsTab.tsx:64',
  'app/(platform)/platform/_tabs/FinanceTab.tsx:344',
  'app/(platform)/platform/_tabs/FinanceTab.tsx:100',
  'app/(platform)/platform/_tabs/StudiosTab.tsx:375',
  'components/LandingPage.tsx:60',
  'components/LandingPage.tsx:67',
  'components/TrialBanner.tsx:19',
  // 130/136 -> 151/157 -> 184/190 -> 188/194: the day prefill, the
  // record-backed form and then the generation's client id added helpers
  // above them. Same two statements, same file and count.
  'components/fitness/AiCoachPanel.tsx:197',
  'components/fitness/AiCoachPanel.tsx:203',
  // The hosting console reads the operation allow-list beside the reads that
  // carry the page: `hostingerCatalogue()` is a local lookup on the server, and
  // if it fails the screen keeps its compiled-in safety labels and the spec line
  // says it fell back to "the API revision this console was built against".
  // A general outage still surfaces — `hostingerStatus()`/`hostingerVps()` in
  // the same Promise.all rejects into the screen's error state and retry.
  'components/platform/hosting-centre.tsx:681',
  'components/platform/hosting-vps.tsx:75',
  'components/pt-os/builder/NewProgrammeForm.tsx:135',
  'components/pt-os/builder/NewProgrammeForm.tsx:138',
  'components/pt-os/analytics/LandmarkEditor.tsx:82',
  'components/pt-os/workout-log/ExercisePicker.tsx:283',
  'components/pt-os/workout-log/ExercisePicker.tsx:297',
  'lib/auth-context.tsx:214',
  'lib/auth-context.tsx:216',
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

// sales/today is now a redirect into Collected Payments' Today period.
describe('the money screens tell a failure from an empty day', () => {
  const read = (...p: string[]) => readFileSync(join(SRC, ...p), 'utf8');

  it.each([
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
