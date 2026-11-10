'use client';

import { useMemo } from 'react';
import { Ruler } from 'lucide-react';
import FloatInput from '@/components/ui/FloatInput';
import {
  calcBmi, calcWhr, classifyBmi, classifyWaistRisk, classifyWhrRisk,
} from '@/lib/fitness-calculations';
import type { AnthropometricRisk, BmiCategory, Gender } from '@/lib/fitness-calculations';
import type { AssessmentFormData } from './types';
import { n } from './types';
import { StepCard } from './StepCard';
import { bmiPill, chapterAccent, riskPill, stepTones } from './fitnessTheme';

interface StepAnthropometricProps {
  form: AssessmentFormData;
  set: <K extends keyof AssessmentFormData>(key: K, val: AssessmentFormData[K]) => void;
  error?: string;
  /** Client profile sex. Waist and WHR norms are sex-specific. */
  gender?: Gender | null;
}

function ClassificationTile({
  label, value, unit, category, risk,
}: {
  label: string;
  value: number | null;
  unit?: string;
  category?: BmiCategory | null;
  risk?: AnthropometricRisk | null;
}) {
  const badge = category ? bmiPill(category) : risk ? riskPill(risk) : null;
  const text = category ?? risk ?? null;
  return (
    <div>
      <p className="text-[10.5px] font-[700] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="mt-1 text-[24px] font-[820] leading-none tabular-nums tracking-[-0.02em]" style={{ color: value == null ? 'var(--text-muted)' : 'var(--text-primary)' }}>
        {value ?? '—'}{value != null && unit ? ` ${unit}` : ''}
      </p>
      {text && badge && (
        <span className="mt-2 inline-block rounded-full px-2.5 py-1 text-[11px] font-[700]" style={{ background: badge.bg, color: badge.color }}>
          {text}
        </span>
      )}
    </div>
  );
}

export function StepAnthropometric({ form, set, error, gender = null }: StepAnthropometricProps) {
  const { bmi, whr, bmiCategory, waistRisk, whrRisk, waistIliacCm } = useMemo(() => {
    const bmi = calcBmi(n(form.weight), n(form.heightCm));
    const waistIliacCm = n(form.waistIliacCm);
    const whr = calcWhr(n(form.waistCm), n(form.hipsCm));
    return {
      bmi,
      whr,
      waistIliacCm,
      bmiCategory: classifyBmi(bmi),
      // The supplied waist-circumference table measures at the umbilicus/
      // iliac crest; WHR keeps the narrowest-waist landmark.
      waistRisk: classifyWaistRisk(waistIliacCm, gender),
      whrRisk: classifyWhrRisk(whr, gender),
    };
  }, [form.weight, form.heightCm, form.waistCm, form.waistIliacCm, form.hipsCm, gender]);

  const sexUnsupported = gender === null || gender === 'Other';

  return (
    <StepCard
      icon={Ruler}
      accent={chapterAccent[2]}
      title="Anthropometric data"
      description="Body measurements"
      badge="Step 2 of 7"
    >
      <div className="rounded-[18px] p-5" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
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
      </div>

      <div className="mt-5 rounded-[18px] p-5" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
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

      {sexUnsupported && (
        <p className="mt-4 rounded-[14px] px-4 py-3 text-[12px] leading-snug" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: 'var(--text-secondary)' }}>
          Waist-circumference and waist-to-hip risk bands are sex-specific. No classification is shown for this client until their profile records male or female. The measurements are still saved.
        </p>
      )}

      {(bmi != null || whr != null || waistIliacCm != null) && (
        <div className="mt-6 rounded-[18px] p-5" style={{ background: stepTones[2].wash, border: '1px solid var(--border)' }}>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <ClassificationTile label="BMI" value={bmi} category={bmiCategory} />
            <ClassificationTile label="Waist Circumference (Iliac)" value={waistIliacCm} unit="cm" risk={waistRisk} />
            <ClassificationTile label="Waist-Hip Ratio" value={whr} risk={whrRisk} />
          </div>
          <p className="mt-4 text-[11px] leading-snug" style={{ color: 'var(--text-muted)' }}>
            BMI uses the adult Asian bands. Waist-circumference risk uses Waist Iliac, the table&apos;s umbilicus/iliac landmark; WHR uses Waist Narrowest ÷ Hip. The published norms define only the low-risk cut-off, so a reading at or above it is shown as above that threshold, not given an invented risk band.
          </p>
        </div>
      )}
    </StepCard>
  );
}

export default StepAnthropometric;
