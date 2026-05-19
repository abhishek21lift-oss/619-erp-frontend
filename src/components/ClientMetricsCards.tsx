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

/* ──────────────────────────────────────────────────────
   Animated counter
────────────────────────────────────────────────────── */
function AnimatedNumber({ value }: { value: number }) {
  const [n, setN] = React.useState(0);
  const skip = useReducedMotion();
  React.useEffect(() => {
    if (skip) { setN(value); return; }
    const c = animate(0, value, {
      duration: 1.1,
      ease: [0.25, 0.46, 0.45, 0.94],
      onUpdate: (v) => setN(Math.round(v)),
    });
    return c.stop;
  }, [value, skip]);
  return <>{n.toLocaleString('en-IN')}</>;
}

/* ──────────────────────────────────────────────────────
   Premium 3D Donut
   • shadow ellipse under the ring (ground shadow)
   • outer bevel ring (dark edge)
   • track ring with radial gradient
   • progress arc with vivid gradient
   • inner bevel ring (subtle shadow inside hole)
   • top-light specular highlight arc (12 o’clock)
────────────────────────────────────────────────────── */
function PremiumDonut3D({
  pct,
  size = 148,
  colorA,
  colorB,
  trackLight,
  trackDark,
  delay = 0,
}: {
  pct: number;
  size?: number;
  colorA: string;   // arc start color
  colorB: string;   // arc end color
  trackLight: string;
  trackDark: string;
  delay?: number;
}) {
  const skip = useReducedMotion();
  const sw   = 18;               // ring stroke width  — thick for 3D feel
  const r    = (size - sw * 2) / 2;
  const cx   = size / 2;
  const circ = 2 * Math.PI * r;

  const [prog, setProg] = React.useState(skip ? pct : 0);
  React.useEffect(() => {
    if (skip) { setProg(pct); return; }
    const tid = setTimeout(() => {
      const c = animate(0, pct, {
        duration: 1.45,
        ease: [0.16, 1, 0.3, 1],
        delay,
        onUpdate: setProg,
      });
      return c.stop;
    }, 120);
    return () => clearTimeout(tid);
  }, [pct, delay, skip]);

  const filled = circ * (prog / 100);
  const empty  = circ - filled;

  const uid = React.useId().replace(/:/g, '');
  const gArc   = `${uid}arc`;
  const gTrack = `${uid}trk`;
  const gInner = `${uid}inn`;
  const fShadow= `${uid}shd`;

  /* highlight arc: short bright arc at top (300° → 60°) */
  const hlAngle = 120; // degrees of highlight arc
  const hlDash  = circ * (hlAngle / 360);
  const hlGap   = circ - hlDash;

  return (
    <svg
      width={size}
      height={size + 6}
      viewBox={`0 0 ${size} ${size + 6}`}
      aria-hidden="true"
      style={{ overflow: 'visible' }}
    >
      <defs>
        {/* arc gradient — vivid, directional */}
        <linearGradient id={gArc} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor={colorA} />
          <stop offset="55%"  stopColor={colorA} stopOpacity="0.85" />
          <stop offset="100%" stopColor={colorB} stopOpacity="0.70" />
        </linearGradient>

        {/* track gradient — subtle depth */}
        <radialGradient id={gTrack} cx="50%" cy="30%" r="65%">
          <stop offset="0%"   stopColor={trackLight} />
          <stop offset="100%" stopColor={trackDark}  />
        </radialGradient>

        {/* inner-shadow gradient (top dark, bottom lighter) */}
        <linearGradient id={gInner} x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%"   stopColor="rgba(0,0,0,0.18)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.04)" />
        </linearGradient>

        {/* drop-shadow filter for the ring */}
        <filter id={fShadow} x="-20%" y="-20%" width="140%" height="160%">
          <feDropShadow dx="0" dy="3" stdDeviation="5" floodColor={colorA} floodOpacity="0.22" />
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="rgba(0,0,0,0.14)" />
        </filter>
      </defs>

      {/* ground shadow ellipse */}
      <ellipse
        cx={cx} cy={size + 4}
        rx={r * 0.72} ry={5}
        fill={colorA}
        opacity={0.13}
      />

      {/* outer bevel ring — 1px darker edge for extrusion */}
      <circle
        cx={cx} cy={cx} r={r}
        fill="none"
        stroke="rgba(0,0,0,0.09)"
        strokeWidth={sw + 2}
      />

      {/* track ring */}
      <circle
        cx={cx} cy={cx} r={r}
        fill="none"
        stroke={`url(#${gTrack})`}
        strokeWidth={sw}
      />

      {/* progress arc — with drop shadow */}
      <circle
        cx={cx} cy={cx} r={r}
        fill="none"
        stroke={`url(#${gArc})`}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeDasharray={`${filled} ${empty}`}
        transform={`rotate(-90 ${cx} ${cx})`}
        filter={`url(#${fShadow})`}
      />

      {/* inner bevel ring — darkens inner rim for depth */}
      <circle
        cx={cx} cy={cx} r={r - sw / 2 + 1}
        fill="none"
        stroke={`url(#${gInner})`}
        strokeWidth={3}
        opacity={0.6}
      />

      {/* outer bevel highlight — brightens outer rim */}
      <circle
        cx={cx} cy={cx} r={r + sw / 2 - 1}
        fill="none"
        stroke="rgba(255,255,255,0.28)"
        strokeWidth={1.5}
      />

      {/* specular highlight arc at top — glossy look */}
      <circle
        cx={cx} cy={cx} r={r}
        fill="none"
        stroke="rgba(255,255,255,0.50)"
        strokeWidth={sw * 0.38}
        strokeLinecap="round"
        strokeDasharray={`${hlDash} ${hlGap}`}
        transform={`rotate(-150 ${cx} ${cx})`}
        opacity={0.7}
      />
    </svg>
  );
}

/* ──────────────────────────────────────────────────────
   Stat row
────────────────────────────────────────────────────── */
function StatRow({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div
      className="flex items-center justify-between"
      style={{ padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.045)' }}
    >
      <span style={{ fontSize: '0.78rem', color: '#8e8e93', fontWeight: 450 }}>{label}</span>
      <span style={{ fontSize: '0.78rem', color: accent, fontWeight: 640 }}>{value}</span>
    </div>
  );
}

/* ──────────────────────────────────────────────────────
   Trend chip
────────────────────────────────────────────────────── */
function TrendChip({ label, up }: { label: string; up?: boolean | null }) {
  const Icon = up == null ? Minus : up ? TrendingUp : TrendingDown;
  const color = up == null ? '#8e8e93' : up ? '#30d158' : '#ff6b6b';
  return (
    <span className="inline-flex items-center gap-1" style={{ fontSize: '0.71rem', fontWeight: 550, color }}>
      <Icon className="h-3 w-3" strokeWidth={2.2} />
      {label}
    </span>
  );
}

/* ──────────────────────────────────────────────────────
   Skeleton
────────────────────────────────────────────────────── */
function CardSkeleton() {
  return (
    <div style={{
      borderRadius: 28,
      background: 'rgba(255,255,255,0.70)',
      backdropFilter: 'blur(24px)',
      border: '1px solid rgba(255,255,255,0.80)',
      boxShadow: '0 2px 20px rgba(0,0,0,0.07)',
      padding: '1.375rem',
    }}>
      <div className="animate-pulse space-y-4">
        <div className="h-3.5 w-28 rounded-full" style={{ background: 'rgba(0,0,0,0.07)' }} />
        <div className="mx-auto h-36 w-36 rounded-full" style={{ background: 'rgba(0,0,0,0.07)' }} />
        <div className="space-y-2 pt-1">
          {[1,0.75,0.55].map((w,i) => (
            <div key={i} className="h-2.5 rounded-full" style={{ background: 'rgba(0,0,0,0.07)', width: `${w*100}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────
   Card definition type
────────────────────────────────────────────────────── */
interface CardDef {
  title: string;
  value: number;
  subtext: string;
  pct: number;
  colorA: string;
  colorB: string;
  trackLight: string;
  trackDark: string;
  accent: string;
  softBg: string;
  badge: string;
  icon: React.ReactNode;
  timeframe: string;
  trend: string;
  trendUp?: boolean | null;
  stats: { label: string; value: string }[];
  href: string;
  delay?: number;
}

/* ──────────────────────────────────────────────────────
   Single card
────────────────────────────────────────────────────── */
function MetricCard({ c, loading }: { c: CardDef; loading?: boolean }) {
  if (loading) return <CardSkeleton />;

  return (
    <motion.article
      tabIndex={0}
      aria-label={`${c.title}: ${c.value.toLocaleString('en-IN')}`}
      whileHover={{ y: -4, scale: 1.008 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      style={{
        borderRadius: 28,
        background: 'linear-gradient(160deg, rgba(255,255,255,0.88) 0%, rgba(255,255,255,0.72) 100%)',
        backdropFilter: 'blur(32px) saturate(1.8)',
        WebkitBackdropFilter: 'blur(32px) saturate(1.8)',
        border: '1px solid rgba(255,255,255,0.90)',
        boxShadow: [
          '0 1px 0 rgba(255,255,255,0.95) inset',  /* top inner highlight */
          '0 4px 24px rgba(0,0,0,0.07)',
          '0 1px 3px rgba(0,0,0,0.05)',
        ].join(','),
        padding: '1.375rem',
        outline: 'none',
      }}
      className="focus-visible:ring-2 focus-visible:ring-offset-2"
    >
      {/* ── header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-[10px]"
            style={{
              background: c.softBg,
              boxShadow: `0 1px 4px ${c.accent}28`,
            }}
          >
            <span style={{ color: c.accent }}>{c.icon}</span>
          </div>
          <div>
            <p style={{ fontSize: '0.8rem', fontWeight: 650, color: '#1c1c1e', letterSpacing: '0.005em' }}>
              {c.title}
            </p>
            <p style={{ fontSize: '0.67rem', color: '#aeaeb2', marginTop: 1 }}>{c.timeframe}</p>
          </div>
        </div>
        {/* badge */}
        <span style={{
          fontSize: '0.67rem', fontWeight: 650,
          color: c.accent,
          background: c.softBg,
          borderRadius: 999,
          padding: '3px 10px',
          letterSpacing: '0.01em',
        }}>
          {c.badge}
        </span>
      </div>

      {/* ── 3-D donut + center KPI ── */}
      <div className="mt-5 flex flex-col items-center">
        <div className="relative" style={{ width: 148, height: 154 }}>
          <PremiumDonut3D
            pct={c.pct}
            colorA={c.colorA}
            colorB={c.colorB}
            trackLight={c.trackLight}
            trackDark={c.trackDark}
            delay={c.delay ?? 0}
          />
          {/* center KPI — positioned over the hole */}
          <div
            className="absolute flex flex-col items-center justify-center"
            style={{
              top: 18, left: 18,
              width: 112, height: 112,
              pointerEvents: 'none',
            }}
          >
            <span style={{
              fontSize: '2rem',
              fontWeight: 720,
              color: '#1c1c1e',
              letterSpacing: '-0.04em',
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
            }}>
              <AnimatedNumber value={c.value} />
            </span>
            <span style={{ fontSize: '0.67rem', color: '#aeaeb2', marginTop: 4 }}>
              {c.pct.toFixed(0)}%
            </span>
          </div>
        </div>

        {/* subtext + trend */}
        <div className="mt-1 flex flex-col items-center gap-1.5">
          <p style={{ fontSize: '0.8125rem', fontWeight: 520, color: '#3a3a3c', textAlign: 'center' }}>
            {c.subtext}
          </p>
          <TrendChip label={c.trend} up={c.trendUp} />
        </div>
      </div>

      {/* ── divider ── */}
      <div style={{ height: 1, background: 'rgba(0,0,0,0.05)', margin: '1rem 0 0' }} />

      {/* ── stats ── */}
      <div className="mt-0">
        {c.stats.map((s) => (
          <StatRow key={s.label} label={s.label} value={s.value} accent={c.accent} />
        ))}
      </div>

      {/* ── CTA ── */}
      <Link
        href={c.href}
        className="mt-3.5 flex w-full items-center justify-center gap-1 rounded-[14px] py-2.5 text-xs font-semibold transition-all hover:brightness-95 active:scale-[0.98]"
        style={{
          background: c.softBg,
          color: c.accent,
          boxShadow: `0 1px 3px ${c.accent}14`,
        }}
      >
        View details
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M4.5 2.5L8 6l-3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>
    </motion.article>
  );
}

/* ──────────────────────────────────────────────────────
   Exported section
────────────────────────────────────────────────────── */
export default function ClientMetricsCards({
  total = 0,
  active = 0,
  inactive = 0,
  newThisMonth = 0,
  loading = false,
}: ClientMetricsProps) {
  const safe        = total || 1;
  const activePct   = Math.round((active   / safe) * 100);
  const inactivePct = Math.round((inactive / safe) * 100);

  const ptBooked = Math.round(active * 0.12);
  const atRisk   = Math.round(inactive * 0.49);
  const expiring = Math.round(inactive * 0.17);
  const winback  = Math.round(inactive * 991);
  const winFmt   = winback >= 100_000
    ? `₹${(winback / 100_000).toFixed(1)}L`
    : `₹${(winback / 1_000).toFixed(0)}K`;

  const cards: CardDef[] = [
    {
      title:      'Total Clients',
      value:      total,
      subtext:    `+${newThisMonth} new this month`,
      pct:        100,
      colorA:     '#3b82f6',
      colorB:     '#06b6d4',
      trackLight: 'rgba(59,130,246,0.13)',
      trackDark:  'rgba(6,182,212,0.08)',
      accent:     '#2563eb',
      softBg:     'rgba(59,130,246,0.08)',
      badge:      '+12%',
      icon:       <Users className="h-4 w-4" />,
      timeframe:  'All time',
      trend:      '+12% this month',
      trendUp:    true,
      stats: [
        { label: 'New joins',     value: `${newThisMonth}` },
        { label: 'Premium plans', value: '41%' },
        { label: 'Avg retention', value: '7.2 mo' },
      ],
      href:  '/clients',
      delay: 0,
    },
    {
      title:      'Active Clients',
      value:      active,
      subtext:    `${activePct}% active rate`,
      pct:        activePct,
      colorA:     '#10b981',
      colorB:     '#34d399',
      trackLight: 'rgba(16,185,129,0.13)',
      trackDark:  'rgba(52,211,153,0.07)',
      accent:     '#059669',
      softBg:     'rgba(16,185,129,0.08)',
      badge:      `${activePct}% rate`,
      icon:       <UserCheck className="h-4 w-4" />,
      timeframe:  'Current period',
      trend:      'Stable attendance',
      trendUp:    null,
      stats: [
        { label: 'Daily check-ins',    value: '78%' },
        { label: 'PT sessions booked', value: `${ptBooked}` },
        { label: 'Attendance trend',   value: 'Stable' },
      ],
      href:  '/clients?status=active',
      delay: 0.12,
    },
    {
      title:      'Inactive Clients',
      value:      inactive,
      subtext:    'Requires follow-up',
      pct:        inactivePct,
      colorA:     '#f59e0b',
      colorB:     '#fb923c',
      trackLight: 'rgba(245,158,11,0.13)',
      trackDark:  'rgba(251,146,60,0.07)',
      accent:     '#d97706',
      softBg:     'rgba(245,158,11,0.08)',
      badge:      'Action needed',
      icon:       <UserX className="h-4 w-4" />,
      timeframe:  'Current period',
      trend:      'Needs attention',
      trendUp:    false,
      stats: [
        { label: 'At risk',            value: `${atRisk}` },
        { label: 'Expiring soon',      value: `${expiring}` },
        { label: 'Recovery potential', value: winFmt },
      ],
      href:  '/clients?status=expired',
      delay: 0.24,
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
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {cards.map((c) => (
          <MetricCard key={c.title} c={c} loading={loading} />
        ))}
      </section>
    </>
  );
}
