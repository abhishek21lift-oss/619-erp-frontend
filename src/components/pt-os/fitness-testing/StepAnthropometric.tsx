'use client';

import { useMemo } from 'react';
import { Ruler } from 'lucide-react';
import FloatInput from '@/components/ui/FloatInput';
import { calcBmi, calcWhr } from '@/lib/fitness-calculations';
import type { AssessmentFormData } from './types';
import { n } from './types';
import { StepHeader } from './StepHeader';
import { stepTones } from './fitnessTheme';

interface StepAnthropometricProps {
  form: AssessmentFormData;
  set: <K extends keyof AssessmentFormData>(key: K, val: AssessmentFormData[K]) => void;
  error?: string;
}

export function StepAnthropometric({ form, set, error }: StepAnthropometricProps) {
  const bmi = useMemo(() => calcBmi(n(form.weight), n(form.heightCm)), [form.weight, form.heightCm]);
  const whr = useMemo(() => calcWhr(n(form.waistCm), n(form.hipsCm)), [form.waistCm, form.hipsCm]);

  return (
    <div>
      <StepHeader
        icon={Ruler}
        tone={stepTones[2]}
        title="Anthropometric Assessment"
        subtitle="Step 2 of 7 — body measurements."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FloatInput label="Height (cm)" numeric="decimal" value={form.heightCm} onChange={(v) => set('heightCm', v)} />
        <FloatInput label="Weight (kg)" numeric="decimal" value={form.weight} onChange={(v) => set('weight', v)} />
        <FloatInput label="BMI" value={bmi != null ? String(bmi) : ''} onChange={() => {}} disabled />
        <FloatInput label="Neck (cm)" numeric="decimal" value={form.neckCm} onChange={(v) => set('neckCm', v)} />
        <FloatInput label="Waist Narrowest (cm)" numeric="decimal" value={form.waistCm} onChange={(v) => set('waistCm', v)} />
        <FloatInput label="Waist Iliac (cm)" numeric="decimal" value={form.waistIliacCm} onChange={(v) => set('waistIliacCm', v)} />
        <FloatInput label="Hip (cm)" numeric="decimal" value={form.hipsCm} onChange={(v) => set('hipsCm', v)} />
        <FloatInput label="Waist-Hip Ratio" value={whr != null ? String(whr) : ''} onChange={() => {}} disabled />
        <FloatInput label="Chest (cm)" numeric="decimal" value={form.chestCm} onChange={(v) => set('chestCm', v)} />
      </div>

      <div className="mt-6">
        <p className="mb-3 text-[12px] font-[700] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Limbs (Right / Left)</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <FloatInput label="Right Arm (cm)" numeric="decimal" value={form.armRightCm} onChange={(v) => set('armRightCm', v)} />
          <FloatInput label="Left Arm (cm)" numeric="decimal" value={form.armLeftCm} onChange={(v) => set('armLeftCm', v)} />
          <div className="hidden sm:block" />
          <FloatInput label="Right Thigh (cm)" numeric="decimal" value={form.thighRightCm} onChange={(v) => set('thighRightCm', v)} />
          <FloatInput label="Left Thigh (cm)" numeric="decimal" value={form.thighLeftCm} onChange={(v) => set('thighLeftCm', v)} />
          <div className="hidden sm:block" />
          <FloatInput label="Right Calf (cm)" numeric="decimal" value={form.calfRightCm} onChange={(v) => set('calfRightCm', v)} />
          <FloatInput label="Left Calf (cm)" numeric="decimal" value={form.calfLeftCm} onChange={(v) => set('calfLeftCm', v)} />
        </div>
      </div>

      {error && <p className="mt-3 text-[11px] font-medium" style={{ color: 'var(--danger-text)' }}>{error}</p>}

      {(bmi != null || whr != null) && (
        <div className="mt-6 grid grid-cols-2 gap-4 rounded-[18px] p-5" style={{ background: stepTones[2].wash, border: '1px solid var(--border)' }}>
          <div>
            <p className="text-[10.5px] font-[700] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>BMI</p>
            <p className="mt-1 text-[24px] font-[820] leading-none tabular-nums tracking-[-0.02em]" style={{ color: 'var(--text-primary)' }}>{bmi ?? '—'}</p>
          </div>
          <div>
            <p className="text-[10.5px] font-[700] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Waist-Hip Ratio</p>
            <p className="mt-1 text-[24px] font-[820] leading-none tabular-nums tracking-[-0.02em]" style={{ color: 'var(--text-primary)' }}>{whr ?? '—'}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default StepAnthropometric;
