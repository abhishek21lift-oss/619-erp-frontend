'use client';

import { useMemo } from 'react';
import { CalendarClock } from 'lucide-react';
import FloatInput from '@/components/ui/FloatInput';
import { daysRemaining } from '@/lib/goal-calculations';
import type { GoalFormData } from './types';

interface StepDeadlineProps {
  form: GoalFormData;
  set: <K extends keyof GoalFormData>(key: K, val: GoalFormData[K]) => void;
  error?: string;
}

export function StepDeadline({ form, set, error }: StepDeadlineProps) {
  const days = useMemo(() => daysRemaining(form.targetDate || null), [form.targetDate]);
  const weeks = days != null ? Math.round((days / 7) * 10) / 10 : null;
  const months = days != null ? Math.round((days / 30.44) * 10) / 10 : null;

  return (
    <div className="rounded-[24px] overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 4px 24px rgba(15,23,42,0.06)' }}>
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#0f172a,#334155)' }} />
      <div className="p-7 sm:p-10">
        <div className="flex items-start gap-4 mb-7">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: '#0f172a' }}>
            <CalendarClock size={20} color="#1CA3F9" />
          </div>
          <div>
            <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-slate-900 leading-none">Target Deadline</h2>
            <p className="text-[13px] text-slate-400 mt-1.5">Step 4 of 8 — when should this goal be achieved?</p>
          </div>
        </div>

        <div className="max-w-[280px]">
          <FloatInput label="Target Date" required type="date" value={form.targetDate} onChange={(v) => set('targetDate', v)} error={error} />
        </div>

        {days != null && (
          <div className="mt-6 rounded-[16px] p-6 text-center" style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e293b 100%)' }}>
            <p className="text-[40px] font-[900] leading-none" style={{ color: days < 0 ? '#ef4444' : '#0067E0' }}>
              {days < 0 ? `${Math.abs(days)} Days Overdue` : `${days} Days Remaining`}
            </p>
            {days >= 0 && (
              <p className="mt-2 text-[12.5px] font-[600] text-white/50">
                ≈ {weeks} weeks · {months} months
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default StepDeadline;
