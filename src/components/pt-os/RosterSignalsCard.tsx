'use client';

/**
 * Who to call — the roster's own signals, on the screen a trainer opens daily.
 *
 * ── Why this card exists ───────────────────────────────────────────────────
 *
 * GET /api/pt-os/signals has been sweeping the whole roster since the
 * training-signals work landed, and nothing rendered it. Measured on the live
 * database at the time: 1 client had trained in the last 7 days, 16 last
 * trained 15-30 days ago, 7 of those were still inside a paid term, and one
 * client had paid and never trained at all. Every one of those findings
 * existed server-side and no screen in the app showed a single one of them.
 *
 * Today lists who is IN. This lists who is not — which is the half a trainer
 * cannot see by looking around the gym floor.
 *
 * ── What this card is careful not to do ────────────────────────────────────
 *
 *  1. It does not re-sort. The server orders worst-first and, within a
 *     severity, longest-silence-first — including the client who has never
 *     trained, whose silence is the longest there is. Sorting again here is
 *     how this card and the endpoint would end up disagreeing about who to
 *     call first.
 *
 *  2. It does not merge the severities. The sweep deliberately separates a
 *     client who is paying and absent (chase them today) from one whose term
 *     simply finished (a win-back conversation, another day). Putting those in
 *     one list is how a trainer learns to ignore the list, so the quiet ones
 *     sit behind a disclosure that says how many there are.
 *
 *  3. It does not restate the evidence in its own words. `evidence` and
 *     `recommendation` are rendered as the server wrote them. A trainer who is
 *     about to phone a client needs the dates they will be asked about, not a
 *     paraphrase of them.
 *
 *  4. It does not report silence as "all clear". A client whose plateau could
 *     not be evaluated says so, and a failed request says the sweep did not
 *     come back rather than rendering an empty, reassuring list.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { m, useReducedMotion } from 'framer-motion';
import {
  AlertTriangle, Check, ChevronDown, ChevronRight, Info, OctagonAlert, PhoneCall,
  RotateCw,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { RosterSignalClient, RosterSignalSeverity, RosterSignalSweep } from '@/lib/api';
import { palette, rgba } from '@/lib/palette';

/**
 * How each severity is announced.
 *
 * Icon and word first, colour third. The rest of this app learned the same
 * lesson the hard way: a chip that says "urgent" only by being red says
 * nothing to a colour-blind trainer, and nothing at all in a screenshot
 * pasted into WhatsApp. `-text` tokens because the raw --danger / --warning
 * fills are 3.44:1 and 1.96:1 as text and the contrast test rejects them.
 *
 * `fill` is that same colour as a wash, which is what carries the severity at
 * a glance now that every finding sits in its own chip. The text still has to
 * hold the contrast on it; the wash is decoration, the word is the message.
 */
const TONE: Record<RosterSignalSeverity, { label: string; color: string; fill: string; Icon: typeof Info }> = {
  critical: {
    label: 'Urgent',
    color: 'var(--danger-text)',
    fill: rgba(palette.red[500], 0.10),
    Icon: OctagonAlert,
  },
  warning: {
    label: 'Watch',
    color: 'var(--warning-text)',
    fill: rgba(palette.amber[500], 0.14),
    Icon: AlertTriangle,
  },
  info: {
    label: 'Note',
    color: 'var(--text-secondary)',
    fill: rgba(palette.indigo[500], 0.08),
    Icon: Info,
  },
};

/** The hairline between the header, the rows and the footers. */
const DIVIDER = { borderTop: '1px solid var(--border)' } as const;

/** Two letters, so a row reads as a person before it is read as a record. */
function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}

export default function RosterSignalsCard() {
  const [sweep, setSweep] = useState<RosterSignalSweep | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [showQuiet, setShowQuiet] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const res = await api.pt.signals();
      const body = res?.data;
      // A 200 can still carry a malformed sweep — a bare object, an array, an
      // error envelope under the wrong status. The render below reads
      // `clients_detail.length`, so a body without that array is treated as
      // the failed read it is; one bad response must not take the app to its
      // error boundary. `data: null` keeps its old meaning: nothing to say.
      if (body == null) setSweep(null);
      else if (Array.isArray(body.clients_detail)) setSweep(body);
      else setFailed(true);
    } catch {
      // No toast. This card is below the fold of the screen a trainer opens to
      // start a session, and a toast about a secondary read would cover the
      // Start button. It says so in place instead, where it stays.
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /**
   * The cut between "today" and "when you get to it".
   *
   * Taken as a PREFIX of the server's list at the first `info` row, never as a
   * filter. A filter would silently reorder if the server's ordering ever
   * changed; a prefix cannot — whatever order arrives, it is the order shown.
   */
  const { urgent, quiet } = useMemo(() => {
    const rows = sweep?.clients_detail ?? [];
    const cut = rows.findIndex((r) => r.worst === 'info');
    return cut < 0
      ? { urgent: rows, quiet: [] as RosterSignalClient[] }
      : { urgent: rows.slice(0, cut), quiet: rows.slice(cut) };
  }, [sweep]);

  if (loading) return <SweepSkeleton />;

  if (failed) {
    return (
      <Shell accent={palette.amber[500]}>
        <div className="flex items-center gap-3 px-4 py-3.5 sm:px-5" style={DIVIDER}>
          <span
            aria-hidden
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
            style={{ background: rgba(palette.amber[500], 0.14), color: 'var(--warning-text)' }}
          >
            <AlertTriangle size={16} />
          </span>
          <p className="min-w-0 flex-1 text-[12px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            The roster sweep did not come back. Nobody has been cleared &mdash; this list is unknown, not empty.
          </p>
          <button
            type="button"
            onClick={load}
            className="flex h-[44px] shrink-0 cursor-pointer items-center gap-1.5 rounded-[13px] px-3.5 text-[12px] font-[750]"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-2)' }}
          >
            <RotateCw size={13} aria-hidden /> Retry
          </button>
        </div>
      </Shell>
    );
  }

  if (!sweep) return null;

  // A studio with nothing to flag still gets a line. "No card at all" and
  // "swept 34 clients and found nothing" are different answers, and only one
  // of them tells the trainer the sweep ran.
  if (!sweep.clients_detail.length) {
    return (
      <Shell accent={palette.emerald[500]} swept={sweep.clients} flagged={0}>
        <div className="flex items-start gap-3 px-4 py-4 sm:px-5" style={DIVIDER}>
          <span
            aria-hidden
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
            style={{ background: rgba(palette.emerald[500], 0.14), color: 'var(--success-text)' }}
          >
            <Check size={17} />
          </span>
          <p className="min-w-0 flex-1 text-[12.5px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {sweep.clients === 0
              ? 'No clients on the roster to sweep.'
              : `Swept ${sweep.clients} client${sweep.clients === 1 ? '' : 's'} — nothing to flag today.`}
            <NotAssessable n={sweep.not_assessable} />
          </p>
        </div>
      </Shell>
    );
  }

  // The card's own colour is the answer to "how bad is today": one urgent
  // client tints the whole surface, a roster that is merely quiet does not.
  const accent = sweep.critical > 0
    ? palette.red[500]
    : sweep.warning > 0 ? palette.amber[500] : palette.indigo[500];

  return (
    <Shell
      swept={sweep.clients}
      flagged={sweep.clients_with_signals}
      urgent={sweep.critical}
      accent={accent}
    >
      <div style={DIVIDER}>
        {urgent.map((c, i) => <ClientSignals key={c.client_id ?? `row-${i}`} c={c} i={i} />)}

        {quiet.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => setShowQuiet((v) => !v)}
              aria-expanded={showQuiet}
              className="flex min-h-[52px] w-full cursor-pointer items-center gap-2.5 px-4 py-3 text-left sm:px-5"
              style={{ color: 'var(--text-secondary)', borderTop: '1px solid var(--border)' }}
            >
              <span
                aria-hidden
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}
              >
                {showQuiet ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </span>
              {/* Says what they are, not just how many. A trainer who knows the
                  hidden rows are finished terms and stalled lifts can decide
                  whether to open them; "3 more" tells them nothing. */}
              <span className="flex-1 text-[12px] font-[700]">
                {quiet.length} more with nothing urgent &mdash; finished terms and training notes
              </span>
            </button>
            {showQuiet && quiet.map((c, i) => (
              <ClientSignals key={c.client_id ?? `quiet-${i}`} c={c} i={i} />
            ))}
          </>
        )}

        {sweep.not_assessable > 0 && (
          <p className="px-4 py-2.5 text-[11px] sm:px-5"
            style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}>
            <NotAssessable n={sweep.not_assessable} lead />
          </p>
        )}
      </div>
    </Shell>
  );
}

/** Stated, never implied: a client nothing could be computed for is not a client who is fine. */
function NotAssessable({ n, lead = false }: { n: number; lead?: boolean }) {
  if (!n) return null;
  return (
    <>
      {lead ? '' : ' '}
      {n} client{n === 1 ? '' : 's'} could not be assessed at all &mdash; nothing logged to read.
    </>
  );
}

function Shell({
  children, swept, flagged, urgent, accent = palette.indigo[500],
}: {
  children: React.ReactNode;
  swept?: number;
  flagged?: number;
  urgent?: number;
  accent?: string;
}) {
  return (
    <section className="mt-6" aria-labelledby="roster-signals-heading">
      <div
        className="overflow-hidden rounded-[26px]"
        style={{
          // A tinted wash rather than a second surface: the card still sits on
          // --bg-card, and the colour says how the sweep went before a word is
          // read. Anchored top-left so it fades out where the rows begin.
          background: `radial-gradient(130% 120% at 0% 0%, ${rgba(accent, 0.075)} 0%, transparent 52%), var(--bg-card)`,
          border: '1px solid var(--border)',
          boxShadow: `var(--shadow-card), 0 18px 40px -30px ${rgba(accent, 0.45)}`,
        }}
      >
        <header className="flex items-start gap-3 px-4 pb-3.5 pt-4 sm:px-5">
          <span
            aria-hidden
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] text-white"
            style={{
              background: `linear-gradient(150deg, ${palette.indigo[400]}, ${palette.indigo[700]})`,
              boxShadow: `0 10px 20px -8px ${rgba(palette.indigo[600], 0.65)}`,
            }}
          >
            <PhoneCall size={19} />
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <h2
              id="roster-signals-heading"
              className="text-[15px] font-[780] tracking-[-0.015em]"
              style={{ color: 'var(--text-primary)' }}
            >
              Who to call
            </h2>
            {swept !== undefined && (
              <p className="mt-0.5 text-[11.5px] font-[600]" style={{ color: 'var(--text-muted)' }}>
                {swept} swept
                {flagged ? ` · ${flagged} to call` : ''}
                {urgent ? ` · ${urgent} urgent` : ''}
              </p>
            )}
          </div>
          <Link
            href="/pt-os/clients/at-risk"
            className="shrink-0 self-center rounded-lg px-2 py-1.5 text-[11.5px] font-[700] hover:underline"
            style={{ color: 'var(--text-secondary)' }}
          >
            View all
          </Link>
          {flagged !== undefined && (
            <div
              className="flex shrink-0 flex-col items-center rounded-[16px] px-3.5 py-2"
              style={{ background: rgba(accent, 0.12), border: `1px solid ${rgba(accent, 0.18)}` }}
            >
              <span className="text-[22px] font-[800] leading-none tabular-nums" style={{ color: 'var(--text-primary)' }}>
                {flagged}
              </span>
              <span className="mt-1 text-[9.5px] font-[750] uppercase tracking-[0.08em]" style={{ color: 'var(--text-secondary)' }}>
                to call
              </span>
            </div>
          )}
        </header>
        {children}
      </div>
    </section>
  );
}

function ClientSignals({ c, i }: { c: RosterSignalClient; i: number }) {
  const reduce = useReducedMotion();
  const name = c.client_name ?? 'Unnamed client';
  const worst = TONE[c.worst ?? 'info'] ?? TONE.info;

  return (
    <m.div
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: reduce ? 0 : Math.min(i * 0.03, 0.2), duration: reduce ? 0 : 0.18 }}
      className="px-4 py-3.5 sm:px-5"
      style={{ borderTop: i === 0 ? undefined : '1px solid var(--border)' }}
    >
      <div className="flex items-start gap-3">
        {/* The severity, as a face: the first thing scanned on a phone, and the
            one mark that survives a screenshot. It restates what the chip below
            says in words, so it is hidden from screen readers. */}
        <span
          aria-hidden
          className="mt-px flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-[800]"
          style={{ background: worst.fill, color: worst.color }}
        >
          {initials(name)}
        </span>

        {/* Wide screens get a two-column row: the person on the left, what is
            wrong with them on the right. Stacked, a 1200px card leaves the
            evidence stranded in the first third of it. */}
        <div className="min-w-0 flex-1 sm:flex sm:items-start sm:gap-6">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 sm:w-[13.5rem] sm:shrink-0">
            {/* The name is the link, and it is a real one: a trainer reading
                "Paying, and stopped coming" wants the client's number, which is
                two taps away on their profile. */}
            {c.client_id ? (
              <Link
                href={`/pt-os/clients/${c.client_id}`}
                className="min-w-0 truncate text-[14px] font-[760] hover:underline"
                style={{ color: 'var(--text-primary)' }}
              >
                {name}
              </Link>
            ) : (
              <p className="min-w-0 truncate text-[14px] font-[760]" style={{ color: 'var(--text-primary)' }}>
                {name}
              </p>
            )}
            {/* The term, because it is the fact that decides whether the silence
                is a problem at all — and the one thing the trainer would
                otherwise have to open the profile to check before dialling. */}
            {c.term.state !== 'unknown' && (
              <span
                className="shrink-0 rounded-full px-2 py-[3px] text-[10.5px] font-[700] tabular-nums"
                style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}
              >
                {c.term.state === 'current'
                  ? `term to ${c.term.end}`
                  : `term ended ${c.term.end}`}
              </span>
            )}
          </div>

          <div className="mt-2 min-w-0 sm:mt-0 sm:flex-1">
            <ul className="space-y-2.5">
              {c.signals.map((s) => {
                const tone = TONE[s.severity] ?? TONE.info;
                return (
                  <li key={s.id}>
                    <span
                      className="inline-flex items-start gap-1.5 rounded-[11px] px-2.5 py-1 text-[12.5px] font-[700] leading-snug"
                      style={{ background: tone.fill, color: tone.color }}
                    >
                      <tone.Icon size={13} className="mt-[2px] shrink-0" aria-hidden />
                      <span>
                        <span className="sr-only">{tone.label}: </span>
                        {s.headline}
                      </span>
                    </span>
                    {/* Verbatim. This is the audit trail — the dates the client
                        will be asked about on the phone. */}
                    <p className="mt-1.5 text-[11.5px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {s.evidence}
                    </p>
                    <p className="text-[11.5px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                      {s.recommendation}
                    </p>
                  </li>
                );
              })}
            </ul>

            {/* What could NOT be checked on this client. Without it, a row
                showing only "gone quiet" reads as though the engine had looked
                at their progression and found it fine — on this studio's data
                it usually could not look at all. */}
            {c.unobservable.length > 0 && (
              <p className="mt-2 text-[10.5px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                Not checked: {summariseUnobservable(c.unobservable)}
              </p>
            )}
          </div>
        </div>
      </div>
    </m.div>
  );
}

/**
 * "plateau, regression — no lift has 3 logged sessions yet; deload — …"
 *
 * Grouped by reason rather than listed per signal, because the reason is
 * almost always shared and repeating it once per check turns one honest line
 * into four lines of boilerplate a trainer stops reading.
 */
export function summariseUnobservable(rows: Array<{ signal: string; reason: string }>): string {
  const byReason = new Map<string, string[]>();
  for (const r of rows) {
    if (!byReason.has(r.reason)) byReason.set(r.reason, []);
    byReason.get(r.reason)!.push(r.signal);
  }
  return [...byReason.entries()]
    .map(([reason, signals]) => `${signals.join(', ')} — ${reason}`)
    .join('; ');
}

function SweepSkeleton() {
  return (
    <Shell>
      <div className="animate-pulse px-4 py-3.5 sm:px-5" style={DIVIDER} aria-hidden>
        <div className="flex items-start gap-3">
          <span className="h-9 w-9 shrink-0 rounded-full" style={{ background: 'var(--bg-subtle)' }} />
          <div className="flex-1 space-y-2">
            <span className="block h-3 w-32 rounded-full" style={{ background: 'var(--bg-subtle)' }} />
            <span className="block h-2.5 w-52 rounded-full" style={{ background: 'var(--bg-subtle)' }} />
            <span className="block h-2.5 w-44 rounded-full" style={{ background: 'var(--bg-subtle)' }} />
          </div>
        </div>
      </div>
    </Shell>
  );
}
