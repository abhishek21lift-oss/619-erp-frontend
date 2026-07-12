'use client';

import { useMemo } from 'react';
import { Briefcase } from 'lucide-react';
import { classifyActivity } from '@/lib/lifestyle-calculations';
import type { LifestyleFormData } from './types';
import type { DailyStepsBracket } from '@/lib/lifestyle-calculations';

const OCCUPATIONS: { value: LifestyleFormData['occupationType']; label: string; icon: string }[] = [
  { value: 'desk_job', label: 'Desk Job', icon: '💻' },
  { value: 'active_job', label: 'Active Job', icon: '🏃' },
  { value: 'physical_labor', label: 'Physical Labor', icon: '🏗️' },
  { value: 'student', label: 'Student', icon: '🎓' },
  { value: 'homemaker', label: 'Homemaker', icon: '🏠' },
  { value: 'driver', label: 'Driver', icon: '🚚' },
  { value: 'healthcare', label: 'Healthcare', icon: '⚕️' },
  { value: 'police', label: 'Police', icon: '👮' },
  { value: 'fitness_professional', label: 'Fitness Professional', icon: '🏋️' },
  { value: 'retired', label: 'Retired', icon: '👴' },
  { value: 'other', label: 'Other', icon: '➕' },
];

const STEPS_BRACKETS: { value: DailyStepsBracket; label: string }[] = [
  { value: '<3000', label: '<3,000' },
  { value: '3000_5000', label: '3,000–5,000' },
  { value: '5000_8000', label: '5,000–8,000' },
  { value: '8000_10000', label: '8,000–10,000' },
  { value: '10000_plus', label: '10,000+' },
];

interface StepOccupationActivityProps {
  form: LifestyleFormData;
  set: <K extends keyof LifestyleFormData>(key: K, val: LifestyleFormData[K]) => void;
  error?: string;
}

export function StepOccupationActivity({ form, set, error }: StepOccupationActivityProps) {
  const { level, score } = useMemo(
    () => classifyActivity(form.dailyStepsBracket || null, form.occupationType || null),
    [form.dailyStepsBracket, form.occupationType],
  );

  return (
    <div className="rounded-[24px] overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 4px 24px rgba(15,23,42,0.06)' }}>
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#0f172a,#334155)' }} />
      <div className="p-7 sm:p-10 space-y-7">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: '#0f172a' }}>
            <Briefcase size={20} color="#F59E0B" />
          </div>
          <div>
            <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-slate-900 leading-none">Occupation &amp; Activity</h2>
            <p className="text-[13px] text-slate-400 mt-1.5">Step 4 of 9 — daily movement, at work and on foot.</p>
          </div>
        </div>

        <div>
          <p className="mb-3 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>Occupation Type</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {OCCUPATIONS.map((o) => {
              const selected = form.occupationType === o.value;
              return (
                <button
                  key={o.value} type="button"
                  onClick={() => set('occupationType', o.value)}
                  className="flex flex-col items-center gap-2 rounded-[16px] px-3 py-4 text-center transition-all duration-200"
                  style={{
                    background: selected ? 'rgba(245,158,11,0.06)' : 'var(--bg-subtle)',
                    border: selected ? '2px solid #F59E0B' : '2px solid rgba(15,23,42,0.08)',
                    boxShadow: selected ? '0 4px 16px rgba(245,158,11,0.18)' : 'none',
                  }}
                >
                  <span className="text-[20px]">{o.icon}</span>
                  <span className="text-[11.5px] font-[700]" style={{ color: selected ? '#0f172a' : '#475569' }}>{o.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-3 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>Daily Steps</p>
          <div className="flex flex-wrap gap-2">
            {STEPS_BRACKETS.map((s) => {
              const selected = form.dailyStepsBracket === s.value;
              return (
                <button
                  key={s.value} type="button"
                  onClick={() => set('dailyStepsBracket', s.value)}
                  className="rounded-[11px] px-4 py-2.5 text-[13px] font-[700] transition-all"
                  style={{
                    background: selected ? '#0f172a' : '#f8fafc',
                    color: selected ? '#fff' : '#64748b',
                    border: selected ? '1.5px solid #0f172a' : '1.5px solid #e2e8f0',
                  }}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {error && <p className="text-[11px] font-medium" style={{ color: 'var(--danger)' }}>{error}</p>}

        {level && (
          <div className="flex items-center gap-3 rounded-[16px] p-4" style={{ background: 'var(--bg-subtle)' }}>
            <span className="rounded-full px-3 py-1 text-[12px] font-[700]" style={{ background: 'rgba(245,158,11,0.12)', color: '#d97706' }}>
              {level}
            </span>
            {score != null && <span className="text-[12.5px] font-[600] text-slate-400">Activity score {score}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

export default StepOccupationActivity;
