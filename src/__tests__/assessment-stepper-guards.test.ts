// The timeline must not be a way around a step's validation.
//
// Each wizard's Next button validates, but the clickable timeline used to call
// setStep directly — so clicking the next node skipped the check and a form
// could reach Review with an unscored mobility region, an unconfirmed posture
// screen, or an unanswered supplement question. The one forward jump the
// timeline offers is exactly step + 1, so it now goes through handleNext().
//
// Pinned as a source check, as lifestyle-assessment-steps.test.ts pins its own
// wizard; mounting these pages drags in draft autosave, the client picker and
// the API for what is a two-line contract.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { srcPath } from '@/__tests__/helpers/app-routes';

const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const page = (route: string) => stripComments(readFileSync(srcPath('app', 'pt-os', route, 'page.tsx'), 'utf8'));

const PAGES = [
  ['mobility-assessment', 'mobility'],
  ['posture-assessment', 'posture'],
  ['nutrition-assessment', 'nutrition'],
] as const;

describe.each(PAGES)('%s timeline guards forward navigation', (route) => {
  const src = page(route);

  it('routes timeline clicks through handleStepClick', () => {
    expect(src).toMatch(/onStep=\{handleStepClick\}/);
    expect(src).not.toMatch(/onStep=\{setStep\}/);
  });

  it('sends the one forward jump through handleNext()', () => {
    const fn = src.slice(src.indexOf('const handleStepClick = '), src.indexOf('const handleBack = '));
    expect(fn).toMatch(/if \(id === step \+ 1\) \{ handleNext\(\); return; \}/);
  });

  it('validates every step before submitting', () => {
    const submit = src.slice(src.indexOf('const handleSubmit = '));
    expect(submit).toMatch(/for \(const s of STEPS\)/);
    expect(submit).toMatch(/const firstInvalid = STEPS\.find/);
  });
});
