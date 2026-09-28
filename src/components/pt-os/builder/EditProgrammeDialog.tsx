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

import { useState } from 'react';
import { m } from 'framer-motion';
import { Loader2, Pencil, X } from 'lucide-react';
import { api } from '@/lib/api';
import type { WorkoutPlan } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { useDialogA11y } from '@/hooks/useDialogA11y';
import { errorMessage } from '@/lib/forms/errors';
import {
  ChoiceField, PROGRAMME_DIFFICULTIES, PROGRAMME_GOALS, WEEKS_MAX, WEEKS_MIN, clamp,
} from './NewProgrammeDialog';

export interface EditProgrammeDialogProps {
  plan: WorkoutPlan;
  onClose: () => void;
  onSaved: (plan: WorkoutPlan) => void;
}

export default function EditProgrammeDialog({ plan, onClose, onSaved }: EditProgrammeDialogProps) {
  const { toast } = useToast();
  const dialogRef = useDialogA11y({ open: true, onClose });

  const [name, setName] = useState(plan.name);
  const [goal, setGoal] = useState<string>(plan.goal || 'general_fitness');
  const [difficulty, setDifficulty] = useState<string>(plan.difficulty || 'intermediate');
  const [weeks, setWeeks] = useState(String(plan.duration_weeks || 4));
  const [saving, setSaving] = useState(false);

  // A programme longer than the form's own ceiling (the server allows up to
  // 104 weeks) must not be silently shortened by an edit to its name.
  const weeksMax = Math.max(WEEKS_MAX, plan.duration_weeks || 0);

  const save = async () => {
    if (!name.trim()) { toast.error('Give the programme a name'); return; }

    // Only what changed. Sending an untouched field is harmless for most of
    // these, but a length that did not change must not look like one that
    // did — the server moves running assignments' end dates when it does.
    const nextWeeks = clamp(weeks, WEEKS_MIN, weeksMax);
    const patch: { name?: string; goal?: string; difficulty?: string; duration_weeks?: number } = {};
    if (name.trim() !== plan.name) patch.name = name.trim();
    if (goal !== plan.goal) patch.goal = goal;
    if (difficulty !== plan.difficulty) patch.difficulty = difficulty;
    if (nextWeeks !== plan.duration_weeks) patch.duration_weeks = nextWeeks;

    if (Object.keys(patch).length === 0) { onClose(); return; }

    setSaving(true);
    try {
      await api.workouts.plans.update(plan.id, patch);
      const fresh = await api.workouts.plans.detail(plan.id);
      toast.success('Programme updated');
      onSaved(fresh);
      onClose();
    } catch (err: unknown) {
      toast.error(errorMessage(err, 'Could not update the programme'));
    } finally {
      setSaving(false);
    }
  };

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
            onClick={onClose}
            aria-label="Close"
            className="-mr-1.5 -mt-1 flex h-[44px] w-[44px] flex-shrink-0 items-center justify-center rounded-[12px]"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          <label className="mb-3 block">
            <span className="mb-1.5 block text-[11px] font-[700] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Programme name
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              className="h-[48px] w-full rounded-[12px] px-3 text-[14px] outline-none"
              style={inputStyle}
            />
          </label>

          <ChoiceField label="Goal" options={PROGRAMME_GOALS} value={goal} onChange={setGoal} />
          <ChoiceField label="Difficulty" options={PROGRAMME_DIFFICULTIES} value={difficulty} onChange={setDifficulty} />

          <label className="mb-1 block">
            <span className="mb-1.5 block text-[11px] font-[700] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Weeks
            </span>
            <input
              value={weeks}
              inputMode="numeric"
              onChange={(e) => setWeeks(e.target.value)}
              onBlur={() => setWeeks(String(clamp(weeks, WEEKS_MIN, weeksMax)))}
              className="h-[48px] w-full rounded-[12px] px-3 text-[14px] outline-none"
              style={inputStyle}
            />
          </label>
          <p className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
            Clients on this programme have their end date moved to match.
          </p>
        </div>

        <div
          className="px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-4"
          style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-elevated)' }}
        >
          <button
            onClick={save}
            disabled={saving}
            className="flex h-[48px] w-full items-center justify-center gap-2 rounded-[14px] text-[14px] font-[700] text-white transition-transform active:scale-[0.98] disabled:opacity-60"
            style={{ background: 'var(--brand)', boxShadow: '0 8px 24px rgba(2,113,235,0.24)' }}
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </m.div>
    </m.div>
  );
}

const inputStyle: React.CSSProperties = {
  background: 'var(--bg-subtle)',
  border: '1px solid var(--border)',
  color: 'var(--text-primary)',
};
