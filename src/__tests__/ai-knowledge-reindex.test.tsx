import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';

const listMock = vi.fn();
const uploadMock = vi.fn();
const deleteMock = vi.fn();
const reindexMock = vi.fn();
const toast = { success: vi.fn(), error: vi.fn() };

vi.mock('@/lib/api', () => ({
  api: {
    ai: {
      knowledge: {
        list: (...args: unknown[]) => listMock(...args),
        upload: (...args: unknown[]) => uploadMock(...args),
        delete: (...args: unknown[]) => deleteMock(...args),
        reindex: (...args: unknown[]) => reindexMock(...args),
      },
    },
  },
}));
vi.mock('@/components/Guard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => '/ai-coach/knowledge',
}));
vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({ user: { id: 'u1', role: 'admin' }, loading: false }),
}));
vi.mock('framer-motion', () => ({
  m: { div: ({ children, ...rest }: Record<string, unknown>) => <div {...rest}>{children as React.ReactNode}</div> },
}));
vi.mock('@/lib/toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/components/ui', () => ({
  Button: ({ children, ...rest }: Record<string, unknown>) => <button {...rest}>{children as React.ReactNode}</button>,
  PullToRefresh: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PageContainer: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PageHero: ({ title, actions }: { title: string; actions?: React.ReactNode }) => (
    <div>
      <h1>{title}</h1>
      {actions}
    </div>
  ),
}));

import AiKnowledgeBasePage from '@/app/(chrome)/ai-coach/knowledge/page';

const DOC = (over: Record<string, unknown> = {}) => ({
  id: 'doc-1',
  title: 'MY PT STUDIO — AI Workout Generation SOP',
  category: 'sop',
  filename: 'sop.pdf',
  mime_type: 'application/pdf',
  file_size_bytes: 128000,
  status: 'processing',
  error_message: null,
  chunk_count: 0,
  created_at: '2026-01-01T00:00:00Z',
  uploaded_by_name: 'Admin',
  is_global: false,
  ...over,
});

beforeEach(() => {
  listMock.mockReset();
  uploadMock.mockReset();
  deleteMock.mockReset();
  reindexMock.mockReset();
  toast.success.mockClear();
  toast.error.mockClear();
  listMock.mockResolvedValue({ data: [DOC()] });
  reindexMock.mockResolvedValue({ message: 'Reindexing started' });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Knowledge Base — Reindex action', () => {
  it('renders the reindex action for a stuck (processing) document', async () => {
    render(<AiKnowledgeBasePage />);

    expect(await screen.findByText('MY PT STUDIO — AI Workout Generation SOP')).toBeInTheDocument();
    expect(screen.getByTitle(/restart indexing/)).toBeInTheDocument();
  });

  it('renders the reindex action for a failed document', async () => {
    listMock.mockResolvedValue({ data: [DOC({ status: 'failed', error_message: 'This PDF has no selectable text' })] });
    render(<AiKnowledgeBasePage />);

    expect(await screen.findByText('MY PT STUDIO — AI Workout Generation SOP')).toBeInTheDocument();
    expect(screen.getByTitle('Retry indexing')).toBeInTheDocument();
    // The document's existing error_message is shown.
    expect(screen.getByText('This PDF has no selectable text')).toBeInTheDocument();
  });

  it('does not offer reindexing for a ready document', async () => {
    listMock.mockResolvedValue({ data: [DOC({ status: 'ready', chunk_count: 8 })] });
    render(<AiKnowledgeBasePage />);

    expect(await screen.findByText('MY PT STUDIO — AI Workout Generation SOP')).toBeInTheDocument();
    expect(screen.queryByTitle(/restart indexing/)).not.toBeInTheDocument();
    expect(screen.queryByTitle('Retry indexing')).not.toBeInTheDocument();
  });

  it('clicking reindex calls the endpoint, shows success, and refreshes until ready', async () => {
    let calls = 0;
    listMock.mockImplementation(async () => {
      calls += 1;
      // The document flips to ready once the background job completes.
      return { data: [DOC({ status: calls >= 3 ? 'ready' : 'processing', chunk_count: calls >= 3 ? 8 : 0 })] };
    });

    render(<AiKnowledgeBasePage />);
    await screen.findByText('MY PT STUDIO — AI Workout Generation SOP');

    // Fake timers AFTER the initial paint — RTL's waitFor (used by
    // findBy*) cannot advance vitest fake timers.
    vi.useFakeTimers();
    fireEvent.click(screen.getByTitle(/restart indexing/));
    // Flush the async handler: reindex → success toast → list refresh.
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });

    expect(reindexMock).toHaveBeenCalledTimes(1);
    expect(reindexMock).toHaveBeenCalledWith('doc-1');
    expect(toast.success).toHaveBeenCalledWith('Reindexing started.');
    expect(listMock.mock.calls.length).toBeGreaterThanOrEqual(2);

    // Still processing on the refresh → the poll effect advances one tick,
    // refetches, sees `ready`, and stops (spinner cleared).
    await act(async () => { await vi.advanceTimersByTimeAsync(4000); });
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });

    expect(screen.getByText('Ready')).toBeInTheDocument();
    // Poll stopped: no further list fetches after the ready one.
    const callsAfterPoll = listMock.mock.calls.length;
    await act(async () => { await vi.advanceTimersByTimeAsync(8000); });
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(listMock.mock.calls.length).toBe(callsAfterPoll);
  });

  it('shows a spinner and disables the button while reindexing is starting', async () => {
    let resolveReindex!: (v: unknown) => void;
    reindexMock.mockImplementation(
      () => new Promise((resolve) => { resolveReindex = resolve; }),
    );
    let calls = 0;
    listMock.mockImplementation(async () => {
      calls += 1;
      return { data: [DOC({ status: calls >= 3 ? 'ready' : 'processing', chunk_count: calls >= 3 ? 8 : 0 })] };
    });

    render(<AiKnowledgeBasePage />);
    await screen.findByText('MY PT STUDIO — AI Workout Generation SOP');

    vi.useFakeTimers();
    fireEvent.click(screen.getByTitle(/restart indexing/));
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });

    const button = screen.getByTitle(/restart indexing/);
    expect(button).toBeDisabled();
    expect(button.querySelector('.animate-spin')).not.toBeNull();

    // Complete the request; the poll refresh sees `ready`, which clears the
    // loading state AND removes the reindex button (no longer applicable).
    await act(async () => { resolveReindex({ message: 'Reindexing started' }); });
    await act(async () => { await vi.advanceTimersByTimeAsync(4000); });
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });

    expect(screen.queryByTitle(/restart indexing/)).not.toBeInTheDocument();
    expect(screen.getByText('Ready')).toBeInTheDocument();
  });

  it('shows an error toast when the API rejects and leaves the button usable', async () => {
    reindexMock.mockRejectedValue(new Error('Document not found'));

    render(<AiKnowledgeBasePage />);
    await screen.findByText('MY PT STUDIO — AI Workout Generation SOP');

    fireEvent.click(screen.getByTitle(/restart indexing/));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Document not found'));
    // No refetch happened after a failed start.
    expect(listMock).toHaveBeenCalledTimes(1);
    expect(screen.getByTitle(/restart indexing/)).not.toBeDisabled();
  });
});