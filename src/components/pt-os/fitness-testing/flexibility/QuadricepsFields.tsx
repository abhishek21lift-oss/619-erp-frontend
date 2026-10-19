'use client';

import { TIGHTNESS } from '@/lib/flexibility-protocol';
import type { AbleQuadriceps, FlexibilityFormState, Side } from '@/lib/flexibility-protocol';
import { EnumSelect, Insight, InsightUnavailable, Measurement, NotesField, YesNoChips } from './fields';

type SideKey = keyof Side<unknown>;

interface Props {
  state: FlexibilityFormState['quadriceps'];
  /** null when the test is marked unable — nothing is derived then. */
  derived: AbleQuadriceps | null;
  patch: (p: Partial<FlexibilityFormState['quadriceps']>) => void;
}

/** Quadriceps / prone knee bend: heel-to-buttock contact with the pelvis held. */
export function QuadricepsFields({ state: q, derived, patch }: Props) {
  const setContact = (side: SideKey, v: boolean | null) => patch({ contact: { ...q.contact, [side]: v } });
  const setDistance = (side: SideKey, v: string) => patch({ distanceCm: { ...q.distanceCm, [side]: v } });
  const setPain = (side: SideKey, v: boolean | null) => patch({ pain: { ...q.pain, [side]: v } });
  const setPelvic = (side: SideKey, v: boolean | null) => patch({ pelvic: { ...q.pelvic, [side]: v } });
  const setTightness = (side: SideKey, v: (typeof TIGHTNESS)[number]) => patch({ tightness: { ...q.tightness, [side]: v } });

  const tight = !!derived && (derived.sides_interpretation.left === 'Possible tightness' || derived.sides_interpretation.right === 'Possible tightness');
  const answered = !!derived && (derived.sides_interpretation.left != null || derived.sides_interpretation.right != null);

  return (
    <div className="space-y-4">
      {(['left', 'right'] as const).map((side) => (
        <div key={side} className="rounded-[16px] p-4" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
          <p className="mb-3 text-[11px] font-[700] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            {side === 'left' ? 'Left leg' : 'Right leg'}
          </p>
          <div className="space-y-3">
            <YesNoChips
              label="Heel touched the buttock (contact)"
              value={q.contact[side]}
              onChange={(v) => setContact(side, v)}
              hint={q.contact[side] === false ? 'Measure the gap below.' : 'Distance is only measured when contact is No.'}
            />
            {q.contact[side] !== true && (
              <Measurement
                label={`Distance heel to buttock (${side})`}
                value={q.distanceCm[side]}
                onChange={(v) => setDistance(side, v)}
                suffix="cm"
                min={0}
                max={60}
              />
            )}
            <YesNoChips label="Pelvic compensation" value={q.pelvic[side]} onChange={(v) => setPelvic(side, v)} compact
              hint="Hip lifting or pelvis rotating during the movement." />
            <YesNoChips label="Pain reported" value={q.pain[side]} onChange={(v) => setPain(side, v)} compact />
            <EnumSelect
              label="Tightness observed"
              value={q.tightness[side]}
              options={TIGHTNESS}
              onChange={(v) => setTightness(side, v)}
              description="Your own observation — the interpretation below is derived from contact, pain and pelvis control."
            />
          </div>
        </div>
      ))}

      {derived ? (
        <Insight
          label="Live interpretation"
          tone={tight ? 'watch' : answered ? 'ok' : 'info'}
          rows={(['left', 'right'] as const).map((side) => ({
            side: side === 'left' ? 'Left' : 'Right',
            verdict: derived.sides_interpretation[side] ?? 'Awaiting measurement',
            detail: [
              derived.sides[side].contact == null ? 'contact not answered' : derived.sides[side].contact ? 'contact' : 'not in contact',
              derived.sides[side].pain == null ? 'pain not answered' : derived.sides[side].pain ? 'pain' : 'no pain',
              derived.sides[side].pelvic_compensation == null ? 'pelvis not answered' : derived.sides[side].pelvic_compensation ? 'pelvic compensation' : 'pelvis controlled',
            ].join(' · '),
          }))}
        >
          Overall: <strong>{derived.overall_interpretation ?? 'Awaiting measurement'}</strong> — Normal needs both sides clear.
        </Insight>
      ) : (
        <InsightUnavailable />
      )}

      <NotesField value={q.notes} onChange={(v) => patch({ notes: v })} />
    </div>
  );
}

export default QuadricepsFields;
