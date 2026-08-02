// The AI Coach card's action bar.
//
// The claim the card makes is that a tap does one specific, honest thing:
// message the named client and move to the next. You cannot WhatsApp five
// people at once, and a button that implies otherwise is worse than one that
// doesn't — so these tests are about who the next tap reaches, not about
// styling.
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { AICoach } from '@/components/dashboards/PtOsDashboard';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), back: vi.fn() }) }));

const dash = {
  active_pt_clients: 12, expired_clients: 2, clients_with_balance: 1,
  total_monthly_pt_revenue: 90000, total_monthly_commission: 20000,
  total_outstanding: 32000, trainers: [], revenueTrend: [],
} as never;

const ops = {
  today_sessions: [],
  today_unscheduled: [],
  renewals_due: [
    { id: 'r1', name: 'Hari Narayan Singh', mobile: '98765 43210', trainer_name: null, package_type: null, pt_end_date: '2026-07-28', days_left: -5, balance_amount: 0, monthly_pt_amount: 8000 },
    { id: 'r2', name: 'Rashi Bhatia', mobile: '9876543211', trainer_name: null, package_type: null, pt_end_date: '2026-07-30', days_left: -3, balance_amount: 0, monthly_pt_amount: 8000 },
  ],
  top_dues: [],
  session_stats: { this_month_total: 0, this_month_completed: 0, last_month_completed: 0 },
  trainer_sessions: [],
} as never;

const empty = {
  today_sessions: [], today_unscheduled: [], renewals_due: [], top_dues: [],
  session_stats: { this_month_total: 0, this_month_completed: 0, last_month_completed: 0 },
  trainer_sessions: [],
} as never;

const clean = { ...(dash as object), expired_clients: 0, clients_with_balance: 0, total_outstanding: 0 } as never;

function renderCard(props: Partial<Parameters<typeof AICoach>[0]> = {}) {
  return render(
    <AICoach d={dash} ops={ops} birthdays={[]} studioName="MY PT STUDIO" {...props} />,
  );
}

describe('<AICoach />', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('is titled AI Coach, dated Today', () => {
    renderCard();
    expect(screen.getByText('AI Coach')).toBeTruthy();
    expect(screen.getByText(/Today/)).toBeTruthy();
  });

  it('names the client the next tap will reach', () => {
    renderCard();
    expect(screen.getByText('Hari Narayan Singh')).toBeTruthy();
    expect(screen.getByText('2 of 2 left')).toBeTruthy();
  });

  it('opens WhatsApp for that client with the message prefilled', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    renderCard();

    fireEvent.click(screen.getByRole('button', { name: /Send WhatsApp to Hari Narayan Singh/i }));

    const [url] = open.mock.calls[0];
    expect(String(url)).toContain('https://wa.me/919876543210');
    expect(decodeURIComponent(String(url))).toContain('Hari Narayan Singh');
    expect(decodeURIComponent(String(url))).toContain('MY PT STUDIO');
  });

  it('advances to the next client instead of reopening the same chat', () => {
    // The whole point of the cursor. Without it, the second tap messages the
    // first client again and the trainer has no way to work through the list.
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    renderCard();

    fireEvent.click(screen.getByRole('button', { name: /Send WhatsApp to Hari Narayan Singh/i }));
    expect(screen.getByText('1 of 2 left')).toBeTruthy();
    expect(screen.getByText('Rashi Bhatia')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Send WhatsApp to Rashi Bhatia/i }));
    expect(screen.getByText('All contacted')).toBeTruthy();

    expect(String(open.mock.calls[0][0])).toContain('919876543210');
    expect(String(open.mock.calls[1][0])).toContain('919876543211');
  });

  it('disables both actions once everyone has been contacted', () => {
    vi.spyOn(window, 'open').mockImplementation(() => null);
    renderCard();
    fireEvent.click(screen.getByRole('button', { name: /Send WhatsApp/i }));
    fireEvent.click(screen.getByRole('button', { name: /Send WhatsApp/i }));

    expect(screen.getByRole('button', { name: /Send WhatsApp/i }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: /Call/i }).hasAttribute('disabled')).toBe(true);
  });

  it('dials rather than messages when Call is used', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    renderCard();
    fireEvent.click(screen.getByRole('button', { name: /Call Hari Narayan Singh/i }));
    expect(String(open.mock.calls[0][0])).toBe('tel:+919876543210');
  });

  it('re-targets the action bar when a different insight is selected', () => {
    renderCard({
      birthdays: [{ id: 'b1', name: 'Akash Sharma', mobile: '9876543214', days_until_birthday: 0 }],
    });
    // Starts on the most urgent insight.
    expect(screen.getByText('Hari Narayan Singh')).toBeTruthy();

    fireEvent.click(screen.getByRole('radio', { name: /birthday today/i }));
    expect(screen.getByText('Akash Sharma')).toBeTruthy();
    expect(screen.getByText('1 of 1 left')).toBeTruthy();
  });

  it('says so plainly when nobody in the cohort has a number', () => {
    // A dead button is worse than an honest sentence.
    renderCard({
      ops: {
        ...(empty as object),
        today_unscheduled: [{ assignment_id: 'a1', client_id: 'c1', client_name: 'Ajeet', client_photo: null, plan_id: 'p1', plan_name: 'PPL', planned_exercises: 4 }],
      } as never,
      d: clean,
    });
    expect(screen.getByText(/No mobile number on file/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Send WhatsApp/i })).toBeNull();
    expect(screen.getByRole('button', { name: /Open the list/i })).toBeTruthy();
  });

  it('shows an all-clear rather than inventing something to worry about', () => {
    renderCard({ d: clean, ops: empty, birthdays: [] });
    expect(screen.getByText(/Nothing needs you right now/i)).toBeTruthy();
    expect(screen.queryByText(/Suggested action/i)).toBeNull();
  });

  it('carries urgency in words, not only in colour', () => {
    renderCard();
    const row = screen.getByRole('radio', { name: /packages expired/i });
    expect(within(row).getByText('Urgent')).toBeTruthy();
  });
});
