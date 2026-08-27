'use client';

import { useMemo } from 'react';
import { HeartHandshake } from 'lucide-react';
import { calcLifestyleReadinessScore } from '@/lib/goal-calculations';
import type { GoalFormData, LifestyleAnswers } from './types';

const QUESTIONS: { key: keyof LifestyleAnswers; label: string }[] = [
  { key: 'can_train_4_6_days', label: 'Can train 4–6 days/week' },
  { key: 'meal_prep_possible', label: 'Meal prep possible' },
  { key: 'sleep_7_8_hours', label: 'Sleep 7–8 hours' },
  { key: 'drink_enough_water', label: 'Drink enough water' },
  { key: 'family_support', label: 'Family support' },
];

function scoreColor(score: number): string {
  if (score >= 70) return '#10b981';
  if (score >= 40) return '#F59E0B';
  return '#ef4444';
}

interface StepLifestyleProps {
  form: GoalFormData;
  set: <K extends keyof GoalFormData>(key: K, val: GoalFormData[K]) => void;
  error?: string;
}

export function StepLifestyle({ form, set, error }: StepLifestyleProps) {
  const score = useMemo(() => calcLifestyleReadinessScore(form.lifestyle), [form.lifestyle]);

  const setAnswer = (key: keyof LifestyleAnswers, value: boolean) => {
    set('lifestyle', { ...form.lifestyle, [key]: value });
  };

  return (
    <div className="rounded-[24px] overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 4px 24px rgba(15,23,42,0.06)' }}>
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#0f172a,#334155)' }} />
      <div className="p-7 sm:p-10">
        <div className="flex items-start gap-4 mb-7">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: '#0f172a' }}>
            <HeartHandshake size={20} color="#1CA3F9" />
          </div>
          <div>
            <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-slate-900 leading-none">Lifestyle Readiness</h2>
            <p className="text-[13px] text-slate-400 mt-1.5">Step 8 of 8 — quick yes / no questions.</p>
          </div>
        </div>

        <div className="space-y-3">
          {QUESTIONS.map((q) => {
            const val = form.lifestyle[q.key];
            return (
              <div key={q.key} className="flex items-center justify-between gap-3 rounded-[14px] px-4 py-3" style={{ background: 'var(--bg-subtle)' }}>
                <span className="text-[13.5px] font-[640] text-slate-700">{q.label}</span>
                <div className="flex gap-2">
                  {(['Yes', 'No'] as const).map((opt) => {
                    const boolVal = opt === 'Yes';
                    const selected = val === boolVal;
                    return (
                      <button
                        key={opt} type="button"
                        onClick={() => setAnswer(q.key, boolVal)}
                        className="rounded-[9px] px-4 py-1.5 text-[12.5px] font-[700] transition-all"
                        style={{
                          background: selected ? '#0f172a' : '#fff',
                          color: selected ? '#fff' : '#94a3b8',
                          border: selected ? '1.5px solid #0f172a' : '1.5px solid #e2e8f0',
                        }}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {error && <p className="mt-3 text-[11px] font-medium" style={{ color: 'var(--danger-text)' }}>{error}</p>}

        {score != null && (
          <div className="mt-6 flex items-center gap-4 rounded-[16px] p-4" style={{ background: 'var(--bg-subtle)' }}>
            <div>
              <p className="text-[10.5px] font-[700] uppercase tracking-wider text-slate-400">Lifestyle Readiness Score</p>
              <p className="text-[24px] font-[900]" style={{ color: scoreColor(score) }}>{score}%</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default StepLifestyle;
