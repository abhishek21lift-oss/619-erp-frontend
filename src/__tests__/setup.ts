import '@testing-library/jest-dom';
import { webcrypto } from 'node:crypto';

if (typeof globalThis.crypto === 'undefined') {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, writable: true });
}

// jsdom 29 doesn't expose localStorage on the window by default for
// opaque origins. Provide a minimal in-memory implementation that
// matches the subset of the API used by the app + tests.
if (typeof window !== 'undefined' && !window.localStorage) {
  const mem = new Map<string, string>();
  const fake: Storage = {
    get length() { return mem.size; },
    clear() { mem.clear(); },
    getItem(k) { return mem.has(k) ? mem.get(k)! : null; },
    key(i) { return Array.from(mem.keys())[i] ?? null; },
    removeItem(k) { mem.delete(k); },
    setItem(k, v) { mem.set(k, String(v)); },
  };
  Object.defineProperty(window, 'localStorage', { value: fake, writable: true, configurable: true });
}

// jsdom implements no layout, so it ships no ResizeObserver. Components that
// measure themselves — the client tab strip, the login page's Google button —
// construct one unconditionally, because every browser they run in has it.
// Without this they throw during layout effects and the failure looks like a
// component bug rather than a missing test global.
//
// It observes nothing that can change (there is no layout) but does fire the
// callback once on observe(), which is what a real ResizeObserver does and
// what a test stubbing element dimensions needs in order to see them read.
//
// The entry it fires WITH matters. This used to pass an empty array, on the
// grounds that there was nothing to report — but a real ResizeObserver never
// calls back with zero entries, so anything that reads entries[0] crashed
// here rather than in its own code. recharts' ResponsiveContainer was the
// first to do it, and the stack pointed at this file, which is exactly the
// "looks like a component bug" failure the stub exists to avoid.
//
// So it now reports the observed element at whatever size the test has
// stubbed onto it, and zeroes when nothing is stubbed.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    private cb: ResizeObserverCallback;
    constructor(cb: ResizeObserverCallback) { this.cb = cb; }
    observe(target: Element) {
      const rect = target?.getBoundingClientRect?.()
        ?? { width: 0, height: 0, top: 0, left: 0, bottom: 0, right: 0, x: 0, y: 0 };
      const entry = {
        target,
        contentRect: rect,
        borderBoxSize: [{ inlineSize: rect.width, blockSize: rect.height }],
        contentBoxSize: [{ inlineSize: rect.width, blockSize: rect.height }],
        devicePixelContentBoxSize: [{ inlineSize: rect.width, blockSize: rect.height }],
      } as unknown as ResizeObserverEntry;
      this.cb([entry], this as unknown as ResizeObserver);
    }
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

// Same reason: no layout means no scrolling, so jsdom leaves Element.scrollTo
// unimplemented. Recording the call is enough — a test asserting that a
// far-right tab gets scrolled into view cares that it was asked for, not that
// pixels moved.
if (typeof Element !== 'undefined' && !Element.prototype.scrollTo) {
  Element.prototype.scrollTo = function scrollTo() { /* no layout to scroll */ };
}
