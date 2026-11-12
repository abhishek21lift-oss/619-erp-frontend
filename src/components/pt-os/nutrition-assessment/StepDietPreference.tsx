'use client';

import { Utensils } from 'lucide-react';
import MultiSelectChips from '@/components/pt-os/MultiSelectChips';
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

// The engine's own vocabulary, beside the free-text preferences above. Both
// are asked because they answer different questions: "Jain" is a real
// preference with no canonical pattern, and "vegetarian" is a safety fact the
// generator can act on.
const PATTERN_OPTIONS = [
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'eggetarian', label: 'Eggetarian' },
  { value: 'non_vegetarian', label: 'Non-Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
];

const CULTURE_OPTIONS = [
  { value: 'indian', label: 'Indian' },
  { value: 'western', label: 'Western' },
  { value: 'mixed', label: 'Mixed' },
];

const REGIONAL_CUISINES = [
  'South Indian', 'Punjabi', 'Bengali', 'Gujarati',
  'Maharashtrian', 'North Indian', 'Hyderabadi', 'Kerala',
];

const chipStyle = (selected: boolean) => ({
  background: selected ? 'var(--text-primary)' : 'var(--bg-subtle)',
  color: selected ? 'var(--bg-card)' : 'var(--text-muted)',
  border: selected ? '1.5px solid var(--text-primary)' : '1.5px solid var(--border)',
});

interface ChipRowProps {
  label: string;
  options: readonly { value: string; label: string }[];
  value: string;
  onSelect: (value: string) => void;
}

function ChipRow({ label, options, value, onSelect }: ChipRowProps) {
  return (
    <div>
      <p className="mb-2 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const selected = value === o.value;
          return (
            <button
              key={o.value} type="button" aria-pressed={selected}
              aria-label={`${label}: ${o.label}`}
              onClick={() => onSelect(selected ? '' : o.value)}
              className="rounded-[11px] px-4 py-2 text-[12.5px] font-[700] transition-all"
              style={chipStyle(selected)}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

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
          <Utensils size={20} color="#FFBB94" />
        </div>
        <div>
          <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-[color:var(--text-primary)] leading-none">Diet Preference</h2>
          <p className="text-[13px] text-[color:var(--text-muted)] mt-1.5">Select all that apply.</p>
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
                background: selected ? 'rgba(163,55,87,0.06)' : 'var(--bg-subtle)',
                border: selected ? '2px solid #A33757' : '2px solid var(--border)',
                boxShadow: selected ? '0 4px 16px rgba(163,55,87,0.18)' : 'none',
              }}
            >
              <span className="text-[20px]">{o.icon}</span>
              <span className="text-[11.5px] font-[700]" style={{ color: selected ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{o.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-7 space-y-5">
        <ChipRow
          label="Dietary pattern"
          options={PATTERN_OPTIONS}
          value={form.dietaryPattern}
          onSelect={(v) => set('dietaryPattern', v as NutritionFormData['dietaryPattern'])}
        />
        <ChipRow
          label="Food culture"
          options={CULTURE_OPTIONS}
          value={form.foodCulture}
          onSelect={(v) => {
            set('foodCulture', v as NutritionFormData['foodCulture']);
            // A Western kitchen has no regional Indian cuisine to plan around,
            // and a leftover list would be read as one.
            if (v === 'western') set('regionalCuisines', []);
          }}
        />
        {(form.foodCulture === 'indian' || form.foodCulture === 'mixed') && (
          <div>
            <p className="mb-2 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Regional cuisines</p>
            <MultiSelectChips
              value={form.regionalCuisines}
              onChange={(v) => set('regionalCuisines', v)}
              options={REGIONAL_CUISINES}
            />
          </div>
        )}
      </div>

      {error && <p className="mt-3 text-[11px] font-medium" style={{ color: 'var(--danger-text)' }}>{error}</p>}
    </div>
  );
}

export default StepDietPreference;
