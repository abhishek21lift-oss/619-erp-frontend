// The member stream posts only a message and carries back the trainer draft.
// It shares the SSE parser with the trainer chat, so the chunk-boundary rules
// are tested once (ai-stream.test.ts) and this suite pins the member contract.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { streamMemberAiChat } from '@/lib/ai-stream';

beforeAll(() => { process.env.NEXT_PUBLIC_API_URL = 'http://api.test'; });
afterEach(() => vi.unstubAllGlobals());

const sse = (o: unknown) => `data: ${JSON.stringify(o)}\n\n`;

function streaming(groups: string[]) {
  const enc = new TextEncoder();
  let i = 0;
  return vi.fn().mockResolvedValue({
    ok: true, status: 200,
    body: { getReader: () => ({ read: async () => (
      i < groups.length ? { value: enc.encode(groups[i++]), done: false } : { value: undefined, done: true }
    ) }) },
  });
}

describe('streamMemberAiChat', () => {
  it('posts only the message to the member endpoint', async () => {
    const fetchMock = streaming([sse({ type: 'chunk', content: 'ok' }), sse({ type: 'done' })]);
    vi.stubGlobal('fetch', fetchMock);

    await streamMemberAiChat({ message: 'hi' });
    expect(fetchMock.mock.calls[0][0]).toBe('http://api.test/api/me/ai/chat');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ message: 'hi' });
  });

  it('accumulates chunks and returns the draft from done', async () => {
    vi.stubGlobal('fetch', streaming([
      sse({ type: 'chunk', content: 'Here is ' }),
      sse({ type: 'chunk', content: 'a draft' }),
      sse({ type: 'done', proposedMessage: 'Hi trainer' }),
    ]));

    const seen: string[] = [];
    const res = await streamMemberAiChat({ message: 'tell my trainer' }, {
      onText: (t) => seen.push(t),
    });

    expect(seen).toEqual(['Here is ', 'Here is a draft']);
    expect(res.text).toBe('Here is a draft');
    expect(res.proposedMessage).toBe('Hi trainer');
  });

  it('surfaces an error event as an AiStreamError', async () => {
    vi.stubGlobal('fetch', streaming([
      sse({ type: 'error', message: 'The assistant is unavailable.' }),
    ]));
    await expect(streamMemberAiChat({ message: 'hi' }))
      .rejects.toThrow('The assistant is unavailable.');
  });

  it('keeps partial text when the member aborts', async () => {
    const controller = new AbortController();
    vi.stubGlobal('fetch', streaming([
      sse({ type: 'chunk', content: 'partial' }),
    ]));
    controller.abort();
    const res = await streamMemberAiChat({ message: 'hi', signal: controller.signal });
    expect(res.aborted).toBe(true);
    expect(res.text).toBe('partial');
  });
});
