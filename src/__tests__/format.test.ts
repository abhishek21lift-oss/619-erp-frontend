import { describe, it, expect } from 'vitest';
import { fmtDateMedium, fmtDayMonth, fmtMoney } from '@/lib/format';

describe('shared formatters', () => {
  it('formats the profile date style', () => {
    expect(fmtDateMedium(new Date(2026, 9, 21))).toBe('21 Oct 2026');
    expect(fmtDateMedium(null)).toBe('—');
    expect(fmtDateMedium('not-a-date')).toBe('not-a-date');
  });

  it('formats chart day-month labels', () => {
    expect(fmtDayMonth(new Date(2026, 9, 21))).toBe('21 Oct');
    expect(fmtDayMonth(null)).toBe('—');
  });

  it('formats INR with Indian grouping', () => {
    expect(fmtMoney(125000)).toBe('₹1,25,000');
    expect(fmtMoney(null)).toBe('₹0');
  });
});

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
