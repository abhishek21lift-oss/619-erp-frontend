'use client';

import { ListChecks } from 'lucide-react';
import { PRIORITY_META } from './types';
import type { GoalFormData } from './types';

interface StepPriorityProps {
  form: GoalFormData;
  set: <K extends keyof GoalFormData>(key: K, val: GoalFormData[K]) => void;
  error?: string;
}

export function StepPriority({ form, set, error }: StepPriorityProps) {
  return (
    <div className="rounded-[24px] overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 4px 24px rgba(15,23,42,0.06)' }}>
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#0f172a,#334155)' }} />
      <div className="p-7 sm:p-10">
        <div className="flex items-start gap-4 mb-7">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: '#0f172a' }}>
            <ListChecks size={20} color="#F59E0B" />
          </div>
          <div>
            <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-slate-900 leading-none">Priority Goal</h2>
            <p className="text-[13px] text-slate-400 mt-1.5">Step 5 of 8 — what matters most right now?</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {PRIORITY_META.map((p) => {
            const selected = form.priorityGoal === p.value;
            return (
              <button
                key={p.value} type="button"
                onClick={() => set('priorityGoal', p.value)}
                className="flex flex-col items-center gap-2 rounded-[16px] px-3 py-4 text-center transition-all duration-200"
                style={{
                  background: selected ? 'rgba(245,158,11,0.06)' : 'var(--bg-subtle)',
                  border: selected ? '2px solid #F59E0B' : '2px solid rgba(15,23,42,0.08)',
                  boxShadow: selected ? '0 4px 16px rgba(245,158,11,0.18)' : 'none',
                  transform: selected ? 'scale(1.02)' : 'scale(1)',
                }}
              >
                <span className="text-[22px]">{p.icon}</span>
                <span className="text-[11.5px] font-[700]" style={{ color: selected ? '#0f172a' : '#475569' }}>{p.label}</span>
              </button>
            );
          })}
        </div>

        {error && <p className="mt-3 text-[11px] font-medium" style={{ color: 'var(--danger)' }}>{error}</p>}
      </div>
    </div>
  );
}

export default StepPriority;
