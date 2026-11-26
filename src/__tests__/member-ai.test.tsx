// The member AI screen: history, streaming, a draft the member edits and
// confirms, honest failures, the studio's feature flag, and clearing the chat.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const apiMocks = vi.hoisted(() => ({
  aiHistory: vi.fn(),
  aiClear: vi.fn(),
  sendMessage: vi.fn(),
}));
const streamMock = vi.hoisted(() => vi.fn());
let featureOn = true;

vi.mock('@/lib/api', () => ({
  api: {
    me: {
      aiHistory: (...a: unknown[]) => apiMocks.aiHistory(...a),
      aiClear: (...a: unknown[]) => apiMocks.aiClear(...a),
      sendMessage: (...a: unknown[]) => apiMocks.sendMessage(...a),
    },
  },
}));
vi.mock('@/lib/ai-stream', () => ({
  streamMemberAiChat: (...a: unknown[]) => streamMock(...a),
}));
vi.mock('@/lib/features-context', () => ({
  useFeatures: () => ({ enabled: () => featureOn }),
}));
vi.mock('@/components/Guard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/member/MemberShell', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/member/MemberNav', () => ({ MEMBER_NAV_CLEARANCE: '84px' }));
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

import MemberAiPage from '@/app/(bare)/member/ai/page';

beforeEach(() => {
  vi.clearAllMocks();
  featureOn = true;
  apiMocks.aiHistory.mockResolvedValue({ data: { messages: [], configured: true } });
  apiMocks.aiClear.mockResolvedValue({ data: { cleared: true } });
  apiMocks.sendMessage.mockResolvedValue({
    data: { id: 'm1', sender: 'member', body: 'sent', read_at: null, created_at: '' },
  });
  streamMock.mockResolvedValue({ text: 'Leg day', proposedMessage: null, aborted: false });
});

describe('history', () => {
  it('renders the member own turns', async () => {
    apiMocks.aiHistory.mockResolvedValue({
      data: {
        messages: [{ role: 'assistant', content: 'Welcome back', created_at: '2026-11-25T10:00:00Z' }],
        configured: true,
      },
    });
    render(<MemberAiPage />);
    expect(await screen.findByText('Welcome back')).toBeInTheDocument();
  });
});

describe('asking a question', () => {
  it('streams a suggested prompt and paints the answer', async () => {
    streamMock.mockImplementation(async (_req, handlers: { onText?: (t: string) => void }) => {
      handlers.onText?.('Leg day');
      return { text: 'Leg day', proposedMessage: null, aborted: false };
    });

    render(<MemberAiPage />);
    fireEvent.click(await screen.findByRole('button', { name: "What's my workout today?" }));
    // The click starts an async stream; wait for that boundary before
    // asserting on what it painted.
    await waitFor(() => expect(streamMock).toHaveBeenCalled());

    expect(await screen.findByText('Leg day')).toBeInTheDocument();
    expect(streamMock).toHaveBeenCalledWith(
      expect.objectContaining({ message: "What's my workout today?" }),
      expect.anything(),
    );
  });

  it('keeps the member message and shows an honest failure', async () => {
    streamMock.mockRejectedValue(new Error('The assistant is unavailable.'));

    render(<MemberAiPage />);
    fireEvent.click(await screen.findByRole('button', { name: "What's my workout today?" }));

    expect(await screen.findByText('The assistant is unavailable.')).toBeInTheDocument();
    expect(screen.getByText("What's my workout today?")).toBeInTheDocument();
  });
});

describe('draft to the trainer', () => {
  beforeEach(() => {
    streamMock.mockImplementation(async (_req, handlers: { onText?: (t: string) => void }) => {
      handlers.onText?.('I can draft that.');
      return {
        text: 'I can draft that.',
        proposedMessage: 'Hi Ravi, I am travelling.',
        aborted: false,
      };
    });
  });

  it('lets the member edit and send the draft', async () => {
    render(<MemberAiPage />);
    fireEvent.click(await screen.findByRole('button', { name: "What's my workout today?" }));

    const box = await screen.findByLabelText('Message to your trainer');
    fireEvent.change(box, { target: { value: 'Hi Ravi, travelling next week.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send to trainer' }));

    await waitFor(() => {
      expect(apiMocks.sendMessage).toHaveBeenCalledWith('Hi Ravi, travelling next week.');
    });
    expect(await screen.findByText('Sent to your trainer')).toBeInTheDocument();
  });

  it('keeps the edit when sending fails', async () => {
    apiMocks.sendMessage.mockRejectedValueOnce(new Error('gateway_timeout'));

    render(<MemberAiPage />);
    fireEvent.click(await screen.findByRole('button', { name: "What's my workout today?" }));

    const box = await screen.findByLabelText('Message to your trainer');
    fireEvent.change(box, { target: { value: 'Hi Ravi, travelling next week.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send to trainer' }));

    expect(await screen.findByText('gateway_timeout')).toBeInTheDocument();
    expect((screen.getByLabelText('Message to your trainer') as HTMLTextAreaElement).value)
      .toBe('Hi Ravi, travelling next week.');
  });
});

describe('feature flag and clearing', () => {
  it('hides the composer when the studio does not have the AI suite', async () => {
    featureOn = false;
    render(<MemberAiPage />);

    expect(await screen.findByText("AI isn't enabled for your studio")).toBeInTheDocument();
    expect(screen.queryByLabelText('Message your AI coach')).toBeNull();
    expect(apiMocks.aiHistory).not.toHaveBeenCalled();
  });

  it('clears the chat after confirmation', async () => {
    apiMocks.aiHistory.mockResolvedValue({
      data: {
        messages: [{ role: 'assistant', content: 'Welcome back', created_at: '2026-11-25T10:00:00Z' }],
        configured: true,
      },
    });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<MemberAiPage />);
    await screen.findByText('Welcome back');
    fireEvent.click(screen.getByRole('button', { name: 'Clear chat' }));

    await waitFor(() => expect(apiMocks.aiClear).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByText('Welcome back')).toBeNull());
    confirm.mockRestore();
  });
});
