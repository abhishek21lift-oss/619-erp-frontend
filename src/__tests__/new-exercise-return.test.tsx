// Creating an exercise from the builder, then getting back to the day.
//
// The editor always fired onSaved and onClose in that order. The page used to
// treat both as "go to the library", which was harmless while there was only
// one destination. Now the return path carries a `new` id that the
// add-exercises screen attaches, so the navigation has to be decided once,
// after the saved row is known — and the return path is user-editable, so it
// must stay inside the app.
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const push = vi.fn();
let params = new URLSearchParams('');
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => params,
}));
vi.mock('@/components/Guard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/lib/api', () => ({ api: { exercises: { meta: async () => ({}) } } }));
vi.mock('@/components/pt-os/exercise-library/ExerciseEditor', () => ({
  ExerciseEditor: (props: {
    initialName?: string;
    onSaved: (ex: { id: string }) => void;
    onClose: () => void;
  }) => (
    <div>
      <span data-testid="initial-name">{props.initialName}</span>
      <button
        onClick={() => {
          props.onSaved({ id: 'ex-new' });
          props.onClose();
        }}
      >
        save
      </button>
    </div>
  ),
}));

import NewExercisePage from '@/app/(chrome)/pt-os/exercise-library/new/page';

const save = () => fireEvent.click(screen.getByText('save'));

beforeEach(() => {
  push.mockReset();
  params = new URLSearchParams('');
});

describe('returning to the screen that asked for the exercise', () => {
  it('returns with the new id, prefilled with the typed name', () => {
    params = new URLSearchParams(
      'name=Copenhagen%20plank&returnTo=%2Fpt-os%2Fworkout-plans%2Fp1%2Fbuilder%2Fadd-exercises%3Fday%3D4',
    );
    render(<NewExercisePage />);

    expect(screen.getByTestId('initial-name').textContent).toBe('Copenhagen plank');
    save();
    expect(push).toHaveBeenCalledWith(
      '/pt-os/workout-plans/p1/builder/add-exercises?day=4&new=ex-new',
    );
  });

  it('goes to the library when nobody asked', () => {
    render(<NewExercisePage />);
    save();
    expect(push).toHaveBeenCalledWith('/pt-os/exercise-library');
  });

  it('ignores a return path that leaves the app', () => {
    // The query string is editable by hand; only in-app destinations are
    // followed, so this cannot become an open redirect.
    params = new URLSearchParams('returnTo=https%3A%2F%2Fevil.example');
    render(<NewExercisePage />);
    save();
    expect(push).toHaveBeenCalledWith('/pt-os/exercise-library');
  });
});
