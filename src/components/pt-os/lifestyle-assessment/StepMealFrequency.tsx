'use client';

import { Utensils } from 'lucide-react';
import SearchableSelect from '@/components/pt-os/SearchableSelect';
import type { LifestyleFormData } from './types';
import type { BreakfastHabit } from '@/lib/lifestyle-calculations';

const MEAL_COUNTS = [
  { value: '2', label: '2 Meals' }, { value: '3', label: '3 Meals' }, { value: '4', label: '4 Meals' },
  { value: '5', label: '5 Meals' }, { value: '6', label: '6 Meals' }, { value: '7', label: '7+ Meals' },
];

const BREAKFAST_OPTIONS: { value: BreakfastHabit; label: string }[] = [
  { value: 'daily', label: 'Daily' }, { value: 'sometimes', label: 'Sometimes' }, { value: 'never', label: 'Never' },
];

interface StepMealFrequencyProps {
  form: LifestyleFormData;
  set: <K extends keyof LifestyleFormData>(key: K, val: LifestyleFormData[K]) => void;
  error?: string;
}

export function StepMealFrequency({ form, set, error }: StepMealFrequencyProps) {
  return (
    <div className="space-y-7">
      <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: '#0f172a' }}>
            <Utensils size={20} color="#F59E0B" />
          </div>
          <div>
            <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-slate-900 leading-none">Meal Frequency</h2>
            <p className="text-[13px] text-slate-400 mt-1.5">Step 7 of 9 — how often, and how, does the client eat?</p>
          </div>
        </div>

        <SearchableSelect
          label="Meals Per Day" allowCustom={false}
          value={form.mealFrequency}
          onChange={(v) => set('mealFrequency', v)}
          options={MEAL_COUNTS}
        />

        <div>
          <p className="mb-3 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>Breakfast</p>
          <div className="flex gap-2">
            {BREAKFAST_OPTIONS.map((b) => {
              const selected = form.breakfastHabit === b.value;
              return (
                <button
                  key={b.value} type="button"
                  onClick={() => set('breakfastHabit', b.value)}
                  className="flex-1 rounded-[11px] px-4 py-2.5 text-[13px] font-[700] transition-all"
                  style={{
                    background: selected ? '#0f172a' : '#f8fafc',
                    color: selected ? '#fff' : '#64748b',
                    border: selected ? '1.5px solid #0f172a' : '1.5px solid #e2e8f0',
                  }}
                >
                  {b.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-3 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>Late Night Eating</p>
          <div className="flex gap-2">
            {(['Yes', 'No'] as const).map((opt) => {
              const boolVal = opt === 'Yes';
              const selected = form.lateNightEating === boolVal;
              return (
                <button
                  key={opt} type="button"
                  onClick={() => set('lateNightEating', boolVal)}
                  className="rounded-[9px] px-5 py-2 text-[12.5px] font-[700] transition-all"
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

      {error && <p className="text-[11px] font-medium" style={{ color: 'var(--danger)' }}>{error}</p>}
    </div>
  );
}

export default StepMealFrequency;
