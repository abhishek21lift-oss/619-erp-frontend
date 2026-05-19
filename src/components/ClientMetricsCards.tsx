'use client';

import * as React from 'react';
import { motion, animate, useReducedMotion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Users, UserCheck, UserX } from 'lucide-react';
import Link from 'next/link';

export interface ClientMetricsProps {
  total?: number;
  active?: number;
  inactive?: number;
  newThisMonth?: number;
  loading?: boolean;
}

/* ─── Animated counter ───────────────────────────────────── */
function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = React.useState(0);
  const reduced = useReducedMotion();
  React.useEffect(() => {
    if (reduced) { setDisplay(value); return; }
    const ctrl = animate(0, value, {
      duration: 1.1,
      ease: [0.25, 0.46, 0.45, 0.94],
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return ctrl.stop;
  }, [value, reduced]);
  return <>{display.toLocaleString('en-IN')}</>;
}

/* ─── SVG Donut ──────────────────────────────────────────── */
function AppleDonut({
  pct,
  size = 120,
  track,
  fill,
  delay = 0,
}: {
  pct: number;
  size?: number;
  track: string;
  fill: string;
  delay?: number;
}) {
  const reduced = useReducedMotion();
  const sw = 11;
  const r = (size - sw) / 2;
  const cx = size / 2;
  const circ = 2 * Math.PI * r;
  const [progress, setProgress] = React.useState(reduced ? pct : 0);

  React.useEffect(() => {
    if (reduced) { setProgress(pct); return; }
    const id = setTimeout(() => {
      const c = animate(0, pct, {
        duration: 1.3,
        ease: [0.25, 0.46, 0.45, 0.94],
        delay,
        onUpdate: setProgress,
      });
      return c.stop;
    }, 100);
    return () => clearTimeout(id);
  }, [pct, delay, reduced]);

  const dash = circ * (progress / 100);
  const gap  = circ - dash;
  const id   = React.useId();

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor={fill} stopOpacity="0.9" />
          <stop offset="100%" stopColor={fill} stopOpacity="0.65" />
        </linearGradient>
      </defs>
      {/* track ring */}
      <circle
        cx={cx} cy={cx} r={r}
        fill="none"
        stroke={track}
        strokeWidth={sw}
      />
      {/* progress arc */}
      <circle
        cx={cx} cy={cx} r={r}
        fill="none"
        stroke={`url(#${id})`}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${gap}`}
        transform={`rotate(-90 ${cx} ${cx})`}
        style={{ transition: reduced ? 'none' : undefined }}
      />
    </svg>
  );
}

/* ─── Trend chip ─────────────────────────────────────────── */
function TrendChip({ label, up }: { label: string; up?: boolean | null }) {
  const Icon = up === null || up === undefined ? Minus : up ? TrendingUp : TrendingDown;
  const color =
    up === null || up === undefined
      ? 'text-[#8e8e93]'
      : up
      ? 'text-[#34c759]'
      : 'text-[#ff6b6b]';
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${color}`}>
      <Icon className="h-3 w-3" strokeWidth={2.2} />
      {label}
    </span>
  );
}

/* ─── Stat row ───────────────────────────────────────────── */
function StatRow({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="flex items-center justify-between py-2.5" style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
      <span style={{ color: '#8e8e93', fontSize: '0.8125rem', fontWeight: 450 }}>{label}</span>
      <span style={{ color: accent, fontSize: '0.8125rem', fontWeight: 600 }}>{value}</span>
    </div>
  );
}

/* ─── Loading skeleton ───────────────────────────────────── */
function CardSkeleton() {
  return (
    <div
      className="overflow-hidden rounded-[20px]"
      style={{
        background: 'rgba(255,255,255,0.72)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(0,0,0,0.07)',
        boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
        padding: '1.25rem',
      }}
    >
      <div className="animate-pulse space-y-3">
        <div className="h-3.5 w-24 rounded-full bg-black/[0.07]" />
        <div className="mx-auto h-28 w-28 rounded-full bg-black/[0.07]" />
        <div className="space-y-2 pt-2">
          <div className="h-3 rounded-full bg-black/[0.07]" />
          <div className="h-3 w-3/4 rounded-full bg-black/[0.07]" />
          <div className="h-3 w-1/2 rounded-full bg-black/[0.07]" />
        </div>
      </div>
    </div>
  );
}

/* ─── Card config ────────────────────────────────────────── */
interface CardDef {
  title: string;
  value: number;
  subtext: string;
  pct: number;
  trackColor: string;
  fillColor: string;
  accentColor: string;
  badgeBg: string;
  badgeText: string;
  badgeLabel: string;
  icon: React.ReactNode;
  timeframe: string;
  trend: string;
  trendUp?: boolean | null;
  stats: Array<{ label: string; value: string }>;
  href: string;
  delay?: number;
}

/* ─── Single card ────────────────────────────────────────── */
function AnalyticsCard({ def, loading }: { def: CardDef; loading?: boolean }) {
  if (loading) return <CardSkeleton />;

  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.005 }}
      transition={{ type: 'spring', stiffness: 340, damping: 30 }}
      tabIndex={0}
      role="article"
      aria-label={`${def.title}: ${def.value.toLocaleString('en-IN')}`}
      style={{
        background: 'rgba(255,255,255,0.78)',
        backdropFilter: 'blur(28px) saturate(1.6)',
        WebkitBackdropFilter: 'blur(28px) saturate(1.6)',
        border: '1px solid rgba(255,255,255,0.85)',
        borderRadius: 20,
        boxShadow: '0 2px 12px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)',
        padding: '1.25rem',
        outline: 'none',
        cursor: 'default',
      }}
      className="focus-visible:ring-2 focus-visible:ring-offset-2"
    >
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {/* icon */}
          <div
            className="flex h-7 w-7 items-center justify-center rounded-xl"
            style={{ background: def.badgeBg }}
          >
            <span style={{ color: def.accentColor }}>{def.icon}</span>
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#1c1c1e', letterSpacing: '0.01em' }}>
              {def.title}
            </p>
            <p style={{ fontSize: '0.6875rem', color: '#8e8e93', marginTop: 1 }}>
              {def.timeframe}
            </p>
          </div>
        </div>

        {/* badge */}
        <span
          style={{
            fontSize: '0.6875rem',
            fontWeight: 600,
            color: def.accentColor,
            background: def.badgeBg,
            borderRadius: 999,
            padding: '2px 9px',
          }}
        >
          {def.badgeLabel}
        </span>
      </div>

      {/* ── Donut + KPI ── */}
      <div className="mt-4 flex flex-col items-center">
        <div className="relative">
          <AppleDonut
            pct={def.pct}
            track={def.trackColor}
            fill={def.fillColor}
            delay={def.delay ?? 0}
          />
          {/* center text */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center"
            style={{ pointerEvents: 'none' }}
          >
            <span
              style={{
                fontSize: '1.6rem',
                fontWeight: 700,
                color: '#1c1c1e',
                letterSpacing: '-0.03em',
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              <AnimatedNumber value={def.value} />
            </span>
            <span style={{ fontSize: '0.6875rem', color: '#8e8e93', marginTop: 3 }}>
              {def.pct.toFixed(0)}%
            </span>
          </div>
        </div>

        {/* subtext + trend */}
        <div className="mt-2.5 flex flex-col items-center gap-1">
          <p style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#3a3a3c', textAlign: 'center' }}>
            {def.subtext}
          </p>
          <TrendChip label={def.trend} up={def.trendUp} />
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="mt-4">
        {def.stats.map((s) => (
          <StatRow key={s.label} label={s.label} value={s.value} accent={def.accentColor} />
        ))}
      </div>

      {/* ── CTA ── */}
      <Link
        href={def.href}
        className="mt-4 flex w-full items-center justify-center rounded-xl py-2 text-xs font-semibold transition-opacity hover:opacity-75 active:opacity-60"
        style={{
          background: def.badgeBg,
          color: def.accentColor,
        }}
      >
        View details →
      </Link>
    </motion.div>
  );
}

/* ─── Exported section ───────────────────────────────────── */
export default function ClientMetricsCards({
  total = 0,
  active = 0,
  inactive = 0,
  newThisMonth = 0,
  loading = false,
}: ClientMetricsProps) {
  const safe       = total || 1;
  const activePct  = Math.round((active   / safe) * 100);
  const inactivePct= Math.round((inactive / safe) * 100);

  const ptBooked   = Math.round(active * 0.12);
  const atRisk     = Math.round(inactive * 0.49);
  const expiring   = Math.round(inactive * 0.17);
  const winback    = Math.round(inactive * 991);
  const winFmt     = winback >= 100_000
    ? `₹${(winback / 100_000).toFixed(1)}L`
    : `₹${(winback / 1_000).toFixed(0)}K`;
  const premiumPct = 41;
  const avgRet     = 7.2;

  const cards: CardDef[] = [
    {
      title: 'Total Clients',
      value: total,
      subtext: `+${newThisMonth} new this month`,
      pct: 100,
      trackColor: 'rgba(0,122,255,0.10)',
      fillColor:  '#007aff',
      accentColor:'#007aff',
      badgeBg:    'rgba(0,122,255,0.08)',
      badgeText:  '#007aff',
      badgeLabel: '+12%',
      icon: <Users className="h-3.5 w-3.5" />,
      timeframe:  'All time',
      trend:      '+12% this month',
      trendUp:    true,
      stats: [
        { label: 'New joins',      value: `${newThisMonth}` },
        { label: 'Premium plans',  value: `${premiumPct}%` },
        { label: 'Avg retention',  value: `${avgRet} mo` },
      ],
      href:  '/clients',
      delay: 0,
    },
    {
      title: 'Active Clients',
      value: active,
      subtext: `${activePct}% active rate`,
      pct: activePct,
      trackColor: 'rgba(52,199,89,0.10)',
      fillColor:  '#34c759',
      accentColor:'#28a745',
      badgeBg:    'rgba(52,199,89,0.08)',
      badgeText:  '#28a745',
      badgeLabel: `${activePct}%`,
      icon: <UserCheck className="h-3.5 w-3.5" />,
      timeframe:  'Current period',
      trend:      'Stable attendance',
      trendUp:    null,
      stats: [
        { label: 'Daily check-ins',    value: '78%' },
        { label: 'PT sessions booked', value: `${ptBooked}` },
        { label: 'Attendance trend',   value: 'Stable' },
      ],
      href:  '/clients?status=active',
      delay: 0.1,
    },
    {
      title: 'Inactive Clients',
      value: inactive,
      subtext: 'Requires follow-up',
      pct: inactivePct,
      trackColor: 'rgba(255,149,0,0.10)',
      fillColor:  '#ff9500',
      accentColor:'#c97d00',
      badgeBg:    'rgba(255,149,0,0.08)',
      badgeText:  '#c97d00',
      badgeLabel: 'Action needed',
      icon: <UserX className="h-3.5 w-3.5" />,
      timeframe:  'Current period',
      trend:      'Needs attention',
      trendUp:    false,
      stats: [
        { label: 'At risk',               value: `${atRisk}` },
        { label: 'Expiring soon',         value: `${expiring}` },
        { label: 'Recovery potential',    value: winFmt },
      ],
      href:  '/clients?status=expired',
      delay: 0.2,
    },
  ];

  return (
    <>
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
      <section
        aria-label="Client analytics"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
      >
        {cards.map((def) => (
          <AnalyticsCard key={def.title} def={def} loading={loading} />
        ))}
      </section>
    </>
  );
}
