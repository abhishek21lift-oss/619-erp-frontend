// The client profile used to open on the profile spectrum's own mesh — indigo
// into purple with pink and orange light — which made the page a trainer
// opens most the one page in the app whose top did not match the house hero
// the dashboard and every shared PageHero page use. These pins hold the
// redesign in place: the hero wears the house slab, its depth layers are the
// shared ones, and the cards take their depth from the adaptive glass tokens
// instead of one light-only shadow that does nothing in dark mode.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { appPath, srcPath } from '@/__tests__/helpers/app-routes';
import { stripComments } from '@/__tests__/helpers/strip-comments';

const page = readFileSync(appPath('pt-os', 'clients', '[id]', 'page.tsx'), 'utf8');
const code = stripComments(page);

/** The rose band the hero wore before the shared heroTheme. Gone from all three. */
const OLD_HOUSE =
  'linear-gradient(128deg, #6B2440 0%, #A33757 46%, #852E4E 100%)';

/** The three heroes that wear the same paint. */
const HEROES = [
  'components/ui/PageHero.tsx',
  'components/dashboards/PtOsDashboard.tsx',
  'components/profile/profileTheme.ts',
];

const hero = () => page.slice(page.indexOf('── HERO ──'), page.indexOf('── ACTIONS ──'));

describe('the client profile hero wears the house slab', () => {
  it('paints from the auroraHero token, not the spectrum mesh', () => {
    for (const key of ['crown', 'base', 'shadow']) {
      expect(hero()).toContain(`auroraHero.${key}`);
    }
    expect(code).not.toContain('heroMesh');
  });

  it('wears the same depth layers as every other hero', () => {
    // Bevel, grain, specular sweep and vignette are in globals.css because
    // they are identical on all three heroes; a page painting its own copies
    // is how the three drifted apart the first time.
    const block = hero();
    for (const layer of ['hero-spec', 'hero-grain', 'hero-vignette', 'hero-bevel']) {
      expect(block).toContain(layer);
    }
    // `isolate` keeps the grain's overlay blend inside the card.
    expect(block).toContain('isolate');
  });

  it('imports the paint the dashboard and PageHero use, so they cannot drift', () => {
    for (const file of HEROES) {
      const src = readFileSync(srcPath(...file.split('/')), 'utf8');
      expect(src).toMatch(/from '[^']*heroTheme'/);
      expect(src).not.toContain(OLD_HOUSE);
    }
  });

  it('keeps the decoration behind the content, never on top', () => {
    const block = hero();
    // The grid texture is gone: at 34px it read as squares on the dark slab.
    expect(block).not.toContain('cp-grid');
    expect(block).toContain('pointer-events-none absolute inset-0');
    expect(block).toContain('relative z-10');
  });

  it('takes card depth from the shared surface token, tinted per section', () => {
    // One definition of the surface, in the shared card module, so a card
    // added later cannot bring back the light-only shadow.
    const card = readFileSync(srcPath('components', 'ui', 'Card.tsx'), 'utf8');
    expect(card).toContain('var(--shadow-card)');
    expect(card).toMatch(/0 18px 40px -26px \$\{glow\}/);
    expect((code.match(/cardSurfaceGlow\(/g) ?? []).length).toBeGreaterThanOrEqual(3);
    expect(code).toContain('cardSurfaceGlow(tint.glow)');
    expect(code).toContain('cardSurfaceGlow(tones.mint.glow)');
    expect(code).toContain('cardSurfaceGlow(tones.indigo.glow)');
    // One light-only shadow on every card is exactly what was removed.
    expect(code).not.toContain('0 12px 32px -18px rgba(15,23,42,0.18)');
  });
});
