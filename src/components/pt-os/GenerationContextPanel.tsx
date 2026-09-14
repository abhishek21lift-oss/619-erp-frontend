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
  AlertTriangle, CalendarClock, CheckCircle2, Clock, GitCompareArrows, HelpCircle,
  Layers, ShieldAlert, ShieldCheck, ShieldQuestion, TrendingDown, TrendingUp,
} from 'lucide-react';
import type { AiWorkoutContext, AiClientFactField, AiNextSession } from '@/lib/api';
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

/**
 * The next workout, in one line.
 *
 * Every unresolvable state gets its own words. "No next session" and "we could
 * not work out the next session" are different facts, and a card that renders
 * them the same teaches a trainer to ignore both.
 */
function nextSessionLine(next: AiNextSession): string {
  if (!next.resolvable) {
    switch (next.reason) {
      case 'no_active_programme': return 'Not on a programme — nothing to continue';
      case 'programme_expired': return 'Programme finished — needs the next block';
      case 'plan_prescribes_no_days': return 'The assigned plan prescribes no training days';
      case 'block_complete': return 'Every prescribed session of this block is done';
      default: return 'Next session could not be resolved';
    }
  }
  const done = next.completed_days_this_week.length;
  return `Up next: ${next.plan_name ?? 'programme'}, week ${next.week}`
    + (next.duration_weeks ? ` of ${next.duration_weeks}` : '')
    + `, ${next.day}`
    + (next.starts_next_week ? ' (this week is done)' : done ? ` (${done} done this week)` : '')
    + (next.source === 'override' ? ' · written by hand' : '');
}

export default function GenerationContextPanel({ context }: { context: AiWorkoutContext }) {
  const {
    facts, data_quality: dq, safety, current_program: program, training_history: history,
    next_session: next, adaptation, assignment_ambiguity: ambiguity,
  } = context;

  // Tolerated as absent, not assumed empty by accident. Backend and frontend
  // deploy separately — backend first, by a couple of minutes — so a browser
  // holding the new bundle can ask an API that predates this field. A thrown
  // TypeError there would blank the whole panel, which is the one outcome this
  // component exists to prevent: a trainer shown nothing and told nothing.
  const conflicting = dq.conflicting ?? [];
  const blocking = dq.missing.filter((m) => m.blocking);
  const absent = dq.missing.filter((m) => !m.blocking);
  // Measured and client-reported render in the same list and do not read the
  // same. Splitting them into two lists would bury the distinction under a
  // heading a trainer scrolls past; keeping them adjacent, with the reported
  // ones carrying their own words, is what makes the difference land at the
  // moment somebody is about to program from the number.
  const known = (Object.keys(facts) as AiClientFactField[])
    .filter((f) => facts[f]?.origin === 'recorded' || facts[f]?.origin === 'unverified');

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
        {known.map((field) => {
          const f = facts[field];
          const reported = f.origin === 'unverified';
          return (
            <li key={field} className="flex items-baseline gap-1.5 text-[11.5px]">
              {reported
                ? <HelpCircle size={11} className="shrink-0 translate-y-[1px]" style={{ color: palette.amber[600] }} />
                : <CheckCircle2 size={11} className="shrink-0 translate-y-[1px]" style={{ color: palette.emerald[500] }} />}
              <span className="font-[650]" style={{ color: 'var(--text-secondary)' }}>{LABEL[field]}</span>
              <span className="font-[700]" style={{ color: 'var(--text-primary)' }}>{String(f.value)}</span>
              {/* The studio holds it and the studio did not measure it. Said in
                  words beside the value rather than as a colour alone, because
                  this is the badge somebody has to read to know not to build a
                  cut on the number. */}
              {reported && (
                <span className="font-[650]" style={{ color: palette.amber[600] }}>client-reported</span>
              )}
              {f.stale && (
                <span className="font-[650]" style={{ color: palette.amber[600] }}>
                  {f.stale.age_days}d old
                </span>
              )}
              <span className="ml-auto text-[10px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
                {f.source}
              </span>
            </li>
          );
        })}

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
        {/* Where they are, not just that they are on something. "On Base Phase"
            and "Base Phase, week 4 of 12" are different facts, and the second
            is the one that decides whether the next programme should be a new
            block or the next weeks of this one. */}
        <span style={{ color: 'var(--text-muted)' }}>
          {!program?.active
            ? 'No active programme'
            : program.expired
              ? `${program.plan_name ?? 'Programme'} — finished`
              : `${program.plan_name ?? 'Programme'}`
                + (program.current_week
                  ? `, week ${program.current_week}${program.duration_weeks ? ` of ${program.duration_weeks}` : ''}`
                  : '')}
        </span>
        <span style={{ color: 'var(--text-muted)' }}>
          {history?.has_history ? `${history.window_weeks}w of logged training` : 'No logged training'}
        </span>
      </div>

      {/* ── The exact next workout ─────────────────────────────────────────
          Where they are in the block was already here; this is what they
          actually DO next, resolved through the same week resolver the session
          log uses. A trainer choosing between "start a new block" and
          "progress this one" is choosing between two abstractions until they
          can see the session the second one would continue. */}
      {next && (
        <div className="mt-1.5 flex items-start gap-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
          <CalendarClock size={11} className="mt-0.5 shrink-0" />
          <span>{nextSessionLine(next)}</span>
        </div>
      )}

      {/* ── What the logged sets say to do with each lift ───────────────────
          Decided by rule before a token is spent, so a trainer can disagree
          with it. `evidence_free` gets its own sentence because "we checked
          and there is nothing to go on" is the most common answer here and the
          easiest one for a confident-looking plan to paper over. */}
      {adaptation && adaptation.counts.total > 0 && (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px]">
          {adaptation.evidence_free ? (
            <span className="flex items-center gap-1 font-[650]" style={{ color: palette.amber[600] }}>
              <AlertTriangle size={11} />
              No logged evidence for any of the {adaptation.counts.total} prescribed lifts
            </span>
          ) : (
            <>
              {adaptation.counts.progress > 0 && (
                <span className="flex items-center gap-1 font-[650]" style={{ color: palette.emerald[500] }}>
                  <TrendingUp size={11} />{adaptation.counts.progress} to progress
                </span>
              )}
              {adaptation.counts.hold > 0 && (
                <span className="font-[650]" style={{ color: 'var(--text-secondary)' }}>
                  {adaptation.counts.hold} to hold
                </span>
              )}
              {adaptation.counts.regress > 0 && (
                <span className="flex items-center gap-1 font-[650]" style={{ color: palette.red[500] }}>
                  <TrendingDown size={11} />{adaptation.counts.regress} to reduce
                </span>
              )}
              {adaptation.counts.insufficient_evidence > 0 && (
                <span style={{ color: 'var(--text-muted)' }}>
                  {adaptation.counts.insufficient_evidence} with no evidence either way
                </span>
              )}
            </>
          )}
        </div>
      )}

      {/* ── More than one programme claims to be active ─────────────────────
          The engine has to pick one and now picks by a stated rule rather than
          by whichever row came back first. Which it picked is shown, because a
          deterministic choice is not the same as the right one, and the fix —
          closing the assignments that are finished — is the trainer's. */}
      {ambiguity && (
        <div
          className="mt-2 flex items-start gap-1.5 rounded-[10px] px-2.5 py-1.5 text-[11px] leading-relaxed"
          style={{ background: rgba(palette.amber[500], 0.08), color: palette.amber[600] }}
        >
          <Layers size={11} className="mt-0.5 shrink-0" />
          <span>
            <strong className="font-[750]">{ambiguity.active_count} active programmes.</strong>{' '}
            Programming against {ambiguity.chosen?.plan_name ?? 'the most recent'} ({ambiguity.rule}),
            not {ambiguity.not_chosen.map((o) => o.plan_name ?? 'an unnamed plan').join(' or ')}.
            Close the ones that are finished.
          </span>
        </div>
      )}

      {/* ── Stale is a third state ────────────────────────────────────────
          Not missing and not current: real evidence whose age the trainer
          should weigh. Rendered in its own line rather than folded into the
          missing list, because the action is different — a missing screen
          needs taking, a stale one needs repeating, and an absent finding in
          a stale screen is not evidence that nothing is wrong now. */}
      {/* ── Two of the studio's own records disagreeing ──────────────────
          Precedence decided; this is what it decided against. Rendered rather
          than resolved silently, because which record is right is a clinical
          question and the answer is the trainer's, not a source file's. */}
      {conflicting.length > 0 && (
        <div
          className="mt-2 flex items-start gap-1.5 rounded-[10px] px-2.5 py-1.5 text-[11px] leading-relaxed"
          style={{ background: rgba(palette.amber[500], 0.08), color: palette.amber[600] }}
        >
          <GitCompareArrows size={11} className="mt-0.5 shrink-0" />
          <span>
            <strong className="font-[750]">Records disagree.</strong>{' '}
            {conflicting.map((c) => (
              `${LABEL[c.field]} — used ${c.chosen.value} (${c.chosen.source}), `
              + `not ${c.rejected.map((r) => `${r.value} (${r.source})`).join(' or ')}`
            )).join('; ')}
            .
          </span>
        </div>
      )}

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
