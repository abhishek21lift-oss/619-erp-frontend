// The month's target: what the card claims, and when.
//
// Two things here are easy to get quietly wrong and impossible to see in a
// screenshot.
//
// The tone is PACE-AWARE, not a flat threshold. 40% of target on the 5th is
// fine and 40% on the 28th is not, and a card that called both "behind" would
// be tuned out by the end of the first week. The boundaries are arithmetic on
// two numbers, so they belong in a test rather than in a reviewer's head.
//
// The percentage is NOT clamped. The revenue page clamped it and rendered
// "100% OF TARGET" directly above "₹20,000 collected of ₹1,000 target" — the
// card contradicted itself and the wrong half was in the largest type. Only
// the ring's stroke may clamp; a ring cannot draw past full, but the figure is
// the claim being made.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { targetTone, daysLeftInMonth } from '@/components/dashboards/PtOsDashboard';

// A 30-day month, for readable arithmetic.
const M = 30;

describe('targetTone — the status phrase is earned', () => {
  it('calls a beaten target smashed regardless of how much month is left', () => {
    expect(targetTone(100, 29, M).label).toBe('Target smashed');
    expect(targetTone(2000, 1, M).label).toBe('Target smashed');
  });

  it('is on track when collection has kept up with the calendar', () => {
    // Half the month gone, half the target in.
    expect(targetTone(50, 15, M).label).toBe('On track');
    // A fifth of the month gone and a quarter of the target in — ahead.
    expect(targetTone(25, 24, M).label).toBe('On track');
  });

  it('does not punish a studio on day one', () => {
    // Nothing collected yet, nothing elapsed. Anything but "on track" here
    // would make the card cry wolf every 1st of the month.
    expect(targetTone(0, M, M).label).toBe('On track');
  });

  it('warns before it alarms', () => {
    // Half the month gone (pace 50). 40 is above 0.7 * 50 = 35, so slightly
    // behind; 30 is below it, so behind pace.
    expect(targetTone(40, 15, M).label).toBe('Slightly behind');
    expect(targetTone(30, 15, M).label).toBe('Behind pace');
  });

  it('gets sharper as the month runs out on the same percentage', () => {
    // 40% of target reads three different ways depending on the date. This is
    // the whole reason the tone takes days-left at all.
    expect(targetTone(40, 24, M).label).toBe('On track');       // pace 20
    expect(targetTone(40, 15, M).label).toBe('Slightly behind'); // pace 50
    expect(targetTone(40, 3, M).label).toBe('Behind pace');      // pace 90
  });

  it('survives a zero-length month without dividing by it', () => {
    expect(() => targetTone(0, 0, 0)).not.toThrow();
  });
});

describe('daysLeftInMonth', () => {
  it('counts today, so the last day of the month is 1 and not 0', () => {
    // A 0 here would divide the pace calculation by the wrong thing and make
    // the final day of every month read as a full month remaining.
    expect(daysLeftInMonth(new Date(2026, 7, 31))).toBe(1);
  });

  it('is the whole month on the first', () => {
    expect(daysLeftInMonth(new Date(2026, 7, 1))).toBe(31);
    expect(daysLeftInMonth(new Date(2026, 8, 1))).toBe(30);
  });

  it('handles a leap February', () => {
    expect(daysLeftInMonth(new Date(2028, 1, 1))).toBe(29);
  });
});

describe('the percentage is never clamped, only the stroke', () => {
  const dashboard = readFileSync(
    join(__dirname, '..', 'components', 'dashboards', 'PtOsDashboard.tsx'), 'utf8');
  const hero = readFileSync(
    join(__dirname, '..', 'components', 'revenue', 'MonthlyTargetHero.tsx'), 'utf8');

  it('the dashboard ring prints the true percentage', () => {
    expect(dashboard).toContain('{Math.round(pct)}%');
  });

  it('the revenue page ring no longer prints the clamped one', () => {
    // The exact shape of the bug in the reported screenshot.
    expect(hero).not.toContain('{Math.round(clamped)}%');
    expect(hero).toContain('{Math.round(shown)}%');
  });

  it('both still clamp what they draw', () => {
    // A stroke past 100% would wrap the ring back over itself.
    expect(dashboard).toContain('Math.max(0, Math.min(100, pct))');
    expect(hero).toContain('Math.max(0, Math.min(100, pct))');
  });
});

describe('the dashboard card does not invent a month', () => {
  const dashboard = readFileSync(
    join(__dirname, '..', 'components', 'dashboards', 'PtOsDashboard.tsx'), 'utf8');

  it('renders nothing when the read failed', () => {
    // "₹0 of ₹0, behind pace" is a claim about the studio's month. A card that
    // makes it up because a request 500'd is worse than a card that is absent.
    expect(dashboard).toContain('if (t.error || !data) return null;');
  });

  it('is read-only — the irreversible form stays on the revenue page', () => {
    // Setting a target is once per month and cannot be undone; the dashboard
    // must not offer it without the confirmation flow that explains the lock.
    const card = dashboard.slice(dashboard.indexOf('function MonthlyTarget()'));
    const end = card.indexOf('function RevenueHalf');
    expect(card.slice(0, end)).not.toMatch(/method:\s*'POST'/);
  });
});
