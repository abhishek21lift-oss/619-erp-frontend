// Ask AI — the client-scoped assistant panel.
//
// These cover the things that are easy to get wrong and expensive when wrong:
// what gets SENT (a duplicated question, or one client's history sent with
// another client's id), what gets SHOWN as it arrives, and what happens when
// the answer stops halfway.
//
// Grounding itself is the service's job and is tested there against the real
// app. Here the service is a fake, because the question is what this component
// asks for and renders.
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

const streamClientAi = vi.fn();
vi.mock('@/lib/client-ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/client-ai')>();
  return { ...actual, streamClientAi: (...a: unknown[]) => streamClientAi(...a) };
});

import ClientAiPanel from '@/components/pt-os/ClientAiPanel';

type Handlers = {
  onStart?: (s: unknown) => void;
  onText?: (t: string) => void;
};

const answer = (over: Record<string, unknown> = {}) => ({
  message: 'Weight is 78.4 kg, down 1.2 kg this month.',
  clientId: 'c-1',
  clientName: 'Rahul Sharma',
  toolsUsed: ['getClientSummary'],
  toolsUnavailable: [],
  proposedAction: null,
  requiresConfirmation: false,
  ...over,
});

/** A stand-in that streams the answer the way the service does: start first
 *  with the provenance, then the text accumulating word by word. */
const streamsBack = (over: Record<string, unknown> = {}) =>
  async (_input: unknown, handlers: Handlers = {}) => {
    const a = answer(over);
    handlers.onStart?.({
      clientId: a.clientId,
      clientName: a.clientName,
      toolsUsed: a.toolsUsed,
      toolsUnavailable: a.toolsUnavailable,
    });
    let sofar = '';
    for (const word of String(a.message).split(/(?<=\s)/)) {
      sofar += word;
      handlers.onText?.(sofar);
    }
    return a;
  };

function open(props: Partial<Parameters<typeof ClientAiPanel>[0]> = {}) {
  return render(
    <ClientAiPanel clientId="c-1" clientName="Rahul Sharma" onClose={vi.fn()} {...props} />,
  );
}

beforeEach(() => {
  streamClientAi.mockReset();
  streamClientAi.mockImplementation(streamsBack());
});

describe('what it sends', () => {
  it('sends the question with the client from the page, not from anything typed', async () => {
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Summarize this client' }));

    await waitFor(() => expect(streamClientAi).toHaveBeenCalled());
    const [payload] = streamClientAi.mock.calls[0];
    expect(payload.clientId).toBe('c-1');
    expect(payload.message).toBe('Summarize this client');
  });

  it('does not include the current question in its own history', async () => {
    // History is what PRECEDED the question. Appending optimistically and then
    // reading state would send it twice, and the model would see the user ask
    // the same thing two turns running.
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Summarize this client' }));
    await waitFor(() => expect(streamClientAi).toHaveBeenCalledTimes(1));

    expect(streamClientAi.mock.calls[0][0].history).toEqual([]);
  });

  it('carries prior turns so a follow-up resolves "their"', async () => {
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Summarize this client' }));
    await screen.findByText(/78\.4 kg/);

    fireEvent.change(screen.getByLabelText(/ask a question/i), {
      target: { value: 'What about their attendance?' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^send$/i }));

    await waitFor(() => expect(streamClientAi).toHaveBeenCalledTimes(2));
    const { history } = streamClientAi.mock.calls[1][0];
    expect(history).toHaveLength(2);
    expect(history[0]).toEqual({ role: 'user', content: 'Summarize this client' });
    // The streamed answer must have been committed to history as ONE turn with
    // the finished text — not as the running partial it was mid-stream.
    expect(history[1]).toEqual({ role: 'assistant', content: answer().message });
  });

  it('will not send an empty or whitespace question', async () => {
    open();
    fireEvent.change(screen.getByLabelText(/ask a question/i), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: /^send$/i }));

    expect(streamClientAi).not.toHaveBeenCalled();
  });
});

describe('what it shows', () => {
  it('renders the answer and the records it rests on', async () => {
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Summarize this client' }));

    expect(await screen.findByText(/78\.4 kg/)).toBeTruthy();
    // Provenance, in words rather than tool names: a trainer acting on this
    // should be able to see what it read.
    expect(screen.getByText('summary')).toBeTruthy();
  });

  it('shows the answer growing, rather than nothing until it is complete', async () => {
    // The entire reason streaming exists. A component that buffers the deltas
    // and renders once at the end passes every other test in this file and
    // gives the trainer the same blank minute they had before.
    let push: (text: string) => void = () => {};
    let settle: (a: unknown) => void = () => {};
    streamClientAi.mockImplementation(async (_input: unknown, handlers: Handlers = {}) => {
      handlers.onStart?.({
        clientId: 'c-1', clientName: 'Rahul Sharma', toolsUsed: ['getClientSummary'], toolsUnavailable: [],
      });
      return new Promise((resolve) => {
        push = (text) => handlers.onText?.(text);
        settle = resolve;
      });
    });

    open();
    fireEvent.click(screen.getByRole('button', { name: 'Summarize this client' }));

    // Nothing has resolved and nothing ever will until we say so.
    act(() => push('Rahul has been '));
    expect(await screen.findByText(/Rahul has been/)).toBeTruthy();

    act(() => push('Rahul has been training twice a week.'));
    expect(await screen.findByText(/training twice a week/)).toBeTruthy();

    await act(async () => { settle(answer({ message: 'Rahul has been training twice a week.' })); });
  });

  it('shows the sources before the first word arrives', async () => {
    // Retrieval finishes well before the model starts writing. Showing what it
    // read during that gap is the difference between a wait and progress.
    streamClientAi.mockImplementation(async (_i: unknown, handlers: Handlers = {}) => {
      handlers.onStart?.({
        clientId: 'c-1', clientName: 'Rahul Sharma', toolsUsed: ['getClientSummary'], toolsUnavailable: [],
      });
      return new Promise(() => {});   // never finishes
    });

    open();
    fireEvent.click(screen.getByRole('button', { name: 'Summarize this client' }));

    expect(await screen.findByText('summary')).toBeTruthy();
  });

  it('says which records it could NOT read, rather than hiding the gap', async () => {
    // A missing source that is silently omitted reads as "there is nothing
    // there", which is a different and wrong claim.
    streamClientAi.mockImplementation(streamsBack({
      toolsUsed: ['getClientSummary'],
      toolsUnavailable: [{ tool: 'getClientAttendance', reason: 'You are not authorised to see this.' }],
    }));
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Summarize this client' }));

    expect(await screen.findByText(/couldn.t read: attendance/i)).toBeTruthy();
  });

  it('names the figures it could not find in the record', async () => {
    // The service checked the answer's numbers against the client's records
    // and could not account for 22.7%. Showing the answer without that flag
    // hands the trainer a fabricated body-fat reading as though the database
    // had stated it — the exact failure the whole grounding design exists to
    // prevent, and the one a trainer cannot detect by reading.
    streamClientAi.mockImplementation(streamsBack({
      message: 'Body fat is 22.7%.',
      grounding: {
        checked: 1,
        inSource: 0,
        derived: 0,
        unverified: 1,
        figures: [{ text: '22.7%', value: 22.7, line: 1, context: 'Body fat is 22.7%.' }],
      },
    }));
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Summarize this client' }));

    // The figure itself, not a count — the trainer must know WHICH number.
    expect(await screen.findByText(/not found in Rahul Sharma.s records: 22\.7%/i)).toBeTruthy();
    // And the answer is still shown: the panel flags, it does not censor.
    expect(screen.getByText(/Body fat is 22\.7%/)).toBeTruthy();
  });

  it('says nothing when every figure checked out', async () => {
    // A warning that appears on healthy answers is a warning trainers learn to
    // ignore, which costs exactly the case above.
    streamClientAi.mockImplementation(streamsBack({
      grounding: { checked: 3, inSource: 3, derived: 0, unverified: 0, figures: [] },
    }));
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Summarize this client' }));
    await screen.findByText(/78\.4 kg/);

    expect(screen.queryByText(/not found in/i)).toBeNull();
  });

  it('states plainly that it is read-only', async () => {
    // §27: the assistant must never imply it changed something. Phase 1 cannot
    // write at all, and the panel should say so rather than leave it ambiguous.
    open();
    expect(screen.getByText(/read-only/i)).toBeTruthy();
  });

  it('offers only questions the service can actually answer', async () => {
    open();
    // "What changed since the last assessment?" is deliberately absent — the
    // ERP exposes latest-only and there is no history endpoint behind it.
    expect(screen.queryByRole('button', { name: /since the last assessment/i })).toBeNull();
    expect(screen.getByRole('button', { name: 'When does their package expire?' })).toBeTruthy();
  });
});

describe('when the service says no', () => {
  it('shows the reason instead of an empty bubble', async () => {
    const { ClientAiError } = await import('@/lib/client-ai');
    streamClientAi.mockRejectedValue(
      new ClientAiError('This client could not be found in your studio.', 'NOT_FOUND', 404),
    );
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Summarize this client' }));

    expect(await screen.findByText(/could not be found in your studio/i)).toBeTruthy();
    expect(screen.getByText(/couldn.t answer/i)).toBeTruthy();
  });

  it('keeps a half-written answer and marks it incomplete', async () => {
    // The model stopped mid-sentence. Deleting text the trainer has already
    // read, to replace it with "something went wrong", loses real information —
    // but leaving it looking finished is worse. So: keep it, and say so.
    const { ClientAiError } = await import('@/lib/client-ai');
    streamClientAi.mockImplementation(async (_i: unknown, handlers: Handlers = {}) => {
      handlers.onStart?.({
        clientId: 'c-1', clientName: 'Rahul Sharma', toolsUsed: ['getClientSummary'], toolsUnavailable: [],
      });
      handlers.onText?.('Rahul has been training');
      throw new ClientAiError('Stopped.', 'AI_TIMEOUT', 0, true);
    });

    open();
    fireEvent.click(screen.getByRole('button', { name: 'Summarize this client' }));

    expect(await screen.findByText(/Rahul has been training/)).toBeTruthy();
    expect(screen.getByText(/treat this as incomplete/i)).toBeTruthy();
  });

  it('does not leave an empty bubble behind when the failure came before any text', async () => {
    const { ClientAiError } = await import('@/lib/client-ai');
    streamClientAi.mockImplementation(async (_i: unknown, handlers: Handlers = {}) => {
      handlers.onStart?.({
        clientId: 'c-1', clientName: 'Rahul Sharma', toolsUsed: ['getClientSummary'], toolsUnavailable: [],
      });
      throw new ClientAiError('The assistant is temporarily unavailable.', 'ALL_MODELS_FAILED', 0, false);
    });

    open();
    fireEvent.click(screen.getByRole('button', { name: 'Summarize this client' }));

    expect(await screen.findByText(/temporarily unavailable/i)).toBeTruthy();
    // The placeholder that onStart created must be gone, not sitting above the
    // error as a blank assistant bubble.
    expect(screen.queryByText(/treat this as incomplete/i)).toBeNull();
    expect(screen.queryByText('summary')).toBeNull();
  });

  it('recovers — a failed turn does not wedge the composer', async () => {
    const { ClientAiError } = await import('@/lib/client-ai');
    streamClientAi.mockRejectedValueOnce(new ClientAiError('Temporary.', 'ALL_MODELS_FAILED', 503));
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Summarize this client' }));
    await screen.findByText(/temporary/i);

    streamClientAi.mockImplementation(streamsBack());
    fireEvent.change(screen.getByLabelText(/ask a question/i), { target: { value: 'try again' } });
    fireEvent.click(screen.getByRole('button', { name: /^send$/i }));

    expect(await screen.findByText(/78\.4 kg/)).toBeTruthy();
  });
});

describe('changing client', () => {
  it('clears the transcript, so one client\'s answers never sit under another\'s name', async () => {
    const { rerender } = open();
    fireEvent.click(screen.getByRole('button', { name: 'Summarize this client' }));
    await screen.findByText(/78\.4 kg/);

    rerender(<ClientAiPanel clientId="c-2" clientName="Priya Nair" onClose={vi.fn()} />);

    await waitFor(() => expect(screen.queryByText(/78\.4 kg/)).toBeNull());
    expect(screen.getByText('Priya Nair')).toBeTruthy();
  });
});
