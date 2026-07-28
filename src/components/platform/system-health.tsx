'use client';

// System Health — live introspection of the running backend.
//
// Deliberately stores nothing: everything here is measured at request time by
// GET /super-admin/system-health. A persisted health table would just be a
// second copy of the truth that can go stale, and the one moment this screen
// matters is when something is actually wrong right now.

import { useCallback, useEffect, useState } from 'react';
import { m } from 'framer-motion';
import {
  Activity, Database, Server, HardDrive, Cpu, AlertTriangle, CheckCircle2,
  RefreshCw, Layers, Clock,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { SystemHealth } from '@/lib/api';

/** Poll interval. Slow enough not to add meaningful load, fast enough that an
 *  operator watching during an incident sees recovery without reloading. */
const POLL_MS = 30_000;

function fmtBytes(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let v = n, i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v >= 100 || i === 0 ? 0 : 1)} ${units[i]}`;
}

function fmtUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/** DB latency thresholds. Chosen so "good" reflects a healthy pooled query and
 *  "degraded" flags the range where users start feeling it, before it fails. */
function latencyTone(ms: number | null): 'good' | 'warn' | 'bad' {
  if (ms === null) return 'bad';
  if (ms < 150) return 'good';
  if (ms < 600) return 'warn';
  return 'bad';
}

const TONE = {
  good: { fg: '#059669', bg: 'rgba(16,185,129,0.12)', label: 'Healthy' },
  warn: { fg: '#b45309', bg: 'rgba(245,158,11,0.14)', label: 'Degraded' },
  bad:  { fg: '#dc2626', bg: 'rgba(239,68,68,0.12)', label: 'Down' },
} as const;

function Stat({ icon, label, value, sub, tone }: {
  icon: React.ReactNode; label: string; value: string; sub?: string;
  tone?: 'good' | 'warn' | 'bad';
}) {
  const t = tone ? TONE[tone] : null;
  return (
    <div className="rounded-[14px] p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-[10px]" style={{ background: t?.bg ?? 'var(--bg-subtle)', color: t?.fg ?? 'var(--text-muted)' }}>
          {icon}
        </div>
        {t && (
          <span className="rounded-full px-2 py-0.5 text-[10px] font-[750]" style={{ background: t.bg, color: t.fg }}>
            {t.label}
          </span>
        )}
      </div>
      <p className="text-[19px] font-[820] tracking-[-0.02em] tabular-nums" style={{ color: 'var(--text-primary)' }}>{value}</p>
      <p className="mt-0.5 text-[10.5px] font-[650] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</p>
      {sub && <p className="mt-1 text-[11px]" style={{ color: 'var(--text-disabled)' }}>{sub}</p>}
    </div>
  );
}

export default function SystemHealthPanel() {
  const [data, setData] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const d = await api.superAdmin.systemHealth();
      setData(d);
      setError('');
    } catch (e: unknown) {
      // A failure here means the API itself is unreachable — which is itself
      // the health signal, so surface it rather than showing a blank panel.
      setError(e instanceof Error ? e.message : 'Health endpoint unreachable.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center gap-2.5 py-16">
        <RefreshCw size={22} className="animate-spin" style={{ color: 'var(--brand)' }} />
        <p className="text-[12.5px]" style={{ color: 'var(--text-muted)' }}>Checking system health…</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="rounded-[16px] p-8 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <AlertTriangle size={24} style={{ color: 'var(--danger)', margin: '0 auto 10px' }} />
        <p className="text-[13.5px] font-[700]" style={{ color: 'var(--text-primary)' }}>Cannot reach the API</p>
        <p className="mt-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>{error}</p>
        <button onClick={load} className="mt-3 text-[12px] font-[700]" style={{ color: 'var(--brand)' }}>Retry</button>
      </div>
    );
  }

  if (!data) return null;

  const dbTone = data.database.status === 'up' ? latencyTone(data.database.latency_ms) : 'bad';
  const heapPct = data.process.memory.heap_total_bytes
    ? Math.round((data.process.memory.heap_used_bytes / data.process.memory.heap_total_bytes) * 100)
    : null;
  const allGood = data.database.status === 'up' && dbTone === 'good';

  return (
    <m.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="space-y-4">

      {/* Overall banner — one glance answer before any numbers. */}
      <div
        className="flex flex-wrap items-center gap-3 rounded-[14px] px-4 py-3"
        style={{
          background: allGood ? 'rgba(16,185,129,0.10)' : 'rgba(239,68,68,0.10)',
          border: `1px solid ${allGood ? 'rgba(16,185,129,0.28)' : 'rgba(239,68,68,0.28)'}`,
        }}
      >
        {allGood ? <CheckCircle2 size={17} style={{ color: '#059669' }} /> : <AlertTriangle size={17} style={{ color: '#dc2626' }} />}
        <p className="min-w-0 flex-1 text-[13px] font-[750]" style={{ color: allGood ? '#059669' : '#dc2626' }}>
          {allGood ? 'All systems operational' : data.database.status !== 'up' ? 'Database unreachable' : 'Database responding slowly'}
        </p>
        <span className="text-[11px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
          checked {new Date(data.checked_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
        <button onClick={load} aria-label="Refresh health" className="flex h-8 w-8 items-center justify-center rounded-[9px]" style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          icon={<Database size={15} />}
          label="Database"
          value={data.database.status === 'up' ? `${data.database.latency_ms} ms` : 'Down'}
          sub={data.database.error ?? `${fmtBytes(data.database.size_bytes)} on disk`}
          tone={dbTone}
        />
        <Stat
          icon={<Layers size={15} />}
          label="Migrations"
          value={data.migrations.applied != null ? String(data.migrations.applied) : '—'}
          sub={data.migrations.latest ?? undefined}
        />
        <Stat
          icon={<Clock size={15} />}
          label="Uptime"
          value={fmtUptime(data.process.uptime_seconds)}
          sub={`${data.process.environment} · ${data.process.node_version}`}
        />
        <Stat
          icon={<AlertTriangle size={15} />}
          label="Failures 24h"
          value={data.errors_24h != null ? String(data.errors_24h) : '—'}
          sub="from the audit trail"
          tone={data.errors_24h && data.errors_24h > 0 ? 'warn' : undefined}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Stat
          icon={<Cpu size={15} />}
          label="Heap used"
          value={fmtBytes(data.process.memory.heap_used_bytes)}
          sub={heapPct != null ? `${heapPct}% of ${fmtBytes(data.process.memory.heap_total_bytes)}` : undefined}
        />
        <Stat
          icon={<HardDrive size={15} />}
          label="Resident memory"
          value={fmtBytes(data.process.memory.rss_bytes)}
          sub="RSS"
        />
        <Stat
          icon={<Server size={15} />}
          label="Connection pool"
          value={`${data.database.pool.total ?? '—'} open`}
          sub={`${data.database.pool.idle ?? '—'} idle · ${data.database.pool.waiting ?? '—'} waiting`}
          tone={(data.database.pool.waiting ?? 0) > 0 ? 'warn' : undefined}
        />
      </div>

      <p className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-disabled)' }}>
        <Activity size={11} />
        Live values, measured on request. Refreshes every {POLL_MS / 1000}s.
      </p>
    </m.div>
  );
}
