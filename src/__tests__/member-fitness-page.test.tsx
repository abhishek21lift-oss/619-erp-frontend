// The member fitness page is a read-only view of the trainer's stored rows:
// it must render what was measured, switch between recorded tests, and never
// offer a control that writes.

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';

const apiMocks = vi.hoisted(() => ({ fitnessTests: vi.fn() }));

vi.mock('@/components/Guard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/member/MemberShell', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/lib/api', () => ({ api: { me: { fitnessTests: apiMocks.fitnessTests } } }));

import MemberFitnessPage from '@/app/(bare)/member/fitness/page';

const assessment = (over: Record<string, unknown> = {}) => ({
  id: 'a-latest',
  assessment_number: 2,
  assessment_date: '2026-03-12',
  assessment_type: 'week_8',
  overall_fitness_score: 78,
  overall_points: '78.0',
  overall_max: '100.0',
  scoring_formula_version: 2,
  tier: 'Fit',
  body_composition_score: 12,
  cardio_score_computed: '16.5',
  strength_score_computed: '11.0',
  endurance_score_computed: '12.0',
  mobility_score_computed: '13.5',
  bp_systolic: '128',
  bp_diastolic: '82',
  bp_category: 'Hypertension Stage 1',
  resting_heart_rate: '68',
  rhr_category: 'Normal',
  resting_spo2: '98',
  spo2_category: 'Normal',
  weight: '72.5',
  height_cm: '165.0',
  bmi: '24.1',
  bmi_category: 'Overweight',
  body_fat_pct: '21.5',
  muscle_mass_pct: '38.0',
  lean_body_mass_kg: '56.9',
  fat_mass_kg: '15.6',
  waist_cm: '82.0',
  waist_iliac_cm: '88.0',
  hips_cm: '96.0',
  waist_hip_ratio: '0.92',
  waist_risk: 'Above low-risk threshold',
  whr_risk: 'Above low-risk threshold',
  visceral_fat: '6.0',
  body_water_pct: '55.0',
  body_comp_method: 'InBody',
  cardio_test_type: 'YMCA 3-Minute Step Test',
  vo2_max: '42.10',
  cardio_category: 'Good',
  strength_exercise: 'Bench Press',
  strength_exercise_2: 'Squat',
  strength_category: 'Very Good',
  strength_category_2: 'Good',
  endurance_test_type: 'Push Up Test',
  endurance_test_type_2: 'Plank',
  endurance_category: 'Good',
  endurance_category_2: 'Average',
  flexibility_category: 'Good',
  flexibility_category_2: 'Good',
  has_asymmetry: false,
  testing_conditions: null,
  ...over,
});

const history = [
  assessment(),
  assessment({
    id: 'a-first', assessment_number: 1, assessment_date: '2026-01-15', assessment_type: 'initial',
    overall_fitness_score: 62, overall_points: '62.0', tier: 'Moderate',
    body_composition_score: 9, cardio_score_computed: '12.0', strength_score_computed: '9.0',
    endurance_score_computed: '9.0', mobility_score_computed: '10.5',
    body_fat_pct: '25.0', weight: '76.0',
    bp_systolic: '118', bp_diastolic: '76', bp_category: 'Normal',
  }),
];

beforeEach(() => {
  apiMocks.fitnessTests.mockReset();
});

describe('the member fitness page', () => {
  it('renders the stored score, tier, five domains, readings and history', async () => {
    apiMocks.fitnessTests.mockResolvedValue({
      data: {
        // The API still carries the separate mobility screening; the page no
        // longer shows it as a domain.
        client: { name: 'Asha', gender: 'female' },
        assessments: history,
        latest_mobility: { id: 'm1', assessment_date: '2026-03-02', mobility_score: 82, mobility_category: 'Good' },
      },
    });

    render(<MemberFitnessPage />);

    expect(await screen.findByText('Fitness testing')).toBeInTheDocument();
    expect(screen.getByText('78')).toBeInTheDocument();
    expect(screen.getAllByText('Fit').length).toBeGreaterThan(0);

    for (const label of ['Body composition', 'Cardio', 'Strength', 'Endurance', 'Flexibility']) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
    expect(screen.queryByText('Mobility')).toBeNull();

    expect(screen.getByText('Blood pressure & resting vitals')).toBeInTheDocument();
    expect(screen.getByText('128/82 mmHg')).toBeInTheDocument();
    expect(screen.getByText('68 bpm')).toBeInTheDocument();
    expect(screen.getByText('98%')).toBeInTheDocument();
    expect(screen.getByText('Anthropometrics')).toBeInTheDocument();
    expect(screen.getByText('24.1')).toBeInTheDocument();
    expect(screen.getByText('88 cm')).toBeInTheDocument();
    expect(screen.getByText('0.92')).toBeInTheDocument();

    expect(screen.getByText('Body fat over time')).toBeInTheDocument();
    expect(screen.getByText('Assessment history')).toBeInTheDocument();
    expect(screen.getAllByText('62/100').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Good').length).toBeGreaterThan(0);
  });

  it('switches the shown result when an older assessment is selected', async () => {
    apiMocks.fitnessTests.mockResolvedValue({
      data: { client: { name: 'Asha', gender: 'female' }, assessments: history, latest_mobility: null },
    });

    render(<MemberFitnessPage />);
    await screen.findByText('Fitness testing');

    const historySection = screen.getByText('Assessment history').closest('section')!;
    const older = within(historySection).getByText('15 Jan 2026').closest('button')!;
    expect(older).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(older);

    expect(older).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByText('62').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Moderate').length).toBeGreaterThan(0);
    // The readings above the domains follow the selected test, not "latest".
    expect(screen.getByText('118/76 mmHg')).toBeInTheDocument();
  });

  it('offers no write control', async () => {
    apiMocks.fitnessTests.mockResolvedValue({
      data: { client: null, assessments: history, latest_mobility: null },
    });

    render(<MemberFitnessPage />);
    await screen.findByText('Fitness testing');

    const buttons = screen.getAllByRole('button').map((b) => (b.textContent || '').toLowerCase());
    for (const word of ['add', 'create', 'edit', 'delete', 'save', 'new']) {
      expect(buttons.some((label) => label.includes(word))).toBe(false);
    }
  });

  it('says plainly when there is no test yet', async () => {
    apiMocks.fitnessTests.mockResolvedValue({
      data: { client: null, assessments: [], latest_mobility: null },
    });

    render(<MemberFitnessPage />);

    expect(await screen.findByText('No fitness test yet')).toBeInTheDocument();
  });

  it('shows a retry when the read fails, and can recover', async () => {
    apiMocks.fitnessTests
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ data: { client: null, assessments: history, latest_mobility: null } });

    render(<MemberFitnessPage />);

    expect(await screen.findByText('We could not load your fitness results')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Fitness testing')).toBeInTheDocument();
    expect(apiMocks.fitnessTests).toHaveBeenCalledTimes(2);
  });
});
