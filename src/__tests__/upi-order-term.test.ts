/**
 * How an order's term is described on the payment page and in the trainer's
 * verification queue. A balance order buys no time and carries duration 0 —
 * it must never be shown as "0 months".
 */

import { describe, it, expect } from 'vitest';
import { orderTermLabel } from '../components/payments/upi-shared';

describe('orderTermLabel', () => {
  it('describes a membership by its duration', () => {
    expect(orderTermLabel({ kind: 'membership', duration_months: 3 })).toBe('3 months');
    expect(orderTermLabel({ kind: 'membership', duration_months: 1 })).toBe('1 month');
  });

  it('describes a balance order as a balance payment, never "0 months"', () => {
    expect(orderTermLabel({ kind: 'balance', duration_months: 0 })).toBe('Balance payment');
  });
});
