/**
 * A member's own weekly check-in.
 *
 * Every reading is optional, but an empty check-in is refused; ranges match
 * the server's; and a field left blank is omitted from the payload rather
 * than sent as 0 — "0 hours of sleep" is a claim nobody made.
 */

import { describe, it, expect } from 'vitest';
import {
  memberCheckinSchema, blankMemberCheckin, toMemberCheckinPayload, type MemberCheckinState,
} from '../lib/forms/schemas/memberCheckin';
import type { MeCheckin } from '../lib/api';

function checkin(over: Partial<MemberCheckinState> = {}): MemberCheckinState {
  return { ...blankMemberCheckin(), ...over };
}

function messages(r: ReturnType<typeof memberCheckinSchema.safeParse>) {
  return r.success ? [] : r.error.issues.map((i) => i.message);
}

describe('memberCheckinSchema', () => {
  it('refuses an empty check-in', () => {
    const r = memberCheckinSchema.safeParse(checkin());
    expect(r.success).toBe(false);
    expect(messages(r)).toContain('Add at least one reading to your check-in.');
  });

  it('accepts a single reading', () => {
    expect(memberCheckinSchema.safeParse(checkin({ mood: 'tired' })).success).toBe(true);
    expect(memberCheckinSchema.safeParse(checkin({ notes: 'Knee sore on Tuesday' })).success).toBe(true);
  });

  it('enforces the server ranges', () => {
    expect(memberCheckinSchema.safeParse(checkin({ weight: '10' })).success).toBe(false);
    expect(memberCheckinSchema.safeParse(checkin({ sleepHours: '25' })).success).toBe(false);
    expect(memberCheckinSchema.safeParse(checkin({ energyLevel: '0' })).success).toBe(false);
    expect(memberCheckinSchema.safeParse(checkin({ stressLevel: '11' })).success).toBe(false);
    expect(memberCheckinSchema.safeParse(checkin({ waterGlasses: '2.5' })).success).toBe(false);
    expect(memberCheckinSchema.safeParse(checkin({ notes: 'x'.repeat(1001) })).success).toBe(false);
  });

  it('refuses a mood the server does not know', () => {
    expect(memberCheckinSchema.safeParse(checkin({ mood: 'ecstatic' })).success).toBe(false);
  });
});

describe('toMemberCheckinPayload', () => {
  it('sends only the readings given, in API names', () => {
    const r = memberCheckinSchema.safeParse(checkin({ weight: '72.5', mood: 'good', energyLevel: '7' }));
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(toMemberCheckinPayload(r.data)).toEqual({ weight: 72.5, mood: 'good', energy_level: 7 });
  });
});

describe('blankMemberCheckin', () => {
  it('prefills from this week\'s check-in, turning numeric strings into plain numbers', () => {
    const existing = {
      id: 'c1', week_start_date: '2026-09-21', weight: '72.50', mood: 'okay', sleep_hours: '7.0',
      water_glasses: 8, energy_level: 6, stress_level: null, soreness_level: 3,
      client_notes: 'Busy week', created_at: '', updated_at: '',
    } as unknown as MeCheckin;
    expect(blankMemberCheckin(existing)).toEqual({
      weight: '72.5', mood: 'okay', sleepHours: '7', waterGlasses: '8',
      energyLevel: '6', stressLevel: '', sorenessLevel: '3', notes: 'Busy week',
    });
  });
});
