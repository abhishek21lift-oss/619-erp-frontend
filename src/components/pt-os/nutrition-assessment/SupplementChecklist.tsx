'use client';

import { useState } from 'react';
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

  // Anything the fixed list does not name — ashwagandha, ZMA, a pre-workout.
  // There was no way to record one, and one saved on an older record was
  // hidden here yet still re-sent on every save.
  const custom = value.filter((s) => !KNOWN_SUPPLEMENTS.includes(s.name)).map((s) => s.name);
  const [draft, setDraft] = useState('');
  const addCustom = () => {
    const name = draft.trim();
    if (!name || isChecked(name)) { setDraft(''); return; }
    onChange([...value, { name, dose: '', frequency: '', brand: '' }]);
    setDraft('');
  };

  return (
    <div className="space-y-2.5">
      {[...KNOWN_SUPPLEMENTS, ...custom].map((name) => {
        const checked = isChecked(name);
        const supp = get(name);
        return (
          <div key={name} className="rounded-[16px] overflow-hidden transition-all" style={{ border: checked ? '2px solid #0067E0' : '2px solid var(--border)', background: checked ? 'rgba(0,103,224,0.04)' : 'var(--bg-subtle)' }}>
            <button
              type="button" onClick={() => toggle(name)} aria-pressed={checked}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
            >
              <span
                className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-[6px] transition-all"
                style={{ background: checked ? '#0067E0' : 'var(--bg-card)', border: checked ? 'none' : '1.5px solid var(--border-2)' }}
              >
                {checked && <Check size={13} color="#fff" strokeWidth={3} />}
              </span>
              <span className="text-[13.5px] font-[700]" style={{ color: checked ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{name}</span>
            </button>
            {checked && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 px-4 pb-4">
                <FloatInput label="Dose" maxLength={100} value={supp?.dose || ''} onChange={(v) => updateField(name, 'dose', v)} />
                <FloatInput label="Frequency" maxLength={100} value={supp?.frequency || ''} onChange={(v) => updateField(name, 'frequency', v)} />
                <FloatInput label="Brand" maxLength={100} value={supp?.brand || ''} onChange={(v) => updateField(name, 'brand', v)} />
              </div>
            )}
          </div>
        );
      })}
      <div className="flex items-end gap-2 pt-1">
        <div className="flex-1">
          <FloatInput label="Other supplement" maxLength={100} value={draft} onChange={setDraft} />
        </div>
        <button type="button" onClick={addCustom} disabled={!draft.trim()}
          className="h-12 rounded-[12px] px-4 text-[13px] font-[750] disabled:opacity-50"
          style={{ background: 'var(--text-primary)', color: 'var(--bg-card)' }}>
          Add
        </button>
      </div>
    </div>
  );
}

export default SupplementChecklist;
