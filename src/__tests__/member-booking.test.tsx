import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

const book = vi.fn();
const bookings = vi.fn();
const bookingAvailability = vi.fn();

vi.mock('@/components/Guard', () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/member/MemberShell', () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock('@/lib/api', () => ({
  api: {
    me: {
      bookingAvailability: () => bookingAvailability(),
      bookings: () => bookings(),
      book: (...args: unknown[]) => book(...args),
      rescheduleBooking: vi.fn(),
      cancelBooking: vi.fn(),
    },
  },
}));

import MemberBookingPage from '@/app/(bare)/member/book/page';
import { ToastProvider } from '@/lib/toast';

const availability = {
  data: {
    days: [{
      date: '2026-11-02',
      slots: [{ start: '07:00', end: '08:00' }, { start: '08:00', end: '09:00' }],
    }],
    settings: { slot_minutes: 60, cancel_cutoff_hours: 12, horizon_days: 30 },
  },
};

const renderPage = () => render(<ToastProvider><MemberBookingPage /></ToastProvider>);

beforeEach(() => {
  book.mockReset();
  book.mockResolvedValue({ data: { id: 's-new' } });
  bookings.mockReset();
  bookings.mockResolvedValue({ data: [] });
  bookingAvailability.mockReset();
  bookingAvailability.mockResolvedValue(availability);
});

describe('<MemberBookingPage />', () => {
  it('renders one button per free slot', async () => {
    renderPage();
    expect(await screen.findByRole('button', { name: '07:00' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '08:00' })).toBeTruthy();
  });

  it('books the slot the member selected', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: '07:00' }));
    fireEvent.click(screen.getByRole('button', { name: /confirm booking/i }));

    await waitFor(() => expect(book).toHaveBeenCalledWith('2026-11-02', '07:00'));
  });

  it('tells the member to contact the trainer instead of offering Cancel', async () => {
    bookings.mockResolvedValue({
      data: [{
        id: 's1', session_date: '2026-11-02', start_time: '07:00', end_time: '08:00',
        duration_minutes: 60, status: 'scheduled', can_cancel: false,
      }],
    });

    renderPage();
    expect(await screen.findByText(/contact your trainer/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^cancel$/i })).toBeNull();
  });

  it('says so when the trainer has not published availability', async () => {
    bookingAvailability.mockResolvedValue({ data: { days: [], settings: availability.data.settings } });
    renderPage();
    expect(await screen.findByText(/hasn't opened booking yet/i)).toBeTruthy();
  });
});
