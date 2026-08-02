'use client';

// Authoring a custom exercise, at its own URL.
//
// This was a modal over the library. The form is long enough to scroll on a
// laptop and much longer than a phone screen, and a sheet that tall fights the
// page behind it for the scroll. Giving it a route also means a half-written
// exercise survives a reload, can be linked to, and Back does the obvious
// thing instead of silently discarding the draft.
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { ExerciseEditor } from '@/components/pt-os/exercise-library/ExerciseEditor';
import { api } from '@/lib/api';
import type { ExerciseMeta, LibraryExercise } from '@/lib/api';

export default function NewExercisePage() {
  return <Guard><AppShell><NewExerciseContent /></AppShell></Guard>;
}

function NewExerciseContent() {
  const router = useRouter();
  const [meta, setMeta] = useState<ExerciseMeta | null>(null);

  useEffect(() => {
    // The dropdowns degrade to free text without this, so a failure here is
    // not worth blocking authoring over.
    api.exercises.meta().then(setMeta).catch(() => {});
  }, []);

  const back = useCallback(() => router.push('/pt-os/exercise-library'), [router]);

  const onSaved = useCallback((ex: LibraryExercise) => {
    // Land on the library with the new exercise in it rather than on an empty
    // form the trainer would have to dismiss.
    router.push('/pt-os/exercise-library');
    void ex;
  }, [router]);

  return <ExerciseEditor exercise={null} meta={meta} onClose={back} onSaved={onSaved} />;
}
