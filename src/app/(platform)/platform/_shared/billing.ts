// Pure billing-state helpers for the platform Finance tab.
//
// Kept out of the component so the money/attention rules can be tested
// without mounting the whole console.
import type { SubPlan, SubStudio } from '@/lib/api';

const ATTENTION_STATES = new Set(['frozen', 'expired', 'trial_expired', 'suspended', 'lapsed']);

/** A studio belongs in "Needs you" when a decision, a payment, or a reactivation is waiting. */
export function needsAction(s: SubStudio): boolean {
  return Boolean(s.requested_at)
    || !s.allowed
    || ATTENTION_STATES.has(s.effective_state)
    || s.renewal_due
    || (s.period_days_left != null && s.period_days_left <= 7)
    || (s.effective_state === 'trial' && s.trial_days_left != null && s.trial_days_left <= 7);
}

/** Whole days past the end of the trial or paid period, or null when nothing is past. */
export function daysOverdue(s: SubStudio, now = Date.now()): number | null {
  const end = s.effective_state === 'trial' ? s.trial_ends_at : s.current_period_end;
  if (!end) return null;
  const days = Math.floor((now - new Date(end).getTime()) / 86_400_000);
  return days > 0 ? days : null;
}

/** The price the operator would collect on renewal; a founder's locked price wins. */
export function planPrice(s: SubStudio, plans: SubPlan[]): number | null {
  if (s.is_founder && s.locked_price_inr != null) return s.locked_price_inr;
  const plan = plans.find((p) => p.code === s.plan_code);
  return plan?.effective_price_inr ?? plan?.price_inr ?? null;
}

export function clientLabel(count: number): string {
  return `${count} ${count === 1 ? 'client' : 'clients'}`;
}

export type BillingFilter = 'all' | 'needs_action' | 'active' | 'trial' | 'frozen' | 'expired';
export type BillingSort = 'attention' | 'name' | 'expiry';

/** What a row's date column means, for sorting: soonest first, none last. */
function endTime(s: SubStudio): number {
  const end = s.effective_state === 'trial' ? s.trial_ends_at : s.current_period_end;
  return end ? new Date(end).getTime() : Number.POSITIVE_INFINITY;
}

/**
 * Client-side search/filter/sort for the Billing list. Kept out of the
 * component so the "what should I see, and in what order" rules are testable.
 */
export function filterStudios(
  list: SubStudio[],
  { query, filter, sort }: { query: string; filter: BillingFilter; sort: BillingSort },
): SubStudio[] {
  const q = query.trim().toLowerCase();
  const matched = list.filter((s) => {
    if (q) {
      const haystack = [s.name, s.slug, s.plan_name, s.requested_plan_name]
        .filter(Boolean).join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    switch (filter) {
      case 'needs_action': return needsAction(s);
      case 'active': return s.effective_state === 'active';
      case 'trial': return s.effective_state === 'trial';
      case 'frozen': return s.effective_state === 'frozen';
      case 'expired': return s.effective_state === 'expired' || s.effective_state === 'trial_expired';
      default: return true;
    }
  });

  return matched.sort((a, b) => {
    if (sort === 'name') return a.name.localeCompare(b.name);
    if (sort === 'expiry') return endTime(a) - endTime(b);
    // Requests first, then blocked studios, then whichever period ends soonest.
    return Number(Boolean(b.requested_at)) - Number(Boolean(a.requested_at))
      || Number(a.allowed) - Number(b.allowed)
      || endTime(a) - endTime(b);
  });
}
