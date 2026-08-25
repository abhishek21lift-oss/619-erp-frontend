'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Activity, Building2, CalendarCheck2, RefreshCw, Users2 } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '@/lib/api';
import type { PlatformAnalytics } from '@/lib/api';
import { EmptyState } from '@/components/ui';
import { Panel, SectionLabel, StatTile } from './console';

const nf = (n: number) => n.toLocaleString('en-IN');

const chartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl border px-3 py-2 shadow-xl"
      style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}
    >
      <div className="mb-1 text-[10px] font-[750] uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>
        {label}
      </div>
      <div className="text-[13px] font-[800] tabular-nums" style={{ color: 'var(--text-primary)' }}>
        {nf(Number(payload[0].value))} active studios
      </div>
    </div>
  );
};

export default function PlatformPulse() {
  const [data, setData] = useState<PlatformAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    api.superAdmin.analytics(12)
      .then((r) => setData(r.data))
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load platform analytics'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const snapshot = useMemo(() => {
    const trend = data?.trend ?? [];
    const last = trend[trend.length - 1];
    const sum = (key: 'sessions' | 'clients_added' | 'check_ins') =>
      trend.reduce((total, point) => total + Number(point[key] ?? 0), 0);
    return {
      active: Number(last?.active_studios ?? 0),
      sessions: sum('sessions'),
      clients: sum('clients_added'),
      checkIns: sum('check_ins'),
    };
  }, [data]);

  if (loading && !data) {
    return (
      <Panel>
        <div className="flex min-h-[180px] items-center justify-center text-[12px]" style={{ color: 'var(--text-muted)' }}>
          Loading Platform Pulse…
        </div>
      </Panel>
    );
  }

  if (error) {
    return (
      <Panel>
        <EmptyState icon={<AlertTriangle size={20} />} title="Platform Pulse unavailable" description={error} />
        <button
          onClick={load}
          className="mt-3 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-[11px] font-[700]"
          style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
        >
          <RefreshCw size={13} /> Retry
        </button>
      </Panel>
    );
  }

  if (!data) return null;

  return (
    <section className="space-y-4" aria-labelledby="platform-pulse-title">
      <div className="flex items-end justify-between gap-3">
        <SectionLabel hint={`${data.studios.live} live · ${data.studios.total} total`}>
          <span id="platform-pulse-title">Platform Pulse</span>
        </SectionLabel>
        <button
          onClick={load}
          disabled={loading}
          aria-label="Refresh Platform Pulse"
          className="flex h-9 w-9 items-center justify-center rounded-lg border"
          style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : undefined} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatTile icon={<Building2 size={15} />} label="Active studios" value={nf(snapshot.active)} hint="latest month" />
        <StatTile icon={<Activity size={15} />} label="Sessions" value={nf(snapshot.sessions)} hint="12-month activity" />
        <StatTile icon={<Users2 size={15} />} label="Clients added" value={nf(snapshot.clients)} hint="12-month activity" />
        <StatTile icon={<CalendarCheck2 size={15} />} label="Check-ins" value={nf(snapshot.checkIns)} hint="12-month activity" />
      </div>

      <Panel>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-[13px] font-[800]" style={{ color: 'var(--text-primary)' }}>Active studio trend</h3>
            <p className="mt-0.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>One scale, one question: how many studios are actively working in the product?</p>
          </div>
          <span className="rounded-full px-2 py-1 text-[10px] font-[750]" style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>12M</span>
        </div>
        <div className="h-[230px] w-full" role="img" aria-label="Active studios over the last 12 months">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.trend} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="platformPulseFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="var(--brand)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 4" />
              <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} width={32} />
              <Tooltip content={chartTooltip} cursor={{ stroke: 'var(--border)' }} />
              <Area type="monotone" dataKey="active_studios" stroke="var(--brand)" strokeWidth={2.5} fill="url(#platformPulseFill)" dot={false} activeDot={{ r: 4, fill: 'var(--brand)', stroke: 'var(--bg-elevated)', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Panel>
    </section>
  );
}
