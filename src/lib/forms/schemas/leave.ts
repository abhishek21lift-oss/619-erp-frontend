/**
 * A trainer's leave request.
 *
 * ── The vocabulary, and the value that could never be filed ─────────────────
 *
 * Three lists name the leave types a studio may file, and until backend
 * migration 204 they disagreed. The database's CHECK constraint, written in
 * `001_v4_upgrade.sql` and restated unchanged in `002a`, allowed six values.
 * `routes/leave.js` validated against seven, and this page's dropdown offered
 * the same seven. The extra one was `personal`.
 *
 * So a trainer picking "Personal" — the natural choice for the very example
 * the Reason box suggests, "personal emergency" — passed the browser, passed
 * the route's own validation, and then violated the constraint on the INSERT.
 * A Postgres error surfacing as a 500: no field marked, nothing to correct,
 * and a perfectly ordinary request that simply could not be filed.
 *
 * The constraint was widened rather than the value dropped, because two
 * independent places had already been written to accept it. The list below is
 * the third, and `leaveTypeVocabulary.test.js` on the server pins all three
 * against each other from here on.
 */

import { z } from 'zod';
import { textField, dateField, enumField } from '../primitives';
import { refineDateOrder } from '../domain';

/** Mirrors `VALID_LEAVE_TYPES` in `routes/leave.js` and the CHECK in migration 204. */
export const LEAVE_TYPES = [
  'sick', 'casual', 'personal', 'earned', 'emergency', 'unpaid', 'other',
] as const;
export type LeaveType = (typeof LEAVE_TYPES)[number];

export const LEAVE_TYPE_OPTIONS = LEAVE_TYPES.map((value) => ({
  value,
  label: value.charAt(0).toUpperCase() + value.slice(1),
}));

/**
 * How long a single request may cover.
 *
 * A year. The server bounds neither the length nor how far ahead a request
 * reaches, so a mistyped year — 2027 for 2026 — files a 365-day absence that
 * an approver sees as one line in a list and may well wave through. A request
 * longer than this is not leave, it is an employment change.
 */
export const MAX_LEAVE_DAYS = 366;

export const leaveRequestSchema = z
  .object({
    trainerId: textField({ label: 'Trainer', required: true, maxLength: 64 }),
    leaveType: enumField(LEAVE_TYPES, { label: 'Leave type', required: true }),
    fromDate: dateField({ label: 'From date', required: true }),
    toDate: dateField({ label: 'To date', required: true }),
    // The column is plain TEXT with no length, but a reason is read in a list
    // row; past a few sentences it is not being read at all.
    reason: textField({ label: 'Reason', maxLength: 1000 }),
  })
  // Same day is allowed, and is the common case: most leave is one day.
  .superRefine(refineDateOrder('fromDate', 'toDate', {
    startLabel: 'From date', endLabel: 'To date', allowSameDay: true,
  }))
  .superRefine((v, ctx) => {
    if (typeof v.fromDate !== 'string' || typeof v.toDate !== 'string') return;
    const days = leaveDays(v.fromDate, v.toDate);
    if (days !== null && days > MAX_LEAVE_DAYS) {
      ctx.addIssue({
        code: 'custom',
        path: ['toDate'],
        message: `That is ${days} days. A single request cannot cover more than ${MAX_LEAVE_DAYS} — check the year.`,
      });
    }
  });

export type LeaveRequestValues = z.output<typeof leaveRequestSchema>;

/** The form's raw state — one string per control. See the note in campaign.ts. */
export type LeaveRequestState = {
  trainerId: string;
  leaveType: LeaveType;
  fromDate: string;
  toDate: string;
  reason: string;
};

export function blankLeaveRequest(): LeaveRequestState {
  return { trainerId: '', leaveType: 'sick', fromDate: '', toDate: '', reason: '' };
}

/**
 * Whole days covered, inclusive of both ends.
 *
 * Built from the date PARTS at UTC noon rather than from `new Date(iso)`,
 * which parses a bare 'YYYY-MM-DD' as UTC midnight: a subtraction across a DST
 * boundary then lands an hour short and floors to a day fewer. Noon is far
 * enough from either edge that no offset in use can cross it.
 */
export function leaveDays(fromDate: string, toDate: string): number | null {
  const parse = (s: string) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12) : null;
  };
  const from = parse(fromDate);
  const to = parse(toDate);
  if (from === null || to === null || to < from) return null;
  return Math.round((to - from) / 86400000) + 1;
}

export function toLeaveRequestPayload(v: LeaveRequestValues) {
  return {
    trainer_id: v.trainerId as string,
    leave_type: v.leaveType as LeaveType,
    from_date: v.fromDate as string,
    to_date: v.toDate as string,
    reason: v.reason ?? undefined,
  };
}
