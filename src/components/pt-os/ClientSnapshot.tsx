'use client';

// What the client profile tells a trainer, instead of making them remember it.
//
// ── What this replaces ─────────────────────────────────────────────────────
//
// Three donuts and a lifetime total. A donut of "activity mix" answers a
// question nobody asks — a trainer does not want the ratio of payments to
// check-ins, they want to know whether this person's term lapses next week and
// whether anyone has weighed them since March. That was all derivable from
// data already on the screen and none of it was said out loud, so it lived in
// somebody's head.
//
// ── Bars, not rings ────────────────────────────────────────────────────────
//
// A ring is a good shape for a share of a whole and a bad one for progress
// toward a target: you cannot see at a glance whether 68% is ahead of or
// behind where it should be, and there is nowhere to put the two numbers that
// make it mean anything. A bar has a start, an end, and room underneath for
// "started 80, now 73.2, target 70".
//
// ── Nothing is shown that was not measured ────────────────────────────────
//
// Every card here renders an explicit empty state rather than a zero. A zero
// in a progress bar and "nobody has recorded this" look identical, and the
// second one is an instruction to go and measure something.

import { useEffect, useState } from 'react';
import { m, useReducedMotion } from 'framer-motion';
import {
  AlertTriangle, ChevronRight, Target, Trophy, Sparkles, Info, Loader2,
} from 'lucide-react';
import { api } from '@/lib/api';
import type {
  ClientSnapshot as Snapshot, ClientAlert, ClientGoalProgress, ClientPr, CoachInsight,
} from '@/lib/api';

const EASE = [0.16, 1, 0.3, 1] as const;

const TONE: Record<string, { fg: string; bg: string; border: string }> = {
  critical: { fg: '#b91c1c', bg: 'rgba(220,38,38,0.08)', border: 'rgba(220,38,38,0.28)' },
  warning: { fg: '#b45309', bg: 'rgba(217,119,6,0.09)', border: 'rgba(217,119,6,0.26)' },
  info: { fg: '#1d4ed8', bg: 'rgba(37,99,235,0.07)', border: 'rgba(37,99,235,0.22)' },
};

export interface ClientSnapshotProps {
  clientId: string;
  /** Lets the profile hide "Baseline setup" once the client is onboarded. */
  onLoaded?: (snapshot: Snapshot) => void;
}

export default function ClientSnapshot({ clientId, onLoaded }: ClientSnapshotProps) {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.pt.snapshot(clientId)
      .then(({ data }) => {
        if (cancelled || !data || typeof data !== 'object') return;
        // Shape is read, not trusted: a partial payload must degrade to an
        // empty card, never take the profile to its error boundary.
        const safe: Snapshot = {
          alerts: Array.isArray(data.alerts) ? data.alerts : [],
          goal: data.goal && typeof data.goal === 'object' ? data.goal : { present: false },
          prs: Array.isArray(data.prs) ? data.prs : [],
          coach: Array.isArray(data.coach) ? data.coach : [],
          baseline_done: data.baseline_done === true,
        };
        setSnap(safe);
        onLoaded?.(safe);
      })
      .catch(() => { /* the profile still works without it; no toast for a side panel */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  if (loading) {
    return (
      <div className="mb-6 flex justify-center py-8">
        <Loader2 size={20} className="animate-spin" style={{ color: 'var(--brand)' }} />
      </div>
    );
  }
  if (!snap) return null;

  return (
    <div className="mb-5 space-y-3">
      <AttentionStrip alerts={snap.alerts} />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <GoalCard goal={snap.goal} clientId={clientId} />
        <CoachCard insights={snap.coach} />
      </div>
      <PrCard prs={snap.prs} clientId={clientId} />
    </div>
  );
}

/**
 * The row a trainer reads first.
 *
 * Ordered by severity, because the order is a claim about what to look at —
 * a lapsing term outranks a kilo of weight change. Each one links to the
 * screen where it gets dealt with; an alert you cannot act on is a nag.
 */
function AttentionStrip({ alerts }: { alerts: ClientAlert[] }) {
  const reduce = useReducedMotion();
  if (!alerts.length) {
    return (
      <div className="flex items-center gap-2.5 rounded-[16px] px-4 py-3"
        style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.22)' }}>
        <Info size={15} style={{ color: '#059669' }} />
        <p className="text-[12px] font-[680]" style={{ color: '#047857' }}>
          Nothing needs attention — term, payments, measurements and last session all look current.
        </p>
      </div>
    );
  }

  return (
    <div>
      <SectionHeading icon={<AlertTriangle size={14} style={{ color: '#d97706' }} />}
        tint="rgba(217,119,6,0.12)" border="rgba(217,119,6,0.2)"
        title={`Needs attention · ${alerts.length}`} />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {alerts.map((a, i) => {
          const tone = TONE[a.severity] ?? TONE.info;
          const body = (
            <>
              <span className="shrink-0 text-[13px] leading-none" aria-hidden>⚠</span>
              <span className="min-w-0">
                <span className="block text-[12px] font-[750] leading-tight">{a.label}</span>
                {a.detail && (
                  <span className="mt-0.5 block text-[10.5px] font-[600] opacity-80">{a.detail}</span>
                )}
              </span>
              {a.href && <ChevronRight size={13} className="ml-auto shrink-0 opacity-60" />}
            </>
          );
          const className = 'flex min-h-[44px] w-full items-center gap-2 rounded-[14px] px-3 py-2 text-left';
          const style = { background: tone.bg, border: `1px solid ${tone.border}`, color: tone.fg };
          return (
            <m.div key={a.id}
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 * i, duration: 0.26, ease: EASE }}>
              {a.href
                ? <a href={a.href} className={className} style={style}>{body}</a>
                : <div className={className} style={style}>{body}</div>}
            </m.div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * The goal, as a bar.
 *
 * The percentage is only drawn when the server could compute one. With no
 * starting weight on file there is no denominator, and a bar rendered against
 * a guessed baseline is worse than no bar — it looks measured.
 */
function GoalCard({ goal, clientId }: { goal: ClientGoalProgress; clientId: string }) {
  if (!goal?.present) {
    return (
      <Card title="Goal" icon={<Target size={16} />} from="#10b981" to="#059669">
        <Empty
          text="No goal set for this client yet."
          action={{ label: 'Set a goal', href: `/pt-os/goals?client_id=${clientId}` }}
        />
      </Card>
    );
  }

  const label = goal.goal_type
    ? String(goal.goal_type).replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())
    : 'Goal';
  const pct = typeof goal.pct === 'number' ? goal.pct : null;

  return (
    <Card title="Goal" icon={<Target size={16} />} from="#10b981" to="#059669"
      right={pct !== null
        ? <span className="shrink-0 text-[20px] font-[860] tabular-nums leading-none" style={{ color: '#059669' }}>{pct}%</span>
        : null}>
      <p className="text-[14px] font-[800] tracking-[-0.01em]" style={{ color: 'var(--text-primary)' }}>
        {label}
        {goal.target_kg != null && (
          <span className="ml-1.5 text-[12px] font-[650]" style={{ color: 'var(--text-muted)' }}>
            → {goal.target_kg} kg
          </span>
        )}
      </p>

      {pct !== null ? (
        <>
              <Bar pct={pct} colour="#059669" />
          <div className="mt-2.5 grid grid-cols-3 gap-2">
            <Stat label="Started" value={goal.start_kg != null ? `${goal.start_kg} kg` : '—'} />
            <Stat label="Current" value={goal.current_kg != null ? `${goal.current_kg} kg` : '—'}
              accent={goal.delta_kg != null
                ? `${goal.delta_kg > 0 ? '+' : ''}${goal.delta_kg} kg`
                : null} />
            <Stat label="To go" value={goal.remaining_kg != null ? `${Math.abs(goal.remaining_kg)} kg` : '—'} />
          </div>
        </>
      ) : (
        // Said plainly. "0%" here would be a claim about the client rather
        // than about the record.
        <Empty
          text={goal.target_kg == null
            ? 'No target weight on this goal, so there is nothing to measure against.'
            : 'No starting weight on file, so progress cannot be worked out yet.'}
          action={{ label: 'Record a measurement', href: `/pt-os/assessment?client_id=${clientId}` }}
        />
      )}

      {goal.target_date && (
        <p className="mt-2.5 text-[10.5px] font-[620]" style={{ color: 'var(--text-muted)' }}>
          Target date {goal.target_date}
        </p>
      )}
    </Card>
  );
}

/** Coaching prompts. Each carries the reading it came from. */
function CoachCard({ insights }: { insights: CoachInsight[] }) {
  return (
    <Card title="AI Coach" icon={<Sparkles size={16} />} from="#8b5cf6" to="#7c3aed">
      {insights.length === 0 ? (
        <Empty text="Not enough recorded yet to say anything useful. Log a session or take a measurement." />
      ) : (
        <div className="space-y-2">
          {insights.map((c) => (
            <div key={c.id} className="rounded-[12px] px-3 py-2.5"
              style={{
                background: c.tone === 'good' ? 'rgba(16,185,129,0.07)' : 'rgba(217,119,6,0.08)',
                border: `1px solid ${c.tone === 'good' ? 'rgba(16,185,129,0.2)' : 'rgba(217,119,6,0.22)'}`,
              }}>
              <p className="text-[12px] font-[680] leading-snug" style={{ color: 'var(--text-primary)' }}>
                {c.text}
              </p>
              {/* Traceable on purpose: a prompt a trainer cannot check is one
                  they cannot overrule, and these are suggestions, not orders. */}
              <p className="mt-1 text-[10px] font-[620]" style={{ color: 'var(--text-muted)' }}>{c.because}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/** The number a trainer gets asked for. */
function PrCard({ prs, clientId }: { prs: ClientPr[]; clientId: string }) {
  return (
    <Card title="Latest personal records" icon={<Trophy size={16} />} from="#f59e0b" to="#d97706">
      {prs.length === 0 ? (
        <Empty
          text="No records logged yet. They appear here as soon as a set beats what came before."
          action={{ label: 'Open the workout log', href: `/pt-os/clients/${clientId}/workout-log` }}
        />
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {prs.map((p) => (
            <div key={p.exercise} className="rounded-[14px] px-3 py-2.5"
              style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
              <p className="text-[9.5px] font-[700] uppercase leading-tight tracking-wide"
                style={{
                  color: 'var(--text-muted)',
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}
                title={p.exercise}>{p.exercise}</p>
              <p className="mt-1 text-[18px] font-[860] tabular-nums leading-none"
                style={{ color: 'var(--text-primary)' }}>
                {p.weight_kg}<span className="text-[11px] font-[700]"> kg</span>
              </p>
              <p className="mt-1 text-[9.5px] font-[620]" style={{ color: 'var(--text-muted)' }}>
                {[p.reps != null ? `× ${p.reps}` : null, p.achieved_on].filter(Boolean).join(' · ')}
              </p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ── Shared pieces ───────────────────────────────────────────────────────── */

function Bar({ pct, colour }: { pct: number; colour: string }) {
  const reduce = useReducedMotion();
  return (
    <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--bg-subtle)' }}
      role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <m.div
        initial={reduce ? false : { width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.6, ease: EASE }}
        className="h-full rounded-full"
        style={{ background: `linear-gradient(90deg, ${colour}, ${colour}bb)` }}
      />
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string | null }) {
  return (
    <div>
      <p className="text-[9.5px] font-[700] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="mt-0.5 text-[13px] font-[800] tabular-nums" style={{ color: 'var(--text-primary)' }}>{value}</p>
      {accent && <p className="text-[10px] font-[700]" style={{ color: '#059669' }}>{accent}</p>}
    </div>
  );
}

function Card({
  title, icon, from, to, right, children,
}: {
  title: string; icon: React.ReactNode; from: string; to: string;
  right?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <m.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
      className="rounded-[22px] bg-white p-4 sm:p-5"
      style={{ border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
      {/* The page's own card header: a gradient chip with a coloured shadow and
          a rule under the title. The first cut used flat pastel squares and a
          smaller radius, which read as a different product bolted onto this one. */}
      <div className="mb-3.5 flex items-center gap-2.5 pb-3.5" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]"
          style={{ background: `linear-gradient(135deg, ${from}, ${to})`, boxShadow: `0 3px 12px ${from}45` }}>
          <span className="text-white">{icon}</span>
        </div>
        <h3 className="min-w-0 flex-1 truncate text-[13.5px] font-[740] text-gray-900">{title}</h3>
        {right}
      </div>
      {children}
    </m.div>
  );
}

function SectionHeading({
  icon, title, tint, border,
}: { icon: React.ReactNode; title: string; tint: string; border: string }) {
  return (
    <div className="mb-2.5 flex items-center gap-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-[10px]"
        style={{ background: tint, border: `1px solid ${border}` }}>{icon}</div>
      <h3 className="text-[13.5px] font-[740]" style={{ color: 'var(--text-primary)' }}>{title}</h3>
    </div>
  );
}

/** An empty state that says what to do, not just that there is nothing. */
function Empty({ text, action }: { text: string; action?: { label: string; href: string } }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="max-w-[42ch] text-[11.5px]" style={{ color: 'var(--text-muted)' }}>{text}</p>
      {action && (
        <a href={action.href}
          className="flex h-[44px] items-center gap-1 rounded-[10px] px-3 text-[11px] font-[720]"
          style={{ color: 'var(--brand)' }}>
          {action.label} <ChevronRight size={12} />
        </a>
      )}
    </div>
  );
}
