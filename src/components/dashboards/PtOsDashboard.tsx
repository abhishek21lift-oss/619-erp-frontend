'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Users, TrendingUp,
  RefreshCw, Wallet, Percent,
  ChevronRight, AlertTriangle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
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
const TRAINER_COLORS = ['#7c3aed', '#0284c7', '#059669', '#d97706', '#dc2626', '#8b5cf6'];
const MEDALS = ['🥇', '🥈', '🥉'];
const MEDAL_BG = ['rgba(251,191,36,0.10)', 'rgba(148,163,184,0.09)', 'rgba(180,83,9,0.07)'];
const MEDAL_BORDER = ['rgba(251,191,36,0.30)', 'rgba(148,163,184,0.22)', 'rgba(180,83,9,0.18)'];


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
    <span className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[9px] font-[750] tabular-nums"
      style={{ background: up ? 'rgba(5,150,105,0.12)' : 'rgba(220,38,38,0.12)', color: up ? '#059669' : '#dc2626' }}>
      {up ? '↑' : '↓'} {Math.abs(pct).toFixed(0)}%
    </span>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skel({ w = 'w-full', h = 'h-4', r = 'rounded-xl' }: { w?: string; h?: string; r?: string }) {
  return <div className={`${w} ${h} ${r} animate-pulse`} style={{ background: 'rgba(100,80,200,0.08)' }} />;
}

function SkeletonDash() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-[20px] p-4 space-y-3"
            style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(124,58,237,0.08)', backdropFilter: 'blur(12px)' }}>
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
    </div>
  );
}

// ─── HeroBanner ───────────────────────────────────────────────────────────────
function HeroBanner({ loading, onRefresh }: { d: DashData | null | undefined; loading: boolean; onRefresh: () => void }) {
  const dateStr = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <motion.div
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-[28px]"
      style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #2e1065 22%, #312e81 45%, #1e40af 72%, #0e7490 100%)',
        boxShadow: '0 32px 80px rgba(30,27,75,0.40), 0 8px 32px rgba(67,56,202,0.25), inset 0 1px 0 rgba(255,255,255,0.10)',
      }}
    >
      {/* Decorative background orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full opacity-25"
          style={{ background: 'radial-gradient(circle, #818cf8 0%, transparent 70%)', filter: 'blur(45px)' }} />
        <div className="absolute -bottom-16 -left-16 h-80 w-80 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)', filter: 'blur(55px)' }} />
        <div className="absolute top-1/3 left-1/2 h-56 w-56 rounded-full opacity-12"
          style={{ background: 'radial-gradient(circle, #a78bfa 0%, transparent 70%)', filter: 'blur(40px)' }} />
        {/* Grid mesh */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.07]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="hero-grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.8" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hero-grid)" />
        </svg>
        <div className="absolute inset-0 opacity-[0.035]"
          style={{ background: 'linear-gradient(135deg, transparent 30%, rgba(255,255,255,0.7) 50%, transparent 70%)' }} />
      </div>

      <div className="relative z-10 px-4 py-5 sm:px-8 sm:py-6 flex flex-col items-center text-center">
        {/* Date + refresh */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-white" style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.85, WebkitTextFillColor: 'white' }}>
            {dateStr}
          </span>
          <button onClick={onRefresh} aria-label="Refresh"
            className="rounded-full p-1 transition-colors hover:bg-white/10 text-white"
            style={{ opacity: 0.6, WebkitTextFillColor: 'white' }}>
            <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Main title — full rainbow gradient */}
        <h1 style={{
          fontSize: 'clamp(26px, 5vw, 48px)',
          fontWeight: 900,
          letterSpacing: '-0.04em',
          lineHeight: 1.05,
          background: 'linear-gradient(90deg, #f9a8d4 0%, #c084fc 18%, #818cf8 34%, #38bdf8 50%, #34d399 66%, #fbbf24 82%, #f97316 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          filter: 'drop-shadow(0 0 28px rgba(167,139,250,0.45))',
        }}>
          619 PERSONAL TRAINING
        </h1>

        {/* Subtitle */}
        <p className="mt-2.5" style={{ fontSize: 13, fontWeight: 450, letterSpacing: '0.04em', color: 'rgba(255,255,255,0.50)' }}>
          Professional Client &amp; Fitness Management System
        </p>
      </div>

      {/* Bottom shimmer line */}
      <div className="absolute bottom-0 left-0 right-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(167,139,250,0.7), rgba(147,197,253,0.7), transparent)' }} />
    </motion.div>
  );
}

// ─── AlertBar ─────────────────────────────────────────────────────────────────
function AlertBar({ d }: { d: DashData }) {
  const router = useRouter();
  const alerts: { msg: string; color: string; bg: string; border: string; href: string }[] = [];
  if (d.clients_with_balance > 0)
    alerts.push({
      msg: `${d.clients_with_balance} client${d.clients_with_balance > 1 ? 's' : ''} owe ${fmtINR(d.total_outstanding)} — review balance sheet`,
      color: '#d97706', bg: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(251,191,36,0.05))',
      border: 'rgba(245,158,11,0.25)', href: '/pt-os/balance-sheet',
    });
  if (d.expired_clients > 0)
    alerts.push({
      msg: `${d.expired_clients} PT package${d.expired_clients > 1 ? 's' : ''} expired — consider renewal`,
      color: '#dc2626', bg: 'linear-gradient(135deg, rgba(220,38,38,0.08), rgba(239,68,68,0.05))',
      border: 'rgba(220,38,38,0.22)', href: '/pt-os/clients',
    });
  if (alerts.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {alerts.map((a, i) => (
        <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 + i * 0.08, duration: 0.35 }}
          onClick={() => router.push(a.href)}
          className="flex items-center gap-2.5 rounded-[14px] px-4 py-3 cursor-pointer transition-all hover:scale-[1.005]"
          style={{ background: a.bg, border: `1px solid ${a.border}` }}>
          <AlertTriangle size={13} style={{ color: a.color, flexShrink: 0 }} />
          <p className="text-[11.5px] font-[640] flex-1" style={{ color: a.color }}>{a.msg}</p>
          <ChevronRight size={12} style={{ color: a.color, flexShrink: 0 }} />
        </motion.div>
      ))}
    </div>
  );
}


// ─── StatCard ─────────────────────────────────────────────────────────────────
function StatCard({
  icon, label, value, sub, color, accent, delay = 0, href, trend, pct,
}: {
  icon: React.ReactNode; label: string; value: string;
  sub?: string; color: string; accent: string; delay?: number; href?: string;
  trend?: number[]; pct?: number | null;
}) {
  const router = useRouter();
  const max = trend && trend.length > 0 ? Math.max(...trend, 1) : 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -5, scale: 1.018 }}
      whileTap={{ scale: 0.975 }}
      onClick={() => href && router.push(href)}
      className="group relative cursor-pointer overflow-hidden rounded-[22px] p-4 sm:p-5"
      style={{
        background: `linear-gradient(145deg, ${color}0e 0%, rgba(255,255,255,0.90) 100%)`,
        border: `1px solid ${color}20`,
        boxShadow: `0 4px 24px ${color}0c, 0 1px 4px rgba(0,0,0,0.04)`,
        backdropFilter: 'blur(16px)',
      }}
    >
      {/* Shimmer sweep */}
      <div className="pointer-events-none absolute inset-0 translate-x-[-100%] skew-x-[-12deg] bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-[100%]" />
      {/* Top accent bar */}
      <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-[22px]"
        style={{ background: `linear-gradient(90deg, ${color}, ${accent})` }} />

      <div className="flex items-start justify-between mb-3 pt-1 relative z-10">
        <div className="flex h-9 w-9 items-center justify-center rounded-[11px] transition-all duration-300 group-hover:scale-110 group-hover:rotate-3"
          style={{ background: `linear-gradient(135deg, ${color}, ${accent})`, color: '#fff', boxShadow: `0 4px 14px ${color}30` }}>
          {icon}
        </div>
        {pct !== undefined && <TrendBadge pct={pct ?? null} />}
      </div>

      <div className="relative z-10">
        <p className="text-[9.5px] font-[700] uppercase tracking-[0.1em] mb-1" style={{ color: `${color}99` }}>{label}</p>
        <p className="text-[20px] sm:text-[22px] font-[880] tracking-[-0.03em] leading-none" style={{ color }}>{value}</p>
        {sub && <p className="mt-1.5 text-[10px] font-[500]" style={{ color: 'rgba(100,116,139,0.8)' }}>{sub}</p>}
      </div>

      {trend && trend.length > 0 && (
        <div className="flex items-end gap-[2px] h-8 mt-3 relative z-10">
          {trend.map((v, i) => (
            <motion.div key={i}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: delay + 0.2 + i * 0.04, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1 rounded-t-[3px] origin-bottom"
              style={{
                height: `${Math.max((v / max) * 100, 8)}%`,
                background: i === trend.length - 1
                  ? `linear-gradient(to top, ${color}90, ${color})`
                  : `${color}20`,
              }}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ─── DualChart ────────────────────────────────────────────────────────────────
function DualChart({ data }: { data: DashData['revenueTrend'] }) {
  const [hover, setHover] = useState<number | null>(null);

  if (!data?.length) return (
    <div className="rounded-[22px] p-6 flex items-center justify-center h-[280px]"
      style={{ background: 'rgba(255,255,255,0.80)', border: '1px solid rgba(124,58,237,0.10)', backdropFilter: 'blur(16px)' }}>
      <p className="text-[12px]" style={{ color: 'rgba(100,116,139,0.7)' }}>No revenue data yet</p>
    </div>
  );

  const W = 600, H = 200, PL = 8, PR = 8, PT = 20, PB = 28;
  const cW = W - PL - PR, cH = H - PT - PB;
  const maxRev = Math.max(...data.map(d => Number(d.revenue)), 1);
  const maxInc = Math.max(...data.map(d => Number(d.incentives)), 1);
  const slotW = cW / data.length;
  const barW = slotW * 0.52;

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

  const totalRev  = data.reduce((s, d) => s + Number(d.revenue), 0);
  const totalComm = data.reduce((s, d) => s + Number(d.incentives), 0);

  return (
    <div className="rounded-[22px] p-5 sm:p-6"
      style={{
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(124,58,237,0.10)',
        boxShadow: '0 4px 28px rgba(124,58,237,0.06), 0 1px 4px rgba(0,0,0,0.04)',
      }}>
      <div className="flex flex-wrap items-start justify-between gap-y-2 mb-5">
        <div>
          <h3 className="text-[15px] font-[760] tracking-[-0.01em]" style={{ color: '#0f172a' }}>
            Revenue &amp; Commission
          </h3>
          <p className="text-[11px] mt-0.5 font-[500]" style={{ color: 'rgba(100,116,139,0.8)' }}>
            6-month trend · {fmtINR(totalRev)} collected total
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-6 rounded-full" style={{ background: 'linear-gradient(90deg,#6d28d9,#a78bfa)' }} />
            <span className="text-[9.5px] font-[600]" style={{ color: 'rgba(100,116,139,0.8)' }}>Revenue</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-[2px] w-6 rounded-full" style={{ background: '#e11d48' }} />
            <span className="text-[9.5px] font-[600]" style={{ color: 'rgba(100,116,139,0.8)' }}>Commission</span>
          </div>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="bar-rev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6d28d9" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id="bar-rev-h" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6d28d9" stopOpacity="1" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.7" />
          </linearGradient>
          <filter id="glow-line">
            <feGaussianBlur stdDeviation="1.8" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {[0.25, 0.5, 0.75, 1].map(r => (
          <line key={r} x1={PL} x2={PL + cW}
            y1={PT + cH - r * cH} y2={PT + cH - r * cH}
            stroke="rgba(100,80,200,0.07)" strokeWidth="1" strokeDasharray="4 5" />
        ))}

        {bars.map((b, i) => (
          <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <motion.rect
              x={b.x - barW / 2} width={barW} rx={5} ry={5}
              fill={hover === i ? 'url(#bar-rev-h)' : 'url(#bar-rev)'}
              initial={{ y: PT + cH, height: 0 }}
              animate={{ y: b.barTop, height: b.barH }}
              transition={{ delay: 0.1 + i * 0.07, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            />
            <rect x={b.x - slotW / 2} width={slotW} y={PT} height={cH + PB}
              fill="transparent" style={{ cursor: 'crosshair' }} />
          </g>
        ))}

        <motion.path d={buildLine(bars)} fill="none" stroke="#e11d48" strokeWidth="2.2" strokeLinecap="round"
          filter="url(#glow-line)"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ delay: 0.55, duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
        />
        {bars.map((b, i) => (
          <circle key={i} cx={b.x} cy={b.lineY} r={hover === i ? 5 : 3}
            fill="#e11d48" stroke="#fff" strokeWidth="1.5"
            style={{ transition: 'r 0.15s ease', cursor: 'crosshair' }}
            onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
        ))}

        {hover !== null && bars[hover] && (() => {
          const b = bars[hover];
          const flip = hover > bars.length / 2;
          const tx = flip ? b.x - 58 : b.x - 50;
          return (
            <g>
              <rect x={flip ? b.x - 116 : b.x - 4} y={PT - 8} width={112} height={54} rx={10}
                fill="rgba(15,10,50,0.92)" />
              <text x={tx + 56} y={PT + 10} textAnchor="middle" fill="#e2e8f0" fontSize="10" fontWeight="700">{b.label}</text>
              <text x={tx + 56} y={PT + 25} textAnchor="middle" fill="#c4b5fd" fontSize="11" fontWeight="800">{fmtINR(b.revenue)}</text>
              <text x={tx + 56} y={PT + 38} textAnchor="middle" fill="#fda4af" fontSize="9.5" fontWeight="600">
                Comm: {fmtINR(b.incentives)}
              </text>
            </g>
          );
        })()}

        {bars.map((b, i) => (
          <text key={i} x={b.x} y={H - 2} textAnchor="middle"
            fill={hover === i ? '#6d28d9' : 'rgba(100,116,139,0.7)'}
            fontSize="9" fontWeight="600" style={{ transition: 'fill 0.15s' }}>
            {b.label}
          </text>
        ))}
      </svg>

      <div className="flex flex-wrap gap-2.5 mt-4 pt-4" style={{ borderTop: '1px solid rgba(100,80,200,0.08)' }}>
        {[
          { label: '6M Revenue',    value: fmtINR(totalRev),           color: '#6d28d9', bg: 'rgba(109,40,217,0.07)'  },
          { label: '6M Commission', value: fmtINR(totalComm),          color: '#e11d48', bg: 'rgba(225,29,72,0.07)'   },
          { label: '6M Net',        value: fmtINR(totalRev - totalComm), color: '#059669', bg: 'rgba(5,150,105,0.07)' },
        ].map(s => (
          <div key={s.label} className="flex-1 min-w-[90px] rounded-[12px] p-3" style={{ background: s.bg }}>
            <p className="text-[8px] font-[700] uppercase tracking-[0.1em] mb-0.5" style={{ color: `${s.color}99` }}>{s.label}</p>
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
    <div className="rounded-[22px] p-5 flex flex-col h-full"
      style={{
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(124,58,237,0.10)',
        boxShadow: '0 4px 24px rgba(124,58,237,0.06), 0 1px 4px rgba(0,0,0,0.04)',
      }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[15px] font-[760] tracking-[-0.01em]" style={{ color: '#0f172a' }}>Trainer Rankings</h3>
          <p className="text-[11px] font-[500] mt-0.5" style={{ color: 'rgba(100,116,139,0.8)' }}>This month · by revenue</p>
        </div>
        <button onClick={onRefetch} className="rounded-full p-1.5 transition-colors hover:bg-purple-50" aria-label="Refresh">
          <RefreshCw size={13} style={{ color: 'rgba(124,58,237,0.5)' }} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 flex-1">
          <p className="text-[12px]" style={{ color: 'rgba(100,116,139,0.7)' }}>No trainer data yet</p>
        </div>
      ) : (
        <div className="space-y-2.5 flex-1">
          {sorted.map((t, i) => {
            const color = TRAINER_COLORS[i % TRAINER_COLORS.length];
            const commPct = t.monthly_revenue > 0 ? (t.monthly_commission / t.monthly_revenue) * 100 : 0;
            const revPct = (t.monthly_revenue / topRevenue) * 100;
            const initials = t.name.split(' ').map((s: string) => s[0]).join('').slice(0, 2).toUpperCase();
            const isTop3 = i < 3;

            return (
              <motion.div key={t.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07, duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
                className="rounded-[14px] p-3.5"
                style={{
                  background: isTop3 ? MEDAL_BG[i] : `${color}06`,
                  border: `1px solid ${isTop3 ? MEDAL_BORDER[i] : `${color}15`}`,
                }}>
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-5 text-center shrink-0">
                    {isTop3
                      ? <span className="text-[14px]">{MEDALS[i]}</span>
                      : <span className="text-[10px] font-[760]" style={{ color: 'rgba(100,116,139,0.6)' }}>#{i + 1}</span>}
                  </div>
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] text-[10px] font-[820] text-white"
                    style={{ background: `linear-gradient(135deg,${color},${color}bb)`, boxShadow: `0 3px 8px ${color}28` }}>
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-[720] truncate" style={{ color: '#0f172a' }}>{t.name}</p>
                    <p className="text-[9px] font-[500]" style={{ color: 'rgba(100,116,139,0.7)' }}>
                      {t.active_clients} active client{t.active_clients !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[12px] font-[820] tracking-tight" style={{ color }}>{fmtINR(t.monthly_revenue)}</p>
                    <p className="text-[9px] font-[640]" style={{ color: '#e11d48' }}>{fmtINR(t.monthly_commission)} comm.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: `${color}15` }}>
                    <motion.div className="h-full rounded-full" style={{ background: `linear-gradient(90deg,${color},${color}88)` }}
                      initial={{ width: 0 }} animate={{ width: `${revPct}%` }}
                      transition={{ delay: 0.3 + i * 0.07, duration: 0.55, ease: [0.16, 1, 0.3, 1] }} />
                  </div>
                  <span className="text-[8.5px] font-[650] shrink-0" style={{ color: 'rgba(100,116,139,0.6)' }}>
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
    <div className="relative mx-auto w-full max-w-7xl pt-2 pb-24 sm:pt-3 sm:pb-8">
      {/* Subtle page-level ambient color wash */}
      <div className="pointer-events-none fixed inset-0" style={{ zIndex: 0 }}>
        <div className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 70% 50% at 20% 10%, rgba(124,58,237,0.05) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 80% 80%, rgba(2,132,199,0.04) 0%, transparent 60%)' }} />
      </div>

      <div className="relative space-y-5" style={{ zIndex: 1 }}>

        {/* ── Premium Hero Banner ── */}
        <HeroBanner d={d} loading={dash.loading} onRefresh={dash.refetch} />

        {/* ── Alerts ── */}
        {d && <AlertBar d={d} />}

        {/* ── Skeleton ── */}
        {dash.loading && !d && <SkeletonDash />}

        {d && (
          <>
            {/* ── KPI Cards ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <StatCard
                icon={<Users size={15} />}
                label="Active PT Clients" value={d.active_pt_clients.toLocaleString()}
                sub={`${d.expired_clients} expired`}
                color="#7c3aed" accent="#a78bfa"
                delay={0} href="/pt-os/clients"
                trend={revTrend} pct={revMoM}
              />
              <StatCard
                icon={<TrendingUp size={15} />}
                label="Monthly Revenue" value={fmtINR(d.total_monthly_pt_revenue)}
                color="#059669" accent="#34d399"
                delay={0.06} href="/pt-os/reports"
                trend={revTrend} pct={revMoM}
              />
              <StatCard
                icon={<Percent size={15} />}
                label="Commission" value={fmtINR(d.total_monthly_commission)}
                sub={commRate}
                color="#e11d48" accent="#fb7185"
                delay={0.12} href="/pt-os/commissions"
                trend={incTrend} pct={incMoM}
              />
              <StatCard
                icon={<TrendingUp size={15} />}
                label="Net Revenue" value={fmtINR(netRevenue)}
                color="#0284c7" accent="#38bdf8"
                delay={0.18} href="/pt-os/reports"
                trend={revTrend.map((r, i) => Math.max(0, r - (incTrend[i] ?? 0)))}
                pct={revMoM}
              />
              <StatCard
                icon={<Wallet size={15} />}
                label="Outstanding Dues" value={fmtINR(d.total_outstanding)}
                sub={`${d.clients_with_balance} client${d.clients_with_balance !== 1 ? 's' : ''}`}
                color="#d97706" accent="#fbbf24"
                delay={0.24} href="/pt-os/balance-sheet"
                trend={[]} pct={null}
              />
            </div>

            {/* ── Chart + Rankings ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2"><DualChart data={d.revenueTrend} /></div>
              <div>
                <TrainerRanking trainers={d.trainers} onRefetch={dash.refetch} loading={dash.loading} />
              </div>
            </div>

          </>
        )}
      </div>
    </div>
  );
}
