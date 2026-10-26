// The trainer's client profile, rendered end to end against a stubbed API:
// the hero, the action row (Renew for a client with a term, never both Renew
// and Enroll), the membership card with its overdue state announced, the
// notes and the running programme. Child cards that fetch their own data are
// stubbed — they have tests of their own.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, act, fireEvent, within } from '@testing-library/react';
import { Suspense } from 'react';

const client = {
  id: 'c1', unique_id: 'PT-001', name: 'Hari Narayan Singh', email: 'hari@example.com', mobile: '9876543210',
  gender: 'male', dob: '1990-01-01', trainer_name: 'Ajeet', base_amount: 30000, discount: 0, final_amount: 30000,
  paid_amount: 20000, balance_amount: 10000, current_term_fee: 30000, current_term_paid: 20000, current_term_balance: 10000,
  pt_start_date: '2026-08-01', pt_end_date: '2026-11-01', duration_months: 3, monthly_pt_amount: 10000,
  trainer_commission: 0, status: 'active', days_left: 5, due_status: 'OVERDUE', notes: 'Left knee — no deep lunges.',
};
const deep = (): any => new Proxy(function () {}, {
  get: (_t, k) => (k === 'then' ? undefined : deep()),
  apply: () => Promise.resolve({ data: [] }),
});
vi.mock('@/lib/api', () => ({
  api: new Proxy({}, {
    get: (_t, k) => {
      if (k === 'pt') return { client: () => Promise.resolve({ data: client }), subscriptions: () => Promise.resolve({ data: [] }), memberGoals: () => Promise.resolve({ data: { studio: null, goals: [] } }), journey: () => Promise.resolve({ data: { steps: [{ key: 'welcome_tour', state: 'done' }, { key: 'consent', state: 'todo' }], next: 'consent', screening: null } }) };
      if (k === 'workouts') return { assignments: { list: () => Promise.resolve([{ plan_name: 'Hypertrophy A' }]) } };
      return deep();
    },
  }),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => '/', useSearchParams: () => new URLSearchParams() }));
vi.mock('@/lib/auth-context', () => ({ useAuth: () => ({ user: { organization_name: 'Studio' } }) }));
vi.mock('@/lib/toast', () => ({ useToast: () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }) }));
vi.mock('@/components/Guard', () => ({ default: ({ children }: any) => <>{children}</> }));
vi.mock('@/components/pt-os/ClientSnapshot', () => ({
  default: () => null,
  normaliseSnapshot: (data: unknown) => data,
}));
vi.mock('@/components/pt-os/ClientLoginCard', () => ({ default: () => null }));
vi.mock('@/components/pt-os/ClientAiGenerateCard', () => ({ default: () => <div>AI generate card</div> }));

import Page from '@/app/(chrome)/pt-os/clients/[id]/page';

describe('client profile', () => {
  // The render itself is ~3s warm (a cold import can double that), so the 5s
  // default fails under a loaded machine — it timed out at 5.08s on this file
  // alone. The assertions are unchanged; only the clock is less tight.
  it('renders the hero, actions, membership, notes and programme', { timeout: 15000 }, async () => {
    const params = Promise.resolve({ id: 'c1' });
    await act(async () => { render(<Suspense fallback="loading"><Page params={params} /></Suspense>); await params; });
    await waitFor(() => expect(screen.getAllByText('Hari Narayan Singh').length).toBeGreaterThan(0), { timeout: 3000 });
    expect(screen.getByRole('link', { name: 'Renew' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Enroll' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Call' })).toBeTruthy();
    // The e2e renewal-offer journey opens the sheet by this accessible name.
    expect(screen.getByRole('button', { name: 'Renewal offer' })).toBeTruthy();
    expect(screen.getByText('5 days left')).toBeTruthy();
    expect(screen.getByText('PT membership')).toBeTruthy();
    expect(screen.getByText('— Overdue')).toBeTruthy();
    // Term dates live on the membership card only; the assignment card keeps
    // the facts that are not already on it.
    const assignment = screen.getByText('PT assignment').closest('section');
    expect(assignment).toBeTruthy();
    expect(within(assignment!).queryByText('Start')).toBeNull();
    expect(within(assignment!).queryByText('End')).toBeNull();
    expect(within(assignment!).getByText('Duration')).toBeTruthy();
    expect(within(assignment!).getByText('Monthly fee')).toBeTruthy();
    expect(screen.getByText('Left knee — no deep lunges.')).toBeTruthy();
    // The hero no longer carries these three stat tiles.
    const hero = screen.getByRole('heading', { name: 'Hari Narayan Singh' }).closest('section');
    expect(hero).toBeTruthy();
    expect(within(hero!).queryByText('Days left')).toBeNull();
    expect(within(hero!).queryByText('Trainer')).toBeNull();
    expect(within(hero!).queryByText('Programme')).toBeNull();
    // The programme itself still renders in its own tab.
    fireEvent.click(screen.getByRole('link', { name: 'Training' }));
    await waitFor(() => expect(screen.getByText(/Hypertrophy A/)).toBeTruthy());
  });
});
