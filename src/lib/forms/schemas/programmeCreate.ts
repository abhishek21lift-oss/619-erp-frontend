/**
 * Creating a programme: client, name, goal, difficulty and length.
 *
 * The field rules are the edit form's, with the two optional fields made
 * required because a NEW programme has no legacy value to preserve. The old
 * dialog held the weeks box as a number and clamped it on blur, so a cleared
 * or unparseable box became a deliberate-looking one-week programme. Here the
 * box stays a string until submit and an empty box is an error, never a value.
 */

import { z } from 'zod';
import { textField } from '../primitives';
import { programmeDetailsSchema, type ProgrammeDetailsState } from './programmeDetails';

/** The create form's opening values. */
export type ProgrammeCreateState = ProgrammeDetailsState & {
  client_id: string;
};

export function programmeCreateDefaults(clientId?: string | null): ProgrammeCreateState {
  return {
    client_id: clientId ?? '',
    name: '',
    // The same opening choices the old dialog used. A client's record can
    // replace these once one is picked, but a programme must never be created
    // with neither.
    goal: 'muscle_gain',
    difficulty: 'intermediate',
    duration_weeks: '4',
  };
}

export function programmeCreateSchema(maxWeeks: number) {
  return programmeDetailsSchema(maxWeeks).extend({
    client_id: textField({ label: 'Client', required: true }),
    // A new programme cannot omit these; only legacy plans can.
    goal: textField({ label: 'Goal', required: true }),
    difficulty: textField({ label: 'Difficulty', required: true }),
  });
}

export type ProgrammeCreateValues = z.output<ReturnType<typeof programmeCreateSchema>>;

export interface ProgrammeCreatePayload {
  name: string;
  goal: string;
  difficulty: string;
  duration_weeks: number;
  is_template: false;
}

/**
 * The create payload. No client id — assignment is a separate call after the
 * plan exists — and no sessions_per_week or exercises, both owned by the
 * builder. `is_template` is explicit because the server used to read an
 * absent flag as TRUE.
 */
export function toProgrammeCreatePayload(values: ProgrammeCreateValues): ProgrammeCreatePayload {
  return {
    name: values.name as string,
    goal: values.goal as string,
    difficulty: values.difficulty as string,
    duration_weeks: values.duration_weeks as number,
    is_template: false,
  };
}
