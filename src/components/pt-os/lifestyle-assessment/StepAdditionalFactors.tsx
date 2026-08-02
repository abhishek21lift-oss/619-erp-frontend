'use client';

import { Sparkles } from 'lucide-react';
import { Slider } from '@/components/ui';
import SearchableSelect from '@/components/pt-os/SearchableSelect';
import type { LifestyleFormData } from './types';
import { n } from './types';
import type { RecoveryQuality } from '@/lib/lifestyle-calculations';

const SCREEN_TIME_OPTIONS = [
  { value: '<2', label: '<2 Hours' }, { value: '2_4', label: '2–4 Hours' }, { value: '4_6', label: '4–6 Hours' },
  { value: '6_8', label: '6–8 Hours' }, { value: '8_plus', label: '8+ Hours' },
];

const TRAVEL_OPTIONS = [
  { value: 'rarely', label: 'Rarely' }, { value: 'monthly', label: 'Monthly' },
  { value: 'weekly', label: 'Weekly' }, { value: 'daily', label: 'Daily' },
];

const RECOVERY_OPTIONS: { value: RecoveryQuality; label: string }[] = [
  { value: 'poor', label: 'Poor' }, { value: 'average', label: 'Average' },
  { value: 'good', label: 'Good' }, { value: 'excellent', label: 'Excellent' },
];

interface StepAdditionalFactorsProps {
  form: LifestyleFormData;
  set: <K extends keyof LifestyleFormData>(key: K, val: LifestyleFormData[K]) => void;
}

export function StepAdditionalFactors({ form, set }: StepAdditionalFactorsProps) {
  return (
    <div className="space-y-7">
      <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: '#0f172a' }}>
            <Sparkles size={20} color="#1CA3F9" />
          </div>
          <div>
            <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-slate-900 leading-none">Additional Lifestyle Factors</h2>
            <p className="text-[13px] text-slate-400 mt-1.5">Step 9 of 9 — the last few pieces of the picture.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SearchableSelect label="Screen Time" allowCustom={false} value={form.screenTimeBracket} onChange={(v) => set('screenTimeBracket', v as LifestyleFormData['screenTimeBracket'])} options={SCREEN_TIME_OPTIONS} />
          <SearchableSelect label="Travel Frequency" allowCustom={false} value={form.travelFrequency} onChange={(v) => set('travelFrequency', v as LifestyleFormData['travelFrequency'])} options={TRAVEL_OPTIONS} />
        </div>

        <Slider label="Energy Level" value={n(form.energyLevel) ?? 5} min={1} max={10} onChange={(v) => set('energyLevel', String(v))} scaleLabels={['1 · Low', '10 · High']} />
        <Slider label="Motivation to Exercise" value={n(form.motivationToExercise) ?? 5} min={1} max={10} onChange={(v) => set('motivationToExercise', String(v))} scaleLabels={['1 · Low', '10 · High']} />

        <div>
          <p className="mb-3 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>Recovery Quality</p>
          <div className="flex gap-2 flex-wrap">
            {RECOVERY_OPTIONS.map((r) => {
              const selected = form.recoveryQuality === r.value;
              return (
                <button
                  key={r.value} type="button"
                  onClick={() => set('recoveryQuality', r.value)}
                  className="rounded-[11px] px-4 py-2.5 text-[13px] font-[700] transition-all"
                  style={{
                    background: selected ? '#0f172a' : '#f8fafc',
                    color: selected ? '#fff' : '#64748b',
                    border: selected ? '1.5px solid #0f172a' : '1.5px solid #e2e8f0',
                  }}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>
    </div>
  );
}

export default StepAdditionalFactors;
