'use client';

// Edit a programme's details: name, goal, difficulty and length.
//
// There was no way to do this. The New programme sheet was the only place
// these were ever set, the builder only saves progression rules, and the
// programme page offered "Edit Exercises" alone — so a typo in a name meant
// deleting and recreating the programme, assignments and all. The server has
// always taken these fields on PUT /plans/:id; nothing called it for them.
//
// Sessions per week is deliberately absent: it is counted from the days the
// builder programmes (migration 219), so it is edited there, by adding or
// removing a day.

import { useMemo } from 'react';
import { m } from 'framer-motion';
import { Loader2, Pencil, X } from 'lucide-react';
import { api } from '@/lib/api';
import type { WorkoutPlan } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { useDialogA11y } from '@/hooks/useDialogA11y';
import {
  ChoiceChips, FormErrorBanner, NumberField, SubmitStatus, TextField,
} from '@/components/ui/form';
import { useAppForm } from '@/lib/forms/useAppForm';
import {
  PROGRAMME_NAME_MAX, programmeDetailsDefaults, programmeDetailsSchema,
  toProgrammeDetailsPatch,
} from '@/lib/forms/schemas/programmeDetails';
import {
  PROGRAMME_DIFFICULTIES, PROGRAMME_GOALS, WEEKS_MAX,
} from '@/lib/programme-options';

export interface EditProgrammeDialogProps {
  plan: WorkoutPlan;
  onClose: () => void;
  onSaved: (plan: WorkoutPlan) => void;
}

export default function EditProgrammeDialog({ plan, onClose, onSaved }: EditProgrammeDialogProps) {
  const { toast } = useToast();
  const dialogRef = useDialogA11y({ open: true, onClose });

  // A programme longer than the form's own ceiling (the server allows up to
  // 104 weeks) must not be silently shortened by an edit to its name.
  const weeksMax = Math.max(WEEKS_MAX, plan.duration_weeks || 0);
  const schema = useMemo(() => programmeDetailsSchema(weeksMax), [weeksMax]);

  const f = useAppForm({
    schema,
    defaultValues: programmeDetailsDefaults(plan),
    onSubmit: async (values) => {
      // Only what changed. Sending an untouched field is harmless for most of
      // these, but a length that did not change must not look like one that
      // did — the server moves running assignments' end dates when it does.
      const patch = toProgrammeDetailsPatch(plan, values);
      if (Object.keys(patch).length === 0) return;

      await api.workouts.plans.update(plan.id, patch);
      const fresh = await api.workouts.plans.detail(plan.id);
      toast.success('Programme updated');
      onSaved(fresh);
    },
    onSuccess: () => onClose(),
  });
  const { form, submit, errors, isSubmitting } = f;

  return (
    <m.div
      data-no-pull-refresh
      className="fixed inset-0 z-[120] flex items-end justify-center p-0 sm:items-center sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ background: 'var(--bg-overlay)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
        onClick={onClose}
      />

      <m.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-programme-title"
        className="relative flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl"
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          boxShadow: '0 24px 80px rgba(15,23,42,0.28)',
        }}
      >
        <div className="flex justify-center pt-3 sm:hidden" aria-hidden="true">
          <div className="h-1 w-9 rounded-full" style={{ background: 'var(--border)' }} />
        </div>

        <div
          className="flex items-start justify-between gap-3 px-5 pb-4 pt-4 sm:pt-5"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-[12px]"
              style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}
            >
              <Pencil size={17} />
            </span>
            <div className="min-w-0">
              <h2
                id="edit-programme-title"
                className="truncate text-[17px] font-[800] tracking-[-0.01em]"
                style={{ color: 'var(--text-primary)' }}
              >
                Edit details
              </h2>
              <p className="mt-0.5 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                Exercises and days are edited in the builder.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1.5 -mt-1 flex h-[44px] w-[44px] flex-shrink-0 items-center justify-center rounded-[12px]"
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
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
            <form.Field name="name">
              {(field) => (
                <TextField
                  field={field}
                  label="Programme name"
                  required
                  maxLength={PROGRAMME_NAME_MAX}
                  showCount
                  serverError={errors.fieldErrors.name}
                  className="mb-3"
                />
              )}
            </form.Field>

            <form.Field name="goal">
              {(field) => (
                <ChoiceChips
                  field={field}
                  legend="Goal"
                  options={PROGRAMME_GOALS}
                  serverError={errors.fieldErrors.goal}
                  className="mb-3"
                />
              )}
            </form.Field>

            <form.Field name="difficulty">
              {(field) => (
                <ChoiceChips
                  field={field}
                  legend="Difficulty"
                  options={PROGRAMME_DIFFICULTIES}
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
                  max={weeksMax}
                  serverError={errors.fieldErrors.duration_weeks}
                  className="mb-1"
                />
              )}
            </form.Field>
            <p className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
              Clients on this programme have their end date moved to match.
            </p>
          </div>

          <div
            className="px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-4"
            style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-elevated)' }}
          >
            <FormErrorBanner errors={errors} onRetry={() => void submit()} className="mb-3" />
            <SubmitStatus isSubmitting={isSubmitting} submittingLabel="Saving programme…" />
            <button
              type="submit"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
              className="flex h-[48px] w-full items-center justify-center gap-2 rounded-[14px] text-[14px] font-[700] text-white transition-transform active:scale-[0.98] disabled:opacity-60"
              style={{ background: 'var(--brand)', boxShadow: '0 8px 24px rgba(91,99,246,0.24)' }}
            >
              {isSubmitting && <Loader2 size={16} className="animate-spin" />}
              {isSubmitting ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </m.div>
    </m.div>
  );
}
