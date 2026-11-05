'use client';

import { ListChecks } from 'lucide-react';
import GoalStepCard from './GoalStepCard';
import { PRIORITY_META } from './types';
import { indigo } from '@/lib/palette';
import type { GoalFormData } from './types';

interface StepPriorityProps {
  form: GoalFormData;
  set: <K extends keyof GoalFormData>(key: K, val: GoalFormData[K]) => void;
  step: number;
  error?: string;
}

export function StepPriority({ form, set, step, error }: StepPriorityProps) {
  return (
    <GoalStepCard icon={ListChecks} title="Priority" step={step}>
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {PRIORITY_META.map((p) => {
            const selected = form.priorityGoal === p.value;
            return (
              <button
                key={p.value} type="button"
                onClick={() => set('priorityGoal', p.value)}
                aria-pressed={selected}
                className="flex flex-col items-center gap-2 rounded-[16px] px-3 py-4 text-center transition-all duration-200"
                style={{
                  background: selected ? 'rgba(163,55,87,0.06)' : 'var(--bg-subtle)',
                  border: selected ? '2px solid #A33757' : '2px solid var(--border)',
                  boxShadow: selected ? '0 4px 16px rgba(163,55,87,0.12)' : 'none',
                }}
              >
                <p.icon size={20} style={{ color: selected ? '#852E4E' : 'var(--text-muted)' }} />
                <span className="text-[12px] font-[700]" style={{ color: selected ? '#852E4E' : 'var(--text-secondary)' }}>{p.label}</span>
              </button>
            );
          })}
        </div>

        {error && <p className="text-[11px] font-medium" style={{ color: 'var(--danger-text)' }}>{error}</p>}

        <p className="text-[11.5px]" style={{ color: indigo[700] }}>
          SMART&apos;s R is confirmed at the final review, when the client agrees to this goal.
        </p>
      </div>
    </GoalStepCard>
  );
}

export default StepPriority;
