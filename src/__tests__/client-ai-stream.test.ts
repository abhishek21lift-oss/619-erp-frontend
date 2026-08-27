// streamClientAi — the SSE parser on the browser side.
//
// Worth its own tests because the failure modes are all silent. A parser that
// drops a line split across a read boundary loses a word in the middle of an
// answer and looks fine. One that treats a keep-alive comment as content
// prints ": ping" into the trainer's answer. One that ignores the done event
// returns an object with no provenance and the source chips quietly vanish.
import { describe, expect, it, vi, beforeAll, afterAll, afterEach } from 'vitest';
import { streamClientAi, ClientAiError } from '@/lib/client-ai';

// jsdom runs on localhost, where apiBase() insists on an explicit backend URL
// rather than guessing one. Give it the same value .env.local would.
beforeAll(() => { vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://localhost:5000'); });
afterAll(() => { vi.unstubAllEnvs(); });

/** A Response whose body yields exactly these pieces, split where we say. */
function sse(pieces: string[], init: { status?: number } = {}) {
  const status = init.status ?? 200;
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      const enc = new TextEncoder();
      for (const p of pieces) controller.enqueue(enc.encode(p));
      controller.close();
    },
  });
  return new Response(status === 200 ? body : null, {
    status,
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

const evt = (o: Record<string, unknown>) => `data: ${JSON.stringify(o)}\n\n`;

const DONE = {
  type: 'done',
  message: 'Hello world',
  clientId: 'c-1',
  clientName: 'Rahul Sharma',
  toolsUsed: ['getClientSummary'],
  toolsUnavailable: [],
  proposedAction: null,
  requiresConfirmation: false,
};

const ask = () => streamClientAi({ clientId: 'c-1', message: 'hi' }, {});

afterEach(() => { vi.unstubAllGlobals(); });

describe('parsing', () => {
  it('reassembles a delta split across a read boundary', async () => {
    // The chunk boundary is chosen to land inside a JSON string. A parser that
    // does not carry the tail forward drops "Hello " entirely — an answer
    // missing a word, with nothing anywhere reporting a problem.
    vi.stubGlobal('fetch', vi.fn(async () => sse([
      'data: {"type":"chunk","content":"Hel',
      'lo "}\n\n' + evt({ type: 'chunk', content: 'world' }),
      evt(DONE),
    ])));

    const seen: string[] = [];
    const res = await streamClientAi({ clientId: 'c-1', message: 'hi' }, { onText: (t) => seen.push(t) });

    // onText carries the answer SO FAR, not the delta — every caller renders
    // the whole string, so accumulating here means none of them can get it
    // subtly wrong on their own.
    expect(seen).toEqual(['Hello ', 'Hello world']);
    expect(res.clientName).toBe('Rahul Sharma');
    expect(res.toolsUsed).toEqual(['getClientSummary']);
  });

  it('ignores keep-alive comments', async () => {
    // The service sends ': ping' every 15s so proxies do not call a thinking
    // model a dead connection. It must never reach the answer text.
    vi.stubGlobal('fetch', vi.fn(async () => sse([
      ': ping\n\n', evt({ type: 'chunk', content: 'x' }), ': ping\n\n', evt(DONE),
    ])));

    const seen: string[] = [];
    await streamClientAi({ clientId: 'c-1', message: 'hi' }, { onText: (t) => seen.push(t) });

    expect(seen).toEqual(['x']);
  });

  it('reports the provenance before any text', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => sse([
      evt({ type: 'start', clientName: 'Rahul Sharma', toolsUsed: ['getClientSummary'], toolsUnavailable: [] }),
      evt({ type: 'chunk', content: 'x' }),
      evt(DONE),
    ])));

    const order: string[] = [];
    await streamClientAi({ clientId: 'c-1', message: 'hi' }, {
      onStart: (s) => order.push(`start:${s.toolsUsed.join(',')}`),
      onText: () => order.push('text'),
    });

    expect(order).toEqual(['start:getClientSummary', 'text']);
  });
});

describe('failures', () => {
  it('a status-coded refusal is thrown with its reason, not parsed as a stream', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Not found, or not visible to you.' } }),
      { status: 404, headers: { 'Content-Type': 'application/json' } },
    )));

    await expect(ask()).rejects.toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
      message: 'This client could not be found in your studio.',
    });
  });

  it('an error event mid-stream carries whether text was already on screen', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => sse([
      evt({ type: 'chunk', content: 'Rahul has been ' }),
      evt({ type: 'error', code: 'AI_TIMEOUT', message: 'The assistant is temporarily unavailable.', partial: true }),
    ])));

    const err = await ask().catch((e) => e);
    expect(err).toBeInstanceOf(ClientAiError);
    expect(err.partial).toBe(true);
  });

  it('a stream that ends without done is incomplete, not a success', async () => {
    // The connection dropped mid-answer. Returning what arrived as if it were
    // the finished answer is the one outcome worse than an error: a truncated
    // recommendation that reads as a whole one.
    vi.stubGlobal('fetch', vi.fn(async () => sse([evt({ type: 'chunk', content: 'half an ans' })])));

    await expect(ask()).rejects.toMatchObject({ code: 'STREAM_INCOMPLETE', partial: true });
  });

  it('an unreachable service is a network error, not a crash', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));

    await expect(ask()).rejects.toMatchObject({ code: 'NETWORK' });
  });
});

describe('what it sends', () => {
  it('posts to the streaming route with the session cookie and a bounded history', async () => {
    const fetchMock = vi.fn(async () => sse([evt(DONE)]));
    vi.stubGlobal('fetch', fetchMock);

    const history = Array.from({ length: 20 }, (_, i) => ({ role: 'user' as const, content: `q${i}` }));
    await streamClientAi({ clientId: 'c-1', message: 'hi', history }, {});

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/ai/client-agent/chat/stream');
    // The token is httpOnly, so there is no header to set — omitting this sends
    // the request with no credential at all and the service answers 401.
    expect(init.credentials).toBe('include');
    expect(JSON.parse(String(init.body)).history).toHaveLength(8);
  });
});
