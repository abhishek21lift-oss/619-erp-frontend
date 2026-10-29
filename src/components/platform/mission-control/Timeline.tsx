'use client';
/**
 * What changed, in one list.
 *
 * The question an operator asks after "what is broken" is "what happened just
 * before that", and it is answered from two stores that already exist: alert
 * lifecycle events and audited operator commands. This panel is deliberately
 * an ORDERED LIST, not another status card — its job is sequence, so the one
 * meaningful design decision is that everything shares a single time axis.
 *
 * `ongoing` is the alert that opened before the selected window and is still
 * firing. It is rendered as a live event rather than dropped, because the
 * three-day incident is the one that must not disappear from a 24h view.
 */

import React, { useEffect, useState } from 'react';
import {
  Activity, AlertTriangle, CheckCircle2, History, Loader2, Terminal, UserCheck, XCircle,
  type LucideIcon,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { CommandCenterTimelineEvent, CommandCenterTimelineSeverity } from '@/lib/api';
import { rgba, semantic } from '@/lib/palette';
import { errorMessage } from '@/lib/forms/errors';

const POLL_MS = 30_000;
const WINDOWS = [{ hours: 24, label: '24h' }, { hours: 168, label: '7d' }] as const;

const severityColor = (severity: CommandCenterTimelineSeverity): string => {
  if (severity === 'critical') return semantic.danger;
  if (severity === 'timeout') return semantic.warningLo;
  if (severity === 'warning') return semantic.warning;
  return semantic.muted;
};

function look(event: CommandCenterTimelineEvent): { Icon: LucideIcon; color: string; label: string } {
  switch (event.event) {
    case 'opened':
      return { Icon: AlertTriangle, color: severityColor(event.severity), label: 'Opened' };
    case 'ongoing':
      return { Icon: Activity, color: severityColor(event.severity), label: 'Still firing' };
    case 'acknowledged':
      return { Icon: UserCheck, color: semantic.muted, label: 'Acknowledged' };
    case 'resolved':
      return { Icon: CheckCircle2, color: semantic.success, label: 'Resolved' };
    default:
      return event.outcome === 'error'
        ? { Icon: XCircle, color: semantic.danger, label: 'Failed' }
        : { Icon: Terminal, color: semantic.muted, label: 'Command' };
  }
}

const when = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export const Timeline: React.FC = () => {
  const [hours, setHours] = useState(24);
  const [events, setEvents] = useState<CommandCenterTimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    const load = async () => {
      try {
        const res = await api.superAdmin.commandCenterTimeline({ hours, limit: 40 });
        if (!live) return;
        setEvents(res.data.events);
        setError(null);
      } catch (err) {
        if (live) setError(errorMessage(err, 'Could not load the timeline'));
      } finally {
        if (live) setLoading(false);
      }
    };
    setLoading(true);
    load();
    const timer = setInterval(load, POLL_MS);
    return () => { live = false; clearInterval(timer); };
  }, [hours, attempt]);

  return (
    <section
      className="overflow-hidden rounded-[16px]"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
      aria-labelledby="command-center-timeline-title"
    >
      <header className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-[10px]" style={{ background: 'var(--bg-subtle)' }}>
            <History size={15} style={{ color: 'var(--text-tertiary)' }} />
          </span>
          <div>
            <h3 id="command-center-timeline-title" className="text-[13.5px] font-[800]"
              style={{ color: 'var(--text-primary)' }}>
              Incident timeline
            </h3>
            <p className="text-[10.5px]" style={{ color: 'var(--text-tertiary)' }}>
              Alerts and operator actions, newest first
            </p>
          </div>
        </div>

        <div className="flex gap-1 rounded-[10px] p-0.5" style={{ background: 'var(--bg-subtle)' }}
          role="group" aria-label="Timeline window">
          {WINDOWS.map((w) => (
            <button
              key={w.hours}
              type="button"
              onClick={() => setHours(w.hours)}
              aria-pressed={hours === w.hours}
              className="rounded-[8px] px-2.5 py-1 text-[10.5px] font-[800]"
              style={{
                background: hours === w.hours ? 'var(--surface)' : 'transparent',
                color: hours === w.hours ? 'var(--text-primary)' : 'var(--text-tertiary)',
              }}
            >
              {w.label}
            </button>
          ))}
        </div>
      </header>

      {loading && events.length === 0 ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={18} className="animate-spin" style={{ color: 'var(--text-tertiary)' }} />
        </div>
      ) : error ? (
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-[11.5px]">
          <span style={{ color: semantic.dangerLo }}>{error}</span>
          <button type="button" onClick={() => setAttempt((n) => n + 1)}
            className="rounded-[8px] px-2.5 py-1 text-[11px] font-[700]"
            style={{ border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
            Retry
          </button>
        </div>
      ) : events.length === 0 ? (
        <p className="px-4 py-4 text-[11.5px]" style={{ color: 'var(--text-tertiary)' }}>
          Nothing recorded in this window.
        </p>
      ) : (
        <ol className="max-h-[360px] overflow-y-auto">
          {events.map((event) => {
            const { Icon, color, label } = look(event);
            return (
              <li key={event.id} className="flex gap-3 px-4 py-2.5"
                style={{ borderTop: '1px solid var(--border)' }}>
                <span className="mt-0.5 grid h-6 w-6 flex-shrink-0 place-items-center rounded-full"
                  style={{ background: rgba(color, 0.10) }}>
                  <Icon size={12} style={{ color }} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <p className="text-[12px] font-[700]" style={{ color: 'var(--text-primary)' }}>
                      {event.title}
                    </p>
                    <span className="text-[9.5px] font-[800] uppercase tracking-wide" style={{ color }}>
                      {label}
                    </span>
                    <time className="ml-auto whitespace-nowrap text-[10px] tabular-nums"
                      dateTime={event.at} style={{ color: 'var(--text-tertiary)' }}>
                      {when(event.at)}
                    </time>
                  </div>
                  {event.detail && (
                    <p className="mt-0.5 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                      {event.detail}
                    </p>
                  )}
                  <p className="mt-0.5 text-[9.5px]" style={{ color: 'var(--text-disabled)' }}>
                    {event.kind === 'alert' ? `alert · ${event.source}` : `command · ${event.source}`}
                    {event.actor ? ` · ${event.actor}` : ''}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
};

export default Timeline;
