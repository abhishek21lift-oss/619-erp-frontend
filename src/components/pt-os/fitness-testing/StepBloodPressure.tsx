'use client';

import { useMemo } from 'react';
import { HeartPulse, AlertTriangle, Check } from 'lucide-react';
import FloatInput from '@/components/ui/FloatInput';
import { assessVitalsSafety, classifyBp, classifyRhr, classifySpo2 } from '@/lib/fitness-calculations';
import type { AssessmentFormData } from './types';
import { n } from './types';
import { StepHeader } from './StepHeader';
import { bpPill, rhrPill, spo2Pill, stepTones } from './fitnessTheme';

interface StepBloodPressureProps {
  form: AssessmentFormData;
  set: <K extends keyof AssessmentFormData>(key: K, val: AssessmentFormData[K]) => void;
  error?: string;
  /** Recorded training level is "athlete". Context for a low resting rate. */
  athlete?: boolean;
}

export function StepBloodPressure({ form, set, error, athlete = false }: StepBloodPressureProps) {
  const { category, rhrCategory, spo2Category, safety } = useMemo(() => {
    const systolic = n(form.bpSystolic);
    const diastolic = n(form.bpDiastolic);
    const restingHeartRate = n(form.restingHeartRate);
    const restingSpo2 = n(form.restingSpo2);
    return {
      category: classifyBp(systolic, diastolic),
      rhrCategory: classifyRhr(restingHeartRate),
      spo2Category: classifySpo2(restingSpo2),
      safety: assessVitalsSafety({ systolic, diastolic, restingHeartRate, restingSpo2, athlete }),
    };
  }, [form.bpSystolic, form.bpDiastolic, form.restingHeartRate, form.restingSpo2, athlete]);
  const bpBadge = category ? bpPill(category) : null;
  const rhrBadge = rhrCategory ? rhrPill(rhrCategory) : null;
  const spo2Badge = spo2Category ? spo2Pill(spo2Category) : null;

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

      {(category || rhrCategory || spo2Category) && (
        <div className="mt-6">
          <span className="text-[11px] font-[700] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Classification</span>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {category && bpBadge && (
              <span className="rounded-full px-3 py-1 text-[12px] font-[700]" style={{ background: bpBadge.bg, color: bpBadge.color }}>
                BP · {category}
              </span>
            )}
            {rhrCategory && rhrBadge && (
              <span className="rounded-full px-3 py-1 text-[12px] font-[700]" style={{ background: rhrBadge.bg, color: rhrBadge.color }}>
                HR · {rhrCategory}
              </span>
            )}
            {spo2Category && spo2Badge && (
              <span className="rounded-full px-3 py-1 text-[12px] font-[700]" style={{ background: spo2Badge.bg, color: spo2Badge.color }}>
                SpO₂ · {spo2Category}
              </span>
            )}
          </div>
        </div>
      )}

      {safety.level === 'stop' && (
        <div className="mt-4 flex items-start gap-3 rounded-[16px] p-4" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
          <AlertTriangle size={18} style={{ color: 'var(--danger-text)', flexShrink: 0, marginTop: 1 }} />
          <div>
            <p className="text-[13px] font-[640]" style={{ color: 'var(--danger-text)' }}>
              Exercise not recommended. Medical clearance required. Cardio, strength and endurance tests will be skipped — only measurements and flexibility are recorded today.
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-[12px]" style={{ color: 'var(--danger-text)' }}>
              {safety.reasons.map((r) => <li key={r}>{r}</li>)}
            </ul>
          </div>
        </div>
      )}

      {safety.level === 'caution' && (
        <div className="mt-4 flex items-start gap-3 rounded-[16px] p-4" style={{ background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.25)' }}>
          <AlertTriangle size={18} style={{ color: '#b45309', flexShrink: 0, marginTop: 1 }} />
          <div>
            <p className="text-[13px] font-[640]" style={{ color: '#92400e' }}>
              Exercise may proceed with caution — reassess before the exertion tests.
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-[12px]" style={{ color: '#92400e' }}>
              {safety.reasons.map((r) => <li key={r}>{r}</li>)}
            </ul>
          </div>
        </div>
      )}

      {safety.repeatBp && (
        <p className="mt-3 text-[12px] font-[600]" style={{ color: 'var(--text-secondary)' }}>
          Rest 5–10 minutes and recheck blood pressure before exertion testing; record the second reading.
        </p>
      )}

      {safety.athleteLowRhr && (
        <p className="mt-3 text-[12px] font-[600]" style={{ color: 'var(--text-secondary)' }}>
          Low resting heart rate is common in trained athletes and is not flagged here. Confirm the client feels well.
        </p>
      )}

      {safety.reasons.length > 0 && (
        <p className="mt-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>
          These classifications describe a single resting reading. They are not a diagnosis; repeat abnormal readings and refer when indicated.
        </p>
      )}
    </div>
  );
}

export default StepBloodPressure;
