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
const todayRoster = vi.fn();
const createWorkoutSession = vi.fn();
vi.mock('@/lib/api', () => ({
  api: {
    pt: {
      mySessions: (...args: unknown[]) => mySessions(...args),
      updateSession: vi.fn(),
    },
    progress: {
      workoutLog: {
        today: (...args: unknown[]) => todayRoster(...args),
        sessions: { create: (...args: unknown[]) => createWorkoutSession(...args) },
      },
    },
  },
}));

vi.mock('@/lib/toast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn() } }),
}));

import MySchedulePage from '@/app/(chrome)/pt-os/my-schedule/page';

const UNLINKED = { data: [], total: 0, trainer_linked: false };

/** The roster endpoint's empty answer for a day. */
const emptyRoster = (date = '2026-08-11') => ({
  data: { date, day_of_week: 'Tuesday', clients: [] },
});

beforeEach(() => {
  push.mockClear();
  mySessions.mockReset();
  todayRoster.mockReset();
  createWorkoutSession.mockReset();
  mySessions.mockResolvedValue(UNLINKED);
  todayRoster.mockResolvedValue(emptyRoster());
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

describe("the day agenda is the roster, not just booked pt_sessions", () => {
  // The reported bug: Today listed five clients and My Schedule said "Nothing
  // scheduled" for the same date. Today reads /workout-log/today, which unions
  // booked slots, active programmes and enrolment training-days; My Schedule
  // read pt_sessions alone, and the studio had no bookings — so the page was
  // technically correct and practically useless.
  const linked = { data: [], total: 0, trainer_linked: true };

  // The page opens on today, so fixtures must be dated today or they land on
  // a day the agenda is not showing. Pinning the clock instead would break the
  // roster's own date echo, which the Start payload asserts on.
  const now = new Date();
  const TODAY = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const roster = (clients: Record<string, unknown>[], date = TODAY) => ({
    data: { date, day_of_week: 'Wednesday', clients },
  });

  const CLIENT = {
    client_id: 'c1', client_name: 'Prakhar Sharma', client_photo: null,
    assignment_id: 'a1', plan_id: 'p1', plan_name: 'Full Body',
    progress_pct: 20, planned_exercises: 2,
    start_time: '07:00', source_rank: 2,
    session_id: null, session_status: null,
  };

  it('lists clients who have a programme day but no booking', async () => {
    mySessions.mockResolvedValue(linked);
    todayRoster.mockResolvedValue(roster([CLIENT]));
    render(<MySchedulePage />);

    expect(await screen.findByText('Prakhar Sharma')).toBeTruthy();
    expect(screen.getByText(/Full Body · 2 exercises/)).toBeTruthy();
    // The old empty state must be gone, not merely pushed below the list.
    expect(screen.queryByText(/nothing scheduled\./i)).toBeNull();
  });

  it('asks the roster for the selected day, not always for today', async () => {
    mySessions.mockResolvedValue(linked);
    todayRoster.mockResolvedValue(roster([]));
    render(<MySchedulePage />);

    await waitFor(() => expect(todayRoster).toHaveBeenCalled());
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    expect(todayRoster.mock.calls[0][0]).toEqual({ date: today });
  });

  it('shows one row per client, not one for the booking and one for the roster', async () => {
    // A booked client appears in BOTH sources — the roster includes bookings as
    // source_rank 1. Rendering both lists would show the same person twice.
    mySessions.mockResolvedValue({
      data: [{
        id: 's1', client_id: 'c1', client_name: 'Prakhar Sharma',
        session_date: TODAY, start_time: '07:00:00', status: 'scheduled',
      }],
      total: 1, trainer_linked: true,
    });
    todayRoster.mockResolvedValue(roster([{ ...CLIENT, source_rank: 1 }]));
    render(<MySchedulePage />);

    await screen.findByText('Prakhar Sharma');
    expect(screen.getAllByText('Prakhar Sharma')).toHaveLength(1);
    // And the row carries BOTH halves: the booking's status and the workout action.
    expect(screen.getByText('Scheduled')).toBeTruthy();
    expect(screen.getByRole('button', { name: /^start$/i })).toBeTruthy();
  });

  it('starts a workout with the programme and weekday pre-filled', async () => {
    // Identical to the Today page's behaviour on purpose: a trainer starting
    // from either screen must land in the same place, without retyping the two
    // fields the New Session form used to ask for.
    mySessions.mockResolvedValue(linked);
    todayRoster.mockResolvedValue(roster([CLIENT]));
    createWorkoutSession.mockResolvedValue({ data: { id: 'ws-9' } });
    render(<MySchedulePage />);

    (await screen.findByRole('button', { name: /^start$/i })).click();

    await waitFor(() => expect(createWorkoutSession).toHaveBeenCalled());
    expect(createWorkoutSession.mock.calls[0][0]).toEqual({
      client_id: 'c1',
      session_date: TODAY,
      program_name: 'Full Body',
      workout_day: 'Wednesday',
    });
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith('/pt-os/clients/c1/workout-log/ws-9'));
  });

  it('resumes an existing log instead of starting a second one', async () => {
    mySessions.mockResolvedValue(linked);
    todayRoster.mockResolvedValue(roster([
      { ...CLIENT, session_id: 'ws-live', session_status: 'in_progress' },
    ]));
    render(<MySchedulePage />);

    (await screen.findByRole('button', { name: /resume/i })).click();

    // Navigation only — creating another log would fork the same workout.
    expect(createWorkoutSession).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith('/pt-os/clients/c1/workout-log/ws-live');
  });

  it('offers View, not Start, once the workout is done', async () => {
    mySessions.mockResolvedValue(linked);
    todayRoster.mockResolvedValue(roster([
      { ...CLIENT, session_id: 'ws-done', session_status: 'completed' },
    ]));
    render(<MySchedulePage />);

    expect(await screen.findByRole('button', { name: /view/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^start$/i })).toBeNull();
  });

  it('calls a rest day a rest day rather than counting zero exercises', async () => {
    mySessions.mockResolvedValue(linked);
    todayRoster.mockResolvedValue(roster([{ ...CLIENT, planned_exercises: 0 }]));
    render(<MySchedulePage />);

    expect(await screen.findByText(/Full Body · rest day/)).toBeTruthy();
    // Still startable — a trainer may run an ad-hoc session.
    expect(screen.getByRole('button', { name: /^start$/i })).toBeTruthy();
  });

  it('counts the selected day, not the week, so the figures match the list', async () => {
    // "0 THIS WEEK" beside five clients was the contradiction that made the
    // page read as broken: the stats came from pt_sessions, the list from the
    // roster, and two sources describing one screen always drift apart.
    mySessions.mockResolvedValue(linked);
    todayRoster.mockResolvedValue(roster([
      CLIENT,
      { ...CLIENT, client_id: 'c2', client_name: 'Ajeet Yadav', session_status: 'completed' },
    ]));
    render(<MySchedulePage />);

    await screen.findByText('Ajeet Yadav');
    expect(screen.getByText('On This Day')).toBeTruthy();
    const onDay = screen.getByText('On This Day').closest('div');
    expect(onDay?.textContent).toContain('2');
  });

  it('keeps a booking whose client the roster did not return', async () => {
    // Cancelled, or a client since deactivated. It is still the trainer's
    // diary, so dropping it silently would hide a real appointment.
    mySessions.mockResolvedValue({
      data: [{
        id: 's9', client_id: 'gone', client_name: 'Vipul Bhatia',
        session_date: TODAY, start_time: '18:00:00', status: 'cancelled',
      }],
      total: 1, trainer_linked: true,
    });
    todayRoster.mockResolvedValue(roster([]));
    render(<MySchedulePage />);

    expect(await screen.findByText('Vipul Bhatia')).toBeTruthy();
    expect(screen.getByText('Cancelled')).toBeTruthy();
  });
});
