'use client';

import { useMemo } from 'react';
import { ListTodo, CheckCircle2 } from 'lucide-react';
import type { DailyStepsBracket } from '@/lib/lifestyle-calculations';

interface WeeklyHabitGoalsProps {
  sleepDurationHours: number | null;
  waterIntakeLiters: number | null;
  dailyStepsBracket: DailyStepsBracket | null;
  stressLevel: number | null;
  mealFrequency: number | null;
}

const STEPS_BELOW_TARGET: DailyStepsBracket[] = ['<3000', '3000_5000', '5000_8000'];

export function WeeklyHabitGoals({ sleepDurationHours, waterIntakeLiters, dailyStepsBracket, stressLevel, mealFrequency }: WeeklyHabitGoalsProps) {
  const goals = useMemo(() => {
    const list: string[] = [];
    if (sleepDurationHours != null && sleepDurationHours < 7) list.push('Sleep 7–8 Hours');
    if (waterIntakeLiters != null && waterIntakeLiters < 3) list.push('Drink 3 Liters Water');
    if (dailyStepsBracket && STEPS_BELOW_TARGET.includes(dailyStepsBracket)) list.push('Walk 8,000 Steps');
    if (stressLevel != null && stressLevel >= 7) list.push('Reduce Stress');
    if (mealFrequency != null && mealFrequency < 4) list.push('Eat 4 Meals');
    list.push('Zero Missed Workouts');
    return list;
  }, [sleepDurationHours, waterIntakeLiters, dailyStepsBracket, stressLevel, mealFrequency]);

  return (
    <div className="rounded-[24px] overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 4px 24px rgba(15,23,42,0.06)' }}>
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#0f172a,#334155)' }} />
      <div className="p-7 sm:p-10">
        <div className="flex items-start gap-4 mb-6">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: '#0f172a' }}>
            <ListTodo size={20} color="#1CA3F9" />
          </div>
          <div>
            <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-slate-900 leading-none">Weekly Habit Goals</h2>
            <p className="text-[13px] text-slate-400 mt-1.5">Suggested targets for the week ahead.</p>
          </div>
        </div>

        <ul className="space-y-2.5">
          {goals.map((g) => (
            <li key={g} className="flex items-center gap-2.5 rounded-[12px] px-4 py-2.5" style={{ background: 'var(--bg-subtle)' }}>
              <CheckCircle2 size={16} style={{ color: '#10b981', flexShrink: 0 }} />
              <span className="text-[13px] font-[640] text-slate-700">{g}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default WeeklyHabitGoals;
