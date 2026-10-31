import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  isAnonymousRequest: vi.fn(),
  getPublicLandingData: vi.fn(),
}));

vi.mock('@/lib/session-hint', () => ({ isAnonymousRequest: mocks.isAnonymousRequest }));
vi.mock('@/lib/public-landing', () => ({ getPublicLandingData: mocks.getPublicLandingData }));
vi.mock('@/components/StudioHome', () => ({
  default: ({ anonymousHint, initialPublicData }: {
    anonymousHint?: boolean;
    initialPublicData?: unknown;
  }) => (
    <div
      data-testid="studio-home"
      data-anonymous={String(anonymousHint)}
      data-initial={String(Boolean(initialPublicData))}
    />
  ),
}));

import Page from '@/app/(chrome)/page';

const plan = {
  code: 'starter', name: 'Starter', price_inr: 999, effective_price_inr: 899,
  is_launch: false, duration_months: 1, client_limit: 30, best_for: 'Solo trainers',
};
const data = {
  plans: [plan],
  founderSlots: 3,
  trialDays: 7,
  stats: { studios: 1, trainers: 2, active_clients: 3, sessions_completed: 4 },
};
const softwareNode = (container: HTMLElement) => {
  const script = container.querySelector('script[type="application/ld+json"]');
  const json = JSON.parse(script!.innerHTML);
  return json['@graph'].find((n: { '@type': string }) => n['@type'] === 'SoftwareApplication');
};

beforeEach(() => vi.clearAllMocks());

describe('homepage server data', () => {
  it('fetches and renders live offers for an anonymous request', async () => {
    mocks.isAnonymousRequest.mockResolvedValue(true);
    mocks.getPublicLandingData.mockResolvedValue(data);
    const { container } = render(await Page());

    expect(mocks.getPublicLandingData).toHaveBeenCalledOnce();
    expect(screen.getByTestId('studio-home')).toHaveAttribute('data-initial', 'true');
    expect(softwareNode(container).offers).toEqual([{
      '@type': 'Offer', name: 'Starter', price: 899, priceCurrency: 'INR',
      description: '1-month plan', url: 'https://myptstudio.com/#pricing',
    }]);
  });

  it('skips the fetch entirely for a signed-in request', async () => {
    mocks.isAnonymousRequest.mockResolvedValue(false);
    const { container } = render(await Page());

    expect(mocks.getPublicLandingData).not.toHaveBeenCalled();
    expect(screen.getByTestId('studio-home')).toHaveAttribute('data-initial', 'false');
    expect(softwareNode(container)).not.toHaveProperty('offers');
  });
});
