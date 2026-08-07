// Starting a session for a client who has no workout programme.
//
// This is the commonest state a new client is in: enrolled, paid, booked in
// for 6am tomorrow, plan not written yet. Until now they were absent from the
// Today roster entirely — the query INNER JOINed workout_assignments — so the
// one screen a trainer opens on the gym floor could not start the one session
// they were about to run.
//
// The roster includes them now, which means three things downstream have to
// hold, and all three fail quietly rather than loudly: a Start that posts a
// plan it does not have, a row that renders "null · 0 exercises", or a log
// page that assumes a plan is attached and blanks when it is not.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildTodayQueue } from '@/components/dashboards/PtOsDashboard';
import type { TodayClient } from '@/lib/api';

const src = (...p: string[]) => readFileSync(join(__dirname, '..', ...p), 'utf8');

const planless: TodayClient = {
  assignment_id: null,
  client_id: 'c1',
  client_name: 'Booked, no plan',
  client_photo: null,
  plan_id: null,
  plan_name: null,
  progress_pct: null,
  planned_exercises: 0,
  start_time: '06:00',
  source: 'booked',
  is_rest_day: false,
  session_id: null,
  session_status: null,
};

describe('the dashboard card', () => {
  it('shows a plan-less client rather than skipping them', () => {
    expect(buildTodayQueue([planless])).toHaveLength(1);
  });

  it('does not call them a rest day and grey them out', () => {
    // is_rest_day was `planned_exercises === 0` server-side, which is exactly
    // this client. Dimming the one row with a real 6am appointment would be
    // the worst possible row to hide.
    expect(planless.is_rest_day).toBe(false);
    expect(buildTodayQueue([planless])[0].sub).toBe('No programme yet');
  });

  it('still carries their booked time', () => {
    expect(buildTodayQueue([planless])[0].time).toBe('06:00');
  });
});

describe('the Today page', () => {
  const page = src('app', 'pt-os', 'today', 'page.tsx');

  it('keys rows on the client, not the assignment', () => {
    // assignment_id is null for a plan-less client, so keying on it collapses
    // every such row onto one React key.
    expect(page).toContain('key={c.client_id}');
    expect(page).not.toMatch(/key=\{c\.assignment_id\}/);
  });

  it('does not interpolate a missing plan name into the subtitle', () => {
    expect(page).toContain("!c.plan_name");
    expect(page).toContain('No programme yet');
  });

  it('sends the plan through as-is when starting, rather than inventing one', () => {
    // program_name is nullable on the create schema, and workout_assignment_id
    // is deliberately omitted so the server can auto-link the client's single
    // active assignment — which for this client is none, giving a freestyle
    // session.
    const start = page.slice(page.indexOf('const open = async'));
    expect(start).toContain('program_name: c.plan_name');
    expect(start.slice(0, 900)).not.toContain('workout_assignment_id');
  });
});

describe('the session log page', () => {
  const page = src('app', 'pt-os', 'clients', '[id]', 'workout-log', '[sessionId]', 'page.tsx');

  it('asks for no planned-day options when nothing is assigned', () => {
    expect(page).toContain('if (!session?.workout_assignment_id) { setDayOptions([]); return; }');
  });

  it('guards every read of the planned block', () => {
    // A session with no assignment has no `planned`. An unguarded read is a
    // blank screen on the page the trainer has just been sent to.
    expect(page).toContain('if (!session?.planned) return;');
    expect(page).toContain('session.planned?.');
  });

  it('offers Add Exercise regardless of whether a plan is attached', () => {
    // The whole point of letting a plan-less client be started: the exercises
    // get added here, in the session.
    const add = page.slice(page.indexOf('Add Exercise') - 400, page.indexOf('Add Exercise'));
    expect(add).toContain('setPickerOpen(true)');
    expect(add).not.toMatch(/session\.planned\s*&&/);
  });
});
