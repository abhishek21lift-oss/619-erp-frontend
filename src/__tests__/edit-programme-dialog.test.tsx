// Editing a programme's details after it exists.
//
// There was no way to: the New programme sheet was the only place name, goal,
// difficulty and length were ever set. The dialog sends only what changed,
// because a length that did not change must not look like one that did — the
// server moves every running client's end date when it does.
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { WorkoutPlan } from '@/lib/api';

const update = vi.fn(async () => ({}));
const detail = vi.fn(async () => ({ ...PLAN, name: 'Meet Prep' }));
vi.mock('@/lib/api', () => ({
  api: {
    workouts: {
      plans: {
        update: (...a: unknown[]) => update(...(a as [])),
        detail: (...a: unknown[]) => detail(...(a as [])),
      },
    },
  },
}));
vi.mock('@/lib/toast', () => ({ useToast: () => ({ toast: { error: vi.fn(), success: vi.fn() } }) }));

import EditProgrammeDialog from '@/components/pt-os/builder/EditProgrammeDialog';

const PLAN = {
  id: 'p1', name: 'Meet prep', goal: 'muscle_gain', difficulty: 'intermediate',
  duration_weeks: 12, sessions_per_week: 4, exercises: [],
} as unknown as WorkoutPlan;

const weeksField = () => document.querySelector('input[inputmode="numeric"]') as HTMLInputElement;

beforeEach(() => { update.mockClear(); detail.mockClear(); });

describe('Edit details', () => {
  it('sends only the fields that changed', async () => {
    const onSaved = vi.fn();
    const onClose = vi.fn();
    render(<EditProgrammeDialog plan={PLAN} onClose={onClose} onSaved={onSaved} />);

    fireEvent.change(screen.getByDisplayValue('Meet prep'), { target: { value: 'Meet Prep' } });
    fireEvent.click(screen.getByRole('button', { name: 'Strength' }));
    fireEvent.click(screen.getByText('Save changes'));

    await waitFor(() => expect(update).toHaveBeenCalled());
    expect(update.mock.calls[0]).toEqual(['p1', { name: 'Meet Prep', goal: 'strength' }]);
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(onClose).toHaveBeenCalled();
  });

  it('sends a new length when the weeks change', async () => {
    render(<EditProgrammeDialog plan={PLAN} onClose={() => {}} onSaved={() => {}} />);
    fireEvent.change(weeksField(), { target: { value: '16' } });
    fireEvent.click(screen.getByText('Save changes'));

    await waitFor(() => expect(update).toHaveBeenCalled());
    expect(update.mock.calls[0]).toEqual(['p1', { duration_weeks: 16 }]);
  });

  it('closes without a request when nothing changed', async () => {
    const onClose = vi.fn();
    render(<EditProgrammeDialog plan={PLAN} onClose={onClose} onSaved={() => {}} />);
    fireEvent.click(screen.getByText('Save changes'));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(update).not.toHaveBeenCalled();
  });

  it('does not shorten a programme longer than the form allows', async () => {
    // The server takes up to 104 weeks. Renaming a 60-week block must not
    // quietly cut it to 52.
    const long = { ...PLAN, duration_weeks: 60 } as WorkoutPlan;
    render(<EditProgrammeDialog plan={long} onClose={() => {}} onSaved={() => {}} />);
    fireEvent.blur(weeksField());
    expect(weeksField().value).toBe('60');
    fireEvent.change(screen.getByDisplayValue('Meet prep'), { target: { value: 'Long block' } });
    fireEvent.click(screen.getByText('Save changes'));

    await waitFor(() => expect(update).toHaveBeenCalled());
    expect(update.mock.calls[0]).toEqual(['p1', { name: 'Long block' }]);
  });

  it('has no sessions-per-week field — the builder\'s days decide it', () => {
    render(<EditProgrammeDialog plan={PLAN} onClose={() => {}} onSaved={() => {}} />);
    expect(screen.queryByText(/Sessions/i)).toBeNull();
  });
});
