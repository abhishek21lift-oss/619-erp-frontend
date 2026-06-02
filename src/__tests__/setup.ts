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
