'use client';

import { SHOULDER_REACH_RESULTS } from '@/lib/flexibility-protocol';
import type { AbleShoulderReach, FlexibilityFormState, ShoulderReachResult, Side } from '@/lib/flexibility-protocol';
import { EnumSelect, Insight, InsightUnavailable, NotesField, YesNoChips } from './fields';

type SideKey = keyof Side<unknown>;

const REACH_LABEL: Record<ShoulderReachResult, string> = {
  overlap: 'Fingertips overlap',
  touch: 'Fingertips touch',
  gap: 'Gap between fingertips',
};

interface Props {
  state: FlexibilityFormState['shoulderReach'];
  /** null when the test is marked unable — nothing is derived then. */
  derived: AbleShoulderReach | null;
  patch: (p: Partial<FlexibilityFormState['shoulderReach']>) => void;
}

/** K11 shoulder reach: one hand over the shoulder, the other up the back. */
export function ShoulderReachFields({ state: s, derived, patch }: Props) {
  const setReach = (side: SideKey, v: ShoulderReachResult | '') => patch({ reach: { ...s.reach, [side]: v } });
  const setPain = (side: SideKey, v: boolean | null) => patch({ pain: { ...s.pain, [side]: v } });

  const flagged = !!derived && (['left', 'right'] as const).some((side) => derived.sides_interpretation[side] === 'Possible restriction');

  return (
    <div className="space-y-4">
      {(['left', 'right'] as const).map((side) => (
        <div key={side} className="rounded-[16px] p-4" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
          <p className="mb-3 text-[11px] font-[700] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            {side === 'left' ? 'Left arm over the shoulder' : 'Right arm over the shoulder'}
          </p>
          <div className="space-y-3">
            <EnumSelect
              label={`Fingertip reach (${side})`}
              value={s.reach[side]}
              options={['', ...SHOULDER_REACH_RESULTS] as const}
              optionLabel={(v) => (v === '' ? 'Not recorded' : REACH_LABEL[v])}
              onChange={(v) => setReach(side, v)}
            />
            <YesNoChips label="Pain reported" value={s.pain[side]} onChange={(v) => setPain(side, v)} compact />
          </div>
        </div>
      ))}

      {derived ? (
        <Insight
          label="Live interpretation"
          tone={flagged ? 'watch' : 'ok'}
          rows={(['left', 'right'] as const).map((side) => {
            const reach = derived.sides[side].reach;
            return {
              side: side === 'left' ? 'Left' : 'Right',
              verdict: derived.sides_interpretation[side] ?? 'Awaiting measurement',
              detail: reach == null ? 'reach not recorded' : REACH_LABEL[reach],
            };
          })}
        />
      ) : (
        <InsightUnavailable />
      )}

      <NotesField value={s.notes} onChange={(v) => patch({ notes: v })} />
    </div>
  );
}

export default ShoulderReachFields;
