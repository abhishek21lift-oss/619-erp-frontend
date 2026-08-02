// The dashboard Quick Actions list.
//
// This was two hand-maintained copies — one for the mobile strip, one for the
// desktop dock — and that is exactly how they drift: three actions were added
// to the mobile list and the desktop dock was missed, which is easy to do and
// easy to miss in review because only one of the two is ever on screen. They
// now share QUICK_ACTIONS, and these tests pin what that list must satisfy.
import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { QUICK_ACTIONS } from '@/components/dashboards/PtOsDashboard';

describe('QUICK_ACTIONS', () => {
  it('is in the order a trainer works through a new client', () => {
    // Onboard, clear to train, agree the goal, then assess — general first,
    // then the specific assessments.
    expect(QUICK_ACTIONS.map((a) => a.label)).toEqual([
      'Add Client',
      'Consent',
      'PAR-Q',
      'Goal Setting',
      'Fitness Testing',
      'Lifestyle',
      'Nutrition Assessment',
      'Mobility Assessment',
      'Posture Assessment',
      'Strength Tracking',
    ]);
  });

  it('every action points at a route that actually exists', () => {
    // A typo here is invisible until someone taps the tile and gets a 404,
    // and the tile looks perfectly healthy until they do.
    const missing = QUICK_ACTIONS
      .map((a) => a.href)
      .filter((href) => !existsSync(join(process.cwd(), 'src/app', href, 'page.tsx')));
    expect(missing).toEqual([]);
  });

  it('no two actions share a destination', () => {
    const hrefs = QUICK_ACTIONS.map((a) => a.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it('no two actions share an icon', () => {
    // On a phone these are 9.5px labels on a scrolling strip: the glyph is
    // what is actually recognised, so a repeat makes two tiles a coin flip.
    const icons = QUICK_ACTIONS.map((a) => a.icon);
    expect(new Set(icons).size).toBe(icons.length);
  });

  it('every action carries a label, href and colour', () => {
    for (const a of QUICK_ACTIONS) {
      expect(a.label.trim()).not.toBe('');
      expect(a.href.startsWith('/')).toBe(true);
      expect(a.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});
