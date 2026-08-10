// Ask AI — the client-scoped assistant panel.
//
// These cover the three things that are easy to get wrong and expensive when
// wrong: what gets SENT (a duplicated question, or one client's history sent
// with another client's id), what gets SHOWN (an answer with no indication of
// what it rests on), and what happens when the service says no.
//
// Grounding itself is the service's job and is tested there against the real
// app. Here the service is a fake, because the question is what this component
// asks for and renders.
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const askClientAi = vi.fn();
vi.mock('@/lib/client-ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/client-ai')>();
  return { ...actual, askClientAi: (...a: unknown[]) => askClientAi(...a) };
});

import ClientAiPanel from '@/components/pt-os/ClientAiPanel';

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

function open(props: Partial<Parameters<typeof ClientAiPanel>[0]> = {}) {
  return render(
    <ClientAiPanel clientId="c-1" clientName="Rahul Sharma" onClose={vi.fn()} {...props} />,
  );
}

beforeEach(() => {
  askClientAi.mockReset();
  askClientAi.mockResolvedValue(answer());
});

describe('what it sends', () => {
  it('sends the question with the client from the page, not from anything typed', async () => {
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Summarize this client' }));

    await waitFor(() => expect(askClientAi).toHaveBeenCalled());
    const [payload] = askClientAi.mock.calls[0];
    expect(payload.clientId).toBe('c-1');
    expect(payload.message).toBe('Summarize this client');
  });

  it('does not include the current question in its own history', async () => {
    // History is what PRECEDED the question. Appending optimistically and then
    // reading state would send it twice, and the model would see the user ask
    // the same thing two turns running.
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Summarize this client' }));
    await waitFor(() => expect(askClientAi).toHaveBeenCalledTimes(1));

    expect(askClientAi.mock.calls[0][0].history).toEqual([]);
  });

  it('carries prior turns so a follow-up resolves "their"', async () => {
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Summarize this client' }));
    await screen.findByText(/78\.4 kg/);

    fireEvent.change(screen.getByLabelText(/ask a question/i), {
      target: { value: 'What about their attendance?' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^send$/i }));

    await waitFor(() => expect(askClientAi).toHaveBeenCalledTimes(2));
    const history = askClientAi.mock.calls[1][0].history;
    expect(history).toHaveLength(2);
    expect(history[0]).toEqual({ role: 'user', content: 'Summarize this client' });
    expect(history[1].role).toBe('assistant');
  });

  it('will not send an empty or whitespace question', async () => {
    open();
    fireEvent.change(screen.getByLabelText(/ask a question/i), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: /^send$/i }));

    expect(askClientAi).not.toHaveBeenCalled();
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

  it('says which records it could NOT read, rather than hiding the gap', async () => {
    // A missing source that is silently omitted reads as "there is nothing
    // there", which is a different and wrong claim.
    askClientAi.mockResolvedValue(answer({
      toolsUsed: ['getClientSummary'],
      toolsUnavailable: [{ tool: 'getClientAttendance', reason: 'You are not authorised to see this.' }],
    }));
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Summarize this client' }));

    expect(await screen.findByText(/couldn.t read: attendance/i)).toBeTruthy();
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
    askClientAi.mockRejectedValue(
      new ClientAiError('This client could not be found in your studio.', 'NOT_FOUND', 404),
    );
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Summarize this client' }));

    expect(await screen.findByText(/could not be found in your studio/i)).toBeTruthy();
    expect(screen.getByText(/couldn.t answer/i)).toBeTruthy();
  });

  it('recovers — a failed turn does not wedge the composer', async () => {
    const { ClientAiError } = await import('@/lib/client-ai');
    askClientAi.mockRejectedValueOnce(new ClientAiError('Temporary.', 'ALL_MODELS_FAILED', 503));
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Summarize this client' }));
    await screen.findByText(/temporary/i);

    askClientAi.mockResolvedValue(answer());
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
