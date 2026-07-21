'use client';

/**
 * PtOsDashboard — Premium, mobile-first fitness-business command center.
 *
 * Mobile-first design principles:
 *   • Content priority: most important info first (welcome → KPIs → ops)
 *   • Touch-friendly targets: min 44px tap areas throughout
 *   • Single-column stacking on mobile, expanding to multi-column on tablet/desktop
 *   • Mobile quick-actions strip (horizontal scroll) replaces desktop dock on small screens
 *   • Bottom padding clears the MobileBottomNav (h-16 + safe area)
 *   • No horizontal overflow — all containers use min-w-0, truncate, flex-wrap
 *
 * Data: two endpoints — /api/pt-os/dashboard + /api/pt-os/dashboard/ops
 * All figures are raw backend values or honestly-derived metrics.
 */

import { useCallback, useMemo } from 'react';
import { m } from 'framer-motion';
import { PremiumBarChart, PullToRefresh } from '@/components/ui';
import {
  Users, TrendingUp, Wallet, Percent, RefreshCw,
  ChevronRight, Sparkles, ArrowUpRight, ArrowDownRight, Activity,
  UserPlus, CalendarPlus, Receipt,
  Trophy, ShieldCheck, Target, Gauge, Crown,
  CalendarClock, AlertCircle, CheckCircle2, XCircle, PhoneCall,
  FileSignature, HeartPulse, Apple, PersonStanding,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAsync } from '@/lib/use-async';
import { useAuth } from '@/lib/auth-context';
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

type SessionStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';
type OpsData = {
  today_sessions: Array<{
    id: string; title: string; session_date: string;
    start_time: string | null; end_time: string | null;
    status: SessionStatus; notes: string | null;
    client_name: string | null; client_photo: string | null;
    trainer_name: string | null;
  }>;
  renewals_due: Array<{
    id: string; name: string; mobile: string | null;
    trainer_name: string | null; package_type: string | null;
    pt_end_date: string; days_left: number;
    balance_amount: number; monthly_pt_amount: number;
  }>;
  top_dues: Array<{
    id: string; name: string; mobile: string | null;
    trainer_name: string | null; balance_amount: number;
    pt_end_date: string | null; due_status: 'overdue' | 'due';
  }>;
  session_stats: {
    this_month_total: number;
    this_month_completed: number;
    last_month_completed: number;
  };
  trainer_sessions: Array<{
    trainer_name: string; completed: number; scheduled: number; missed: number;
  }>;
};

// ─── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  maroon:  '#7A0019',
  crimson: '#C1121F',
  purple:  '#7C3AED',
  blue:    '#2563EB',
  emerald: '#10B981',
  amber:   '#F59E0B',
  rose:    '#E11D48',
  cyan:    '#06B6D4',
  ink:     '#0F172A',
  muted:   'rgba(100,116,139,0.85)',
};

const TRAINER_COLORS = [C.purple, C.blue, C.emerald, C.amber, C.crimson, C.cyan];
const MEDALS = ['🥇', '🥈', '🥉'];

const STATUS_META: Record<SessionStatus, { label: string; color: string; icon: React.ReactNode }> = {
  scheduled: { label: 'Scheduled', color: C.blue,    icon: <CalendarClock size={10} /> },
  completed: { label: 'Completed', color: C.emerald, icon: <CheckCircle2 size={10} />  },
  cancelled: { label: 'Cancelled', color: C.muted,   icon: <XCircle size={10} />       },
  no_show:   { label: 'No Show',   color: C.amber,   icon: <AlertCircle size={10} />   },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtINR(n: number | string | null | undefined) {
  return '₹' + Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}
function fmtCompact(n: number | string | null | undefined) {
  const v = Number(n ?? 0);
  if (v >= 1e7) return '₹' + (v / 1e7).toFixed(2).replace(/\.00$/, '') + 'Cr';
  if (v >= 1e5) return '₹' + (v / 1e5).toFixed(2).replace(/\.00$/, '') + 'L';
  if (v >= 1e3) return '₹' + (v / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  return fmtINR(v);
}
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function fmt12(t: string | null) {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return t;
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}
function initials(name: string | null) {
  return (name ?? '?').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
}
function momPct(trend: DashData['revenueTrend'] | undefined, key: 'revenue' | 'incentives'): number | null {
  if (!trend || trend.length < 2) return null;
  const prev = Number(trend[trend.length - 2]?.[key] ?? 0);
  const curr = Number(trend[trend.length - 1]?.[key] ?? 0);
  if (prev === 0) return null;
  return ((curr - prev) / prev) * 100;
}
function forecastNext(values: number[]): number | null {
  const n = values.length;
  if (n < 2) return null;
  const xbar = (n - 1) / 2;
  const ybar = values.reduce((s, v) => s + v, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) { num += (i - xbar) * (values[i] - ybar); den += (i - xbar) ** 2; }
  return Math.max(0, ybar + (den === 0 ? 0 : num / den) * (n - xbar));
}
function healthScore(d: DashData) {
  const rev = Number(d.total_monthly_pt_revenue), out = Number(d.total_outstanding);
  const active = d.active_pt_clients, expired = d.expired_clients;
  const collection = rev + out > 0 ? rev / (rev + out) : 1;
  const retention  = active + expired > 0 ? active / (active + expired) : 1;
  const growthRaw  = momPct(d.revenueTrend, 'revenue') ?? 0;
  const growth     = clamp((growthRaw + 50) / 100, 0, 1);
  const score = Math.round(collection * 35 + retention * 35 + growth * 30);
  const color = score >= 80 ? C.emerald : score >= 60 ? C.amber : C.crimson;
  const label = score >= 80 ? 'Excellent' : score >= 60 ? 'Healthy' : score >= 40 ? 'Focus Needed' : 'At Risk';
  return { score, color, label, growthRaw };
}
function greeting() {
  const h = new Date().getHours();
  if (h < 5)  return 'Night owl';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Working late';
}

// ─── Primitives ────────────────────────────────────────────────────────────────
function TrendBadge({ pct }: { pct: number | null }) {
  if (pct === null) return null;
  const up = pct >= 0;
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[9.5px] font-[750] tabular-nums"
      style={{ background: up ? 'rgba(16,185,129,0.12)' : 'rgba(225,29,72,0.12)', color: up ? C.emerald : C.rose }}>
      {up ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}{Math.abs(pct).toFixed(0)}%
    </span>
  );
}

function Glass({ children, className = '', style }: {
  children: React.ReactNode; className?: string; style?: React.CSSProperties;
}) {
  return (
    <div className={`rounded-[20px] sm:rounded-[24px] ${className}`}
      style={{
        background: 'rgba(255,255,255,0.76)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.92)',
        boxShadow: '0 4px 24px rgba(15,23,42,0.06), inset 0 1px 0 rgba(255,255,255,0.65)',
        ...style,
      }}>
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-1 text-[10px] font-[750] uppercase tracking-[0.14em] mb-2"
      style={{ color: 'rgba(100,116,139,0.7)' }}>{children}</p>
  );
}

function Skel({ w = 'w-full', h = 'h-4', r = 'rounded-xl' }: { w?: string; h?: string; r?: string }) {
  return <div className={`${w} ${h} ${r} animate-pulse`} style={{ background: 'rgba(124,58,237,0.08)' }} />;
}

// ─── HealthRing ────────────────────────────────────────────────────────────────
function HealthRing({ score, color, size = 64 }: { score: number; color: string; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (clamp(score, 0, 100) / 100) * circ;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="5.5" />
        <m.circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="5.5"
          strokeLinecap="round" strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }} animate={{ strokeDashoffset: circ - dash }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          style={{ filter: `drop-shadow(0 0 5px ${color}88)` }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[17px] font-[860] tabular-nums leading-none text-white">{score}</span>
        <span className="text-[7px] font-[700] uppercase tracking-[0.1em] text-white/70">score</span>
      </div>
    </div>
  );
}

// ─── Section 1 — Hero Welcome Header ───────────────────────────────────────────
function HeroStat({ icon, label, value, accent, trend }: {
  icon: React.ReactNode; label: string; value: string; accent: string; trend?: number | null;
}) {
  return (
    <div
      className="flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3.5"
      style={{
        background: 'rgba(255,255,255,0.055)',
        border: '1px solid rgba(255,255,255,0.12)',
        backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), 0 4px 14px rgba(0,0,0,0.20)',
      }}
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full"
        style={{ background: `${accent}26`, color: accent, boxShadow: `inset 0 0 0 1px ${accent}33` }}>
        {icon}
      </span>
      <div className="flex flex-col items-start leading-none">
        <span className="flex items-center gap-1 text-[13.5px] font-[840] tabular-nums text-white">
          {value}
          {trend != null && (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-[760] tabular-nums"
              style={{ color: trend >= 0 ? '#34d399' : '#fb7185' }}>
              {trend >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}{Math.abs(trend).toFixed(0)}%
            </span>
          )}
        </span>
        <span className="mt-1 text-[8px] font-[700] uppercase tracking-[0.14em] text-white/45">{label}</span>
      </div>
    </div>
  );
}

function HeroHeader({ d, coach, studioName, loading: _loading, onRefresh: _onRefresh }: {
  d: DashData; coach: string; studioName: string; loading: boolean; onRefresh: () => void;
}) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const hs = healthScore(d);
  const trend = momPct(d.revenueTrend, 'revenue');

  return (
    <m.div
      initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-[24px] sm:rounded-[30px]"
      style={{
        background:
          'radial-gradient(130% 150% at 50% -25%, #2A1A5E 0%, transparent 55%),' +
          'linear-gradient(158deg, #0B0918 0%, #170D38 42%, #0C0722 72%, #12092C 100%)',
        boxShadow:
          '0 24px 64px -14px rgba(9,7,22,0.78), 0 8px 26px rgba(124,58,237,0.22),' +
          'inset 0 1px 0 rgba(255,255,255,0.10), inset 0 0 0 1px rgba(251,191,36,0.10)',
      }}
    >
      {/* Decorative layers */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -right-14 h-60 w-60 rounded-full opacity-35"
          style={{ background: 'radial-gradient(circle, #FCD34D 0%, transparent 70%)', filter: 'blur(46px)' }} />
        <div className="absolute -bottom-20 -left-14 h-60 w-60 rounded-full opacity-25"
          style={{ background: 'radial-gradient(circle, #c084fc 0%, transparent 70%)', filter: 'blur(54px)' }} />
        <svg className="absolute inset-0 w-full h-full opacity-[0.055]" xmlns="http://www.w3.org/2000/svg">
          <defs><pattern id="hh-g" width="34" height="34" patternUnits="userSpaceOnUse">
            <path d="M 34 0 L 0 0 0 34" fill="none" stroke="white" strokeWidth="0.6" />
          </pattern></defs>
          <rect width="100%" height="100%" fill="url(#hh-g)" />
        </svg>
        {/* Sheen sweep */}
        <m.div
          aria-hidden className="absolute top-0 bottom-0 w-1/3"
          style={{ background: 'linear-gradient(105deg, transparent, rgba(255,255,255,0.09), transparent)', transform: 'skewX(-18deg)' }}
          initial={{ x: '-170%' }} animate={{ x: '280%' }}
          transition={{ duration: 4, repeat: Infinity, repeatDelay: 3.5, ease: 'easeInOut' }}
        />
        {/* Spotlight vignette */}
        <div className="absolute inset-0"
          style={{ background: 'radial-gradient(120% 120% at 50% 38%, transparent 52%, rgba(6,4,16,0.55) 100%)' }} />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center py-6 sm:py-7 px-6 text-center">
        {/* Crest */}
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full"
          style={{
            background: 'radial-gradient(circle at 30% 25%, #211648, #0B0720)',
            border: '1px solid rgba(251,191,36,0.45)',
            boxShadow: '0 0 0 4px rgba(251,191,36,0.06), 0 6px 18px rgba(245,158,11,0.30)',
          }}>
          <Crown size={18} style={{ color: '#FCD34D' }} />
        </div>

        {/* Greeting eyebrow */}
        <p className="mb-2 text-[9.5px] sm:text-[10.5px] font-[700] uppercase tracking-[0.28em]"
          style={{ color: 'rgba(252,211,77,0.66)' }}>
          {greeting()} · {coach}
        </p>

        <h1
          className="text-[32px] sm:text-[44px] font-[900] tracking-[0.14em] leading-[0.98] uppercase"
          style={{
            background: 'linear-gradient(92deg, #ffffff 0%, #FCD34D 34%, #F59E0B 62%, #FDE68A 82%, #ffffff 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            filter: 'drop-shadow(0 1px 0 rgba(0,0,0,0.40)) drop-shadow(0 3px 20px rgba(245,158,11,0.48))',
          }}
        >
          {studioName}
        </h1>

        {/* Flourish divider */}
        <div className="mt-3.5 flex items-center gap-2">
          <span className="h-px w-10 sm:w-16" style={{ background: 'linear-gradient(90deg, transparent, rgba(251,191,36,0.7))' }} />
          <span className="h-[7px] w-[7px] rotate-45"
            style={{ background: 'linear-gradient(135deg,#FDE68A,#F59E0B)', boxShadow: '0 0 8px rgba(245,158,11,0.7)' }} />
          <span className="h-px w-10 sm:w-16" style={{ background: 'linear-gradient(90deg, rgba(251,191,36,0.7), transparent)' }} />
        </div>

        <p className="mt-3 text-[10.5px] sm:text-[12px] font-[600] uppercase tracking-[0.22em]"
          style={{ color: 'rgba(255,255,255,0.46)' }}>
          {dateStr}
        </p>

        {/* Live stat pills */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <HeroStat icon={<Users size={13} />} label="Active" value={String(d.active_pt_clients)} accent="#c084fc" />
          <HeroStat icon={<Wallet size={13} />} label="This Month" value={fmtCompact(d.total_monthly_pt_revenue)} accent="#34d399" trend={trend} />
          <HeroStat icon={<Gauge size={13} />} label={hs.label} value={String(hs.score)} accent={hs.color} />
        </div>
      </div>

      <div className="absolute top-0 inset-x-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(251,191,36,0.5), transparent)' }} />
      <div className="absolute bottom-0 inset-x-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(251,191,36,0.7), rgba(192,132,252,0.5), transparent)' }} />
    </m.div>
  );
}

// ─── Section 2 — Mobile Quick Actions (visible on mobile only) ─────────────────
function MobileQuickActions() {
  const router = useRouter();
  const actions = [
    { label: 'Add Client',           icon: <UserPlus size={16} />,       href: '/pt-os/new-client',           color: C.purple },
    { label: 'Consent',              icon: <FileSignature size={16} />,  href: '/pt-os/informed-consent',     color: C.blue },
    { label: 'PAR-Q',                icon: <ShieldCheck size={16} />,    href: '/pt-os/parq',                 color: C.emerald },
    { label: 'Fitness Testing',      icon: <Gauge size={16} />,          href: '/pt-os/assessment',           color: C.amber },
    { label: 'Lifestyle',            icon: <HeartPulse size={16} />,     href: '/pt-os/lifestyle-assessment', color: C.crimson },
    { label: 'Nutrition Assessment', icon: <Apple size={16} />,          href: '/pt-os/nutrition-assessment', color: C.cyan },
    { label: 'Mobility Assessment',  icon: <PersonStanding size={16} />, href: '/pt-os/mobility-assessment',  color: C.rose },
  ];
  return (
    <div className="lg:hidden -mx-3 px-3">
      <SectionLabel>Quick Actions</SectionLabel>
      <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
        {actions.map((a, i) => (
          <m.button key={a.label}
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.04, duration: 0.3 }}
            onClick={() => router.push(a.href)}
            className="flex flex-col items-center gap-1.5 shrink-0 rounded-[16px] p-3 transition active:scale-95"
            style={{ background: `${a.color}12`, border: `1px solid ${a.color}22`, minWidth: 72 }}>
            <span className="flex h-10 w-10 items-center justify-center rounded-[13px] text-white"
              style={{ background: `linear-gradient(135deg, ${a.color}, ${a.color}cc)`, boxShadow: `0 4px 12px ${a.color}40` }}>
              {a.icon}
            </span>
            <span className="text-[9.5px] font-[680] leading-tight text-center whitespace-nowrap" style={{ color: C.ink }}>
              {a.label}
            </span>
          </m.button>
        ))}
      </div>
    </div>
  );
}

// ─── Section 3 — KPI Stat Cards ────────────────────────────────────────────────
function StatCard({
  icon, label, value, sub, color, accent, delay = 0, href, trend, pct,
}: {
  icon: React.ReactNode; label: string; value: string; sub?: string;
  color: string; accent: string; delay?: number; href?: string;
  trend?: number[]; pct?: number | null;
}) {
  const router = useRouter();
  const max = trend && trend.length > 0 ? Math.max(...trend, 1) : 1;
  return (
    <m.div
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4, scale: 1.015 }} whileTap={{ scale: 0.97 }}
      onClick={() => href && router.push(href)}
      className="group relative overflow-hidden rounded-[18px] p-3.5 sm:p-4 cursor-pointer"
      style={{
        background: `linear-gradient(155deg, ${color}11 0%, rgba(255,255,255,0.88) 65%)`,
        border: `1px solid ${color}22`,
        boxShadow: `0 4px 20px ${color}0d, inset 0 1px 0 rgba(255,255,255,0.7)`,
        backdropFilter: 'blur(16px)',
      }}
    >
      {/* shimmer */}
      <div className="pointer-events-none absolute inset-0 -translate-x-full skew-x-[-12deg] bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
      {/* top accent */}
      <div className="absolute top-0 inset-x-0 h-[3px] rounded-t-[18px]"
        style={{ background: `linear-gradient(90deg, ${color}, ${accent})` }} />

      <div className="relative z-10 flex items-start justify-between mb-2.5 pt-0.5">
        <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-[10px] sm:rounded-[12px] text-white transition-all duration-200 group-hover:scale-110 group-hover:-rotate-6"
          style={{ background: `linear-gradient(135deg, ${color}, ${accent})`, boxShadow: `0 4px 12px ${color}40` }}>
          {icon}
        </div>
        {pct !== undefined && <TrendBadge pct={pct ?? null} />}
      </div>

      <div className="relative z-10">
        <p className="text-[9px] sm:text-[9.5px] font-[750] uppercase tracking-[0.1em] mb-1" style={{ color: `${color}aa` }}>{label}</p>
        <p className="text-[18px] sm:text-[21px] font-[880] tracking-[-0.03em] leading-none" style={{ color }}>{value}</p>
        {sub && <p className="mt-1 text-[9.5px] font-[500]" style={{ color: C.muted }}>{sub}</p>}
      </div>

      {trend && trend.length > 0 && (
        <div className="relative z-10 flex items-end gap-[2px] h-7 sm:h-8 mt-2.5">
          {trend.map((v, i) => (
            <m.div key={i}
              initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
              transition={{ delay: delay + 0.2 + i * 0.04, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1 rounded-t-[3px] origin-bottom"
              style={{
                height: `${Math.max((v / max) * 100, 8)}%`,
                background: i === trend.length - 1 ? `linear-gradient(to top, ${color}, ${accent})` : `${color}22`,
              }} />
          ))}
        </div>
      )}
    </m.div>
  );
}

// ─── Section 4 — Revenue Chart ──────────────────────────────────────────────────
function RevenueChart({ data }: { data: DashData['revenueTrend'] }) {
  if (!data?.length) return (
    <Glass className="p-5 flex items-center justify-center" style={{ minHeight: 180 }}>
      <p className="text-[12px]" style={{ color: C.muted }}>No revenue data yet</p>
    </Glass>
  );

  const totalRev = data.reduce((s, d) => s + Number(d.revenue), 0);
  const totalComm = data.reduce((s, d) => s + Number(d.incentives), 0);
  const chartData = data.map(d => ({ ...d, label: (d.label ?? '').split(' ')[0] }));

  return (
    <Glass className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-[14px] sm:text-[15px] font-[780] tracking-[-0.01em]" style={{ color: C.ink }}>Revenue Trend</h3>
          <p className="text-[10.5px] mt-0.5 font-[500]" style={{ color: C.muted }}>6-month · {fmtCompact(totalRev)} total</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="inline-flex items-center gap-1"><span className="h-2 w-4 rounded-full" style={{ background: C.purple }} /><span className="text-[9px] font-[600]" style={{ color: C.muted }}>Revenue</span></span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-4 rounded-full" style={{ background: C.rose }} /><span className="text-[9px] font-[600]" style={{ color: C.muted }}>Comm.</span></span>
        </div>
      </div>

      <PremiumBarChart
        data={chartData as Record<string, unknown>[]}
        xKey="label"
        bars={[
          { key: 'revenue', label: 'Revenue', color: C.purple },
          { key: 'incentives', label: 'Commission', color: C.rose },
        ]}
        height={160}
        formatValue={fmtCompact}
      />

      <div className="flex gap-2 mt-3 pt-3" style={{ borderTop: '1px solid rgba(124,58,237,0.08)' }}>
        {[
          { label: '6M Revenue', value: fmtCompact(totalRev), color: C.purple, bg: 'rgba(124,58,237,0.07)' },
          { label: 'Commission', value: fmtCompact(totalComm), color: C.rose, bg: 'rgba(225,29,72,0.07)' },
          { label: 'Net', value: fmtCompact(totalRev - totalComm), color: C.emerald, bg: 'rgba(16,185,129,0.07)' },
        ].map(s => (
          <div key={s.label} className="flex-1 rounded-[11px] p-2.5" style={{ background: s.bg }}>
            <p className="text-[7.5px] font-[700] uppercase tracking-[0.09em] mb-0.5" style={{ color: `${s.color}aa` }}>{s.label}</p>
            <p className="text-[13px] font-[840] tracking-[-0.02em]" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>
    </Glass>
  );
}

// ─── Section 4b — Revenue Composition Donut ────────────────────────────────────
function RevenueDonut({ net, commission, outstanding }: { net: number; commission: number; outstanding: number }) {
  const segs = [
    { label: 'Net', value: Math.max(0, net),         color: C.emerald },
    { label: 'Comm', value: Math.max(0, commission),  color: C.rose },
    { label: 'Owed', value: Math.max(0, outstanding), color: C.amber },
  ];
  const total = segs.reduce((s, x) => s + x.value, 0) || 1;
  const R = 44, CIRC = 2 * Math.PI * R;
  let offset = 0;
  return (
    <Glass className="p-4 sm:p-5">
      <h3 className="text-[14px] sm:text-[15px] font-[780] tracking-[-0.01em] mb-1" style={{ color: C.ink }}>Breakdown</h3>
      <p className="text-[10.5px] font-[500] mb-4" style={{ color: C.muted }}>This month</p>
      <div className="flex items-center gap-4">
        <div className="relative shrink-0" style={{ width: 108, height: 108 }}>
          <svg width={108} height={108} className="-rotate-90">
            <circle cx={54} cy={54} r={R} fill="none" stroke="rgba(15,23,42,0.05)" strokeWidth="13" />
            {segs.map((s, i) => {
              const len = (s.value / total) * CIRC;
              const el = (
                <m.circle key={i} cx={54} cy={54} r={R} fill="none" stroke={s.color} strokeWidth="13"
                  strokeDasharray={`${len} ${CIRC - len}`} strokeDashoffset={-offset} strokeLinecap="butt"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 + i*0.1, duration: 0.4 }} />
              );
              offset += len;
              return el;
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[7.5px] font-[700] uppercase tracking-[0.1em]" style={{ color: C.muted }}>Total</span>
            <span className="text-[13px] font-[860] tracking-[-0.02em]" style={{ color: C.ink }}>{fmtCompact(total)}</span>
          </div>
        </div>
        <div className="flex-1 space-y-2.5 min-w-0">
          {segs.map(s => (
            <div key={s.label} className="flex items-center gap-2 min-w-0">
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: s.color }} />
              <span className="text-[10.5px] font-[600] flex-1 min-w-0 truncate" style={{ color: C.ink }}>{s.label}</span>
              <span className="text-[11px] font-[820] tabular-nums shrink-0" style={{ color: s.color }}>{fmtCompact(s.value)}</span>
            </div>
          ))}
        </div>
      </div>
    </Glass>
  );
}

// ─── Section 5 — Revenue Intelligence ──────────────────────────────────────────
function ForecastPanel({ d }: { d: DashData }) {
  const revVals = d.revenueTrend.map(x => Number(x.revenue));
  const projected = forecastNext(revVals);
  const last = revVals[revVals.length - 1] ?? 0;
  const delta = projected !== null && last > 0 ? ((projected - last) / last) * 100 : null;
  const avgPerClient = d.active_pt_clients > 0 ? d.total_monthly_pt_revenue / d.active_pt_clients : 0;

  const tiles = [
    { label: 'This Month',     value: fmtCompact(d.total_monthly_pt_revenue), color: C.blue,   icon: <Wallet size={13} /> },
    { label: 'Projected Next', value: projected !== null ? fmtCompact(projected) : '—', color: C.purple, icon: <TrendingUp size={13} />, badge: delta },
    { label: 'Avg / Client',   value: fmtCompact(avgPerClient),               color: C.emerald, icon: <Users size={13} /> },
    { label: '6M Collected',   value: fmtCompact(revVals.reduce((s,v)=>s+v,0)), color: C.amber, icon: <Activity size={13} /> },
  ];

  return (
    <Glass className="p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3.5">
        <div>
          <h3 className="text-[14px] sm:text-[15px] font-[780] tracking-[-0.01em]" style={{ color: C.ink }}>Revenue Intelligence</h3>
          <p className="text-[10.5px] mt-0.5 font-[500]" style={{ color: C.muted }}>Linear trend projection</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[9px] font-[700] uppercase tracking-[0.08em]"
          style={{ background: 'rgba(124,58,237,0.1)', color: C.purple }}>
          <Sparkles size={9} /> Forecast
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {tiles.map((t, i) => (
          <m.div key={t.label}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.35 }}
            className="rounded-[14px] p-3" style={{ background: `${t.color}0d`, border: `1px solid ${t.color}1f` }}>
            <div className="flex items-center justify-between mb-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-[9px] text-white" style={{ background: t.color }}>{t.icon}</span>
              {t.badge != null && <TrendBadge pct={t.badge} />}
            </div>
            <p className="text-[8px] font-[700] uppercase tracking-[0.09em]" style={{ color: `${t.color}aa` }}>{t.label}</p>
            <p className="text-[15px] font-[850] tracking-[-0.02em] mt-0.5" style={{ color: t.color }}>{t.value}</p>
          </m.div>
        ))}
      </div>
    </Glass>
  );
}

// ─── Section 6 — AI Copilot ────────────────────────────────────────────────────
type Insight = { tone: 'risk' | 'good' | 'tip'; icon: React.ReactNode; title: string; body: string; href: string };

function buildInsights(d: DashData): Insight[] {
  const out: Insight[] = [];
  const h = healthScore(d);
  const top = [...d.trainers].sort((a, b) => b.monthly_revenue - a.monthly_revenue)[0];

  if (d.clients_with_balance > 0)
    out.push({ tone: 'risk', icon: <Wallet size={14} />,
      title: `${fmtCompact(d.total_outstanding)} outstanding`,
      body: `${d.clients_with_balance} client${d.clients_with_balance > 1 ? 's' : ''} carrying a balance. Collection rate ${(h.growthRaw > 0 ? '↑' : '→')} — follow up to protect cash flow.`,
      href: '/pt-os/balance-sheet' });
  if (d.expired_clients > 0)
    out.push({ tone: 'risk', icon: <ShieldCheck size={14} />,
      title: `${d.expired_clients} package${d.expired_clients > 1 ? 's' : ''} expired`,
      body: 'Re-engaging lapsed clients is the cheapest revenue you can win this month.',
      href: '/pt-os/clients' });
  if (h.growthRaw !== 0)
    out.push({ tone: h.growthRaw > 0 ? 'good' : 'risk', icon: <TrendingUp size={14} />,
      title: `Revenue ${h.growthRaw > 0 ? '↑' : '↓'} ${Math.abs(h.growthRaw).toFixed(0)}% MoM`,
      body: h.growthRaw > 0 ? 'Momentum is building. Convert active clients to longer packages.' : 'Review renewals due and trainer pipelines.',
      href: '/pt-os/reports' });
  if (top?.monthly_revenue > 0)
    out.push({ tone: 'good', icon: <Crown size={14} />,
      title: `${top.name} leads at ${fmtCompact(top.monthly_revenue)}`,
      body: `${top.active_clients} client${top.active_clients !== 1 ? 's' : ''}. Model their approach across the team.`,
      href: '/pt-os/reports' });
  if (d.active_pt_clients > 0)
    out.push({ tone: 'tip', icon: <Target size={14} />,
      title: `${fmtCompact(d.total_monthly_pt_revenue / d.active_pt_clients)} avg / client`,
      body: 'Upsell assessments, diet plans, or session packs to lift this without new acquisition.',
      href: '/pt-os/plans' });
  return out.slice(0, 4);
}

function AICopilot({ d }: { d: DashData }) {
  const router = useRouter();
  const insights = useMemo(() => buildInsights(d), [d]);
  const toneStyle = {
    risk: { color: C.crimson, bg: 'rgba(193,18,31,0.07)', border: 'rgba(193,18,31,0.18)' },
    good: { color: C.emerald, bg: 'rgba(16,185,129,0.07)', border: 'rgba(16,185,129,0.18)' },
    tip:  { color: C.blue,    bg: 'rgba(37,99,235,0.07)',  border: 'rgba(37,99,235,0.18)'  },
  };
  return (
    <Glass className="p-4 sm:p-5 flex flex-col"
      style={{ background: 'linear-gradient(155deg, rgba(124,58,237,0.06), rgba(255,255,255,0.76))' }}>
      <div className="flex items-center gap-2.5 mb-3.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-[12px] text-white shrink-0"
          style={{ background: `linear-gradient(135deg, ${C.purple}, ${C.blue})`, boxShadow: `0 5px 14px ${C.purple}45` }}>
          <Sparkles size={15} />
        </span>
        <div>
          <h3 className="text-[14px] sm:text-[15px] font-[780] tracking-[-0.01em]" style={{ color: C.ink }}>AI Copilot</h3>
          <p className="text-[10.5px] font-[500]" style={{ color: C.muted }}>Live business insights</p>
        </div>
      </div>
      <div className="space-y-2">
        {insights.length === 0
          ? <div className="flex flex-col items-center py-8 text-center"><ShieldCheck size={24} style={{ color: C.emerald }} /><p className="mt-2 text-[12px] font-[600]" style={{ color: C.ink }}>All clear — no alerts</p></div>
          : insights.map((ins, i) => {
            const t = toneStyle[ins.tone];
            return (
              <m.button key={i}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07, duration: 0.35 }}
                onClick={() => router.push(ins.href)}
                className="w-full text-left rounded-[14px] p-3 transition active:scale-[0.985]"
                style={{ background: t.bg, border: `1px solid ${t.border}` }}>
                <div className="flex items-start gap-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] text-white" style={{ background: t.color }}>{ins.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11.5px] font-[740] leading-tight" style={{ color: C.ink }}>{ins.title}</p>
                    <p className="text-[10px] font-[450] leading-snug mt-0.5" style={{ color: C.muted }}>{ins.body}</p>
                  </div>
                  <ChevronRight size={13} style={{ color: t.color, flexShrink: 0, marginTop: 2 }} />
                </div>
              </m.button>
            );
          })}
      </div>
    </Glass>
  );
}

// ─── Section 7 — Today's Sessions ──────────────────────────────────────────────
function TodayOps({ ops, loading }: { ops: OpsData | null | undefined; loading: boolean }) {
  const router = useRouter();
  const sessions = ops?.today_sessions ?? [];
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });

  return (
    <Glass className="p-4 sm:p-5 flex flex-col">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-[12px] text-white shrink-0"
            style={{ background: `linear-gradient(135deg, ${C.blue}, ${C.cyan})`, boxShadow: `0 5px 12px ${C.blue}40` }}>
            <CalendarClock size={14} />
          </span>
          <div>
            <h3 className="text-[14px] sm:text-[15px] font-[780] tracking-[-0.01em]" style={{ color: C.ink }}>Today</h3>
            <p className="text-[10px] font-[500]" style={{ color: C.muted }}>{today}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {sessions.length > 0 && (
            <span className="rounded-full px-2 py-0.5 text-[10px] font-[700]"
              style={{ background: `${C.blue}15`, color: C.blue }}>{sessions.length}</span>
          )}
          <button onClick={() => router.push('/pt-os/sessions')}
            className="h-8 px-3 rounded-full text-[10.5px] font-[650] transition active:scale-95"
            style={{ background: `${C.blue}12`, color: C.blue }}>All</button>
        </div>
      </div>

      {loading && !ops && (
        <div className="space-y-2">{[1,2,3].map(i=><div key={i} className="rounded-[13px] p-3 flex gap-3" style={{ background: 'rgba(15,23,42,0.03)' }}><Skel w="w-9" h="h-9" r="rounded-full" /><div className="flex-1 space-y-1.5"><Skel w="w-28" h="h-3" /><Skel w="w-20" h="h-2.5" /></div></div>)}</div>
      )}

      {!loading && sessions.length === 0 && (
        <div className="flex flex-col items-center py-7 text-center">
          <CalendarClock size={24} style={{ color: `${C.blue}55` }} />
          <p className="mt-2 text-[12px] font-[640]" style={{ color: C.ink }}>No sessions today</p>
          <button onClick={() => router.push('/pt-os/schedule-session')}
            className="mt-2.5 inline-flex items-center gap-1.5 h-8 px-4 rounded-full text-[10.5px] font-[680] transition active:scale-95"
            style={{ background: `${C.blue}15`, color: C.blue }}>
            <CalendarPlus size={11} /> Schedule
          </button>
        </div>
      )}

      {sessions.length > 0 && (
        <div className="space-y-2" style={{ maxHeight: 280, overflowY: 'auto' }}>
          {sessions.map((s, i) => {
            const meta = STATUS_META[s.status] ?? STATUS_META.scheduled;
            const timeStr = fmt12(s.start_time);
            return (
              <m.div key={s.id}
                initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
                className="flex items-center gap-2.5 rounded-[13px] p-2.5"
                style={{ background: `${meta.color}09`, border: `1px solid ${meta.color}18` }}>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[10px] font-[820] text-white"
                  style={{ background: `linear-gradient(135deg, ${meta.color}, ${meta.color}cc)` }}>
                  {initials(s.client_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11.5px] font-[720] truncate" style={{ color: C.ink }}>{s.client_name ?? 'Unknown'}</p>
                  <p className="text-[9.5px] font-[500] truncate" style={{ color: C.muted }}>
                    {s.trainer_name ? `${s.trainer_name} · ` : ''}{s.title}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {timeStr && <span className="text-[10px] font-[700] tabular-nums" style={{ color: C.ink }}>{timeStr}</span>}
                  <span className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[8.5px] font-[700]"
                    style={{ background: `${meta.color}15`, color: meta.color }}>
                    {meta.icon}{meta.label}
                  </span>
                </div>
              </m.div>
            );
          })}
        </div>
      )}
    </Glass>
  );
}

// ─── Section 8 — Renewals Due ──────────────────────────────────────────────────
function RenewalsDue({ ops, loading }: { ops: OpsData | null | undefined; loading: boolean }) {
  const router = useRouter();
  const renewals = ops?.renewals_due ?? [];
  return (
    <Glass className="p-4 sm:p-5 flex flex-col">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-[12px] text-white shrink-0"
            style={{ background: `linear-gradient(135deg, ${C.amber}, #fbbf24)`, boxShadow: `0 5px 12px ${C.amber}40` }}>
            <CalendarClock size={14} />
          </span>
          <div>
            <h3 className="text-[14px] sm:text-[15px] font-[780] tracking-[-0.01em]" style={{ color: C.ink }}>Renewals Due</h3>
            <p className="text-[10px] font-[500]" style={{ color: C.muted }}>Next 7 days</p>
          </div>
        </div>
        {renewals.length > 0 && (
          <span className="rounded-full px-2 py-0.5 text-[10px] font-[700]"
            style={{ background: `${C.amber}18`, color: C.amber }}>{renewals.length}</span>
        )}
      </div>

      {loading && !ops && <div className="space-y-2">{[1,2,3].map(i=><div key={i} className="rounded-[13px] p-2.5" style={{ background: 'rgba(15,23,42,0.03)' }}><Skel h="h-3" w="w-28" /></div>)}</div>}

      {!loading && renewals.length === 0 && (
        <div className="flex flex-col items-center py-7 text-center">
          <CheckCircle2 size={24} style={{ color: `${C.emerald}88` }} />
          <p className="mt-2 text-[12px] font-[640]" style={{ color: C.ink }}>No renewals this week</p>
        </div>
      )}

      {renewals.length > 0 && (
        <div className="space-y-2" style={{ maxHeight: 280, overflowY: 'auto' }}>
          {renewals.map((r, i) => {
            const urgent = r.days_left <= 2;
            const color = urgent ? C.crimson : r.days_left <= 5 ? C.amber : C.blue;
            return (
              <m.div key={r.id}
                initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => router.push(`/pt-os/clients/${r.id}`)}
                className="flex items-center gap-2.5 rounded-[13px] p-2.5 cursor-pointer transition active:scale-[0.985]"
                style={{ background: `${color}09`, border: `1px solid ${color}1f` }}>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] text-[10px] font-[820] text-white"
                  style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}>
                  {initials(r.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11.5px] font-[720] truncate" style={{ color: C.ink }}>{r.name}</p>
                  <p className="text-[9.5px] font-[500] truncate" style={{ color: C.muted }}>
                    {r.trainer_name ?? '—'} · {r.package_type ?? 'PT'}
                  </p>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <span className="text-[11px] font-[800] tabular-nums" style={{ color }}>
                    {r.days_left === 0 ? 'Today!' : `${r.days_left}d`}
                  </span>
                  {r.balance_amount > 0 && (
                    <span className="text-[9px] font-[640]" style={{ color: C.rose }}>{fmtCompact(r.balance_amount)} due</span>
                  )}
                </div>
              </m.div>
            );
          })}
        </div>
      )}
    </Glass>
  );
}

// ─── Section 9 — Top Outstanding ───────────────────────────────────────────────
function TopDues({ ops, loading }: { ops: OpsData | null | undefined; loading: boolean }) {
  const router = useRouter();
  const dues = ops?.top_dues ?? [];
  return (
    <Glass className="p-4 sm:p-5 flex flex-col">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-[12px] text-white shrink-0"
            style={{ background: `linear-gradient(135deg, ${C.rose}, ${C.crimson})`, boxShadow: `0 5px 12px ${C.rose}40` }}>
            <Receipt size={14} />
          </span>
          <div>
            <h3 className="text-[14px] sm:text-[15px] font-[780] tracking-[-0.01em]" style={{ color: C.ink }}>Top Outstanding</h3>
            <p className="text-[10px] font-[500]" style={{ color: C.muted }}>Highest balances</p>
          </div>
        </div>
        <button onClick={() => router.push('/pt-os/balance-sheet')}
          className="h-8 px-3 rounded-full text-[10.5px] font-[650] transition active:scale-95"
          style={{ background: `${C.rose}12`, color: C.rose }}>All</button>
      </div>

      {loading && !ops && <div className="space-y-2">{[1,2,3].map(i=><div key={i} className="rounded-[13px] p-2.5" style={{ background: 'rgba(15,23,42,0.03)' }}><Skel h="h-3" w="w-28" /></div>)}</div>}

      {!loading && dues.length === 0 && (
        <div className="flex flex-col items-center py-7 text-center">
          <CheckCircle2 size={24} style={{ color: `${C.emerald}88` }} />
          <p className="mt-2 text-[12px] font-[640]" style={{ color: C.ink }}>All accounts settled</p>
        </div>
      )}

      {dues.length > 0 && (
        <div className="space-y-2">
          {dues.map((due, i) => {
            const color = due.due_status === 'overdue' ? C.crimson : C.rose;
            return (
              <m.div key={due.id}
                initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => router.push(`/pt-os/clients/${due.id}`)}
                className="flex items-center gap-2.5 rounded-[13px] p-2.5 cursor-pointer transition active:scale-[0.985]"
                style={{ background: `${color}09`, border: `1px solid ${color}1f` }}>
                <div className="flex-1 min-w-0">
                  <p className="text-[11.5px] font-[720] truncate" style={{ color: C.ink }}>{due.name}</p>
                  <p className="text-[9.5px] font-[500]" style={{ color: C.muted }}>
                    {due.trainer_name ?? '—'}{due.due_status === 'overdue' ? ' · Overdue' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {due.mobile && (
                    <a href={`tel:${due.mobile}`} onClick={e => e.stopPropagation()}
                      className="flex h-8 w-8 items-center justify-center rounded-full transition"
                      style={{ background: `${C.emerald}15` }}>
                      <PhoneCall size={11} style={{ color: C.emerald }} />
                    </a>
                  )}
                  <span className="text-[12.5px] font-[820] tabular-nums" style={{ color }}>{fmtCompact(due.balance_amount)}</span>
                </div>
              </m.div>
            );
          })}
        </div>
      )}
    </Glass>
  );
}

// ─── Section 10 — Session Activity ─────────────────────────────────────────────
function SessionActivity({ ops, loading }: { ops: OpsData | null | undefined; loading: boolean }) {
  const stats = ops?.session_stats;
  const trainerSessions = ops?.trainer_sessions ?? [];
  const completionRate = stats && stats.this_month_total > 0
    ? (stats.this_month_completed / stats.this_month_total) * 100 : null;
  const momDelta = stats && stats.last_month_completed > 0
    ? ((stats.this_month_completed - stats.last_month_completed) / stats.last_month_completed) * 100 : null;
  const maxCompleted = Math.max(...trainerSessions.map(t => t.completed), 1);

  return (
    <Glass className="p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-[12px] text-white shrink-0"
            style={{ background: `linear-gradient(135deg, ${C.emerald}, #34d399)`, boxShadow: `0 5px 12px ${C.emerald}40` }}>
            <Activity size={14} />
          </span>
          <div>
            <h3 className="text-[14px] sm:text-[15px] font-[780] tracking-[-0.01em]" style={{ color: C.ink }}>Session Activity</h3>
            <p className="text-[10px] font-[500]" style={{ color: C.muted }}>This month</p>
          </div>
        </div>
        {momDelta !== null && <TrendBadge pct={momDelta} />}
      </div>

      {loading && !ops && <div className="space-y-2">{[1,2,3].map(i=><Skel key={i} h="h-10" r="rounded-[12px]" />)}</div>}

      {stats && (
        <>
          <div className="grid grid-cols-3 gap-2 mb-3.5">
            {[
              { label: 'Total',    value: stats.this_month_total,     color: C.blue },
              { label: 'Done',     value: stats.this_month_completed, color: C.emerald },
              { label: 'Last mo.', value: stats.last_month_completed, color: C.purple },
            ].map(t => (
              <div key={t.label} className="rounded-[13px] p-2.5" style={{ background: `${t.color}0d` }}>
                <p className="text-[8px] font-[700] uppercase tracking-[0.09em] mb-0.5" style={{ color: `${t.color}aa` }}>{t.label}</p>
                <p className="text-[20px] font-[860] tracking-[-0.02em]" style={{ color: t.color }}>{t.value}</p>
              </div>
            ))}
          </div>

          {completionRate !== null && (
            <div className="mb-4">
              <div className="flex justify-between mb-1.5">
                <span className="text-[9.5px] font-[650]" style={{ color: C.muted }}>Completion rate</span>
                <span className="text-[9.5px] font-[750]" style={{ color: C.emerald }}>{completionRate.toFixed(0)}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: `${C.emerald}18` }}>
                <m.div className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${C.emerald}, #34d399)` }}
                  initial={{ width: 0 }} animate={{ width: `${completionRate}%` }}
                  transition={{ duration: 0.8, ease: [0.16,1,0.3,1] }} />
              </div>
            </div>
          )}

          {trainerSessions.length > 0 && (
            <div className="space-y-2.5">
              <p className="text-[9.5px] font-[700] uppercase tracking-[0.09em]" style={{ color: C.muted }}>By Trainer</p>
              {trainerSessions.map((t, i) => {
                const color = TRAINER_COLORS[i % TRAINER_COLORS.length];
                const pct = (t.completed / maxCompleted) * 100;
                return (
                  <m.div key={t.trainer_name}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.06 }}>
                    <div className="flex items-center justify-between mb-1 min-w-0">
                      <span className="text-[11px] font-[640] truncate max-w-[130px] sm:max-w-[170px]" style={{ color: C.ink }}>{t.trainer_name}</span>
                      <div className="flex items-center gap-1.5 text-[9px] font-[650] shrink-0 ml-2">
                        <span style={{ color: C.emerald }}>{t.completed}✓</span>
                        {t.scheduled > 0 && <span style={{ color: C.blue }}>{t.scheduled}⏱</span>}
                        {t.missed > 0 && <span style={{ color: C.amber }}>{t.missed}✗</span>}
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: `${color}15` }}>
                      <m.div className="h-full rounded-full" style={{ background: color }}
                        initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                        transition={{ delay: 0.2 + i*0.06, duration: 0.55, ease: [0.16,1,0.3,1] }} />
                    </div>
                  </m.div>
                );
              })}
            </div>
          )}
        </>
      )}
    </Glass>
  );
}

// ─── Section 11 — Trainer Leaderboard ──────────────────────────────────────────
function TrainerLeaderboard({ trainers, onRefetch, loading }: {
  trainers: DashData['trainers']; onRefetch: () => void; loading: boolean;
}) {
  const sorted = useMemo(() => [...(trainers ?? [])].sort((a, b) => b.monthly_revenue - a.monthly_revenue), [trainers]);
  const topRevenue = sorted[0]?.monthly_revenue ?? 1;
  return (
    <Glass className="p-4 sm:p-5 flex flex-col">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-[12px] text-white shrink-0"
            style={{ background: `linear-gradient(135deg, ${C.amber}, #fbbf24)`, boxShadow: `0 5px 12px ${C.amber}40` }}>
            <Trophy size={14} />
          </span>
          <div>
            <h3 className="text-[14px] sm:text-[15px] font-[780] tracking-[-0.01em]" style={{ color: C.ink }}>Trainer Board</h3>
            <p className="text-[10px] font-[500]" style={{ color: C.muted }}>This month · by revenue</p>
          </div>
        </div>
        <button onClick={onRefetch} className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-purple-50" aria-label="Refresh">
          <RefreshCw size={13} style={{ color: 'rgba(124,58,237,0.5)' }} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center py-7 text-center">
          <p className="text-[12px]" style={{ color: C.muted }}>No trainer data yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((t, i) => {
            const color = TRAINER_COLORS[i % TRAINER_COLORS.length];
            const commPct = t.monthly_revenue > 0 ? (t.monthly_commission / t.monthly_revenue) * 100 : 0;
            const revPct = (t.monthly_revenue / topRevenue) * 100;
            const isTop3 = i < 3;
            return (
              <m.div key={t.id}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07, duration: 0.35 }}
                className="rounded-[14px] p-3"
                style={{ background: `${color}0a`, border: `1px solid ${color}1c` }}>
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className="w-5 text-center shrink-0">
                    {isTop3 ? <span className="text-[14px]">{MEDALS[i]}</span>
                      : <span className="text-[10px] font-[760]" style={{ color: C.muted }}>#{i+1}</span>}
                  </div>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] text-[10px] font-[820] text-white"
                    style={{ background: `linear-gradient(135deg,${color},${color}bb)`, boxShadow: `0 3px 8px ${color}30` }}>
                    {initials(t.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-[720] truncate" style={{ color: C.ink }}>{t.name}</p>
                    <p className="text-[9px] font-[500]" style={{ color: C.muted }}>{t.active_clients} client{t.active_clients!==1?'s':''}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[12px] font-[820]" style={{ color }}>{fmtCompact(t.monthly_revenue)}</p>
                    <p className="text-[9px] font-[640]" style={{ color: C.rose }}>{fmtCompact(t.monthly_commission)} comm.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-[28px]">
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: `${color}15` }}>
                    <m.div className="h-full rounded-full" style={{ background: color }}
                      initial={{ width: 0 }} animate={{ width: `${revPct}%` }}
                      transition={{ delay: 0.3+i*0.07, duration: 0.55, ease: [0.16,1,0.3,1] }} />
                  </div>
                  <span className="text-[8.5px] font-[650] shrink-0" style={{ color: C.muted }}>{commPct.toFixed(0)}%</span>
                </div>
              </m.div>
            );
          })}
        </div>
      )}
    </Glass>
  );
}

// ─── Desktop Quick Dock ─────────────────────────────────────────────────────────
function QuickDock() {
  const router = useRouter();
  const actions = [
    { label: 'Add Client',           icon: <UserPlus size={17} />,       href: '/pt-os/new-client',           color: C.purple },
    { label: 'Consent',              icon: <FileSignature size={17} />,  href: '/pt-os/informed-consent',     color: C.blue },
    { label: 'PAR-Q',                icon: <ShieldCheck size={17} />,    href: '/pt-os/parq',                 color: C.emerald },
    { label: 'Fitness Testing',      icon: <Gauge size={17} />,          href: '/pt-os/assessment',           color: C.amber },
    { label: 'Lifestyle',            icon: <HeartPulse size={17} />,     href: '/pt-os/lifestyle-assessment', color: C.crimson },
    { label: 'Nutrition Assessment', icon: <Apple size={17} />,          href: '/pt-os/nutrition-assessment', color: C.cyan },
    { label: 'Mobility Assessment',  icon: <PersonStanding size={17} />, href: '/pt-os/mobility-assessment',  color: C.rose },
  ];
  return (
    <m.div
      initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className="hidden lg:flex fixed bottom-6 left-1/2 -translate-x-1/2 z-40 items-end gap-1 rounded-[22px] px-3 py-2.5"
      style={{
        background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.92)', boxShadow: '0 16px 48px rgba(15,23,42,0.14), inset 0 1px 0 rgba(255,255,255,0.7)',
      }}>
      {actions.map(a => (
        <button key={a.label} onClick={() => router.push(a.href)}
          className="group flex flex-col items-center gap-1 rounded-[14px] px-3 py-2 transition-all duration-200 hover:-translate-y-1"
          aria-label={a.label}>
          <span className="flex h-11 w-11 items-center justify-center rounded-[14px] text-white transition-transform duration-200 group-hover:scale-110"
            style={{ background: `linear-gradient(135deg, ${a.color}, ${a.color}cc)`, boxShadow: `0 5px 14px ${a.color}45` }}>
            {a.icon}
          </span>
          <span className="text-[9px] font-[650] whitespace-nowrap" style={{ color: C.ink }}>{a.label}</span>
        </button>
      ))}
    </m.div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonDash() {
  return (
    <div className="space-y-4">
      <Glass className="p-4"><div className="flex items-center gap-3"><Skel w="w-16" h="h-16" r="rounded-[16px]" /><div className="flex-1 space-y-2"><Skel w="w-32" h="h-5" /><Skel w="w-48" h="h-3" /></div></div></Glass>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <Glass key={i} className="p-3.5 space-y-2.5">
            <div className="flex justify-between"><Skel w="w-8" h="h-8" r="rounded-[10px]" /><Skel w="w-9" h="h-4" r="rounded-full" /></div>
            <Skel h="h-2.5" w="w-16" /><Skel h="h-6" w="w-3/4" /><Skel h="h-6" r="rounded-lg" />
          </Glass>
        ))}
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function PtOsDashboard() {
  const { user } = useAuth();
  const dash = useAsync<DashData>(
    (signal) => http<{ data: DashData }>('/api/pt-os/dashboard', { signal }).then(r => r.data),
    [],
  );
  const ops = useAsync<OpsData>(
    (signal) => http<{ data: OpsData }>('/api/pt-os/dashboard/ops', { signal }).then(r => r.data),
    [],
  );
  const consents = useAsync<{ status: string }[]>(
    (signal) => http<{ data: { status: string }[] }>('/api/pt-os/informed-consent', { signal }).then(r => r.data),
    [],
  );

  const d = dash.data;
  const o = ops.data;
  const coach = user?.name?.split(' ')[0] || 'Coach';
  const studioName = user?.organization_name || 'PT Studio';

  const refreshAll = useCallback(async () => {
    await Promise.all([dash.refetch(), ops.refetch(), consents.refetch()]);
  }, [dash.refetch, ops.refetch, consents.refetch]);

  const consentCompleted = consents.data?.filter((c) => c.status === 'completed').length ?? 0;
  const consentPending = consents.data?.filter((c) => c.status !== 'completed' && c.status !== 'revoked' && c.status !== 'archived').length ?? 0;
  const consentMissing = d ? Math.max(d.active_pt_clients - consentCompleted - consentPending, 0) : 0;
  const consentCompletionPct = d && d.active_pt_clients > 0 ? Math.round((consentCompleted / d.active_pt_clients) * 100) : 0;

  const revTrend = d?.revenueTrend?.map(x => Number(x.revenue)) ?? [];
  const incTrend = d?.revenueTrend?.map(x => Number(x.incentives)) ?? [];
  const revMoM   = momPct(d?.revenueTrend, 'revenue');
  const incMoM   = momPct(d?.revenueTrend, 'incentives');

  const netRevenue = (d?.total_monthly_pt_revenue ?? 0) - (d?.total_monthly_commission ?? 0);
  const commRate = d?.total_monthly_pt_revenue && d.total_monthly_pt_revenue > 0
    ? `${((d.total_monthly_commission / d.total_monthly_pt_revenue) * 100).toFixed(0)}% rate` : undefined;
  const retentionPct = d && (d.active_pt_clients + d.expired_clients) > 0
    ? (d.active_pt_clients / (d.active_pt_clients + d.expired_clients)) * 100 : null;

  return (
    <>
      {/* Ambient color wash — fixed so it doesn't scroll */}
      <div className="pointer-events-none fixed inset-0" style={{ zIndex: 0 }}>
        <div className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 65% 45% at 10% 0%, rgba(193,18,31,0.05) 0%, transparent 55%), radial-gradient(ellipse 55% 40% at 90% 90%, rgba(124,58,237,0.05) 0%, transparent 55%)' }} />
      </div>

      {/* Scroll container — pb accounts for mobile bottom nav (h-16=64px) + safe area.
          QuickDock and the ambient wash above stay outside PullToRefresh: both use
          position:fixed, which breaks once an ancestor gets a transform. */}
      <PullToRefresh onRefresh={refreshAll}>
      <div className="relative mx-auto w-full max-w-7xl pt-2 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] lg:pb-28 space-y-3.5 sm:space-y-4"
        style={{ zIndex: 1 }}>

        {dash.loading && !d && <SkeletonDash />}

        {d && (
          <>
            {/* 1 — Hero header */}
            <HeroHeader d={d} coach={coach} studioName={studioName} loading={dash.loading} onRefresh={dash.refetch} />

            {/* 2 — Mobile quick actions (desktop uses the dock) */}
            <MobileQuickActions />

            {/* 3 — KPI grid: 2 cols mobile → 3 tablet → 6 desktop */}
            <div>
              <SectionLabel>Key Metrics</SectionLabel>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                <StatCard icon={<Users size={14} />} label="Active Clients" value={d.active_pt_clients.toLocaleString()}
                  sub={`${d.expired_clients} expired`} color={C.purple} accent="#a78bfa" delay={0} href="/pt-os/clients" trend={revTrend} pct={revMoM} />
                <StatCard icon={<Wallet size={14} />} label="PT Revenue" value={fmtCompact(d.total_monthly_pt_revenue)}
                  color={C.emerald} accent="#34d399" delay={0.05} href="/pt-os/reports" trend={revTrend} pct={revMoM} />
                <StatCard icon={<TrendingUp size={14} />} label="Net Revenue" value={fmtCompact(netRevenue)}
                  color={C.blue} accent="#38bdf8" delay={0.10} href="/pt-os/reports"
                  trend={revTrend.map((r, i) => Math.max(0, r - (incTrend[i] ?? 0)))} pct={revMoM} />
                <StatCard icon={<Percent size={14} />} label="Commission" value={fmtCompact(d.total_monthly_commission)}
                  sub={commRate} color={C.rose} accent="#fb7185" delay={0.15} href="/pt-os/commissions" trend={incTrend} pct={incMoM} />
                <StatCard icon={<Gauge size={14} />} label="Retention" value={retentionPct !== null ? `${retentionPct.toFixed(0)}%` : '—'}
                  sub={`${d.active_pt_clients}/${d.active_pt_clients + d.expired_clients}`} color={C.cyan} accent="#22d3ee" delay={0.20} href="/pt-os/clients" />
                <StatCard icon={<Receipt size={14} />} label="Outstanding" value={fmtCompact(d.total_outstanding)}
                  sub={`${d.clients_with_balance} client${d.clients_with_balance !== 1 ? 's' : ''}`} color={C.amber} accent="#fbbf24" delay={0.25} href="/pt-os/balance-sheet" />
                <StatCard icon={<FileSignature size={14} />} label="Consent Signed" value={`${consentCompletionPct}%`}
                  sub={`${consentPending} pending · ${consentMissing} missing`} color={C.crimson} accent="#f87171" delay={0.30} href="/pt-os/informed-consent" />
              </div>
            </div>

            {/* 4 — Today's ops: sessions + renewals (full-width on mobile, 2-col on tablet+) */}
            <div>
              <SectionLabel>Today&apos;s Operations</SectionLabel>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <TodayOps ops={o} loading={ops.loading} />
                <RenewalsDue ops={o} loading={ops.loading} />
              </div>
            </div>

            {/* 5 — Outstanding + AI copilot (stacked on mobile, 2-col on md+) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              <TopDues ops={o} loading={ops.loading} />
              <AICopilot d={d} />
            </div>

            {/* 6 — Revenue chart + donut (stacked mobile, 2-col lg+) */}
            <div>
              <SectionLabel>Revenue</SectionLabel>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5">
                <div className="lg:col-span-2"><RevenueChart data={d.revenueTrend} /></div>
                <RevenueDonut net={netRevenue} commission={d.total_monthly_commission} outstanding={d.total_outstanding} />
              </div>
            </div>

            {/* 7 — Revenue forecast */}
            <ForecastPanel d={d} />

            {/* 8 — Session activity + trainer board (stacked mobile, 2-col md+) */}
            <div>
              <SectionLabel>Team Performance</SectionLabel>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                <SessionActivity ops={o} loading={ops.loading} />
                <TrainerLeaderboard trainers={d.trainers} onRefetch={dash.refetch} loading={dash.loading} />
              </div>
            </div>
          </>
        )}
      </div>
      </PullToRefresh>

      {/* Desktop floating dock — hidden on mobile */}
      {d && <QuickDock />}
    </>
  );
}
