// The builder's "add exercises" affordance is navigation now, not a dialog.
//
// Two behaviours moved out of component state when this became a route, and
// both are silent when they break:
//
//   · the day is in the URL. It used to be useState, which meant leaving to
//     add exercises and coming back always landed on Monday — with the rows
//     just added sitting on a tab the trainer had to go and find.
//   · every Add control navigates, carrying the plan AND the day. A link that
//     drops the day sends the batch to Monday, and nothing on the way says so.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';

const push = vi.fn();
const replace = vi.fn();
let params = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace, back: vi.fn() }),
  usePathname: () => '/pt-os/clients/c1/training/builder',
  useSearchParams: () => params,
}));

vi.mock('@/lib/toast', () => ({
  useToast: () => ({
    toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
  }),
}));

const detail = vi.fn();
vi.mock('@/lib/api', () => ({
  api: {
    workouts: {
      plans: {
        detail: (...a: unknown[]) => detail(...(a as [])),
        exercises: {
          patch: vi.fn(async () => ({})),
          add: vi.fn(async () => ({ exercise: {} })),
          remove: vi.fn(async () => ({})),
        },
        reorder: vi.fn(async () => ({})),
        progressionPreview: vi.fn(async () => ({ weeks: [] })),
        versions: vi.fn(async () => ({ versions: [] })),
      },
    },
  },
}));

import WorkoutBuilder from '@/components/pt-os/builder/WorkoutBuilder';

const EMPTY_PLAN = {
  id: 'p1', name: 'Hypertrophy Block', weeks: 8,
  progression_type: 'weight', progression_value: 2.5,
  exercises: [] as unknown[],
};

const renderBuilder = async () => {
  await act(async () => {
    render(<WorkoutBuilder planId="p1" clientId="c1" />);
  });
};

beforeEach(() => {
  push.mockReset();
  replace.mockReset();
  detail.mockReset();
  detail.mockResolvedValue(EMPTY_PLAN);
  params = new URLSearchParams();
});

describe('adding exercises', () => {
  it('navigates to the add-exercises route, carrying plan and day', async () => {
    params = new URLSearchParams('plan=p1&day=3');
    await renderBuilder();

    const add = await screen.findAllByRole('button', { name: /add exercise/i });
    fireEvent.click(add[0]);

    expect(push).toHaveBeenCalledWith(
      '/pt-os/clients/c1/training/builder/add-exercises?plan=p1&day=3',
    );
  });

  it('opens no dialog of its own', async () => {
    // The whole point of the change: the library is a screen now. If a dialog
    // came back, this test is the thing that notices.
    params = new URLSearchParams('plan=p1&day=1');
    await renderBuilder();

    const add = await screen.findAllByRole('button', { name: /add exercise/i });
    fireEvent.click(add[0]);

    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('the day lives in the URL', () => {
  it('defaults to Monday when the URL says nothing', async () => {
    await renderBuilder();
    await waitFor(() => expect(detail).toHaveBeenCalled());
    const add = await screen.findAllByRole('button', { name: /add exercise/i });
    fireEvent.click(add[0]);
    expect(push.mock.calls[0][0]).toContain('day=1');
  });

  it('reads the day the URL is showing', async () => {
    params = new URLSearchParams('plan=p1&day=6');
    await renderBuilder();
    const add = await screen.findAllByRole('button', { name: /add exercise/i });
    fireEvent.click(add[0]);
    expect(push.mock.calls[0][0]).toContain('day=6');
  });

  it('falls back to Monday for a day that is not a day', async () => {
    params = new URLSearchParams('plan=p1&day=0');
    await renderBuilder();
    const add = await screen.findAllByRole('button', { name: /add exercise/i });
    fireEvent.click(add[0]);
    expect(push.mock.calls[0][0]).toContain('day=1');
  });

  it('writes the day to the URL when a day tab is pressed', async () => {
    params = new URLSearchParams('plan=p1&day=1');
    await renderBuilder();

    // The tabs are labelled with the short name — 'Thu' — plus a count badge.
    fireEvent.click(screen.getByRole('tab', { name: /thu/i }));

    expect(replace).toHaveBeenCalled();
    const [href, opts] = replace.mock.calls[0];
    expect(href).toContain('day=4');
    // The plan the builder is editing must survive a day change, or the next
    // render has no ?plan= and the builder shows "no programme selected".
    expect(href).toContain('plan=p1');
    // replace, not push: flicking through seven days must not bury the screen
    // the trainer arrived from under seven history entries.
    expect(opts).toMatchObject({ scroll: false });
  });
});
