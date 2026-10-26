// The weight chart used to anchor at zero, so a 78 → 72 kg change occupied
// 7% of the plot and looked flat. `yMin: 'auto'` pads the data range; these
// pin the padding and the unchanged zero-based default.

import { describe, expect, it } from 'vitest';
import { areaYDomain } from '@/components/ui/chart';

const rows = [{ d: '1 Aug', weight: 78 }, { d: '20 Oct', weight: 72 }];
const areas = [{ key: 'weight', label: 'Weight (kg)' }];

describe('areaYDomain', () => {
  it('keeps the zero floor when no yMin is asked for', () => {
    expect(areaYDomain(rows, areas)).toEqual([0, 'auto']);
  });

  it('pads an auto domain so the signal fills most of the plot', () => {
    const [lo, hi] = areaYDomain(rows, areas, 'auto');
    expect(lo).toBeCloseTo(71.1, 5);
    expect(hi).toBeCloseTo(78.9, 5);
  });

  it('honours an explicit floor', () => {
    expect(areaYDomain(rows, areas, 60)).toEqual([60, 'auto']);
  });

  it('falls back to zero when there are no numbers to measure', () => {
    expect(areaYDomain([{ d: 'x', weight: 'n/a' }], areas, 'auto')).toEqual([0, 'auto']);
  });
});
