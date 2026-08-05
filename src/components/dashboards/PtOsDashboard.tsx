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

import { useCallback, useEffect, useMemo, useState } from 'react';
import { m, useReducedMotion } from 'framer-motion';
import ClientAvatar from '@/components/pt-os/ClientAvatar';
import { PullToRefresh } from '@/components/ui';
import { cn } from '@/components/ui/cn';
import { palette, identity, rgba } from '@/lib/palette';
import {
  buildCoachInsights, reachable, whatsappLink, telLink,
  type CoachBirthday, type Urgency,
} from '@/lib/coach-insights';
import {
  Users, TrendingUp, Wallet, Percent,
  ChevronRight, Sparkles, ArrowUpRight, ArrowDownRight, Activity,
  UserPlus, CalendarPlus, Receipt,
  ShieldCheck, Target, Gauge, Crown,
  CalendarClock, CheckCircle2,
  FileSignature, HeartPulse, Apple, PersonStanding, MessageCircle, Phone,
  AlertTriangle, Clock,
  Accessibility, Dumbbell,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAsync } from '@/lib/use-async';
import { useAuth } from '@/lib/auth-context';
import FounderBadge from '@/components/FounderBadge';
import { useFounder } from '@/lib/use-founder';
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
    /** The programme the client is on, from their active assignment. */
    plan_name: string | null; plan_id: string | null;
  }>;
  /**
   * Clients whose programme says they train today but who have no booked slot.
   *
   * Not a nice-to-have: a studio that runs off programmes rather than the
   * appointment book has an empty pt_sessions table, and a "today" panel that
   * can only say "nothing scheduled" teaches the trainer to stop looking.
   */
  today_unscheduled: Array<{
    assignment_id: string; client_id: string;
    client_name: string | null; client_photo: string | null;
    plan_id: string; plan_name: string;
    planned_exercises: number;
  }>;
  renewals_due: Array<{
    id: string; name: string; mobile: string | null;
    trainer_name: string | null; package_type: string | null;
    photo_url: string | null;
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
/** The house easing curve, already used inline throughout this file. */
const EASE = [0.16, 1, 0.3, 1] as const;

// Named for what the colour means, not what hue it is. The old keys were
// maroon/crimson/purple/rose/cyan, which stopped being useful the moment five
// of them resolved to the same blue.
const C = {
  primary:    palette.blue[500],
  success:    palette.emerald[500],
  warning:    palette.amber[500],
  danger:     palette.red[600],
  dangerDeep: palette.red[900],
  ink:        palette.gray[900],
  muted:      rgba(palette.gray[500], 0.85),
};

// Trainers are told apart, not judged — so this walks the non-semantic ramp
// rather than handing someone the "overdue" red.
const TRAINER_COLORS = identity;
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
/** Minutes since midnight, for comparing a slot against the clock. */
function minutesOf(t: string | null): number | null {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  return Number.isNaN(h) || Number.isNaN(m) ? null : h * 60 + m;
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
  const color = score >= 80 ? C.success : score >= 60 ? C.warning : C.danger;
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
      style={{ background: up ? 'rgba(16,185,129,0.12)' : 'rgba(220,38,38,0.12)', color: up ? C.success : C.danger }}>
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
  return <div className={`${w} ${h} ${r} animate-pulse`} style={{ background: 'rgba(0,103,224,0.08)' }} />;
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
              style={{ color: trend >= 0 ? '#34d399' : '#f87171' }}>
              {trend >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}{Math.abs(trend).toFixed(0)}%
            </span>
          )}
        </span>
        <span className="mt-1 text-[8px] font-[700] uppercase tracking-[0.14em] text-white/45">{label}</span>
      </div>
    </div>
  );
}

function HeroHeader({ d, coach, studioName, founderNumber, loading: _loading, onRefresh: _onRefresh }: {
  d: DashData; coach: string; studioName: string; founderNumber: number | null;
  loading: boolean; onRefresh: () => void;
}) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <m.div
      initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-[24px] sm:rounded-[30px]"
      style={{
        background:
          'radial-gradient(130% 150% at 50% -25%, #0050AD 0%, transparent 55%),' +
          'linear-gradient(158deg, #0F172A 0%, #0050AD 42%, #0F172A 72%, #0050AD 100%)',
        boxShadow:
          '0 24px 64px -14px rgba(15,23,42,0.78), 0 8px 26px rgba(0,103,224,0.22),' +
          'inset 0 1px 0 rgba(255,255,255,0.10), inset 0 0 0 1px rgba(251,191,36,0.10)',
      }}
    >
      {/* Decorative layers */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -right-14 h-60 w-60 rounded-full opacity-35"
          style={{ background: 'radial-gradient(circle, #FCD34D 0%, transparent 70%)', filter: 'blur(46px)' }} />
        <div className="absolute -bottom-20 -left-14 h-60 w-60 rounded-full opacity-25"
          style={{ background: 'radial-gradient(circle, #7fb4ff 0%, transparent 70%)', filter: 'blur(54px)' }} />
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
          style={{ background: 'radial-gradient(120% 120% at 50% 38%, transparent 52%, rgba(15,23,42,0.55) 100%)' }} />
      </div>

      {/* ── Two passes of trimming, measured off the CSS, not eyeballed ─────
          It started at ~224px on a phone and ~248px from sm up. The first pass
          took 10% out of the padding and the vertical gaps in proportion,
          leaving ~202/~226.

          A further 20% is ~41px and ~45px, and that is more than the remaining
          gaps hold — they total about 30. So the second pass could not come
          from air alone, and the choice was to squash the crest and the
          wordmark or to drop something.

          The flourish divider went: 19px of pure decoration, and the only
          thing in the stack carrying no information. Everything that says
          something — the crest, the greeting, the wordmark, the founder badge,
          the date — is still here, and the wordmark's type size is untouched.

          The rest: py 12→8 / 14→8, crest 36→32, and one step off each
          remaining gap. 41px and 45px, or 20.3% and 19.9%. */}
      <div className="relative z-10 flex flex-col items-center justify-center py-2 px-6 text-center">
        {/* Crest */}
        <div className="mb-1.5 flex h-8 w-8 items-center justify-center rounded-full"
          style={{
            background: 'radial-gradient(circle at 30% 25%, #0050AD, #0F172A)',
            border: '1px solid rgba(251,191,36,0.45)',
            boxShadow: '0 0 0 4px rgba(251,191,36,0.06), 0 6px 18px rgba(245,158,11,0.30)',
          }}>
          <Crown size={15} style={{ color: '#FCD34D' }} />
        </div>

        {/* Greeting eyebrow */}
        <p className="mb-0.5 text-[9.5px] sm:text-[10.5px] font-[700] uppercase tracking-[0.28em]"
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

        {/* Under the wordmark rather than beside it: the hero name is a
            fluid-size gradient headline, and an inline badge would ride its
            baseline differently at every breakpoint. */}
        {founderNumber != null && (
          <div className="mt-2 flex justify-center">
            <FounderBadge number={founderNumber} size="lg" />
          </div>
        )}

        <p className="mt-2 text-[10.5px] sm:text-[12px] font-[600] uppercase tracking-[0.22em]"
          style={{ color: 'rgba(255,255,255,0.46)' }}>
          {dateStr}
        </p>
      </div>

      <div className="absolute top-0 inset-x-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(251,191,36,0.5), transparent)' }} />
      <div className="absolute bottom-0 inset-x-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(251,191,36,0.7), rgba(127,180,255,0.5), transparent)' }} />
    </m.div>
  );
}

/**
 * The quick actions, in the order a trainer actually works through them: take
 * the client on, clear them to train (consent, PAR-Q), agree what they are
 * training FOR, then the assessments — general first, then the specific ones.
 * Goal Setting sits ahead of the assessments because a goal is the thing the
 * assessments are measured against.
 *
 * ONE list, rendered by both the mobile strip and the desktop dock. They were
 * two hand-maintained copies, which is precisely how they drift: adding three
 * actions to the visible mobile list and missing the desktop dock entirely is
 * an easy mistake to make and an easy one to miss in review, since only one of
 * the two is on screen at a time.
 *
 * Icons are deliberately distinct per row. On a phone this is a horizontally
 * scrolling strip under 9.5px labels, where the glyph is what gets recognised
 * at a glance — two rows sharing an icon would be a coin flip.
 *
 * `icon` is the component, not an element, so each surface can size it (the
 * strip uses 16, the dock 17).
 */
export const QUICK_ACTIONS = [
  { label: 'Add Client',           icon: UserPlus,       href: '/pt-os/new-client',           color: C.primary },
  { label: 'Consent',              icon: FileSignature,  href: '/pt-os/informed-consent',     color: C.primary },
  { label: 'PAR-Q',                icon: ShieldCheck,    href: '/pt-os/parq',                 color: C.success },
  { label: 'Goal Setting',         icon: Target,         href: '/pt-os/goals',                color: C.dangerDeep },
  { label: 'Fitness Testing',      icon: Gauge,          href: '/pt-os/assessment',           color: C.warning },
  { label: 'Lifestyle',            icon: HeartPulse,     href: '/pt-os/lifestyle-assessment', color: C.danger },
  { label: 'Nutrition Assessment', icon: Apple,          href: '/pt-os/nutrition-assessment', color: C.primary },
  { label: 'Mobility Assessment',  icon: PersonStanding, href: '/pt-os/mobility-assessment',  color: C.danger },
  { label: 'Posture Assessment',   icon: Accessibility,  href: '/pt-os/posture-assessment',   color: C.primary },
  { label: 'Strength Tracking',    icon: Dumbbell,       href: '/pt-os/strength-tracking',    color: C.success },
] as const;

// ─── Section 2 — Mobile Quick Actions (visible on mobile only) ─────────────────
function MobileQuickActions() {
  const router = useRouter();
  const actions = QUICK_ACTIONS;
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
              <a.icon size={16} />
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
  icon, label, value, sub, color, accent, delay = 0, href, trend, pct, className,
}: {
  icon: React.ReactNode; label: string; value: string; sub?: string;
  color: string; accent: string; delay?: number; href?: string;
  trend?: number[]; pct?: number | null;
  /** Responsive visibility, for cards that only belong on some screen sizes. */
  className?: string;
}) {
  const router = useRouter();
  const max = trend && trend.length > 0 ? Math.max(...trend, 1) : 1;
  return (
    <m.div
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4, scale: 1.015 }} whileTap={{ scale: 0.97 }}
      onClick={() => href && router.push(href)}
      className={cn('group relative overflow-hidden rounded-[18px] p-3.5 sm:p-4 cursor-pointer', className)}
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

// ─── Section 5 — Revenue Intelligence ──────────────────────────────────────────
function ForecastPanel({ d }: { d: DashData }) {
  const revVals = d.revenueTrend.map(x => Number(x.revenue));
  const projected = forecastNext(revVals);
  const last = revVals[revVals.length - 1] ?? 0;
  const delta = projected !== null && last > 0 ? ((projected - last) / last) * 100 : null;
  const avgPerClient = d.active_pt_clients > 0 ? d.total_monthly_pt_revenue / d.active_pt_clients : 0;

  const tiles = [
    { label: 'This Month',     value: fmtCompact(d.total_monthly_pt_revenue), color: C.primary,   icon: <Wallet size={13} /> },
    { label: 'Projected Next', value: projected !== null ? fmtCompact(projected) : '—', color: C.primary, icon: <TrendingUp size={13} />, badge: delta },
    { label: 'Avg / Client',   value: fmtCompact(avgPerClient),               color: C.success, icon: <Users size={13} /> },
    { label: '6M Collected',   value: fmtCompact(revVals.reduce((s,v)=>s+v,0)), color: C.warning, icon: <Activity size={13} /> },
  ];

  return (
    <Glass className="p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3.5">
        <div>
          <h3 className="text-[14px] sm:text-[15px] font-[780] tracking-[-0.01em]" style={{ color: C.ink }}>Revenue Intelligence</h3>
          <p className="text-[10.5px] mt-0.5 font-[500]" style={{ color: C.muted }}>Linear trend projection</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[9px] font-[700] uppercase tracking-[0.08em]"
          style={{ background: 'rgba(0,103,224,0.1)', color: C.primary }}>
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

// ─── Section 6 — AI Coach ──────────────────────────────────────────────────────
//
// This was the "AI Copilot", and it read as a wall of alerts: six aggregate
// numbers off the dashboard summary, each rendered as a tinted box with a
// sentence in it. It could say "3 packages expired" but not whose, so every
// card was a dead end that dropped you on a list page to start the search
// again. Colour was the only thing carrying urgency.
//
// It now reads the rows rather than the totals — renewals_due, top_dues and
// birthdays each carry a name and a mobile number — so an insight knows who it
// is about and can offer to message them. The prioritisation lives in
// lib/coach-insights.ts, away from the rendering, because the ordering is the
// part with judgement in it.
//
// ── One action at a time ──────────────────────────────────────────────────
//
// You cannot WhatsApp five people in one click, and a button that pretends
// otherwise is worse than one that doesn't. The Suggested Action bar works on
// the selected insight and walks its cohort one contact at a time, naming who
// is next and counting down what is left. That is honest about what a tap
// does, and it is still one tap per client.
export function AICoach({ d, ops, birthdays, studioName }: {
  d: DashData;
  ops: OpsData | null;
  birthdays: CoachBirthday[];
  studioName: string;
}) {
  const router = useRouter();
  const reduce = useReducedMotion();

  const insights = useMemo(() => buildCoachInsights({
    dash: d,
    renewals: ops?.renewals_due?.map((r) => ({
      id: r.id, name: r.name, mobile: r.mobile,
      days_left: r.days_left, balance_amount: r.balance_amount,
    })),
    dues: ops?.top_dues?.map((t) => ({
      id: t.id, name: t.name, mobile: t.mobile,
      balance_amount: t.balance_amount, due_status: t.due_status,
    })),
    unscheduled: ops?.today_unscheduled?.map((u) => ({
      client_id: u.client_id, client_name: u.client_name, plan_name: u.plan_name,
    })),
    birthdays,
    studioName,
  }), [d, ops, birthdays, studioName]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Which contact the next tap will reach. Reset whenever the cohort changes,
  // so switching insight never resumes halfway through a different list.
  const [cursor, setCursor] = useState(0);

  const selected = insights.find((i) => i.id === selectedId) ?? insights[0] ?? null;
  const targets = useMemo(() => (selected ? reachable(selected.contacts) : []), [selected]);
  const next = targets[Math.min(cursor, Math.max(targets.length - 1, 0))] ?? null;
  const remaining = Math.max(targets.length - cursor, 0);

  const pick = (id: string) => { setSelectedId(id); setCursor(0); };

  const act = (kind: 'whatsapp' | 'call') => {
    if (!selected || !next) return;
    const href = kind === 'whatsapp'
      ? whatsappLink(next, selected.message(next.name))
      : telLink(next);
    if (!href) return;
    // WhatsApp is a different origin; the dialer is a scheme handler. Both want
    // a new context so the dashboard is still here when the trainer comes back.
    window.open(href, kind === 'whatsapp' ? '_blank' : '_self', 'noopener,noreferrer');
    setCursor((c) => Math.min(c + 1, targets.length));
  };

  const TONE: Record<Urgency, { fg: string; bg: string; border: string; label: string; Icon: typeof AlertTriangle }> = {
    critical: { fg: palette.red[600],     bg: rgba(palette.red[600], 0.08),     border: rgba(palette.red[600], 0.20),     label: 'Urgent',    Icon: AlertTriangle },
    warning:  { fg: palette.amber[600],   bg: rgba(palette.amber[600], 0.10),   border: rgba(palette.amber[600], 0.22),   label: 'Soon',      Icon: Clock },
    info:     { fg: palette.blue[500],    bg: rgba(palette.blue[500], 0.08),    border: rgba(palette.blue[500], 0.20),    label: 'Nice to do', Icon: Sparkles },
  };

  const done = insights.length === 0;

  return (
    <Glass className="overflow-hidden p-4 sm:p-5"
      style={{ background: `linear-gradient(155deg, ${rgba(palette.blue[500], 0.07)}, rgba(255,255,255,0.78))` }}>
      {/* Header */}
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] text-white"
          style={{
            background: `linear-gradient(135deg, ${palette.blue[450]}, ${palette.blue[600]})`,
            boxShadow: `0 6px 18px ${rgba(palette.blue[500], 0.38)}`,
          }}>
          <Sparkles size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] sm:text-[16px] font-[800] tracking-[-0.015em]" style={{ color: C.ink }}>
            AI Coach
          </h3>
          <p className="text-[11px] font-[600]" style={{ color: C.muted }}>
            <span aria-hidden>💡</span> Today
          </p>
        </div>
        {!done && (
          <span className="shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-[800] tabular-nums"
            style={{ background: rgba(palette.blue[500], 0.10), color: palette.blue[600] }}>
            {insights.length} to review
          </span>
        )}
      </div>

      {done ? (
        <div className="flex flex-col items-center py-9 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-[15px]"
            style={{ background: rgba(palette.emerald[500], 0.12), color: palette.emerald[600] }}>
            <ShieldCheck size={22} />
          </span>
          <p className="mt-2.5 text-[13px] font-[750]" style={{ color: C.ink }}>Nothing needs you right now</p>
          <p className="mt-0.5 text-[11.5px]" style={{ color: C.muted }}>
            No expiries, dues or birthdays in the next seven days.
          </p>
        </div>
      ) : (
        <>
          {/* Insights — radiogroup, because picking one drives the action bar */}
          <div className="space-y-2" role="radiogroup" aria-label="Coaching insights">
            {insights.map((ins, i) => {
              const t = TONE[ins.urgency];
              const isSel = selected?.id === ins.id;
              return (
                <m.button
                  key={ins.id}
                  type="button"
                  role="radio"
                  aria-checked={isSel}
                  onClick={() => pick(ins.id)}
                  initial={reduce ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: reduce ? 0 : i * 0.04, duration: 0.24, ease: EASE }}
                  className="w-full rounded-[15px] p-3 text-left transition-[background,border-color,box-shadow] duration-200 active:scale-[0.99]"
                  style={{
                    background: isSel ? t.bg : 'rgba(255,255,255,0.55)',
                    border: `1px solid ${isSel ? t.border : 'rgba(15,23,42,0.07)'}`,
                    boxShadow: isSel ? `0 6px 18px ${rgba(palette.gray[900], 0.06)}` : 'none',
                  }}>
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] text-white"
                      style={{ background: t.fg }}>
                      <t.Icon size={15} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-[12.5px] font-[760] leading-tight" style={{ color: C.ink }}>
                          {ins.title}
                        </p>
                        {/* Urgency in words as well as colour — colour alone is
                            not a signal for everyone. */}
                        <span className="shrink-0 rounded-full px-1.5 py-[1px] text-[9px] font-[800] uppercase tracking-wide"
                          style={{ background: t.bg, color: t.fg }}>
                          {t.label}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[10.5px] font-[500] leading-snug" style={{ color: C.muted }}>
                        {ins.detail}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-[800] tabular-nums"
                      style={{ background: t.bg, color: t.fg }} aria-label={`${ins.count} affected`}>
                      {ins.count}
                    </span>
                  </div>
                </m.button>
              );
            })}
          </div>

          {/* Suggested action */}
          {selected && (
            <m.div
              key={selected.id}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.26, ease: EASE }}
              className="mt-4 rounded-[16px] p-3"
              style={{
                background: 'rgba(255,255,255,0.62)',
                border: '1px solid rgba(15,23,42,0.07)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
              }}>
              <div className="mb-2.5 flex items-baseline justify-between gap-2">
                <p className="text-[10px] font-[800] uppercase tracking-[0.12em]" style={{ color: C.muted }}>
                  Suggested action
                </p>
                {targets.length > 0 && (
                  <span className="text-[10.5px] font-[650] tabular-nums" style={{ color: C.muted }} aria-live="polite">
                    {remaining > 0 ? `${remaining} of ${targets.length} left` : 'All contacted'}
                  </span>
                )}
              </div>

              {targets.length === 0 ? (
                <>
                  <p className="mb-2.5 text-[11.5px] leading-snug" style={{ color: C.muted }}>
                    No mobile number on file for these clients, so there is nobody to message from here.
                  </p>
                  <button type="button" onClick={() => router.push(selected.href)}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-[12px] text-[12.5px] font-[750] transition active:scale-[0.98]"
                    style={{ background: rgba(palette.blue[500], 0.10), color: palette.blue[600] }}>
                    Open the list <ChevronRight size={14} />
                  </button>
                </>
              ) : (
                <>
                  <p className="mb-2.5 truncate text-[11.5px] font-[600]" style={{ color: C.ink }}>
                    {remaining > 0 ? <>Next: <span style={{ color: palette.blue[600] }}>{next?.name}</span></> : 'Everyone on this list has been contacted.'}
                  </p>
                  {/* h-11 = 44px: the minimum a thumb can hit reliably. */}
                  <div className="flex gap-2">
                    <button type="button" onClick={() => act('whatsapp')} disabled={remaining === 0}
                      aria-label={next ? `Send WhatsApp to ${next.name}` : 'Send WhatsApp'}
                      className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[12px] text-[12.5px] font-[780] text-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
                      style={{
                        background: `linear-gradient(135deg, ${palette.emerald[500]}, ${palette.emerald[600]})`,
                        boxShadow: remaining === 0 ? 'none' : `0 6px 16px ${rgba(palette.emerald[500], 0.34)}`,
                      }}>
                      <MessageCircle size={15} /> Send WhatsApp
                    </button>
                    <button type="button" onClick={() => act('call')} disabled={remaining === 0}
                      aria-label={next ? `Call ${next.name}` : 'Call clients'}
                      className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[12px] text-[12.5px] font-[780] text-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
                      style={{
                        background: `linear-gradient(135deg, ${palette.blue[450]}, ${palette.blue[600]})`,
                        boxShadow: remaining === 0 ? 'none' : `0 6px 16px ${rgba(palette.blue[500], 0.34)}`,
                      }}>
                      <Phone size={15} /> Call Clients
                    </button>
                  </div>
                </>
              )}
            </m.div>
          )}
        </>
      )}
    </Glass>
  );
}

// ─── Today's Schedule — the first thing under the hero ────────────────────────
//
// The question a studio owner opens the app to answer: who am I training today,
// and what are they doing. It sits directly under the hero because it is the
// only section whose answer changes what happens in the next hour — revenue and
// retention can wait until after the 7am.
//
// ── Why this is deliberately quiet ─────────────────────────────────────────
//
// It used to be the loudest thing on the page. A tinted header band, a 40px
// saturated red icon with a coloured glow, the session count set at 27px, a
// progress ring, and then "next up" rendered as a full navy gradient slab with
// its own light source — directly beneath a navy gradient hero. Two heavy dark
// cards stacked, and the eye went to the second one. The hero stopped being the
// hero.
//
// So the hierarchy is carried by position and one small label instead of by a
// second slab: flat header, no ring, no oversized count, and the next session
// marked with a chip rather than a card of its own. Nothing here out-weighs the
// thing above it.
//
// ── Two lists, one queue ───────────────────────────────────────────────────
//
// A BOOKED slot is a row in pt_sessions with a time. A DUE client is one whose
// programme prescribes today's weekday, whether or not anyone wrote it in the
// diary. They used to be rendered as two separate sections, which asked the
// reader to merge them mentally to answer "who is next".
//
// They are one queue now, in the order the day happens: booked slots by their
// start time, then the untimed ones. Nobody has said when the untimed sessions
// are, so they cannot be interleaved honestly — they go after, in roster order.
//
// Both lists are kept, because a studio that works off programmes rather than
// an appointment book has an empty pt_sessions table, and a panel that can only
// ever say "nothing scheduled" trains the reader to skip it.
//
// ── What is not shown ──────────────────────────────────────────────────────
//
// Completed sessions. This card answers "what is left", and a finished session
// is not left. Cancelled ones go too — same reasoning, and with only two rows
// visible, one of them spent on a session that is not happening is a row
// wasted. The count of finished sessions is still on the card, in small text,
// so the day's progress is not lost with them.
//
// ── Two rows ───────────────────────────────────────────────────────────────
//
// The whole day used to be listed. On a phone that pushed everything below it
// off the screen for a panel whose job is "what next". Two rows is what you can
// act on before looking again; the rest is one tap away and the tap is labelled
// with how many.
//
// ── Why the programme name and not the session title ──────────────────────
//
// pt_sessions.title is usually "PT Session", which tells a trainer nothing.
// What they want at 6:55 is the programme they are about to coach.

/** How many rows the card shows before deferring to the full list. */
export const TODAY_VISIBLE = 2;

/** A booked slot and a due client, reduced to the fields a row needs. */
export type TodayRow = {
  key: string;
  name: string | null;
  photo: string | null;
  sub: string;
  /** Wall-clock start, or null for a due client nobody has scheduled. */
  time: string | null;
  href: string;
};

/**
 * Everything still to do today, in the order the day happens.
 *
 * Exported and pure because the three rules in it are the ones that are easy
 * to get quietly wrong and impossible to see in a screenshot: a completed
 * session that stays in the list, an out-of-order queue, a cap that counts
 * the wrong rows. Testing them through the rendered dashboard would mean
 * mocking half the app to assert on data.
 */
export function buildTodayQueue(
  booked: OpsData['today_sessions'],
  due: OpsData['today_unscheduled'],
): TodayRow[] {
  const openSlots = booked
    // A finished session is not "left to do", and a cancelled one is not
    // happening. Neither belongs in a two-row list of what is next.
    .filter((s) => s.status !== 'completed' && s.status !== 'cancelled')
    // Untimed booked slots sort last within the booked group rather than
    // first, which is where an undefined would put them.
    .sort((a, b) => (minutesOf(a.start_time) ?? 1e9) - (minutesOf(b.start_time) ?? 1e9))
    .map((s) => ({
      key: `s-${s.id}`,
      name: s.client_name,
      photo: s.client_photo,
      sub: s.plan_name ?? s.title ?? 'No programme assigned',
      time: s.start_time,
      href: '/pt-os/sessions',
    }));

  const unbooked = due.map((c) => ({
    key: `d-${c.assignment_id}`,
    name: c.client_name,
    photo: c.client_photo,
    sub: c.plan_name
      + (c.planned_exercises > 0 ? ` · ${c.planned_exercises} exercise${c.planned_exercises === 1 ? '' : 's'}` : ''),
    time: null,
    href: '/pt-os/today',
  }));

  // Booked first, in clock order, then the ones nobody has scheduled. They
  // cannot be interleaved honestly — there is no time to interleave them on.
  return [...openSlots, ...unbooked];
}

function TodaySchedule({ ops, loading }: { ops: OpsData | null | undefined; loading: boolean }) {
  const router = useRouter();
  const reduce = useReducedMotion();
  // Memoised, not `?? []` inline: a fresh literal every render makes it a new
  // dependency every render, so the queue below would recompute on each pass
  // and never actually memoise anything.
  const booked = useMemo(() => ops?.today_sessions ?? [], [ops?.today_sessions]);
  const due = useMemo(() => ops?.today_unscheduled ?? [], [ops?.today_unscheduled]);

  const done = booked.filter((s) => s.status === 'completed').length;
  const queue = useMemo(() => buildTodayQueue(booked, due), [booked, due]);

  const shown = queue.slice(0, TODAY_VISIBLE);
  const hidden = queue.length - shown.length;

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'short',
  });

  return (
    <Glass className="overflow-hidden">
      {/* Header. Flat, on the card's own surface — the tinted band and the
          gradient icon that used to be here were what made this compete with
          the hero. */}
      <div className="flex items-center gap-2.5 px-4 pt-3.5 pb-2.5 sm:px-5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px]"
          style={{ background: `${C.danger}12`, color: C.danger }}>
          <CalendarClock size={14} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[13px] font-[800] tracking-[-0.01em]" style={{ color: C.ink }}>
            Today&apos;s Sessions
          </h3>
          <p className="text-[10px] font-[560]" style={{ color: C.muted }}>
            {today}
            {/* Finished sessions leave the list but not the card — otherwise a
                day where everything is done looks like a day with nothing on. */}
            {done > 0 && ` · ${done} done`}
          </p>
        </div>
        {!(loading && !ops) && (
          <span className="shrink-0 rounded-full px-2 py-[3px] text-[10px] font-[780] tabular-nums"
            style={{ background: `${C.danger}10`, color: C.danger }}>
            {queue.length} left
          </span>
        )}
      </div>

      <div className="px-4 pb-3.5 sm:px-5">
        {loading && !ops && (
          <div className="space-y-1.5">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center gap-2.5 rounded-[13px] p-2.5" style={{ background: 'rgba(15,23,42,0.03)' }}>
                <Skel w="w-9" h="h-9" r="rounded-full" />
                <div className="flex-1 space-y-1.5"><Skel w="w-28" h="h-3" /><Skel w="w-20" h="h-2.5" /></div>
              </div>
            ))}
          </div>
        )}

        {!loading && queue.length === 0 && (
          <div className="flex flex-col items-center py-5 text-center">
            <p className="text-[12.5px] font-[720]" style={{ color: C.ink }}>
              {done > 0 ? 'All done for today' : 'Nothing on today'}
            </p>
            <p className="mt-0.5 max-w-[34ch] text-[10.5px] leading-[1.5]" style={{ color: C.muted }}>
              {done > 0
                ? `${done} session${done === 1 ? '' : 's'} completed.`
                : "No booked slots, and no client's programme falls on today."}
            </p>
            <button onClick={() => router.push('/pt-os/schedule-session')}
              className="mt-2.5 inline-flex h-[36px] items-center gap-1.5 rounded-full px-3.5 text-[11px] font-[720] transition-transform active:scale-95"
              style={{ background: `${C.danger}10`, color: C.danger, border: `1px solid ${C.danger}20` }}>
              <CalendarPlus size={12} /> Schedule a session
            </button>
          </div>
        )}

        {shown.length > 0 && (
          <div className="space-y-1.5">
            {shown.map((r, i) => (
              <m.button
                key={r.key}
                type="button"
                onClick={() => router.push(r.href)}
                initial={reduce ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: reduce ? 0 : i * 0.05, duration: 0.24, ease: EASE }}
                className="flex w-full items-center gap-2.5 rounded-[13px] p-2.5 text-left transition-colors hover:bg-[rgba(15,23,42,0.03)]"
                style={{ border: '1px solid rgba(15,23,42,0.07)' }}
              >
                <ClientAvatar
                  name={r.name}
                  photoUrl={r.photo}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[10px] font-[820]"
                  style={{ background: 'rgba(100,116,139,0.13)', color: C.ink }} />

                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-[12.5px] font-[730]" style={{ color: C.ink }}>
                      {r.name ?? 'Unknown client'}
                    </span>
                    {/* The whole of "next up". A chip, where there used to be a
                        navy gradient card fighting the hero for attention. */}
                    {i === 0 && (
                      <span className="shrink-0 rounded-full px-1.5 py-[1px] text-[8px] font-[820] uppercase tracking-[0.08em]"
                        style={{ background: `${C.primary}14`, color: C.primary }}>
                        Next
                      </span>
                    )}
                  </span>
                  <span className="block truncate text-[10px] font-[540]" style={{ color: C.muted }}>
                    {/* A time when there is one; the row is a due client when
                        there is not, and inventing one would be a lie. */}
                    {r.time ? `${fmt12(r.time)} · ` : ''}{r.sub}
                  </span>
                </span>

                <span className="inline-flex h-[26px] shrink-0 items-center gap-1 rounded-full px-2.5 text-[10px] font-[780]"
                  style={{ background: `${C.danger}10`, color: C.danger }}>
                  Start <ChevronRight size={11} />
                </span>
              </m.button>
            ))}

            {hidden > 0 && (
              <button
                type="button"
                onClick={() => router.push('/pt-os/today')}
                className="flex w-full items-center justify-center gap-1 rounded-[12px] py-2 text-[11px] font-[700] transition-colors hover:bg-[rgba(15,23,42,0.03)]"
                style={{ color: C.muted }}
              >
                +{hidden} more today <ChevronRight size={12} />
              </button>
            )}
          </div>
        )}
      </div>
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
            style={{ background: `linear-gradient(135deg, ${C.warning}, #fbbf24)`, boxShadow: `0 5px 12px ${C.warning}40` }}>
            <CalendarClock size={14} />
          </span>
          <div>
            <h3 className="text-[14px] sm:text-[15px] font-[780] tracking-[-0.01em]" style={{ color: C.ink }}>Renewals Due</h3>
            <p className="text-[10px] font-[500]" style={{ color: C.muted }}>Next 7 days</p>
          </div>
        </div>
        {renewals.length > 0 && (
          <span className="rounded-full px-2 py-0.5 text-[10px] font-[700]"
            style={{ background: `${C.warning}18`, color: C.warning }}>{renewals.length}</span>
        )}
      </div>

      {loading && !ops && <div className="space-y-2">{[1,2,3].map(i=><div key={i} className="rounded-[13px] p-2.5" style={{ background: 'rgba(15,23,42,0.03)' }}><Skel h="h-3" w="w-28" /></div>)}</div>}

      {!loading && renewals.length === 0 && (
        <div className="flex flex-col items-center py-7 text-center">
          <CheckCircle2 size={24} style={{ color: `${C.success}88` }} />
          <p className="mt-2 text-[12px] font-[640]" style={{ color: C.ink }}>No renewals this week</p>
        </div>
      )}

      {renewals.length > 0 && (
        <div className="space-y-2" style={{ maxHeight: 280, overflowY: 'auto' }}>
          {renewals.map((r, i) => {
            const urgent = r.days_left <= 2;
            const color = urgent ? C.danger : r.days_left <= 5 ? C.warning : C.primary;
            return (
              <m.div key={r.id}
                initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => router.push(`/pt-os/clients/${r.id}`)}
                className="flex items-center gap-2.5 rounded-[13px] p-2.5 cursor-pointer transition active:scale-[0.985]"
                style={{ background: `${color}09`, border: `1px solid ${color}1f` }}>
                <ClientAvatar
                  name={r.name}
                  photoUrl={r.photo_url}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] text-[10px] font-[820] text-white"
                  style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }} />
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
                    <span className="text-[9px] font-[640]" style={{ color: C.danger }}>{fmtCompact(r.balance_amount)} due</span>
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
            style={{ background: `linear-gradient(135deg, ${C.success}, #34d399)`, boxShadow: `0 5px 12px ${C.success}40` }}>
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
              { label: 'Total',    value: stats.this_month_total,     color: C.primary },
              { label: 'Done',     value: stats.this_month_completed, color: C.success },
              { label: 'Last mo.', value: stats.last_month_completed, color: C.primary },
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
                <span className="text-[9.5px] font-[750]" style={{ color: C.success }}>{completionRate.toFixed(0)}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: `${C.success}18` }}>
                <m.div className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${C.success}, #34d399)` }}
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
                        <span style={{ color: C.success }}>{t.completed}✓</span>
                        {t.scheduled > 0 && <span style={{ color: C.primary }}>{t.scheduled}⏱</span>}
                        {t.missed > 0 && <span style={{ color: C.warning }}>{t.missed}✗</span>}
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

// ─── Desktop Quick Dock ─────────────────────────────────────────────────────────
export function QuickDock() {
  const router = useRouter();
  const actions = QUICK_ACTIONS;
  return (
    // Positioning lives on the wrapper, the animation on the child, and they
    // must not be the same element. They used to be: this was one m.div with
    // `left-1/2 -translate-x-1/2`, and framer-motion writes `transform` inline
    // on every animated element — `translateY(0px)` here — which silently
    // replaced the class's `translateX(-50%)`. The dock's left edge therefore
    // sat at exactly 50% of the viewport and its full 900px ran off the right
    // of the screen, at every desktop width. Posture Assessment and Strength
    // Tracking, being last, were simply never reachable.
    //
    // Centering on the viewport would not have been right either: the sidebar
    // is z-50 against this z-40, so the leading items would have slid under it
    // instead. The wrapper clears the sidebar the same way the topbar does
    // (lg:pl-64 xl:pl-72) and centers the dock in the space that is left.
    //
    // flex-wrap plus max-w-full is the guarantee: at widths where ten tiles
    // cannot sit on one line they form a second row rather than overflowing.
    // Nothing here is ever off-screen again, whatever gets added to
    // QUICK_ACTIONS next.
    <div className="hidden lg:flex pointer-events-none fixed inset-x-0 bottom-6 z-40 justify-center px-4 lg:pl-64 xl:pl-72">
      <m.div
        initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="pointer-events-auto flex max-w-full flex-wrap items-end justify-center gap-1 rounded-[22px] px-3 py-2.5"
        style={{
          background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.92)', boxShadow: '0 16px 48px rgba(15,23,42,0.14), inset 0 1px 0 rgba(255,255,255,0.7)',
        }}>
        {actions.map(a => (
          <button key={a.label} onClick={() => router.push(a.href)}
            className="group flex shrink-0 flex-col items-center gap-1 rounded-[14px] px-3 py-2 transition-all duration-200 hover:-translate-y-1"
            aria-label={a.label}>
            <span className="flex h-11 w-11 items-center justify-center rounded-[14px] text-white transition-transform duration-200 group-hover:scale-110"
              style={{ background: `linear-gradient(135deg, ${a.color}, ${a.color}cc)`, boxShadow: `0 5px 14px ${a.color}45` }}>
              <a.icon size={17} />
            </span>
            <span className="text-[9px] font-[650] whitespace-nowrap" style={{ color: C.ink }}>{a.label}</span>
          </button>
        ))}
      </m.div>
    </div>
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
  // Birthdays are their own read: the dashboard summary has no notion of a
  // date of birth, and the AI Coach needs the names and mobiles, not a count.
  const birthdays = useAsync<{ data: CoachBirthday[] }>(
    (signal) => http<{ data: CoachBirthday[] }>('/api/pt-os/clients/birthdays', { signal }),
    [],
  );

  // The Consent Signed KPI was the only consumer of /api/pt-os/informed-consent
  // here, so the request went with the card rather than being left to load a
  // list nothing reads. The consent screens fetch it themselves.
  const d = dash.data;
  const o = ops.data;
  const coach = user?.name?.split(' ')[0] || 'Coach';
  const studioName = user?.organization_name || 'PT Studio';
  const founderNumber = useFounder();

  const refreshAll = useCallback(async () => {
    await Promise.all([dash.refetch(), ops.refetch()]);
  }, [dash.refetch, ops.refetch]);

  const revTrend = d?.revenueTrend?.map(x => Number(x.revenue)) ?? [];
  const incTrend = d?.revenueTrend?.map(x => Number(x.incentives)) ?? [];
  const revMoM   = momPct(d?.revenueTrend, 'revenue');
  const incMoM   = momPct(d?.revenueTrend, 'incentives');

  const commRate = d?.total_monthly_pt_revenue && d.total_monthly_pt_revenue > 0
    ? `${((d.total_monthly_commission / d.total_monthly_pt_revenue) * 100).toFixed(0)}% rate` : undefined;
  const retentionPct = d && (d.active_pt_clients + d.expired_clients) > 0
    ? (d.active_pt_clients / (d.active_pt_clients + d.expired_clients)) * 100 : null;

  return (
    <>
      {/* Ambient color wash — fixed so it doesn't scroll */}
      <div className="pointer-events-none fixed inset-0" style={{ zIndex: 0 }}>
        <div className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 65% 45% at 10% 0%, rgba(185,28,28,0.05) 0%, transparent 55%), radial-gradient(ellipse 55% 40% at 90% 90%, rgba(0,103,224,0.05) 0%, transparent 55%)' }} />
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
            <HeroHeader d={d} coach={coach} studioName={studioName} founderNumber={founderNumber} loading={dash.loading} onRefresh={dash.refetch} />

            {/* 2 — Today's sessions.
                Directly under the hero, above revenue and retention: it is the
                only section whose answer changes what happens in the next hour.
                It replaces the half-width "Today" card that used to sit in the
                Operations row further down — that card showed the session's
                own title rather than the client's programme, and could only
                ever see the appointment book.

                No SectionLabel here. "TODAY" sat directly above a card whose
                own header reads "Today's Sessions / Thursday, 6 Aug" — the
                label said the word twice and cost 23px to do it. Every other
                section keeps its label, because none of them repeat their
                heading the way this one did.

                The remaining gap is inline rather than a margin class because
                the parent's space-y utility targets `> * ~ *` and outranks a
                plain mt-* on specificity; a class here would simply lose. */}
            <div style={{ marginTop: 8 }}>
              <TodaySchedule ops={o} loading={ops.loading} />
            </div>

            {/* 3 — Mobile quick actions (desktop uses the dock) */}
            <MobileQuickActions />

            {/* 3 — KPI grid: 2 cols mobile → 3 tablet → 4 desktop.
                Four rather than five on desktop because Commission is hidden
                there (lg:hidden below) and the row would otherwise sit a card
                short. Small screens still show all five. */}
            <div>
              <SectionLabel>Key Metrics</SectionLabel>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                <StatCard icon={<Users size={14} />} label="Active Clients" value={d.active_pt_clients.toLocaleString()}
                  sub={`${d.expired_clients} expired`} color={C.primary} accent="#7fb4ff" delay={0} href="/pt-os/clients" trend={revTrend} pct={revMoM} />
                <StatCard icon={<Wallet size={14} />} label="PT Revenue" value={fmtCompact(d.total_monthly_pt_revenue)}
                  color={C.success} accent="#34d399" delay={0.05} href="/pt-os/reports" trend={revTrend} pct={revMoM} />
                {/* Phone and tablet only. Still rendered there, so the numbers
                    stay one tap away on the devices a trainer carries around
                    the floor; the desktop row is the one being kept lean. */}
                <StatCard icon={<Percent size={14} />} label="Commission" value={fmtCompact(d.total_monthly_commission)}
                  sub={commRate} color={C.danger} accent="#f87171" delay={0.10} href="/pt-os/commissions" trend={incTrend} pct={incMoM}
                  className="lg:hidden" />
                <StatCard icon={<Gauge size={14} />} label="Retention" value={retentionPct !== null ? `${retentionPct.toFixed(0)}%` : '—'}
                  sub={`${d.active_pt_clients}/${d.active_pt_clients + d.expired_clients}`} color={C.primary} accent="#0067e0" delay={0.15} href="/pt-os/clients" />
                <StatCard icon={<Receipt size={14} />} label="Outstanding" value={fmtCompact(d.total_outstanding)}
                  sub={`${d.clients_with_balance} client${d.clients_with_balance !== 1 ? 's' : ''}`} color={C.warning} accent="#fbbf24" delay={0.20} href="/pt-os/balance-sheet" />
              </div>
            </div>

            {/* 5 — Renewals due.
                Was a two-column row with a "Today" card beside it. That card
                is now the full-width section under the hero, where it can show
                the programme and the clients who are due but unbooked — so
                keeping it here as well would have been the same list twice, one
                of them worse. Renewals is full width now that it is alone. */}
            <div>
              <SectionLabel>Renewals</SectionLabel>
              <RenewalsDue ops={o} loading={ops.loading} />
            </div>

            {/* 5 — AI Coach */}
            <AICoach d={d} ops={o} birthdays={birthdays.data?.data ?? []} studioName={studioName} />

            {/* 6 — Revenue forecast.
                The month-by-month revenue bar chart used to sit above this. It
                said the same thing twice: the KPI cards already carry the
                revenue figure and its sparkline, and the forecast below reads
                the same revenueTrend series. d.revenueTrend is still fetched
                and still used by both of those. */}
            <ForecastPanel d={d} />

            {/* 7 — Session activity.
                Was a two-column "Team Performance" row with a trainer
                leaderboard beside it. Three of the four studios have exactly
                one trainer, so the board ranked a list of one, and "team" was
                the wrong word for a solo studio. Full width now that it is the
                only card in the row. */}
            <div>
              <SectionLabel>Sessions</SectionLabel>
              <SessionActivity ops={o} loading={ops.loading} />
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
