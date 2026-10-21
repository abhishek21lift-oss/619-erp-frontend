/**
 * Editing a programme's name, goal, difficulty and length.
 *
 * This form sends only what changed, because the server moves every running
 * assignment's end date when `duration_weeks` changes. The old form clamped the
 * weeks box on blur: blank or unparseable text became `1`, which looked like a
 * deliberate one-week programme and silently shortened every client on it.
 *
 * The schema makes the empty box an error instead. A real value still passes
 * through unchanged, including a programme longer than the form's normal
 * 52-week ceiling — the maximum is supplied per plan, so renaming a 60-week
 * block cannot cut it to 52.
 */

import { z } from 'zod';
import { programmeWeeksField } from '../domain';
import { textField } from '../primitives';

/** The old input's hard cap. Kept so an edit cannot invent a longer name. */
export const PROGRAMME_NAME_MAX = 120;

const DEFAULT_WEEKS = 4;

/** The fields the dialog reads from a plan, including legacy nulls. */
export interface ProgrammeDetailsSource {
  name: string;
  goal?: string | null;
  difficulty?: string | null;
  duration_weeks?: number | null;
}

/** What the controls hold: strings, never a coerced number. */
export type ProgrammeDetailsState = {
  name: string;
  goal: string;
  difficulty: string;
  duration_weeks: string;
};

export function programmeDetailsDefaults(plan: ProgrammeDetailsSource): ProgrammeDetailsState {
  return {
    name: plan.name,
    // An AI-saved programme can carry neither. Preselecting a default would
    // show a choice nobody made, and save it on a mere rename.
    goal: plan.goal ?? '',
    difficulty: plan.difficulty ?? '',
    duration_weeks: String(plan.duration_weeks || DEFAULT_WEEKS),
  };
}

export function programmeDetailsSchema(maxWeeks: number) {
  return z.object({
    name: textField({
      label: 'Programme name',
      required: true,
      maxLength: PROGRAMME_NAME_MAX,
    }),
    // Goal and difficulty are optional because legacy plans may have neither.
    // Their values are constrained by the chips, not by free text.
    goal: textField({ label: 'Goal' }),
    difficulty: textField({ label: 'Difficulty' }),
    duration_weeks: programmeWeeksField({
      label: 'Weeks',
      required: true,
      max: maxWeeks,
      // No unit: the label already says weeks, and "1 weeks" reads wrong.
      unit: undefined,
    }),
  });
}

export type ProgrammeDetailsValues = z.output<ReturnType<typeof programmeDetailsSchema>>;

export interface ProgrammeDetailsPatch {
  name?: string;
  goal?: string;
  difficulty?: string;
  duration_weeks?: number;
}

/**
 * Build the changed-only payload.
 *
 * Comparing against the normalized current value means a legacy goal with
 * surrounding whitespace is not "changed" simply because the schema trimmed
 * the box. A blank goal or difficulty is never sent: the dialog has no way to
 * clear one, so omitting it preserves the old contract.
 */
export function toProgrammeDetailsPatch(
  plan: ProgrammeDetailsSource,
  values: ProgrammeDetailsValues,
): ProgrammeDetailsPatch {
  const patch: ProgrammeDetailsPatch = {};

  const name = values.name as string;
  if (name !== plan.name) patch.name = name;

  if (values.goal && values.goal !== (plan.goal ?? '').trim()) {
    patch.goal = values.goal;
  }
  if (values.difficulty && values.difficulty !== (plan.difficulty ?? '').trim()) {
    patch.difficulty = values.difficulty;
  }

  const duration_weeks = values.duration_weeks as number;
  if (duration_weeks !== plan.duration_weeks) patch.duration_weeks = duration_weeks;

  return patch;
}
