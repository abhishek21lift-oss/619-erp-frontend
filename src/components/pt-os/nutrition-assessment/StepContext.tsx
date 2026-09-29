'use client';

import { Wallet } from 'lucide-react';
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

interface StepContextProps {
  form: NutritionFormData;
  set: <K extends keyof NutritionFormData>(key: K, val: NutritionFormData[K]) => void;
}

export function StepContext({ form, set }: StepContextProps) {
  return (
    <div className="space-y-8">
      <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: '#0f172a' }}>
            <Wallet size={20} color="#1CA3F9" />
          </div>
          <div>
            <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-[color:var(--text-primary)] leading-none">Context</h2>
            <p className="text-[13px] text-[color:var(--text-muted)] mt-1.5">Step 8 of 8 — cooking and budget.</p>
          </div>
        </div>

        <div>
          <p className="mb-3 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Who Prepares Meals?</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {MEAL_PREPARER_OPTIONS.map((o) => {
              const selected = form.mealPreparer === o.value;
              return (
                <button
                  key={o.value} type="button"
                  onClick={() => set('mealPreparer', o.value)}
                  className="flex flex-col items-center gap-2 rounded-[16px] px-3 py-4 text-center transition-all duration-200"
                  style={{
                    background: selected ? 'rgba(0,103,224,0.06)' : 'var(--bg-subtle)',
                    border: selected ? '2px solid #0067E0' : '2px solid var(--border)',
                    boxShadow: selected ? '0 4px 16px rgba(0,103,224,0.18)' : 'none',
                  }}
                >
                  <span className="text-[20px]">{o.icon}</span>
                  <span className="text-[11.5px] font-[700]" style={{ color: selected ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{o.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-2 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Nutrition Budget</p>
          <div className="flex gap-2">
            {BUDGET_OPTIONS.map((o) => {
              const selected = form.nutritionBudget === o.value;
              return (
                <button
                  key={o.value} type="button" onClick={() => set('nutritionBudget', o.value)}
                  className="rounded-[11px] px-4 py-2.5 text-[13px] font-[700] transition-all"
                  style={{
                    background: selected ? 'var(--text-primary)' : 'var(--bg-subtle)',
                    color: selected ? 'var(--bg-card)' : 'var(--text-muted)',
                    border: selected ? '1.5px solid var(--text-primary)' : '1.5px solid var(--border)',
                  }}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        </div>

    </div>
  );
}

export default StepContext;
