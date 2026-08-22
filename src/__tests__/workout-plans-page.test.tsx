// The Workout Plans screen, after the redesign.
//
// The card used to answer "what shape is this programme" and never "who is
// running it" — which is the only question that makes a plan interesting to
// the person looking at this screen. It could not: the plans endpoint hard-
// coded `0 AS progress` and returned no roster at all, so every card read
// "0% complete" and every studio's Avg Completion KPI read 0%.
//
// These tests are about what the screen states. Three of them are really
// honesty tests — a card must not claim a week, a percentage or a client it
// has no data for — and they are the ones most likely to be quietly broken by
// a later change that gives a field a friendly default.

import * as React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { WorkoutPlan } from '@/lib/api';

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotion: () => true,
  m: new Proxy({}, {
    get: (_t, tag: string) => ({ children, whileHover, whileTap, variants, initial, animate, exit, transition, ...rest }: Record<string, unknown>) =>
      React.createElement(tag, rest, children as React.ReactNode),
  }),
}));

import { WorkoutPlanCard, weekOfProgramme } from '@/components/fitness/WorkoutPlanCard';

const plan = (over: Partial<Parameters<typeof WorkoutPlanCard>[0]> = {}) => ({
  id: 'p1',
  name: 'Hypertrophy Foundation',
  goal: 'muscle gain',
  difficulty: 'Intermediate',
  durationWeeks: 4,
  sessionsPerWeek: 3,
  exerciseCount: 12,
  progress: 52,
  assignments: [{ client_id: 'c1', client_name: 'Rahul Sharma', progress_pct: 52, start_date: '2026-08-10' }],
  onOpen: vi.fn(),
  onEdit: vi.fn(),
  onAssign: vi.fn(),
  onDelete: vi.fn(),
  ...over,
});

describe('a plan with no exercises', () => {
  it('never says "0 exercises"', () => {
    // The screenshot that started this: a brand-new programme reporting a
    // count of zero, which reads as a measurement rather than as "you have
    // not written this yet".
    render(<WorkoutPlanCard {...plan({ exerciseCount: 0 })} />);
    expect(screen.queryByText(/0 exercises/i)).not.toBeInTheDocument();
    expect(screen.getByText(/no exercises added yet/i)).toBeInTheDocument();
  });

  it('offers the way to fix it, as a real control', () => {
    const onAddExercises = vi.fn();
    render(<WorkoutPlanCard {...plan({ exerciseCount: 0, onAddExercises })} />);
    fireEvent.click(screen.getByRole('button', { name: /add exercises/i }));
    expect(onAddExercises).toHaveBeenCalled();
  });

  it('still counts exercises when it has some', () => {
    render(<WorkoutPlanCard {...plan({ exerciseCount: 12 })} />);
    expect(screen.getByText(/12 exercises/)).toBeInTheDocument();
    expect(screen.queryByText(/no exercises added yet/i)).not.toBeInTheDocument();
  });
});

describe('a plan nobody is running', () => {
  it('says so instead of drawing an empty progress bar', () => {
    // 0% on an unassigned plan is a measurement of nothing wearing a
    // percentage sign — the same defect as the hardcoded server-side zero.
    render(<WorkoutPlanCard {...plan({ assignments: [], progress: 0 })} />);
    expect(screen.getByText(/not assigned yet/i)).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });
});

describe('a plan one client is running', () => {
  it('names the client and where they are in the programme', () => {
    render(<WorkoutPlanCard {...plan()} />);
    expect(screen.getByText('Rahul Sharma')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '52');
    expect(screen.getByText('52%')).toBeInTheDocument();
  });

  it('gives no week at all when the assignment has no start date', () => {
    // Defaulting this to "Week 1 of 4" would state a fact about somebody's
    // training that nothing in the payload supports.
    render(<WorkoutPlanCard {...plan({
      assignments: [{ client_id: 'c1', client_name: 'Rahul Sharma', progress_pct: 52, start_date: null }],
    })} />);
    expect(screen.queryByText(/week \d+ of/i)).not.toBeInTheDocument();
  });
});

describe('a plan several clients are running', () => {
  it('names one and counts the rest, and marks the figure as an average', () => {
    // They are in different weeks, so there is no single week to show.
    render(<WorkoutPlanCard {...plan({
      progress: 34,
      assignments: [
        { client_id: 'c1', client_name: 'Priya Venkatesan', progress_pct: 40, start_date: '2026-07-20' },
        { client_id: 'c2', client_name: 'Arjun Mehta', progress_pct: 28, start_date: '2026-08-01' },
      ],
    })} />);
    expect(screen.getByText('Priya Venkatesan')).toBeInTheDocument();
    expect(screen.getByText(/\+1 more/)).toBeInTheDocument();
    expect(screen.getByText(/2 clients training/i)).toBeInTheDocument();
    expect(screen.getByText('avg')).toBeInTheDocument();
    expect(screen.queryByText(/week \d+ of/i)).not.toBeInTheDocument();
  });
});

describe('the action row', () => {
  it('does not put Delete beside the actions a trainer uses all day', () => {
    // It used to sit between Edit and Assign in full red — the most
    // destructive control on the card was also the most eye-catching.
    render(<WorkoutPlanCard {...plan()} />);
    const row = screen.getByRole('button', { name: /open plan/i }).parentElement as HTMLElement;
    const labels = [...row.querySelectorAll(':scope > button')]
      .map((b) => (b.getAttribute('aria-label') || b.textContent || '').toLowerCase());
    expect(labels.some((l) => l.includes('delete'))).toBe(false);
    expect(labels.some((l) => l.includes('open plan'))).toBe(true);
  });

  it('keeps Delete reachable, behind the overflow menu', () => {
    render(<WorkoutPlanCard {...plan()} />);
    expect(screen.queryByRole('menuitem', { name: /delete/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /more actions/i }));
    expect(screen.getByRole('menuitem', { name: /delete plan/i })).toBeInTheDocument();
  });

  it('closes the menu on Escape', async () => {
    // The handler lives on the document. Bound to the menu element with
    // tabIndex={-1}, as the sibling components do it, the key never arrives:
    // opening by pointer leaves focus on the trigger, so nothing inside the
    // menu is focused and the keydown has nowhere to bubble from.
    render(<WorkoutPlanCard {...plan()} />);
    fireEvent.click(screen.getByRole('button', { name: /more actions/i }));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
  });

  it('runs the destructive action only from inside the menu', () => {
    const onDelete = vi.fn();
    render(<WorkoutPlanCard {...plan({ onDelete })} />);
    fireEvent.click(screen.getByRole('button', { name: /more actions/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /delete plan/i }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});

describe('weekOfProgramme', () => {
  const start = '2026-08-10T00:00:00.000Z';
  const at = (iso: string) => Date.parse(iso);

  it('is week 1 on the first day', () => {
    expect(weekOfProgramme(start, 4, at('2026-08-10T09:00:00Z'))).toBe(1);
  });

  it('turns over after seven days, not six', () => {
    expect(weekOfProgramme(start, 4, at('2026-08-16T23:00:00Z'))).toBe(1);
    expect(weekOfProgramme(start, 4, at('2026-08-17T01:00:00Z'))).toBe(2);
  });

  it('never runs past the end of the programme', () => {
    // "Week 9 of 4" is what a client who kept training would otherwise see.
    expect(weekOfProgramme(start, 4, at('2026-12-01T00:00:00Z'))).toBe(4);
  });

  it('is week 1, not week 0, for a start date in the future', () => {
    expect(weekOfProgramme(start, 4, at('2026-08-01T00:00:00Z'))).toBe(1);
  });

  it('is null rather than 1 when there is nothing to derive it from', () => {
    expect(weekOfProgramme(null, 4)).toBeNull();
    expect(weekOfProgramme(start, undefined)).toBeNull();
    expect(weekOfProgramme('not-a-date', 4)).toBeNull();
  });
});
