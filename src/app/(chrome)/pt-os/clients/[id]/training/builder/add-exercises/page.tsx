'use client';

// Client Profile → Training → Workout Builder → Add exercises.
//
// Thin by design: read the plan and the day out of the URL, work out where
// "back" goes, and hand over. The screen itself is shared with the plan-scoped
// route at /pt-os/workout-plans/[id]/builder/add-exercises, because a
// programme with nobody on it has no client to live under and still has to be
// fillable.

import { use } from 'react';
import { useSearchParams } from 'next/navigation';
import AddExercisesScreen from '@/components/pt-os/builder/AddExercisesScreen';

export default function AddExercisesPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id: clientId } = use(params);
  const sp = useSearchParams();

  const planId = sp.get('plan') ?? '';
  // Clamped rather than trusted. This lands in a `day_of_week` column, and a
  // hand-edited URL should return the trainer to Monday rather than writing a
  // day that does not exist.
  const dayRaw = Number(sp.get('day'));
  const day = Number.isFinite(dayRaw) && dayRaw >= 1 && dayRaw <= 7 ? Math.trunc(dayRaw) : 1;

  return (
    <AddExercisesScreen
      planId={planId}
      day={day}
      backHref={`/pt-os/clients/${clientId}/training/builder?plan=${encodeURIComponent(planId)}&day=${day}`}
    />
  );
}
