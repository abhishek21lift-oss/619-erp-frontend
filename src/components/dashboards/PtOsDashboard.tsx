'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserPlus, Salad, Dumbbell, Calendar,
  Activity, Users, TrendingUp, Clock,
  Award, Target, Heart, Zap, BarChart3,
  CheckCircle, RefreshCw, FileText, Wallet, Percent,
  ChevronRight, AlertTriangle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PremiumButton } from '@/components/premium/PremiumButton';
import { useAsync } from '@/lib/use-async';
import http from '@/lib/http';

// ─── Types ────────────────────────────────────────────────────────────────────
type DashData = {
  active_pt_clients: number;
  expired_clients: number;
  clients_with_balance: number;
  total_monthly_pt_revenue: number;
  total_monthly_commission: number;
  total_outstanding: number;
  trainers: Array<{
    id: string; name: string; active_clients: number;
    monthly_revenue: number; monthly_commission: number;
  }>;
  revenueTrend: Array<{
    label: string; month: string; revenue: number; incentives: number;
  }>;
};

// ─── Constants ────────────────────────────────────────────────────────────────
const TRAINER_COLORS = ['#7c3aed', '#06b6d4', '#10b981', '#f59e0b', '#dc2626', '#8b5cf6'];
const MEDALS = ['🥇', '🥈', '🥉'];
const MEDAL_BG = ['rgba(251,191,36,0.08)', 'rgba(148,163,184,0.08)', 'rgba(180,83,9,0.06)'];
const MEDAL_BORDER = ['rgba(251,191,36,0.25)', 'rgba(148,163,184,0.2)', 'rgba(180,83,9,0.15)'];

const QUICK = [
  { label: 'New Client',    icon: <UserPlus size={15} />, href: '/pt-os/new-client',       color: '#7c3aed', g: 'linear-gradient(135deg,#7c3aed,#6d28d9)' },
  { label: 'Schedule',      icon: <Calendar size={15} />, href: '/pt-os/schedule-session',  color: '#f59e0b', g: 'linear-gradient(135deg,#f59e0b,#d97706)' },
  { label: 'Diet Plans',    icon: <Salad size={15} />,    href: '/pt-os/diet-plans',        color: '#10b981', g: 'linear-gradient(135deg,#10b981,#059669)' },
  { label: 'Workouts',      icon: <Dumbbell size={15} />, href: '/pt-os/workout-plans',     color: '#8b5cf6', g: 'linear-gradient(135deg,#8b5cf6,#6d28d9)' },
  { label: 'Balance Sheet', icon: <Wallet size={15} />,   href: '/pt-os/balance-sheet',     color: '#f97316', g: 'linear-gradient(135deg,#f97316,#ea580c)' },
  { label: 'Commissions',   icon: <Percent size={15} />,  href: '/pt-os/commissions',       color: '#e11d48', g: 'linear-gradient(135deg,#e11d48,#be123c)' },
  { label: 'Sessions',      icon: <Clock size={15} />,    href: '/pt-os/sessions',          color: '#3b82f6', g: 'linear-gradient(135deg,#3b82f6,#2563eb)' },
  { label: 'Reports',       icon: <BarChart3 size={15} />,href: '/pt-os/reports',           color: '#64748b', g: 'linear-gradient(135deg,#64748b,#475569)' },
];

const FEATURE_TABS = [
  {
    id: 'clients',
    label: 'Training',
    features: [
      { icon: <Users size={19} />,     label: 'PT Clients',      desc: 'All client profiles',        href: '/pt-os/clients',          color: '#7c3aed' },
      { icon: <Dumbbell size={19} />,  label: 'Workout Plans',   desc: 'Design programs',            href: '/pt-os/workout-plans',    color: '#8b5cf6' },
      { icon: <Salad size={19} />,     label: 'Diet Plans',      desc: 'Manage meal plans',          href: '/pt-os/diet-plans',       color: '#10b981' },
      { icon: <Clock size={19} />,     label: 'Sessions',        desc: 'Session history',            href: '/pt-os/sessions',         color: '#3b82f6' },
      { icon: <Calendar size={19} />,  label: 'Schedule',        desc: 'Book PT sessions',           href: '/pt-os/schedule-session', color: '#14b8a6' },
      { icon: <CheckCircle size={19}/>, label: 'Session Balance', desc: 'Remaining credits',         href: '/pt-os/session-balance',  color: '#06b6d4' },
    ],
  },
  {
    id: 'progress',
    label: 'Progress & Health',
    features: [
      { icon: <Heart size={19} />,     label: 'Assessment',       desc: 'Health assessments',        href: '/pt-os/assessment',       color: '#ec4899' },
      { icon: <Activity size={19} />,  label: 'Measurements',     desc: 'Body stats tracking',       href: '/pt-os/measurements',     color: '#06b6d4' },
      { icon: <Zap size={19} />,       label: 'Strength',         desc: 'Log lifts & gains',         href: '/pt-os/strength-tracking',color: '#6366f1' },
      { icon: <Award size={19} />,     label: 'Progress Photos',  desc: 'Visual transformation',     href: '/pt-os/progress-photos',  color: '#10b981' },
      { icon: <Target size={19} />,    label: 'Goals',            desc: 'Fitness goal tracking',     href: '/pt-os/goals',            color: '#eab308' },
      { icon: <CheckCircle size={19}/>, label: 'Weekly Check-in', desc: 'Daily workflows',           href: '/pt-os/weekly-checkin',   color: '#84cc16' },
    ],
  },
  {
    id: 'business',
    label: 'Business',
    features: [
      { icon: <Wallet size={19} />,    label: 'Balance Sheet',   desc: 'Outstanding dues',          href: '/pt-os/balance-sheet',    color: '#f97316' },
      { icon: <Percent size={19} />,   label: 'Commissions',     desc: 'Payouts & commission',      href: '/pt-os/commissions',      color: '#e11d48' },
      { icon: <BarChart3 size={19} />, label: 'Reports',         desc: 'Business analytics',        href: '/pt-os/reports',          color: '#64748b' },
      { icon: <FileText size={19} />,  label: 'PT Plans',        desc: 'Packages & pricing',        href: '/pt-os/plans',            color: '#0ea5e9' },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtINR(n: number | string | null | undefined) {
  return '₹' + Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function momPct(trend: DashData['revenueTrend'] | undefined, key: 'revenue' | 'incentives'): number | null {
  if (!trend || trend.length < 2) return null;
  const prev = Number(trend[trend.length - 2]?.[key] ?? 0);
  const curr = Number(trend[trend.length - 1]?.[key] ?? 0);
  if (prev === 0) return null;
  return ((curr - prev) / prev) * 100;
}

// ─── TrendBadge ───────────────────────────────────────────────────────────────
function TrendBadge({ pct }: { pct: number | null }) {
  if (pct === null) return null;
  const up = pct >= 0;
  return (
    <span
      className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-[750] tabular-nums"
      style={{
        background: up ? 'rgba(16,185,129,0.1)' : 'rgba(220,38,38,0.1)',
        color: up ? '#059669' : '#dc2626',
      }}
    >
      {up ? '↑' : '↓'} {Math.abs(pct).toFixed(0)}%
    </span>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skel({ w = 'w-full', h = 'h-4', r = 'rounded-xl' }: { w?: string; h?: string; r?: string }) {
  return (
    <div
      className={`${w} ${h} ${r} animate-pulse`}
      style={{ background: 'rgba(15,23,42,0.06)' }}
    />
  );
}

function SkeletonDash() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-[20px] p-4 space-y-3"
            style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.92)' }}
          >
            <div className="flex justify-between">
              <Skel w="w-9" h="h-9" r="rounded-[11px]" />
              <Skel w="w-10" h="h-4" r="rounded-full" />
            </div>
            <Skel h="h-2.5" w="w-20" />
            <Skel h="h-6" w="w-3/4" />
            <Skel h="h-7" r="rounded-lg" />
          </div>
        ))}
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        <div
          className="lg:col-span-2 rounded-[22px] p-5 space-y-3"
          style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.92)', minHeight: 300 }}
        >
          <Skel h="h-4" w="w-36" />
          <Skel h="h-2.5" w="w-52" />
          <div className="flex items-end gap-2 h-40 mt-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex-1 rounded-t-lg bg-slate-100 animate-pulse" style={{ height: `${30 + Math.random() * 60}%` }} />
            ))}
          </div>
        </div>
        <div
          className="rounded-[22px] p-5 space-y-3"
          style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.92)' }}
        >
          <Skel h="h-4" w="w-32" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skel key={i} h="h-14" r="rounded-[14px]" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── CommandBar ───────────────────────────────────────────────────────────────
function CommandBar({ onRefresh, loading }: { onRefresh: () => void; loading: boolean }) {
  const router = useRouter();
  const h = new Date().getHours();
  const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const dateStr = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3"
    >
      <div>
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-[10px] font-[650] uppercase tracking-[0.1em]" style={{ color: 'rgb(148,163,184)' }}>
            {dateStr}
          </span>
          <button
            onClick={onRefresh}
            className="rounded-full p-0.5 hover:bg-slate-100 transition-colors"
            aria-label="Refresh"
          >
            <RefreshCw size={10} style={{ color: 'rgb(148,163,184)' }} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        <h1 className="text-[26px] sm:text-[32px] font-[860] tracking-[-0.035em] leading-none">
          <span style={{ color: 'rgb(15,23,42)' }}>{greeting} — </span>
          <span style={{ background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            PT OS
          </span>
        </h1>
        <p className="mt-1 text-[12.5px]" style={{ color: 'rgb(148,163,184)' }}>
          Personal Training Operating System · your complete PT business hub
        </p>
      </div>
      <div className="flex gap-2 shrink-0">
        <PremiumButton
          tone="primary" glow size="sm"
          icon={<UserPlus size={13} />}
          onClick={() => router.push('/pt-os/new-client')}
          style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', boxShadow: '0 6px 20px rgba(124,58,237,0.3)' }}
        >
          New Client
        </PremiumButton>
        <PremiumButton
          tone="secondary" size="sm"
          icon={<Calendar size={13} />}
          onClick={() => router.push('/pt-os/schedule-session')}
          className="!border-slate-200"
        >
          Schedule
        </PremiumButton>
      </div>
    </motion.div>
  );
}

// ─── AlertBar ─────────────────────────────────────────────────────────────────
function AlertBar({ d }: { d: DashData }) {
  const router = useRouter();
  const alerts: { msg: string; color: string; href: string }[] = [];
  if (d.clients_with_balance > 0)
    alerts.push({ msg: `${d.clients_with_balance} client${d.clients_with_balance > 1 ? 's' : ''} owe ${fmtINR(d.total_outstanding)} — review balance sheet`, color: '#f59e0b', href: '/pt-os/balance-sheet' });
  if (d.expired_clients > 0)
    alerts.push({ msg: `${d.expired_clients} PT package${d.expired_clients > 1 ? 's' : ''} expired — consider renewal`, color: '#dc2626', href: '/pt-os/clients' });
  if (alerts.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {alerts.map((a, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 + i * 0.08, duration: 0.35 }}
          onClick={() => router.push(a.href)}
          className="flex items-center gap-2.5 rounded-[13px] px-4 py-2.5 cursor-pointer transition-all hover:scale-[1.005]"
          style={{ background: `${a.color}0c`, border: `1px solid ${a.color}22` }}
        >
          <AlertTriangle size={13} style={{ color: a.color, flexShrink: 0 }} />
          <p className="text-[11.5px] font-[640] flex-1" style={{ color: a.color }}>{a.msg}</p>
          <ChevronRight size={12} style={{ color: a.color, flexShrink: 0 }} />
        </motion.div>
      ))}
    </div>
  );
}

// ─── QuickActions ─────────────────────────────────────────────────────────────
function QuickActions() {
  const router = useRouter();
  return (
    <div className="overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
      <div className="flex gap-2 min-w-max">
        {QUICK.map((q, i) => (
          <motion.button
            key={q.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -2, scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => router.push(q.href)}
            className="flex items-center gap-2 rounded-[13px] px-3.5 py-2 shrink-0"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid rgba(255,255,255,0.9)',
              boxShadow: '0 2px 10px rgba(15,23,42,0.04)',
            }}
          >
            <div
              className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[7px]"
              style={{ background: q.g, color: '#fff', boxShadow: `0 2px 7px ${q.color}28` }}
            >
              {q.icon}
            </div>
            <span className="text-[12px] font-[660]" style={{ color: 'rgb(30,41,59)' }}>{q.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────
function StatCard({
  icon, label, value, sub, color, delay = 0, href, trend, pct,
}: {
  icon: React.ReactNode; label: string; value: string;
  sub?: string; color: string; delay?: number; href?: string;
  trend?: number[]; pct?: number | null;
}) {
  const router = useRouter();
  const max = trend && trend.length > 0 ? Math.max(...trend, 1) : 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4, scale: 1.015 }}
      whileTap={{ scale: 0.975 }}
      onClick={() => href && router.push(href)}
      className="group relative cursor-pointer overflow-hidden rounded-[20px] p-4"
      style={{
        background: `linear-gradient(145deg, ${color}09, var(--bg-card))`,
        border: '1px solid rgba(255,255,255,0.92)',
        boxShadow: '0 2px 18px rgba(15,23,42,0.05)',
        backdropFilter: 'blur(16px)',
      }}
    >
      <div className="pointer-events-none absolute inset-0 translate-x-[-100%] skew-x-[-12deg] bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-[100%]" />

      <div className="flex items-start justify-between mb-3 relative z-10">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-[10px] transition-all duration-300 group-hover:scale-110"
          style={{ background: `linear-gradient(135deg, ${color}, ${color}bb)`, color: '#fff', boxShadow: `0 3px 10px ${color}28` }}
        >
          {icon}
        </div>
        {pct !== undefined && <TrendBadge pct={pct ?? null} />}
      </div>

      <div className="relative z-10">
        <p className="text-[9.5px] font-[680] uppercase tracking-[0.08em] mb-0.5" style={{ color: 'rgb(148,163,184)' }}>{label}</p>
        <p className="text-[21px] font-[860] tracking-[-0.03em] leading-none" style={{ color }}>{value}</p>
        {sub && <p className="mt-1 text-[9.5px] font-medium" style={{ color: 'rgb(148,163,184)' }}>{sub}</p>}
      </div>

      {trend && trend.length > 0 && (
        <div className="flex items-end gap-[2px] h-7 mt-3 relative z-10">
          {trend.map((v, i) => (
            <motion.div
              key={i}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: delay + 0.2 + i * 0.04, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1 rounded-t-[2px] origin-bottom"
              style={{
                height: `${Math.max((v / max) * 100, 10)}%`,
                background: i === trend.length - 1
                  ? `linear-gradient(to top, ${color}80, ${color})`
                  : `${color}25`,
              }}
            />
          ))}
        </div>
      )}

      <div
        className="absolute bottom-0 left-0 h-[2.5px] w-full rounded-full"
        style={{ background: `linear-gradient(90deg, ${color}, ${color}44, transparent)` }}
      />
    </motion.div>
  );
}

// ─── DualChart ────────────────────────────────────────────────────────────────
function DualChart({ data }: { data: DashData['revenueTrend'] }) {
  const [hover, setHover] = useState<number | null>(null);

  if (!data?.length) return (
    <div className="rounded-[22px] p-6 flex items-center justify-center h-[280px]"
      style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.92)' }}>
      <p className="text-[12px]" style={{ color: 'rgb(148,163,184)' }}>No revenue data yet</p>
    </div>
  );

  const W = 600, H = 200, PL = 8, PR = 8, PT = 20, PB = 28;
  const cW = W - PL - PR, cH = H - PT - PB;
  const maxRev = Math.max(...data.map(d => Number(d.revenue)), 1);
  const maxInc = Math.max(...data.map(d => Number(d.incentives)), 1);
  const slotW = cW / data.length;
  const barW = slotW * 0.55;

  const bars = data.map((d, i) => ({
    x: PL + i * slotW + slotW / 2,
    barTop: PT + cH - (Number(d.revenue) / maxRev) * cH,
    barH: (Number(d.revenue) / maxRev) * cH,
    lineY: PT + cH - (Number(d.incentives) / maxInc) * cH,
    revenue: Number(d.revenue),
    incentives: Number(d.incentives),
    label: (d.label ?? '').split(' ')[0],
  }));

  function buildLine(pts: Array<{ x: number; lineY: number }>): string {
    if (!pts.length) return '';
    let p = `M${pts[0].x},${pts[0].lineY}`;
    for (let i = 1; i < pts.length; i++) {
      const cx = (pts[i].x + pts[i - 1].x) / 2;
      p += ` C${cx},${pts[i - 1].lineY} ${cx},${pts[i].lineY} ${pts[i].x},${pts[i].lineY}`;
    }
    return p;
  }

  const totalRev = data.reduce((s, d) => s + Number(d.revenue), 0);
  const totalComm = data.reduce((s, d) => s + Number(d.incentives), 0);

  return (
    <div className="rounded-[22px] p-5"
      style={{ background: 'var(--bg-card)', backdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,0.92)', boxShadow: '0 4px 24px rgba(15,23,42,0.06)' }}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-[15px] font-[760] tracking-[-0.01em]" style={{ color: 'rgb(15,23,42)' }}>Revenue & Commission</h3>
          <p className="text-[11px] mt-0.5 font-medium" style={{ color: 'rgb(148,163,184)' }}>
            6-month trend · {fmtINR(totalRev)} collected total
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-2 rounded-full" style={{ background: 'linear-gradient(90deg,#7c3aed,#a78bfa)' }} />
            <span className="text-[9px] font-[620]" style={{ color: 'rgb(148,163,184)' }}>Revenue</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-[1.5px] rounded-full bg-rose-400" />
            <span className="text-[9px] font-[620]" style={{ color: 'rgb(148,163,184)' }}>Commission</span>
          </div>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="bar-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.45" />
          </linearGradient>
          <linearGradient id="bar-fill-h" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7c3aed" stopOpacity="1" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.65" />
          </linearGradient>
          <filter id="lngl">
            <feGaussianBlur stdDeviation="1.5" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {[0.25, 0.5, 0.75, 1].map(r => (
          <line key={r}
            x1={PL} x2={PL + cW}
            y1={PT + cH - r * cH} y2={PT + cH - r * cH}
            stroke="rgba(15,23,42,0.055)" strokeWidth="1" strokeDasharray="3 4" />
        ))}

        {bars.map((b, i) => (
          <g key={i}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}>
            <motion.rect
              x={b.x - barW / 2} width={barW} rx={4} ry={4}
              fill={hover === i ? 'url(#bar-fill-h)' : 'url(#bar-fill)'}
              initial={{ y: PT + cH, height: 0 }}
              animate={{ y: b.barTop, height: b.barH }}
              transition={{ delay: 0.1 + i * 0.07, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            />
            <rect
              x={b.x - slotW / 2} width={slotW}
              y={PT} height={cH + PB}
              fill="transparent" style={{ cursor: 'crosshair' }}
            />
          </g>
        ))}

        <motion.path
          d={buildLine(bars)}
          fill="none" stroke="#f43f5e" strokeWidth="2.2" strokeLinecap="round"
          filter="url(#lngl)"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ delay: 0.55, duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
        />
        {bars.map((b, i) => (
          <circle key={i}
            cx={b.x} cy={b.lineY}
            r={hover === i ? 5 : 3}
            fill="#f43f5e" stroke="#fff" strokeWidth="1.5"
            style={{ transition: 'r 0.15s ease', cursor: 'crosshair' }}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          />
        ))}

        {hover !== null && bars[hover] && (() => {
          const b = bars[hover];
          const flip = hover > bars.length / 2;
          const tx = flip ? b.x - 58 : b.x - 50;
          return (
            <g>
              <rect x={flip ? b.x - 116 : b.x - 4} y={PT - 6} width={112} height={52} rx={9}
                fill="rgba(15,23,42,0.93)" />
              <text x={tx + 56} y={PT + 12} textAnchor="middle" fill="#e2e8f0" fontSize="10" fontWeight="700">{b.label}</text>
              <text x={tx + 56} y={PT + 25} textAnchor="middle" fill="#c4b5fd" fontSize="11" fontWeight="800">{fmtINR(b.revenue)}</text>
              <text x={tx + 56} y={PT + 38} textAnchor="middle" fill="#fda4af" fontSize="9.5" fontWeight="600">
                Comm: {fmtINR(b.incentives)}
              </text>
            </g>
          );
        })()}

        {bars.map((b, i) => (
          <text key={i}
            x={b.x} y={H - 2}
            textAnchor="middle"
            fill={hover === i ? '#7c3aed' : 'rgb(148,163,184)'}
            fontSize="9" fontWeight="600"
            style={{ transition: 'fill 0.15s' }}>
            {b.label}
          </text>
        ))}
      </svg>

      <div className="flex gap-2.5 mt-3 pt-3" style={{ borderTop: '1px solid rgba(15,23,42,0.06)' }}>
        {[
          { label: '6M Revenue', value: fmtINR(totalRev), color: '#7c3aed', bg: 'rgba(124,58,237,0.07)' },
          { label: '6M Commission', value: fmtINR(totalComm), color: '#f43f5e', bg: 'rgba(244,63,94,0.07)' },
          { label: '6M Net', value: fmtINR(totalRev - totalComm), color: '#10b981', bg: 'rgba(16,185,129,0.07)' },
        ].map(s => (
          <div key={s.label} className="flex-1 rounded-[11px] p-2.5" style={{ background: s.bg }}>
            <p className="text-[7.5px] font-[680] uppercase tracking-[0.09em] mb-0.5" style={{ color: 'rgb(148,163,184)' }}>{s.label}</p>
            <p className="text-[14px] font-[840] tracking-[-0.02em]" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── TrainerRanking ───────────────────────────────────────────────────────────
function TrainerRanking({ trainers, onRefetch, loading }: {
  trainers: DashData['trainers']; onRefetch: () => void; loading: boolean;
}) {
  const sorted = useMemo(
    () => [...(trainers ?? [])].sort((a, b) => b.monthly_revenue - a.monthly_revenue),
    [trainers],
  );
  const topRevenue = sorted[0]?.monthly_revenue ?? 1;

  return (
    <div className="rounded-[22px] p-5 flex flex-col"
      style={{ background: 'var(--bg-card)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.92)', boxShadow: '0 2px 16px rgba(15,23,42,0.05)' }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[15px] font-[760] tracking-[-0.01em]" style={{ color: 'rgb(15,23,42)' }}>Trainer Rankings</h3>
          <p className="text-[11px] font-medium mt-0.5" style={{ color: 'rgb(148,163,184)' }}>This month · by revenue</p>
        </div>
        <button
          onClick={onRefetch}
          className="rounded-full p-1.5 hover:bg-slate-100 transition-colors"
          aria-label="Refresh"
        >
          <RefreshCw size={13} style={{ color: 'rgb(148,163,184)' }} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 flex-1">
          <p className="text-[12px]" style={{ color: 'rgb(148,163,184)' }}>No trainer data yet</p>
        </div>
      ) : (
        <div className="space-y-2 flex-1">
          {sorted.map((t, i) => {
            const color = TRAINER_COLORS[i % TRAINER_COLORS.length];
            const commPct = t.monthly_revenue > 0 ? (t.monthly_commission / t.monthly_revenue) * 100 : 0;
            const revPct = (t.monthly_revenue / topRevenue) * 100;
            const initials = t.name.split(' ').map((s: string) => s[0]).join('').slice(0, 2).toUpperCase();
            const isTop3 = i < 3;

            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07, duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
                className="rounded-[14px] p-3"
                style={{
                  background: isTop3 ? MEDAL_BG[i] : `${color}06`,
                  border: `1px solid ${isTop3 ? MEDAL_BORDER[i] : 'rgba(255,255,255,0.65)'}`,
                }}
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-5 text-center shrink-0">
                    {isTop3
                      ? <span className="text-[14px]">{MEDALS[i]}</span>
                      : <span className="text-[10px] font-[760]" style={{ color: 'rgb(148,163,184)' }}>#{i + 1}</span>
                    }
                  </div>
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] text-[10px] font-[820] text-white"
                    style={{ background: `linear-gradient(135deg,${color},${color}bb)`, boxShadow: `0 3px 8px ${color}28` }}
                  >
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-[720] truncate" style={{ color: 'rgb(15,23,42)' }}>{t.name}</p>
                    <p className="text-[9px] font-medium" style={{ color: 'rgb(148,163,184)' }}>
                      {t.active_clients} active client{t.active_clients !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[12px] font-[820] tracking-tight" style={{ color }}>{fmtINR(t.monthly_revenue)}</p>
                    <p className="text-[9px] font-[640]" style={{ color: '#f43f5e' }}>{fmtINR(t.monthly_commission)} comm.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: `${color}18` }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: `linear-gradient(90deg,${color},${color}88)` }}
                      initial={{ width: 0 }}
                      animate={{ width: `${revPct}%` }}
                      transition={{ delay: 0.3 + i * 0.07, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                  <span className="text-[8.5px] font-[650] shrink-0" style={{ color: 'rgb(148,163,184)' }}>
                    {commPct.toFixed(0)}% comm
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── FeatureTabs ──────────────────────────────────────────────────────────────
function FeatureTabs() {
  const router = useRouter();
  const [active, setActive] = useState(0);
  const tab = FEATURE_TABS[active];

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="h-6 w-1 rounded-full shrink-0" style={{ background: 'linear-gradient(180deg,#7c3aed,#06b6d4)' }} />
        <h2 className="text-[18px] font-[800] tracking-[-0.02em]" style={{ color: 'rgb(15,23,42)' }}>PT OS Features</h2>
        <div className="flex gap-1.5 ml-auto overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {FEATURE_TABS.map((t, i) => (
            <button
              key={t.id}
              onClick={() => setActive(i)}
              className="shrink-0 rounded-full px-3 py-1.5 text-[11px] font-[700] transition-all duration-200 whitespace-nowrap"
              style={active === i
                ? { background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: '#fff', boxShadow: '0 4px 12px rgba(124,58,237,0.32)' }
                : { background: 'rgba(15,23,42,0.055)', color: 'rgb(71,85,105)' }
              }
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3"
        >
          {tab.features.map((f, i) => (
            <motion.div
              key={f.label}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.035, duration: 0.28 }}
              whileHover={{ y: -5, scale: 1.035 }}
              whileTap={{ scale: 0.965 }}
              onClick={() => router.push(f.href)}
              className="group relative cursor-pointer overflow-hidden rounded-[18px] p-4 flex flex-col items-center text-center gap-2.5"
              style={{
                background: `linear-gradient(145deg, ${f.color}09, var(--bg-card))`,
                border: '1px solid rgba(255,255,255,0.9)',
                boxShadow: '0 2px 12px rgba(15,23,42,0.04)',
              }}
            >
              <div className="pointer-events-none absolute inset-0 translate-x-[-100%] skew-x-[-12deg] bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-[100%]" />
              <div
                className="flex h-10 w-10 items-center justify-center rounded-[12px] transition-all duration-300 group-hover:scale-110"
                style={{ background: `linear-gradient(135deg,${f.color},${f.color}bb)`, color: '#fff', boxShadow: `0 4px 13px ${f.color}28` }}
              >
                {f.icon}
              </div>
              <div>
                <p className="text-[12px] font-[730] tracking-tight" style={{ color: 'rgb(15,23,42)' }}>{f.label}</p>
                <p className="text-[9.5px] mt-0.5 leading-snug" style={{ color: 'rgb(148,163,184)' }}>{f.desc}</p>
              </div>
              <div
                className="absolute inset-x-0 bottom-0 h-[2px] origin-left scale-x-0 transition-transform duration-300 group-hover:scale-x-100 rounded-full"
                style={{ background: `linear-gradient(90deg,${f.color},${f.color}44)` }}
              />
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function PtOsDashboard() {
  const dash = useAsync<DashData>(
    (signal) => http<{ data: DashData }>('/api/pt-os/dashboard', { signal }).then((r) => r.data),
    [],
  );
  const d = dash.data;

  const revTrend = d?.revenueTrend?.map(x => Number(x.revenue)) ?? [];
  const incTrend = d?.revenueTrend?.map(x => Number(x.incentives)) ?? [];
  const revMoM   = momPct(d?.revenueTrend, 'revenue');
  const incMoM   = momPct(d?.revenueTrend, 'incentives');

  const netRevenue = (d?.total_monthly_pt_revenue ?? 0) - (d?.total_monthly_commission ?? 0);
  const commRate   = d?.total_monthly_pt_revenue && d.total_monthly_pt_revenue > 0
    ? `${((d.total_monthly_commission / d.total_monthly_pt_revenue) * 100).toFixed(0)}% rate`
    : undefined;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 relative">
      {/* Ambient */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" style={{ zIndex: 0 }}>
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full opacity-[0.11]"
          style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.65) 0%, transparent 70%)', filter: 'blur(70px)' }} />
        <div className="absolute -bottom-60 -right-40 h-[600px] w-[600px] rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.55) 0%, transparent 70%)', filter: 'blur(90px)' }} />
      </div>

      <div className="relative space-y-5" style={{ zIndex: 1 }}>

        {/* Header */}
        <CommandBar onRefresh={dash.refetch} loading={dash.loading} />

        {/* Alerts */}
        {d && <AlertBar d={d} />}

        {/* Quick action pills */}
        <QuickActions />

        {/* Skeleton while first load */}
        {dash.loading && !d && <SkeletonDash />}

        {d && (
          <>
            {/* KPI row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <StatCard
                icon={<Users size={14} />}
                label="Active PT Clients"
                value={d.active_pt_clients.toLocaleString()}
                sub={`${d.expired_clients} expired`}
                color="#7c3aed"
                delay={0}
                href="/pt-os/clients"
                trend={revTrend}
                pct={revMoM}
              />
              <StatCard
                icon={<TrendingUp size={14} />}
                label="Monthly Revenue"
                value={fmtINR(d.total_monthly_pt_revenue)}
                color="#10b981"
                delay={0.05}
                href="/pt-os/reports"
                trend={revTrend}
                pct={revMoM}
              />
              <StatCard
                icon={<Percent size={14} />}
                label="Commission"
                value={fmtINR(d.total_monthly_commission)}
                sub={commRate}
                color="#f43f5e"
                delay={0.1}
                href="/pt-os/commissions"
                trend={incTrend}
                pct={incMoM}
              />
              <StatCard
                icon={<TrendingUp size={14} />}
                label="Net Revenue"
                value={fmtINR(netRevenue)}
                color="#3b82f6"
                delay={0.15}
                href="/pt-os/reports"
                trend={revTrend.map((r, i) => Math.max(0, r - (incTrend[i] ?? 0)))}
                pct={revMoM}
              />
              <StatCard
                icon={<Wallet size={14} />}
                label="Outstanding Dues"
                value={fmtINR(d.total_outstanding)}
                sub={`${d.clients_with_balance} client${d.clients_with_balance !== 1 ? 's' : ''}`}
                color="#f59e0b"
                delay={0.2}
                href="/pt-os/balance-sheet"
                trend={[]}
                pct={null}
              />
            </div>

            {/* Chart + Trainer Rankings */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <DualChart data={d.revenueTrend} />
              </div>
              <div>
                <TrainerRanking
                  trainers={d.trainers}
                  onRefetch={dash.refetch}
                  loading={dash.loading}
                />
              </div>
            </div>

            {/* Feature browser */}
            <FeatureTabs />
          </>
        )}
      </div>
    </div>
  );
}
