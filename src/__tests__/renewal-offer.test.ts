import { describe, expect, it } from 'vitest';
import { blankRenewalOffer, renewalOfferSchema, toRenewalOfferPayload } from '@/lib/forms/schemas/renewalOffer';

const parse = (v: Partial<Record<'months' | 'amount' | 'packageName' | 'note' | 'validDays', string>>) =>
  renewalOfferSchema.safeParse({ months: '1', amount: '', packageName: '', note: '', validDays: '7', ...v });

describe('renewal offer form', () => {
  it('prefills from the client\'s current term', () => {
    expect(blankRenewalOffer({ duration_months: 3, final_amount: '24000.00' }))
      .toEqual({ months: '3', amount: '24000', packageName: '', note: '', validDays: '7' });
    expect(blankRenewalOffer(null)).toMatchObject({ months: '1', amount: '' });
  });

  it('needs a price, and bounds months and validity like the server', () => {
    expect(parse({}).success).toBe(false);
    expect(parse({ amount: '0' }).success).toBe(false);
    expect(parse({ amount: '9000', months: '25' }).success).toBe(false);
    expect(parse({ amount: '9000', validDays: '31' }).success).toBe(false);
    expect(parse({ amount: '9000', months: '1.5' }).success).toBe(false);
  });

  it('sends only what was filled in', () => {
    const ok = parse({ months: '3', amount: '24000', note: 'Loyalty price' });
    expect(ok.success).toBe(true);
    if (ok.success) {
      expect(toRenewalOfferPayload('c1', ok.data))
        .toEqual({ client_id: 'c1', duration_months: 3, amount: 24000, valid_days: 7, note: 'Loyalty price' });
    }
  });
});
