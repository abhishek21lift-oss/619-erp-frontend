import { describe, expect, it } from 'vitest';
import { heroLine } from '@/components/member/HomeHero';

describe('member Home hero line', () => {
  it('asks to keep a streak alive only while this week is still open', () => {
    expect(heroLine({ streak: 8, trainedThisWeek: false, daysLeft: 35 })).toBe('8-week streak. Keep it alive this week.');
    expect(heroLine({ streak: 8, trainedThisWeek: true, daysLeft: 35 })).toBe('8-week streak — this week counts. Nice work.');
  });

  it('only says "you trained this week" when the member did', () => {
    expect(heroLine({ streak: 1, trainedThisWeek: true, daysLeft: 35 })).toBe('You trained this week. Make it two.');
    expect(heroLine({ streak: 1, trainedThisWeek: false, daysLeft: 35 })).toBe('Train this week to keep your streak going.');
  });

  it('puts the plan running out ahead of the streak', () => {
    expect(heroLine({ streak: 8, trainedThisWeek: true, daysLeft: 0 })).toBe('Your plan has ended — renew to keep going.');
    expect(heroLine({ streak: 8, trainedThisWeek: true, daysLeft: 1 })).toBe('1 day left on your plan. Finish strong.');
  });

  it('falls back to an invitation when nothing is known yet', () => {
    expect(heroLine({ streak: null, trainedThisWeek: null, daysLeft: null })).toBe("Let's make today count.");
    expect(heroLine({ streak: 0, trainedThisWeek: false, daysLeft: 40 })).toBe("Let's make today count.");
  });
});
