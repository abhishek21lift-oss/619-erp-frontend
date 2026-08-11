// Money and attendance KPIs must describe the whole dataset, not the page of
// rows that happened to be fetched.
//
// Three headline figures were computed in the browser by reducing a capped
// list, and each was labelled as a total:
//
//   Collected Payments  "Total Collected"  GET /api/payments      LIMIT 200
//   Today's Sales       today's takings    GET /api/payments      LIMIT 200
//   Outstanding Dues    "Outstanding"      GET /api/reports/dues  LIMIT 100
//
// Under the cap the arithmetic is right, which is why this survived: every
// existing test, and every demo studio, sits under 200 payments. The bug only
// appears at scale, and it appears silently — a smaller number, still bold,
// still labelled Total.
//
// So each case here is asserted TWICE: once under the cap (where old and new
// agree, guarding against a regression in the ordinary path) and once over it,
// with the list deliberately disagreeing with the server aggregate. The
// over-cap assertion is the one that fails without the fix.

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { countCheckIns, isCheckIn, CHECKED_IN_STATUSES } from '@/lib/checkin';
import { buildBoard } from '@/lib/leaderboard';

// ── P0 #3 — one definition of a check-in ──────────────────────────────────

describe('what counts as a check-in', () => {
  const row = (status: string) => ({ status, ref_id: 'c1', ref_name: 'A', date: '2026-08-01' });

  it('counts present and late, and nothing else', () => {
    expect(CHECKED_IN_STATUSES).toEqual(['present', 'late']);
    expect(isCheckIn(row('present'))).toBe(true);
    expect(isCheckIn(row('late'))).toBe(true);
    // 'absent' and 'excused' rows exist for the same member on the same day —
    // counting them does not add noise, it inflates the figure.
    expect(isCheckIn(row('absent'))).toBe(false);
    expect(isCheckIn(row('excused'))).toBe(false);
    expect(isCheckIn(row('pending'))).toBe(false);
    expect(isCheckIn(row('cancelled'))).toBe(false);
  });

  it('survives the shapes the three callers actually pass', () => {
    expect(isCheckIn(null)).toBe(false);
    expect(isCheckIn(undefined)).toBe(false);
    expect(isCheckIn({} as { status?: string })).toBe(false);
    expect(isCheckIn({ status: null })).toBe(false);
  });

  it('agrees with the leaderboard, which had the rule right all along', () => {
    // The regression this prevents: three pages fetch identical rows and used
    // to disagree about how many check-ins they contained.
    const records = [
      row('present'), row('late'), row('absent'), row('excused'), row('present'),
    ];
    const viaPredicate = countCheckIns(records);
    const viaLeaderboard = buildBoard(records).reduce((n, r) => n + r.checkins, 0);

    expect(viaPredicate).toBe(3);
    expect(viaLeaderboard).toBe(3);
    expect(viaPredicate).toBe(viaLeaderboard);
    // And emphatically NOT the raw row count, which is what insights/traffic
    // was showing.
    expect(viaPredicate).not.toBe(records.length);
  });
});

// ── Page-level: the KPI must come from the server aggregate ───────────────

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));
vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({ user: { id: 'u1', name: 'Admin', role: 'admin', organization_name: 'S' }, loading: false }),
}));
vi.mock('@/components/Guard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
// PullToRefresh reaches for the toast context, which these pages get from the
// app shell they are not mounted inside here. Stubbed to a passthrough so the
// test exercises the KPI arithmetic rather than the gesture plumbing.
vi.mock('@/components/ui/PullToRefresh', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
// Recharts' ResponsiveContainer measures itself through ResizeObserver, which
// the jsdom setup stubs by invoking the callback synchronously — that throws
// during the passive-effect commit and surfaces as an unhandled error even
// though every assertion passes. These tests read KPI numbers, not chart
// geometry, so the charts are stubbed out entirely.
vi.mock('@/components/ui/chart', () => ({
  PremiumBarChart: () => <div data-testid="chart" />,
  PremiumAreaChart: () => <div data-testid="chart" />,
  ChartContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ChartTooltip: () => null,
  ChartTooltipContent: () => null,
  ChartLegend: () => null,
  ChartLegendContent: () => null,
  CHART_COLORS: [],
  useChartConfig: () => ({}),
}));

/** `n` payments of ₹100 each — a capped page of the ledger. */
const rows = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    id: `p${i}`, client_name: `C${i}`, amount: 100, method: 'CASH',
    date: '2026-08-11', receipt_no: `R${i}`, notes: null,
  }));

const paymentsMock = { list: vi.fn(), stats: vi.fn(), create: vi.fn() };
const reportsMock = { dues: vi.fn(), duesSummary: vi.fn() };

vi.mock('@/lib/api', () => ({
  api: {
    get payments() { return paymentsMock; },
    get reports() { return reportsMock; },
    clients: { list: vi.fn().mockResolvedValue([]) },
  },
}));

describe('Collected Payments — "Total Collected"', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('under the cap: matches the rows, as it always did', async () => {
    paymentsMock.list.mockResolvedValue(rows(50));           // ₹5,000 visible
    paymentsMock.stats.mockResolvedValue({
      count: 50, total: 5000, cash: 5000, upi: 0, card: 0, bank: 0, total_incentives: 0,
    });

    const { default: Page } = await import('@/app/(chrome)/finance/collected-payments/page');
    render(<Page />);
    await waitFor(() => expect(screen.getByText('₹5,000')).toBeTruthy());
  });

  it('over the cap: shows the authoritative sum, NOT the 200 fetched rows', async () => {
    // The exact production shape: the server hands back its 200-row page while
    // the ledger holds 1,000 payments.
    paymentsMock.list.mockResolvedValue(rows(200));          // ₹20,000 visible
    paymentsMock.stats.mockResolvedValue({
      count: 1000, total: 100000, cash: 100000, upi: 0, card: 0, bank: 0, total_incentives: 0,
    });

    const { default: Page } = await import('@/app/(chrome)/finance/collected-payments/page');
    render(<Page />);

    // The authoritative figure.
    await waitFor(() => expect(screen.getByText('₹1,00,000')).toBeTruthy());
    // Before the fix this was ₹20,000 — the page of rows, labelled as the total.
    expect(screen.queryByText('₹20,000')).toBeNull();
    // And the count is the ledger's, not the page's.
    expect(screen.getByText('1000')).toBeTruthy();
  });

  it('falls back to the visible rows if the aggregate call fails', async () => {
    paymentsMock.list.mockResolvedValue(rows(30));
    paymentsMock.stats.mockRejectedValue(new Error('boom'));

    const { default: Page } = await import('@/app/(chrome)/finance/collected-payments/page');
    render(<Page />);
    // Still renders a number rather than breaking the page.
    await waitFor(() => expect(screen.getByText('₹3,000')).toBeTruthy());
  });
});

describe('Outstanding Dues — "Outstanding"', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  const debtors = (n: number) =>
    Array.from({ length: n }, (_, i) => ({
      id: `d${i}`, name: `D${i}`, client_id: `C${i}`, mobile: '9', balance_amount: 500,
      pt_end_date: '2026-09-01', status: 'active', trainer_name: 'T',
    }));

  it('under the cap: matches the rows', async () => {
    reportsMock.dues.mockResolvedValue(debtors(40));          // ₹20,000
    reportsMock.duesSummary.mockResolvedValue({
      total_outstanding: 20000, debtor_count: 40, high_risk_count: 0, medium_risk_count: 0,
    });

    const { default: Page } = await import('@/app/(chrome)/finance/dues/page');
    render(<Page />);
    await waitFor(() => expect(screen.getByText(/40 members with pending dues/)).toBeTruthy());
  });

  it('over the cap: total and debtor count come from the aggregate', async () => {
    reportsMock.dues.mockResolvedValue(debtors(100));         // the capped page
    reportsMock.duesSummary.mockResolvedValue({
      total_outstanding: 875000, debtor_count: 350, high_risk_count: 12, medium_risk_count: 60,
    });

    const { default: Page } = await import('@/app/(chrome)/finance/dues/page');
    render(<Page />);

    // 350 debtors, not the 100 rows on screen.
    await waitFor(() => expect(screen.getByText(/350 members with pending dues/)).toBeTruthy());
    // And it says so rather than letting the list imply it is everyone.
    expect(screen.getByText(/showing the 100 largest/)).toBeTruthy();
    // Risk bands are the server's too — they were counted over 100 rows before.
    expect(screen.getByText('12')).toBeTruthy();
    expect(screen.getByText('60')).toBeTruthy();
  });

  it('marks the figure as partial when the aggregate is unavailable', async () => {
    reportsMock.dues.mockResolvedValue(debtors(100));
    reportsMock.duesSummary.mockRejectedValue(new Error('boom'));

    const { default: Page } = await import('@/app/(chrome)/finance/dues/page');
    render(<Page />);
    // Not silently presented as the whole number.
    await waitFor(() => expect(screen.getByText(/Outstanding \(shown\)/)).toBeTruthy());
  });
});

// ── P0 #3, end to end: the three pages must agree on one dataset ───────────
//
// The unit tests above pin the predicate. This pins the thing the user
// actually sees: open the same date range on three screens and read the same
// number off each. Before the fix, traffic reported 9 where the other two
// reported 5.

const attendanceMock = { list: vi.fn() };

describe('Total Check-ins agrees across every page that shows it', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.resetModules(); });

  // A deliberately awkward population: multiple rows per member on the same
  // day, every status the system uses, and rows missing check_in or date.
  const POPULATION = [
    { id: '1', ref_id: 'm1', ref_name: 'Asha',  date: '2026-08-10', check_in: '07:15', status: 'present' },
    { id: '2', ref_id: 'm1', ref_name: 'Asha',  date: '2026-08-10', check_in: '18:40', status: 'late'    },
    { id: '3', ref_id: 'm1', ref_name: 'Asha',  date: '2026-08-10', check_in: null,    status: 'absent'  },
    { id: '4', ref_id: 'm2', ref_name: 'Bhanu', date: '2026-08-11', check_in: '06:05', status: 'present' },
    { id: '5', ref_id: 'm2', ref_name: 'Bhanu', date: '2026-08-11', check_in: null,    status: 'excused' },
    { id: '6', ref_id: 'm3', ref_name: 'Chetan',date: '2026-08-11', check_in: '20:30', status: 'late'    },
    { id: '7', ref_id: 'm3', ref_name: 'Chetan',date: '2026-08-11', check_in: null,    status: 'absent'  },
    { id: '8', ref_id: 'm4', ref_name: 'Divya', date: '2026-08-11', check_in: '09:00', status: 'present' },
    { id: '9', ref_id: 'm4', ref_name: 'Divya', date: '2026-08-11', check_in: null,    status: 'pending' },
  ];
  // present + late only: rows 1,2,4,6,8 → five visits out of nine records.
  const EXPECTED_VISITS = 5;

  it('the canonical helper and the leaderboard both say 5, not 9', () => {
    expect(countCheckIns(POPULATION)).toBe(EXPECTED_VISITS);
    expect(buildBoard(POPULATION).reduce((n, r) => n + r.checkins, 0)).toBe(EXPECTED_VISITS);
    expect(POPULATION.length).toBe(9); // what traffic used to report
  });

  it('insights/sessions renders the canonical count', async () => {
    attendanceMock.list.mockResolvedValue(POPULATION);
    vi.doMock('@/lib/api', () => ({ api: { get attendance() { return attendanceMock; } } }));
    const { default: Page } = await import('@/app/(chrome)/insights/sessions/page');
    render(<Page />);
    await waitFor(() => {
      const el = screen.getByText('Total Check-ins').previousElementSibling;
      expect(el?.textContent).toBe(String(EXPECTED_VISITS));
    });
  });

  it('insights/traffic renders the SAME count for the same population', async () => {
    attendanceMock.list.mockResolvedValue(POPULATION);
    vi.doMock('@/lib/api', () => ({ api: { get attendance() { return attendanceMock; } } }));
    const { default: Page } = await import('@/app/(chrome)/insights/traffic/page');
    const { container } = render(<Page />);
    await waitFor(() => {
      // Before the fix this page showed 9 while sessions showed 5.
      expect(container.textContent).toContain(String(EXPECTED_VISITS));
      expect(container.textContent).not.toContain('9 ');
    });
  });
});
