// What the library offers for a row depends on who owns it.
//
// A built-in exercise belongs to every studio, so it is never edited in
// place. Its action is a duplicate-and-edit: the copy is the trainer's to
// change. A custom row is the trainer's own, so Edit and Delete stay direct.
//
// The card menu used to hide Edit behind a disabled item labelled "Edit" with
// a "Built-in exercise" hint, which read as "this can never be changed". The
// only way forward was Duplicate, then find the copy in the library. These
// tests pin the action the trainer now sees and that it reaches the page.

import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ExerciseCard } from '@/components/pt-os/exercise-library/ExerciseCard';
import type { LibraryExercise } from '@/lib/api';

const ex = (over: Partial<LibraryExercise> = {}): LibraryExercise => ({
  id: 'ex-1',
  name: 'Barbell Squat',
  muscle_group: 'legs',
  body_part: null,
  target_muscle: null,
  secondary_muscles: null,
  equipment: null,
  difficulty: 'beginner',
  instructions: null,
  gif_url: null,
  exercise_type: null,
  force: null,
  mechanic: null,
  sets_default: null,
  reps_default: null,
  rest_seconds: null,
  source_id: null,
  ...over,
});

const openMenu = () =>
  fireEvent.click(screen.getByRole('button', { name: /exercise actions/i }));

describe('library exercise actions', () => {
  it('offers a built-in as duplicate-and-edit, not a disabled Edit', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(
      <ExerciseCard
        exercise={ex({ can_edit: false })}
        onOpen={vi.fn()}
        onToggleFavorite={vi.fn()}
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    );

    openMenu();
    // Delete stays closed to a shared row.
    expect(screen.getByRole('menuitem', { name: /^delete$/i })).toBeDisabled();

    const item = screen.getByRole('menuitem', { name: /duplicate & edit/i });
    expect(item).toBeEnabled();
    fireEvent.click(item);
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('keeps Edit and Delete direct for a custom exercise', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(
      <ExerciseCard
        exercise={ex({ can_edit: true, is_custom: true })}
        onOpen={vi.fn()}
        onToggleFavorite={vi.fn()}
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    );

    openMenu();
    expect(screen.getByRole('menuitem', { name: /^edit$/i })).toBeEnabled();
    fireEvent.click(screen.getByRole('menuitem', { name: /^delete$/i }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('shows secondary muscles from the map even when the legacy text is null', () => {
    // `Pull Ups` and `Push Ups` have the right exercise_muscles rows but a null
    // `secondary_muscles` text column; the list now sends the map, and the
    // card must read it rather than showing only the primary.
    render(
      <ExerciseCard
        exercise={ex({
          name: 'Pull Ups',
          primary_muscle: 'Lats',
          secondary_muscles: null,
          muscles: [
            { slug: 'lats', name: 'Lats', body_region: 'back', role: 'primary' },
            { slug: 'biceps', name: 'Biceps', body_region: 'arms', role: 'secondary' },
            { slug: 'middle-back', name: 'Middle Back', body_region: 'back', role: 'secondary' },
          ],
        })}
        onOpen={vi.fn()}
        onToggleFavorite={vi.fn()}
      />,
    );

    expect(screen.getByText(/Biceps/)).toBeInTheDocument();
    expect(screen.getByText(/Middle Back/)).toBeInTheDocument();
  });
});
