// Next Best Action — the cockpit's one-thing-to-do-now card. It promotes the
// top result of the same prioritisation the AI Coach board uses, so the two
// can never disagree about what matters most.
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import NextBestActionCard from '@/components/dashboards/cockpit/NextBestActionCard';
import type { DashData, OpsData } from '@/components/dashboards/PtOsDashboard';
import type { CoachBirthday } from '@/lib/coach-insights';

const DASH: DashData = {
  active_pt_clients: 10, expired_clients: 2, clients_with_balance: 1,
  overdue_clients: 0, total_monthly_pt_revenue: 0, total_outstanding: 5000,
  today_collected: 0, today_payments: 0, revenueTrend: [],
};

function opsWith(renewals: OpsData['renewals_due']): OpsData {
  return {
    today_sessions: [], today_unscheduled: [], renewals_due: renewals,
    top_dues: [],
    session_stats: { this_month_total: 0, this_month_completed: 0, last_month_completed: 0 },
    trainer_sessions: [],
  };
}

const BIRTHDAYS: CoachBirthday[] = [
  { id: 'b1', name: 'Ravi', mobile: null, days_until_birthday: 0 },
];

const ASHA = {
  id: 'c1', name: 'Asha', mobile: '9876543210', trainer_name: null,
  package_type: null, photo_url: null, pt_end_date: '2026-10-20',
  days_left: 3, balance_amount: 0, monthly_pt_amount: 0,
};

describe('NextBestActionCard', () => {
  it('promotes only the top insight — the lower-ranked one stays on the board', () => {
    render(<NextBestActionCard d={DASH} ops={opsWith([ASHA])} birthdays={BIRTHDAYS} studioName="Iron Studio" />);
    expect(screen.getByText('Next Best Action')).toBeTruthy();
    expect(screen.getByText('1 package expiring this week')).toBeTruthy();
    // The birthday is real but ranked below; the board below the card owns it.
    expect(screen.queryByText(/birthday/i)).toBeNull();
    expect(screen.getByText('Urgent')).toBeTruthy();
  });

  it('offers reachable CTAs for the next contact: WhatsApp prefilled and a dialer', () => {
    render(<NextBestActionCard d={DASH} ops={opsWith([ASHA])} birthdays={BIRTHDAYS} studioName="Iron Studio" />);
    const wa = screen.getByRole('link', { name: 'Send WhatsApp to Asha' });
    expect(wa.getAttribute('href')).toMatch(/^https:\/\/wa\.me\/919876543210\?text=/);
    expect(wa.getAttribute('href')).toContain(encodeURIComponent('Asha'));
    const tel = screen.getByRole('link', { name: 'Call Asha' });
    expect(tel.getAttribute('href')).toBe('tel:+919876543210');
    expect(screen.getByRole('link', { name: /open list/i }).getAttribute('href')).toBe('/pt-os/clients');
  });

  it('never renders a dead message button — no reachable contact means the list is the only CTA', () => {
    render(<NextBestActionCard d={DASH} ops={opsWith([{ ...ASHA, mobile: null }])} birthdays={[]} studioName="Iron Studio" />);
    expect(screen.queryByRole('link', { name: /whatsapp/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /^call /i })).toBeNull();
    expect(screen.getByRole('link', { name: /open list/i }).getAttribute('href')).toBe('/pt-os/clients');
  });

  it('renders nothing when no insight exists — the board below carries the all-clear', () => {
    const { container } = render(
      <NextBestActionCard
        d={{ ...DASH, expired_clients: 0, clients_with_balance: 0, total_outstanding: 0 }}
        ops={opsWith([])} birthdays={[]} studioName="Iron Studio"
      />,
    );
    expect(container.firstChild).toBeNull();
  });
});
