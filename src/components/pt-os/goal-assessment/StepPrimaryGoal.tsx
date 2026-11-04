'use client';

import { User } from 'lucide-react';
import FloatInput from '@/components/ui/FloatInput';
import { gray } from '@/lib/palette';
import GoalStepCard from './GoalStepCard';
import { GOAL_TYPE_META } from './types';
import type { GoalFormData } from './types';

interface StepPrimaryGoalProps {
  form: GoalFormData;
  set: <K extends keyof GoalFormData>(key: K, val: GoalFormData[K]) => void;
  step: number;
  error?: string;
}

export function StepPrimaryGoal({ form, set, step, error }: StepPrimaryGoalProps) {
  return (
    <GoalStepCard icon={User} title="Primary Goal" step={step} hint="what this client wants to achieve">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {GOAL_TYPE_META.map((g) => {
          const selected = form.goalType === g.value;
          return (
            <button
              key={g.value} type="button"
              onClick={() => set('goalType', g.value)}
              aria-pressed={selected}
              className="flex flex-col items-center gap-2 rounded-[16px] px-4 py-5 text-center transition-all duration-200"
              style={{
                background: selected ? 'rgba(163,55,87,0.06)' : 'var(--bg-subtle)',
                border: selected ? '2px solid #A33757' : '2px solid var(--border)',
                boxShadow: selected ? '0 4px 16px rgba(163,55,87,0.18)' : 'none',
                transform: selected ? 'scale(1.02)' : 'scale(1)',
              }}
            >
              {/* Inherits the selected colour, which an emoji could not. */}
              <g.icon size={24} strokeWidth={1.75} color={selected ? '#852E4E' : 'var(--text-muted)'} />
              <span className="text-[12.5px] font-[700]" style={{ color: selected ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{g.label}</span>
            </button>
          );
        })}
      </div>

      {error && <p className="mt-3 text-[11px] font-medium" style={{ color: 'var(--danger-text)' }}>{error}</p>}

      {form.goalType === 'custom' && (
        <div className="mt-6">
          <FloatInput label="Goal Name" required maxLength={200} value={form.goalName} onChange={(v) => set('goalName', v)} />
          {/* The description is the SMART statement, and every goal type is
              asked for one on the next step, so it is not asked twice here. */}
          <p className="mt-3 text-[12px]" style={{ color: gray[500] }}>
            You will write the goal statement on the next step.
          </p>
        </div>
      )}
    </GoalStepCard>
  );
}

export default StepPrimaryGoal;
