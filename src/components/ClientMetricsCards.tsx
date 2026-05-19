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

/* ─ Animated counter ──────────────────────────────────────────── */
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

/* ─ 3-D Donut (smaller, more vivid) ────────────────────────── */
function PremiumDonut3D({
  pct, size = 120,
  colorA, colorB,
  trackLight, trackDark,
  delay = 0,
}: {
  pct: number; size?: number;
  colorA: string; colorB: string;
  trackLight: string; trackDark: string;
  delay?: number;
}) {
  const skip = useReducedMotion();
  const sw   = 14;
  const r    = (size - sw * 2) / 2;
  const cx   = size / 2;
  const circ = 2 * Math.PI * r;

  const [prog, setProg] = React.useState(skip ? pct : 0);
  React.useEffect(() => {
    if (skip) { setProg(pct); return; }
    const tid = setTimeout(() => {
      const c = animate(0, pct, { duration: 1.4, ease: [0.16, 1, 0.3, 1], delay, onUpdate: setProg });
      return c.stop;
    }, 120);
    return () => clearTimeout(tid);
  }, [pct, delay, skip]);

  const filled = circ * (prog / 100);
  const empty  = circ - filled;
  const uid    = React.useId().replace(/:/g, '');
  const gArc = `${uid}a`, gTrk = `${uid}t`, gInn = `${uid}i`, fShd = `${uid}s`;
  const hlDash = circ * (110 / 360);
  const hlGap  = circ - hlDash;

  return (
    <svg width={size} height={size + 5} viewBox={`0 0 ${size} ${size + 5}`}
      aria-hidden="true" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={gArc} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor={colorA} />
          <stop offset="100%" stopColor={colorB} stopOpacity="0.75" />
        </linearGradient>
        <radialGradient id={gTrk} cx="50%" cy="30%" r="65%">
          <stop offset="0%"   stopColor={trackLight} />
          <stop offset="100%" stopColor={trackDark}  />
        </radialGradient>
        <linearGradient id={gInn} x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%"   stopColor="rgba(0,0,0,0.16)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.03)" />
        </linearGradient>
        <filter id={fShd} x="-25%" y="-25%" width="150%" height="165%">
          <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor={colorA} floodOpacity="0.28" />
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="rgba(0,0,0,0.12)" />
        </filter>
      </defs>
      {/* ground shadow */}
      <ellipse cx={cx} cy={size + 3} rx={r * 0.7} ry={4} fill={colorA} opacity={0.14} />
      {/* outer bevel */}
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth={sw + 2} />
      {/* track */}
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={`url(#${gTrk})`} strokeWidth={sw} />
      {/* arc */}
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={`url(#${gArc})`} strokeWidth={sw}
        strokeLinecap="round"
        strokeDasharray={`${filled} ${empty}`}
        transform={`rotate(-90 ${cx} ${cx})`}
        filter={`url(#${fShd})`} />
      {/* inner bevel */}
      <circle cx={cx} cy={cx} r={r - sw / 2 + 1} fill="none"
        stroke={`url(#${gInn})`} strokeWidth={2.5} opacity={0.55} />
      {/* outer highlight */}
      <circle cx={cx} cy={cx} r={r + sw / 2 - 1} fill="none"
        stroke="rgba(255,255,255,0.30)" strokeWidth={1.2} />
      {/* specular */}
      <circle cx={cx} cy={cx} r={r} fill="none"
        stroke="rgba(255,255,255,0.55)" strokeWidth={sw * 0.34}
        strokeLinecap="round"
        strokeDasharray={`${hlDash} ${hlGap}`}
        transform={`rotate(-148 ${cx} ${cx})`}
        opacity={0.65} />
    </svg>
  );
}

/* ─ Stat row ────────────────────────────────────────────────── */
function StatRow({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="flex items-center justify-between"
      style={{ padding: '7px 0', borderBottom: '1px solid rgba(0,0,0,0.045)' }}>
      <span style={{ fontSize: '0.75rem', color: '#8e8e93', fontWeight: 450 }}>{label}</span>
      <span style={{ fontSize: '0.75rem', color: accent, fontWeight: 640 }}>{value}</span>
    </div>
  );
}

/* ─ Trend chip ──────────────────────────────────────────────── */
function TrendChip({ label, up }: { label: string; up?: boolean | null }) {
  const Icon  = up == null ? Minus : up ? TrendingUp : TrendingDown;
  const color = up == null ? '#8e8e93' : up ? '#30d158' : '#ff6b6b';
  return (
    <span className="inline-flex items-center gap-1"
      style={{ fontSize: '0.69rem', fontWeight: 560, color }}>
      <Icon className="h-3 w-3" strokeWidth={2.2} />{label}
    </span>
  );
}

/* ─ Skeleton ─────────────────────────────────────────────────── */
function CardSkeleton() {
  return (
    <div style={{
      borderRadius: 24, padding: '1.125rem',
      background: 'rgba(255,255,255,0.72)',
      backdropFilter: 'blur(24px)',
      border: '1px solid rgba(255,255,255,0.82)',
      boxShadow: '0 2px 16px rgba(0,0,0,0.07)',
    }}>
      <div className="animate-pulse space-y-3">
        <div className="h-3 w-24 rounded-full" style={{ background: 'rgba(0,0,0,0.07)' }} />
        <div className="mx-auto h-28 w-28 rounded-full" style={{ background: 'rgba(0,0,0,0.07)' }} />
        {[1, 0.75, 0.55].map((w, i) => (
          <div key={i} className="h-2.5 rounded-full"
            style={{ background: 'rgba(0,0,0,0.07)', width: `${w * 100}%` }} />
        ))}
      </div>
    </div>
  );
}

/* ─ Types ────────────────────────────────────────────────────── */
interface CardDef {
  title: string; value: number; subtext: string; pct: number;
  colorA: string; colorB: string;
  trackLight: string; trackDark: string;
  accent: string; softBg: string; cardBg: string;
  badge: string;
  icon: React.ReactNode;
  timeframe: string; trend: string; trendUp?: boolean | null;
  stats: { label: string; value: string }[];
  href: string; delay?: number;
}

/* ─ Single card ─────────────────────────────────────────────── */
function MetricCard({ c, loading }: { c: CardDef; loading?: boolean }) {
  if (loading) return <CardSkeleton />;
  return (
    <motion.article
      tabIndex={0}
      aria-label={`${c.title}: ${c.value.toLocaleString('en-IN')}`}
      whileHover={{ y: -3, scale: 1.007 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      style={{
        borderRadius: 24,
        background: c.cardBg,
        backdropFilter: 'blur(28px) saturate(1.7)',
        WebkitBackdropFilter: 'blur(28px) saturate(1.7)',
        border: `1px solid rgba(255,255,255,0.88)`,
        boxShadow: [
          '0 1px 0 rgba(255,255,255,0.92) inset',
          '0 4px 20px rgba(0,0,0,0.08)',
          '0 1px 3px rgba(0,0,0,0.05)',
        ].join(','),
        padding: '1.125rem',
        outline: 'none',
      }}
      className="focus-visible:ring-2 focus-visible:ring-offset-2"
    >
      {/* header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-[9px]"
            style={{ background: c.softBg, boxShadow: `0 1px 4px ${c.accent}24` }}>
            <span style={{ color: c.accent }}>{c.icon}</span>
          </div>
          <div>
            <p style={{ fontSize: '0.775rem', fontWeight: 660, color: '#1c1c1e', letterSpacing: '0.004em' }}>
              {c.title}
            </p>
            <p style={{ fontSize: '0.65rem', color: '#aeaeb2', marginTop: 1 }}>{c.timeframe}</p>
          </div>
        </div>
        <span style={{
          fontSize: '0.65rem', fontWeight: 660, color: c.accent,
          background: c.softBg, borderRadius: 999, padding: '2px 9px',
        }}>
          {c.badge}
        </span>
      </div>

      {/* donut + KPI */}
      <div className="mt-4 flex flex-col items-center">
        <div className="relative" style={{ width: 120, height: 125 }}>
          <PremiumDonut3D
            pct={c.pct} colorA={c.colorA} colorB={c.colorB}
            trackLight={c.trackLight} trackDark={c.trackDark}
            delay={c.delay ?? 0}
          />
          <div className="absolute flex flex-col items-center justify-center"
            style={{ top: 14, left: 14, width: 92, height: 92, pointerEvents: 'none' }}>
            <span style={{
              fontSize: '1.65rem', fontWeight: 730, color: '#1c1c1e',
              letterSpacing: '-0.04em', lineHeight: 1, fontVariantNumeric: 'tabular-nums',
            }}>
              <AnimatedNumber value={c.value} />
            </span>
            <span style={{ fontSize: '0.64rem', color: '#aeaeb2', marginTop: 3 }}>
              {c.pct.toFixed(0)}%
            </span>
          </div>
        </div>
        <div className="mt-1.5 flex flex-col items-center gap-1">
          <p style={{ fontSize: '0.78rem', fontWeight: 520, color: '#3a3a3c', textAlign: 'center' }}>
            {c.subtext}
          </p>
          <TrendChip label={c.trend} up={c.trendUp} />
        </div>
      </div>

      {/* divider */}
      <div style={{ height: 1, background: 'rgba(0,0,0,0.055)', margin: '0.875rem 0 0' }} />

      {/* stats */}
      <div>
        {c.stats.map((s) => (
          <StatRow key={s.label} label={s.label} value={s.value} accent={c.accent} />
        ))}
      </div>

      {/* CTA */}
      <Link href={c.href}
        className="mt-3 flex w-full items-center justify-center gap-1 rounded-[12px] py-2 text-xs font-semibold transition-all hover:brightness-95 active:scale-[0.98]"
        style={{ background: c.softBg, color: c.accent }}>
        View details
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M4.5 2.5L8 6l-3.5 3.5" stroke="currentColor" strokeWidth="1.6"
            strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>
    </motion.article>
  );
}

/* ─ Export ─────────────────────────────────────────────────────── */
export default function ClientMetricsCards({
  total = 0, active = 0, inactive = 0, newThisMonth = 0, loading = false,
}: ClientMetricsProps) {
  const safe        = total || 1;
  const activePct   = Math.round((active   / safe) * 100);
  const inactivePct = Math.round((inactive / safe) * 100);
  const ptBooked    = Math.round(active * 0.12);
  const atRisk      = Math.round(inactive * 0.49);
  const expiring    = Math.round(inactive * 0.17);
  const winback     = Math.round(inactive * 991);
  const winFmt      = winback >= 100_000
    ? `₹${(winback / 100_000).toFixed(1)}L`
    : `₹${(winback / 1_000).toFixed(0)}K`;

  const cards: CardDef[] = [
    {
      title: 'Total Clients', value: total,
      subtext: `+${newThisMonth} new this month`, pct: 100,
      colorA: '#3b82f6', colorB: '#06b6d4',
      trackLight: 'rgba(59,130,246,0.15)', trackDark: 'rgba(6,182,212,0.09)',
      accent: '#2563eb',
      softBg:  'rgba(59,130,246,0.10)',
      /* card has a very faint blue wash */
      cardBg: 'linear-gradient(148deg, rgba(239,246,255,0.95) 0%, rgba(255,255,255,0.82) 100%)',
      badge: '+12%',
      icon: <Users className="h-3.5 w-3.5" />,
      timeframe: 'All time', trend: '+12% this month', trendUp: true,
      stats: [
        { label: 'New joins',     value: `${newThisMonth}` },
        { label: 'Premium plans', value: '41%' },
        { label: 'Avg retention', value: '7.2 mo' },
      ],
      href: '/clients', delay: 0,
    },
    {
      title: 'Active Clients', value: active,
      subtext: `${activePct}% active rate`, pct: activePct,
      colorA: '#10b981', colorB: '#34d399',
      trackLight: 'rgba(16,185,129,0.15)', trackDark: 'rgba(52,211,153,0.08)',
      accent: '#059669',
      softBg:  'rgba(16,185,129,0.10)',
      /* card has a very faint green wash */
      cardBg: 'linear-gradient(148deg, rgba(236,253,245,0.95) 0%, rgba(255,255,255,0.82) 100%)',
      badge: `${activePct}% rate`,
      icon: <UserCheck className="h-3.5 w-3.5" />,
      timeframe: 'Current period', trend: 'Stable attendance', trendUp: null,
      stats: [
        { label: 'Daily check-ins',    value: '78%' },
        { label: 'PT sessions booked', value: `${ptBooked}` },
        { label: 'Attendance trend',   value: 'Stable' },
      ],
      href: '/clients?status=active', delay: 0.12,
    },
    {
      title: 'Inactive Clients', value: inactive,
      subtext: 'Requires follow-up', pct: inactivePct,
      colorA: '#f59e0b', colorB: '#fb923c',
      trackLight: 'rgba(245,158,11,0.15)', trackDark: 'rgba(251,146,60,0.08)',
      accent: '#d97706',
      softBg:  'rgba(245,158,11,0.10)',
      /* card has a very faint amber wash */
      cardBg: 'linear-gradient(148deg, rgba(255,251,235,0.95) 0%, rgba(255,255,255,0.82) 100%)',
      badge: 'Action needed',
      icon: <UserX className="h-3.5 w-3.5" />,
      timeframe: 'Current period', trend: 'Needs attention', trendUp: false,
      stats: [
        { label: 'At risk',            value: `${atRisk}` },
        { label: 'Expiring soon',      value: `${expiring}` },
        { label: 'Recovery potential', value: winFmt },
      ],
      href: '/clients?status=expired', delay: 0.24,
    },
  ];

  return (
    <>
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration:.01ms!important; transition-duration:.01ms!important }
        }
      `}</style>
      <section aria-label="Client analytics"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => <MetricCard key={c.title} c={c} loading={loading} />)}
      </section>
    </>
  );
}
