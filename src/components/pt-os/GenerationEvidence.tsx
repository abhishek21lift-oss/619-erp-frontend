'use client';

/**
 * What the engine checked, shown to the trainer who is about to approve it.
 *
 * ── Why this is not decoration ─────────────────────────────────────────────
 *
 * The workout generator returns five things alongside the plan: the safety
 * screen that shaped the request, a rule audit of what the model actually sent
 * back, a quality score, a second model's critique, and the list of exercises
 * it could not verify against the library. Until this component existed the
 * card threw all five away and rendered the plan alone — which meant the
 * trainer's approval, the step the whole design calls "the final gate", was
 * made with strictly less information than the server had when it proposed it.
 *
 * Three of those findings change what a trainer does:
 *
 *   · An UNSCREENED plan. Zero constraints from a client with four assessments
 *     means "screened and clear". Zero from a client with none means nobody
 *     looked. Production has 0 of 34 clients with an injury on file and 876 of
 *     890 exercises with empty contraindications, so the second case is the
 *     normal one and a card that stays silent about it is telling the trainer
 *     the plan was vetted.
 *
 *   · A REFERRAL. Some findings the rules refuse to program around at all,
 *     because doing so would be a medical decision. Those are not cautions.
 *
 *   · An UNVERIFIED exercise. It is not in the library, so saving cannot store
 *     it — workout_exercises.exercise_id is NOT NULL. Roughly one generated
 *     name in eight is one of these. Saying so here, before the tap, is the
 *     difference between a trainer adding it in the builder and a trainer
 *     finding a short session next Tuesday.
 *
 * ── The separation this component must preserve ────────────────────────────
 *
 * `audit` is checkable fact — a rule, an exercise, a breach. `critique` is a
 * second model's opinion. The backend keeps them in separate fields and says
 * why: a list that mixes them teaches the reader to skim both. They are
 * rendered under separate headings here, and the opinion is labelled as one.
 */

import { useState } from 'react';
import { ChevronDown, ChevronRight, OctagonAlert, ShieldCheck, TriangleAlert } from 'lucide-react';
import type { AiWorkoutGenerationResult } from '@/lib/api';

/** Severities the audit reports, worst first. */
const BLOCKING_AUDIT = ['critical', 'major'];

export default function GenerationEvidence({ result }: { result: AiWorkoutGenerationResult }) {
  const [open, setOpen] = useState(false);
  const { screen, audit, quality, critique, critique_verdict: verdict } = result;

  // Nothing came back to show. Says so rather than rendering an empty frame
  // that reads as "checked, all clear".
  if (!screen && !audit && !quality && !critique?.length) {
    return (
      <p className="mt-2 text-[10.5px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        This generation came back without a screen or a rule check. Review it as unchecked.
      </p>
    );
  }

  const blocking = audit?.violations.filter((v) => BLOCKING_AUDIT.includes(v.severity)) ?? [];
  const minor = audit?.violations.filter((v) => !BLOCKING_AUDIT.includes(v.severity)) ?? [];
  const blocks = screen?.constraints.filter((c) => c.verdict === 'block') ?? [];
  const cautions = screen?.constraints.filter((c) => c.verdict === 'caution') ?? [];
  const referrals = screen?.referrals ?? [];
  const unverified = audit?.unverified ?? [];
  const loudCritique = critique?.filter((c) => c.severity === 'high') ?? [];
  const quietCritique = critique?.filter((c) => c.severity !== 'high') ?? [];

  const hasMore = cautions.length > 0
    || minor.length > 0
    || quietCritique.length > 0
    || (screen?.excluded_exercises.length ?? 0) > 0
    || (screen?.not_assessed.length ?? 0) > 0;

  return (
    <div className="mt-2.5 border-t pt-2.5" style={{ borderColor: 'var(--border)' }}>
      {/* ── The one-line verdict ──────────────────────────────────────────
          Score, coverage and revision state, in the order a trainer reads
          them. The counts are the audit's own: `verified` is how many of the
          plan's exercises were matched to the library, and it is the number
          that predicts what will actually save. */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10.5px] font-[700]">
        {quality && (
          <span className="tabular-nums" style={{ color: 'var(--text-secondary)' }}>
            Quality {quality.score}/{quality.max}
          </span>
        )}
        {audit && (
          <span className="tabular-nums" style={{ color: 'var(--text-muted)' }}>
            {audit.counts.verified} of {audit.counts.exercises} exercises in the library
          </span>
        )}
        {audit?.revised && (
          <span style={{ color: 'var(--text-muted)' }}>· revised once after the rule check</span>
        )}
        {verdict && (
          <span style={{ color: 'var(--text-muted)' }}>· second opinion: {verdict}</span>
        )}
      </div>
      {quality?.basis && (
        <p className="mt-0.5 text-[10px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          {quality.basis}
        </p>
      )}

      {/* ── Screened, or not ──────────────────────────────────────────────
          The single most misreadable fact on this card, so it is stated in
          words every time rather than implied by an empty constraint list. */}
      {screen && (
        <Finding
          tone={screen.screened ? 'ok' : 'warn'}
          title={screen.screened
            ? `Screened against ${screen.sources.join(', ')}`
            : 'Not screened against this client'}
          detail={screen.screened
            ? undefined
            : 'No assessment on file to screen against — an empty constraint list here means nobody looked, not that the client is clear.'}
        />
      )}

      {/* The PAR-Q gate. `unknown` is a third state and must never render as
          cleared: that is the difference between "we checked" and "nobody
          asked", and a default would erase it. */}
      {screen && !screen.gate.cleared && (
        <Finding
          tone={screen.gate.status === 'unknown' ? 'warn' : 'stop'}
          title={screen.gate.status === 'unknown'
            ? 'No PAR-Q on file — nobody has cleared this client to train'
            : `PAR-Q gate: ${screen.gate.status}`}
          detail={[
            screen.gate.risk_level ? `risk ${screen.gate.risk_level}` : null,
            screen.gate.assessed_on ? `assessed ${screen.gate.assessed_on}` : null,
          ].filter(Boolean).join(' · ') || undefined}
        />
      )}

      {/* Refusals, not cautions. Kept above everything else the rules found
          because no amount of programming makes them go away. */}
      {referrals.map((r, i) => (
        <Finding key={`ref-${i}`} tone="stop" title={`Refer: ${r.evidence}`} detail={r.note} />
      ))}

      {blocks.map((c, i) => (
        <Finding
          key={`blk-${i}`}
          tone="stop"
          title={`Blocked: ${c.label ?? c.region ?? 'constraint'}`}
          detail={`${c.evidence}${c.note ? ` — ${c.note}` : ''} (${c.source})`}
        />
      ))}

      {blocking.map((v, i) => (
        <Finding
          key={`vio-${i}`}
          tone={v.severity === 'critical' ? 'stop' : 'warn'}
          title={`${v.rule.replace(/_/g, ' ')}${v.exercise ? `: ${v.exercise}` : ''}`}
          detail={v.detail}
        />
      ))}

      {/* These are the ones that will silently not save. */}
      {unverified.length > 0 && (
        <Finding
          tone="warn"
          title={`${unverified.length} exercise${unverified.length === 1 ? '' : 's'} not in the library`}
          detail={`${unverified.map((u) => u.name).join(', ')} — these cannot be saved and will need adding in the builder.`}
        />
      )}

      {loudCritique.map((c, i) => (
        <Finding key={`cri-${i}`} tone="warn" title={`Second opinion: ${c.point}`} detail={c.because} />
      ))}

      {hasMore && (
        <>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="mt-1.5 flex cursor-pointer items-center gap-1 text-[10.5px] font-[700]"
            style={{ color: 'var(--text-muted)' }}
          >
            {open ? <ChevronDown size={11} aria-hidden /> : <ChevronRight size={11} aria-hidden />}
            {open ? 'Hide' : 'What else was checked'}
          </button>

          {open && (
            <div className="mt-1 space-y-1.5">
              {cautions.length > 0 && (
                <Group title="Cautions the plan was written around">
                  {cautions.map((c, i) => (
                    <li key={i}>
                      {(c.label ?? c.region ?? 'constraint')}: {c.evidence}
                      {c.note ? ` — ${c.note}` : ''}
                    </li>
                  ))}
                </Group>
              )}

              {(screen?.excluded_exercises.length ?? 0) > 0 && (
                <Group title="Exercises the screen removed before the model saw the library">
                  {screen!.excluded_exercises.map((e, i) => (
                    <li key={i}>{e.name} &mdash; {e.reasons.join('; ')}</li>
                  ))}
                </Group>
              )}

              {minor.length > 0 && (
                <Group title="Minor rule breaches">
                  {minor.map((v, i) => (
                    <li key={i}>{v.rule.replace(/_/g, ' ')}: {v.detail}</li>
                  ))}
                </Group>
              )}

              {quietCritique.length > 0 && (
                /* Labelled as opinion, kept apart from the rule findings
                   above. Mixing a model's view with a checkable breach is how
                   a trainer learns to trust neither. */
                <Group title="A second model's opinion — judgement, not a rule">
                  {quietCritique.map((c, i) => (
                    <li key={i}>{c.point} &mdash; {c.because}</li>
                  ))}
                </Group>
              )}

              {(screen?.not_assessed.length ?? 0) > 0 && (
                <Group title="Never assessed for this client">
                  {screen!.not_assessed.map((n, i) => <li key={i}>{n}</li>)}
                </Group>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * One finding. Icon and wording carry the severity; colour repeats it.
 *
 * `--danger-text` / `--warning-text` rather than the raw fills, which measure
 * 3.44:1 and 1.96:1 as text and are rejected by the contrast test.
 */
function Finding({
  tone, title, detail,
}: { tone: 'stop' | 'warn' | 'ok'; title: string; detail?: string }) {
  const { color, Icon, label } = tone === 'stop'
    ? { color: 'var(--danger-text)', Icon: OctagonAlert, label: 'Blocking' }
    : tone === 'warn'
      ? { color: 'var(--warning-text)', Icon: TriangleAlert, label: 'Check' }
      : { color: 'var(--success-text)', Icon: ShieldCheck, label: 'Checked' };

  return (
    <div className="mt-1.5">
      <p className="flex items-start gap-1.5 text-[11px] font-[700] leading-relaxed" style={{ color }}>
        <Icon size={12} className="mt-[2px] shrink-0" aria-hidden />
        <span><span className="sr-only">{label}: </span>{title}</span>
      </p>
      {detail && (
        <p className="pl-[17px] text-[10.5px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          {detail}
        </p>
      )}
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-[750] uppercase tracking-[0.05em]" style={{ color: 'var(--text-muted)' }}>
        {title}
      </p>
      <ul className="list-inside list-disc text-[10.5px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {children}
      </ul>
    </div>
  );
}
