'use client';

import { useMemo } from 'react';
import { Ruler } from 'lucide-react';
import FloatInput from '@/components/ui/FloatInput';
import { calcBmi, calcWhr } from '@/lib/fitness-calculations';
import type { AssessmentFormData } from './types';
import { n } from './types';

interface StepAnthropometricProps {
  form: AssessmentFormData;
  set: <K extends keyof AssessmentFormData>(key: K, val: AssessmentFormData[K]) => void;
  error?: string;
}

export function StepAnthropometric({ form, set, error }: StepAnthropometricProps) {
  const bmi = useMemo(() => calcBmi(n(form.weight), n(form.heightCm)), [form.weight, form.heightCm]);
  const whr = useMemo(() => calcWhr(n(form.waistCm), n(form.hipsCm)), [form.waistCm, form.hipsCm]);

  return (
    <div className="rounded-[24px] overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 4px 24px rgba(15,23,42,0.06)' }}>
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#0f172a,#334155)' }} />
      <div className="p-7 sm:p-10">
        <div className="flex items-start gap-4 mb-7">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: '#0f172a' }}>
            <Ruler size={20} color="#F59E0B" />
          </div>
          <div>
            <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-slate-900 leading-none">Anthropometric Assessment</h2>
            <p className="text-[13px] text-slate-400 mt-1.5">Step 2 of 7 — body measurements.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FloatInput label="Height (cm)" type="number" value={form.heightCm} onChange={(v) => set('heightCm', v)} />
          <FloatInput label="Weight (kg)" type="number" value={form.weight} onChange={(v) => set('weight', v)} />
          <FloatInput label="BMI" value={bmi != null ? String(bmi) : ''} onChange={() => {}} disabled />
          <FloatInput label="Neck (cm)" type="number" value={form.neckCm} onChange={(v) => set('neckCm', v)} />
          <FloatInput label="Waist (cm)" type="number" value={form.waistCm} onChange={(v) => set('waistCm', v)} />
          <FloatInput label="Hip (cm)" type="number" value={form.hipsCm} onChange={(v) => set('hipsCm', v)} />
          <FloatInput label="Waist-Hip Ratio" value={whr != null ? String(whr) : ''} onChange={() => {}} disabled />
          <FloatInput label="Chest (cm)" type="number" value={form.chestCm} onChange={(v) => set('chestCm', v)} />
        </div>

        <div className="mt-6">
          <p className="mb-3 text-[12px] font-[700] uppercase tracking-widest text-slate-400">Limbs (Right / Left)</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <FloatInput label="Right Arm (cm)" type="number" value={form.armRightCm} onChange={(v) => set('armRightCm', v)} />
            <FloatInput label="Left Arm (cm)" type="number" value={form.armLeftCm} onChange={(v) => set('armLeftCm', v)} />
            <div className="hidden sm:block" />
            <FloatInput label="Right Thigh (cm)" type="number" value={form.thighRightCm} onChange={(v) => set('thighRightCm', v)} />
            <FloatInput label="Left Thigh (cm)" type="number" value={form.thighLeftCm} onChange={(v) => set('thighLeftCm', v)} />
            <div className="hidden sm:block" />
            <FloatInput label="Right Calf (cm)" type="number" value={form.calfRightCm} onChange={(v) => set('calfRightCm', v)} />
            <FloatInput label="Left Calf (cm)" type="number" value={form.calfLeftCm} onChange={(v) => set('calfLeftCm', v)} />
          </div>
        </div>

        {error && <p className="mt-3 text-[11px] font-medium" style={{ color: 'var(--danger)' }}>{error}</p>}

        {(bmi != null || whr != null) && (
          <div className="mt-6 rounded-[16px] p-4 grid grid-cols-2 gap-4" style={{ background: 'var(--bg-subtle)' }}>
            <div>
              <p className="text-[10.5px] font-[700] uppercase tracking-wider text-slate-400">BMI</p>
              <p className="text-[18px] font-[800] text-slate-900">{bmi ?? '—'}</p>
            </div>
            <div>
              <p className="text-[10.5px] font-[700] uppercase tracking-wider text-slate-400">Waist-Hip Ratio</p>
              <p className="text-[18px] font-[800] text-slate-900">{whr ?? '—'}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default StepAnthropometric;
