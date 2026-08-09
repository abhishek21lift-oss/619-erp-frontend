'use client';

// Command Center — live infrastructure console.
//
// Replaces the earlier SystemHealthPanel, which polled a single endpoint and
// rendered database + process + queues. This reads the collector snapshot, so
// it covers runtime, database, redis, queues, http, ai, security and smtp, and
// grows a card whenever the backend registers one — the grid is built from the
// response, not from a hardcoded list, so a new collector needs no change here.
//
// ── Three rules this screen follows ─────────────────────────────────────────
//
// 1. NEVER RENDER A NUMBER IT CANNOT MEASURE. A card whose probe could not run
//    says so and says what it needs. A fabricated gauge on an ops console is
//    worse than an empty one, because someone will act on it at 3am.
//
// 2. `unavailable` IS NOT `critical`. Redis absent means queues run inline by
//    design; an unmounted Docker socket is a gap in observability. Those render
//    grey and calm. Only things that are actually wrong are red.
//
// 3. THE REASON IS THE CONTENT. Every non-green card leads with the sentence the
//    collector wrote, not with a status word. "Redis memory 91% of maxmemory —
//    at noeviction, enqueues will start failing" is the product; "WARNING" is
//    not.
//
// The transport is a WebSocket when one can be opened and a 5s poll when it
// cannot (Phase 3). This file does not know which — useCommandCenterSnapshot
// hands it a snapshot either way, so a socket dropping mid-incident changes the
// update rate and nothing else.

import { useState } from 'react';
import { m } from 'framer-motion';
import {
  Activity, AlertTriangle, Bot, CheckCircle2, Cpu, Database, Gauge, HelpCircle,
  ChevronDown, Layers, Mail, RadioTower, RefreshCw, Server, ShieldAlert, Timer, XCircle,
} from 'lucide-react';
import { semantic, rgba } from '@/lib/palette';
import type { CommandCenterCard, CommandCenterStatus } from '@/lib/api';
import { Center, ErrorState } from '@/app/(chrome)/platform/_shared/ui';
import CommandPanel from './command-panel';
import AlertCenter from './alert-center';
import Guardian from './guardian';
import LiveLogs from './live-logs';
import { useCommandCenterSnapshot } from './useCommandCenterSnapshot';

const POLL_MS = 5_000;

// ── Presentation per status ─────────────────────────────────────────────────
// `unavailable` is intentionally the calmest of the non-green tones.
// Palette tokens, not raw hex — src/__tests__/palette.test.ts re-scans all of
// src/ and fails on any colour outside the five families, because a system like
// this decays one stray shade at a time. `timeout` uses the DEEPER amber rather
// than a new orange: it outranks warning without inventing a sixth family.
const TONE: Record<CommandCenterStatus, { color: string; bg: string; label: string; Icon: typeof CheckCircle2 }> = {
  healthy:     { color: semantic.success,   bg: rgba(semantic.success, 0.10), label: 'Healthy',     Icon: CheckCircle2 },
  warning:     { color: semantic.warning,   bg: rgba(semantic.warning, 0.10), label: 'Warning',     Icon: AlertTriangle },
  critical:    { color: semantic.danger,    bg: rgba(semantic.danger, 0.10),  label: 'Critical',    Icon: XCircle },
  timeout:     { color: semantic.warningLo, bg: rgba(semantic.warningLo, 0.10), label: 'Timed out', Icon: Timer },
  // Muted grey on purpose: a probe that could not run is a gap in
  // observability, not an outage, and must not read as alarming.
  unavailable: { color: semantic.muted,     bg: rgba(semantic.muted, 0.08),   label: 'Unavailable', Icon: HelpCircle },
};

const CARD_META: Record<string, { title: string; Icon: typeof Server; blurb: string }> = {
  runtime:  { title: 'Runtime',   Icon: Cpu,         blurb: 'Process memory, CPU and event-loop lag' },
  database: { title: 'Database',  Icon: Database,    blurb: 'PostgreSQL pool, connections and slow queries' },
  redis:    { title: 'Redis',     Icon: Server,      blurb: 'Latency, memory and clients' },
  queues:   { title: 'Queues',    Icon: Layers,      blurb: 'BullMQ depth, failures and workers' },
  http:     { title: 'API',       Icon: Gauge,       blurb: 'Request latency and error rate' },
  ai:       { title: 'AI',        Icon: Bot,         blurb: 'Routing, latency and fallback rate' },
  security: { title: 'Security',  Icon: ShieldAlert, blurb: 'Auth pressure and configuration posture' },
  smtp:     { title: 'Mail',      Icon: Mail,        blurb: 'SMTP configuration and delivery' },
};

function metaFor(name: string) {
  return CARD_META[name] ?? { title: name, Icon: Activity, blurb: '' };
}

function fmtBytes(n: unknown): string {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—';
  const u = ['B', 'KB', 'MB', 'GB', 'TB'];
  let v = n; let i = 0;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i += 1; }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${u[i]}`;
}
function fmtMs(n: unknown): string {
  return typeof n === 'number' && Number.isFinite(n) ? `${Math.round(n)} ms` : '—';
}
function fmtNum(n: unknown): string {
  return typeof n === 'number' && Number.isFinite(n) ? n.toLocaleString('en-IN') : '—';
}
/** A string field, or an em dash. Keeps `unknown` out of ReactNode. */
function fmtText(v: unknown): string {
  return typeof v === 'string' && v ? v : '—';
}
/** A 0..1 ratio as a whole percentage. */
function fmtPct(v: unknown): string {
  return typeof v === 'number' && Number.isFinite(v) ? `${Math.round(v * 100)}%` : '—';
}
function fmtDuration(s: unknown): string {
  if (typeof s !== 'number' || !Number.isFinite(s)) return '—';
  const d = Math.floor(s / 86400); const h = Math.floor((s % 86400) / 3600);
  const m2 = Math.floor((s % 3600) / 60);
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m2}m`;
  return `${m2}m`;
}

/** A small labelled figure inside a card. */
function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[10.5px] font-[650] uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
        {label}
      </p>
      <p className="truncate text-[14px] font-[700] tabular-nums" style={{ color: tone || 'var(--text-primary)' }}>
        {value}
      </p>
    </div>
  );
}

/**
 * Read a dotted path out of an unknown payload.
 *
 * The card payloads are collector-specific and typed as `unknown` on the wire,
 * so this keeps the render honest without an `any`: a missing intermediate
 * yields undefined, which every fmt* below already renders as an em dash. A
 * collector that returned `unavailable` has `data: null`, and one that failed
 * mid-probe may have only some of its fields — neither may be the reason a card
 * fails to render.
 */
function pick(src: unknown, path: string): unknown {
  let cur = src;
  for (const key of path.split('.')) {
    if (cur === null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur;
}

function CardBody({ card }: { card: CommandCenterCard }) {
  if (!card.data) return null;
  const d = (path: string) => pick(card.data, path);

  switch (card.name) {
    case 'runtime':
      return (
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
          {/* Against the LIMIT, not against heapTotal. heapTotal is what V8 has
              committed and it tracks the live set by design, so "48MB / 50MB"
              read as nearly-full when the process had 8GB of room. The card
              showed the same misleading pair the alert was firing on. */}
          <Stat label="Heap" value={`${fmtBytes(d('memory.heap_used_bytes'))} / ${fmtBytes(d('memory.heap_limit_bytes'))}`} />
          <Stat label="RSS" value={fmtBytes(d('memory.rss_bytes'))} />
          <Stat label="Loop lag p99" value={fmtMs(d('event_loop_lag_ms.p99'))} />
          <Stat label="Uptime" value={fmtDuration(d('uptime_seconds'))} />
        </div>
      );
    case 'database':
      return (
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
          <Stat label="Latency" value={fmtMs(d('latency_ms'))} />
          <Stat label="Connections" value={d('connections') ? `${d('connections.total')} / ${d('connections.max_connections')}` : '—'} />
          <Stat label="Pool waiting" value={fmtNum(d('pool.waiting'))} />
          <Stat label="Size" value={fmtBytes(d('size_bytes'))} />
        </div>
      );
    case 'redis':
      return (
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
          <Stat label="Latency" value={fmtMs(d('latency_ms'))} />
          <Stat label="Memory" value={typeof d('memory.used_human') === 'string' ? fmtText(d('memory.used_human')) : fmtBytes(d('memory.used_bytes'))} />
          <Stat label="Clients" value={fmtNum(d('clients.connected'))} />
          <Stat label="Ops/sec" value={fmtNum(d('stats.ops_per_sec'))} />
        </div>
      );
    case 'queues':
      return (
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
          <Stat label="Waiting" value={fmtNum(d('totals.waiting'))} />
          <Stat label="Active" value={fmtNum(d('totals.active'))} />
          <Stat label="Failed" value={fmtNum(d('totals.failed'))} tone={d('totals.failed') ? semantic.danger : undefined} />
          <Stat label="Queues" value={fmtNum(d('queues.length'))} />
        </div>
      );
    case 'http':
      return (
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
          <Stat label="p50" value={fmtMs(d('latency_ms.p50'))} />
          <Stat label="p95" value={fmtMs(d('latency_ms.p95'))} />
          <Stat label="Errors" value={fmtNum(d('status.errors'))} tone={d('status.server_errors') ? semantic.danger : undefined} />
          {/* Sample count shown next to the percentiles on purpose: a p95 from
              nine requests should not read like a p95 from nine hundred. */}
          <Stat label="Samples" value={fmtNum(d('samples'))} />
        </div>
      );
    case 'ai':
      return (
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
          <Stat label="Requests today" value={fmtNum(d('today.requests'))} />
          <Stat label="Avg latency (1h)" value={fmtMs(d('last_hour.avg_latency_ms'))} />
          {/* Named "fallback", never "success" — ai_usage_log records returned
              calls only, so a success rate would read 100% during an outage. */}
          <Stat label="Fallback rate (1h)"
            value={fmtPct(d('last_hour.fallback_rate'))} />
          <Stat label="Active model" value={fmtText(d('active_model'))} />
        </div>
      );
    case 'security':
      return (
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
          <Stat label="Failed logins (1h)" value={fmtNum(d('auth.failed_1h'))} tone={d('auth.failed_1h') ? semantic.warning : undefined} />
          <Stat label="From addresses" value={fmtNum(d('auth.failing_ips_1h'))} />
          <Stat label="Active sessions" value={fmtNum(d('auth.active_sessions'))} />
          <Stat label="Posture" value={`${d('posture.score') ?? '—'}%`}
            tone={d('posture.failed_count') ? semantic.warning : undefined} />
        </div>
      );
    case 'smtp':
      return (
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
          <Stat label="Configured" value={d('configured') ? 'Yes' : 'No'} tone={d('configured') ? undefined : semantic.danger} />
          <Stat label="Invitations sent" value={d('delivery') ? `${d('delivery.invitations_sent')} / ${d('delivery.invitations_total')}` : '—'} />
          <Stat label="Never delivered" value={fmtNum(d('delivery.attempted_never_sent'))}
            tone={d('delivery.attempted_never_sent') ? semantic.danger : undefined} />
          <Stat label="Host" value={fmtText(d('host'))} />
        </div>
      );
    default:
      return null;
  }
}

function StatusCard({ card, index }: { card: CommandCenterCard; index: number }) {
  const tone = TONE[card.status] ?? TONE.unavailable;
  const meta = metaFor(card.name);
  const { Icon } = meta;

  // ── Healthy cards start closed ──────────────────────────────────────────
  //
  // Eight cards, each ~250px with its stat grid, is 2,000px of scroll on a
  // phone — and during an incident seven of them are saying "fine". The one
  // that is not is the whole reason the screen is open, and it was buried.
  //
  // So the grid opens on exactly what needs reading: anything not healthy is
  // expanded, healthy collapses to a 56px row you can still tap. Applied on
  // every width, not just mobile — five collapsed "healthy" rows beat five
  // expanded ones on a laptop too.
  const [open, setOpen] = useState(card.status !== 'healthy');

  return (
    <m.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: Math.min(index * 0.03, 0.2) }}
      className="rounded-[16px] p-4"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        // A hairline in the status colour rather than a full tint: eight
        // saturated cards at once is noise, and noise is what stops people
        // noticing the one that changed.
        boxShadow: `inset 3px 0 0 0 ${tone.color}`,
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`${meta.title} — ${tone.label}`}
        className={`flex w-full items-center justify-between gap-3 text-left ${open ? 'mb-3' : ''}`}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-[10px]" style={{ background: tone.bg }}>
            <Icon size={15} color={tone.color} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-[750]" style={{ color: 'var(--text-primary)' }}>{meta.title}</p>
            <p className="truncate text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{meta.blurb}</p>
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center gap-1.5">
          <span
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-[750]"
            style={{ background: tone.bg, color: tone.color }}
          >
            {/* The dot only pulses when something needs attention — a grid of
                eight animating badges is a screensaver, not a signal. */}
            <span
              className={`h-1.5 w-1.5 rounded-full ${card.status === 'critical' ? 'animate-pulse' : ''}`}
              style={{ background: tone.color }}
            />
            {/* The label is the badge on a phone too — but the word alone is
                what a collapsed row has to carry, so it stays. */}
            {tone.label}
          </span>
          <ChevronDown
            size={14}
            className={`transition-transform ${open ? 'rotate-180' : ''}`}
            style={{ color: 'var(--text-tertiary)' }}
          />
        </div>
      </button>

      {open && (
        <>
          {/* The collector's sentence, not a status word. This is the payload. */}
          {card.reason && (
            <p className="mb-3 rounded-[10px] px-3 py-2 text-[12px] leading-snug"
              style={{ background: tone.bg, color: 'var(--text-primary)' }}>
              {card.reason}
            </p>
          )}

          <CardBody card={card} />

          <div className="mt-3 flex items-center gap-2 text-[10.5px]" style={{ color: 'var(--text-tertiary)' }}>
            <span>{card.latency_ms == null ? 'not probed' : `probed in ${card.latency_ms} ms`}</span>
            {card.cached && (
              // Says so rather than passing a stale latency off as live.
              <span className="rounded px-1.5 py-0.5" style={{ background: 'var(--bg-subtle)' }}>cached</span>
            )}
          </div>
        </>
      )}
    </m.div>
  );
}

export default function CommandCenterTab() {
  // Transport lives in the hook. This component renders a snapshot and does not
  // know whether it arrived over a socket or a poll — which is the point: the
  // stream can fail at any moment and the screen must not change shape when it
  // does. See useCommandCenterSnapshot.ts.
  const { snap, error, loading, refreshing, transport, refresh } = useCommandCenterSnapshot(POLL_MS);

  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-[150px] animate-pulse rounded-[16px]"
            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }} />
        ))}
      </div>
    );
  }

  if (error && !snap) return <Center><ErrorState error={error} onRetry={() => refresh()} /></Center>;
  if (!snap) return null;

  const cards = Object.values(snap.cards);
  // Worst first. During an incident the thing that is broken should not be
  // three rows down because its name starts with S.
  const order: CommandCenterStatus[] = ['critical', 'timeout', 'warning', 'unavailable', 'healthy'];
  const sorted = [...cards].sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));
  const counts = order.map((s) => ({ s, n: cards.filter((c) => c.status === s).length })).filter((x) => x.n);
  const overall = TONE[snap.status] ?? TONE.unavailable;

  return (
    <div className="space-y-4">
      {/* One row, always. It used to wrap: the title block took its natural
          width, the counts ran past it, and Refresh dropped onto a line of its
          own — four lines of chrome above the thing you came to read. The text
          block is now min-w-0 flex-1 so it is the part that gives, and the
          controls stay put. */}
      <div className="flex items-center gap-2.5 rounded-[16px] px-3.5 py-3 sm:gap-3 sm:px-4"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-[11px]" style={{ background: overall.bg }}>
          <overall.Icon size={17} color={overall.color} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-[800]" style={{ color: 'var(--text-primary)' }}>
            Platform {overall.label.toLowerCase()}
          </p>
          <p className="text-[11.5px]" style={{ color: 'var(--text-tertiary)' }}>
            {counts.map((c) => `${c.n} ${TONE[c.s].label.toLowerCase()}`).join(' · ')}
            {/* How long the collect took is a number for someone tuning the
                console, not for someone reading it on a phone during an
                incident. It was the clause that pushed this to two lines. */}
            <span className="hidden sm:inline">{' · '}collected in {snap.duration_ms} ms</span>
          </p>
        </div>

        <div className="flex flex-shrink-0 items-center gap-1.5 sm:gap-2">
          {/* Which transport is live, stated rather than implied — and stated
              on the PHONE too. This was `hidden sm:inline-flex`, which hid the
              one indicator that answers "why is this screen stale" from the
              device most likely to be asking. On mobile it keeps the icon and
              drops to "Live" / "5s"; the full label returns at sm. */}
          <span
            className="inline-flex items-center gap-1.5 rounded-[11px] px-2 py-2 text-[11.5px] font-[650] sm:px-2.5"
            style={{
              background: transport === 'stream' ? rgba(semantic.success, 0.10) : 'var(--bg-subtle)',
              color: transport === 'stream' ? semantic.success : 'var(--text-tertiary)',
              border: '1px solid var(--border)',
            }}
            title={transport === 'stream'
              ? 'Live: pushed from the server as it changes'
              : `Polling every ${POLL_MS / 1000}s — the realtime stream is not available`}
          >
            <RadioTower size={12} />
            <span className="hidden sm:inline">{transport === 'stream' ? 'Live' : `Polling ${POLL_MS / 1000}s`}</span>
            <span className="sm:hidden">{transport === 'stream' ? 'Live' : `${POLL_MS / 1000}s`}</span>
          </span>

          {/* Icon-only on the phone. The word "Refresh" beside a spinning arrow
              is the least informative 60px on the screen. */}
          <button
            onClick={() => refresh()}
            disabled={refreshing}
            aria-label="Refresh"
            className="flex items-center gap-2 rounded-[11px] px-2 py-2 text-[12.5px] font-[650] disabled:opacity-50 sm:px-3"
            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Above the cards, because the cards answer "what is the state of
          everything" and this answers "what needs me" — and during an incident
          the second question is the only one being asked. When nothing is
          wrong it collapses to one quiet line, so it costs no space. */}
      <AlertCenter onChanged={() => refresh()} />

      {/* Between the alerts and the cards, deliberately. An alert says WHAT is
          wrong; the Guardian says what it MEANS across several cards; the cards
          are the raw state you fall back to when neither of the two above
          matches what you are seeing. That is also the order of trust. */}
      <Guardian />

      <div className="grid gap-3 sm:grid-cols-2">
        {sorted.map((c, i) => <StatusCard key={c.name} card={c} index={i} />)}
      </div>

      {/* Below the cards on purpose. You diagnose, then you act — and the panel
          that acts should not be the first thing under your cursor. A command
          re-probes the cards immediately, because pausing a queue changes the
          queues card and an operator who has to wait out the poll will press
          the button a second time. */}
      <div className="pt-1">
        <CommandPanel onRan={() => refresh()} />
      </div>

      {/* Last. Logs are what you reach for when the cards, the alerts and the
          Guardian have all failed to explain what you are seeing — the deepest
          and least summarised view, and the one that costs the most attention
          to read. */}
      <div className="pt-1">
        <LiveLogs />
      </div>

      <p className="text-center text-[10.5px]" style={{ color: 'var(--text-tertiary)' }}>
        {transport === 'stream' ? 'Streaming live' : `Updating every ${POLL_MS / 1000}s`}
        {' · '}last collected {new Date(snap.collected_at).toLocaleTimeString()}
      </p>
    </div>
  );
}
