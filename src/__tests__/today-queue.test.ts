// What "Today's Sessions" shows, and in what order.
//
// Three rules, all of which fail silently. A completed session that stays in
// the list looks exactly like a session you still have to run. A queue in the
// wrong order looks like a queue. A cap applied before the filter shows two
// rows that are both already done and hides the two that are not — and the
// card still looks perfectly reasonable in a screenshot.
//
// The logic is a pure function precisely so these can be asserted on data
// rather than on pixels.

import { describe, expect, it } from 'vitest';
import { buildTodayQueue, TODAY_VISIBLE } from '@/components/dashboards/PtOsDashboard';

type Booked = Parameters<typeof buildTodayQueue>[0];
type Due = Parameters<typeof buildTodayQueue>[1];
type Enrolled = NonNullable<Parameters<typeof buildTodayQueue>[2]>;

const slot = (
  id: string,
  start_time: string | null,
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show' = 'scheduled',
): Booked[number] => ({
  id,
  title: 'PT Session',
  session_date: '2026-08-06',
  start_time,
  end_time: null,
  status,
  notes: null,
  client_name: `Client ${id}`,
  client_photo: null,
  trainer_name: 'Abhishek',
  plan_name: 'Full Body',
  plan_id: 'p1',
});

const dueClient = (id: string, exercises = 2): Due[number] => ({
  assignment_id: id,
  client_id: `c-${id}`,
  client_name: `Due ${id}`,
  client_photo: null,
  plan_id: 'p1',
  plan_name: 'Full Body',
  planned_exercises: exercises,
});

const enrolledClient = (
  id: string,
  preferred_workout_time: string | null = '06:00',
  preferred_training_days = 'Mon, Wed, Fri',
): Enrolled[number] => ({
  client_id: id,
  client_name: `Enrolled ${id}`,
  client_photo: null,
  preferred_workout_time,
  preferred_training_days,
  trainer_name: 'Abhishek',
});

const names = (rows: ReturnType<typeof buildTodayQueue>) => rows.map((r) => r.name);

describe('completed sessions leave the list', () => {
  it('drops a completed session', () => {
    const q = buildTodayQueue([slot('a', '07:00', 'completed'), slot('b', '08:00')], []);
    expect(names(q)).toEqual(['Client b']);
  });

  it('drops a cancelled one too', () => {
    // Not literally asked for, but a session that is not happening has no
    // business occupying one of two visible rows.
    const q = buildTodayQueue([slot('a', '07:00', 'cancelled'), slot('b', '08:00')], []);
    expect(names(q)).toEqual(['Client b']);
  });

  it('keeps a no-show, which is unresolved rather than finished', () => {
    const q = buildTodayQueue([slot('a', '07:00', 'no_show')], []);
    expect(names(q)).toEqual(['Client a']);
  });

  it('a fully completed day leaves an empty queue, not a list of ticks', () => {
    const q = buildTodayQueue([slot('a', '07:00', 'completed'), slot('b', '08:00', 'completed')], []);
    expect(q).toEqual([]);
  });
});

describe('serial order — first session to last', () => {
  it('sorts booked slots by start time regardless of the order they arrive in', () => {
    const q = buildTodayQueue([slot('c', '18:00'), slot('a', '06:30'), slot('b', '12:15')], []);
    expect(names(q)).toEqual(['Client a', 'Client b', 'Client c']);
  });

  it('sorts across midday and midnight boundaries by minutes, not by string', () => {
    // '09:00' > '10:00' lexically only in the wrong direction; this is exactly
    // the sort that looks fine until 10am.
    const q = buildTodayQueue([slot('late', '10:00'), slot('early', '09:00')], []);
    expect(names(q)).toEqual(['Client early', 'Client late']);
  });

  it('puts unscheduled clients after the booked ones', () => {
    // Nobody has said when they are. Interleaving would mean inventing a time.
    const q = buildTodayQueue([slot('a', '17:00')], [dueClient('x')]);
    expect(names(q)).toEqual(['Client a', 'Due x']);
  });

  it('keeps due clients in the order the server sent them', () => {
    const q = buildTodayQueue([], [dueClient('1'), dueClient('2'), dueClient('3')]);
    expect(names(q)).toEqual(['Due 1', 'Due 2', 'Due 3']);
  });

  it('a booked slot with no time sorts last among the booked, not first', () => {
    const q = buildTodayQueue([slot('untimed', null), slot('a', '07:00')], []);
    expect(names(q)).toEqual(['Client a', 'Client untimed']);
  });

  it('does not mutate the array it was given', () => {
    // .sort() sorts in place; sorting the caller's array would reorder the
    // dashboard's own state behind its back.
    const input = [slot('c', '18:00'), slot('a', '06:30')];
    const before = input.map((s) => s.id);
    buildTodayQueue(input, []);
    expect(input.map((s) => s.id)).toEqual(before);
  });
});

describe('two at a time', () => {
  it('shows two', () => {
    expect(TODAY_VISIBLE).toBe(2);
  });

  // The cap is applied to the FILTERED queue. Applied to the raw list instead,
  // a morning where the first two sessions are done would show two completed
  // rows and hide the two that still need running.
  it('the two shown are the first two still to do, not the first two of the day', () => {
    const q = buildTodayQueue([
      slot('a', '06:00', 'completed'),
      slot('b', '07:00', 'completed'),
      slot('c', '08:00'),
      slot('d', '09:00'),
    ], []);
    expect(names(q.slice(0, TODAY_VISIBLE))).toEqual(['Client c', 'Client d']);
    expect(q.length - TODAY_VISIBLE).toBe(0);
  });

  it('the overflow count counts what is left, not the whole day', () => {
    const q = buildTodayQueue([
      slot('a', '06:00', 'completed'),
      slot('b', '07:00'), slot('c', '08:00'), slot('d', '09:00'), slot('e', '10:00'),
    ], []);
    expect(q).toHaveLength(4);
    expect(q.length - TODAY_VISIBLE).toBe(2);
  });
});

describe('row content', () => {
  it('carries the programme name, and the exercise count for a due client', () => {
    const q = buildTodayQueue([], [dueClient('x', 3)]);
    expect(q[0].sub).toBe('Full Body · 3 exercises');
  });

  it('says "exercise" in the singular for one', () => {
    expect(buildTodayQueue([], [dueClient('x', 1)])[0].sub).toBe('Full Body · 1 exercise');
  });

  it('omits the count when the programme prescribes nothing', () => {
    expect(buildTodayQueue([], [dueClient('x', 0)])[0].sub).toBe('Full Body');
  });

  it('falls back off the useless session title only when there is no programme', () => {
    const withPlan = buildTodayQueue([slot('a', '07:00')], [])[0];
    expect(withPlan.sub).toBe('Full Body');

    const noPlan = buildTodayQueue([{ ...slot('a', '07:00'), plan_name: null }], [])[0];
    expect(noPlan.sub).toBe('PT Session');
  });

  it('keys booked and due rows apart so two ids cannot collide', () => {
    const q = buildTodayQueue([slot('1', '07:00')], [dueClient('1')]);
    expect(new Set(q.map((r) => r.key)).size).toBe(2);
  });

  it('sends each row where it can actually be actioned', () => {
    const q = buildTodayQueue([slot('a', '07:00')], [dueClient('x')]);
    expect(q[0].href).toBe('/pt-os/sessions');
    expect(q[1].href).toBe('/pt-os/today');
  });
});

// ── Enrolment training days ────────────────────────────────────────────────
//
// The third source, and the one the panel was blind to. A studio that books
// nothing into pt_sessions and assigns no workout plan still knows which days
// each client trains — it is a required field on the enrolment form. Before
// this, such a studio was told "Nothing on today" every single day.
describe('clients whose enrolment says they train today', () => {
  it('shows a client with no booked slot and no programme', () => {
    const q = buildTodayQueue([], [], [enrolledClient('c1')]);
    expect(names(q)).toEqual(['Enrolled c1']);
  });

  it('carries the preferred workout time onto the row', () => {
    // Unlike a programme day, the enrolment records WHEN — so the row can say
    // so instead of rendering as untimed.
    expect(buildTodayQueue([], [], [enrolledClient('c1', '06:30')])[0].time).toBe('06:30');
  });

  it('survives a client with no preferred time', () => {
    const row = buildTodayQueue([], [], [enrolledClient('c1', null)])[0];
    expect(row.time).toBeNull();
    expect(row.name).toBe('Enrolled c1');
  });

  it('names the training days so the row explains why it is there', () => {
    expect(buildTodayQueue([], [], [enrolledClient('c1', '06:00', 'Tue, Thu')])[0].sub)
      .toBe('Trains Tue, Thu');
  });

  it('ranks behind booked slots and programme days', () => {
    // Order is by how much is known: a commitment, then a plan, then a habit.
    const q = buildTodayQueue([slot('a', '09:00')], [dueClient('d')], [enrolledClient('e', '06:00')]);
    expect(names(q)).toEqual(['Client a', 'Due d', 'Enrolled e']);
  });

  it('does not interleave an early preferred time among booked slots', () => {
    // 06:00 is earlier than the booked 09:00, and must still sort after it —
    // a habit is not an appointment and must not be shown as one.
    const q = buildTodayQueue([slot('a', '09:00')], [], [enrolledClient('e', '06:00')]);
    expect(names(q)).toEqual(['Client a', 'Enrolled e']);
  });

  it('keys enrolment rows apart from booked and due rows', () => {
    const q = buildTodayQueue([slot('1', '07:00')], [dueClient('1')], [enrolledClient('1')]);
    expect(new Set(q.map((r) => r.key)).size).toBe(3);
  });

  it('sends the row somewhere a session can actually be booked', () => {
    expect(buildTodayQueue([], [], [enrolledClient('c1')])[0].href).toBe('/pt-os/schedule-session');
  });

  it('treats a missing list as empty rather than throwing', () => {
    // The field is optional on OpsData: a backend that predates it, or a
    // cached response, must not blank the whole panel.
    expect(() => buildTodayQueue([slot('a', '07:00')], [])).not.toThrow();
    expect(buildTodayQueue([slot('a', '07:00')], []).length).toBe(1);
  });
});
