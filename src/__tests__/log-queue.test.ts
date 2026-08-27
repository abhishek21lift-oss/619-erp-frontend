// The write queue behind the session logger.
//
// What is actually at stake: a set the trainer logged and walked away from.
// Everything here is about whether that set reaches the server, exactly once,
// in order — or, when it truly cannot, whether anybody is told.

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ApiError } from '@/lib/http';
import {
  createLogQueue, backoffFor, isPermanent, newToken,
  type LogQueueTransport, type QueuedWrite,
} from '@/lib/training/logQueue';

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => { map.set(k, v); },
    removeItem: (k: string) => { map.delete(k); },
  };
}

function transportOf(overrides: Partial<LogQueueTransport> = {}): LogQueueTransport & {
  logSet: ReturnType<typeof vi.fn>; logCardio: ReturnType<typeof vi.fn>;
} {
  return {
    logSet: vi.fn(async () => ({ data: {}, duplicate: false })),
    logCardio: vi.fn(async () => ({ data: {}, duplicate: false })),
    ...overrides,
  } as never;
}

const aSet = (n: number) => ({
  token: `tok-${n}`, performanceId: 'p1', kind: 'set' as const,
  payload: { set_number: n, actual_reps: 10 },
});

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe('sending', () => {
  it('sends the write with its token as client_token', async () => {
    const transport = transportOf();
    const q = createLogQueue({ storageKey: 'k', transport, storage: memoryStorage() });

    q.enqueue(aSet(1));
    await vi.runAllTimersAsync();

    expect(transport.logSet).toHaveBeenCalledWith('p1', {
      set_number: 1, actual_reps: 10, client_token: 'tok-1',
    });
  });

  it('routes cardio to the cardio endpoint, not to sets', async () => {
    // Cardio as fake sets/reps is the exact modelling error this rewrite
    // exists to undo, so the two paths must not converge again.
    const transport = transportOf();
    const q = createLogQueue({ storageKey: 'k', transport, storage: memoryStorage() });

    q.enqueue({ token: 'c1', performanceId: 'p9', kind: 'cardio', payload: { duration_seconds: 600 } });
    await vi.runAllTimersAsync();

    expect(transport.logCardio).toHaveBeenCalledWith('p9', { duration_seconds: 600, client_token: 'c1' });
    expect(transport.logSet).not.toHaveBeenCalled();
  });

  it('sends in the order the sets were logged, one at a time', async () => {
    // Set 3 landing before set 2 would record the workout wrong.
    const order: number[] = [];
    let release: (() => void) | null = null;
    const transport = transportOf({
      logSet: vi.fn(async (_id: string, p: Record<string, unknown>) => {
        order.push(p.set_number as number);
        if (p.set_number === 1) await new Promise<void>((r) => { release = r; });
        return {};
      }),
    });
    const q = createLogQueue({ storageKey: 'k', transport, storage: memoryStorage() });

    q.enqueue(aSet(1));
    q.enqueue(aSet(2));
    q.enqueue(aSet(3));
    await vi.advanceTimersByTimeAsync(0);

    // The first is still in flight, so nothing else has been attempted.
    expect(order).toEqual([1]);
    release!();
    await vi.runAllTimersAsync();
    expect(order).toEqual([1, 2, 3]);
  });

  it('reports the queue empty once everything is acknowledged', async () => {
    const q = createLogQueue({ storageKey: 'k', transport: transportOf(), storage: memoryStorage() });
    q.enqueue(aSet(1));
    expect(q.state().pending).toBe(1);
    await vi.runAllTimersAsync();
    expect(q.state()).toEqual({ pending: 0, sending: false, error: null });
  });
});

describe('surviving the network', () => {
  it('keeps a write that failed on a network error and retries it', async () => {
    const transport = transportOf({
      logSet: vi.fn()
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce({}),
    });
    const q = createLogQueue({ storageKey: 'k', transport, storage: memoryStorage() });

    q.enqueue(aSet(1));
    await vi.advanceTimersByTimeAsync(0);
    expect(q.state().pending).toBe(1);
    expect(q.state().error).toBe('Failed to fetch');

    await vi.runAllTimersAsync();
    expect(transport.logSet).toHaveBeenCalledTimes(2);
    expect(q.state().pending).toBe(0);
    expect(q.state().error).toBeNull();
  });

  it('retries a 500, because the set is fine and the server is not', async () => {
    const transport = transportOf({
      logSet: vi.fn()
        .mockRejectedValueOnce(new ApiError('boom', 500))
        .mockResolvedValueOnce({}),
    });
    const q = createLogQueue({ storageKey: 'k', transport, storage: memoryStorage() });

    q.enqueue(aSet(1));
    await vi.runAllTimersAsync();
    expect(transport.logSet).toHaveBeenCalledTimes(2);
    expect(q.state().pending).toBe(0);
  });

  it('retries a 429 rather than dropping it, despite being 4xx', async () => {
    const transport = transportOf({
      logSet: vi.fn().mockRejectedValueOnce(new ApiError('slow down', 429)).mockResolvedValueOnce({}),
    });
    const dropped = vi.fn();
    const q = createLogQueue({ storageKey: 'k', transport, storage: memoryStorage(), onDropped: dropped });

    q.enqueue(aSet(1));
    await vi.runAllTimersAsync();
    expect(dropped).not.toHaveBeenCalled();
    expect(q.state().pending).toBe(0);
  });

  it('backs off further with each attempt, and stops growing', async () => {
    expect(backoffFor(1)).toBe(1000);
    expect(backoffFor(2)).toBe(2000);
    expect(backoffFor(3)).toBe(4000);
    expect(backoffFor(50)).toBe(30_000);
  });
});

describe('writes that can never succeed', () => {
  it('drops a rejected write instead of retrying it forever', async () => {
    const transport = transportOf({
      logSet: vi.fn().mockRejectedValue(new ApiError('actual_reps must be a number', 422)),
    });
    const dropped = vi.fn();
    const q = createLogQueue({ storageKey: 'k', transport, storage: memoryStorage(), onDropped: dropped });

    q.enqueue(aSet(1));
    await vi.runAllTimersAsync();

    expect(transport.logSet).toHaveBeenCalledTimes(1);
    expect(q.state().pending).toBe(0);
    expect(dropped).toHaveBeenCalledTimes(1);
    expect((dropped.mock.calls[0][0] as QueuedWrite).token).toBe('tok-1');
  });

  it('keeps sending the sets queued behind a rejected one', async () => {
    // The failure mode this prevents: one bad write wedges the queue, and
    // every set logged after it silently waits behind a corpse.
    const transport = transportOf({
      logSet: vi.fn(async (_id: string, p: Record<string, unknown>) => {
        if (p.set_number === 1) throw new ApiError('bad', 422);
        return {};
      }),
    });
    const q = createLogQueue({ storageKey: 'k', transport, storage: memoryStorage(), onDropped: vi.fn() });

    q.enqueue(aSet(1));
    q.enqueue(aSet(2));
    await vi.runAllTimersAsync();

    expect(transport.logSet).toHaveBeenCalledTimes(2);
    expect(q.state().pending).toBe(0);
  });

  it('tells the caller, because a silently dropped set is the worst outcome', async () => {
    const dropped = vi.fn();
    const q = createLogQueue({
      storageKey: 'k',
      transport: transportOf({ logSet: vi.fn().mockRejectedValue(new ApiError('nope', 403)) }),
      storage: memoryStorage(),
      onDropped: dropped,
    });
    q.enqueue(aSet(1));
    await vi.runAllTimersAsync();
    expect(dropped).toHaveBeenCalled();
  });

  it('classifies by status, not by message', () => {
    expect(isPermanent(new ApiError('x', 422))).toBe(true);
    expect(isPermanent(new ApiError('x', 404))).toBe(true);
    expect(isPermanent(new ApiError('x', 408))).toBe(false);
    expect(isPermanent(new ApiError('x', 429))).toBe(false);
    expect(isPermanent(new ApiError('x', 503))).toBe(false);
    expect(isPermanent(new TypeError('Failed to fetch'))).toBe(false);
  });
});

describe('surviving the tab', () => {
  it('persists a queued write so a reload can still send it', async () => {
    const storage = memoryStorage();
    const first = createLogQueue({
      storageKey: 'session-1',
      transport: transportOf({ logSet: vi.fn().mockRejectedValue(new TypeError('offline')) }),
      storage,
    });
    first.enqueue(aSet(1));
    await vi.advanceTimersByTimeAsync(0);
    first.dispose();

    // A fresh tab, same storage.
    const transport = transportOf();
    const second = createLogQueue({ storageKey: 'session-1', transport, storage });
    expect(second.state().pending).toBe(1);

    await second.drain();
    expect(transport.logSet).toHaveBeenCalledWith('p1', expect.objectContaining({ client_token: 'tok-1' }));
  });

  it('clears storage once the queue empties, so a reload replays nothing', async () => {
    const storage = memoryStorage();
    const q = createLogQueue({ storageKey: 'session-1', transport: transportOf(), storage });
    q.enqueue(aSet(1));
    await vi.runAllTimersAsync();
    expect(storage.getItem('session-1')).toBeNull();
  });

  it('ignores a malformed stored record rather than POSTing it as a set', async () => {
    const storage = memoryStorage();
    storage.setItem('session-1', JSON.stringify([{ token: 'half' }, aSet(2)]));
    const transport = transportOf();
    const q = createLogQueue({ storageKey: 'session-1', transport, storage });

    expect(q.state().pending).toBe(1);
    await q.drain();
    expect(transport.logSet).toHaveBeenCalledTimes(1);
    expect(transport.logSet.mock.calls[0][1]).toMatchObject({ set_number: 2 });
  });

  it('survives storage being unavailable, because the workout matters more', async () => {
    const throwing = {
      getItem: () => { throw new Error('SecurityError'); },
      setItem: () => { throw new Error('QuotaExceeded'); },
      removeItem: () => { throw new Error('SecurityError'); },
    };
    const transport = transportOf();
    const q = createLogQueue({ storageKey: 'k', transport, storage: throwing });

    q.enqueue(aSet(1));
    await vi.runAllTimersAsync();
    expect(transport.logSet).toHaveBeenCalledTimes(1);
  });

  it('keeps two sessions apart', async () => {
    const storage = memoryStorage();
    const a = createLogQueue({
      storageKey: 'session-a',
      transport: transportOf({ logSet: vi.fn().mockRejectedValue(new TypeError('offline')) }),
      storage,
    });
    a.enqueue(aSet(1));
    await vi.advanceTimersByTimeAsync(0);
    a.dispose();

    const b = createLogQueue({ storageKey: 'session-b', transport: transportOf(), storage });
    expect(b.state().pending).toBe(0);
  });
});

describe('tokens', () => {
  it('does not repeat', () => {
    const seen = new Set(Array.from({ length: 200 }, () => newToken()));
    expect(seen.size).toBe(200);
  });

  it('still produces one where crypto.randomUUID is missing', () => {
    // iOS Safari only exposes randomUUID on secure origins; a logger that
    // throws behind a gym's captive portal is worse than a weaker key.
    const original = globalThis.crypto;
    Object.defineProperty(globalThis, 'crypto', { value: {}, configurable: true });
    try {
      expect(newToken()).toMatch(/^t-/);
    } finally {
      Object.defineProperty(globalThis, 'crypto', { value: original, configurable: true });
    }
  });
});
