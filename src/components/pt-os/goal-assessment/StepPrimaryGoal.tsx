'use client';

import { Plus, Trash2, User } from 'lucide-react';
import FloatInput from '@/components/ui/FloatInput';
import { FormField, SelectInput } from '@/components/ui';
import { gray, indigo, tint } from '@/lib/palette';
import GoalStepCard from './GoalStepCard';
import {
  GOAL_TYPE_META, MAX_SECONDARY_GOALS, emptySecondaryGoal,
} from './types';
import type { GoalFormData, SecondaryGoalDraft } from './types';

interface StepPrimaryGoalProps {
  form: GoalFormData;
  set: <K extends keyof GoalFormData>(key: K, val: GoalFormData[K]) => void;
  step: number;
  today: string;
  error?: string;
}

export function StepPrimaryGoal({ form, set, step, today, error }: StepPrimaryGoalProps) {
  const setSecondary = (id: string, patch: Partial<SecondaryGoalDraft>) => {
    set('secondaryGoals', form.secondaryGoals.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  };

  const removeSecondary = (id: string) => {
    set('secondaryGoals', form.secondaryGoals.filter((g) => g.id !== id));
  };

  const addSecondary = () => {
    if (form.secondaryGoals.length >= MAX_SECONDARY_GOALS) return;
    set('secondaryGoals', [...form.secondaryGoals, emptySecondaryGoal()]);
  };

  return (
    <GoalStepCard
      icon={User} title="Primary Goal" step={step}
      hint="the one outcome this plan is built around — then any extras worth tracking"
    >
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
        {GOAL_TYPE_META.map((g) => {
          const selected = form.goalType === g.value;
          return (
            <button
              key={g.value} type="button"
              onClick={() => set('goalType', g.value)}
              aria-pressed={selected}
              className="flex flex-col items-center gap-2 rounded-[18px] px-3 py-4 text-center transition-all duration-200 sm:py-5"
              style={{
                background: selected ? 'linear-gradient(160deg, #FFF7F3 0%, #FFE9E0 100%)' : 'var(--bg-subtle)',
                border: selected ? '1.5px solid #A33757' : '1.5px solid var(--border)',
                boxShadow: selected ? '0 10px 24px -14px rgba(163,55,87,0.55)' : 'none',
                transform: selected ? 'translateY(-1px)' : 'none',
              }}
            >
              <span
                className="flex h-9 w-9 items-center justify-center rounded-[12px]"
                style={{ background: selected ? 'rgba(163,55,87,0.10)' : 'var(--bg-card)' }}
              >
                <g.icon size={19} strokeWidth={1.75} color={selected ? indigo[700] : 'var(--text-muted)'} />
              </span>
              <span
                className="text-[12px] font-[760] leading-tight sm:text-[12.5px]"
                style={{ color: selected ? indigo[700] : 'var(--text-secondary)' }}
              >
                {g.label}
              </span>
            </button>
          );
        })}
      </div>

      {form.goalType === 'custom' && (
        <div className="mt-5">
          <FloatInput label="Goal Name" required maxLength={200} value={form.goalName} onChange={(v) => set('goalName', v)} />
          <p className="mt-2 text-[11.5px]" style={{ color: gray[500] }}>
            You will write the goal statement on the next step.
          </p>
        </div>
      )}

      {error && <p className="mt-3 text-[11px] font-medium" style={{ color: 'var(--danger-text)' }}>{error}</p>}

      <div className="mt-8 border-t pt-6" style={{ borderColor: gray[200] }}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-[760] uppercase tracking-[0.14em]" style={{ color: indigo[600] }}>Optional</p>
            <h3 className="mt-1 text-[16px] font-[800] tracking-[-0.02em]" style={{ color: gray[900] }}>Secondary fitness goals</h3>
            <p className="mt-1 max-w-[54ch] text-[12px] leading-relaxed" style={{ color: gray[500] }}>
              Extra outcomes the client cares about. The primary goal above stays the one active goal and drives the plan;
              these are tracked alongside it.
            </p>
          </div>
          <span
            className="rounded-full px-2.5 py-1 text-[11px] font-[760]"
            style={{ background: tint(indigo[500], 0.08), color: indigo[700] }}
          >
            {form.secondaryGoals.length} / {MAX_SECONDARY_GOALS}
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {form.secondaryGoals.map((goal, index) => (
            <div
              key={goal.id}
              className="rounded-[18px] p-4"
              style={{ background: gray[50], border: `1px solid ${gray[200]}` }}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-[10.5px] font-[760] uppercase tracking-[0.12em]" style={{ color: gray[500] }}>
                  Secondary {index + 1}
                </p>
                <button
                  type="button"
                  onClick={() => removeSecondary(goal.id)}
                  aria-label={`Remove secondary goal ${index + 1}`}
                  className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white"
                  style={{ color: gray[500], border: `1px solid ${gray[200]}` }}
                >
                  <Trash2 size={13} />
                </button>
              </div>

              <FloatInput
                label="Goal" maxLength={200}
                value={goal.title} onChange={(v) => setSecondary(goal.id, { title: v })}
                placeholder="Run 5 km without stopping"
              />

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormField label="Goal type (optional)">
                  <SelectInput
                    value={goal.goalType}
                    onChange={(e) => setSecondary(goal.id, { goalType: e.target.value as SecondaryGoalDraft['goalType'] })}
                  >
                    <option value="">No type</option>
                    {GOAL_TYPE_META.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
                  </SelectInput>
                </FormField>
                <FloatInput
                  label="Target date (optional)" type="date" min={today}
                  value={goal.targetDate} onChange={(v) => setSecondary(goal.id, { targetDate: v })}
                />
              </div>

              <div className="mt-3">
                <FloatInput
                  label="Why it matters (optional)" multiline autoGrow maxLength={500}
                  value={goal.description} onChange={(v) => setSecondary(goal.id, { description: v })}
                  placeholder="What this unlocks for the client day to day."
                />
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addSecondary}
          disabled={form.secondaryGoals.length >= MAX_SECONDARY_GOALS}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-[16px] border border-dashed px-4 py-3 text-[12.5px] font-[760] transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          style={{ borderColor: tint(indigo[500], 0.35), color: indigo[700], background: 'transparent' }}
        >
          <Plus size={15} /> Add secondary goal
        </button>
      </div>
    </GoalStepCard>
  );
}

export default StepPrimaryGoal;
