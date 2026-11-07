// A failed read must not render as "nothing recorded yet". Assigned Workouts
// has a render test for the behaviour; these guards keep the same defect from
// returning to the two screens that cannot be mounted cheaply in jsdom.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { appPath } from '@/__tests__/helpers/app-routes';

const read = (...parts: string[]) => readFileSync(appPath(...parts), 'utf8');

const analytics = read('pt-os', 'clients', '[id]', 'training', 'analytics', 'page.tsx');
const diet = read('pt-os', 'diet-plans', 'page.tsx');

describe('analytics does not turn a failed read into "Nothing logged yet"', () => {
  it('lets the primary reads fail into the error branch', () => {
    expect(analytics).not.toMatch(/volumeSummary\([^)]*\)\.catch\(/);
    expect(analytics).not.toMatch(/sessions\.list\([^)]*\)\.catch\(/);
  });

  it('renders an inline error with a retry', () => {
    expect(analytics).toContain('role="alert"');
    expect(analytics).toMatch(/setLoadError\(/);
    expect(analytics).toMatch(/Retry/);
  });
});

describe('diet plans does not turn a failed read into empty rings', () => {
  it('does not swallow the client-scoped reads', () => {
    expect(diet).not.toMatch(/api\.pt\.client\(clientId\)\.catch/);
    expect(diet).not.toMatch(/assignments\.list\(\{[^}]*\}\)\.catch/);
    expect(diet).not.toMatch(/tracker\.get\(\{[^}]*\}\)\.catch/);
  });

  it('renders an inline error with a retry', () => {
    expect(diet).toContain('role="alert"');
    expect(diet).toMatch(/setLoadError\(/);
    expect(diet).toMatch(/Retry/);
  });
});
