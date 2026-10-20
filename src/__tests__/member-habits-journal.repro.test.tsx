// Diagnosis harness for the red E2E on PR #327: "Journal saved" resolves to
// two toasts after the SECOND save of the same day. jsdom, StrictMode on
// (next.config has reactStrictMode: true and the e2e runs `next dev`).

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';

type Row = Record<string, unknown> & { updated_at: string };

let row: Row | null = null;
const saveHabit = vi.fn();

vi.mock('@/components/Guard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/member/MemberShell', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/lib/api', () => ({
  api: {
    me: {
      progress: async () => ({
        data: {
          today: '2026-04-01',
          period: { start_date: '2026-03-02', end_date: '2026-04-01' },
          habits: {
            today: { log: null, checklist: [], completion: 0 },
            averages: {},
            last_7_days: { sleep_average: null, steps_average: null, sleep_samples: 0, step_samples: 0 },
            streaks: { logging_days: 0 },
            data_quality: { missing_days: 0 },
          },
        },
      }),
      habitLogs: async () => ({ data: [] }),
      todayHabit: async () => ({ data: row }),
      saveHabit: (...args: unknown[]) => saveHabit(...args),
    },
  },
}));

import MemberHabitsPage from '@/app/(bare)/member/habits/page';
import { ToastProvider } from '@/lib/toast';

const savedRows = () => screen.queryAllByText('Journal saved');

beforeEach(() => {
  row = null;
  saveHabit.mockReset();
  saveHabit.mockImplementation(async (body: Record<string, unknown>) => {
    row = { id: 'h1', source: 'manual', steps_source: 'manual', ...body, updated_at: new Date().toISOString() };
    return { data: row };
  });
});

describe('<MemberHabitsPage /> journal', () => {
  it('shows one confirmation per save, save and update', async () => {
    render(
      <StrictMode>
        <ToastProvider>
          <MemberHabitsPage />
        </ToastProvider>
      </StrictMode>,
    );

    const save = await screen.findByRole('button', { name: 'Save this day' });
    fireEvent.change(screen.getByLabelText(/^Duration/), { target: { value: '7.5' } });
    fireEvent.change(screen.getByLabelText('Steps'), { target: { value: '8123' } });
    fireEvent.change(screen.getByLabelText('Notes (optional)'), { target: { value: 'first' } });
    fireEvent.click(save);

    await waitFor(() => expect(saveHabit).toHaveBeenCalledTimes(1));
    await screen.findByText('Journal saved');
    expect(savedRows(), 'one toast after the first save').toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
    await waitFor(() => expect(savedRows()).toHaveLength(0));

    const update = await screen.findByRole('button', { name: 'Update this day' });
    fireEvent.change(screen.getByLabelText('Notes (optional)'), { target: { value: 'edited' } });
    fireEvent.click(update);

    await waitFor(() => expect(saveHabit).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(savedRows().length).toBe(1));
  }, 15000);
});
