// Built-in edit is a duplicate-and-edit, not an edit in place.
//
// The card only reports that Edit was clicked. This drives the library page
// itself, because the decision lives there: a row with `can_edit: false` must
// call the duplicate endpoint and open the copy's editor; a custom row must go
// straight to its own editor.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { LibraryExercise } from '@/lib/api';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, back: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/pt-os/exercise-library',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/components/Guard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({ user: { id: 'u1', role: 'trainer', organization_id: 'o1' } }),
}));

const success = vi.fn();
const error = vi.fn();
vi.mock('@/lib/toast', () => ({
  useToast: () => ({ toast: { success, error, info: vi.fn(), warning: vi.fn() } }),
}));

const list = vi.fn();
const meta = vi.fn();
const duplicate = vi.fn();
vi.mock('@/lib/api', () => ({
  api: {
    exercises: {
      list: (...a: unknown[]) => list(...(a as [])),
      meta: () => meta(),
      duplicate: (...a: unknown[]) => duplicate(...(a as [])),
    },
  },
}));

import ExerciseLibraryPage from '@/app/(chrome)/pt-os/exercise-library/page';

const builtIn: LibraryExercise = {
  id: 'builtin-1',
  name: 'Barbell Squat',
  muscle_group: 'legs',
  body_part: 'Legs',
  target_muscle: 'Quadriceps',
  secondary_muscles: null,
  equipment: 'Barbell',
  difficulty: 'intermediate',
  instructions: null,
  gif_url: null,
  exercise_type: null,
  force: null,
  mechanic: null,
  sets_default: null,
  reps_default: null,
  rest_seconds: null,
  source_id: null,
  can_edit: false,
  is_custom: false,
};

beforeEach(() => {
  push.mockReset();
  success.mockReset();
  error.mockReset();
  list.mockReset();
  meta.mockReset();
  duplicate.mockReset();
  list.mockResolvedValue({ exercises: [builtIn], total: 1, limit: 48, offset: 0, has_more: false });
  meta.mockResolvedValue({});
  duplicate.mockResolvedValue({
    message: 'ok',
    exercise: { ...builtIn, id: 'copy-1', name: 'Barbell Squat (Copy)', can_edit: true, is_custom: true },
  });
});

describe('editing a built-in exercise', () => {
  it('duplicates it and opens the copy, never the shared row', async () => {
    render(<ExerciseLibraryPage />);

    fireEvent.click(await screen.findByRole('button', { name: /exercise actions/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /duplicate & edit/i }));

    await waitFor(() => expect(duplicate).toHaveBeenCalledWith('builtin-1'));
    expect(push).toHaveBeenCalledWith('/pt-os/exercise-library/copy-1/edit');
    expect(success).toHaveBeenCalledWith('Created "Barbell Squat (Copy)" — editing the copy');
  });

  it('opens a custom row directly, with no copy in between', async () => {
    list.mockResolvedValue({
      exercises: [{ ...builtIn, can_edit: true, is_custom: true }],
      total: 1, limit: 48, offset: 0, has_more: false,
    });
    render(<ExerciseLibraryPage />);

    fireEvent.click(await screen.findByRole('button', { name: /exercise actions/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /^edit$/i }));

    expect(duplicate).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith('/pt-os/exercise-library/builtin-1/edit');
  });
});
