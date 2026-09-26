import { describe, expect, it } from 'vitest';
import { milestones, nextMilestone, remainingLabel, tonnes } from '@/components/member/milestones';
import type { MeAchievements } from '@/lib/api';

function ach(over: Partial<MeAchievements['totals']> = {}, longest = 0): MeAchievements {
  return {
    training: { current: longest, longest, this_week: false },
    checkins: { current: 0, longest: 0, this_week: false },
    totals: { sessions: 0, sets: 0, volume_kg: 0, prs: 0, visits: 0, first_session: null, ...over },
    records: [],
    recent_prs: [],
  };
}

describe('member milestones', () => {
  it('earns nothing with nothing logged', () => {
    expect(milestones(ach()).some((m) => m.earned)).toBe(false);
  });

  it('earns exactly the thresholds that were reached', () => {
    const list = milestones(ach({ sessions: 25, prs: 3, volume_kg: 12_000 }, 4));
    const earned = list.filter((m) => m.earned).map((m) => m.id);
    expect(earned).toEqual([
      'sessions-1', 'sessions-10', 'sessions-25',
      'prs-1',
      'volume-1000', 'volume-10000',
      'streak-4',
    ]);
  });

  it('next milestone is the locked one closest to done', () => {
    // 24/25 sessions (96%) beats 3/10 PRs (30%)
    const next = nextMilestone(milestones(ach({ sessions: 24, prs: 3 })));
    expect(next?.id).toBe('sessions-25');
    expect(next && remainingLabel(next)).toBe('1 session to go');
  });

  it('with nothing started, the next milestone is the first one', () => {
    expect(nextMilestone(milestones(ach()))?.id).toBe('sessions-1');
  });

  it('formats tonnes', () => {
    expect(tonnes(870)).toBe('0.9 t');
    expect(tonnes(12_400)).toBe('12 t');
  });
});
