// Scrolling must not re-render the app shell on every frame.
//
// NavScrollContext used to publish scrollY, isAtTop and a bottomBar state
// alongside topBar, inside a context value rebuilt as a fresh object on every
// animation frame of every scroll. Nothing read the first three. What that
// cost was paid by all three consumers re-rendering ~60 times a second
// whenever the page moved:
//
//   · AppShell        — the entire shell, including the bottom nav
//   · MobileBottomNav — which carries a framer-motion layoutId shared-layout
//                       animation on its active pill
//   · PullToRefresh   — which wraps all page content
//
// Re-rendering a tree full of layout animations at frame rate is what the
// bottom bar's flicker while scrolling was made of. These tests pin the
// invariant rather than the implementation: a scroll that does not cross a
// topBar state boundary must not re-render a consumer at all.

import {describe, expect, it, vi, beforeEach, afterEach} from 'vitest';
import {render, act} from '@testing-library/react';
import {readFileSync} from 'node:fs';
import {NavScrollProvider, useNavScroll} from '@/contexts/nav-scroll-context';
import {srcPath} from '@/__tests__/helpers/app-routes';

let rafCbs: FrameRequestCallback[] = [];
let renders = 0;

function Consumer() {
  useNavScroll();
  renders++;
  return null;
}

/** Model the browser: rAF is asynchronous, so the provider's own throttle
 *  (one processFrame per frame) behaves as it does in production. A
 *  synchronous stub would latch that throttle shut after the first event. */
function flushFrame() {
  const cbs = rafCbs;
  rafCbs = [];
  act(() => { cbs.forEach((cb) => cb(0)); });
}

function scrollTo(y: number) {
  Object.defineProperty(window, 'scrollY', { configurable: true, writable: true, value: y });
  act(() => { window.dispatchEvent(new Event('scroll')); });
  flushFrame();
}

beforeEach(() => {
  rafCbs = [];
  renders = 0;
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => rafCbs.push(cb));
  vi.stubGlobal('cancelAnimationFrame', () => {});
  // jsdom has no matchMedia, and the provider reads it for
  // prefers-reduced-motion. Reports "no preference", which is the path these
  // tests care about.
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
  Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: 800 });
  // Tall enough that the page is neither at the top nor at the bottom in the
  // mid-scroll range these tests use — both edges force 'expanded'.
  Object.defineProperty(document.documentElement, 'scrollHeight', { configurable: true, value: 10000 });
  Object.defineProperty(window, 'scrollY', { configurable: true, writable: true, value: 0 });
});

afterEach(() => { vi.unstubAllGlobals(); });

describe('scrolling without crossing a state boundary', () => {
  it('does not re-render consumers frame after frame', () => {
    render(<NavScrollProvider><Consumer /></NavScrollProvider>);

    // Settle the initial mount, then commit to scrolling down so the state
    // machine is in a steady 'hidden' state.
    renders = 0;
    for (let y = 100; y <= 400; y += 100) scrollTo(y);
    const afterCommit = renders;

    // Keep going the SAME way. Nothing about topBar changes, so nothing should
    // render — this is the run that used to cost one render per frame.
    for (let y = 500; y <= 1500; y += 100) scrollTo(y);

    expect(renders).toBe(afterCommit);
  });

  it('still re-renders when the bar actually changes state', () => {
    // The optimisation must not have flattened the state machine into doing
    // nothing — reversing direction past the hysteresis threshold is a real
    // transition and has to reach consumers.
    render(<NavScrollProvider><Consumer /></NavScrollProvider>);

    for (let y = 100; y <= 600; y += 100) scrollTo(y);   // committed: down
    renders = 0;

    for (let y = 500; y >= 200; y -= 100) scrollTo(y);   // reverse: up → compact

    expect(renders).toBeGreaterThan(0);
  });
});

describe('the provider is mounted where it survives navigation', () => {
  const read = (...p: string[]) => readFileSync(srcPath(...p), 'utf8');

  it('lives in the root layout, not inside AppShell', () => {
    // AppShell is rendered by each of ~97 pages rather than by a layout, so
    // anything mounted inside it is destroyed and rebuilt on every navigation.
    // With the provider in there, topBar reset to 'expanded' on arrival, which
    // snapped --topbar-h from 32px back to 46px and animated the header
    // spacer — shifting the whole page's content down and then back up.
    expect(read('app', 'layout.tsx')).toContain('<NavScrollProvider>');
    expect(read('components', 'AppShell.tsx')).not.toContain('<NavScrollProvider>');
  });
});

describe('the published surface', () => {
  it('exposes only what something reads', () => {
    // scrollY / isAtTop / bottomBar were read by nothing, and scrollY was the
    // per-frame value that made the context churn. Re-adding a live one here
    // would reintroduce the bug wholesale, so the shape is pinned.
    let seen: Record<string, unknown> = {};
    function Probe() { seen = useNavScroll() as unknown as Record<string, unknown>; return null; }
    render(<NavScrollProvider><Probe /></NavScrollProvider>);

    expect(Object.keys(seen).sort()).toEqual(['reducedMotion', 'topBar']);
  });
});
