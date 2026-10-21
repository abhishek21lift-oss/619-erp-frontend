'use client';

import { useMemo } from 'react';
import { Check, Target } from 'lucide-react';
import FloatInput from '@/components/ui/FloatInput';
import { emerald, gray, red, tint } from '@/lib/palette';
import { smartChecklist } from '@/lib/goal-plan';
import GoalStepCard from './GoalStepCard';
import type { GoalFormData } from './types';

interface StepSmartGoalProps {
  form: GoalFormData;
  set: <K extends keyof GoalFormData>(key: K, val: GoalFormData[K]) => void;
  /** Current step id — the heading counts from it. */
  step: number;
  error?: string;
}

/**
 * The SMART builder. The statement was previously only collected for custom
 * goals, so every standard goal was stored with no description at all — and
 * the checklist below is derived from the form, not from a promise that the
 * goal is SMART.
 */
export function StepSmartGoal({ form, set, step, error }: StepSmartGoalProps) {
  const checklist = useMemo(() => smartChecklist({
    goalType: form.goalType, goalName: form.goalName, statement: form.goalDescription,
    successMetric: form.successMetric, targetWeight: form.targetWeight,
    targetBodyFat: form.targetBodyFat, targetDate: form.targetDate,
  }, { priorityGoal: form.priorityGoal }), [form]);

  const done = checklist.filter((c) => c.done).length;

  return (
    <GoalStepCard
      icon={Target} title="SMART Goal" step={step}
      hint="write the goal the way the client would say it"
      badge={
        <span
          className="rounded-full px-3 py-1.5 text-[11.5px] font-[760]"
          style={{ background: done === checklist.length ? tint(emerald[500], 0.12) : gray[100], color: done === checklist.length ? emerald[700] : gray[600] }}
        >
          {done} / {checklist.length} SMART
        </span>
      }
    >
      <div className="space-y-6">
        <FloatInput
          label={form.goalType === 'custom' ? 'Goal Statement' : 'Goal Statement (SMART)'}
          multiline autoGrow maxLength={2000}
          value={form.goalDescription} onChange={(v) => set('goalDescription', v)}
          placeholder="Lose 6 kg of fat by 20 December, training three mornings a week at the studio."
        />

        <FloatInput
          label="Success metric" maxLength={200}
          value={form.successMetric} onChange={(v) => set('successMetric', v)}
          placeholder="e.g. 78 kg at 18% body fat, or 5 strict pull-ups"
        />

        <div className="rounded-[18px] p-4" style={{ background: gray[50], border: `1px solid ${gray[200]}` }}>
          <p className="mb-3 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: gray[500] }}>SMART Check</p>
          <ul className="space-y-2">
            {checklist.map((row) => (
              <li key={row.key} className="flex items-start gap-3">
                <span
                  className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full"
                  style={{ background: row.done ? tint(emerald[500], 0.15) : gray[200] }}
                >
                  {row.done
                    ? <Check size={12} strokeWidth={3} style={{ color: emerald[700] }} />
                    : <span className="text-[10.5px] font-[800]" style={{ color: gray[600] }}>{row.key}</span>}
                </span>
                <div className="min-w-0">
                  <p className="text-[12.5px] font-[700]" style={{ color: row.done ? gray[700] : red[600] }}>
                    {row.label}
                  </p>
                  {!row.done && <p className="text-[11.5px]" style={{ color: gray[500] }}>{row.detail}</p>}
                </div>
              </li>
            ))}
          </ul>
          {/* Targets, priority and deadline live in later steps; saying so
              beats an amber tick that looks like a problem on step 2. */}
          <p className="mt-3 text-[11.5px]" style={{ color: gray[400] }}>
            Measurable, Achievable and Time-bound complete as you fill in targets, priority and deadline in the next steps.
          </p>
        </div>

        {error && <p className="text-[11px] font-medium" style={{ color: 'var(--danger-text)' }}>{error}</p>}
      </div>
    </GoalStepCard>
  );
}

export default StepSmartGoal;
