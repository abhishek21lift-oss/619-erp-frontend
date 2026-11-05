// Three pages get their own light on the shared hero without touching the
// other eighty that render PageHero. These pins hold the contract: an accent
// is a tint and a glow, never a fill behind the text — the hero is a dark
// slab and a saturated band on top of it would be a second, brighter object.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { appPath, srcPath } from '@/__tests__/helpers/app-routes';
import { stripComments } from '@/__tests__/helpers/strip-comments';
import { PAGE_ACCENTS } from '@/components/ui/pageAccents';

const hero = stripComments(readFileSync(srcPath('components', 'ui', 'PageHero.tsx'), 'utf8'));

const read = (...segments: string[]) => readFileSync(appPath(...segments), 'utf8');
const readSrc = (...segments: string[]) => readFileSync(srcPath(...segments), 'utf8');

describe('page hero accents', () => {
  it('lights the slab instead of painting a band over it', () => {
    expect(hero).toContain('PAGE_ACCENTS[accent]');
    expect(hero).toContain('heroBackground(tint?.spot)');
    expect(hero).toContain('heroShadow(tint?.glow)');
    // The old two-stop band. A fill here would sit on top of the hero.
    expect(hero).not.toContain('linear-gradient(135deg');
  });

  it('gives every accent a spotlight and a glow, both translucent', () => {
    expect(Object.keys(PAGE_ACCENTS).sort()).toEqual(['amber', 'brand', 'indigo', 'red', 'teal']);
    for (const [name, a] of Object.entries(PAGE_ACCENTS)) {
      // rgba, not hex: the value drops into the gradient's colour slot and
      // carries its own alpha, so no color-mix is needed at runtime.
      expect({ name, spot: /^rgba\(/.test(a.spot) }).toEqual({ name, spot: true });
      expect({ name, glow: /^rgba\(/.test(a.glow) }).toEqual({ name, glow: true });
    }
  });

  it('delivers a different light on each page that opts in', () => {
    expect(read('pt-os', 'workout-log', 'page.tsx')).toContain('accent="indigo"');
    expect(read('pt-os', 'leads', 'page.tsx')).toContain('accent="amber"');
    expect(read('pt-os', 'clients', 'at-risk', 'page.tsx')).toContain('accent="red"');
    // The client-scoped tools reach the same prop through one picker, so their
    // headers cannot drift into a second accent system.
    expect(readSrc('components', 'pt-os', 'shared', 'ClientPicker.tsx')).toContain('accent={accent}');
  });
});
