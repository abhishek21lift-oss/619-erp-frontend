import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { srcPath } from '@/__tests__/helpers/app-routes';

// Seeded with the two files Task 5 converts; Tasks 6 and 7 extend it.
const FILES = ['StepAnthropometric', 'StepBodyComposition', 'StepStrength', 'StepEndurance', 'StepFlexibility'];

it.each(FILES)('%s uses the fitness card shell, not its own header', (name) => {
  const src = readFileSync(srcPath('components', 'pt-os', 'fitness-testing', `${name}.tsx`), 'utf8');
  expect(src).toContain('StepCard');
  expect(src).not.toContain('StepHeader');
});
