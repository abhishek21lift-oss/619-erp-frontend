// Fixture responses for the device check.
//
// ── Why the data is deliberately horrible ──────────────────────────────────
//
// Layouts do not break on average data. They break on the client whose name is
// three words long, the exercise called "Single-Arm Dumbbell Bulgarian Split
// Squat (Deficit)", the day with twelve exercises on it, and the 1,000 kg
// deadlift that pushes a number field past its box. Average fixtures would let
// this check pass while a real studio's first week broke every card, so every
// string here is at or past the length the UI should still survive.
//
// ── How matching works ─────────────────────────────────────────────────────
//
// An ordered list of [RegExp, handler]. First match wins, so put specific
// patterns above general ones — /api/workouts/plans/:id must be tested before
// /api/workouts/plans. Anything unmatched is reported by the runner rather than
// quietly 404ing, because a missing fixture is a screen rendering its error
// state, which is not what we came to look at.

const LONG_NAME = 'Priyadarshini Venkataraghavan-Balasubramaniam';
const LONG_PLAN = 'Off-Season Hypertrophy — Upper/Lower Split (Deload Week 4)';

/** Exercises with names chosen to stress the card's title row. */
const EXERCISE_NAMES = [
  'Single-Arm Dumbbell Bulgarian Split Squat (Deficit)',
  'Barbell Back Squat',
  'Romanian Deadlift',
  'Seated Cable Row — Neutral Grip, Chest Supported',
  'Incline Dumbbell Press',
  'Lat Pulldown',
  'Walking Lunge',
  'Face Pull',
  'Hanging Leg Raise',
  'Standing Calf Raise',
  'Cable Woodchopper (High to Low)',
  'Farmer Carry',
];

/**
 * One day carrying twelve exercises, the rest carrying a realistic two or
 * three. A day tab with a two-digit count is its own small layout case.
 */
function planExercises() {
  const rows = [];
  let i = 0;

  const push = (day, name, extra = {}) => {
    rows.push({
      id: `ex-${++i}`,
      exercise_id: `lib-${i}`,
      name,
      muscle_group: 'Quadriceps / Glutes',
      sets: 4,
      reps: 12,
      rest_seconds: 90,
      day_of_week: day,
      sort_order: rows.filter((r) => r.day_of_week === day).length,
      notes: null,
      target_weight: null,
      tempo: null,
      rpe: null,
      warmup_sets: null,
      superset_group: null,
      config: null,
      ...extra,
    });
  };

  // Monday: the crowded day, and the first card carries every optional
  // parameter at once — the widest the card can legitimately get.
  EXERCISE_NAMES.forEach((name, idx) => {
    push(1, name, idx === 0
      ? {
        sets: 12, reps: 100, rest_seconds: 300,
        target_weight: 1000, tempo: '3-1-2-0', rpe: 9.5,
        warmup_sets: 3, superset_group: 'A',
        notes: 'Deficit from a 25 kg plate. Keep the front shin vertical and do '
             + 'not let the trailing knee touch down between reps.',
      }
      : {});
  });

  push(3, 'Barbell Bench Press');
  push(3, 'Pull-Up (Weighted)');
  push(5, 'Deadlift');

  return rows;
}

const PLAN = {
  id: 'p-1',
  name: LONG_PLAN,
  description: 'Four-week accumulation block.',
  goal: 'muscle_gain',
  difficulty: 'intermediate',
  duration_weeks: 4,
  sessions_per_week: 3,
  is_template: false,
  is_active: true,
  created_by: 'u-1',
  created_at: '2026-06-01T08:00:00.000Z',
  updated_at: '2026-07-28T08:00:00.000Z',
  exercise_count: 15,
  progress: 42,
  exercises: planExercises(),

  // A programme with a rule, so the week stepper and the ramp lines render.
  // Without one the builder hides both and the states below audit nothing.
  progression_type: 'weight',
  progression_amount: 2.5,
  progression_every_weeks: 1,
  version: 3,
  parent_plan_id: null,
  week: 1,
  week_source: 'base',
  // Only the exercise that HAS a prescribed weight ramps. The rest are null
  // under a weight rule and must render no ramp line at all — inventing a
  // starting load to draw an arrow from would be a number nobody typed.
  progression_preview: [
    {
      id: 'ex-1',
      first: { week: 1, target_weight: 1000, reps: 100, rpe: 9.5 },
      last: { week: 4, target_weight: 1007.5, reps: 100, rpe: 9.5 },
    },
  ],
};

/** What GET /plans/:id?week=N returns: the same rows, numbers moved on. */
const DERIVED_WEEK = {
  ...PLAN,
  week: 3,
  week_source: 'derived',
  progression_preview: null,
  exercises: planExercises().map((r) => ({
    ...r,
    week_number: 3,
    target_weight: r.target_weight == null ? null : r.target_weight + 5,
  })),
};

/** Archived states of the plan — read-only history, newest first. */
const PLAN_VERSIONS = [
  {
    id: 'pv-2', version: 2, created_at: '2026-06-24T09:12:00.000Z',
    created_by_name: 'Ramachandran Subramaniam', duration_weeks: 4,
    progression_type: 'weight', progression_amount: 2.5, progression_every_weeks: 1,
    exercise_count: 15,
  },
  {
    id: 'pv-1', version: 1, created_at: '2026-06-01T08:00:00.000Z',
    created_by_name: 'Ramachandran Subramaniam', duration_weeks: 4,
    progression_type: 'none', progression_amount: null, progression_every_weeks: 1,
    exercise_count: 11,
  },
];

/** A second plan with nothing in it — the empty day and zero-count case. */
const EMPTY_PLAN = {
  ...PLAN,
  id: 'p-2',
  name: 'Rehab — Lower Back',
  exercise_count: 0,
  progress: 0,
  exercises: [],
};

const CLIENT = {
  id: 'c-1',
  name: LONG_NAME,
  email: 'priyadarshini.venkataraghavan@averylongdomainname.example.com',
  mobile: '+91 98765 43210',
  gender: 'female',
  dob: '1994-03-17',
  status: 'active',
  goal: 'muscle_gain',
  trainer_id: 't-1',
  trainer_name: 'Ramachandran Subramaniam',
  created_at: '2026-01-04T06:30:00.000Z',
  avatar_url: null,
  package_name: 'Personal Training — 36 Sessions (Couple)',
  sessions_total: 36,
  sessions_used: 29,
  sessions_remaining: 7,
};

const ASSIGNMENT = {
  id: 'a-1',
  workout_plan_id: 'p-1',
  client_id: 'c-1',
  trainer_id: 't-1',
  start_date: '2026-07-01',
  end_date: '2026-07-29',
  status: 'active',
  progress_pct: 42,
  notes: null,
  created_at: '2026-07-01T06:00:00.000Z',
  updated_at: '2026-07-28T06:00:00.000Z',
  plan_name: LONG_PLAN,
  goal: 'muscle_gain',
  difficulty: 'intermediate',
  duration_weeks: 4,
  sessions_per_week: 3,
  client_name: LONG_NAME,
};

/** Logged sessions, one of them with a long free-text note. */
const SESSIONS = Array.from({ length: 8 }, (_, i) => ({
  id: `s-${i + 1}`,
  client_id: 'c-1',
  trainer_id: 't-1',
  workout_plan_id: 'p-1',
  plan_name: LONG_PLAN,
  session_date: `2026-07-${String(28 - i * 3).padStart(2, '0')}`,
  day_of_week: (i % 7) + 1,
  status: i === 0 ? 'in_progress' : 'completed',
  duration_minutes: 62,
  total_volume: 12480 + i * 315,
  notes: i === 1
    ? 'Felt strong on the main lift but the accessory work was cut short because '
    + 'the squat rack was occupied for the second half of the session.'
    : null,
  exercise_count: 6,
  set_count: 22,
  created_at: '2026-07-28T06:00:00.000Z',
}));

/** Matches the ExerciseLite shape the picker reads (ExercisePicker.tsx:9). */
const LIBRARY = EXERCISE_NAMES.map((name, i) => ({
  id: `lib-${i + 1}`,
  name,
  body_part: ['Back', 'Chest', 'Legs', 'Shoulders'][i % 4],
  target_muscle: ['Latissimus Dorsi', 'Pectoralis Major', 'Quadriceps', 'Deltoids'][i % 4],
  equipment: ['Barbell', 'Dumbbell', 'Cable', 'Bodyweight'][i % 4],
  muscle_group: ['Back', 'Chest', 'Legs', 'Shoulders'][i % 4],
  difficulty: 'intermediate',
  demo_url: null,
  is_active: true,
}));

// ── The routing table ───────────────────────────────────────────────────────

const ROUTES = [
  // Boot: the three calls every guarded page makes before it renders anything.
  [/^\/api\/auth\/me$/, () => ({
    user: {
      id: 'u-1',
      name: 'Ramachandran Subramaniam',
      email: 'coach@619.example.com',
      role: 'trainer',
      trainer_id: 't-1',
      is_active: true,
      organization_id: 'org-1',
      organization_name: '619 Fitness — Indiranagar Flagship Studio',
      organization_logo_url: null,
    },
  })],
  [/^\/api\/features$/, () => ({
    data: {
      pt_os: true, workouts: true, diet: true, progress: true,
      payments: true, classes: true, reports: true, ai: true,
    },
  })],
  [/^\/api\/settings\/permissions$/, () => ({ permissions: {}, role: 'trainer' })],

  // Workout plans. Specific before general — and /versions is a sub-path of
  // /plans/:id, so it has to come first or the plan handler swallows it.
  [/^\/api\/workouts\/plans\/[^/]+\/versions$/, () => PLAN_VERSIONS],
  [/^\/api\/workouts\/plans\/p-2$/, () => EMPTY_PLAN],
  [/^\/api\/workouts\/plans\/[^/]+$/, (q) => (Number(q.get('week')) > 1 ? DERIVED_WEEK : PLAN)],
  [/^\/api\/workouts\/plans$/, () => [PLAN, EMPTY_PLAN]],

  [/^\/api\/workouts\/assignments\/[^/]+$/, () => ({ ...ASSIGNMENT, plan: PLAN })],
  [/^\/api\/workouts\/assignments$/, () => [ASSIGNMENT]],

  // PT-OS clients.
  [/^\/api\/pt-os\/clients\/[^/]+$/, () => ({ data: CLIENT })],
  [/^\/api\/pt-os\/clients$/, () => ({ data: [CLIENT] })],

  // Exercise library, behind the picker.
  //
  // Both shapes are taken from the declared return types in
  // endpoints/training.ts, not guessed: list returns a BARE ARRAY and meta
  // returns body_parts. Inventing a { data: [...] } envelope here made the
  // picker throw "j.map is not a function" and take the whole pt-os segment
  // down to its error boundary — which looked exactly like an app bug.
  [/^\/api\/workouts\/exercises\/meta/, () => ({
    body_parts: ['Back', 'Chest', 'Legs', 'Shoulders', 'Arms', 'Core'],
    equipment_types: ['Barbell', 'Dumbbell', 'Cable', 'Bodyweight', 'Machine'],
    exercise_types: ['strength', 'cardio', 'mobility'],
    difficulties: ['beginner', 'intermediate', 'advanced'],
    total: LIBRARY.length,
  })],
  [/^\/api\/workouts\/exercises/, () => LIBRARY],

  // Workout log. Note the prefix is /api/pt-os/workout-log, not
  // /api/progress/... — the client namespace is progress.workoutLog but the
  // URL is not, and guessing it from the namespace produced eight screens
  // rendering their empty state on the first run.
  // Today's roster — the screen a trainer opens daily. Deliberately mixed:
  // one client mid-session, one not started, one on a rest day, and one long
  // enough name to test the row.
  [/^\/api\/pt-os\/workout-log\/today/, () => ({
    data: {
      date: '2026-07-30',
      day_of_week: 'Thursday',
      clients: [
        { assignment_id: 'a-1', client_id: 'c-1', client_name: LONG_NAME, client_photo: null,
          plan_id: 'p-1', plan_name: LONG_PLAN, progress_pct: 42,
          planned_exercises: 12, is_rest_day: false, session_id: null, session_status: null },
        { assignment_id: 'a-2', client_id: 'c-2', client_name: 'Rahul Mehta', client_photo: null,
          plan_id: 'p-1', plan_name: 'Upper / Lower', progress_pct: 18,
          planned_exercises: 5, is_rest_day: false, session_id: 's-1', session_status: 'in_progress' },
        { assignment_id: 'a-3', client_id: 'c-3', client_name: 'Deeksha Tomar', client_photo: null,
          plan_id: 'p-2', plan_name: 'Rehab — Lower Back', progress_pct: 60,
          planned_exercises: 0, is_rest_day: true, session_id: null, session_status: null },
        { assignment_id: 'a-4', client_id: 'c-4', client_name: 'Sachin', client_photo: null,
          plan_id: 'p-1', plan_name: 'Full Body', progress_pct: 90,
          planned_exercises: 4, is_rest_day: false, session_id: 's-2', session_status: 'completed' },
      ],
    },
  })],

  [/^\/api\/pt-os\/workout-log\/sessions\/[^/]+\/planned-day-options$/, () => ({ data: [] })],
  [/^\/api\/pt-os\/workout-log\/sessions\/[^/]+$/, () => ({
    data: {
      ...SESSIONS[0],
      exercises: [],
      planned: null,
      summary: {
        total_sets: 18, total_reps: 164, total_volume: 12480,
        exercises_completed: 5, exercises_total: 6, avg_rpe: 8.5,
        planned_sets: 22, completion_pct: 82, prs: 2,
      },
    },
  })],
  [/^\/api\/pt-os\/workout-log\/sessions/, () => ({ data: SESSIONS })],
  [/^\/api\/pt-os\/workout-log\/volume-summary/, () => ({
    data: SESSIONS.map((s) => ({ date: s.session_date, volume: s.total_volume })),
  })],
  [/^\/api\/pt-os\/workout-log\/progress/, () => ({
    data: {
      series: SESSIONS.map((s) => ({
        date: s.session_date, value: s.total_volume, sets: s.set_count,
      })),
      exercises: LIBRARY.slice(0, 5).map((e) => ({ id: e.id, name: e.name })),
    },
  })],
  [/^\/api\/pt-os\/workout-log\/previous/, () => ({ data: null })],
  [/^\/api\/pt-os\/workout-log/, () => ({ data: [] })],


  // The bell in the top bar polls this on every page.
  [/^\/api\/v1\/notifications/, () => ({ data: [], unread: 0 })],

  // The client profile's remaining tiles. Empty rather than populated: they
  // are not what this pass is looking at, and an empty list still renders the
  // card at full width, which is what the overflow check needs. Listed
  // explicitly so they do not show up as missing fixtures and hide a real one.
  [/^\/api\/progress\/(assessments|goals|weekly-checkins)/, () => ({ data: [] })],
  [/^\/api\/pt-os\/clients\/[^/]+\/subscriptions/, () => ({ data: [] })],
  [/^\/api\/pt-os\/(informed-consent|parq\/forms|payments)/, () => ({ data: [] })],
  [/^\/api\/qr\/generate\//, () => ({ data: { qr: null } })],
];

/**
 * Resolve one intercepted request.
 *
 * Returns null when nothing matches so the runner can report the path. A
 * silent empty response would look like a working screen with no data, which
 * is exactly the failure mode that makes mocked screenshots untrustworthy.
 */
export function resolve(pathname, search = '') {
  // `search` is passed because a few endpoints answer differently per query —
  // /plans/:id?week=3 returns the derived week, not the authored one. Handlers
  // that do not care simply ignore the argument.
  const params = new URLSearchParams(search);
  for (const [pattern, handler] of ROUTES) {
    if (pattern.test(pathname)) return handler(params);
  }
  return null;
}

export const IDS = { client: 'c-1', plan: 'p-1', emptyPlan: 'p-2', session: 's-1' };
