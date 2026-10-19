'use client';

import { useState } from 'react';
import { ArrowLeft, Check, RotateCcw, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui';
import { flexibilityTestIssues, formTest, FLEXIBILITY_FORM_KEY } from '@/lib/flexibility-protocol';
import type { FlexibilityDerived, FlexibilityFormState, FlexibilityTestKey } from '@/lib/flexibility-protocol';
import type { Gender } from '@/lib/fitness-calculations';
import { FLEXIBILITY_PROTOCOLS } from './protocol-content';
import QuadricepsFields from './QuadricepsFields';
import HamstringsFields from './HamstringsFields';
import HipFlexorsFields from './HipFlexorsFields';
import SitAndReachFields from './SitAndReachFields';

interface TestScreenProps {
  test: FlexibilityTestKey;
  form: FlexibilityFormState;
  patchFlex: (p: Partial<FlexibilityFormState>) => void;
  derived: FlexibilityDerived;
  age: number | null;
  gender: Gender | null;
  onBack: () => void;
  onSaveDraft?: () => void;
}

function Bullets({ title, items, ordered }: { title: string; items: string[]; ordered?: boolean }) {
  const Tag = ordered ? 'ol' : 'ul';
  return (
    <div>
      <p className="text-[10.5px] font-[750] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{title}</p>
      <Tag className={`mt-1.5 space-y-1 pl-4 text-[12px] leading-[1.5] ${ordered ? 'list-decimal' : 'list-disc'}`} style={{ color: 'var(--text-secondary)' }}>
        {items.map((i) => <li key={i}>{i}</li>)}
      </Tag>
    </div>
  );
}

/**
 * One test at a time: the protocol's instructions beside the fields, so the
 * procedure is not remembered from a briefing. Save Draft rides the wizard's
 * existing localStorage draft; completion is an explicit trainer decision
 * because only the trainer can see that the procedure was followed.
 */
export function TestScreen({ test, form, patchFlex, derived, age, gender, onBack, onSaveDraft }: TestScreenProps) {
  const content = FLEXIBILITY_PROTOCOLS[test];
  const state = formTest(form, test);
  const [issues, setIssues] = useState<string[]>([]);

  const mark = (p: Partial<FlexibilityFormState['quadriceps']>) => {
    // One union-typed setter: the protocol key picks the form slice.
    patchFlex({ [FLEXIBILITY_FORM_KEY[test]]: { ...form[FLEXIBILITY_FORM_KEY[test]], ...p } } as Partial<FlexibilityFormState>);
  };

  const complete = () => {
    const missing = flexibilityTestIssues(form, test);
    setIssues(missing);
    if (missing.length) return;
    mark({ completed: true, unable: false });
    onBack();
  };

  const recordUnable = () => {
    if (!state.unableReason.trim()) { setIssues(['Enter the reason this test could not be performed.']); return; }
    setIssues([]);
    mark({ unable: true, completed: false });
    onBack();
  };

  const fields = test === 'quadriceps' ? (
    <QuadricepsFields
      state={form.quadriceps}
      derived={derived.tests.quadriceps.unable_to_complete ? null : derived.tests.quadriceps}
      patch={(p) => patchFlex({ quadriceps: { ...form.quadriceps, ...p } })}
    />
  ) : test === 'hamstrings' ? (
    <HamstringsFields
      state={form.hamstrings}
      derived={derived.tests.hamstrings.unable_to_complete ? null : derived.tests.hamstrings}
      patch={(p) => patchFlex({ hamstrings: { ...form.hamstrings, ...p } })}
    />
  ) : test === 'hip_flexors' ? (
    <HipFlexorsFields
      state={form.hipFlexors}
      derived={derived.tests.hip_flexors.unable_to_complete ? null : derived.tests.hip_flexors}
      patch={(p) => patchFlex({ hipFlexors: { ...form.hipFlexors, ...p } })}
    />
  ) : (
    <SitAndReachFields
      state={form.sitAndReach}
      derived={derived.tests.sit_and_reach.unable_to_complete ? null : derived.tests.sit_and_reach}
      patch={(p) => patchFlex({ sitAndReach: { ...form.sitAndReach, ...p } })}
      age={age}
      gender={gender}
    />
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" iconLeft={<ArrowLeft size={13} />} onClick={onBack}>All tests</Button>
          <h3 className="text-[16px] font-[780] tracking-[-0.02em]" style={{ color: 'var(--text-primary)' }}>{content.name}</h3>
        </div>
        <span
          className="rounded-full px-2.5 py-0.5 text-[11px] font-[700]"
          style={state.completed
            ? { background: 'var(--success-bg)', color: 'var(--success-text)' }
            : state.unable
              ? { background: 'var(--warning-bg)', color: 'var(--warning-text)' }
              : { background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}
        >
          {state.completed ? 'Completed' : state.unable ? 'Unable to complete' : 'In progress'}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,330px)_1fr]">
        <aside className="space-y-4 rounded-[18px] p-4" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
          <div>
            <p className="text-[10.5px] font-[750] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Purpose</p>
            <p className="mt-1.5 text-[12.5px] leading-[1.5]" style={{ color: 'var(--text-secondary)' }}>{content.purpose}</p>
          </div>
          <Bullets title="Equipment" items={content.equipment} />
          <Bullets title="Positioning" items={content.positioning} />
          <Bullets title="Procedure" items={content.procedure} ordered />
          <Bullets title="Measurement" items={content.measurement} />
          {content.reference && (
            <div className="rounded-[12px] p-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <p className="text-[10.5px] font-[750] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Reference</p>
              <p className="mt-1 text-[12px] leading-[1.5]" style={{ color: 'var(--text-secondary)' }}>{content.reference}</p>
            </div>
          )}
          <Bullets title="Safety" items={content.safety} />
        </aside>

        <div className="space-y-4">
          {fields}

          {issues.length > 0 && (
            <div className="rounded-[14px] p-3" style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)' }} role="alert">
              <p className="text-[11px] font-[750] uppercase tracking-wider" style={{ color: 'var(--danger-text)' }}>Not ready to complete</p>
              <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                {issues.map((i) => <li key={i}>{i}</li>)}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 rounded-[16px] p-3" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
            {state.completed ? (
              <>
                <span className="rounded-full px-2.5 py-0.5 text-[11.5px] font-[700]" style={{ background: 'var(--success-bg)', color: 'var(--success-text)' }}>Marked complete</span>
                <Button variant="outline" size="sm" iconLeft={<RotateCcw size={13} />} onClick={() => mark({ completed: false })}>Retake</Button>
              </>
            ) : (
              <Button size="sm" iconLeft={<Check size={13} />} onClick={complete}>Mark Test Complete</Button>
            )}
            {onSaveDraft && <Button variant="ghost" size="sm" onClick={onSaveDraft}>Save Draft</Button>}

            <div className="ml-auto flex flex-1 flex-wrap items-center justify-end gap-2">
              <input
                aria-label="Reason this test could not be performed"
                className="min-w-[180px] flex-1 rounded-[10px] px-3 py-1.5 text-[12px]"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-2)', color: 'var(--text-primary)' }}
                placeholder="Reason if the client cannot perform this test"
                maxLength={500}
                value={state.unableReason}
                onChange={(e) => mark({ unableReason: e.target.value })}
              />
              <Button variant="outline" size="sm" iconLeft={<ShieldAlert size={13} />} onClick={recordUnable}>
                {state.unable ? 'Update reason' : 'Record as unable'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TestScreen;
