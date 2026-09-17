/**
 * A broadcast notification — a message that reaches real members.
 *
 * ── The defect this schema exists to remove ─────────────────────────────────
 *
 * `routes/communication.js` targets recipients by switching on `audience`:
 *
 *     if      (audience === 'expiring') …clients whose PT ends within 7 days
 *     else if (audience === 'dues')     …clients with balance_amount > 0
 *     else if (audience === 'pt')       …all active PT clients
 *     else if (audience === 'expired')  …clients with status 'expired'
 *     else                              …EVERY active client
 *
 * The form sent the display labels: `'All Active Members'`,
 * `'Expiring This Week'`, `'Has Outstanding Dues'`, `'PT Members'`,
 * `'Expired Members'`. Not one of them matches a branch, so every send fell
 * through to the `else`.
 *
 * A studio owner picking "Has Outstanding Dues" to chase four late payers sent
 * that message to every active member — including everyone who had already
 * paid — and the confirmation reported the number it had actually reached, so
 * the count looked plausible rather than wrong. `type` had the same shape:
 * `'Birthday 🎂'` was stored verbatim in a column whose default is
 * `'announcement'`.
 *
 * Both columns are plain TEXT with no CHECK, so nothing downstream could have
 * caught it either.
 *
 * The vocabulary is therefore stated ONCE, here, in the values the server
 * actually branches on, with the labels kept separately for display. Reading
 * is tolerant of what is already stored, so the history list still renders
 * rows written before this.
 */

import { z } from 'zod';
import { textField, enumField } from '../primitives';

/* ── Audience ────────────────────────────────────────────────────────────── */

/** Exactly the values `routes/communication.js` branches on. */
export const NOTIFICATION_AUDIENCES = ['all', 'expiring', 'dues', 'pt', 'expired'] as const;
export type NotificationAudience = (typeof NOTIFICATION_AUDIENCES)[number];

const AUDIENCE_LABELS: Record<NotificationAudience, string> = {
  all: 'All Active Members',
  expiring: 'Expiring This Week',
  dues: 'Has Outstanding Dues',
  pt: 'PT Members',
  expired: 'Expired Members',
};

/** What each audience will actually reach — shown before the send, not after. */
const AUDIENCE_HINTS: Record<NotificationAudience, string> = {
  all: 'Every active member',
  expiring: 'Active members whose PT ends within 7 days',
  dues: 'Active members with an outstanding balance',
  pt: 'All active PT members',
  expired: 'Members whose membership has expired',
};

export const AUDIENCE_OPTIONS = NOTIFICATION_AUDIENCES.map((value) => ({
  value,
  label: AUDIENCE_LABELS[value],
  hint: AUDIENCE_HINTS[value],
}));

/**
 * Read a stored audience, whatever was written into the column.
 *
 * Tolerant of the display labels the old form saved, so the history list still
 * reads correctly for rows sent before this — and an unrecognised value is
 * shown as itself rather than relabelled as something it is not.
 */
export function audienceLabel(raw: string | null | undefined): string {
  const key = String(raw ?? '').trim().toLowerCase();
  if (key in AUDIENCE_LABELS) return AUDIENCE_LABELS[key as NotificationAudience];
  const byLabel = NOTIFICATION_AUDIENCES.find(
    (a) => AUDIENCE_LABELS[a].toLowerCase() === key,
  );
  return byLabel ? AUDIENCE_LABELS[byLabel] : String(raw ?? '').trim();
}

/* ── Type ────────────────────────────────────────────────────────────────── */

/** The column's default is 'announcement', so that is the vocabulary's base. */
export const NOTIFICATION_TYPES = [
  'announcement', 'birthday', 'expiry', 'dues', 'anniversary', 'custom',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

const TYPE_LABELS: Record<NotificationType, string> = {
  announcement: 'General 📢',
  birthday: 'Birthday 🎂',
  expiry: 'Expiry Reminder ⚠️',
  dues: 'Due Reminder 💳',
  anniversary: 'Anniversary 🎉',
  custom: 'Custom',
};

export const TYPE_OPTIONS = NOTIFICATION_TYPES.map((value) => ({
  value,
  label: TYPE_LABELS[value],
}));

/** As with the audience: tolerant of the emoji labels already in the column. */
export function notificationTypeLabel(raw: string | null | undefined): string {
  const key = String(raw ?? '').trim().toLowerCase();
  if (key in TYPE_LABELS) return TYPE_LABELS[key as NotificationType];
  const byLabel = NOTIFICATION_TYPES.find((t) => TYPE_LABELS[t].toLowerCase() === key);
  return byLabel ? TYPE_LABELS[byLabel] : String(raw ?? '').trim();
}

/* ── The form ────────────────────────────────────────────────────────────── */

/**
 * A push notification's practical ceiling.
 *
 * Both columns are unbounded TEXT, but the body is delivered as an in-app
 * notification row and read on a phone. Past this it is not being read.
 */
export const NOTIFICATION_LIMITS = { title: 120, body: 1000 } as const;

export const notificationSchema = z.object({
  // The server refuses only a FALSY title, so a single space passed both its
  // check and the browser's `required` and sent a blank headline to everyone.
  title: textField({ label: 'Title', required: true, maxLength: NOTIFICATION_LIMITS.title }),
  body: textField({ label: 'Message', required: true, maxLength: NOTIFICATION_LIMITS.body }),
  type: enumField(NOTIFICATION_TYPES, { label: 'Type', required: true }),
  audience: enumField(NOTIFICATION_AUDIENCES, { label: 'Audience', required: true }),
});

export type NotificationValues = z.output<typeof notificationSchema>;

/** The form's raw state — see the note on `type` vs `interface` in campaign.ts. */
export type NotificationState = {
  title: string;
  body: string;
  type: NotificationType;
  audience: NotificationAudience;
};

export function blankNotification(): NotificationState {
  return { title: '', body: '', type: 'announcement', audience: 'all' };
}

export function toNotificationPayload(v: NotificationValues) {
  return {
    title: v.title as string,
    body: v.body as string,
    type: v.type as NotificationType,
    audience: v.audience as NotificationAudience,
  };
}
