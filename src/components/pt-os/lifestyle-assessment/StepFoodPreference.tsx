'use client';

import { Salad } from 'lucide-react';
import FloatInput from '@/components/ui/FloatInput';
import MultiSelectChips from '@/components/pt-os/MultiSelectChips';
import type { LifestyleFormData } from './types';

export const FOOD_PREFERENCE_OPTIONS = [
  { value: 'Vegetarian', label: 'Vegetarian', icon: '🥗' },
  { value: 'Eggetarian', label: 'Eggetarian', icon: '🥚' },
  { value: 'Non-Vegetarian', label: 'Non-Vegetarian', icon: '🍗' },
  { value: 'Vegan', label: 'Vegan', icon: '🌱' },
  { value: 'Jain', label: 'Jain', icon: '🌾' },
  { value: 'Lactose-Free', label: 'Lactose-Free', icon: '🥛' },
  { value: 'Mixed', label: 'Mixed', icon: '🍽️' },
];

interface StepFoodPreferenceProps {
  form: LifestyleFormData;
  set: <K extends keyof LifestyleFormData>(key: K, val: LifestyleFormData[K]) => void;
  error?: string;
}

export function StepFoodPreference({ form, set, error }: StepFoodPreferenceProps) {
  return (
    <div className="rounded-[24px] overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 4px 24px rgba(15,23,42,0.06)' }}>
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#0f172a,#334155)' }} />
      <div className="p-7 sm:p-10">
        <div className="flex items-start gap-4 mb-7">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: '#0f172a' }}>
            <Salad size={20} color="#F59E0B" />
          </div>
          <div>
            <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-slate-900 leading-none">Food Preference</h2>
            <p className="text-[13px] text-slate-400 mt-1.5">Step 6 of 9 — select all dietary restrictions that apply.</p>
          </div>
        </div>

        <MultiSelectChips value={form.foodPreferences} onChange={(v) => set('foodPreferences', v)} options={FOOD_PREFERENCE_OPTIONS} />
        <div className="mt-4 max-w-sm">
          <FloatInput label="Other" value={form.foodPreferenceOther} onChange={(v) => set('foodPreferenceOther', v)} />
        </div>

        {error && <p className="mt-3 text-[11px] font-medium" style={{ color: 'var(--danger)' }}>{error}</p>}
      </div>
    </div>
  );
}

export default StepFoodPreference;
