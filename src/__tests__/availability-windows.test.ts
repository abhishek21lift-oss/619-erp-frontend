import { describe, expect, it } from 'vitest';
import { toMinutes, validateWindows } from '@/lib/booking/availability';

const win = (weekday: number, start_time: string, end_time: string) => ({
  weekday, start_time, end_time,
});

describe('toMinutes', () => {
  it('reads HH:MM as minutes since midnight', () => {
    expect(toMinutes('00:00')).toBe(0);
    expect(toMinutes('07:30')).toBe(450);
    expect(toMinutes('18:45')).toBe(1125);
  });
});

describe('validateWindows', () => {
  it('names the weekday whose windows overlap', () => {
    expect(validateWindows([win(1, '07:00', '10:00'), win(1, '09:00', '12:00')]))
      .toBe('Monday windows overlap.');
  });

  it('accepts windows that merely touch', () => {
    expect(validateWindows([win(1, '07:00', '10:00'), win(1, '10:00', '12:00')])).toBeNull();
  });

  it('refuses a window that ends before it starts', () => {
    expect(validateWindows([win(1, '10:00', '10:00')]))
      .toBe('Monday window ends before it starts.');
    expect(validateWindows([win(3, '18:00', '17:00')]))
      .toBe('Wednesday window ends before it starts.');
  });

  it('refuses malformed times and weekdays', () => {
    expect(validateWindows([win(1, '7:00', '10:00')])).toMatch(/HH:MM/);
    expect(validateWindows([win(9, '07:00', '10:00')])).toMatch(/weekday/i);
  });

  it('passes a valid three-window week', () => {
    expect(validateWindows([
      win(1, '07:00', '10:00'),
      win(3, '18:00', '20:00'),
      win(6, '09:00', '12:00'),
    ])).toBeNull();
  });

  it('passes an empty week, which is how a trainer stops taking bookings', () => {
    expect(validateWindows([])).toBeNull();
  });
});
