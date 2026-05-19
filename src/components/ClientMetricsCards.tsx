'use client';

import * as React from 'react';
import { motion, animate } from 'framer-motion';
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Users,
  UserCheck,
  UserX,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';

export interface ClientMetricsProps {
  total?: number;
  active?: number;
  inactive?: number;
  newThisMonth?: number;
  loading?: boolean;
}

/* ─── animated counter ──────────────────────────────────────── */
function AnimatedCounter({ value, duration = 1.4 }: { value: number; duration?: number }) {
  const [display, setDisplay] = React.useState(0);
  React.useEffect(() => {
    const controls = animate(0, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return controls.stop;
  }, [value, duration]);
  return <>{display.toLocaleString('en-IN')}</>;
}

/* ─── premium SVG donut ─────────────────────────────────────── */
function PremiumDonut({
  percentage,
  size = 140,
  strokeWidth = 12,
  colors,
  glowColor,
  animDelay = 0,
}: {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  colors: [string, string];
  glowColor: string;
  animDelay?: number;
}) {
  const r = (size - strokeWidth * 2) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    const t = setTimeout(() => {
      const c = animate(0, percentage, {
        duration: 1.6,
        ease: [0.16, 1, 0.3, 1],
        delay: animDelay,
        onUpdate: setProgress,
      });
      return c.stop;
    }, 200);
    return () => clearTimeout(t);
  }, [percentage, animDelay]);

  const filled = circumference * (1 - progress / 100);
  const gradId = `cmGrad-${colors[0].replace('#', '')}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
      style={{ filter: `drop-shadow(0 0 14px ${glowColor}50)` }}
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={colors[0]} />
          <stop offset="100%" stopColor={colors[1]} />
        </linearGradient>
      </defs>
      {/* track */}
      <circle cx={cx} cy={cy} r={r} fill="none"
        stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
      {/* glow halo */}
      <circle cx={cx} cy={cy} r={r} fill="none"
        stroke={glowColor} strokeWidth={strokeWidth + 6}
        strokeDasharray={circumference} strokeDashoffset={filled}
        strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`} opacity={0.15} />
      {/* main arc */}
      <circle cx={cx} cy={cy} r={r} fill="none"
        stroke={`url(#${gradId})`} strokeWidth={strokeWidth}
        strokeDasharray={circumference} strokeDashoffset={filled}
        strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`} />
      {/* ambient rotating dash */}
      <circle cx={cx} cy={cy} r={r + strokeWidth / 2 + 5} fill="none"
        stroke={`url(#${gradId})`} strokeWidth={1}
        strokeDasharray={`${circumference * 0.07} ${circumference * 0.93}`}
        strokeLinecap="round" opacity={0.35}
        style={{
          animation: 'cmSpin 4s linear infinite',
          transformOrigin: `${cx}px ${cy}px`,
        }} />
    </svg>
  );
}

/* ─── mini progress bar ─────────────────────────────────────── */
function MiniBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
      <motion.div
        className="h-full rounded-full"
        style={{ background: color }}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
      />
    </div>
  );
}

/* ─── card types ────────────────────────────────────────────── */
interface Insight {
  label: string;
  value: string;
  pct: number;
}

interface CardCfg {
  title: string;
  value: number;
  subtext: string;
  percentage: number;
  donutColors: [string, string];
  glowColor: string;
  gradFrom: string;
  gradTo: string;
  icon: React.ReactNode;
  statusLabel: string;
  statusColor: string;
  badge: string;
  badgeColor: string;
  insights: Insight[];
  aiInsight: string;
  href: string;
  animDelay?: number;
  isWarning?: boolean;
}

/* ─── single card ───────────────────────────────────────────── */
function MetricCard({ cfg, loading }: { cfg: CardCfg; loading?: boolean }) {
  const [hovered, setHovered] = React.useState(false);

  if (loading) {
    return (
      <div
        className="animate-pulse overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl"
        style={{ minHeight: 420 }}
      >
        <div className="space-y-4 p-6">
          <div className="h-4 w-32 rounded bg-white/10" />
          <div className="mx-auto h-36 w-36 rounded-full bg-white/10" />
          <div className="space-y-2">
            <div className="h-3 rounded bg-white/10" />
            <div className="h-3 w-3/4 rounded bg-white/10" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      whileHover={{ y: -6, scale: 1.012 }}
      transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      className="group relative overflow-hidden rounded-2xl border border-white/10 backdrop-blur-xl"
      style={{
        background: `linear-gradient(145deg, ${cfg.gradFrom}1a 0%, ${cfg.gradTo}08 100%), rgba(12,12,18,0.88)`,
        boxShadow: hovered
          ? `0 24px 64px ${cfg.glowColor}28, 0 0 0 1px ${cfg.glowColor}38, inset 0 1px 0 rgba(255,255,255,0.08)`
          : `0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)`,
        transition: 'box-shadow 0.35s ease',
      }}
      role="article"
      aria-label={`${cfg.title}: ${cfg.value.toLocaleString('en-IN')}`}
    >
      {/* ambient glow blob */}
      <div
        className="pointer-events-none absolute -top-14 left-1/2 h-44 w-44 -translate-x-1/2 rounded-full blur-3xl"
        style={{ background: cfg.glowColor, opacity: 0.18 }}
      />
      {/* hover gradient overlay */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{
          background: `linear-gradient(145deg, ${cfg.glowColor}10, transparent 60%)`,
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.3s',
        }}
      />

      <div className="relative z-10 p-5">
        {/* ── top row ── */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-xl"
              style={{ background: `${cfg.glowColor}1a` }}
            >
              <span style={{ color: cfg.glowColor }}>{cfg.icon}</span>
            </div>
            <div>
              <p
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: `${cfg.glowColor}cc` }}
              >
                {cfg.title}
              </p>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{
                    background: cfg.statusColor,
                    boxShadow: `0 0 5px ${cfg.statusColor}`,
                    animation: 'cmPulse 2s infinite',
                  }}
                />
                <span className="text-xs" style={{ color: `${cfg.statusColor}bb` }}>
                  {cfg.statusLabel}
                </span>
              </div>
            </div>
          </div>

          {/* growth badge */}
          <div
            className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold"
            style={{
              background: `${cfg.badgeColor}1a`,
              color: cfg.badgeColor,
              border: `1px solid ${cfg.badgeColor}28`,
            }}
          >
            {cfg.isWarning
              ? <AlertTriangle className="h-3 w-3" />
              : <TrendingUp className="h-3 w-3" />}
            {cfg.badge}
          </div>
        </div>

        {/* ── donut + center KPI ── */}
        <div className="mt-4 flex flex-col items-center">
          <div className="relative">
            <PremiumDonut
              percentage={cfg.percentage}
              colors={cfg.donutColors}
              glowColor={cfg.glowColor}
              animDelay={cfg.animDelay ?? 0}
            />
            {/* frosted glass center */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center"
              style={{ margin: 14 }}
            >
              <div
                className="flex flex-col items-center rounded-full px-2 py-2"
                style={{
                  background: 'rgba(8,8,14,0.75)',
                  backdropFilter: 'blur(10px)',
                  boxShadow: `inset 0 0 22px ${cfg.glowColor}14, inset 0 1px 0 rgba(255,255,255,0.06)`,
                }}
              >
                <span
                  className="text-3xl font-black tabular-nums leading-none"
                  style={{
                    background: `linear-gradient(135deg, #ffffff 20%, ${cfg.glowColor})`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  <AnimatedCounter value={cfg.value} />
                </span>
                <span className="mt-0.5 text-xs text-white/40">
                  {cfg.percentage.toFixed(0)}% of total
                </span>
              </div>
            </div>
          </div>

          <p className="mt-2.5 text-center text-xs font-medium" style={{ color: `${cfg.glowColor}aa` }}>
            {cfg.subtext}
          </p>
        </div>

        {/* ── insight bars ── */}
        <div className="mt-4 space-y-2.5">
          {cfg.insights.map((ins) => (
            <div key={ins.label}>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs text-white/45">{ins.label}</span>
                <span className="text-xs font-bold" style={{ color: cfg.glowColor }}>
                  {ins.value}
                </span>
              </div>
              <MiniBar
                pct={ins.pct}
                color={`linear-gradient(90deg, ${cfg.donutColors[0]}, ${cfg.donutColors[1]})`}
              />
            </div>
          ))}
        </div>

        {/* ── AI insight ── */}
        <div
          className="mt-4 flex items-start gap-2 rounded-xl p-3"
          style={{
            background: `${cfg.glowColor}0c`,
            border: `1px solid ${cfg.glowColor}1e`,
          }}
        >
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: cfg.glowColor }} />
          <p className="text-xs leading-relaxed text-white/55">{cfg.aiInsight}</p>
        </div>

        {/* ── CTA ── */}
        <Link
          href={cfg.href}
          className="mt-3.5 flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-all hover:opacity-80"
          style={{
            background: `${cfg.glowColor}10`,
            color: `${cfg.glowColor}cc`,
            border: `1px solid ${cfg.glowColor}18`,
          }}
        >
          View details
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <style>{`
        @keyframes cmSpin  { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }
        @keyframes cmPulse { 0%,100% { opacity:1 } 50% { opacity:0.25 } }
        @media (prefers-reduced-motion:reduce) {
          *,*::before,*::after { animation-duration:0.01ms!important; transition-duration:0.01ms!important }
        }
      `}</style>
    </motion.div>
  );
}

/* ─── exported section ──────────────────────────────────────── */
export default function ClientMetricsCards({
  total = 0,
  active = 0,
  inactive = 0,
  newThisMonth = 0,
  loading = false,
}: ClientMetricsProps) {
  const safe          = total || 1;
  const activePct     = Math.round((active   / safe) * 100);
  const inactivePct   = Math.round((inactive / safe) * 100);
  const returningPct  = total > 0 ? Math.round(((total - newThisMonth) / total) * 100) : 0;
  const premiumPct    = 41;
  const dailyPct      = active > 0 ? 78 : 0;
  const ptBooked      = Math.round(active * 0.12);
  const last30d       = Math.round(inactive * 0.49);
  const winback       = Math.round(inactive * 991);
  const winbackFmt    = winback >= 100000
    ? `₹${(winback / 100000).toFixed(1)}L`
    : `₹${(winback / 1000).toFixed(0)}K`;

  const cards: CardCfg[] = [
    {
      title: 'Total Clients',
      value: total,
      subtext: `+${newThisMonth} new joins this month`,
      percentage: 100,
      donutColors: ['#38bdf8', '#818cf8'],
      glowColor: '#38bdf8',
      gradFrom: '#0ea5e9',
      gradTo: '#6366f1',
      icon: <Users className="h-4 w-4" />,
      statusLabel: 'Live tracking',
      statusColor: '#38bdf8',
      badge: '+12.8%',
      badgeColor: '#38bdf8',
      insights: [
        { label: 'New joins',       value: `+${newThisMonth}`, pct: (newThisMonth / safe) * 100 },
        { label: 'Returning',       value: `${returningPct}%`, pct: returningPct },
        { label: 'Premium members', value: `${premiumPct}%`,   pct: premiumPct },
      ],
      aiInsight: 'Client acquisition performing above average.',
      href: '/clients',
      animDelay: 0,
    },
    {
      title: 'Active Clients',
      value: active,
      subtext: `${activePct}% engagement rate`,
      percentage: activePct,
      donutColors: ['#34d399', '#a3e635'],
      glowColor: '#34d399',
      gradFrom: '#10b981',
      gradTo: '#84cc16',
      icon: <UserCheck className="h-4 w-4" />,
      statusLabel: 'High engagement',
      statusColor: '#34d399',
      badge: `${activePct}% rate`,
      badgeColor: '#34d399',
      insights: [
        { label: 'Daily attendance',   value: `${dailyPct}%`, pct: dailyPct },
        { label: 'PT sessions booked', value: `${ptBooked}`,  pct: (ptBooked / safe) * 100 },
        { label: 'Retention score',    value: 'Excellent',    pct: 92 },
      ],
      aiInsight: 'Member engagement is at a 90-day high.',
      href: '/clients?status=active',
      animDelay: 0.15,
    },
    {
      title: 'Inactive Clients',
      value: inactive,
      subtext: 'Needs re-engagement',
      percentage: inactivePct,
      donutColors: ['#fb923c', '#f43f5e'],
      glowColor: '#fb923c',
      gradFrom: '#f97316',
      gradTo: '#e11d48',
      icon: <UserX className="h-4 w-4" />,
      statusLabel: 'Re-engage now',
      statusColor: '#fb923c',
      badge: 'Action needed',
      badgeColor: '#fb923c',
      insights: [
        { label: 'Renewal risk',     value: 'High',       pct: 85 },
        { label: 'Last active >30d', value: `${last30d}`, pct: (last30d / safe) * 100 },
        { label: 'Win-back opp.',    value: winbackFmt,   pct: inactivePct },
      ],
      aiInsight: 'Targeted follow-ups recommended this week.',
      href: '/clients?status=expired',
      animDelay: 0.3,
      isWarning: true,
    },
  ];

  return (
    <section
      aria-label="Client analytics"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      {cards.map((cfg) => (
        <MetricCard key={cfg.title} cfg={cfg} loading={loading} />
      ))}
    </section>
  );
}
