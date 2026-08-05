// The floating assistant, from the outside.
//
// What is worth asserting here is not that the markup renders — it is the
// handful of behaviours that are silently wrong when they break: the NEW badge
// coming back for a user who has already seen it, a route action pretending to
// answer instead of navigating, and the body scroll lock leaving `overflow:
// hidden` on the document after the sheet closes, which freezes the whole app
// with no visible cause.

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@/lib/api', () => ({
  api: {
    ai: {
      conversations: vi.fn().mockResolvedValue({ data: [] }),
      conversation: vi.fn().mockResolvedValue({ data: { messages: [] } }),
    },
  },
}));

let mockPathname = '/dashboard';

import AiAssistant from '@/components/ai/AiAssistant';
import { AI_ACTIONS } from '@/lib/ai-actions';

beforeAll(() => { process.env.NEXT_PUBLIC_API_URL = 'http://api.test'; });

beforeEach(() => {
  mockPush.mockClear();
  mockPathname = '/dashboard';
  window.localStorage.clear();
  document.body.style.overflow = '';
});

afterEach(() => { vi.unstubAllGlobals(); });

const openPanel = () => fireEvent.click(screen.getByLabelText('Open AI assistant'));

describe('the launcher', () => {
  it('is on the page before anything is opened', () => {
    render(<AiAssistant />);
    expect(screen.getByLabelText('Open AI assistant')).toBeTruthy();
  });

  it('badges the button for a first-time user', () => {
    render(<AiAssistant />);
    expect(screen.getByText('New')).toBeTruthy();
  });

  it('does not badge it again once it has been opened', async () => {
    const first = render(<AiAssistant />);
    openPanel();
    first.unmount();

    // A fresh mount is what a page navigation looks like. The flag has to
    // survive it, which is why it is localStorage and not state.
    render(<AiAssistant />);
    await waitFor(() => expect(screen.queryByText('New')).toBeNull());
  });

  it('gets out of the way while the panel is open', () => {
    render(<AiAssistant />);
    openPanel();
    expect(screen.queryByLabelText('Open AI assistant')).toBeNull();
  });
});

describe('the command center', () => {
  it('offers every shortcut', () => {
    render(<AiAssistant />);
    openPanel();
    for (const a of AI_ACTIONS) expect(screen.getByText(a.label)).toBeTruthy();
  });

  it('takes a question', () => {
    render(<AiAssistant />);
    openPanel();
    expect(screen.getByLabelText('Ask AI anything')).toBeTruthy();
  });

  it('navigates for a route action instead of answering', () => {
    vi.stubGlobal('fetch', vi.fn());
    render(<AiAssistant />);
    openPanel();
    fireEvent.click(screen.getByText('Create workout'));
    expect(mockPush).toHaveBeenCalledWith('/ai/workout-generator');
    // and it must not have quietly started a chat instead
    expect(fetch).not.toHaveBeenCalled();
  });

  it('carries the current client into a route action', () => {
    mockPathname = '/pt-os/clients/3f1a2b4c-5d6e-4f70-8a9b-0c1d2e3f4a5b';
    render(<AiAssistant />);
    openPanel();
    fireEvent.click(screen.getByText('Generate diet'));
    expect(mockPush).toHaveBeenCalledWith(
      '/ai/diet-generator?client_id=3f1a2b4c-5d6e-4f70-8a9b-0c1d2e3f4a5b',
    );
  });

  it('streams an answer for an ask action', async () => {
    const enc = new TextEncoder();
    const frames = [
      `data: ${JSON.stringify({ type: 'chunk', content: 'Call Ajeet first.' })}\n\n`,
    ];
    let i = 0;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      body: { getReader: () => ({ read: async () => (i < frames.length
        ? { value: enc.encode(frames[i++]), done: false }
        : { value: undefined, done: true }) }) },
    }));

    render(<AiAssistant />);
    openPanel();
    fireEvent.click(screen.getByText('Who should I call today?'));
    await waitFor(() => expect(screen.getByText('Call Ajeet first.')).toBeTruthy());
  });

  it('locks body scroll while open and gives it back on close', async () => {
    render(<AiAssistant />);
    openPanel();
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.click(screen.getByLabelText('Close AI assistant'));
    // Leaving the lock on is how a closed sheet freezes the entire app.
    await waitFor(() => expect(document.body.style.overflow).not.toBe('hidden'));
  });

  it('closes on Escape', async () => {
    render(<AiAssistant />);
    openPanel();
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(screen.getByLabelText('Open AI assistant')).toBeTruthy());
  });
});
