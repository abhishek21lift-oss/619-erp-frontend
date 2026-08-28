// The AI Coach panel, from the outside.
//
// The panel must NOT understand the SSE wire format itself: that is the one
// job of lib/ai-stream (shared with the AI Coach page and the Command Center
// assistant), and a second parser inside the panel is how two implementations
// drift apart. So these tests are about what the panel asks for, what it
// renders as events arrive, and what it does when the stream fails — with the
// parser itself faked, because the parser has its own suite (ai-stream.test.ts).
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const streamAiChat = vi.fn();
vi.mock('@/lib/ai-stream', () => ({
  streamAiChat: (...a: unknown[]) => streamAiChat(...a),
}));

vi.mock('@/lib/api', () => ({
  api: {
    clients: {
      list: vi.fn().mockResolvedValue([]),
      search: vi.fn().mockResolvedValue([]),
      get: vi.fn(),
    },
    ai: {
      generateWorkout: vi.fn(),
      generateDiet: vi.fn(),
    },
  },
}));

import { AiCoachPanel } from '@/components/fitness/AiCoachPanel';

type Handlers = {
  onConversationId?: (id: string) => void;
  onSources?: (s: string[]) => void;
  onTools?: (t: string[]) => void;
  onText?: (t: string) => void;
};

/** A stand-in stream that behaves like streamAiChat: reports each full-text
 *  step via onText, optionally hands out sources/tools/conversation id, and
 *  resolves with the final text. */
function streamsBack({ text = '', sources, tools, conversationId }: { text?: string; sources?: string[]; tools?: string[]; conversationId?: string } = {}) {
  return async (_req: unknown, handlers: Handlers = {}) => {
    if (conversationId) handlers.onConversationId?.(conversationId);
    if (sources) handlers.onSources?.(sources);
    if (tools) handlers.onTools?.(tools);
    // No onText when there is nothing to say — like a stream with no chunks.
    if (text) {
      let sofar = '';
      for (const word of text.split(/(?<=\s)/)) {
        sofar += word;
        handlers.onText?.(sofar);
      }
    }
    return { text, conversationId: conversationId ?? null, aborted: false };
  };
}

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
  process.env.NEXT_PUBLIC_API_URL = 'http://api.test';
});

afterAll(() => {
  vi.unstubAllGlobals();
});

beforeEach(() => {
  streamAiChat.mockReset();
});

function open() {
  // type="general" opens straight into Chat with no generate form.
  return render(<AiCoachPanel type="general" />);
}

async function ask(question: string) {
  const input = screen.getByPlaceholderText('Ask your AI coach anything…');
  fireEvent.change(input, { target: { value: question } });
  fireEvent.keyDown(input, { key: 'Enter' });
}

describe('<AiCoachPanel />', () => {
  it('streams through the canonical streamAiChat helper instead of parsing SSE itself', async () => {
    streamAiChat.mockImplementation(streamsBack({ text: 'Hello there' }));
    open();

    await ask('hi');

    await waitFor(() => {
      expect(streamAiChat).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'hi' }),
        expect.any(Object),
      );
    });
    const req = streamAiChat.mock.calls[0][0] as { signal?: unknown };
    expect(req.signal).toBeInstanceOf(AbortSignal);
    expect(screen.getByText('Hello there')).toBeTruthy();
  });

  it('accumulates streamed chunks into a single answer and never calls fetch', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    streamAiChat.mockImplementation(streamsBack({ text: 'Weight is 78.4 kg, down 1.2 kg this month.' }));
    open();

    await ask('what is my client\'s weight?');

    await waitFor(() => {
      expect(screen.getByText('Weight is 78.4 kg, down 1.2 kg this month.')).toBeTruthy();
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('shows sources and tools alongside the answer', async () => {
    streamAiChat.mockImplementation(
      streamsBack({ text: 'Here is what I found.', sources: ['Handbook'], tools: ['dues_summary'] }),
    );
    open();

    await ask('check dues');

    await waitFor(() => expect(screen.getByText('Here is what I found.')).toBeTruthy());
    expect(screen.getByText('Handbook')).toBeTruthy();
    expect(screen.getByText('dues_summary')).toBeTruthy();
    expect(screen.getByText('Sources:')).toBeTruthy();
    expect(screen.getByText('Checked:')).toBeTruthy();
  });

  it('renders an AI error event in the panel\'s own wording', async () => {
    streamAiChat.mockRejectedValue(new Error('The assistant ran into a problem.'));
    open();

    await ask('hi');

    await waitFor(() => {
      expect(screen.getByText('⚠️ The AI coach ran into a problem.')).toBeTruthy();
    });
  });

  it('passes the backend error message through unchanged', async () => {
    streamAiChat.mockRejectedValue(new Error('model unavailable'));
    open();

    await ask('hi');

    await waitFor(() => {
      expect(screen.getByText('⚠️ model unavailable')).toBeTruthy();
    });
  });

  it('shows the panel\'s own 401 wording', async () => {
    streamAiChat.mockRejectedValue(new Error('Your session has expired — please sign in again.'));
    open();

    await ask('hi');

    await waitFor(() => {
      expect(screen.getByText('⚠️ Your session has expired. Please sign in again.')).toBeTruthy();
    });
  });

  it('keeps the streamed text when the user aborts — no error bubble', async () => {
    streamAiChat.mockImplementation(async (req: { signal?: AbortSignal }, handlers: Handlers = {}) => {
      handlers.onText?.('kept');
      return { text: 'kept', conversationId: null, aborted: true };
    });
    open();

    await ask('hi');

    await waitFor(() => expect(screen.getByText('kept')).toBeTruthy());
    expect(screen.queryByText(/⚠️/)).toBeNull();
  });

  it('says so plainly when the stream ends with no answer at all', async () => {
    streamAiChat.mockImplementation(streamsBack({ text: '' }));
    open();

    await ask('hi');

    await waitFor(() => {
      expect(screen.getByText('I couldn\'t generate a reply just now — please try again.')).toBeTruthy();
    });
  });

  it('still streams when a previous message already exists', async () => {
    streamAiChat.mockImplementation(async (req: { message?: string }, handlers: Handlers = {}) => {
      const text = String(req.message) === 'first' ? 'first answer' : 'second answer';
      handlers.onText?.(text);
      return { text, conversationId: null, aborted: false };
    });
    open();

    await ask('first');
    await waitFor(() => expect(screen.getByText('first answer')).toBeTruthy());

    await ask('second');
    await waitFor(() => expect(streamAiChat).toHaveBeenCalledTimes(2));
    expect(screen.getByText('second answer')).toBeTruthy();
    expect(screen.getByText('first answer')).toBeTruthy();
  });
});