// `/` used to be the one route under (chrome) that opted out of Guard: an
// anonymous visitor got the marketing landing page at the same URL. The domain
// now opens on the unified sign-in form, so the exception is gone. These tests
// pin the removal — an anonymous visitor is redirected, and a signed-in user
// gets the shell.
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const replace = vi.fn();
const useAuth = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  usePathname: () => '/',
}));
vi.mock('@/lib/auth-context', () => ({ useAuth: () => useAuth() }));
vi.mock('@/components/AppShell', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-shell">{children}</div>
  ),
}));

import ChromeGate from '@/components/ChromeGate';

beforeEach(() => replace.mockReset());

describe('the chrome gate has no marketing exception', () => {
  it('sends an anonymous visitor on / to the unified sign-in', async () => {
    useAuth.mockReturnValue({ user: null, loading: false });
    render(<ChromeGate><div>dashboard</div></ChromeGate>);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login'));
    expect(screen.queryByText('dashboard')).toBeNull();
  });

  it('renders a signed-in trainer inside the shell at /', () => {
    useAuth.mockReturnValue({ user: { id: 'u1', role: 'trainer' }, loading: false });
    render(<ChromeGate><div>dashboard</div></ChromeGate>);
    expect(screen.getByTestId('app-shell')).toBeTruthy();
    expect(screen.getByText('dashboard')).toBeTruthy();
  });

  it('paints no content while the session is unresolved', () => {
    useAuth.mockReturnValue({ user: null, loading: true });
    render(<ChromeGate><div>dashboard</div></ChromeGate>);
    expect(screen.queryByText('dashboard')).toBeNull();
    expect(replace).not.toHaveBeenCalled();
  });
});
