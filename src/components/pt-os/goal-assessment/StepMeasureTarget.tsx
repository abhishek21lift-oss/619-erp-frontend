'use client';

import { useMemo } from 'react';
import {
  ArrowDown, ArrowUp, CalendarCheck, Dumbbell, Percent, Scale, Target,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import FloatInput from '@/components/ui/FloatInput';
import GoalStepCard from './GoalStepCard';
import { amber, indigo, gray, tint } from '@/lib/palette';
import type { GoalMeasureMetric } from '@/lib/goal-plan';
import type { GoalFormData } from './types';
import { n } from './types';

const METRICS: { value: GoalMeasureMetric; label: string; hint: string; icon: LucideIcon }[] = [
  { value: 'weight', label: 'Weight', hint: 'kg on the scale', icon: Scale },
  { value: 'body_fat', label: 'Body fat', hint: 'percentage points', icon: Percent },
  { value: 'lift', label: 'Strength / lift', hint: 'e.g. squat +20 kg', icon: Dumbbell },
  { value: 'sessions', label: 'Sessions', hint: 'training per week', icon: CalendarCheck },
  { value: 'custom', label: 'Custom', hint: 'anything measurable', icon: Target },
];

interface StepMeasureTargetProps {
  form: GoalFormData;
  set: <K extends keyof GoalFormData>(key: K, val: GoalFormData[K]) => void;
  currentWeight: number | null;
  currentBodyFat: number | null;
  measuredWeight: boolean;
  measuredBodyFat: boolean;
  step: number;
  error?: string;
}

/**
 * K11's Measurable element, in one place. Weight and body fat keep their
 * first-class columns; lift, session count and custom metrics live in
 * routine_blueprint.k11, which the server validates and analyses.
 */
export function StepMeasureTarget({
  form, set, currentWeight, currentBodyFat, measuredWeight, measuredBodyFat, step, error,
}: StepMeasureTargetProps) {
  const metric = form.targetMetric;

  const current = metric === 'weight' ? currentWeight
    : metric === 'body_fat' ? currentBodyFat
      : metric ? n(form.targetStart) : null;
  const target = metric === 'weight' ? n(form.targetWeight)
    : metric === 'body_fat' ? n(form.targetBodyFat)
      : metric ? n(form.targetValue) : null;
  const gap = useMemo(
    () => (current != null && target != null ? Math.round((target - current) * 100) / 100 : null),
    [current, target],
  );

  const unit = metric === 'weight' ? 'kg'
    : metric === 'body_fat' ? '%'
      : metric === 'sessions' ? 'sessions/week'
        : form.targetUnit.trim();

  return (
    <GoalStepCard
      icon={Target} title="Measure & Target" step={step}
      hint="K11 measurable — the number this goal is judged by"
    >
      <div className="space-y-6">
        <div>
          <p className="mb-2 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: gray[500] }}>What is measured?</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {METRICS.map((m) => {
              const selected = metric === m.value;
              const Icon = m.icon;
              return (
                <button
                  key={m.value} type="button" aria-pressed={selected}
                  onClick={() => set('targetMetric', m.value)}
                  className="flex flex-col items-center gap-2 rounded-[14px] px-2 py-3 text-center transition-all"
                  style={{
                    background: selected ? tint(indigo[500], 0.08) : gray[50],
                    border: selected ? `2px solid ${indigo[500]}` : `2px solid ${gray[200]}`,
                  }}
                >
                  <Icon size={17} style={{ color: selected ? indigo[700] : gray[500] }} />
                  <span className="text-[12px] font-[760]" style={{ color: selected ? indigo[700] : gray[700] }}>{m.label}</span>
                  <span className="text-[10.5px] leading-tight" style={{ color: gray[500] }}>{m.hint}</span>
                </button>
              );
            })}
          </div>
        </div>

        {metric === 'weight' && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {measuredWeight ? (
              <FloatInput label="Current weight (from assessment)" value={currentWeight != null ? String(currentWeight) : ''} onChange={() => {}} disabled />
            ) : (
              <FloatInput label="Starting weight (kg)" numeric="decimal" value={form.startingWeightManual} onChange={(v) => set('startingWeightManual', v)} />
            )}
            <FloatInput label="Target weight (kg)" numeric="decimal" value={form.targetWeight} onChange={(v) => set('targetWeight', v)} />
          </div>
        )}

        {metric === 'body_fat' && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {measuredBodyFat ? (
              <FloatInput label="Current body fat (from assessment)" value={currentBodyFat != null ? String(currentBodyFat) : ''} onChange={() => {}} disabled />
            ) : (
              <FloatInput label="Starting body fat (%)" numeric="decimal" value={form.startingBodyFatManual} onChange={(v) => set('startingBodyFatManual', v)} />
            )}
            <FloatInput label="Target body fat (%)" numeric="decimal" value={form.targetBodyFat} onChange={(v) => set('targetBodyFat', v)} />
          </div>
        )}

        {metric === 'lift' && (
          <div className="space-y-4">
            <FloatInput label="Exercise" maxLength={100} value={form.targetExercise} onChange={(v) => set('targetExercise', v)} placeholder="Back Squat" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FloatInput label="Current lift" numeric="decimal" value={form.targetStart} onChange={(v) => set('targetStart', v)} />
              <FloatInput label="Target lift" numeric="decimal" value={form.targetValue} onChange={(v) => set('targetValue', v)} />
              <FloatInput label="Unit" maxLength={20} value={form.targetUnit} onChange={(v) => set('targetUnit', v)} placeholder="kg" />
            </div>
          </div>
        )}

        {metric === 'sessions' && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FloatInput label="Current sessions / week (optional)" numeric="decimal" value={form.targetStart} onChange={(v) => set('targetStart', v)} />
            <FloatInput label="Target sessions / week" numeric="decimal" value={form.targetValue} onChange={(v) => set('targetValue', v)} />
          </div>
        )}

        {metric === 'custom' && (
          <div className="space-y-4">
            <FloatInput label="What is measured?" maxLength={100} value={form.customMetric} onChange={(v) => set('customMetric', v)} placeholder="Waist, push-ups, 5k time…" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FloatInput label="Current value (optional)" numeric="decimal" value={form.targetStart} onChange={(v) => set('targetStart', v)} />
              <FloatInput label="Target value" numeric="decimal" value={form.targetValue} onChange={(v) => set('targetValue', v)} />
              <FloatInput label="Unit" maxLength={20} value={form.targetUnit} onChange={(v) => set('targetUnit', v)} placeholder="cm / reps / min" />
            </div>
          </div>
        )}

        {!metric && (
          <div className="rounded-[14px] px-4 py-3 text-[12.5px]" style={{ background: gray[50], color: gray[600] }}>
            Pick one measure. If this goal genuinely has no number, write a success metric in the SMART step instead.
          </div>
        )}

        {directionWarning(form.goalType, gap) && (
          <p className="rounded-[12px] px-3.5 py-2.5 text-[12.5px] font-[600]" role="status"
            style={{ background: tint(amber[500], 0.12), color: gray[800], border: `1px solid ${tint(amber[500], 0.35)}` }}>
            {directionWarning(form.goalType, metric === 'weight' || metric === 'body_fat' ? gap : null, metric)}
          </p>
        )}

        {gap != null && metric && (
          <div className="rounded-[16px] p-5" style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e293b 100%)' }}>
            <div className="flex flex-wrap items-center justify-center gap-4 text-center">
              <div>
                <p className="text-[10px] font-[600] uppercase tracking-wider text-white/40">Current</p>
                <p className="text-[20px] font-[800] text-white">{current} {unit}</p>
              </div>
              {gap < 0 ? <ArrowDown size={18} color="#852E4E" /> : gap > 0 ? <ArrowUp size={18} color="#852E4E" /> : null}
              <div>
                <p className="text-[10px] font-[600] uppercase tracking-wider text-white/40">Target</p>
                <p className="text-[20px] font-[800] text-white">{target} {unit}</p>
              </div>
              <div className="rounded-full px-3 py-1.5" style={{ background: 'rgba(163,55,87,0.15)' }}>
                <p className="text-[13px] font-[800]" style={{ color: '#852E4E' }}>
                  {gap === 0 ? 'Maintain' : `Need to change by ${Math.abs(gap)} ${unit}`}
                </p>
              </div>
            </div>
          </div>
        )}

        {error && <p className="text-[11px] font-medium" style={{ color: 'var(--danger-text)' }}>{error}</p>}
      </div>
    </GoalStepCard>
  );
}

/** A target that runs the wrong way for the goal, as a sentence. */
function directionWarning(goalType: string, gap: number | null, metric?: GoalMeasureMetric | ''): string | null {
  if (gap == null || gap === 0) return null;
  const measured = metric === 'body_fat' ? 'body fat' : 'weight';
  if (goalType === 'fat_loss' && gap > 0) return `This is a fat-loss goal, but the target ${measured} is above the current ${measured}. Check both numbers.`;
  if (goalType === 'muscle_gain' && gap < 0) return `This is a muscle-gain goal, but the target ${measured} is below the current ${measured}. Check both numbers.`;
  return null;
}

export default StepMeasureTarget;
