import React, { useState } from 'react';
import { m } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import type { CommandCenterCard, CommandCenterSnapshot } from '@/lib/api';
import { PremiumSparkline } from '@/components/visualizations';
import { fmtBytes, fmtMs, fmtNum, fmtPct, fmtDuration, fmtText, latencyTrend, TONE, metaFor, pick } from '@/components/platform/command-center-utils';

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return <div className="min-w-0 rounded-[10px] px-2.5 py-2" style={{ background: 'var(--bg-subtle)' }}>
    <p className="truncate text-[9.5px] font-[700] uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
    <p className="mt-0.5 truncate text-[13px] font-[750] tabular-nums" style={{ color: 'var(--text-primary)' }}>{value}</p>
    {hint && <p className="mt-0.5 truncate text-[9.5px]" style={{ color: 'var(--text-tertiary)' }}>{hint}</p>}
  </div>;
}

function Grid({ children }: { children: React.ReactNode }) { return <div className="grid grid-cols-2 gap-2">{children}</div>; }

function Ratio({ label, value }: { label: string; value: unknown }) {
  const n = typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : null;
  if (n == null) return <Metric label={label} value="—" />;
  const pct = Math.round(n * 100);
  return <div className="rounded-[10px] px-2.5 py-2" style={{ background: 'var(--bg-subtle)' }}>
    <div className="flex items-center justify-between gap-2"><p className="truncate text-[9.5px] font-[700] uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>{label}</p><span className="text-[11px] font-[750] tabular-nums" style={{ color: 'var(--text-primary)' }}>{pct}%</span></div>
    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--border)' }}><div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--accent)' }} /></div>
  </div>;
}

function CardBody({ card }: { card: CommandCenterCard }) {
  const d = card.data;
  switch (card.name) {
    case 'runtime': {
      const mem = pick(d, 'memory'); const lag = pick(d, 'event_loop_lag_ms'); const gc = pick(d, 'gc');
      return <div className="space-y-2.5"><Grid>
        <Metric label="RSS" value={fmtBytes(pick(mem, 'rss_bytes'))} /><Metric label="Heap used" value={fmtBytes(pick(mem, 'heap_used_bytes'))} />
        <Metric label="Heap limit" value={fmtBytes(pick(mem, 'heap_limit_bytes'))} /><Ratio label="Heap / limit" value={pick(mem, 'heap_used_ratio')} />
        <Metric label="CPU" value={typeof pick(d, 'cpu_percent') === 'number' ? `${Number(pick(d, 'cpu_percent')).toFixed(1)}%` : '—'} />
        <Metric label="Uptime" value={fmtDuration(pick(d, 'uptime_seconds'))} /><Metric label="Loop p50" value={fmtMs(pick(lag, 'p50'))} /><Metric label="Loop p99" value={fmtMs(pick(lag, 'p99'))} />
        <Metric label="Active handles" value={fmtNum(pick(d, 'active_handles'))} /><Metric label="Active requests" value={fmtNum(pick(d, 'active_requests'))} />
      </Grid>{Boolean(gc) && <p className="text-[10.5px]" style={{ color: 'var(--text-tertiary)' }}>GC: {fmtNum(pick(gc, 'collections'))} collections · {fmtMs(pick(gc, 'total_ms'))} total pause</p>}
      <p className="text-[10.5px]" style={{ color: 'var(--text-tertiary)' }}>Node {fmtText(pick(d, 'node_version'))} · PID {fmtNum(pick(d, 'pid'))}</p></div>;
    }
    case 'redis': {
      const mem = pick(d, 'memory'); const clients = pick(d, 'clients'); const stats = pick(d, 'stats'); const server = pick(d, 'server');
      return <div className="space-y-2.5"><Grid>
        <Metric label="Latency" value={fmtMs(pick(d, 'latency_ms'))} /><Metric label="Ready" value={pick(d, 'ready') === true ? 'Yes' : 'No'} />
        <Metric label="Memory" value={fmtText(pick(mem, 'used_human'))} /><Ratio label="Memory / max" value={pick(mem, 'used_ratio')} />
        <Metric label="Clients" value={fmtNum(pick(clients, 'connected'))} /><Metric label="Blocked" value={fmtNum(pick(clients, 'blocked'))} />
        <Metric label="Ops / sec" value={fmtNum(pick(stats, 'ops_per_sec'))} /><Metric label="Rejected conns" value={fmtNum(pick(stats, 'rejected_connections'))} />
        <Metric label="Hits" value={fmtNum(pick(stats, 'keyspace_hits'))} /><Metric label="Misses" value={fmtNum(pick(stats, 'keyspace_misses'))} />
      </Grid><p className="text-[10.5px]" style={{ color: 'var(--text-tertiary)' }}>Redis {fmtText(pick(server, 'version'))} · {fmtDuration(pick(server, 'uptime_seconds'))} uptime · {fmtText(pick(mem, 'policy'))}</p></div>;
    }
    case 'queues': {
      const totals = pick(d, 'totals'); const queues = Array.isArray(pick(d, 'queues')) ? pick(d, 'queues') as Array<Record<string, unknown>> : [];
      return <div className="space-y-2.5"><Grid><Metric label="Waiting" value={fmtNum(pick(totals, 'waiting'))} /><Metric label="Active" value={fmtNum(pick(totals, 'active'))} /><Metric label="Failed" value={fmtNum(pick(totals, 'failed'))} /><Metric label="Queues" value={fmtNum(queues.length)} /></Grid>
        {queues.map((q) => <div key={String(q.name)} className="flex items-center justify-between gap-2 rounded-[9px] px-2.5 py-1.5 text-[10.5px]" style={{ background: 'var(--bg-subtle)' }}><span className="min-w-0 truncate font-[650]" style={{ color: 'var(--text-primary)' }}>{String(q.name)}</span><span className="flex-shrink-0 tabular-nums" style={{ color: 'var(--text-tertiary)' }}>{String(q.waiting ?? 0)} waiting · {String(q.active ?? 0)} active · {String(q.failed ?? 0)} failed{q.paused ? ' · paused' : ''}</span></div>)}</div>;
    }
    case 'database': {
      const pool = pick(d, 'pool'); const conn = pick(d, 'connections'); const mig = pick(d, 'migrations'); const longest = pick(d, 'longest_running_query'); const slow = Array.isArray(pick(d, 'slow_queries')) ? pick(d, 'slow_queries') as Array<Record<string, unknown>> : [];
      return <div className="space-y-2.5"><Grid><Metric label="Query latency" value={fmtMs(pick(d, 'latency_ms'))} /><Metric label="Pool total" value={fmtNum(pick(pool, 'total'))} /><Metric label="Pool idle" value={fmtNum(pick(pool, 'idle'))} /><Metric label="Pool waiting" value={fmtNum(pick(pool, 'waiting'))} /><Metric label="Connections" value={conn ? `${fmtNum(pick(conn, 'total'))} / ${fmtNum(pick(conn, 'max_connections'))}` : '—'} /><Ratio label="Connection use" value={pick(conn, 'used_ratio')} /><Metric label="Database size" value={fmtBytes(pick(d, 'size_bytes'))} /><Metric label="Migrations" value={fmtNum(pick(mig, 'applied'))} /></Grid>
        {Boolean(longest) && <p className="rounded-[9px] px-2.5 py-2 text-[10.5px]" style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>Longest running: {fmtMs(pick(longest, 'duration_ms'))} · {fmtText(pick(longest, 'query'))}</p>}
        {slow.length > 0 && <div className="space-y-1 text-[10px]" style={{ color: 'var(--text-tertiary)' }}><p className="font-[700] uppercase tracking-wide">Slow queries</p>{slow.slice(0, 3).map((q, i) => <p key={i} className="truncate">{fmtMs(q.mean_ms)} avg · {fmtText(q.query)}</p>)}</div>}</div>;
    }
    case 'http': {
      const latency = pick(d, 'latency_ms'); const status = pick(d, 'status'); const slow = Array.isArray(pick(d, 'slowest_endpoints')) ? pick(d, 'slowest_endpoints') as Array<Record<string, unknown>> : [];
      return <div className="space-y-2.5"><Grid><Metric label="Requests" value={fmtNum(pick(d, 'samples'))} /><Metric label="5xx errors" value={fmtNum(pick(status, 'server_errors'))} /><Metric label="p95" value={fmtMs(pick(latency, 'p95'))} /><Metric label="p99" value={fmtMs(pick(latency, 'p99'))} /><Metric label="Max" value={fmtMs(pick(latency, 'max'))} /><Metric label="4xx" value={fmtNum(pick(status, 'client_errors'))} /></Grid>
        {slow.length > 0 && <div className="space-y-1 text-[10.5px]" style={{ color: 'var(--text-tertiary)' }}><p className="font-[700] uppercase tracking-wide">Slowest endpoints</p>{slow.slice(0, 4).map((e, i) => <div key={i} className="flex justify-between gap-2"><span className="truncate">{fmtText(e.endpoint)}</span><span className="flex-shrink-0 tabular-nums">{fmtMs(e.p95_ms ?? e.p95)}</span></div>)}</div>}
        {fmtText(pick(d, 'note')) !== '—' && <p className="text-[10.5px]" style={{ color: 'var(--text-tertiary)' }}>{fmtText(pick(d, 'note'))}</p>}</div>;
    }
    case 'ai': {
      const today = pick(d, 'today'); const hour = pick(d, 'last_hour'); const routing = pick(d, 'routing');
      return <div className="space-y-2.5"><Grid><Metric label="Active model" value={fmtText(pick(d, 'active_model'))} /><Metric label="Last request" value={pick(d, 'last_request_at') ? new Date(String(pick(d, 'last_request_at'))).toLocaleTimeString() : '—'} /><Metric label="Today requests" value={fmtNum(pick(today, 'requests'))} /><Metric label="Today latency" value={fmtMs(pick(today, 'avg_latency_ms'))} /><Metric label="Today fallbacks" value={fmtNum(pick(today, 'fallbacks'))} /><Metric label="Today cost" value={typeof pick(today, 'cost_inr') === 'number' ? `₹${Number(pick(today, 'cost_inr')).toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '—'} /><Metric label="1h requests" value={fmtNum(pick(hour, 'requests'))} /><Metric label="1h fallback rate" value={fmtPct(pick(hour, 'fallback_rate'))} /></Grid><p className="text-[10.5px]" style={{ color: 'var(--text-tertiary)' }}>Primary: {fmtText(pick(routing, 'primary'))} · Secondary: {fmtText(pick(routing, 'secondary'))} · Fallback: {fmtText(pick(routing, 'fallback'))}</p></div>;
    }
    case 'security': {
      const auth = pick(d, 'auth'); const posture = pick(d, 'posture'); const checks = Array.isArray(pick(posture, 'checks')) ? pick(posture, 'checks') as Array<Record<string, unknown>> : [];
      return <div className="space-y-2.5"><Grid><Metric label="Failed logins 1h" value={fmtNum(pick(auth, 'failed_1h'))} /><Metric label="Failed logins 24h" value={fmtNum(pick(auth, 'failed_24h'))} /><Metric label="Failing IPs 1h" value={fmtNum(pick(auth, 'failing_ips_1h'))} /><Metric label="Targeted accounts" value={fmtNum(pick(auth, 'targeted_accounts_1h'))} /><Metric label="Success 1h" value={fmtNum(pick(auth, 'success_1h'))} /><Metric label="Active sessions" value={fmtNum(pick(auth, 'active_sessions'))} /><Metric label="Posture score" value={pick(posture, 'score') != null ? `${String(pick(posture, 'score'))}%` : '—'} /><Metric label="Failed checks" value={fmtNum(pick(posture, 'failed_count'))} /></Grid>{checks.length > 0 && <div className="space-y-1">{checks.map((c) => <div key={String(c.key)} className="flex items-center justify-between gap-2 text-[10px]" style={{ color: c.ok ? 'var(--text-tertiary)' : 'var(--text-secondary)' }}><span className="truncate">{String(c.key)}</span><span>{c.ok ? 'OK' : 'FAIL'}</span></div>)}</div>}</div>;
    }
    case 'smtp': {
      const delivery = pick(d, 'delivery'); const probe = pick(d, 'live_probe');
      return <div className="space-y-2.5"><Grid><Metric label="Configured" value={pick(d, 'configured') === true ? 'Yes' : 'No'} /><Metric label="Invitations" value={fmtNum(pick(delivery, 'invitations_total'))} /><Metric label="Sent" value={fmtNum(pick(delivery, 'invitations_sent'))} /><Metric label="Errored" value={fmtNum(pick(delivery, 'invitations_errored'))} /><Metric label="Never sent" value={fmtNum(pick(delivery, 'attempted_never_sent'))} /><Metric label="Last sent" value={pick(delivery, 'last_sent_at') ? new Date(String(pick(delivery, 'last_sent_at'))).toLocaleString() : '—'} /></Grid>{Array.isArray(pick(d, 'missing_vars')) && (pick(d, 'missing_vars') as unknown[]).length > 0 && <p className="text-[10.5px]" style={{ color: 'var(--text-secondary)' }}>Missing: {(pick(d, 'missing_vars') as unknown[]).join(', ')}</p>}{Boolean(probe) && <p className="text-[10.5px]" style={{ color: 'var(--text-secondary)' }}>Live probe: {pick(probe, 'ok') === true ? 'passed' : 'failed'}</p>}{fmtText(pick(delivery, 'last_error')) !== '—' && <p className="truncate text-[10.5px]" style={{ color: 'var(--text-tertiary)' }}>Last error: {fmtText(pick(delivery, 'last_error'))}</p>}</div>;
    }
    default:
      return <div className="rounded-[10px] px-3 py-2 text-[11px]" style={{ background: 'var(--bg-subtle)', color: 'var(--text-tertiary)' }}>Collector returned data, but this card has no renderer yet.</div>;
  }
}

export const Card: React.FC<{ card: CommandCenterCard; index: number; history: CommandCenterSnapshot[] }> = ({ card, index, history }) => {
  const tone = TONE[card.status] ?? TONE.unavailable;
  const meta = metaFor(card.name);
  const { Icon } = meta;
  const [open, setOpen] = useState(card.status !== 'healthy');
  return <m.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, delay: Math.min(index * 0.03, 0.2) }} className="rounded-[16px] p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: `inset 3px 0 0 0 ${tone.color}` }}>
    <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={`${meta.title} — ${tone.label}`} className={`flex w-full items-center justify-between gap-3 text-left ${open ? 'mb-3' : ''}`}>
      <div className="flex min-w-0 items-center gap-2.5"><span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-[10px]" style={{ background: tone.bg }}><Icon size={15} color={tone.color} /></span><div className="min-w-0"><p className="truncate text-[14px] font-[750]" style={{ color: 'var(--text-primary)' }}>{meta.title}</p><p className="truncate text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{meta.blurb}</p></div></div>
      <div className="flex flex-shrink-0 items-center gap-1.5"><span className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-[750]" style={{ background: tone.bg, color: tone.color }}><span className={`h-1.5 w-1.5 rounded-full ${card.status === 'critical' ? 'animate-pulse' : ''}`} style={{ background: tone.color }} />{tone.label}</span><ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} style={{ color: 'var(--text-tertiary)' }} /></div>
    </button>
    {open && <><CardBody card={card} />{card.reason && <p className="mt-3 rounded-[10px] px-3 py-2 text-[12px] leading-snug" style={{ background: tone.bg, color: 'var(--text-primary)' }}>{card.reason}</p>}<div className="mt-3 flex items-center justify-between gap-3"><div className="flex items-center gap-2 text-[10.5px]" style={{ color: 'var(--text-tertiary)' }}><span>{card.latency_ms == null ? 'not probed' : `probed in ${card.latency_ms} ms`}</span>{card.cached && <span className="rounded px-1.5 py-0.5" style={{ background: 'var(--bg-subtle)' }}>cached</span>}</div>{(() => { const trend = latencyTrend(history, card.name); return trend.length >= 2 ? <div className="h-[20px] w-[72px] flex-shrink-0" title={`Probe latency, last ${trend.length} reads`}><PremiumSparkline data={trend} color={tone.color} metric={`${meta.title} probe latency`} height={20} showArea={false} /></div> : null; })()}</div></>}
  </m.div>;
};