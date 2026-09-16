/**
 * A dues reminder went to every member, including everyone who had paid.
 *
 * `routes/communication.js` targets recipients by switching on `audience`:
 *
 *     if      (audience === 'expiring') …PT ending within 7 days
 *     else if (audience === 'dues')     …balance_amount > 0
 *     else if (audience === 'pt')       …all active PT clients
 *     else if (audience === 'expired')  …status 'expired'
 *     else                              …EVERY active client
 *
 * The form sent the display labels — `'Has Outstanding Dues'`,
 * `'Expiring This Week'`, `'PT Members'`. Not one matches a branch, so every
 * targeted send fell through to the `else`.
 *
 * ── Measured against the running backend, not inferred ──────────────────────
 *
 * With a fixture of one client owing money and two active clients in total:
 *
 *     audience='dues'                 → recipients=1
 *     audience='Has Outstanding Dues' → recipients=2   ← what the form sent
 *     audience='all'                  → recipients=2
 *
 * The confirmation toast then reported the number it had actually reached, so
 * the count looked plausible rather than wrong.
 *
 * Both columns are plain TEXT with no CHECK, so nothing downstream could have
 * caught it either.
 */

import { describe, it, expect } from 'vitest';
import {
  notificationSchema, blankNotification, toNotificationPayload,
  audienceLabel, notificationTypeLabel,
  NOTIFICATION_AUDIENCES, NOTIFICATION_TYPES,
  AUDIENCE_OPTIONS, NOTIFICATION_LIMITS,
} from '@/lib/forms/schemas/notification';

const draft = { ...blankNotification(), title: 'Renewal due', body: 'Please settle your balance.' };

describe('the audience actually sent', () => {
  it('posts the value the server branches on, not the label', () => {
    const r = notificationSchema.safeParse({ ...draft, audience: 'dues' });
    expect(r.success).toBe(true);
    if (r.success) expect(toNotificationPayload(r.data).audience).toBe('dues');
  });

  it('refuses the display label the old form was sending', () => {
    // This is the defect, pinned. 'Has Outstanding Dues' matched no branch and
    // silently meant "everyone".
    const r = notificationSchema.safeParse({ ...draft, audience: 'Has Outstanding Dues' });
    expect(r.success).toBe(false);
  });

  it('offers exactly the five the server can target', () => {
    expect([...NOTIFICATION_AUDIENCES]).toEqual(['all', 'expiring', 'dues', 'pt', 'expired']);
    expect(AUDIENCE_OPTIONS.map((o) => o.value)).toEqual([...NOTIFICATION_AUDIENCES]);
  });

  it('says who each one reaches, before the send rather than after', () => {
    // The recipient count used to appear only in the success toast — after the
    // message had gone out.
    for (const option of AUDIENCE_OPTIONS) {
      expect(option.hint.length).toBeGreaterThan(0);
    }
    expect(AUDIENCE_OPTIONS.find((o) => o.value === 'dues')!.hint).toMatch(/outstanding balance/i);
  });
});

describe('reading a stored audience back', () => {
  it('labels the canonical value', () => {
    expect(audienceLabel('dues')).toBe('Has Outstanding Dues');
    expect(audienceLabel('all')).toBe('All Active Members');
  });

  it('still labels the rows sent before this, which stored the label itself', () => {
    expect(audienceLabel('Has Outstanding Dues')).toBe('Has Outstanding Dues');
    expect(audienceLabel('All Active Members')).toBe('All Active Members');
  });

  it('shows an unrecognised value as itself rather than relabelling it', () => {
    expect(audienceLabel('some-old-value')).toBe('some-old-value');
  });
});

describe('reading a stored type back', () => {
  it('handles both the canonical value and the emoji label already stored', () => {
    expect(notificationTypeLabel('birthday')).toBe('Birthday 🎂');
    expect(notificationTypeLabel('Birthday 🎂')).toBe('Birthday 🎂');
  });

  it('defaults new sends to the type the column itself defaults to', () => {
    expect(blankNotification().type).toBe('announcement');
    expect([...NOTIFICATION_TYPES]).toContain('announcement');
  });
});

describe('the message itself', () => {
  it('refuses a title that is only whitespace', () => {
    // The server refuses only a FALSY title, so ' ' passed both its check and
    // the browser's `required` and sent a blank headline to every member.
    expect(notificationSchema.safeParse({ ...draft, title: '   ' }).success).toBe(false);
  });

  it('refuses an empty body', () => {
    expect(notificationSchema.safeParse({ ...draft, body: '  ' }).success).toBe(false);
  });

  it('bounds the title and body, which the columns do not', () => {
    expect(notificationSchema.safeParse({
      ...draft, title: 'x'.repeat(NOTIFICATION_LIMITS.title + 1),
    }).success).toBe(false);
    expect(notificationSchema.safeParse({
      ...draft, body: 'y'.repeat(NOTIFICATION_LIMITS.body + 1),
    }).success).toBe(false);
  });

  it('trims what it accepts', () => {
    const r = notificationSchema.safeParse({ ...draft, title: '  Renewal due  ' });
    expect(r.success && r.data.title).toBe('Renewal due');
  });

  it('starts blank on the safest audience', () => {
    // 'all' is the only one where reaching everyone is what was asked for.
    expect(blankNotification().audience).toBe('all');
  });
});
