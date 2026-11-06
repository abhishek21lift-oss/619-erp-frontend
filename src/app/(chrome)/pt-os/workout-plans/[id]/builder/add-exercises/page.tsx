'use client';

// Workout Plans → a programme → Workout Builder → Add exercises.
//
// The same screen as the client-scoped route, reached from the plan instead.
// A programme nobody is assigned to has no client route to live under, and it
// still has to be fillable — so the plan's own id addresses it here.

import { use } from 'react';
import { useSearchParams } from 'next/navigation';
import AddExercisesScreen from '@/components/pt-os/builder/AddExercisesScreen';

export default function PlanAddExercisesPage({
  params,
}: { params: Promise<{ id: string }> }) {
  // `id` is the PLAN here, not a client.
  const { id: planId } = use(params);
  const sp = useSearchParams();

  const dayRaw = Number(sp.get('day'));
  const day = Number.isFinite(dayRaw) && dayRaw >= 1 && dayRaw <= 7 ? Math.trunc(dayRaw) : 1;
  // Week 1 is the default; a hand-edited 0 or a word falls back rather than
  // writing a week that does not exist.
  const weekRaw = Number(sp.get('week'));
  const week = Number.isFinite(weekRaw) && weekRaw >= 1 ? Math.trunc(weekRaw) : 1;

  return (
    <AddExercisesScreen
      planId={planId}
      day={day}
      week={week}
      newExerciseId={sp.get('new')}
      backHref={`/pt-os/workout-plans/${planId}/builder?day=${day}${week > 1 ? `&week=${week}` : ''}`}
    />
  );
}
