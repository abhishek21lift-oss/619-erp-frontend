'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  Bot,
  BrainCircuit,
  Building2,
  ChevronRight,
  CircleDollarSign,
  Database,
  Gauge,
  HeartPulse,
  KeyRound,
  Layers3,
  LifeBuoy,
  LineChart,
  LockKeyhole,
  Network,
  PlayCircle,
  RefreshCw,
  Route,
  ServerCog,
  ShieldCheck,
  Sparkles,
  Users2,
  WandSparkles,
  Workflow,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '@/lib/api';
import type {
  AiModelUsage,
  AiOverview,
  AiRouting,
  AiStudioUsage,
  AiTrendPoint,
  CommandCenterSnapshot,
} from '@/lib/api';

const MODULES = [
  { label: 'Studios', icon: Building2, tab: 'studios', tone: 'cyan', hint: 'Tenants & lifecycle' },
  { label: 'AI Control', icon: Bot, tab: 'ai', tone: 'violet', hint: 'Models & routing' },
  { label: 'Analytics', icon: LineChart, tab: 'analytics', tone: 'blue', hint: 'Growth & trends' },
  { label: 'Finance', icon: CircleDollarSign, tab: 'finance', tone: 'emerald', hint: 'Billing & revenue' },
  { label: 'Security', icon: LockKeyhole, tab: 'security', tone: 'rose', hint: 'Threats & access' },
  { label: 'System Health', icon: HeartPulse, tab: 'health', tone: 'amber', hint: 'Infrastructure' },
  { label: 'Storage', icon: Database, tab: 'storage', tone: 'indigo', hint: 'Files & capacity' },
  { label: 'Support', icon: LifeBuoy, tab: 'support', tone: 'sky', hint: 'Tickets & service' },
  { label: 'Users', icon: Users2, tab: 'users', tone: 'fuchsia', hint: 'Platform accounts' },
  { label: 'Audit', icon: ShieldCheck, tab: 'audit', tone: 'slate', hint: 'Evidence trail' },
  { label: 'Features', icon: WandSparkles, tab: 'features', tone: 'orange', hint: 'Feature flags' },
  { label: 'Announcements', icon: Zap, tab: 'announcements', tone: 'yellow', hint: 'Broadcast centre' },
] as const;

const TONE: Record<string, string> = {
  cyan: '#06b6d4', violet: '#8b5cf6', blue: '#3b82f6', emerald: '#10b981',
  rose: '#f43f5e', amber: '#f59e0b', indigo: '#6366f1', sky: '#0ea5e9',
  fuchsia: '#d946ef', slate: '#64748b', orange: '#f97316', yellow: '#eab308',
};

const HEALTH_COLORS: Record<string, string> = {
  healthy: '#10b981', warning: '#f59e0b', timeout: '#f97316', critical: '#ef4444', unavailable: '#94a3b8',
};

function fmtTokens(n: number) {
  if (!Number.isFinite(n)) return '—';
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString('en-IN');
}

function Card({ children, className = '', glow = 'rgba(99,102,241,.10)' }: { children: React.ReactNode; className?: string; glow?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-[26px] border p-4 sm:p-5 ${className}`}
      style={{
        borderColor: 'var(--border)',
        background: 'linear-gradient(145deg, color-mix(in srgb, var(--surface) 94%, transparent), color-mix(in srgb, var(--bg-subtle) 92%, transparent))',
        boxShadow: '0 20px 60px rgba(15,23,42,.07), inset 0 1px 0 rgba(255,255,255,.55)',
      }}
    >
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full blur-3xl" style={{ background: glow }} />
      <div className="relative">{children}</div>
    </div>
  );
}

function Donut3D({ segments, center, label }: { segments: { value: number; color: string }[]; center: string; label: string }) {
  const total = Math.max(1, segments.reduce((sum, s) => sum + s.value, 0));
  const r = 39;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="relative h-[178px] w-[178px] shrink-0">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90 drop-shadow-[0_14px_18px_rgba(15,23,42,.14)]">
        <circle cx="50" cy="54" r={r} fill="none" stroke="rgba(15,23,42,.12)" strokeWidth="12" opacity=".35" />
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(148,163,184,.16)" strokeWidth="12" />
        {segments.map((s, i) => {
          const len = (s.value / total) * c;
          const dash = `${Math.max(0, len - 2)} ${c - Math.max(0, len - 2)}`;
          const el = (
            <circle
              key={`${s.color}-${i}`}
              cx="50" cy="50" r={r} fill="none" stroke={s.color} strokeWidth="12" strokeLinecap="round"
              strokeDasharray={dash} strokeDashoffset={-offset} vectorEffect="non-scaling-stroke"
            />
          );
          offset += len;
          return el;
        })}
        <circle cx="50" cy="50" r="29" fill="var(--surface)" stroke="rgba(255,255,255,.55)" strokeWidth="1" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <div className="text-[25px] font-[900] tracking-[-.04em]" style={{ color: 'var(--text-primary)' }}>{center}</div>
        <div className="text-[9px] font-[800] uppercase tracking-[.14em]" style={{ color: 'var(--text-tertiary)' }}>{label}</div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const color = HEALTH_COLORS[status] ?? '#64748b';
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-[850] uppercase tracking-[.12em]" style={{ color, background: `${color}12`, border: `1px solid ${color}2c` }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 10px ${color}` }} />{status}
    </span>
  );
}

function RoutingPipeline({ routing }: { routing: AiRouting | null }) {
  const tiers = [
    { key: 'primary' as const, label: 'Primary', color: '#8b5cf6', icon: BrainCircuit, copy: 'Client-facing intelligence' },
    { key: 'secondary' as const, label: 'Secondary', color: '#06b6d4', icon: Route, copy: 'Operational workloads' },
    { key: 'fallback' as const, label: 'Fallback', color: '#f59e0b', icon: ServerCog, copy: 'Safety net' },
  ];
  return (
    <div className="grid gap-2 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-center">
      {tiers.flatMap((tier, i) => {
        const Icon = tier.icon;
        const model = routing?.effective?.[tier.key] ?? 'Not configured';
        const node = (
          <div key={tier.key} className="rounded-[20px] border p-3.5" style={{ borderColor: `${tier.color}35`, background: `linear-gradient(145deg, ${tier.color}12, transparent)` }}>
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-[11px] font-[850]" style={{ color: tier.color }}><Icon size={14} />{tier.label}</span>
              <span className="rounded-full px-2 py-0.5 text-[8px] font-[800] uppercase" style={{ background: `${tier.color}16`, color: tier.color }}>Live config</span>
            </div>
            <div className="mt-2 truncate font-mono text-[11px] font-[700]" style={{ color: 'var(--text-primary)' }}>{model}</div>
            <div className="mt-1 text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{tier.copy}</div>
          </div>
        );
        return i < tiers.length - 1
          ? [node, <div key={`arrow-${tier.key}`} className="hidden justify-center lg:flex"><ChevronRight size={18} style={{ color: 'var(--text-disabled)' }} /></div>]
          : [node];
      })}
    </div>
  );
}

export default function PremiumCommandCenterOverview() {
  const router = useRouter();
  const [data, setData] = useState<{
    snapshot: CommandCenterSnapshot | null;
    ai: AiOverview | null;
    models: AiModelUsage[];
    studios: AiStudioUsage[];
    trend: AiTrendPoint[];
    routing: AiRouting | null;
  }>({ snapshot: null, ai: null, models: [], studios: [], trend: [], routing: null });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (fresh = false) => {
    setRefreshing(true);
    setError('');
    try {
      const [snapshot, ai, models, studios, trend, routing] = await Promise.all([
        api.superAdmin.commandCenter({ fresh }),
        api.superAdmin.aiOverview(30),
        api.superAdmin.aiByModel(30),
        api.superAdmin.aiByStudio(30),
        api.superAdmin.aiTrend(30),
        api.superAdmin.aiRouting(),
      ]);
      setData({ snapshot: snapshot.data, ai: ai.data, models: models.data, studios: studios.data, trend: trend.data, routing: routing.data });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Command Center data could not be loaded.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const health = useMemo(() => {
    const cards = data.snapshot ? Object.values(data.snapshot.cards) : [];
    return cards.reduce<Record<string, number>>((acc, card) => {
      acc[card.status] = (acc[card.status] ?? 0) + 1;
      return acc;
    }, {});
  }, [data.snapshot]);

  const modelChart = useMemo(() => data.models.slice(0, 8).map((m) => ({
    model: (m.model || 'unknown').split('/').pop()?.slice(0, 18) ?? 'unknown',
    requests: m.requests,
  })), [data.models]);

  const studioChart = useMemo(() => data.studios.slice(0, 7).map((s) => ({
    studio: s.organization_name.slice(0, 16),
    tokens: s.tokens,
  })), [data.studios]);

  const trendChart = useMemo(() => data.trend.map((p) => ({ day: p.day.slice(5), tokens: p.tokens, requests: p.requests })), [data.trend]);

  const totalSignals = Object.values(health).reduce((a, b) => a + b, 0);
  const healthySignals = health.healthy ?? 0;
  const attentionSignals = (health.critical ?? 0) + (health.timeout ?? 0) + (health.warning ?? 0);
  const overallStatus = data.snapshot?.status ?? 'unavailable';
  const aiRequests = data.ai?.requests ?? 0;
  const aiTokens = data.ai?.tokens ?? 0;
  const fallbackPct = data.ai?.fallback_pct ?? 0;

  if (loading) {
    return <div className="flex min-h-[520px] items-center justify-center"><RefreshCw size={24} className="animate-spin" style={{ color: 'var(--brand)' }} /></div>;
  }

  if (error && !data.snapshot) {
    return <div className="rounded-[24px] border p-8 text-center" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}><p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{error}</p><button onClick={() => void load(true)} className="mt-3 rounded-xl px-4 py-2 text-xs font-bold text-white" style={{ background: 'var(--brand)' }}>Retry</button></div>;
  }

  return (
    <div className="relative space-y-5 overflow-hidden pb-8">
      <div aria-hidden className="pointer-events-none absolute -left-40 -top-40 h-[420px] w-[420px] rounded-full blur-3xl" style={{ background: 'rgba(139,92,246,.10)' }} />
      <div aria-hidden className="pointer-events-none absolute -right-48 top-[260px] h-[520px] w-[520px] rounded-full blur-3xl" style={{ background: 'rgba(6,182,212,.08)' }} />

      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-[850] uppercase tracking-[.18em]" style={{ color: 'var(--brand)' }}><Sparkles size={12} /> Super Admin Command Center 2.0</div>
          <h1 className="mt-1 text-[30px] font-[950] tracking-[-.045em] sm:text-[40px]" style={{ color: 'var(--text-primary)' }}>Platform, at a glance.</h1>
          <p className="mt-1 max-w-[760px] text-[12.5px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>A premium control plane inspired by FreeLLMAPI’s routing, analytics, fallback and observability patterns — adapted to MY PT STUDIO’s multi-tenant platform.</p>
        </div>
        <button onClick={() => void load(true)} disabled={refreshing} className="flex items-center gap-2 rounded-[13px] border px-3.5 py-2.5 text-[11px] font-[800] transition-transform active:scale-95 disabled:opacity-60" style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', boxShadow: '0 10px 30px rgba(15,23,42,.06)' }}><RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> Refresh live data</button>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        {[
          { label: 'Platform health', value: overallStatus, sub: `${healthySignals}/${totalSignals || 0} healthy signals`, icon: HeartPulse, color: HEALTH_COLORS[overallStatus] ?? '#64748b' },
          { label: 'AI requests', value: aiRequests.toLocaleString('en-IN'), sub: 'last 30 days', icon: Bot, color: '#8b5cf6' },
          { label: 'AI tokens', value: fmtTokens(aiTokens), sub: `${fallbackPct}% fallback rate`, icon: Zap, color: '#06b6d4' },
          { label: 'Attention', value: String(attentionSignals), sub: 'signals needing review', icon: ShieldCheck, color: attentionSignals ? '#f59e0b' : '#10b981' },
          { label: 'Collection', value: `${data.snapshot?.duration_ms ?? 0}ms`, sub: 'live snapshot duration', icon: Activity, color: '#10b981' },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return <Card key={kpi.label} className="min-h-[118px]" glow={`${kpi.color}18`}><div className="flex items-start justify-between"><div className="rounded-xl p-2" style={{ background: `${kpi.color}12`, color: kpi.color }}><Icon size={16} /></div><span className="h-2 w-2 rounded-full" style={{ background: kpi.color, boxShadow: `0 0 14px ${kpi.color}` }} /></div><div className="mt-4 text-[10px] font-[800] uppercase tracking-[.12em]" style={{ color: 'var(--text-tertiary)' }}>{kpi.label}</div><div className="mt-0.5 truncate text-[22px] font-[900] tracking-[-.04em]" style={{ color: kpi.color }}>{kpi.value}</div><div className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{kpi.sub}</div></Card>;
        })}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
        <Card className="min-h-[270px]" glow="rgba(139,92,246,.14)">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2 text-[10px] font-[850] uppercase tracking-[.14em]" style={{ color: '#8b5cf6' }}><Network size={13} /> AI Control Plane</div><h2 className="mt-1 text-[18px] font-[900] tracking-[-.025em]" style={{ color: 'var(--text-primary)' }}>Smart routing & fallback fabric</h2></div><button onClick={() => router.push('/platform?tab=ai')} className="rounded-full px-3 py-1.5 text-[10px] font-[800]" style={{ background: '#8b5cf612', color: '#8b5cf6' }}>Open AI Control →</button></div>
          <div className="mt-5"><RoutingPipeline routing={data.routing} /></div>
          <div className="mt-4 grid grid-cols-3 gap-2"><div className="rounded-xl p-2.5" style={{ background: 'var(--bg-subtle)' }}><div className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Models</div><div className="mt-1 text-sm font-[850]" style={{ color: 'var(--text-primary)' }}>{data.models.length}</div></div><div className="rounded-xl p-2.5" style={{ background: 'var(--bg-subtle)' }}><div className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Fallbacks</div><div className="mt-1 text-sm font-[850]" style={{ color: fallbackPct > 10 ? '#f59e0b' : '#10b981' }}>{fallbackPct}%</div></div><div className="rounded-xl p-2.5" style={{ background: 'var(--bg-subtle)' }}><div className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Avg latency</div><div className="mt-1 text-sm font-[850]" style={{ color: 'var(--text-primary)' }}>{data.ai?.avg_latency_ms ?? 0}ms</div></div></div>
        </Card>

        <Card className="min-h-[270px]" glow="rgba(16,185,129,.12)">
          <div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2 text-[10px] font-[850] uppercase tracking-[.14em]" style={{ color: '#10b981' }}><Gauge size={13} /> Health topology</div><h2 className="mt-1 text-[18px] font-[900] tracking-[-.025em]" style={{ color: 'var(--text-primary)' }}>Live infrastructure pulse</h2></div><StatusPill status={overallStatus} /></div>
          <div className="mt-3 flex items-center gap-5"><Donut3D segments={Object.entries(health).map(([status, value]) => ({ value, color: HEALTH_COLORS[status] ?? '#94a3b8' }))} center={`${Math.round((healthySignals / Math.max(1, totalSignals)) * 100)}%`} label="healthy" /><div className="min-w-0 flex-1 space-y-2">{Object.entries(health).map(([status, count]) => <div key={status} className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-[10.5px] capitalize" style={{ color: 'var(--text-secondary)' }}><span className="h-2 w-2 rounded-full" style={{ background: HEALTH_COLORS[status] ?? '#94a3b8' }} />{status}</span><span className="text-[11px] font-[850] tabular-nums" style={{ color: 'var(--text-primary)' }}>{count}</span></div>)}</div></div>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
        <Card className="min-h-[300px]" glow="rgba(59,130,246,.12)">
          <div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2 text-[10px] font-[850] uppercase tracking-[.14em]" style={{ color: '#3b82f6' }}><LineChart size={13} /> AI telemetry</div><h2 className="mt-1 text-[18px] font-[900] tracking-[-.025em]" style={{ color: 'var(--text-primary)' }}>Token flow & request pressure</h2></div><span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>30-day window</span></div>
          <div className="mt-4 h-[220px] w-full">{trendChart.length ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={trendChart}><defs><linearGradient id="tokenFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity={0.28} /><stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} /></linearGradient></defs><CartesianGrid stroke="rgba(148,163,184,.16)" vertical={false} /><XAxis dataKey="day" tick={{ fontSize: 9, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 9, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} tickFormatter={fmtTokens} /><Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 11 }} formatter={(value: number, name: string) => [name === 'tokens' ? fmtTokens(value) : value.toLocaleString('en-IN'), name === 'tokens' ? 'Tokens' : 'Requests']} /><Area type="monotone" dataKey="tokens" stroke="#3b82f6" fill="url(#tokenFill)" strokeWidth={2.5} /></AreaChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center text-xs" style={{ color: 'var(--text-tertiary)' }}>No AI trend data yet.</div>}</div>
        </Card>

        <Card className="min-h-[300px]" glow="rgba(217,70,239,.12)">
          <div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2 text-[10px] font-[850] uppercase tracking-[.14em]" style={{ color: '#d946ef' }}><Layers3 size={13} /> Model intelligence</div><h2 className="mt-1 text-[18px] font-[900] tracking-[-.025em]" style={{ color: 'var(--text-primary)' }}>Most active models</h2></div><button onClick={() => router.push('/platform?tab=ai')} className="text-[10px] font-[800]" style={{ color: '#d946ef' }}>Manage →</button></div>
          <div className="mt-4 h-[220px]">{modelChart.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={modelChart} layout="vertical" margin={{ left: 4, right: 8, top: 4, bottom: 4 }}><CartesianGrid stroke="rgba(148,163,184,.12)" horizontal={false} /><XAxis type="number" hide /><YAxis type="category" dataKey="model" width={92} tick={{ fontSize: 9, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 11 }} formatter={(value: number) => [value.toLocaleString('en-IN'), 'Requests']} /><Bar dataKey="requests" fill="#d946ef" radius={[0, 7, 7, 0]} barSize={13} /></BarChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center text-xs" style={{ color: 'var(--text-tertiary)' }}>No model activity yet.</div>}</div>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card glow="rgba(6,182,212,.11)">
          <div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2 text-[10px] font-[850] uppercase tracking-[.14em]" style={{ color: '#06b6d4' }}><Building2 size={13} /> Tenant AI footprint</div><h2 className="mt-1 text-[18px] font-[900] tracking-[-.025em]" style={{ color: 'var(--text-primary)' }}>Top studios by token usage</h2></div><button onClick={() => router.push('/platform?tab=ai')} className="text-[10px] font-[800]" style={{ color: '#06b6d4' }}>View all →</button></div>
          <div className="mt-4 h-[220px]">{studioChart.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={studioChart} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}><CartesianGrid stroke="rgba(148,163,184,.12)" vertical={false} /><XAxis dataKey="studio" tick={{ fontSize: 8.5, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 8.5, fill: 'var(--text-tertiary)' }} tickFormatter={fmtTokens} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 11 }} formatter={(value: number) => [fmtTokens(value), 'Tokens']} /><Bar dataKey="tokens" fill="#06b6d4" radius={[7, 7, 0, 0]} barSize={28} /></BarChart></ResponsiveContainer> : <div className="flex h-[220px] items-center justify-center text-xs" style={{ color: 'var(--text-tertiary)' }}>No studio AI usage yet.</div>}</div>
        </Card>

        <Card glow="rgba(245,158,11,.11)">
          <div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2 text-[10px] font-[850] uppercase tracking-[.14em]" style={{ color: '#f59e0b' }}><Workflow size={13} /> Operator fabric</div><h2 className="mt-1 text-[18px] font-[900] tracking-[-.025em]" style={{ color: 'var(--text-primary)' }}>FreeLLMAPI-inspired control modules</h2></div><span className="rounded-full px-2 py-1 text-[9px] font-[800]" style={{ background: '#f59e0b14', color: '#b45309' }}>REAL DATA</span></div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">{[
            ['Models', Layers3, 'ai'], ['Routing', Route, 'ai'], ['Analytics', LineChart, 'analytics'], ['Fallbacks', Workflow, 'ai'], ['Keys & access', KeyRound, 'security'], ['Agents', WandSparkles, 'ai'], ['Playground', PlayCircle, 'ai'], ['Fusion', BrainCircuit, 'ai'], ['Logs', Activity, 'health'],
          ].map(([label, Icon, tab]) => { const IconComponent = Icon as LucideIcon; return <button key={String(label)} onClick={() => router.push(`/platform?tab=${tab}`)} className="group rounded-[16px] border p-3 text-left transition-transform hover:-translate-y-0.5" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}><span className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: '#f59e0b12', color: '#f59e0b' }}><IconComponent size={15} /></span><span className="mt-2 block text-[11px] font-[800]" style={{ color: 'var(--text-primary)' }}>{label}</span><span className="mt-0.5 flex items-center gap-1 text-[9px]" style={{ color: 'var(--text-tertiary)' }}>Open module <ChevronRight size={10} className="transition-transform group-hover:translate-x-0.5" /></span></button>; })}
          </div>
        </Card>
      </div>

      <div>
        <div className="mb-3 flex items-end justify-between gap-3"><div><div className="text-[10px] font-[850] uppercase tracking-[.16em]" style={{ color: 'var(--text-tertiary)' }}>Command modules</div><h2 className="mt-0.5 text-[18px] font-[900] tracking-[-.025em]" style={{ color: 'var(--text-primary)' }}>Everything the operator needs</h2></div><div className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Multi-tenant control plane</div></div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">{MODULES.map((m) => { const Icon = m.icon; const color = TONE[m.tone]; return <button key={m.tab} onClick={() => router.push(`/platform?tab=${m.tab}`)} className="group rounded-[20px] border p-3.5 text-left transition-all hover:-translate-y-1 hover:shadow-xl" style={{ borderColor: 'var(--border)', background: 'linear-gradient(145deg, color-mix(in srgb, var(--surface) 96%, transparent), var(--bg-subtle))' }}><div className="flex items-center justify-between"><span className="flex h-9 w-9 items-center justify-center rounded-[13px]" style={{ color, background: `${color}12`, boxShadow: `inset 0 1px 0 ${color}24` }}><Icon size={16} /></span><ChevronRight size={13} style={{ color: 'var(--text-disabled)' }} /></div><div className="mt-3 text-[11px] font-[850]" style={{ color: 'var(--text-primary)' }}>{m.label}</div><div className="mt-0.5 text-[9.5px]" style={{ color: 'var(--text-tertiary)' }}>{m.hint}</div></button>; })}</div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 px-3 pt-1 text-center text-[10px]" style={{ color: 'var(--text-tertiary)' }}><span>Live platform snapshot</span><span>·</span><span>real-time control plane</span><span>·</span><span>{data.snapshot?.duration_ms ?? 0}ms collection</span><span>·</span><span>{data.models.length} AI model records</span></div>
    </div>
  );
}
