// The public signing page, driven the way a client arrives at it: from a link,
// with no session.
//
// The page itself is thin, but the two ways it can fail are the ones nobody
// would notice until a client hit them — a link that has expired, and a link
// with its token stripped. Both must end on the dead-link screen, not a blank
// wizard or a redirect to a login the client cannot use.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';

vi.setConfig({ testTimeout: 20000 });

let params = new URLSearchParams('token=abc');
vi.mock('next/navigation', () => ({
  useSearchParams: () => params,
}));

const preview = vi.fn();
vi.mock('@/lib/api', () => ({
  api: { formSigning: { preview: (...a: unknown[]) => preview(...a), submit: vi.fn() } },
}));

import SignPage from '@/app/(bare)/sign/page';

beforeEach(() => {
  params = new URLSearchParams('token=abc');
  preview.mockReset();
  localStorage.clear();
});
afterEach(cleanup);

describe('a client arriving from a signing link', () => {
  it('greets them by name when the link is live', async () => {
    preview.mockResolvedValue({
      data: {
        client_name: 'Real Client',
        studio_name: 'Iron Studio',
        email: 'r***@example.com',
        expires_at: new Date(Date.now() + 86_400_000).toISOString(),
      },
    });
    render(<SignPage />);
    await waitFor(() => expect(screen.getByText('Hello Real Client')).toBeTruthy(), { timeout: 10000 });
    expect(screen.getByText('Iron Studio')).toBeTruthy();
    expect(screen.getByText(/This link works once/)).toBeTruthy();
  });

  it('says the link is dead when the token was stripped from the URL', async () => {
    params = new URLSearchParams('');
    render(<SignPage />);
    await waitFor(() => expect(screen.getByText('This link can’t be used')).toBeTruthy(), { timeout: 10000 });
    expect(preview).not.toHaveBeenCalled();
  });

  it('says the link is dead when the server refuses it', async () => {
    preview.mockRejectedValue(Object.assign(new Error('gone'), { status: 404 }));
    render(<SignPage />);
    await waitFor(() => expect(screen.getByText('This link can’t be used')).toBeTruthy(), { timeout: 10000 });
    expect(screen.getByText(/expired or has already been used/)).toBeTruthy();
  });
});
