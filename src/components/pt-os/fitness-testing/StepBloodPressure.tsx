'use client';

import { useMemo } from 'react';
import { HeartPulse, AlertTriangle, Check } from 'lucide-react';
import FloatInput from '@/components/ui/FloatInput';
import { classifyBp } from '@/lib/fitness-calculations';
import type { AssessmentFormData } from './types';
import { n } from './types';
import { StepHeader } from './StepHeader';
import { bpPill, stepTones } from './fitnessTheme';

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
  const badge = category ? bpPill(category) : null;

  return (
    <div>
      <StepHeader
        icon={HeartPulse}
        tone={stepTones[1]}
        title="Blood Pressure"
        subtitle="Step 1 of 7 — resting cardiovascular baseline."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FloatInput label="Systolic (mmHg)" numeric="integer" value={form.bpSystolic} onChange={(v) => set('bpSystolic', v)} />
        <FloatInput label="Diastolic (mmHg)" numeric="integer" value={form.bpDiastolic} onChange={(v) => set('bpDiastolic', v)} />
        <FloatInput label="Resting Heart Rate (bpm)" numeric="integer" value={form.restingHeartRate} onChange={(v) => set('restingHeartRate', v)} />
        <FloatInput label="Resting SpO₂ (%)" numeric="integer" value={form.restingSpo2} onChange={(v) => set('restingSpo2', v)} />
      </div>

      {/* No reading at all used to walk straight on into a step test and a
          1RM. Skipping it is allowed, but it is said out loud and noted on
          the record. */}
      {!form.bpSystolic && !form.bpDiastolic && (
        <button
          type="button" onClick={() => set('bpNotMeasured', !form.bpNotMeasured)} aria-pressed={form.bpNotMeasured}
          className="mt-4 flex w-full items-start gap-3 rounded-[14px] px-4 py-3 text-left"
          style={{ background: form.bpNotMeasured ? 'rgba(217,119,6,0.08)' : 'var(--bg-subtle)', border: `1.5px solid ${form.bpNotMeasured ? '#d97706' : 'var(--border)'}` }}
        >
          <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-[6px]"
            style={{ background: form.bpNotMeasured ? '#d97706' : 'var(--bg-card)', border: form.bpNotMeasured ? 'none' : '1.5px solid var(--border-2)' }}>
            {form.bpNotMeasured && <Check size={13} color="#fff" strokeWidth={3} />}
          </span>
          <span className="text-[13px] font-[600] leading-snug" style={{ color: 'var(--text-primary)' }}>
            Blood pressure not measured today — I confirm the client is fit for cardio, strength and endurance testing.
          </span>
        </button>
      )}

      {error && <p className="mt-3 text-[11px] font-medium" style={{ color: 'var(--danger-text)' }}>{error}</p>}

      {category && badge && (
        <div className="mt-6 flex items-center gap-2.5">
          <span className="text-[11px] font-[700] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Classification</span>
          <span className="rounded-full px-3 py-1 text-[12px] font-[700]" style={{ background: badge.bg, color: badge.color }}>
            {category}
          </span>
        </div>
      )}

      {isUnsafe && (
        <div className="mt-4 flex items-start gap-3 rounded-[16px] p-4" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
          <AlertTriangle size={18} style={{ color: 'var(--danger-text)', flexShrink: 0, marginTop: 1 }} />
          <p className="text-[13px] font-[640]" style={{ color: 'var(--danger-text)' }}>
            Exercise not recommended. Medical clearance required. Cardio, strength and endurance tests will be skipped — only measurements and flexibility are recorded today.
          </p>
        </div>
      )}
    </div>
  );
}

export default StepBloodPressure;
