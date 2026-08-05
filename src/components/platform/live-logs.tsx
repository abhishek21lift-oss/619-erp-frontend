'use client';

// Command Center — Live Logs (decision D4).
//
// Two tabs, because the two halves of the hybrid answer different questions and
// merging them into one stream would misrepresent both:
//
//   Live      the API process's in-memory ring. Everything recent, including
//             info and debug. Empty after a deploy. Fast, lossy, and the thing
//             you watch while reproducing a bug.
//   History   `system_logs`. Errors and above only, durable across restarts,
//             and — the part that matters — the ONLY place the worker
//             container's errors are visible at all.
//
// ── The thing this screen must not let happen ───────────────────────────────
//
// An operator looks at the live tail during a queue incident, sees nothing from
// the worker, and concludes the worker is dead or not logging. It is neither:
// the worker is a separate container with its own memory, and the API cannot
// read it. So the scope is stated on the tab itself, not buried in a tooltip,
// and the History tab leads with how many of its lines came from the worker.
//
// ── Following ───────────────────────────────────────────────────────────────
//
// Auto-scroll is off the moment the operator scrolls up, and does not resume
// until they scroll back to the bottom. A log viewer that yanks you back to the
// end while you are reading the line you just found is a log viewer people stop
// using.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, ArrowDownToLine, Database, Info, Pause, Play,
  ScrollText, Search, Server, XCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { semantic, rgba } from '@/lib/palette';
import type { LogLine, LogTail, LogHistory, PersistedLogLine } from '@/lib/api';

const POLL_MS = 3_000;

/** Pino levels. Colour carries the same meaning as everywhere else on the console. */
const LEVEL_TONE: Record<number, { color: string; label: string }> = {
  10: { color: semantic.muted, label: 'trace' },
  20: { color: semantic.muted, label: 'debug' },
  30: { color: semantic.primary, label: 'info' },
  40: { color: semantic.warning, label: 'warn' },
  50: { color: semantic.danger, label: 'error' },
  60: { color: semantic.dangerLo, label: 'fatal' },
};

const toneFor = (level: number) => LEVEL_TONE[level] ?? LEVEL_TONE[30];

const FILTERS = [
  { key: '', label: 'All' },
  { key: 'info', label: 'Info+' },
  { key: 'warn', label: 'Warn+' },
  { key: 'error', label: 'Errors' },
] as const;

function clockOf(v: number | string): string {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '--:--:--' : d.toLocaleTimeString('en-GB', { hour12: false });
}

/** Context rendered compactly — a log viewer is not a JSON inspector. */
function contextText(ctx: unknown): string {
  if (!ctx || typeof ctx !== 'object') return '';
  const parts = Object.entries(ctx as Record<string, unknown>)
    .map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : String(v)}`);
  return parts.join(' ');
}

function Row({ time, level, msg, context, source }: {
  time: number | string; level: number; msg: string; context: unknown; source?: string;
}) {
  const tone = toneFor(level);
  const ctx = contextText(context);

  return (
    <div className="flex gap-2 px-2.5 py-[3px] font-mono text-[11px] leading-relaxed">
      <span className="flex-shrink-0 tabular-nums" style={{ color: 'var(--text-tertiary)' }}>
        {clockOf(time)}
      </span>
      <span className="w-[42px] flex-shrink-0 font-[700] uppercase" style={{ color: tone.color }}>
        {tone.label}
      </span>
      {source && (
        <span className="w-[46px] flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>
          {source}
        </span>
      )}
      <span className="min-w-0 break-words" style={{ color: 'var(--text-primary)' }}>
        {msg}
        {ctx && <span style={{ color: 'var(--text-tertiary)' }}> · {ctx}</span>}
      </span>
    </div>
  );
}

export default function LiveLogs() {
  const [tab, setTab] = useState<'live' | 'history'>('live');
  const [level, setLevel] = useState<string>('');
  const [query, setQuery] = useState('');
  const [paused, setPaused] = useState(false);

  const [tail, setTail] = useState<LogTail | null>(null);
  const [history, setHistory] = useState<LogHistory | null>(null);
  const [error, setError] = useState('');

  const scroller = useRef<HTMLDivElement | null>(null);
  // Ref, not state: the poll closes over it and must not restart when it flips.
  const following = useRef(true);

  const loadTail = useCallback(async () => {
    try {
      const res = await api.superAdmin.commandCenterLogs({ level, q: query, limit: 300 });
      setTail(res.data);
      setError('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load logs');
    }
  }, [level, query]);

  const loadHistory = useCallback(async () => {
    try {
      const res = await api.superAdmin.commandCenterLogHistory({ q: query, limit: 200 });
      setHistory(res.data);
      setError('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load log history');
    }
  }, [query]);

  useEffect(() => {
    let alive = true;
    const tick = () => {
      if (!alive) return;
      if (tab === 'history') { loadHistory(); return; }
      // Pausing stops the REQUEST, not just the render — a paused tail should
      // not keep polling a box that is already under strain.
      if (!paused) loadTail();
    };
    tick();
    const id = setInterval(tick, POLL_MS);
    return () => { alive = false; clearInterval(id); };
  }, [tab, paused, loadTail, loadHistory]);

  // Keep the newest line in view, but only while the operator is already at the
  // bottom. Yanking them back while they read is how a log viewer loses users.
  useEffect(() => {
    if (tab !== 'live' || !following.current) return;
    const el = scroller.current;
    if (el) el.scrollTop = 0;   // newest-first, so "the end" is the top
  }, [tail, tab]);

  const onScroll = useCallback(() => {
    const el = scroller.current;
    if (el) following.current = el.scrollTop < 24;
  }, []);

  const liveLines: LogLine[] = useMemo(() => tail?.lines ?? [], [tail]);
  const histLines: PersistedLogLine[] = useMemo(() => history?.lines ?? [], [history]);
  const ring = tail?.stats;
  const capture = tail?.capture;

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] px-3.5 py-2.5"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-[10px]"
            style={{ background: rgba(semantic.primary, 0.10) }}>
            <ScrollText size={15} color={semantic.primary} />
          </span>
          <div>
            <p className="text-[14px] font-[800]" style={{ color: 'var(--text-primary)' }}>Logs</p>
            <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
              {tab === 'live'
                ? ring
                  ? `${ring.held} of ${ring.capacity} lines held · ${ring.total_recorded.toLocaleString('en-IN')} seen since restart`
                  : 'loading…'
                : history
                  ? `${history.stats.total} persisted · ${history.stats.from_worker} from the worker · ${history.stats.last_24h} in 24h`
                  : 'loading…'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(['live', 'history'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="rounded-[9px] px-2.5 py-1.5 text-[11.5px] font-[650] capitalize"
              style={tab === t
                ? { background: rgba(semantic.primary, 0.12), color: semantic.primary }
                : { background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            >
              {t === 'live' ? <Server size={11} className="mr-1 inline" /> : <Database size={11} className="mr-1 inline" />}
              {t}
            </button>
          ))}

          {tab === 'live' && (
            <button
              onClick={() => setPaused((p) => !p)}
              className="flex items-center gap-1 rounded-[9px] px-2.5 py-1.5 text-[11.5px] font-[650]"
              style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            >
              {paused ? <><Play size={11} /> Resume</> : <><Pause size={11} /> Pause</>}
            </button>
          )}
        </div>
      </div>

      {/* Scope, stated where it is read rather than in a tooltip. Without this
          an operator sees no worker lines in the tail and concludes the worker
          has stopped logging. */}
      <p className="flex items-start gap-1.5 px-1 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
        <Info size={11} className="mt-[2px] flex-shrink-0" />
        {tab === 'live'
          ? tail?.scope_note ?? 'In-memory ring for this process only; cleared on restart.'
          : 'Errors and above, kept across restarts. Includes the worker container, which the live tail cannot see.'}
      </p>

      <div className="flex flex-wrap items-center gap-1.5">
        {tab === 'live' && FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setLevel(f.key)}
            className="rounded-[8px] px-2 py-1 text-[11px] font-[650]"
            style={level === f.key
              ? { background: rgba(semantic.primary, 0.12), color: semantic.primary }
              : { background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-tertiary)' }}
          >
            {f.label}
          </button>
        ))}

        {/* w-full below sm. min-w-[180px] inside a wrapping row meant that on a
            narrow screen the search box either forced the row wider than the
            card or landed alone on a line with 180px of it and dead space after
            — it never simply filled the line it was given. */}
        <div className="flex w-full items-center gap-1.5 rounded-[9px] px-2.5 py-2 sm:w-auto sm:min-w-[180px] sm:flex-1 sm:py-1.5"
          style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
          <Search size={12} color="var(--text-tertiary)" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by message…"
            className="w-full bg-transparent text-[11.5px] outline-none"
            style={{ color: 'var(--text-primary)' }}
          />
        </div>
      </div>

      {error && (
        <p className="rounded-[10px] px-3 py-2 text-[11.5px]"
          style={{ background: rgba(semantic.danger, 0.08), color: semantic.danger }}>
          {error}
        </p>
      )}

      {/* Dropped lines are surfaced, not hidden. A gap in the record that the
          operator does not know about is worse than one they do. */}
      {capture && (capture.dropped_pending > 0 || (ring?.dropped ?? 0) > 0) && (
        <p className="flex items-start gap-1.5 rounded-[10px] px-3 py-2 text-[11px]"
          style={{ background: rgba(semantic.warning, 0.08), color: 'var(--text-primary)' }}>
          <AlertTriangle size={12} className="mt-[1px] flex-shrink-0" color={semantic.warning} />
          {capture.dropped_pending} error line{capture.dropped_pending === 1 ? '' : 's'} could not be
          persisted — the database was unreachable and the queue is capped so it cannot grow
          without bound. They are still in the live ring above until it wraps.
        </p>
      )}

      <div
        ref={scroller}
        onScroll={onScroll}
        className="overflow-y-auto rounded-[12px] py-1.5"
        style={{
          background: 'var(--bg-subtle)',
          border: '1px solid var(--border)',
          maxHeight: '460px',
        }}
      >
        {tab === 'live' && liveLines.length === 0 && (
          <p className="px-3 py-6 text-center text-[11.5px]" style={{ color: 'var(--text-tertiary)' }}>
            {tail ? 'Nothing matching in the buffer.' : 'Loading…'}
          </p>
        )}
        {tab === 'live' && liveLines.map((l, i) => (
          <Row key={`${l.time}-${i}`} time={l.time} level={l.level} msg={l.msg} context={l.context} />
        ))}

        {tab === 'history' && histLines.length === 0 && (
          <p className="flex flex-col items-center gap-1 px-3 py-6 text-center text-[11.5px]"
            style={{ color: 'var(--text-tertiary)' }}>
            <XCircle size={16} />
            {/* An empty error log is good news and should read as such. */}
            {history ? 'No errors have been persisted. That is the good outcome.' : 'Loading…'}
          </p>
        )}
        {tab === 'history' && histLines.map((l) => (
          <Row key={l.id} time={l.logged_at} level={l.level} msg={l.msg} context={l.context} source={l.source} />
        ))}
      </div>

      {tab === 'live' && !following.current && (
        <button
          onClick={() => { const el = scroller.current; if (el) { el.scrollTop = 0; following.current = true; } }}
          className="flex items-center gap-1.5 rounded-[9px] px-2.5 py-1.5 text-[11px] font-[650]"
          style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
        >
          <ArrowDownToLine size={11} /> Jump to newest
        </button>
      )}
    </div>
  );
}
