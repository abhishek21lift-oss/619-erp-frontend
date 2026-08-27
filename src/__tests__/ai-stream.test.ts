// SSE parsing, which is where a streaming client actually goes wrong.
//
// The interesting cases are not "does it read a message" — they are the ones a
// working local test never produces and a real network always eventually does:
// a chunk boundary landing mid-line, a `data:` line carrying half an object, a
// user pressing Stop mid-answer. Every one of those is silent when handled
// wrong: you get a truncated answer, or a swallowed one, and nothing throws.

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { streamAiChat } from '@/lib/ai-stream';

// apiBase() refuses to guess a host — same as it does in the browser.
beforeAll(() => { process.env.NEXT_PUBLIC_API_URL = 'http://api.test'; });

/** A fetch whose body streams exactly the byte groups given, in order. */
function mockFetchStreaming(groups: string[], ok = true, status = 200) {
  const enc = new TextEncoder();
  let i = 0;
  const body = {
    getReader: () => ({
      read: async () =>
        i < groups.length
          ? { value: enc.encode(groups[i++]), done: false }
          : { value: undefined, done: true },
    }),
  };
  return vi.fn().mockResolvedValue({ ok, status, body: ok ? body : null });
}

const sse = (o: unknown) => `data: ${JSON.stringify(o)}\n\n`;

afterEach(() => { vi.unstubAllGlobals(); });

describe('streamAiChat', () => {
  it('accumulates chunks and reports the running text, not the delta', async () => {
    vi.stubGlobal('fetch', mockFetchStreaming([
      sse({ type: 'start', conversation_id: 'c1' }),
      sse({ type: 'chunk', content: 'Hello' }),
      sse({ type: 'chunk', content: ' there' }),
      sse({ type: 'done', conversation_id: 'c1' }),
    ]));

    const seen: string[] = [];
    const res = await streamAiChat({ message: 'hi' }, { onText: (t) => seen.push(t) });

    expect(seen).toEqual(['Hello', 'Hello there']);
    expect(res.text).toBe('Hello there');
    expect(res.conversationId).toBe('c1');
    expect(res.aborted).toBe(false);
  });

  // The one that matters. A network read has no obligation to end on a line
  // boundary, so the parser must carry the tail forward. Splitting a single
  // event across three reads must still produce exactly one event.
  it('survives an event split across reads', async () => {
    const whole = sse({ type: 'chunk', content: 'split' });
    vi.stubGlobal('fetch', mockFetchStreaming([
      whole.slice(0, 7),
      whole.slice(7, 15),
      whole.slice(15),
    ]));

    const seen: string[] = [];
    const res = await streamAiChat({ message: 'hi' }, { onText: (t) => seen.push(t) });
    expect(seen).toEqual(['split']);
    expect(res.text).toBe('split');
  });

  it('skips malformed data lines instead of failing the stream', async () => {
    vi.stubGlobal('fetch', mockFetchStreaming([
      'data: {not json\n\n',
      'data: \n\n',
      ': a comment line\n\n',
      sse({ type: 'chunk', content: 'ok' }),
    ]));
    const res = await streamAiChat({ message: 'hi' });
    expect(res.text).toBe('ok');
  });

  // The backend heartbeats with ': ping' comment lines so proxies with an idle
  // read timeout never cut a quiet stream. They must be invisible to callers —
  // the one way they can break the app is by leaking into the answer text.
  it('ignores SSE comment keep-alives so they never become answer text', async () => {
    vi.stubGlobal('fetch', mockFetchStreaming([
      ': ping\n\n',
      ': ping\n\n',
      sse({ type: 'chunk', content: 'answer' }),
    ]));
    const seen: string[] = [];
    const res = await streamAiChat({ message: 'hi' }, { onText: (t) => seen.push(t) });
    expect(seen).toEqual(['answer']);
    expect(res.text).toBe('answer');
  });

  it('surfaces sources and tools to the caller', async () => {
    vi.stubGlobal('fetch', mockFetchStreaming([
      sse({ type: 'sources', sources: ['Handbook'] }),
      sse({ type: 'tools', tools: ['dues_summary'] }),
      sse({ type: 'chunk', content: 'x' }),
    ]));
    const sources: string[][] = [];
    const tools: string[][] = [];
    await streamAiChat({ message: 'hi' }, {
      onSources: (s) => sources.push(s),
      onTools: (t) => tools.push(t),
    });
    expect(sources).toEqual([['Handbook']]);
    expect(tools).toEqual([['dues_summary']]);
  });

  it('turns an error event into an AiStreamError', async () => {
    vi.stubGlobal('fetch', mockFetchStreaming([
      sse({ type: 'chunk', content: 'partial' }),
      sse({ type: 'error', message: 'model unavailable' }),
    ]));
    await expect(streamAiChat({ message: 'hi' })).rejects.toThrow('model unavailable');
  });

  it('explains a 401 rather than showing a status code', async () => {
    vi.stubGlobal('fetch', mockFetchStreaming([], false, 401));
    await expect(streamAiChat({ message: 'hi' })).rejects.toThrow(/session has expired/i);
  });

  // Stop is a decision, not a failure. Whatever streamed stays on screen.
  it('returns the partial text when the caller aborts mid-stream', async () => {
    const controller = new AbortController();
    const enc = new TextEncoder();
    let call = 0;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      body: {
        getReader: () => ({
          read: async () => {
            call += 1;
            if (call === 1) return { value: enc.encode(sse({ type: 'chunk', content: 'kept' })), done: false };
            controller.abort();
            throw new DOMException('aborted', 'AbortError');
          },
        }),
      },
    }));

    const res = await streamAiChat({ message: 'hi', signal: controller.signal });
    expect(res.aborted).toBe(true);
    expect(res.text).toBe('kept');
  });

  it('sends conversation and client context when it has them', async () => {
    const f = mockFetchStreaming([sse({ type: 'chunk', content: 'x' })]);
    vi.stubGlobal('fetch', f);
    await streamAiChat({ message: 'hi', conversationId: 'c9', clientId: 'cl9' });
    const body = JSON.parse((f.mock.calls[0][1] as { body: string }).body);
    expect(body).toMatchObject({ message: 'hi', conversation_id: 'c9', client_id: 'cl9' });
  });
});
