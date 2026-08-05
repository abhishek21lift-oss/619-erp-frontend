// Command Center Phase 3 — the two-transport feed.
//
// The socket is the optimisation; the poll is the contract. Everything here is
// about the seam between them, because that is where this feature can quietly
// make the console WORSE than the version it replaced:
//
//   * First paint must not wait on the socket. A ticket round trip plus a
//     handshake before the first number appears is slower than the 5s poll it
//     is replacing, on every single visit.
//   * The poll must stop once the socket is open, and restart the instant it
//     closes. Both halves matter: leaving the poll running doubles the load the
//     stream was meant to reduce, and not restarting it turns a dropped socket
//     into a frozen console that still looks alive.
//   * With no API origin configured there must be no socket attempt at all —
//     not a failed one retried forever.
//   * A hidden tab must disconnect. The server collects once per tick for as
//     long as ANY client is connected, so a forgotten background tab keeps real
//     load on Postgres and Redis all night.
//   * Nothing may run after unmount.
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const commandCenter = vi.fn();
const streamTicket = vi.fn();
const wsBase = vi.fn();

vi.mock('@/lib/api', () => ({
  api: {
    superAdmin: {
      commandCenter: (...a: unknown[]) => commandCenter(...a),
      commandCenterStreamTicket: () => streamTicket(),
    },
  },
}));
vi.mock('@/lib/http', () => ({ wsBase: () => wsBase() }));

// ── A WebSocket the test drives by hand ─────────────────────────────────────
//
// jsdom ships a real one that would try to open a real connection. This records
// what the hook did and lets each test decide when the socket opens, what it
// delivers and when it dies.
const CONNECTING = 0; const OPEN = 1; const CLOSED = 3;

class FakeSocket {
  static instances: FakeSocket[] = [];
  static CONNECTING = CONNECTING;
  static OPEN = OPEN;
  static CLOSED = CLOSED;

  url: string;
  readyState = CONNECTING;
  sent: string[] = [];
  closedByClient = false;
  onopen: (() => void) | null = null;
  onmessage: ((ev: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;

  constructor(url: string) {
    this.url = url;
    FakeSocket.instances.push(this);
  }

  send(data: string) { this.sent.push(data); }
  close() { this.closedByClient = true; this.readyState = CLOSED; }

  /** The server accepted the handshake. */
  accept() { this.readyState = OPEN; this.onopen?.(); }
  /** The server pushed a frame. */
  push(frame: unknown) { this.onmessage?.({ data: JSON.stringify(frame) }); }
  /** The socket died on its own — a restart, a proxy timeout, a dropped Wi-Fi. */
  die() { this.readyState = CLOSED; this.onclose?.(); }
}

const snapshot = (status = 'healthy') => ({
  status,
  collected_at: new Date().toISOString(),
  duration_ms: 3,
  cards: { runtime: { name: 'runtime', status, data: {}, latency_ms: 1, reason: null, checked_at: '' } },
});

const load = async () => {
  vi.resetModules();
  return import('@/components/platform/useCommandCenterSnapshot');
};

/** The socket the hook most recently constructed. */
const latest = () => FakeSocket.instances[FakeSocket.instances.length - 1];

let hidden = false;

beforeEach(() => {
  FakeSocket.instances = [];
  commandCenter.mockReset().mockResolvedValue({ data: snapshot() });
  streamTicket.mockReset().mockResolvedValue({
    data: { ticket: 'tkt_1', expires_in_ms: 30_000, path: '/api/command-center/stream', tick_ms: 1000 },
  });
  wsBase.mockReset().mockReturnValue('wss://api.myptstudio.com');
  hidden = false;
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  vi.stubGlobal('WebSocket', FakeSocket as unknown as typeof WebSocket);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe('first paint', () => {
  it('renders from HTTP without waiting for the socket', async () => {
    const { useCommandCenterSnapshot } = await load();
    const { result } = renderHook(() => useCommandCenterSnapshot(5000));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.snap).not.toBeNull();
    // The socket has been constructed but nothing has accepted it yet — the
    // screen is already populated.
    expect(latest()?.readyState).toBe(CONNECTING);
    expect(result.current.transport).toBe('polling');
  });

  it('spends a fresh ticket on the socket URL', async () => {
    const { useCommandCenterSnapshot } = await load();
    renderHook(() => useCommandCenterSnapshot(5000));

    await waitFor(() => expect(FakeSocket.instances).toHaveLength(1));
    expect(latest().url).toBe('wss://api.myptstudio.com/api/command-center/stream?ticket=tkt_1');
  });
});

describe('the upgrade', () => {
  it('stops polling once the socket is open, and streams frames instead', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { useCommandCenterSnapshot } = await load();
    const { result } = renderHook(() => useCommandCenterSnapshot(5000));

    await waitFor(() => expect(FakeSocket.instances).toHaveLength(1));
    act(() => { latest().accept(); });
    await waitFor(() => expect(result.current.transport).toBe('stream'));

    const httpCallsAtOpen = commandCenter.mock.calls.length;
    await act(async () => { await vi.advanceTimersByTimeAsync(20_000); });
    // Four poll intervals have passed and not one request was made.
    expect(commandCenter.mock.calls.length).toBe(httpCallsAtOpen);

    act(() => { latest().push({ type: 'snapshot', data: snapshot('critical') }); });
    await waitFor(() => expect(result.current.snap?.status).toBe('critical'));
  });

  it('ignores a malformed frame rather than blanking the console', async () => {
    const { useCommandCenterSnapshot } = await load();
    const { result } = renderHook(() => useCommandCenterSnapshot(5000));
    await waitFor(() => expect(FakeSocket.instances).toHaveLength(1));
    act(() => { latest().accept(); });
    await waitFor(() => expect(result.current.transport).toBe('stream'));
    act(() => { latest().push({ type: 'snapshot', data: snapshot('warning') }); });
    await waitFor(() => expect(result.current.snap?.status).toBe('warning'));

    act(() => {
      latest().onmessage?.({ data: 'not json' });
      latest().push({ type: 'snapshot', data: { nonsense: true } });
      latest().push({ type: 'error', message: 'one collect failed' });
    });

    // Still showing the last good snapshot, still streaming.
    expect(result.current.snap?.status).toBe('warning');
    expect(result.current.transport).toBe('stream');
    expect(result.current.error).toBe('');
  });
});

describe('the fall back', () => {
  it('restarts polling the moment the socket dies', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { useCommandCenterSnapshot } = await load();
    const { result } = renderHook(() => useCommandCenterSnapshot(5000));

    await waitFor(() => expect(FakeSocket.instances).toHaveLength(1));
    act(() => { latest().accept(); });
    await waitFor(() => expect(result.current.transport).toBe('stream'));

    const before = commandCenter.mock.calls.length;
    act(() => { latest().die(); });
    await waitFor(() => expect(result.current.transport).toBe('polling'));

    await act(async () => { await vi.advanceTimersByTimeAsync(11_000); });
    expect(commandCenter.mock.calls.length).toBeGreaterThan(before);
  });

  it('reconnects after a backoff rather than in a tight loop', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { useCommandCenterSnapshot } = await load();
    renderHook(() => useCommandCenterSnapshot(5000));

    await waitFor(() => expect(FakeSocket.instances).toHaveLength(1));
    act(() => { latest().accept(); });
    act(() => { latest().die(); });

    // Nothing immediately — a socket that reconnects instantly after a backend
    // restart is a denial of service aimed at your own server.
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    expect(FakeSocket.instances).toHaveLength(1);

    await act(async () => { await vi.advanceTimersByTimeAsync(2_000); });
    await waitFor(() => expect(FakeSocket.instances.length).toBeGreaterThan(1));
    // A brand new ticket, because the first one was spent by the dead socket.
    expect(streamTicket.mock.calls.length).toBeGreaterThan(1);
  });

  it('keeps polling and never opens a socket when no API origin is configured', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    wsBase.mockReturnValue('');
    const { useCommandCenterSnapshot } = await load();
    const { result } = renderHook(() => useCommandCenterSnapshot(5000));

    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });

    expect(FakeSocket.instances).toHaveLength(0);
    // Not even a ticket: there is nowhere to spend it, and minting credentials
    // nobody can use is pure noise in the audit trail.
    expect(streamTicket).not.toHaveBeenCalled();
    expect(result.current.transport).toBe('polling');
    expect(commandCenter.mock.calls.length).toBeGreaterThan(3);
  });

  it('falls back to polling when the ticket cannot be minted', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    streamTicket.mockRejectedValue(new Error('403'));
    const { useCommandCenterSnapshot } = await load();
    const { result } = renderHook(() => useCommandCenterSnapshot(5000));

    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await vi.advanceTimersByTimeAsync(11_000); });

    expect(FakeSocket.instances).toHaveLength(0);
    expect(result.current.transport).toBe('polling');
    expect(result.current.snap).not.toBeNull();
  });
});

describe('refresh', () => {
  it('asks over the socket when streaming, not over HTTP', async () => {
    const { useCommandCenterSnapshot } = await load();
    const { result } = renderHook(() => useCommandCenterSnapshot(5000));
    await waitFor(() => expect(FakeSocket.instances).toHaveLength(1));
    act(() => { latest().accept(); });
    await waitFor(() => expect(result.current.transport).toBe('stream'));

    const before = commandCenter.mock.calls.length;
    act(() => { result.current.refresh(); });

    expect(latest().sent).toEqual([JSON.stringify({ type: 'refresh' })]);
    expect(commandCenter.mock.calls.length).toBe(before);
    expect(result.current.refreshing).toBe(true);

    act(() => { latest().push({ type: 'snapshot', data: snapshot('warning') }); });
    await waitFor(() => expect(result.current.refreshing).toBe(false));
  });

  it('asks over HTTP with fresh=1 when there is no socket', async () => {
    wsBase.mockReturnValue('');
    const { useCommandCenterSnapshot } = await load();
    const { result } = renderHook(() => useCommandCenterSnapshot(5000));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => { result.current.refresh(); });
    await waitFor(() => expect(result.current.refreshing).toBe(false));
    expect(commandCenter).toHaveBeenCalledWith({ fresh: true });
  });
});

describe('a tab nobody is looking at', () => {
  it('disconnects when hidden and reconnects with fresh data when visible', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { useCommandCenterSnapshot } = await load();
    const { result } = renderHook(() => useCommandCenterSnapshot(5000));

    await waitFor(() => expect(FakeSocket.instances).toHaveLength(1));
    const first = latest();
    act(() => { first.accept(); });
    await waitFor(() => expect(result.current.transport).toBe('stream'));

    hidden = true;
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(first.closedByClient).toBe(true);
    await waitFor(() => expect(result.current.transport).toBe('polling'));

    // And nothing keeps running in the background either.
    const whileHidden = commandCenter.mock.calls.length;
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    expect(commandCenter.mock.calls.length).toBe(whileHidden);
    expect(FakeSocket.instances).toHaveLength(1);

    hidden = false;
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    // Immediately, not on the next tick: a tab returned to after ten minutes
    // must not show ten-minute-old numbers.
    await waitFor(() => expect(commandCenter.mock.calls.length).toBeGreaterThan(whileHidden));
    await waitFor(() => expect(FakeSocket.instances.length).toBe(2));
  });
});

describe('unmount', () => {
  it('closes the socket and stops every timer', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { useCommandCenterSnapshot } = await load();
    const { result, unmount } = renderHook(() => useCommandCenterSnapshot(5000));

    await waitFor(() => expect(FakeSocket.instances).toHaveLength(1));
    act(() => { latest().accept(); });
    await waitFor(() => expect(result.current.transport).toBe('stream'));
    const sock = latest();

    unmount();
    expect(sock.closedByClient).toBe(true);

    const after = commandCenter.mock.calls.length;
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(commandCenter.mock.calls.length).toBe(after);
    // No reconnect either — the close on unmount must not read as a drop.
    expect(FakeSocket.instances).toHaveLength(1);
  });
});
