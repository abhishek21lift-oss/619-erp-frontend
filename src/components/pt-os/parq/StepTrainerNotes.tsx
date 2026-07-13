'use client';

import CoachNotesPanel from '@/components/pt-os/shared/CoachNotesPanel';
import type { ParqFormData, TrainerNotesForm } from './types';
import { TRAINER_NOTES_FIELDS } from './types';

interface StepTrainerNotesProps {
  form: ParqFormData;
  set: <K extends keyof ParqFormData>(key: K, val: ParqFormData[K]) => void;
}

export function StepTrainerNotes({ form, set }: StepTrainerNotesProps) {
  const onChange = (key: string, value: string) => {
    set('trainerNotes', { ...form.trainerNotes, [key]: value } as TrainerNotesForm);
  };

  return (
    <CoachNotesPanel
      fields={TRAINER_NOTES_FIELDS as { key: string; label: string }[]}
      notes={form.trainerNotes as unknown as Record<string, string>}
      onChange={onChange}
      title="Trainer Notes"
      subtitle="Step 7 of 9 — observations & programming guidance for this client."
    />
  );
}

export default StepTrainerNotes;
