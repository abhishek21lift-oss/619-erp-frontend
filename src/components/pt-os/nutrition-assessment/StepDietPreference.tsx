'use client';

import { Utensils } from 'lucide-react';
import type { NutritionFormData } from './types';

const DIET_PREFERENCE_OPTIONS = [
  { value: 'Vegetarian', label: 'Vegetarian', icon: '🥗' },
  { value: 'Non-Vegetarian', label: 'Non-Vegetarian', icon: '🍗' },
  { value: 'Eggetarian', label: 'Eggetarian', icon: '🥚' },
  { value: 'Vegan', label: 'Vegan', icon: '🌱' },
  { value: 'Jain', label: 'Jain', icon: '🌾' },
  { value: 'Keto', label: 'Keto', icon: '🥑' },
  { value: 'Intermittent Fasting', label: 'Intermittent Fasting', icon: '⏱️' },
  { value: 'Mixed', label: 'Mixed / Flexible', icon: '🍽️' },
];

interface StepDietPreferenceProps {
  form: NutritionFormData;
  set: <K extends keyof NutritionFormData>(key: K, val: NutritionFormData[K]) => void;
  error?: string;
}

export function StepDietPreference({ form, set, error }: StepDietPreferenceProps) {
  const toggle = (v: string) => {
    set('dietPreferences', form.dietPreferences.includes(v) ? form.dietPreferences.filter((x) => x !== v) : [...form.dietPreferences, v]);
  };

  return (
    <div>
      <div className="flex items-start gap-4 mb-7">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: '#0f172a' }}>
          <Utensils size={20} color="#1CA3F9" />
        </div>
        <div>
          <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-slate-900 leading-none">Diet Preference</h2>
          <p className="text-[13px] text-slate-400 mt-1.5">Step 1 of 8 — select all that apply.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {DIET_PREFERENCE_OPTIONS.map((o) => {
          const selected = form.dietPreferences.includes(o.value);
          return (
            <button
              key={o.value} type="button"
              onClick={() => toggle(o.value)}
              className="flex flex-col items-center gap-2 rounded-[16px] px-3 py-4 text-center transition-all duration-200"
              style={{
                background: selected ? 'rgba(0,103,224,0.06)' : 'var(--bg-subtle)',
                border: selected ? '2px solid #0067E0' : '2px solid rgba(15,23,42,0.08)',
                boxShadow: selected ? '0 4px 16px rgba(0,103,224,0.18)' : 'none',
              }}
            >
              <span className="text-[20px]">{o.icon}</span>
              <span className="text-[11.5px] font-[700]" style={{ color: selected ? '#0f172a' : '#475569' }}>{o.label}</span>
            </button>
          );
        })}
      </div>

      {error && <p className="mt-3 text-[11px] font-medium" style={{ color: 'var(--danger-text)' }}>{error}</p>}
    </div>
  );
}

export default StepDietPreference;
