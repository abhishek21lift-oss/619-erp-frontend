'use client';

import { HIP_TIGHTNESS, THIGH_POSITIONS } from '@/lib/flexibility-protocol';
import type { AbleHipFlexors, FlexibilityFormState, Side, ThighPosition } from '@/lib/flexibility-protocol';
import { EnumSelect, Insight, InsightUnavailable, Measurement, NotesField, YesNoChips } from './fields';

type SideKey = keyof Side<unknown>;

const POSITION_LABEL: Record<ThighPosition, string> = {
  below: 'Below the table line',
  at: 'Level with the line',
  above: 'Above the table line',
};

interface Props {
  state: FlexibilityFormState['hipFlexors'];
  /** null when the test is marked unable — nothing is derived then. */
  derived: AbleHipFlexors | null;
  patch: (p: Partial<FlexibilityFormState['hipFlexors']>) => void;
}

/** Thomas test: where the relaxed thigh sits, and whether the pelvis had to move. */
export function HipFlexorsFields({ state: x, derived, patch }: Props) {
  const setPosition = (side: SideKey, v: ThighPosition | '') => patch({ thighPosition: { ...x.thighPosition, [side]: v } });
  const setKneeFlexion = (side: SideKey, v: string) => patch({ kneeFlexionDeg: { ...x.kneeFlexionDeg, [side]: v } });
  const setPain = (side: SideKey, v: boolean | null) => patch({ pain: { ...x.pain, [side]: v } });
  const setPelvic = (side: SideKey, v: boolean | null) => patch({ pelvic: { ...x.pelvic, [side]: v } });
  const setTightness = (side: SideKey, v: (typeof HIP_TIGHTNESS)[number]) => patch({ tightness: { ...x.tightness, [side]: v } });

  const measuredSide = (side: 'left' | 'right') => x.thighPosition[side] !== '' && x.pelvic[side] != null;
  const flagged = !!derived && (['left', 'right'] as const).some((s) => measuredSide(s) && derived.sides_interpretation[s] === 'Possible hip flexor restriction');

  const rows = (['left', 'right'] as const).map((side) => {
    const measured = measuredSide(side);
    const position = x.thighPosition[side];
    return {
      side: side === 'left' ? 'Left' : 'Right',
      verdict: measured && derived ? (derived.sides_interpretation[side] ?? 'Awaiting measurement') : 'Awaiting measurement',
      detail: measured
        ? [position ? POSITION_LABEL[position] : '', x.pelvic[side] === true ? 'pelvis moved' : 'pelvis controlled'].filter(Boolean).join(' · ')
        : 'Record the thigh position and the pelvis answer.',
    };
  });

  return (
    <div className="space-y-4">
      {(['left', 'right'] as const).map((side) => (
        <div key={side} className="rounded-[16px] p-4" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
          <p className="mb-3 text-[11px] font-[700] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            {side === 'left' ? 'Left leg' : 'Right leg'}
          </p>
          <div className="space-y-3">
            <EnumSelect
              label={`Thigh position (${side})`}
              value={x.thighPosition[side]}
              options={['', ...THIGH_POSITIONS] as const}
              optionLabel={(v) => (v === '' ? 'Not recorded' : POSITION_LABEL[v])}
              onChange={(v) => setPosition(side, v)}
              description="Against the horizontal line of the table, with the leg fully relaxed."
            />
            <Measurement
              label={`Knee flexion (${side})`}
              value={x.kneeFlexionDeg[side]}
              onChange={(v) => setKneeFlexion(side, v)}
              suffix="°"
              min={0}
              max={160}
              hint="Only when the thigh sits above the line; leave blank otherwise."
            />
            <YesNoChips label="Pelvic compensation" value={x.pelvic[side]} onChange={(v) => setPelvic(side, v)} compact
              hint="Lumbar flattening or a pelvic tilt that lets the leg drop." />
            <YesNoChips label="Pain reported" value={x.pain[side]} onChange={(v) => setPain(side, v)} compact />
            <EnumSelect
              label="Tightness observed"
              value={x.tightness[side]}
              options={HIP_TIGHTNESS}
              onChange={(v) => setTightness(side, v)}
              description="Your own observation — the wording below stays possible, never a diagnosis."
            />
          </div>
        </div>
      ))}

      <Insight label="Live interpretation" tone={flagged ? 'watch' : 'ok'} rows={rows}>
        Clear needs the thigh below the table line AND the pelvis controlled. Thigh position alone never diagnoses.
      </Insight>

      <NotesField value={x.notes} onChange={(v) => patch({ notes: v })} />
    </div>
  );
}

export default HipFlexorsFields;
