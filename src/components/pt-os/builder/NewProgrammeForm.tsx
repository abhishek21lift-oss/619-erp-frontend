'use client';

// The create form lives here rather than in the route file: Next 16 rejects
// named exports from `page.tsx` during `next build`, and tests need to render
// the form without the page's Guard/Suspense wrapper.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '@tanstack/react-form';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Dumbbell, Loader2 } from 'lucide-react';
import { PageContainer, PageHero } from '@/components/ui';
import {
  ChoiceChips, FormErrorBanner, NumberField, RadioField, SearchField, SubmitStatus,
  TextField, type FieldLike,
} from '@/components/ui/form';
import { api } from '@/lib/api';
import type { WorkoutPlan } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { assignWorkoutPlan } from '@/lib/workoutAssign';
import { useAppForm } from '@/lib/forms/useAppForm';
import { PROGRAMME_NAME_MAX } from '@/lib/forms/schemas/programmeDetails';
import {
  programmeCreateDefaults, programmeCreateSchema, toProgrammeCreatePayload,
} from '@/lib/forms/schemas/programmeCreate';
import {
  PROGRAMME_DIFFICULTIES, PROGRAMME_GOALS, WEEKS_MAX,
  difficultyFromClient, goalFromClient,
  type ClientOption,
} from '@/lib/programme-options';

/** Mark a choice as the trainer's own, then change it. */
type ChoiceTouched = { goal: boolean; difficulty: boolean };

function withChoiceTouched<T>(
  field: FieldLike<T>,
  touched: { current: ChoiceTouched },
  key: keyof ChoiceTouched,
): FieldLike<T> {
  return {
    ...field,
    handleChange: (value) => {
      touched.current[key] = true;
      field.handleChange(value);
    },
  };
}

export interface NewProgrammeFormProps {
  /** Preselects the client when opened from a client-scoped screen. */
  presetClientId?: string | null;
}

export function NewProgrammeForm({ presetClientId }: NewProgrammeFormProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [clients, setClients] = useState<ClientOption[]>([]);
  const [search, setSearch] = useState('');

  /**
   * Which choice the trainer picked themselves.
   *
   * Picking a client fills the form from that client's record — but a trainer
   * who has already chosen a goal or difficulty must not watch their choice
   * disappear when they change their mind about the client. The name is never
   * filled, so it needs no entry here.
   */
  const touched = useRef<ChoiceTouched>({ goal: false, difficulty: false });

  const schema = useMemo(() => programmeCreateSchema(WEEKS_MAX), []);
  const defaultValues = useMemo(
    () => programmeCreateDefaults(presetClientId),
    [presetClientId],
  );

  const f = useAppForm({
    schema,
    defaultValues,
    onSubmit: async (values) => {
      const { plan } = await api.workouts.plans.create(toProgrammeCreatePayload(values));
      const clientId = values.client_id as string;

      // Assign before navigating. A failure here must not swallow the plan —
      // it exists either way, so report and continue rather than roll back.
      // Shared with the Workout Plans page's own "Assign" button so a
      // PARQ_BLOCKED client gets the same persistent, actionable toast here
      // that it gets there, rather than one generic line that can vanish
      // before it's read on the way to the builder.
      const clientName = clients.find((c) => c.id === clientId)?.name ?? 'the client';
      await assignWorkoutPlan(
        plan as WorkoutPlan,
        { id: clientId, name: clientName },
        toast,
        (path) => router.push(path),
      );

      router.push(`/pt-os/workout-plans/${plan.id}/builder`);
    },
  });
  const { form, submit, errors, isSubmitting, isDirty } = f;
  const clientId = useStore(form.store, (s) => String(s.values.client_id ?? ''));

  useEffect(() => {
    api.pt.clients()
      .then((r: { data?: unknown[] }) => {
        setClients(((r?.data ?? []) as Array<{ id: string; name: string }>)
          .map((c) => ({ id: c.id, name: c.name })));
      })
      .catch(() => setClients([]));
  }, []);

  /**
   * Fill the form from what is already known about the chosen client.
   *
   * Two reads, both of endpoints that already exist:
   *
   *   · the client row, for their workout experience
   *     (pt_clients.workout_experience_level, the PT Enrollment field);
   *   · their goal-setting screening, for the goal.
   *
   * The programme NAME is deliberately not filled. What kind of plan this is
   * — Push/Pull/Legs, Upper/Lower, a deload block — is the trainer's call and
   * nothing in the client's record knows it, so the field is left empty for
   * them to write.
   *
   * Nothing else is invented either: a field is filled only when the record
   * actually answers it. Weeks is not filled at all — nothing on the client's
   * record says how long a block should run.
   */
  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;

    Promise.all([
      api.pt.client(clientId).catch(() => null),
      // The screening is the goal's source when it has been done. A client
      // who has never been screened simply does not fill this field.
      api.progress.goals.list({ client_id: clientId }).catch(() => null),
    ])
      .then(([clientRes, goalRes]) => {
        if (cancelled) return;
        const row = ((clientRes as { data?: unknown } | null)?.data ?? {}) as Record<string, unknown>;
        // Ordered is_active DESC, created_at DESC server-side, so the first
        // row is the screening that is still in force.
        const screening = (((goalRes as { data?: unknown[] } | null)?.data ?? [])[0] ?? {}) as Record<string, unknown>;

        const matchedGoal = goalFromClient(screening.goal_type) ?? goalFromClient(row.goal);
        const matchedDifficulty = difficultyFromClient(row.workout_experience_level);

        if (!touched.current.goal && matchedGoal) form.setFieldValue('goal', matchedGoal);
        if (!touched.current.difficulty && matchedDifficulty) {
          form.setFieldValue('difficulty', matchedDifficulty);
        }
      })
      .catch(() => { /* the form keeps its defaults; nothing is claimed */ });

    return () => { cancelled = true; };
  }, [clientId, form]);

  const handleCancel = useCallback(() => {
    if (isDirty && !window.confirm('Discard this programme?')) return;
    router.push(presetClientId
      ? `/pt-os/workout-plans?client_id=${encodeURIComponent(presetClientId)}`
      : '/pt-os/workout-plans');
  }, [isDirty, router, presetClientId]);

  // In-app navigation is guarded by handleCancel; this covers a reload, a
  // closed tab or a typed URL, which the router never sees.
  useEffect(() => {
    if (!isDirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [isDirty]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? clients.filter((c) => c.name.toLowerCase().includes(q)) : clients;
  }, [clients, search]);

  return (
    <PageContainer>
      <PageHero
        icon={<Dumbbell size={20} />}
        title="New programme"
        subtitle="Name it and set its shape — exercises come next."
        actions={
          <button
            type="button"
            onClick={handleCancel}
            className="inline-flex h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-[14px] px-5 text-[13px] font-[700] transition-transform active:scale-95 sm:w-auto"
            style={{ background: '#fff', color: '#0F172A' }}
          >
            <ArrowLeft size={16} /> Back to plans
          </button>
        }
      />

      {/* A column of inputs is unusable at full width — max-w-2xl keeps this
          the same reading measure as the sheet it replaces, just no longer
          boxed inside one. */}
      <div className="mx-auto w-full max-w-2xl pb-24 lg:pb-8">
        <form
          noValidate
          onSubmit={(e) => { e.preventDefault(); void submit(); }}
          className="rounded-[20px] p-5 sm:p-6"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}
        >
          {!presetClientId && (
            <form.Field name="client_id">
              {(field) => (
                <RadioField
                  field={field}
                  legend="Client"
                  options={filtered.map((c) => ({ value: c.id, label: c.name }))}
                  required
                  serverError={errors.fieldErrors.client_id}
                  className="mb-3"
                  optionsClassName="max-h-44 overflow-y-auto overscroll-contain pr-1"
                  before={(
                    <SearchField
                      label="Search clients"
                      placeholder="Search clients…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      // Enter filters; it must not submit a form with no client.
                      onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                      fieldClassName="mb-2"
                    />
                  )}
                />
              )}
            </form.Field>
          )}

          <form.Field name="name">
            {(field) => (
              <TextField
                field={field}
                label="Programme name"
                required
                maxLength={PROGRAMME_NAME_MAX}
                showCount
                placeholder="e.g. Upper / Lower Split"
                serverError={errors.fieldErrors.name}
                className="mb-3"
              />
            )}
          </form.Field>

          <form.Field name="goal">
            {(field) => (
              <ChoiceChips
                field={withChoiceTouched(field, touched, 'goal')}
                legend="Goal"
                options={PROGRAMME_GOALS}
                required
                serverError={errors.fieldErrors.goal}
                className="mb-3"
              />
            )}
          </form.Field>

          <form.Field name="difficulty">
            {(field) => (
              <ChoiceChips
                field={withChoiceTouched(field, touched, 'difficulty')}
                legend="Difficulty"
                options={PROGRAMME_DIFFICULTIES}
                required
                serverError={errors.fieldErrors.difficulty}
                className="mb-3"
              />
            )}
          </form.Field>

          <form.Field name="duration_weeks">
            {(field) => (
              <NumberField
                field={field}
                label="Weeks"
                required
                mode="integer"
                min={1}
                max={WEEKS_MAX}
                serverError={errors.fieldErrors.duration_weeks}
                className="mb-1"
              />
            )}
          </form.Field>
          <p className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
            Sessions per week come from the days you programme in the builder.
          </p>

          <FormErrorBanner errors={errors} onRetry={() => void submit()} className="mt-4" />
        </form>
      </div>

      <div className="page-action-bar" style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)', borderTop: '1px solid var(--border)' }}>
        <div className="mx-auto flex max-w-2xl items-center justify-end gap-2 px-5 py-3.5 sm:px-6">
          <button
            type="button"
            onClick={handleCancel}
            className="inline-flex h-[44px] items-center justify-center rounded-[12px] px-4 text-[13px] font-[650] transition-transform active:scale-[0.98]"
            style={{ border: '1px solid var(--border)', color: 'var(--text-primary)', background: 'var(--bg-card)' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={isSubmitting}
            aria-busy={isSubmitting}
            className="inline-flex h-[44px] items-center justify-center gap-2 rounded-[12px] px-5 text-[13px] font-[700] text-white transition-transform active:scale-[0.98] disabled:opacity-60"
            style={{ background: 'var(--brand)', boxShadow: '0 8px 24px rgba(163,55,87,0.24)' }}
          >
            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
            {isSubmitting ? 'Creating…' : 'Create and add exercises'}
          </button>
        </div>
      </div>

      <SubmitStatus isSubmitting={isSubmitting} submittingLabel="Creating programme…" />
    </PageContainer>
  );
}
