'use client';

import { useMemo } from 'react';
import { Activity } from 'lucide-react';
import FloatInput from '@/components/ui/FloatInput';
import SearchableSelect from '@/components/pt-os/SearchableSelect';
import { calcLeanBodyMass, calcFatMass, calcBmr, classifyBodyFat } from '@/lib/fitness-calculations';
import type { Gender } from '@/lib/fitness-calculations';
import type { AssessmentFormData } from './types';
import { n } from './types';
import { StepCard } from './StepCard';
import { bodyFatPill, chapterAccent, stepTones } from './fitnessTheme';

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
  const bodyFatCategory = useMemo(
    () => classifyBodyFat(n(form.bodyFatPct), gender),
    [form.bodyFatPct, gender],
  );
  const bodyFatTone = bodyFatCategory ? bodyFatPill(bodyFatCategory) : null;
  const suggestedBmr = useMemo(
    () => calcBmr(n(form.weight), n(form.heightCm), age, gender),
    [form.weight, form.heightCm, age, gender],
  );

  return (
    <StepCard
      icon={Activity}
      accent={chapterAccent[3]}
      title="Body Composition"
      description="Choose an assessment method"
      badge="Step 3 of 7"
    >
      {(gender === null || gender === 'Other') && (
        <p className="mb-4 rounded-[14px] px-4 py-3 text-[12px] leading-snug" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: 'var(--text-secondary)' }}>
          Body Composition score needs a male/female reference range, so it is not computed for this client — body-fat % and the other measurements are still recorded. No score is invented.
        </p>
      )}

      <div>
        <div className="mb-4">
          <SearchableSelect
            label="Assessment Method" allowCustom={false}
            value={form.bodyCompMethod}
            onChange={(v) => set('bodyCompMethod', v)}
            options={METHODS}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FloatInput label="Body Fat %" numeric="decimal" value={form.bodyFatPct} onChange={(v) => set('bodyFatPct', v)} />
          <FloatInput label="Muscle Mass %" numeric="decimal" value={form.muscleMassPct} onChange={(v) => set('muscleMassPct', v)} />
          <FloatInput label="Lean Body Mass (kg)" value={leanBodyMass != null ? String(leanBodyMass) : ''} onChange={() => {}} disabled />
          <FloatInput label="Fat Mass (kg)" value={fatMass != null ? String(fatMass) : ''} onChange={() => {}} disabled />
          <FloatInput label="Visceral Fat" numeric="integer" value={form.visceralFat} onChange={(v) => set('visceralFat', v)} />
          <FloatInput label="Subcutaneous Fat %" numeric="decimal" value={form.subcutaneousFatPct} onChange={(v) => set('subcutaneousFatPct', v)} />
          <FloatInput label="Body Water %" numeric="decimal" value={form.bodyWaterPct} onChange={(v) => set('bodyWaterPct', v)} />
          <FloatInput label="Bone Mass (kg)" numeric="decimal" value={form.boneMassKg} onChange={(v) => set('boneMassKg', v)} />
          <div>
            <FloatInput label="BMR (kcal)" numeric="integer" value={form.bmr} onChange={(v) => set('bmr', v)} />
          </div>
          <FloatInput label="Metabolic Age" numeric="integer" value={form.metabolicAge} onChange={(v) => set('metabolicAge', v)} />
        </div>
      </div>

      {error && <p className="mt-3 text-[11px] font-medium" style={{ color: 'var(--danger-text)' }}>{error}</p>}

      {(leanBodyMass != null || fatMass != null || bodyFatCategory != null) && (
        <div className="mt-6 rounded-[18px] p-5" style={{ background: stepTones[3].wash, border: '1px solid var(--border)' }}>
          <p className="mb-3 text-[11px] font-[700] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Body Composition Summary</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-[10px] font-[600]" style={{ color: 'var(--text-muted)' }}>Lean Body Mass</p>
              <p className="mt-0.5 text-[18px] font-[780] tabular-nums" style={{ color: 'var(--text-primary)' }}>{leanBodyMass ?? '—'} kg</p>
            </div>
            <div>
              <p className="text-[10px] font-[600]" style={{ color: 'var(--text-muted)' }}>Fat Mass</p>
              <p className="mt-0.5 text-[18px] font-[780] tabular-nums" style={{ color: 'var(--text-primary)' }}>{fatMass ?? '—'} kg</p>
            </div>
            <div>
              <p className="text-[10px] font-[600]" style={{ color: 'var(--text-muted)' }}>Body Fat Category</p>
              {bodyFatCategory && bodyFatTone ? (
                <span className="mt-1 inline-block rounded-full px-2.5 py-1 text-[11px] font-[700]" style={{ background: bodyFatTone.bg, color: bodyFatTone.color }}>
                  {bodyFatCategory}
                </span>
              ) : (
                <p className="mt-0.5 text-[18px] font-[780]" style={{ color: 'var(--text-muted)' }}>—</p>
              )}
            </div>
          </div>
          {bodyFatCategory === 'Above Ideal Range' && (
            <p className="mt-4 text-[11px] leading-snug" style={{ color: 'var(--text-muted)' }}>
              The supplied table leaves this range between its Acceptable and Overfat rows undefined, so it is shown as above ideal without a health-risk label.
            </p>
          )}
        </div>
      )}
    </StepCard>
  );
}

export default StepBodyComposition;
