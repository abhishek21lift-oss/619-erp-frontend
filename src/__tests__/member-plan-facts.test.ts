import { describe, expect, it } from 'vitest';
import { planFacts } from '@/components/member/planDates';
import type { MeMembership, MeProfile } from '@/lib/api';

const profile: Pick<MeProfile, 'package_type' | 'status' | 'pt_start_date' | 'pt_end_date'> = {
  package_type: 'PT 12',
  status: 'active',
  pt_start_date: '2026-01-01',
  pt_end_date: '2026-03-01',
};

const row = (over: Partial<MeMembership> = {}): MeMembership => ({
  id: 'm1',
  package_type: 'PT 24',
  base_amount: 24000,
  discount: 0,
  final_amount: 24000,
  paid_amount: 24000,
  balance_amount: 0,
  monthly_pt_amount: 0,
  pt_start_date: '2026-02-01',
  pt_end_date: '2026-04-01',
  duration_months: 3,
  status: 'active',
  ...over,
});

describe('planFacts', () => {
  it('reads the package record when it loaded', () => {
    const facts = planFacts({ plan: row(), planLoaded: true, profile });
    expect(facts.title).toBe('PT 24');
    expect(facts.status).toBe('active');
    expect(facts.balance).toBe(0);
    expect(facts.start).toBe('2026-02-01');
    expect(facts.end).toBe('2026-04-01');
  });

  it('does not invent a paid-up balance when the membership read failed', () => {
    const facts = planFacts({ plan: null, planLoaded: false, profile });
    expect(facts.balance).toBeNull();
    expect(facts.title).toBe('PT 12');
    expect(facts.status).toBe('active');
    expect(facts.end).toBe('2026-03-01');
  });

  it('treats a loaded row with no balance as unknown, not zero', () => {
    const facts = planFacts({ plan: row({ balance_amount: undefined as unknown as number }), planLoaded: true, profile });
    expect(facts.balance).toBeNull();
  });

  it('never invents a package or a status from nothing', () => {
    const facts = planFacts({
      plan: null,
      planLoaded: true,
      profile: { package_type: null, status: null, pt_start_date: null, pt_end_date: null },
    });
    expect(facts.title).toBeNull();
    expect(facts.status).toBeNull();
    expect(facts.balance).toBeNull();
    expect(facts.end).toBeNull();
  });
});
