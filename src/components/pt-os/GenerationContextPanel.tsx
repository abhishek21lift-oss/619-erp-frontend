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
 * half: the studio's own answer, field by field, with the record each value
 * came from, before a token is spent.
 *
 * ── Two layers ─────────────────────────────────────────────────────────────
 *
 * It used to print everything at once — eight rows each carrying a database
 * column name, the PAR-Q line, the programme, the history and any warnings in
 * full — which on a phone was a screen of small text a trainer had to read to
 * find the one thing that mattered. Now:
 *
 *   · Always visible: what blocks generation (with how to fix it), the facts
 *     as one line of chips, what is not on file, the PAR-Q state, and a count
 *     of anything worth checking.
 *   · Under "Details": every fact with the record it came from, the programme
 *     and training history, and the full text of any disagreement or stale
 *     assessment.
 *
 * Nothing was removed, only layered. The things that change what the trainer
 * should do stay on the surface; the evidence behind them is one tap away.
 */

import {
  AlertTriangle, ChevronDown, Clock, GitCompareArrows,
  ShieldAlert, ShieldCheck, ShieldQuestion,
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

/** Summary order: who they are, then what they are training for. */
const ORDER: AiClientFactField[] = [
  'gender', 'age', 'weight_kg', 'height_cm', 'goal', 'experience_level', 'training_days', 'equipment',
];

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

/** The record a column belongs to, in the words a trainer uses for it. */
const RECORD: Record<string, string> = {
  pt_clients: 'Profile',
  pt_assessments: 'Assessment',
  client_fitness_profiles: 'Fitness profile',
  pt_goals: 'Goals',
  pt_lifestyle_assessments: 'Lifestyle assessment',
  weekly_checkins: 'Check-in',
  system_settings: 'Studio settings',
};

/**
 * Columns that need a more exact name than their record's. Two of a fact's
 * sources can sit in the same record — sessions per week and preferred days
 * are both on the profile — and "6 from Profile, not 7 from Profile" says
 * nothing about which one to fix.
 */
const COLUMN: Record<string, string> = {
  'pt_clients.sessions_per_week': 'Sessions per week',
  'pt_clients.preferred_training_days': 'Preferred training days',
  'pt_clients.frequency': 'Training frequency',
  'pt_clients.goal': 'Profile goal',
  'pt_goals.goal_type': 'Active goal',
  'client_fitness_profiles.goal': 'Fitness profile goal',
};

function recordName(source: string | null | undefined): string | null {
  if (!source) return null;
  return RECORD[source.split('.')[0]] ?? null;
}

/** The most specific plain name for where a value came from. */
function sourceName(source: string | null | undefined): string | null {
  if (!source) return null;
  return COLUMN[source] ?? recordName(source) ?? source;
}

/** "fat_loss" → "Fat loss". Stored values are keys, not copy. */
function humanize(v: unknown): string {
  const s = String(v).replace(/_/g, ' ').trim();
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

/** One fact as the summary chip shows it — with its unit. */
function formatFact(field: AiClientFactField, value: unknown): string {
  switch (field) {
    case 'age': return `${value} yrs`;
    case 'weight_kg': return `${value} kg`;
    case 'height_cm': return `${value} cm`;
    case 'training_days': return `${value} days/wk`;
    default: return humanize(value);
  }
}

export default function GenerationContextPanel({ context }: { context: AiWorkoutContext }) {
  const { facts, data_quality: dq, safety, current_program: program, training_history: history } = context;

  // Tolerated as absent, not assumed empty by accident. Backend and frontend
  // deploy separately — backend first, by a couple of minutes — so a browser
  // holding the new bundle can ask an API that predates this field. A thrown
  // TypeError there would blank the whole panel, which is the one outcome this
  // component exists to prevent: a trainer shown nothing and told nothing.
  const conflicting = dq.conflicting ?? [];
  const stale = safety?.stale ?? [];
  const blocking = dq.missing.filter((m) => m.blocking);
  const absent = dq.missing.filter((m) => !m.blocking);
  const known = ORDER.filter((f) => facts[f]?.origin === 'recorded');
  const toReview = conflicting.length + stale.length;

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
  const GateIcon = GATE_TONE[gate].Icon;

  // Where they are, not just that they are on something. "On Base Phase" and
  // "Base Phase, week 4 of 12" are different facts, and the second is the one
  // that decides whether the next programme should be a new block or the next
  // weeks of this one.
  const programLine = !program?.active
    ? 'No active programme'
    : program.expired
      ? `${program.plan_name ?? 'Programme'} — finished`
      : `${program.plan_name ?? 'Programme'}`
        + (program.current_week
          ? `, week ${program.current_week}${program.duration_weeks ? ` of ${program.duration_weeks}` : ''}`
          : '');

  return (
    <div
      className="mt-3 rounded-[14px] px-3.5 py-3"
      style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-[700] uppercase tracking-[0.06em]" style={{ color: 'var(--text-muted)' }}>
          What the AI will use
        </span>
        <span className="text-[11px] font-[650] tabular-nums" style={{ color: 'var(--text-muted)' }}>
          {dq.completeness_pct}% on file
        </span>
      </div>

      {/* What stops the button. Stays on the surface, with how to fix it. */}
      {blocking.length > 0 && (
        <div
          className="mt-2.5 flex items-start gap-2 rounded-[10px] px-3 py-2 text-[12px] leading-relaxed"
          style={{ background: rgba(palette.amber[500], 0.1), color: palette.amber[600] }}
        >
          <AlertTriangle size={13} className="mt-0.5 shrink-0" />
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

      {/* The facts, as one line a trainer can read in a glance. */}
      {known.length > 0 && (
        <ul className="mt-2.5 flex flex-wrap gap-1.5" aria-label="Recorded client details">
          {known.map((field) => (
            <li
              key={field}
              title={LABEL[field]}
              className="rounded-full px-2.5 py-1 text-[12px] font-[650]"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            >
              {formatFact(field, facts[field].value)}
            </li>
          ))}
        </ul>
      )}

      {/* Said plainly, because the alternative this replaced was a number
          nobody measured. The model is told NOT RECORDED too. */}
      {absent.length > 0 && (
        <p className="mt-2 text-[12px]" style={{ color: 'var(--text-muted)' }}>
          Not on file: {absent.map((m) => LABEL[m.field]).join(', ')}
        </p>
      )}

      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
        {safety && (
          <span className="flex items-center gap-1 font-[650]" style={{ color: GATE_TONE[gate].color }}>
            <GateIcon size={13} />
            {/* The word too, not only the hue — a colour-blind trainer on a bad
                monitor gets the same three states. */}
            PAR-Q {gate === 'unscreened' ? 'not screened' : (safety.gate?.status ?? 'unknown')}
            {safety.constraints > 0 && (
              <span style={{ color: 'var(--text-muted)' }}>· {safety.constraints} constraint{safety.constraints === 1 ? '' : 's'}</span>
            )}
          </span>
        )}
        {toReview > 0 && (
          <span className="flex items-center gap-1 font-[650]" style={{ color: palette.amber[600] }}>
            <AlertTriangle size={12} />
            {toReview} to review
          </span>
        )}
      </div>

      <details className="group mt-2.5 border-t pt-2" style={{ borderColor: 'var(--border)' }}>
        <summary
          className="flex cursor-pointer list-none items-center gap-1 py-1 text-[12px] font-[650] [&::-webkit-details-marker]:hidden"
          style={{ color: 'var(--text-secondary)' }}
        >
          <ChevronDown size={14} className="transition-transform group-open:rotate-180" />
          Details
        </summary>

        <dl className="mt-1 divide-y" style={{ borderColor: 'var(--border)' }}>
          {known.map((field) => (
            <div key={field} className="py-1.5 text-[12px]">
              <div className="flex items-baseline justify-between gap-3">
                <dt style={{ color: 'var(--text-muted)' }}>{LABEL[field]}</dt>
                <dd className="text-right font-[650]" style={{ color: 'var(--text-primary)' }}>{formatFact(field, facts[field].value)}</dd>
              </div>
              {/* The record, in words, then the exact column — the column is
                  what someone correcting the data actually needs. */}
              <dd className="mt-0.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                {recordName(facts[field].source) && <>{recordName(facts[field].source)} · </>}
                <span className="break-all font-mono text-[10.5px]">{facts[field].source}</span>
              </dd>
            </div>
          ))}
          {absent.map((m) => (
            <div key={m.field} className="py-1.5 text-[12px]">
              <div className="flex items-baseline justify-between gap-3">
                <dt style={{ color: 'var(--text-muted)' }}>{LABEL[m.field]}</dt>
                <dd className="text-right font-[650]" style={{ color: 'var(--text-muted)' }}>not recorded</dd>
              </div>
              {FIX[m.field] && (
                <dd className="mt-0.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>{FIX[m.field]}</dd>
              )}
            </div>
          ))}
          <div className="flex items-baseline justify-between gap-3 py-1.5 text-[12px]">
            <dt style={{ color: 'var(--text-muted)' }}>Programme</dt>
            <dd className="text-right" style={{ color: 'var(--text-primary)' }}>{programLine}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3 py-1.5 text-[12px]">
            <dt style={{ color: 'var(--text-muted)' }}>History</dt>
            <dd className="text-right" style={{ color: 'var(--text-primary)' }}>
              {history?.has_history ? `${history.window_weeks}w of logged training` : 'No logged training'}
            </dd>
          </div>
        </dl>

        {/* ── Two of the studio's own records disagreeing ────────────────
            Precedence decided; this is what it decided against. Rendered
            rather than resolved silently, because which record is right is a
            clinical question and the answer is the trainer's, not a source
            file's. */}
        {conflicting.length > 0 && (
          <div
            className="mt-2.5 flex items-start gap-2 rounded-[10px] px-3 py-2 text-[12px] leading-relaxed"
            style={{ background: rgba(palette.amber[500], 0.08), color: palette.amber[600] }}
          >
            <GitCompareArrows size={13} className="mt-0.5 shrink-0" />
            <span>
              <strong className="font-[750]">Records disagree.</strong>{' '}
              {/* In the trainer's words — which record, not which column. The
                  columns are listed with each fact above. */}
              {conflicting.map((c) => (
                `${LABEL[c.field]}: using ${formatFact(c.field, c.chosen.value)} from ${sourceName(c.chosen.source)}, `
                + `not ${c.rejected.map((r) => `${formatFact(c.field, r.value)} from ${sourceName(r.source)}`).join(' or ')}`
              )).join('. ')}
              . Fix whichever record is wrong.
            </span>
          </div>
        )}

        {/* ── Stale is a third state ──────────────────────────────────────
            Not missing and not current: real evidence whose age the trainer
            should weigh. A missing screen needs taking, a stale one needs
            repeating, and an absent finding in a stale screen is not evidence
            that nothing is wrong now. */}
        {stale.length > 0 && (
          <div
            className="mt-2 flex items-start gap-2 rounded-[10px] px-3 py-2 text-[12px] leading-relaxed"
            style={{ background: rgba(palette.amber[500], 0.08), color: palette.amber[600] }}
          >
            <Clock size={13} className="mt-0.5 shrink-0" />
            <span>
              <strong className="font-[750]">Worth repeating.</strong>{' '}
              {stale
                .map((st) => `${st.section} last assessed ${st.as_of} (${st.age_days}d)`)
                .join(', ')}
              .
            </span>
          </div>
        )}
      </details>
    </div>
  );
}
