'use client';

// Command Center — the Alert Center.
//
// Sits above the status cards, because the cards answer "what is the state of
// everything" and this answers "what needs me". During an incident the second
// question is the only one being asked.
//
// ── What this screen is designed against ────────────────────────────────────
//
// Alert fatigue. The server does the hard part — one alert per condition,
// announced once, auto-closed when it clears — and the UI's job is not to undo
// that by being loud anyway. So:
//
//   * When nothing is wrong this collapses to a single quiet line. An empty
//     Alert Center should look like good news, not like a broken panel.
//   * Acknowledged alerts drop to the bottom and lose their tint. They are
//     still tracked (the server keeps counting occurrences) but they are no
//     longer asking for anything.
//   * `occurrences` and "first seen" are shown on every row, because the
//     difference between a problem that happened twice and one that has been
//     happening for nine hours is the entire triage decision, and a naive
//     alert list hides it by showing only the latest timestamp.
//   * History is behind a toggle, not on screen by default. Resolved alerts
//     are for asking "has Redis done this before", which is a question you go
//     looking for.
//
// The resolution kind is shown deliberately: a history full of `manual`
// closures means the detection is wrong, and that is only visible if a human
// closing an alert looks different from the condition clearing itself.

import { useCallback, useEffect, useState } from 'react';
import { m } from 'framer-motion';
import {
  AlertTriangle, BellOff, Check, CheckCircle2, ChevronDown, ChevronUp,
  Clock, History, Timer, UserCheck, X, XCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { semantic, rgba } from '@/lib/palette';
import type { SystemAlert, SystemAlertList, SystemAlertSeverity } from '@/lib/api';

const POLL_MS = 15_000;

const SEVERITY: Record<SystemAlertSeverity, { color: string; label: string; Icon: typeof XCircle }> = {
  critical: { color: semantic.danger, label: 'Critical', Icon: XCircle },
  timeout: { color: semantic.warningLo, label: 'Timed out', Icon: Timer },
  warning: { color: semantic.warning, label: 'Warning', Icon: AlertTriangle },
};

function toneFor(a: SystemAlert) {
  return SEVERITY[a.severity] ?? SEVERITY.warning;
}

/**
 * "9h ago", "4m ago", "just now" — a duration an operator reads at a glance.
 *
 * The suffix belongs HERE rather than at the call site. It used to be appended
 * by the caller (`last {ago(x)} ago`), which read correctly for every branch
 * except the one that matters most: a brand-new alert rendered as
 * "last just now ago". The only branch that must not take the suffix is the
 * only branch a live incident actually shows.
 */
function ago(iso: string | null): string {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return '—';
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/**
 * Ack / Close.
 *
 * `py-2.5` on the phone is not decoration: at py-1.5 these were 28px tall,
 * well under the 44px Apple and Google both ask for, and they sit next to each
 * other — a mis-tap closes an alert instead of acknowledging it.
 */
const ACTION_BTN =
  'flex flex-1 items-center justify-center gap-1 rounded-[10px] px-3 py-2.5 text-[12px] '
  + 'font-[650] disabled:opacity-50 sm:flex-none sm:rounded-[9px] sm:px-2 sm:py-1.5 sm:text-[11.5px]';

function AlertRow({
  alert, busy, onAck, onResolve,
}: {
  alert: SystemAlert;
  busy: boolean;
  onAck: () => void;
  onResolve: () => void;
}) {
  const tone = toneFor(alert);
  const { Icon } = tone;
  const acked = alert.status === 'acknowledged';
  const done = alert.status === 'resolved';

  return (
    <m.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="rounded-[14px] p-3.5"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        // An acknowledged alert keeps its hairline but loses the fill: somebody
        // has it, so it should stop competing for attention with the ones
        // nobody has picked up.
        boxShadow: done ? undefined : `inset 3px 0 0 0 ${tone.color}`,
        opacity: done ? 0.7 : acked ? 0.85 : 1,
      }}
    >
      {/* ── Why this stacks below sm ──────────────────────────────────────
          Side by side, the action cluster keeps its full width (it is
          flex-shrink-0 — it has to be, or the buttons crush) and the text
          column absorbs the whole squeeze. On a 390px phone that left the
          title and the collector's sentence about 180px, so "Email delivery
          problem" wrapped to two lines and its reason to three, and a card
          that is two lines on a laptop became eight.
          Stacked, the sentence gets the full width and the buttons get real
          tap targets instead of 28px-tall ones. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-2.5">
          <span className="mt-0.5 grid h-7 w-7 flex-shrink-0 place-items-center rounded-[9px]"
            style={{ background: done ? 'var(--bg-subtle)' : rgba(tone.color, 0.10) }}>
            {done
              ? <CheckCircle2 size={14} color={semantic.success} />
              : <Icon size={14} color={tone.color} />}
          </span>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p className="text-[13.5px] font-[750]" style={{ color: 'var(--text-primary)' }}>
                {alert.title}
              </p>
              <span className="rounded-full px-1.5 py-0.5 text-[9.5px] font-[750] uppercase tracking-wide"
                style={{ background: rgba(tone.color, 0.10), color: tone.color }}>
                {tone.label}
              </span>
              {acked && (
                <span className="flex items-center gap-1 text-[10.5px] font-[650]"
                  style={{ color: 'var(--text-tertiary)' }}>
                  <UserCheck size={11} />
                  {alert.acknowledged_by_name ?? 'acknowledged'}
                </span>
              )}
              {done && (
                // auto vs manual, always. A history full of manual closures
                // means the detection is wrong, and nothing else would show it.
                <span className="rounded-full px-1.5 py-0.5 text-[9.5px] font-[700] uppercase tracking-wide"
                  style={{ background: 'var(--bg-subtle)', color: 'var(--text-tertiary)' }}>
                  {alert.resolution === 'auto' ? 'cleared itself' : 'closed by hand'}
                </span>
              )}
            </div>

            {/* The collector's sentence. Never paraphrased here — it was
                written once, by the code that knows why. */}
            {alert.reason && (
              <p className="mt-1 text-[12px] leading-snug" style={{ color: 'var(--text-secondary)' }}>
                {alert.reason}
              </p>
            )}

            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px]"
              style={{ color: 'var(--text-tertiary)' }}>
              <span className="flex items-center gap-1">
                <Clock size={10} />
                {/* Both, on purpose: "twice in 4 minutes" and "1,204 times over
                    9 hours" are the same alert to a list that shows only the
                    latest timestamp, and completely different to a human. */}
                seen {alert.occurrences.toLocaleString('en-IN')}×, first {ago(alert.first_seen_at)}
              </span>
              <span>last {ago(alert.last_seen_at)}</span>
              <span>source: {alert.source}</span>
            </p>
          </div>
        </div>

        {!done && (
          // flex-1 on the phone so Ack and Close split the row evenly; on a
          // laptop they go back to hugging their labels.
          <div className="flex flex-shrink-0 items-center gap-2 sm:gap-1.5">
            {!acked && (
              <button
                onClick={onAck}
                disabled={busy}
                title="Seen — I am on it. The alert keeps tracking the condition."
                className={ACTION_BTN}
                style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              >
                <Check size={12} /> Ack
              </button>
            )}
            <button
              onClick={onResolve}
              disabled={busy}
              title="Close it. If the condition is still true it will re-open."
              className={ACTION_BTN}
              style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            >
              <X size={12} /> Close
            </button>
          </div>
        )}
      </div>
    </m.div>
  );
}

export default function AlertCenter({ onChanged }: { onChanged?: () => void }) {
  const [live, setLive] = useState<SystemAlertList | null>(null);
  const [history, setHistory] = useState<SystemAlert[] | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api.superAdmin.commandCenterAlerts({ scope: 'live' });
      setLive(res.data);
      setError('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load alerts');
    }
  }, []);

  useEffect(() => {
    let alive = true;
    const tick = () => { if (alive) load(); };
    tick();
    const id = setInterval(tick, POLL_MS);
    return () => { alive = false; clearInterval(id); };
  }, [load]);

  const loadHistory = useCallback(async () => {
    try {
      const res = await api.superAdmin.commandCenterAlerts({ scope: 'resolved', limit: 50 });
      setHistory(res.data.alerts);
    } catch {
      setHistory([]);
    }
  }, []);

  const act = useCallback(async (id: string, what: 'ack' | 'resolve') => {
    setBusy(id);
    try {
      if (what === 'ack') await api.superAdmin.acknowledgeAlert(id);
      else await api.superAdmin.resolveAlert(id);
      await load();
      if (showHistory) await loadHistory();
      onChanged?.();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(null);
    }
  }, [load, loadHistory, showHistory, onChanged]);

  if (!live && !error) {
    return <div className="h-[52px] animate-pulse rounded-[14px]"
      style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }} />;
  }

  const alerts = live?.alerts ?? [];
  // Unacknowledged first, then by severity. Somebody has already picked up the
  // acknowledged ones; they should not sit above alerts nobody has touched.
  const rank: Record<string, number> = { critical: 0, timeout: 1, warning: 2 };
  const sorted = [...alerts].sort((a, b) => {
    const aAck = a.status === 'acknowledged' ? 1 : 0;
    const bAck = b.status === 'acknowledged' ? 1 : 0;
    if (aAck !== bAck) return aAck - bAck;
    return (rank[a.severity] ?? 9) - (rank[b.severity] ?? 9);
  });

  const stats = live?.stats;
  const quiet = sorted.length === 0;

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] px-3.5 py-2.5"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: stats?.critical ? `inset 3px 0 0 0 ${semantic.danger}` : undefined,
        }}>
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-[10px]"
            style={{ background: quiet ? rgba(semantic.success, 0.10) : rgba(semantic.danger, 0.10) }}>
            {quiet
              ? <BellOff size={15} color={semantic.success} />
              : <AlertTriangle size={15} color={semantic.danger} />}
          </span>
          <div>
            <p className="text-[14px] font-[800]" style={{ color: 'var(--text-primary)' }}>
              {/* An empty Alert Center should read as good news, not as a
                  panel that failed to load. */}
              {quiet ? 'No open alerts' : `${sorted.length} open alert${sorted.length === 1 ? '' : 's'}`}
            </p>
            <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
              {quiet
                ? 'Checked every minute, whether or not this page is open'
                : [
                  stats?.critical ? `${stats.critical} critical` : null,
                  stats?.acknowledged ? `${stats.acknowledged} acknowledged` : null,
                  stats?.resolved_24h ? `${stats.resolved_24h} cleared in 24h` : null,
                ].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>

        <button
          onClick={() => { setShowHistory((s) => !s); if (!history) loadHistory(); }}
          className="flex items-center gap-1.5 rounded-[10px] px-2.5 py-1.5 text-[11.5px] font-[650]"
          style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
        >
          <History size={12} />
          History
          {showHistory ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

      {error && (
        <p className="rounded-[10px] px-3 py-2 text-[11.5px]"
          style={{ background: rgba(semantic.danger, 0.08), color: semantic.danger }}>
          {error}
        </p>
      )}

      {sorted.map((a) => (
        <AlertRow
          key={a.id}
          alert={a}
          busy={busy === a.id}
          onAck={() => act(a.id, 'ack')}
          onResolve={() => act(a.id, 'resolve')}
        />
      ))}

      {showHistory && (
        <div className="space-y-2.5 pt-1">
          <p className="text-[11px] font-[650] uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
            Resolved
          </p>
          {history === null && <div className="h-[60px] animate-pulse rounded-[14px]" style={{ background: 'var(--bg-subtle)' }} />}
          {history?.length === 0 && (
            <p className="text-[11.5px]" style={{ color: 'var(--text-tertiary)' }}>Nothing has alerted yet.</p>
          )}
          {history?.map((a) => (
            <AlertRow key={a.id} alert={a} busy={false} onAck={() => {}} onResolve={() => {}} />
          ))}
        </div>
      )}
    </div>
  );
}
