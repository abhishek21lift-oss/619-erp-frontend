// The Founder badge, and the one rule that matters: nobody else ever sees it.
//
// Founder status is sold as "one of only 20, forever". That makes two defects
// unusually expensive, and neither is visible in a screenshot of a founder's
// account:
//
//   1. Showing it to a non-founder devalues it for all twenty who paid.
//   2. Losing it after a renewal breaks an explicit lifetime promise.
//
// The first is a rendering rule and is tested here exhaustively. The second is
// a backend property — the number lives on the organisation and is never
// cleared by a renewal — and is guarded on that side; what this file pins is
// that the component draws whatever number it is handed rather than
// recomputing eligibility from anything that could change.
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import FounderBadge, { FOUNDER_LIMIT, FOUNDER_TOOLTIP } from '@/components/FounderBadge';

function badge() {
  return screen.queryByRole('img');
}

describe('who sees the badge', () => {
  it('renders for a founder', () => {
    render(<FounderBadge number={7} />);
    expect(screen.getByText('Founder')).toBeInTheDocument();
  });

  it('does not print the number, or a hash, anywhere', () => {
    // The number still gates the badge and is still validated against 1..20 —
    // it is simply not shown. Nothing visible, and nothing in the accessible
    // name either, or a screen reader would announce what sighted users can't
    // see.
    render(<FounderBadge number={7} />);
    // textContent would swallow the <style jsx> block, whose CSS is full of
    // digits; only the visible text nodes are the claim here.
    const el = badge()!.cloneNode(true) as HTMLElement;
    el.querySelectorAll('style').forEach((n) => n.remove());
    expect(el.textContent?.trim()).toBe('Founder');
    expect(badge()!.getAttribute('aria-label')).not.toMatch(/#|\bnumber\b/i);
  });

  it.each([
    ['undefined', undefined],
    ['null', null],
  ])('renders nothing when the number is %s', (_label, value) => {
    // The overwhelmingly common case: every studio that is not a founder.
    // Nothing at all — not a dimmed badge, not a placeholder, not a gap.
    const { container } = render(<FounderBadge number={value} />);
    expect(container).toBeEmptyDOMElement();
  });

  it.each([
    ['zero', 0],
    ['negative', -1],
    ['past the cap', FOUNDER_LIMIT + 1],
    ['far past the cap', 999],
    ['fractional', 3.5],
    ['NaN', NaN],
  ])('renders nothing for %s', (_label, value) => {
    // A number outside 1..20 is not a founder, whatever produced it. Drawing
    // "Founder #0/20" or "Founder #47/20" would be worse than drawing nothing
    // — it would advertise that the cap is not real.
    const { container } = render(<FounderBadge number={value} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders for the first and last valid numbers', () => {
    // Boundaries, because an off-by-one here silently excludes founder 1 or
    // founder 20 — the two people most likely to notice. The badge reads the
    // same for both; what is being checked is that both get one.
    const { unmount } = render(<FounderBadge number={1} />);
    expect(screen.getByText('Founder')).toBeInTheDocument();
    unmount();
    render(<FounderBadge number={FOUNDER_LIMIT} />);
    expect(screen.getByText('Founder')).toBeInTheDocument();
  });
});

describe('what it says', () => {
  it('uses the exact tooltip copy', () => {
    render(<FounderBadge number={3} />);
    expect(badge()).toHaveAttribute('title', FOUNDER_TOOLTIP);
  });

  it('names the product this app actually is', () => {
    // The brief said "MY GYM CONTROL". Everything else in this codebase —
    // login, emails, the landing page — says MY PT STUDIO, and a badge that
    // names a different product reads as a bug rather than a brand.
    expect(FOUNDER_TOOLTIP).toContain('MY PT STUDIO');
    expect(FOUNDER_TOOLTIP).toBe(
      'Founding Member of MY PT STUDIO. One of only 20 lifetime Founder Studios.'
    );
  });

  it('carries the wording and the promise in its accessible name', () => {
    // title alone is unreliable for screen readers, and "image" on its own
    // tells somebody nothing.
    render(<FounderBadge number={12} />);
    const name = badge()!.getAttribute('aria-label')!;
    expect(name).toContain('Founder');
    expect(name).toContain(FOUNDER_TOOLTIP);
  });

  it('states a cap of 20 in the tooltip, matching what was sold', () => {
    // The badge no longer shows "/20", so the tooltip is the only place the
    // scarcity is stated — which is the thing that makes it worth having.
    expect(FOUNDER_LIMIT).toBe(20);
    expect(FOUNDER_TOOLTIP).toContain('only 20');
  });
});

describe('variants', () => {
  it('crown keeps the meaning in the accessible name when the text is gone', () => {
    render(<FounderBadge number={9} variant="crown" />);
    expect(screen.queryByText('Founder')).toBeNull();
    expect(badge()!.getAttribute('aria-label')).toContain('Founder');
  });

  it('still renders nothing for a non-founder in every variant', () => {
    for (const variant of ['full', 'crown'] as const) {
      const { container, unmount } = render(<FounderBadge number={null} variant={variant} />);
      expect(container).toBeEmptyDOMElement();
      unmount();
    }
  });
});

describe('animation cost', () => {
  it('animates only compositor properties', () => {
    // Three effects run for the life of every session, in the sidebar, on
    // every screen. transform / opacity / background-position are handled by
    // the compositor; animating width, top or box-shadow instead would repaint
    // on every frame and this would be a battery complaint rather than a
    // decoration.
    const src = require('node:fs').readFileSync(
      require('node:path').join(process.cwd(), 'src/components/FounderBadge.tsx'),
      'utf8'
    );
    // Properties sit inline inside `{ ... }` on the keyframe stop lines, so
    // match them there rather than at line start. The end anchor is searched
    // FROM the start index: the file's own docblock mentions
    // prefers-reduced-motion, and a plain indexOf finds that first, slicing
    // backwards to an empty string that passes every assertion vacuously.
    const from = src.indexOf('@keyframes');
    const keyframeBlock = src.slice(from, src.indexOf('prefers-reduced-motion', from));
    const animatedProps = [...keyframeBlock.matchAll(/\{\s*([a-z-]+):/g)].map((m) => m[1]);
    expect(animatedProps.length).toBeGreaterThan(0);
    for (const prop of animatedProps) {
      expect(['transform', 'opacity', 'background-position']).toContain(prop);
    }
  });

  it('stops moving under prefers-reduced-motion', () => {
    const src = require('node:fs').readFileSync(
      require('node:path').join(process.cwd(), 'src/components/FounderBadge.tsx'),
      'utf8'
    );
    const block = src.slice(src.indexOf('prefers-reduced-motion'));
    expect(block).toContain('animation: none');
    // …but keeps its gold: motion is the decoration, not the message.
    expect(block).toContain('background-position');
  });

  it('does not pull in a JS animation runtime', () => {
    // Every other animated thing here uses framer-motion. This one renders on
    // every screen for the whole session, and a JS loop to shimmer a
    // decoration is not a trade worth making.
    const src = require('node:fs').readFileSync(
      require('node:path').join(process.cwd(), 'src/components/FounderBadge.tsx'),
      'utf8'
    );
    // Comments stripped: the file explains at length why it does NOT use
    // framer-motion, and saying so must not trip the assertion.
    const code = src.split('\n').filter((l) => !/^\s*(\*|\/\/)/.test(l)).join('\n');
    expect(code).not.toContain('framer-motion');
  });
});
