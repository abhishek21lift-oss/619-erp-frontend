// The trainer's inbox, after WhatsApp joined the thread.
//
// The page's job is small and load-bearing: mark which conversations arrived
// over WhatsApp, let the thread decide the channel, and offer a draft that is
// only ever text in the composer.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ChatMessage, StudioConversation, StudioMessageThread } from '@/lib/api';

const inboxMock = vi.fn();
const threadMock = vi.fn();
const sendMock = vi.fn();
const retryMock = vi.fn();
const draftMock = vi.fn();
const { enabled } = vi.hoisted(() => ({ enabled: vi.fn(() => true) }));

vi.mock('@/lib/api', () => ({
  api: {
    clientMessages: {
      inbox: (...args: unknown[]) => inboxMock(...args),
      thread: (...args: unknown[]) => threadMock(...args),
      send: (...args: unknown[]) => sendMock(...args),
      retry: (...args: unknown[]) => retryMock(...args),
      aiDraft: (...args: unknown[]) => draftMock(...args),
      unreadCount: vi.fn(),
    },
  },
}));

vi.mock('@/components/Guard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode } & Record<string, unknown>) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('client=c1'),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/pt-os/messages',
}));

vi.mock('@/lib/features-context', () => ({
  useFeatures: () => ({ enabled, features: {}, loaded: true }),
}));

import TrainerMessagesPage from '@/app/(chrome)/pt-os/messages/page';

const conversation = (over: Partial<StudioConversation> = {}): StudioConversation => ({
  client_id: 'c1',
  client_name: 'Ravi Kumar',
  photo_url: null,
  member_code: 'M1',
  last_sender: 'member',
  last_body: 'Hello coach',
  last_at: new Date().toISOString(),
  last_channel: 'in_app',
  unread: 0,
  has_login: true,
  ...over,
});

const message = (over: Partial<ChatMessage> = {}): ChatMessage => ({
  id: 'm1',
  sender: 'member',
  body: 'Hello',
  read_at: null,
  created_at: new Date().toISOString(),
  channel: 'in_app',
  message_type: 'text',
  delivery_status: null,
  failure_reason: null,
  ...over,
});

const thread = (over: Partial<StudioMessageThread> = {}): StudioMessageThread => ({
  messages: [],
  channels: { default: 'in_app', whatsapp_available: true },
  client: {
    id: 'c1', name: 'Ravi Kumar', photo_url: null, member_code: 'M1', has_login: true,
  },
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  enabled.mockReturnValue(true);
  inboxMock.mockResolvedValue({ data: [conversation()] });
  threadMock.mockResolvedValue({ data: thread() });
  sendMock.mockResolvedValue({ data: message({ sender: 'studio' }) });
  retryMock.mockResolvedValue({ data: message({ sender: 'studio', delivery_status: 'sent' }) });
  draftMock.mockResolvedValue({
    data: { draft: 'Hi Ravi, how is the knee?', meta: { model: 'm', used_fallback: false } },
  });
});

it('marks an inbox row whose latest message came from WhatsApp', async () => {
  inboxMock.mockResolvedValue({ data: [conversation({ last_channel: 'whatsapp' })] });
  render(<TrainerMessagesPage />);

  expect(await screen.findByLabelText('WhatsApp')).toBeInTheDocument();
});

it('sends over the channel the thread defaulted to', async () => {
  threadMock.mockResolvedValue({
    data: thread({ channels: { default: 'whatsapp', whatsapp_available: true } }),
  });
  sendMock.mockResolvedValue({
    data: message({ sender: 'studio', channel: 'whatsapp', delivery_status: 'sent' }),
  });
  render(<TrainerMessagesPage />);

  fireEvent.change(await screen.findByLabelText('Message'), { target: { value: 'Hi' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

  await waitFor(() => expect(sendMock).toHaveBeenCalledWith('c1', 'Hi', 'whatsapp'));
});

it('drafts a reply without sending it', async () => {
  render(<TrainerMessagesPage />);

  fireEvent.click(await screen.findByRole('button', { name: /draft reply/i }));

  await waitFor(() => expect(screen.getByLabelText('Message')).toHaveValue('Hi Ravi, how is the knee?'));
  expect(sendMock).not.toHaveBeenCalled();
});

it('hides the draft button when the studio has no AI suite', async () => {
  enabled.mockReturnValue(false);
  render(<TrainerMessagesPage />);

  expect(await screen.findByLabelText('Message')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /draft reply/i })).not.toBeInTheDocument();
});
