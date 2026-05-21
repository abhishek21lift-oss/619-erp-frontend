'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Users, Dumbbell, IndianRupee,
  AlertCircle, RefreshCw, UserCheck, Calendar,
  Sparkles, Brain, ChevronRight, Zap, Plus, Clock,
  Activity, Target, Flame, Heart, Star, Shield,
  ArrowUpRight, ArrowDownRight, Trophy, Award,
  UserPlus, Wallet, Apple, BarChart3, Bot, X,
} from 'lucide-react';
import Link from 'next/link';
import {
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  ResponsiveContainer, Tooltip, BarChart, Bar,
} from 'recharts';
import { cn } from '@/components/ui/cn';
import { useAsync } from '@/lib/use-async';
import { request } from '@/lib/http';
import AiCoachingLayer from '../AiCoachingLayer';

/* ─── CONSTANTS ────────────────────────────────────── */

const RED = '#ff204e';
const RED_GLOW = 'rgba(255,32,78,0.35)';
const RED_SOFT = 'rgba(255,32,78,0.12)';
const DARK = '#050505';
const GLASS = 'rgba(255,255,255,0.04)';
const GLASS_BORDER = 'rgba(255,255,255,0.07)';

/* ─── TYPES ─────────────────────────────────────────── */

interface DashboardData {
  overview: {
    active_clients: number;
    upcoming_sessions: number;
    completed_sessions_month: number;
    revenue_month: number;
    revenue_total: number;
    total_assignments: number;
  };
  revenue_trend: { month: string; month_key: string; m: number; y: number; revenue: number }[];
  package_distribution: { type: string; count: number; revenue: number }[];
  session_stats: { completed: number; missed: number; cancelled: number; scheduled: number; total: number };
  trainer_leaderboard: {
    id: string; name: string; photo_url: string | null;
    active_clients: number; sessions_month: number;
    earnings_total: number; avg_health_score: number; avg_adherence: number;
  }[];
  recent_activity: {
    id: string; event_type: string; title: string; description: string;
    client_name: string; trainer_name: string; occurred_at: string;
  }[];
  alerts: {
    type: string; id: string; client_name: string; trainer_name: string;
    end_date: string; days_left: number;
  }[];
  insights: {
    id: string; insight_type: string; severity: string; title: string;
    description: string; confidence: number; client_name: string; trainer_name: string;
    suggested_action: string; action_link: string;
  }[];
  retention: { active: number; completed: number; cancelled: number; expired: number };
}

/* ─── SHARED STYLES ────────────────────────────────── */

const glassCard = 'rounded-2xl border backdrop-blur-2xl transition-all duration-300';
const glassCardStyle = {
  background: GLASS,
  borderColor: GLASS_BORDER,
  boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)',
};
const sectionTitle = 'text-[11px] font-bold uppercase tracking-[0.18em] text-white/40';

/* ─── NUMBER FORMATTERS ────────────────────────────── */

const fmtINR = (n: number) => {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n}`;
};

/* ─── SUB-COMPONENTS ───────────────────────────────── */

function Sparkline({ data, color = RED, height = 32 }: { data: number[]; color?: string; height?: number }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const w = data.length * 12;
  const pts = data.map((v, i) => `${i * 12 + 6},${height - (v / max) * (height - 4) - 2}`).join(' ');
  return (
    <svg width={w} height={height} className="w-full">
      <defs>
        <linearGradient id={`sf-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={`M${pts}`} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <polygon points={`0,${height} ${pts} ${data.length * 12 + 6},${height}`} fill={`url(#sf-${color.replace('#', '')})`} />
    </svg>
  );
}

function KpiDonut({ value, size = 56 }: { value: number; size?: number }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(value, 100) / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={4} />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={RED}
        strokeWidth={4} strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 2, ease: [0.16, 1, 0.3, 1] }}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ filter: 'drop-shadow(0 0 6px rgba(255,32,78,0.4))' }}
      />
    </svg>
  );
}

function RadialProgress({ value, size = 48, strokeWidth = 3, color = RED }: { value: number; size?: number; strokeWidth?: number; color?: string }) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(value, 100) / 100) * circ;
  return (
    <svg width={size} height={size} className="shrink-0" viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color}
        strokeWidth={strokeWidth} strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
        fill="white" fontSize={size * 0.28} fontWeight={700} fontFamily="Inter, sans-serif">
        {value}%
      </text>
    </svg>
  );
}

/* ─── LOADING SKELETON ─────────────────────────────── */

function LoadingSkeleton() {
  const shimmer = 'animate-pulse rounded-lg';
  return (
    <div className="relative min-h-screen pb-12" style={{ background: DARK }}>
      <div className="mx-auto max-w-[1600px] space-y-6 px-4 sm:px-6 lg:px-8 pt-12">
        <div className={`${shimmer} h-16 w-96`} style={{ background: GLASS }} />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`${shimmer} h-32 rounded-2xl border`} style={{ background: GLASS, borderColor: GLASS_BORDER }} />
          ))}
        </div>
        <div className={`${shimmer} h-80 rounded-2xl border`} style={{ background: GLASS, borderColor: GLASS_BORDER }} />
      </div>
    </div>
  );
}

/* ─── HERO ─────────────────────────────────────────── */

function HeroSection({ data, period, setPeriod }: { data: DashboardData; period: string; setPeriod: (p: string) => void }) {
  const periods = ['Today', '7D', '30D', '90D'];
  const h = new Date().getHours();
  const greeting = h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[11px] font-semibold" style={{ background: RED_SOFT, borderColor: RED_GLOW }}>
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#ff204e]" />
              </span>
              <span className="text-white/90">AI Assistant Active</span>
              <Sparkles className="h-3 w-3" style={{ color: RED }} />
            </div>
          </div>
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl" style={{ color: '#f5f5f5' }}>
            {greeting}, Coach
          </h1>
          <p className="mt-1.5 text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
            {data.overview.active_clients} active PT clients · {data.overview.upcoming_sessions} upcoming sessions · {fmtINR(data.overview.revenue_month)} earned this month
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 rounded-2xl p-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {periods.map((p) => (
          <button key={p} onClick={() => setPeriod(p)}
            className={cn('rounded-xl px-3.5 py-1.5 text-[11px] font-semibold transition-all', period === p ? 'text-white' : 'text-white/40 hover:text-white/70')}
            style={period === p ? { background: RED, boxShadow: `0 4px 12px ${RED_GLOW}` } : {}}
          >
            {p}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

/* ─── KPI CARDS ────────────────────────────────────── */

function KpiCardGrid({ data }: { data: DashboardData }) {
  const revTrend = data.revenue_trend.map(r => r.revenue);
  const kpis = [
    { label: 'Active PT Clients', value: String(data.overview.active_clients), change: null, chart: [], color: '#34d399', progress: 0 },
    { label: 'Monthly Revenue', value: fmtINR(data.overview.revenue_month), change: null, chart: revTrend, color: RED, progress: data.overview.revenue_month > 0 ? Math.min(Math.round(data.overview.revenue_month / 150000 * 100), 100) : 0 },
    { label: 'Sessions This Month', value: String(data.overview.completed_sessions_month), change: null, chart: [], color: '#38bdf8', progress: data.overview.completed_sessions_month > 0 ? Math.min(Math.round(data.overview.completed_sessions_month / 100 * 100), 100) : 0 },
    { label: 'Completed Sessions', value: String(data.session_stats.completed), change: null, chart: [], color: '#a78bfa', progress: data.session_stats.total > 0 ? Math.round(data.session_stats.completed / data.session_stats.total * 100) : 0 },
    { label: 'Session Completion', value: data.session_stats.total > 0 ? `${Math.round(data.session_stats.completed / data.session_stats.total * 100)}%` : '0%', change: null, chart: [], color: '#38bdf8', progress: data.session_stats.total > 0 ? Math.round(data.session_stats.completed / data.session_stats.total * 100) : 0 },
    { label: 'Total Assignments', value: String(data.overview.total_assignments), change: null, chart: [], color: '#fbbf24', progress: 0 },
    { label: 'Retention Rate', value: `${data.retention.active > 0 ? Math.round(data.retention.active / (data.retention.active + data.retention.completed + data.retention.cancelled + data.retention.expired) * 100) : 0}%`, change: null, chart: [], color: '#34d399', progress: data.retention.active > 0 ? Math.round(data.retention.active / (data.retention.active + data.retention.completed + data.retention.cancelled + data.retention.expired) * 100) : 0 },
    { label: 'Total Revenue', value: fmtINR(data.overview.revenue_total), change: null, chart: revTrend, color: '#f87171', progress: 65 },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {kpis.map((kpi, i) => (
        <motion.div
          key={kpi.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06, type: 'spring', stiffness: 200, damping: 20 }}
          className={cn(glassCard, 'group relative overflow-hidden p-4 hover:-translate-y-0.5')}
          style={{ ...glassCardStyle, '--tw-ring-color': `${kpi.color}20` } as React.CSSProperties}
          onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = `${kpi.color}40`; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = GLASS_BORDER; }}
        >
          <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-[0.08]" style={{ background: `radial-gradient(circle, ${kpi.color}, transparent 70%)` }} />
          <div className="relative">
            <div className="flex items-start justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.35)' }}>{kpi.label}</span>
              {kpi.progress > 0 && <KpiDonut value={kpi.progress} size={40} />}
            </div>
            <div className="mt-3 flex items-end justify-between">
              <div>
                <motion.p
                  className="text-2xl font-black tracking-tight"
                  style={{ color: '#f5f5f5' }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 + i * 0.06 }}
                >
                  {kpi.value}
                </motion.p>
              </div>
            </div>
            {kpi.chart.length > 1 && (
              <div className="mt-3 opacity-60 group-hover:opacity-100 transition-opacity">
                <Sparkline data={kpi.chart} color={kpi.color} height={28} />
              </div>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* ─── CHARTS ────────────────────────────────────────── */

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border px-3 py-2 text-xs backdrop-blur-2xl" style={{ background: 'rgba(5,5,5,0.9)', borderColor: GLASS_BORDER }}>
      <p className="mb-1 font-semibold text-white/70">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color || RED }} className="font-bold">
          {p.name}: {typeof p.value === 'number' ? fmtINR(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

function AnalyticsSection({ data }: { data: DashboardData }) {
  const trend = data.revenue_trend.length ? data.revenue_trend : [{ month: 'N/A', revenue: 0, target: 0 }];
  const pkgColors = [RED, '#ff6b8a', '#ff9eb3', 'rgba(255,32,78,0.4)'];
  const pkgData = data.package_distribution.length ? data.package_distribution.map((p, i) => ({ name: p.type, value: p.count, color: pkgColors[i % pkgColors.length], revenue: p.revenue })) : [{ name: 'No data', value: 1, color: 'rgba(255,255,255,0.08)', revenue: 0 }];
  const pkgTotal = pkgData.reduce((s, p) => s + p.value, 0);

  const sessionBarData = [
    { name: 'Completed', sessions: data.session_stats.completed, fill: RED },
    { name: 'Missed', sessions: data.session_stats.missed, fill: '#f87171' },
    { name: 'Cancelled', sessions: data.session_stats.cancelled, fill: 'rgba(255,255,255,0.15)' },
    { name: 'Scheduled', sessions: data.session_stats.scheduled, fill: '#38bdf8' },
  ].filter(d => d.sessions > 0);

  const retentionData = data.revenue_trend.length > 2 ? data.revenue_trend.slice(-6) : [];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* Revenue Trend */}
      <div className={cn(glassCard, 'lg:col-span-2 p-5')} style={glassCardStyle}>
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className={sectionTitle}>Revenue Trend</p>
            <p className="mt-1 text-2xl font-black text-white">{fmtINR(data.overview.revenue_total)}</p>
          </div>
          <span className="flex items-center gap-1.5 text-[11px] text-white/50"><span className="h-2 w-2 rounded-full" style={{ background: RED }} /> Revenue</span>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={RED} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={RED} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="revenue" stroke={RED} strokeWidth={2.5} fill="url(#revGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Package Distribution */}
      <div className={cn(glassCard, 'p-5')} style={glassCardStyle}>
        <div className="mb-3">
          <p className={sectionTitle}>Package Distribution</p>
          <p className="mt-1 text-sm text-white/60">{pkgTotal} total assignments</p>
        </div>
        <div className="flex items-center justify-center h-44">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pkgData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value" stroke="none">
                {pkgData.map((_, i) => (
                  <Cell key={i} fill={pkgData[i].color} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 space-y-1.5">
          {pkgData.map((p) => (
            <div key={p.name} className="flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
                <span className="text-white/60 capitalize">{p.name.replace(/_/g, ' ')}</span>
              </span>
              <span className="font-semibold text-white/80">{Math.round(p.value / pkgTotal * 100)}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Session Stats */}
      <div className={cn(glassCard, 'p-5')} style={glassCardStyle}>
        <div className="mb-3">
          <p className={sectionTitle}>Session Overview</p>
          <p className="mt-1 text-sm text-white/60">This month breakdown</p>
        </div>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sessionBarData}>
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="sessions" radius={[4, 4, 0, 0]} fill={RED}>
                {sessionBarData.map((_, i) => (
                  <Cell key={i} fill={sessionBarData[i].fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-center">
          <div className="rounded-xl p-2.5" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <p className="text-lg font-black text-white">{data.session_stats.total}</p>
            <p className="text-[10px] text-white/40">Total Sessions</p>
          </div>
          <div className="rounded-xl p-2.5" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <p className="text-lg font-black text-white">{data.session_stats.total > 0 ? Math.round(data.session_stats.completed / data.session_stats.total * 100) : 0}%</p>
            <p className="text-[10px] text-white/40">Completion Rate</p>
          </div>
        </div>
      </div>

      {/* Retention Chart */}
      <div className={cn(glassCard, 'p-5')} style={glassCardStyle}>
        <div className="mb-3">
          <p className={sectionTitle}>Client Retention</p>
          <p className="mt-1 text-sm text-white/60">Active vs completed vs churned</p>
        </div>
        {retentionData.length > 0 ? (
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={retentionData}>
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="revenue" stroke={RED} strokeWidth={2.5} dot={{ fill: RED, stroke: '#050505', strokeWidth: 2, r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-44 items-center justify-center">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div><p className="text-2xl font-black text-white">{data.retention.active}</p><p className="text-[10px] text-white/40">Active</p></div>
              <div><p className="text-2xl font-black text-white">{data.retention.completed}</p><p className="text-[10px] text-white/40">Done</p></div>
              <div><p className="text-2xl font-black text-white">{data.retention.cancelled + data.retention.expired}</p><p className="text-[10px] text-white/40">Churned</p></div>
            </div>
          </div>
        )}
        <div className="mt-2 flex items-center justify-center gap-6 text-[11px]">
          <span className="flex items-center gap-1.5 text-white/50"><span className="h-2 w-2 rounded-full" style={{ background: RED }} /> {data.retention.active > 0 ? Math.round(data.retention.active / (data.retention.active + data.retention.cancelled + data.retention.expired) * 100) : 0}% Retention</span>
        </div>
      </div>

      {/* Revenue Pulse */}
      <div className={cn(glassCard, 'p-5')} style={glassCardStyle}>
        <div className="mb-3">
          <p className={sectionTitle}>Alerts</p>
          <p className="mt-1 text-sm text-white/60">{data.alerts.length} items need attention</p>
        </div>
        <div className="space-y-2">
          {data.alerts.length === 0 && (
            <p className="text-xs text-white/30 py-8 text-center">All clear — no alerts</p>
          )}
          {data.alerts.slice(0, 4).map((a) => (
            <div key={a.id} className="flex items-start gap-2 rounded-xl p-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <AlertCircle className={cn('h-3.5 w-3.5 mt-0.5 shrink-0', a.type === 'expiring' ? 'text-yellow-400' : 'text-red-400')} />
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-white/70 truncate">{a.client_name}</p>
                <p className="text-[10px] text-white/40">{a.type === 'expiring' ? `${a.days_left}d remaining` : `${a.days_left}d overdue`}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── AI INSIGHTS ──────────────────────────────────── */

function AiInsightsSection({ insights, onDismiss }: { insights: DashboardData['insights']; onDismiss?: (id: string) => void }) {
  const typeConfig: Record<string, { icon: any; border: string; glow: string; bg: string }> = {
    churn_risk: { icon: AlertCircle, border: 'rgba(255,32,78,0.3)', glow: 'rgba(255,32,78,0.15)', bg: 'rgba(255,32,78,0.06)' },
    revenue_alert: { icon: Target, border: 'rgba(251,191,36,0.3)', glow: 'rgba(251,191,36,0.15)', bg: 'rgba(251,191,36,0.06)' },
    upsell: { icon: TrendingUp, border: 'rgba(56,189,248,0.3)', glow: 'rgba(56,189,248,0.15)', bg: 'rgba(56,189,248,0.06)' },
    milestone: { icon: Trophy, border: 'rgba(52,211,153,0.3)', glow: 'rgba(52,211,153,0.15)', bg: 'rgba(52,211,153,0.06)' },
    performance: { icon: Trophy, border: 'rgba(52,211,153,0.3)', glow: 'rgba(52,211,153,0.15)', bg: 'rgba(52,211,153,0.06)' },
    bottleneck: { icon: AlertCircle, border: 'rgba(255,32,78,0.3)', glow: 'rgba(255,32,78,0.15)', bg: 'rgba(255,32,78,0.06)' },
    schedule_gap: { icon: Calendar, border: 'rgba(251,191,36,0.3)', glow: 'rgba(251,191,36,0.15)', bg: 'rgba(251,191,36,0.06)' },
    adherence_drop: { icon: Activity, border: 'rgba(255,32,78,0.3)', glow: 'rgba(255,32,78,0.15)', bg: 'rgba(255,32,78,0.06)' },
  };

  const getCfg = (type: string) => typeConfig[type] || { icon: Brain, border: 'rgba(255,255,255,0.2)', glow: 'rgba(255,255,255,0.1)', bg: 'rgba(255,255,255,0.03)' };

  if (!insights.length) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: RED_SOFT }}>
          <Brain className="h-4 w-4" style={{ color: RED }} />
        </div>
        <h3 className="text-sm font-bold text-white/90">AI Coaching Intelligence</h3>
        <span className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider" style={{ background: RED_SOFT, color: RED }}>Live</span>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {insights.map((insight, i) => {
          const cfg = getCfg(insight.insight_type);
          const Icon = cfg.icon;
          return (
            <motion.div
              key={insight.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className={cn(glassCard, 'group relative overflow-hidden p-4')}
              style={{ background: cfg.bg, borderColor: cfg.border, boxShadow: `0 4px 20px ${cfg.glow}` }}
            >
              <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-30" style={{ background: `radial-gradient(circle, ${cfg.border}, transparent 70%)` }} />
              <div className="relative flex gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl backdrop-blur-md" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <Icon className="h-4 w-4" style={{ color: cfg.border }} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-bold text-white/90">{insight.title}</h4>
                    {onDismiss && (
                      <button onClick={() => onDismiss(insight.id)} className="shrink-0 rounded-lg p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/5">
                        <X className="h-3 w-3 text-white/40" />
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>{insight.description}</p>
                  {insight.suggested_action && (
                    <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: RED }}>
                      {insight.suggested_action} <ChevronRight className="h-3 w-3" />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── TRAINER PERFORMANCE ──────────────────────────── */

function TrainerSection({ trainers }: { trainers: DashboardData['trainer_leaderboard'] }) {
  const sorted = [...trainers].sort((a, b) => b.sessions_month - a.sessions_month || b.avg_health_score - a.avg_health_score);

  return (
    <div className={cn(glassCard, 'p-5')} style={glassCardStyle}>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className={sectionTitle}>Trainer Performance</p>
          <p className="mt-1 text-sm text-white/60">Ranked by sessions this month</p>
        </div>
        <Link href="/pt-os/trainers" className="text-[11px] font-semibold transition-all hover:gap-2 flex items-center gap-1" style={{ color: RED }}>
          View All <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="space-y-2">
        {sorted.length === 0 && (
          <p className="text-xs text-white/30 py-8 text-center">No trainer data yet</p>
        )}
        {sorted.map((t, i) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="group flex items-center gap-4 rounded-xl p-3 transition-all hover:translate-x-0.5"
            style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}
          >
            <span className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[11px] font-black',
              i === 0 ? 'text-yellow-400' : i === 1 ? 'text-zinc-300' : i === 2 ? 'text-orange-400' : 'text-white/20',
            )} style={{ background: 'rgba(255,255,255,0.04)' }}>
              {i + 1}
            </span>

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: `linear-gradient(135deg, ${RED}, #ff6b8a)` }}>
              {t.name.split(' ').map(n => n[0]).join('') || '?'}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-white/90">{t.name}</p>
              </div>
              <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{t.active_clients} clients · {t.sessions_month} sessions</p>
            </div>

            <div className="hidden sm:block w-24">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-white/40">Adh.</span>
                <span className="font-semibold text-white/70">{t.avg_adherence}%</span>
              </div>
              <div className="mt-1 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <motion.div
                  className="h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${t.avg_adherence}%` }}
                  transition={{ delay: 0.2 + i * 0.05, duration: 1 }}
                  style={{ background: t.avg_adherence >= 80 ? '#34d399' : t.avg_adherence >= 60 ? '#fbbf24' : RED }}
                />
              </div>
            </div>

            <div className="hidden md:block">
              <RadialProgress value={t.avg_health_score} size={40} strokeWidth={3} color={t.avg_health_score >= 80 ? '#34d399' : t.avg_health_score >= 60 ? '#fbbf24' : RED} />
            </div>

            <div className="text-right">
              <p className="text-sm font-bold text-white/90">{fmtINR(t.earnings_total)}</p>
              <p className="text-[10px] text-white/30">Earnings</p>
            </div>

            <div className={cn('flex items-center gap-0.5 text-[11px] font-semibold', i <= 1 ? 'text-emerald-400' : i >= 3 ? 'text-red-400' : 'text-white/40')}>
              {i <= 1 ? <TrendingUp className="h-3 w-3" /> : i >= 3 ? <TrendingDown className="h-3 w-3" /> : null}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ─── ACTIVITY FEED ────────────────────────────────── */

function ActivitySection({ events }: { events: DashboardData['recent_activity'] }) {
  const typeColors: Record<string, string> = {
    workout_completed: '#34d399', payment_received: '#38bdf8', package_purchased: '#a78bfa',
    missed_checkin: RED, trainer_note: '#fbbf24', milestone_achieved: '#f472b6',
    progress_photo: '#38bdf8', meal_uploaded: '#34d399', message_sent: '#a78bfa',
    goal_updated: '#fbbf24', measurement_logged: '#38bdf8', package_renewed: '#34d399',
    assessment_completed: '#a78bfa',
  };

  const defaultColor = 'rgba(255,255,255,0.3)';

  if (!events.length) return null;

  return (
    <div className={cn(glassCard, 'p-5')} style={glassCardStyle}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className={sectionTitle}>Live Activity</p>
          <p className="mt-0.5 text-[11px] text-white/30">Real-time coaching feed</p>
        </div>
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full" style={{ background: RED, opacity: 0.5 }} />
          <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: RED }} />
        </span>
      </div>
      <div className="relative space-y-0">
        <div className="absolute left-[13px] top-2 bottom-2 w-px" style={{ background: 'linear-gradient(to bottom, rgba(255,32,78,0.3), transparent)' }} />
        {events.slice(0, 8).map((item, i) => {
          const color = typeColors[item.event_type] || defaultColor;
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="group relative flex items-start gap-4 py-2.5 pl-0"
            >
              <span className="relative z-10 flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full backdrop-blur-md transition-transform group-hover:scale-110" style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
                <Activity className="h-3 w-3" style={{ color }} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-medium text-white/70 group-hover:text-white/90 transition-colors">
                  {item.description || item.title || `${item.event_type.replace(/_/g, ' ')} — ${item.client_name || ''}`}
                </p>
                <p className="mt-0.5 text-[10px] text-white/30">{item.occurred_at ? new Date(item.occurred_at).toLocaleString() : ''}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── QUICK ACTIONS ────────────────────────────────── */

function QuickActionsSection() {
  const actions = [
    { label: 'Add PT Client', icon: UserPlus, desc: 'Intake wizard', gradient: 'from-red-600 to-rose-700' },
    { label: 'Schedule Session', icon: Calendar, desc: 'Book a slot', gradient: 'from-rose-600 to-pink-700' },
    { label: 'Create Workout', icon: Dumbbell, desc: 'Program builder', gradient: 'from-red-700 to-rose-800' },
    { label: 'Record Payment', icon: Wallet, desc: 'PT revenue', gradient: 'from-rose-500 to-red-600' },
    { label: 'Nutrition Plan', icon: Apple, desc: 'Diet assignment', gradient: 'from-pink-600 to-rose-700' },
    { label: 'AI Workout', icon: Brain, desc: 'Auto-generate', gradient: 'from-red-500 to-pink-600' },
  ];

  return (
    <div className="flex gap-2.5 overflow-x-auto pb-2 snap-x snap-mandatory" style={{ scrollbarWidth: 'none' }}>
      {actions.map((action, i) => {
        const Icon = action.icon;
        return (
          <motion.div
            key={action.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="snap-start shrink-0"
          >
            <Link
              href="#"
              className="group relative flex items-center gap-3 overflow-hidden rounded-2xl border px-4 py-3.5 transition-all duration-300 hover:-translate-y-1"
              style={{
                background: `linear-gradient(135deg, rgba(255,32,78,0.12), rgba(255,255,255,0.02))`,
                borderColor: 'rgba(255,255,255,0.08)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                minWidth: 180,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${RED}50`; e.currentTarget.style.boxShadow = `0 8px 32px ${RED_GLOW}`; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.2)'; }}
            >
              <div className="pointer-events-none absolute -right-6 -top-6 h-16 w-16 rounded-full opacity-20" style={{ background: `radial-gradient(circle, ${RED}, transparent 70%)` }} />
              <div className="relative flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl backdrop-blur-md transition-transform group-hover:scale-110 group-hover:-rotate-3" style={{ background: `linear-gradient(135deg, ${RED}30, rgba(255,255,255,0.05))`, border: `1px solid ${RED}30` }}>
                  <Icon className="h-5 w-5" style={{ color: RED }} />
                </div>
                <div>
                  <p className="text-sm font-bold text-white/90">{action.label}</p>
                  <p className="text-[10px] font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}>{action.desc}</p>
                </div>
              </div>
              <ChevronRight className="relative h-4 w-4 text-white/20 transition-all group-hover:translate-x-0.5 group-hover:text-white/60" />
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ─── ERROR STATE ──────────────────────────────────── */

function ErrorState({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4" style={{ background: DARK }}>
      <AlertCircle className="h-12 w-12" style={{ color: RED }} />
      <p className="text-lg font-bold text-white/80">Failed to load dashboard</p>
      <p className="text-sm text-white/40 max-w-md text-center">{error.message}</p>
      <button
        onClick={onRetry}
        className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all hover:opacity-80"
        style={{ background: RED }}
      >
        <RefreshCw className="h-4 w-4" /> Retry
      </button>
    </div>
  );
}

/* ─── PAGE ──────────────────────────────────────────── */

export default function PtOsDashboard() {
  const [period, setPeriod] = useState('7D');

  const { data, error, loading, refetch } = useAsync<{ data: DashboardData }>(
    (signal) => request(`/api/pt-os/dashboard?period=${period.toLowerCase()}`, { signal, cacheMs: 30000 }),
    [period],
  );

  const dash = data?.data;

  const handleDismiss = async (id: string) => {
    try {
      await request(`/api/pt-os/insights/${id}/dismiss`, { method: 'PATCH' });
      refetch();
    } catch { }
  };

  if (loading && !dash) return <LoadingSkeleton />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (!dash) return null;

  return (
    <div className="relative min-h-screen pb-12" style={{ background: DARK }}>
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full opacity-[0.04]" style={{ background: `radial-gradient(circle, ${RED}, transparent 70%)` }} />
        <div className="absolute -right-32 top-1/3 h-[400px] w-[400px] rounded-full opacity-[0.03]" style={{ background: `radial-gradient(circle, ${RED}, transparent 70%)` }} />
        <div className="absolute bottom-0 left-1/3 h-[300px] w-[300px] rounded-full opacity-[0.02]" style={{ background: `radial-gradient(circle, ${RED}, transparent 70%)` }} />
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
      </div>

      <div className="relative z-10 mx-auto max-w-[1600px] space-y-6 px-4 sm:px-6 lg:px-8">
        <HeroSection data={dash} period={period} setPeriod={setPeriod} />
        <QuickActionsSection />
        <KpiCardGrid data={dash} />
        <AnalyticsSection data={dash} />
        {dash.insights.length > 0 && <AiInsightsSection insights={dash.insights} onDismiss={handleDismiss} />}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <TrainerSection trainers={dash.trainer_leaderboard} />
          </div>
          <ActivitySection events={dash.recent_activity} />
        </div>
      </div>
      <AiCoachingLayer insights={dash.insights} onDismiss={handleDismiss} />
    </div>
  );
}
