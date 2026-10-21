import { describe, expect, it } from 'vitest';
import {
  WEEKLY_CHECKIN_MOODS, blankWeeklyCheckin, toWeeklyCheckinPayload, weeklyCheckinSchema,
} from '@/lib/forms/schemas/weeklyCheckin';

const CLIENT_ID = '11111111-1111-4111-8111-111111111111';
const WEEK = '2026-10-19';

const raw = (overrides: Record<string, unknown> = {}) => ({
  ...blankWeeklyCheckin(WEEK),
  client_id: CLIENT_ID,
  ...overrides,
});

const parse = (overrides: Record<string, unknown> = {}) =>
  weeklyCheckinSchema.safeParse(raw(overrides));

const message = (overrides: Record<string, unknown> = {}) => {
  const result = parse(overrides);
  return result.success ? null : result.error.issues[0]?.message;
};

const values = (overrides: Record<string, unknown> = {}) => {
  const result = parse(overrides);
  if (!result.success) throw new Error(result.error.issues[0]?.message);
  return result.data;
};

const sent = (overrides: Record<string, unknown> = {}) =>
  JSON.parse(JSON.stringify(toWeeklyCheckinPayload(values(overrides))));

describe('weekly check-in schema', () => {
  it('opens on this week, in a good mood, with every reading blank', () => {
    expect(blankWeeklyCheckin(WEEK)).toEqual({
      client_id: '',
      week_start_date: WEEK,
      weight: '',
      mood: 'good',
      sleep_hours: '',
      water_glasses: '',
      workout_count: '',
      adherence_pct: '',
      trainer_notes: '',
      stress_level: '',
      energy_level: '',
      soreness_level: '',
    });
  });

  it('requires a real client UUID and a real date', () => {
    expect(message({ client_id: '' })).toBe('Client is required.');
    expect(message({ client_id: 'client-1' })).toBe('Select a valid client.');
    expect(message({ week_start_date: '' })).toBe('Week starting is required.');
    expect(message({ week_start_date: '2026-02-31' })).toBe('Week starting is not a real date.');
    expect(message({ week_start_date: '19/10/2026' })).toBe('Week starting must be a valid date.');
    expect(parse().success).toBe(true);
  });

  it('accepts all five moods and rejects anything else', () => {
    for (const mood of WEEKLY_CHECKIN_MOODS) {
      expect(parse({ mood }).success).toBe(true);
    }
    expect(message({ mood: 'happy' })).toBe('Mood is not a valid choice.');
    expect(message({ mood: '' })).toBe('Mood is required.');
  });

  it('accepts the weight boundaries, including halves, and rejects outside them', () => {
    expect(values({ weight: '20' }).weight).toBe(20);
    expect(values({ weight: '72.5' }).weight).toBe(72.5);
    expect(values({ weight: '400' }).weight).toBe(400);
    expect(message({ weight: '19.9' })).toBe('Weight must be at least 20 kg.');
    expect(message({ weight: '400.1' })).toBe('Weight cannot be more than 400 kg.');
    expect(message({ weight: 'seventy' })).toBe('Weight must be a number.');
  });

  it('accepts fractional sleep from 0 to 24', () => {
    expect(values({ sleep_hours: '0' }).sleep_hours).toBe(0);
    expect(values({ sleep_hours: '7.5' }).sleep_hours).toBe(7.5);
    expect(values({ sleep_hours: '24' }).sleep_hours).toBe(24);
    expect(message({ sleep_hours: '-0.5' })).toBe('Sleep cannot be negative.');
    expect(message({ sleep_hours: '24.5' })).toBe('Sleep cannot be more than 24 hours.');
    expect(message({ sleep_hours: 'seven' })).toBe('Sleep must be a number.');
  });

  it('rejects fractions in water and workouts rather than truncating them', () => {
    expect(values({ water_glasses: '0' }).water_glasses).toBe(0);
    expect(values({ water_glasses: '40' }).water_glasses).toBe(40);
    expect(message({ water_glasses: '2.5' })).toBe('Water must be a whole number.');
    expect(message({ water_glasses: '41' })).toBe('Water cannot be more than 40 glasses.');
    expect(values({ workout_count: '21' }).workout_count).toBe(21);
    expect(message({ workout_count: '4.5' })).toBe('Workouts must be a whole number.');
    expect(message({ workout_count: '22' })).toBe('Workouts cannot be more than 21.');
  });

  it('accepts fractional adherence because the server does', () => {
    expect(values({ adherence_pct: '0' }).adherence_pct).toBe(0);
    expect(values({ adherence_pct: '87.5' }).adherence_pct).toBe(87.5);
    expect(values({ adherence_pct: '100' }).adherence_pct).toBe(100);
    expect(message({ adherence_pct: '-1' })).toBe('Adherence cannot be negative.');
    expect(message({ adherence_pct: '101' })).toBe('Adherence cannot be more than 100 %.');
  });

  it('keeps every readiness reading whole and between 1 and 10', () => {
    for (const key of ['stress_level', 'energy_level', 'soreness_level']) {
      expect(values({ [key]: '1' })[key]).toBe(1);
      expect(values({ [key]: '10' })[key]).toBe(10);
      expect(parse({ [key]: '' }).success).toBe(true);
      expect(message({ [key]: '0' })).toMatch(/must be at least 1/);
      expect(message({ [key]: '11' })).toMatch(/cannot be more than 10/);
      expect(message({ [key]: '2.5' })).toMatch(/whole number/);
    }
  });

  it('trims the notes and caps them at the server limit', () => {
    expect(values({ trainer_notes: '  Good week  ' }).trainer_notes).toBe('Good week');
    expect(values({ trainer_notes: 'x'.repeat(2000) }).trainer_notes).toHaveLength(2000);
    expect(message({ trainer_notes: 'x'.repeat(2001) }))
      .toBe('Trainer notes cannot be more than 2000 characters (currently 2001).');
  });

  it('sends typed numbers and omits every blank optional', () => {
    expect(sent()).toEqual({
      client_id: CLIENT_ID,
      week_start_date: WEEK,
      mood: 'good',
    });

    expect(sent({
      weight: ' 72.5 ',
      mood: 'great',
      sleep_hours: '7.5',
      water_glasses: '8',
      workout_count: '4',
      adherence_pct: '87.5',
      trainer_notes: '  Good week  ',
      stress_level: '3',
      energy_level: '8',
      soreness_level: '4',
    })).toEqual({
      client_id: CLIENT_ID,
      week_start_date: WEEK,
      weight: 72.5,
      mood: 'great',
      sleep_hours: 7.5,
      water_glasses: 8,
      workout_count: 4,
      adherence_pct: 87.5,
      trainer_notes: 'Good week',
      stress_level: 3,
      energy_level: 8,
      soreness_level: 4,
    });
  });
});
