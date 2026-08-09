// Booking a session on the Schedule Session page.
//
// "Confirm Booking" called the parent's create-session handler without
// awaiting it, then immediately reset the dialog's own step back to 1 and
// wiped the form — before the network request had even finished. The dialog
// was still open (the parent only closes it once the request succeeds), so
// what the trainer saw was: tap Confirm Booking, and the review screen
// instantly snaps back to the blank "Book PT Session" form, looking exactly
// as if the tap had been undone. It now stays on the review step, with the
// button disabled and reading "Booking…", until the request actually
// settles.
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ScheduleSessionPage from '@/app/(chrome)/pt-os/schedule-session/page';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), back: vi.fn() }) }));
vi.mock('@/components/Guard', () => ({ default: ({ children }: never) => children }));
vi.mock('@/components/AppShell', () => ({ default: ({ children }: never) => children }));
vi.mock('@/lib/toast', () => ({ useToast: () => ({ toast: { error: vi.fn(), success: vi.fn() } }) }));

const trainer = { id: 't1', name: 'Abhishek Katiyar' };
const client = { id: 'c1', name: 'Rashi Bhatia', pt_end_date: '2025-07-23' };

let release: (v: unknown) => void;
const createSession = vi.fn(
  () => new Promise((r) => { release = r; }),
);

vi.mock('@/lib/api', () => ({
  api: {
    pt: {
      trainers: async () => ({ data: [trainer] }),
      sessions: async () => ({ data: [] }),
      clients: async () => ({ data: [client] }),
      createSession: (...a: unknown[]) => createSession(...a),
    },
  },
}));

async function openReviewStep() {
  render(<ScheduleSessionPage />);

  fireEvent.click(await screen.findByRole('button', { name: /book session/i }));

  const clientTile = await screen.findByText('Rashi Bhatia');
  fireEvent.click(clientTile);

  fireEvent.click(screen.getByRole('button', { name: /continue/i }));
  await screen.findByText('Review & Confirm');
}

describe('Schedule Session — confirm booking', () => {
  beforeEach(() => { createSession.mockClear(); });

  it('stays on the review step while the booking request is in flight', async () => {
    await openReviewStep();

    fireEvent.click(screen.getByRole('button', { name: /confirm booking/i }));

    // The bug: this next line used to already show 'Book PT Session' again,
    // synchronously, before the mocked request below is ever released.
    expect(screen.getByText('Review & Confirm')).toBeTruthy();
    expect(screen.queryByText('Book PT Session')).toBeNull();
    expect(screen.getByText('Rashi Bhatia')).toBeTruthy();

    release({ data: { id: 's1' } });
    await waitFor(() => expect(screen.queryByText('Review & Confirm')).toBeNull());
  });

  it('disables the confirm button and labels it while submitting', async () => {
    await openReviewStep();

    const confirmBtn = screen.getByRole('button', { name: /confirm booking/i });
    fireEvent.click(confirmBtn);

    const bookingBtn = await screen.findByRole('button', { name: /booking…/i });
    expect(bookingBtn.hasAttribute('disabled')).toBe(true);

    release({ data: { id: 's1' } });
    await waitFor(() => expect(screen.queryByText('Review & Confirm')).toBeNull());
  });

  it('books the session and closes once the request succeeds', async () => {
    await openReviewStep();

    fireEvent.click(screen.getByRole('button', { name: /confirm booking/i }));
    release({ data: { id: 's1', client_id: 'c1', trainer_id: 't1', session_date: '2026-08-02', start_time: '06:00', duration_minutes: 60, session_type: '1-on-1' } });

    await waitFor(() => expect(screen.queryByText('Review & Confirm')).toBeNull());
    expect(createSession).toHaveBeenCalledTimes(1);
  });
});
