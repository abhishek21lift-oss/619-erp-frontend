// What "Today's Sessions" shows, and in what order.
//
// ── What changed, and why the old tests went with it ───────────────────────
//
// This used to take three lists off the ops summary — booked slots, programme
// days, enrolment days — and sort and concatenate them itself. Which meant the
// card and the /pt-os/today page it links to each decided the order of the day
// independently, from different queries, and were free to disagree about who
// was next. They did: the card grouped by how much was known (a booking, then
// a plan, then a habit) while a trainer reads the day off a clock.
//
// The server orders once now and both screens render what they are given. So
// the ordering assertions here are gone — there is nothing left to sort — and
// what remains is the part that is still this function's job, plus one new
// assertion that is more important than any of the old ones: that it does NOT
// reorder what it was handed.
//
// Everything below fails silently. A completed session left in the list looks
// exactly like one still to run. A re-sorted queue looks like a queue.

import { describe, expect, it } from 'vitest';
import { buildTodayQueue, TODAY_VISIBLE } from '@/components/dashboards/PtOsDashboard';
import type { TodayClient } from '@/lib/api';

const row = (over: Partial<TodayClient> & { client_id: string }): TodayClient => ({
  assignment_id: 'a-' + over.client_id,
  client_name: `Client ${over.client_id}`,
  client_photo: null,
  plan_id: 'p1',
  plan_name: 'Full Body',
  progress_pct: 0,
  planned_exercises: 2,
  start_time: null,
  source: 'programme',
  is_rest_day: false,
  session_id: null,
  session_status: null,
  ...over,
});

const names = (rows: ReturnType<typeof buildTodayQueue>) => rows.map((r) => r.name);

describe('finished and resting clients leave the list', () => {
  it('drops a completed session', () => {
    const q = buildTodayQueue([
      row({ client_id: 'a', session_status: 'completed' }),
      row({ client_id: 'b' }),
    ]);
    expect(names(q)).toEqual(['Client b']);
  });

  it('keeps an in-progress one, which is unresolved rather than finished', () => {
    const q = buildTodayQueue([row({ client_id: 'a', session_status: 'in_progress' })]);
    expect(names(q)).toEqual(['Client a']);
  });

  it('drops a rest day', () => {
    // A rest day is a real answer on the full list, where there is room to say
    // "nothing scheduled". It is not one of the two things left to do.
    const q = buildTodayQueue([
      row({ client_id: 'a', is_rest_day: true }),
      row({ client_id: 'b' }),
    ]);
    expect(names(q)).toEqual(['Client b']);
  });

  it('a fully completed day leaves an empty queue, not a list of ticks', () => {
    const q = buildTodayQueue([
      row({ client_id: 'a', session_status: 'completed' }),
      row({ client_id: 'b', session_status: 'completed' }),
    ]);
    expect(q).toEqual([]);
  });
});

describe('the server\'s order is preserved exactly', () => {
  it('does not re-sort by time', () => {
    // The single most important property here. The roster arrives ordered —
    // earliest first, untimed after, rest days last — and any sort applied on
    // top is a second opinion about the day that the full list does not share.
    const q = buildTodayQueue([
      row({ client_id: 'late', start_time: '18:00' }),
      row({ client_id: 'early', start_time: '06:00' }),
    ]);
    expect(names(q)).toEqual(['Client late', 'Client early']);
  });

  it('does not float timed rows above untimed ones', () => {
    const q = buildTodayQueue([
      row({ client_id: 'untimed', start_time: null }),
      row({ client_id: 'timed', start_time: '07:00' }),
    ]);
    expect(names(q)).toEqual(['Client untimed', 'Client timed']);
  });

  it('does not mutate the array it was given', () => {
    const input = [row({ client_id: 'a' }), row({ client_id: 'b' })];
    const before = input.map((c) => c.client_id);
    buildTodayQueue(input);
    expect(input.map((c) => c.client_id)).toEqual(before);
  });

  it('closes the gaps left by filtering, keeping relative order', () => {
    const q = buildTodayQueue([
      row({ client_id: 'a', start_time: '06:00' }),
      row({ client_id: 'skip', session_status: 'completed' }),
      row({ client_id: 'b', start_time: '07:00' }),
    ]);
    expect(names(q)).toEqual(['Client a', 'Client b']);
  });
});

describe('the running session comes first', () => {
  // The two visible rows answer two questions: who is on the floor now, and
  // who is next. A client who is mid-session is the first of those whatever
  // the clock says, and the roster arrives in clock order, so this is the one
  // thing this function reorders.

  it('floats a started session above an earlier one that has not started', () => {
    const q = buildTodayQueue([
      row({ client_id: 'early', start_time: '06:00' }),
      row({ client_id: 'running', start_time: '07:30', session_status: 'in_progress' }),
    ]);
    expect(names(q)).toEqual(['Client running', 'Client early']);
  });

  it('leaves the rest in the server\'s order behind it', () => {
    const q = buildTodayQueue([
      row({ client_id: 'first', start_time: '06:00' }),
      row({ client_id: 'second', start_time: '07:00' }),
      row({ client_id: 'running', start_time: '09:00', session_status: 'in_progress' }),
      row({ client_id: 'third', start_time: '08:00' }),
    ]);
    // Note 'third' stays after 'second' even though its clock time is later
    // than 'running' and earlier than nothing — the queue is not re-sorted,
    // only partitioned.
    expect(names(q)).toEqual(['Client running', 'Client first', 'Client second', 'Client third']);
  });

  it('keeps two running sessions in the order the server gave them', () => {
    // Two logs open at once is unusual but real — a trainer running a pair.
    const q = buildTodayQueue([
      row({ client_id: 'a', start_time: '07:00', session_status: 'in_progress' }),
      row({ client_id: 'b', start_time: '06:00', session_status: 'in_progress' }),
    ]);
    expect(names(q)).toEqual(['Client a', 'Client b']);
  });

  it('promotes the next client the moment the running one finishes', () => {
    // The whole sequence, as the trainer lives it. Finish workout sets the
    // session to completed; the row drops out and second becomes first with
    // nothing else having to happen.
    const roster = [
      row({ client_id: 'a', start_time: '06:00', session_status: 'in_progress' }),
      row({ client_id: 'b', start_time: '07:00' }),
      row({ client_id: 'c', start_time: '08:00' }),
    ];
    expect(names(buildTodayQueue(roster))).toEqual(['Client a', 'Client b', 'Client c']);

    const afterFinish = roster.map((r) => (r.client_id === 'a' ? { ...r, session_status: 'completed' as const } : r));
    expect(names(buildTodayQueue(afterFinish))).toEqual(['Client b', 'Client c']);

    const bStarts = afterFinish.map((r) => (r.client_id === 'b' ? { ...r, session_status: 'in_progress' as const } : r));
    expect(names(buildTodayQueue(bStarts))).toEqual(['Client b', 'Client c']);
  });

  it('does not promote a rest day just because something is running', () => {
    const q = buildTodayQueue([
      row({ client_id: 'rest', is_rest_day: true, session_status: 'in_progress' }),
      row({ client_id: 'b' }),
    ]);
    expect(names(q)).toEqual(['Client b']);
  });
});

describe('each row knows whether it is running', () => {
  // The card labels rows LIVE and NEXT, and it cannot work that out from the
  // position alone: the queue puts a running session first, so "row one is
  // running" is false on every morning nobody has started yet — which is most
  // of them. The flag travels with the row.

  it('marks a started session live', () => {
    const q = buildTodayQueue([row({ client_id: 'a', session_status: 'in_progress' })]);
    expect(q[0].live).toBe(true);
  });

  it('does not mark a session nobody has started', () => {
    const q = buildTodayQueue([row({ client_id: 'a' })]);
    expect(q[0].live).toBe(false);
  });

  it('marks only the ones that are actually running', () => {
    const q = buildTodayQueue([
      row({ client_id: 'running', session_status: 'in_progress' }),
      row({ client_id: 'waiting' }),
      row({ client_id: 'also-waiting' }),
    ]);
    expect(q.map((r) => r.live)).toEqual([true, false, false]);
  });

  it('a queue with nothing running has no live row at all', () => {
    // The case that made this necessary. Every row false, so the card labels
    // row one NEXT rather than telling the trainer somebody is mid-set.
    const q = buildTodayQueue([row({ client_id: 'a' }), row({ client_id: 'b' })]);
    expect(q.some((r) => r.live)).toBe(false);
  });
});

describe('two at a time', () => {
  it('shows two', () => {
    expect(TODAY_VISIBLE).toBe(2);
  });

  // The cap is applied to the FILTERED queue. Applied to the raw roster
  // instead, a morning where the first two are done would show two completed
  // rows and hide the two that still need running.
  it('the two shown are the first two still to do, not the first two of the day', () => {
    const q = buildTodayQueue([
      row({ client_id: 'a', session_status: 'completed' }),
      row({ client_id: 'b', session_status: 'completed' }),
      row({ client_id: 'c' }),
      row({ client_id: 'd' }),
    ]);
    expect(names(q.slice(0, TODAY_VISIBLE))).toEqual(['Client c', 'Client d']);
    expect(q.length - TODAY_VISIBLE).toBe(0);
  });

  it('the overflow count counts what is left, not the whole day', () => {
    const q = buildTodayQueue([
      row({ client_id: 'a', session_status: 'completed' }),
      row({ client_id: 'b' }), row({ client_id: 'c' }),
      row({ client_id: 'd' }), row({ client_id: 'e' }),
    ]);
    expect(q).toHaveLength(4);
    expect(q.length - TODAY_VISIBLE).toBe(2);
  });
});

describe('row content', () => {
  it('carries the programme name and the exercise count', () => {
    expect(buildTodayQueue([row({ client_id: 'x', planned_exercises: 3 })])[0].sub)
      .toBe('Full Body · 3 exercises');
  });

  it('says "exercise" in the singular for one', () => {
    expect(buildTodayQueue([row({ client_id: 'x', planned_exercises: 1 })])[0].sub)
      .toBe('Full Body · 1 exercise');
  });

  it('omits the count when the programme prescribes nothing', () => {
    expect(buildTodayQueue([row({ client_id: 'x', planned_exercises: 0 })])[0].sub)
      .toBe('Full Body');
  });

  it('says so when there is no programme at all', () => {
    // The state this whole change exists to surface: a client booked in with
    // no plan written yet. Interpolating plan_name here would read
    // "null · 0 exercises".
    expect(buildTodayQueue([row({ client_id: 'x', plan_name: null, planned_exercises: 0 })])[0].sub)
      .toBe('No programme yet');
  });

  it('carries the time through for a booked slot', () => {
    expect(buildTodayQueue([row({ client_id: 'x', start_time: '06:30' })])[0].time).toBe('06:30');
  });

  it('keys on the client, who appears at most once', () => {
    // The roster is deduplicated per client server-side, so the client id is
    // a stable key — and unlike the old assignment id it exists for a client
    // with no programme.
    const q = buildTodayQueue([row({ client_id: '1' }), row({ client_id: '2' })]);
    expect(new Set(q.map((r) => r.key)).size).toBe(2);
  });

  it('sends every row to the full list, in that same order', () => {
    // Tapping any row opens the day; each client has their own Start button
    // there. Three different destinations by source was the old behaviour and
    // meant the same tap did different things depending on the row.
    const q = buildTodayQueue([
      row({ client_id: 'a', source: 'booked' }),
      row({ client_id: 'b', source: 'programme' }),
      row({ client_id: 'c', source: 'enrolled' }),
    ]);
    expect(q.map((r) => r.href)).toEqual(['/pt-os/today', '/pt-os/today', '/pt-os/today']);
  });
});
