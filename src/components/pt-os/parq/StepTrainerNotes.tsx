'use client';

import CoachNotesPanel from '@/components/pt-os/shared/CoachNotesPanel';
import type { ParqFormData, TrainerNotesForm } from './types';
import { TRAINER_NOTES_FIELDS } from './types';

interface StepTrainerNotesProps {
  form: ParqFormData;
  set: <K extends keyof ParqFormData>(key: K, val: ParqFormData[K]) => void;
  stepLabel: string;
}

/**
 * The trainer's own findings from the screening. The form always carried
 * these fields — contraindications and precautions among them — and sent
 * them on every save, but no step showed them, so they were always blank.
 */
export function StepTrainerNotes({ form, set, stepLabel }: StepTrainerNotesProps) {
  return (
    <CoachNotesPanel<TrainerNotesForm>
      title="Trainer Notes"
      subtitle={`${stepLabel} — what to avoid and what to watch. Contraindications and precautions travel with the client's programme.`}
      fields={TRAINER_NOTES_FIELDS}
      notes={form.trainerNotes}
      onChange={(key, v) => set('trainerNotes', { ...form.trainerNotes, [key]: v })}
    />
  );
}

export default StepTrainerNotes;
