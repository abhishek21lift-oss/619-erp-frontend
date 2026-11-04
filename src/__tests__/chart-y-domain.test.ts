// The weight chart used to anchor at zero, so a 78 → 72 kg change occupied
// 7% of the plot and looked flat. `yMin: 'auto'` pads the data range; these
// pin the padding and the unchanged zero-based default.

import { describe, expect, it } from 'vitest';
import { lineYDomain } from '@/components/visualizations/primitives/LineChartCore';

const rows = [{ d: '1 Aug', weight: 78 }, { d: '20 Oct', weight: 72 }];
const areas = [{ key: 'weight', label: 'Weight (kg)' }];

describe('lineYDomain', () => {
  it('keeps the zero floor when no yMin is asked for', () => {
    expect(lineYDomain(rows, areas)).toEqual({ min: 0, max: 'auto' });
  });

  it('pads an auto domain so the signal fills most of the plot', () => {
    const domain = lineYDomain(rows, areas, 'auto');
    expect(domain.min).toBeCloseTo(71.1, 5);
    expect(domain.max).toBeCloseTo(78.9, 5);
  });

  it('honours an explicit floor', () => {
    expect(lineYDomain(rows, areas, 60)).toEqual({ min: 60, max: 'auto' });
  });

  it('falls back to zero when there are no numbers to measure', () => {
    expect(lineYDomain([{ d: 'x', weight: 'n/a' }], areas, 'auto')).toEqual({ min: 0, max: 'auto' });
  });
});
