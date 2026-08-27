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

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
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
  Users, Wallet, Percent,
  ChevronRight, Sparkles, ArrowUpRight, ArrowDownRight, Activity,
  UserPlus, CalendarPlus,
  ShieldCheck, Target, Gauge, Crown,
  CalendarClock, CheckCircle2,
  FileSignature, HeartPulse, Apple, PersonStanding, MessageCircle, Phone,
  AlertTriangle, Clock, IndianRupee,
  Accessibility, Dumbbell,
  PartyPopper, TrendingUp,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAsync } from '@/lib/use-async';
import { DashboardError } from '@/components/dashboards/primitives';
import { useAuth } from '@/lib/auth-context';
import FounderBadge from '@/components/FounderBadge';
import { useFounder } from '@/lib/use-founder';
import http from '@/lib/http';
import dynamic from 'next/dynamic';
import { fmtTime12 } from '@/lib/format';
import type { TodayClient, TodayRoster } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────
type DashData = {
  active_pt_clients: number;
  expired_clients: number;
  clients_with_balance: number;
  /** Owed AND past the end of the package it was owed for. */
  overdue_clients: number;
  total_monthly_pt_revenue: number;
  total_monthly_commission: number;
  total_outstanding: number;
  /** Money actually banked today, from pt_payments — not contracted amounts. */
  today_collected: number;
  today_payments: number;
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
  /**
   * Clients whose ENROLMENT says they train today.
   *
   * The third and last place the answer can live. Both lists above assume the
   * studio records its work where the dashboard already looks — an appointment
   * in pt_sessions, or a programme naming a weekday. A studio that does
   * neither was told "Nothing on today" every day, under a heading naming a
   * day its clients were training on.
   *
   * The day picker on the enrolment form is required and validated, so this is
   * filled in for every enrolled client, and until now nothing read it back
   * except the enrolment PDF.
   */
  today_enrolled?: Array<{
    client_id: string;
    client_name: string | null; client_photo: string | null;
    preferred_workout_time: string | null;
    preferred_training_days: string | null;
    trainer_name: string | null;
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

/**
 * One hue per KPI tile.
 *
 * Four metrics that are merely DIFFERENT, not good or bad, so this walks the
 * blue ramp and borrows emerald once for the money card, where "success"
 * genuinely is the meaning. Nothing here takes amber or red: those mean
 * pending and overdue everywhere else in the app, and Commission wearing the
 * overdue red told a studio their own payroll was a problem.
 *
 * Validated as a categorical set against the light surface — worst adjacent
 * pair ΔE 28.8 (deutan) and 30.5 (normal vision), well clear of the floors.
 * Retention's step falls under 3:1 against the card, which is why the hue
 * never carries meaning alone: every tile shows its label in ink beside it.
 */
/**
 * The KPI sparkline, loaded on demand.
 *
 * recharts is ~100KB and this is the home screen, which did not import it at
 * all. Loading it eagerly would put a chart library in front of every
 * trainer's first paint for the sake of four 32px charts. The placeholder is
 * the chart's exact height, so the tile does not resize when the bars arrive.
 */
const KpiSparkline = dynamic(() => import('@/components/dashboards/KpiSparkline'), {
  ssr: false,
  loading: () => <div className="h-8" />,
});

const KPI = {
  clients:    palette.blue[500],
  revenue:    palette.emerald[500],
  commission: palette.blue[700],
  retention:  palette.blue[300],
} as const;
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

function Glass({ children, className = '', style, onClick }: {
  children: React.ReactNode; className?: string; style?: React.CSSProperties;
  /** Makes the whole surface a pointer target. Deliberately NOT given a
   *  button role: these cards contain their own buttons, and a button
   *  inside a button is invalid and unreachable by keyboard. Anything
   *  offered this way is also reachable from a real control inside the
   *  card — see TodayRevenue, where the card and its Collected half go to
   *  the same place.
   *
   *  a11y-exempt: WCAG 2.1.1 requires the FUNCTION to be keyboard-operable,
   *  not this element. The inner control satisfies it. keyboard-access.test.ts
   *  reads this marker; delete it and the test will demand a role here. */
  onClick?: () => void;
}) {
  return (
    <div className={`rounded-[20px] sm:rounded-[24px] ${className}`}
      onClick={onClick}
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
 * the client on, clear them to train (consent, PAR-Q), run the general
 * fitness assessment, agree what they are training FOR, then the remaining,
 * more specific assessments.
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
  { label: 'Fitness',              icon: Gauge,          href: '/pt-os/assessment',           color: C.warning },
  { label: 'Goal',                 icon: Target,         href: '/pt-os/goals',                color: C.dangerDeep },
  { label: 'Lifestyle',            icon: HeartPulse,     href: '/pt-os/lifestyle-assessment', color: C.danger },
  { label: 'Nutrition',            icon: Apple,          href: '/pt-os/nutrition-assessment', color: C.primary },
  { label: 'Mobility',             icon: PersonStanding, href: '/pt-os/mobility-assessment',  color: C.danger },
  { label: 'Posture',              icon: Accessibility,  href: '/pt-os/posture-assessment',   color: C.primary },
  { label: 'Strength',             icon: Dumbbell,       href: '/pt-os/strength-tracking',    color: C.success },
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
//
// ── What these are, as a form ─────────────────────────────────────────────
//
// Each card answers with ONE number, so each card is a stat tile. A tile is
// allowed to carry a sparkline, but only where a real series belongs to that
// metric — and only two of these have one. `revenueTrend` carries six months
// of revenue and of incentives, and nothing else on this endpoint is a
// series at all.
//
// That mattered more than it sounds. Active Clients used to render
// `trend={revTrend} pct={revMoM}` — the REVENUE sparkline, under the client
// count, with revenue's month-on-month percentage in the badge beside it. A
// studio reading "Active Clients 42 ↑12%" was being told revenue grew 12%.
// Both numbers were true and neither was about clients. Nothing in the
// rendering could give it away: a plausible chart under a plausible number.
//
// So a tile takes a series only when the series is its own, and Active
// Clients and Retention are now bare numbers. A stat tile with no chart is a
// legitimate answer; a chart of the wrong thing is not.
//
// ── Colour ────────────────────────────────────────────────────────────────
//
// The hue lives on the icon chip and the mark, never on the text. The value
// used to be set in the card's own colour, which put a 21px number at 2.5:1
// against the card on two of the five and made "Commission" read in the
// same red the app uses for overdue — commission is a cost, not a fault, and
// the status colours are reserved for status. Ink for the number, muted for
// the label, hue only where it is a mark.
//
// The four hues are stepped off the app's own ramps and validated as a
// categorical set (worst adjacent pair ΔE 28.8 deutan, 30.5 normal). They
// clear CVD separation comfortably; the two lighter ones fall under 3:1
// against the surface, which is why every one of them is always accompanied
// by its visible text label.
function StatCard({
  icon, label, value, sub, color, accent, delay = 0, href, trend, pct, format, className,
}: {
  icon: React.ReactNode; label: string; value: string; sub?: string;
  color: string; accent: string; delay?: number; href?: string;
  /** Six months of THIS metric. Omit it unless the series is genuinely this card's. */
  trend?: { label: string; value: number }[]; pct?: number | null;
  /** How the sparkline's tooltip renders a value. */
  format?: (n: number) => string;
  /** Responsive visibility, for cards that only belong on some screen sizes. */
  className?: string;
}) {
  const router = useRouter();
  const reduce = useReducedMotion() ?? false;
  return (
    <m.div
      initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: EASE }}
      whileHover={{ y: -4, boxShadow: `0 14px 32px ${color}26, inset 0 1px 0 rgba(255,255,255,0.8)` }}
      whileTap={{ scale: 0.98 }}
      onClick={() => href && router.push(href)}
      className={cn('group relative flex cursor-pointer flex-col overflow-hidden rounded-[18px] pt-3.5 sm:pt-4', className)}
      style={{
        // The wash is the card's own hue, and stronger than it was: four
        // near-white rectangles in a grid read as a spreadsheet, which is the
        // opposite of the intent. It still stops well short of a tinted panel
        // — the number has to stay the loudest thing on the card.
        background: `linear-gradient(158deg, ${color}1c 0%, ${color}0a 34%, rgba(255,255,255,0.94) 76%)`,
        border: `1px solid ${color}2b`,
        boxShadow: `0 8px 24px ${color}14, inset 0 1px 0 rgba(255,255,255,0.8)`,
        backdropFilter: 'blur(16px)',
      }}
    >
      {/* The hairline of hue along the top edge, which is where the card's
          identity lives now that the number is ink. */}
      <div className="absolute inset-x-0 top-0 h-[3px]"
        style={{ background: `linear-gradient(90deg, ${color}, ${accent})` }} />

      <div className="relative z-10 flex flex-1 flex-col px-3.5 sm:px-4">
        <div className="mb-2.5 flex items-start justify-between pt-0.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-[10px] text-white transition-transform duration-200 group-hover:scale-105 sm:h-9 sm:w-9 sm:rounded-[12px]"
            style={{
              background: `linear-gradient(135deg, ${color}, ${accent})`,
              boxShadow: `0 6px 16px ${color}55, inset 0 1px 0 rgba(255,255,255,0.35)`,
            }}>
            {icon}
          </div>
          {pct !== undefined && <TrendBadge pct={pct ?? null} />}
        </div>

        {/* mt-auto pins this block to the bottom of whatever height the grid
            row settles on, so a card with no chart is not a number floating
            in a pool of white — which is exactly how Active Clients and
            Retention were reading beside the two that had one. */}
        <div className="mt-auto pb-3">
          <p className="mb-1 text-[9px] font-[750] uppercase tracking-[0.1em] sm:text-[9.5px]" style={{ color: C.muted }}>{label}</p>
          <p className="text-[20px] font-[880] leading-none tracking-[-0.035em] tabular-nums sm:text-[23px]" style={{ color: C.ink }}>{value}</p>
          {sub && <p className="mt-1 text-[9.5px] font-[500]" style={{ color: C.muted }}>{sub}</p>}
        </div>
      </div>

      {/* Every card ends on the same 30px band, so the four of them line up
          whatever they carry. A chart where there is a series worth drawing;
          a wash of the card's hue where there is not.

          THREE POINTS IS THE FLOOR. Two months render as two half-width
          slabs — one pale, one solid — which is not a sparkline, it is a
          broken-looking pair of blocks, and that is what a new studio with
          two months of history was being shown. A shape needs three readings
          before it is a shape. */}
      {/* data-kpi-foot marks the band on BOTH branches. It is what makes
          "every card ends the same way" assertable: without it a test can
          only see the chart, and the fallback could be deleted — taking the
          grid's level bottom edge with it — while every assertion still
          passed. */}
      {trend && trend.length >= 3 ? (
        <div data-kpi-foot className="w-full">
          <KpiSparkline data={trend} color={color} metric={label} format={format} height={30} />
        </div>
      ) : (
        <div data-kpi-foot className="h-[30px] w-full"
          style={{
            background:
              `linear-gradient(180deg, transparent, ${color}12),`
              + `radial-gradient(60% 100% at 50% 100%, ${color}2e 0%, transparent 75%)`,
          }} aria-hidden />
      )}
    </m.div>
  );
}

// ─── Section 5 — Today's Revenue ───────────────────────────────────────────────
//
// This was "Revenue Intelligence": four tiles reading This Month, Projected
// Next, Avg / Client and 6M Collected, with a linear-regression forecast on the
// second one. All true, none of it answerable. You could look at it for a
// minute and still not know whether to pick up the phone.
//
// The question a studio owner actually opens the dashboard with is smaller and
// has a deadline: how much came in today, how much is still out there, and who
// do I call. So the card carries two numbers and a way to act on each.
//
// ── On what "Pending" means ────────────────────────────────────────────────
//
// Total unpaid balance across every client, not "instalments dated today".
// There is no per-day due date in this schema — a balance is simply owed — so
// a figure claiming to be "due today" would be invented. The sub-label says
// how many people it is spread across, which is what makes it actionable, and
// the overdue count is called out separately because "owes you money" and
// "owes you money and their package has already ended" are different
// conversations.
//
// ── Why the numbers count up ───────────────────────────────────────────────
//
// Not decoration: this card re-fetches while you are looking at it, and a
// figure that changes by jumping is a figure you might not notice changed.

/** Counts to `value` on mount and on every change. Respects reduced motion by
 *  landing on the number immediately. */
function CountUp({ value, format, reduce }: {
  value: number;
  format: (n: number) => string;
  reduce: boolean;
}) {
  const [shown, setShown] = useState(value);
  const fromRef = useRef(value);

  useEffect(() => {
    const from = fromRef.current;
    fromRef.current = value;
    if (reduce || from === value) { setShown(value); return; }

    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min((now - t0) / 650, 1);
      // easeOutCubic: quick to nearly-there, then settles. A linear ramp on a
      // money figure reads like a slot machine.
      const e = 1 - Math.pow(1 - p, 3);
      setShown(from + (value - from) * e);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, reduce]);

  return <>{format(Math.round(shown))}</>;
}

// ─── Monthly revenue target ───────────────────────────────────────────────────
//
// The month's commitment, on the dashboard rather than only on the revenue
// page. It is the one number on either screen that is a DECISION rather than a
// report — every KPI beside it describes what happened; this says what the
// studio is trying to do about it — and it was two taps away on a screen
// nobody opens mid-shift.
//
// Read-only here, on purpose. Setting a target is irreversible for the month
// (UNIQUE (organization_id, period), no update route), so it keeps its
// confirmation flow on /insights/revenue where there is room to explain the
// lock. This card shows the state and links there; it never offers the form.
//
// Same endpoint as MonthlyTargetHero, so the two cannot disagree.

export type RevenueTargetData = {
  period: string;
  target_amount: number | null;
  achieved: number;
  balance: number | null;
  surplus: number | null;
  pct: number | null;
  locked: boolean;
  set_by_name: string | null;
  can_set: boolean;
};

/**
 * The month's status in one phrase, coloured by whether it is earned.
 *
 * Pace-aware rather than a flat threshold: 40% of target on the 5th is fine
 * and 40% on the 28th is not, and a card that called both "behind" would be
 * ignored by the end of the first week. Exported and pure so the boundaries
 * can be asserted on data — they are invisible in a screenshot.
 */
export function targetTone(pct: number, daysLeft: number, totalDays: number): {
  ring: string; label: string; icon: 'smashed' | 'up' | 'warn';
} {
  if (pct >= 100) return { ring: C.success, label: 'Target smashed', icon: 'smashed' };
  // Share of the month already gone. A target is "on pace" if collection has
  // kept up with the calendar.
  const elapsed = totalDays > 0 ? 1 - daysLeft / totalDays : 0;
  const pace = elapsed * 100;
  if (pct >= pace) return { ring: C.success, label: 'On track', icon: 'up' };
  if (pct >= pace * 0.7) return { ring: C.warning, label: 'Slightly behind', icon: 'warn' };
  return { ring: C.danger, label: 'Behind pace', icon: 'warn' };
}

/** Days remaining in the current month, counting today. */
export function daysLeftInMonth(now = new Date()): number {
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return last - now.getDate() + 1;
}

function TargetRing({ pct, colour, size = 116 }: { pct: number; colour: string; size?: number }) {
  const reduce = useReducedMotion();
  const gradId = `target-ring-${useId().replace(/:/g, '')}`;
  const stroke = 11;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  // The STROKE clamps — a ring cannot draw past full. The NUMBER does not.
  // The revenue page's ring clamped both, so a studio that collected ₹20,000
  // against a ₹1,000 target read "100% OF TARGET" while the line underneath
  // said ₹20,000 of ₹1,000. The ring is decoration; the figure is the claim.
  const dash = (Math.max(0, Math.min(100, pct)) / 100) * circ;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {/* A soft halo behind the ring, the colour's own glow rather than a
          second decoration — the same trick the hero header's corner blobs
          use, scaled down to fit a stat instead of a whole card. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-[-14%] rounded-full"
        style={{ background: `radial-gradient(circle, ${colour}22 0%, transparent 68%)` }}
      />
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          {/* The stroke sweeps from the tile's hue into a lighter tint of
              itself, so a ring that is 100% one flat colour for its whole
              length reads as a bar bent into a circle. A two-stop gradient
              along the arc is the difference between "coloured" and "lit". */}
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colour} stopOpacity={0.75} />
            <stop offset="100%" stopColor={colour} stopOpacity={1} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="rgba(15,23,42,0.06)" strokeWidth={stroke} />
        <m.circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`url(#${gradId})`}
          strokeWidth={stroke} strokeLinecap="round" strokeDasharray={circ}
          initial={{ strokeDashoffset: reduce ? circ - dash : circ }}
          animate={{ strokeDashoffset: circ - dash }}
          transition={{ duration: reduce ? 0 : 1.1, ease: EASE }}
          style={{ filter: `drop-shadow(0 0 9px ${colour}70)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="tabular-nums font-[900] leading-none"
          style={{
            color: C.ink,
            letterSpacing: '-0.035em',
            // Steps down so 2000% fits the same ring 40% sits in, rather than
            // overflowing it or being truncated.
            fontSize: pct >= 1000 ? 19 : pct >= 100 ? 23 : 26,
          }}>
          {Math.round(pct)}%
        </span>
        <span className="mt-0.5 text-[9.5px] font-[750] uppercase tracking-[0.12em]"
          style={{ color: C.muted }}>
          of target
        </span>
      </div>
    </div>
  );
}

function MonthlyTarget() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const t = useAsync<RevenueTargetData>(
    (signal) => http<{ data: RevenueTargetData }>('/api/reports/revenue-target', { signal })
      .then((r) => r.data),
    [],
  );

  const daysLeft = daysLeftInMonth();
  const totalDays = useMemo(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth() + 1, 0).getDate();
  }, []);
  const month = useMemo(
    () => new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
    [],
  );

  const data = t.data;
  const pct = data?.pct ?? 0;
  const tone = useMemo(() => targetTone(pct, daysLeft, totalDays), [pct, daysLeft, totalDays]);

  if (t.loading) {
    return (
      <Glass className="p-4 sm:p-5">
        <div className="flex items-center gap-4">
          <Skel w="w-[104px]" h="h-[104px]" r="rounded-full" />
          <div className="flex-1 space-y-2.5">
            <Skel w="w-32" h="h-3" /><Skel w="w-40" h="h-6" /><Skel w="w-28" h="h-3" />
          </div>
        </div>
      </Glass>
    );
  }

  // A failed read is not rendered as a zeroed target. "₹0 of ₹0, behind pace"
  // is a claim about the studio's month, and this card would be making it up.
  if (t.error || !data) return null;

  // No target set yet. Still worth a card — it is the prompt to set one, and
  // for a trainer (can_set false) it explains the blank rather than hiding it.
  if (data.target_amount === null) {
    return (
      <Glass className="p-4 sm:p-5" onClick={data.can_set ? () => router.push('/insights/revenue') : undefined}
        style={data.can_set ? { cursor: 'pointer' } : undefined}>
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px]"
            style={{ background: rgba(C.primary, 0.1), color: C.primary }}>
            <Target size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-[780]" style={{ color: C.ink }}>
              No target for {month}
            </p>
            <p className="mt-0.5 text-[11px] leading-[1.5]" style={{ color: C.muted }}>
              {data.can_set
                ? `${fmtINR(data.achieved)} collected so far. Set a target to track the month against it.`
                : `${fmtINR(data.achieved)} collected so far. An admin can set this month's target.`}
            </p>
          </div>
          {data.can_set && <ChevronRight size={16} style={{ color: C.muted }} />}
        </div>
      </Glass>
    );
  }

  const surplus = data.surplus ?? 0;
  const balance = data.balance ?? 0;
  const beat = pct >= 100;

  return (
    <Glass
      className="relative overflow-hidden p-4 sm:p-6"
      onClick={() => router.push('/insights/revenue')}
      style={{
        cursor: 'pointer',
        // The card takes the month's own colour. Ahead is green, behind is
        // amber, badly behind is red — so the state is legible from across a
        // room, before a single word has been read.
        background: `linear-gradient(150deg, ${rgba(tone.ring, 0.16)} 0%, var(--bg-card) 58%)`,
        border: `1px solid ${rgba(tone.ring, 0.26)}`,
        boxShadow: `0 10px 32px ${rgba(tone.ring, 0.16)}, inset 0 1px 0 rgba(255,255,255,0.6)`,
      }}
    >
      {/* The same hairline-of-hue the KPI tiles wear along their own top
          edge, so "This Month" and "Key Metrics" read as one family rather
          than two different cards that happen to sit near each other. */}
      <div className="absolute inset-x-0 top-0 h-[3px]"
        style={{ background: `linear-gradient(90deg, transparent, ${tone.ring}, transparent)` }} />
      {/* A wash of the month's own colour, bleeding off the corner behind
          the ring — decoration only, so it sits under everything and never
          competes with the figures for the eye. */}
      <div aria-hidden className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full opacity-[0.16]"
        style={{ background: `radial-gradient(circle, ${tone.ring} 0%, transparent 70%)`, filter: 'blur(30px)' }} />

      <div className="relative flex items-center gap-4 sm:gap-5">
        <TargetRing pct={pct} colour={tone.ring} />

        <div className="min-w-0 flex-1">
          {/* Four lines, down from six.
              The "Locked" chip and the status chip both went: the ring's
              colour already says how the month is going, and whether the
              target can still be edited is a fact about a form on another
              screen, not about the month. What is left is the month, what
              came in, what it was measured against, and the one figure that
              follows — over, or still to go. */}
          <p className="text-[11px] font-[750] uppercase tracking-[0.1em]" style={{ color: C.muted }}>
            {month}
          </p>

          {/* The headline is what came IN, not the percentage — a trainer
              scanning this wants the money, and the ring already carries the
              ratio. Counted up, like every other money figure here. */}
          <p className="mt-1 tabular-nums text-[28px] sm:text-[32px] font-[880] leading-none"
            style={{ color: C.ink, letterSpacing: '-0.035em' }}>
            <CountUp value={Number(data.achieved)} format={fmtCompact} reduce={!!reduce} />
          </p>
          <p className="mt-1.5 text-[11.5px]" style={{ color: C.muted }}>
            of <span className="font-[750]" style={{ color: C.ink }}>{fmtCompact(data.target_amount)}</span>
            {' · '}{daysLeft} day{daysLeft === 1 ? '' : 's'} left
          </p>

          <span className="mt-2.5 inline-flex items-center gap-1.5 rounded-full px-3 py-[5px] text-[11.5px] font-[800] tabular-nums text-white"
            style={{
              background: `linear-gradient(135deg, ${tone.ring}, ${tone.ring}bb)`,
              boxShadow: `0 4px 14px ${rgba(tone.ring, 0.45)}`,
            }}>
            {beat ? <PartyPopper size={11} /> : <TrendingUp size={11} />}
            {beat ? `${fmtCompact(surplus)} over` : `${fmtCompact(balance)} to go`}
          </span>
        </div>

        <ChevronRight size={16} className="hidden shrink-0 sm:block" style={{ color: C.muted }} />
      </div>
    </Glass>
  );
}

/**
 * One of the two money figures. A button, because both of them go somewhere:
 * collected opens the payments that made it up, pending opens the people it is
 * owed by.
 *
 * ── Why this is a bar and not a ring ──────────────────────────────────────
 *
 * These two are parts of one whole — collected and pending are today's money,
 * split. Two separate donuts is the worst available form for that: a reader
 * has to compare two arc lengths, on two different circles, in two different
 * hues, to work out a ratio that a single line answers at a glance. Arc
 * length is the hardest magnitude judgement there is; length along a common
 * baseline is the easiest.
 *
 * So each figure gets a bar on the same scale, one under the other, and the
 * card carries the split itself as a single stacked line beneath them. Same
 * numbers, same links, three lengths a reader can actually compare.
 */
function RevenueBar({
  icon, label, value, sub, color, accent, pct, onClick, reduce, delay,
}: {
  icon: React.ReactNode; label: string; value: number; sub: string;
  color: string; accent: string; pct: number; onClick: () => void; reduce: boolean; delay: number;
}) {
  const width = Math.max(0, Math.min(100, pct));
  return (
    <m.button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: EASE }}
      className="group flex flex-1 flex-col gap-2 rounded-[16px] p-3.5 text-left transition-transform active:scale-[0.985]"
      style={{
        background: `linear-gradient(150deg, ${color}16 0%, ${color}07 62%, transparent 100%)`,
        border: `1px solid ${color}26`,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.55)',
      }}
    >
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] text-white"
          style={{ background: `linear-gradient(135deg, ${color}, ${accent})`, boxShadow: `0 4px 12px ${color}40` }}>
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <span className="text-[9.5px] font-[800] uppercase tracking-[0.11em]" style={{ color: C.muted }}>
            {label}
          </span>
          {/* The number is the point of the card, so it gets the size — in ink,
              so it is readable rather than tinted to match its own bar. */}
          <p className="mt-0.5 truncate text-[19px] font-[880] leading-none tracking-[-0.03em] tabular-nums sm:text-[21px]"
            style={{ color: C.ink }}>
            <CountUp value={value} format={fmtINR} reduce={reduce} />
          </p>
        </div>
        <span className="shrink-0 text-[11px] font-[800] tabular-nums" style={{ color: C.muted }}>
          {Math.round(width)}%
        </span>
      </div>

      {/* This figure's share of the money in play today, on a track the other
          bar shares — so the two lengths are directly comparable. */}
      <div className="h-[7px] w-full overflow-hidden rounded-full" style={{ background: `${color}1f` }}>
        <m.div
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${color}, ${accent})` }}
          initial={reduce ? false : { width: 0 }}
          animate={{ width: `${width}%` }}
          transition={{ duration: reduce ? 0 : 0.85, ease: EASE, delay }}
        />
      </div>

      <p className="truncate text-[10.5px] font-[600]" style={{ color: C.muted }}>{sub}</p>
    </m.button>
  );
}

function TodayRevenue({ d, loading }: { d: DashData; loading: boolean }) {
  const router = useRouter();
  const reduce = useReducedMotion() ?? false;

  const collected = Number(d.today_collected ?? 0);
  const pending = Number(d.total_outstanding ?? 0);
  const owing = Number(d.clients_with_balance ?? 0);
  const overdue = Number(d.overdue_clients ?? 0);
  const payments = Number(d.today_payments ?? 0);

  const total = collected + pending;
  const pct = total > 0 ? (collected / total) * 100 : 0;

  return (
    // The whole card opens today's payments; the two halves override that with
    // their own destinations. A div rather than a button so the halves are not
    // buttons inside a button.
    <Glass
      className="cursor-pointer p-4 sm:p-5"
      onClick={() => router.push('/finance/collected-payments')}
    >
      {/* The header carries the card's colour, so the money below it does not
          have to. A single emerald→amber wash on the rule under the title is
          the same split the bars describe, read as one gesture. */}
      <div className="mb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] text-white"
              style={{
                background: `linear-gradient(135deg, ${palette.emerald[600]}, ${palette.emerald[400]})`,
                boxShadow: `0 5px 14px ${C.success}45`,
              }}>
              <IndianRupee size={15} />
            </span>
            <div>
              <h3 className="text-[14px] font-[780] tracking-[-0.01em] sm:text-[15px]" style={{ color: C.ink }}>
                Today&apos;s Revenue
              </h3>
              <p className="mt-0.5 text-[10.5px] font-[500]" style={{ color: C.muted }}>
                {loading ? 'Refreshing…' : `${payments} payment${payments === 1 ? '' : 's'} today`}
              </p>
            </div>
          </div>
          {overdue > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[9px] font-[750] uppercase tracking-[0.08em]"
              style={{ background: `${C.danger}14`, color: C.danger }}>
              {overdue} overdue
            </span>
          )}
        </div>
        <div className="mt-3 h-[2px] w-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${palette.emerald[500]}, ${palette.amber[400]}, transparent)` }} />
      </div>

      <div className="flex flex-col gap-2.5 sm:flex-row">
        <RevenueBar
          icon={<Wallet size={15} />} label="Collected Today" value={collected}
          pct={pct}
          sub={payments > 0 ? `across ${payments} payment${payments === 1 ? '' : 's'}` : 'nothing yet today'}
          color={C.success} accent={palette.emerald[400]} reduce={reduce} delay={0}
          onClick={() => router.push('/finance/collected-payments')}
        />
        <RevenueBar
          icon={<Clock size={15} />} label="Pending" value={pending}
          pct={total > 0 ? 100 - pct : 0}
          sub={owing > 0 ? `from ${owing} member${owing === 1 ? '' : 's'}` : 'all balances clear'}
          color={C.warning} accent={palette.amber[400]} reduce={reduce} delay={0.07}
          onClick={() => router.push('/finance/dues')}
        />
      </div>

      {/* The split itself, as one line.
          Two segments of one whole rather than two bars side by side, with a
          2px gap so the fills never touch and the boundary is a real edge
          rather than a colour change. Hidden when there is nothing at all in
          play, because an empty bar reads as 0% collected rather than as "no
          money today". */}
      {total > 0 && (
        <div className="mt-3.5">
          <div className="flex h-[9px] w-full gap-[2px] overflow-hidden rounded-full">
            <m.div
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${palette.emerald[600]}, ${palette.emerald[400]})` }}
              initial={reduce ? false : { width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: reduce ? 0 : 0.8, ease: EASE }}
            />
            <m.div
              className="h-full flex-1 rounded-full"
              style={{ background: `linear-gradient(90deg, ${palette.amber[300]}, ${palette.amber[500]})` }}
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: reduce ? 0 : 0.5, ease: EASE, delay: 0.25 }}
            />
          </div>
          {/* Direct labels rather than a legend box: two series, both named
              right here, so identity never rests on the colour alone. */}
          <div className="mt-2 flex items-center justify-between text-[10px] font-[650]" style={{ color: C.muted }}>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-[7px] w-[7px] rounded-full" style={{ background: palette.emerald[500] }} aria-hidden />
              {Math.round(pct)}% collected
            </span>
            <span className="tabular-nums">{fmtINR(total)} in play</span>
            <span className="inline-flex items-center gap-1.5">
              {Math.round(100 - pct)}% pending
              <span className="h-[7px] w-[7px] rounded-full" style={{ background: palette.amber[500] }} aria-hidden />
            </span>
          </div>
        </div>
      )}

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
  /**
   * This session has been started and not finished.
   *
   * The card cannot work this out for itself: the queue is already ordered
   * with the running session first, so a card that assumed "row one is
   * running" would label the first row LIVE on a morning where nobody has
   * started yet. Which is most mornings.
   */
  live: boolean;
};

/**
 * Everything still to do today, in the order the day happens.
 *
 * Exported and pure because the rules in it are the ones that are easy to get
 * quietly wrong and impossible to see in a screenshot: a completed session
 * that stays in the list, an out-of-order queue, a cap that counts the wrong
 * rows. Testing them through the rendered dashboard would mean mocking half
 * the app to assert on data.
 *
 * ── Now, then next ────────────────────────────────────────────────────────
 *
 * Two rows are visible, and they answer two different questions: who is on
 * the floor right now, and who walks in after them. So a session that has
 * been STARTED comes first, whatever the clock says — a 07:00 client still
 * training at 07:40 is the one the trainer is standing in front of, and the
 * 07:30 client who has not arrived is not.
 *
 * That is the only reordering this does, and it is a STABLE partition: within
 * the running rows and within the rest, the server's order is untouched. The
 * roster arrives ordered — earliest first, untimed after, rest days last —
 * and a second opinion about the clock here would put this card and the full
 * list at /pt-os/today into disagreement about who is next.
 *
 * Finishing a workout sets the session to completed, which drops it out
 * entirely; whoever was second becomes first, and the queue closes up behind
 * them without anything else having to happen.
 */
export function buildTodayQueue(roster: TodayClient[]): TodayRow[] {
  const running = (c: TodayClient) => c.session_status === 'in_progress';
  const remaining = roster
    // A finished session is not "left to do". With two rows visible, one spent
    // on somebody already trained is a row wasted.
    .filter((c) => c.session_status !== 'completed')
    // A rest day is a real answer on the full list, where there is room to say
    // "nothing scheduled". It is not one of the two things left to do.
    .filter((c) => !c.is_rest_day);

  return [...remaining.filter(running), ...remaining.filter((c) => !running(c))]
    .map((c) => ({
      key: c.client_id,
      name: c.client_name,
      photo: c.client_photo,
      live: running(c),
      sub: !c.plan_name
        ? 'No programme yet'
        : c.planned_exercises > 0
          ? `${c.plan_name} · ${c.planned_exercises} exercise${c.planned_exercises === 1 ? '' : 's'}`
          : c.plan_name,
      time: c.start_time,
      // Every row goes to the same place: the full list, in this same order,
      // where each client has their own Start button.
      href: '/pt-os/today',
    }));
}

function TodaySchedule() {
  const router = useRouter();
  const reduce = useReducedMotion();

  // The SAME endpoint /pt-os/today renders, and the same order.
  //
  // This card used to merge three lists off the ops summary and sort them
  // itself. Two independent orderings of the same day is how the card and the
  // page it links to end up disagreeing about who is next — so the server
  // orders once, and both screens render what they are given. This card is
  // simply the first two rows of that list.
  const roster = useAsync<TodayRoster>(
    (signal) => http<{ data: TodayRoster }>('/api/pt-os/workout-log/today', { signal })
      .then((r) => r.data),
    [],
  );

  const clients = useMemo(() => roster.data?.clients ?? [], [roster.data?.clients]);
  const done = clients.filter((c) => c.session_status === 'completed').length;
  const queue = useMemo(() => buildTodayQueue(clients), [clients]);
  const loading = roster.loading;

  const shown = queue.slice(0, TODAY_VISIBLE);
  const hidden = queue.length - shown.length;

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'short',
  });

  return (
    <Glass className="overflow-hidden">
      {/* Header. The mark carries the card's colour so the rows below do not
          have to shout — an earlier version put a tinted band across the whole
          top and ended up competing with the hero directly above it. */}
      <div className="flex items-center gap-2.5 px-4 pt-3.5 pb-2.5 sm:px-5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[11px] text-white"
          style={{
            background: `linear-gradient(135deg, ${C.danger}, ${palette.amber[400]})`,
            boxShadow: `0 4px 12px ${C.danger}40`,
          }}>
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
        {roster.hasResolved && (
          <span className="shrink-0 rounded-full px-2 py-[3px] text-[10px] font-[780] tabular-nums"
            style={{ background: `${C.danger}10`, color: C.danger }}>
            {queue.length} left
          </span>
        )}
      </div>

      <div className="px-4 pb-3.5 sm:px-5">
        {loading && !roster.hasResolved && (
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
                /* Names all three sources now. It used to name two, which made
                   it a false statement for a studio whose clients' training
                   days are recorded on the enrolment form — it asserted
                   nobody trains today while the enrolment said otherwise. */
                : 'No booked slots, no programme day, and nobody enrolled for today.'}
            </p>
            <button onClick={() => router.push('/pt-os/schedule-session')}
              className="mt-2.5 inline-flex h-[36px] items-center gap-1.5 rounded-full px-3.5 text-[11px] font-[720] transition-transform active:scale-95"
              style={{ background: `${C.danger}10`, color: C.danger, border: `1px solid ${C.danger}20` }}>
              <CalendarPlus size={12} /> Schedule a session
            </button>
          </div>
        )}

        {shown.length > 0 && (
          <div className="space-y-2">
            {shown.map((r, i) => {
              // Two different promises, and the row has to say which it is.
              //
              // ON THE FLOOR is the session that has been started and not
              // finished — the person the trainer is standing in front of.
              // NEXT is the first one that has not, whether that is row one on
              // a morning nobody has begun, or row two behind a live session.
              //
              // The queue is already ordered so this is a matter of reading
              // `live` rather than counting rows: labelling by index alone
              // would put NEXT on a client who is mid-set.
              const nextUp = !r.live && !shown.slice(0, i).some((p) => !p.live);
              const accent = r.live ? C.success : nextUp ? C.primary : C.muted;
              return (
                <m.button
                  key={r.key}
                  type="button"
                  onClick={() => router.push(r.href)}
                  initial={reduce ? false : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: reduce ? 0 : i * 0.05, duration: 0.24, ease: EASE }}
                  className="relative flex w-full items-center gap-2.5 overflow-hidden rounded-[14px] p-2.5 pl-3 text-left transition-transform active:scale-[0.99]"
                  style={{
                    background: `linear-gradient(115deg, ${accent}12 0%, ${accent}05 40%, transparent 88%)`,
                    border: `1px solid ${accent}2b`,
                    boxShadow: r.live ? `0 4px 16px ${accent}1f` : 'none',
                  }}
                >
                  {/* The one bar of solid colour. It reads down the list as a
                      spine: green while somebody is training, blue for who is
                      up next, grey for everyone waiting behind them. */}
                  <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-r-full"
                    style={{ background: accent }} aria-hidden />

                  <ClientAvatar
                    name={r.name}
                    photoUrl={r.photo}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[10px] font-[820]"
                    style={{ background: `${accent}1f`, color: C.ink }} />

                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-[12.5px] font-[730]" style={{ color: C.ink }}>
                        {r.name ?? 'Unknown client'}
                      </span>
                      {(r.live || nextUp) && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-[1px] text-[8px] font-[820] uppercase tracking-[0.08em]"
                          style={{ background: `${accent}1a`, color: accent }}>
                          {r.live && (
                            // Breathing, because a live session is the one
                            // thing on this card that is changing while it is
                            // being looked at. Held still for anybody who has
                            // asked for less motion.
                            <span
                              className={reduce ? 'h-[5px] w-[5px] rounded-full' : 'h-[5px] w-[5px] animate-pulse rounded-full'}
                              style={{ background: accent }} aria-hidden />
                          )}
                          {r.live ? 'On the floor' : 'Next'}
                        </span>
                      )}
                    </span>
                    <span className="block truncate text-[10px] font-[540]" style={{ color: C.muted }}>
                      {/* A time when there is one; the row is a due client when
                          there is not, and inventing one would be a lie. */}
                      {r.time ? `${fmtTime12(r.time)} · ` : ''}{r.sub}
                    </span>
                  </span>

                  {/* Resume, not Start, once a log is open — pressing Start on
                      a session already running is how a trainer ends up with
                      two logs for one workout. */}
                  <span className="inline-flex h-[28px] shrink-0 items-center gap-1 rounded-full px-2.5 text-[10px] font-[800] text-white"
                    style={{
                      background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
                      boxShadow: `0 3px 9px ${accent}45`,
                    }}>
                    {r.live ? 'Resume' : 'Start'} <ChevronRight size={11} />
                  </span>
                </m.button>
              );
            })}

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
            <p className="text-[10px] font-[500]" style={{ color: C.muted }}>Workouts logged this month</p>
          </div>
        </div>
        {momDelta !== null && <TrendBadge pct={momDelta} />}
      </div>

      {loading && !ops && <div className="space-y-2">{[1,2,3].map(i=><Skel key={i} h="h-10" r="rounded-[12px]" />)}</div>}

      {stats && (
        <>
          {/* Three counts off the workout log — sessions STARTED this month,
              the subset FINISHED, and last month's finished total to read this
              month against.

              They used to come off pt_sessions, the booking diary, where
              nothing ever moves a row past 'scheduled': Done and Last month
              were counting a status no code path writes, so both read 0 next
              to a real Total however many workouts the studio ran. Finishing a
              workout sets workout_sessions.status, which is where these count
              from now.

              Number in ink, label muted, hue only on the marker beside it —
              a 20px figure set in a tint of its own colour was the least
              readable text on the card. */}
          <div className="grid grid-cols-3 gap-2 mb-3.5">
            {[
              { label: 'Total',    value: stats.this_month_total,     color: KPI.clients },
              { label: 'Done',     value: stats.this_month_completed, color: C.success },
              { label: 'Last mo.', value: stats.last_month_completed, color: KPI.retention },
            ].map(t => (
              <div key={t.label} className="rounded-[13px] p-2.5" style={{ background: `${t.color}0f` }}>
                <p className="mb-0.5 flex items-center gap-1 text-[8px] font-[700] uppercase tracking-[0.09em]" style={{ color: C.muted }}>
                  <span className="h-[6px] w-[6px] shrink-0 rounded-full" style={{ background: t.color }} aria-hidden />
                  {t.label}
                </p>
                <p className="text-[20px] font-[860] tracking-[-0.02em] tabular-nums" style={{ color: C.ink }}>{t.value}</p>
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
    // of the screen, at every desktop width. Posture and Strength, being
    // last, were simply never reachable.
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

  /**
   * Keep the numbers current without a reload.
   *
   * Today's Revenue changes while somebody is looking at it — a payment taken
   * at the front desk should appear here, and pull-to-refresh is not an answer
   * on a screen left open on a desk.
   *
   * Only while the tab is visible, and immediately on becoming visible again.
   * A background tab polling every minute is a request per minute per open tab
   * that nobody will read, and the first thing you want on returning to a tab
   * is the current figure, not the one from whenever you left.
   *
   * A minute, not seconds: the underlying figure changes when a human records
   * a payment, and no studio records them faster than that.
   */
  useEffect(() => {
    const REFRESH_MS = 60_000;
    let timer: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (timer) return;
      timer = setInterval(() => { refreshAll(); }, REFRESH_MS);
    };
    const stop = () => {
      if (timer) { clearInterval(timer); timer = null; }
    };
    const onVisibility = () => {
      if (document.hidden) { stop(); return; }
      refreshAll();
      start();
    };

    if (!document.hidden) start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => { stop(); document.removeEventListener('visibilitychange', onVisibility); };
  }, [refreshAll]);

  // The month label travels with the number now, so a hovered bar can say
  // which month it is rather than just how tall it is.
  const revTrend = d?.revenueTrend?.map(x => ({ label: x.label, value: Number(x.revenue) })) ?? [];
  const incTrend = d?.revenueTrend?.map(x => ({ label: x.label, value: Number(x.incentives) })) ?? [];
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
      <div className="relative mx-auto w-full max-w-7xl pt-1 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] lg:pb-28 space-y-3.5 sm:space-y-4"
        style={{ zIndex: 1 }}>

        {dash.loading && !d && <SkeletonDash />}

        {/* A failed read used to render NOTHING. The skeleton above is gated
            on `loading` and the content below on `d`, so an API failure left
            both false and the content area went permanently blank — no
            message, no retry, indistinguishable from a studio with no data,
            on the screen every admin lands on after login. Logged as Critical
            #3 in DASHBOARD-AUDIT.md. The trainer dashboard has had this
            branch all along; this is the same one.

            Gated on `!d` as well as `error` so a failed background refresh
            never replaces figures that are already on screen with an alarm —
            the poll runs every 60s, and a single blip should not blank a
            dashboard somebody is reading. */}
        {dash.error && !d && (
          <DashboardError onRetry={refreshAll} retrying={dash.loading} />
        )}

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
              <TodaySchedule />
            </div>

            {/* 3 — Mobile quick actions (desktop uses the dock) */}
            <MobileQuickActions />

            {/* 3 — KPI grid.
                Four cards, and four is now the whole set on every screen:
                Outstanding has gone. It was the fifth, and it was the same
                figure Today's Revenue already shows as Pending, one section
                below — with the people it is owed by, how many are overdue,
                and a link into the dues list. A tile carrying a duplicate of
                a number that is better answered further down the page is a
                tile spent saying something twice.

                Commission stays phone-and-tablet-only, so the desktop row is
                Clients / Revenue / Retention and the grid still fills. */}
            {/* 3.5 — The month's revenue target.
                Above Key Metrics because it frames them: "PT Revenue ₹95.5K"
                is a fact, and whether that is good depends entirely on what
                the studio committed to. It lived only on /insights/revenue,
                two taps into a screen nobody opens mid-shift.

                Read-only. Setting a target is irreversible for the month, so
                the form stays where there is room to explain the lock; this
                links there. */}
            <div>
              <SectionLabel>This Month</SectionLabel>
              <MonthlyTarget />
            </div>

            <div>
              <SectionLabel>Key Metrics</SectionLabel>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                {/* No sparkline and no percentage. The only series this
                    endpoint carries is revenue, and revenue is not a client
                    count — putting it here is what made this card claim
                    revenue's growth as its own. A number with nothing under
                    it is the honest render. */}
                <StatCard icon={<Users size={14} />} label="Active Clients" value={d.active_pt_clients.toLocaleString()}
                  sub={`${d.expired_clients} expired`} color={KPI.clients} accent={palette.blue[300]} delay={0} href="/pt-os/clients" />
                <StatCard icon={<Wallet size={14} />} label="PT Revenue" value={fmtCompact(d.total_monthly_pt_revenue)}
                  sub="this month" color={KPI.revenue} accent={palette.emerald[400]} delay={0.05} href="/pt-os/reports" trend={revTrend} pct={revMoM} format={fmtINR} />
                {/* Phone and tablet only. Still rendered there, so the numbers
                    stay one tap away on the devices a trainer carries around
                    the floor; the desktop row is the one being kept lean.

                    Incentives, not revenue — this is the one card whose
                    series was already its own. */}
                <StatCard icon={<Percent size={14} />} label="Commission" value={fmtCompact(d.total_monthly_commission)}
                  sub={commRate} color={KPI.commission} accent={palette.blue[400]} delay={0.10} href="/pt-os/commissions" trend={incTrend} pct={incMoM} format={fmtINR}
                  className="lg:hidden" />
                <StatCard icon={<Gauge size={14} />} label="Retention" value={retentionPct !== null ? `${retentionPct.toFixed(0)}%` : '—'}
                  sub={`${d.active_pt_clients} of ${d.active_pt_clients + d.expired_clients} still active`} color={KPI.retention} accent={palette.blue[200]} delay={0.15} href="/pt-os/clients" />
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
            {/* Array.isArray, not `?? []`: the nullish default only catches
                undefined, so anything ELSE this endpoint yields — an object,
                an error envelope, a string — passes through to
                buildCoachInsights, which calls .filter on it and takes the
                whole dashboard to its error boundary. One malformed list
                should cost this card, not the entire screen. Seen for real:
                device-check's fixture table matched `birthdays` as a client
                id and served a single client object, and every dashboard run
                in that harness rendered "Something went wrong". */}
            <AICoach d={d} ops={o}
              birthdays={Array.isArray(birthdays.data?.data) ? birthdays.data.data : []}
              studioName={studioName} />

            {/* 6 — Today's Revenue.
                Was "Revenue Intelligence": this month, a linear-regression
                projection, average per client, six-month total. All true and
                none of it answerable — you could read it for a minute and
                still not know whether to pick up the phone. This asks the
                question the day actually has: what came in, what is still out,
                who do I call. */}
            <TodayRevenue d={d} loading={dash.loading} />

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
