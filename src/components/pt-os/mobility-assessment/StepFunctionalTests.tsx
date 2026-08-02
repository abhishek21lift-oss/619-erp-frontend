'use client';

import { ClipboardCheck } from 'lucide-react';
import { Slider } from '@/components/ui';
import FloatInput from '@/components/ui/FloatInput';
import type { MobilityFormData } from './types';

interface StepFunctionalTestsProps {
  form: MobilityFormData;
  set: <K extends keyof MobilityFormData>(key: K, val: MobilityFormData[K]) => void;
}

export function StepFunctionalTests({ form, set }: StepFunctionalTestsProps) {
  const updateTest = (index: number, patch: Partial<MobilityFormData['mobilityTests'][number]>) => {
    const next = [...form.mobilityTests];
    next[index] = { ...next[index], ...patch };
    set('mobilityTests', next);
  };

  return (
    <div className="space-y-7">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: '#0f172a' }}>
          <ClipboardCheck size={20} color="#1CA3F9" />
        </div>
        <div>
          <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-slate-900 leading-none">Functional Tests</h2>
          <p className="text-[13px] text-slate-400 mt-1.5">Step 2 of 3 — score each movement screen, 1 (poor) to 5 (excellent).</p>
        </div>
      </div>

      <div className="space-y-6">
        {form.mobilityTests.map((t, i) => (
          <div key={t.test} className="rounded-[16px] p-4" style={{ background: 'var(--bg-subtle)' }}>
            <Slider
              label={t.test} value={t.score ?? 3} min={1} max={5}
              onChange={(v) => updateTest(i, { score: v })}
              scaleLabels={['1 · Poor', '5 · Excellent']}
            />
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
              <div className="sm:col-span-1">
                <FloatInput label="Notes" value={t.notes || ''} onChange={(v) => updateTest(i, { notes: v })} />
              </div>
              <div className="sm:col-span-2 flex flex-wrap gap-4 pt-2">
                <ToggleField label="Pain?" value={t.pain ?? false} onChange={(v) => updateTest(i, { pain: v })} />
                <ToggleField label="Restriction?" value={t.restriction ?? false} onChange={(v) => updateTest(i, { restriction: v })} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ToggleFieldProps { label: string; value: boolean; onChange: (v: boolean) => void; }
function ToggleField({ label, value, onChange }: ToggleFieldProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11.5px] font-[620] text-slate-500">{label}</span>
      <div className="flex gap-1.5">
        {[{ v: true, label: 'Yes' }, { v: false, label: 'No' }].map((o) => {
          const selected = value === o.v;
          return (
            <button
              key={o.label} type="button" onClick={() => onChange(o.v)}
              className="rounded-[8px] px-2.5 py-1 text-[11px] font-[700] transition-all"
              style={{
                background: selected ? (o.v ? '#dc2626' : '#0f172a') : '#f8fafc',
                color: selected ? '#fff' : '#64748b',
                border: selected ? 'none' : '1.5px solid #e2e8f0',
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

export default StepFunctionalTests;
