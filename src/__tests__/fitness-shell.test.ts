import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { srcPath } from '@/__tests__/helpers/app-routes';

it('the fitness page keeps the standard header and stepper', () => {
  const page = readFileSync(srcPath('app', 'pt-os', 'assessment', 'page.tsx'), 'utf8');
  expect(page).toMatch(/<PageHero[\s\S]{0,160}title="Fitness Testing"/);
  expect(page).not.toMatch(/<PageHero[\s\S]{0,160}compact/);
  expect(page).not.toContain('variant="path"');
  expect(page).not.toContain('chapterAccents');
  expect(page).toMatch(/<StepperTimeline[\s\S]{0,160}onStep=\{goToStep\}/);
});
