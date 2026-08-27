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

/**
 * A session mid-workout: some sets ticked, most not, one a personal best.
 *
 * The mix is the point. A set row renders differently completed, outstanding
 * and PR-flagged, the "mark all done" action only appears while something is
 * outstanding, and the PR banner is the widest thing the card ever carries.
 * All-complete or all-empty fixtures would exercise one of those and hide the
 * rest.
 */
const SESSION_EXERCISES = [
  {
    id: 'se-1',
    session_id: 's-1',
    exercise_id: 'lib-1',
    exercise_name: EXERCISE_NAMES[0],   // the longest name in the library
    notes: 'Deficit from a 25 kg plate. Front shin vertical throughout.',
    sort_order: 0,
    sets: [
      { id: 'st-1', session_exercise_id: 'se-1', set_number: 1, weight_kg: 42.5, reps: 8, rpe: 8, rir: 2, tempo: '3-1-2-0', rest_seconds: 90, completed: true, notes: null, is_pr_weight: true, is_pr_reps: false, is_pr_volume: true, created_at: '2026-07-28T06:05:00.000Z', updated_at: '2026-07-28T06:05:00.000Z' },
      { id: 'st-2', session_exercise_id: 'se-1', set_number: 2, weight_kg: 42.5, reps: 8, rpe: 8.5, rir: 1, tempo: null, rest_seconds: 90, completed: false, notes: null, is_pr_weight: false, is_pr_reps: false, is_pr_volume: false, created_at: '2026-07-28T06:08:00.000Z', updated_at: '2026-07-28T06:08:00.000Z' },
      { id: 'st-3', session_exercise_id: 'se-1', set_number: 3, weight_kg: 1000, reps: 100, rpe: 9.5, rir: 0, tempo: null, rest_seconds: 300, completed: false, notes: null, is_pr_weight: false, is_pr_reps: false, is_pr_volume: false, created_at: '2026-07-28T06:12:00.000Z', updated_at: '2026-07-28T06:12:00.000Z' },
    ],
  },
  {
    id: 'se-2',
    session_id: 's-1',
    exercise_id: 'lib-2',
    exercise_name: 'Barbell Back Squat',
    notes: null,
    sort_order: 1,
    // Every set done: the "mark all done" action must disappear here.
    sets: [
      { id: 'st-4', session_exercise_id: 'se-2', set_number: 1, weight_kg: 100, reps: 5, rpe: 7, rir: 3, tempo: null, rest_seconds: 120, completed: true, notes: null, is_pr_weight: false, is_pr_reps: false, is_pr_volume: false, created_at: '2026-07-28T06:20:00.000Z', updated_at: '2026-07-28T06:20:00.000Z' },
    ],
  },
];

/** What the plan prescribes for this session's weekday, resolved to its week. */
const PLANNED_TODAY = {
  plan_name: LONG_PLAN,
  week: 6,
  duration_weeks: 12,
  progression_type: 'weight',
  source: 'derived',
  exercises: [
    { exercise_id: 'lib-1', name: EXERCISE_NAMES[0], sets: 4, reps: 8, rest_seconds: 90, sort_order: 0, notes: null, target_weight: 72.5, tempo: '3-1-2-0', rpe: 8, warmup_sets: 2, superset_group: 'A', config: { drop_sets: 2 }, week_number: 6 },
    { exercise_id: 'lib-3', name: 'Romanian Deadlift', sets: 3, reps: 10, rest_seconds: 90, sort_order: 1, notes: null, target_weight: 90, tempo: null, rpe: null, warmup_sets: null, superset_group: null, config: null, week_number: 6 },
  ],
};

/**
 * Twelve weeks of attendance with a hole in it.
 *
 * Week 3 has a bonus session and week 5 was missed entirely — together they
 * are the case the panel exists to render honestly, because a naive
 * implementation lets the bonus cancel the miss and reports 100%.
 */
const ADHERENCE_WEEKS = Array.from({ length: 8 }, (_, i) => {
  const d = new Date(Date.UTC(2026, 5, 1) + i * 7 * 86400000);
  const week_start = d.toISOString().slice(0, 10);
  if (i === 2) return { week_start, planned: 3, completed: 3, extra: 1 };
  if (i === 4) return { week_start, planned: 3, completed: 0, extra: 0 };
  if (i === 6) return { week_start, planned: 3, completed: 2, extra: 0 };
  return { week_start, planned: 3, completed: 3, extra: 0 };
});

const ANALYTICS = {
  as_of: '2026-07-30',
  weeks: 12,
  plan: { id: 'p-1', name: LONG_PLAN, duration_weeks: 12 },
  adherence: {
    planned: ADHERENCE_WEEKS.reduce((s, w) => s + w.planned, 0),
    completed: ADHERENCE_WEEKS.reduce((s, w) => s + w.completed, 0),
    pct: 79,
    weeks: ADHERENCE_WEEKS,
  },
  this_week: { week_start: '2026-07-27', missed: [1, 3], remaining: [5] },
  prs: [
    { session_date: '2026-07-28', exercise_name: 'Single-Arm Dumbbell Bulgarian Split Squat (Deficit)', weight_kg: 42.5, reps: 8, kinds: ['weight', 'volume'] },
    { session_date: '2026-07-21', exercise_name: 'Barbell Back Squat', weight_kg: 140, reps: 5, kinds: ['weight'] },
    { session_date: '2026-07-14', exercise_name: 'Pull-Up (Weighted)', weight_kg: 25, reps: 12, kinds: ['reps'] },
    { session_date: '2026-07-02', exercise_name: 'Deadlift', weight_kg: 180, reps: 3, kinds: ['weight', 'reps', 'volume'] },
  ],
  muscles: [
    { target_muscle: 'quadriceps', sets: 26, last_trained: '2026-07-29', days_since: 1, mev_sets: 8, mrv_sets: 20, status: 'above' },
    { target_muscle: 'chest', sets: 14, last_trained: '2026-07-28', days_since: 2, mev_sets: 8, mrv_sets: 22, status: 'within' },
    { target_muscle: 'hamstrings', sets: 3, last_trained: '2026-07-10', days_since: 20, mev_sets: 6, mrv_sets: 20, status: 'below' },
    // No range set for this one — it must render no verdict at all.
    { target_muscle: 'forearms', sets: 6, last_trained: '2026-07-30', days_since: 0, mev_sets: null, mrv_sets: null, status: null },
  ],
  unattributed_sets: 7,
};

const LANDMARKS = [
  { target_muscle: 'chest', mev_sets: 8, mrv_sets: 22, is_custom: false },
  { target_muscle: 'quadriceps', mev_sets: 10, mrv_sets: 18, is_custom: true },
  { target_muscle: 'hamstrings', mev_sets: 6, mrv_sets: 20, is_custom: false },
  { target_muscle: 'forearms', mev_sets: null, mrv_sets: null, is_custom: false },
  { target_muscle: 'shoulders', mev_sets: 8, mrv_sets: 26, is_custom: false },
];

/**
 * The studio dashboard.
 *
 * Neither endpoint had a fixture until now, and the dashboard had no state in
 * the harness at all — so the home screen of the whole application, the one
 * every user sees first, had never been measured at 390px.
 *
 * today_sessions and today_unscheduled are BOTH populated on purpose. A studio
 * that works off programmes has an empty appointment book, and one that works
 * off the diary has no unscheduled clients; the panel has to hold up when both
 * lists are present, which is also the widest it ever gets.
 */
const DASH = {
  active_pt_clients: 128,
  expired_clients: 41,
  clients_with_balance: 17,
  total_monthly_pt_revenue: 1284000,
  total_monthly_commission: 192600,
  total_outstanding: 238500,
  trainers: [
    { id: 't-1', name: 'Ramachandran Subramaniam', active_clients: 34, monthly_revenue: 428000, monthly_commission: 64200 },
  ],
  revenueTrend: Array.from({ length: 6 }, (_, i) => ({
    label: ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'][i],
    month: `2026-0${i + 2}`,
    revenue: 940000 + i * 62000,
    incentives: 141000 + i * 9300,
  })),
};

const OPS = {
  today_sessions: [
    {
      id: 'ps-1', title: 'PT Session', session_date: '2026-07-30',
      start_time: '06:30:00', end_time: '07:30:00', status: 'completed', notes: null,
      client_name: LONG_NAME, client_photo: null, trainer_name: 'Ramachandran Subramaniam',
      plan_name: LONG_PLAN, plan_id: 'p-1',
    },
    {
      id: 'ps-2', title: 'PT Session', session_date: '2026-07-30',
      start_time: '07:30:00', end_time: '08:30:00', status: 'scheduled', notes: null,
      client_name: 'Rahul Mehta', client_photo: null, trainer_name: 'Ramachandran Subramaniam',
      plan_name: 'Upper / Lower', plan_id: 'p-1',
    },
    {
      // A client on no programme at all: the row must fall back to the
      // session title rather than render an empty second line.
      id: 'ps-3', title: 'Assessment', session_date: '2026-07-30',
      start_time: '18:00:00', end_time: '19:00:00', status: 'no_show', notes: null,
      client_name: 'Deeksha Tomar', client_photo: null, trainer_name: null,
      plan_name: null, plan_id: null,
    },
  ],
  today_unscheduled: [
    { assignment_id: 'a-9', client_id: 'c-9', client_name: 'Ajeet Yadav', client_photo: null, plan_id: 'p-1', plan_name: 'Full Body', planned_exercises: 2 },
    { assignment_id: 'a-10', client_id: 'c-10', client_name: 'Prakhar Sharma', client_photo: null, plan_id: 'p-1', plan_name: LONG_PLAN, planned_exercises: 12 },
  ],
  renewals_due: [
    { id: 'c-1', name: LONG_NAME, mobile: '+91 98765 43210', trainer_name: 'Ramachandran Subramaniam', package_type: 'Personal Training — 36 Sessions (Couple)', pt_end_date: '2026-08-02', days_left: 3, balance_amount: 18500, monthly_pt_amount: 12000 },
    { id: 'c-2', name: 'Rahul Mehta', mobile: '+91 98111 22233', trainer_name: null, package_type: 'PT 12', pt_end_date: '2026-08-05', days_left: 6, balance_amount: 0, monthly_pt_amount: 8000 },
  ],
  top_dues: [
    { id: 'c-1', name: LONG_NAME, mobile: '+91 98765 43210', trainer_name: 'Ramachandran Subramaniam', balance_amount: 18500, pt_end_date: '2026-07-20', due_status: 'overdue' },
  ],
  session_stats: { this_month_total: 214, this_month_completed: 186, last_month_completed: 171 },
  trainer_sessions: [
    { trainer_name: 'Ramachandran Subramaniam', completed: 186, scheduled: 22, missed: 6 },
  ],
};

/**
 * A training brief with real gaps in it.
 *
 * Deliberately PARTIAL: readiness, limitations, capacity and goal are filled;
 * body, lifestyle and history are not. A brief where every section is present
 * would never render the "not assessed" state, which is the state that stops
 * an unassessed client looking like a clean one — the whole point of the
 * panel. The shapes come from the endpoint's declared return type.
 */
const SNAPSHOT = {
  alerts: [
    { id: 'pt_expiring', severity: 'critical', label: 'PT expires in 8 days', detail: 'Ends 2026-08-08', href: '#' },
    { id: 'pending_payment', severity: 'warning', label: 'Pending payment', detail: '\u20b94,500 outstanding', href: '#' },
    { id: 'sleep', severity: 'warning', label: 'Sleep poor', detail: '6 h a night', href: '#' },
    { id: 'stale_measurements', severity: 'warning', label: 'No measurements in 34 days', detail: 'Last recorded 2026-06-27', href: '#' },
    { id: 'missed_workout', severity: 'warning', label: 'Missed last workout', detail: '2026-07-28 \u00b7 3 days ago', href: '#' },
    { id: 'weight_change', severity: 'info', label: 'Weight down 2 kg', detail: '80 \u2192 78 kg since 2026-06-01', href: '#' },
  ],
  goal: {
    present: true, goal_type: 'weight_loss', target_date: '2026-10-27',
    target_kg: 70, current_kg: 73.2, start_kg: 80, delta_kg: -6.8, remaining_kg: -3.2, pct: 68,
  },
  prs: [
    { exercise: 'Deadlift', weight_kg: 140, reps: 3, achieved_on: '2026-07-20' },
    { exercise: 'Squat', weight_kg: 120, reps: 5, achieved_on: '2026-07-10' },
    { exercise: 'Bench Press', weight_kg: 85, reps: 3, achieved_on: '2026-07-20' },
    { exercise: 'Overhead Strict Press', weight_kg: 55, reps: 5, achieved_on: '2026-07-14' },
    { exercise: 'Pull Ups', weight_kg: 20, reps: 8, achieved_on: '2026-07-02' },
  ],
  coach: [
    { id: 'recovery', tone: 'warn', text: 'Recovery is scoring 45/100. Consider trimming accessory volume before touching the main lifts.', because: 'Lifestyle assessment \u00b7 recovery score' },
    { id: 'plateau', tone: 'warn', text: 'Progress toward the goal has slowed \u2014 0.3 kg this period against 1.4 kg before it.', because: 'Weight log \u00b7 last 3 readings to 2026-07-27' },
    { id: 'strength', tone: 'good', text: 'Deadlift is their strongest lift on record at 140 kg \u00d7 3.', because: 'Workout log \u00b7 2026-07-20' },
  ],
  baseline_done: true,
  // A deliberately PARTIAL week: soreness unanswered, so the panel has to say
  // "3 of 4" and render one component as "Not asked" rather than as a zero.
  // A complete fixture would never exercise that branch, and that branch is
  // the one that stops a sparse check-in reading as a confident score.
  recovery: {
    present: true,
    score: 58,
    band: 'low',
    inputs: 3,
    max_inputs: 4,
    components: { sleep: 65, stress: 40, energy: 67, soreness: null },
    as_of: '2026-07-27',
    trend: 'declining',
    weeks: [
      { week: '2026-06-29', score: 82 },
      { week: '2026-07-06', score: 79 },
      { week: '2026-07-13', score: 71 },
      { week: '2026-07-20', score: 64 },
      { week: '2026-07-27', score: 58 },
    ],
  },
};

const BRIEF = {
  client: { id: 'c-1', name: LONG_NAME, gender: 'female', age: 32, goal: 'muscle_gain', notes: null },
  sections: {
    readiness: {
      present: true, as_of: '2026-06-18', risk_level: 'low',
      risk_message: null, gate_status: 'cleared', flagged_answers: 1,
      current_health: [], past_history: ['back pain'], blood_group: 'O+',
      notes: 'Cleared by physio in May; avoid loaded spinal flexion for now.',
    },
    body: { present: false },
    capacity: {
      present: true, as_of: '2026-06-18', overall: 63,
      strength: { score: 58, category: 'average' },
      cardio: { score: 71, category: 'good', vo2_max: 38.4 },
      endurance: { score: 60, category: 'average' },
      flexibility: { score: 44, category: 'below average' },
    },
    limitations: {
      present: true,
      posture: { as_of: '2026-06-20', risk_level: 'moderate', issues: ['Anterior Pelvic Tilt', 'Uneven Shoulders'], notes: null },
      mobility: {
        as_of: '2026-06-20', category: 'fair', score: 62,
        // One with both, one with pain only — the two render differently.
        findings: [
          { region: 'Neck', pain: true, restriction: true, score: 3 },
          { region: 'Shoulders', pain: true, restriction: false, score: 3 },
        ],
        notes: null,
      },
      injuries: 'Left rotator cuff strain, 2024 — cleared, still avoids overhead pressing',
      has_asymmetry: true,
    },
    lifestyle: { present: false },
    goal: {
      present: true, as_of: '2026-06-01', goal_type: 'muscle_gain', priority: 'muscle_gain',
      description: null, target_weight: 62, target_body_fat: 24, target_date: '2026-12-01',
      commitment_level: 'high', motivation_level: 'high',
      challenges: ['Poor Diet', 'Office Work', 'Lack of Sleep', 'Inconsistent Routine'],
      estimated_weeks: 24,
    },
    history: { present: false },
  },
  missing: ['body', 'lifestyle', 'history'],
  completeness_pct: 57,
};

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

  // The studio dashboard. /dashboard/ops before /dashboard, or the bare
  // handler swallows the sub-path and the page renders its skeleton forever.
  [/^\/api\/pt-os\/dashboard\/ops$/, () => ({ data: OPS })],
  [/^\/api\/pt-os\/dashboard$/, () => ({ data: DASH })],
  [/^\/api\/pt-os\/informed-consent$/, () => ({
    data: [
      { status: 'signed' }, { status: 'signed' }, { status: 'pending' }, { status: 'not_started' },
    ],
  })],

  // Workout plans. Specific before general — and /versions is a sub-path of
  // /plans/:id, so it has to come first or the plan handler swallows it.
  [/^\/api\/workouts\/plans\/[^/]+\/versions$/, () => PLAN_VERSIONS],
  [/^\/api\/workouts\/plans\/p-2$/, () => EMPTY_PLAN],
  [/^\/api\/workouts\/plans\/[^/]+$/, (q) => (Number(q.get('week')) > 1 ? DERIVED_WEEK : PLAN)],
  [/^\/api\/workouts\/plans$/, () => [PLAN, EMPTY_PLAN]],

  [/^\/api\/workouts\/assignments\/[^/]+$/, () => ({ ...ASSIGNMENT, plan: PLAN })],
  [/^\/api\/workouts\/assignments$/, () => [ASSIGNMENT]],

  // PT-OS clients.
  // Before the bare /clients/:id — a sub-path would otherwise be swallowed
  // by it and the brief panel would render a client object as a brief.
  [/^\/api\/pt-os\/clients\/[^/]+\/training-brief$/, () => ({ data: BRIEF })],
  [/^\/api\/pt-os\/clients\/[^/]+\/snapshot$/, () => ({ data: SNAPSHOT })],
  // The AI coach, answering. Deliberately longer and more specific than the
  // derived lines it replaces — that is the shape that overflows a card.
  [/^\/api\/pt-os\/clients\/[^/]+\/coach$/, () => ({
    data: {
      source: 'ai',
      model: 'openai/gpt-oss-120b',
      facts_key: 'deadbeef',
      insights: [
        { id: 'ai-0', tone: 'warn', source: 'ai', text: 'Six hours of sleep against an intermediate lower-body block is the limiting factor here \u2014 hold total volume where it is for a week rather than adding the planned fourth set.', because: 'Lifestyle assessment \u00b7 sleep 6 h, recovery average' },
        { id: 'ai-1', tone: 'warn', source: 'ai', text: 'The neck is painful and restricted, so keep overhead pressing out and regress to a landmine press until it is reassessed.', because: 'Mobility assessment \u00b7 neck pain + restriction' },
        { id: 'ai-2', tone: 'good', source: 'ai', text: 'Bench at 85 kg for 3 is a genuine record and the trend supports a small load increase next session.', because: 'Workout log \u00b7 2026-07-20' },
      ],
    },
  })],
  // Birthdays MUST come before /clients/:id — `birthdays` is a literal path
  // segment, not an id, so the general handler matched it and returned ONE
  // CLIENT OBJECT where an array is expected. AICoach hands that to
  // buildCoachInsights, which calls .filter on it, so every dashboard run in
  // this harness rendered "Something went wrong" and the route listed first
  // in the table below has never actually had its layout checked at 390px.
  //
  // The real backend orders these correctly and says so on the line above its
  // own route (pt-os.routes.js:220 — "MUST be before /clients/:id"), which is
  // precisely the hazard this table reproduced.
  [/^\/api\/pt-os\/clients\/birthdays$/, () => ({
    data: [
      { id: 'c-2', name: 'Rahul Mehta', mobile: '+91 98111 22233', days_until_birthday: 0 },
      { id: 'c-3', name: 'Deeksha Tomar', mobile: null, days_until_birthday: 4 },
    ],
  })],
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

  [/^\/api\/pt-os\/workout-log\/sessions\/[^/]+\/planned-day-options$/, () => ({ data: ['Monday', 'Wednesday'] })],

  // The session a trainer is actually standing in, WITH its exercises and
  // sets.
  //
  // This returned `exercises: []` until now, so no set row had ever rendered
  // in the harness — and the set-completion control, the most repeated action
  // in the app, shipped at 35px beside a delete button of the same size
  // without anything failing. An empty fixture is not a neutral choice: it
  // silently removes a whole screen from every check.
  [/^\/api\/pt-os\/workout-log\/sessions\/[^/]+$/, () => ({
    data: {
      ...SESSIONS[0],
      exercises: SESSION_EXERCISES,
      planned: PLANNED_TODAY,
      summary: {
        total_sets: 18, total_reps: 164, total_volume: 12480,
        exercises_completed: 5, exercises_total: 6, avg_rpe: 8.5,
        planned_sets: 22, completion_pct: 82, prs: 2,
      },
    },
  })],
  [/^\/api\/pt-os\/workout-log\/sessions/, () => ({ data: SESSIONS })],

  // Analytics: adherence, records, sets per muscle. Deliberately awkward —
  // a missed week, a bonus session, a muscle below its range and one above,
  // a muscle with no range at all, and sets the log could not attribute.
  // Average data would let this screen pass while a real client broke it.
  [/^\/api\/pt-os\/workout-log\/analytics/, () => ({ data: ANALYTICS })],
  [/^\/api\/pt-os\/workout-log\/landmarks/, () => ({ data: LANDMARKS })],

  // `period` and `session_count`, not `date` and `volume`.
  //
  // This fixture used to return { date, volume }, which is not what
  // WorkoutVolumePoint declares — so the volume chart on the analytics screen
  // rendered every bar with an undefined x value and the screenshot showed a
  // chart with blank labels that nothing failed on. Every shape in this file
  // is supposed to come from the declared return type; this one did not.
  [/^\/api\/pt-os\/workout-log\/volume-summary/, () => ({
    data: SESSIONS.map((s) => ({
      period: s.session_date, volume: s.total_volume, session_count: 1,
    })),
  })],

  // A bare array of points, per WorkoutProgressPoint[] — not the
  // { series, exercises } envelope this used to invent.
  [/^\/api\/pt-os\/workout-log\/progress/, () => ({
    data: SESSIONS.map((s, i) => ({
      session_date: s.session_date,
      best_weight: 80 + i * 2.5,
      best_reps: 8,
      est_1rm: 100 + i * 3,
      volume: s.total_volume,
    })),
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
