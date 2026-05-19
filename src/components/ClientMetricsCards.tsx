'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClientMetricsCardsProps {
  total?: number;
  active?: number;
  inactive?: number;
  loading?: boolean;
}

// ─── Animated Counter ─────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  // FIX #1: correct ref type — null until first rAF is scheduled
  const frameRef = useRef<number | null>(null);
  useEffect(() => {
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => {
      // FIX #1 (cont): guard against null before cancelling
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [target, duration]);
  return value;
}

// ─── Premium Mini Donut ───────────────────────────────────────────────────────

interface DonutProps {
  value: number;       // 0–100 percentage fill
  size?: number;
  strokeWidth?: number;
  colorFrom: string;
  colorTo: string;
  trackColor?: string;
  glowColor?: string;
  id: string;
}

function PremiumDonut({
  value,
  size = 72,
  strokeWidth = 8,
  colorFrom,
  colorTo,
  // FIX #3: use CSS variable so dark mode gets a matching track colour
  trackColor = 'var(--color-border, rgba(0,0,0,0.06))',
  glowColor,
  id,
}: DonutProps) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const cx = size / 2;
  const cy = size / 2;

  // FIX #2: stabilise motionVal + springVal with refs so they are created
  // exactly once per mount — prevents the stale-closure / exhaustive-deps warning.
  const motionVal = useRef(useMotionValue(0)).current;
  const springVal = useRef(useSpring(motionVal, { stiffness: 60, damping: 18 })).current;
  const [dashOffset, setDashOffset] = useState(circ);

  useEffect(() => {
    motionVal.set(value);
    const unsub = springVal.on('change', (v) => {
      setDashOffset(circ - (v / 100) * circ);
    });
    return unsub;
    // motionVal and springVal are now stable refs — safe to omit from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, circ]);

  const gradId = `grad-${id}`;
  const filterId = `glow-${id}`;

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ display: 'block', filter: `drop-shadow(0 2px 8px ${glowColor ?? colorFrom}33)` }}
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colorFrom} />
            <stop offset="100%" stopColor={colorTo} />
          </linearGradient>
          <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Track ring */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />

        {/* Inner shadow ring for depth */}
        <circle
          cx={cx} cy={cy} r={r - strokeWidth * 0.4}
          fill="none"
          stroke="rgba(0,0,0,0.04)"
          strokeWidth={strokeWidth * 0.5}
        />

        {/* Progress arc */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${cx} ${cy})`}
          filter={`url(#${filterId})`}
          style={{ transition: 'stroke-dashoffset 0.05s' }}
        />

        {/* Highlight cap dot */}
        <circle
          cx={cx + r * Math.cos(-Math.PI / 2)}
          cy={cy + r * Math.sin(-Math.PI / 2)}
          r={strokeWidth / 2.5}
          fill={colorFrom}
          opacity={0.9}
        />
      </svg>

      {/* Center percentage label */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column',
      }}>
        <span style={{
          fontSize: 12,
          fontWeight: 700,
          background: `linear-gradient(135deg, ${colorFrom}, ${colorTo})`,
          // FIX #5: standard property alongside webkit prefix for Firefox
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          color: 'transparent',
          lineHeight: 1,
          letterSpacing: '-0.02em',
        }}>
          {value}%
        </span>
      </div>
    </div>
  );
}

// ─── Insight Row ──────────────────────────────────────────────────────────────

function InsightRow({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <span style={{ fontSize: 11, color: 'var(--color-text-muted, #8a8a9a)', fontWeight: 500, letterSpacing: '0.01em' }}>
        {label}
      </span>
      <span style={{
        fontSize: 11, fontWeight: 700,
        color: accent,
        background: `${accent}14`,
        padding: '2px 7px',
        borderRadius: 20,
        letterSpacing: '0.01em',
      }}>
        {value}
      </span>
    </div>
  );
}

// ─── Premium KPI Card ─────────────────────────────────────────────────────────

interface KpiCardProps {
  id: string;
  title: string;
  value: number;
  donutValue: number;
  colorFrom: string;
  colorTo: string;
  accentText: string;
  badge: string;
  badgeColor: string;
  subValue: string;
  subLabel: string;
  insights: { label: string; value: string }[];
  actionLabel: string;
  actionHref?: string;
  loading?: boolean;
  delay?: number;
}

function KpiCard({
  id, title, value, donutValue,
  colorFrom, colorTo, accentText,
  badge, badgeColor,
  subValue, subLabel,
  // FIX #4: no '#' default — avoids scroll-to-top on click
  insights, actionLabel, actionHref,
  loading = false,
  delay = 0,
}: KpiCardProps) {
  const count = useCountUp(loading ? 0 : value, 1000);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      // FIX #3: use framer whileHover for box-shadow — avoids direct DOM mutation
      whileHover={{
        y: -2,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06), 0 12px 32px rgba(0,0,0,0.10)',
        transition: { duration: 0.2, ease: 'easeOut' },
      }}
      style={{
        flex: 1,
        minWidth: 0,
        background: 'var(--color-surface, #ffffff)',
        border: '1px solid rgba(0,0,0,0.07)',
        borderRadius: 20,
        padding: '16px 20px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        cursor: 'default',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.05)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle top-edge gradient accent */}
      <div style={{
        position: 'absolute', top: 0, left: 24, right: 24, height: 2,
        background: `linear-gradient(90deg, transparent, ${colorFrom}60, ${colorTo}60, transparent)`,
        borderRadius: '0 0 4px 4px',
      }} />

      {/* Main row: donut left + content right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>

        {/* Donut */}
        {loading ? (
          <div style={{
            width: 72, height: 72, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, #f0f0f0, #e4e4e4)',
            animation: 'kpi-pulse 1.5s ease-in-out infinite',
          }} />
        ) : (
          <PremiumDonut
            id={id}
            value={donutValue}
            colorFrom={colorFrom}
            colorTo={colorTo}
            glowColor={colorFrom}
          />
        )}

        {/* Right content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Badge + title row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{
              fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.07em', color: badgeColor,
              background: `${badgeColor}16`, padding: '2px 7px', borderRadius: 20,
            }}>
              {badge}
            </span>
          </div>

          {/* Title */}
          <p style={{
            fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted, #7a7a8c)',
            letterSpacing: '0.02em', margin: 0, lineHeight: 1.3,
          }}>
            {title}
          </p>

          {/* Big number + growth */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 2 }}>
            {loading ? (
              <div style={{ width: 64, height: 28, borderRadius: 8, background: '#ececec' }} />
            ) : (
              <span style={{
                fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em',
                lineHeight: 1,
                background: `linear-gradient(135deg, ${colorFrom}, ${colorTo})`,
                // FIX #5: standard + webkit for Firefox compat
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                color: 'transparent',
              }}>
                {count.toLocaleString('en-IN')}
              </span>
            )}
            <span style={{
              fontSize: 12, fontWeight: 700, color: accentText,
              background: `${accentText}14`, padding: '2px 7px', borderRadius: 20,
            }}>
              {subValue}
            </span>
          </div>

          {/* Sub label */}
          <p style={{
            fontSize: 11, color: 'var(--color-text-faint, #b0b0c0)',
            marginTop: 2, letterSpacing: '0.01em',
          }}>
            {subLabel}
          </p>
        </div>
      </div>

      {/* Insights */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 5,
        borderTop: '1px solid rgba(0,0,0,0.05)',
        paddingTop: 10,
      }}>
        {insights.map((ins) => (
          <InsightRow key={ins.label} label={ins.label} value={ins.value} accent={colorFrom} />
        ))}
      </div>

      {/* FIX #4: only render action link when a real href is provided */}
      {actionHref && (
        <div style={{ marginTop: -2 }}>
          <a
            href={actionHref}
            style={{
              fontSize: 11, fontWeight: 700,
              color: colorFrom,
              textDecoration: 'none',
              display: 'inline-flex', alignItems: 'center', gap: 4,
              letterSpacing: '0.02em',
              opacity: 0.85,
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.85')}
          >
            {actionLabel}
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2 5h6M5 2l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>
      )}
    </motion.div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export default function ClientMetricsCards({
  total = 1284,
  active = 1042,
  inactive = 242,
  loading = false,
}: ClientMetricsCardsProps) {
  const activeRate = total > 0 ? Math.round((active / total) * 100) : 0;
  const inactiveRate = total > 0 ? Math.round((inactive / total) * 100) : 0;

  const cards: KpiCardProps[] = [
    {
      id: 'total',
      title: 'Total Clients',
      value: total,
      donutValue: 100,
      colorFrom: '#3b82f6',
      colorTo: '#06b6d4',
      accentText: '#3b82f6',
      badge: '+12% growth',
      badgeColor: '#3b82f6',
      subValue: '+84 this mo',
      subLabel: 'All registered members',
      insights: [
        { label: 'Premium plans', value: '41%' },
        { label: 'Avg retention', value: '7.2 mo' },
      ],
      actionLabel: 'View analytics',
      actionHref: '/clients',
    },
    {
      id: 'active',
      title: 'Active Clients',
      value: active,
      donutValue: activeRate,
      colorFrom: '#10b981',
      colorTo: '#34d399',
      accentText: '#10b981',
      badge: `${activeRate}% active`,
      badgeColor: '#10b981',
      subValue: '↑ 5% MoM',
      subLabel: 'Currently active memberships',
      insights: [
        { label: 'Daily check-ins', value: '78%' },
        { label: 'PT bookings', value: '126' },
      ],
      actionLabel: 'Open insights',
      actionHref: '/clients?filter=active',
    },
    {
      id: 'inactive',
      title: 'Inactive Clients',
      value: inactive,
      donutValue: inactiveRate,
      colorFrom: '#f97316',
      colorTo: '#fb923c',
      accentText: '#f97316',
      badge: 'Needs attention',
      badgeColor: '#f97316',
      subValue: '↓ 3% MoM',
      subLabel: 'Lapsed or expired memberships',
      insights: [
        { label: 'At risk', value: '118' },
        { label: 'Recovery est.', value: '₹2.4L' },
      ],
      actionLabel: 'See details',
      actionHref: '/clients?filter=inactive',
    },
  ];

  return (
    <>
      {/* FIX: keyframes moved out of per-render inline style; renamed to avoid
          collisions with any global 'pulse' animation in the app */}
      <style>{`
        @keyframes kpi-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
      <div style={{
        display: 'flex',
        gap: 14,
        alignItems: 'stretch',
      }}>
        {cards.map((card, i) => (
          <KpiCard key={card.id} {...card} loading={loading} delay={i * 0.08} />
        ))}
      </div>
    </>
  );
}
