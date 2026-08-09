'use client';

import { Target } from 'lucide-react';
import FloatInput from '@/components/ui/FloatInput';
import { GOAL_TYPE_META } from './types';
import type { GoalFormData } from './types';

interface StepPrimaryGoalProps {
  form: GoalFormData;
  set: <K extends keyof GoalFormData>(key: K, val: GoalFormData[K]) => void;
  error?: string;
}

export function StepPrimaryGoal({ form, set, error }: StepPrimaryGoalProps) {
  return (
    <div className="rounded-[24px] overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 4px 24px rgba(15,23,42,0.06)' }}>
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#0f172a,#334155)' }} />
      <div className="p-7 sm:p-10">
        <div className="flex items-start gap-4 mb-7">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: '#0f172a' }}>
            <Target size={20} color="#1CA3F9" />
          </div>
          <div>
            <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-slate-900 leading-none">Primary Goal</h2>
            <p className="text-[13px] text-slate-400 mt-1.5">Step 1 of 8 — what does this client want to achieve?</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {GOAL_TYPE_META.map((g) => {
            const selected = form.goalType === g.value;
            return (
              <button
                key={g.value} type="button"
                onClick={() => set('goalType', g.value)}
                className="flex flex-col items-center gap-2 rounded-[16px] px-4 py-5 text-center transition-all duration-200"
                style={{
                  background: selected ? 'rgba(0,103,224,0.06)' : 'var(--bg-subtle)',
                  border: selected ? '2px solid #0067E0' : '2px solid rgba(15,23,42,0.08)',
                  boxShadow: selected ? '0 4px 16px rgba(0,103,224,0.18)' : 'none',
                  transform: selected ? 'scale(1.02)' : 'scale(1)',
                }}
              >
                {/* Inherits the selected colour, which an emoji could not. */}
                <g.icon size={24} strokeWidth={1.75} color={selected ? '#0059CE' : '#64748b'} />
                <span className="text-[12.5px] font-[700]" style={{ color: selected ? '#0f172a' : '#475569' }}>{g.label}</span>
              </button>
            );
          })}
        </div>

        {error && <p className="mt-3 text-[11px] font-medium" style={{ color: 'var(--danger-text)' }}>{error}</p>}

        {form.goalType === 'custom' && (
          <div className="mt-6 space-y-4">
            <FloatInput label="Goal Name" required value={form.goalName} onChange={(v) => set('goalName', v)} />
            <FloatInput label="Goal Description" multiline autoGrow value={form.goalDescription} onChange={(v) => set('goalDescription', v)} />
          </div>
        )}
      </div>
    </div>
  );
}

export default StepPrimaryGoal;
