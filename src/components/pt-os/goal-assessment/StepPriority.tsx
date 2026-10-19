'use client';

import { ListChecks } from 'lucide-react';
import GoalStepCard from './GoalStepCard';
import { PRIORITY_META } from './types';
import type { GoalFormData } from './types';

interface StepPriorityProps {
  form: GoalFormData;
  set: <K extends keyof GoalFormData>(key: K, val: GoalFormData[K]) => void;
  step: number;
  error?: string;
}

export function StepPriority({ form, set, step, error }: StepPriorityProps) {
  return (
    <GoalStepCard icon={ListChecks} title="Priority Goal" step={step} hint="what matters most right now?">
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
                background: selected ? 'rgba(0,103,224,0.06)' : 'var(--bg-subtle)',
                border: selected ? '2px solid #0067E0' : '2px solid var(--border)',
                boxShadow: selected ? '0 4px 16px rgba(0,103,224,0.18)' : 'none',
                transform: selected ? 'scale(1.02)' : 'scale(1)',
              }}
            >
              <p.icon size={21} strokeWidth={1.75} color={selected ? '#0059CE' : 'var(--text-muted)'} />
              <span className="text-[11.5px] font-[700]" style={{ color: selected ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{p.label}</span>
            </button>
          );
        })}
      </div>

      {error && <p className="mt-3 text-[11px] font-medium" style={{ color: 'var(--danger-text)' }}>{error}</p>}
    </GoalStepCard>
  );
}

export default StepPriority;
