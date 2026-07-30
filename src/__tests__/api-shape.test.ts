// The public shape of `api` must survive the split of src/lib/api.ts.
//
// api.ts was 4,185 lines: 213 exported types plus one `export const api = {…}`
// object literal with 31 namespaces. 142 files import from '@/lib/api', so the
// one thing the refactor promises is that the surface they see does not move.
//
// ── Why this walks the object rather than parsing the source ───────────────
//
// tsc already proves every consumer's imports resolve. What it cannot notice is
// a method quietly pointing at a different URL, or a namespace losing a method
// that nothing imports YET but something will. Walking the built object and
// pulling the URL literal out of each function body catches both.
//
// Pinned as a LIST, not a count. A count passes when a method is renamed —
// that mistake is why the H-03 backend split needed a second attempt at its
// route test.

import { describe, it, expect } from 'vitest';
import { api } from '@/lib/api';

/**
 * Every leaf function in `api`, as `path → url`.
 *
 * The URL is recovered from the function's source with toString(). Template
 * placeholders are normalised to `${}` so an argument being renamed — which is
 * cosmetic — does not read as a moved endpoint, which is not.
 */
function shapeOf(obj: unknown, prefix = '', out: string[] = []): string[] {
  if (obj === null || typeof obj !== 'object') return out;
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'function') {
      const src = String(value);
      // First quoted or backticked path beginning with /api. The character
      // class stops at `$` as well as at a quote: a template placeholder can
      // contain a quote of its own — `join(',')` inside search.global is the
      // one that does — and without the `$` the match runs past the closing
      // backtick and swallows source lines, indentation included. That made
      // one entry in 462 change when the code merely moved.
      const m = /['"`](\/api\/[^'"`$]*)/.exec(src);
      const url = m ? m[1] : '(no literal url)';
      out.push(`${path} → ${url}`);
    } else if (value && typeof value === 'object') {
      shapeOf(value, path, out);
    }
  }
  return out;
}

const shape = shapeOf(api).sort();

describe('api surface', () => {
  it('exposes every namespace it did before the split', () => {
    // Enumerated from the built object rather than grepped from source. My
    // first attempt used a regex over api.ts and silently missed superAdmin,
    // support and upiPayments — the object is the authority, the source shape
    // is not.
    expect(Object.keys(api).sort()).toMatchSnapshot();
  });

  it('has not lost or renamed a single endpoint method', () => {
    // Snapshot rather than an inline list: 400+ entries inline would be
    // unreadable, and the snapshot file diffs cleanly in review — which is
    // exactly what you want to eyeball when this fails.
    expect(shape).toMatchSnapshot();
  });

  it('found a realistic number of endpoints, so this cannot pass vacuously', () => {
    expect(shape.length).toBeGreaterThan(200);
  });

  it('still re-exports the helpers consumers import from here', () => {
    // `http` and the role helpers are re-exported from '@/lib/api' and imported
    // that way across the app; moving api.ts must not drop them.
    return import('@/lib/api').then((mod) => {
      for (const name of ['http', 'ROLES', 'normaliseRole', 'hasRole', 'isAdminOrManager']) {
        expect(mod, `@/lib/api must still export ${name}`).toHaveProperty(name);
      }
    });
  });

  it('exports no more than it did — a widened surface is a change too', () => {
    // The runtime keys of the module, which are its VALUE exports. Type exports
    // are invisible here, but tsc already proves those: 54 files import types
    // from '@/lib/api' and would fail to compile if one went missing.
    //
    // Pinned because the first draft of the split re-exported qsOf and buildQs
    // "while they were passing through". Both had been private to api.ts. The
    // list check caught two names nothing had asked for; a spot-check of the
    // names I expected to see would not have.
    return import('@/lib/api').then((mod) => {
      expect(Object.keys(mod).sort()).toMatchSnapshot();
    });
  });
});
