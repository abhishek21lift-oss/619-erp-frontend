'use client';

import { useMemo } from 'react';
import { Scale, ArrowDown, ArrowUp } from 'lucide-react';
import FloatInput from '@/components/ui/FloatInput';
import type { GoalFormData } from './types';
import { n } from './types';

interface StepTargetWeightProps {
  form: GoalFormData;
  set: <K extends keyof GoalFormData>(key: K, val: GoalFormData[K]) => void;
  currentWeight: number | null;
  error?: string;
}

export function StepTargetWeight({ form, set, currentWeight, error }: StepTargetWeightProps) {
  const target = n(form.targetWeight);
  const gap = useMemo(() => (currentWeight != null && target != null ? Math.round((target - currentWeight) * 10) / 10 : null), [currentWeight, target]);

  return (
    <div className="rounded-[24px] overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 4px 24px rgba(15,23,42,0.06)' }}>
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#0f172a,#334155)' }} />
      <div className="p-7 sm:p-10">
        <div className="flex items-start gap-4 mb-7">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: '#0f172a' }}>
            <Scale size={20} color="#F59E0B" />
          </div>
          <div>
            <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-slate-900 leading-none">Target Weight</h2>
            <p className="text-[13px] text-slate-400 mt-1.5">Step 2 of 8 — leave blank if this goal isn&apos;t weight-driven.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FloatInput label="Current Weight (from assessment)" value={currentWeight != null ? String(currentWeight) : ''} onChange={() => {}} disabled
            placeholder={currentWeight == null ? 'Add in Fitness Testing' : undefined} />
          <FloatInput label="Target Weight (kg)" type="number" value={form.targetWeight} onChange={(v) => set('targetWeight', v)} />
        </div>

        {error && <p className="mt-3 text-[11px] font-medium" style={{ color: 'var(--danger)' }}>{error}</p>}

        {gap != null && (
          <div className="mt-6 rounded-[16px] p-5" style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e293b 100%)' }}>
            <div className="flex flex-wrap items-center justify-center gap-4 text-center">
              <div>
                <p className="text-[10px] text-white/40 font-[600] uppercase tracking-wider">Current</p>
                <p className="text-[20px] font-[800] text-white">{currentWeight} kg</p>
              </div>
              {gap < 0 ? <ArrowDown size={18} color="#F59E0B" /> : gap > 0 ? <ArrowUp size={18} color="#F59E0B" /> : null}
              <div>
                <p className="text-[10px] text-white/40 font-[600] uppercase tracking-wider">Target</p>
                <p className="text-[20px] font-[800] text-white">{target} kg</p>
              </div>
              <div className="rounded-full px-3 py-1.5" style={{ background: 'rgba(245,158,11,0.15)' }}>
                <p className="text-[13px] font-[800]" style={{ color: '#F59E0B' }}>
                  {gap === 0 ? 'Maintain' : `Need to ${gap < 0 ? 'Lose' : 'Gain'} ${Math.abs(gap)} kg`}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default StepTargetWeight;
