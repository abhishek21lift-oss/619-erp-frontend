'use client';

import { Dumbbell } from 'lucide-react';
import FloatInput from '@/components/ui/FloatInput';
import type { LifestyleFormData } from './types';

const LEVELS: { value: LifestyleFormData['workoutExperienceLevel']; label: string; icon: string }[] = [
  { value: 'beginner', label: 'Beginner', icon: '🚫' },
  { value: 'intermediate', label: 'Intermediate', icon: '🏋️' },
  { value: 'advanced', label: 'Advanced', icon: '🔥' },
  { value: 'athlete', label: 'Athlete', icon: '🏆' },
];

interface StepWorkoutExperienceProps {
  form: LifestyleFormData;
  set: <K extends keyof LifestyleFormData>(key: K, val: LifestyleFormData[K]) => void;
  error?: string;
}

export function StepWorkoutExperience({ form, set, error }: StepWorkoutExperienceProps) {
  return (
    <div>
      <div className="flex items-start gap-4 mb-7">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: '#0f172a' }}>
          <Dumbbell size={20} color="#F59E0B" />
        </div>
        <div>
          <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-slate-900 leading-none">Workout Experience</h2>
          <p className="text-[13px] text-slate-400 mt-1.5">Step 5 of 9 — how trained is this client already?</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {LEVELS.map((l) => {
          const selected = form.workoutExperienceLevel === l.value;
          return (
            <button
              key={l.value} type="button"
              onClick={() => set('workoutExperienceLevel', l.value)}
              className="flex flex-col items-center gap-2 rounded-[16px] px-4 py-5 text-center transition-all duration-200"
              style={{
                background: selected ? 'rgba(245,158,11,0.06)' : 'var(--bg-subtle)',
                border: selected ? '2px solid #F59E0B' : '2px solid rgba(15,23,42,0.08)',
                boxShadow: selected ? '0 4px 16px rgba(245,158,11,0.18)' : 'none',
              }}
            >
              <span className="text-[24px]">{l.icon}</span>
              <span className="text-[12.5px] font-[700]" style={{ color: selected ? '#0f172a' : '#475569' }}>{l.label}</span>
            </button>
          );
        })}
      </div>

      {error && <p className="mt-3 text-[11px] font-medium" style={{ color: 'var(--danger)' }}>{error}</p>}

      <div className="mt-6 max-w-[220px]">
        <FloatInput label="Years of Experience" type="number" value={form.yearsOfExperience} onChange={(v) => set('yearsOfExperience', v)} />
      </div>
    </div>
  );
}

export default StepWorkoutExperience;
