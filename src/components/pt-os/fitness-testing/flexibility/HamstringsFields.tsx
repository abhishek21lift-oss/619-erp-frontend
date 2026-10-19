'use client';

import { HAMSTRINGS_REFERENCE, TIGHTNESS } from '@/lib/flexibility-protocol';
import type { AbleHamstrings, FlexibilityFormState, Side } from '@/lib/flexibility-protocol';
import { EnumSelect, Insight, InsightUnavailable, Measurement, NotesField, YesNoChips } from './fields';

type SideKey = keyof Side<unknown>;

interface Props {
  state: FlexibilityFormState['hamstrings'];
  /** null when the test is marked unable — nothing is derived then. */
  derived: AbleHamstrings | null;
  patch: (p: Partial<FlexibilityFormState['hamstrings']>) => void;
}

/** Hamstrings: hip flexion angle with the knee straight, against the 70–80° reference. */
export function HamstringsFields({ state: h, derived, patch }: Props) {
  const setAngle = (side: SideKey, v: string) => patch({ angleDeg: { ...h.angleDeg, [side]: v } });
  const setKnee = (side: SideKey, v: boolean | null) => patch({ kneeExtended: { ...h.kneeExtended, [side]: v } });
  const setPain = (side: SideKey, v: boolean | null) => patch({ pain: { ...h.pain, [side]: v } });
  const setPelvic = (side: SideKey, v: boolean | null) => patch({ pelvic: { ...h.pelvic, [side]: v } });
  const setTightness = (side: SideKey, v: (typeof TIGHTNESS)[number]) => patch({ tightness: { ...h.tightness, [side]: v } });

  const measuredSide = (side: 'left' | 'right') =>
    h.angleDeg[side].trim() !== '' && h.kneeExtended[side] != null && h.pelvic[side] != null;
  const flagged = !!derived && (['left', 'right'] as const).some((s) => measuredSide(s)
    && (derived.sides_interpretation[s] === 'Below reference range' || derived.sides_validity[s] === 'invalid_repeat'));

  const rows = (['left', 'right'] as const).map((side) => {
    const measured = measuredSide(side);
    return {
      side: side === 'left' ? 'Left' : 'Right',
      verdict: measured && derived ? (derived.sides_interpretation[side] ?? 'Awaiting measurement') : 'Awaiting measurement',
      detail: measured && derived
        ? [`${derived.sides[side].hip_flexion_deg ?? '—'}°`, derived.sides_validity[side] === 'valid' ? 'valid' : 'repeat (knee or pelvis)'].join(' · ')
        : 'Enter the angle, the knee and the pelvis answers.',
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
            <Measurement
              label={`Hip flexion angle (${side})`}
              value={h.angleDeg[side]}
              onChange={(v) => setAngle(side, v)}
              suffix="°"
              min={0}
              max={180}
              hint={`Reference ${HAMSTRINGS_REFERENCE.min_deg}–${HAMSTRINGS_REFERENCE.max_deg}° from the supplied K11 protocol.`}
            />
            <YesNoChips label="Knee stayed fully extended" value={h.kneeExtended[side]} onChange={(v) => setKnee(side, v)} compact
              hint="A bent knee invalidates the angle — repeat the test." />
            <YesNoChips label="Pelvic compensation" value={h.pelvic[side]} onChange={(v) => setPelvic(side, v)} compact
              hint="Lift or tilt of the pelvis or the opposite leg — repeat the test." />
            <YesNoChips label="Pain reported" value={h.pain[side]} onChange={(v) => setPain(side, v)} compact />
            <EnumSelect
              label="Tightness observed"
              value={h.tightness[side]}
              options={TIGHTNESS}
              onChange={(v) => setTightness(side, v)}
              description="Your own observation — the band below comes from the angle."
            />
          </div>
        </div>
      ))}

      {derived ? (
        <Insight label="Live interpretation" tone={flagged ? 'watch' : 'ok'} rows={rows}>
          Reference {derived.reference.min_deg}–{derived.reference.max_deg}° · {derived.reference.note}.
          A repeat is prompted when the knee bent or the pelvis moved.
        </Insight>
      ) : (
        <InsightUnavailable />
      )}

      <NotesField value={h.notes} onChange={(v) => patch({ notes: v })} />
    </div>
  );
}

export default HamstringsFields;
