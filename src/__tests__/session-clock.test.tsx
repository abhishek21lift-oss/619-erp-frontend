// The session clock in the workout logger header.
//
// The point of it is knowing how long a session took, which means it has to
// survive the phone locking, the app being backgrounded and the page being
// reloaded — all normal during an hour in a gym. So it is derived from the
// session row's created_at rather than counted from mount. A counter would
// restart at zero on every reload and report a two-minute workout.
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import SessionClock, { elapsedSeconds, formatElapsed } from '@/components/pt-os/workout-log/SessionClock';

describe('formatElapsed', () => {
  it('is m:ss under an hour', () => {
    expect(formatElapsed(0)).toBe('0:00');
    expect(formatElapsed(7)).toBe('0:07');
    expect(formatElapsed(64)).toBe('1:04');
    expect(formatElapsed(59 * 60 + 59)).toBe('59:59');
  });

  it('grows to h:mm:ss on the hour, and pads only inside', () => {
    // "7:04" reads as a duration; "07:04" reads as a time of day, and this
    // sits next to a date.
    expect(formatElapsed(3600)).toBe('1:00:00');
    expect(formatElapsed(3600 + 4 * 60 + 5)).toBe('1:04:05');
    expect(formatElapsed(2 * 3600 + 15 * 60)).toBe('2:15:00');
  });

  it('does not render negative time', () => {
    expect(formatElapsed(-30)).toBe('0:00');
  });
});

describe('elapsedSeconds', () => {
  const NOW = new Date('2026-08-02T11:00:00Z').getTime();

  it('measures from the session row, not from now', () => {
    expect(elapsedSeconds('2026-08-02T10:15:00Z', NOW)).toBe(45 * 60);
  });

  it('clamps a start in the future to zero rather than counting backwards', () => {
    // Clock skew between the phone and the server is normal and must not show
    // a negative workout.
    expect(elapsedSeconds('2026-08-02T11:05:00Z', NOW)).toBe(0);
  });

  it('survives an unparseable timestamp', () => {
    expect(elapsedSeconds('not a date', NOW)).toBe(0);
  });
});

describe('<SessionClock />', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('shows time already elapsed on mount, not zero', () => {
    // The reload case: opening the page 20 minutes in must read 20:00.
    vi.setSystemTime(new Date('2026-08-02T11:00:00Z'));
    render(<SessionClock startedAt="2026-08-02T10:40:00Z" />);
    expect(screen.getByText('20:00')).toBeTruthy();
  });

  it('ticks while the session is running', () => {
    vi.setSystemTime(new Date('2026-08-02T11:00:00Z'));
    render(<SessionClock startedAt="2026-08-02T10:59:00Z" />);
    expect(screen.getByText('1:00')).toBeTruthy();

    act(() => { vi.advanceTimersByTime(5000); });
    expect(screen.getByText('1:05')).toBeTruthy();
  });

  it('stops and shows the recorded duration once finished', () => {
    // A finished session shows what was SAVED. The trainer can correct the
    // duration on the finish sheet, and a running total disagreeing with the
    // saved number would just look broken.
    vi.setSystemTime(new Date('2026-08-02T11:00:00Z'));
    render(<SessionClock startedAt="2026-08-02T10:00:00Z" completed durationMinutes={40} />);
    expect(screen.getByText('40 min')).toBeTruthy();

    act(() => { vi.advanceTimersByTime(60_000); });
    expect(screen.getByText('40 min')).toBeTruthy();
  });

  it('says so plainly when a finished session has no duration recorded', () => {
    render(<SessionClock startedAt="2026-08-02T10:00:00Z" completed durationMinutes={null} />);
    expect(screen.getByText('—')).toBeTruthy();
  });

  it('is announced as a duration, not as a clock time', () => {
    vi.setSystemTime(new Date('2026-08-02T11:00:00Z'));
    render(<SessionClock startedAt="2026-08-02T10:30:00Z" />);
    expect(screen.getByLabelText(/Elapsed 30:00/)).toBeTruthy();
  });
});
