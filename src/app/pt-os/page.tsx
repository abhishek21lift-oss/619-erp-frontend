'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  UserPlus, Salad, Dumbbell, Calendar, ArrowRight,
  Activity, Users, TrendingUp, Clock, Sparkles,
  ChevronRight, Award, Target, Heart, Zap, BarChart3,
  DollarSign, AlertTriangle, CheckCircle, Download,
  RefreshCw, FileText, Wallet, Percent, Shield,
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

function KpiCard({ icon, label, value, sub, color, delay = 0 }: {
  icon: React.ReactNode; label: string; value: string;
  sub?: string; color: string; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-[20px] p-5"
      style={{
        background: 'var(--bg-card)',
        backdropFilter: 'blur(16px) saturate(180%)',
        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        border: '1px solid rgba(255,255,255,0.95)',
        boxShadow: '0 2px 20px rgba(15,23,42,0.06)',
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[12px] font-[600]" style={{ color: 'rgb(148,163,184)' }}>{label}</p>
          <p className="mt-1 text-[26px] font-[860] tracking-[-0.03em]" style={{ color: 'rgb(15,23,42)' }}>{value}</p>
          {sub && <p className="mt-0.5 text-[11px] font-medium" style={{ color: 'rgb(148,163,184)' }}>{sub}</p>}
        </div>
        <div
          className="flex h-10 w-10 items-center justify-center rounded-[12px] shrink-0"
          style={{ background: `${color}12`, color, boxShadow: `0 0 16px ${color}15` }}
        >
          {icon}
        </div>
      </div>
      <div
        className="absolute bottom-0 left-0 h-0.5 w-full"
        style={{ background: `linear-gradient(90deg, ${color}, transparent)` }}
      />
    </motion.div>
  );
}

function MiniBar({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-[3px] h-10">
      {data.map((v, i) => (
        <div
          key={i}
          className="w-[6px] rounded-t-[3px] transition-all duration-300"
          style={{
            height: `${(v / max) * 100}%`,
            background: `linear-gradient(to top, ${color}88, ${color})`,
            borderRadius: '3px 3px 1px 1px',
          }}
        />
      ))}
    </div>
  );
}

function ChartBar({ pct, color = '#dc2626' }: { pct: number; color?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full" style={{ background: 'var(--border)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(pct, 100)}%`, background: color, boxShadow: `0 0 6px ${color}44` }}
        />
      </div>
      <span className="text-[11px] font-bold tabular-nums w-8 text-right" style={{ color }}>{Math.round(pct)}%</span>
    </div>
  );
}

function PremiumHero() {
  const router = useRouter();
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-[24px] p-8 sm:p-10"
      style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 30%, #1e40af 60%, #0e7490 100%)',
        boxShadow: '0 20px 60px rgba(30,27,75,0.3)',
      }}
    >
      <div
        className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-20"
        style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.6) 0%, transparent 70%)' }}
      />
      <div
        className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full opacity-20"
        style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.6) 0%, transparent 70%)' }}
      />
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-[10px]" style={{ background: 'rgba(255,255,255,0.15)' }}>
              <Sparkles size={16} style={{ color: '#a78bfa' }} />
            </div>
            <span className="text-[11px] font-[650] uppercase tracking-[0.08em]" style={{ color: '#a78bfa' }}>
              PERSONAL TRAINING
            </span>
          </div>
          <h1 className="text-[32px] sm:text-[40px] font-[860] tracking-[-0.03em] leading-tight" style={{ color: '#ffffff' }}>
            Personal Training
            <br />
            <span style={{ background: 'linear-gradient(135deg, #a78bfa, #22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Operating System
            </span>
          </h1>
          <p className="mt-3 max-w-xl text-[14px] sm:text-[15px]" style={{ color: 'var(--text-primary)' }}>
            Manage PT clients, track commissions, process payouts — your complete gym PT business OS.
          </p>
        </div>
        <div className="flex shrink-0 gap-3 flex-wrap">
          <PremiumButton
            tone="primary" glow size="lg"
            icon={<UserPlus size={16} />}
            onClick={() => router.push('/pt-os/new-client')}
            style={{
              background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
              boxShadow: '0 8px 24px rgba(124,58,237,0.3)',
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
    </motion.div>
  );
}

function RevenueChart({ data }: { data: DashData['revenueTrend'] }) {
  if (!data?.length) return null;
  const maxRev = Math.max(...data.map((d) => Number(d.revenue)), 1);
  return (
    <div className="rounded-[20px] p-5" style={{
      background: 'var(--bg-card)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255,255,255,0.90)',
      boxShadow: '0 2px 16px rgba(15,23,42,0.05)',
    }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[14px] font-[700]" style={{ color: 'rgb(15,23,42)' }}>Revenue Trend</h3>
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
      <div className="flex items-end justify-between gap-2 h-32 pt-2">
        {data.map((d, i) => (
          <div key={d.month} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
            <div className="w-full flex flex-col items-center gap-[2px] justify-end h-full">
              <div
                className="w-full rounded-t-[4px] transition-all duration-500"
                style={{
                  height: `${(Number(d.incentives) / maxRev) * 80}%`,
                  background: 'linear-gradient(to top, #dc262688, #dc2626)',
                  minHeight: Number(d.incentives) > 0 ? '4px' : '0px',
                }}
              />
              <div
                className="w-full rounded-t-[4px] transition-all duration-500"
                style={{
                  height: `${((Number(d.revenue) - Number(d.incentives)) / maxRev) * 80}%`,
                  background: 'linear-gradient(to top, #7c3aed88, #7c3aed)',
                  minHeight: (Number(d.revenue) - Number(d.incentives)) > 0 ? '4px' : '0px',
                }}
              />
            </div>
            <span className="text-[8px] font-medium whitespace-nowrap" style={{ color: 'rgb(148,163,184)' }}>
              {d.label?.split(' ')[0]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrainerCard({ t, index }: { t: DashData['trainers'][0]; index: number }) {
  const pct = t.monthly_revenue > 0 ? (t.monthly_commission / t.monthly_revenue) * 100 : 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.35 }}
      className="rounded-[16px] p-4"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid rgba(255,255,255,0.85)',
        boxShadow: '0 1px 8px rgba(15,23,42,0.04)',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[13px] font-[700]" style={{ color: 'rgb(15,23,42)' }}>{t.name}</span>
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-[6px]"
          style={{ background: 'rgba(167,139,250,0.1)', color: '#7c3aed' }}>
          {t.active_clients} clients
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-3">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'rgb(148,163,184)' }}>Monthly PT Rev</p>
          <p className="text-[15px] font-[800] tracking-[-0.02em]" style={{ color: 'rgb(15,23,42)' }}>{fmtINR(t.monthly_revenue)}</p>
        </div>
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'rgb(148,163,184)' }}>Commission</p>
          <p className="text-[15px] font-[800] tracking-[-0.02em]" style={{ color: '#dc2626' }}>{fmtINR(t.monthly_commission)}</p>
        </div>
      </div>
      <div className="mt-2">
        <div className="flex justify-between text-[10px] mb-1">
          <span style={{ color: 'rgb(148,163,184)' }}>Rate</span>
          <span className="font-bold" style={{ color: '#7c3aed' }}>{pct.toFixed(0)}%</span>
        </div>
        <ChartBar pct={pct} color="#7c3aed" />
      </div>
    </motion.div>
  );
}

export default function PtOsDashboard() {
  const router = useRouter();
  const dash = useAsync<DashData>(() => api.pt.dashboard().then((r) => r.data as DashData), []);
  const d = dash.data;

  const features = useMemo(() => [
    { icon: <Target size={20} />, label: 'Goal Tracking', desc: 'Set & monitor client fitness goals' },
    { icon: <Heart size={20} />, label: 'Health Insights', desc: 'AI-powered health analytics' },
    { icon: <Zap size={20} />, label: 'Quick Actions', desc: 'Streamlined daily workflows' },
    { icon: <Award size={20} />, label: 'Progress Reports', desc: 'Detailed transformation tracking' },
  ], []);

  return (
    <Guard>
      <AppShell>
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
          <div className="space-y-6">
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
              />
              <KpiCard
                icon={<TrendingUp size={16} />}
                label="Monthly PT Revenue"
                value={d ? fmtINR(d.total_monthly_pt_revenue) : '—'}
                color="#10b981"
                delay={0.05}
              />
              <KpiCard
                icon={<Percent size={16} />}
                label="Monthly Commission"
                value={d ? fmtINR(d.total_monthly_commission) : '—'}
                color="#dc2626"
                delay={0.1}
              />
              <KpiCard
                icon={<Wallet size={16} />}
                label="Outstanding Dues"
                value={d ? fmtINR(d.total_outstanding) : '—'}
                sub={`${d?.clients_with_balance ?? 0} clients`}
                color="#f59e0b"
                delay={0.15}
              />
              <KpiCard
                icon={<FileText size={16} />}
                label="Commission Rate"
                value={d?.total_monthly_pt_revenue && d.total_monthly_pt_revenue > 0
                  ? `${((d.total_monthly_commission / d.total_monthly_pt_revenue) * 100).toFixed(0)}%`
                  : '—'}
                color="#8b5cf6"
                delay={0.2}
              />
              <KpiCard
                icon={<Shield size={16} />}
                label="Payout Status"
                value={d?.total_monthly_commission && d.total_monthly_commission > 0 ? 'DUE' : 'CLEAR'}
                color={d?.total_monthly_commission && d.total_monthly_commission > 0 ? '#dc2626' : '#10b981'}
                delay={0.25}
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
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-[18px] font-[760] tracking-[-0.02em]" style={{ color: 'rgb(15,23,42)' }}>Quick Actions</h2>
                  <p className="text-[12.5px]" style={{ color: 'rgb(148,163,184)' }}>Frequently used PERSONAL TRAINING features</p>
                </div>
                <ChevronRight size={18} style={{ color: 'rgb(203,213,225)' }} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {QUICK_ACTIONS.map((action, i) => (
                  <QuickActionItem key={action.id} action={action} index={i} router={router} />
                ))}
              </div>
            </div>

            {/* Premium Features */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-[18px] font-[760] tracking-[-0.02em]" style={{ color: 'rgb(15,23,42)' }}>Premium Features</h2>
                  <p className="text-[12.5px]" style={{ color: 'rgb(148,163,184)' }}>Everything you need to run your PT business</p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {features.map((f, i) => (
                  <motion.div
                    key={f.label}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * i, duration: 0.4 }}
                    className="rounded-[16px] p-5 text-center transition-all hover:-translate-y-0.5"
                    style={{
                      background: 'rgba(255,255,255,0.60)',
                      border: '1px solid rgba(255,255,255,0.90)',
                      boxShadow: '0 1px 8px rgba(15,23,42,0.04)',
                    }}
                  >
                    <div
                      className="mx-auto flex h-12 w-12 items-center justify-center rounded-[14px] mb-3"
                      style={{ background: 'linear-gradient(135deg, rgba(167,139,250,0.15), rgba(34,211,238,0.15))', color: '#7c3aed' }}
                    >
                      {f.icon}
                    </div>
                    <h3 className="text-[13px] font-[700]" style={{ color: 'rgb(15,23,42)' }}>{f.label}</h3>
                    <p className="mt-1 text-[11.5px]" style={{ color: 'rgb(148,163,184)' }}>{f.desc}</p>
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 * index, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4, scale: 1.01 }}
      className="group relative cursor-pointer overflow-hidden rounded-[20px] p-6 transition-all"
      style={{
        background: 'var(--bg-card)',
        backdropFilter: 'blur(16px) saturate(180%)',
        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        border: '1px solid rgba(255,255,255,0.95)',
        boxShadow: '0 2px 20px rgba(15,23,42,0.06)',
      }}
      onClick={() => router.push(action.href)}
    >
      <div className="flex items-start justify-between">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-[14px] transition-all duration-300 group-hover:scale-110"
          style={{ background: action.gradient, boxShadow: `0 4px 16px ${action.color}40` }}
        >
          <span style={{ color: '#fff' }}>{action.icon}</span>
        </div>
        <motion.div
          className="flex h-8 w-8 items-center justify-center rounded-[10px]"
          style={{ background: `${action.color}10`, color: action.color }}
          whileHover={{ scale: 1.1, x: 2 }}
        >
          <ArrowRight size={14} />
        </motion.div>
      </div>
      <div className="mt-4">
        <h3 className="text-[16px] font-[760] tracking-[-0.02em]" style={{ color: 'rgb(15,23,42)' }}>{action.label}</h3>
        <p className="mt-1 text-[12.5px]" style={{ color: 'rgb(148,163,184)' }}>{action.desc}</p>
      </div>
      <div
        className="absolute inset-x-0 bottom-0 h-[3px] origin-left scale-x-0 transition-transform duration-300 group-hover:scale-x-100"
        style={{ background: action.gradient }}
      />
    </motion.div>
  );
}
