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
  AlertTriangle, ChevronDown, ChevronRight, Info, OctagonAlert, PhoneCall,
  RotateCw,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { RosterSignalClient, RosterSignalSeverity, RosterSignalSweep } from '@/lib/api';

/**
 * How each severity is announced.
 *
 * Icon and word first, colour third. The rest of this app learned the same
 * lesson the hard way: a chip that says "urgent" only by being red says
 * nothing to a colour-blind trainer, and nothing at all in a screenshot
 * pasted into WhatsApp. `-text` tokens because the raw --danger / --warning
 * fills are 3.44:1 and 1.96:1 as text and the contrast test rejects them.
 */
const TONE: Record<RosterSignalSeverity, { label: string; color: string; Icon: typeof Info }> = {
  critical: { label: 'Urgent', color: 'var(--danger-text)', Icon: OctagonAlert },
  warning: { label: 'Watch', color: 'var(--warning-text)', Icon: AlertTriangle },
  info: { label: 'Note', color: 'var(--text-secondary)', Icon: Info },
};

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
      setSweep(res?.data ?? null);
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
      <Shell>
        <div className="flex items-center gap-2.5 px-3.5 py-3">
          <p className="min-w-0 flex-1 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
            The roster sweep did not come back. Nobody has been cleared &mdash; this list is unknown, not empty.
          </p>
          <button
            type="button"
            onClick={load}
            className="flex h-[36px] shrink-0 cursor-pointer items-center gap-1.5 rounded-[11px] px-3 text-[12px] font-[700]"
            style={{ background: 'var(--bg-subtle)', color: 'var(--text-primary)', border: '1px solid var(--border-2)' }}
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
      <Shell>
        <p className="px-3.5 py-3 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
          {sweep.clients === 0
            ? 'No clients on the roster to sweep.'
            : `Swept ${sweep.clients} client${sweep.clients === 1 ? '' : 's'} — nothing to flag today.`}
          <NotAssessable n={sweep.not_assessable} />
        </p>
      </Shell>
    );
  }

  return (
    <Shell
      count={sweep.clients_with_signals}
      total={sweep.clients}
      critical={sweep.critical}
    >
      <div className="flex flex-col">
        {urgent.map((c, i) => <ClientSignals key={c.client_id ?? `row-${i}`} c={c} i={i} />)}

        {quiet.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => setShowQuiet((v) => !v)}
              aria-expanded={showQuiet}
              className="flex h-[44px] w-full cursor-pointer items-center gap-1.5 px-3.5 text-left text-[12px] font-[700]"
              style={{ color: 'var(--text-secondary)', borderTop: '1px solid var(--border)' }}
            >
              {showQuiet ? <ChevronDown size={14} aria-hidden /> : <ChevronRight size={14} aria-hidden />}
              {/* Says what they are, not just how many. A trainer who knows the
                  hidden rows are finished terms and stalled lifts can decide
                  whether to open them; "3 more" tells them nothing. */}
              {quiet.length} more with nothing urgent &mdash; finished terms and training notes
            </button>
            {showQuiet && quiet.map((c, i) => (
              <ClientSignals key={c.client_id ?? `quiet-${i}`} c={c} i={i} />
            ))}
          </>
        )}

        {sweep.not_assessable > 0 && (
          <p className="px-3.5 py-2.5 text-[11px]"
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
  children, count, total, critical,
}: { children: React.ReactNode; count?: number; total?: number; critical?: number }) {
  return (
    <section className="mt-5" aria-labelledby="roster-signals-heading">
      <div className="mb-2 flex items-baseline gap-2">
        <h2
          id="roster-signals-heading"
          className="flex items-center gap-1.5 text-[11px] font-[700] uppercase tracking-wide"
          style={{ color: 'var(--text-muted)' }}
        >
          <PhoneCall size={12} aria-hidden /> Who to call
        </h2>
        {count !== undefined && total !== undefined && (
          <span className="text-[11px] font-[650] tabular-nums" style={{ color: 'var(--text-muted)' }}>
            {count} of {total}
            {critical ? ` · ${critical} urgent` : ''}
          </span>
        )}
      </div>
      <div className="overflow-hidden rounded-[18px]"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        {children}
      </div>
    </section>
  );
}

function ClientSignals({ c, i }: { c: RosterSignalClient; i: number }) {
  const reduce = useReducedMotion();
  const name = c.client_name ?? 'Unnamed client';

  return (
    <m.div
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: reduce ? 0 : Math.min(i * 0.03, 0.2), duration: reduce ? 0 : 0.18 }}
      className="px-3.5 py-3"
      style={{ borderTop: i === 0 ? undefined : '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-2">
        {/* The name is the link, and it is a real one: a trainer reading
            "Paying, and stopped coming" wants the client's number, which is
            two taps away on their profile. */}
        {c.client_id ? (
          <Link
            href={`/pt-os/clients/${c.client_id}`}
            className="min-w-0 flex-1 truncate text-[13.5px] font-[750] hover:underline"
            style={{ color: 'var(--text-primary)' }}
          >
            {name}
          </Link>
        ) : (
          <p className="min-w-0 flex-1 truncate text-[13.5px] font-[750]" style={{ color: 'var(--text-primary)' }}>
            {name}
          </p>
        )}
        {/* The term, because it is the fact that decides whether the silence is
            a problem at all — and the one thing the trainer would otherwise
            have to open the profile to check before dialling. */}
        {c.term.state !== 'unknown' && (
          <span className="shrink-0 text-[10.5px] font-[650] tabular-nums" style={{ color: 'var(--text-muted)' }}>
            {c.term.state === 'current'
              ? `term to ${c.term.end}`
              : `term ended ${c.term.end}`}
          </span>
        )}
      </div>

      <ul className="mt-1.5 space-y-2">
        {c.signals.map((s) => {
          const tone = TONE[s.severity] ?? TONE.info;
          return (
            <li key={s.id}>
              <p className="flex items-start gap-1.5 text-[12.5px] font-[700]" style={{ color: tone.color }}>
                <tone.Icon size={13} className="mt-[2px] shrink-0" aria-hidden />
                <span>
                  <span className="sr-only">{tone.label}: </span>
                  {s.headline}
                </span>
              </p>
              {/* Verbatim. This is the audit trail — the dates the client will
                  be asked about on the phone. */}
              <p className="pl-[18px] text-[11.5px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {s.evidence}
              </p>
              <p className="pl-[18px] text-[11.5px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                {s.recommendation}
              </p>
            </li>
          );
        })}
      </ul>

      {/* What could NOT be checked on this client. Without it, a row showing
          only "gone quiet" reads as though the engine had looked at their
          progression and found it fine — on this studio's data it usually
          could not look at all. */}
      {c.unobservable.length > 0 && (
        <p className="mt-1.5 text-[10.5px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          Not checked: {summariseUnobservable(c.unobservable)}
        </p>
      )}
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
      <div className="animate-pulse space-y-2 px-3.5 py-3" aria-hidden>
        <span className="block h-3 w-32 rounded-full" style={{ background: 'var(--bg-subtle)' }} />
        <span className="block h-2.5 w-52 rounded-full" style={{ background: 'var(--bg-subtle)' }} />
        <span className="block h-2.5 w-44 rounded-full" style={{ background: 'var(--bg-subtle)' }} />
      </div>
    </Shell>
  );
}
