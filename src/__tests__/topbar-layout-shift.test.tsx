// Scrolling must not move the page's content, and motion must be optional.
//
// Two findings from the audit, both medium severity, both about movement
// nobody asked for:
//
//   BUG-004 — the spacer that reserves room for the fixed top bar animated its
//   own height 46 ↔ 32 to track the bar. It is an in-flow box above <main>, so
//   every scroll-direction change pushed the entire page's content 14px and
//   pulled it back. A layout shift on a plain scroll, hundreds of times a
//   session — and one that scores, because scroll is not the kind of input CLS
//   forgives. The header still shrinks; the reserve is now constant.
//
//   BUG-005 — the audit called ~190 `initial={{ opacity: 0, y }}` mount
//   animations "paint-time shifts". That part was wrong: framer's `y` compiles
//   to `transform`, which moves nothing around it and is excluded from CLS by
//   definition. What IS true is that none of them honoured
//   prefers-reduced-motion — see the third block below.

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { srcPath } from '@/__tests__/helpers/app-routes';
import { NavScrollProvider, useNavScroll, type BarState } from '@/contexts/nav-scroll-context';

const read = (...p: string[]) => readFileSync(srcPath(...p), 'utf8');
const stripComments = (s: string) => s
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

describe('the top bar reserves a constant amount of room', () => {
  const shell = stripComments(read('components', 'AppShell.tsx'));

  /** The aria-hidden spacer that sits between the fixed header and <main>. */
  function spacer(): string {
    const at = shell.indexOf('aria-hidden="true"');
    expect(at, 'the spacer element moved or lost its aria-hidden').toBeGreaterThan(-1);
    const open = shell.lastIndexOf('<', at);
    return shell.slice(open, shell.indexOf('/>', at) + 2);
  }

  it('does not animate the spacer height', () => {
    // The whole defect in one line. `animate={{ height: … }}` on an in-flow
    // element is a layout animation, and everything below it moves for the
    // duration.
    expect(spacer()).not.toMatch(/animate=/);
    expect(spacer()).not.toMatch(/height:\s*topBar/);
  });

  it('reserves the expanded height, not the compact one', () => {
    // Reserving 32 would fix the shift and hide content behind the bar
    // whenever it is expanded — which is its state at the top of every page.
    expect(spacer()).toMatch(/height:\s*TOPBAR_EXPANDED_H\b/);
    expect(shell).toMatch(/const TOPBAR_EXPANDED_H = 46;/);
  });

  it('still lets the header itself shrink', () => {
    // The fix must not have flattened the design into a bar that never
    // condenses — only the reserve is constant.
    expect(shell).toMatch(/animate=\{\{ height: topBar === 'compact' \? TOPBAR_COMPACT_H : TOPBAR_EXPANDED_H \}\}/);
  });
});

describe('every state the scroll machine emits is a state something renders', () => {
  let rafCbs: FrameRequestCallback[] = [];
  const seen = new Set<BarState>();

  function Probe() { seen.add(useNavScroll().topBar); return null; }

  function scrollTo(y: number) {
    Object.defineProperty(window, 'scrollY', { configurable: true, writable: true, value: y });
    act(() => { window.dispatchEvent(new Event('scroll')); });
    const cbs = rafCbs;
    rafCbs = [];
    act(() => { cbs.forEach((cb) => cb(0)); });
  }

  beforeEach(() => {
    rafCbs = [];
    seen.clear();
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => rafCbs.push(cb));
    vi.stubGlobal('cancelAnimationFrame', () => {});
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false, media: query, addEventListener: () => {}, removeEventListener: () => {},
    }));
    Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: 800 });
    Object.defineProperty(document.documentElement, 'scrollHeight', { configurable: true, value: 10000 });
    Object.defineProperty(window, 'scrollY', { configurable: true, writable: true, value: 0 });
  });

  afterEach(() => { vi.unstubAllGlobals(); });

  it('emits only expanded and compact, and reaches both', () => {
    // There used to be a third: scrolling down returned 'hidden', documented as
    // sliding the bar off-screen. Nothing implemented it — the header animates
    // `y: 0` unconditionally and reads its height as
    // `topBar === 'compact' ? … : …`, so 'hidden' rendered a full, visible bar
    // identical to 'expanded'. A state the renderer cannot tell apart from
    // another one is not a state.
    render(<NavScrollProvider><Probe /></NavScrollProvider>);

    for (let y = 100; y <= 900; y += 100) scrollTo(y);   // committed: down
    for (let y = 800; y >= 200; y -= 100) scrollTo(y);   // reverse: up
    scrollTo(0);                                          // back to the top

    expect([...seen].sort()).toEqual(['compact', 'expanded']);
  });

  it('has no state left in the type that the shell cannot render', () => {
    const context = stripComments(read('contexts', 'nav-scroll-context.tsx'));
    const union = /export type BarState = ([^;]+);/.exec(context);
    expect(union, 'BarState declaration moved').not.toBeNull();

    const members = [...union![1].matchAll(/'([^']+)'/g)].map((m) => m[1]).sort();
    // The shell distinguishes exactly one of them by name; the rest collapse
    // into the else branch, so more than two members means at least two of
    // them render identically again.
    expect(members).toEqual(['compact', 'expanded']);
  });
});

describe('a visitor who asks for less motion gets it', () => {
  it('hands framer-motion the preference, which CSS cannot', () => {
    // globals.css has the standard reduced-motion reset. It caps
    // animation-duration and transition-duration — and framer-motion uses
    // neither, animating by writing inline styles from its own rAF loop. So
    // the reset covers the CSS keyframes and nothing else, and ~190 translate
    // mount animations played in full for someone who had asked them not to.
    const layout = stripComments(read('app', 'layout.tsx'));
    expect(layout).toMatch(/<MotionConfig reducedMotion="user">/);

    // Below NavScrollProvider and above LazyMotion, so it covers every motion
    // component in the app rather than a subtree of it.
    const config = layout.indexOf('<MotionConfig');
    const lazy = layout.indexOf('<LazyMotion');
    const children = layout.indexOf('{children}');
    expect(config).toBeGreaterThan(-1);
    expect(config).toBeLessThan(lazy);
    expect(lazy).toBeLessThan(children);
  });

  it('keeps the CSS reset, which is what covers the keyframe animations', () => {
    // The two cover different halves; neither replaces the other.
    const css = read('app', 'globals.css');
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
    expect(css).toMatch(/animation-duration: 0\.01ms !important/);
  });
});
