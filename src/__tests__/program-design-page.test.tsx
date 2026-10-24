// The K11 Program Design hub: five sections built from existing records, with
// the arithmetic from lib/program-design. Display-only — nothing is saved.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const mockClient = vi.fn();
const mockAssessments = vi.fn();
const mockInterviews = vi.fn();
const mockGoals = vi.fn();
const mockAssignments = vi.fn();
const mockJourney = vi.fn();

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('client_id=c1'),
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock('@/components/Guard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/lib/api', () => ({
  api: {
    pt: {
      client: (...a: unknown[]) => mockClient(...a),
      interviews: { list: (...a: unknown[]) => mockInterviews(...a) },
      journey: (...a: unknown[]) => mockJourney(...a),
    },
    progress: {
      assessments: { list: (...a: unknown[]) => mockAssessments(...a) },
      goals: { list: (...a: unknown[]) => mockGoals(...a) },
    },
    workouts: { assignments: { list: (...a: unknown[]) => mockAssignments(...a) } },
  },
}));

import ProgramDesignPage from '@/app/(chrome)/pt-os/program-design/page';

const journey = {
  data: {
    steps: [
      { key: 'welcome_tour', state: 'done' },
      { key: 'enrolment', state: 'done' },
      { key: 'consent', state: 'done' },
      { key: 'parq', state: 'done' },
      { key: 'interview', state: 'done', optional: true },
      { key: 'goals', state: 'todo' },
      { key: 'assessment', state: 'done' },
      { key: 'program_design', state: 'todo' },
    ],
    next: 'goals',
    screening: {},
  },
};

beforeEach(() => {
  mockClient.mockReset();
  mockAssessments.mockReset();
  mockInterviews.mockReset();
  mockGoals.mockReset();
  mockAssignments.mockReset();
  mockJourney.mockReset();
  mockJourney.mockResolvedValue(journey);
  mockAssignments.mockResolvedValue([{ id: 'a1', status: 'active', plan_name: 'Lean & Strong' }]);
});

describe('Program Design hub', () => {
  it('shows the baseline, targets, split and Karvonen zones', async () => {
    mockClient.mockResolvedValue({
      data: {
        id: 'c1', name: 'Mina Rao', gender: 'female', dob: '1996-01-01',
        weight: 60, height: 165, goal: 'fat_loss', sessions_per_week: 4,
      },
    });
    mockAssessments.mockResolvedValue({
      data: [{
        assessment_date: '2026-10-01', height_cm: 165, weight: 60, body_fat_pct: 25,
        bmr: 1800, resting_heart_rate: 60,
      }],
    });
    mockInterviews.mockResolvedValue({
      data: [{ id: 'i1', status: 'completed', lifestyle_training_days: 4, created_at: '2026-10-01T10:00:00Z' }],
    });
    mockGoals.mockResolvedValue({
      data: [{ id: 'g1', goal_type: 'fat_loss', target_weight: 55, status: 'active', is_active: true }],
    });

    render(<ProgramDesignPage />);

    expect(await screen.findByText(/Nutrition targets/i)).toBeTruthy();
    expect(screen.getByText(/2,790 kcal|2790 kcal/)).toBeTruthy();
    expect(screen.getByText(/Upper \/ lower/)).toBeTruthy();
    expect(screen.getByText(/50–60%/)).toBeTruthy();
    expect(await screen.findByRole('button', { name: /Continue to/ })).toBeTruthy();
  });

  it('renders with a bare profile, showing — and a link to complete the assessment', async () => {
    mockClient.mockResolvedValue({
      data: { id: 'c1', name: 'Mina', gender: null, dob: null, weight: null, height: null },
    });
    mockAssessments.mockResolvedValue({ data: [] });
    mockInterviews.mockResolvedValue({ data: [] });
    mockGoals.mockResolvedValue({ data: [] });
    mockAssignments.mockResolvedValue([]);

    render(<ProgramDesignPage />);

    expect(await screen.findByText(/Nutrition targets/i)).toBeTruthy();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /Complete the assessment/i })).toHaveAttribute(
      'href', '/pt-os/assessment?client_id=c1',
    );
  });
});
