/**
 * The member's package facts, as the dashboard and the membership card show
 * them. One copy, so the two screens can never disagree about days left.
 */

import type { MeMembership, MeProfile } from '@/lib/api';

export type PlanFacts = {
  title: string | null;
  status: string | null;
  /** Outstanding balance, or null when the package record did not carry one. */
  balance: number | null;
  start: string | null;
  end: string | null;
};

/**
 * What the plan card may say, and what it may not.
 *
 * `planLoaded` is whether the membership request answered at all. A failed or
 * empty read is not a zero balance: `balance` stays null and the card shows a
 * dash. The client row's copy is only a fallback — never an invented package
 * or status.
 */
export function planFacts({ plan, planLoaded, profile }: {
  plan: MeMembership | null;
  planLoaded: boolean;
  profile: Pick<MeProfile, 'package_type' | 'status' | 'pt_start_date' | 'pt_end_date'>;
}): PlanFacts {
  const raw = plan?.balance_amount;
  const parsed = raw == null || raw === '' ? NaN : Number(raw);
  return {
    title: plan?.package_type || profile.package_type || null,
    status: plan?.status || profile.status || null,
    balance: Number.isFinite(parsed) ? parsed : null,
    start: plan?.pt_start_date ?? profile.pt_start_date ?? null,
    end: plan?.pt_end_date ?? profile.pt_end_date ?? null,
  };
}

/** Whole days until the end of `end`'s day, never negative; null when unknown. */
export function daysLeft(end: string | null | undefined): number | null {
  if (!end) return null;
  const d = new Date(end);
  if (Number.isNaN(d.getTime())) return null;
  const ms = d.setHours(23, 59, 59, 999) - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

/**
 * Share of the package elapsed, 0–100. Null unless BOTH ends are known — a
 * bar with one endpoint guessed is a bar that lies about how much time is left.
 */
export function elapsedPct(start: string | null | undefined, end: string | null | undefined): number | null {
  const s = start ? new Date(start).getTime() : NaN;
  const e = end ? new Date(end).getTime() : NaN;
  if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) return null;
  return Math.min(100, Math.max(0, ((Date.now() - s) / (e - s)) * 100));
}
