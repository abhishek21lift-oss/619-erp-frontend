// How an exercise is measured, and therefore which numbers every training
// surface asks for: the plan builder, the trainer's logger and the member app.
//
// The source of truth is `exercises.prescription_mode_primary` (backend
// migrations 174 + 221). Every surface asks this file rather than looking at
// the category, so an exercise is never "cardio in the logger but sets × reps
// in the builder". A plan row may override the default with
// `config.tracking_mode`, limited to the modes the exercise allows.

export type TrackingMode =
  | 'WEIGHT_REPS' | 'BODYWEIGHT' | 'REPS' | 'HOLD'
  | 'TIME' | 'DISTANCE' | 'SPEED' | 'PACE' | 'TIME_SPEED' | 'TIME_DISTANCE'
  | 'DISTANCE_LOAD' | 'TIME_LOAD' | 'CALORIES' | 'HEART_RATE' | 'RPE' | 'INTERVAL'
  | 'ROUNDS' | 'RPM' | 'STEPS' | 'FLOORS';

/**
 * The five shapes a set can take. Everything a screen renders follows from
 * which one an exercise is.
 *
 *   load_reps  load × reps                bench press, leg press
 *   reps       reps, load optional        push-up, band pull-apart
 *   hold       seconds, load optional     plank, stretches
 *   carry      distance (or time) + load  farmer's walk, sled push
 *   cardio     time / distance / pace …   treadmill, rower, skipping
 */
export type TrackingKind = 'load_reps' | 'reps' | 'hold' | 'carry' | 'cardio';

const KIND_OF: Record<TrackingMode, TrackingKind> = {
  WEIGHT_REPS: 'load_reps',
  BODYWEIGHT: 'reps',
  REPS: 'reps',
  HOLD: 'hold',
  DISTANCE_LOAD: 'carry',
  TIME_LOAD: 'carry',
  TIME: 'cardio', DISTANCE: 'cardio', SPEED: 'cardio', PACE: 'cardio',
  TIME_SPEED: 'cardio', TIME_DISTANCE: 'cardio', CALORIES: 'cardio',
  HEART_RATE: 'cardio', RPE: 'cardio', INTERVAL: 'cardio', ROUNDS: 'cardio',
  RPM: 'cardio', STEPS: 'cardio', FLOORS: 'cardio',
};

export const TRACKING_MODES = Object.keys(KIND_OF) as TrackingMode[];

/** Short, trainer-facing names for a mode picker. */
export const TRACKING_MODE_LABEL: Record<TrackingMode, string> = {
  WEIGHT_REPS: 'Load × reps',
  BODYWEIGHT: 'Bodyweight reps',
  REPS: 'Reps',
  HOLD: 'Hold (time)',
  DISTANCE_LOAD: 'Distance + load',
  TIME_LOAD: 'Time + load',
  TIME: 'Time',
  DISTANCE: 'Distance',
  SPEED: 'Speed',
  PACE: 'Pace',
  TIME_SPEED: 'Time + speed',
  TIME_DISTANCE: 'Time + distance',
  CALORIES: 'Calories',
  HEART_RATE: 'Heart rate',
  RPE: 'RPE',
  INTERVAL: 'Intervals',
  ROUNDS: 'Rounds',
  RPM: 'Cadence',
  STEPS: 'Steps',
  FLOORS: 'Floors',
};

/** The modes offered when authoring an exercise — one per kind is enough to start. */
export const PRIMARY_MODE_CHOICES: TrackingMode[] = [
  'WEIGHT_REPS', 'BODYWEIGHT', 'REPS', 'HOLD', 'DISTANCE_LOAD', 'TIME', 'TIME_DISTANCE', 'TIME_SPEED',
];

export function isTrackingMode(v: unknown): v is TrackingMode {
  return typeof v === 'string' && v in KIND_OF;
}

/**
 * The kind for a mode. `exerciseType` is the fallback for rows that predate
 * modes: a Cardio exercise without one is still cardio, anything else is
 * load × reps — exactly how every exercise behaved before modes existed.
 */
export function trackingKind(mode: string | null | undefined, exerciseType?: string | null): TrackingKind {
  if (isTrackingMode(mode)) return KIND_OF[mode];
  if ((exerciseType || '').toLowerCase() === 'cardio') return 'cardio';
  return 'load_reps';
}

export interface TrackedExercise {
  prescription_mode_primary?: string | null;
  prescription_mode_allowed?: string[] | null;
  exercise_type?: string | null;
  config?: Record<string, unknown> | null;
}

/** The modes a trainer may switch this exercise to, primary first. */
export function allowedModes(ex: TrackedExercise): TrackingMode[] {
  const out: TrackingMode[] = [];
  if (isTrackingMode(ex.prescription_mode_primary)) out.push(ex.prescription_mode_primary);
  for (const m of ex.prescription_mode_allowed ?? []) {
    if (isTrackingMode(m) && !out.includes(m)) out.push(m);
  }
  return out;
}

/**
 * The mode a planned row is actually tracked in: the row's own override when
 * the exercise allows it, else the exercise's default.
 */
export function effectiveMode(ex: TrackedExercise): TrackingMode | null {
  const override = ex.config?.tracking_mode;
  const allowed = allowedModes(ex);
  if (isTrackingMode(override) && (allowed.length === 0 || allowed.includes(override))) return override;
  return isTrackingMode(ex.prescription_mode_primary) ? ex.prescription_mode_primary : null;
}

export function effectiveKind(ex: TrackedExercise): TrackingKind {
  return trackingKind(effectiveMode(ex), ex.exercise_type);
}

/** What the kind asks for, so every surface lays out the same fields. */
export interface KindFields {
  reps: boolean;
  /** 'required' = the point of the exercise; 'optional' = added load. */
  load: 'required' | 'optional' | 'none';
  duration: boolean;
  distance: boolean;
  /** How duration is entered: seconds for a hold, minutes for cardio. */
  durationUnit: 'seconds' | 'minutes';
  loadLabel: string;
}

export function kindFields(kind: TrackingKind): KindFields {
  switch (kind) {
    case 'reps':
      return { reps: true, load: 'optional', duration: false, distance: false, durationUnit: 'seconds', loadLabel: 'Added load' };
    case 'hold':
      return { reps: false, load: 'optional', duration: true, distance: false, durationUnit: 'seconds', loadLabel: 'Added load' };
    case 'carry':
      return { reps: false, load: 'required', duration: false, distance: true, durationUnit: 'seconds', loadLabel: 'Load' };
    case 'cardio':
      return { reps: false, load: 'none', duration: true, distance: true, durationUnit: 'minutes', loadLabel: 'Load' };
    default:
      return { reps: true, load: 'required', duration: false, distance: false, durationUnit: 'seconds', loadLabel: 'Weight' };
  }
}

export type DistanceUnit = 'm' | 'km' | 'mile';

/** Time/distance targets kept in workout_exercises.config (migration 136). */
export interface TimedTargets {
  duration_seconds: number | null;
  distance: number | null;
  distance_unit: DistanceUnit;
}

const nonNeg = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

export function timedTargets(config: Record<string, unknown> | null | undefined): TimedTargets {
  const c = config ?? {};
  const unit = c.distance_unit;
  return {
    duration_seconds: nonNeg(c.duration_seconds),
    distance: nonNeg(c.distance),
    distance_unit: unit === 'km' || unit === 'mile' ? unit : 'm',
  };
}

/** "45s", "2 min", "1 min 30s" — never "90 seconds" on a card this small. */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return '';
  const s = Math.round(seconds);
  if (s < 60) return `${s}s`;
  const min = Math.floor(s / 60);
  const rest = s % 60;
  return rest === 0 ? `${min} min` : `${min} min ${rest}s`;
}

export function formatDistance(distance: number | null | undefined, unit: string | null | undefined = 'm'): string {
  if (distance == null || !Number.isFinite(distance)) return '';
  return `${distance} ${unit || 'm'}`;
}

/**
 * One line describing a planned prescription in the exercise's own terms:
 * "3 × 10 @ 60 kg", "3 × 45s", "3 × 40 m @ 32 kg", "20 min · 3 km".
 */
export function describePrescription(p: {
  kind: TrackingKind;
  sets?: number | null;
  reps?: number | null;
  target_weight?: number | null;
  duration_seconds?: number | null;
  distance?: number | null;
  distance_unit?: string | null;
}): string {
  const sets = p.sets != null && p.sets > 0 ? p.sets : null;
  const load = p.target_weight != null ? `${p.target_weight} kg` : null;
  const dur = formatDuration(p.duration_seconds);
  const dist = formatDistance(p.distance, p.distance_unit);
  const times = (v: string) => (sets ? `${sets} × ${v}` : v);
  const parts: string[] = [];

  switch (p.kind) {
    case 'hold':
      if (dur) parts.push(times(dur)); else if (sets) parts.push(`${sets} sets`);
      if (load) parts.push(`+${load}`);
      break;
    case 'carry':
      if (dist) parts.push(times(dist)); else if (dur) parts.push(times(dur)); else if (sets) parts.push(`${sets} sets`);
      if (load) parts.push(`@ ${load}`);
      break;
    case 'cardio':
      if (dur) parts.push(dur);
      if (dist) parts.push(dist);
      if (!dur && !dist && sets) parts.push(`${sets} rounds`);
      return parts.join(' · ');
    case 'reps':
      if (p.reps != null) parts.push(times(String(p.reps))); else if (sets) parts.push(`${sets} sets`);
      if (load) parts.push(`+${load}`);
      break;
    default:
      if (p.reps != null) parts.push(times(String(p.reps))); else if (sets) parts.push(`${sets} sets`);
      if (load) parts.push(`@ ${load}`);
  }
  return parts.join(' ');
}
