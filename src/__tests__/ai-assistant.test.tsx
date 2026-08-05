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

const mockActionPlan = vi.fn();
const mockActionExecute = vi.fn();
vi.mock('@/lib/api', () => ({
  api: {
    ai: {
      conversations: vi.fn().mockResolvedValue({ data: [] }),
      conversation: vi.fn().mockResolvedValue({ data: { messages: [] } }),
      actionPlan: (...a: unknown[]) => mockActionPlan(...a),
      actionExecute: (...a: unknown[]) => mockActionExecute(...a),
    },
  },
}));

let mockPathname = '/dashboard';

import AiAssistant from '@/components/ai/AiAssistant';
import { AI_ACTIONS } from '@/lib/ai-actions';

beforeAll(() => { process.env.NEXT_PUBLIC_API_URL = 'http://api.test'; });

const PLAN = {
  plan_id: 'plan-1',
  action_id: 'renewal_reminders',
  title: 'Send renewal reminders',
  description: 'WhatsApp every active client whose package ends within 7 days',
  outward: true,
  count: 3,
  preview: [{ name: 'Ajeet', detail: '3d left' }, { name: 'Hari', detail: '5d left' }],
  sample_message: 'Hi Ajeet, your package ends on 2026-09-01.',
  warnings: [] as string[],
  truncated: false,
  expires_at: new Date(Date.now() + 300000).toISOString(),
};

beforeEach(() => {
  mockPush.mockClear();
  mockActionPlan.mockReset().mockResolvedValue({ data: PLAN });
  mockActionExecute.mockReset().mockResolvedValue({
    data: { tally: { sent: 3 }, sent: 3, total: 3, warnings: [], results: [] },
  });
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


// The confirmation step is the entire safety story for executable actions.
// Everything here is a way for a message to reach a real client without a
// human having approved that exact list.
describe('executable actions', () => {
  const tapSendRenewals = () => fireEvent.click(screen.getByText('Send renewal reminders'));

  it('asks the server for a plan and sends nothing yet', async () => {
    render(<AiAssistant />);
    openPanel();
    tapSendRenewals();

    await waitFor(() => expect(mockActionPlan).toHaveBeenCalledWith('renewal_reminders'));

    // Settle first, then assert. An earlier version of this test checked
    // mockActionExecute the instant the plan call landed, which passes even
    // if the component confirms for you on the very next microtask — the
    // worst possible bug here, and the one mutation that survived.
    // Waiting for the confirm screen to still be on-screen catches it: an
    // auto-confirming build replaces it with the result view instead.
    await waitFor(() => expect(screen.getByText('Send to 3')).toBeTruthy());
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.getByText('Send to 3')).toBeTruthy();
    expect(mockActionExecute).not.toHaveBeenCalled();
  });

  it('shows who will be messaged and what they will read', async () => {
    render(<AiAssistant />);
    openPanel();
    tapSendRenewals();

    await waitFor(() => expect(screen.getByText('Ajeet')).toBeTruthy());
    expect(screen.getByText('3 recipients')).toBeTruthy();
    expect(screen.getByText(PLAN.sample_message)).toBeTruthy();
    expect(screen.getByText('and 1 more')).toBeTruthy();
  });

  it('only sends once the operator confirms', async () => {
    render(<AiAssistant />);
    openPanel();
    tapSendRenewals();

    await waitFor(() => expect(screen.getByText('Send to 3')).toBeTruthy());
    expect(mockActionExecute).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('Send to 3'));
    await waitFor(() => expect(mockActionExecute).toHaveBeenCalledWith('renewal_reminders', 'plan-1'));
    await waitFor(() => expect(screen.getByText('3 of 3 sent')).toBeTruthy());
  });

  it('cancelling sends nothing', async () => {
    render(<AiAssistant />);
    openPanel();
    tapSendRenewals();

    await waitFor(() => expect(screen.getByText('Cancel')).toBeTruthy());
    fireEvent.click(screen.getByText('Cancel'));
    await waitFor(() => expect(screen.getByText('Send renewal reminders')).toBeTruthy());
    expect(mockActionExecute).not.toHaveBeenCalled();
  });

  // The one that would otherwise look like success: confirming, seeing a
  // cheerful tick, and nothing having been delivered.
  it('warns BEFORE confirming when the channel is not configured', async () => {
    mockActionPlan.mockResolvedValue({
      data: { ...PLAN, warnings: ['WhatsApp is not configured on this server — nothing will be delivered.'] },
    });
    render(<AiAssistant />);
    openPanel();
    tapSendRenewals();
    await waitFor(() => expect(screen.getByText(/not configured/i)).toBeTruthy());
  });

  it('reports not_configured as not delivered, not as sent', async () => {
    mockActionExecute.mockResolvedValue({
      data: { tally: { not_configured: 3 }, sent: 0, total: 3, warnings: [], results: [] },
    });
    render(<AiAssistant />);
    openPanel();
    tapSendRenewals();
    await waitFor(() => expect(screen.getByText('Send to 3')).toBeTruthy());
    fireEvent.click(screen.getByText('Send to 3'));

    await waitFor(() => expect(screen.getByText('0 of 3 sent')).toBeTruthy());
    expect(screen.getByText(/not delivered — WhatsApp is not configured/)).toBeTruthy();
  });

  it('cannot be confirmed when it would reach nobody', async () => {
    mockActionPlan.mockResolvedValue({ data: { ...PLAN, count: 0, preview: [], sample_message: null } });
    render(<AiAssistant />);
    openPanel();
    tapSendRenewals();

    await waitFor(() => expect(screen.getByText(/nothing to send/i)).toBeTruthy());
    expect((screen.getByText('Send to 0').closest('button') as HTMLButtonElement).disabled).toBe(true);
  });

  // A client enrolled between reading and confirming. Retrying blindly would
  // message somebody the operator never saw.
  it('re-proposes instead of retrying when the list moved', async () => {
    mockActionExecute.mockRejectedValue(new Error('The list changed since you reviewed it — please check it again'));
    mockActionPlan
      .mockResolvedValueOnce({ data: PLAN })
      .mockResolvedValueOnce({ data: { ...PLAN, count: 4, preview: [{ name: 'Newcomer', detail: '1d left' }] } });

    render(<AiAssistant />);
    openPanel();
    tapSendRenewals();
    await waitFor(() => expect(screen.getByText('Send to 3')).toBeTruthy());
    fireEvent.click(screen.getByText('Send to 3'));

    await waitFor(() => expect(screen.getByText('Send to 4')).toBeTruthy());
    expect(screen.getByText('Newcomer')).toBeTruthy();
    expect(mockActionExecute).toHaveBeenCalledTimes(1);
  });

  it('surfaces a refusal from the server rather than failing silently', async () => {
    mockActionPlan.mockRejectedValue(new Error('You do not have permission to run this action'));
    render(<AiAssistant />);
    openPanel();
    tapSendRenewals();
    await waitFor(() => expect(screen.getByText(/do not have permission/i)).toBeTruthy());
  });
});
