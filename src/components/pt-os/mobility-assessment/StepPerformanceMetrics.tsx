'use client';

import { Gauge } from 'lucide-react';
import FloatInput from '@/components/ui/FloatInput';
import type { MobilityFormData } from './types';

interface StepPerformanceMetricsProps {
  form: MobilityFormData;
  set: <K extends keyof MobilityFormData>(key: K, val: MobilityFormData[K]) => void;
}

export function StepPerformanceMetrics({ form, set }: StepPerformanceMetricsProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: '#0f172a' }}>
          <Gauge size={20} color="#F59E0B" />
        </div>
        <div>
          <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-slate-900 leading-none">Performance Metrics</h2>
          <p className="text-[13px] text-slate-400 mt-1.5">Step 3 of 3 — optional power, speed &amp; balance tests. Resting heart rate and blood pressure already live in Fitness Testing, so they aren&apos;t re-asked here.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FloatInput label="Grip Strength (kg)" type="number" value={form.gripStrengthKg} onChange={(v) => set('gripStrengthKg', v)} />
        <FloatInput label="Vertical Jump (cm)" type="number" value={form.verticalJumpCm} onChange={(v) => set('verticalJumpCm', v)} />
        <FloatInput label="Sit & Reach (cm)" type="number" value={form.sitReachCm} onChange={(v) => set('sitReachCm', v)} />
        <FloatInput label="Balance Test (seconds)" type="number" value={form.balanceTestSeconds} onChange={(v) => set('balanceTestSeconds', v)} />
        <FloatInput label="Reaction Time (ms)" type="number" value={form.reactionTimeMs} onChange={(v) => set('reactionTimeMs', v)} />
      </div>

      <FloatInput label="Performance Notes" multiline autoGrow value={form.performanceNotes} onChange={(v) => set('performanceNotes', v)} />
    </div>
  );
}

export default StepPerformanceMetrics;
