'use client';
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity, ArrowUpRight, BarChart3, Bot, Boxes, BrainCircuit, CheckCircle2,
  CircleAlert, Database, Gauge, GitBranch, HeartPulse, KeyRound, Layers3,
  LineChart, LockKeyhole, MessageSquare, Network, PlayCircle, RefreshCw,
  ServerCog, ShieldCheck, Sparkles, TerminalSquare, Timer, Users2, Volume2,
  WandSparkles, Workflow, Zap,
} from 'lucide-react';
import { api } from '@/lib/api';
import { palette } from '@/lib/palette';

const C = {
  blue: palette.blue[500], cyan: palette.blue[300], violet: palette.blue[700],
  emerald: palette.emerald[500], amber: palette.amber[500], rose: palette.red[500],
  slate: palette.gray[500], indigo: palette.blue[600],
};

const fmt = (n: number) => n >= 1e9 ? `${(n / 1e9).toFixed(2)}B` : n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : Math.round(n).toLocaleString('en-IN');
const pct = (n: number) => `${Math.max(0, Math.min(100, n)).toFixed(n % 1 ? 1 : 0)}%`;

function Glass({ children, className = '', glow = C.blue }: { children: ReactNode; className?: string; glow?: string }) {
  return <section className={`relative overflow-hidden rounded-[28px] border p-4 sm:p-5 ${className}`} style={{ borderColor: 'var(--border)', background: 'linear-gradient(145deg,color-mix(in srgb,var(--surface) 97%,transparent),color-mix(in srgb,var(--bg-subtle) 92%,transparent))', boxShadow: '0 22px 70px rgba(15,23,42,.07), inset 0 1px 0 rgba(255,255,255,.7)' }}><span aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-44 w-44 rounded-full blur-3xl" style={{ background: glow, opacity: .12 }} /><div className="relative">{children}</div></section>;
}

function SectionTitle({ icon: Icon, label, title, action }: { icon: typeof Activity; label: string; title: string; action?: ReactNode }) {
  return <div className="mb-4 flex items-start justify-between gap-3"><div><div className="flex items-center gap-2 text-[9px] font-[900] uppercase tracking-[.18em]" style={{ color: C.blue }}><Icon size={13} />{label}</div><h2 className="mt-1 text-[18px] font-[950] tracking-[-.03em]" style={{ color: 'var(--text-primary)' }}>{title}</h2></div>{action}</div>;
}

function Donut({ healthy, warning, critical }: { healthy: number; warning: number; critical: number }) {
  const total = Math.max(1, healthy + warning + critical); const r = 43; const circ = 2 * Math.PI * r;
  const parts = [{ v: healthy, color: C.emerald }, { v: warning, color: C.amber }, { v: critical, color: C.rose }]; let offset = 0;
  return <div className="relative h-[190px] w-[190px] shrink-0"><svg viewBox="0 0 110 110" className="h-full w-full -rotate-90 drop-shadow-[0_16px_22px_rgba(37,99,235,.16)]"><defs><filter id="ccGlow"><feGaussianBlur stdDeviation="1.8" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs><circle cx="55" cy="55" r={r} fill="none" stroke="rgba(100,116,139,.13)" strokeWidth="12" />{parts.map((p, i) => { const len = p.v / total * circ; const node = <circle key={i} cx="55" cy="55" r={r} fill="none" stroke={p.color} strokeWidth="12" strokeLinecap="round" strokeDasharray={`${Math.max(0, len - 2)} ${circ}`} strokeDashoffset={-offset} filter="url(#ccGlow)" />; offset += len; return node; })}<circle cx="55" cy="55" r="31" fill="var(--surface)" /></svg><div className="absolute inset-0 flex flex-col items-center justify-center"><b className="text-[28px] font-[950]" style={{ color: 'var(--text-primary)' }}>{Math.round(healthy / total * 100)}%</b><span className="text-[9px] font-[900] uppercase tracking-[.16em]" style={{ color: 'var(--text-tertiary)' }}>healthy</span></div></div>;
}

function MiniBars({ items, color = C.blue }: { items: Array<{ label: string; value: number; sub?: string }>; color?: string }) {
  const max = Math.max(1, ...items.map((x) => x.value));
  return <div className="space-y-3">{items.map((x) => <div key={x.label}><div className="mb-1.5 flex items-center justify-between gap-3"><span className="min-w-0 truncate text-[10.5px] font-[750]" style={{ color: 'var(--text-secondary)' }}>{x.label}</span><span className="shrink-0 text-[10px] font-[900] tabular-nums" style={{ color }}>{x.sub ?? fmt(x.value)}</span></div><div className="h-2 overflow-hidden rounded-full" style={{ background: 'var(--bg-subtle)' }}><div className="h-full rounded-full" style={{ width: `${(x.value / max) * 100}%`, background: `linear-gradient(90deg,${color},color-mix(in srgb,${color} 45%,white))`, boxShadow: `0 0 14px ${color}44` }} /></div></div>)}</div>;
}

function Sparkline({ values, color = C.blue }: { values: number[]; color?: string }) {
  if (!values.length) return <div className="h-[150px] rounded-2xl" style={{ background: 'var(--bg-subtle)' }} />;
  const max = Math.max(...values, 1); const min = Math.min(...values, 0); const span = Math.max(1, max - min);
  const points = values.map((v, i) => `${(i / Math.max(1, values.length - 1)) * 100},${92 - ((v - min) / span) * 72}`).join(' ');
  const area = `0,100 ${points} 100,100`;
  return <div className="relative h-[150px] overflow-hidden rounded-2xl border" style={{ borderColor: 'var(--border)', background: 'linear-gradient(180deg,color-mix(in srgb,var(--bg-subtle) 72%,transparent),transparent)' }}><svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full"><defs><linearGradient id="ccArea" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".32" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs><polygon points={area} fill="url(#ccArea)" /><polyline points={points} fill="none" stroke={color} strokeWidth="1.8" vectorEffect="non-scaling-stroke" /></svg><div className="absolute inset-x-3 bottom-2 flex justify-between text-[8px] font-[700]" style={{ color: 'var(--text-disabled)' }}><span>30d ago</span><span>Today</span></div></div>;
}

function ModuleCard({ icon: Icon, title, copy, color, onClick }: { icon: typeof Activity; title: string; copy: string; color: string; onClick?: () => void }) {
  return <button type="button" onClick={onClick} className="group relative overflow-hidden rounded-[22px] border p-4 text-left transition-all duration-200 hover:-translate-y-0.5" style={{ borderColor: `${color}28`, background: `linear-gradient(145deg,color-mix(in srgb,${color} 7%,var(--surface)),var(--surface))`, boxShadow: '0 14px 38px rgba(15,23,42,.05)' }}><div className="absolute inset-x-0 top-0 h-0.5" style={{ background: `linear-gradient(90deg,${color},transparent)` }} /><span className="mb-5 flex h-9 w-9 items-center justify-center rounded-xl" style={{ color, background: `${color}12`, border: `1px solid ${color}20` }}><Icon size={17} /></span><div className="text-[13px] font-[900]" style={{ color: 'var(--text-primary)' }}>{title}</div><div className="mt-1 text-[10px] leading-4" style={{ color: 'var(--text-tertiary)' }}>{copy}</div><ArrowUpRight size={13} className="absolute bottom-4 right-4 opacity-40 transition-opacity group-hover:opacity-100" style={{ color }} /></button>;
}

export default function Phase2CommandCenterOverview() {
  const router = useRouter();
  const [d, setD] = useState<any>({});
  const [loading, setLoading] = useState(true); const [refreshing, setRefreshing] = useState(false); const [error, setError] = useState('');

  const load = useCallback(async (fresh = false) => {
    fresh ? setRefreshing(true) : setLoading(true); setError('');
    const jobs = [
      ['snapshot', () => api.superAdmin.commandCenter({ fresh })],
      ['ai', () => api.superAdmin.aiOverview(30)],
      ['models', () => api.superAdmin.aiByModel(30)],
      ['studios', () => api.superAdmin.aiByStudio(30)],
      ['trend', () => api.superAdmin.aiTrend(30)],
      ['routing', () => api.superAdmin.aiRouting()],
      ['alerts', () => api.superAdmin.commandCenterAlerts({ scope: 'live', limit: 8 })],
      ['guardian', () => api.superAdmin.commandCenterGuardian({ fresh })],
      ['analytics', () => api.superAdmin.analytics(12)],
      ['security', () => api.superAdmin.securityOverview()],
      ['health', () => api.superAdmin.systemHealth()],
      ['storage', () => api.superAdmin.storageOverview()],
      ['support', () => api.superAdmin.supportOverview()],
    ] as const;
    const results = await Promise.allSettled(jobs.map(([, fn]) => fn())); const next: any = {};
    results.forEach((r, i) => {
      if (r.status !== 'fulfilled') return;
      const value = r.value;
      next[jobs[i][0]] = value && typeof value === 'object' && 'data' in value ? value.data : value;
    });
    setD(next);
    if (!next.snapshot && !next.ai) setError('Command Center telemetry is temporarily unavailable.');
    setLoading(false); setRefreshing(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const snapshot = d.snapshot ?? {}; const cards = Object.values(snapshot.cards ?? {}) as any[];
  const counts = cards.reduce((a: any, c: any) => { a[c.status] = (a[c.status] ?? 0) + 1; return a; }, {});
  const healthy = counts.healthy ?? 0; const warning = (counts.warning ?? 0) + (counts.timeout ?? 0); const critical = counts.critical ?? 0;
  const ai = d.ai ?? {}; const models = Array.isArray(d.models) ? d.models : []; const studios = Array.isArray(d.studios) ? d.studios : []; const trend = Array.isArray(d.trend) ? d.trend : [];
  const modelBars = useMemo(() => models.slice(0, 8).map((m: any) => ({ label: String(m.model ?? 'unknown').split('/').pop()?.slice(0, 22) ?? 'unknown', value: Number(m.requests ?? 0) })), [models]);
  const studioBars = useMemo(() => studios.slice(0, 7).map((s: any) => ({ label: String(s.organization_name ?? 'Unknown').slice(0, 20), value: Number(s.tokens ?? 0) })), [studios]);
  const tokenSeries = useMemo(() => trend.map((x: any) => Number(x.tokens ?? 0)), [trend]);
  const fallback = Number(ai.fallback_pct ?? 0); const requests = Number(ai.requests ?? 0); const tokens = Number(ai.tokens ?? 0);
  const risk = d.guardian?.score ?? d.analytics?.risk_score ?? null;
  const liveAlerts = Array.isArray(d.alerts?.alerts) ? d.alerts.alerts : Array.isArray(d.alerts) ? d.alerts : [];
  const riskLabel = risk == null ? 'Telemetry' : risk >= 80 ? 'Critical' : risk >= 60 ? 'Elevated' : risk >= 35 ? 'Watch' : 'Healthy';

  if (loading) return <div className="flex min-h-[620px] items-center justify-center"><RefreshCw size={24} className="animate-spin" style={{ color: C.blue }} /></div>;
  if (error && !Object.keys(d).length) return <div className="rounded-[26px] border p-10 text-center" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}><CircleAlert className="mx-auto" style={{ color: C.amber }} /><p className="mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{error}</p><button onClick={() => void load(true)} className="mt-4 rounded-xl px-4 py-2 text-xs font-bold text-white" style={{ background: C.blue }}>Retry</button></div>;

  const kpis = [
    ['Platform health', `${healthy}/${Math.max(1, cards.length)}`, 'healthy signals', HeartPulse, C.emerald],
    ['AI requests', fmt(requests), 'last 30 days', Bot, C.blue],
    ['AI tokens', fmt(tokens), `${pct(fallback)} fallback`, Zap, C.cyan],
    ['Live alerts', String(liveAlerts.length), liveAlerts.length ? 'operator attention' : 'all clear', CircleAlert, liveAlerts.length ? C.amber : C.emerald],
    ['Risk posture', risk == null ? 'LIVE' : String(Math.round(risk)), riskLabel, ShieldCheck, riskLabel === 'Healthy' ? C.emerald : C.amber],
  ] as const;

  return <div className="relative space-y-5 overflow-hidden pb-10">
    <div aria-hidden className="pointer-events-none absolute -left-48 -top-44 h-[520px] w-[520px] rounded-full blur-3xl" style={{ background: `radial-gradient(circle,${C.blue}22,transparent 68%)` }} /><div aria-hidden className="pointer-events-none absolute -right-56 top-[300px] h-[620px] w-[620px] rounded-full blur-3xl" style={{ background: `radial-gradient(circle,${C.violet}18,transparent 68%)` }} />
    <div className="relative flex flex-wrap items-end justify-between gap-4"><div><div className="flex items-center gap-2 text-[10px] font-[900] uppercase tracking-[.2em]" style={{ color: C.blue }}><Sparkles size={12} /> Command Center • Phase 2</div><h1 className="mt-1 text-[31px] font-[950] tracking-[-.05em]" style={{ color: 'var(--text-primary)' }}>The whole platform, in one cockpit.</h1><p className="mt-1 max-w-[860px] text-[12px] leading-5" style={{ color: 'var(--text-secondary)' }}>FreeLLMAPI-inspired operator intelligence — smart routing, model telemetry, provider-style health, usage, alerts, security and multi-tenant signals — without touching the rest of the application.</p></div><button type="button" onClick={() => void load(true)} disabled={refreshing} className="flex items-center gap-2 rounded-[14px] border px-4 py-2.5 text-[11px] font-[850]" style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--text-primary)' }}><RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />{refreshing ? 'Refreshing' : 'Refresh live'}</button></div>

    <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">{kpis.map(([label, value, sub, Icon, color]) => <Glass key={label} glow={color}><div className="flex items-start justify-between"><span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ color, background: `${color}12` }}><Icon size={17} /></span><span className="h-2 w-2 rounded-full" style={{ background: color, boxShadow: `0 0 12px ${color}` }} /></div><div className="mt-4 text-[9px] font-[900] uppercase tracking-[.14em]" style={{ color: 'var(--text-tertiary)' }}>{label}</div><div className="mt-1 text-[23px] font-[950] tabular-nums" style={{ color }}>{value}</div><div className="text-[9.5px]" style={{ color: 'var(--text-tertiary)' }}>{sub}</div></Glass>)}</div>

    <div className="grid gap-5 xl:grid-cols-[1.08fr_.92fr]"><Glass glow={C.blue}><SectionTitle icon={Network} label="AI control plane" title="Smart routing & fallback fabric" action={<button onClick={() => router.push('/platform?tab=ai')} className="rounded-full px-3 py-1.5 text-[9px] font-[900]" style={{ background: `${C.blue}10`, color: C.blue }}>Open AI Control →</button>} /><div className="grid gap-2 lg:grid-cols-3">{[['Primary', d.routing?.effective?.primary, C.blue, BrainCircuit], ['Secondary', d.routing?.effective?.secondary, C.cyan, GitBranch], ['Fallback', d.routing?.effective?.fallback, C.amber, ServerCog]].map(([label, value, color, Icon]) => <div key={String(label)} className="rounded-[20px] border p-3.5" style={{ borderColor: `${color}35`, background: `${color}08` }}><div className="flex items-center gap-2 text-[10px] font-[900]" style={{ color: String(color) }}><Icon size={14} />{label}</div><div className="mt-2 truncate font-mono text-[10px] font-[800]" style={{ color: 'var(--text-primary)' }}>{String(value ?? 'Not configured')}</div><div className="mt-1 text-[9px]" style={{ color: 'var(--text-tertiary)' }}>Live routing tier</div></div>)}</div><div className="mt-4 grid grid-cols-3 gap-2"><div className="rounded-xl p-3" style={{ background: 'var(--bg-subtle)' }}><span className="text-[8px] uppercase" style={{ color: 'var(--text-tertiary)' }}>Models</span><b className="mt-1 block text-[17px]">{models.length}</b></div><div className="rounded-xl p-3" style={{ background: 'var(--bg-subtle)' }}><span className="text-[8px] uppercase" style={{ color: 'var(--text-tertiary)' }}>Fallback</span><b className="mt-1 block text-[17px]" style={{ color: fallback > 10 ? C.amber : C.emerald }}>{pct(fallback)}</b></div><div className="rounded-xl p-3" style={{ background: 'var(--bg-subtle)' }}><span className="text-[8px] uppercase" style={{ color: 'var(--text-tertiary)' }}>Latency</span><b className="mt-1 block text-[17px]">{Number(ai.avg_latency_ms ?? 0)}ms</b></div></div></Glass>
      <Glass glow={C.emerald}><SectionTitle icon={Gauge} label="Platform topology" title="Live health pulse" /><div className="flex items-center gap-5"><Donut healthy={healthy} warning={warning} critical={critical} /><div className="min-w-0 flex-1 space-y-2.5">{[['Healthy', healthy, C.emerald], ['Warning / timeout', warning, C.amber], ['Critical', critical, C.rose]].map(([label, value, color]) => <div key={String(label)} className="flex items-center justify-between"><span className="flex items-center gap-2 text-[10px]" style={{ color: 'var(--text-secondary)' }}><i className="h-2 w-2 rounded-full" style={{ background: String(color) }} />{label}</span><b className="text-[12px]">{value}</b></div>)}<div className="mt-3 rounded-xl p-3" style={{ background: 'var(--bg-subtle)' }}><div className="flex items-center gap-2 text-[9px] font-[900] uppercase" style={{ color: C.emerald }}><CheckCircle2 size={12} /> {snapshot.status ?? 'live'}</div><p className="mt-1 text-[9px] leading-4" style={{ color: 'var(--text-tertiary)' }}>Snapshot collected in {snapshot.duration_ms ?? 0}ms.</p></div></div></div></Glass></div>

    <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]"><Glass glow={C.cyan}><SectionTitle icon={LineChart} label="AI telemetry" title="Token flow & request pressure" action={<span className="rounded-full px-2.5 py-1 text-[8px] font-[900]" style={{ background: `${C.cyan}10`, color: C.cyan }}>30 DAY</span>} /><Sparkline values={tokenSeries} color={C.cyan} /><div className="mt-3 grid grid-cols-3 gap-2"><div className="rounded-xl p-3" style={{ background: 'var(--bg-subtle)' }}><span className="text-[8px] uppercase" style={{ color: 'var(--text-tertiary)' }}>Peak day</span><b className="mt-1 block text-[14px]">{fmt(Math.max(0, ...tokenSeries))}</b></div><div className="rounded-xl p-3" style={{ background: 'var(--bg-subtle)' }}><span className="text-[8px] uppercase" style={{ color: 'var(--text-tertiary)' }}>Avg latency</span><b className="mt-1 block text-[14px]">{Number(ai.avg_latency_ms ?? 0)}ms</b></div><div className="rounded-xl p-3" style={{ background: 'var(--bg-subtle)' }}><span className="text-[8px] uppercase" style={{ color: 'var(--text-tertiary)' }}>Fallback</span><b className="mt-1 block text-[14px]">{pct(fallback)}</b></div></div></Glass><Glass glow={C.violet}><SectionTitle icon={BarChart3} label="Model intelligence" title="Top model traffic" action={<span className="text-[9px]" style={{ color: 'var(--text-tertiary)' }}>requests</span>} /><MiniBars items={modelBars.length ? modelBars : [{ label: 'No model telemetry yet', value: 1, sub: '—' }]} color={C.violet} /></Glass></div>

    <div className="grid gap-5 xl:grid-cols-2"><Glass glow={C.indigo}><SectionTitle icon={Users2} label="Multi-tenant intelligence" title="Studio AI consumption" action={<button onClick={() => router.push('/platform?tab=analytics')} className="text-[9px] font-[900]" style={{ color: C.indigo }}>Open Analytics →</button>} /><MiniBars items={studioBars.length ? studioBars : [{ label: 'No studio telemetry yet', value: 1, sub: '—' }]} color={C.indigo} /></Glass><Glass glow={C.amber}><SectionTitle icon={CircleAlert as typeof Activity} label="Operator alerts" title="What needs attention" action={<button onClick={() => router.push('/platform?tab=health')} className="text-[9px] font-[900]" style={{ color: C.amber }}>Open Health →</button>} />{liveAlerts.length ? <div className="space-y-2">{liveAlerts.slice(0, 5).map((a: any) => <div key={String(a.id ?? a.title)} className="flex items-center gap-3 rounded-xl p-3" style={{ background: 'var(--bg-subtle)' }}><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: a.severity === 'critical' ? C.rose : C.amber }} /><div className="min-w-0 flex-1"><div className="truncate text-[10.5px] font-[850]" style={{ color: 'var(--text-primary)' }}>{a.title ?? a.message ?? 'Operator alert'}</div><div className="mt-0.5 truncate text-[9px]" style={{ color: 'var(--text-tertiary)' }}>{a.severity ?? 'warning'} · {a.source ?? 'platform'}</div></div></div>)}</div> : <div className="flex items-center gap-3 rounded-2xl p-5" style={{ background: `${C.emerald}08` }}><CheckCircle2 size={19} style={{ color: C.emerald }} /><div><b className="text-[11px]" style={{ color: 'var(--text-primary)' }}>No live alerts</b><p className="mt-0.5 text-[9px]" style={{ color: 'var(--text-tertiary)' }}>The operator queue is clear right now.</p></div></div>}</Glass></div>

    <Glass glow={C.rose}><SectionTitle icon={ShieldCheck} label="Risk & observability" title="Security, infrastructure and service posture" /><div className="grid grid-cols-2 gap-2 md:grid-cols-4">{[['Security', d.security?.status ?? d.security?.level ?? 'live', LockKeyhole, C.rose, '/platform?tab=security'], ['Infrastructure', d.health?.status ?? 'live', ServerCog, C.emerald, '/platform?tab=health'], ['Storage', d.storage?.status ?? 'live', Database, C.cyan, '/platform?tab=storage'], ['Support', d.support?.open_tickets ?? d.support?.open ?? 'live', MessageSquare, C.violet, '/platform?tab=support']].map(([label, value, Icon, color, href]) => <button key={String(label)} onClick={() => router.push(String(href))} className="rounded-[18px] border p-3 text-left transition-transform hover:-translate-y-0.5" style={{ borderColor: `${color}22`, background: `${color}07` }}><Icon size={15} style={{ color: String(color) }} /><div className="mt-3 text-[10px] font-[900]" style={{ color: 'var(--text-primary)' }}>{label}</div><div className="mt-1 truncate text-[10px] font-[800]" style={{ color: String(color) }}>{String(value)}</div></button>)}</div></Glass>

    <div><div className="mb-3 flex items-end justify-between"><div><div className="text-[9px] font-[900] uppercase tracking-[.18em]" style={{ color: C.blue }}>FreeLLMAPI parity layer</div><h2 className="mt-1 text-[21px] font-[950] tracking-[-.035em]" style={{ color: 'var(--text-primary)' }}>Every operator surface, one command deck.</h2></div><span className="hidden text-[9px] font-[800] sm:block" style={{ color: 'var(--text-tertiary)' }}>navigation only • existing modules preserved</span></div><div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">{[
      [Layers3, 'Models', 'Catalog, capabilities & health', C.blue, '/platform?tab=ai'],
      [Workflow, 'Routing', 'Balanced, fastest, smartest & fallback', C.cyan, '/platform?tab=ai'],
      [BarChart3, 'Analytics', 'Usage, latency, tokens & trends', C.violet, '/platform?tab=analytics'],
      [GitBranch, 'Fallbacks', 'Failure trail & resilience', C.amber, '/platform?tab=health'],
      [KeyRound, 'Keys & access', 'Access, sessions & security', C.rose, '/platform?tab=security'],
      [WandSparkles, 'Agents', 'AI operators & automation', C.indigo, '/platform?tab=ai'],
      [PlayCircle, 'Playground', 'Live AI testing surface', C.emerald, '/platform?tab=ai'],
      [Boxes, 'Fusion', 'Multi-model synthesis', C.violet, '/platform?tab=ai'],
      [Activity, 'Logs', 'Live tail & persisted history', C.slate, '/platform?tab=activity'],
      [Database, 'Embeddings', 'Vector model readiness', C.cyan, '/platform?tab=ai'],
      [WandSparkles, 'Image & vision', 'Media capability readiness', C.rose, '/platform?tab=ai'],
      [Volume2, 'Audio / TTS', 'Speech model readiness', C.amber, '/platform?tab=ai'],
      [Timer, 'Cache', 'Response efficiency & savings', C.emerald, '/platform?tab=health'],
      [TerminalSquare, 'MCP & API docs', 'Developer gateway surfaces', C.indigo, '/platform?tab=ai'],
      [Network, 'Provider health', 'Upstream reliability matrix', C.blue, '/platform?tab=health'],
      [MessageSquare, 'Client integrations', 'SDKs, agents & connectors', C.violet, '/platform?tab=ai'],
    ].map(([Icon, title, copy, color, href]) => <ModuleCard key={String(title)} icon={Icon as typeof Activity} title={String(title)} copy={String(copy)} color={String(color)} onClick={() => router.push(String(href))} />)}</div></div>
  </div>;
}
