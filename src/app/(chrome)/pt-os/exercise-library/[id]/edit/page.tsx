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
import { SearchX } from 'lucide-react';

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
      <main className="mx-auto w-full max-w-3xl space-y-3.5 pt-1" aria-busy="true">
        <div className="h-[168px] animate-pulse rounded-[26px] bg-slate-200/70 dark:bg-white/[0.06]" />
        <div className="h-[220px] animate-pulse rounded-[22px] bg-slate-200/50 dark:bg-white/[0.04]" />
        <p className="sr-only">Loading exercise…</p>
      </main>
    );
  }

  if (state === 'missing' || !exercise) {
    return (
      <main className="mx-auto w-full max-w-3xl pt-1">
        <div className="flex flex-col items-center rounded-[26px] border border-slate-200/60 bg-white px-6 py-12 text-center shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:border-white/[0.07] dark:bg-white/[0.04]">
          <span className="flex h-14 w-14 items-center justify-center rounded-[17px] bg-slate-100 text-[var(--text-muted)] dark:bg-white/10">
            <SearchX size={24} />
          </span>
          <h1 className="mt-4 text-[18px] font-[800] tracking-[-0.015em]" style={{ color: 'var(--text-primary)' }}>
            That exercise isn&apos;t available
          </h1>
          <p className="mt-1 text-[13px]" style={{ color: 'var(--text-muted)' }}>
            It may have been deleted, or it belongs to another trainer.
          </p>
          <button
            type="button"
            onClick={back}
            className="mt-5 rounded-full px-4 py-2 text-[13px] font-[700] text-white transition-transform active:scale-95"
            style={{ background: 'var(--brand)' }}
          >
            Back to the library
          </button>
        </div>
      </main>
    );
  }

  return <ExerciseEditor exercise={exercise} meta={meta} onClose={back} onSaved={onSaved} />;
}
