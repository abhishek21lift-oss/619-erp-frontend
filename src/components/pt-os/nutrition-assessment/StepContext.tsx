'use client';

import { Wallet } from 'lucide-react';
import FloatInput from '@/components/ui/FloatInput';
import MultiSelectChips from '@/components/pt-os/MultiSelectChips';
import type { NutritionFormData } from './types';
import type { MealPreparer, NutritionBudget } from '@/lib/nutrition-calculations';

const MEAL_PREPARER_OPTIONS: { value: MealPreparer; label: string; icon: string }[] = [
  { value: 'self', label: 'Self', icon: '👤' },
  { value: 'family', label: 'Family', icon: '👨‍👩‍👧' },
  { value: 'cook', label: 'Personal Cook', icon: '👨‍🍳' },
  { value: 'restaurant', label: 'Restaurant', icon: '🍽️' },
  { value: 'food_delivery', label: 'Food Delivery', icon: '🛵' },
  { value: 'mess', label: 'Mess', icon: '🍛' },
  { value: 'hostel', label: 'Hostel', icon: '🏠' },
  { value: 'office_cafeteria', label: 'Office Cafeteria', icon: '🏢' },
];

const BUDGET_OPTIONS: { value: NutritionBudget; label: string }[] = [
  { value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' }, { value: 'premium', label: 'Premium' },
];

const MEDICAL_CONDITION_OPTIONS = [
  'None', 'Diabetes', 'Hypertension', 'Thyroid', 'PCOS/PCOD', 'High Cholesterol',
  'Heart Disease', 'Kidney Disease', 'Digestive Disorder', 'Food Intolerance',
];

interface StepContextProps {
  form: NutritionFormData;
  set: <K extends keyof NutritionFormData>(key: K, val: NutritionFormData[K]) => void;
}

export function StepContext({ form, set }: StepContextProps) {
  const hasMedicalCondition = form.medicalConditions.some((c) => c !== 'None');

  return (
    <div className="rounded-[24px] overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 4px 24px rgba(15,23,42,0.06)' }}>
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#0f172a,#334155)' }} />
      <div className="p-7 sm:p-10 space-y-8">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: '#0f172a' }}>
            <Wallet size={20} color="#F59E0B" />
          </div>
          <div>
            <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-slate-900 leading-none">Context</h2>
            <p className="text-[13px] text-slate-400 mt-1.5">Step 8 of 8 — cooking, budget, and medical nutrition notes.</p>
          </div>
        </div>

        <div>
          <p className="mb-3 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>Who Prepares Meals?</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {MEAL_PREPARER_OPTIONS.map((o) => {
              const selected = form.mealPreparer === o.value;
              return (
                <button
                  key={o.value} type="button"
                  onClick={() => set('mealPreparer', o.value)}
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
          <p className="mb-2 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>Nutrition Budget</p>
          <div className="flex gap-2">
            {BUDGET_OPTIONS.map((o) => {
              const selected = form.nutritionBudget === o.value;
              return (
                <button
                  key={o.value} type="button" onClick={() => set('nutritionBudget', o.value)}
                  className="rounded-[11px] px-4 py-2.5 text-[13px] font-[700] transition-all"
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

        <div>
          <p className="mb-3 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>Medical Conditions</p>
          <MultiSelectChips value={form.medicalConditions} onChange={(v) => set('medicalConditions', v)} options={MEDICAL_CONDITION_OPTIONS} />
        </div>

        {hasMedicalCondition && (
          <FloatInput label="Medical Notes" multiline autoGrow value={form.medicalNotes} onChange={(v) => set('medicalNotes', v)} />
        )}
      </div>
    </div>
  );
}

export default StepContext;
