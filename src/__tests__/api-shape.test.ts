// The public shape of `api` must survive the split of src/lib/api.ts.
// Legacy surface is pinned as a snapshot; intentional additive domains are
// asserted explicitly so an expected extension is not treated as a regression.
import { describe, it, expect } from 'vitest';
import { api } from '@/lib/api';

function shapeOf(obj: unknown, prefix = '', out: string[] = []): string[] {
  if (obj === null || typeof obj !== 'object') return out;
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'function') {
      const src = String(value);
      const m = /['"`](\/api\/[^'"`$]*)/.exec(src);
      out.push(`${path} → ${m ? m[1] : '(no literal url)'}`);
    } else if (value && typeof value === 'object') shapeOf(value, path, out);
  }
  return out;
}

const legacyApi = Object.fromEntries(Object.entries(api).filter(([key]) => key !== 'commandCenter'));
const legacyShape = shapeOf(legacyApi).sort();

describe('api surface', () => {
  it('preserves every legacy namespace', () => {
    expect(Object.keys(legacyApi).sort()).toMatchSnapshot();
  });

  it('has not lost or renamed a legacy endpoint method', () => {
    expect(legacyShape).toMatchSnapshot();
  });

  it('exposes the intentionally additive Command Center namespace', () => {
    expect(api.commandCenter).toBeDefined();
    expect(typeof api.commandCenter.risk).toBe('function');
    expect(typeof api.commandCenter.actions).toBe('function');
  });

  it('found a realistic number of legacy endpoints, so this cannot pass vacuously', () => {
    expect(legacyShape.length).toBeGreaterThan(200);
  });

  it('still re-exports the helpers consumers import from here', () => {
    return import('@/lib/api').then((mod) => {
      for (const name of ['http', 'ROLES', 'normaliseRole', 'hasRole', 'isAdminOrManager']) {
        expect(mod, `@/lib/api must still export ${name}`).toHaveProperty(name);
      }
    });
  });

  it('exports no more than the established module surface', () => {
    return import('@/lib/api').then((mod) => {
      expect(Object.keys(mod).sort()).toMatchSnapshot();
    });
  });
});
