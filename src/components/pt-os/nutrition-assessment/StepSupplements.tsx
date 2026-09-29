'use client';

import { Pill } from 'lucide-react';
import SupplementChecklist from './SupplementChecklist';
import type { NutritionFormData } from './types';

interface StepSupplementsProps {
  form: NutritionFormData;
  set: <K extends keyof NutritionFormData>(key: K, val: NutritionFormData[K]) => void;
  error?: string;
}

export function StepSupplements({ form, set, error }: StepSupplementsProps) {
  const setTakes = (val: boolean) => {
    set('takesSupplements', val);
    if (!val) set('supplements', []);
  };

  return (
    <div className="space-y-7">
      <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: '#0f172a' }}>
            <Pill size={20} color="#1CA3F9" />
          </div>
          <div>
            <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-[color:var(--text-primary)] leading-none">Supplement Usage</h2>
            <p className="text-[13px] text-[color:var(--text-muted)] mt-1.5">Step 4 of 8 — does the client currently take supplements?</p>
          </div>
        </div>

        <div className="flex gap-3">
          {[{ v: true, label: 'Yes' }, { v: false, label: 'No' }].map((o) => {
            const selected = form.takesSupplements === o.v;
            return (
              <button
                key={o.label} type="button"
                onClick={() => setTakes(o.v)}
                className="rounded-[11px] px-6 py-2.5 text-[13px] font-[700] transition-all"
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

        {form.takesSupplements && (
          <SupplementChecklist value={form.supplements} onChange={(v) => set('supplements', v)} />
        )}

      {error && <p className="text-[11px] font-medium" style={{ color: 'var(--danger-text)' }}>{error}</p>}
    </div>
  );
}

export default StepSupplements;
