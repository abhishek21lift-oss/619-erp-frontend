/**
 * The exercise library's editor — the app's largest single form.
 *
 * Authoring a proper exercise means writing cues, mistakes, contraindications
 * and safety notes: several minutes of work, twenty-odd fields, and a record
 * every programme in the studio then references.
 *
 * ── What was wrong ──────────────────────────────────────────────────────────
 *
 * 1. `rest_seconds: form.rest_seconds ? Number(form.rest_seconds) : null`.
 *
 *    The truthiness guard catches `''` and nothing else, so `'  '` — a space
 *    left after clearing the box — is truthy, `Number('  ')` is 0, and the
 *    exercise is stored with **zero seconds of rest between sets**. The
 *    validator beside it did not catch it either:
 *
 *        form.rest_seconds && Number.isNaN(Number(form.rest_seconds))
 *
 *    `Number('  ')` is 0, not NaN, so the check passes and the form reports
 *    itself valid.
 *
 * 2. Nothing bounded it. `rest_seconds: 100000` is 28 hours, and the field
 *    that sets it accepted any number at all.
 *
 * 3. `if (!valid || saving) return` is not a submit guard. `saving` is state,
 *    read from the render closure, so two clicks in one frame both see false —
 *    and ⌘S is bound to the same handler, so holding it does the same thing.
 *    Two library entries for one exercise, and the second is the one every
 *    later reference points at.
 *
 * ── What is deliberately loose ──────────────────────────────────────────────
 *
 * `recommended_sets`, `recommended_reps` and `tempo_recommendation` are TEXT
 * and stay text: a coach writes "3-4", "8-12 each side", "3-1-1-0". Parsing
 * those into numbers would lose the meaning, and rejecting them would make the
 * field useless. They are capped for length and otherwise left alone.
 */

import { z } from 'zod';
import { textField, integerField } from '../primitives';

export const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const DIFFICULTY_OPTIONS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
] as const;

export const MOVEMENT_PATTERNS = [
  'Squat', 'Hinge', 'Lunge', 'Horizontal Push', 'Vertical Push',
  'Horizontal Pull', 'Vertical Pull', 'Carry', 'Rotation',
  'Anti-Extension', 'Trunk Flexion', 'Isolation', 'Mobility', 'Locomotion', 'General',
] as const;

export const PLANES = ['Sagittal', 'Frontal', 'Transverse'] as const;

export const MECHANICS = ['compound', 'isolation'] as const;
export const FORCES = ['push', 'pull', 'static'] as const;

/** A free-text coaching note. Long, but not unbounded. */
const note = (label: string, maxLength = 2000) => textField({ label, maxLength });

/** A short prescription written the way a coach writes it — "3-4", "8-12". */
const prescription = (label: string) => textField({ label, maxLength: 40 });

export const exerciseSchema = z.object({
  name: textField({ label: 'Exercise name', required: true, maxLength: 120 }),
  description: note('Description', 1000),

  primary_muscle_id: textField({ label: 'Primary muscle', required: true, maxLength: 64 }),
  secondary_muscle_ids: z.array(z.string()),
  equipment_id: textField({ label: 'Equipment', maxLength: 64 }),
  category_id: textField({ label: 'Category', maxLength: 64 }),

  difficulty: z.enum(DIFFICULTIES),
  // Free-text rather than enums: the server stores these as TEXT and the meta
  // endpoint does not constrain them, so an enum here would be the frontend
  // inventing a rule the system does not have.
  mechanic: textField({ label: 'Mechanic', maxLength: 32 }),
  force: textField({ label: 'Force', maxLength: 32 }),
  movement_pattern: textField({ label: 'Movement pattern', maxLength: 48 }),
  plane_of_motion: textField({ label: 'Plane of motion', maxLength: 32 }),

  instructions: note('Instructions', 4000),
  coaching_cues: z.array(z.string()),
  common_mistakes: z.array(z.string()),
  safety_tips: z.array(z.string()),
  contraindications: z.array(z.string()),
  breathing_tips: note('Breathing tips', 500),

  tempo_recommendation: prescription('Tempo'),
  recommended_sets: prescription('Sets'),
  recommended_reps: prescription('Reps'),
  /**
   * The one genuinely numeric field, and the one that was broken.
   *
   * 5 seconds is the shortest rest anyone prescribes deliberately; 1800 is
   * thirty minutes, which is beyond any real set break and well below the
   * 100000 the old field accepted.
   */
  rest_seconds: integerField({ label: 'Rest', min: 5, max: 1800, unit: 'seconds' }),

  beginner_notes: note('Beginner notes'),
  advanced_notes: note('Advanced notes'),
  trainer_notes: note('Trainer notes'),
  tags: z.array(z.string()),
});

export type ExerciseValues = z.output<typeof exerciseSchema>;

export type ExerciseFormState = {
  name: string;
  description: string;
  primary_muscle_id: string;
  secondary_muscle_ids: string[];
  equipment_id: string;
  category_id: string;
  difficulty: Difficulty;
  mechanic: string;
  force: string;
  movement_pattern: string;
  plane_of_motion: string;
  instructions: string;
  coaching_cues: string[];
  common_mistakes: string[];
  safety_tips: string[];
  contraindications: string[];
  breathing_tips: string;
  tempo_recommendation: string;
  recommended_sets: string;
  recommended_reps: string;
  rest_seconds: string;
  beginner_notes: string;
  advanced_notes: string;
  trainer_notes: string;
  tags: string[];
};

/**
 * A blank exercise.
 *
 * A function, not a constant. The old `BLANK` was a module-level object shared
 * by every opening of the editor — safe only because nothing mutated it in
 * place, which is a property no one was enforcing and the arrays made easy to
 * break.
 */
export function blankExercise(): ExerciseFormState {
  return {
    name: '', description: '',
    primary_muscle_id: '', secondary_muscle_ids: [],
    equipment_id: '', category_id: '',
    difficulty: 'beginner', mechanic: '', force: '',
    movement_pattern: '', plane_of_motion: '', instructions: '',
    coaching_cues: [], common_mistakes: [], safety_tips: [], contraindications: [],
    breathing_tips: '', tempo_recommendation: '',
    recommended_sets: '', recommended_reps: '', rest_seconds: '',
    beginner_notes: '', advanced_notes: '', trainer_notes: '',
    tags: [],
  };
}

/**
 * Rebuild the form's raw state from a stored exercise (§11).
 *
 * Every key is written, so opening exercise B after A cannot leave any of A's
 * values behind — and the arrays are copied rather than aliased, so editing
 * the form cannot mutate the record it was seeded from.
 */
export function exerciseToFormValues(
  ex: {
    name?: string | null; description?: string | null;
    primary_muscle_id?: string | null; equipment_id?: string | null;
    category_id?: string | null; difficulty?: string | null;
    mechanic?: string | null; force?: string | null;
    movement_pattern?: string | null; plane_of_motion?: string | null;
    instructions?: string | null;
    coaching_cues?: string[] | null; common_mistakes?: string[] | null;
    safety_tips?: string[] | null; contraindications?: string[] | null;
    breathing_tips?: string | null; tempo_recommendation?: string | null;
    recommended_sets?: string | null; recommended_reps?: string | null;
    rest_seconds?: number | string | null;
    beginner_notes?: string | null; advanced_notes?: string | null;
    trainer_notes?: string | null; tags?: string[] | null;
  },
  secondaryMuscleIds: string[] = [],
): ExerciseFormState {
  const text = (v: unknown) => (v === null || v === undefined ? '' : String(v));
  const list = (v: string[] | null | undefined) => [...(v ?? [])];

  return {
    name: text(ex.name),
    description: text(ex.description),
    primary_muscle_id: text(ex.primary_muscle_id),
    secondary_muscle_ids: [...secondaryMuscleIds],
    equipment_id: text(ex.equipment_id),
    category_id: text(ex.category_id),
    difficulty: (DIFFICULTIES as readonly string[]).includes(ex.difficulty ?? '')
      ? (ex.difficulty as Difficulty)
      : 'beginner',
    mechanic: text(ex.mechanic),
    force: text(ex.force),
    movement_pattern: text(ex.movement_pattern),
    plane_of_motion: text(ex.plane_of_motion),
    instructions: text(ex.instructions),
    coaching_cues: list(ex.coaching_cues),
    common_mistakes: list(ex.common_mistakes),
    safety_tips: list(ex.safety_tips),
    contraindications: list(ex.contraindications),
    breathing_tips: text(ex.breathing_tips),
    tempo_recommendation: text(ex.tempo_recommendation),
    recommended_sets: text(ex.recommended_sets),
    recommended_reps: text(ex.recommended_reps),
    rest_seconds: ex.rest_seconds == null ? '' : String(ex.rest_seconds),
    beginner_notes: text(ex.beginner_notes),
    advanced_notes: text(ex.advanced_notes),
    trainer_notes: text(ex.trainer_notes),
    tags: list(ex.tags),
  };
}

/**
 * Is this restored draft actually a form state?
 *
 * The draft comes out of localStorage, which any script on the origin can
 * write and a previous version of this app definitely did. `JSON.parse` of it
 * was fed straight into `setForm`, so a stale draft from before a field was
 * added or renamed produced a form with `undefined` where a string belongs —
 * and `undefined.trim()` on save.
 */
export function isExerciseDraft(raw: unknown): raw is ExerciseFormState {
  if (!raw || typeof raw !== 'object') return false;
  const blank = blankExercise();
  const d = raw as Record<string, unknown>;
  for (const [key, sample] of Object.entries(blank)) {
    if (Array.isArray(sample)) {
      if (!Array.isArray(d[key]) || !(d[key] as unknown[]).every((x) => typeof x === 'string')) {
        return false;
      }
    } else if (typeof d[key] !== 'string') {
      return false;
    }
  }
  return true;
}

/** Server messages this endpoint produces, mapped to the field they belong to. */
export const EXERCISE_FIELD_HINTS: Record<string, string> = {
  'name is required': 'name',
  'primary_muscle_id is required': 'primary_muscle_id',
};

export function toExercisePayload(v: ExerciseValues): Record<string, unknown> {
  return {
    name: v.name,
    description: v.description,
    primary_muscle_id: v.primary_muscle_id,
    secondary_muscle_ids: v.secondary_muscle_ids,
    equipment_id: v.equipment_id,
    category_id: v.category_id,
    difficulty: v.difficulty,
    mechanic: v.mechanic,
    force: v.force,
    movement_pattern: v.movement_pattern,
    plane_of_motion: v.plane_of_motion,
    instructions: v.instructions,
    coaching_cues: v.coaching_cues,
    common_mistakes: v.common_mistakes,
    safety_tips: v.safety_tips,
    contraindications: v.contraindications,
    breathing_tips: v.breathing_tips,
    tempo_recommendation: v.tempo_recommendation,
    recommended_sets: v.recommended_sets,
    recommended_reps: v.recommended_reps,
    rest_seconds: v.rest_seconds,
    beginner_notes: v.beginner_notes,
    advanced_notes: v.advanced_notes,
    trainer_notes: v.trainer_notes,
    tags: v.tags,
  };
}
