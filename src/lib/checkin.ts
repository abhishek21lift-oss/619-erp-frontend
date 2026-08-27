/**
 * Check-in scanner logic that is worth being sure about.
 *
 * Both functions here were inline in the scanner page. They are out because
 * each encodes a decision that can be wrong while still looking right on
 * screen, and neither needs a camera to test.
 */

export type CheckinOutcome = 'success' | 'duplicate' | 'rejected';

export type ScanUser = {
  id: string;
  name: string;
  status: string;
  photo_url?: string | null;
  member_code?: string | null;
  package_type?: string | null;
  role?: string;
};

export type ScanResult = {
  success: boolean;
  duplicate?: boolean;
  message: string;
  user?: ScanUser;
  attendance_id?: string;
  check_in_time?: string;
};

/**
 * Which of the three things just happened.
 *
 * The trap is that a repeat scan comes back as `success: true` AND
 * `duplicate: true` — the request succeeded, the check-in did not happen.
 * Reading `success` first turns every second scan into a fresh green
 * "Welcome" and quietly inflates the day's count, so `duplicate` is checked
 * before it. The server sets `duplicate` only on that branch.
 */
export function outcomeOf(r: Pick<ScanResult, 'success' | 'duplicate'>): CheckinOutcome {
  if (r.duplicate) return 'duplicate';
  return r.success ? 'success' : 'rejected';
}

export type FeedEntry = {
  /** Stable identity across a local scan and the server row it becomes. */
  key: string;
  name: string;
  photoUrl: string | null;
  memberCode: string | null;
  /** ISO timestamp, or null when the server row has no check_in_time. */
  at: string | null;
  outcome: CheckinOutcome;
};

/**
 * The "who just came in" feed: what this device scanned, plus what the rest
 * of the studio recorded, as one list.
 *
 * Local entries lead because a scan must appear the instant it happens — the
 * server poll is up to a refresh behind, and a desk that scans someone and
 * sees nothing move scans them again.
 *
 * Then they are deduplicated, and that is the whole reason this function
 * exists: a scan lands in the local list immediately and comes back in the
 * very next server poll, so without a shared key the same person appears
 * twice and the feed looks like it double-charged them. `attendance_id` is
 * the shared key when there is one; a rejected scan never gets an attendance
 * row, so those fall back to a per-scan key and never merge with anything.
 */
export function mergeFeed(local: FeedEntry[], server: FeedEntry[], limit = 20): FeedEntry[] {
  const seen = new Set<string>();
  const out: FeedEntry[] = [];
  for (const e of [...local, ...server]) {
    if (seen.has(e.key)) continue;
    seen.add(e.key);
    out.push(e);
    if (out.length >= limit) break;
  }
  return out;
}

/** `recent_checkins` rows from /api/qr/dashboard, in feed shape. */
export function feedFromServer(rows: unknown[]): FeedEntry[] {
  return (rows ?? []).map((row, i) => {
    const r = (row ?? {}) as Record<string, unknown>;
    return {
      // The dashboard only ever returns rows it actually wrote, so anything
      // here is a real check-in. `id` is the attendance id — the same value
      // the scan response hands back — which is what lets the two lists meet.
      key: typeof r.id === 'string' ? r.id : `srv-${i}`,
      name: typeof r.ref_name === 'string' ? r.ref_name : 'Unknown',
      photoUrl: typeof r.photo_url === 'string' ? r.photo_url : null,
      memberCode: typeof r.member_code === 'string' ? r.member_code : null,
      at: typeof r.check_in_time === 'string' ? r.check_in_time : null,
      outcome: 'success' as const,
    };
  });
}

/** Clock time for the feed. Null timestamps read as an em dash, not "Invalid Date". */
export function feedTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

// ─── What counts as a check-in ────────────────────────────────────────────────
//
// One definition, in one place, because three screens were each answering it
// for themselves and two of them disagreed.
//
// `attendance_logs` carries a status per row, and the backend enumerates
// exactly three when it summarises the day (routes/attendance.js — present,
// absent, late); 'excused' turns up in the data as well, and the mark endpoint
// defaults a row to 'present'. An 'absent' or 'excused' row is a record that
// somebody did NOT come in: it exists for the same member on the same day as
// their other rows, so counting it does not merely add noise, it inflates the
// figure.
//
// What went wrong without this:
//
//   insights/traffic       `records.length`                        — inflated
//   insights/sessions      status === 'present' || 'late'          — correct
//   operations/leaderboard status === 'present' || 'late'          — correct
//
// All three fetch the identical rows — `attendance.list({from, to, type:
// 'client'})` — so "Total Check-ins" for one date range had two different
// answers depending on which page you opened. leaderboard.test.ts already
// pinned the correct rule; traffic simply never used it.
//
// Deliberately NOT pushed into the API as a server-side filter: an attendance
// REGISTER has to show absences, so a list endpoint that hid them would break
// the screens that exist to display them. The rows are right; the counting was
// wrong, and counting is what belongs here.

/** The statuses that mean a body actually came through the door. */
export const CHECKED_IN_STATUSES = ['present', 'late'] as const;

/**
 * True when an attendance row represents an actual visit.
 *
 * Takes the loosest possible shape on purpose — the three callers type their
 * rows differently (`Attendance`, a local row type, and `any` off the wire) and
 * this must not force them to agree on anything but the status field.
 */
export function isCheckIn(row: { status?: string | null } | null | undefined): boolean {
  if (!row) return false;
  return (CHECKED_IN_STATUSES as readonly string[]).includes(String(row.status ?? ''));
}

/** How many of these rows are real visits. */
export function countCheckIns(rows: readonly ({ status?: string | null } | null | undefined)[]): number {
  return rows.reduce<number>((n, r) => n + (isCheckIn(r) ? 1 : 0), 0);
}
