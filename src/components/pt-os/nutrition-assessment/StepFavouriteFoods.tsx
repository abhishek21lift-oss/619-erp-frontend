'use client';

import { useMemo } from 'react';
import { Heart } from 'lucide-react';
import FloatInput from '@/components/ui/FloatInput';
import MultiSelectChips from '@/components/pt-os/MultiSelectChips';
import { assessProtein } from '@/lib/nutrition-calculations';
import type { NutritionFormData } from './types';

export const FAVOURITE_FOOD_OPTIONS = [
  'Chicken', 'Eggs', 'Paneer', 'Fish', 'Dal', 'Curd', 'Peanut Butter', 'Fruits', 'Oats', 'Dry Fruits',
  'Vegetables', 'Rice', 'Roti', 'Nuts', 'Cheese', 'Yogurt', 'Sweets', 'Bread',
];

interface StepFavouriteFoodsProps {
  form: NutritionFormData;
  set: <K extends keyof NutritionFormData>(key: K, val: NutritionFormData[K]) => void;
  error?: string;
}

export function StepFavouriteFoods({ form, set, error }: StepFavouriteFoodsProps) {
  const protein = useMemo(() => assessProtein(form.favouriteFoods, form.takesSupplements, form.supplements), [form.favouriteFoods, form.takesSupplements, form.supplements]);

  return (
    <div className="rounded-[24px] overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 4px 24px rgba(15,23,42,0.06)' }}>
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#0f172a,#334155)' }} />
      <div className="p-7 sm:p-10">
        <div className="flex items-start gap-4 mb-7">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: '#0f172a' }}>
            <Heart size={20} color="#F59E0B" />
          </div>
          <div>
            <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-slate-900 leading-none">Favourite Foods</h2>
            <p className="text-[13px] text-slate-400 mt-1.5">Step 3 of 8 — what does the client already enjoy eating?</p>
          </div>
        </div>

        <MultiSelectChips value={form.favouriteFoods} onChange={(v) => set('favouriteFoods', v)} options={FAVOURITE_FOOD_OPTIONS} />
        <div className="mt-4 max-w-sm">
          <FloatInput label="Other" value={form.favouriteFoodOther} onChange={(v) => set('favouriteFoodOther', v)} />
        </div>

        {form.favouriteFoods.length > 0 && (
          <div className="mt-6 flex items-center gap-3 rounded-[16px] p-4" style={{ background: 'var(--bg-subtle)' }}>
            <span className="rounded-full px-3 py-1 text-[12px] font-[700]" style={{ background: 'rgba(245,158,11,0.12)', color: '#d97706' }}>
              {protein.assessment} Protein
            </span>
            <span className="text-[12.5px] font-[600] text-slate-400">Preference-based estimate, score {protein.score}</span>
          </div>
        )}

        {error && <p className="mt-3 text-[11px] font-medium" style={{ color: 'var(--danger)' }}>{error}</p>}
      </div>
    </div>
  );
}

export default StepFavouriteFoods;
