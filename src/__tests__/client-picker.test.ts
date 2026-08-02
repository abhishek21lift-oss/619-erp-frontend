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

  it('the list of pages still carrying their own copy only ever shrinks', () => {
    // Extracting the shared component found that this screen had been copied
    // eleven times across pt-os, not four. Three were redesigned on request;
    // the rest are listed here so the debt is a known number rather than a
    // discovery, and so a twelfth copy fails this test instead of shipping.
    //
    // Converting one of these means deleting its name from this list. Adding
    // a name to it should not happen — use the shared component.
    const stillLocal = readdirSync(PT_OS, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .filter((name) => {
        const p = join(PT_OS, name, 'page.tsx');
        return existsSync(p) && /function\s+ClientPicker\b/.test(readFileSync(p, 'utf8'));
      })
      .sort();

    expect(stillLocal).toEqual([
      // Old chip layout — visibly different from the redesigned pages.
      'progress-photos',
      'progress-tracking-setup',
      'workout-log',
      // Already drifted toward the avatar-row layout independently, so these
      // look close but are still separate code.
      'assessment',
      'lifestyle-assessment',
      'mobility-assessment',
      'nutrition-assessment',
      'parq',
    ].sort());
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
});
