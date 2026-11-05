import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  deletion: vi.fn(),
  requestDeletion: vi.fn(),
}));
vi.mock('@/lib/api', () => ({
  api: {
    me: {
      deletion: mocks.deletion,
      requestDeletion: mocks.requestDeletion,
      exportUrl: () => 'http://api.test/api/me/export',
    },
  },
}));

import MemberPrivacy from '@/components/member/MemberPrivacy';
import { ToastProvider } from '@/lib/toast';

beforeEach(() => {
  mocks.deletion.mockReset().mockResolvedValue({ data: { requested_at: null } });
  mocks.requestDeletion.mockReset().mockResolvedValue({ data: { sent: true } });
});

describe('<MemberPrivacy />', () => {
  it('links the export to the download endpoint', async () => {
    render(<ToastProvider><MemberPrivacy /></ToastProvider>);
    const link = await screen.findByRole('link', { name: /Download my data/ });
    expect(link.getAttribute('href')).toBe('http://api.test/api/me/export');
    expect(link.hasAttribute('download')).toBe(true);
  });

  it('asks before requesting deletion, then shows the requested state', async () => {
    render(<ToastProvider><MemberPrivacy /></ToastProvider>);
    fireEvent.click(await screen.findByRole('button', { name: 'Request account deletion' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, request deletion' }));

    await vi.waitFor(() => expect(mocks.requestDeletion).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/Deletion requested/)).toBeTruthy();
  });

  it('shows an existing request without the action', async () => {
    mocks.deletion.mockResolvedValue({ data: { requested_at: '2026-11-05T09:00:00.000Z' } });
    render(<ToastProvider><MemberPrivacy /></ToastProvider>);
    expect(await screen.findByText(/Deletion requested/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Request account deletion' })).toBeNull();
  });

  it('renders the export even when the deletion read fails', async () => {
    mocks.deletion.mockRejectedValue(new Error('offline'));
    render(<ToastProvider><MemberPrivacy /></ToastProvider>);
    expect(await screen.findByRole('link', { name: /Download my data/ })).toBeTruthy();
  });
});
