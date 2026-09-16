/**
 * A studio's UPI collection settings — the VPA members' money arrives at, and
 * the GST rate every receipt issued afterwards carries.
 *
 * The legacy escapes are the part worth pinning: a studio that saved a
 * non-slab rate or a malformed GSTIN through the old free-text fields must
 * still be able to change its UPI ID, which is an unrelated setting.
 */

import { describe, it, expect } from 'vitest';
import {
  upiSettingsSchema,
  upiSettingsToFormValues,
  toUpiSettingsPayload,
  gstOptions,
  type UpiSettingsState,
} from '../lib/forms/schemas/upiSettings';

const CLEAN = { storedGstPercent: 18, storedGstNumber: null };

function base(over: Partial<UpiSettingsState> = {}): UpiSettingsState {
  return {
    upi_id: 'studio@okhdfcbank',
    merchant_name: 'Abhishek PT Studio',
    gst_percent: '18',
    gst_number: '',
    instructions: '',
    order_ttl_minutes: '60',
    is_enabled: false,
    ...over,
  };
}

function messages(r: { success: boolean; error?: { issues: { message: string }[] } }) {
  return r.success ? [] : r.error!.issues.map((i) => i.message);
}

describe('the VPA is where the money goes', () => {
  it('accepts a well-formed VPA', () => {
    const r = upiSettingsSchema(CLEAN).safeParse(base());
    expect(r.success).toBe(true);
    expect(r.data!.upi_id).toBe('studio@okhdfcbank');
  });

  it.each(['studio', 'studio@', '@bank', 'a@b', 'studio okhdfcbank', ''])(
    'refuses %j', (bad) => {
      expect(upiSettingsSchema(CLEAN).safeParse(base({ upi_id: bad })).success).toBe(false);
    },
  );

  it('requires a merchant name rather than sending an empty one', () => {
    const r = upiSettingsSchema(CLEAN).safeParse(base({ merchant_name: '   ' }));
    expect(r.success).toBe(false);
    expect(messages(r)).toContain('Name shown to the member is required.');
  });

  it('reports an over-long name instead of truncating it silently', () => {
    // The element's maxLength used to swallow the tail of a paste, so the name
    // the member sees differed from the one the studio thought it set.
    const r = upiSettingsSchema(CLEAN).safeParse(base({ merchant_name: 'x'.repeat(121) }));
    expect(r.success).toBe(false);
    expect(messages(r)[0]).toMatch(/cannot be more than 120 characters \(currently 121\)/);
  });
});

describe('GST is statutory, and blank is not zero', () => {
  it.each(['0', '5', '12', '18', '28'])('accepts the %s%% slab', (slab) => {
    const r = upiSettingsSchema(CLEAN).safeParse(base({ gst_percent: slab }));
    expect(r.success).toBe(true);
    expect(r.data!.gst_percent).toBe(Number(slab));
  });

  it('refuses a blank rate rather than saving 0%', () => {
    // `Number('') === 0` put a zero-rated line on every invoice afterwards,
    // and nothing told anyone.
    const r = upiSettingsSchema(CLEAN).safeParse(base({ gst_percent: '' }));
    expect(r.success).toBe(false);
    expect(messages(r)).toContain('GST rate is required.');
  });

  it('refuses a new non-slab rate — 14% is not a slightly wrong tax', () => {
    const r = upiSettingsSchema(CLEAN).safeParse(base({ gst_percent: '14' }));
    expect(r.success).toBe(false);
    expect(messages(r)).toContain('GST rate must be one of 0%, 5%, 12%, 18%, 28%.');
  });

  it('still accepts the non-slab rate a studio already has saved', () => {
    // Otherwise that studio cannot change its UPI ID without first changing
    // its tax rate — a validation rule blocking unrelated work.
    const legacy = { storedGstPercent: 14, storedGstNumber: null };
    const r = upiSettingsSchema(legacy).safeParse(base({ gst_percent: '14' }));
    expect(r.success).toBe(true);
    expect(r.data!.gst_percent).toBe(14);
  });

  it('offers the legacy rate as an option so it renders as selected', () => {
    expect(gstOptions(14).map((o) => o.value)).toEqual(['0', '5', '12', '18', '28', '14']);
    expect(gstOptions(18).map((o) => o.value)).toEqual(['0', '5', '12', '18', '28']);
    expect(gstOptions(null).map((o) => o.value)).toEqual(['0', '5', '12', '18', '28']);
  });
});

describe('GSTIN reaches the receipt, so it is checked', () => {
  it('accepts a valid GSTIN and uppercases it', () => {
    const r = upiSettingsSchema(CLEAN).safeParse(base({ gst_number: '22aaaaa0000a1z5' }));
    expect(r.success).toBe(true);
    expect(r.data!.gst_number).toBe('22AAAAA0000A1Z5');
  });

  it('treats no GSTIN as absent rather than as an empty string', () => {
    const r = upiSettingsSchema(CLEAN).safeParse(base({ gst_number: '  ' }));
    expect(r.success).toBe(true);
    expect(r.data!.gst_number).toBeNull();
  });

  it.each(['22AAAAA0000A1Z', 'NOTAGSTIN', '22AAAAA0000A1Q5'])('refuses %j', (bad) => {
    const r = upiSettingsSchema(CLEAN).safeParse(base({ gst_number: bad }));
    expect(r.success).toBe(false);
    expect(messages(r)).toContain('GSTIN must be 15 characters, like 22AAAAA0000A1Z5.');
  });

  it('still accepts the malformed GSTIN a studio already has saved', () => {
    const legacy = { storedGstPercent: 18, storedGstNumber: 'OLDVALUE' };
    const r = upiSettingsSchema(legacy).safeParse(base({ gst_number: 'OLDVALUE' }));
    expect(r.success).toBe(true);
  });
});

describe('link validity', () => {
  it('refuses a blank rather than defaulting to 60', () => {
    // `Number(ttl) || 60` turned both a blank AND a deliberate 0 into 60.
    const r = upiSettingsSchema(CLEAN).safeParse(base({ order_ttl_minutes: '' }));
    expect(r.success).toBe(false);
    expect(messages(r)).toContain('Link validity is required.');
  });

  it.each(['4', '1441', '0'])('refuses %j, which the backend would reject too', (bad) => {
    expect(upiSettingsSchema(CLEAN).safeParse(base({ order_ttl_minutes: bad })).success).toBe(false);
  });

  it('refuses a fraction rather than rounding it', () => {
    const r = upiSettingsSchema(CLEAN).safeParse(base({ order_ttl_minutes: '60.5' }));
    expect(r.success).toBe(false);
    expect(messages(r)).toContain('Link validity must be a whole number.');
  });
});

describe('rebuilding the form from the record (§11)', () => {
  it('writes every key from a stored record', () => {
    const state = upiSettingsToFormValues({
      upi_id: 'a@b', merchant_name: 'S', gst_percent: '18.00',
      gst_number: null, instructions: null, order_ttl_minutes: 90, is_enabled: true,
    });
    // '18.00' is what pg hands back for NUMERIC. Left as-is it matches no
    // option and the select renders blank, so the first edit would silently
    // change the rate.
    expect(state.gst_percent).toBe('18');
    expect(state.gst_number).toBe('');
    expect(state.instructions).toBe('');
    expect(state.order_ttl_minutes).toBe('90');
    expect(state.is_enabled).toBe(true);
  });

  it('seeds a first-time setup with the studio name and collection OFF', () => {
    const state = upiSettingsToFormValues(null, 'Abhishek PT Studio');
    expect(state.merchant_name).toBe('Abhishek PT Studio');
    // A half-filled configuration must never be able to put a live QR in front
    // of a member.
    expect(state.is_enabled).toBe(false);
    expect(state.upi_id).toBe('');
  });

  it('never leaves is_enabled undefined, whatever the record says', () => {
    expect(upiSettingsToFormValues({ is_enabled: null }).is_enabled).toBe(false);
  });
});

describe('the payload matches what the endpoint accepts', () => {
  it('sends parsed numbers and null for absent optionals', () => {
    const r = upiSettingsSchema(CLEAN).safeParse(base());
    expect(toUpiSettingsPayload(r.data!)).toEqual({
      upi_id: 'studio@okhdfcbank',
      merchant_name: 'Abhishek PT Studio',
      gst_percent: 18,
      gst_number: null,
      is_enabled: false,
      instructions: null,
      order_ttl_minutes: 60,
    });
  });
});
