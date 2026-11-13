// The Client 360 dashboard renders what the server aggregated, and nothing it
// did not send. A missing section says so; it never becomes a zero.

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Client360Dashboard from '@/components/pt-os/client/Client360Dashboard';
import type { Client360 } from '@/lib/api';

vi.mock('@/components/visualizations', () => ({
  PremiumAreaChart: ({ ariaLabel }: { ariaLabel?: string }) => <div role="img" aria-label={ariaLabel} />,
}));

function fixture(overrides: Partial<Client360> = {}): Client360 {
  return {
    generated_at: '2026-11-13T06:00:00.000Z',
    client: {
      id: 'c1', name: 'Hari Narayan Singh', unique_id: 'PT-001', gender: 'male', age: 34,
      mobile: '9876543210', email: 'hari@example.com', trainer_name: 'Ajeet',
      goal: 'fat_loss', injuries: 'Left knee', notes: 'No deep lunges.',
      status: 'active', joined_on: '2026-08-01', term_end: '2026-12-01', days_left: 18,
    },
    membership: {
      active: true, plan_name: 'PT Monthly', start_date: '2026-08-01', end_date: '2026-12-01',
      days_left: 18, due_status: 'DUE', current_term_fee: 30000, current_term_paid: 25000,
      current_term_balance: 5000,
    },
    kpis: {
      weight_kg: 82, weight_change_kg: -3, weight_change_since: '2026-09-01',
      body_fat_pct: 22.5, bmi: 26.1, sessions_remaining: 7, attendance_30d: 8,
      workout_adherence_pct: 50, nutrition_adherence_pct: 43, outstanding_balance: 5000,
    },
    assessment: {
      present: true,
      as_of: '2026-11-01',
      readiness: { present: true, risk_level: 'low', gate_status: 'cleared' },
      body: { present: true, weight_kg: 82, body_fat_pct: 22.5, bmi: 26.1, waist_cm: 92 },
      capacity: {
        present: true, overall: 68,
        strength: { score: 22, category: 'Good', max: 30 },
        cardio: { score: 18, category: 'Fair', max: 30 },
        endurance: { score: 14, category: 'Good', max: 20 },
        flexibility: { score: 11, category: 'Good', max: 15 },
      },
      overall_max: 100,
      limitations: { present: true, injuries: 'Left knee' },
    },
    training: {
      present: true, plan_name: 'Hypertrophy A', started_on: '2026-10-01', progress_pct: 40,
      sessions_28d: 2, completed_28d: 1, adherence_pct: 50,
      last_session: { date: '2026-11-12', status: 'completed' },
    },
    nutrition: {
      present: true, plan_name: 'Fat loss 1800', start_date: '2026-11-01',
      targets: { calories: 1800, protein_g: 140, carbs_g: 170, fats_g: 55 },
      logged_days_7d: 3, avg_calories_7d: 1767, adherence_pct: 43,
    },
    attendance: {
      last_30d: 8, last_90d: 21,
      recent: [{ id: 'a1', date: '2026-11-10', status: 'present', method: 'qr', check_in_time: '06:02:00' }],
      packages: [
        { id: 'p1', name: 'PT 10', total_sessions: 10, used_sessions: 3, remaining_sessions: 7, start_date: '2026-10-01', end_date: null },
      ],
      sessions_remaining: 7,
    },
    progress: {
      weight_series: [
        { on: '2026-11-01', kg: 82, source: 'assessment' },
        { on: '2026-09-01', kg: 85, source: 'assessment' },
      ],
      measurements: { weight_kg: 82, body_fat_pct: 22.5, lean_mass_kg: 63.5, waist_cm: 92, as_of: '2026-11-01' },
    },
    goals: {
      primary: { present: true, goal_type: 'fat_loss', target_kg: 75, current_kg: 82, start_kg: 85, pct: 30, remaining_kg: 7 },
      detail: { present: true, goal_type: 'fat_loss', target_weight: 75, starting_weight: 85, target_date: '2027-02-01' },
    },
    notes: { client: 'No deep lunges.' },
    finance: {
      recent_payments: [{ id: 'pay1', amount: '15000', method: 'UPI', date: '2026-11-05', receipt_no: 'R-2', notes: null }],
      outstanding: 5000, due_status: 'DUE',
    },
    timeline: [
      { id: 't1', kind: 'workout', at: '2026-11-12', title: 'Workout completed', detail: null },
      { id: 't2', kind: 'payment', at: '2026-11-05', title: 'Payment received', detail: '₹15,000' },
    ],
    insights: [{ id: 'on_track', tone: 'good', text: 'On track: 30% of the way to 75 kg.', because: 'Weight log · last reading 2026-11-01' }],
    alerts: [{ id: 'pending_payment', severity: 'warning', label: 'Pending payment', detail: '₹5,000 outstanding', href: null }],
    recovery: { present: false, weeks: [] } as Client360['recovery'],
    completeness: { pct: 100, missing: [], stale: [] },
    ...overrides,
  };
}

function renderReady(data: Client360 = fixture()) {
  return render(<Client360Dashboard clientId="c1" state={{ status: 'ready', data }} onRetry={() => {}} />);
}

describe('Client360Dashboard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders every dashboard section from the aggregated payload', () => {
    renderReady();

    // KPIs. Some values repeat in the detail cards by design; the KPI strip is
    // the one that must show every one of them.
    expect(screen.getByText('82 kg')).toBeInTheDocument();
    expect(screen.getAllByText('22.5%').length).toBeGreaterThan(0);
    expect(screen.getAllByText('7').length).toBeGreaterThan(0);
    expect(screen.getAllByText('8').length).toBeGreaterThan(0);
    expect(screen.getAllByText('50%').length).toBeGreaterThan(0);
    expect(screen.getAllByText('₹5,000').length).toBeGreaterThan(0);

    // Assessment + capacity
    expect(screen.getByText('68')).toBeInTheDocument();
    expect(screen.getByText('Fitness score / 100')).toBeInTheDocument();

    // Training + nutrition
    expect(screen.getByText('Hypertrophy A')).toBeInTheDocument();
    expect(screen.getByText('Fat loss 1800')).toBeInTheDocument();
    expect(screen.getByText('1/2')).toBeInTheDocument();

    // Attendance
    expect(screen.getByText('PT 10')).toBeInTheDocument();
    expect(screen.getByText('7/10 left')).toBeInTheDocument();

    // Progress + goal
    expect(screen.getByRole('img', { name: 'Weight trend' })).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Goal progress' })).toHaveAttribute('aria-valuenow', '30');

    // Finance + timeline + insights
    expect(screen.getByText('₹15,000')).toBeInTheDocument();
    expect(screen.getByText('Workout completed')).toBeInTheDocument();
    expect(screen.getByText('On track: 30% of the way to 75 kg.')).toBeInTheDocument();
    expect(screen.getByText('Pending payment')).toBeInTheDocument();
  });

  it('says a section is missing instead of showing a zero', () => {
    const empty = fixture({
      kpis: {
        weight_kg: null, weight_change_kg: null, weight_change_since: null, body_fat_pct: null,
        bmi: null, sessions_remaining: null, attendance_30d: 0, workout_adherence_pct: null,
        nutrition_adherence_pct: null, outstanding_balance: null,
      },
      assessment: {
        present: false, as_of: null,
        readiness: { present: false }, body: { present: false }, capacity: { present: false },
        overall_max: null, limitations: { present: false },
      },
      training: {
        present: false, plan_name: null, started_on: null, progress_pct: null,
        sessions_28d: 0, completed_28d: 0, adherence_pct: null, last_session: null,
      },
      nutrition: {
        present: false, plan_name: null, start_date: null, targets: null,
        logged_days_7d: 0, avg_calories_7d: null, adherence_pct: null,
      },
      attendance: { last_30d: 0, last_90d: 0, recent: [], packages: [], sessions_remaining: null },
      progress: {
        weight_series: [],
        measurements: { weight_kg: null, body_fat_pct: null, lean_mass_kg: null, waist_cm: null, as_of: null },
      },
      goals: { primary: { present: false }, detail: { present: false } },
      finance: { recent_payments: [], outstanding: null, due_status: null },
      timeline: [],
      insights: [],
      alerts: [],
      completeness: { pct: 0, missing: ['readiness', 'body', 'capacity', 'goal'], stale: [] },
    });

    renderReady(empty);

    expect(screen.getByText('No fitness assessment yet.')).toBeInTheDocument();
    expect(screen.getByText('No programme assigned.')).toBeInTheDocument();
    expect(screen.getByText('No diet plan assigned.')).toBeInTheDocument();
    expect(screen.getByText('No active session package.')).toBeInTheDocument();
    expect(screen.getByText('No goal set.')).toBeInTheDocument();
    expect(screen.getByText('Nothing flagged.')).toBeInTheDocument();
    expect(screen.getByText('No recent activity.')).toBeInTheDocument();
    expect(screen.getByText(/Missing: readiness, body, capacity, goal/)).toBeInTheDocument();
    expect(screen.queryByText('0 kg')).not.toBeInTheDocument();
  });

  it('shows the failure and offers a retry', () => {
    const onRetry = vi.fn();
    render(<Client360Dashboard clientId="c1" state={{ status: 'error', message: 'network down' }} onRetry={onRetry} />);

    expect(screen.getByRole('alert')).toHaveTextContent('network down');
    fireEvent.click(screen.getByRole('button', { name: /Retry/ }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('is a single column on phones and six columns from lg', () => {
    const { container } = renderReady();
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain('grid-cols-1');
    expect(root.className).toContain('lg:grid-cols-6');
  });

  it('marks the loading state for assistive technology', () => {
    render(<Client360Dashboard clientId="c1" state={{ status: 'loading' }} onRetry={() => {}} />);
    const region = screen.getByLabelText('Loading client dashboard');
    expect(region).toHaveAttribute('aria-busy', 'true');
  });
});
