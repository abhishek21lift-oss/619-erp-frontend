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
    expect(screen.getByRole('switch', { name: /WhatsApp/ })).toHaveAttribute('aria-checked', 'false');
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

  it('says receipts still go', () => {
    render(<MessagePreferences clientId="c1" whatsappOptOut={false} emailOptOut={false} />);
    expect(screen.getByText(/Payment receipts are always sent/)).toBeInTheDocument();
  });
});
