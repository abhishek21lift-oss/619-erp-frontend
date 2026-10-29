// The client profile used to open on the profile spectrum's own mesh — indigo
// into purple with pink and orange light — which made the page a trainer
// opens most the one page in the app whose top did not match the house hero
// the dashboard and every shared PageHero page use. These pins hold the
// redesign in place: the hero wears the Aurora indigo, the sections keep
// their spectrum, and the cards take their depth from the adaptive glass
// tokens instead of one light-only shadow that does nothing in dark mode.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { appPath, srcPath } from '@/__tests__/helpers/app-routes';
import { stripComments } from '@/__tests__/helpers/strip-comments';

const page = readFileSync(appPath('pt-os', 'clients', '[id]', 'page.tsx'), 'utf8');
const code = stripComments(page);
const theme = readFileSync(srcPath('components', 'profile', 'profileTheme.ts'), 'utf8');

/** The house hero's gradient, spelled the same way in both existing heroes. */
const HOUSE =
  'linear-gradient(128deg, #2F35A8 0%, #5B63F6 46%, #3F46D6 100%)';

const hero = () => page.slice(page.indexOf('── HERO ──'), page.indexOf('── ACTIONS ──'));

describe('the client profile hero wears the house aurora', () => {
  it('paints from the auroraHero token, not the spectrum mesh', () => {
    for (const key of ['glowWarm', 'glowCool', 'crown', 'base', 'shadow']) {
      expect(hero()).toContain(`auroraHero.${key}`);
    }
    expect(code).not.toContain('heroMesh');
  });

  it('renders the house lights as blurred discs, not flat radial washes', () => {
    // The house heroes blur their light: a 240px disc, half off-canvas, the
    // blur doing the softening. Baking the same colour into the background
    // stack as a flat radial reads as a different light at a glance.
    const block = hero();
    expect(block).toContain('background: `${auroraHero.crown}, ${auroraHero.base}`');
    expect(block).toContain('radial-gradient(circle, ${auroraHero.glowWarm} 0%, transparent 70%)');
    expect(block).toContain('radial-gradient(circle, ${auroraHero.glowCool} 0%, transparent 70%)');
    expect(block).toContain("filter: 'blur(46px)'");
    expect(block).toContain("filter: 'blur(54px)'");
  });

  it('uses the gradient the dashboard and PageHero use, so they cannot drift', () => {
    for (const file of ['components/ui/PageHero.tsx', 'components/dashboards/PtOsDashboard.tsx']) {
      expect(readFileSync(srcPath(...file.split('/')), 'utf8')).toContain(HOUSE);
    }
    expect(theme).toContain(HOUSE);
  });

  it('keeps the grid and vignette behind the content, never on top', () => {
    const block = hero();
    expect(block).toContain('id="cp-grid"');
    expect(block).toContain('radial-gradient(120% 120% at 50% 38%');
    // Decoration is absolute and non-interactive; the content sits above it.
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
