'use client';

// Create a programme, then open it in the builder.
//
// ── What this replaces, and why the flow changed ───────────────────────────
//
// The Programs screen used to carry a four-step wizard: pick a client, name
// the plan, add every exercise, save. That wizard was the ONLY way to create a
// plan with exercises in it, so it could not simply be deleted when the new
// builder landed — creating a programme would have stopped working.
//
// It is replaced rather than ported. The wizard existed because there was
// nowhere else to add exercises; now there is. So this captures only what a
// plan needs to EXIST — client, name, goal, length — and hands straight over
// to the builder, which is where exercises belong. Two short steps instead of
// one long form, and the second step is a screen you will return to anyway.
//
// The client is still chosen here because assignment happens on create: a
// programme nobody is on is a template, and the trainer who just typed a name
// almost always has a client in mind.
//
// Weeks is a string until submit. The old dialog clamped it on blur, so a
// cleared box became a deliberate-looking one-week programme. A blank or
// unparseable box is now an error, not a value.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '@tanstack/react-form';
import { useRouter } from 'next/navigation';
import { m } from 'framer-motion';
import { Dumbbell, Loader2, X } from 'lucide-react';
import { api } from '@/lib/api';
import type { WorkoutPlan } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { useDialogA11y } from '@/hooks/useDialogA11y';
import { assignWorkoutPlan } from '@/lib/workoutAssign';
import {
  ChoiceChips, FormErrorBanner, NumberField, RadioField, SearchField, SubmitStatus,
  TextField, type FieldLike,
} from '@/components/ui/form';
import { useAppForm } from '@/lib/forms/useAppForm';
import { PROGRAMME_NAME_MAX } from '@/lib/forms/schemas/programmeDetails';
import {
  programmeCreateDefaults, programmeCreateSchema, toProgrammeCreatePayload,
} from '@/lib/forms/schemas/programmeCreate';

export interface ClientOption { id: string; name: string; }

export const PROGRAMME_GOALS = [
  { value: 'muscle_gain', label: 'Muscle Gain' },
  { value: 'strength', label: 'Strength' },
  { value: 'weight_loss', label: 'Weight Loss' },
  { value: 'endurance', label: 'Endurance' },
  { value: 'general_fitness', label: 'General Fitness' },
  { value: 'recovery', label: 'Recovery' },
] as const;

/**
 * How hard the programme is. It was never asked: every programme was saved
 * as "intermediate", and that word then showed on the programme page and in
 * the member app for a client's first-ever plan as much as for a meet prep.
 */
export const PROGRAMME_DIFFICULTIES = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
] as const;

/** The create form's ceiling. The server accepts longer plans; new ones do not. */
export const WEEKS_MAX = 52;

/**
 * The programme goal a screening answer implies.
 *
 * Two vocabularies meet here. The Goal Assessment screening stores one of
 * fourteen `goal_type` values (migration 055); a programme has five. Only the
 * pairs that mean the same thing are mapped:
 *
 *   fat_loss      → Weight Loss    the same goal under two names
 *   marathon_prep → Endurance      marathon preparation IS endurance work
 *   strength_gain → Strength       since Strength became a programme goal
 *   powerlifting  → Strength       (migration 219); a meet prep is strength work
 *
 * The rest — body_recomposition, mobility, wedding_transformation,
 * medical_fitness, senior_fitness, athletic_performance, custom — have no
 * honest equivalent among the six, so they map to nothing and the trainer's
 * own selection stands. Guessing here
 * would put a goal on the programme that nobody chose.
 */
const SCREENING_GOALS: Record<string, string> = {
  fat_loss: 'weight_loss',
  marathon_prep: 'endurance',
  strength_gain: 'strength',
  powerlifting: 'strength',
};

/**
 * Match a stored goal to one of the five programme goals.
 *
 * Handles both sources: the screening's `goal_type` and `pt_clients.goal`,
 * which is free TEXT (migration 050) filled by the onboarding wizard and so
 * arrives as "muscle_gain", "Muscle Gain" or "muscle gain". Anything that does
 * not map returns undefined and the dialog leaves the current selection alone.
 */
export function goalFromClient(raw: unknown): string | undefined {
  const key = String(raw ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (!key) return undefined;
  return PROGRAMME_GOALS.find((g) => g.value === key)?.value ?? SCREENING_GOALS[key];
}

/**
 * The programme difficulty a client's recorded workout experience implies.
 *
 * `pt_clients.workout_experience_level` is the PT Enrollment field (migration
 * 077): beginner, intermediate, advanced or athlete. The first three are the
 * programme's own words; an athlete gets an advanced programme. Anything else
 * returns undefined and the selection stands.
 *
 * Sessions per week used to be read here too. It is no longer asked: the
 * number is counted from the days the builder programmes (migration 219), so
 * a figure typed before any exercise existed cannot disagree with them.
 */
export function difficultyFromClient(raw: unknown): string | undefined {
  const key = String(raw ?? '').trim().toLowerCase();
  if (key === 'athlete') return 'advanced';
  return PROGRAMME_DIFFICULTIES.find((d) => d.value === key)?.value;
}

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

export interface NewProgrammeDialogProps {
  open: boolean;
  onClose: () => void;
  /** Preselects the client when opened from a client-scoped screen. */
  presetClientId?: string | null;
  /** Lets the Programs list refresh without this component knowing how. */
  onCreated?: (plan: WorkoutPlan) => void;
}

export default function NewProgrammeDialog({
  open, onClose, presetClientId, onCreated,
}: NewProgrammeDialogProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [clients, setClients] = useState<ClientOption[]>([]);
  const [search, setSearch] = useState('');
  // Escape, focus trap and focus restore. This dialog had none of the three:
  // it could only be dismissed with a mouse, and Tab left it immediately.
  const dialogRef = useDialogA11y({ open: true, onClose });

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
        plan,
        { id: clientId, name: clientName },
        toast,
        (path) => router.push(path),
      );

      onCreated?.(plan);
      router.push(`/pt-os/workout-plans/${plan.id}/builder`);
    },
  });
  const { form, submit, resetTo, errors, isSubmitting } = f;
  const clientId = useStore(form.store, (s) => String(s.values.client_id ?? ''));

  useEffect(() => {
    if (!open) return;
    touched.current = { goal: false, difficulty: false };
    setSearch('');
    resetTo(programmeCreateDefaults(presetClientId));
    api.pt.clients()
      .then((r: { data?: unknown[] }) => {
        setClients(((r?.data ?? []) as Array<{ id: string; name: string }>)
          .map((c) => ({ id: c.id, name: c.name })));
      })
      .catch(() => setClients([]));
  }, [open, presetClientId, resetTo]);

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
   * record says how long a block should run, and "filling" it with the 4 the
   * form opened with was a step that changed nothing.
   */
  useEffect(() => {
    if (!open || !clientId) return;
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
  }, [open, clientId, form]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? clients.filter((c) => c.name.toLowerCase().includes(q)) : clients;
  }, [clients, search]);

  if (!open) return null;

  return (
    <m.div
      // z-[120], not z-50. The AI assistant's floating button is z-100 and
      // fixed to the bottom-right, so at z-50 this sheet opened UNDERNEATH it
      // and the FAB sat on top of the "Create and add exercises" button —
      // covering the sheet's primary action on a 390px screen. Above the FAB
      // and the nav, below the toasts (z-9999) and the impersonation banner
      // (z-10000), both of which should outrank a dialog.
      data-no-pull-refresh
      className="fixed inset-0 z-[120] flex items-end justify-center p-0 sm:items-center sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
    >
      {/* The backdrop is its own element, not the wrapper.
          `aria-hidden` because it is a mouse affordance only: click-outside to
          dismiss. Giving it a key handler would add a tab stop that announces
          nothing and does nothing — Escape is the keyboard equivalent, and
          useDialogA11y provides it. */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background: 'var(--bg-overlay)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
        onClick={onClose}
      />

      <m.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-programme-title"
        className="relative flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl"
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
        style={{
          // --bg-elevated, NOT --bg-card. This is the bug that made the sheet
          // look transparent: --bg-card is rgba(255,255,255,0.8) in light and
          // rgba(30,41,59,0.7) in dark — a frosted-glass CARD token, which only
          // reads as glass when something behind it is blurred. Used raw on a
          // floating panel with no backdrop-filter, the page simply showed
          // through it at 20-30%. --bg-elevated is the opaque surface token
          // (#FFFFFF / #1E293B) and is what every other dialog in the app uses.
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          boxShadow: '0 24px 80px rgba(15,23,42,0.28)',
        }}
      >
        {/* Grab handle, mobile only — the affordance that says this sheet can
            be dismissed downward, and the visual cue that it is a sheet rather
            than a page. */}
        <div className="flex justify-center pt-3 sm:hidden" aria-hidden="true">
          <div className="h-1 w-9 rounded-full" style={{ background: 'var(--border)' }} />
        </div>

        {/* Header — outside the scroll area, so the title stays put while a
            long client list moves underneath it. */}
        <div
          className="flex items-start justify-between gap-3 px-5 pb-4 pt-4 sm:pt-5"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-[12px]"
              style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}
            >
              <Dumbbell size={18} />
            </span>
            <div className="min-w-0">
              <h2
                id="new-programme-title"
                className="truncate text-[17px] font-[800] tracking-[-0.01em]"
                style={{ color: 'var(--text-primary)' }}
              >
                New programme
              </h2>
              <p className="mt-0.5 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                Name it and set its shape — exercises come next.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1.5 -mt-1 flex h-[44px] w-[44px] flex-shrink-0 items-center justify-center rounded-[12px] transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={18} />
          </button>
        </div>

        <form
          noValidate
          onSubmit={(e) => { e.preventDefault(); void submit(); }}
          className="flex min-h-0 flex-1 flex-col"
        >
          {/* Body — the only part that scrolls. */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
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
          </div>

          {/* Footer — pinned. The panel used to be one scrolling column, so on a
              short screen with the client list open the primary action scrolled
              out of view and the sheet looked like it had no way forward. */}
          <div
            className="px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-4"
            style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-elevated)' }}
          >
            <FormErrorBanner errors={errors} onRetry={() => void submit()} className="mb-3" />
            <SubmitStatus isSubmitting={isSubmitting} submittingLabel="Creating programme…" />
            <button
              type="submit"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
              className="flex h-[48px] w-full items-center justify-center gap-2 rounded-[14px] text-[14px] font-[700] text-white transition-transform active:scale-[0.98] disabled:opacity-60"
              style={{ background: 'var(--brand)', boxShadow: '0 8px 24px rgba(2,113,235,0.24)' }}
            >
              {isSubmitting && <Loader2 size={16} className="animate-spin" />}
              {isSubmitting ? 'Creating…' : 'Create and add exercises'}
            </button>
            <p className="mt-2 text-center text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
              You will add exercises next, in the builder.
            </p>
          </div>
        </form>
      </m.div>
    </m.div>
  );
}
