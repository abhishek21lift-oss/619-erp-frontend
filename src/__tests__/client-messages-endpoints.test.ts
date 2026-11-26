// The inbox client's send/retry/draft contract.
//
// A 502 from the backend is not always a failure: a created-but-undelivered
// WhatsApp reply answers 502 WITH the failed row, so the trainer can retry it.
// The client turns that into a value, and these tests pin both halves.

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/http', () => ({
  http: vi.fn(),
  httpSSE: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number;
    code?: string;
    payload?: unknown;
    constructor(message: string, status: number, code?: string, payload?: unknown) {
      super(message);
      this.status = status;
      this.code = code;
      this.payload = payload;
    }
  },
}));

import { http, ApiError } from '../lib/http';
import { api } from '../lib/api';

const mockHttp = vi.mocked(http);

beforeEach(() => {
  mockHttp.mockReset();
  mockHttp.mockResolvedValue({ data: {} } as never);
});

it('sends the chosen channel', async () => {
  await api.clientMessages.send('c 1', 'Hi', 'whatsapp');
  expect(mockHttp).toHaveBeenCalledWith('/api/messages/c%201', {
    method: 'POST', body: JSON.stringify({ body: 'Hi', channel: 'whatsapp' }),
  });
});

it('omits the channel when the caller did not choose one', async () => {
  await api.clientMessages.send('c1', 'Hi');
  expect(mockHttp).toHaveBeenCalledWith('/api/messages/c1', {
    method: 'POST', body: JSON.stringify({ body: 'Hi' }),
  });
});

it('retries with POST and no body beyond an empty object', async () => {
  await api.clientMessages.retry('c1', 'm/1');
  expect(mockHttp).toHaveBeenCalledWith('/api/messages/c1/m%2F1/retry', { method: 'POST', body: '{}' });
});

it('requests a draft with POST', async () => {
  await api.clientMessages.aiDraft('c1');
  expect(mockHttp).toHaveBeenCalledWith('/api/messages/c1/ai-draft', { method: 'POST', body: '{}' });
});

it('turns a 502 carrying a failed row into a value', async () => {
  const row = {
    id: 'm1', sender: 'studio', body: 'Hi', read_at: null, created_at: '2026-11-26T10:00:00.000Z',
    channel: 'whatsapp', message_type: 'text', delivery_status: 'failed',
    failure_reason: 'recipient_not_on_whatsapp',
  };
  mockHttp.mockRejectedValueOnce(new ApiError('send failed', 502, 'SEND_FAILED', { data: row }));

  await expect(api.clientMessages.send('c1', 'Hi', 'whatsapp')).resolves.toEqual({ data: row });
});

it('still throws a 502 that carries no row', async () => {
  mockHttp.mockRejectedValueOnce(new ApiError('bad gateway', 502, 'UPSTREAM'));

  await expect(api.clientMessages.send('c1', 'Hi', 'whatsapp')).rejects.toBeInstanceOf(ApiError);
});
