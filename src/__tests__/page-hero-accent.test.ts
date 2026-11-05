// Four pages get their own two-stop hero colour without touching the other 79
// that render PageHero. These pins hold the contract: the house rose is still
// the default, every accent is a two-stop gradient whose dark stop carries
// white text, and only the four intended pages opt in.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { appPath, srcPath } from '@/__tests__/helpers/app-routes';
import { stripComments } from '@/__tests__/helpers/strip-comments';
import { PAGE_ACCENTS, pageGradient } from '@/components/ui/pageAccents';

const hero = stripComments(readFileSync(srcPath('components', 'ui', 'PageHero.tsx'), 'utf8'));

/** The house gradient the dashboard and the client profile also wear. */
const HOUSE = 'linear-gradient(128deg, #6B2440 0%, #A33757 46%, #852E4E 100%)';

const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrastOnWhite = (hex: string) => 1.05 / (lum(hex) + 0.05);

describe('page hero accents', () => {
  it('keeps the house rose as the default hero', () => {
    expect(hero).toContain(HOUSE);
    expect(hero).toContain("accent !== 'brand'");
  });

  it('paints from the accent map, not from a string on each page', () => {
    expect(hero).toContain('pageGradient(accent)');
    expect(hero).toContain('PAGE_ACCENTS[accent].shadow');
  });

  it('gives every accent two stops and a shadow', () => {
    expect(Object.keys(PAGE_ACCENTS).sort()).toEqual(['amber', 'brand', 'indigo', 'red', 'teal']);
    for (const a of Object.values(PAGE_ACCENTS)) {
      expect(a.from).toMatch(/^#[0-9A-F]{6}$/i);
      expect(a.to).toMatch(/^#[0-9A-F]{6}$/i);
      expect(a.shadow).toMatch(/^rgba\(/);
    }
    expect(pageGradient('amber')).toBe('linear-gradient(135deg, #B45309, #92400E)');
  });

  it('keeps white text at 4:1 or better on every accent', () => {
    for (const [name, a] of Object.entries(PAGE_ACCENTS)) {
      expect({ name, contrast: contrastOnWhite(a.to) >= 4 }).toEqual({ name, contrast: true });
    }
  });

  it('delivers a different colour on each of the four pages', () => {
    const read = (...segments: string[]) => readFileSync(appPath(...segments), 'utf8');
    expect(read('pt-os', 'workout-log', 'page.tsx')).toContain('accent="indigo"');
    expect(read('pt-os', 'leads', 'page.tsx')).toContain('accent="amber"');
    expect(read('pt-os', 'clients', 'at-risk', 'page.tsx')).toContain('accent="red"');
    expect(read('member', 'form-check', 'page.tsx')).toContain('accent="progress"');
  });
});
