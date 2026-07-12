'use client';

import { Check } from 'lucide-react';
import FloatInput from '@/components/ui/FloatInput';
import type { Supplement } from '@/lib/nutrition-calculations';

const KNOWN_SUPPLEMENTS = [
  'Whey Protein', 'Casein Protein', 'Multivitamin', 'Omega 3', 'Vitamin D', 'Vitamin B12',
  'Creatine', 'BCAA', 'EAA', 'Probiotics', 'Fish Oil', 'Zinc', 'Magnesium',
];

interface SupplementChecklistProps {
  value: Supplement[];
  onChange: (v: Supplement[]) => void;
}

/** Toggle-list where checking a row reveals an inline Dose/Frequency/Brand
 *  mini-form beneath it — no existing precedent in the codebase for this
 *  "multi-select where each item expands sub-fields" shape, built from
 *  scratch with plain array-of-objects state, no new library. */
export function SupplementChecklist({ value, onChange }: SupplementChecklistProps) {
  const isChecked = (name: string) => value.some((s) => s.name === name);
  const get = (name: string) => value.find((s) => s.name === name);

  const toggle = (name: string) => {
    if (isChecked(name)) onChange(value.filter((s) => s.name !== name));
    else onChange([...value, { name, dose: '', frequency: '', brand: '' }]);
  };

  const updateField = (name: string, field: 'dose' | 'frequency' | 'brand', val: string) => {
    onChange(value.map((s) => (s.name === name ? { ...s, [field]: val } : s)));
  };

  return (
    <div className="space-y-2.5">
      {KNOWN_SUPPLEMENTS.map((name) => {
        const checked = isChecked(name);
        const supp = get(name);
        return (
          <div key={name} className="rounded-[16px] overflow-hidden transition-all" style={{ border: checked ? '2px solid #F59E0B' : '2px solid rgba(15,23,42,0.08)', background: checked ? 'rgba(245,158,11,0.04)' : 'var(--bg-subtle)' }}>
            <button
              type="button" onClick={() => toggle(name)}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
            >
              <span
                className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-[6px] transition-all"
                style={{ background: checked ? '#F59E0B' : '#fff', border: checked ? 'none' : '1.5px solid #cbd5e1' }}
              >
                {checked && <Check size={13} color="#fff" strokeWidth={3} />}
              </span>
              <span className="text-[13.5px] font-[700]" style={{ color: checked ? '#0f172a' : '#475569' }}>{name}</span>
            </button>
            {checked && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 px-4 pb-4">
                <FloatInput label="Dose" value={supp?.dose || ''} onChange={(v) => updateField(name, 'dose', v)} />
                <FloatInput label="Frequency" value={supp?.frequency || ''} onChange={(v) => updateField(name, 'frequency', v)} />
                <FloatInput label="Brand" value={supp?.brand || ''} onChange={(v) => updateField(name, 'brand', v)} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default SupplementChecklist;
