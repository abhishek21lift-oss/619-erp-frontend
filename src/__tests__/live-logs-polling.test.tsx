import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, act } from '@testing-library/react';

// The History tab used to poll an unwindowed COUNT(*) over the largest table
// on the box every three seconds, and Pause did not stop it.
//
// The effect read:
//
//     if (tab === 'history') { loadHistory(); return; }
//     if (!paused) loadTail();
//
// so the history branch returned BEFORE the pause check. Pressing Pause on
// that tab changed the button's label and nothing else. An operator who opened
// History during an incident — which is when the table is largest, 97.7% of
// its rows having arrived during one Redis outage — and pressed Pause to read
// a line kept firing a full sequential scan twenty times a minute for as long
// as the tab stayed open.
//
// These tests are about the requests, not the rendering.

// vi.hoisted, because vi.mock is lifted above every top-level binding and the
// factory would otherwise close over uninitialised names.
const { commandCenterLogs, commandCenterLogHistory } = vi.hoisted(() => ({
  commandCenterLogs: vi.fn(),
  commandCenterLogHistory: vi.fn(),
}));

vi.mock('@/lib/api', async (orig) => {
  const actual = await orig<Record<string, unknown>>();
  return {
    ...actual,
    api: { superAdmin: { commandCenterLogs, commandCenterLogHistory } },
  };
});

import LiveLogs from '@/components/platform/live-logs';

const tail = {
  data: {
    lines: [], stats: { held: 0, capacity: 500, total_recorded: 0, dropped: 0 },
    capture: { dropped_pending: 0 }, scope_note: 'ring',
  },
};

const history = (over: Record<string, unknown> = {}) => ({
  data: {
    lines: [],
    stats: {
      in_window: 13, from_worker: 2, fatal: 1,
      window_hours: 24, oldest: '2026-08-04T00:00:00.000Z', retention_days: 30,
    },
    next_before: null,
    ...over,
  },
});

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  commandCenterLogs.mockReset().mockResolvedValue(tail);
  commandCenterLogHistory.mockReset().mockResolvedValue(history());
});
afterEach(() => vi.useRealTimers());

/** Click and let the resulting state update and promise settle. */
async function click(name: RegExp) {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name }));
    await Promise.resolve();
  });
}

const toHistory = () => click(/history/i);

describe('Pause stops the request on both tabs', () => {
  it('stops polling history once paused', async () => {
    render(<LiveLogs />);
    await toHistory();
    commandCenterLogHistory.mockClear();

    await click(/pause/i);
    await act(async () => { vi.advanceTimersByTime(60_000); });

    // The bug: this was still counting up while the button said "Resume".
    expect(commandCenterLogHistory).not.toHaveBeenCalled();
  });

  it('resumes when asked', async () => {
    render(<LiveLogs />);
    await toHistory();
    await click(/pause/i);
    commandCenterLogHistory.mockClear();

    await click(/resume/i);
    await act(async () => { await Promise.resolve(); });
    expect(commandCenterLogHistory).toHaveBeenCalled();
  });
});

describe('the expensive half of the request is not repeated', () => {
  it('asks for stats on the first load and not on the ticks after it', async () => {
    render(<LiveLogs />);
    await toHistory();

    expect(commandCenterLogHistory.mock.calls[0][0]).toMatchObject({ stats: true });

    await act(async () => { vi.advanceTimersByTime(45_000); });
    const later = commandCenterLogHistory.mock.calls.slice(1);
    expect(later.length).toBeGreaterThan(0);
    for (const [opts] of later) expect(opts).toMatchObject({ stats: false });
  });

  it('keeps showing the stats it already has when a tick omits them', async () => {
    render(<LiveLogs />);
    await toHistory();
    expect(await screen.findByText(/13 in 24h/)).toBeInTheDocument();

    commandCenterLogHistory.mockResolvedValue(history({ stats: null }));
    await act(async () => { vi.advanceTimersByTime(20_000); });

    // Rendering straight off the response would blank the strip every tick.
    expect(screen.getByText(/13 in 24h/)).toBeInTheDocument();
  });

  it('polls history far more slowly than the live tail', async () => {
    // Measured against the clock, not against each other. An earlier version
    // of this compared the two call counts over the same 9s and passed even
    // when history was reverted to the 3s cadence — the live tab's extra
    // initial call was enough to keep the inequality true. A test whose own
    // mutation slips through is worse than no test, because it is cited.
    render(<LiveLogs />);
    await act(async () => { vi.advanceTimersByTime(30_000); });
    // 3s cadence over 30s: the initial call plus ten ticks.
    expect(commandCenterLogs.mock.calls.length).toBeGreaterThanOrEqual(10);

    await toHistory();
    commandCenterLogHistory.mockClear();
    await act(async () => { vi.advanceTimersByTime(30_000); });

    // 15s cadence over the same 30s: two ticks. system_logs receives errors
    // only — single digits a day when the platform is healthy — so polling it
    // five times a minute asked the same question about a thousand times
    // between the answers changing.
    expect(commandCenterLogHistory.mock.calls.length).toBeLessThanOrEqual(3);
  });
});

describe('filters reach the server', () => {
  it('sends the level filter, which the history tab silently dropped', async () => {
    render(<LiveLogs />);
    await toHistory();
    commandCenterLogHistory.mockClear();

    await click(/^fatal$/i);

    // The call was previously `{ q, limit }` only — the level buttons rendered
    // and did nothing on this tab.
    expect(commandCenterLogHistory).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'fatal' }),
    );
  });

  it('offers history the levels that table can actually hold', async () => {
    render(<LiveLogs />);
    await toHistory();

    // Only error and above is ever persisted, so a Warn+ button here would
    // filter for rows that cannot exist and read as a broken logger.
    expect(screen.getByRole('button', { name: /^fatal$/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /warn/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /info/i })).toBeNull();
  });
});

describe('older pages are fetched by cursor', () => {
  it('offers no control when there is no cursor', async () => {
    render(<LiveLogs />);
    await toHistory();
    expect(screen.queryByRole('button', { name: /load older/i })).toBeNull();
  });

  it('passes the cursor back and asks for no stats with it', async () => {
    commandCenterLogHistory.mockResolvedValue(
      history({ lines: [{ id: 9, level: 50, level_label: 'error', logged_at: '2026-08-21T09:00:00Z', msg: 'boom', source: 'api', pid: 1, hostname: 'h', context: null }], next_before: '4991' }),
    );
    render(<LiveLogs />);
    await toHistory();

    commandCenterLogHistory.mockClear();
    commandCenterLogHistory.mockResolvedValue(history({ next_before: null }));
    await click(/load older/i);
    await act(async () => { await Promise.resolve(); });

    expect(commandCenterLogHistory).toHaveBeenCalledWith(
      expect.objectContaining({ before: '4991', stats: false }),
    );
  });
});
