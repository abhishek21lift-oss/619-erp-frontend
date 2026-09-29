// One question, one home. Water intake and food preference are asked in the
// Nutrition assessment, and motivation on the Goal. Lifestyle used to ask all
// three as well, so a client had two answers to each — and the two could
// disagree (a "drinks enough water" of 3 L here beside 1 L there). Lifestyle's
// hydration and nutrition scores now read the latest Nutrition answers: the
// API on save, this page for its live preview.
//
// Pinned as a source-text check, as parq-intake-flow.test.ts pins its own
// wizard's structure; mounting the whole wizard (draft autosave, client
// picker, API calls) is out of proportion to what is being guarded.
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { STEPS, stepLabel } from '@/components/pt-os/lifestyle-assessment/types';

const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const read = (rel: string) => stripComments(fs.readFileSync(path.join(process.cwd(), 'src', rel), 'utf8'));
const page = read('app/(chrome)/pt-os/lifestyle-assessment/page.tsx');

describe('the lifestyle wizard asks each question once', () => {
  it('has no water, food-preference or motivation question of its own', () => {
    expect(STEPS.map((s) => s.key)).toEqual(['sleep', 'stress', 'occupationActivity', 'smokingAlcohol', 'additionalFactors']);
    expect(page).not.toMatch(/<StepWater|<StepFoodPreference/);
    expect(read('components/pt-os/lifestyle-assessment/StepAdditionalFactors.tsx')).not.toMatch(/motivationToExercise/);
  });

  it('does not send the answers other assessments own, so an older record keeps them', () => {
    const submit = page.slice(page.indexOf('const handleSubmit'), page.indexOf('if (assessmentId)'));
    for (const key of ['water_intake_liters', 'food_preferences', 'motivation_to_exercise', 'meal_frequency']) {
      expect(submit).not.toContain(key);
    }
  });

  it('scores water and meals from the latest Nutrition assessment', () => {
    expect(page).toMatch(/api\.progress\.nutritionAssessments\.list/);
    expect(page).toMatch(/waterIntakeLiters=\{n\(withNutrition\(form, nutritionHabits\)\.waterIntakeLiters\)\}/);
  });
});

describe('the step counter matches the steps', () => {
  it('numbers from the list, not a number typed into each step', () => {
    // Every heading said "of 9" on a 7-step wizard, and three said the wrong step.
    expect(stepLabel('sleep')).toBe('Step 1 of 5');
    expect(stepLabel('additionalFactors')).toBe('Step 5 of 5');
    const dir = path.join(process.cwd(), 'src/components/pt-os/lifestyle-assessment');
    for (const f of fs.readdirSync(dir).filter((n) => n.startsWith('Step'))) {
      expect(fs.readFileSync(path.join(dir, f), 'utf8')).not.toMatch(/Step \d+ of \d+/);
    }
  });

  it('moves to review on the last step and guards timeline clicks through handleNext', () => {
    expect(page).toMatch(/if \(step === STEPS\.length\) \{ setReviewMode\(true\)/);
    expect(page).toMatch(/onStep=\{handleStepClick\}/);
    const fn = page.slice(page.indexOf('const handleStepClick = '), page.indexOf('const handleBack = '));
    expect(fn).toMatch(/if \(id === step \+ 1\) \{ handleNext\(\); return; \}/);
  });
});
