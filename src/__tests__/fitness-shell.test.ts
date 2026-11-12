import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { srcPath } from '@/__tests__/helpers/app-routes';

it('the fitness page uses the compact shared header and keeps the stepper', () => {
  const page = readFileSync(srcPath('app', 'pt-os', 'assessment', 'page.tsx'), 'utf8');
  expect(page).toMatch(/<PageHero[\s\S]{0,160}compact/);
  expect(page).toMatch(/<PageHero[\s\S]{0,200}title="Fitness Testing"/);
  expect(page).not.toContain('variant="path"');
  expect(page).not.toContain('chapterAccents');
  expect(page).toMatch(/<StepperTimeline[\s\S]{0,160}onStep=\{goToStep\}/);
});
