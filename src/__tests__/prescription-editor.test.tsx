// The builder's field set follows the prescription type.
//
// ── What this replaces ─────────────────────────────────────────────────────
//
// The old builder rendered SETS / REPS / WEIGHT / REST for every exercise,
// because the old schema had nothing else to render: sets and reps were
// NOT NULL DEFAULT 3/12, so a treadmill run was stored — and shown — as three
// sets of twelve. That is what the user's screenshot of "Jump Rope · SETS 3
// REPS 12" actually was.
//
// So the property worth pinning is not "the editor renders inputs". It is
// that switching the type CHANGES which inputs exist, and that a cardio type
// offers distance and incline while offering no sets at all.
//
// The field list comes from the server (GET /api/training/meta). These tests
// feed it the same shape the API returns, so a drift between the two would
// show up as a test that no longer matches production rather than as a silent
// UI gap.
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PrescriptionEditor from '@/components/pt-os/training/PrescriptionEditor';
import { orderFields, specFor } from '@/lib/training/fields';
import type { PrescriptionTypeMeta } from '@/lib/api';

/** Exactly what /api/training/meta returns for these three types. */
const TYPES: PrescriptionTypeMeta[] = [
  {
    type: 'SETS_REPS',
    required: ['target_sets', 'target_reps_min'],
    optional: ['target_reps_max', 'target_weight', 'target_rpe', 'target_rir'],
    fields: ['target_sets', 'target_reps_min', 'target_reps_max', 'target_weight', 'target_rpe', 'target_rir'],
    logs_as: 'sets',
  },
  {
    type: 'TIME_DISTANCE',
    required: ['target_duration_seconds', 'target_distance'],
    optional: ['distance_unit', 'target_speed', 'target_incline', 'target_resistance',
      'target_heart_rate', 'target_calories', 'target_rpe'],
    fields: ['target_duration_seconds', 'target_distance', 'distance_unit', 'target_speed',
      'target_incline', 'target_resistance', 'target_heart_rate', 'target_calories', 'target_rpe'],
    logs_as: 'cardio',
  },
  { type: 'CUSTOM', required: [], optional: [], fields: [], logs_as: 'either' },
];

describe('the field set follows the prescription type', () => {
  it('a strength prescription offers sets and reps', () => {
    render(<PrescriptionEditor value={{ prescription_type: 'SETS_REPS' }} types={TYPES} onChange={vi.fn()} />);
    expect(screen.getByLabelText(/^Sets/)).toBeTruthy();
    // The asterisk is part of the rendered label for a required field, and
    // the (max) variant is a separate optional one.
    expect(screen.getByLabelText(/^Reps\*?$/)).toBeTruthy();
    expect(screen.getByLabelText(/^Reps \(max\)/)).toBeTruthy();
    expect(screen.queryByLabelText(/Distance/)).toBeNull();
    expect(screen.queryByLabelText(/Incline/)).toBeNull();
  });

  it('a cardio prescription offers distance and incline, and NO sets', () => {
    // The headline case. In the old builder this row would have shown
    // "SETS 3 REPS 12" for a treadmill run.
    render(<PrescriptionEditor value={{ prescription_type: 'TIME_DISTANCE' }} types={TYPES} onChange={vi.fn()} />);
    expect(screen.getByLabelText(/Distance/)).toBeTruthy();
    expect(screen.getByLabelText(/Incline/)).toBeTruthy();
    expect(screen.getByLabelText(/Duration/)).toBeTruthy();
    expect(screen.queryByLabelText(/^Sets/)).toBeNull();
    expect(screen.queryByLabelText(/^Reps/)).toBeNull();
  });

  it('says where the performance will be logged', () => {
    const { rerender } = render(
      <PrescriptionEditor value={{ prescription_type: 'SETS_REPS' }} types={TYPES} onChange={vi.fn()} />);
    expect(screen.getByText(/Logged as sets/)).toBeTruthy();

    rerender(<PrescriptionEditor value={{ prescription_type: 'TIME_DISTANCE' }} types={TYPES} onChange={vi.fn()} />);
    expect(screen.getByText(/Logged as a cardio effort/)).toBeTruthy();
  });

  it('marks the fields the type actually requires', () => {
    render(<PrescriptionEditor value={{ prescription_type: 'TIME_DISTANCE' }} types={TYPES} onChange={vi.fn()} />);
    expect(screen.getByText(/needs duration or distance/i)).toBeTruthy();
  });

  it('renders nothing to fill in for CUSTOM, and says so', () => {
    render(<PrescriptionEditor value={{ prescription_type: 'CUSTOM' }} types={TYPES} onChange={vi.fn()} />);
    expect(screen.getByText(/takes no fixed fields/i)).toBeTruthy();
    expect(screen.queryByLabelText(/^Sets/)).toBeNull();
  });

  it('defaults to SETS_REPS when the row has no type yet', () => {
    render(<PrescriptionEditor value={{}} types={TYPES} onChange={vi.fn()} />);
    expect(screen.getByLabelText(/^Sets/)).toBeTruthy();
  });
});

describe('editing', () => {
  it('reports a numeric change as a number, not a string', () => {
    // The API's zod schemas coerce, but sending "8" where the row models a
    // number makes every local comparison in the builder subtly wrong.
    const onChange = vi.fn();
    render(<PrescriptionEditor value={{ prescription_type: 'SETS_REPS' }} types={TYPES} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText(/^Sets/), { target: { value: '4' } });
    expect(onChange).toHaveBeenCalledWith({ target_sets: 4 });
  });

  it('clears a field to null rather than to an empty string', () => {
    // null is "not prescribed". '' would be stored and read back as a value.
    const onChange = vi.fn();
    render(<PrescriptionEditor value={{ prescription_type: 'SETS_REPS', target_sets: 4 }} types={TYPES} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText(/^Sets/), { target: { value: '' } });
    expect(onChange).toHaveBeenCalledWith({ target_sets: null });
  });

  it('changing the type does not wipe what was already typed', () => {
    // The server treats an inapplicable field as a warning rather than an
    // error precisely so a trainer can switch back without losing their work.
    const onChange = vi.fn();
    render(<PrescriptionEditor
      value={{ prescription_type: 'SETS_REPS', target_sets: 4, target_reps_min: 8 }}
      types={TYPES} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Prescription' }));
    fireEvent.click(screen.getByRole('button', { name: 'TIME DISTANCE' }));
    expect(onChange).toHaveBeenCalledWith({ prescription_type: 'TIME_DISTANCE' });
    expect(onChange.mock.calls[0][0]).not.toHaveProperty('target_sets');
  });

  it('offers a unit picker beside distance', () => {
    const onChange = vi.fn();
    render(<PrescriptionEditor value={{ prescription_type: 'TIME_DISTANCE' }} types={TYPES} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'km' }));
    expect(onChange).toHaveBeenCalledWith({ distance_unit: 'km' });
  });
});

describe('a field the server names and this repo does not know', () => {
  it('still renders, under a derived label', () => {
    // Dropping it would make a new backend field unreachable in the builder —
    // the same silent drift this whole design avoids, from the other side.
    const withNewField: PrescriptionTypeMeta[] = [{
      type: 'SETS_REPS', required: [], optional: ['target_vertical_oscillation'],
      fields: ['target_vertical_oscillation'], logs_as: 'sets',
    }];
    render(<PrescriptionEditor value={{ prescription_type: 'SETS_REPS' }} types={withNewField} onChange={vi.fn()} />);
    expect(screen.getByLabelText(/Target vertical oscillation/i)).toBeTruthy();
  });

  it('specFor derives a readable label', () => {
    expect(specFor('target_vertical_oscillation').label).toBe('Target vertical oscillation');
    expect(specFor('target_duration_seconds').label).toBe('Duration');   // known wins
  });
});

describe('field ordering', () => {
  it('reads the way a coach writes: sets, reps, weight, then RPE', () => {
    expect(orderFields(['target_rpe', 'target_weight', 'target_reps_min', 'target_sets']))
      .toEqual(['target_sets', 'target_reps_min', 'target_weight', 'target_rpe']);
  });

  it('puts duration before distance before incline', () => {
    expect(orderFields(['target_incline', 'target_distance', 'target_duration_seconds']))
      .toEqual(['target_duration_seconds', 'target_distance', 'target_incline']);
  });

  it('keeps unit columns out of the list — they render inside their field', () => {
    expect(orderFields(['target_distance', 'distance_unit', 'weight_unit']))
      .toEqual(['target_distance']);
  });

  it('sorts an unknown field last, in the order the server gave it', () => {
    expect(orderFields(['target_zzz', 'target_sets', 'target_aaa']))
      .toEqual(['target_sets', 'target_zzz', 'target_aaa']);
  });
});
