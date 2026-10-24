// The K11 Welcome & Gym Tour page: the three checklist groups, the one write
// ("Mark tour complete"), and the hand-over to the next journey step.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const mockClient = vi.fn();
const mockJourney = vi.fn();
const mockComplete = vi.fn();
const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('client_id=c1'),
  useRouter: () => ({ push: mockPush }),
}));
vi.mock('@/lib/api', () => ({
  api: {
    pt: {
      client: (...a: unknown[]) => mockClient(...a),
      journey: (...a: unknown[]) => mockJourney(...a),
      completeWelcomeTour: (...a: unknown[]) => mockComplete(...a),
    },
  },
}));
vi.mock('@/components/Guard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/lib/toast', () => ({
  useToast: () => ({ toast: { info: vi.fn(), error: vi.fn(), success: vi.fn() } }),
}));

import WelcomeTourPage from '@/app/(chrome)/pt-os/welcome-tour/page';

const journeyNextEnrolment = {
  data: {
    steps: [
      { key: 'welcome_tour', state: 'done' },
      { key: 'enrolment', state: 'todo' },
      { key: 'consent', state: 'todo' },
      { key: 'parq', state: 'todo' },
      { key: 'interview', state: 'todo', optional: true },
      { key: 'goals', state: 'todo' },
      { key: 'assessment', state: 'todo' },
      { key: 'program_design', state: 'blocked' },
    ],
    next: 'enrolment',
    screening: {},
  },
};

beforeEach(() => {
  mockClient.mockReset();
  mockJourney.mockReset();
  mockComplete.mockReset();
  mockPush.mockReset();
  mockJourney.mockResolvedValue(journeyNextEnrolment);
  mockComplete.mockResolvedValue({ data: { id: 'c1', welcome_tour_completed_at: '2026-10-24T10:00:00.000Z' } });
});

describe('Welcome & Gym Tour', () => {
  it('shows the K11 checklist and marks the tour complete', async () => {
    mockClient.mockResolvedValue({
      data: { id: 'c1', name: 'Mina Rao', welcome_tour_completed_at: null },
    });
    render(<WelcomeTourPage />);

    expect(await screen.findByText('Mina Rao')).toBeTruthy();
    expect(screen.getByText(/arrive 15 minutes early/i)).toBeTruthy();
    expect(screen.getByText(/ask about well-being, sleep quality and last meal/i)).toBeTruthy();
    expect(screen.getByText(/equipment introduction/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Mark tour complete/ }));
    await waitFor(() => expect(mockComplete).toHaveBeenCalledWith('c1'));
    expect(await screen.findByRole('button', { name: /Continue to PT Enrolment/ })).toBeTruthy();
  });

  it('a completed tour is read-only and offers the next step', async () => {
    mockClient.mockResolvedValue({
      data: { id: 'c1', name: 'Mina Rao', welcome_tour_completed_at: '2026-10-20T10:00:00.000Z' },
    });
    render(<WelcomeTourPage />);

    expect(await screen.findByText(/tour completed/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Mark tour complete/ })).toBeNull();
    expect(await screen.findByRole('button', { name: /Continue to PT Enrolment/ })).toBeTruthy();
  });

  it('a missing client shows the not-found state', async () => {
    mockClient.mockResolvedValue({ data: null });
    render(<WelcomeTourPage />);
    expect(await screen.findByText(/client not found/i)).toBeTruthy();
  });
});
