'use client';

import { useMemo } from 'react';
import { CalendarClock } from 'lucide-react';
import FloatInput from '@/components/ui/FloatInput';
import GoalStepCard from './GoalStepCard';
import { daysRemaining } from '@/lib/goal-calculations';
import type { GoalFormData } from './types';

interface StepDeadlineProps {
  form: GoalFormData;
  set: <K extends keyof GoalFormData>(key: K, val: GoalFormData[K]) => void;
  step: number;
  error?: string;
}

export function StepDeadline({ form, set, step, error }: StepDeadlineProps) {
  const days = useMemo(() => daysRemaining(form.targetDate || null), [form.targetDate]);
  const weeks = days != null ? Math.round((days / 7) * 10) / 10 : null;
  const months = days != null ? Math.round((days / 30.44) * 10) / 10 : null;

  return (
    <GoalStepCard icon={CalendarClock} title="Target Deadline" step={step} hint="when should this goal be achieved?">
      <div className="max-w-[280px]">
        <FloatInput label="Target Date" required type="date" value={form.targetDate} onChange={(v) => set('targetDate', v)} error={error} />
      </div>

      {days != null && (
        <div className="mt-6 rounded-[16px] p-6 text-center" style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e293b 100%)' }}>
          <p className="text-[40px] font-[900] leading-none" style={{ color: days < 0 ? '#ef4444' : '#3F46D6' }}>
            {days < 0 ? `${Math.abs(days)} Days Overdue` : `${days} Days Remaining`}
          </p>
          {days >= 0 && (
            <p className="mt-2 text-[12.5px] font-[600] text-white/50">
              ≈ {weeks} weeks · {months} months
            </p>
          )}
        </div>
      )}
    </GoalStepCard>
  );
}

export default StepDeadline;
