'use client';

import { useMemo } from 'react';
import { Scale, ArrowDown, ArrowUp } from 'lucide-react';
import FloatInput from '@/components/ui/FloatInput';
import GoalStepCard from './GoalStepCard';
import type { GoalFormData } from './types';
import { n } from './types';

interface StepTargetWeightProps {
  form: GoalFormData;
  set: <K extends keyof GoalFormData>(key: K, val: GoalFormData[K]) => void;
  currentWeight: number | null;
  /** True when the current weight comes from a fitness test. */
  measured: boolean;
  step: number;
  error?: string;
}

export function StepTargetWeight({ form, set, currentWeight, measured, step, error }: StepTargetWeightProps) {
  const target = n(form.targetWeight);
  const gap = useMemo(() => (currentWeight != null && target != null ? Math.round((target - currentWeight) * 10) / 10 : null), [currentWeight, target]);

  return (
    <GoalStepCard icon={Scale} title="Target Weight" step={step} hint="leave blank if this goal isn't weight-driven">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* With no fitness test on file there was nothing to type here —
            the box was locked, so the rate, difficulty and duration all
            came out blank. The starting weight can be entered by hand;
            a fitness test's measured weight still takes over when there
            is one. */}
        {measured ? (
          <FloatInput label="Current Weight (from assessment)" value={currentWeight != null ? String(currentWeight) : ''} onChange={() => {}} disabled />
        ) : (
          <FloatInput label="Starting Weight (kg)" numeric="decimal" value={form.startingWeightManual} onChange={(v) => set('startingWeightManual', v)} />
        )}
        <FloatInput label="Target Weight (kg)" numeric="decimal" value={form.targetWeight} onChange={(v) => set('targetWeight', v)} />
      </div>

      {error && <p className="mt-3 text-[11px] font-medium" style={{ color: 'var(--danger-text)' }}>{error}</p>}

      {/* A fat-loss goal with a heavier target (or muscle gain with a
          lighter one) is almost always a typo in one of the two. */}
      {directionWarning(form.goalType, gap) && (
        <p className="mt-3 rounded-[12px] px-3.5 py-2.5 text-[12.5px] font-[600]" role="status"
          style={{ background: 'rgba(217,119,6,0.10)', color: 'var(--text-primary)', border: '1px solid rgba(217,119,6,0.35)' }}>
          {directionWarning(form.goalType, gap)}
        </p>
      )}

      {gap != null && (
        <div className="mt-6 rounded-[16px] p-5" style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e293b 100%)' }}>
          <div className="flex flex-wrap items-center justify-center gap-4 text-center">
            <div>
              <p className="text-[10px] text-white/40 font-[600] uppercase tracking-wider">Current</p>
              <p className="text-[20px] font-[800] text-white">{currentWeight} kg</p>
            </div>
            {gap < 0 ? <ArrowDown size={18} color="#0067E0" /> : gap > 0 ? <ArrowUp size={18} color="#0067E0" /> : null}
            <div>
              <p className="text-[10px] text-white/40 font-[600] uppercase tracking-wider">Target</p>
              <p className="text-[20px] font-[800] text-white">{target} kg</p>
            </div>
            <div className="rounded-full px-3 py-1.5" style={{ background: 'rgba(0,103,224,0.15)' }}>
              <p className="text-[13px] font-[800]" style={{ color: '#0067E0' }}>
                {gap === 0 ? 'Maintain' : `Need to ${gap < 0 ? 'Lose' : 'Gain'} ${Math.abs(gap)} kg`}
              </p>
            </div>
          </div>
        </div>
      )}
    </GoalStepCard>
  );
}

/** A target that runs the wrong way for the goal, as a sentence. */
export function directionWarning(goalType: string, gap: number | null): string | null {
  if (gap == null || gap === 0) return null;
  if (goalType === 'fat_loss' && gap > 0) return 'This is a fat-loss goal, but the target weight is above the current weight. Check both numbers.';
  if (goalType === 'muscle_gain' && gap < 0) return 'This is a muscle-gain goal, but the target weight is below the current weight. Check both numbers.';
  return null;
}

export default StepTargetWeight;
