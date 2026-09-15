/**
 * The GST rate on the payment-settings screen.
 *
 * Two defects, both on the number that goes onto every invoice a studio issues:
 * a blank field passed validation and saved 0%, and any value in 0..100 was
 * accepted so 14% was saveable.
 */

import { describe, it, expect } from 'vitest';
import { gstRateField, GST_SLABS } from '../lib/forms/domain';
import { integerField } from '../lib/forms/primitives';

const gst = gstRateField({ label: 'GST rate', required: true });

describe('the blank that saved 0%', () => {
  it('refuses a blank rather than treating it as 0%', () => {
    // The old check was `Number(gstPercent) >= 0 && <= 100`. Number('') is 0,
    // so blank passed, and `Number(gstPercent) || 0` then saved zero.
    const r = gst.safeParse('');
    expect(r.success).toBe(false);
    expect(r.error!.issues[0]!.message).toBe('GST rate is required.');
  });

  it('refuses whitespace for the same reason', () => {
    expect(gst.safeParse('   ').success).toBe(false);
  });

  it('still accepts a deliberate 0%, which is a real rate', () => {
    // Zero-rated supply exists. What must not happen is zero ARRIVING by
    // accident — the distinction this whole layer is built on.
    expect(gst.safeParse('0').data).toBe(0);
  });
});

describe('the statutory slabs', () => {
  it('accepts every slab', () => {
    for (const slab of GST_SLABS) {
      expect(gst.safeParse(String(slab)).success, `${slab}%`).toBe(true);
    }
  });

  it('refuses a plausible-looking rate that is not a slab', () => {
    // A 14% invoice is not a slightly wrong tax; it is a document the studio
    // cannot file and the member cannot claim.
    for (const bad of ['14', '10', '15', '20', '2.5']) {
      expect(gst.safeParse(bad).success, `${bad}%`).toBe(false);
    }
    expect(gst.safeParse('14').error!.issues[0]!.message).toContain('must be one of');
  });

  it('lists the real slabs in the message, so the fix is obvious', () => {
    const message = gst.safeParse('14').error!.issues[0]!.message;
    for (const slab of GST_SLABS) expect(message).toContain(String(slab));
  });

  it('refuses out-of-range and non-numeric values', () => {
    for (const bad of ['-5', '101', 'abc', '1e999']) {
      expect(gst.safeParse(bad).success, bad).toBe(false);
    }
  });
});

describe('the order TTL', () => {
  const ttl = integerField({ label: 'Link validity', min: 5, max: 1440 });

  it('refuses a blank instead of silently defaulting to 60', () => {
    // `Number(ttl) || 60` turned a blank AND a deliberate 0 into 60, so the
    // user was never told their value had been replaced.
    expect(ttl.safeParse('').data).toBe(null);
    expect(ttl.safeParse('0').success).toBe(false);
  });

  it('enforces the same 5–1440 window the API does', () => {
    expect(ttl.safeParse('4').success).toBe(false);
    expect(ttl.safeParse('5').data).toBe(5);
    expect(ttl.safeParse('1440').data).toBe(1440);
    expect(ttl.safeParse('1441').success).toBe(false);
  });

  it('refuses a fraction rather than rounding it', () => {
    expect(ttl.safeParse('30.5').success).toBe(false);
  });
});
