/**
 * Booking a PT session.
 *
 * ── What this screen did before ─────────────────────────────────────────────
 *
 * `useState<NewSessionData>` and four native controls — a date, a time, a
 * duration select and a notes box — with no schema anywhere between them and
 * `api.pt.createSession`. The dialog's only gate was
 * `disabled={!form.client || !form.time}`, which checks that two strings are
 * non-empty and nothing else.
 *
 * So everything the browser's own controls did not catch went to the server
 * unchecked. `type="date"` and `type="time"` are RENDERING hints: where the
 * native picker is unavailable — several mobile browsers, and any automation
 * driving the page — they degrade to plain text boxes, and "6pm", "25:00" and
 * an empty date all arrive as ordinary strings.
 *
 * `duration` was worse, because it looked safe: `parseInt(e.target.value)`
 * off a select. Bounded today by the options rendered beside it, and bounded
 * by nothing at all if that list ever gains a value or the control is driven
 * directly — and `parseInt` answers NaN, which serialises to null.
 *
 * ── What is deliberately NOT validated here ────────────────────────────────
 *
 * A date in the past. A trainer books the session that renews a lapsed client,
 * and logs a session that already happened; the screen has always allowed both
 * and the tile in the picker says so in words ("booking for someone whose
 * package expired is allowed — it just must not be a surprise"). Adding that
 * rule here would be a new business restriction wearing a validation costume,
 * and it would break a real workflow the day it shipped.
 *
 * The rule this DOES add is the one the old code meant to have: a booking
 * needs a client, a real date and a real time.
 */

import { z } from 'zod';
import { textField, dateField, enumField, booleanField, timeField } from '../primitives';

/** Durations the studio offers. Mirrors the options the dialog renders. */
export const SESSION_DURATIONS = [30, 45, 60, 75, 90, 120] as const;
export type SessionDuration = (typeof SESSION_DURATIONS)[number];

export const SESSION_DURATION_OPTIONS = SESSION_DURATIONS.map((d) => ({
  value: String(d),
  label: `${d} min`,
}));

/** The three session types the dialog offers as chips. */
export const SESSION_TYPES = ['1-on-1', 'Group', 'Assessment'] as const;
export type SessionType = (typeof SESSION_TYPES)[number];

/**
 * How long a note may be.
 *
 * The column is text and the server does not bound it, so this is the only
 * limit. Long enough for a real briefing, short enough that a paste accident
 * is refused at the keyboard rather than stored.
 */
export const MAX_SESSION_NOTES = 1000;

export const ptSessionSchema = z.object({
  /**
   * The client's id, not their name. The name is carried alongside for the
   * confirmation step, but the id is what books the session — selecting by
   * name would book the wrong person the moment a studio has two Ashas.
   */
  client_id: textField({ label: 'Client', required: true, maxLength: 64 }),
  client: textField({ label: 'Client name', required: true, maxLength: 200 }),
  trainer: textField({ label: 'Trainer', required: false, maxLength: 200 }),
  date: dateField({ label: 'Date', required: true }),
  time: timeField({ label: 'Time', required: true }),
  /**
   * Parsed from the select's string value, then required to be one of the
   * durations actually offered. `parseInt` on its own gave NaN for anything
   * unexpected and NaN serialises to null — a session with no duration.
   */
  duration: z.unknown().transform((raw, ctx): SessionDuration => {
    const n = Number(String(raw ?? '').trim());
    if (!Number.isFinite(n) || !SESSION_DURATIONS.includes(n as SessionDuration)) {
      ctx.addIssue({ code: 'custom', message: 'Choose a session length.' });
      return z.NEVER;
    }
    return n as SessionDuration;
  }),
  type: enumField(SESSION_TYPES, { label: 'Session type', required: true }),
  notes: textField({ label: 'Notes', required: false, maxLength: MAX_SESSION_NOTES }),
  recurring: booleanField(),
});

export type PtSessionValues = z.output<typeof ptSessionSchema>;

/**
 * The raw strings the controls render.
 *
 * A type alias rather than an interface, deliberately: an interface gets no
 * implicit index signature, so it is not assignable to `Record<string, unknown>`
 * — which is the constraint useAppForm's `TValues` carries.
 */
export type PtSessionDraft = {
  client_id: string;
  client: string;
  trainer: string;
  date: string;
  time: string;
  duration: string;
  type: SessionType;
  notes: string;
  recurring: boolean;
};

/** Today in the studio's local date, which is what the picker shows. */
function todayLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function blankPtSession(trainer = ''): PtSessionDraft {
  return {
    client_id: '', client: '', trainer,
    date: todayLocal(),
    time: '06:00',
    // A string, because that is what a <select> value is. The schema turns it
    // into the number the API wants.
    duration: '60',
    type: '1-on-1',
    notes: '',
    recurring: false,
  };
}

/** The request body `api.pt.createSession` expects. */
export function toPtSessionPayload(values: PtSessionValues) {
  // `?? ''` on the required fields too, and not because they can be empty: a
  // `required` primitive raises an issue and returns z.NEVER, so submit never
  // reaches here with one missing. The transform's declared output is still
  // `string | null`, and coalescing is the honest way to narrow it — an `!`
  // would assert the same fact while switching off the check that proves it.
  return {
    client: values.client ?? '',
    client_id: values.client_id ?? '',
    trainer: values.trainer ?? '',
    date: values.date ?? '',
    time: values.time ?? '',
    duration: values.duration,
    type: values.type ?? '1-on-1',
    notes: values.notes ?? '',
    recurring: values.recurring,
  };
}
