/**
 * Booking a PT session, and the four unchecked values it used to send.
 *
 * ── What was there ─────────────────────────────────────────────────────────
 *
 * `useState<NewSessionData>` and four native controls — date, time, a duration
 * select and a notes box — with nothing between them and
 * `api.pt.createSession`. The only gate was
 * `disabled={!form.client || !form.time}`: two strings being non-empty.
 *
 * `type="date"` and `type="time"` are RENDERING hints, not guarantees. Where
 * the native picker is unavailable — several mobile browsers, and anything
 * driving the page programmatically — they degrade to plain text boxes, and
 * "6pm", "25:00" and an empty date all arrive as ordinary strings that pass
 * `!form.time`.
 *
 * `duration` looked like the safe one and was the worst:
 * `parseInt(e.target.value)` answers NaN for anything unexpected, and NaN
 * serialises to null — a booked session with no length.
 */

import { describe, it, expect } from 'vitest';
import {
  ptSessionSchema, blankPtSession, toPtSessionPayload,
  SESSION_DURATIONS, MAX_SESSION_NOTES,
} from '@/lib/forms/schemas/ptSession';
import { timeField } from '@/lib/forms/primitives';
import { z } from 'zod';

const valid = () => ({
  ...blankPtSession('Coach A'),
  client: 'Asha', client_id: 'client-1',
});

describe('a booking needs a client, a real date and a real time', () => {
  it('accepts a complete booking', () => {
    const parsed = ptSessionSchema.safeParse(valid());
    expect(parsed.success).toBe(true);
  });

  it('refuses a booking with no client', () => {
    const parsed = ptSessionSchema.safeParse({ ...valid(), client_id: '' });
    expect(parsed.success).toBe(false);
  });

  it.each(['', '6pm', '25:00', '12:99', 'noon'])('refuses the time %p', (time) => {
    // Every one of these passed `!form.time` and went to the server.
    const parsed = ptSessionSchema.safeParse({ ...valid(), time });
    expect(parsed.success).toBe(false);
  });

  it.each(['', '2026-13-01', '2026-02-30', 'tomorrow'])('refuses the date %p', (date) => {
    const parsed = ptSessionSchema.safeParse({ ...valid(), date });
    expect(parsed.success).toBe(false);
  });
});

describe('duration can no longer arrive as null', () => {
  it.each(SESSION_DURATIONS)('accepts the offered duration %p', (d) => {
    const parsed = ptSessionSchema.safeParse({ ...valid(), duration: String(d) });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.duration).toBe(d);
  });

  it.each(['', 'abc', '7', '999'])('refuses %p rather than sending NaN', (duration) => {
    // parseInt('abc') is NaN, and NaN serialises to null — a session with no
    // length, stored, with nothing anywhere reporting a problem.
    const parsed = ptSessionSchema.safeParse({ ...valid(), duration });
    expect(parsed.success).toBe(false);
  });

  it('produces a number, not the string the select carries', () => {
    const parsed = ptSessionSchema.parse({ ...valid(), duration: '90' });
    expect(parsed.duration).toBe(90);
    expect(typeof parsed.duration).toBe('number');
  });
});

describe('the rule that is deliberately absent', () => {
  it('still allows a session dated in the past', () => {
    // A trainer books the session that renews a lapsed client, and logs one
    // that already happened. The screen has always allowed both. Adding a
    // "no past dates" rule here would be a new business restriction wearing a
    // validation costume, and it would break a real workflow on the day it
    // shipped.
    const parsed = ptSessionSchema.safeParse({ ...valid(), date: '2020-01-15' });
    expect(parsed.success).toBe(true);
  });
});

describe('notes are bounded', () => {
  it('accepts a real briefing', () => {
    const parsed = ptSessionSchema.safeParse({ ...valid(), notes: 'Focus on hip hinge.' });
    expect(parsed.success).toBe(true);
  });

  it('refuses a paste accident', () => {
    // The column is text and the server bounds nothing, so this is the only limit.
    const parsed = ptSessionSchema.safeParse({ ...valid(), notes: 'x'.repeat(MAX_SESSION_NOTES + 1) });
    expect(parsed.success).toBe(false);
  });
});

describe('the payload', () => {
  it('sends the id, not the name, as the client', () => {
    // Selecting by name books the wrong person the moment a studio has two
    // clients called Asha.
    const payload = toPtSessionPayload(ptSessionSchema.parse(valid()));
    expect(payload.client_id).toBe('client-1');
    expect(payload.client).toBe('Asha');
  });

  it('carries every field the create call reads', () => {
    const payload = toPtSessionPayload(ptSessionSchema.parse(valid()));
    expect(Object.keys(payload).sort()).toEqual(
      ['client', 'client_id', 'date', 'duration', 'notes', 'recurring', 'time', 'trainer', 'type'],
    );
  });
});

describe('timeField', () => {
  const schema = z.object({ t: timeField({ label: 'Time', required: true }) });
  const parse = (t: unknown) => schema.safeParse({ t });

  it('accepts a wall-clock time', () => {
    expect(parse('18:30').success).toBe(true);
  });

  it('zero-pads, so 6:05 and 06:05 are one value', () => {
    // The API compares these as strings and would otherwise treat them as
    // different times.
    const parsed = schema.parse({ t: '6:05' });
    expect(parsed.t).toBe('06:05');
  });

  it('accepts seconds and discards them', () => {
    // Firefox and Safari append :SS when the control has a step. The seconds
    // are always zero and nothing stores them — rejecting them would make the
    // same form work in one browser and fail in another.
    expect(schema.parse({ t: '18:30:00' }).t).toBe('18:30');
  });

  it.each(['29:99', '24:00', '18:60'])('refuses %p, which matches the pattern but is not a time', (t) => {
    expect(parse(t).success).toBe(false);
  });

  it('refuses free text', () => {
    expect(parse('half six').success).toBe(false);
  });

  it('is optional when not required', () => {
    const optional = z.object({ t: timeField({ label: 'Time' }) });
    expect(optional.parse({ t: '' }).t).toBeNull();
  });
});
