import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type { Role } from '@/lib/roles';

const mockReplace = vi.fn();
const mockUseAuth = vi.fn();
// Guard now decides on the page as well as the person, so the pathname is part
// of its input and each test says where it is standing.
let pathname = '/pt-os/clients';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => pathname,
}));

vi.mock('@/lib/auth-context', () => ({
  useAuth: () => mockUseAuth(),
}));

import Guard from '@/components/Guard';

beforeEach(() => {
  mockReplace.mockReset();
  mockUseAuth.mockReset();
  pathname = '/pt-os/clients';
});

describe('<Guard />', () => {
  it('renders children for the studio trainer', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1', role: 'trainer' as Role }, loading: false });
    render(
      <Guard role="trainer">
        <div>secret content</div>
      </Guard>,
    );
    await waitFor(() => expect(screen.getByText('secret content')).toBeInTheDocument());
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('renders children for any of the allowed roles', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u2', role: 'trainer' as Role }, loading: false });
    render(
      <Guard roles={['trainer', 'member']}>
        <div>shared area</div>
      </Guard>,
    );
    await waitFor(() => expect(screen.getByText('shared area')).toBeInTheDocument());
  });

  it('redirects to /login when there is no user', async () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    render(
      <Guard role="trainer">
        <div>never</div>
      </Guard>,
    );
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/login'));
    expect(screen.queryByText('never')).not.toBeInTheDocument();
  });

  it('sends a signed-in user with the wrong role home, not to /login', async () => {
    // Home is '/', not '/pt-os' — that route now 308s to '/' via next.config
    // redirects. Sending them to /login would be worse than useless: they have
    // a valid session, so the login page would detect it and bounce them
    // straight back here.
    mockUseAuth.mockReturnValue({ user: { id: 'u3', role: 'trainer' as Role }, loading: false });
    render(
      <Guard role="member">
        <div>never</div>
      </Guard>,
    );
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
    expect(mockReplace).not.toHaveBeenCalledWith('/login');
  });

  it('treats a retired staff role as no account at all — never as the trainer', async () => {
    // There used to be an alias table: admin / manager / staff / reception all
    // "normalised" onto trainer and walked straight in. A role outside the
    // three has no portal, so it is sent to sign in and sees nothing.
    for (const role of ['admin', 'manager', 'staff', 'reception', 'receptionist']) {
      mockReplace.mockReset();
      mockUseAuth.mockReturnValue({ user: { id: 'u4', role: role as Role }, loading: false });
      const { unmount } = render(
        <Guard role="trainer">
          <div>studio desk</div>
        </Guard>,
      );
      await waitFor(() => expect(mockReplace, role).toHaveBeenCalledWith('/login'));
      expect(screen.queryByText('studio desk'), role).not.toBeInTheDocument();
      unmount();
    }
  });

  it('shows loading state while auth is resolving', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    render(
      <Guard role="trainer">
        <div>never</div>
      </Guard>,
    );
    expect(screen.queryByText('never')).not.toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('sends somebody with no session to the sign-in page for that app', async () => {
    pathname = '/member/payments';
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    render(<Guard><div>never</div></Guard>);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/member-login'));
    expect(mockReplace).not.toHaveBeenCalledWith('/login');
  });
});

// ── The portal boundary ────────────────────────────────────────────────────
//
// A bare <Guard> means "any authenticated user", and that is what about a
// hundred studio pages use. So before this, a member with a valid session could
// open /pt-os/clients and be handed the trainer's shell — sidebar, nav and all
// — with the lists empty because the API refuses them. The client's report was
// "the trainer's profile opens inside the client's", and this is the half of it
// that no amount of care on the server could have prevented.
describe('<Guard /> keeps the two apps apart', () => {
  it('will not render a studio page for a member, even with no role prop', async () => {
    pathname = '/pt-os/clients';
    mockUseAuth.mockReturnValue({ user: { id: 'm1', role: 'member' as Role }, loading: false });
    render(<Guard><div>trainer shell</div></Guard>);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/member/dashboard'));
    expect(screen.queryByText('trainer shell')).not.toBeInTheDocument();
  });

  it('will not render a member page for a trainer, even with no role prop', async () => {
    // /member/payments really is a bare <Guard>. The rule has to run both ways
    // or it is just a differently-shaped hole.
    pathname = '/member/payments';
    mockUseAuth.mockReturnValue({ user: { id: 't1', role: 'trainer' as Role }, loading: false });
    render(<Guard><div>client payments</div></Guard>);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
    expect(screen.queryByText('client payments')).not.toBeInTheDocument();
  });

  it('stops painting the moment the identity underneath it changes', async () => {
    // The case the render-path check exists for, and the only one that reaches
    // it: the page is already up and `ready`, and then the person changes.
    // That happens for real — AuthProvider paints the cached user immediately
    // on mount and replaces it when /api/auth/me answers, so a tab that was
    // showing the trainer can resolve to a member a moment later. React renders
    // before the effect flushes its navigation, so without the same check in
    // the render path the children paint once more, as the wrong person. An
    // earlier version of this test rendered fresh and proved nothing: `ready`
    // is false on the first pass regardless, so the spinner covered for it.
    pathname = '/pt-os/clients';
    mockUseAuth.mockReturnValue({ user: { id: 'a9', role: 'trainer' as Role }, loading: false });
    const { rerender } = render(<Guard><div>trainer shell</div></Guard>);
    await waitFor(() => expect(screen.getByText('trainer shell')).toBeInTheDocument());

    mockUseAuth.mockReturnValue({ user: { id: 'm2', role: 'member' as Role }, loading: false });
    rerender(<Guard><div>trainer shell</div></Guard>);
    expect(screen.queryByText('trainer shell')).not.toBeInTheDocument();
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/member/dashboard'));
  });

  it('still lets a member into the member app', async () => {
    pathname = '/member/dashboard';
    mockUseAuth.mockReturnValue({ user: { id: 'm3', role: 'member' as Role }, loading: false });
    render(<Guard role="member"><div>my plan</div></Guard>);
    await waitFor(() => expect(screen.getByText('my plan')).toBeInTheDocument());
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('lets the trainer into the studio app', async () => {
    pathname = '/pt-os/clients';
    mockUseAuth.mockReturnValue({ user: { id: 'u', role: 'trainer' as Role }, loading: false });
    render(<Guard><div>studio area</div></Guard>);
    await waitFor(() => expect(screen.getByText('studio area')).toBeInTheDocument());
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('keeps the platform operator out of the studio app on their own session', async () => {
    // Platform-only. The operator used to be let into every studio page with
    // an org-switcher; now the sanctioned way in is impersonation, which hands
    // this browser the studio trainer's own session.
    pathname = '/pt-os/clients';
    mockUseAuth.mockReturnValue({ user: { id: 'sa', role: 'super_admin' as Role }, loading: false });
    render(<Guard><div>studio area</div></Guard>);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/platform'));
    expect(screen.queryByText('studio area')).not.toBeInTheDocument();
  });

  it('does not mistake a studio page whose name starts with "member" for the member app', async () => {
    // '/membership-plans'.startsWith('/member') is true. A prefix match here
    // would lock every trainer out of their own pricing page.
    pathname = '/membership-plans';
    mockUseAuth.mockReturnValue({ user: { id: 'a1', role: 'trainer' as Role }, loading: false });
    render(<Guard><div>plans</div></Guard>);
    await waitFor(() => expect(screen.getByText('plans')).toBeInTheDocument());
    expect(mockReplace).not.toHaveBeenCalled();
  });
});

// ── The splash must not appear when the answer is already known ─────────────
//
// This is the regression that produced BOTH reported navigation bugs, so it is
// pinned here rather than left to code review.
//
// Guard used to hold its verdict in `useState(false)` and flip it in an effect.
// Effects run after the commit, so the FIRST render pass of every Guard
// returned the full-viewport splash even when auth had resolved long ago — and
// 112 pages nest their own <Guard> inside the one in the chrome layout, so it
// happened on every single navigation. Visible as the bottom-nav flicker; and
// because the splash is `minHeight: 100dvh`, it also collapsed the document to
// one viewport at exactly the moment scroll restoration needed the old height.
describe('<Guard /> paints no loading frame when auth is already resolved', () => {
  /** A DOM query after render() cannot see this: RTL flushes effects inside
   *  act(), so by the time any assertion runs the splash has already been
   *  replaced — an earlier attempt at this test reported 0 for that reason and
   *  would have passed against the broken component. A MutationObserver records
   *  nodes that were added and then removed, which is exactly the transient
   *  frame being ruled out. */
  function countSplashFrames(ui: React.ReactElement): { splash: number; host: HTMLElement } {
    let splash = 0;
    const host = document.createElement('div');
    document.body.appendChild(host);
    const observer = new MutationObserver((records) => {
      for (const r of records) {
        r.addedNodes.forEach((n) => {
          if ((n.textContent ?? '').includes('Loading')) splash += 1;
        });
      }
    });
    observer.observe(host, { childList: true, subtree: true });
    render(ui, { container: host });
    observer.takeRecords().forEach((r) => {
      r.addedNodes.forEach((n) => {
        if ((n.textContent ?? '').includes('Loading')) splash += 1;
      });
    });
    observer.disconnect();
    return { splash, host };
  }

  it('commits the children directly, with no splash frame in between', () => {
    pathname = '/pt-os/clients';
    mockUseAuth.mockReturnValue({ user: { id: 'u1', role: 'trainer' as Role }, loading: false });

    const { splash, host } = countSplashFrames(<Guard><p>real content</p></Guard>);

    expect(host.textContent).toContain('real content');
    expect(splash).toBe(0);
    host.remove();
  });

  it('does not paint one for a nested Guard either, which is what 112 pages do', () => {
    pathname = '/pt-os/clients';
    mockUseAuth.mockReturnValue({ user: { id: 'u1', role: 'trainer' as Role }, loading: false });

    const { splash, host } = countSplashFrames(
      <Guard><Guard role="trainer"><p>real content</p></Guard></Guard>,
    );

    expect(host.textContent).toContain('real content');
    expect(splash).toBe(0);
    host.remove();
  });

  it('still paints it while auth is genuinely unresolved', () => {
    // The fix must not be "delete the splash". A cold load has nothing else to
    // show, and rendering children before the session is known would flash a
    // page at somebody who may turn out not to be allowed to see it.
    pathname = '/pt-os/clients';
    mockUseAuth.mockReturnValue({ user: null, loading: true });

    const { splash, host } = countSplashFrames(<Guard><p>real content</p></Guard>);

    expect(host.textContent).not.toContain('real content');
    expect(splash).toBeGreaterThan(0);
    host.remove();
  });

  it('re-checks on every render instead of latching open', async () => {
    // `ready` was sticky: once true it stayed true for the life of the
    // component, so a session that changed underneath a mounted page kept
    // passing the gate. Deriving the verdict removes that by construction.
    pathname = '/pt-os/clients';
    pathname = '/member/dashboard';
    mockUseAuth.mockReturnValue({ user: { id: 'a1', role: 'member' as Role }, loading: false });
    const { rerender } = render(<Guard role="member"><p>member tools</p></Guard>);
    await waitFor(() => expect(screen.getByText('member tools')).toBeInTheDocument());

    mockUseAuth.mockReturnValue({ user: { id: 'a1', role: 'trainer' as Role }, loading: false });
    rerender(<Guard role="member"><p>member tools</p></Guard>);

    expect(screen.queryByText('member tools')).not.toBeInTheDocument();
  });
});
