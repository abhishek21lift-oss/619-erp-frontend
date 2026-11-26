// The queue client is a thin contract, but every URL here is a security
// boundary: the id must be encoded, and the approve call must never send a
// body the route did not ask for. These assertions run against the real
// endpoint module with only the transport mocked.

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/http', () => ({
  http: vi.fn(),
  httpSSE: vi.fn(),
}));

import { http } from '../lib/http';
import { api } from '../lib/api';

const mockHttp = vi.mocked(http);

beforeEach(() => {
  mockHttp.mockReset();
  mockHttp.mockResolvedValue({ data: {} } as never);
});

describe('api.ai.opsQueue', () => {
  it('reads the queue', async () => {
    await api.ai.opsQueue.queue();

    expect(mockHttp).toHaveBeenCalledWith('/api/ai/ops/queue');
  });

  it('refreshes with POST', async () => {
    await api.ai.opsQueue.refresh();

    expect(mockHttp).toHaveBeenCalledWith('/api/ai/ops/refresh', { method: 'POST' });
  });

  it('reads one item', async () => {
    await api.ai.opsQueue.item('i 1');

    expect(mockHttp).toHaveBeenCalledWith('/api/ai/ops/items/i%201');
  });

  it('approves without a body by sending an empty object', async () => {
    await api.ai.opsQueue.approve('i/1');

    expect(mockHttp).toHaveBeenCalledWith(
      '/api/ai/ops/items/i%2F1/approve',
      { method: 'POST', body: '{}' },
    );
  });

  it('approves an edited body', async () => {
    await api.ai.opsQueue.approve('i1', 'Hi Ravi');

    expect(mockHttp).toHaveBeenCalledWith(
      '/api/ai/ops/items/i1/approve',
      { method: 'POST', body: JSON.stringify({ body: 'Hi Ravi' }) },
    );
  });

  it('snoozes for an allowed number of days', async () => {
    for (const days of [1, 3, 7] as const) {
      mockHttp.mockClear();
      await api.ai.opsQueue.snooze('i1', days);
      expect(mockHttp).toHaveBeenCalledWith(
        '/api/ai/ops/items/i1/snooze',
        { method: 'POST', body: JSON.stringify({ days }) },
      );
    }
  });

  it('dismisses with a reason', async () => {
    await api.ai.opsQueue.dismiss('i1', 'asked_not_to_contact');

    expect(mockHttp).toHaveBeenCalledWith(
      '/api/ai/ops/items/i1/dismiss',
      { method: 'POST', body: JSON.stringify({ reason: 'asked_not_to_contact' }) },
    );
  });

  it('resolves with POST and no body', async () => {
    await api.ai.opsQueue.resolve('i1');

    expect(mockHttp).toHaveBeenCalledWith(
      '/api/ai/ops/items/i1/resolve',
      { method: 'POST' },
    );
  });

  it('encodes the id on every mutation', async () => {
    await api.ai.opsQueue.snooze('a/b', 3);
    await api.ai.opsQueue.dismiss('a/b', 'other');
    await api.ai.opsQueue.resolve('a/b');

    const urls = mockHttp.mock.calls.map(([url]) => url);
    expect(urls).toEqual([
      '/api/ai/ops/items/a%2Fb/snooze',
      '/api/ai/ops/items/a%2Fb/dismiss',
      '/api/ai/ops/items/a%2Fb/resolve',
    ]);
  });
});
