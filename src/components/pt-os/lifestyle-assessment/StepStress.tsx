'use client';

import { Brain } from 'lucide-react';
import { Slider } from '@/components/ui';
import { calcStressScore } from '@/lib/lifestyle-calculations';
import type { LifestyleFormData } from './types';
import { n } from './types';

function stressEmoji(level: number): string {
  if (level <= 2) return '😌';
  if (level <= 4) return '🙂';
  if (level <= 6) return '😐';
  if (level <= 8) return '😟';
  return '😫';
}
function stressLabel(level: number): string {
  if (level <= 2) return 'Very Low';
  if (level <= 4) return 'Low';
  if (level <= 6) return 'Moderate';
  if (level <= 8) return 'High';
  return 'Very High';
}

interface StepStressProps {
  form: LifestyleFormData;
  set: <K extends keyof LifestyleFormData>(key: K, val: LifestyleFormData[K]) => void;
}

export function StepStress({ form, set }: StepStressProps) {
  const level = n(form.stressLevel) ?? 5;
  const score = calcStressScore(level);

  return (
    <div>
      <div className="flex items-start gap-4 mb-7">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: '#0f172a' }}>
          <Brain size={20} color="#1CA3F9" />
        </div>
        <div>
          <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-slate-900 leading-none">Stress Level</h2>
          <p className="text-[13px] text-slate-400 mt-1.5">Step 2 of 9 — how stressed does this client feel day to day?</p>
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <p className="text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>Stress Level</p>
        <span className="text-[26px]">{stressEmoji(level)}</span>
      </div>
      <Slider label="" ariaLabel="Stress Level" value={level} min={1} max={10} onChange={(v) => set('stressLevel', String(v))}
        scaleLabels={['😌 Very Low', '😐 Moderate', '😫 Very High']} />

      <div className="mt-6 flex items-center gap-3 rounded-[16px] p-4" style={{ background: 'var(--bg-subtle)' }}>
        <span className="rounded-full px-3 py-1 text-[12px] font-[700]" style={{ background: 'rgba(245,158,11,0.12)', color: '#d97706' }}>
          {stressLabel(level)}
        </span>
        {score != null && <span className="text-[12.5px] font-[600] text-slate-400">Stress score {score}</span>}
      </div>
    </div>
  );
}

export default StepStress;
