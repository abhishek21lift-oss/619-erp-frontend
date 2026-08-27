'use client';

// Editing a custom exercise, at its own URL. See ../../new/page.tsx for why
// this stopped being a modal.
import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Guard from '@/components/Guard';
import { ExerciseEditor } from '@/components/pt-os/exercise-library/ExerciseEditor';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import type { ExerciseMeta, LibraryExercise } from '@/lib/api';

export default function EditExercisePage({ params }: { params: Promise<{ id: string }> }) {
  return <Guard><EditExerciseContent params={params} /></Guard>;
}

function EditExerciseContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();

  const [meta, setMeta] = useState<ExerciseMeta | null>(null);
  const [exercise, setExercise] = useState<LibraryExercise | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading');

  useEffect(() => {
    api.exercises.meta().then(setMeta).catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;
    api.exercises.get(id)
      .then((res) => {
        if (!alive) return;
        setExercise(res);
        setState('ready');
      })
      .catch(() => {
        if (!alive) return;
        // A custom exercise belongs to the trainer who wrote it, so someone
        // else's id is a 404 here rather than a permission dialog — the point
        // is that it does not exist for this caller.
        setState('missing');
      });
    return () => { alive = false; };
  }, [id]);

  const back = useCallback(() => router.push('/pt-os/exercise-library'), [router]);

  const onSaved = useCallback(() => {
    toast.success('Exercise updated');
    router.push('/pt-os/exercise-library');
  }, [router, toast]);

  if (state === 'loading') {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Loading exercise…</p>
      </main>
    );
  }

  if (state === 'missing' || !exercise) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-[16px] font-[750]" style={{ color: 'var(--text-primary)' }}>
          That exercise isn&apos;t available
        </h1>
        <p className="mt-1 text-[13px]" style={{ color: 'var(--text-muted)' }}>
          It may have been deleted, or it belongs to another trainer.
        </p>
        <button
          type="button"
          onClick={back}
          className="mt-4 rounded-[10px] px-3.5 py-2 text-[12.5px] font-[700]"
          style={{ background: 'rgba(0,103,224,0.10)', color: '#0059ce' }}
        >
          Back to the library
        </button>
      </main>
    );
  }

  return <ExerciseEditor exercise={exercise} meta={meta} onClose={back} onSaved={onSaved} />;
}
