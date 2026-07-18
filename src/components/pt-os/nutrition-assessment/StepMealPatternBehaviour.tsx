'use client';

import { Clock3 } from 'lucide-react';
import FloatInput from '@/components/ui/FloatInput';
import MultiSelectChips from '@/components/pt-os/MultiSelectChips';
import SearchableSelect from '@/components/pt-os/SearchableSelect';
import type { NutritionFormData } from './types';
import type { MealRegularity } from '@/lib/nutrition-calculations';

const REGULARITY_OPTIONS: { value: MealRegularity; label: string }[] = [
  { value: 'daily', label: 'Daily' }, { value: 'sometimes', label: 'Sometimes' }, { value: 'never', label: 'Never' },
];

const TIMING_CONSISTENCY_OPTIONS = [
  { value: 'consistent', label: 'Consistent' },
  { value: 'somewhat_consistent', label: 'Somewhat Consistent' },
  { value: 'inconsistent', label: 'Inconsistent' },
];

const EATING_OUT_OPTIONS = [
  { value: 'rarely', label: 'Rarely' }, { value: 'weekly', label: 'Weekly' },
  { value: 'frequently', label: 'Frequently' }, { value: 'daily', label: 'Daily' },
];

const WEEKEND_HABITS_OPTIONS = [
  { value: 'similar_to_weekday', label: 'Similar to Weekday' },
  { value: 'somewhat_different', label: 'Somewhat Different' },
  { value: 'very_different_indulgent', label: 'Very Different / Indulgent' },
];

const EATING_BEHAVIOUR_OPTIONS = [
  'Emotional Eating', 'Stress Eating', 'Night Eating', 'Binge Eating', 'Skipped Meals', 'Mindful Eater', 'Slow Eater', 'Fast Eater',
];

interface RegularityRowProps {
  label: string;
  value: MealRegularity | '';
  onChange: (v: MealRegularity) => void;
}

function RegularityRow({ label, value, onChange }: RegularityRowProps) {
  return (
    <div>
      <p className="mb-2 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>{label}</p>
      <div className="flex gap-2">
        {REGULARITY_OPTIONS.map((o) => {
          const selected = value === o.value;
          return (
            <button
              key={o.value} type="button" onClick={() => onChange(o.value)}
              className="rounded-[11px] px-4 py-2 text-[12.5px] font-[700] transition-all"
              style={{
                background: selected ? '#0f172a' : '#f8fafc',
                color: selected ? '#fff' : '#64748b',
                border: selected ? '1.5px solid #0f172a' : '1.5px solid #e2e8f0',
              }}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface StepMealPatternBehaviourProps {
  form: NutritionFormData;
  set: <K extends keyof NutritionFormData>(key: K, val: NutritionFormData[K]) => void;
  error?: string;
}

export function StepMealPatternBehaviour({ form, set, error }: StepMealPatternBehaviourProps) {
  return (
    <div className="space-y-8">
      <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: '#0f172a' }}>
            <Clock3 size={20} color="#F59E0B" />
          </div>
          <div>
            <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-slate-900 leading-none">Meal Pattern &amp; Eating Behaviour</h2>
            <p className="text-[13px] text-slate-400 mt-1.5">Step 6 of 8 — how and when the client typically eats.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FloatInput label="Meals Per Day" type="number" value={form.mealsPerDay} onChange={(v) => set('mealsPerDay', v)} />
          <FloatInput label="Snacks Per Day" type="number" value={form.snacksPerDay} onChange={(v) => set('snacksPerDay', v)} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <RegularityRow label="Breakfast" value={form.breakfastRegularity} onChange={(v) => set('breakfastRegularity', v)} />
          <RegularityRow label="Lunch" value={form.lunchRegularity} onChange={(v) => set('lunchRegularity', v)} />
          <RegularityRow label="Dinner" value={form.dinnerRegularity} onChange={(v) => set('dinnerRegularity', v)} />
        </div>

        <div>
          <p className="mb-2 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>Late-Night Eating</p>
          <div className="flex gap-3">
            {[{ v: true, label: 'Yes' }, { v: false, label: 'No' }].map((o) => {
              const selected = form.lateNightEating === o.v;
              return (
                <button
                  key={o.label} type="button" onClick={() => set('lateNightEating', o.v)}
                  className="rounded-[11px] px-6 py-2.5 text-[13px] font-[700] transition-all"
                  style={{
                    background: selected ? '#0f172a' : '#f8fafc',
                    color: selected ? '#fff' : '#64748b',
                    border: selected ? '1.5px solid #0f172a' : '1.5px solid #e2e8f0',
                  }}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SearchableSelect label="Meal Timing Consistency" allowCustom={false} value={form.mealTimingConsistency} onChange={(v) => set('mealTimingConsistency', v as NutritionFormData['mealTimingConsistency'])} options={TIMING_CONSISTENCY_OPTIONS} />
          <SearchableSelect label="Eating Out Frequency" allowCustom={false} value={form.eatingOutFrequency} onChange={(v) => set('eatingOutFrequency', v as NutritionFormData['eatingOutFrequency'])} options={EATING_OUT_OPTIONS} />
        </div>

        <div className="max-w-sm">
          <SearchableSelect label="Weekend Eating Habits" allowCustom={false} value={form.weekendEatingHabits} onChange={(v) => set('weekendEatingHabits', v as NutritionFormData['weekendEatingHabits'])} options={WEEKEND_HABITS_OPTIONS} />
        </div>

        <div>
          <p className="mb-3 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>Eating Behaviour Traits</p>
          <MultiSelectChips value={form.eatingBehaviours} onChange={(v) => set('eatingBehaviours', v)} options={EATING_BEHAVIOUR_OPTIONS} />
        </div>

      {error && <p className="text-[11px] font-medium" style={{ color: 'var(--danger)' }}>{error}</p>}
    </div>
  );
}

export default StepMealPatternBehaviour;
