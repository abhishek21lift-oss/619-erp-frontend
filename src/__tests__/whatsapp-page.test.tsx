// Manual WhatsApp outreach page.
//
// The promises this page must not break:
//   • it never calls a tab opening "sent" or "delivered"
//   • it does not claim SMS support
//   • bulk opens ask for confirmation and report popup blocking honestly
//   • a member without a reachable number cannot be messaged

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import type { ReactNode } from 'react';

const { toastError } = vi.hoisted(() => ({ toastError: vi.fn() }));

const list = vi.fn();
const status = vi.fn();

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return { ...actual, api: { clients: { list }, whatsapp: { status } } };
});

vi.mock('@/components/Guard', () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({ user: { organization_name: 'Test Studio' } }),
}));

vi.mock('@/lib/toast', () => ({
  useToast: () => ({ toast: { error: toastError, success: vi.fn() } }),
}));

const { default: WhatsAppPage } = await import('@/app/(chrome)/engagement/whatsapp/page');

const MEMBERS = [
  { id: 'c1', name: 'Asha', mobile: '9876543210' },
  { id: 'c2', name: 'Ravi', mobile: '9123456780' },
  { id: 'c3', name: 'No Number', mobile: '' },
];

beforeEach(() => {
  vi.clearAllMocks();
  list.mockResolvedValue(MEMBERS);
  status.mockResolvedValue({
    state: 'connected', phone_e164: '+919876543210', configured: true, stale: false,
  });
});

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('WhatsApp page honesty', () => {
  it('says WhatsApp only and labels the counter as chats opened', async () => {
    render(<WhatsAppPage />);

    expect(await screen.findByRole('heading', { name: 'WhatsApp' })).toBeTruthy();
    expect(screen.getByText('Chats opened')).toBeTruthy();
    expect(screen.queryByText(/Sent Today/i)).toBeNull();
    expect(screen.getByText(/SMS is not connected/i)).toBeTruthy();
  });

  it('disables Open for a member with no usable number', async () => {
    render(<WhatsAppPage />);
    const row = await screen.findByText('No Number');
    const button = row.closest('[role="button"]')?.querySelector('button');
    await waitFor(() => expect(button).toBeDisabled());
  });

  it('asks for confirmation before opening a bulk batch', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    vi.spyOn(window, 'open').mockReturnValue({ opener: null } as unknown as Window);

    render(<WhatsAppPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'All' }));
    fireEvent.click(screen.getByRole('button', { name: /Open selected chats/i }));

    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('Nothing is sent until you press Send'));
    expect(window.open).not.toHaveBeenCalled();
  });

  it('counts only tabs that actually opened and reports blocked ones', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    // First open succeeds, second is blocked — the common browser behaviour.
    vi.spyOn(window, 'open')
      .mockReturnValueOnce({ opener: null } as unknown as Window)
      .mockReturnValueOnce(null);

    render(<WhatsAppPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'All' }));
    fireEvent.click(screen.getByRole('button', { name: /Open selected chats/i }));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith(expect.stringMatching(/blocked by the browser/i)));
    // The unusable number is skipped, so the batch is two attempts, one open.
    expect(window.open).toHaveBeenCalledTimes(2);
    const card = screen.getByText('Chats opened').closest('.mb-2')?.parentElement;
    expect(card?.textContent).toContain('1');
  });
});
