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
  it('renders children when user is allowed', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1', role: 'admin' as Role }, loading: false });
    render(
      <Guard role="admin">
        <div>secret content</div>
      </Guard>,
    );
    await waitFor(() => expect(screen.getByText('secret content')).toBeInTheDocument());
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('renders children for any of the allowed roles', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u2', role: 'manager' as Role }, loading: false });
    render(
      <Guard roles={['admin', 'manager']}>
        <div>manager area</div>
      </Guard>,
    );
    await waitFor(() => expect(screen.getByText('manager area')).toBeInTheDocument());
  });

  it('redirects to /login when there is no user', async () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    render(
      <Guard role="admin">
        <div>never</div>
      </Guard>,
    );
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/login'));
    expect(screen.queryByText('never')).not.toBeInTheDocument();
  });

  it('sends a signed-in user with the wrong role home, not to /login', async () => {
    // Home is '/', not '/pt-os' — that route now 308s to '/' via next.config
    // redirects, and the old assertion was left behind. Sending them to /login
    // would be worse than useless: they have a valid session, so the login
    // page would detect it and bounce them straight back here.
    mockUseAuth.mockReturnValue({ user: { id: 'u3', role: 'trainer' as Role }, loading: false });
    render(
      <Guard role="admin">
        <div>never</div>
      </Guard>,
    );
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
    expect(mockReplace).not.toHaveBeenCalledWith('/login');
  });

  it('normalises receptionist to reception', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u4', role: 'receptionist' as Role }, loading: false });
    render(
      <Guard role="reception">
        <div>reception desk</div>
      </Guard>,
    );
    await waitFor(() => expect(screen.getByText('reception desk')).toBeInTheDocument());
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('shows loading state while auth is resolving', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    render(
      <Guard role="admin">
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
// hundred staff pages use. So before this, a member with a valid session could
// open /pt-os/clients and be handed the trainer's shell — sidebar, nav and all
// — with the lists empty because the API refuses them. The client's report was
// "the trainer's profile opens inside the client's", and this is the half of it
// that no amount of care on the server could have prevented.
describe('<Guard /> keeps the two apps apart', () => {
  it('will not render a staff page for a member, even with no role prop', async () => {
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
    // showing an admin can resolve to a member a moment later. React renders
    // before the effect flushes its navigation, so without the same check in
    // the render path the children paint once more, as the wrong person. An
    // earlier version of this test rendered fresh and proved nothing: `ready`
    // is false on the first pass regardless, so the spinner covered for it.
    pathname = '/pt-os/clients';
    mockUseAuth.mockReturnValue({ user: { id: 'a9', role: 'admin' as Role }, loading: false });
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

  it('still lets staff into the staff app', async () => {
    for (const role of ['super_admin', 'admin', 'manager', 'trainer', 'reception'] as Role[]) {
      mockReplace.mockReset();
      pathname = '/pt-os/clients';
      mockUseAuth.mockReturnValue({ user: { id: 'u', role }, loading: false });
      const { unmount } = render(<Guard><div>staff area</div></Guard>);
      await waitFor(() => expect(screen.getByText('staff area')).toBeInTheDocument());
      expect(mockReplace, role).not.toHaveBeenCalled();
      unmount();
    }
  });

  it('does not mistake a staff page whose name starts with "member" for the member app', async () => {
    // '/membership-plans'.startsWith('/member') is true. A prefix match here
    // would lock every trainer out of their own pricing page.
    pathname = '/membership-plans';
    mockUseAuth.mockReturnValue({ user: { id: 'a1', role: 'admin' as Role }, loading: false });
    render(<Guard><div>plans</div></Guard>);
    await waitFor(() => expect(screen.getByText('plans')).toBeInTheDocument());
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
