// The thread grew a second channel. What the trainer must be able to see:
// which messages went by WhatsApp, whether they arrived, and — when one did
// not — a reason they can act on and one button that sends it again.
//
// The AI draft and the 409 paths are here too, because both end in the same
// place: text in the composer that a human still has to send.

import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ChatThread from '@/components/chat/ChatThread';
import type { ChatChannel, ChatMessage } from '@/lib/api';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode } & Record<string, unknown>) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

const msg = (over: Partial<ChatMessage> = {}): ChatMessage => ({
  id: 'm1', sender: 'member', body: 'Hello', read_at: null,
  created_at: new Date().toISOString(), channel: 'in_app', message_type: 'text',
  delivery_status: null, failure_reason: null, ...over,
});

const baseProps = {
  me: 'studio' as const,
  initial: [] as ChatMessage[],
  reload: vi.fn(async () => []),
  send: vi.fn(async () => msg({})),
  empty: null,
};

it('labels WhatsApp and in-app messages', () => {
  const earlier = new Date(Date.now() - 10 * 60_000).toISOString();
  render(<ChatThread {...baseProps}
    initial={[msg({ channel: 'whatsapp', created_at: earlier }), msg({ id: 'm2', channel: 'in_app' })]} />);

  expect(screen.getAllByText('WhatsApp').length).toBeGreaterThan(0);
  expect(screen.getAllByText('In app').length).toBeGreaterThan(0);
});

it('shows the WhatsApp delivery ladder on outbound messages', () => {
  const out = (over: Partial<ChatMessage>) => msg({ sender: 'studio', channel: 'whatsapp', ...over });
  const { rerender } = render(
    <ChatThread key="delivered" {...baseProps} initial={[out({ delivery_status: 'delivered' })]} />,
  );
  expect(screen.getByText('Delivered')).toBeInTheDocument();
  // `initial` only seeds state, so change the key to force a fresh mount.
  rerender(<ChatThread key="read" {...baseProps} initial={[out({ delivery_status: 'read' })]} />);
  expect(screen.getByText('Read')).toBeInTheDocument();
});

it('shows a failed WhatsApp bubble with a plain reason and Retry', async () => {
  const retryMessage = vi.fn().mockResolvedValue(
    msg({ id: 'm1', sender: 'studio', channel: 'whatsapp', delivery_status: 'sent' }),
  );
  render(<ChatThread {...baseProps} retryMessage={retryMessage}
    initial={[msg({
      sender: 'studio', channel: 'whatsapp', delivery_status: 'failed',
      failure_reason: 'recipient_not_on_whatsapp',
    })]} />);

  expect(screen.getByText(/not on WhatsApp/i)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /retry/i }));
  await waitFor(() => expect(retryMessage).toHaveBeenCalledTimes(1));
});

it('calls send with the selected channel', () => {
  const send = vi.fn().mockResolvedValue(msg({}));
  render(<ChatThread {...baseProps} send={send} channels={{ default: 'in_app', whatsapp_available: true }} />);

  fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Hi' } });
  fireEvent.click(screen.getByRole('button', { name: 'WhatsApp' }));
  fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

  expect(send).toHaveBeenCalledWith('Hi', 'whatsapp');
});

it('disables WhatsApp with a connect link when the instance is down', () => {
  render(<ChatThread {...baseProps} channels={{ default: 'in_app', whatsapp_available: false }} />);

  expect(screen.getByRole('button', { name: 'WhatsApp' })).toBeDisabled();
  expect(screen.getByRole('link', { name: /connect whatsapp/i })).toHaveAttribute('href', '/engagement/whatsapp');
});

it('fills the composer from a draft and clears the note on edit', () => {
  render(<ChatThread {...baseProps} draftText="AI text" draftKey={1} draftNote="AI draft — edit before sending" />);

  expect(screen.getByLabelText('Message')).toHaveValue('AI text');
  expect(screen.getByText(/AI draft — edit before sending/i)).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Edited' } });
  expect(screen.queryByText(/AI draft — edit before sending/i)).not.toBeInTheDocument();
});

it('replaces the optimistic bubble with the failed server row instead of duplicating it', async () => {
  const send = vi.fn().mockResolvedValue(msg({
    id: 'server-1', sender: 'studio', channel: 'whatsapp', delivery_status: 'failed',
    failure_reason: 'recipient_not_on_whatsapp',
  }));
  render(<ChatThread {...baseProps} send={send} channels={{ default: 'whatsapp', whatsapp_available: true }} />);

  fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Hi' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

  await waitFor(() => expect(screen.getAllByText('Hi')).toHaveLength(1));
  expect(screen.getByText(/Not sent/i)).toBeInTheDocument();
});

it('restores the text and explains a 409 instead of leaving a retryable bubble', async () => {
  const send = vi.fn().mockRejectedValue(
    Object.assign(new Error('This client has no phone number.'), { status: 409 }),
  );
  render(<ChatThread {...baseProps} send={send} channels={{ default: 'whatsapp', whatsapp_available: true }} />);

  fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Hi' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

  await waitFor(() => expect(screen.getByLabelText('Message')).toHaveValue('Hi'));
  expect(screen.getByText('This client has no phone number.')).toBeInTheDocument();
  expect(screen.queryByText(/Not sent/i)).toBeNull();
});

it('keeps the channel a message was written for when it is retried locally', async () => {
  const send = vi.fn()
    .mockRejectedValueOnce(new Error('network'))
    .mockResolvedValueOnce(msg({ id: 'server-1', sender: 'studio', channel: 'whatsapp' }));
  render(<ChatThread {...baseProps} send={send} channels={{ default: 'whatsapp', whatsapp_available: true }} />);

  fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Hi' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
  await waitFor(() => expect(screen.getByText(/tap to retry/i)).toBeInTheDocument());

  // The picker still says WhatsApp, but a later picker change must not move a
  // message that was written for WhatsApp onto another channel.
  fireEvent.click(screen.getByRole('button', { name: 'In app' }));
  fireEvent.click(screen.getByRole('button', { name: /not sent: hi/i }));

  await waitFor(() => expect(send).toHaveBeenLastCalledWith('Hi', 'whatsapp'));
});

it('never renders an in-app label on the member side', () => {
  render(<ChatThread {...baseProps} me="member"
    initial={[msg({ sender: 'studio', channel: 'in_app' }), msg({ id: 'm2', channel: 'whatsapp' })]} />);

  expect(screen.getAllByText('WhatsApp').length).toBeGreaterThan(0);
  expect(screen.queryByText('In app')).toBeNull();
});

it('passes no channel to a member-side send', async () => {
  const send = vi.fn(async (body: string, channel?: ChatChannel) => msg({ body, channel: channel ?? 'in_app' }));
  render(<ChatThread {...baseProps} me="member" send={send} />);

  fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Hi' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

  await waitFor(() => expect(send).toHaveBeenCalledWith('Hi', undefined));
});
