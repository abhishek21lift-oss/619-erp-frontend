// Deep-audit finding: StepWater and StepFoodPreference were fully built
// (props, validation hooks, hydration/food-preference scoring already wired
// downstream) but were missing from the wizard's STEPS list, so a NEW
// assessment had no way to record water intake or food preference at all.
// The hydration score shown on every client's dashboard, and the
// "drink 3L water" habit suggestion, both silently depended on a field
// nothing could set, and one call site even hardcoded the water value to
// `null`. Restored — pinned here as a source-text check, matching how
// parq-intake-flow.test.ts pins its own wizard's structural invariants,
// since mounting the full multi-step wizard (draft autosave, client
// picker, API calls) is out of proportion to what regressed.
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { STEPS } from '@/components/pt-os/lifestyle-assessment/types';

const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const page = stripComments(fs.readFileSync(
  path.join(process.cwd(), 'src/app/(chrome)/pt-os/lifestyle-assessment/page.tsx'),
  'utf8',
));

describe('the lifestyle assessment wizard collects water intake and food preference', () => {
  it('both steps are in the visible step list', () => {
    expect(STEPS.some((s) => s.key === 'water')).toBe(true);
    expect(STEPS.some((s) => s.key === 'foodPreference')).toBe(true);
  });

  it('both step components are imported and rendered by id', () => {
    expect(page).toMatch(/import StepWater from/);
    expect(page).toMatch(/import StepFoodPreference,/);
    expect(page).toMatch(/<StepWater form=\{form\} set=\{set\} \/>/);
    expect(page).toMatch(/<StepFoodPreference form=\{form\} set=\{set\} error=\{errors\.foodPreference\} \/>/);
  });

  it('the habit-goals panel reads the real water value, not a hardcoded null', () => {
    expect(page).not.toMatch(/waterIntakeLiters=\{null\}/);
    expect(page).toMatch(/waterIntakeLiters=\{n\(form\.waterIntakeLiters\)\}/);
  });

  it('the last-step / review-mode transition derives from STEPS.length, not a stale hardcoded 5', () => {
    // Step 5 is a legitimate render branch now (Food Preference) — what
    // must be gone is treating 5 as the LAST step, now that there are 7.
    expect(page).not.toMatch(/step === 5 \? 'Review' : 'Next'/);
    expect(page).not.toMatch(/if \(step === 5\) \{ setReviewMode\(true\)/);
    expect(page).toMatch(/step === STEPS\.length \? 'Review' : 'Next'/);
    expect(page).toMatch(/if \(step === STEPS\.length\) \{ setReviewMode\(true\)/);
  });

  it('the timeline click handler is guarded through handleNext, not a bare setStep', () => {
    expect(page).toMatch(/onStep=\{handleStepClick\}/);
    const fn = page.slice(page.indexOf('const handleStepClick = '), page.indexOf('const handleBack = '));
    expect(fn).toMatch(/if \(id === step \+ 1\) \{ handleNext\(\); return; \}/);
  });
});
