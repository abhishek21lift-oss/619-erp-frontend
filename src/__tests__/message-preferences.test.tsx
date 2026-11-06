// Message preferences on the client profile (Phase 2 opt-out).
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const mockUpdate = vi.fn();
const mockSuccess = vi.fn();
const mockError = vi.fn();
vi.mock('@/lib/api', () => ({ api: { pt: { updateClient: (...a: unknown[]) => mockUpdate(...a) } } }));
vi.mock('@/lib/toast', () => ({ useToast: () => ({ toast: { success: mockSuccess, error: mockError } }) }));

import MessagePreferences from '@/components/pt-os/client/MessagePreferences';

beforeEach(() => { mockUpdate.mockReset(); mockSuccess.mockReset(); mockError.mockReset(); });

describe('MessagePreferences', () => {
  it('a switch reads "receives messages": on unless the client opted out', () => {
    render(<MessagePreferences clientId="c1" whatsappOptOut emailOptOut={false} />);
    const whatsapp = screen.getByRole('switch', { name: /WhatsApp/ });
    expect(whatsapp).toHaveAttribute('aria-checked', 'false');
    // The switch IS the row, so its label and description are inside the
    // target rather than next to a 28px track.
    expect(whatsapp).toHaveTextContent(/WhatsApp reminders/);
    expect(screen.getByRole('switch', { name: /Email/ })).toHaveAttribute('aria-checked', 'true');
  });

  it('turning WhatsApp off records the opt-out for that channel only', async () => {
    mockUpdate.mockResolvedValue({ data: {} });
    render(<MessagePreferences clientId="c1" whatsappOptOut={false} emailOptOut={false} />);
    fireEvent.click(screen.getByRole('switch', { name: /WhatsApp/ }));
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith('c1', { whatsapp_opt_out: true }));
    expect(screen.getByRole('switch', { name: /WhatsApp/ })).toHaveAttribute('aria-checked', 'false');
    expect(mockSuccess).toHaveBeenCalled();
  });

  it('a failed save puts the switch back to what is really stored', async () => {
    mockUpdate.mockRejectedValue(new Error('nope'));
    render(<MessagePreferences clientId="c1" whatsappOptOut={false} emailOptOut={false} />);
    fireEvent.click(screen.getByRole('switch', { name: /Email/ }));
    await waitFor(() => expect(mockError).toHaveBeenCalled());
    expect(screen.getByRole('switch', { name: /Email/ })).toHaveAttribute('aria-checked', 'true');
  });

  it('tells the profile what was saved, so a remount does not show stale flags', async () => {
    mockUpdate.mockResolvedValue({ data: {} });
    const onSaved = vi.fn();
    render(<MessagePreferences clientId="c1" whatsappOptOut={false} emailOptOut={false} onSaved={onSaved} />);
    fireEvent.click(screen.getByRole('switch', { name: /WhatsApp/ }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith({ whatsapp_opt_out: true, email_opt_out: false }));
  });

  it('says receipts still go', () => {
    render(<MessagePreferences clientId="c1" whatsappOptOut={false} emailOptOut={false} />);
    expect(screen.getByText(/Payment receipts are always sent/)).toBeInTheDocument();
  });
});

describe('a suppressed message reads as the opt-out being honoured', () => {
  it('opted_out is a note with words, not a red failure', async () => {
    const { failureLine, failureTone } = await import('@/lib/communication-state');
    const row = { status: 'suppressed', failure_reason: 'opted_out' } as Parameters<typeof failureTone>[0];
    expect(failureTone(row)).toBe('note');
    expect(failureLine(row)).toMatch(/opted out/);
  });
});
