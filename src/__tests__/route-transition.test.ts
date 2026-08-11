// The arriving route must not fade in.
//
// AppShell wrapped the page in a motion component with `initial={{ opacity: 0 }}`
// animating to 1 over 220ms, so every navigation showed the new page climbing
// up from nothing. Measured in a throttled mobile Chromium against the
// production build, the wrapper's computed opacity stepped
// 0 → 0.12 → 0.47 → 0.71 → … → 1 on every route change; that is the
// washed-out frame users reported, and after this change the same measurement
// reads ["1"] with zero fading frames.
//
// Two separate things are held here, because fixing one by breaking the other
// is the obvious wrong move:
//
//   1. No entrance animation on the route container.
//   2. The container is STILL keyed on pathname.
//
// The key was never there for the animation. It is what makes a route change
// remount the page: React reuses a component instance when the same type sits
// at the same position, which is exactly the case between two dynamic routes
// (/clients/c1 → /clients/c2 is one component). Drop the key and that instance
// is reused — the previous client's form state survives and empty-dependency
// hooks never re-run, so the new client's page shows the old client's data.
// Deleting the key would look like a tidy-up and would be a data-correctness
// bug.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const SRC = readFileSync(path.join(process.cwd(), 'src/components/AppShell.tsx'), 'utf8');

/** The route container: the element carrying key={pathname}, and everything up
 *  to the end of its opening tag. Scoped deliberately — AppShell has eleven
 *  other motion elements (sidebar, drawers, overlays) whose animations are not
 *  what this file is about. */
function routeContainerOpeningTag(): string {
  const at = SRC.indexOf('key={pathname}');
  expect(at, 'AppShell no longer has a route container keyed on pathname').toBeGreaterThan(-1);
  const open = SRC.lastIndexOf('<', at);
  const close = SRC.indexOf('>', at);
  return SRC.slice(open, close + 1);
}

describe('the route container', () => {
  it('still remounts the page on a route change', () => {
    // Guarding the mechanism, not the syntax: without this, two dynamic routes
    // share one component instance and its state.
    expect(SRC).toContain('key={pathname}');
  });

  it('does not animate the arriving page in', () => {
    const tag = routeContainerOpeningTag();
    expect(tag).not.toMatch(/initial=/);
    expect(tag).not.toMatch(/animate=/);
    expect(tag).not.toMatch(/transition=/);
  });

  it('is a plain element, not a motion one', () => {
    // A motion component with no animation props still takes the compositing
    // path and is an open invitation to re-add a fade.
    const tag = routeContainerOpeningTag();
    expect(tag.startsWith('<div')).toBe(true);
    expect(tag).not.toMatch(/<m\./);
  });

  it('does not reach for a CSS fade instead', () => {
    // The same effect via Tailwind would satisfy every assertion above.
    const tag = routeContainerOpeningTag();
    expect(tag).not.toMatch(/transition-opacity|animate-|fade|opacity-0/);
  });

  it('does not wrap the page in an exit animation either', () => {
    // AnimatePresence around the route would absolutely position the leaving
    // page over the arriving one — a different transition, not the absence of
    // one. The AnimatePresence instances AppShell does have belong to the
    // sidebar and drawers.
    const at = SRC.indexOf('key={pathname}');
    const before = SRC.slice(Math.max(0, at - 400), at);
    expect(before).not.toMatch(/<AnimatePresence/);
  });
});
