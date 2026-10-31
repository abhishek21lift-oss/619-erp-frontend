import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.example.test');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  fetchMock.mockReset();
});

const response = (body: unknown, ok = true) =>
  Promise.resolve({ ok, json: () => Promise.resolve(body) } as Response);

const plansBody = {
  data: {
    plans: [{
      code: 'starter', name: 'Starter', price_inr: 999, effective_price_inr: 899,
      is_launch: false, duration_months: 1, client_limit: 30, best_for: null,
    }],
    founder_slots_remaining: 4,
    trial_days: 7,
  },
};

const statsBody = {
  data: { studios: 120, trainers: 180, active_clients: 2400, sessions_completed: 51000 },
};

describe('getPublicLandingData', () => {
  it('merges both public endpoints', async () => {
    fetchMock
      .mockImplementationOnce(() => response(plansBody))
      .mockImplementationOnce(() => response(statsBody));

    const { getPublicLandingData } = await import('@/lib/public-landing');
    await expect(getPublicLandingData()).resolves.toEqual({
      plans: plansBody.data.plans,
      founderSlots: 4,
      trialDays: 7,
      stats: statsBody.data,
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://api.example.test/api/public/plans',
      expect.objectContaining({ next: { revalidate: 300 }, signal: expect.any(AbortSignal) }),
    );
  });

  it('keeps the plans when only the stats request fails', async () => {
    fetchMock
      .mockImplementationOnce(() => response(plansBody))
      .mockImplementationOnce(() => Promise.reject(new Error('cold')));

    const { getPublicLandingData } = await import('@/lib/public-landing');
    await expect(getPublicLandingData()).resolves.toEqual({
      plans: plansBody.data.plans,
      founderSlots: 4,
      trialDays: 7,
      stats: null,
    });
  });

  it('returns null when both endpoints fail', async () => {
    fetchMock.mockImplementation(() => Promise.reject(new Error('cold')));
    const { getPublicLandingData } = await import('@/lib/public-landing');
    await expect(getPublicLandingData()).resolves.toBeNull();
  });

  it('does not fetch when the API URL is unset', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', '');
    const { getPublicLandingData } = await import('@/lib/public-landing');
    await expect(getPublicLandingData()).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('treats a malformed plans payload as no plans, not a crash', async () => {
    fetchMock
      .mockImplementationOnce(() => response({ data: { plans: 'nope' } }))
      .mockImplementationOnce(() => response(statsBody));

    const { getPublicLandingData } = await import('@/lib/public-landing');
    await expect(getPublicLandingData()).resolves.toEqual({
      plans: [], founderSlots: null, trialDays: null, stats: statsBody.data,
    });
  });
});
