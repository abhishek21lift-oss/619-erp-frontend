// The shape of the trainer's sidebar after the 2026-10-21 IA pass.
//
// The nav used to be a module map: ten accordions, a fifteen-item "Screening"
// group whose items were per-client forms, and duplicate labels pointing at
// different tools. These pin the properties that made it a map of the day
// instead: the daily destinations are direct links, per-client forms live in
// the client record, and no two trainer-facing rows read the same.

import { describe, expect, it } from 'vitest';
import { NAV_GROUPS, PINNED_ITEMS, findItemByPath, isVisibleForRole } from '@/lib/nav-config';

const trainerItems = () =>
  [...PINNED_ITEMS, ...NAV_GROUPS.flatMap((g) => g.items)]
    .filter((i) => isVisibleForRole(i, 'trainer'));

describe('the first screenful is the trainer\'s day', () => {
  it('pins Today, My Schedule and Check In as direct links', () => {
    expect(PINNED_ITEMS.map((i) => i.href)).toEqual([
      '/pt-os/today',
      '/pt-os/my-schedule',
      '/checkin/qr-scanner',
    ]);
  });

  it('keeps them out of the accordions they used to be buried in', () => {
    const grouped = NAV_GROUPS.flatMap((g) => g.items.map((i) => i.href));
    for (const href of ['/pt-os/today', '/pt-os/my-schedule', '/checkin/qr-scanner']) {
      expect(grouped).not.toContain(href);
    }
  });
});

describe('per-client forms belong to the client record', () => {
  it('has no global entry for the assessment suite', () => {
    const grouped = NAV_GROUPS.flatMap((g) => g.items.map((i) => i.href));
    for (const href of [
      '/pt-os/informed-consent', '/pt-os/parq', '/pt-os/interview', '/pt-os/goals',
      '/pt-os/assessment', '/pt-os/lifestyle-assessment', '/pt-os/nutrition-assessment',
      '/pt-os/mobility-assessment', '/pt-os/posture-assessment', '/pt-os/strength-tracking',
      '/pt-os/progress-tracking-setup', '/pt-os/progress-photos',
    ]) {
      expect(grouped, href).not.toContain(href);
    }
  });

  it('keeps one progress hub, one report and one weekly check-in', () => {
    const progress = NAV_GROUPS.find((g) => g.id === 'progress')!;
    expect(progress.items.map((i) => i.href)).toEqual([
      '/pt-os/progress',
      '/pt-os/progress-report',
      '/pt-os/weekly-checkin',
    ]);
  });
});

describe('one label, one tool', () => {
  it('has no duplicate trainer-facing labels', () => {
    const labels = trainerItems().map((i) => i.label.toLowerCase());
    expect(labels.filter((l, idx) => labels.indexOf(l) !== idx)).toEqual([]);
  });

  it('names the AI generator as the programme tool and drops the rule-based entry', () => {
    const hrefs = trainerItems().map((i) => i.href);
    expect(hrefs).toContain('/ai/workout-generator');
    expect(hrefs).not.toContain('/pt-os/workout-generator');
    expect(trainerItems().find((i) => i.href === '/ai/workout-generator')?.label).toBe('AI Workout Generator');
  });
});

describe('groups describe their contents', () => {
  it('has no one-link Packages accordion; packages sit inside Finance', () => {
    expect(NAV_GROUPS.map((g) => g.id)).not.toContain('subscription');
    const finance = NAV_GROUPS.find((g) => g.id === 'finance')!;
    const packages = finance.items.find((i) => i.href === '/subscription/packages');
    expect(packages).toBeTruthy();
    // The item keeps its own key: switching packages off must still hide it.
    expect(packages?.feature).toBe('packages');
  });

  it('uses ids that match their labels', () => {
    expect(NAV_GROUPS.map((g) => g.id)).toEqual([
      'clients', 'sessions', 'programs', 'progress', 'finance', 'insights',
      'communication', 'my-account', 'ai-coach',
    ]);
    expect(NAV_GROUPS.find((g) => g.id === 'insights')?.label).toBe('Reports');
  });
});

describe('the active row is the longest match', () => {
  it('does not light All Clients on the birthdays page', () => {
    expect(findItemByPath('/pt-os/clients/birthdays')?.href).toBe('/pt-os/clients/birthdays');
    expect(findItemByPath('/pt-os/clients')?.href).toBe('/pt-os/clients');
  });

  it('still lights All Clients on a client record', () => {
    expect(findItemByPath('/pt-os/clients/abc-123')?.href).toBe('/pt-os/clients');
  });
});
