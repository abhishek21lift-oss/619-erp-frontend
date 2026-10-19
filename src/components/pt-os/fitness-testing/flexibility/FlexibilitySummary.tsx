'use client';

import { AlertTriangle, CheckCircle2, CircleDashed, MinusCircle } from 'lucide-react';
import { deriveFlexibility, formTest, isRecordedBattery, legacyBlobSummary, SIT_AND_REACH_ZERO_POINT_INCHES } from '@/lib/flexibility-protocol';
import type { FlexibilityDerived, FlexibilityFormState, FlexibilityTestKey, FlexibilityTestState } from '@/lib/flexibility-protocol';
import { FLEXIBILITY_PROTOCOLS, FLEXIBILITY_TEST_ORDER } from './protocol-content';

export interface PreviousAssessment {
  date: string;
  /** The previous row's raw flexibility blob. */
  data: unknown;
}

interface SummaryProps {
  form: FlexibilityFormState;
  derived: FlexibilityDerived;
  previous?: PreviousAssessment | null;
}

const OVERALL_TEXT: Record<FlexibilityDerived['overall_status'], string> = {
  all_tests_recorded: 'All tests recorded',
  follow_up_recommended: 'Follow-up recommended',
  completed_with_override: 'Completed with override',
  incomplete: 'Assessment incomplete',
};

/** One line describing a previous assessment's flexibility data, v3 or legacy. */
function previousLine({ date, data }: PreviousAssessment): string {
  if (!isRecordedBattery(data)) return `${date} · ${legacyBlobSummary(data as Record<string, unknown>)}`;
  const d = deriveFlexibility(data);
  const q = d.tests.quadriceps;
  const h = d.tests.hamstrings;
  const x = d.tests.hip_flexors;
  const sr = d.tests.sit_and_reach;
  const parts = [
    q.unable_to_complete ? 'Quadriceps: not performed' : `Quadriceps: ${q.overall_interpretation ?? 'not recorded'}`,
    h.unable_to_complete ? 'Hamstrings: not performed' : `Hamstrings L ${h.sides.left.hip_flexion_deg ?? '—'}° / R ${h.sides.right.hip_flexion_deg ?? '—'}°`,
    x.unable_to_complete ? 'Hip flexors: not performed' : `Hip flexors: ${x.sides_interpretation.left ?? '—'} / ${x.sides_interpretation.right ?? '—'}`,
    sr.unable_to_complete ? 'Sit and Reach: not performed' : (sr.score_inches == null ? 'Sit and Reach: not recorded' : `Sit and Reach ${sr.score_inches} in`),
    OVERALL_TEXT[d.overall_status],
  ];
  return `${date} · ${parts.join(' · ')}`;
}

function testStatus(state: FlexibilityTestState, derived: FlexibilityDerived['tests'][FlexibilityTestKey]) {
  if (state.completed) return { text: 'Completed', color: 'var(--success-text)', bg: 'var(--success-bg)', Icon: CheckCircle2 };
  if (state.unable) return { text: 'Unable to complete', color: 'var(--warning-text)', bg: 'var(--warning-bg)', Icon: MinusCircle };
  if (derived.completed) return { text: 'Recorded', color: 'var(--success-text)', bg: 'var(--success-bg)', Icon: CheckCircle2 };
  return { text: 'Not recorded', color: 'var(--text-muted)', bg: 'var(--bg-subtle)', Icon: CircleDashed };
}

export function FlexibilitySummary({ form, derived, previous }: SummaryProps) {
  const followUp = derived.overall_status === 'follow_up_recommended';
  const q = derived.tests.quadriceps;
  const h = derived.tests.hamstrings;
  const x = derived.tests.hip_flexors;
  const sr = derived.tests.sit_and_reach;
  const tri = (v: boolean | null) => (v == null ? '—' : v ? 'Y' : 'N');
  const values: Record<FlexibilityTestKey, string> = {
    quadriceps: q.unable_to_complete
      ? 'Not performed'
      : [`Contact ${tri(q.sides.left.contact)}/${tri(q.sides.right.contact)}`, q.overall_interpretation ?? 'not recorded'].join(' · '),
    hamstrings: h.unable_to_complete
      ? 'Not performed'
      : [
        `L ${h.sides.left.hip_flexion_deg ?? '—'}° (${h.sides_interpretation.left ?? '—'})`,
        `R ${h.sides.right.hip_flexion_deg ?? '—'}° (${h.sides_interpretation.right ?? '—'})`,
      ].join(' · '),
    hip_flexors: x.unable_to_complete
      ? 'Not performed'
      : [
        `${x.sides_interpretation.left ?? '—'} (L)`,
        `${x.sides_interpretation.right ?? '—'} (R)`,
      ].join(' · '),
    sit_and_reach: sr.unable_to_complete
      ? 'Not performed'
      : sr.score_inches == null
        ? 'No valid attempt recorded'
        : `${sr.best_raw_inches} in − ${SIT_AND_REACH_ZERO_POINT_INCHES} = ${sr.score_inches.toFixed(1)} in · ${sr.norm.message}`,
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-[18px] p-4" style={{ background: followUp ? 'var(--warning-bg)' : 'var(--success-bg)', border: `1px solid ${followUp ? 'var(--warning-border)' : 'var(--success-border)'}` }}>
        <span className="flex items-center gap-2 text-[13.5px] font-[750]" style={{ color: followUp ? 'var(--warning-text)' : 'var(--success-text)' }}>
          {followUp ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
          {OVERALL_TEXT[derived.overall_status]}
        </span>
        <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
          {FLEXIBILITY_TEST_ORDER.filter((k) => formTest(form, k).completed).length}/4 recorded
          {derived.has_asymmetry ? ' · asymmetry detected' : ''}
        </span>
      </div>

      <div className="space-y-2">
        {FLEXIBILITY_TEST_ORDER.map((key) => {
          const state = formTest(form, key);
          const status = testStatus(state, derived.tests[key]);
          return (
            <div key={key} className="flex flex-wrap items-start gap-3 rounded-[14px] px-4 py-3" style={{ background: 'var(--bg-subtle)' }}>
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center" style={{ color: status.color }}>
                <status.Icon size={15} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-2">
                  <p className="text-[12.5px] font-[750]" style={{ color: 'var(--text-primary)' }}>{FLEXIBILITY_PROTOCOLS[key].name}</p>
                  <span className="rounded-full px-2 py-0.5 text-[10.5px] font-[700]" style={{ background: status.bg, color: status.color }}>{status.text}</span>
                </div>
                <p className="mt-0.5 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>{values[key]}</p>
                {state.unable && state.unableReason.trim() && (
                  <p className="mt-0.5 text-[11.5px]" style={{ color: 'var(--warning-text)' }}>Not performed: {state.unableReason.trim()}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {derived.override_used && (
        <p className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
          <strong>Override:</strong> {form.overrideReason.trim() || 'no reason recorded yet'} — the assessment is saved as completed with an override.
        </p>
      )}

      {previous && (
        <p className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
          Previous assessment · {previousLine(previous)}
        </p>
      )}
    </div>
  );
}

export default FlexibilitySummary;
