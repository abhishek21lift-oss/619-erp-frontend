// The workout-log session hero is shaped like every other hero in the app.
//
// It used to be the only screen that cancelled the shell's horizontal padding
// (`-mx-[16px] md:-mx-[24px]`) and rounded only its bottom corners, so it ran
// edge to edge with square corners jammed into both sides of the display while
// every other hero is an inset card. Next to the dashboard that does not read
// as intent — it reads as the one screen that is broken.
//
// Guarded at the source: this is pure layout, nothing throws, and the failure
// is only visible by putting two screenshots side by side.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const raw = readFileSync(
  join(__dirname, '..', 'app', 'pt-os', 'clients', '[id]', 'workout-log', '[sessionId]', 'page.tsx'),
  'utf8',
);

/**
 * The file with comments removed.
 *
 * The comment above the wrapper explains what the layout used to be, and names
 * the old classes to do it. Asserting against the raw text made that
 * explanation fail the test — the prose describing the fix would have had to be
 * deleted to make the fix pass, which is exactly backwards.
 */
const page = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const dashboard = readFileSync(
  join(__dirname, '..', 'components', 'dashboards', 'PtOsDashboard.tsx'),
  'utf8',
);

describe('the session hero sits inside the shell like the rest', () => {
  it('does not cancel the shell padding', () => {
    // The exact shape of the old bug, in both breakpoint forms.
    expect(page).not.toMatch(/-mx-\[16px\]/);
    expect(page).not.toMatch(/md:-mx-\[24px\]/);
  });

  it('is rounded on all four corners, not just the bottom', () => {
    expect(page).not.toContain('rounded-b-[28px]');
    expect(page).toContain('rounded-[24px] sm:rounded-[30px]');
  });

  it('uses the same radii the dashboard hero does', () => {
    // Read off the dashboard rather than hard-coded twice, so a change there
    // fails here instead of letting the two drift apart silently.
    const radii = 'rounded-[24px] sm:rounded-[30px]';
    expect(dashboard).toContain(radii);
    expect(page).toContain(radii);
  });

  it('keeps the dashboard\'s extra 4px above the hero', () => {
    // .shell-main gives every page 16px; the dashboard adds pt-1 on top before
    // its hero. Without the same here this one sat visibly tighter under the
    // top bar than the hero it is meant to match.
    expect(page).toMatch(/className="pt-1 pb-32"/);
    expect(dashboard).toMatch(/max-w-7xl pt-1/);
  });

  it('does not indent the content a second time', () => {
    // The body below the hero carried px-[16px] md:px-[24px] purely to re-add
    // the inset the wrapper was cancelling. Left in place it would now double
    // up and leave every card narrower than the hero above it.
    const body = page.slice(page.indexOf('mx-auto max-w-3xl space-y-5'));
    expect(body.slice(0, 80)).not.toMatch(/px-\[16px\]/);
  });
});
