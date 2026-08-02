'use client';

import { useMemo } from 'react';
import { HeartPulse, AlertTriangle } from 'lucide-react';
import FloatInput from '@/components/ui/FloatInput';
import { classifyBp } from '@/lib/fitness-calculations';
import type { AssessmentFormData } from './types';
import { n } from './types';

const BADGE_STYLE: Record<string, { bg: string; color: string }> = {
  Normal: { bg: 'rgba(16,185,129,0.12)', color: '#059669' },
  Elevated: { bg: 'rgba(245,158,11,0.12)', color: '#d97706' },
  'Hypertension Stage 1': { bg: 'rgba(245,158,11,0.14)', color: '#f59e0b' },
  'Hypertension Stage 2': { bg: 'rgba(239,68,68,0.14)', color: '#dc2626' },
  Hypotension: { bg: 'rgba(239,68,68,0.14)', color: '#dc2626' },
};

interface StepBloodPressureProps {
  form: AssessmentFormData;
  set: <K extends keyof AssessmentFormData>(key: K, val: AssessmentFormData[K]) => void;
  error?: string;
}

export function StepBloodPressure({ form, set, error }: StepBloodPressureProps) {
  const { category, isUnsafe } = useMemo(
    () => classifyBp(n(form.bpSystolic), n(form.bpDiastolic)),
    [form.bpSystolic, form.bpDiastolic],
  );
  const badge = category ? BADGE_STYLE[category] : null;

  return (
    <div>
      <div className="flex items-start gap-4 mb-7">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: '#0f172a' }}>
          <HeartPulse size={20} color="#1CA3F9" />
        </div>
        <div>
          <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-slate-900 leading-none">Blood Pressure</h2>
          <p className="text-[13px] text-slate-400 mt-1.5">Step 1 of 7 — resting cardiovascular baseline.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FloatInput label="Systolic (mmHg)" type="number" value={form.bpSystolic} onChange={(v) => set('bpSystolic', v)} />
        <FloatInput label="Diastolic (mmHg)" type="number" value={form.bpDiastolic} onChange={(v) => set('bpDiastolic', v)} />
        <FloatInput label="Resting Heart Rate (bpm)" type="number" value={form.restingHeartRate} onChange={(v) => set('restingHeartRate', v)} />
        <FloatInput label="Resting SpO₂ (%)" type="number" value={form.restingSpo2} onChange={(v) => set('restingSpo2', v)} />
      </div>

      {error && <p className="mt-3 text-[11px] font-medium" style={{ color: 'var(--danger)' }}>{error}</p>}

      {category && badge && (
        <div className="mt-6 flex items-center gap-2">
          <span className="text-[11px] font-[700] uppercase tracking-wider text-slate-400">Classification</span>
          <span className="rounded-full px-3 py-1 text-[12px] font-[700]" style={{ background: badge.bg, color: badge.color }}>
            {category}
          </span>
        </div>
      )}

      {isUnsafe && (
        <div className="mt-4 flex items-start gap-3 rounded-[16px] p-4" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
          <AlertTriangle size={18} style={{ color: '#dc2626', flexShrink: 0, marginTop: 1 }} />
          <p className="text-[13px] font-[640]" style={{ color: '#991b1b' }}>
            Exercise not recommended. Medical clearance required.
          </p>
        </div>
      )}
    </div>
  );
}

export default StepBloodPressure;
