// A saved session has to show up on the Schedule Session calendar.
//
// This is the end of the "booking does nothing" trail. Even after the database
// stopped rejecting the INSERT (backend migration 145), the row came back from
// GET /api/pt-os/sessions with session_date as "2026-08-02T00:00:00.000Z" —
// a Postgres DATE, which node-postgres turns into a JS Date and res.json()
// stringifies in full. The calendar filters with `s.date === dateStr` against
// a plain "2026-08-02", so the session existed, was fetched, and still
// rendered nowhere.
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ScheduleSessionPage from '@/app/(chrome)/pt-os/schedule-session/page';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), back: vi.fn() }) }));
vi.mock('@/components/Guard', () => ({ default: ({ children }: never) => children }));
vi.mock('@/components/AppShell', () => ({ default: ({ children }: never) => children }));
vi.mock('@/lib/toast', () => ({ useToast: () => ({ toast: { error: vi.fn(), success: vi.fn() } }) }));

// The page opens on today, so the fixture has to be today for the session to
// fall in the selected day's panel.
const today = new Date().toISOString().split('T')[0];

vi.mock('@/lib/api', () => ({
  api: {
    pt: {
      trainers: async () => ({ data: [{ id: 't1', name: 'Abhishek Katiyar' }] }),
      // Shaped exactly as res.json() sends it — a full ISO timestamp for a
      // DATE column and seconds on the TIME column.
      sessions: async () => ({
        data: [{
          id: 's1',
          client_id: 'c1',
          client_name: 'Rashi Bhatia',
          trainer_id: 't1',
          session_date: `${new Date().toISOString().split('T')[0]}T00:00:00.000Z`,
          start_time: '06:00:00',
          duration_minutes: 60,
          session_type: '1-on-1',
          status: 'scheduled',
          notes: '',
        }],
      }),
      clients: async () => ({ data: [] }),
      createSession: async () => ({ data: {} }),
    },
  },
}));

describe('Schedule Session — a saved session on the calendar', () => {
  it("shows the booked client in today's panel", async () => {
    render(<ScheduleSessionPage />);

    // With the raw ISO timestamp this never matched the selected day and the
    // panel stayed on its "No sessions scheduled" empty state.
    expect(await screen.findByText('Rashi Bhatia')).toBeTruthy();
    expect(screen.queryByText('No sessions scheduled')).toBeNull();
  });

  it('shows the time as HH:MM rather than the raw database value', async () => {
    render(<ScheduleSessionPage />);

    await screen.findAllByText('Rashi Bhatia');
    // The row reads "06:00 · 60min · Abhishek Katiyar"; the seconds the
    // database sends have no business on screen.
    expect(screen.getAllByText(/06:00 · 60min/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/06:00:00/)).toBeNull();
  });

  it('renders the day header for today, not an ISO timestamp', async () => {
    render(<ScheduleSessionPage />);

    await screen.findAllByText('Rashi Bhatia');
    expect(screen.getAllByText(`Sessions · ${today}`).length).toBeGreaterThan(0);
  });
});
