// Support page: the composer and the thread reply.
//
// Phase 2 moved both onto the shared field system. What must not change is the
// contract with the API and the way a screen reader finds the controls, so
// this asserts the payloads and the accessible names rather than the styling.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

const { create, reply, tickets, ticket, toastSuccess, toastError } = vi.hoisted(() => ({
  create: vi.fn(),
  reply: vi.fn(),
  tickets: vi.fn(),
  ticket: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return { ...actual, api: { ...actual.api, support: { tickets, ticket, create, reply } } };
});

vi.mock('@/components/Guard', () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@/lib/toast', () => ({
  useToast: () => ({ toast: { success: toastSuccess, error: toastError } }),
}));

const { default: SupportPage } = await import('@/app/(chrome)/support/page');

const ticketRecord = {
  id: 't1',
  subject: 'Check-ins are failing',
  category: 'bug' as const,
  priority: 'normal' as const,
  status: 'open' as const,
  created_by_name: 'Alpha Studio Owner',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  resolved_at: null,
  message_count: 1,
  messages: [{
    id: 'm1', ticket_id: 't1', author_side: 'studio' as const,
    author_name: 'Alpha Studio Owner', body: 'The scanner rejects every QR code.',
    created_at: '2026-01-01T00:00:00.000Z',
  }],
};

beforeEach(() => {
  vi.clearAllMocks();
  tickets.mockResolvedValue({ data: [] });
  ticket.mockResolvedValue({ data: ticketRecord });
  create.mockResolvedValue({ data: ticketRecord });
  reply.mockResolvedValue({ data: ticketRecord.messages[0] });
});

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('support page forms', () => {
  it('sends the composer through the labelled fields', async () => {
    render(<SupportPage />);
    fireEvent.click(await screen.findByRole('button', { name: /new request/i }));

    const subject = screen.getByRole('textbox', { name: 'Subject' });
    const body = screen.getByRole('textbox', { name: 'What is happening?' });
    fireEvent.change(subject, { target: { value: ' Scanner down ' } });
    fireEvent.change(body, { target: { value: ' Every check-in fails. ' } });
    fireEvent.click(screen.getByRole('button', { name: /send request/i }));

    await waitFor(() => expect(create).toHaveBeenCalledWith({
      subject: 'Scanner down',
      body: 'Every check-in fails.',
      category: 'general',
      priority: 'normal',
    }));
  });

  it('replies from the thread with the hidden label still naming the field', async () => {
    tickets.mockResolvedValue({ data: [ticketRecord] });
    render(<SupportPage />);
    fireEvent.click(await screen.findByRole('button', { name: /check-ins are failing/i }));

    const replyBox = await screen.findByRole('textbox', { name: 'Your reply' });
    fireEvent.change(replyBox, { target: { value: 'It happens on the front desk tablet.' } });
    fireEvent.click(screen.getByRole('button', { name: /^send$/i }));

    await waitFor(() => expect(reply).toHaveBeenCalledWith(
      't1',
      'It happens on the front desk tablet.',
    ));
  });
});
