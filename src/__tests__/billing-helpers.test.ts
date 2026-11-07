import { describe, expect, it } from 'vitest';
import type { SubPlan, SubStudio } from '@/lib/api';
import { clientLabel, daysOverdue, filterStudios, needsAction, planPrice } from '@/app/(platform)/platform/_shared/billing';

function studio(patch: Partial<SubStudio> = {}): SubStudio {
  return {
    id: 's1', name: 'Studio', slug: 'studio', logo_url: null,
    status: 'active', subscription_status: 'active', effective_state: 'active', allowed: true,
    trial_ends_at: null, current_period_end: null,
    plan_code: 'starter', plan_name: 'Starter', client_limit: null, client_count: 0,
    is_founder: false, founder_number: null, locked_price_inr: null,
    trial_days_left: null, period_days_left: null, renewal_due: false,
    ...patch,
  };
}

const starter: SubPlan = {
  code: 'starter', name: 'Starter', price_inr: 1499, launch_price_inr: null,
  duration_months: 1, client_limit: 5, best_for: null,
  effective_price_inr: 1299, is_launch: false,
};

describe('needsAction', () => {
  it('leaves a healthy active studio with time left alone', () => {
    expect(needsAction(studio({ period_days_left: 267 }))).toBe(false);
  });

  it('pulls in a pending request, a blocked studio, and a renewal inside a week', () => {
    expect(needsAction(studio({ requested_at: '2026-11-06T00:00:00Z' }))).toBe(true);
    expect(needsAction(studio({ allowed: false, effective_state: 'frozen' }))).toBe(true);
    expect(needsAction(studio({ period_days_left: 3 }))).toBe(true);
    expect(needsAction(studio({ renewal_due: true }))).toBe(true);
  });

  it('pulls in a trial ending inside a week, but not one with time left', () => {
    expect(needsAction(studio({ effective_state: 'trial', trial_days_left: 3 }))).toBe(true);
    expect(needsAction(studio({ effective_state: 'trial', trial_days_left: 14 }))).toBe(false);
  });
});

describe('daysOverdue', () => {
  const now = Date.parse('2026-11-11T00:00:00Z');

  it('counts whole days past the paid period', () => {
    expect(daysOverdue(studio({ current_period_end: '2026-11-01T00:00:00Z' }), now)).toBe(10);
  });

  it('uses the trial end while on trial', () => {
    expect(daysOverdue(studio({ effective_state: 'trial', trial_ends_at: '2026-11-04T00:00:00Z' }), now)).toBe(7);
  });

  it('returns null for a future end or no date', () => {
    expect(daysOverdue(studio({ current_period_end: '2026-12-01T00:00:00Z' }), now)).toBeNull();
    expect(daysOverdue(studio(), now)).toBeNull();
  });
});

describe('planPrice', () => {
  it('prefers a founder’s locked price over the catalogue', () => {
    expect(planPrice(studio({ is_founder: true, locked_price_inr: 999 }), [starter])).toBe(999);
  });

  it('uses the effective catalogue price, then the sticker price', () => {
    expect(planPrice(studio(), [starter])).toBe(1299);
    const { effective_price_inr: _effective, ...stickerOnly } = starter;
    expect(planPrice(studio(), [stickerOnly as SubPlan])).toBe(1499);
  });

  it('returns null when the plan is not in the catalogue', () => {
    expect(planPrice(studio({ plan_code: 'missing' }), [starter])).toBeNull();
  });
});

describe('clientLabel', () => {
  it('does not say “1 clients”', () => {
    expect(clientLabel(0)).toBe('0 clients');
    expect(clientLabel(1)).toBe('1 client');
    expect(clientLabel(2)).toBe('2 clients');
  });
});

describe('filterStudios', () => {
  const list: SubStudio[] = [
    studio({ id: 'a', name: 'Alpha', plan_name: 'Starter', effective_state: 'active', allowed: true, current_period_end: '2026-12-01T00:00:00Z' }),
    studio({ id: 'b', name: 'Beta', plan_name: 'Elite', effective_state: 'frozen', allowed: false, frozen_reason: 'manual' }),
    studio({ id: 'c', name: 'Cee', plan_name: 'Starter', effective_state: 'trial', allowed: true, trial_ends_at: '2026-11-20T00:00:00Z', trial_days_left: 9 }),
    studio({ id: 'd', name: 'Delta', plan_name: 'Growth', effective_state: 'expired', allowed: false, current_period_end: '2026-10-01T00:00:00Z' }),
  ];
  const ids = (rows: SubStudio[]) => rows.map((s) => s.id);

  it('searches name, slug and plan, case-insensitively', () => {
    expect(ids(filterStudios(list, { query: 'elite', filter: 'all', sort: 'name' }))).toEqual(['b']);
    expect(ids(filterStudios(list, { query: 'DELTA', filter: 'all', sort: 'name' }))).toEqual(['d']);
  });

  it('filters frozen and expired without folding one into the other', () => {
    expect(ids(filterStudios(list, { query: '', filter: 'frozen', sort: 'name' }))).toEqual(['b']);
    expect(ids(filterStudios(list, { query: '', filter: 'expired', sort: 'name' }))).toEqual(['d']);
  });

  it('sorts by name and by soonest end date', () => {
    expect(ids(filterStudios(list, { query: '', filter: 'all', sort: 'name' }))).toEqual(['a', 'b', 'c', 'd']);
    expect(ids(filterStudios(list, { query: '', filter: 'all', sort: 'expiry' }))).toEqual(['d', 'c', 'a', 'b']);
  });

  it('puts a pending request first under attention order', () => {
    const withRequest = [...list, studio({ id: 'e', name: 'Echo', requested_at: '2026-11-06T00:00:00Z' })];
    expect(ids(filterStudios(withRequest, { query: '', filter: 'all', sort: 'attention' }))[0]).toBe('e');
  });
});
