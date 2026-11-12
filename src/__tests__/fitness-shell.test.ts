import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { srcPath } from '@/__tests__/helpers/app-routes';

it('the fitness page uses the full shared header, like the goal wizard, and keeps the stepper', () => {
  const page = readFileSync(srcPath('app', 'pt-os', 'assessment', 'page.tsx'), 'utf8');
  // The compact header was the odd one out: every wizard (Goals, PAR-Q,
  // consent) opens on the dark house hero with the stepper on the slab.
  expect(page).not.toMatch(/<PageHero[\s\S]{0,60}\bcompact\b/);
  expect(page).not.toContain('Seven-step fitness assessment');
  expect(page).toMatch(/<PageHero[\s\S]{0,200}title="Fitness Testing"/);
  expect(page).not.toContain('variant="path"');
  expect(page).not.toContain('chapterAccents');
  expect(page).toMatch(/<StepperTimeline[\s\S]{0,160}onStep=\{goToStep\}/);
});
