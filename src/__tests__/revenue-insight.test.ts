// The one line of advice under Today's Revenue.
//
// The card shows two numbers and then tells you what to do about them. Which
// of the competing things to say is a judgement — collectable money, overdue
// packages, or nothing at all — and the uplift percentage is arithmetic that
// can be wrong without looking wrong. Both are worth pinning down, so the
// decision lives in an exported pure function rather than inside the JSX.
import { describe, expect, it, vi } from 'vitest';

// The function is a named export of a client component, so importing it pulls
// the whole dashboard module in. These are the module-level dependencies that
// do not survive a bare node environment.
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), back: vi.fn() }) }));
vi.mock('@/lib/auth-context', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('@/components/ui', () => ({ PullToRefresh: ({ children }: { children: unknown }) => children }));
vi.mock('@/lib/http', () => ({ default: () => Promise.resolve({ data: {} }) }));

import { revenueInsight } from '@/components/dashboards/PtOsDashboard';

const insight = (over: Partial<Parameters<typeof revenueInsight>[0]> = {}) =>
  revenueInsight({ collected: 0, pending: 0, owing: 0, overdue: 0, payments: 0, ...over });

describe('which insight wins', () => {
  it('leads with money that can still be collected, even when some of it is overdue', () => {
    // Overdue clients are a subset of the ones who owe, so both branches are
    // live at once on any real studio. The collectable line is the one that
    // says how much and how many people — the overdue count is already on the
    // card as its own badge, so repeating it here would spend the only line
    // on information that is visible anyway.
    const out = insight({ collected: 10000, pending: 4000, owing: 3, overdue: 2 });
    expect(out.text).toContain('₹4,000 can be collected from 3 members');
    expect(out.icon).toBe('🔥');
  });

  it('falls through to overdue only when the pending figure has nothing to point at', () => {
    // pending > 0 with owing === 0 is a data skew, not a real state. It must
    // not produce "collected from 0 members" — the next-best true thing is
    // the overdue count.
    const out = insight({ collected: 5000, pending: 4000, owing: 0, overdue: 2 });
    expect(out.icon).toBe('⚠️');
    expect(out.text).toBe('2 payments are overdue.');
  });

  it('reads as good news when everything is settled', () => {
    const out = insight({ collected: 50000, payments: 1 });
    expect(out.icon).toBe('✅');
    expect(out.text).toBe('Nothing outstanding — 1 payment in today and every balance is clear.');
  });

  it('does not congratulate a studio that has simply had no activity', () => {
    // Zero collected and zero outstanding is the 7am state, not a win. It
    // gets the neutral line, because "every balance is clear" before anyone
    // has walked in reads as a result that was earned.
    const out = insight({});
    expect(out.icon).toBe('💡');
    expect(out.text).toBe('No payments yet today, and no balances outstanding.');
  });
});

describe('the uplift figure', () => {
  it('is pending as a share of everything in play, not of what came in', () => {
    // ₹4,000 pending against ₹16,000 collected: 4000/20000 = 20%. The wrong
    // and tempting denominator is `collected`, which would say 25% — a claim
    // that collecting it lifts today by more than its share of the day.
    const out = insight({ collected: 16000, pending: 4000, owing: 3 });
    expect(out.text).toContain('lift today by 20%');
  });

  it('is dropped entirely when nothing has come in yet', () => {
    // With collected at 0 the share is always 100%, which is arithmetically
    // true and says nothing. The sentence ends after the amount instead.
    const out = insight({ collected: 0, pending: 4000, owing: 3 });
    expect(out.text).toBe('₹4,000 can be collected from 3 members.');
    expect(out.text).not.toContain('lift');
  });
});

describe('counting', () => {
  it('says member, payment and is for one', () => {
    expect(insight({ pending: 2000, owing: 1 }).text).toContain('from 1 member.');
    expect(insight({ overdue: 1 }).text).toBe('1 payment is overdue.');
    expect(insight({ collected: 500, payments: 1 }).text).toContain('1 payment in today');
  });

  it('says members, payments and are for anything else', () => {
    expect(insight({ pending: 2000, owing: 2 }).text).toContain('from 2 members.');
    expect(insight({ overdue: 3 }).text).toBe('3 payments are overdue.');
    expect(insight({ collected: 500, payments: 4 }).text).toContain('4 payments in today');
  });
});
