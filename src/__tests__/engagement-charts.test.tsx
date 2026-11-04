// The engagement charts are drawn from server counts, not from the rows the
// list endpoint happened to return.
//
// The feedback list is capped at 50 rows, so summing it on screen would claim
// 50 ratings exist when 220 do. The campaigns route grows an optional
// `total_opened`; an older API that does not send it must lose the "Opened"
// stage rather than draw a zero. The offers chart names its own truncation.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

type ChartProps = Record<string, unknown>;

const barProps: ChartProps[] = [];
const donutProps: ChartProps[] = [];

const campaignsList = vi.fn();
const campaignsStats = vi.fn();
const feedbackList = vi.fn();
const feedbackStats = vi.fn();
const offersList = vi.fn();
const toast = { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() };

vi.mock('@/lib/api', () => ({
  api: {
    campaigns: {
      list: () => campaignsList(), stats: () => campaignsStats(),
      delete: vi.fn(), create: vi.fn(),
    },
    feedback: { list: () => feedbackList(), stats: () => feedbackStats() },
    offers: { list: () => offersList() },
  },
}));
vi.mock('@/lib/toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/components/Guard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/ui', () => ({
  PageContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PageHero: ({ title }: { title: string }) => <h1>{title}</h1>,
}));
vi.mock('@/components/engagement/OfferForm', () => ({ OfferForm: () => null }));
vi.mock('framer-motion', () => ({
  useReducedMotion: () => true,
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  m: new Proxy({}, {
    get: (_t, tag: string) => ({ children, ...rest }: Record<string, unknown>) =>
      React.createElement(tag, rest, children as React.ReactNode),
  }),
}));
vi.mock('@/components/visualizations', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/visualizations')>();
  return {
    ...actual,
    PremiumBarChart: (props: ChartProps) => {
      barProps.push(props);
      return <div data-testid="bar-chart" />;
    },
    PremiumDonutChart: (props: ChartProps) => {
      donutProps.push(props);
      return <div data-testid="donut-chart" />;
    },
  };
});

import CampaignsPage from '@/app/(chrome)/engagement/campaigns/page';
import FeedbackPage from '@/app/(chrome)/engagement/feedback/page';
import OffersPage from '@/app/(chrome)/engagement/offers/page';

const lastBar = () => barProps[barProps.length - 1];
const lastDonut = () => donutProps[donutProps.length - 1];

beforeEach(() => {
  barProps.length = 0;
  donutProps.length = 0;
  vi.clearAllMocks();
});

describe('campaign funnel', () => {
  it('draws sent, opened and converted from the stats route, not the campaign rows', async () => {
    campaignsList.mockResolvedValue([{ id: 'c1', name: 'One', status: 'active' }]);
    // Postgres returns aggregates as strings.
    campaignsStats.mockResolvedValue({
      active: 3, total_sent: '1200', total_opened: '640', conversions: '88', conv_rate: 7.3,
    });

    render(<CampaignsPage />);

    await waitFor(() => expect(lastBar().data).toEqual([
      { stage: 'Sent', people: 1200, color: expect.any(String) },
      { stage: 'Opened', people: 640, color: expect.any(String) },
      { stage: 'Converted', people: 88, color: expect.any(String) },
    ]));
  });

  it('drops the opened stage when an older API does not send total_opened', async () => {
    campaignsList.mockResolvedValue([]);
    campaignsStats.mockResolvedValue({
      active: 0, total_sent: '10', conversions: '2', conv_rate: 20,
    });

    render(<CampaignsPage />);

    await waitFor(() => expect(lastBar().data).toEqual([
      { stage: 'Sent', people: 10, color: expect.any(String) },
      { stage: 'Converted', people: 2, color: expect.any(String) },
    ]));
  });

  it('shows a chart error, not a zeroed funnel, when stats fail', async () => {
    campaignsList.mockResolvedValue([]);
    campaignsStats.mockRejectedValue(new Error('stats down'));

    render(<CampaignsPage />);

    await waitFor(() => expect(lastBar().error).toBe('Campaign totals could not be loaded.'));
    expect(lastBar().data).toEqual([]);
  });
});

describe('feedback sentiment', () => {
  const fiftyRows = Array.from({ length: 50 }, (_, i) => ({
    id: `f${i}`, member: `Member ${i}`, rating: 5, category: 'Trainer',
    message: 'Great', status: 'open', date: '2026-03-02', sentiment: 'positive',
  }));

  it('counts every rating from stats, not the capped list of 50', async () => {
    feedbackList.mockResolvedValue(fiftyRows);
    feedbackStats.mockResolvedValue({
      avg_rating: 4.6, total: 220, positive: 170, neutral: 25, negative: 20, open: 14, nps: 68.2,
    });

    render(<FeedbackPage />);

    // The server says 25 neutral, not the 30 a subtraction would claim: five
    // entries carry no rating and belong to no bucket.
    await waitFor(() => expect(lastDonut().data).toEqual([
      { name: 'Positive', value: 170, color: expect.any(String) },
      { name: 'Neutral', value: 25, color: expect.any(String) },
      { name: 'Negative', value: 20, color: expect.any(String) },
    ]));
    expect(lastDonut().centerValue).toBe(68);
    expect(await screen.findByText('220')).toBeTruthy();
    expect(screen.queryByText('50')).toBeNull();
  });

  it('leaves the figures blank rather than deriving them when stats fail', async () => {
    feedbackList.mockResolvedValue(fiftyRows);
    feedbackStats.mockRejectedValue(new Error('stats down'));

    render(<FeedbackPage />);

    await waitFor(() => expect(lastDonut().error).toBe('Feedback totals could not be loaded.'));
    expect(lastDonut().data).toEqual([]);
    // The list still loads; only the totals are unknown.
    expect(await screen.findByText('Member 0')).toBeTruthy();
  });
});

describe('offer redemptions', () => {
  function offer(name: string, used: number, status: 'active' | 'expired' | 'draft') {
    return {
      id: name, name, type: 'percent' as const, value: 10, code: name.toUpperCase(),
      plan: 'monthly', validFrom: '2026-01-01', validUntil: '2026-12-31',
      usageLimit: 100, used, status,
    };
  }

  it('draws the top eight offers and says the chart is truncated', async () => {
    offersList.mockResolvedValue(
      Array.from({ length: 10 }, (_, i) => offer(`Offer ${i}`, i * 10, 'active')),
    );

    render(<OffersPage />);

    await waitFor(() => expect(lastBar().data).toHaveLength(8));
    const data = lastBar().data as { offer: string; redemptions: number }[];
    expect(data[0]).toEqual({ offer: 'Offer 9', redemptions: 90 });
    expect(data[7]).toEqual({ offer: 'Offer 2', redemptions: 20 });
    expect(lastBar().subtitle).toContain('Top 8 of 10 offers');
  });

  it('shows the real total when every offer fits', async () => {
    offersList.mockResolvedValue([
      offer('Glow', 4, 'active'),
      offer('Refer', 2, 'active'),
    ]);

    render(<OffersPage />);

    await waitFor(() => expect(lastBar().data).toEqual([
      { offer: 'Glow', redemptions: 4 },
      { offer: 'Refer', redemptions: 2 },
    ]));
    expect(lastBar().subtitle).toBe('6 redemptions across 2 offers');
  });
});
