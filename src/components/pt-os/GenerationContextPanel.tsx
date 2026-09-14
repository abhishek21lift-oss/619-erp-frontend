'use client';

/**
 * What the AI is about to be told about this client — shown BEFORE generating.
 *
 * ── Why this is on the screen at all ───────────────────────────────────────
 *
 * The trainer pressing "Generate" could not see what the engine was working
 * from, and that mattered most exactly when the answer was wrong. For a client
 * whose record was thin, this card used to post height 175, weight 75, gender
 * male, age 30, experience beginner and four training days, and the prompt
 * printed all six under the heading CLIENT AUTHORITATIVE DATA. The plan came
 * back looking precisely as trustworthy as one written for a client whose
 * record was complete.
 *
 * Those invented numbers are gone from the request. This panel is the other
 * half: the studio's own answer, field by field, with the column each value
 * came from, before a token is spent.
 *
 * ── Reading order ──────────────────────────────────────────────────────────
 *
 * Missing first, and blocking above merely absent, because a missing goal is
 * the thing that stops the button working and a missing height is not. A
 * client whose record is complete collapses to a single quiet line, which is
 * the state a trainer should be able to skip past without reading.
 */

import {
  AlertTriangle, CheckCircle2, Clock, HelpCircle, ShieldAlert, ShieldCheck, ShieldQuestion,
} from 'lucide-react';
import type { AiWorkoutContext, AiClientFactField } from '@/lib/api';
import { palette, rgba } from '@/lib/palette';

const LABEL: Record<AiClientFactField, string> = {
  age: 'Age',
  gender: 'Gender',
  weight_kg: 'Weight',
  height_cm: 'Height',
  goal: 'Goal',
  experience_level: 'Experience',
  training_days: 'Training days',
  equipment: 'Equipment',
};

/** Where a trainer goes to fix it. Field names are not instructions. */
const FIX: Partial<Record<AiClientFactField, string>> = {
  goal: 'set a goal on the client',
  experience_level: 'set experience level in enrolment',
  training_days: 'set sessions per week in enrolment',
  height_cm: 'record height on the profile',
  weight_kg: 'record a weight or an assessment',
  age: 'record date of birth',
  gender: 'record gender',
  equipment: 'no column records this — state it when generating',
};

export default function GenerationContextPanel({ context }: { context: AiWorkoutContext }) {
  const { facts, data_quality: dq, safety, current_program: program, training_history: history } = context;

  const blocking = dq.missing.filter((m) => m.blocking);
  const absent = dq.missing.filter((m) => !m.blocking);
  const known = (Object.keys(facts) as AiClientFactField[])
    .filter((f) => facts[f]?.origin === 'recorded');

  // ── Three states, three appearances ──────────────────────────────────────
  //
  // This read `may_program || status === 'unknown'`, which put an UNSCREENED
  // client behind the same green shield as a cleared one. "Nobody has asked
  // this person whether it is safe for them to train" is not "it is safe for
  // this person to train", and the one place a trainer glances before pressing
  // Generate is the last place those two should look alike.
  //
  // Generation is still allowed on `unknown` — refusing it would take the
  // feature away from every client the studio has not screened yet, which is
  // most of them — and that is precisely why the state has to be visible.
  // Allowed is a backend decision; SAFE is a claim, and this makes only the
  // claim the server actually supports.
  const gate: 'cleared' | 'unscreened' | 'blocked' = !safety
    ? 'unscreened'
    : safety.may_program
      ? 'cleared'
      : safety.gate?.status === 'unknown' ? 'unscreened' : 'blocked';

  const GATE_TONE = {
    cleared: { color: palette.emerald[500], Icon: ShieldCheck },
    unscreened: { color: palette.amber[600], Icon: ShieldQuestion },
    blocked: { color: palette.red[500], Icon: ShieldAlert },
  } as const;

  return (
    <div
      className="mt-3 rounded-[12px] px-3 py-2.5"
      style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span
          className="text-[10.5px] font-[750] uppercase tracking-[0.07em]"
          style={{ color: 'var(--text-muted)' }}
        >
          What the AI will use
        </span>
        <span className="text-[10.5px] font-[700]" style={{ color: 'var(--text-muted)' }}>
          {dq.completeness_pct}% on file
        </span>
      </div>

      {blocking.length > 0 && (
        <div
          className="mb-2 flex items-start gap-1.5 rounded-[10px] px-2.5 py-2 text-[11.5px] leading-relaxed"
          style={{ background: rgba(palette.amber[500], 0.1), color: palette.amber[600] }}
        >
          <AlertTriangle size={12} className="mt-0.5 shrink-0" />
          <span>
            <strong className="font-[750]">Needs trainer input.</strong>{' '}
            {blocking.map((m) => LABEL[m.field]).join(', ')} {blocking.length === 1 ? 'is' : 'are'} not
            recorded, and a programme cannot be written without{' '}
            {blocking.length === 1 ? 'it' : 'them'}
            {blocking.map((m) => FIX[m.field]).filter(Boolean).length > 0 && (
              <> &mdash; {blocking.map((m) => FIX[m.field]).filter(Boolean).join('; ')}</>
            )}
            .
          </span>
        </div>
      )}

      <ul className="space-y-1">
        {known.map((field) => (
          <li key={field} className="flex items-baseline gap-1.5 text-[11.5px]">
            <CheckCircle2 size={11} className="shrink-0 translate-y-[1px]" style={{ color: palette.emerald[500] }} />
            <span className="font-[650]" style={{ color: 'var(--text-secondary)' }}>{LABEL[field]}</span>
            <span className="font-[700]" style={{ color: 'var(--text-primary)' }}>{String(facts[field].value)}</span>
            <span className="ml-auto text-[10px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
              {facts[field].source}
            </span>
          </li>
        ))}

        {absent.map((m) => (
          <li key={m.field} className="flex items-baseline gap-1.5 text-[11.5px]">
            <HelpCircle size={11} className="shrink-0 translate-y-[1px]" style={{ color: 'var(--text-muted)' }} />
            <span className="font-[650]" style={{ color: 'var(--text-secondary)' }}>{LABEL[m.field]}</span>
            {/* Said plainly, because the alternative this replaced was a number
                nobody measured. The model is told NOT RECORDED too. */}
            <span className="font-[700]" style={{ color: 'var(--text-muted)' }}>not recorded</span>
            {FIX[m.field] && (
              <span className="ml-auto text-[10px]" style={{ color: 'var(--text-muted)' }}>{FIX[m.field]}</span>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t pt-2 text-[11px]" style={{ borderColor: 'var(--border)' }}>
        {safety && (
          <span className="flex items-center gap-1 font-[650]" style={{ color: GATE_TONE[gate].color }}>
            {(() => { const I = GATE_TONE[gate].Icon; return <I size={11} />; })()}
            {/* The word too, not only the hue — a colour-blind trainer on a bad
                monitor gets the same three states. */}
            PAR-Q {gate === 'unscreened' ? 'not screened' : (safety.gate?.status ?? 'unknown')}
            {safety.constraints > 0 && (
              <span style={{ color: 'var(--text-muted)' }}>· {safety.constraints} constraint{safety.constraints === 1 ? '' : 's'}</span>
            )}
          </span>
        )}
        <span style={{ color: 'var(--text-muted)' }}>
          {program ? `On ${program.name ?? 'a programme'}` : 'No active programme'}
        </span>
        <span style={{ color: 'var(--text-muted)' }}>
          {history?.has_history ? `${history.window_weeks}w of logged training` : 'No logged training'}
        </span>
      </div>

      {/* ── Stale is a third state ────────────────────────────────────────
          Not missing and not current: real evidence whose age the trainer
          should weigh. Rendered in its own line rather than folded into the
          missing list, because the action is different — a missing screen
          needs taking, a stale one needs repeating, and an absent finding in
          a stale screen is not evidence that nothing is wrong now. */}
      {safety && safety.stale.length > 0 && (
        <div
          className="mt-2 flex items-start gap-1.5 rounded-[10px] px-2.5 py-1.5 text-[11px] leading-relaxed"
          style={{ background: rgba(palette.amber[500], 0.08), color: palette.amber[600] }}
        >
          <Clock size={11} className="mt-0.5 shrink-0" />
          <span>
            <strong className="font-[750]">Worth repeating.</strong>{' '}
            {safety.stale
              .map((st) => `${st.section} last assessed ${st.as_of} (${st.age_days}d)`)
              .join(', ')}
            .
          </span>
        </div>
      )}
    </div>
  );
}
