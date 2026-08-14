// The landing page, and the gate that stopped serving it.
//
// `/` is two pages wearing one URL: the public landing page for a visitor with
// no session, and the studio dashboard for one with. The page component has
// always branched on `!user` to pick between them — and it used to be able to,
// because when every page mounted its own shell, `/` put the signed-out branch
// ABOVE its <Guard>.
//
// Hoisting <Guard><AppShell> into the (chrome) layout (#113) was right for the
// other ninety-six pages and wrong for this one. A layout renders above its
// page, so Guard ran first, found no user, and replaced the route with /login
// before the landing branch could be reached. Opening the domain went straight
// to the sign-in form.
//
// The failure is worth describing precisely because of how quiet it was:
// nothing threw, no test failed, and the code that renders the landing page was
// still there and still correct. The only symptom was a marketing site that had
// stopped existing.
//
// So these tests render the gate under real session states and assert what a
// visitor and a signed-in user each end up looking at. Nothing here reads a
// file — the bug was invisible in the source of every file involved.
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const replace = vi.fn();
let pathname = '/';
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push: vi.fn(), back: vi.fn() }),
  usePathname: () => pathname,
  useSearchParams: () => new URLSearchParams(),
}));

type Session = { user: { id: string; name: string; role: string } | null; loading: boolean };
let session: Session = { user: null, loading: false };
vi.mock('@/lib/auth-context', () => ({
  useAuth: () => session,
}));

// The shell itself is not what is being tested — whether it wraps the page is.
vi.mock('@/components/AppShell', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-shell">{children}</div>
  ),
}));

import ChromeGate from '@/components/ChromeGate';

const PAGE = <div data-testid="page">page content</div>;

const STAFF = { id: 'u1', name: 'Abhishek', role: 'admin' };

beforeEach(() => {
  replace.mockClear();
  pathname = '/';
  session = { user: null, loading: false };
});

describe('a visitor with no session opens the site', () => {
  it('is shown the page rather than redirected to sign in', async () => {
    render(<ChromeGate>{PAGE}</ChromeGate>);
    expect(screen.getByTestId('page')).toBeTruthy();
    // The regression, stated directly: Guard's redirect fires from an effect,
    // so waiting is the only way to catch it happening a tick later.
    await waitFor(() => expect(replace).not.toHaveBeenCalled());
  });

  it('gets the landing page bare, without the studio shell around it', () => {
    // A marketing page framed by the studio's sidebar and bottom navigation is
    // the app pretending to be a website.
    //
    // Asserted together with the page being present, not on its own: a gate
    // that renders NOTHING also has no shell in it, so "no shell" alone is
    // satisfied by the broken behaviour this file exists to catch.
    render(<ChromeGate>{PAGE}</ChromeGate>);
    expect(screen.getByTestId('page')).toBeTruthy();
    expect(screen.queryByTestId('app-shell')).toBeNull();
  });
});

describe('every other route still gates exactly as before', () => {
  it('redirects a visitor away from a page under (chrome)', async () => {
    pathname = '/pt-os/clients';
    render(<ChromeGate>{PAGE}</ChromeGate>);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login'));
    expect(screen.queryByTestId('page')).toBeNull();
  });

  it('does not treat a path that merely starts with a slash as the landing page', async () => {
    // The exception is one exact route. A prefix match would open the whole
    // application to anybody with no session.
    pathname = '/pt-os';
    render(<ChromeGate>{PAGE}</ChromeGate>);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login'));
  });
});

describe('a signed-in user', () => {
  it('gets the dashboard inside the shell at the same URL', () => {
    session = { user: STAFF, loading: false };
    render(<ChromeGate>{PAGE}</ChromeGate>);
    expect(screen.getByTestId('app-shell')).toBeTruthy();
    expect(screen.getByTestId('page')).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
  });

  it('gets the shell on every other route too', () => {
    session = { user: STAFF, loading: false };
    pathname = '/pt-os/clients';
    render(<ChromeGate>{PAGE}</ChromeGate>);
    expect(screen.getByTestId('app-shell')).toBeTruthy();
  });
});

describe('while the session is still being resolved', () => {
  it('shows neither the landing page nor a redirect', () => {
    // "Not known" is not "signed out". Treating it as signed out would flash
    // the marketing page at a signed-in user on every cold load of the
    // dashboard — and the auth bootstrap runs on every cold load.
    session = { user: null, loading: true };
    render(<ChromeGate>{PAGE}</ChromeGate>);
    expect(screen.queryByTestId('page')).toBeNull();
    expect(replace).not.toHaveBeenCalled();
  });

  it('resolves to the landing page once the session comes back empty', async () => {
    session = { user: null, loading: true };
    const { rerender } = render(<ChromeGate>{PAGE}</ChromeGate>);
    expect(screen.queryByTestId('page')).toBeNull();

    session = { user: null, loading: false };
    rerender(<ChromeGate>{PAGE}</ChromeGate>);
    expect(screen.getByTestId('page')).toBeTruthy();
    await waitFor(() => expect(replace).not.toHaveBeenCalled());
  });

  it('resolves to the shell once the session comes back with a user', () => {
    session = { user: null, loading: true };
    const { rerender } = render(<ChromeGate>{PAGE}</ChromeGate>);

    session = { user: STAFF, loading: false };
    rerender(<ChromeGate>{PAGE}</ChromeGate>);
    expect(screen.getByTestId('app-shell')).toBeTruthy();
  });
});
