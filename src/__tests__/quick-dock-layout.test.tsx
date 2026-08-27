// The desktop Quick Dock has to actually show all ten actions.
//
// Posture and Strength — the last two in QUICK_ACTIONS — were unreachable
// on tablet and laptop. The dock was a single m.div carrying
// `fixed left-1/2 -translate-x-1/2`, and framer-motion writes `transform`
// inline on everything it animates. That inline `translateY(...)` replaced the
// class's `translateX(-50%)` outright, so the centering never applied: the
// dock's left edge sat at exactly 50% of the viewport and its full 900px ran
// off the right of the screen at every desktop width. Measured in a real
// browser at 1024–1920: left was always viewport/2, right always beyond it.
//
// Positioning now lives on a wrapper and the animation on the child, so
// framer-motion has nothing to clobber. These tests pin the structure that
// keeps it that way — layout itself is verified in a browser, not in jsdom,
// but every one of these assertions fails against the old markup.
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QuickDock, QUICK_ACTIONS } from '@/components/dashboards/PtOsDashboard';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), back: vi.fn() }) }));

function renderDock() {
  const { container } = render(<QuickDock />);
  const wrap = container.firstElementChild as HTMLElement;
  const dock = wrap.firstElementChild as HTMLElement;
  return { wrap, dock };
}

describe('<QuickDock />', () => {
  it('renders every quick action, including the last two', () => {
    renderDock();
    for (const a of QUICK_ACTIONS) {
      expect(screen.getByRole('button', { name: a.label })).toBeTruthy();
    }
    // Named outright, because these are the two that were missing.
    expect(screen.getByRole('button', { name: 'Posture' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Strength' })).toBeTruthy();
  });

  it('never centres a positioned element with a translate utility', () => {
    // The bug in one assertion, anchored to whichever element actually carries
    // `fixed` rather than to a position in the tree — the old markup had no
    // wrapper, so walking to a fixed child would have found a button and
    // passed without proving anything.
    const { container } = render(<QuickDock />);
    const positioned = container.querySelectorAll('.fixed');
    expect(positioned.length).toBeGreaterThan(0);
    for (const el of positioned) {
      // framer-motion writes `transform` inline on anything it animates, so a
      // translate utility on a positioned element is dead on arrival.
      expect(el.className).not.toMatch(/-translate-x-/);
    }
  });

  it('positions on the wrapper, not on the animated child', () => {
    const { wrap, dock } = renderDock();
    expect(wrap.className).toMatch(/\bfixed\b/);
    expect(dock.className).not.toMatch(/\bfixed\b/);
    // Centering is flexbox on the wrapper now, which no inline style can undo.
    expect(wrap.className).toMatch(/justify-center/);
  });

  it('clears the sidebar rather than sliding under it', () => {
    // The sidebar is z-50 against this dock's z-40, so centering on the whole
    // viewport would have hidden the leading tiles under it instead of off the
    // right edge. Same offsets the topbar uses.
    const { wrap } = renderDock();
    expect(wrap.className).toMatch(/lg:pl-64/);
    expect(wrap.className).toMatch(/xl:pl-72/);
  });

  it('wraps instead of overflowing when ten tiles do not fit on one line', () => {
    // At 1024 the row is wider than the space left beside the sidebar. Wrapping
    // is what keeps the overflow on screen as a second row; without it the tail
    // of the list is simply gone.
    const { dock } = renderDock();
    expect(dock.className).toMatch(/flex-wrap/);
    expect(dock.className).toMatch(/max-w-full/);
  });

  it('keeps the dock clickable through the pass-through wrapper', () => {
    // The wrapper spans the width of the screen, so it must not eat clicks on
    // the content behind it — but the dock itself still has to be clickable.
    const { wrap, dock } = renderDock();
    expect(wrap.className).toMatch(/pointer-events-none/);
    expect(dock.className).toMatch(/pointer-events-auto/);
  });
});
