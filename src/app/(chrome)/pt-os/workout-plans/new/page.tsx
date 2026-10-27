'use client';

// Creating a programme, at its own URL.
//
// This was a floating sheet over the Workout Plans list. The list is the most
// visited screen in the module and the sheet covered the very cards it was
// about to add to; it also carried a focus trap and a mobile-drag affordance
// that a page gets for free. The fields are unchanged — client, name, goal,
// difficulty, weeks — because those are all a programme needs to EXIST.
// Exercises, days and prescriptions belong to the builder, which this hands
// over to as soon as the row is created.
//
// The form itself lives in components/pt-os/builder/NewProgrammeForm: Next 16
// rejects named exports from a route file during `next build`.

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Guard from '@/components/Guard';
import { NewProgrammeForm } from '@/components/pt-os/builder/NewProgrammeForm';

export default function NewProgrammePage() {
  return (
    <Guard role="trainer">
      {/* useSearchParams needs a boundary when this page is prerendered. */}
      <Suspense fallback={null}>
        <NewProgrammeRoute />
      </Suspense>
    </Guard>
  );
}

function NewProgrammeRoute() {
  const presetClientId = useSearchParams().get('client_id');
  return <NewProgrammeForm presetClientId={presetClientId} />;
}
