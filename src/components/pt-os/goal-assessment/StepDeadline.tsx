'use client';

import { useMemo } from 'react';
import { CalendarClock } from 'lucide-react';
import FloatInput from '@/components/ui/FloatInput';
import GoalStepCard from './GoalStepCard';
import { daysRemaining } from '@/lib/goal-calculations';
import { gray, indigo, tint } from '@/lib/palette';
import type { GoalFormData } from './types';

interface StepDeadlineProps {
  form: GoalFormData;
  set: <K extends keyof GoalFormData>(key: K, val: GoalFormData[K]) => void;
  step: number;
  /** Today, ISO — the earliest date the picker will offer. */
  today: string;
  error?: string;
}

const PRESET_WEEKS = [8, 12, 16, 24];

function isoAfterWeeks(weeks: number): string {
  const d = new Date();
  d.setDate(d.getDate() + weeks * 7);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function StepDeadline({ form, set, step, today, error }: StepDeadlineProps) {
  const days = useMemo(() => daysRemaining(form.targetDate || null), [form.targetDate]);
  const weeks = days != null ? Math.round((days / 7) * 10) / 10 : null;
  const months = days != null ? Math.round((days / 30.44) * 10) / 10 : null;

  return (
    <GoalStepCard icon={CalendarClock} title="Target Deadline" step={step} hint="when should this goal be achieved?">
      <div className="space-y-6">
        <div className="max-w-[280px]">
          <FloatInput label="Target Date" required type="date" min={today} value={form.targetDate} onChange={(v) => set('targetDate', v)} error={error} />
        </div>

        <div>
          <p className="mb-2 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: gray[500] }}>Quick presets</p>
          <div className="flex flex-wrap gap-2">
            {PRESET_WEEKS.map((w) => {
              const date = isoAfterWeeks(w);
              const selected = form.targetDate === date;
              return (
                <button
                  key={w} type="button" aria-pressed={selected}
                  onClick={() => set('targetDate', date)}
                  className="rounded-full px-4 py-2 text-[12px] font-[700] transition-all"
                  style={{
                    background: selected ? tint(indigo[500], 0.10) : 'var(--bg-subtle)',
                    border: selected ? `1.5px solid ${indigo[500]}` : `1px solid ${gray[200]}`,
                    color: selected ? indigo[700] : gray[600],
                  }}
                >
                  {w} weeks
                </button>
              );
            })}
          </div>
        </div>

        {days != null && (
          <div
            className="rounded-[20px] p-5 sm:p-6"
            style={{ background: `linear-gradient(160deg, ${indigo[50]} 0%, ${indigo[100]} 100%)`, border: `1px solid ${tint(indigo[500], 0.16)}` }}
          >
            <p className="text-[10.5px] font-[760] uppercase tracking-[0.14em]" style={{ color: indigo[700] }}>Time remaining</p>
            <p className="mt-1.5 text-[34px] font-[900] leading-none tracking-[-0.03em]" style={{ color: days < 0 ? '#b91c1c' : gray[900] }}>
              {days < 0 ? `${Math.abs(days)} days overdue` : `${days} days`}
            </p>
            {days >= 0 && (
              <p className="mt-2 text-[12.5px] font-[600]" style={{ color: gray[500] }}>
                ≈ {weeks} weeks · {months} months from today
              </p>
            )}
          </div>
        )}
      </div>
    </GoalStepCard>
  );
}

export default StepDeadline;
