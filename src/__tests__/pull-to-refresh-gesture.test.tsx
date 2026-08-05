// Who owns a downward drag.
//
// Pull-to-refresh listens on `window`, so it sees every touch on every page.
// The only thing standing between it and every other vertical gesture in the
// app is the set of conditions in onTouchStart — which makes those conditions
// worth pinning down.
//
// The reported bug: on Record Payment, opening the client picker and dragging
// down inside the list pulled the WHOLE PAGE down instead of scrolling the
// list. The page is short enough never to scroll, so `window.scrollY` is
// permanently 0 and the hook claimed every downward drag on the screen.
//
// It presented as "scrolling up works, scrolling down is broken", which is a
// misleading symptom and worth understanding: the hook releases the gesture the
// moment `dy <= 0`, so dragging one way behaved perfectly and the other way did
// not. That asymmetry is the fingerprint of this bug rather than of a CSS
// overflow problem, and these tests exist so it cannot come back quietly.
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePullToRefresh } from '@/components/common/PullToRefresh/usePullToRefresh';

// jsdom has no layout, so scrollTop never becomes non-zero on its own and
// getComputedStyle needs the overflow stated inline. Both are defined by hand.
function makeScroller({ scrollTop, overflowY = 'auto' }: { scrollTop: number; overflowY?: string }) {
  const scroller = document.createElement('div');
  scroller.style.overflowY = overflowY;
  Object.defineProperty(scroller, 'scrollTop', { value: scrollTop, configurable: true });
  const child = document.createElement('button');
  scroller.appendChild(child);
  document.body.appendChild(scroller);
  return { scroller, child };
}

/**
 * Dispatch a touch sequence from `target`.
 *
 * Dispatched ON the element with bubbles:true rather than on window, because
 * the hook reads `e.target` to decide who owns the gesture — dispatching on
 * window would make every test look like a drag on the page background.
 */
function drag(target: EventTarget, dy: number, dx = 0) {
  const fire = (type: string, x: number, y: number) => {
    const ev = new Event(type, { bubbles: true, cancelable: true });
    Object.defineProperty(ev, 'touches', { value: [{ clientX: x, clientY: y }] });
    target.dispatchEvent(ev);
  };
  fire('touchstart', 100, 200);
  // Past AXIS_LOCK_DEADZONE (6px) in one move so the axis locks vertical.
  fire('touchmove', 100 + dx, 200 + dy);
}

const options = { onRefresh: vi.fn(async () => {}) };

beforeEach(() => {
  document.body.innerHTML = '';
  Object.defineProperty(window, 'scrollY', { value: 0, configurable: true, writable: true });
});

afterEach(() => vi.clearAllMocks());

describe('a downward drag on the page itself', () => {
  it('is claimed — this is the whole feature', async () => {
    // The control. Everything below asserts that the gesture is NOT claimed, so
    // without this one they would all pass against a hook that never fires.
    const { result } = renderHook(() => usePullToRefresh(options));
    act(() => { drag(document.body, 40); });
    await waitFor(() => expect(result.current.phase).toBe('pulling'));
    expect(result.current.pullDistance).toBeGreaterThan(0);
  });
});

describe('a downward drag inside a scrolled list', () => {
  it('is left alone — the list scrolls, the page does not move', async () => {
    const { child } = makeScroller({ scrollTop: 40 });
    const { result } = renderHook(() => usePullToRefresh(options));

    act(() => { drag(child, 40); });

    // Given a moment to be wrong, and it stays idle.
    await new Promise((r) => setTimeout(r, 50));
    expect(result.current.phase).toBe('idle');
    expect(result.current.pullDistance).toBe(0);
  });

  it('is still claimed when that list is at its top', async () => {
    // Deliberately NOT over-fixed. A list sitting at its top has nothing to
    // scroll up to, so the drag belongs to the page — this is what stops the
    // guard from disabling pull-to-refresh on any page containing a list.
    const { child } = makeScroller({ scrollTop: 0 });
    const { result } = renderHook(() => usePullToRefresh(options));

    act(() => { drag(child, 40); });
    await waitFor(() => expect(result.current.phase).toBe('pulling'));
  });

  it('is still claimed when the element is scrolled but cannot scroll', async () => {
    // scrollTop can be non-zero on an overflow:hidden element (set in script).
    // That is not a scroller, and treating it as one would silently kill
    // pull-to-refresh wherever it appears.
    const { child } = makeScroller({ scrollTop: 40, overflowY: 'hidden' });
    const { result } = renderHook(() => usePullToRefresh(options));

    act(() => { drag(child, 40); });
    await waitFor(() => expect(result.current.phase).toBe('pulling'));
  });
});

describe('the existing conditions still hold', () => {
  it('an opted-out subtree keeps its gesture', async () => {
    const panel = document.createElement('div');
    panel.setAttribute('data-no-pull-refresh', '');
    const child = document.createElement('button');
    panel.appendChild(child);
    document.body.appendChild(panel);

    const { result } = renderHook(() => usePullToRefresh(options));
    act(() => { drag(child, 40); });
    await new Promise((r) => setTimeout(r, 50));
    expect(result.current.phase).toBe('idle');
  });

  it('nothing is claimed once the page itself has scrolled', async () => {
    Object.defineProperty(window, 'scrollY', { value: 120, configurable: true, writable: true });
    const { result } = renderHook(() => usePullToRefresh(options));
    act(() => { drag(document.body, 40); });
    await new Promise((r) => setTimeout(r, 50));
    expect(result.current.phase).toBe('idle');
  });

  it('an upward drag is released — which is why the bug looked one-directional', async () => {
    const { result } = renderHook(() => usePullToRefresh(options));
    act(() => { drag(document.body, -40); });
    await new Promise((r) => setTimeout(r, 50));
    expect(result.current.phase).toBe('idle');
  });

  it('a horizontal drag is released to whatever is under the finger', async () => {
    const { result } = renderHook(() => usePullToRefresh(options));
    act(() => { drag(document.body, 4, 40); });
    await new Promise((r) => setTimeout(r, 50));
    expect(result.current.phase).toBe('idle');
  });

  it('is disabled entirely when asked', async () => {
    const { result } = renderHook(() => usePullToRefresh({ ...options, disabled: true }));
    act(() => { drag(document.body, 40); });
    await new Promise((r) => setTimeout(r, 50));
    expect(result.current.phase).toBe('idle');
  });
});
