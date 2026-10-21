import { describe, expect, it } from 'vitest';
import {
  programmeCreateDefaults, programmeCreateSchema, toProgrammeCreatePayload,
} from '@/lib/forms/schemas/programmeCreate';

const BASE = {
  client_id: 'client-1',
  name: 'Meet prep',
  goal: 'strength',
  difficulty: 'advanced',
  duration_weeks: '12',
};

const parse = (values: Record<string, unknown>, maxWeeks = 52) =>
  programmeCreateSchema(maxWeeks).safeParse(values);

const message = (result: ReturnType<typeof parse>) =>
  result.success ? null : result.error.issues[0]?.message;

const values = (overrides: Record<string, unknown> = {}) => {
  const result = parse({ ...BASE, ...overrides });
  if (!result.success) throw new Error(result.error.issues[0]?.message);
  return result.data;
};

describe('programme create schema', () => {
  it('converts the raw fields to typed values once', () => {
    expect(values()).toEqual({
      client_id: 'client-1',
      name: 'Meet prep',
      goal: 'strength',
      difficulty: 'advanced',
      duration_weeks: 12,
    });
  });

  it('opens with the old defaults and the preset client', () => {
    expect(programmeCreateDefaults('client-1')).toEqual({
      client_id: 'client-1',
      name: '',
      goal: 'muscle_gain',
      difficulty: 'intermediate',
      duration_weeks: '4',
    });
    expect(programmeCreateDefaults()).toMatchObject({ client_id: '' });
  });

  it('requires a client, a name, a goal and a difficulty', () => {
    expect(message(parse({ ...BASE, client_id: ' ' }))).toBe('Client is required.');
    expect(message(parse({ ...BASE, name: ' ' }))).toBe('Programme name is required.');
    expect(message(parse({ ...BASE, goal: '' }))).toBe('Goal is required.');
    expect(message(parse({ ...BASE, difficulty: ' ' }))).toBe('Difficulty is required.');
  });

  it('trims the name and the client id', () => {
    const parsed = values({ client_id: ' client-1 ', name: '  Meet prep  ' });
    expect(parsed.client_id).toBe('client-1');
    expect(parsed.name).toBe('Meet prep');
  });

  it('accepts both week boundaries', () => {
    expect(values({ duration_weeks: '1' }).duration_weeks).toBe(1);
    expect(values({ duration_weeks: '52' }).duration_weeks).toBe(52);
  });

  it('never turns a blank or unparseable week box into a number', () => {
    expect(message(parse({ ...BASE, duration_weeks: '' }))).toBe('Weeks is required.');
    expect(message(parse({ ...BASE, duration_weeks: '0' })))
      .toBe('Weeks must be at least 1.');
    expect(message(parse({ ...BASE, duration_weeks: '53' })))
      .toBe('Weeks cannot be more than 52.');
    expect(message(parse({ ...BASE, duration_weeks: '2.5' })))
      .toBe('Weeks must be a whole number.');
    expect(message(parse({ ...BASE, duration_weeks: 'abc' })))
      .toBe('Weeks must be a number.');
  });

  it('rejects a name longer than the old input allowed', () => {
    expect(message(parse({ ...BASE, name: 'x'.repeat(121) })))
      .toContain('currently 121');
  });
});

describe('programme create payload', () => {
  it('sends the created values, never a template or a server-owned count', () => {
    expect(toProgrammeCreatePayload(values())).toEqual({
      name: 'Meet prep',
      goal: 'strength',
      difficulty: 'advanced',
      duration_weeks: 12,
      is_template: false,
    });
  });
});
