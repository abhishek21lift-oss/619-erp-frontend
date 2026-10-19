'use client';

import { useMemo, useState } from 'react';
import { Move, AlertTriangle, ArrowLeft, FileText, RefreshCw, CheckCircle2, CircleDashed, MinusCircle } from 'lucide-react';
import { Button, FloatInput } from '@/components/ui';
import { deriveFlexibility, buildFlexibilityPayload, formTest, legacyBlobSummary } from '@/lib/flexibility-protocol';
import type { FlexibilityDerived, FlexibilityFormState, FlexibilityTestKey } from '@/lib/flexibility-protocol';
import type { Gender } from '@/lib/fitness-calculations';
import type { AssessmentFormData } from './types';
import { StepHeader } from './StepHeader';
import { gradient, stepTones } from './fitnessTheme';
import { FLEXIBILITY_PROTOCOLS, FLEXIBILITY_TEST_ORDER } from './flexibility/protocol-content';
import TestScreen from './flexibility/TestScreen';
import FlexibilitySummary, { type PreviousAssessment } from './flexibility/FlexibilitySummary';

const TONE = stepTones[7];

interface StepFlexibilityProps {
  form: AssessmentFormData;
  set: <K extends keyof AssessmentFormData>(key: K, val: AssessmentFormData[K]) => void;
  age: number | null;
  gender: Gender | null;
  clientName?: string;
  previous?: PreviousAssessment | null;
  onSaveDraft?: () => void;
  error?: string;
}

type View = 'overview' | 'summary' | { test: FlexibilityTestKey };

/**
 * Step 7 — the K11 four-test flexibility battery.
 *
 * Overview → one test per screen (protocol beside the fields) → summary. Every
 * interpretation shown is `deriveFlexibility` on the current form state, which
 * is the same function the server runs on save — the trainer's preview cannot
 * drift from the record.
 *
 * Rows still stored in the old `{test1,test2}` shape are shown read-only until
 * the trainer chooses to re-record, so an edit can never lose them.
 */
export function StepFlexibility({ form, set, age, gender, clientName, previous, onSaveDraft, error }: StepFlexibilityProps) {
  const flex = form.flexibility;
  const [view, setView] = useState<View>('overview');

  const patchFlex = (p: Partial<FlexibilityFormState>) => set('flexibility', { ...flex, ...p });

  const derived = useMemo<FlexibilityDerived>(
    () => deriveFlexibility(buildFlexibilityPayload(flex)),
    [flex],
  );

  const recordedCount = FLEXIBILITY_TEST_ORDER.filter((k) => formTest(flex, k).completed).length;
  const anyUnable = FLEXIBILITY_TEST_ORDER.some((k) => formTest(flex, k).unable);
  const mustOverride = FLEXIBILITY_TEST_ORDER.some((k) => { const t = formTest(flex, k); return !t.completed && !t.unable; });

  /* ── Legacy rows: read-only until re-recorded ─────────────────────────── */
  if (!flex.recording) {
    const blob = flex.legacy ?? {};
    const legacy = (['test1', 'test2'] as const)
      .map((k) => (blob[k] && typeof blob[k] === 'object' ? blob[k] as Record<string, unknown> : {}))
      .filter((t) => Object.keys(t).length > 0);
    return (
      <div>
        <StepHeader
          icon={Move}
          tone={TONE}
          title="Flexibility & Mobility"
          subtitle="Step 7 of 7 — recorded with the earlier two-test workflow."
        />
        <div className="rounded-[18px] p-5" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
          <p className="text-[11.5px] font-[700] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Recorded (read-only)</p>
          {legacy.length ? (
            <ul className="mt-3 space-y-2">
              {legacy.map((t, i) => (
                <li key={i} className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                  <strong>{String(t.testType ?? t.customTestType ?? 'Test')}</strong>
                  {' — '}
                  {[
                    t.left ? `L ${String(t.left)} cm` : '',
                    t.right ? `R ${String(t.right)} cm` : '',
                    t.rom ? `ROM ${String(t.rom)}°` : '',
                    t.score ? `score ${String(t.score)}/10` : '',
                  ].filter(Boolean).join(' · ') || 'no measurements'}
                  {t.limitationNotes ? <span className="block text-[11.5px]" style={{ color: 'var(--text-muted)' }}>{String(t.limitationNotes)}</span> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-[13px]" style={{ color: 'var(--text-muted)' }}>{legacyBlobSummary(blob)}</p>
          )}
          <p className="mt-4 text-[12px]" style={{ color: 'var(--text-muted)' }}>
            The four K11 tests need their own measurements, so this older result cannot be converted. It stays attached to the
            assessment unless you re-record with the current protocol.
          </p>
          <Button
            variant="outline" size="sm" className="mt-3"
            iconLeft={<RefreshCw size={13} />}
            onClick={() => { patchFlex({ recording: true }); setView('overview'); }}
          >
            Re-record with the current protocol
          </Button>
        </div>
        {error && <p className="mt-3 text-[11px] font-medium" style={{ color: 'var(--danger-text)' }}>{error}</p>}
      </div>
    );
  }

  const statusPill = recordedCount === 0
    ? { text: 'Not started', color: 'var(--text-muted)', bg: 'var(--bg-subtle)' }
    : recordedCount === 4
      ? { text: 'Completed', color: 'var(--success-text)', bg: 'var(--success-bg)' }
      : { text: 'In progress', color: 'var(--warning-text)', bg: 'var(--warning-bg)' };

  const overallText = derived.overall_status === 'all_tests_recorded'
    ? 'All tests recorded'
    : derived.overall_status === 'follow_up_recommended'
      ? 'Follow-up recommended'
      : derived.overall_status === 'completed_with_override'
        ? 'Completed with override'
        : 'Assessment incomplete';

  const valueLine = (key: FlexibilityTestKey): string => {
    switch (key) {
      case 'quadriceps': {
        const t = derived.tests.quadriceps;
        return t.unable_to_complete ? '' : (t.overall_interpretation ?? 'not recorded');
      }
      case 'hamstrings': {
        const t = derived.tests.hamstrings;
        return t.unable_to_complete ? '' : `L ${t.sides.left.hip_flexion_deg ?? '—'}° / R ${t.sides.right.hip_flexion_deg ?? '—'}°`;
      }
      case 'hip_flexors': {
        const t = derived.tests.hip_flexors;
        return t.unable_to_complete ? '' : `L ${t.sides_interpretation.left ?? '—'} / R ${t.sides_interpretation.right ?? '—'}`;
      }
      case 'sit_and_reach': {
        const t = derived.tests.sit_and_reach;
        return t.unable_to_complete ? '' : (t.score_inches == null ? 'not recorded' : `${t.score_inches} in`);
      }
    }
  };

  return (
    <div>
      <StepHeader
        icon={Move}
        tone={TONE}
        title="Flexibility & Mobility"
        subtitle="Step 7 of 7 — the K11 four-test battery: quadriceps, hamstrings, hip flexors and YMCA Sit and Reach."
      />

      {typeof view === 'object' ? (
        <TestScreen
          test={view.test}
          form={flex}
          patchFlex={patchFlex}
          derived={derived}
          age={age}
          gender={gender}
          onBack={() => setView('overview')}
          onSaveDraft={onSaveDraft}
        />
      ) : view === 'summary' ? (
        <div className="space-y-4">
          <Button variant="ghost" size="sm" iconLeft={<ArrowLeft size={13} />} onClick={() => setView('overview')}>All tests</Button>
          <FlexibilitySummary form={flex} derived={derived} previous={previous} />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12.5px] font-[700]" style={{ color: 'var(--text-primary)' }}>
              {clientName ? `${clientName} · ` : ''}{form.assessmentDate}
            </span>
            <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{recordedCount}/4 recorded</span>
            <span className="rounded-full px-2.5 py-0.5 text-[11px] font-[700]" style={{ background: statusPill.bg, color: statusPill.color }}>{statusPill.text}</span>
            <Button variant="ghost" size="sm" className="ml-auto" iconLeft={<FileText size={13} />} onClick={() => setView('summary')}>Summary</Button>
          </div>

          <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--bg-subtle)' }} role="progressbar" aria-valuenow={recordedCount} aria-valuemin={0} aria-valuemax={4} aria-label="Flexibility tests recorded">
            <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${(recordedCount / 4) * 100}%`, background: gradient(TONE, 90) }} />
          </div>

          <div className="space-y-2.5">
            {FLEXIBILITY_TEST_ORDER.map((key) => {
              const content = FLEXIBILITY_PROTOCOLS[key];
              const state = formTest(flex, key);
              const status = state.completed
                ? { text: 'Completed', color: 'var(--success-text)', Icon: CheckCircle2 }
                : state.unable
                  ? { text: 'Unable to complete', color: 'var(--warning-text)', Icon: MinusCircle }
                  : { text: 'Not recorded', color: 'var(--text-muted)', Icon: CircleDashed };
              const action = state.completed ? 'Edit result' : state.unable ? 'Edit result' : (derived.tests[key].completed ? 'Continue' : 'Start');
              return (
                <div key={key} className="flex flex-wrap items-start gap-3 rounded-[18px] p-4" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
                  <span className="mt-0.5" style={{ color: status.color }}><status.Icon size={16} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <p className="text-[13.5px] font-[750]" style={{ color: 'var(--text-primary)' }}>{content.name}</p>
                      <span className="text-[11px] font-[700]" style={{ color: status.color }}>{status.text}</span>
                    </div>
                    <p className="mt-0.5 text-[12px] leading-[1.45]" style={{ color: 'var(--text-secondary)' }}>{content.purpose}</p>
                    <p className="mt-0.5 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>{content.setup}</p>
                    <p className="mt-1 text-[11.5px] font-[640]" style={{ color: 'var(--text-muted)' }}>
                      {state.unable
                        ? `Not performed: ${state.unableReason.trim() || 'reason missing'}`
                        : state.completed || derived.tests[key].completed
                          ? valueLine(key)
                          : 'Not recorded yet'}
                      {derived.has_asymmetry && key === 'hamstrings' ? ' · asymmetry detected' : ''}
                    </p>
                  </div>
                  <Button variant={state.completed ? 'outline' : 'secondary'} size="sm" onClick={() => setView({ test: key })}>
                    {action}
                  </Button>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-[16px] p-4" style={{ background: derived.overall_status === 'follow_up_recommended' ? 'var(--warning-bg)' : 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
            {derived.overall_status === 'follow_up_recommended' && <AlertTriangle size={15} style={{ color: 'var(--warning-text)' }} />}
            <p className="text-[13px] font-[750]" style={{ color: derived.overall_status === 'follow_up_recommended' ? 'var(--warning-text)' : 'var(--text-secondary)' }}>
              {overallText}
            </p>
            <p className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
              {recordedCount}/4 recorded{anyUnable ? ` · ${FLEXIBILITY_TEST_ORDER.filter((k) => formTest(flex, k).unable).length} not performed` : ''}
            </p>
          </div>

          {(anyUnable || mustOverride) && (
            <div className="rounded-[16px] p-4" style={{ background: 'var(--warning-bg)', border: '1px solid var(--warning-border)' }}>
              <FloatInput
                label={anyUnable
                  ? 'Override reason (required — a test could not be performed)'
                  : 'Override reason (required when a test is left incomplete)'}
                value={flex.overrideReason}
                onChange={(v) => patchFlex({ overrideReason: v })}
                multiline
                autoGrow
                maxLength={500}
                placeholder="Why the assessment is being saved without every test"
              />
              <p className="mt-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                Stored as an override on the assessment, with your name and the time.
              </p>
            </div>
          )}

          {derived.has_asymmetry && (
            <div className="flex items-start gap-3 rounded-[16px] p-4" style={{ background: 'var(--warning-bg)', border: '1px solid var(--warning-border)' }}>
              <AlertTriangle size={16} style={{ color: 'var(--warning-text)', flexShrink: 0, marginTop: 1 }} />
              <p className="text-[12.5px] font-[640]" style={{ color: 'var(--text-secondary)' }}>
                Left/right asymmetry detected (angles &gt; 10%, contact, or thigh position). Consider a corrective mobility focus.
              </p>
            </div>
          )}
        </div>
      )}

      {error && <p className="mt-3 text-[11px] font-medium" style={{ color: 'var(--danger-text)' }}>{error}</p>}
    </div>
  );
}

export default StepFlexibility;
