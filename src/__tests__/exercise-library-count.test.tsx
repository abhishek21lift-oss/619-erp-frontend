// The Exercise Library tab could only see the first 50 of 890 exercises.
//
// ── The bug, as reported ───────────────────────────────────────────────────
//
// The Workout Plans page said "EXERCISES 50" and the Add Exercise picker
// clearly listed more than fifty. Both were right about what they showed.
//
// /api/exercises pages at 50 by default and returns the real `total` beside
// the rows. This page called it with no params, then rendered
// `exercises.length` — the page size — as the count. So the card read 50 for
// every studio, whatever the library held. The picker asks for 60 and searches
// server-side, which is why the two disagreed.
//
// The worse half was the search. It filtered the fifty rows the first page
// happened to contain, so 840 exercises were unreachable from this tab: typing
// "romanian" found nothing unless a Romanian deadlift was in that page. The
// exercise existed and the tab said it did not.
//
// Confirmed against production: exercises = 890.
//
// These tests drive the real page against a mocked API, because the failure
// was entirely in which number was read and which layer did the filtering —
// both invisible in a snapshot and both obvious the moment you ask the page
// what it displays.
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/pt-os/workout-plans',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/components/Guard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/lib/toast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() } }),
}));

/** One page of 50, out of a library of 890 — production's actual shape. */
const page = (names: string[], total = 890) => ({
  exercises: names.map((name, i) => ({
    id: `ex-${i}`, name, body_region: 'Chest', body_part: 'Chest',
  })),
  total,
  limit: 50,
  offset: 0,
  has_more: total > names.length,
});

const FIRST_PAGE = Array.from({ length: 50 }, (_, i) => `Exercise ${i + 1}`);

const exercisesList = vi.fn(async (params?: Record<string, string | number>) => {
  // The server searches the whole library, not the page the client holds.
  if (params?.q === 'romanian') return page(['Romanian Deadlift'], 1);
  return page(FIRST_PAGE);
});

vi.mock('@/lib/api', () => ({
  api: {
    exercises: {
      list: (p?: Record<string, string | number>) => exercisesList(p),
      meta: async () => ({ muscles_by_region: { Chest: [], Back: [] } }),
    },
    workouts: { plans: { list: async () => [] } },
    pt: { clients: async () => ({ data: [] }) },
  },
}));

import WorkoutPlansPage from '@/app/(chrome)/pt-os/workout-plans/page';

beforeEach(() => exercisesList.mockClear());

/**
 * Render, and open the Exercise Library tab.
 *
 * The search box lives inside that tab and the page opens on another one, so
 * a test that never clicks it is asserting against a control that is not on
 * screen — which is what the first run of this file did.
 */
async function openLibrary() {
  render(<WorkoutPlansPage />);
  // The tab is labelled "Exercises" since the page redesign — the count sits
  // beside the word rather than inside it, so the name matches on the label
  // alone. What this file asserts about the count is unchanged.
  const tab = await screen.findByRole('tab', { name: /Exercises/ });
  fireEvent.click(tab);
  return screen.getByLabelText('Search exercises');
}

describe('the exercise count', () => {
  it('reports the library total, not the page size', async () => {
    // The reported bug, stated directly. 50 is how many rows arrived; 890 is
    // how many exercises the studio has.
    render(<WorkoutPlansPage />);
    expect(await screen.findByText('890')).toBeTruthy();
  });

  it('never shows the page size as the count', async () => {
    render(<WorkoutPlansPage />);
    await screen.findByText('890');
    // 50 rows arrived and 50 must not appear as a total anywhere.
    const kpi = screen.queryAllByText('50');
    expect(kpi).toHaveLength(0);
  });

  it('falls back to the row count when the API omits a total', async () => {
    // An older or partial response must not render "undefined".
    exercisesList.mockImplementationOnce(async () => ({
      exercises: FIRST_PAGE.slice(0, 3).map((name, i) => ({ id: `e${i}`, name })),
    }));
    render(<WorkoutPlansPage />);
    expect(await screen.findByText('3')).toBeTruthy();
  });
});

describe('the library search', () => {
  it('asks the server, so it can reach past the first page', async () => {
    // The 840 unreachable exercises. "Romanian Deadlift" is not in the first
    // 50 rows, so a client-side filter over them finds nothing.
    const input = await openLibrary();
    fireEvent.change(input, { target: { value: 'romanian' } });

    await waitFor(() =>
      expect(exercisesList).toHaveBeenCalledWith(expect.objectContaining({ q: 'romanian' })),
      { timeout: 2000 });
    expect(await screen.findByText('Romanian Deadlift')).toBeTruthy();
  });

  it('goes back to the unfiltered library when the search is cleared', async () => {
    const input = await openLibrary();
    fireEvent.change(input, { target: { value: 'romanian' } });
    await waitFor(() => expect(exercisesList).toHaveBeenCalledWith(expect.objectContaining({ q: 'romanian' })),
      { timeout: 2000 });

    fireEvent.change(input, { target: { value: '' } });
    await waitFor(() => expect(screen.getByText('890')).toBeTruthy(), { timeout: 2000 });
  });

  it('debounces rather than firing per keystroke', async () => {
    // 890 exercises behind a full-text search is not a query to run five times
    // while somebody types "bench".
    const input = await openLibrary();
    const before = exercisesList.mock.calls.length;

    fireEvent.change(input, { target: { value: 'b' } });
    fireEvent.change(input, { target: { value: 'be' } });
    fireEvent.change(input, { target: { value: 'ben' } });
    fireEvent.change(input, { target: { value: 'bench' } });

    await waitFor(() => expect(exercisesList.mock.calls.length).toBeGreaterThan(before), { timeout: 2000 });
    expect(exercisesList.mock.calls.length - before).toBeLessThanOrEqual(2);
  });
});
