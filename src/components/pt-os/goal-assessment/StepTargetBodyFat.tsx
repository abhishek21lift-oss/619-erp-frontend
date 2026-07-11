'use client';

import { useMemo } from 'react';
import { Percent, ArrowDown, ArrowUp } from 'lucide-react';
import { Slider } from '@/components/ui';
import FloatInput from '@/components/ui/FloatInput';
import type { GoalFormData } from './types';
import { n } from './types';

interface StepTargetBodyFatProps {
  form: GoalFormData;
  set: <K extends keyof GoalFormData>(key: K, val: GoalFormData[K]) => void;
  currentBodyFat: number | null;
}

export function StepTargetBodyFat({ form, set, currentBodyFat }: StepTargetBodyFatProps) {
  const target = n(form.targetBodyFat);
  const gap = useMemo(() => (currentBodyFat != null && target != null ? Math.round((target - currentBodyFat) * 10) / 10 : null), [currentBodyFat, target]);

  return (
    <div className="rounded-[24px] overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 4px 24px rgba(15,23,42,0.06)' }}>
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#0f172a,#334155)' }} />
      <div className="p-7 sm:p-10">
        <div className="flex items-start gap-4 mb-7">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: '#0f172a' }}>
            <Percent size={20} color="#F59E0B" />
          </div>
          <div>
            <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-slate-900 leading-none">Target Body Fat %</h2>
            <p className="text-[13px] text-slate-400 mt-1.5">Step 3 of 8 — optional, leave blank if not applicable.</p>
          </div>
        </div>

        <Slider
          label="Target Body Fat" value={target ?? 20} min={5} max={45} step={0.5}
          onChange={(v) => set('targetBodyFat', String(v))}
          formatValue={(v) => `${v}%`}
          scaleLabels={['5%', '45%']}
        />
        <div className="mt-4 max-w-[220px]">
          <FloatInput label="Or enter exactly (%)" type="number" value={form.targetBodyFat} onChange={(v) => set('targetBodyFat', v)} />
        </div>

        {gap != null && (
          <div className="mt-6 rounded-[16px] p-5" style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e293b 100%)' }}>
            <div className="flex flex-wrap items-center justify-center gap-4 text-center">
              <div>
                <p className="text-[10px] text-white/40 font-[600] uppercase tracking-wider">Current BF%</p>
                <p className="text-[20px] font-[800] text-white">{currentBodyFat}%</p>
              </div>
              {gap < 0 ? <ArrowDown size={18} color="#F59E0B" /> : gap > 0 ? <ArrowUp size={18} color="#F59E0B" /> : null}
              <div>
                <p className="text-[10px] text-white/40 font-[600] uppercase tracking-wider">Target BF%</p>
                <p className="text-[20px] font-[800] text-white">{target}%</p>
              </div>
              <div className="rounded-full px-3 py-1.5" style={{ background: 'rgba(245,158,11,0.15)' }}>
                <p className="text-[13px] font-[800]" style={{ color: '#F59E0B' }}>
                  {gap === 0 ? 'Maintain' : `Required Reduction: ${Math.abs(gap)}%`}
                </p>
              </div>
            </div>
          </div>
        )}
        {currentBodyFat == null && (
          <p className="mt-4 text-[11px] text-slate-400">No body-fat reading on file yet — this comparison will appear once one is recorded.</p>
        )}
      </div>
    </div>
  );
}

export default StepTargetBodyFat;
