'use client';

import { ShieldAlert } from 'lucide-react';
import FloatInput from '@/components/ui/FloatInput';
import MultiSelectChips from '@/components/pt-os/MultiSelectChips';
import SearchableSelect from '@/components/pt-os/SearchableSelect';
import type { NutritionFormData } from './types';

export const FOOD_ALLERGY_OPTIONS = [
  'Peanuts', 'Tree Nuts', 'Dairy', 'Gluten', 'Soy', 'Shellfish', 'Eggs', 'Fish', 'Sesame', 'None',
];

export const FOODS_TO_AVOID_OPTIONS = [
  'Sugar', 'Soft Drinks', 'Fried Food', 'Fast Food', 'Bakery', 'Processed Food', 'Red Meat', 'Spicy Food', 'Dairy',
];

const AVOID_REASON_OPTIONS = [
  { value: 'medical', label: 'Medical' },
  { value: 'religious', label: 'Religious' },
  { value: 'personal_preference', label: 'Personal Preference' },
  { value: 'taste', label: 'Taste' },
  { value: 'digestive_issue', label: 'Digestive Issue' },
];

interface StepFoodRestrictionsProps {
  form: NutritionFormData;
  set: <K extends keyof NutritionFormData>(key: K, val: NutritionFormData[K]) => void;
  error?: string;
}

export function StepFoodRestrictions({ form, set, error }: StepFoodRestrictionsProps) {
  return (
    <div className="space-y-8">
      <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: '#0f172a' }}>
            <ShieldAlert size={20} color="#F59E0B" />
          </div>
          <div>
            <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-slate-900 leading-none">Food Restrictions</h2>
            <p className="text-[13px] text-slate-400 mt-1.5">Step 2 of 8 — allergies and foods to avoid.</p>
          </div>
        </div>

        <div>
          <p className="mb-3 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>Food Allergies</p>
          <MultiSelectChips value={form.foodAllergies} onChange={(v) => set('foodAllergies', v)} options={FOOD_ALLERGY_OPTIONS} />
          <div className="mt-3 max-w-sm">
            <FloatInput label="Other Allergy" value={form.foodAllergyOther} onChange={(v) => set('foodAllergyOther', v)} />
          </div>
        </div>

        <div>
          <p className="mb-3 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>Foods to Avoid</p>
          <MultiSelectChips value={form.foodsToAvoid} onChange={(v) => set('foodsToAvoid', v)} options={FOODS_TO_AVOID_OPTIONS} />
          <div className="mt-3 max-w-sm">
            <FloatInput label="Other Food to Avoid" value={form.foodsToAvoidOther} onChange={(v) => set('foodsToAvoidOther', v)} />
          </div>
        </div>

        {(form.foodsToAvoid.length > 0 || form.foodsToAvoidOther.trim()) && (
          <div className="max-w-sm">
            <SearchableSelect
              label="Reason" allowCustom={false}
              value={form.foodsToAvoidReason}
              onChange={(v) => set('foodsToAvoidReason', v as NutritionFormData['foodsToAvoidReason'])}
              options={AVOID_REASON_OPTIONS}
            />
          </div>
        )}

      {error && <p className="text-[11px] font-medium" style={{ color: 'var(--danger)' }}>{error}</p>}
    </div>
  );
}

export default StepFoodRestrictions;
