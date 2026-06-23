'use client';

/**
 * PtOsDashboard — Premium fitness-business command center.
 *
 * A high-end, Apple-inspired SaaS dashboard built ENTIRELY on real backend
 * data from two endpoints:
 *   /api/pt-os/dashboard      — KPIs, revenue trend, trainer earnings
 *   /api/pt-os/dashboard/ops  — today's sessions, renewals due, outstanding
 *                               balances, monthly session stats per-trainer
 * Every figure is a raw backend value or honestly-derived metric
 * (composite health score, least-squares forecast, rule-based insights).
 * Nothing on this screen is fabricated.
 *
 * Design system
 *   Palette   maroon→crimson brand, with purple / blue / emerald / amber accents
 *   Surfaces  frosted glassmorphism on a soft-white canvas
 *   Motion    framer-motion, springy [0.16,1,0.3,1] easing, staggered reveals
 *   Layout    fully responsive 1→2→3→6 column grids, mobile-first
 */

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Users, TrendingUp, Wallet, Percent, RefreshCw,
  ChevronRight, Sparkles, ArrowUpRight, ArrowDownRight, Activity,
  UserPlus, CreditCard, CalendarPlus, FileBarChart, Dumbbell, Receipt,
  Trophy, ShieldCheck, Target, Gauge, Crown,
  Clock, CalendarClock, AlertCircle, CheckCircle2, XCircle, PhoneCall,
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

// ─── Premium palette ────────────────────────────────────────────────────────────
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtINR(n: number | string | null | undefined) {
  return '₹' + Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}
/** Compact INR — ₹1.2L / ₹3.4Cr — for tight KPI slots. */
function fmtCompact(n: number | string | null | undefined) {
  const v = Number(n ?? 0);
  if (v >= 1e7) return '₹' + (v / 1e7).toFixed(2).replace(/\.00$/, '') + 'Cr';
  if (v >= 1e5) return '₹' + (v / 1e5).toFixed(2).replace(/\.00$/, '') + 'L';
  if (v >= 1e3) return '₹' + (v / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  return fmtINR(v);
}
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

function momPct(trend: DashData['revenueTrend'] | undefined, key: 'revenue' | 'incentives'): number | null {
  if (!trend || trend.length < 2) return null;
  const prev = Number(trend[trend.length - 2]?.[key] ?? 0);
  const curr = Number(trend[trend.length - 1]?.[key] ?? 0);
  if (prev === 0) return null;
  return ((curr - prev) / prev) * 100;
}

/** Least-squares linear projection of the next point. Honest, deterministic. */
function forecastNext(values: number[]): number | null {
  const n = values.length;
  if (n < 2) return null;
  const xbar = (n - 1) / 2;
  const ybar = values.reduce((s, v) => s + v, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) { num += (i - xbar) * (values[i] - ybar); den += (i - xbar) ** 2; }
  const slope = den === 0 ? 0 : num / den;
  const next = ybar + slope * (n - xbar);
  return Math.max(0, next);
}

/** Composite 0–100 business-health score from real signals. */
function healthScore(d: DashData) {
  const rev = Number(d.total_monthly_pt_revenue), out = Number(d.total_outstanding);
  const active = d.active_pt_clients, expired = d.expired_clients;
  const collection = rev + out > 0 ? rev / (rev + out) : 1;            // paid vs owed
  const retention  = active + expired > 0 ? active / (active + expired) : 1;
  const growthRaw  = momPct(d.revenueTrend, 'revenue') ?? 0;
  const growth     = clamp((growthRaw + 50) / 100, 0, 1);             // −50%→0 … +50%→1
  const score = Math.round(collection * 35 + retention * 35 + growth * 30);
  const color = score >= 80 ? C.emerald : score >= 60 ? C.amber : C.crimson;
  const label = score >= 80 ? 'Excellent' : score >= 60 ? 'Healthy' : score >= 40 ? 'Needs Focus' : 'At Risk';
  return { score, color, label, collection, retention, growthRaw };
}

function greeting() {
  const h = new Date().getHours();
  if (h < 5)  return 'Burning the midnight oil';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Working late';
}

// ─── TrendBadge ───────────────────────────────────────────────────────────────
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

// ─── Glass card shell ───────────────────────────────────────────────────────────
function Glass({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`rounded-[24px] ${className}`}
      style={{
        background: 'rgba(255,255,255,0.72)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.9)',
        boxShadow: '0 8px 32px rgba(15,23,42,0.06), inset 0 1px 0 rgba(255,255,255,0.6)',
        ...style,
      }}>
      {children}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skel({ w = 'w-full', h = 'h-4', r = 'rounded-xl' }: { w?: string; h?: string; r?: string }) {
  return <div className={`${w} ${h} ${r} animate-pulse`} style={{ background: 'rgba(124,58,237,0.08)' }} />;
}
function SkeletonDash() {
  return (
    <div className="space-y-5">
      <Glass className="p-6"><div className="flex items-center gap-4"><Skel w="w-16" h="h-16" r="rounded-full" /><div className="flex-1 space-y-2"><Skel w="w-40" h="h-5" /><Skel w="w-56" h="h-3" /></div></div></Glass>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Glass key={i} className="p-4 space-y-3">
            <div className="flex justify-between"><Skel w="w-9" h="h-9" r="rounded-[11px]" /><Skel w="w-10" h="h-4" r="rounded-full" /></div>
            <Skel h="h-2.5" w="w-20" /><Skel h="h-6" w="w-3/4" /><Skel h="h-7" r="rounded-lg" />
          </Glass>
        ))}
      </div>
    </div>
  );
}

// ─── HealthRing ─────────────────────────────────────────────────────────────────
function HealthRing({ score, color, size = 72 }: { score: number; color: string; size?: number }) {
  const r = (size - 9) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (clamp(score, 0, 100) / 100) * circ;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(15,23,42,0.07)" strokeWidth="6" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - dash }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          style={{ filter: `drop-shadow(0 0 6px ${color}55)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[19px] font-[860] tabular-nums leading-none" style={{ color }}>{score}</span>
        <span className="text-[7px] font-[700] uppercase tracking-[0.12em]" style={{ color: C.muted }}>score</span>
      </div>
    </div>
  );
}

// ─── HeroHeader (Section 1 — Premium Welcome) ──────────────────────────────────
function HeroHeader({ d, coach, loading, onRefresh }: {
  d: DashData; coach: string; loading: boolean; onRefresh: () => void;
}) {
  const router = useRouter();
  const dateStr = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  const h = healthScore(d);

  const chips = [
    { label: 'Add Client',   icon: <UserPlus size={13} />,    href: '/pt-os/new-client',       color: C.purple },
    { label: 'New Package',  icon: <Dumbbell size={13} />,    href: '/pt-os/plans',            color: C.blue },
    { label: 'Schedule',     icon: <CalendarPlus size={13} />, href: '/pt-os/schedule-session', color: C.emerald },
    { label: 'Balances',     icon: <Receipt size={13} />,     href: '/pt-os/balance-sheet',    color: C.amber },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -18 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-[28px]"
      style={{
        background: `linear-gradient(135deg, ${C.maroon} 0%, #9A0E1F 30%, ${C.crimson} 60%, #7C1D6F 100%)`,
        boxShadow: `0 24px 70px ${C.maroon}55, 0 6px 24px ${C.crimson}33, inset 0 1px 0 rgba(255,255,255,0.14)`,
      }}
    >
      {/* Decorative orbs + mesh */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -right-16 h-72 w-72 rounded-full opacity-30"
          style={{ background: 'radial-gradient(circle, #fb7185 0%, transparent 70%)', filter: 'blur(50px)' }} />
        <div className="absolute -bottom-20 -left-16 h-80 w-80 rounded-full opacity-25"
          style={{ background: 'radial-gradient(circle, #c084fc 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <svg className="absolute inset-0 w-full h-full opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
          <defs><pattern id="hh-grid" width="38" height="38" patternUnits="userSpaceOnUse">
            <path d="M 38 0 L 0 0 0 38" fill="none" stroke="white" strokeWidth="0.7" />
          </pattern></defs>
          <rect width="100%" height="100%" fill="url(#hh-grid)" />
        </svg>
      </div>

      <div className="relative z-10 p-5 sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          {/* Greeting */}
          <div className="flex items-center gap-4">
            <div className="rounded-[20px] p-1" style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.22)' }}>
              <HealthRing score={h.score} color="#fff" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-[600] uppercase tracking-[0.16em]" style={{ color: 'rgba(255,255,255,0.7)', WebkitTextFillColor: 'rgba(255,255,255,0.7)' }}>
                  {dateStr}
                </span>
                <button onClick={onRefresh} aria-label="Refresh"
                  className="rounded-full p-1 transition hover:bg-white/15"
                  style={{ color: '#fff', WebkitTextFillColor: '#fff' }}>
                  <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>
              <h1 className="mt-1 text-[24px] sm:text-[30px] font-[850] leading-[1.05] tracking-[-0.03em]"
                style={{ color: '#fff', WebkitTextFillColor: '#fff' }}>
                {greeting()}, {coach}
              </h1>
              <p className="mt-1 text-[12.5px] font-[500]" style={{ color: 'rgba(255,255,255,0.78)', WebkitTextFillColor: 'rgba(255,255,255,0.78)' }}>
                Business health is <strong style={{ color: '#fff', WebkitTextFillColor: '#fff' }}>{h.label}</strong> · {d.active_pt_clients} active clients · {fmtCompact(d.total_monthly_pt_revenue)}/mo
              </p>
            </div>
          </div>

          {/* Quick action chips */}
          <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end">
            <div className="flex flex-wrap gap-2">
              {chips.map((c) => (
                <button key={c.label} onClick={() => router.push(c.href)}
                  className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[11.5px] font-[680] transition hover:scale-[1.04] active:scale-95"
                  style={{ background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.26)', color: '#fff', WebkitTextFillColor: '#fff', backdropFilter: 'blur(8px)' }}>
                  {c.icon}{c.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(251,113,133,0.8), rgba(192,132,252,0.8), transparent)' }} />
    </motion.div>
  );
}

// ─── StatCard (Section 2 — Hero Analytics) ─────────────────────────────────────
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
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -6, scale: 1.02 }} whileTap={{ scale: 0.975 }}
      onClick={() => href && router.push(href)}
      className="group relative cursor-pointer overflow-hidden rounded-[22px] p-4 sm:p-5"
      style={{
        background: `linear-gradient(160deg, ${color}12 0%, rgba(255,255,255,0.85) 60%)`,
        border: `1px solid ${color}22`,
        boxShadow: `0 8px 26px ${color}10, inset 0 1px 0 rgba(255,255,255,0.7)`,
        backdropFilter: 'blur(18px)',
      }}
    >
      <div className="pointer-events-none absolute inset-0 translate-x-[-100%] skew-x-[-12deg] bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-[120%]" />
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${color}, ${accent})` }} />

      <div className="relative z-10 flex items-start justify-between mb-3 pt-1">
        <div className="flex h-9 w-9 items-center justify-center rounded-[12px] text-white transition-all duration-300 group-hover:scale-110 group-hover:-rotate-6"
          style={{ background: `linear-gradient(135deg, ${color}, ${accent})`, boxShadow: `0 6px 16px ${color}40` }}>
          {icon}
        </div>
        {pct !== undefined && <TrendBadge pct={pct ?? null} />}
      </div>

      <div className="relative z-10">
        <p className="text-[9.5px] font-[750] uppercase tracking-[0.1em] mb-1" style={{ color: `${color}aa` }}>{label}</p>
        <p className="text-[19px] sm:text-[21px] font-[880] tracking-[-0.03em] leading-none" style={{ color }}>{value}</p>
        {sub && <p className="mt-1.5 text-[10px] font-[500]" style={{ color: C.muted }}>{sub}</p>}
      </div>

      {trend && trend.length > 0 && (
        <div className="relative z-10 flex items-end gap-[2px] h-8 mt-3">
          {trend.map((v, i) => (
            <motion.div key={i}
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
    </motion.div>
  );
}

// ─── DonutChart (Section 3 — revenue composition) ──────────────────────────────
function DonutChart({ net, commission, outstanding }: { net: number; commission: number; outstanding: number }) {
  const segs = [
    { label: 'Net Revenue', value: Math.max(0, net),         color: C.emerald },
    { label: 'Commission',  value: Math.max(0, commission),  color: C.rose },
    { label: 'Outstanding', value: Math.max(0, outstanding), color: C.amber },
  ];
  const total = segs.reduce((s, x) => s + x.value, 0) || 1;
  const R = 52, CIRC = 2 * Math.PI * R;
  let offset = 0;

  return (
    <Glass className="p-5 flex flex-col">
      <h3 className="text-[15px] font-[780] tracking-[-0.01em]" style={{ color: C.ink }}>Revenue Composition</h3>
      <p className="text-[11px] mt-0.5 font-[500] mb-3" style={{ color: C.muted }}>This month · where the money sits</p>
      <div className="flex items-center gap-5">
        <div className="relative shrink-0" style={{ width: 128, height: 128 }}>
          <svg width={128} height={128} className="-rotate-90">
            <circle cx={64} cy={64} r={R} fill="none" stroke="rgba(15,23,42,0.05)" strokeWidth="16" />
            {segs.map((s, i) => {
              const frac = s.value / total;
              const len = frac * CIRC;
              const el = (
                <motion.circle key={i} cx={64} cy={64} r={R} fill="none" stroke={s.color} strokeWidth="16"
                  strokeDasharray={`${len} ${CIRC - len}`} strokeDashoffset={-offset} strokeLinecap="butt"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 + i * 0.12, duration: 0.5 }} />
              );
              offset += len;
              return el;
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[8px] font-[700] uppercase tracking-[0.1em]" style={{ color: C.muted }}>Gross</span>
            <span className="text-[15px] font-[850] tracking-[-0.02em]" style={{ color: C.ink }}>{fmtCompact(total)}</span>
          </div>
        </div>
        <div className="flex-1 space-y-2.5 min-w-0">
          {segs.map((s) => (
            <div key={s.label} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: s.color }} />
              <span className="text-[11px] font-[600] flex-1 truncate" style={{ color: C.ink }}>{s.label}</span>
              <span className="text-[11.5px] font-[800] tabular-nums" style={{ color: s.color }}>{fmtCompact(s.value)}</span>
              <span className="text-[9px] font-[600] tabular-nums w-9 text-right" style={{ color: C.muted }}>
                {((s.value / total) * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </Glass>
  );
}

// ─── DualChart (Section 3 — Revenue & Commission trend) ────────────────────────
function DualChart({ data }: { data: DashData['revenueTrend'] }) {
  if (!data?.length) return (
    <Glass className="p-6 flex items-center justify-center h-[300px]">
      <p className="text-[12px]" style={{ color: C.muted }}>No revenue data yet</p>
    </Glass>
  );

  const W = 600, H = 200, PL = 8, PR = 8, PT = 20, PB = 28;
  const cW = W - PL - PR, cH = H - PT - PB;
  const maxRev = Math.max(...data.map(d => Number(d.revenue)), 1);
  const maxInc = Math.max(...data.map(d => Number(d.incentives)), 1);
  const slotW = cW / data.length;
  const barW = slotW * 0.5;

  const bars = data.map((d, i) => ({
    x: PL + i * slotW + slotW / 2,
    barTop: PT + cH - (Number(d.revenue) / maxRev) * cH,
    barH: (Number(d.revenue) / maxRev) * cH,
    lineY: PT + cH - (Number(d.incentives) / maxInc) * cH,
    revenue: Number(d.revenue), incentives: Number(d.incentives),
    label: (d.label ?? '').split(' ')[0],
  }));

  const buildLine = (pts: Array<{ x: number; lineY: number }>) => {
    if (!pts.length) return '';
    let p = `M${pts[0].x},${pts[0].lineY}`;
    for (let i = 1; i < pts.length; i++) {
      const cx = (pts[i].x + pts[i - 1].x) / 2;
      p += ` C${cx},${pts[i - 1].lineY} ${cx},${pts[i].lineY} ${pts[i].x},${pts[i].lineY}`;
    }
    return p;
  };

  const totalRev = data.reduce((s, d) => s + Number(d.revenue), 0);
  const totalComm = data.reduce((s, d) => s + Number(d.incentives), 0);

  return (
    <Glass className="p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-y-2 mb-5">
        <div>
          <h3 className="text-[15px] font-[780] tracking-[-0.01em]" style={{ color: C.ink }}>Revenue &amp; Commission</h3>
          <p className="text-[11px] mt-0.5 font-[500]" style={{ color: C.muted }}>6-month trend · {fmtCompact(totalRev)} collected total</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-5 rounded-full" style={{ background: `linear-gradient(90deg,${C.purple},#a78bfa)` }} /><span className="text-[9.5px] font-[600]" style={{ color: C.muted }}>Revenue</span></span>
          <span className="inline-flex items-center gap-1.5"><span className="h-[2px] w-5 rounded-full" style={{ background: C.rose }} /><span className="text-[9.5px] font-[600]" style={{ color: C.muted }}>Commission</span></span>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="bar-rev2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.purple} stopOpacity="0.95" />
            <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.45" />
          </linearGradient>
          <filter id="glow-line2"><feGaussianBlur stdDeviation="1.8" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>

        {[0.25, 0.5, 0.75, 1].map(r => (
          <line key={r} x1={PL} x2={PL + cW} y1={PT + cH - r * cH} y2={PT + cH - r * cH}
            stroke="rgba(124,58,237,0.07)" strokeWidth="1" strokeDasharray="4 5" />
        ))}

        {bars.map((b, i) => (
          <motion.rect key={i} x={b.x - barW / 2} width={barW} rx={5} ry={5} fill="url(#bar-rev2)"
            initial={{ y: PT + cH, height: 0 }} animate={{ y: b.barTop, height: b.barH }}
            transition={{ delay: 0.1 + i * 0.07, duration: 0.55, ease: [0.16, 1, 0.3, 1] }} />
        ))}

        <motion.path d={buildLine(bars)} fill="none" stroke={C.rose} strokeWidth="2.2" strokeLinecap="round" filter="url(#glow-line2)"
          initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }}
          transition={{ delay: 0.55, duration: 0.85, ease: [0.16, 1, 0.3, 1] }} />
        {bars.map((b, i) => (
          <circle key={i} cx={b.x} cy={b.lineY} r={3} fill={C.rose} stroke="#fff" strokeWidth="1.5" />
        ))}

        {bars.map((b, i) => (
          <text key={i} x={b.x} y={H - 2} textAnchor="middle" fill={C.muted} fontSize="9" fontWeight="600">{b.label}</text>
        ))}
      </svg>

      <div className="flex flex-wrap gap-2.5 mt-4 pt-4" style={{ borderTop: '1px solid rgba(124,58,237,0.08)' }}>
        {[
          { label: '6M Revenue', value: fmtCompact(totalRev), color: C.purple, bg: 'rgba(124,58,237,0.07)' },
          { label: '6M Commission', value: fmtCompact(totalComm), color: C.rose, bg: 'rgba(225,29,72,0.07)' },
          { label: '6M Net', value: fmtCompact(totalRev - totalComm), color: C.emerald, bg: 'rgba(16,185,129,0.07)' },
        ].map(s => (
          <div key={s.label} className="flex-1 min-w-[90px] rounded-[13px] p-3" style={{ background: s.bg }}>
            <p className="text-[8px] font-[700] uppercase tracking-[0.1em] mb-0.5" style={{ color: `${s.color}aa` }}>{s.label}</p>
            <p className="text-[14px] font-[850] tracking-[-0.02em]" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>
    </Glass>
  );
}

// ─── ForecastPanel (Section 4 — Revenue Intelligence) ──────────────────────────
function ForecastPanel({ d }: { d: DashData }) {
  const revVals = d.revenueTrend.map(x => Number(x.revenue));
  const projected = forecastNext(revVals);
  const last = revVals[revVals.length - 1] ?? 0;
  const delta = projected !== null && last > 0 ? ((projected - last) / last) * 100 : null;
  const avgPerClient = d.active_pt_clients > 0 ? d.total_monthly_pt_revenue / d.active_pt_clients : 0;

  const tiles = [
    { label: 'This Month', value: fmtCompact(d.total_monthly_pt_revenue), color: C.blue, icon: <Wallet size={13} /> },
    { label: 'Projected Next', value: projected !== null ? fmtCompact(projected) : '—', color: C.purple, icon: <TrendingUp size={13} />, badge: delta },
    { label: 'Avg / Client', value: fmtCompact(avgPerClient), color: C.emerald, icon: <Users size={13} /> },
    { label: '6M Collected', value: fmtCompact(revVals.reduce((s, v) => s + v, 0)), color: C.amber, icon: <Activity size={13} /> },
  ];

  return (
    <Glass className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[15px] font-[780] tracking-[-0.01em]" style={{ color: C.ink }}>Revenue Intelligence</h3>
          <p className="text-[11px] mt-0.5 font-[500]" style={{ color: C.muted }}>Linear projection from your 6-month trend</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[9px] font-[700] uppercase tracking-[0.08em]"
          style={{ background: 'rgba(124,58,237,0.1)', color: C.purple }}>
          <Sparkles size={10} /> Forecast
        </span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tiles.map((t, i) => (
          <motion.div key={t.label}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.4 }}
            className="rounded-[16px] p-3.5" style={{ background: `${t.color}0c`, border: `1px solid ${t.color}1f` }}>
            <div className="flex items-center justify-between mb-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-[9px] text-white" style={{ background: t.color }}>{t.icon}</span>
              {t.badge != null && <TrendBadge pct={t.badge} />}
            </div>
            <p className="text-[8.5px] font-[700] uppercase tracking-[0.09em]" style={{ color: `${t.color}aa` }}>{t.label}</p>
            <p className="text-[16px] font-[850] tracking-[-0.02em] mt-0.5" style={{ color: t.color }}>{t.value}</p>
          </motion.div>
        ))}
      </div>
      <p className="mt-3 text-[9.5px] font-[450] leading-relaxed" style={{ color: C.muted }}>
        Projection is a least-squares estimate of next month&apos;s revenue based on recent payments — directional guidance, not a guarantee.
      </p>
    </Glass>
  );
}

// ─── AICopilot (Section 5 — AI Insights) ───────────────────────────────────────
type Insight = { tone: 'risk' | 'good' | 'tip'; icon: React.ReactNode; title: string; body: string; href: string };

function buildInsights(d: DashData): Insight[] {
  const out: Insight[] = [];
  const h = healthScore(d);
  const sortedTrainers = [...d.trainers].sort((a, b) => b.monthly_revenue - a.monthly_revenue);

  if (d.clients_with_balance > 0 && d.total_outstanding > 0) {
    out.push({
      tone: 'risk', icon: <Wallet size={14} />,
      title: `${fmtCompact(d.total_outstanding)} outstanding`,
      body: `${d.clients_with_balance} client${d.clients_with_balance > 1 ? 's' : ''} carrying a balance. Collection rate is ${(h.collection * 100).toFixed(0)}% — follow up to protect cash flow.`,
      href: '/pt-os/balance-sheet',
    });
  }
  if (d.expired_clients > 0) {
    out.push({
      tone: 'risk', icon: <ShieldCheck size={14} />,
      title: `${d.expired_clients} package${d.expired_clients > 1 ? 's' : ''} expired`,
      body: `Retention is at ${(h.retention * 100).toFixed(0)}%. Re-engaging lapsed clients is the cheapest revenue you can win this month.`,
      href: '/pt-os/clients',
    });
  }
  if (h.growthRaw !== 0) {
    const up = h.growthRaw > 0;
    out.push({
      tone: up ? 'good' : 'risk', icon: up ? <TrendingUp size={14} /> : <ArrowDownRight size={14} />,
      title: `Revenue ${up ? 'up' : 'down'} ${Math.abs(h.growthRaw).toFixed(0)}% MoM`,
      body: up
        ? 'Momentum is building. Lock it in by converting active clients into longer packages.'
        : 'Month-over-month revenue dipped. Review renewals due and trainer pipelines.',
      href: '/pt-os/reports',
    });
  }
  if (sortedTrainers[0] && sortedTrainers[0].monthly_revenue > 0) {
    const t = sortedTrainers[0];
    out.push({
      tone: 'good', icon: <Crown size={14} />,
      title: `${t.name} is your top earner`,
      body: `${fmtCompact(t.monthly_revenue)}/mo across ${t.active_clients} client${t.active_clients !== 1 ? 's' : ''}. Model their playbook across the team.`,
      href: '/pt-os/reports',
    });
  }
  if (d.active_pt_clients > 0) {
    const avg = d.total_monthly_pt_revenue / d.active_pt_clients;
    out.push({
      tone: 'tip', icon: <Target size={14} />,
      title: `${fmtCompact(avg)} avg revenue / client`,
      body: 'Upselling assessments, diet plans or session packs lifts this number without new acquisition cost.',
      href: '/pt-os/plans',
    });
  }
  return out.slice(0, 4);
}

function AICopilot({ d }: { d: DashData }) {
  const router = useRouter();
  const insights = useMemo(() => buildInsights(d), [d]);
  const toneStyle = {
    risk: { color: C.crimson, bg: 'rgba(193,18,31,0.07)', border: 'rgba(193,18,31,0.18)' },
    good: { color: C.emerald, bg: 'rgba(16,185,129,0.07)', border: 'rgba(16,185,129,0.18)' },
    tip:  { color: C.blue, bg: 'rgba(37,99,235,0.07)', border: 'rgba(37,99,235,0.18)' },
  };

  return (
    <Glass className="p-5 h-full flex flex-col" style={{ background: 'linear-gradient(160deg, rgba(124,58,237,0.06), rgba(255,255,255,0.72))' }}>
      <div className="flex items-center gap-2.5 mb-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-[12px] text-white"
          style={{ background: `linear-gradient(135deg, ${C.purple}, ${C.blue})`, boxShadow: `0 6px 16px ${C.purple}45` }}>
          <Sparkles size={16} />
        </span>
        <div>
          <h3 className="text-[15px] font-[780] tracking-[-0.01em]" style={{ color: C.ink }}>AI Copilot</h3>
          <p className="text-[10.5px] font-[500]" style={{ color: C.muted }}>Insights from your live numbers</p>
        </div>
      </div>

      <div className="space-y-2.5 flex-1">
        {insights.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <ShieldCheck size={26} style={{ color: C.emerald }} />
            <p className="mt-2 text-[12px] font-[600]" style={{ color: C.ink }}>All clear</p>
            <p className="text-[10.5px]" style={{ color: C.muted }}>No risks detected in your current data.</p>
          </div>
        ) : insights.map((ins, i) => {
          const t = toneStyle[ins.tone];
          return (
            <motion.button key={i}
              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              onClick={() => router.push(ins.href)}
              className="w-full text-left rounded-[15px] p-3.5 transition hover:scale-[1.015]"
              style={{ background: t.bg, border: `1px solid ${t.border}` }}>
              <div className="flex items-start gap-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] text-white" style={{ background: t.color }}>{ins.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-[740] leading-tight" style={{ color: C.ink }}>{ins.title}</p>
                  <p className="text-[10.5px] font-[450] leading-snug mt-0.5" style={{ color: C.muted }}>{ins.body}</p>
                </div>
                <ChevronRight size={14} style={{ color: t.color, flexShrink: 0 }} />
              </div>
            </motion.button>
          );
        })}
      </div>
    </Glass>
  );
}

// ─── TrainerLeaderboard (Section 6 — Performance Board) ─────────────────────────
function TrainerLeaderboard({ trainers, onRefetch, loading }: {
  trainers: DashData['trainers']; onRefetch: () => void; loading: boolean;
}) {
  const sorted = useMemo(() => [...(trainers ?? [])].sort((a, b) => b.monthly_revenue - a.monthly_revenue), [trainers]);
  const topRevenue = sorted[0]?.monthly_revenue ?? 1;

  return (
    <Glass className="p-5 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-[10px] text-white" style={{ background: `linear-gradient(135deg, ${C.amber}, #fbbf24)` }}><Trophy size={15} /></span>
          <div>
            <h3 className="text-[15px] font-[780] tracking-[-0.01em]" style={{ color: C.ink }}>Trainer Leaderboard</h3>
            <p className="text-[10.5px] font-[500]" style={{ color: C.muted }}>This month · by revenue</p>
          </div>
        </div>
        <button onClick={onRefetch} className="rounded-full p-1.5 transition hover:bg-purple-50" aria-label="Refresh">
          <RefreshCw size={13} style={{ color: 'rgba(124,58,237,0.5)' }} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 flex-1">
          <p className="text-[12px]" style={{ color: C.muted }}>No trainer data yet</p>
        </div>
      ) : (
        <div className="space-y-2.5 flex-1">
          {sorted.map((t, i) => {
            const color = TRAINER_COLORS[i % TRAINER_COLORS.length];
            const commPct = t.monthly_revenue > 0 ? (t.monthly_commission / t.monthly_revenue) * 100 : 0;
            const revPct = (t.monthly_revenue / topRevenue) * 100;
            const initials = t.name.split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase();
            const isTop3 = i < 3;
            return (
              <motion.div key={t.id}
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07, duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
                className="rounded-[15px] p-3.5"
                style={{ background: isTop3 ? `${color}0a` : `${color}06`, border: `1px solid ${color}1c` }}>
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-5 text-center shrink-0">
                    {isTop3 ? <span className="text-[15px]">{MEDALS[i]}</span>
                      : <span className="text-[10px] font-[760]" style={{ color: C.muted }}>#{i + 1}</span>}
                  </div>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] text-[10px] font-[820] text-white"
                    style={{ background: `linear-gradient(135deg,${color},${color}bb)`, boxShadow: `0 4px 10px ${color}30` }}>
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-[720] truncate" style={{ color: C.ink }}>{t.name}</p>
                    <p className="text-[9px] font-[500]" style={{ color: C.muted }}>
                      {t.active_clients} active client{t.active_clients !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[12px] font-[820] tracking-tight" style={{ color }}>{fmtCompact(t.monthly_revenue)}</p>
                    <p className="text-[9px] font-[640]" style={{ color: C.rose }}>{fmtCompact(t.monthly_commission)} comm.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: `${color}15` }}>
                    <motion.div className="h-full rounded-full" style={{ background: `linear-gradient(90deg,${color},${color}88)` }}
                      initial={{ width: 0 }} animate={{ width: `${revPct}%` }}
                      transition={{ delay: 0.3 + i * 0.07, duration: 0.55, ease: [0.16, 1, 0.3, 1] }} />
                  </div>
                  <span className="text-[8.5px] font-[650] shrink-0" style={{ color: C.muted }}>{commPct.toFixed(0)}% comm</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </Glass>
  );
}

// ─── TodayOps (Section 8 — Today's Sessions) ───────────────────────────────────
const STATUS_META: Record<SessionStatus, { label: string; color: string; icon: React.ReactNode }> = {
  scheduled:  { label: 'Scheduled',  color: C.blue,    icon: <Clock size={11} />          },
  completed:  { label: 'Completed',  color: C.emerald, icon: <CheckCircle2 size={11} />   },
  cancelled:  { label: 'Cancelled',  color: C.muted,   icon: <XCircle size={11} />        },
  no_show:    { label: 'No Show',    color: C.amber,   icon: <AlertCircle size={11} />    },
};

function fmt12(t: string | null) {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return t;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 || 12;
  return `${hh}:${String(m).padStart(2, '0')} ${suffix}`;
}

function TodayOps({ ops, loading }: { ops: OpsData | null | undefined; loading: boolean }) {
  const router = useRouter();
  const sessions = ops?.today_sessions ?? [];
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });

  return (
    <Glass className="p-5 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-[12px] text-white shrink-0"
            style={{ background: `linear-gradient(135deg, ${C.blue}, ${C.cyan})`, boxShadow: `0 6px 14px ${C.blue}40` }}>
            <CalendarClock size={15} />
          </span>
          <div>
            <h3 className="text-[15px] font-[780] tracking-[-0.01em]" style={{ color: C.ink }}>Today&apos;s Sessions</h3>
            <p className="text-[10.5px] font-[500]" style={{ color: C.muted }}>{today}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {sessions.length > 0 && (
            <span className="rounded-full px-2.5 py-0.5 text-[10px] font-[700]"
              style={{ background: `${C.blue}15`, color: C.blue }}>{sessions.length}</span>
          )}
          <button onClick={() => router.push('/pt-os/sessions')}
            className="rounded-full px-3 py-1.5 text-[10.5px] font-[650] transition hover:scale-[1.03]"
            style={{ background: `${C.blue}12`, color: C.blue }}>
            View all
          </button>
        </div>
      </div>

      {loading && !ops && (
        <div className="space-y-2.5 flex-1">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-[14px] p-3 flex items-center gap-3" style={{ background: 'rgba(15,23,42,0.03)' }}>
              <Skel w="w-9" h="h-9" r="rounded-full" /><div className="flex-1 space-y-1.5"><Skel w="w-32" h="h-3" /><Skel w="w-20" h="h-2.5" /></div>
            </div>
          ))}
        </div>
      )}

      {!loading && sessions.length === 0 && (
        <div className="flex flex-col items-center justify-center flex-1 py-8 text-center">
          <CalendarClock size={28} style={{ color: `${C.blue}55` }} />
          <p className="mt-2 text-[12.5px] font-[640]" style={{ color: C.ink }}>No sessions today</p>
          <p className="text-[10.5px] mt-0.5" style={{ color: C.muted }}>Schedule one to get started</p>
          <button onClick={() => router.push('/pt-os/schedule-session')}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[10.5px] font-[680] transition hover:scale-[1.03]"
            style={{ background: `${C.blue}15`, color: C.blue }}>
            <CalendarPlus size={12} /> Schedule Session
          </button>
        </div>
      )}

      {sessions.length > 0 && (
        <div className="space-y-2 flex-1 overflow-y-auto" style={{ maxHeight: 340 }}>
          {sessions.map((s, i) => {
            const meta = STATUS_META[s.status] ?? STATUS_META.scheduled;
            const initials = (s.client_name ?? '?').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
            const timeStr = fmt12(s.start_time);
            return (
              <motion.div key={s.id}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05, duration: 0.35 }}
                className="flex items-center gap-3 rounded-[14px] p-3"
                style={{ background: `${meta.color}08`, border: `1px solid ${meta.color}18` }}>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[10px] font-[820] text-white"
                  style={{ background: `linear-gradient(135deg, ${meta.color}, ${meta.color}bb)` }}>
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-[720] truncate" style={{ color: C.ink }}>{s.client_name ?? 'Unknown'}</p>
                  <p className="text-[9.5px] font-[500]" style={{ color: C.muted }}>
                    {s.title} {s.trainer_name ? `· ${s.trainer_name}` : ''}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {timeStr && <span className="text-[10px] font-[700] tabular-nums" style={{ color: C.ink }}>{timeStr}</span>}
                  <span className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-[700]"
                    style={{ background: `${meta.color}15`, color: meta.color }}>
                    {meta.icon}{meta.label}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </Glass>
  );
}

// ─── RenewalsDue (Section 9 — Renewals Due) ────────────────────────────────────
function RenewalsDue({ ops, loading }: { ops: OpsData | null | undefined; loading: boolean }) {
  const router = useRouter();
  const renewals = ops?.renewals_due ?? [];

  return (
    <Glass className="p-5 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-[12px] text-white shrink-0"
            style={{ background: `linear-gradient(135deg, ${C.amber}, #fbbf24)`, boxShadow: `0 6px 14px ${C.amber}40` }}>
            <CalendarClock size={15} />
          </span>
          <div>
            <h3 className="text-[15px] font-[780] tracking-[-0.01em]" style={{ color: C.ink }}>Renewals Due</h3>
            <p className="text-[10.5px] font-[500]" style={{ color: C.muted }}>Next 7 days</p>
          </div>
        </div>
        {renewals.length > 0 && (
          <span className="rounded-full px-2.5 py-0.5 text-[10px] font-[700]"
            style={{ background: `${C.amber}15`, color: C.amber }}>{renewals.length}</span>
        )}
      </div>

      {loading && !ops && (
        <div className="space-y-2.5 flex-1">
          {[1, 2, 3].map(i => <div key={i} className="rounded-[14px] p-3" style={{ background: 'rgba(15,23,42,0.03)' }}><Skel h="h-3" w="w-28" /></div>)}
        </div>
      )}

      {!loading && renewals.length === 0 && (
        <div className="flex flex-col items-center justify-center flex-1 py-8 text-center">
          <CheckCircle2 size={28} style={{ color: `${C.emerald}88` }} />
          <p className="mt-2 text-[12.5px] font-[640]" style={{ color: C.ink }}>No renewals this week</p>
          <p className="text-[10.5px] mt-0.5" style={{ color: C.muted }}>All clients are well within their packages</p>
        </div>
      )}

      {renewals.length > 0 && (
        <div className="space-y-2 flex-1 overflow-y-auto" style={{ maxHeight: 340 }}>
          {renewals.map((r, i) => {
            const urgent = r.days_left <= 2;
            const color = urgent ? C.crimson : r.days_left <= 5 ? C.amber : C.blue;
            return (
              <motion.div key={r.id}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05, duration: 0.35 }}
                onClick={() => router.push(`/pt-os/clients/${r.id}`)}
                className="flex items-center gap-3 rounded-[14px] p-3 cursor-pointer transition hover:scale-[1.015]"
                style={{ background: `${color}08`, border: `1px solid ${color}1f` }}>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] text-[10px] font-[820] text-white"
                  style={{ background: `linear-gradient(135deg, ${color}, ${color}bb)` }}>
                  {(r.name ?? '?').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-[720] truncate" style={{ color: C.ink }}>{r.name}</p>
                  <p className="text-[9.5px] font-[500]" style={{ color: C.muted }}>
                    {r.trainer_name ?? '—'} · {r.package_type ?? 'PT Package'}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-[11px] font-[800] tabular-nums" style={{ color }}>
                    {r.days_left === 0 ? 'Today' : `${r.days_left}d left`}
                  </span>
                  {r.balance_amount > 0 && (
                    <span className="text-[9px] font-[640]" style={{ color: C.rose }}>
                      {fmtCompact(r.balance_amount)} due
                    </span>
                  )}
                </div>
                <ChevronRight size={13} style={{ color, flexShrink: 0 }} />
              </motion.div>
            );
          })}
        </div>
      )}
    </Glass>
  );
}

// ─── TopDues (Section 9 — Outstanding Balances) ────────────────────────────────
function TopDues({ ops, loading }: { ops: OpsData | null | undefined; loading: boolean }) {
  const router = useRouter();
  const dues = ops?.top_dues ?? [];

  return (
    <Glass className="p-5 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-[12px] text-white shrink-0"
            style={{ background: `linear-gradient(135deg, ${C.rose}, ${C.crimson})`, boxShadow: `0 6px 14px ${C.rose}40` }}>
            <Receipt size={15} />
          </span>
          <div>
            <h3 className="text-[15px] font-[780] tracking-[-0.01em]" style={{ color: C.ink }}>Top Outstanding</h3>
            <p className="text-[10.5px] font-[500]" style={{ color: C.muted }}>Clients with highest balance</p>
          </div>
        </div>
        <button onClick={() => router.push('/pt-os/balance-sheet')}
          className="rounded-full px-3 py-1.5 text-[10.5px] font-[650] transition hover:scale-[1.03]"
          style={{ background: `${C.rose}12`, color: C.rose }}>
          View all
        </button>
      </div>

      {loading && !ops && (
        <div className="space-y-2.5 flex-1">{[1, 2, 3].map(i => <div key={i} className="rounded-[14px] p-3" style={{ background: 'rgba(15,23,42,0.03)' }}><Skel h="h-3" w="w-28" /></div>)}</div>
      )}

      {!loading && dues.length === 0 && (
        <div className="flex flex-col items-center justify-center flex-1 py-8 text-center">
          <CheckCircle2 size={28} style={{ color: `${C.emerald}88` }} />
          <p className="mt-2 text-[12.5px] font-[640]" style={{ color: C.ink }}>No outstanding balances</p>
          <p className="text-[10.5px] mt-0.5" style={{ color: C.muted }}>All accounts are settled</p>
        </div>
      )}

      {dues.length > 0 && (
        <div className="space-y-2 flex-1">
          {dues.map((due, i) => {
            const color = due.due_status === 'overdue' ? C.crimson : C.rose;
            return (
              <motion.div key={due.id}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05, duration: 0.35 }}
                onClick={() => router.push(`/pt-os/clients/${due.id}`)}
                className="flex items-center gap-3 rounded-[14px] p-3 cursor-pointer transition hover:scale-[1.015]"
                style={{ background: `${color}08`, border: `1px solid ${color}1f` }}>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-[720] truncate" style={{ color: C.ink }}>{due.name}</p>
                  <p className="text-[9.5px] font-[500]" style={{ color: C.muted }}>
                    {due.trainer_name ?? '—'}
                    {due.due_status === 'overdue' ? ' · Overdue' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {due.mobile && (
                    <a href={`tel:${due.mobile}`} onClick={e => e.stopPropagation()}
                      className="flex h-7 w-7 items-center justify-center rounded-full transition hover:scale-110"
                      style={{ background: `${C.emerald}15` }}>
                      <PhoneCall size={11} style={{ color: C.emerald }} />
                    </a>
                  )}
                  <span className="text-[12.5px] font-[820] tabular-nums" style={{ color }}>{fmtCompact(due.balance_amount)}</span>
                  <ChevronRight size={13} style={{ color, flexShrink: 0 }} />
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </Glass>
  );
}

// ─── SessionActivity (Section 10 — Session Stats) ──────────────────────────────
function SessionActivity({ ops, loading }: { ops: OpsData | null | undefined; loading: boolean }) {
  const stats = ops?.session_stats;
  const trainerSessions = ops?.trainer_sessions ?? [];
  const completionRate = stats && stats.this_month_total > 0
    ? (stats.this_month_completed / stats.this_month_total) * 100 : null;
  const momDelta = stats && stats.last_month_completed > 0
    ? ((stats.this_month_completed - stats.last_month_completed) / stats.last_month_completed) * 100 : null;
  const maxCompleted = Math.max(...trainerSessions.map(t => t.completed), 1);

  return (
    <Glass className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-[12px] text-white shrink-0"
            style={{ background: `linear-gradient(135deg, ${C.emerald}, #34d399)`, boxShadow: `0 6px 14px ${C.emerald}40` }}>
            <Activity size={15} />
          </span>
          <div>
            <h3 className="text-[15px] font-[780] tracking-[-0.01em]" style={{ color: C.ink }}>Session Activity</h3>
            <p className="text-[10.5px] font-[500]" style={{ color: C.muted }}>This month&apos;s training stats</p>
          </div>
        </div>
        {momDelta !== null && <TrendBadge pct={momDelta} />}
      </div>

      {loading && !ops && <div className="space-y-2">{[1,2,3].map(i=><Skel key={i} h="h-10" r="rounded-[12px]" />)}</div>}

      {stats && (
        <>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: 'Total', value: stats.this_month_total, color: C.blue },
              { label: 'Done', value: stats.this_month_completed, color: C.emerald },
              { label: 'Last mo.', value: stats.last_month_completed, color: C.muted.split(',')[0] || C.purple },
            ].map(t => (
              <div key={t.label} className="rounded-[14px] p-3" style={{ background: `${t.color}0d` }}>
                <p className="text-[8.5px] font-[700] uppercase tracking-[0.09em] mb-0.5" style={{ color: `${t.color}aa` }}>{t.label}</p>
                <p className="text-[20px] font-[860] tracking-[-0.02em]" style={{ color: t.color }}>{t.value}</p>
              </div>
            ))}
          </div>

          {completionRate !== null && (
            <div className="mb-4">
              <div className="flex justify-between mb-1">
                <span className="text-[9.5px] font-[650]" style={{ color: C.muted }}>Completion rate</span>
                <span className="text-[9.5px] font-[750]" style={{ color: C.emerald }}>{completionRate.toFixed(0)}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: `${C.emerald}18` }}>
                <motion.div className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${C.emerald}, #34d399)` }}
                  initial={{ width: 0 }} animate={{ width: `${completionRate}%` }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} />
              </div>
            </div>
          )}

          {trainerSessions.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-[700] uppercase tracking-[0.09em]" style={{ color: C.muted }}>By Trainer</p>
              {trainerSessions.map((t, i) => {
                const color = TRAINER_COLORS[i % TRAINER_COLORS.length];
                const pct = (t.completed / maxCompleted) * 100;
                return (
                  <motion.div key={t.trainer_name}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.06 }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-[640] truncate max-w-[140px]" style={{ color: C.ink }}>{t.trainer_name}</span>
                      <div className="flex items-center gap-2 text-[9px] font-[650] shrink-0">
                        <span style={{ color: C.emerald }}>{t.completed} done</span>
                        {t.scheduled > 0 && <span style={{ color: C.blue }}>{t.scheduled} sched</span>}
                        {t.missed > 0 && <span style={{ color: C.amber }}>{t.missed} missed</span>}
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: `${color}15` }}>
                      <motion.div className="h-full rounded-full" style={{ background: color }}
                        initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                        transition={{ delay: 0.2 + i * 0.06, duration: 0.55, ease: [0.16, 1, 0.3, 1] }} />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </>
      )}
    </Glass>
  );
}

// ─── QuickDock (Section 7 — Floating Apple-style dock, desktop) ─────────────────
function QuickDock() {
  const router = useRouter();
  const actions = [
    { label: 'Add Client',     icon: <UserPlus size={18} />,    href: '/pt-os/new-client',       color: C.purple },
    { label: 'New Package',    icon: <Dumbbell size={18} />,    href: '/pt-os/plans',            color: C.blue },
    { label: 'Record Payment', icon: <CreditCard size={18} />,  href: '/pt-os/balance-sheet',    color: C.emerald },
    { label: 'Schedule',       icon: <CalendarPlus size={18} />, href: '/pt-os/schedule-session', color: C.amber },
    { label: 'Reports',        icon: <FileBarChart size={18} />, href: '/pt-os/reports',          color: C.crimson },
    { label: 'Workouts',       icon: <Activity size={18} />,    href: '/pt-os/workout-plans',    color: C.cyan },
  ];
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="hidden lg:flex fixed bottom-6 left-1/2 -translate-x-1/2 z-40 items-end gap-1.5 rounded-[22px] px-3 py-2.5"
      style={{
        background: 'rgba(255,255,255,0.78)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.9)', boxShadow: '0 16px 48px rgba(15,23,42,0.16), inset 0 1px 0 rgba(255,255,255,0.7)',
      }}>
      {actions.map((a) => (
        <button key={a.label} onClick={() => router.push(a.href)}
          className="group relative flex flex-col items-center gap-1 rounded-[15px] px-3 py-2 transition-all duration-200 hover:-translate-y-1"
          aria-label={a.label}>
          <span className="flex h-11 w-11 items-center justify-center rounded-[14px] text-white transition-transform duration-200 group-hover:scale-110"
            style={{ background: `linear-gradient(135deg, ${a.color}, ${a.color}cc)`, boxShadow: `0 6px 16px ${a.color}45` }}>
            {a.icon}
          </span>
          <span className="text-[9px] font-[650] whitespace-nowrap" style={{ color: C.ink }}>{a.label}</span>
        </button>
      ))}
    </motion.div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function PtOsDashboard() {
  const { user } = useAuth();
  const dash = useAsync<DashData>(
    (signal) => http<{ data: DashData }>('/api/pt-os/dashboard', { signal }).then((r) => r.data),
    [],
  );
  const ops = useAsync<OpsData>(
    (signal) => http<{ data: OpsData }>('/api/pt-os/dashboard/ops', { signal }).then((r) => r.data),
    [],
  );
  const d = dash.data;
  const o = ops.data;

  const coach = (user?.name?.split(' ')[0]) || 'Coach';
  const revTrend = d?.revenueTrend?.map(x => Number(x.revenue)) ?? [];
  const incTrend = d?.revenueTrend?.map(x => Number(x.incentives)) ?? [];
  const revMoM = momPct(d?.revenueTrend, 'revenue');
  const incMoM = momPct(d?.revenueTrend, 'incentives');

  const netRevenue = (d?.total_monthly_pt_revenue ?? 0) - (d?.total_monthly_commission ?? 0);
  const commRate = d?.total_monthly_pt_revenue && d.total_monthly_pt_revenue > 0
    ? `${((d.total_monthly_commission / d.total_monthly_pt_revenue) * 100).toFixed(0)}% rate` : undefined;
  const retentionPct = d && (d.active_pt_clients + d.expired_clients) > 0
    ? (d.active_pt_clients / (d.active_pt_clients + d.expired_clients)) * 100 : null;

  return (
    <div className="relative mx-auto w-full max-w-7xl pt-2 pb-28 sm:pt-3 lg:pb-28"
      style={{ background: 'transparent' }}>
      {/* Ambient color wash */}
      <div className="pointer-events-none fixed inset-0" style={{ zIndex: 0 }}>
        <div className="absolute inset-0"
          style={{ background: `radial-gradient(ellipse 70% 50% at 15% 5%, rgba(193,18,31,0.05) 0%, transparent 55%), radial-gradient(ellipse 60% 45% at 85% 90%, rgba(124,58,237,0.05) 0%, transparent 55%)` }} />
      </div>

      <div className="relative space-y-5" style={{ zIndex: 1 }}>
        {dash.loading && !d && <SkeletonDash />}

        {d && (
          <>
            {/* Section 1 — Premium Welcome */}
            <HeroHeader d={d} coach={coach} loading={dash.loading} onRefresh={dash.refetch} />

            {/* Section 2 — Hero Analytics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <StatCard icon={<Users size={15} />} label="Active Clients" value={d.active_pt_clients.toLocaleString()}
                sub={`${d.expired_clients} expired`} color={C.purple} accent="#a78bfa" delay={0} href="/pt-os/clients" trend={revTrend} pct={revMoM} />
              <StatCard icon={<Wallet size={15} />} label="PT Revenue" value={fmtCompact(d.total_monthly_pt_revenue)}
                color={C.emerald} accent="#34d399" delay={0.05} href="/pt-os/reports" trend={revTrend} pct={revMoM} />
              <StatCard icon={<TrendingUp size={15} />} label="Net Revenue" value={fmtCompact(netRevenue)}
                color={C.blue} accent="#38bdf8" delay={0.1} href="/pt-os/reports"
                trend={revTrend.map((r, i) => Math.max(0, r - (incTrend[i] ?? 0)))} pct={revMoM} />
              <StatCard icon={<Percent size={15} />} label="Commission" value={fmtCompact(d.total_monthly_commission)}
                sub={commRate} color={C.rose} accent="#fb7185" delay={0.15} href="/pt-os/commissions" trend={incTrend} pct={incMoM} />
              <StatCard icon={<Gauge size={15} />} label="Retention" value={retentionPct !== null ? `${retentionPct.toFixed(0)}%` : '—'}
                sub={`${d.active_pt_clients} of ${d.active_pt_clients + d.expired_clients}`} color={C.cyan} accent="#22d3ee" delay={0.2} href="/pt-os/clients" />
              <StatCard icon={<Receipt size={15} />} label="Outstanding" value={fmtCompact(d.total_outstanding)}
                sub={`${d.clients_with_balance} client${d.clients_with_balance !== 1 ? 's' : ''}`} color={C.amber} accent="#fbbf24" delay={0.25} href="/pt-os/balance-sheet" />
            </div>

            {/* Section 3 — Business Performance Center */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2"><DualChart data={d.revenueTrend} /></div>
              <DonutChart net={netRevenue} commission={d.total_monthly_commission} outstanding={d.total_outstanding} />
            </div>

            {/* Section 4 — Revenue Intelligence */}
            <ForecastPanel d={d} />

            {/* Sections 5 + 6 — AI Copilot + Trainer Leaderboard */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <AICopilot d={d} />
              <TrainerLeaderboard trainers={d.trainers} onRefetch={dash.refetch} loading={dash.loading} />
            </div>

            {/* Section 8 — Today's Operations: sessions + renewals + outstanding */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <TodayOps  ops={o} loading={ops.loading} />
              <RenewalsDue ops={o} loading={ops.loading} />
              <TopDues   ops={o} loading={ops.loading} />
            </div>

            {/* Section 10 — Session Activity */}
            <SessionActivity ops={o} loading={ops.loading} />
          </>
        )}
      </div>

      {/* Section 7 — Floating Quick Action Dock (desktop) */}
      {d && <QuickDock />}
    </div>
  );
}
