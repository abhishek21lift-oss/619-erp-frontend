import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { srcPath } from '@/__tests__/helpers/app-routes';

it('the fitness page uses the compact header and path rail', () => {
  const page = readFileSync(srcPath('app', 'pt-os', 'assessment', 'page.tsx'), 'utf8');
  expect(page).toMatch(/<PageHero[\s\S]{0,160}compact/);
  expect(page).toContain('variant="path"');
  expect(page).toContain('accents={chapterAccents}');
});
