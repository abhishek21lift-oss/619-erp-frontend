'use client';

// One workout day, in the builder.
//
// The page is deliberately thin: it loads, it holds the picker's open state,
// and it hands everything else to WorkoutTemplateBuilder. The old builder was
// a single ~700-line component that owned fetching, prescription editing,
// day switching, versioning and drag state at once, which is why changing any
// one of them meant reading all of it.
//
// ── The picker is the existing one ─────────────────────────────────────────
//
// components/pt-os/workout-log/ExercisePicker, unchanged. It already does
// server-side search over the whole library, recent-exercise chips, and
// marking what is already in the day — building a second picker for this
// screen would mean two search behaviours to keep in step, and the one that
// drifts is always the one used less.
//
// It lives under workout-log/ because that is where it was first needed. That
// is a filing accident rather than a coupling, and moving it is a rename
// nobody needs today.

import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Dumbbell, Loader2, AlertCircle } from 'lucide-react';
import Guard from '@/components/Guard';
import { Button, PageContainer, PageHero } from '@/components/ui';
import ExercisePicker from '@/components/pt-os/workout-log/ExercisePicker';
import WorkoutTemplateBuilder from '@/components/pt-os/training/WorkoutTemplateBuilder';
import { useTrainingMeta } from '@/lib/training/useTrainingMeta';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import type { TemplateExercise, WorkoutSection, WorkoutTemplate } from '@/lib/api';

export default function TemplateBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <Guard roles={['admin', 'manager', 'trainer']}><TemplateBuilder templateId={id} /></Guard>;
}

function TemplateBuilder({ templateId }: { templateId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const { meta, loading: metaLoading, error: metaError } = useTrainingMeta();

  const [template, setTemplate] = useState<WorkoutTemplate | null>(null);
  const [exercises, setExercises] = useState<TemplateExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Which section the picker will add into. Held here rather than passed
  // through the picker, which has no reason to know about sections.
  const [pickerSection, setPickerSection] = useState<WorkoutSection | null>(null);

  const load = useCallback(async () => {
    setLoadError('');
    try {
      const res = await api.training.templates.get(templateId);
      setTemplate(res.data);
      setExercises(res.data.exercises ?? []);
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : 'Could not load this workout');
    } finally {
      setLoading(false);
    }
  }, [templateId]);

  useEffect(() => { load(); }, [load]);

  const addExercise = useCallback(async (exercise: { id: string; name: string }) => {
    const section = pickerSection ?? 'MAIN';
    setPickerSection(null);
    try {
      await api.training.templates.addExercise(templateId, {
        exercise_id: exercise.id,
        section,
        // Sensible defaults for the commonest case. A cardio section starts as
        // a cardio prescription, so adding a treadmill to the Cardio block does
        // not first present sets and reps that the trainer has to clear.
        prescription_type: section === 'CARDIO' || section === 'CONDITIONING' ? 'TIME' : 'SETS_REPS',
        ...(section === 'CARDIO' || section === 'CONDITIONING'
          ? { target_duration_seconds: 600 }
          : { target_sets: 3, target_reps_min: 10 }),
        warmup: section === 'WARMUP',
      });
      await load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not add that exercise');
    }
  }, [templateId, pickerSection, load, toast]);

  if (loading || metaLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 size={26} className="animate-spin" style={{ color: 'var(--brand-lo, #0067e0)' }} />
      </div>
    );
  }

  if (loadError || metaError) {
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <AlertCircle size={30} style={{ color: 'var(--danger-text, #ef4444)', margin: '0 auto 12px' }} />
        <p className="text-[14px] font-[620]" style={{ color: 'var(--text-muted)' }}>
          {loadError || metaError}
        </p>
        <Button variant="outline" className="mt-4" onClick={() => { setLoading(true); load(); }}>Retry</Button>
      </div>
    );
  }

  const dayLabel = template?.day_label
    || (template?.day_number ? `Day ${template.day_number}` : null);

  return (
    <PageContainer>
      <PageHero
        icon={<Dumbbell size={20} />}
        title={template?.name ?? 'Workout'}
        subtitle={[dayLabel, template?.goal].filter(Boolean).join(' · ') || undefined}
        actions={
          <Button variant="outline" iconLeft={<ArrowLeft size={14} />} onClick={() => router.back()}>
            Back
          </Button>
        }
      />

      <div className="mx-auto w-full max-w-3xl">
        <WorkoutTemplateBuilder
          templateId={templateId}
          exercises={exercises}
          types={meta?.prescription_types ?? []}
          onChanged={load}
          onAddExercise={setPickerSection}
        />
      </div>

      <ExercisePicker
        open={pickerSection !== null}
        onClose={() => setPickerSection(null)}
        onSelect={addExercise}
        // Marked rather than hidden: a trainer who cannot find a movement they
        // know exists assumes the search is broken.
        existingIds={exercises.map((e) => e.exercise_id)}
      />
    </PageContainer>
  );
}
