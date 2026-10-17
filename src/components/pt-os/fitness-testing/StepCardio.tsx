'use client';

import { useMemo } from 'react';
import { Wind } from 'lucide-react';
import FloatInput from '@/components/ui/FloatInput';
import SearchableSelect from '@/components/pt-os/SearchableSelect';
import {
  calcVo2MaxRockport, calcVo2MaxCooper, calcVo2MaxBruce, calcHarvardPei,
  classifyHarvardPei, classifyVo2Max, classifyStepTestRecovery,
} from '@/lib/fitness-calculations';
import type { AssessmentFormData, CardioTestType } from './types';
import { n } from './types';
import { StepHeader } from './StepHeader';
import { categoryPill, stepTones } from './fitnessTheme';

const CARDIO_TESTS: CardioTestType[] = [
  'YMCA 3-Minute Step Test', 'Rockport 1-Mile Walk', 'Cooper 12-Minute Run',
  'Bruce Protocol', 'Harvard Step Test', 'Custom',
];

interface StepCardioProps {
  form: AssessmentFormData;
  set: <K extends keyof AssessmentFormData>(key: K, val: AssessmentFormData[K]) => void;
  age: number | null;
  gender: 'Male' | 'Female' | 'Other' | null;
  error?: string;
}

export function StepCardio({ form, set, age, gender, error }: StepCardioProps) {
  const preview = useMemo(() => {
    switch (form.cardioTestType) {
      case 'Rockport 1-Mile Walk': {
        const vo2 = calcVo2MaxRockport(n(form.weight), age, gender, n(form.cardioTimeMin), n(form.cardioHeartRate));
        return { vo2, category: classifyVo2Max(vo2, age, gender) };
      }
      case 'Cooper 12-Minute Run': {
        const vo2 = calcVo2MaxCooper(n(form.cardioDistanceMeters));
        return { vo2, category: classifyVo2Max(vo2, age, gender) };
      }
      case 'Bruce Protocol': {
        const vo2 = calcVo2MaxBruce(n(form.cardioTreadmillMinutes));
        return { vo2, category: classifyVo2Max(vo2, age, gender) };
      }
      case 'Harvard Step Test': {
        const pei = calcHarvardPei(n(form.cardioDurationSec), n(form.cardioPulse1), n(form.cardioPulse2), n(form.cardioPulse3));
        return { vo2: null, category: classifyHarvardPei(pei), pei };
      }
      case 'YMCA 3-Minute Step Test':
        return { vo2: null, category: classifyStepTestRecovery(n(form.cardioRecoveryHr)) };
      default:
        return { vo2: null, category: null };
    }
  }, [form, age, gender]);

  const pill = preview.category ? categoryPill(preview.category) : null;

  return (
    <div>
      <StepHeader
        icon={Wind}
        tone={stepTones[4]}
        title="Cardiorespiratory Endurance"
        subtitle="Step 4 of 7 — choose a test."
      />

      <div className="mb-5">
        <SearchableSelect
          label="Test" required allowCustom={false}
          value={form.cardioTestType}
          onChange={(v) => set('cardioTestType', v as CardioTestType)}
          options={CARDIO_TESTS}
        />
      </div>

      {form.cardioTestType === 'Rockport 1-Mile Walk' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FloatInput label="Completion Time (min)" numeric="decimal" value={form.cardioTimeMin} onChange={(v) => set('cardioTimeMin', v)} />
          <FloatInput label="Heart Rate at Finish (bpm)" numeric="integer" value={form.cardioHeartRate} onChange={(v) => set('cardioHeartRate', v)} />
        </div>
      )}
      {form.cardioTestType === 'Cooper 12-Minute Run' && (
        <FloatInput label="Distance Covered (meters)" numeric="integer" value={form.cardioDistanceMeters} onChange={(v) => set('cardioDistanceMeters', v)} />
      )}
      {form.cardioTestType === 'Bruce Protocol' && (
        <FloatInput label="Total Treadmill Time (min)" numeric="decimal" value={form.cardioTreadmillMinutes} onChange={(v) => set('cardioTreadmillMinutes', v)} />
      )}
      {form.cardioTestType === 'Harvard Step Test' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FloatInput label="Duration (sec)" numeric="integer" value={form.cardioDurationSec} onChange={(v) => set('cardioDurationSec', v)} />
          <FloatInput label="Pulse 1 (1-1.5min post)" numeric="integer" value={form.cardioPulse1} onChange={(v) => set('cardioPulse1', v)} />
          <FloatInput label="Pulse 2 (2-2.5min post)" numeric="integer" value={form.cardioPulse2} onChange={(v) => set('cardioPulse2', v)} />
          <FloatInput label="Pulse 3 (3-3.5min post)" numeric="integer" value={form.cardioPulse3} onChange={(v) => set('cardioPulse3', v)} />
        </div>
      )}
      {form.cardioTestType === 'YMCA 3-Minute Step Test' && (
        <div>
          <FloatInput label="Recovery Heart Rate (bpm)" numeric="integer" value={form.cardioRecoveryHr} onChange={(v) => set('cardioRecoveryHr', v)} />
          <p className="mt-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>No standard VO₂max formula for this test — classified by heart-rate recovery only.</p>
        </div>
      )}
      {form.cardioTestType === 'Custom' && (
        <FloatInput label="Notes" multiline autoGrow maxLength={1000} value={form.cardioDistanceMeters} onChange={(v) => set('cardioDistanceMeters', v)} />
      )}

      {error && <p className="mt-3 text-[11px] font-medium" style={{ color: 'var(--danger-text)' }}>{error}</p>}

      {form.cardioTestType && (preview.vo2 != null || preview.category) && (
        <div className="mt-6 flex flex-wrap items-center gap-4 rounded-[18px] p-5" style={{ background: stepTones[4].wash, border: '1px solid var(--border)' }}>
          {preview.vo2 != null && (
            <div>
              <p className="text-[10.5px] font-[700] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Estimated VO₂ Max</p>
              <p className="mt-1 text-[24px] font-[820] leading-none tabular-nums tracking-[-0.02em]" style={{ color: 'var(--text-primary)' }}>
                {preview.vo2} <span className="text-[13px] font-[640] tracking-normal" style={{ color: 'var(--text-muted)' }}>mL/kg/min</span>
              </p>
            </div>
          )}
          {preview.category && pill && (
            <span className="rounded-full px-3 py-1 text-[12px] font-[700]" style={{ background: pill.bg, color: pill.color }}>
              {preview.category}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default StepCardio;
