// The renewal charts must add up to the server's cohort, not to whatever the
// capped 100-row pipeline happened to contain.
//
// The two derived numbers are subtractions, which is exactly where a chart
// starts lying: a renewed count above the cohort would draw a negative slice,
// and treating expiring_30d as a separate bucket would double-count the week
// already inside it.

import { describe, expect, it } from 'vitest';
import { expiryBuckets, renewalSplit } from '@/lib/insights/metrics';

describe('renewalSplit', () => {
  it('splits the cohort into renewed and lapsed', () => {
    expect(renewalSplit({ expired_cohort: 10, renewed_of_cohort: 4 }))
      .toEqual({ renewed: 4, lapsed: 6 });
  });

  it('never draws a negative lapsed slice', () => {
    // A bad payload, not a real studio: renewed can never exceed the cohort.
    expect(renewalSplit({ expired_cohort: 4, renewed_of_cohort: 9 }))
      .toEqual({ renewed: 9, lapsed: 0 });
  });

  it('treats a missing or non-numeric count as zero', () => {
    expect(renewalSplit({ expired_cohort: null as unknown as number, renewed_of_cohort: undefined as unknown as number }))
      .toEqual({ renewed: 0, lapsed: 0 });
  });

  it('leaves the donut empty when nothing expired', () => {
    // The page renders the rate as "—", never 0%, and the donut as an empty
    // state — not a ring that claims a conversion happened.
    expect(renewalSplit({ expired_cohort: 0, renewed_of_cohort: 0 }))
      .toEqual({ renewed: 0, lapsed: 0 });
  });
});

describe('expiryBuckets', () => {
  it('subtracts the week already counted inside the 30-day snapshot', () => {
    expect(expiryBuckets({ expiring_7d: 2, expiring_30d: 7 }))
      .toEqual({ week: 2, rest: 5 });
  });

  it('never goes negative when the snapshot disagrees', () => {
    expect(expiryBuckets({ expiring_7d: 8, expiring_30d: 3 }))
      .toEqual({ week: 8, rest: 0 });
  });

  it('keeps a clean zero rather than NaN', () => {
    expect(expiryBuckets({ expiring_7d: 0, expiring_30d: 0 }))
      .toEqual({ week: 0, rest: 0 });
  });
});
