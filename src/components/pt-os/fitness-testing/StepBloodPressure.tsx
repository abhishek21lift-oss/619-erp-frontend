'use client';

import { useMemo } from 'react';
import { HeartPulse, AlertTriangle } from 'lucide-react';
import { assessVitalsSafety, classifyBp, classifyRhr, classifySpo2 } from '@/lib/fitness-calculations';
import type { AssessmentFormData } from './types';
import { n } from './types';
import { StepCard } from './StepCard';
import { ReadingHero, ReadingInput, StatusChip, SupportInput, SupportItem } from './ReadingHero';
import { bpPill, chapterAccent, rhrPill, spo2Pill } from './fitnessTheme';

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
    <StepCard
      icon={HeartPulse}
      accent={chapterAccent[1]}
      title="Blood Pressure"
      description="Resting cardiovascular baseline"
      badge="Step 1 of 7"
    >
      <ReadingHero label="Blood pressure" accent={chapterAccent[1]}>
        <ReadingInput label="Systolic (mmHg)" value={form.bpSystolic} onChange={(v) => set('bpSystolic', v)} />
        <span className="text-[26px] font-[300]" style={{ color: 'var(--text-muted)' }}>/</span>
        <ReadingInput label="Diastolic (mmHg)" value={form.bpDiastolic} onChange={(v) => set('bpDiastolic', v)} />
        <span className="text-[12px] font-[600]" style={{ color: 'var(--text-muted)' }}>mmHg</span>
        {category && bpBadge && <StatusChip pill={bpBadge}>{category}</StatusChip>}
      </ReadingHero>

      <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2">
        <SupportItem label="Resting HR" accent={chapterAccent[1]} tag="bpm">
          <SupportInput
            label="Resting Heart Rate (bpm)"
            value={form.restingHeartRate}
            onChange={(v) => set('restingHeartRate', v)}
          />
          {rhrCategory && rhrBadge && <StatusChip pill={rhrBadge}>{rhrCategory}</StatusChip>}
        </SupportItem>
        <SupportItem label="SpO₂" accent={chapterAccent[1]} tag="%">
          <SupportInput
            label="Resting SpO₂ (%)"
            value={form.restingSpo2}
            onChange={(v) => set('restingSpo2', v)}
          />
          {spo2Category && spo2Badge && <StatusChip pill={spo2Badge}>{spo2Category}</StatusChip>}
        </SupportItem>
      </div>

      {/* No reading at all used to walk straight on into a step test and a
          1RM. Skipping it is allowed, but it is said out loud and noted on
          the record. */}
      {!form.bpSystolic && !form.bpDiastolic && (
        <button
          type="button" role="switch" aria-checked={form.bpNotMeasured} onClick={() => set('bpNotMeasured', !form.bpNotMeasured)}
          className="flex w-full items-start gap-3 rounded-[14px] px-4 py-3 text-left"
          style={{ background: form.bpNotMeasured ? 'rgba(217,119,6,0.08)' : 'var(--bg-subtle)', border: `1.5px solid ${form.bpNotMeasured ? '#d97706' : 'var(--border)'}` }}
        >
          <span
            className="relative mt-0.5 h-5 w-9 flex-shrink-0 rounded-full transition-colors"
            style={{ background: form.bpNotMeasured ? '#d97706' : 'var(--border-2)' }}
          >
            <span
              className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all"
              style={{ left: form.bpNotMeasured ? '18px' : '2px' }}
            />
          </span>
          <span className="text-[13px] font-[600] leading-snug" style={{ color: 'var(--text-primary)' }}>
            Blood pressure not measured today — I confirm the client is fit for cardio, strength and endurance testing.
          </span>
        </button>
      )}

      {error && <p className="text-[11px] font-medium" style={{ color: 'var(--danger-text)' }}>{error}</p>}

      {safety.level === 'stop' && (
        <div className="flex items-start gap-3 rounded-[16px] p-4" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
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
        <div className="flex items-start gap-3 rounded-[16px] p-4" style={{ background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.25)' }}>
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
        <p className="text-[12px] font-[600]" style={{ color: 'var(--text-secondary)' }}>
          Rest 5–10 minutes and recheck blood pressure before exertion testing; record the second reading.
        </p>
      )}

      {safety.athleteLowRhr && (
        <p className="text-[12px] font-[600]" style={{ color: 'var(--text-secondary)' }}>
          Low resting heart rate is common in trained athletes and is not flagged here. Confirm the client feels well.
        </p>
      )}

      {safety.reasons.length > 0 && (
        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
          These classifications describe a single resting reading. They are not a diagnosis; repeat abnormal readings and refer when indicated.
        </p>
      )}
    </StepCard>
  );
}

export default StepBloodPressure;
