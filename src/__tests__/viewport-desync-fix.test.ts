// The bottom nav must not be left floating above the screen edge.
//
// iOS lays fixed elements out against the LAYOUT viewport but changes the
// VISUAL one, and when the two fall out of step the bottom nav lands short of
// the bottom with a strip of blank page under it, and stays there.
//
// This hook was written for one trigger — the on-screen keyboard — and threw
// away everything smaller, on the reasoning that browser chrome collapsing is
// too small to matter. Chrome collapsing is the other way the two fall out of
// step, and it is the only one available on a page with no text input, which
// is where the gap was reported. So the case that was discarded is the case
// the report came from.
//
// Timing matters as much as the trigger: a chrome collapse fires a burst of
// resizes as it animates, and correcting on each one would issue a scroll per
// frame. These assert the debounce as well as the behaviour.

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import useViewportDesyncFix from '@/hooks/useViewportDesyncFix';

type Listener = () => void;

let listeners: Listener[];
let scrollTo: ReturnType<typeof vi.fn>;

/** Drive the fake visual viewport and flush the hook's rAF. */
function resizeTo(height: number) {
  (window.visualViewport as unknown as { height: number }).height = height;
  listeners.forEach((l) => l());
}

beforeEach(() => {
  vi.useFakeTimers();
  listeners = [];
  scrollTo = vi.fn();

  Object.defineProperty(window, 'visualViewport', {
    configurable: true,
    value: {
      height: 800,
      addEventListener: (_: string, l: Listener) => { listeners.push(l); },
      removeEventListener: (_: string, l: Listener) => {
        listeners = listeners.filter((x) => x !== l);
      },
    },
  });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800, writable: true });
  window.scrollTo = scrollTo as unknown as typeof window.scrollTo;
  // rAF runs synchronously so the assertions do not need a second flush.
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { cb(0); return 1; });
  vi.stubGlobal('cancelAnimationFrame', () => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('the keyboard case still works', () => {
  it('corrects once the keyboard is dismissed, not while it is open', () => {
    renderHook(() => useViewportDesyncFix());

    resizeTo(400);              // keyboard up — 400px occluded
    expect(scrollTo).not.toHaveBeenCalled();

    resizeTo(800);              // dismissed
    expect(scrollTo).toHaveBeenCalledTimes(1);
  });

  it('does not wait for the debounce on a dismissal', () => {
    // This is the largest, most obvious displacement; making the reader watch
    // a quarter-second of it would be worse than the old behaviour.
    renderHook(() => useViewportDesyncFix());
    resizeTo(400);
    resizeTo(800);
    expect(scrollTo).toHaveBeenCalledTimes(1);  // before any timer runs
  });
});

describe('the case that was thrown away', () => {
  it('corrects after browser chrome collapses', () => {
    // A ~60px change: far below the old 120px threshold, so this used to do
    // nothing at all — which is why a page with no text input could never be
    // recovered.
    renderHook(() => useViewportDesyncFix());

    resizeTo(740);
    expect(scrollTo).not.toHaveBeenCalled();   // debounced, not dropped

    vi.advanceTimersByTime(250);
    expect(scrollTo).toHaveBeenCalledTimes(1);
  });

  it('corrects once for a burst, not once per frame', () => {
    renderHook(() => useViewportDesyncFix());

    // Chrome animating shut fires a stream of resizes.
    [790, 780, 770, 760, 750, 740].forEach(resizeTo);
    vi.advanceTimersByTime(250);

    expect(scrollTo).toHaveBeenCalledTimes(1);
  });
});

describe('what the correction actually does', () => {
  it('re-asserts the current position on a scrollable page, without moving the reader', () => {
    // scrollHeight well past the viewport → scrollable.
    Object.defineProperty(document.documentElement, 'scrollHeight', { configurable: true, value: 5000 });
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 1234, writable: true });

    renderHook(() => useViewportDesyncFix());
    resizeTo(740);
    vi.advanceTimersByTime(250);

    expect(scrollTo).toHaveBeenCalledWith(0, 1234);
  });

  it('resets a page that cannot be scrolled back by hand', () => {
    // A fixed-height shell — the AI Coach console is exactly 100dvh minus the
    // chrome — has no scroll for the reader to use, so the gap would stay
    // until navigation.
    Object.defineProperty(document.documentElement, 'scrollHeight', { configurable: true, value: 800 });
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0, writable: true });

    renderHook(() => useViewportDesyncFix());
    resizeTo(740);
    vi.advanceTimersByTime(250);

    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });
});

describe('it cleans up after itself', () => {
  it('removes the listener and drops a pending correction on unmount', () => {
    const { unmount } = renderHook(() => useViewportDesyncFix());
    resizeTo(740);           // schedules a correction
    unmount();
    vi.advanceTimersByTime(250);

    expect(listeners).toHaveLength(0);
    expect(scrollTo).not.toHaveBeenCalled();
  });
});

describe('browsers without visualViewport', () => {
  it('does nothing at all', () => {
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: undefined });
    expect(() => renderHook(() => useViewportDesyncFix())).not.toThrow();
    expect(scrollTo).not.toHaveBeenCalled();
  });
});
