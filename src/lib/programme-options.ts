// The programme vocabularies and the client-record mappings shared by the
// create page, the edit dialog and the plan detail screen.
//
// These used to live in NewProgrammeDialog. When creation moved to its own
// route the constants had to move somewhere both surfaces can import without
// pulling in a form.

export interface ClientOption {
  id: string;
  name: string;
}

export const PROGRAMME_GOALS = [
  { value: 'muscle_gain', label: 'Muscle Gain' },
  { value: 'strength', label: 'Strength' },
  { value: 'weight_loss', label: 'Weight Loss' },
  { value: 'endurance', label: 'Endurance' },
  { value: 'general_fitness', label: 'General Fitness' },
  { value: 'body_recomposition', label: 'Body Recomposition' },
  { value: 'recovery', label: 'Recovery' },
] as const;

/**
 * How hard the programme is. It was never asked: every programme was saved
 * as "intermediate", and that word then showed on the programme page and in
 * the member app for a client's first-ever plan as much as for a meet prep.
 */
export const PROGRAMME_DIFFICULTIES = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
] as const;

/** The create form's ceiling. The server accepts longer plans; new ones do not. */
export const WEEKS_MAX = 52;

/**
 * The programme goal a screening answer implies.
 *
 * Two vocabularies meet here. The Goal Assessment screening stores one of
 * fourteen `goal_type` values (migration 055); a programme has five. Only the
 * pairs that mean the same thing are mapped:
 *
 *   fat_loss      → Weight Loss    the same goal under two names
 *   marathon_prep → Endurance      marathon preparation IS endurance work
 *   strength_gain → Strength       since Strength became a programme goal
 *   powerlifting  → Strength       (migration 219); a meet prep is strength work
 *
 * The rest — body_recomposition, mobility, wedding_transformation,
 * medical_fitness, senior_fitness, athletic_performance, custom — have no
 * honest equivalent among the six, so they map to nothing and the trainer's
 * own selection stands. Guessing here
 * would put a goal on the programme that nobody chose.
 */
const SCREENING_GOALS: Record<string, string> = {
  fat_loss: 'weight_loss',
  marathon_prep: 'endurance',
  strength_gain: 'strength',
  powerlifting: 'strength',
};

/**
 * Match a stored goal to one of the five programme goals.
 *
 * Handles both sources: the screening's `goal_type` and `pt_clients.goal`,
 * which is free TEXT (migration 050) filled by the onboarding wizard and so
 * arrives as "muscle_gain", "Muscle Gain" or "muscle gain". Anything that does
 * not map returns undefined and the form leaves the current selection alone.
 */
export function goalFromClient(raw: unknown): string | undefined {
  const key = String(raw ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (!key) return undefined;
  return PROGRAMME_GOALS.find((g) => g.value === key)?.value ?? SCREENING_GOALS[key];
}

/**
 * The programme difficulty a client's recorded workout experience implies.
 *
 * `pt_clients.workout_experience_level` is the PT Enrollment field (migration
 * 077): beginner, intermediate, advanced or athlete. The first three are the
 * programme's own words; an athlete gets an advanced programme. Anything else
 * returns undefined and the selection stands.
 *
 * Sessions per week used to be read here too. It is no longer asked: the
 * number is counted from the days the builder programmes (migration 219), so
 * a figure typed before any exercise existed cannot disagree with them.
 */
export function difficultyFromClient(raw: unknown): string | undefined {
  const key = String(raw ?? '').trim().toLowerCase();
  if (key === 'athlete') return 'advanced';
  return PROGRAMME_DIFFICULTIES.find((d) => d.value === key)?.value;
}
