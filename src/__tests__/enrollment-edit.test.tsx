// Enrolling a client is a one-time event; correcting their enrolment afterwards
// is the normal case. This pins what separates the two:
//
//   * an edit must not reopen the signed agreement — the only way past that
//     gate is a fresh signature the client never gave, and re-signing would
//     overwrite the contract that was actually made;
//   * an edit must not change the client's status. The server promotes to
//     'active' whenever a term is in the body, so an edit that simply omitted
//     the field would activate a provisional (screening-pending) enrolment as
//     a side effect of fixing a typo.
//
// The enrolled page is otherwise the same form, which is why this is a mode
// rather than a second screen: dates, fee and payment already load and save
// there.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import { Suspense } from 'react';

const updateClient = vi.fn(() => Promise.resolve({ data: {} }));
let clientFixture: Record<string, unknown> = {};

vi.mock('@/lib/api', () => ({
  api: {
    pt: {
      client: () => Promise.resolve({ data: clientFixture }),
      updateClient: (id: string, body: Record<string, unknown>) => updateClient(id, body),
    },
    clients: { renewalHistory: () => Promise.resolve({ data: [] }) },
    progress: { goals: { list: () => Promise.resolve({ data: [] }) } },
  },
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/lib/toast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }),
}));
vi.mock('@/components/Guard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/pt-os/client/JourneyNextButton', () => ({ default: () => null }));
vi.mock('@/components/pt-os/shared/SignaturePad', () => ({
  SignaturePad: ({ label }: { label: string }) => <div>{label}</div>,
}));

import Page from '@/app/(chrome)/pt-os/clients/[id]/enroll/page';

/** Everything the form needs to be valid without anyone typing. */
const LOADED = {
  id: 'c1', name: 'Hari Narayan Singh', trainer_name: 'Ajeet',
  training_mode: 'Offline', preferred_workout_time: '07:00',
  preferred_training_days: 'Mon, Wed', sessions_per_week: 3,
  workout_experience_level: 'beginner', previous_trainer_experience: false,
  duration_months: 3, final_amount: '30000', paid_amount: '5000',
  payment_method: 'UPI',
};

const enrolled = { ...LOADED, status: 'pending', has_pt_term: true, pt_start_date: '2026-10-01', pt_end_date: '2099-12-31' };
const notEnrolled = { ...LOADED, status: 'pending', has_pt_term: false, pt_start_date: null, pt_end_date: null };

// The page reads its route params with React's `use`, so it suspends on the
// first render; Next supplies the boundary in production, the test has to.
const renderPage = async () => {
  await act(async () => {
    render(
      <Suspense fallback={null}>
        <Page params={Promise.resolve({ id: 'c1' })} />
      </Suspense>,
    );
  });
};

beforeEach(() => {
  updateClient.mockClear();
});

describe('editing an enrolment that already exists', () => {
  it('saves without asking for a signature the client never gave', async () => {
    clientFixture = enrolled;
    await renderPage();

    const save = await screen.findByRole('button', { name: /save changes/i });
    expect(screen.queryByRole('dialog', { name: /digital agreement/i })).toBeNull();

    fireEvent.click(save);

    await waitFor(() => expect(updateClient).toHaveBeenCalledTimes(1));
    // The gate never opened — the click went straight to the server.
    expect(screen.queryByRole('dialog', { name: /digital agreement/i })).toBeNull();
    expect(updateClient.mock.calls[0][1].agreement_signature).toBeUndefined();
  });

  it('leaves the status exactly as it was', async () => {
    // 'pending' is a provisional enrolment: the term is written, activation
    // waits on screening. An edit must not be what activates them.
    clientFixture = enrolled;
    await renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(updateClient).toHaveBeenCalledTimes(1));
    expect(updateClient.mock.calls[0][1].status).toBe('pending');
  });

  it('still calls the first save an enrolment, and keeps the agreement gate', async () => {
    clientFixture = notEnrolled;
    await renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /finish/i }));

    // Nothing is written until the agreement is signed.
    expect(screen.getByRole('dialog', { name: /digital agreement/i })).toBeTruthy();
    expect(updateClient).not.toHaveBeenCalled();
  });

  it('treats a package price with no end date as not enrolled yet', async () => {
    // A package sets final_amount at creation, which is enough for
    // hasPtTerm() to call the client enrolled. No term exists until an END
    // DATE is written, and that first save is still an agreement.
    clientFixture = { ...LOADED, status: 'pending', has_pt_term: true, pt_start_date: null, pt_end_date: null };
    await renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /finish/i }));

    expect(screen.getByRole('dialog', { name: /digital agreement/i })).toBeTruthy();
    expect(updateClient).not.toHaveBeenCalled();
  });
});
