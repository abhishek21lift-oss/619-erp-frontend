'use client';

// Client Profile → Training → Workout Builder.
//
// Thin by design: Guard + AppShell + the builder. All the behaviour lives in
// components/pt-os/builder so the same builder can later be mounted from the
// Programs screen without duplicating it.

import { use } from 'react';
import { useSearchParams } from 'next/navigation';
import Guard from '@/components/Guard';
import WorkoutBuilder from '@/components/pt-os/builder/WorkoutBuilder';
import { EmptyState } from '@/components/ui';
import { Dumbbell } from 'lucide-react';

export default function WorkoutBuilderPage({
  params,
}: { params: Promise<{ id: string }> }) {
  // `id` here is the CLIENT. Which programme to edit comes from ?plan=, so the
  // Programs screen can deep-link straight into a specific plan.
  use(params);
  const planId = useSearchParams().get('plan');

  return (
    <Guard roles={['admin', 'manager', 'trainer']}>
      <div className="mx-auto max-w-screen-md px-4 py-4">
        {planId ? (
          <WorkoutBuilder planId={planId} />
        ) : (
          <EmptyState
            icon={<Dumbbell size={22} />}
            title="No programme selected"
            description="Open a programme from Workout Programs to start building."
          />
        )}
      </div>
    </Guard>
  );
}
