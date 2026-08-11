// Scroll restoration across a back navigation into a page that fetches on mount.
//
// jsdom has no layout, so the bug cannot be reproduced by rendering components:
// every document is 0px tall and every scroll position is 0. What CAN be
// reproduced faithfully is the physics that actually breaks it, and that is
// where the whole bug lives:
//
//   1. a scroll offset is clamped to the document's current height
//   2. the document is SHORT at the moment the history entry is restored,
//      because the page renders a spinner while it fetches
//   3. it grows to its old height a moment later, by which time the position
//      has already been thrown away
//
// So the harness below models a scroller with a settable height, and the first
// test proves the harness is real by making a one-shot restore — what the
// browser and the App Router both do — fail in it. Everything after that is
// measured against a harness with a demonstrated failure, not an assumed one.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  installScrollRestoration,
  __resetScrollRestorationForTests,
} from '@/lib/scroll-restoration';

const VIEWPORT = 800;

/** Callbacks registered by the code under test, fired when the page resizes. */
let resizeCallbacks: Array<() => void> = [];
let docHeight = 0;
let scrollY = 0;

function maxScroll(): number {
  return Math.max(0, docHeight - VIEWPORT);
}

/** The document changing height — a spinner replaced by a list, an image
 *  loading, a section expanding. Clamps the current offset exactly as a browser
 *  does, then notifies observers. */
function setDocHeight(height: number): void {
  docHeight = height;
  if (scrollY > maxScroll()) {
    scrollY = maxScroll();
    window.dispatchEvent(new Event('scroll'));
  }
  resizeCallbacks.forEach((cb) => cb());
}

/** A user (or the router) moving the page. */
function scrollTo(y: number): void {
  scrollY = Math.max(0, Math.min(y, maxScroll()));
  window.dispatchEvent(new Event('scroll'));
}

// ── session history ─────────────────────────────────────────────────────────
//
// Modelled here rather than driven through `window.history.back()`, because
// jsdom's back() is a no-op: measured, it leaves `history.state` untouched and
// fires no popstate at all. Since the whole mechanism is keyed on per-entry
// state surviving a traversal, a harness that cannot traverse would have tested
// nothing. So the stack is kept explicitly and each entry's state is snapshotted
// on the way out — which is exactly what a browser does, and what makes the
// minted key come BACK on the return trip.
const stack: Array<{ url: string; state: unknown }> = [];
let index = -1;

function initHistory(url: string): void {
  stack.length = 0;
  window.history.replaceState({}, '', url);
  stack.push({ url, state: window.history.state });
  index = 0;
}

/** Push a new history entry, the way a forward navigation does. */
function pushEntry(url: string): void {
  stack[index] = { url: stack[index].url, state: window.history.state };
  window.history.pushState({}, '', url);
  stack.length = index + 1;
  stack.push({ url, state: window.history.state });
  index += 1;
}

/** Go back, restoring the previous entry's state as the browser does, and fire
 *  the event the browser fires. Deliberately does NOT touch the DOM: at popstate
 *  time the outgoing page is still mounted and still tall, which is the trap
 *  that a naive one-shot restore falls into. */
function goBack(): void {
  stack[index] = { url: stack[index].url, state: window.history.state };
  index -= 1;
  const entry = stack[index];
  window.history.replaceState(entry.state, '', entry.url);
  window.dispatchEvent(new PopStateEvent('popstate', { state: entry.state }));
}

beforeEach(() => {
  vi.useFakeTimers();
  resizeCallbacks = [];
  docHeight = 0;
  scrollY = 0;
  __resetScrollRestorationForTests();
  window.sessionStorage.clear();
  // jsdom keeps one window for the whole file, so scrollRestoration survives
  // between tests. Reset it, or the teardown assertion measures the previous
  // test's leftovers instead of the browser default.
  window.history.scrollRestoration = 'auto';
  initHistory('/pt-os/clients');

  Object.defineProperty(window, 'innerHeight', { value: VIEWPORT, configurable: true });
  Object.defineProperty(window, 'scrollY', { get: () => scrollY, configurable: true });
  Object.defineProperty(document.documentElement, 'scrollHeight', {
    get: () => docHeight,
    configurable: true,
  });

  window.scrollTo = ((arg: number | ScrollToOptions) => {
    scrollTo(typeof arg === 'number' ? arg : (arg?.top ?? 0));
  }) as typeof window.scrollTo;

  vi.stubGlobal(
    'ResizeObserver',
    class {
      private cb: () => void;
      constructor(cb: () => void) {
        this.cb = cb;
      }
      observe() {
        resizeCallbacks.push(this.cb);
      }
      disconnect() {
        resizeCallbacks = resizeCallbacks.filter((c) => c !== this.cb);
      }
      unobserve() {
        this.disconnect();
      }
    },
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

/** The page the user scrolled: a long client list, fully rendered. */
function renderTallList(): void {
  setDocHeight(3000);
}

/** What the same route looks like for the first moment on the way back:
 *  useAsync fetches on mount with no cache, so it is a py-24 spinner. */
function renderSpinner(): void {
  setDocHeight(600);
}

/** The page navigated forward TO. Taller than the offset we are restoring, on
 *  purpose: it is what is still on screen when popstate fires, so a one-shot
 *  restore appears to work at that instant. That false success is the bug. */
function renderProfile(): void {
  setDocHeight(2500);
}

describe('BUG #2 reproduction — the harness must actually fail', () => {
  it('a one-shot restore at popstate time is lost when the page renders a spinner', () => {
    // No installScrollRestoration here. This is the naive mechanism — what the
    // browser does with scrollRestoration:'auto', and what a
    // `scrollTo(saved)` inside a navigation effect does.
    renderTallList();
    scrollTo(720);
    const saved = scrollY;
    expect(saved).toBe(720);

    pushEntry('/pt-os/clients/c1');
    renderProfile();

    // Back. The outgoing DOM is still up, so the restore "succeeds"...
    goBack();
    window.scrollTo({ top: saved, behavior: 'instant' });
    expect(scrollY).toBe(720);

    // ...and then React renders the clients page, which is a spinner.
    renderSpinner();
    expect(scrollY).toBe(0); // clamped — the position is gone

    // Data lands. Too late: nothing is left to restore from.
    renderTallList();
    expect(scrollY).toBe(0);
  });
});

describe('installScrollRestoration', () => {
  it('restores the saved offset after the page grows back to its old height', () => {
    const teardown = installScrollRestoration();

    renderTallList();
    scrollTo(720);

    pushEntry('/pt-os/clients/c1');
    renderProfile();
    scrollTo(300);

    goBack();
    renderSpinner();
    renderTallList();

    expect(scrollY).toBe(720);
    teardown();
  });

  it('holds the position through several growth steps, not just the first', () => {
    // Real pages arrive in pieces: the header, then the list, then images.
    const teardown = installScrollRestoration();

    setDocHeight(4000);
    scrollTo(2400);
    pushEntry('/pt-os/clients/c1');
    setDocHeight(900);

    goBack();
    setDocHeight(600);
    expect(scrollY).toBe(0); // honestly clamped while the page is short
    setDocHeight(1500);
    setDocHeight(2600);
    setDocHeight(4000);

    expect(scrollY).toBe(2400);
    teardown();
  });

  it('leaves a forward navigation at the top', () => {
    // The absence of a saved position is what puts a new page at the top.
    // Nothing here calls scrollTo(0,0), which would also fire on the way back.
    const teardown = installScrollRestoration();

    renderTallList();
    scrollTo(720);

    pushEntry('/pt-os/clients/c1');
    scrollTo(0); // the router's own scroll-to-top on a new route
    setDocHeight(2000);
    setDocHeight(4000);

    expect(scrollY).toBe(0);
    teardown();
  });

  it('does not leak one entry\'s position onto another entry for the same route', () => {
    // The same route can sit on the stack twice. Positions are keyed per
    // history entry, so /clients reached a second time must not inherit the
    // first visit's offset.
    const teardown = installScrollRestoration();

    renderTallList();
    scrollTo(900);
    const firstKey = (window.history.state as Record<string, unknown>)['__mps_scroll_key'];

    pushEntry('/pt-os/clients'); // same URL, new entry
    scrollTo(0);
    setDocHeight(3000);
    scrollTo(150);
    const secondKey = (window.history.state as Record<string, unknown>)['__mps_scroll_key'];

    expect(secondKey).toBeTypeOf('string');
    expect(secondKey).not.toBe(firstKey);
    expect(scrollY).toBe(150);
    teardown();
  });

  it('stops chasing the page as soon as the user scrolls', () => {
    // A restore must never fight a person. If they start reading somewhere
    // else while the page is still filling in, the page stays where they put it.
    const teardown = installScrollRestoration();

    renderTallList();
    scrollTo(720);
    pushEntry('/pt-os/clients/c1');
    renderProfile();

    goBack();
    renderSpinner();
    setDocHeight(1000); // the first page of results — enough to scroll a little

    window.dispatchEvent(new Event('wheel'));
    scrollTo(40);

    renderTallList(); // the rest lands after the user took over

    // Without the input hand-off this would be 720: the observer would still be
    // running and would yank the page down as the list filled in.
    expect(scrollY).toBe(40);
    teardown();
  });

  it('gives up after the growth window instead of observing forever', () => {
    const teardown = installScrollRestoration();

    renderTallList();
    scrollTo(720);
    pushEntry('/pt-os/clients/c1');
    renderProfile();

    goBack();
    renderSpinner();

    vi.advanceTimersByTime(3500);
    expect(resizeCallbacks).toHaveLength(0);

    // A page that finally arrives long after the window has closed does not
    // get yanked out from under whatever the user is now doing.
    renderTallList();
    expect(scrollY).toBe(0);
    teardown();
  });

  it('uses behavior:instant so the smooth-scroll rule cannot animate the restore', () => {
    // globals.css sets `scroll-behavior: smooth` on <html>. Without this the
    // restore would be a visible slide down the page on every Back.
    const spy = vi.fn();
    window.scrollTo = ((arg: number | ScrollToOptions) => {
      spy(arg);
      scrollTo(typeof arg === 'number' ? arg : (arg?.top ?? 0));
    }) as typeof window.scrollTo;

    const teardown = installScrollRestoration();
    renderTallList();
    scrollTo(720);
    pushEntry('/pt-os/clients/c1');
    renderProfile();
    goBack();
    renderSpinner();
    renderTallList();

    expect(spy).toHaveBeenCalled();
    for (const [arg] of spy.mock.calls) {
      expect(arg).toMatchObject({ behavior: 'instant' });
    }
    teardown();
  });

  it('takes scroll restoration off the browser so the two cannot fight', () => {
    const teardown = installScrollRestoration();
    expect(window.history.scrollRestoration).toBe('manual');
    teardown();
    expect(window.history.scrollRestoration).toBe('auto');
  });

  it('survives a reload, which the browser no longer restores for us', () => {
    // Setting scrollRestoration:'manual' means the browser stops restoring on
    // reload too. That would be a regression, so positions are parked in
    // sessionStorage on pagehide and the history entry carries its key across.
    const first = installScrollRestoration();
    renderTallList();
    scrollTo(720);
    window.dispatchEvent(new Event('pagehide'));
    first();

    // A reload: fresh module state, same history entry, page starts short.
    __resetScrollRestorationForTests();
    docHeight = 0;
    scrollY = 0;
    resizeCallbacks = [];

    const second = installScrollRestoration();
    renderSpinner();
    renderTallList();

    expect(scrollY).toBe(720);
    second();
  });

  it('ignores a trivial scroll rather than storing a position for it', () => {
    const teardown = installScrollRestoration();
    renderTallList();
    scrollTo(4); // below MIN_SAVE
    pushEntry('/pt-os/clients/c1');
    renderProfile();

    goBack();
    renderSpinner();
    renderTallList();

    expect(scrollY).toBe(0);
    teardown();
  });

  it('removes every listener on teardown', () => {
    const teardown = installScrollRestoration();
    renderTallList();
    scrollTo(720);
    teardown();

    // After teardown, a popstate must not move the page.
    scrollTo(0);
    pushEntry('/pt-os/clients/c1');
    goBack();
    renderTallList();
    expect(scrollY).toBe(0);
  });
});
