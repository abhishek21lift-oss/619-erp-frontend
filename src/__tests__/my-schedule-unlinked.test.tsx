// My Schedule, when no trainer profile resolves.
//
// The reported bug: a studio owner opened My Schedule and was told "Your
// account isn't linked to a trainer profile — ask an admin to link your login
// to a trainer". They WERE the admin, on their own studio, and the sessions
// existed. The advice was impossible to follow and the page looked broken.
//
// The backend half of the fix resolves the caller's trainer profile by email
// across both trainer tables, so this state is now rare. These tests cover what
// is left: the state is still reachable (a genuinely un-provisioned login), and
// what it says has to differ by who is reading it. An admin can fix it; a
// trainer cannot and must not be sent to a page that will refuse them.
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, back: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/pt-os/my-schedule',
}));

// Guard would otherwise redirect an unauthenticated render away from the page.
vi.mock('@/components/Guard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

let mockUser: { id: string; name: string; role: string; email: string } | null = null;
vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({ user: mockUser, loading: false }),
}));

const mySessions = vi.fn();
vi.mock('@/lib/api', () => ({
  api: {
    pt: {
      mySessions: (...args: unknown[]) => mySessions(...args),
      updateSession: vi.fn(),
    },
  },
}));

vi.mock('@/lib/toast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn() } }),
}));

import MySchedulePage from '@/app/(chrome)/pt-os/my-schedule/page';

const UNLINKED = { data: [], total: 0, trainer_linked: false };

beforeEach(() => {
  push.mockClear();
  mySessions.mockReset();
  mySessions.mockResolvedValue(UNLINKED);
  mockUser = { id: 'u1', name: 'Owner', role: 'admin', email: 'owner@studio.com' };
});

describe('the unlinked-account card', () => {
  it('never tells an admin to ask an admin', async () => {
    render(<MySchedulePage />);

    // The exact sentence that made the original report. Its absence is the
    // fix; asserting only on the new copy would let it creep back alongside.
    await waitFor(() => expect(screen.getByRole('heading', { level: 3 })).toBeTruthy());
    expect(document.body.textContent).not.toMatch(/ask an admin/i);
  });

  it('names the email that failed to match, so the fix is obvious', async () => {
    render(<MySchedulePage />);

    // Without the address, an admin has to guess which of the studio's
    // trainers is supposed to be them.
    await waitFor(() => expect(document.body.textContent).toContain('owner@studio.com'));
  });

  it('offers an admin the page that fixes it', async () => {
    render(<MySchedulePage />);

    const btn = await screen.findByRole('button', { name: /manage trainers/i });
    btn.click();
    expect(push).toHaveBeenCalledWith('/trainers');
  });

  it('does not offer that page to a trainer, who would be refused there', async () => {
    mockUser = { id: 'u2', name: 'Coach', role: 'trainer', email: 'coach@studio.com' };
    render(<MySchedulePage />);

    await screen.findByRole('button', { name: /session history/i });
    expect(screen.queryByRole('button', { name: /manage trainers/i })).toBeNull();
    // And the advice they get is the one they can act on.
    expect(document.body.textContent).toMatch(/ask your studio admin/i);
  });

  it('still reads correctly when email is absent, as on a cache-restored session', async () => {
    // auth-context persists only id/name/role and restores email as ''. The
    // card must not render "No active trainer in this studio uses ." — the
    // sentence has to stand on its own without the address.
    mockUser = { id: 'u1', name: 'Owner', role: 'admin', email: '' };
    render(<MySchedulePage />);

    await screen.findByRole('button', { name: /manage trainers/i });
    expect(document.body.textContent).not.toMatch(/uses\s*\./);
    expect(document.body.textContent).toMatch(/uses this login's email address/i);
    // The actionable half must survive either way.
    expect(document.body.textContent).toMatch(/correct an existing trainer's email/i);
  });

  it('keeps Session History reachable for everyone', async () => {
    render(<MySchedulePage />);

    const btn = await screen.findByRole('button', { name: /session history/i });
    btn.click();
    expect(push).toHaveBeenCalledWith('/pt-os/sessions');
  });
});

describe('the linked case still renders the agenda', () => {
  it('shows the day strip and not the unlinked card', async () => {
    mySessions.mockResolvedValue({ data: [], total: 0, trainer_linked: true });
    render(<MySchedulePage />);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /previous week/i })).toBeTruthy());
    expect(screen.queryByRole('button', { name: /manage trainers/i })).toBeNull();
  });

  it("asks for the current week, with today's date inside it", async () => {
    mySessions.mockResolvedValue({ data: [], total: 0, trainer_linked: true });
    render(<MySchedulePage />);

    await waitFor(() => expect(mySessions).toHaveBeenCalled());
    const { from, to } = mySessions.mock.calls[0][0] as { from: string; to: string };

    // Local YYYY-MM-DD, not toISOString() — in IST the UTC conversion lands
    // the window a day early and the agenda opens on yesterday.
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    expect(from <= today).toBe(true);
    expect(to >= today).toBe(true);
  });

  it("opens on today's sessions, not on the start of the week", async () => {
    // The clock is pinned to a WEDNESDAY on purpose. Written against the real
    // date this test passed while the page defaulted to the week start, because
    // the day it happened to run was a Monday and the two were the same date —
    // it asserted nothing. Midweek is the only time the distinction is visible.
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 12, 9, 0, 0)); // Wed 12 Aug 2026, local

    mySessions.mockResolvedValue({
      data: [
        { id: 's0', client_id: 'c0', client_name: 'Monday Person',
          session_date: '2026-08-10', start_time: '07:00:00', status: 'scheduled' },
        { id: 's1', client_id: 'c1', client_name: 'Ravi Kumar',
          session_date: '2026-08-12', start_time: '07:00:00', status: 'scheduled' },
      ],
      total: 2,
      trainer_linked: true,
    });

    try {
      render(<MySchedulePage />);
      // The whole point of the screen: today's diary, without a tap.
      await vi.waitFor(() => expect(screen.getByText('Ravi Kumar')).toBeTruthy());
      expect(screen.getByRole('heading', { name: 'Today' })).toBeTruthy();
      // Monday's session belongs to the same fetched week but a different day,
      // so it must NOT be on screen — that is what distinguishes "today" from
      // "the week start".
      expect(screen.queryByText('Monday Person')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
