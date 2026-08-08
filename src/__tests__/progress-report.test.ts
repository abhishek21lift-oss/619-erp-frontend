// Screening's "Progress Report" used to open /pt-os/reports — PT revenue and
// trainer commissions, a business report with no client in it at all. Found
// in a static audit of the Screening sidebar section: the label promised a
// client's own progress, and every other item in that group is about a
// client's body or readiness.
//
// The fix is not deleting the revenue page — it's real, admin-facing data —
// it's giving "Progress Report" a destination that matches its name, and
// giving the revenue page an honest home. Both are pinned here so a future
// edit can't quietly repoint one without the other.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NAV_GROUPS } from '@/lib/nav-config';

const src = (...p: string[]) => readFileSync(join(process.cwd(), 'src', ...p), 'utf8');

describe('"Progress Report" opens a client\'s progress, not PT revenue', () => {
  const screening = NAV_GROUPS.find((g) => g.id === 'progress-tracking')!;
  const insights = NAV_GROUPS.find((g) => g.id === 'insights')!;

  it('Screening\'s Progress Report points at the client-picker landing page', () => {
    const item = screening.items.find((i) => i.label === 'Progress Report');
    expect(item?.href).toBe('/pt-os/progress-report');
  });

  it('the landing page sends a chosen client to their real training analytics', () => {
    const page = src('app', 'pt-os', 'progress-report', 'page.tsx');
    expect(page).toContain("from '@/components/pt-os/shared/ClientPicker'");
    expect(page).toMatch(/hrefFor=\{\(id\) => `\/pt-os\/clients\/\$\{id\}\/training\/analytics`\}/);
  });

  it('the PT revenue report still exists, reachable from Insights instead', () => {
    // Not renamed, not deleted — just no longer wearing a client's name in
    // Screening. api.pt.revenue()/trainerPerformance() are unchanged; only
    // where the sidebar points changed.
    const item = insights.items.find((i) => i.href === '/pt-os/reports');
    expect(item).toBeTruthy();
    expect(item?.label).not.toMatch(/progress/i);
    expect(src('app', 'pt-os', 'reports', 'page.tsx')).toContain('api.pt.revenue()');
  });

  it('nothing in Screening still points at the revenue page', () => {
    const offenders = screening.items.filter((i) => i.href === '/pt-os/reports');
    expect(offenders).toEqual([]);
  });
});
