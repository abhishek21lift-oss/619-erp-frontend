// The PT-OS "pick a client first" screen, and why there is only one of it.
//
// There were four copies — informed-consent, goals, posture-assessment and
// strength-tracking — each fetching the same clients through the same call.
// Informed Consent got redesigned; the other three did not, and nobody noticed
// for as long as it takes to open two of them side by side. That is the whole
// failure mode of a copied screen: it does not break, it just quietly stops
// matching, and only a user flipping between two tools ever sees it.
//
// So these tests pin the shape of the fix rather than the pixels: one
// component, every caller going through it, and nobody re-declaring a local
// one because it was faster than importing.
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const PT_OS = join(process.cwd(), 'src/app/pt-os');
const SHARED = 'src/components/pt-os/shared/ClientPicker.tsx';

/** Every pt-os page.tsx that imports the shared picker. */
function callers(): string[] {
  return readdirSync(PT_OS, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => join(PT_OS, d.name, 'page.tsx'))
    .filter((p) => existsSync(p))
    .filter((p) => readFileSync(p, 'utf8').includes("from '@/components/pt-os/shared/ClientPicker'"));
}

describe('the shared PT-OS client picker', () => {
  it('exists', () => {
    expect(existsSync(join(process.cwd(), SHARED))).toBe(true);
  });

  it('is used by more than one page, or it did not need extracting', () => {
    expect(callers().length).toBeGreaterThan(1);
  });

  it('no page declares a ClientPicker of its own', () => {
    // This is the assertion that matters. Importing the shared one and then
    // shadowing it locally type-checks and lints clean, and puts the drift
    // straight back.
    const offenders = callers().filter((p) =>
      /function\s+ClientPicker\b/.test(readFileSync(p, 'utf8')),
    );
    expect(offenders.map((p) => p.replace(process.cwd() + '/', ''))).toEqual([]);
  });

  it('no pt-os page anywhere still carries a copy of its own', () => {
    // This screen had been copied eleven times across pt-os. Eight of those
    // were tracked here as a shrinking list while they were converted one
    // batch at a time; the list is now empty, so the assertion is simply that
    // it stays that way. A twelfth copy fails here rather than shipping and
    // drifting quietly for a release or two.
    const stillLocal = readdirSync(PT_OS, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .filter((name) => {
        const p = join(PT_OS, name, 'page.tsx');
        return existsSync(p) && /function\s+ClientPicker\b/.test(readFileSync(p, 'utf8'));
      });

    expect(stillLocal).toEqual([]);
  });

  it('covers every pt-os tool that opens on a client choice', () => {
    // A floor, so converting a page by deleting its picker and forgetting to
    // render the shared one — which type-checks fine, the page just renders
    // nothing — does not pass silently.
    expect(callers().length).toBe(13);
  });

  it('every basePath it is given is a route that exists', () => {
    // basePath is a string prop, so a typo here is invisible until someone
    // taps a client and lands on a 404 — with their selection lost.
    const bad: string[] = [];
    for (const p of callers()) {
      for (const [, base] of readFileSync(p, 'utf8').matchAll(/basePath="([^"]+)"/g)) {
        if (!existsSync(join(process.cwd(), 'src/app', base, 'page.tsx'))) bad.push(base);
      }
    }
    expect(bad).toEqual([]);
  });

  it('sends the picker back to the page it is rendered on', () => {
    // A picker on /pt-os/goals that pushes to /pt-os/parq is a worse bug than
    // a broken link: it silently starts the wrong assessment.
    const mismatched: string[] = [];
    for (const p of callers()) {
      const dir = '/pt-os/' + p.split('/').slice(-2)[0];
      for (const [, base] of readFileSync(p, 'utf8').matchAll(/basePath="([^"]+)"/g)) {
        if (base !== dir) mismatched.push(`${dir} → ${base}`);
      }
    }
    expect(mismatched).toEqual([]);
  });

  it('only Workout Log and Progress Report override where picking a client goes', () => {
    // hrefFor exists for two pages: a client's log lives at
    // /pt-os/clients/[id]/workout-log and a client's training analytics
    // (Progress Report) lives at /pt-os/clients/[id]/training/analytics —
    // both path segments the default `?client_id=` target cannot express.
    //
    // Pinned because hrefFor silently wins over basePath, which means the
    // assertion above — that a picker returns to its own page — stops being
    // true for any page that adds one. A new override should be a decision
    // someone makes on purpose, not a thing that appears in a diff.
    const overriding = callers()
      .filter((p) => readFileSync(p, 'utf8').includes('hrefFor='))
      .map((p) => p.split('/').slice(-2)[0])
      .sort();
    expect(overriding).toEqual(['progress-report', 'workout-log']);
  });

  it('the hero takes its blue from lib/brand, not a hardcoded hex', () => {
    // The banner was amber. It is now the blue sampled out of the logo, and
    // the values live in lib/brand with their provenance — because "the brand
    // blue" written as a literal in each file is exactly how one screen ends
    // up a shade off and nobody can say which is correct.
    const src = readFileSync(join(process.cwd(), SHARED), 'utf8');
    expect(src).toContain("from '@/lib/brand'");
    // The two gradients the hero used, matched exactly rather than by hex:
    // #f59e0b is also one of six client-avatar colours in this same file, and
    // amber remains correct for warning states elsewhere. A bare hex search
    // flags both and teaches people to ignore this test.
    expect(src).not.toContain('linear-gradient(135deg, #F59E0B, #D97706)');
    expect(src).not.toContain('#fffbeb');
    // Nor the blue inlined instead of imported.
    expect(src).not.toMatch(/#0067E0|#0059CE/);
    // The hero is a filled blue block, not a pale wash. The wash was the first
    // attempt at "brand blue" and the reference is a solid banner with white
    // text — this stops it quietly reverting to the lighter reading.
    expect(src).toContain('BRAND_HERO_GRADIENT');
    expect(src).not.toContain('BRAND_TINT_GRADIENT');
  });

  it('the consent record hero matches the picker it is reached through', () => {
    // Both heroes are the same banner by intent. They drifted apart the moment
    // one of them owned its own copy of the colour.
    const rec = readFileSync(
      join(process.cwd(), 'src/components/pt-os/informed-consent/ConsentSummary.tsx'), 'utf8');
    expect(rec).toContain("from '@/lib/brand'");
    expect(rec).not.toContain('linear-gradient(135deg, #F59E0B, #D97706)');
    expect(rec).not.toContain('#fffbeb');
    expect(rec).not.toContain('#B45309');
  });

  it('the workout log override points at a route that exists', () => {
    const src = readFileSync(join(PT_OS, 'workout-log/page.tsx'), 'utf8');
    expect(src).toMatch(/hrefFor=\{\(id\) => `\/pt-os\/clients\/\$\{id\}\/workout-log`\}/);
    expect(existsSync(join(process.cwd(), 'src/app/pt-os/clients/[id]/workout-log/page.tsx'))).toBe(true);
  });

  it('the progress report override points at a route that exists', () => {
    // "Progress Report" used to be the sidebar label on /pt-os/reports — PT
    // revenue and trainer commissions, not a client's own progress. That page
    // moved to Insights (see nav-config.ts) and this route now opens what the
    // label actually promises: the client's training analytics.
    const src = readFileSync(join(PT_OS, 'progress-report/page.tsx'), 'utf8');
    expect(src).toMatch(/hrefFor=\{\(id\) => `\/pt-os\/clients\/\$\{id\}\/training\/analytics`\}/);
    expect(existsSync(join(process.cwd(), 'src/app/pt-os/clients/[id]/training/analytics/page.tsx'))).toBe(true);
  });
});
