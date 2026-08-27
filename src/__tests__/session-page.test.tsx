// The session screen, end to end through the real hook and the real queue.
//
// Only the network is faked. That is deliberate: the thing worth testing here
// is the wiring — that pressing "Set 1" produces a row on screen before any
// request resolves, sends it to the right endpoint, and shows the rest timer
// the prescription asked for. Mocking the hook would leave all of that
// untested and the test still green.

import { Suspense } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/pt-os/training/sessions/s1',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/components/Guard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const errorToast = vi.fn();
vi.mock('@/lib/toast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: errorToast, info: vi.fn(), warning: vi.fn() } }),
}));

const META = {
  prescription_types: [
    { type: 'SETS_REPS', logs_as: 'sets', required: [], optional: [], fields: [] },
    { type: 'TIME', logs_as: 'cardio', required: [], optional: [], fields: [] },
  ],
  sections: [], progression_types: [], record_types: [], set_types: [], cardio_types: [],
  units: { weight: ['kg'], distance: ['km'] },
};

const SQUAT_PERF = {
  id: 'perf-1', session_id: 's1', exercise_id: 'ex-squat', exercise_name: 'Back Squat',
  section: 'MAIN', order_index: 0, status: 'PENDING', sets: [], cardio: [],
};
const TREADMILL_PERF = {
  id: 'perf-2', session_id: 's1', exercise_id: 'ex-tread', exercise_name: 'Treadmill',
  section: 'CARDIO', order_index: 1, status: 'PENDING', sets: [], cardio: [],
};

const SESSION = {
  id: 's1', client_id: 'c1', trainer_id: null, assignment_id: null,
  workout_template_id: 't1', template_name: 'Leg Day A', session_date: '2026-08-14',
  started_at: '2026-08-14T09:00:00Z', completed_at: null, duration_seconds: null,
  status: 'IN_PROGRESS', overall_rpe: null, client_notes: null, trainer_notes: null,
  performances: [SQUAT_PERF, TREADMILL_PERF],
};

const TEMPLATE = {
  id: 't1', name: 'Leg Day A',
  exercises: [
    {
      id: 'r1', exercise_id: 'ex-squat', prescription_type: 'SETS_REPS', section: 'MAIN',
      target_sets: 4, target_reps_min: 6, target_weight: 100, weight_unit: 'kg',
      target_rest_seconds: 120,
    },
    {
      id: 'r2', exercise_id: 'ex-tread', prescription_type: 'TIME', section: 'CARDIO',
      target_duration_seconds: 600,
    },
  ],
};

const sessionGet = vi.fn();
const templateGet = vi.fn();
const logSet = vi.fn();
const logCardio = vi.fn();
const complete = vi.fn();
const start = vi.fn();

vi.mock('@/lib/api', () => ({
  api: {
    training: {
      meta: async () => ({ data: META }),
      sessions: {
        get: (...a: unknown[]) => sessionGet(...(a as [])),
        start: (...a: unknown[]) => start(...(a as [])),
        complete: (...a: unknown[]) => complete(...(a as [])),
      },
      templates: { get: (...a: unknown[]) => templateGet(...(a as [])) },
      performances: {
        logSet: (...a: unknown[]) => logSet(...(a as [])),
        logCardio: (...a: unknown[]) => logCardio(...(a as [])),
      },
    },
  },
}));

import SessionPage from '@/app/(chrome)/pt-os/training/sessions/[id]/page';
import { __resetTrainingMetaCache } from '@/lib/training/useTrainingMeta';

const renderPage = async () => {
  await act(async () => {
    render(
      <Suspense fallback={null}>
        <SessionPage params={Promise.resolve({ id: 's1' })} />
      </Suspense>,
    );
  });
};

beforeEach(() => {
  window.localStorage.clear();
  errorToast.mockClear();
  __resetTrainingMetaCache();
  sessionGet.mockReset(); sessionGet.mockResolvedValue({ data: SESSION });
  templateGet.mockReset(); templateGet.mockResolvedValue({ data: TEMPLATE });
  logSet.mockReset(); logSet.mockResolvedValue({ data: { id: 'real-1', set_number: 1, actual_reps: 6 }, duplicate: false });
  logCardio.mockReset(); logCardio.mockResolvedValue({ data: { id: 'real-c1' }, duplicate: false });
  complete.mockReset();
  start.mockReset(); start.mockResolvedValue({ data: SESSION });
});

describe('loading the workout', () => {
  it('shows each exercise on the session', async () => {
    await renderPage();
    expect(await screen.findByText('Back Squat')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Treadmill' })).toBeTruthy();
  });

  it('gives the treadmill the cardio form and the squat the sets form', async () => {
    // The whole point of the schema change: a run is not three sets of twelve.
    await renderPage();
    await screen.findByText('Back Squat');
    expect(screen.getByLabelText('Cardio type')).toBeTruthy();
    expect(screen.getByText(/Prescribed: 4 sets · 6 reps · 100kg/)).toBeTruthy();
  });

  it('logs the workout even when the template cannot be fetched', async () => {
    // A missing template costs prefill and target labels, not the session.
    templateGet.mockRejectedValueOnce(new Error('gone'));
    await renderPage();
    expect(await screen.findByText('Back Squat')).toBeTruthy();
    expect(screen.queryByText(/Prescribed:/)).toBeNull();
  });
});

describe('logging a set', () => {
  it('shows the set before the request resolves', async () => {
    // Nothing on this screen may wait on the network.
    let release: (() => void) | null = null;
    logSet.mockImplementationOnce(async () => {
      await new Promise<void>((r) => { release = r; });
      return { data: { id: 'real-1' }, duplicate: false };
    });
    await renderPage();
    await screen.findByText('Back Squat');

    fireEvent.click(screen.getByRole('button', { name: /Set 1/ }));

    expect(await screen.findByLabelText('Syncing')).toBeTruthy();
    expect(screen.getByText('6 reps')).toBeTruthy();
    await act(async () => { release!(); });
  });

  it('sends the prefilled prescription with an idempotency token', async () => {
    await renderPage();
    await screen.findByText('Back Squat');
    fireEvent.click(screen.getByRole('button', { name: /Set 1/ }));

    await waitFor(() => expect(logSet).toHaveBeenCalled());
    const [performanceId, payload] = logSet.mock.calls[0] as [string, Record<string, unknown>];
    expect(performanceId).toBe('perf-1');
    expect(payload).toMatchObject({ set_number: 1, actual_reps: 6, actual_weight: 100, weight_unit: 'kg' });
    expect(typeof payload.client_token).toBe('string');
  });

  it('starts the prescribed rest timer once the set is in', async () => {
    await renderPage();
    await screen.findByText('Back Squat');
    expect(screen.queryByRole('timer')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Set 1/ }));
    expect(await screen.findByRole('timer')).toBeTruthy();
    expect(screen.getByRole('timer').textContent).toContain('2:00');
  });

  it('marks the set saved once the server acknowledges it', async () => {
    await renderPage();
    await screen.findByText('Back Squat');
    fireEvent.click(screen.getByRole('button', { name: /Set 1/ }));
    expect(await screen.findByLabelText('Saved')).toBeTruthy();
  });

  it('routes a cardio effort to the cardio endpoint', async () => {
    await renderPage();
    await screen.findByRole('heading', { name: 'Treadmill' });
    fireEvent.click(screen.getByRole('button', { name: /Log effort/ }));

    await waitFor(() => expect(logCardio).toHaveBeenCalled());
    expect(logSet).not.toHaveBeenCalled();
    const [, payload] = logCardio.mock.calls[0] as [string, Record<string, unknown>];
    expect(payload).toMatchObject({ cardio_type: 'TREADMILL', duration_seconds: 600 });
    expect(payload).not.toHaveProperty('actual_reps');
  });
});

describe('when the connection is not there', () => {
  it('keeps the set and says it is waiting', async () => {
    logSet.mockRejectedValue(new TypeError('Failed to fetch'));
    await renderPage();
    await screen.findByText('Back Squat');
    fireEvent.click(screen.getByRole('button', { name: /Set 1/ }));

    expect(await screen.findByText(/1 entry waiting/)).toBeTruthy();
    // The set itself is still on screen — it was logged, it just has not left.
    expect(screen.getByText('6 reps')).toBeTruthy();
  });

  it('offers a way to try again now', async () => {
    logSet.mockRejectedValue(new TypeError('Failed to fetch'));
    await renderPage();
    await screen.findByText('Back Squat');
    fireEvent.click(screen.getByRole('button', { name: /Set 1/ }));
    await screen.findByText(/waiting/);

    logSet.mockResolvedValue({ data: { id: 'real-1' }, duplicate: false });
    fireEvent.click(screen.getByRole('button', { name: /Try now/ }));
    await waitFor(() => expect(screen.queryByText(/waiting/)).toBeNull());
  });
});

describe('finishing', () => {
  it('reports the summary and any records set', async () => {
    complete.mockResolvedValue({
      data: { ...SESSION, status: 'COMPLETED' },
      summary: {
        exercises: 2, exercisesCompleted: 2,
        strength: { loadKg: 2400, hardSets: 4, reps: 24 },
        cardio: { efforts: 1, distanceMetres: 0, distanceKm: 0, durationSeconds: 600, calories: 0 },
        averageRpe: 8, durationSeconds: 3600,
      },
      records: [{ id: 'pr1', exercise_name: 'Back Squat', record_type: 'MAX_WEIGHT', value: 100, unit: 'kg' }],
      already_complete: false,
    });
    await renderPage();
    await screen.findByText('Back Squat');

    fireEvent.click(screen.getByRole('button', { name: /Finish workout/ }));
    expect(await screen.findByText('Workout complete')).toBeTruthy();
    expect(screen.getByText(/2400kg total load/)).toBeTruthy();
    expect(screen.getByText(/Back Squat — max weight 100kg/)).toBeTruthy();
  });

  it('says so when finishing fails, rather than looking finished', async () => {
    complete.mockRejectedValue(new Error('session already closed'));
    await renderPage();
    await screen.findByText('Back Squat');
    fireEvent.click(screen.getByRole('button', { name: /Finish workout/ }));

    await waitFor(() => expect(errorToast).toHaveBeenCalledWith('session already closed'));
    expect(screen.queryByText('Workout complete')).toBeNull();
  });
});
