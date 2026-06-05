'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  UserPlus, Salad, Dumbbell, Calendar, ArrowRight,
  Activity, Users, TrendingUp, Clock, Sparkles,
  ChevronRight, Award, Target, Heart, Zap, BarChart3,
  DollarSign, AlertTriangle, CheckCircle, Download,
  RefreshCw, FileText, Wallet, Percent, Shield, Eye,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { PremiumButton } from '@/components/premium/PremiumButton';
import { useAsync } from '@/lib/use-async';
import { api } from '@/lib/api';

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

const QUICK_ACTIONS = [
  {
    id: 'new-client',
    label: 'New Client',
    desc: 'Onboard a new PT client',
    icon: <UserPlus size={22} />,
    href: '/pt-os/new-client',
    color: '#dc2626',
    gradient: 'linear-gradient(135deg, #dc2626, #b91c1c)',
  },
  {
    id: 'diet-plans',
    label: 'Diet Plans',
    desc: 'Create & manage meal plans',
    icon: <Salad size={22} />,
    href: '/pt-os/diet-plans',
    color: '#10b981',
    gradient: 'linear-gradient(135deg, #10b981, #059669)',
  },
  {
    id: 'workout-plans',
    label: 'Workout Plans',
    desc: 'Design training programs',
    icon: <Dumbbell size={22} />,
    href: '/pt-os/workout-plans',
    color: '#8b5cf6',
    gradient: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
  },
  {
    id: 'schedule-session',
    label: 'Schedule Session',
    desc: 'Book PT sessions',
    icon: <Calendar size={22} />,
    href: '/pt-os/schedule-session',
    color: '#f59e0b',
    gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
  },
];

function fmtINR(n: number | string | null | undefined) {
  return '₹' + Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function MiniSparkline({ color }: { color: string }) {
  const bars = useMemo(() =>
    Array.from({ length: 12 }, () => Math.random() * 100),
  []);
  const max = Math.max(...bars, 1);
  return (
    <div className="flex items-end gap-[2px] h-8 mt-3">
      {bars.map((v, i) => (
        <motion.div
          key={i}
          initial={{ height: 0 }}
          animate={{ height: `${(v / max) * 100}%` }}
          transition={{ delay: 0.3 + i * 0.03, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="w-[5px] rounded-t-[2px]"
          style={{ background: `linear-gradient(to top, ${color}66, ${color})` }}
        />
      ))}
    </div>
  );
}

function KpiCard({ icon, label, value, sub, color, delay = 0, href }: {
  icon: React.ReactNode; label: string; value: string;
  sub?: string; color: string; delay?: number; href?: string;
}) {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -5, scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => href && router.push(href)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group relative cursor-pointer overflow-hidden rounded-[22px] p-5"
      style={{
        background: `linear-gradient(145deg, ${color}06, var(--bg-card), ${color}04)`,
        backdropFilter: 'blur(18px) saturate(180%)',
        WebkitBackdropFilter: 'blur(18px) saturate(180%)',
        border: '1px solid rgba(255,255,255,0.92)',
        boxShadow: [
          '0 2px 24px rgba(15,23,42,0.06)',
          hovered ? `0 8px 40px ${color}20` : '',
        ].filter(Boolean).join(', '),
        transition: 'box-shadow 0.3s ease',
      }}
    >
      <div
        className="pointer-events-none absolute -inset-px rounded-[22px] opacity-0 transition-opacity duration-500"
        style={{
          opacity: hovered ? 1 : 0,
          boxShadow: `inset 0 0 30px ${color}10`,
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 translate-x-[-100%] skew-x-[-12deg] bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-[100%]"
      />
      <div className="flex items-start justify-between relative z-10">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-[650] uppercase tracking-[0.06em]" style={{ color: 'rgb(148,163,184)' }}>{label}</p>
          <p className="mt-1 text-[26px] font-[860] tracking-[-0.03em]" style={{ color: `${color}dd` }}>{value}</p>
          {sub && <p className="mt-0.5 text-[11px] font-medium" style={{ color: 'rgb(148,163,184)' }}>{sub}</p>}
        </div>
        <div
          className="flex h-11 w-11 items-center justify-center rounded-[14px] shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg"
          style={{
            background: `linear-gradient(135deg, ${color}, ${color}cc)`,
            color: '#fff',
            boxShadow: `0 4px 16px ${color}30`,
          }}
        >
          {icon}
        </div>
      </div>
      <div className="relative z-10">
        <MiniSparkline color={color} />
      </div>
      <div
        className="absolute bottom-0 left-0 h-[3px] w-full rounded-full"
        style={{ background: `linear-gradient(90deg, ${color}, ${color}44, transparent)`, boxShadow: `0 0 8px ${color}40` }}
      />
    </motion.div>
  );
}

function PremiumHero() {
  const router = useRouter();
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-[28px] p-10 sm:p-12"
      style={{
        background: 'linear-gradient(145deg, #0f0c29 0%, #1a1440 25%, #1e1b4b 50%, #1e40af 75%, #0e7490 100%)',
        boxShadow: '0 24px 80px rgba(30,27,75,0.35)',
      }}
    >
      {/* Grid pattern overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      {/* Gradient orbs */}
      <motion.div
        className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full opacity-30"
        style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.5) 0%, transparent 70%)' }}
        animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.4, 0.3] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="pointer-events-none absolute -bottom-32 -left-24 h-96 w-96 rounded-full opacity-25"
        style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.4) 0%, transparent 70%)' }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.25, 0.35, 0.25] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="pointer-events-none absolute top-1/2 left-1/3 h-40 w-40 rounded-full opacity-20"
        style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.4) 0%, transparent 70%)' }}
        animate={{ scale: [1, 1.2, 1], x: [0, 20, 0], y: [0, -20, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Glass accent bar */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-purple-400 to-cyan-400 opacity-60" />
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-[10px]" style={{ background: 'rgba(255,255,255,0.12)' }}>
              <Sparkles size={15} style={{ color: '#a78bfa' }} />
            </div>
            <span className="text-[10px] font-[700] uppercase tracking-[0.1em]" style={{ color: '#a78bfa' }}>
              PERSONAL TRAINING
            </span>
          </div>
          <h1 className="text-[34px] sm:text-[44px] font-[860] tracking-[-0.03em] leading-[1.1]" style={{ color: '#ffffff' }}>
            Personal Training
            <br />
            <span style={{ background: 'linear-gradient(135deg, #c4b5fd, #67e8f9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Operating System
            </span>
          </h1>
          <p className="mt-3 max-w-xl text-[14.5px] sm:text-[15.5px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>
            Manage PT clients, track commissions, process payouts — your complete gym PT business OS.
          </p>
          <div className="mt-5 flex gap-3">
            <PremiumButton
              tone="primary" glow size="lg"
              icon={<UserPlus size={16} />}
              onClick={() => router.push('/pt-os/new-client')}
              style={{
                background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
                boxShadow: '0 8px 32px rgba(124,58,237,0.35)',
              }}
            >
              New Client
            </PremiumButton>
            <PremiumButton
              tone="secondary" size="lg"
              icon={<BarChart3 size={16} />}
              onClick={() => router.push('/pt-os/clients')}
              className="!bg-white/10 !text-white !border-white/20 hover:!bg-white/20"
            >
              All Clients
            </PremiumButton>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function RevenueChart({ data }: { data: DashData['revenueTrend'] }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  if (!data?.length) return null;
  const maxRev = Math.max(...data.map((d) => Number(d.revenue)), 1);
  const w = 600, h = 180, padL = 0, padR = 0, padT = 10, padB = 20;
  const chartW = w - padL - padR, chartH = h - padT - padB;
  const points = data.map((d, i) => ({
    x: padL + (i / Math.max(data.length - 1, 1)) * chartW,
    y: padT + chartH - (Number(d.revenue) / maxRev) * chartH,
    label: d.label?.split(' ')[0] || '',
    revenue: Number(d.revenue),
    incentives: Number(d.incentives),
  }));
  function buildPath(pts: typeof points, smooth = true): string {
    if (pts.length === 0) return '';
    let d = `M${pts[0].x},${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      if (smooth) {
        const cx = (pts[i].x + pts[i - 1].x) / 2;
        d += ` C${cx},${pts[i - 1].y} ${cx},${pts[i].y} ${pts[i].x},${pts[i].y}`;
      } else {
        d += ` L${pts[i].x},${pts[i].y}`;
      }
    }
    return d;
  }
  const areaPath = buildPath(points) +
    ` L${points[points.length - 1].x},${padT + chartH} L${points[0].x},${padT + chartH} Z`;
  const gradientId = 'rev-grad';
  return (
    <div className="rounded-[22px] p-6" style={{
      background: 'var(--bg-card)',
      backdropFilter: 'blur(14px)',
      border: '1px solid rgba(255,255,255,0.92)',
      boxShadow: '0 4px 24px rgba(15,23,42,0.06)',
    }}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-[15px] font-[760] tracking-[-0.01em]" style={{ color: 'rgb(15,23,42)' }}>Revenue Trend</h3>
          <p className="text-[11px] font-medium mt-0.5" style={{ color: 'rgb(148,163,184)' }}>
            Monthly PT revenue over time
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#7c3aed' }} />
            <span className="text-[10px] font-medium" style={{ color: 'rgb(148,163,184)' }}>Revenue</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#dc2626' }} />
            <span className="text-[10px] font-medium" style={{ color: 'rgb(148,163,184)' }}>Incentives</span>
          </div>
        </div>
      </div>
      <div className="relative">
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.02" />
            </linearGradient>
            <filter id="rev-glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          {/* Grid lines */}
          {[0, 0.33, 0.67, 1].map((ratio) => (
            <line key={ratio} x1={padL} y1={padT + chartH - ratio * chartH} x2={padL + chartW} y2={padT + chartH - ratio * chartH}
              stroke="rgba(15,23,42,0.06)" strokeWidth="1" strokeDasharray="4 4" />
          ))}
          {/* Area fill */}
          <motion.path
            d={areaPath}
            fill={`url(#${gradientId})`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
          />
          {/* Line */}
          <motion.path
            d={buildPath(points)}
            fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            filter="url(#rev-glow)"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          />
          {/* Data points */}
          {points.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={hoverIdx === i ? 6 : 3} fill="#7c3aed"
                stroke="#fff" strokeWidth="2"
                style={{ transition: 'r 0.15s ease', cursor: 'pointer' }}
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx(null)}
              />
              {hoverIdx === i && (
                <g>
                  <rect x={p.x - 45} y={p.y - 42} width={90} height={32} rx={8} fill="#1e1b4b" opacity={0.95} />
                  <text x={p.x} y={p.y - 28} textAnchor="middle" fill="#c4b5fd" fontSize="11" fontWeight="700">
                    ₹{p.revenue.toLocaleString('en-IN')}
                  </text>
                  <text x={p.x} y={p.y - 16} textAnchor="middle" fill="#fca5a5" fontSize="9" fontWeight="600">
                    +₹{p.incentives.toLocaleString('en-IN')} incentives
                  </text>
                  <text x={p.x} y={padT + chartH + 16} textAnchor="middle" fill="rgb(148,163,184)" fontSize="9" fontWeight="600">
                    {p.label}
                  </text>
                </g>
              )}
            </g>
          ))}
        </svg>
        {/* Month labels */}
        <div className="flex justify-between px-1 mt-1">
          {data.map((d, i) => (
            <span key={d.month}
              className="text-[8.5px] font-medium"
              style={{ color: hoverIdx === i ? '#7c3aed' : 'rgb(148,163,184)', transition: 'color 0.15s' }}
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
            >
              {d.label?.split(' ')[0]}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function TrainerDonut({ pct, color = '#7c3aed' }: { pct: number; color?: string }) {
  const s = 44, r = 16, sw = 4, circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(pct, 100) / 100);
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
      <circle cx={s / 2} cy={s / 2} r={r} fill="none" stroke="rgba(15,23,42,0.06)" strokeWidth={sw} />
      <motion.circle cx={s / 2} cy={s / 2} r={r} fill="none" stroke={color} strokeWidth={sw}
        strokeLinecap="round" strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        transform={`rotate(-90 ${s / 2} ${s / 2})`}
      />
      <text x={s / 2} y={s / 2} textAnchor="middle" dominantBaseline="central" fill={color}
        fontSize="9" fontWeight="900" fontFamily="var(--font-sans, system-ui, sans-serif)">
        {Math.round(pct)}%
      </text>
    </svg>
  );
}

const TRAINER_COLORS = ['#7c3aed', '#06b6d4', '#10b981', '#f59e0b', '#dc2626', '#8b5cf6'];

function TrainerCard({ t, index }: { t: DashData['trainers'][0]; index: number }) {
  const pct = t.monthly_revenue > 0 ? (t.monthly_commission / t.monthly_revenue) * 100 : 0;
  const color = TRAINER_COLORS[index % TRAINER_COLORS.length];
  const initials = t.name.split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase();
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -2, scale: 1.01 }}
      className="rounded-[18px] p-4 transition-all"
      style={{
        background: `linear-gradient(145deg, ${color}04, var(--bg-card), ${color}03)`,
        border: '1px solid rgba(255,255,255,0.88)',
        boxShadow: '0 2px 12px rgba(15,23,42,0.04)',
      }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-[12px] text-white text-[12px] font-[800] shrink-0"
          style={{ background: `linear-gradient(135deg, ${color}, ${color}bb)`, boxShadow: `0 4px 12px ${color}30` }}>
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-[700] truncate" style={{ color: 'rgb(15,23,42)' }}>{t.name}</p>
          <p className="text-[10px] font-medium" style={{ color: 'rgb(148,163,184)' }}>{t.active_clients} active clients</p>
        </div>
        <TrainerDonut pct={pct} color={color} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-[12px] p-2.5" style={{ background: `${color}08` }}>
          <p className="text-[8px] font-semibold uppercase tracking-[0.08em]" style={{ color: 'rgb(148,163,184)' }}>PT Revenue</p>
          <p className="text-[14px] font-[800] tracking-[-0.02em]" style={{ color }}>{fmtINR(t.monthly_revenue)}</p>
        </div>
        <div className="rounded-[12px] p-2.5" style={{ background: 'rgba(220,38,38,0.06)' }}>
          <p className="text-[8px] font-semibold uppercase tracking-[0.08em]" style={{ color: 'rgb(148,163,184)' }}>Commission</p>
          <p className="text-[14px] font-[800] tracking-[-0.02em]" style={{ color: '#dc2626' }}>{fmtINR(t.monthly_commission)}</p>
        </div>
      </div>
    </motion.div>
  );
}

function AmbientOrbs() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" style={{ zIndex: 0 }}>
      <motion.div
        className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full opacity-20"
        style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.4) 0%, transparent 70%)' }}
        animate={{ x: [0, 60, 0], y: [0, -40, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -bottom-60 -right-40 h-[600px] w-[600px] rounded-full opacity-15"
        style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.35) 0%, transparent 70%)' }}
        animate={{ x: [0, -80, 0], y: [0, 60, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-1/3 right-1/4 h-[350px] w-[350px] rounded-full opacity-10"
        style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.3) 0%, transparent 70%)' }}
        animate={{ x: [0, 50, 0], y: [0, -60, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-1/4 left-1/3 h-[250px] w-[250px] rounded-full opacity-10"
        style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.3) 0%, transparent 70%)' }}
        animate={{ x: [0, -40, 0], y: [0, 50, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}

export default function PtOsDashboard() {
  const router = useRouter();
  const dash = useAsync<DashData>(() => api.pt.dashboard().then((r) => r.data as DashData), []);
  const d = dash.data;

  const features = useMemo(() => [
    { icon: <Target size={22} />, label: 'Goal Tracking', desc: 'Set & monitor client fitness goals', href: '/pt-os/goals', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#f59e0b' },
    { icon: <Heart size={22} />, label: 'Health Insights', desc: 'AI-powered health analytics', href: '/pt-os/assessment', gradient: 'linear-gradient(135deg, #dc2626, #b91c1c)', color: '#dc2626' },
    { icon: <Zap size={22} />, label: 'Quick Actions', desc: 'Streamlined daily workflows', href: '/pt-os/weekly-checkin', gradient: 'linear-gradient(135deg, #10b981, #059669)', color: '#10b981' },
    { icon: <Award size={22} />, label: 'Progress Reports', desc: 'Detailed transformation tracking', href: '/pt-os/progress-photos', gradient: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', color: '#8b5cf6' },
  ], []);

  return (
    <Guard>
      <AppShell>
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 relative" style={{ zIndex: 1 }}>
          <AmbientOrbs />
          <div className="space-y-6 relative" style={{ zIndex: 2 }}>
            <PremiumHero />

            {/* KPI Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <KpiCard
                icon={<Users size={16} />}
                label="Active PT Clients"
                value={d?.active_pt_clients?.toLocaleString() ?? '—'}
                sub={`${d?.expired_clients ?? 0} expired`}
                color="#7c3aed"
                delay={0}
                href="/pt-os/clients"
              />
              <KpiCard
                icon={<TrendingUp size={16} />}
                label="Monthly PT Revenue"
                value={d ? fmtINR(d.total_monthly_pt_revenue) : '—'}
                color="#10b981"
                delay={0.05}
                href="/pt-os/reports"
              />
              <KpiCard
                icon={<Percent size={16} />}
                label="Monthly Commission"
                value={d ? fmtINR(d.total_monthly_commission) : '—'}
                color="#dc2626"
                delay={0.1}
                href="/pt-os/commissions"
              />
              <KpiCard
                icon={<Wallet size={16} />}
                label="Outstanding Dues"
                value={d ? fmtINR(d.total_outstanding) : '—'}
                sub={`${d?.clients_with_balance ?? 0} clients`}
                color="#f59e0b"
                delay={0.15}
                href="/pt-os/balance-sheet"
              />
              <KpiCard
                icon={<FileText size={16} />}
                label="Commission Rate"
                value={d?.total_monthly_pt_revenue && d.total_monthly_pt_revenue > 0
                  ? `${((d.total_monthly_commission / d.total_monthly_pt_revenue) * 100).toFixed(0)}%`
                  : '—'}
                color="#8b5cf6"
                delay={0.2}
                href="/pt-os/commissions"
              />
              <KpiCard
                icon={<Shield size={16} />}
                label="Payout Status"
                value={d?.total_monthly_commission && d.total_monthly_commission > 0 ? 'DUE' : 'CLEAR'}
                color={d?.total_monthly_commission && d.total_monthly_commission > 0 ? '#dc2626' : '#10b981'}
                delay={0.25}
                href="/pt-os/commissions"
              />
            </div>

            {/* Revenue Chart + Trainer Performance */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <RevenueChart data={d?.revenueTrend ?? []} />
              </div>
              <div>
                <div className="rounded-[20px] p-5" style={{
                  background: 'var(--bg-card)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.90)',
                  boxShadow: '0 2px 16px rgba(15,23,42,0.05)',
                }}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[14px] font-[700]" style={{ color: 'rgb(15,23,42)' }}>Trainers</h3>
                    <RefreshCw
                      size={14}
                      className="cursor-pointer"
                      style={{ color: 'rgb(148,163,184)' }}
                      onClick={() => dash.refetch()}
                    />
                  </div>
                  <div className="space-y-3">
                    {d?.trainers?.map((t, i) => (
                      <TrainerCard key={t.id} t={t} index={i} />
                    ))}
                    {(!d?.trainers || d.trainers.length === 0) && (
                      <p className="text-[12px] text-center py-4" style={{ color: 'rgb(148,163,184)' }}>
                        No active trainers with PT clients
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-7 w-1 rounded-full" style={{ background: 'linear-gradient(180deg, #7c3aed, #06b6d4)' }} />
                <div className="flex-1">
                  <h2 className="text-[20px] font-[800] tracking-[-0.02em]" style={{ color: 'rgb(15,23,42)' }}>Quick Actions</h2>
                  <p className="text-[12.5px]" style={{ color: 'rgb(148,163,184)' }}>Frequently used PERSONAL TRAINING features</p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {QUICK_ACTIONS.map((action, i) => (
                  <QuickActionItem key={action.id} action={action} index={i} router={router} />
                ))}
              </div>
            </div>

            {/* Premium Features */}
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="flex h-7 w-1 rounded-full" style={{ background: 'linear-gradient(180deg, #f59e0b, #8b5cf6)' }} />
                <div className="flex-1">
                  <h2 className="text-[20px] font-[800] tracking-[-0.02em]" style={{ color: 'rgb(15,23,42)' }}>Premium Features</h2>
                  <p className="text-[13px]" style={{ color: 'rgb(148,163,184)' }}>Everything you need to run your PT business</p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
                {features.map((f, i) => (
                  <motion.div
                    key={f.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08 * i, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    whileHover={{ y: -6, scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => router.push(f.href)}
                    className="group relative cursor-pointer overflow-hidden rounded-[24px] p-7 text-center"
                    style={{
                      background: 'var(--bg-card)',
                      backdropFilter: 'blur(20px) saturate(180%)',
                      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                      border: '1px solid rgba(255,255,255,0.92)',
                      boxShadow: [
                        '0 4px 24px rgba(15,23,42,0.06)',
                        '0 1px 4px rgba(15,23,42,0.04)',
                      ].join(', '),
                    }}
                  >
                    <div className="pointer-events-none absolute inset-0 translate-x-[-100%] skew-x-[-12deg] bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-[100%]" />
                    <div
                      className="mx-auto flex h-14 w-14 items-center justify-center rounded-[18px] mb-4 transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl"
                      style={{
                        background: f.gradient,
                        color: '#fff',
                        boxShadow: `0 8px 24px ${f.color}35`,
                      }}
                    >
                      {f.icon}
                    </div>
                    <h3 className="text-[15px] font-[760] tracking-[-0.01em]" style={{ color: 'rgb(15,23,42)' }}>{f.label}</h3>
                    <p className="mt-1.5 text-[12px] leading-relaxed" style={{ color: 'rgb(148,163,184)' }}>{f.desc}</p>
                    <div
                      className="absolute inset-x-6 bottom-0 h-[3px] origin-left scale-x-0 rounded-full transition-transform duration-300 group-hover:scale-x-100"
                      style={{ background: f.gradient }}
                    />
                    <div
                      className="pointer-events-none absolute -inset-1 rounded-[26px] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                      style={{
                        background: `${f.color}08`,
                        boxShadow: `inset 0 0 30px ${f.color}10`,
                      }}
                    />
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Loading */}
            {dash.loading && !dash.data && (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full" />
              </div>
            )}
          </div>
        </div>
      </AppShell>
    </Guard>
  );
}

function QuickActionItem({ action, index, router }: {
  action: typeof QUICK_ACTIONS[number]; index: number;
  router: ReturnType<typeof useRouter>;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 * index, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -6, scale: 1.015 }}
      whileTap={{ scale: 0.97 }}
      className="group relative cursor-pointer overflow-hidden rounded-[22px] p-6"
      style={{
        background: 'var(--bg-card)',
        backdropFilter: 'blur(18px) saturate(180%)',
        WebkitBackdropFilter: 'blur(18px) saturate(180%)',
        border: '1px solid rgba(255,255,255,0.92)',
        boxShadow: '0 4px 24px rgba(15,23,42,0.06)',
      }}
      onClick={() => router.push(action.href)}
    >
      <div
        className="pointer-events-none absolute inset-0 translate-x-[-100%] skew-x-[-12deg] bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-[100%]"
      />
      <div className="flex items-start justify-between relative z-10">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-[16px] transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl"
          style={{ background: action.gradient, boxShadow: `0 6px 20px ${action.color}40` }}
        >
          <span style={{ color: '#fff' }}>{action.icon}</span>
        </div>
        <motion.div
          className="flex h-8 w-8 items-center justify-center rounded-[10px]"
          style={{ background: `${action.color}10`, color: action.color }}
          whileHover={{ scale: 1.15, x: 3 }}
        >
          <ArrowRight size={14} />
        </motion.div>
      </div>
      <div className="mt-5 relative z-10">
        <h3 className="text-[16px] font-[760] tracking-[-0.02em]" style={{ color: 'rgb(15,23,42)' }}>{action.label}</h3>
        <p className="mt-1 text-[12.5px]" style={{ color: 'rgb(148,163,184)' }}>{action.desc}</p>
      </div>
      <div
        className="absolute inset-x-0 bottom-0 h-[3px] origin-left scale-x-0 rounded-full transition-transform duration-300 group-hover:scale-x-100"
        style={{ background: action.gradient }}
      />
    </motion.div>
  );
}
