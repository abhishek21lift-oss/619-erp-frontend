// Hostinger metrics arrive with their own unit. RAM is bytes; printing the raw
// integer next to a CPU percentage made the two readings look like the same
// kind of number ("62 % · 2225995776 bytes").
import { describe, expect, it } from 'vitest';
import { fmtMetric } from '@/components/platform/hosting-shared';

describe('fmtMetric', () => {
  it('scales a byte reading instead of printing the integer', () => {
    expect(fmtMetric({ value: 2225995776, unit: 'bytes' })).toBe('2.1 GB');
  });

  it('leaves percentages and unitless readings alone', () => {
    expect(fmtMetric({ value: 62, unit: '%' })).toBe('62%');
    expect(fmtMetric({ value: 4, unit: null })).toBe('4');
  });
});
