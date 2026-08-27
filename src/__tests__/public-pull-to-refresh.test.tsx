// PublicPullToRefresh — the signed-out pages' pull-to-refresh.
//
// The shared usePullToRefresh hook is already pinned down by
// pull-to-refresh-gesture.test.tsx (axis-lock, threshold, opted-out subtrees,
// scrolled containers, disabled). These tests cover what is public-specific:
// the adapter is mounted on the public pages, never translates content, and
// releases into a real `window.location.reload()` — exactly once per gesture.
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, act, waitFor, cleanup } from '@testing-library/react';
import PublicPullToRefresh from '@/components/PublicPullToRefresh';

/**
 * Dispatch a touch sequence from `target`, mirroring the shared gesture suite.
 * jsdom has no TouchEvent, so a plain Event with a synthetic `touches` array is
 * used — the hook only reads `clientX/clientY` off the first touch.
 */
function fire(type: string, target: EventTarget, x = 100, y = 200) {
  const ev = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(ev, 'touches', { value: [{ clientX: x, clientY: y }] });
  target.dispatchEvent(ev);
}

function pull(target: EventTarget, dy: number, dx = 0) {
  fire('touchstart', target);
  fire('touchmove', target, 100 + dx, 200 + dy);
}

function release(target: EventTarget) {
  target.dispatchEvent(new Event('touchend', { bubbles: true }));
}

const reload = vi.fn();

beforeEach(() => {
  document.body.innerHTML = '';
  Object.defineProperty(window, 'scrollY', { value: 0, configurable: true, writable: true });
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...window.location, reload },
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('PublicPullToRefresh', () => {
  it('renders the live region and nothing audible when idle', () => {
    const { getByRole } = render(<PublicPullToRefresh />);
    expect(getByRole('status').textContent).toBe('');
  });

  it('releases below the threshold — no refresh', async () => {
    render(<PublicPullToRefresh />);
    act(() => { pull(document.body, 40); });
    act(() => { release(document.body); });
    await new Promise((r) => setTimeout(r, 80));
    expect(reload).not.toHaveBeenCalled();
  });

  it('releases past the threshold — a full page reload', async () => {
    render(<PublicPullToRefresh />);
    act(() => { pull(document.body, 100); });
    act(() => { release(document.body); });
    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
  });

  it('never refreshes twice for repeated gestures', async () => {
    render(<PublicPullToRefresh />);
    act(() => { pull(document.body, 100); });
    act(() => { release(document.body); });
    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    // A second gesture while the first is still resolving/succeeding is ignored.
    act(() => { pull(document.body, 120); });
    act(() => { release(document.body); });
    await new Promise((r) => setTimeout(r, 80));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('ignores a pull that starts inside an opted-out subtree (form / drawer)', async () => {
    const form = document.createElement('div');
    form.setAttribute('data-no-pull-refresh', '');
    const input = document.createElement('input');
    form.appendChild(input);
    document.body.appendChild(form);

    render(<PublicPullToRefresh />);
    act(() => { pull(input, 100); });
    act(() => { release(input); });
    await new Promise((r) => setTimeout(r, 80));
    expect(reload).not.toHaveBeenCalled();
  });

  it('never activates once the page has scrolled', async () => {
    Object.defineProperty(window, 'scrollY', { value: 120, configurable: true, writable: true });
    render(<PublicPullToRefresh />);
    act(() => { pull(document.body, 100); });
    act(() => { release(document.body); });
    await new Promise((r) => setTimeout(r, 80));
    expect(reload).not.toHaveBeenCalled();
  });

  it('desktop pointer input never activates it', async () => {
    render(<PublicPullToRefresh />);
    // A real mouse drag emits mouse/pointer events only — never touch events —
    // and the hook listens for touch events alone, so nothing can arm it.
    const down = new Event('pointerdown', { bubbles: true, cancelable: true });
    const move = new Event('pointermove', { bubbles: true, cancelable: true });
    const up = new Event('pointerup', { bubbles: true, cancelable: true });
    document.body.dispatchEvent(down);
    document.body.dispatchEvent(move);
    document.body.dispatchEvent(up);
    await new Promise((r) => setTimeout(r, 80));
    expect(reload).not.toHaveBeenCalled();
  });
});