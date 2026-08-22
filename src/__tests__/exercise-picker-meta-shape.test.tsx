// The picker survives a meta response that is missing a field.
//
// /api/exercises/meta feeds two decorative filter rows: muscle regions and
// equipment. The regions row was read defensively —
// `Object.keys(meta?.muscles_by_region || {})` — and the equipment row was
// not: `meta && meta.equipment.length` guards the OBJECT and not the FIELD.
//
// So a response without `equipment` threw on `.length` during render, and a
// throw in render is not a missing filter row: React unwinds to the nearest
// error boundary, which here is the whole /pt-os segment. The trainer asked
// for a list of exercises and got "Something went wrong", because a row of
// chips they were not using could not be drawn.
//
// Found while driving the Add Exercises page in a browser with a stubbed API.
// It reproduces on every caller of the panel, dialog and page alike, which is
// why the fix is in the component rather than in any one screen.

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('@/lib/toast', () => ({ useToast: () => ({ toast: { error: vi.fn(), success: vi.fn() } }) }));

const metaMock = vi.fn();
const listMock = vi.fn();
vi.mock('@/lib/api', () => ({
  api: {
    exercises: {
      meta: (...a: unknown[]) => metaMock(...a),
      recent: async () => ({ exercises: [] }),
      list: (...a: unknown[]) => listMock(...a),
      markUsed: async () => ({}),
    },
  },
}));

import { ExercisePicker } from '@/components/pt-os/workout-log/ExercisePicker';

const EXERCISES = [{
  id: 'x1', name: 'Back Squat', primary_muscle: 'legs', equipment_name: 'barbell',
  mechanic: 'compound', is_favorite: false, is_custom: false,
}];

beforeEach(() => {
  metaMock.mockReset();
  listMock.mockReset();
  listMock.mockResolvedValue({ exercises: EXERCISES, total: 1 });
});

const open = () => render(
  <ExercisePicker open onClose={() => {}} onSelect={() => {}} />,
);

describe('a meta response missing a field', () => {
  it('still renders the library when `equipment` is absent', async () => {
    // The exact shape that took the segment down.
    metaMock.mockResolvedValue({ muscles_by_region: { Chest: ['Pectorals'] } });
    open();
    expect(await screen.findByText('Back Squat')).toBeInTheDocument();
  });

  it('still renders the library when meta is empty altogether', async () => {
    metaMock.mockResolvedValue({});
    open();
    expect(await screen.findByText('Back Squat')).toBeInTheDocument();
  });

  it('still renders the library when the meta read fails', async () => {
    metaMock.mockRejectedValue(new Error('offline'));
    open();
    expect(await screen.findByText('Back Squat')).toBeInTheDocument();
  });

  it('draws the equipment chips when they are there', async () => {
    // The row is not removed — it is guarded. This is the half that must keep
    // working, or the "fix" is just a deletion.
    metaMock.mockResolvedValue({
      muscles_by_region: {},
      equipment: [{ slug: 'barbell', name: 'Barbell' }, { slug: 'dumbbell', name: 'Dumbbell' }],
    });
    open();
    await screen.findByText('Back Squat');
    await waitFor(() => expect(screen.getByText('Barbell')).toBeInTheDocument());
    expect(screen.getByText('Dumbbell')).toBeInTheDocument();
  });
});
