// Whether a PT client is currently enrolled.
//
// Lives here rather than in the booking dialog because a Next.js page may only
// export the handful of names the framework recognises — exporting a helper
// from one breaks the build — and because more than one screen needs to say
// the same thing about the same client.

/** A client as the booking dialog needs them. */
export interface ClientRow {
  id: string;
  name: string;
  status?: string | null;
  pt_end_date?: string | null;
}

export type EnrolmentState = 'active' | 'expired' | 'not_enrolled';

/**
 * Whether a client is currently enrolled, from the dates rather than the
 * `status` column.
 *
 * status is set at enrolment and does not move on its own, so a client whose
 * package ran out last month can still read 'active' until something writes to
 * the row. pt_end_date is the fact: no end date means no package was ever
 * bought, a past one means it has run out.
 *
 * Compared date-only, in local time. A package ending today is still valid
 * today — comparing against a timestamp would expire it at midnight UTC, which
 * is 05:30 in the morning here.
 */
export function enrolmentState(c: ClientRow, today = new Date()): EnrolmentState {
  const end = c.pt_end_date ? String(c.pt_end_date).slice(0, 10) : '';
  if (!end) return 'not_enrolled';
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return end < todayIso ? 'expired' : 'active';
}

export const ENROLMENT_META: Record<EnrolmentState, { label: string; color: string; bg: string }> = {
  active:       { label: 'Active',       color: '#059669', bg: 'rgba(16,185,129,0.12)' },
  expired:      { label: 'Expired',      color: '#dc2626', bg: 'rgba(220,38,38,0.10)' },
  not_enrolled: { label: 'Not enrolled', color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
};
