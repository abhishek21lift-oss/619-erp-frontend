import type { TodayClient } from '@/lib/api';

/**
 * What to flag about a client's programme before the trainer starts
 * (training audit T-6, T-9). Two cases, both production facts on 29 Sep:
 * a four-week block in its fifth and seventh week that nobody renewed, and a
 * programme with no exercises in it at all.
 */
export function programmeNote(c: Pick<TodayClient, 'plan_name' | 'plan_exercise_total' | 'programme_week' | 'duration_weeks'>): string | null {
  if (!c.plan_name) return null;
  if (c.plan_exercise_total === 0) return 'Programme has no exercises yet';
  const wk = c.programme_week ?? null;
  const of = c.duration_weeks ?? null;
  if (wk != null && of != null && of > 0 && wk > of) {
    const over = wk - of;
    return `Finished ${over} week${over === 1 ? '' : 's'} ago · week ${wk} of ${of}`;
  }
  return null;
}
