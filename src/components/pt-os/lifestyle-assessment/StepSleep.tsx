'use client';

import { useMemo } from 'react';
import { Moon } from 'lucide-react';
import { Slider } from '@/components/ui';
import FloatInput from '@/components/ui/FloatInput';
import { classifySleep } from '@/lib/lifestyle-calculations';
import type { LifestyleFormData } from './types';
import { n } from './types';

const CATEGORY_STYLE: Record<string, { bg: string; color: string }> = {
  Excellent: { bg: 'rgba(16,185,129,0.12)', color: '#059669' },
  Good: { bg: 'rgba(245,158,11,0.12)', color: '#d97706' },
  Fair: { bg: 'rgba(245,158,11,0.14)', color: '#f59e0b' },
  Poor: { bg: 'rgba(239,68,68,0.14)', color: '#dc2626' },
};

interface StepSleepProps {
  form: LifestyleFormData;
  set: <K extends keyof LifestyleFormData>(key: K, val: LifestyleFormData[K]) => void;
  error?: string;
}

export function StepSleep({ form, set, error }: StepSleepProps) {
  const duration = n(form.sleepDurationHours) ?? 7;
  const quality = n(form.sleepQuality);
  const { category, score } = useMemo(() => classifySleep(duration, quality), [duration, quality]);
  const badge = category ? CATEGORY_STYLE[category] : null;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: '#0f172a' }}>
          <Moon size={20} color="#1CA3F9" />
        </div>
        <div>
          <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-slate-900 leading-none">Sleep Assessment</h2>
          <p className="text-[13px] text-slate-400 mt-1.5">Step 1 of 9 — daily habits &amp; recovery.</p>
        </div>
      </div>

      <Slider
        label="Sleep Duration" value={duration} min={3} max={12} step={0.5}
        onChange={(v) => set('sleepDurationHours', String(v))}
        formatValue={(v) => `${v}h`}
        scaleLabels={['3h', '12h']}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FloatInput label="Bed Time" type="time" value={form.bedTime} onChange={(v) => set('bedTime', v)} />
        <FloatInput label="Wake-up Time" type="time" value={form.wakeTime} onChange={(v) => set('wakeTime', v)} />
      </div>

      <Slider
        label="Sleep Quality" value={quality ?? 5} min={1} max={10}
        onChange={(v) => set('sleepQuality', String(v))}
        scaleLabels={['1 · Poor', '5 · Okay', '10 · Excellent']}
      />

      {error && <p className="text-[11px] font-medium" style={{ color: 'var(--danger-text)' }}>{error}</p>}

      {category && badge && (
        <div className="flex items-center gap-3 rounded-[16px] p-4" style={{ background: 'var(--bg-subtle)' }}>
          <span className="rounded-full px-3 py-1 text-[12px] font-[700]" style={{ background: badge.bg, color: badge.color }}>
            {category}
          </span>
          {score != null && <span className="text-[12.5px] font-[600] text-slate-400">Sleep score {score}</span>}
        </div>
      )}
    </div>
  );
}

export default StepSleep;
