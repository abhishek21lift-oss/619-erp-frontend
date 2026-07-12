'use client';

import { Move } from 'lucide-react';
import { Slider } from '@/components/ui';
import type { MobilityFormData } from './types';

interface StepBodyRegionsProps {
  form: MobilityFormData;
  set: <K extends keyof MobilityFormData>(key: K, val: MobilityFormData[K]) => void;
}

export function StepBodyRegions({ form, set }: StepBodyRegionsProps) {
  const updateRegion = (index: number, patch: Partial<MobilityFormData['bodyRegions'][number]>) => {
    const next = [...form.bodyRegions];
    next[index] = { ...next[index], ...patch };
    set('bodyRegions', next);
  };

  return (
    <div className="rounded-[24px] overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 4px 24px rgba(15,23,42,0.06)' }}>
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#0f172a,#334155)' }} />
      <div className="p-7 sm:p-10 space-y-7">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: '#0f172a' }}>
            <Move size={20} color="#F59E0B" />
          </div>
          <div>
            <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-slate-900 leading-none">Body Regions</h2>
            <p className="text-[13px] text-slate-400 mt-1.5">Step 1 of 3 — rate range of motion for each region, 1 (very restricted) to 5 (excellent).</p>
          </div>
        </div>

        <div className="space-y-6">
          {form.bodyRegions.map((r, i) => (
            <div key={r.region} className="rounded-[16px] p-4" style={{ background: 'var(--bg-subtle)' }}>
              <Slider
                label={r.region} value={r.score ?? 3} min={1} max={5}
                onChange={(v) => updateRegion(i, { score: v })}
                scaleLabels={['1 · Restricted', '5 · Excellent']}
              />
              <div className="mt-3 flex flex-wrap gap-4">
                <ToggleField label="Pain?" value={r.pain ?? false} onChange={(v) => updateRegion(i, { pain: v })} />
                <ToggleField label="Restriction?" value={r.restriction ?? false} onChange={(v) => updateRegion(i, { restriction: v })} />
              </div>
            </div>
          ))}
        </div>
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

export default StepBodyRegions;
