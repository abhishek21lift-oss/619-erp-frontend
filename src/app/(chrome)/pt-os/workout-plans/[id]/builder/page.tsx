'use client';

// Workout Plans → a programme → Workout Builder.
//
// The same builder the client route mounts, addressed by the plan instead of
// by a client. Editing a programme opens this whether or not anybody is on it.

import { use } from 'react';
import Guard from '@/components/Guard';
import WorkoutBuilder from '@/components/pt-os/builder/WorkoutBuilder';

export default function PlanBuilderPage({
  params,
}: { params: Promise<{ id: string }> }) {
  // `id` is the PLAN here. No client segment, so the builder sends "add
  // exercises" to the plan-scoped route beside this one.
  const { id: planId } = use(params);

  return (
    <Guard roles={['admin', 'manager', 'trainer']}>
      <WorkoutBuilder planId={planId} />
    </Guard>
  );
}
