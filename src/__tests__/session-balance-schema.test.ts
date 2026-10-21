/**
 * The session-balance schema — the form that decides what a client is owed.
 *
 * The page used to send `parseInt(totalSessions)` behind `if (!totalSessions)`,
 * so `2.5` became two sessions and nothing said so. These tests pin the rules
 * the endpoint and the `total_sessions INT` column actually impose, and the
 * optional-field semantics the old payload already had.
 */

import { describe, it, expect } from 'vitest';
import {
  sessionBalanceSchema, blankSessionBalance, toSessionBalancePayload,
  MAX_TOTAL_SESSIONS, MAX_PACKAGE_NAME,
} from '@/lib/forms/schemas/sessionBalance';

const valid = () => ({
  ...blankSessionBalance('client-1'),
  total_sessions: '12',
});

const parse = (overrides: Record<string, unknown> = {}) =>
  sessionBalanceSchema.safeParse({ ...valid(), ...overrides });

describe('a package needs a client and a positive whole count', () => {
  it('accepts a complete package', () => {
    const parsed = parse({ package_name: '12 PT Sessions', end_date: '2026-12-31' });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.client_id).toBe('client-1');
      expect(parsed.data.total_sessions).toBe(12);
    }
  });

  it('refuses a blank client', () => {
    const parsed = parse({ client_id: '   ' });
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(parsed.error.issues[0]?.message).toBe('Client is required.');
  });

  it('refuses a blank count instead of turning it into zero', () => {
    // The defect this migration removes: Number('') === 0.
    for (const total_sessions of ['', '   ']) {
      const parsed = parse({ total_sessions });
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.issues[0]?.message).toBe('Total sessions is required.');
      }
    }
  });

  it.each(['0', '-1', '-12'])('refuses %p, which is not a package anyone bought', (total_sessions) => {
    expect(parse({ total_sessions }).success).toBe(false);
  });

  it.each(['2.5', '0.5', '12.0001'])('refuses the fractional count %p rather than rounding it', (total_sessions) => {
    const parsed = parse({ total_sessions });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message).toBe('Total sessions must be a whole number.');
    }
  });

  it.each(['abc', '12 sessions', '1e3'])('refuses the unparseable count %p', (total_sessions) => {
    const parsed = parse({ total_sessions });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message).toBe('Total sessions must be a number.');
    }
  });

  it('accepts both numeric boundaries', () => {
    expect(parse({ total_sessions: '1' }).success).toBe(true);
    expect(parse({ total_sessions: String(MAX_TOTAL_SESSIONS) }).success).toBe(true);
  });

  it('refuses a count the INT column cannot store', () => {
    const parsed = parse({ total_sessions: String(MAX_TOTAL_SESSIONS + 1) });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message).toBe(
        `Total sessions cannot be more than ${MAX_TOTAL_SESSIONS}.`,
      );
    }
  });

  it('accepts a count typed with separators, as the normalizer already does', () => {
    const parsed = parse({ total_sessions: '1,200' });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.total_sessions).toBe(1200);
  });
});

describe('optional fields keep their old meaning', () => {
  it('treats a blank package name as absent', () => {
    const parsed = parse({ package_name: '   ' });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.package_name).toBeNull();
  });

  it('trims a package name', () => {
    const parsed = parse({ package_name: '  Strength Block  ' });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.package_name).toBe('Strength Block');
  });

  it('refuses a package name past the catalogue ceiling', () => {
    const parsed = parse({ package_name: 'x'.repeat(MAX_PACKAGE_NAME + 1) });
    expect(parsed.success).toBe(false);
  });

  it('accepts a blank end date as no expiry', () => {
    const parsed = parse({ end_date: '' });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.end_date).toBeNull();
  });

  it('accepts a real calendar date', () => {
    const parsed = parse({ end_date: '2026-12-31' });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.end_date).toBe('2026-12-31');
  });

  it.each(['2026-02-30', '2026-13-01', '31/12/2026', 'soon'])(
    'refuses the impossible date %p',
    (end_date) => {
      expect(parse({ end_date }).success).toBe(false);
    },
  );

  it('accepts an ISO timestamp from the API and keeps its date half', () => {
    const parsed = parse({ end_date: '2026-12-31T00:00:00.000Z' });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.end_date).toBe('2026-12-31');
  });
});

describe('the payload is the shape the endpoint already received', () => {
  it('sends the numeric count and the selected client id', () => {
    const payload = toSessionBalancePayload(
      sessionBalanceSchema.parse({ ...valid(), total_sessions: '12' }),
    );
    expect(payload).toEqual({
      client_id: 'client-1',
      total_sessions: 12,
      package_name: undefined,
      end_date: undefined,
    });
    expect(typeof payload.total_sessions).toBe('number');
  });

  it('carries the trimmed optional values when present', () => {
    const payload = toSessionBalancePayload(sessionBalanceSchema.parse({
      ...valid(),
      package_name: '  12 PT Sessions  ',
      end_date: '2026-12-31',
    }));
    expect(payload.package_name).toBe('12 PT Sessions');
    expect(payload.end_date).toBe('2026-12-31');
  });

  it('omits the optionals when they are blank', () => {
    const payload = toSessionBalancePayload(sessionBalanceSchema.parse(valid()));
    expect(payload.package_name).toBeUndefined();
    expect(payload.end_date).toBeUndefined();
  });

  it('starts blank, not at zero, so an untouched form cannot submit a package', () => {
    const state = blankSessionBalance();
    expect(state.total_sessions).toBe('');
    expect(sessionBalanceSchema.safeParse(state).success).toBe(false);
  });
});
