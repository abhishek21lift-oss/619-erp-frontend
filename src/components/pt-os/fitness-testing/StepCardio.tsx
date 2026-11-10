'use client';

import { useMemo } from 'react';
import {
  Footprints, HeartPulse, Mountain, SlidersHorizontal, Timer, type LucideIcon,
} from 'lucide-react';
import FloatInput from '@/components/ui/FloatInput';
import {
  calcVo2MaxRockport, calcVo2MaxCooper, calcVo2MaxBruce, calcHarvardPei,
  classifyHarvardPei, classifyVo2Max, classifyStepTestRecovery,
} from '@/lib/fitness-calculations';
import type { AssessmentFormData, CardioTestType } from './types';
import { n } from './types';
import { StepCard } from './StepCard';
import { ReadingHero, ReadingInput, StatusChip } from './ReadingHero';
import { categoryPill, chapterAccent } from './fitnessTheme';

const CARDIO_TESTS: CardioTestType[] = [
  'YMCA 3-Minute Step Test', 'Rockport 1-Mile Walk', 'Cooper 12-Minute Run',
  'Bruce Protocol', 'Harvard Step Test', 'Custom',
];

const CARDIO_META: Record<CardioTestType, { icon: LucideIcon; hint: string; protocol: string }> = {
  'YMCA 3-Minute Step Test': {
    icon: Footprints,
    hint: '12 in step · recovery pulse',
    protocol: '12-inch step board, 96 bpm metronome, 3 minutes of stepping. Sit immediately and count the recovery pulse for 1 full minute. Lower recovery pulse is better.',
  },
  'Rockport 1-Mile Walk': {
    icon: Footprints,
    hint: '1 mile · time + finish HR',
    protocol: 'Walk 1 mile (1.6 km) as fast as possible; record completion time and heart rate at the finish.',
  },
  'Cooper 12-Minute Run': {
    icon: Timer,
    hint: '12 min · distance covered',
    protocol: 'Run as far as possible in 12 minutes; record the distance covered.',
  },
  'Bruce Protocol': {
    icon: Mountain,
    hint: 'Treadmill · total time',
    protocol: 'Treadmill protocol; record the total time completed.',
  },
  'Harvard Step Test': {
    icon: Footprints,
    hint: '20 in step · 3 recovery pulses',
    protocol: '20-inch step at 30 steps per minute for up to 5 minutes; record the three recovery pulses.',
  },
  Custom: {
    icon: SlidersHorizontal,
    hint: 'Free-form protocol + notes',
    protocol: 'Free-form cardiorespiratory test; record the protocol in the notes.',
  },
};

const ACCENT = chapterAccent[4];

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
        return { vo2: null, category: classifyStepTestRecovery(n(form.cardioRecoveryHr), age, gender) };
      default:
        return { vo2: null, category: null };
    }
  }, [form, age, gender]);

  const pill = preview.category ? categoryPill(preview.category) : null;
  const meta = form.cardioTestType ? CARDIO_META[form.cardioTestType] : null;

  return (
    <div className="space-y-4">
      <StepCard
        icon={HeartPulse}
        accent={ACCENT}
        title="Choose a test"
        description="One cardio test per assessment"
        badge="Step 4 of 7"
      >
        <div role="radiogroup" aria-label="Cardiorespiratory test" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {CARDIO_TESTS.map((test) => {
            const { icon: Icon, hint } = CARDIO_META[test];
            const selected = form.cardioTestType === test;
            return (
              <button
                key={test}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={test}
                onClick={() => set('cardioTestType', test)}
                className="flex items-center gap-3 rounded-[14px] border p-3 text-left transition-all"
                style={{
                  background: selected ? `color-mix(in srgb, ${ACCENT} 5%, var(--bg-card))` : 'var(--bg-card)',
                  borderColor: selected ? ACCENT : 'var(--border)',
                  boxShadow: selected ? `0 0 0 3px color-mix(in srgb, ${ACCENT} 14%, transparent)` : 'none',
                }}
              >
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px]"
                  style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}
                >
                  <Icon size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-[700]" style={{ color: 'var(--text-primary)' }}>{test}</span>
                  <span className="mt-0.5 block truncate text-[11px]" style={{ color: 'var(--text-muted)' }}>{hint}</span>
                </span>
                <span
                  aria-hidden
                  className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-[1.5px]"
                  style={{ borderColor: selected ? ACCENT : 'var(--border-2)', background: selected ? ACCENT : 'transparent' }}
                >
                  {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                </span>
              </button>
            );
          })}
        </div>

        {error && <p className="text-[11px] font-medium" style={{ color: 'var(--danger-text)' }}>{error}</p>}
      </StepCard>

      {form.cardioTestType && meta && (
        <StepCard
          icon={meta.icon}
          accent={ACCENT}
          title={form.cardioTestType}
          description={meta.protocol}
          badge="Selected"
        >
          {form.cardioTestType === 'Rockport 1-Mile Walk' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FloatInput label="Duration (sec)" numeric="integer" value={form.cardioDurationSec} onChange={(v) => set('cardioDurationSec', v)} />
              <FloatInput label="Pulse 1 (1-1.5min post)" numeric="integer" value={form.cardioPulse1} onChange={(v) => set('cardioPulse1', v)} />
              <FloatInput label="Pulse 2 (2-2.5min post)" numeric="integer" value={form.cardioPulse2} onChange={(v) => set('cardioPulse2', v)} />
              <FloatInput label="Pulse 3 (3-3.5min post)" numeric="integer" value={form.cardioPulse3} onChange={(v) => set('cardioPulse3', v)} />
            </div>
          )}
          {form.cardioTestType === 'YMCA 3-Minute Step Test' && (
            <>
              <ReadingHero label="Recovery heart rate" accent={ACCENT}>
                <ReadingInput
                  label="Recovery Heart Rate (bpm)"
                  value={form.cardioRecoveryHr}
                  onChange={(v) => set('cardioRecoveryHr', v)}
                  unit="bpm"
                />
                {preview.category && pill && <StatusChip pill={pill}>{preview.category}</StatusChip>}
              </ReadingHero>
              <p className="text-[11px] leading-snug" style={{ color: 'var(--text-muted)' }}>No standard VO₂max formula for this test — classified by heart-rate recovery only.</p>
            </>
          )}
          {form.cardioTestType === 'Custom' && (
            <FloatInput label="Notes" multiline autoGrow maxLength={1000} value={form.cardioDistanceMeters} onChange={(v) => set('cardioDistanceMeters', v)} />
          )}

          {form.cardioTestType === 'Harvard Step Test' && preview.pei != null && (
            <ReadingHero label="Harvard PEI" accent={ACCENT}>
              <span className="text-[36px] font-[760] leading-none tracking-[-0.045em]" style={{ color: 'var(--text-primary)' }}>
                {preview.pei.toFixed(1)}
              </span>
              {preview.category && pill && <StatusChip pill={pill}>{preview.category}</StatusChip>}
            </ReadingHero>
          )}

          {(form.cardioTestType === 'Rockport 1-Mile Walk'
            || form.cardioTestType === 'Cooper 12-Minute Run'
            || form.cardioTestType === 'Bruce Protocol') && preview.vo2 != null && (
            <ReadingHero label="Estimated VO₂ max" accent={ACCENT}>
              <span className="text-[36px] font-[760] leading-none tracking-[-0.045em]" style={{ color: 'var(--text-primary)' }}>
                {preview.vo2}
              </span>
              <span className="text-[12px] font-[600]" style={{ color: 'var(--text-muted)' }}>mL/kg/min</span>
              {preview.category && pill && <StatusChip pill={pill}>{preview.category}</StatusChip>}
            </ReadingHero>
          )}
        </StepCard>
      )}
    </div>
  );
}

export default StepCardio;
