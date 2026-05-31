import { describe, it, expect } from 'vitest';

describe('Date/Number formatting', () => {
  it('formats Indian currency', () => {
    const fmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });
    expect(fmt.format(2500)).toContain('2,500');
  });

  it('formats dates correctly', () => {
    const date = new Date('2026-01-15');
    const formatted = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    expect(formatted).toContain('2026');
  });
});
