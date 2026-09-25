import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// Google Calendar connect finishes on this page. The backend callback no
// longer stores tokens itself: it forwards ?calendar=confirm&code=…&state=…
// here, and this page POSTs them to /api/calendar/complete inside the
// signed-in user's session — which is what binds the Google account to the
// user who actually started the flow (OAuth login-CSRF fix).

const mocks = vi.hoisted(() => ({
  params: new URLSearchParams(),
  replace: vi.fn(),
  complete: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => mocks.params,
  useRouter: () => ({ replace: mocks.replace, push: vi.fn(), back: vi.fn() }),
}));
vi.mock('@/components/Guard', () => ({ default: ({ children }: never) => children }));
vi.mock('@/components/modules/WhatsAppCard', () => ({ default: () => null }));
vi.mock('@/lib/api', () => ({
  api: {
    integrations: { list: async () => [] },
    calendar: {
      status: async () => ({ connected: false }),
      authUrl: async () => ({ url: 'https://accounts.google.com/' }),
      disconnect: async () => ({ message: 'ok' }),
      complete: mocks.complete,
    },
    ai: new Proxy({}, { get: () => async () => ({}) }),
  },
}));

import IntegrationsPage from '@/app/(chrome)/settings/integrations/page';

beforeEach(() => {
  mocks.replace.mockClear();
  mocks.complete.mockReset();
});

describe('Integrations — completing a Google Calendar connection', () => {
  it('sends the code and state to the backend exactly once, then strips them from the URL', async () => {
    mocks.params = new URLSearchParams({ calendar: 'confirm', code: 'c0de', state: 'st4te' });
    mocks.complete.mockResolvedValue({ connected: true });

    const { rerender } = render(<IntegrationsPage />);
    rerender(<IntegrationsPage />);

    await waitFor(() => expect(mocks.complete).toHaveBeenCalledTimes(1));
    expect(mocks.complete).toHaveBeenCalledWith({ code: 'c0de', state: 'st4te' });

    // The single-use code must not linger in the address bar or history.
    const cleaned = String(mocks.replace.mock.calls.at(-1)?.[0] ?? '');
    expect(cleaned).not.toMatch(/code=|state=|calendar=/);
  });

  it('shows the backend refusal when the flow was started from another account', async () => {
    mocks.params = new URLSearchParams({ calendar: 'confirm', code: 'c0de', state: 'someone-elses' });
    mocks.complete.mockRejectedValue(
      Object.assign(new Error('This connection was started from a different account. Please try connecting again.'), { status: 403 }),
    );

    render(<IntegrationsPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/connect/i);
  });

  it('does nothing on a normal visit', async () => {
    mocks.params = new URLSearchParams();
    render(<IntegrationsPage />);
    await new Promise((r) => setTimeout(r, 20));
    expect(mocks.complete).not.toHaveBeenCalled();
  });
});
