// The queue page has one job: keep the trainer able to act when the AI cannot.
// These tests pin the states that decide whether that is true — a failed brief,
// an exhausted quota, a refused send, a stale item — and the focus behaviour
// that makes the review sheet usable without a mouse.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ApiError } from '@/lib/http';
import type { AiOpsItem, AiOpsQueue } from '@/lib/api';

const queueMock = vi.fn();
const refreshMock = vi.fn();
const approveMock = vi.fn();
const snoozeMock = vi.fn();
const dismissMock = vi.fn();
const resolveMock = vi.fn();

vi.mock('@/lib/api', () => ({
  api: {
    ai: {
      opsQueue: {
        queue: (...args: unknown[]) => queueMock(...args),
        refresh: (...args: unknown[]) => refreshMock(...args),
        item: vi.fn(),
        approve: (...args: unknown[]) => approveMock(...args),
        snooze: (...args: unknown[]) => snoozeMock(...args),
        dismiss: (...args: unknown[]) => dismissMock(...args),
        resolve: (...args: unknown[]) => resolveMock(...args),
      },
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

vi.mock('framer-motion', () => ({
  m: { div: ({ children, ...rest }: Record<string, unknown>) => <div {...rest}>{children as React.ReactNode}</div> },
  useReducedMotion: () => true,
}));

import AiOpsQueuePage from '@/app/(chrome)/ai/ops-queue/page';

const renewal: AiOpsItem = {
  id: 'i1',
  subject: { type: 'client', id: 'c1', name: 'Ravi Kumar', photo_url: null },
  status: 'open',
  priority_score: 85,
  priority_band: 'critical',
  reasons: [
    {
      code: 'term_ending_7', label: 'Term ends in 5 days', points: 35, family: 'churn',
      evidence: { pt_end_date: '2026-11-30' }, due_at: '2026-11-30',
    },
    {
      code: 'term_ended', label: 'Term ended', points: 50, family: 'churn',
      evidence: {}, due_at: null,
    },
  ],
  next_due_at: '2026-11-30',
  recommended_action: {
    kind: 'message', label: 'Send renewal reminder', href: null, reason_code: 'term_ending_7',
  },
  draft: {
    body: 'Hi Ravi, your training term ends in 5 days. Shall we plan the next block?',
    channel: 'whatsapp', source: 'ai', model: 'test/model',
    generated_at: '2026-11-25T08:00:00.000Z', confidence: 0.9,
  },
  channel: { status: 'connected', reason: null },
  last_contacted_at: null,
  last_actioned_at: null,
  last_error: null,
  created_at: '2026-11-20T09:00:00.000Z',
};

const dues: AiOpsItem = {
  id: 'i2',
  subject: { type: 'client', id: 'c2', name: 'Asha Rao', photo_url: null },
  status: 'open',
  priority_score: 40,
  priority_band: 'high',
  reasons: [
    {
      code: 'dues', label: '₹4,500 overdue', points: 15, family: 'churn',
      evidence: { balance_amount: 4500 }, due_at: null,
    },
    {
      code: 'silent_10', label: 'No session for 12 days', points: 10, family: 'engagement',
      evidence: {}, due_at: null, days_quiet: 12,
    },
  ],
  next_due_at: null,
  recommended_action: {
    kind: 'message', label: 'Send payment reminder', href: null, reason_code: 'dues',
  },
  draft: {
    body: 'Hi Asha, a balance of ₹4,500 is pending on your training account.',
    channel: 'whatsapp', source: 'template', model: null,
    generated_at: '2026-11-25T08:00:00.000Z', confidence: null,
  },
  channel: { status: 'unavailable', reason: 'no_recipient' },
  last_contacted_at: null,
  last_actioned_at: null,
  last_error: null,
  created_at: '2026-11-21T09:00:00.000Z',
};

function makeQueue(items: AiOpsItem[], over: Partial<AiOpsQueue> = {}): AiOpsQueue {
  const by_band = { critical: 0, high: 0, medium: 0, low: 0 };
  const by_family = { churn: 0, engagement: 0, training: 0, screening: 0, leads: 0 };
  for (const item of items) {
    by_band[item.priority_band] += 1;
    for (const family of new Set(item.reasons.map((reason) => reason.family))) by_family[family] += 1;
  }

  return {
    as_of: '2026-11-25T09:00:00.000Z',
    brief: { text: 'Two clients need you today.', source: 'ai', generated_at: '2026-11-25T08:00:00.000Z' },
    ai: { status: 'ok', message: null, last_generated_at: '2026-11-25T08:00:00.000Z' },
    counts: { total: items.length, by_band, by_family },
    items,
    ...over,
  };
}

const defaultQueue = makeQueue([renewal, dues]);

function card(name: RegExp) {
  return screen.getByRole('article', { name });
}

async function renderPage() {
  render(<AiOpsQueuePage />);
  await screen.findByRole('article', { name: /Ravi/ });
  await waitFor(() => expect(refreshMock).toHaveBeenCalledTimes(1));
}

beforeEach(() => {
  vi.clearAllMocks();
  queueMock.mockResolvedValue({ data: defaultQueue });
  refreshMock.mockResolvedValue({ data: defaultQueue });
  approveMock.mockResolvedValue({
    data: {
      item: { ...renewal, status: 'actioned' },
      delivery: {
        status: 'sent', communication_log_id: 'log-1', provider_id: 'provider-1', error: null,
      },
    },
  });
  snoozeMock.mockResolvedValue({ data: renewal });
  dismissMock.mockResolvedValue({ data: renewal });
  resolveMock.mockResolvedValue({ data: renewal });
});

describe('loading and rendering', () => {
  it('shows skeletons first, then the brief, counts and both cards', async () => {
    let resolveQueue: (value: unknown) => void = () => {};
    queueMock.mockReturnValue(new Promise((resolve) => { resolveQueue = resolve; }));

    render(<AiOpsQueuePage />);

    expect(screen.getByLabelText('Loading queue')).toBeInTheDocument();
    expect(screen.queryByRole('article', { name: /Ravi/ })).toBeNull();

    resolveQueue({ data: defaultQueue });

    await screen.findByRole('article', { name: /Ravi/ });
    expect(screen.getByText('Two clients need you today.')).toBeInTheDocument();
    expect(screen.getByText('Critical 1')).toBeInTheDocument();
    expect(screen.getByText('High 1')).toBeInTheDocument();
    expect(screen.getByText('Total 2')).toBeInTheDocument();
    expect(screen.getByRole('article', { name: /Asha/ })).toBeInTheDocument();
    await waitFor(() => expect(refreshMock).toHaveBeenCalledTimes(1));
  });

  it('narrows to payments and restores everything with All', async () => {
    await renderPage();

    fireEvent.click(screen.getByRole('button', { name: /Payments 1/ }));

    expect(screen.queryByRole('article', { name: /Ravi/ })).toBeNull();
    expect(screen.getByRole('article', { name: /Asha/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /All 2/ }));

    expect(screen.getByRole('article', { name: /Ravi/ })).toBeInTheDocument();
    expect(screen.getByRole('article', { name: /Asha/ })).toBeInTheDocument();
  });

  it('keeps a template draft visible and sendable when AI failed', async () => {
    const failed = makeQueue(
      [{ ...renewal, draft: { ...renewal.draft!, source: 'template', model: null } }, { ...dues, channel: { status: 'connected', reason: null } }],
      { ai: { status: 'failed', message: 'AI drafts are unavailable right now.', last_generated_at: null } },
    );
    queueMock.mockResolvedValue({ data: failed });
    refreshMock.mockResolvedValue({ data: failed });

    await renderPage();

    expect(screen.getByRole('status')).toHaveTextContent(/AI drafts are unavailable right now/i);
    expect(screen.getByText(/template drafts/i)).toBeInTheDocument();
    expect(within(card(/Asha/)).getByText(/balance of ₹4,500/)).toBeInTheDocument();
    expect(within(card(/Asha/)).getByRole('button', { name: /^Approve$/ })).toBeEnabled();
  });

  it('keeps the deterministic queue when refresh hits the monthly quota', async () => {
    refreshMock.mockRejectedValue(new ApiError('quota exhausted', 429, 'AI_QUOTA_EXCEEDED'));

    render(<AiOpsQueuePage />);

    await screen.findByRole('article', { name: /Ravi/ });
    await waitFor(() => expect(screen.getByText(/monthly allowance/i)).toBeInTheDocument());
    expect(screen.getByRole('article', { name: /Asha/ })).toBeInTheDocument();
    expect(screen.queryByText(/could not load the queue/i)).toBeNull();
  });

  it('renders the empty state and the roster link', async () => {
    const empty = makeQueue([], { brief: null, ai: { status: 'not_generated', message: null, last_generated_at: null } });
    queueMock.mockResolvedValue({ data: empty });
    refreshMock.mockResolvedValue({ data: empty });

    render(<AiOpsQueuePage />);

    await screen.findByText('Nothing needs you right now');
    expect(screen.getByRole('link', { name: /open client roster/i })).toHaveAttribute('href', '/pt-os/clients');
  });

  it('offers Retry when the first load fails, and loads on click', async () => {
    queueMock
      .mockRejectedValueOnce(new ApiError('backend down', 500, 'INTERNAL'))
      .mockResolvedValueOnce({ data: defaultQueue });

    render(<AiOpsQueuePage />);

    await screen.findByRole('alert');
    expect(screen.getByRole('alert')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    await screen.findByRole('article', { name: /Ravi/ });
    expect(queueMock).toHaveBeenCalledTimes(2);
  });
});

describe('approval', () => {
  it('approves from the card, removes the sent item and confirms', async () => {
    await renderPage();

    fireEvent.click(within(card(/Ravi/)).getByRole('button', { name: /^Approve$/ }));

    await waitFor(() => expect(approveMock).toHaveBeenCalledWith('i1', undefined));
    await screen.findByText(/message sent to ravi kumar/i);
    expect(screen.queryByRole('article', { name: /Ravi/ })).toBeNull();
    expect(screen.getByRole('article', { name: /Asha/ })).toBeInTheDocument();
  });

  it('keeps a failed send visible with the reason and a Retry', async () => {
    approveMock.mockResolvedValue({
      data: {
        item: { ...renewal, last_error: { code: 'SEND_FAILED', message: 'gateway_timeout' } },
        delivery: { status: 'failed', communication_log_id: 'log-1', provider_id: null, error: 'gateway_timeout' },
      },
    });

    await renderPage();

    fireEvent.click(within(card(/Ravi/)).getByRole('button', { name: /^Approve$/ }));

    await waitFor(() => expect(approveMock).toHaveBeenCalledTimes(1));

    // The server reopens the item and keeps the failure on it. The sheet stays
    // open with the reason and a retry, and the card is still behind it.
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/gateway_timeout/i)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /retry/i })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByRole('article', { name: /Ravi/ })).toBeInTheDocument();
  });

  it('reports an already-actioned item and refetches the queue', async () => {
    approveMock.mockRejectedValue(new ApiError('This item was already actioned', 409, 'ALREADY_ACTIONED'));

    await renderPage();

    fireEvent.click(within(card(/Ravi/)).getByRole('button', { name: /^Approve$/ }));

    await screen.findByText(/already actioned/i);
    await waitFor(() => expect(queueMock).toHaveBeenCalledTimes(2));
  });

  it('sends an edited body from the review sheet', async () => {
    await renderPage();

    fireEvent.click(within(card(/Ravi/)).getByRole('button', { name: /review & send/i }));
    const message = await screen.findByLabelText('Message');
    fireEvent.change(message, { target: { value: 'Hi Ravi, can we talk about your next block?' } });
    fireEvent.click(screen.getByRole('button', { name: /approve & send/i }));

    await waitFor(() => expect(approveMock).toHaveBeenCalledWith(
      'i1', 'Hi Ravi, can we talk about your next block?',
    ));
  });
});

describe('snooze, dismiss and resolve', () => {
  it('snoozes for three days and removes the card', async () => {
    await renderPage();

    fireEvent.click(within(card(/Ravi/)).getByRole('button', { name: /review & send/i }));
    fireEvent.click(await screen.findByRole('button', { name: /^3 days$/ }));

    await waitFor(() => expect(snoozeMock).toHaveBeenCalledWith('i1', 3));
    await waitFor(() => expect(screen.queryByRole('article', { name: /Ravi/ })).toBeNull());
    expect(screen.getByText(/snoozed for 3 days/i)).toBeInTheDocument();
  });

  it('requires a reason before dismissing', async () => {
    await renderPage();

    fireEvent.click(within(card(/Ravi/)).getByRole('button', { name: /review & send/i }));

    const dismiss = await screen.findByRole('button', { name: /^Dismiss$/ });
    expect(dismiss).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Dismiss reason'), { target: { value: 'not_relevant' } });
    fireEvent.click(dismiss);

    await waitFor(() => expect(dismissMock).toHaveBeenCalledWith('i1', 'not_relevant'));
    await waitFor(() => expect(screen.queryByRole('article', { name: /Ravi/ })).toBeNull());
  });

  it('marks an item done', async () => {
    await renderPage();

    fireEvent.click(within(card(/Ravi/)).getByRole('button', { name: /review & send/i }));
    fireEvent.click(await screen.findByRole('button', { name: /mark done/i }));

    await waitFor(() => expect(resolveMock).toHaveBeenCalledWith('i1'));
    await waitFor(() => expect(screen.queryByRole('article', { name: /Ravi/ })).toBeNull());
  });
});

describe('the review sheet', () => {
  it('focuses the message field and returns focus to the trigger on Escape', async () => {
    await renderPage();

    const trigger = within(card(/Ravi/)).getByRole('button', { name: /review & send/i });
    trigger.focus();
    fireEvent.click(trigger);

    const message = await screen.findByLabelText('Message');
    await waitFor(() => expect(message).toHaveFocus());

    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });

    await waitFor(() => expect(screen.queryByLabelText('Message')).toBeNull());
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});

describe('small screens', () => {
  it('renders cards at 320px without a horizontal scroll container', async () => {
    Object.defineProperty(window, 'innerWidth', { value: 320, writable: true, configurable: true });

    await renderPage();

    expect(screen.getByRole('article', { name: /Ravi/ })).toBeInTheDocument();
    expect(document.querySelector('[style*="overflow-x: scroll"]')).toBeNull();
    expect(document.querySelector('[style*="overflow-x: auto"]')).toBeNull();
  });
});
