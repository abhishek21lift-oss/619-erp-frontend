'use client';

import { useMemo } from 'react';
import { Activity } from 'lucide-react';
import FloatInput from '@/components/ui/FloatInput';
import SearchableSelect from '@/components/pt-os/SearchableSelect';
import { calcLeanBodyMass, calcFatMass, calcBmr } from '@/lib/fitness-calculations';
import type { Gender } from '@/lib/fitness-calculations';
import type { AssessmentFormData } from './types';
import { n } from './types';

const METHODS = ['BIA Machine', 'Skinfold', 'DEXA', 'Manual', 'Other'];

interface StepBodyCompositionProps {
  form: AssessmentFormData;
  set: <K extends keyof AssessmentFormData>(key: K, val: AssessmentFormData[K]) => void;
  age: number | null;
  gender: Gender | null;
  error?: string;
}

export function StepBodyComposition({ form, set, age, gender, error }: StepBodyCompositionProps) {
  const leanBodyMass = useMemo(() => calcLeanBodyMass(n(form.weight), n(form.bodyFatPct)), [form.weight, form.bodyFatPct]);
  const fatMass = useMemo(() => calcFatMass(n(form.weight), n(form.bodyFatPct)), [form.weight, form.bodyFatPct]);
  const suggestedBmr = useMemo(
    () => calcBmr(n(form.weight), n(form.heightCm), age, gender),
    [form.weight, form.heightCm, age, gender],
  );

  return (
    <div>
      <div className="flex items-start gap-4 mb-7">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: '#0f172a' }}>
          <Activity size={20} color="#1CA3F9" />
        </div>
        <div>
          <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-slate-900 leading-none">Body Composition</h2>
          <p className="text-[13px] text-slate-400 mt-1.5">Step 3 of 7 — choose an assessment method.</p>
        </div>
      </div>

      <div className="mb-5">
        <SearchableSelect
          label="Assessment Method" allowCustom={false} hideLabel
          value={form.bodyCompMethod}
          onChange={(v) => set('bodyCompMethod', v)}
          options={METHODS}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FloatInput label="Body Fat %" type="number" value={form.bodyFatPct} onChange={(v) => set('bodyFatPct', v)} />
        <FloatInput label="Muscle Mass %" type="number" value={form.muscleMassPct} onChange={(v) => set('muscleMassPct', v)} />
        <FloatInput label="Lean Body Mass (kg)" value={leanBodyMass != null ? String(leanBodyMass) : ''} onChange={() => {}} disabled />
        <FloatInput label="Fat Mass (kg)" value={fatMass != null ? String(fatMass) : ''} onChange={() => {}} disabled />
        <FloatInput label="Visceral Fat" type="number" value={form.visceralFat} onChange={(v) => set('visceralFat', v)} />
        <FloatInput label="Subcutaneous Fat %" type="number" value={form.subcutaneousFatPct} onChange={(v) => set('subcutaneousFatPct', v)} />
        <FloatInput label="Body Water %" type="number" value={form.bodyWaterPct} onChange={(v) => set('bodyWaterPct', v)} />
        <FloatInput label="Bone Mass (kg)" type="number" value={form.boneMassKg} onChange={(v) => set('boneMassKg', v)} />
        <div>
          <FloatInput label="BMR (kcal)" type="number" value={form.bmr} onChange={(v) => set('bmr', v)} />
          <p className="mt-1.5 text-[11px] text-slate-400">
            {suggestedBmr != null
              ? `Leave blank to auto-suggest ${suggestedBmr} kcal (Mifflin-St Jeor).`
              : 'Leave blank to auto-suggest via Mifflin-St Jeor.'}
          </p>
        </div>
        <FloatInput label="Metabolic Age" type="number" value={form.metabolicAge} onChange={(v) => set('metabolicAge', v)} />
      </div>

      {error && <p className="mt-3 text-[11px] font-medium" style={{ color: 'var(--danger-text)' }}>{error}</p>}

      {(leanBodyMass != null || fatMass != null) && (
        <div className="mt-6 rounded-[16px] p-5" style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e293b 100%)' }}>
          <p className="text-[11px] font-[700] uppercase tracking-wider text-white/50 mb-3">Body Composition Summary</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] text-white/40 font-[600]">Lean Body Mass</p>
              <p className="text-[16px] font-[720] text-white">{leanBodyMass ?? '—'} kg</p>
            </div>
            <div>
              <p className="text-[10px] text-white/40 font-[600]">Fat Mass</p>
              <p className="text-[16px] font-[720] text-white">{fatMass ?? '—'} kg</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StepBodyComposition;
