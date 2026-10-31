import type { PublicPlan, PublicStats } from '@/components/landing/types';

export type PublicLandingData = {
  plans: PublicPlan[];
  founderSlots: number | null;
  trialDays: number | null;
  stats: PublicStats | null;
};

type PlansPayload = {
  data?: {
    plans?: PublicPlan[];
    founder_slots_remaining?: number | null;
    trial_days?: number | null;
  };
};

type StatsPayload = { data?: PublicStats | null };

/**
 * Live public facts for the landing page, fetched on the server so a crawler
 * that runs no JavaScript still sees prices and stats. Never throws: a missing
 * API URL, a cold backend or a malformed body simply leaves the facts out, and
 * the client fetch fills them in after hydration.
 */
export async function getPublicLandingData(): Promise<PublicLandingData | null> {
  const base = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/+$/, '');
  if (!base) return null;

  const getJson = async <T,>(path: string): Promise<T | null> => {
    try {
      const res = await fetch(`${base}${path}`, {
        signal: AbortSignal.timeout(2000),
        next: { revalidate: 300 },
      });
      return res.ok ? ((await res.json()) as T) : null;
    } catch {
      return null;
    }
  };

  const [plansPayload, statsPayload] = await Promise.all([
    getJson<PlansPayload>('/api/public/plans'),
    getJson<StatsPayload>('/api/public/stats'),
  ]);

  if (!plansPayload && !statsPayload) return null;

  const plans = plansPayload?.data?.plans;
  return {
    plans: Array.isArray(plans) ? plans : [],
    founderSlots: plansPayload?.data?.founder_slots_remaining ?? null,
    trialDays: plansPayload?.data?.trial_days ?? null,
    stats: statsPayload?.data ?? null,
  };
}
