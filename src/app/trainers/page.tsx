'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { m, AnimatePresence } from 'framer-motion';
import {
  Award, Users, TrendingUp, Star, Search, Plus, RefreshCw,
  Phone, ChevronRight, Edit3, UserCheck,
  DollarSign, Target, Sparkles,
  Crown, Zap, Activity,
} from 'lucide-react';
import { CopyId } from '@/components/ui/CopyId';
import AppShell from '@/components/AppShell';
import Guard from '@/components/Guard';
import { KpiCard } from '@/components/ui/KpiCard';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/components/ui/cn';
import { PremiumBarChart } from '@/components/ui';
import { api, type Trainer } from '@/lib/api';

function initials(name: string) {
  return (name || '?').split(' ').filter(Boolean).map(p => p[0]).join('').slice(0, 2).toUpperCase();
}

function fmtINR(n: number | string | null | undefined) {
  const v = typeof n === 'string' ? parseFloat(n) : (n ?? 0);
  if (!Number.isFinite(v)) return '₹0';
  return '₹' + v.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

const GRADIENTS = [
  'linear-gradient(135deg, #2563EB, #7C3AED)',
  'linear-gradient(135deg, #10B981, #06B6D4)',
  'linear-gradient(135deg, #F97316, #EC4899)',
  'linear-gradient(135deg, #7C3AED, #06B6D4)',
  'linear-gradient(135deg, #2563EB, #10B981)',
  'linear-gradient(135deg, #EC4899, #F97316)',
  'linear-gradient(135deg, #06B6D4, #7C3AED)',
  'linear-gradient(135deg, #F97316, #2563EB)',
];

const RANK_COLORS: Record<number, { bg: string; text: string; glow: string; label: string }> = {
  0: { bg: 'rgba(255,215,0,0.12)', text: '#F59E0B', glow: '0 0 20px rgba(255,215,0,0.25)', label: '🥇' },
  1: { bg: 'rgba(192,192,192,0.10)', text: '#94A3B8', glow: '0 0 16px rgba(192,192,192,0.15)', label: '🥈' },
  2: { bg: 'rgba(205,127,50,0.10)', text: '#CD7F32', glow: '0 0 16px rgba(205,127,50,0.15)', label: '🥉' },
};

function GlassPanel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(
      'rounded-[24px] border border-white/60 bg-white/70 backdrop-blur-xl',
      'shadow-[0_4px_24px_rgba(15,23,42,0.06)]',
      className,
    )}>
      {children}
    </div>
  );
}

function MiniSparkline({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-[2px] h-8">
      {values.map((v, i) => (
        <div
          key={i}
          className="w-[3px] rounded-full transition-all duration-300"
          style={{
            height: `${(v / max) * 100}%`,
            background: `linear-gradient(to top, ${color}88, ${color})`,
            opacity: 0.6 + (v / max) * 0.4,
          }}
        />
      ))}
    </div>
  );
}

function TrainerCard({ trainer, index }: { trainer: Trainer; index: number }) {
  const gradient = GRADIENTS[index % GRADIENTS.length];
  const isActive = trainer.is_active !== false;
  const specialty = trainer.specialization || trainer.specialty || trainer.role || 'Personal Trainer';
  const retention = trainer.total_clients && trainer.active_clients
    ? Math.round((trainer.active_clients / trainer.total_clients) * 100) : null;

  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="group relative"
    >
      <div className={cn(
        'relative overflow-hidden rounded-[24px] border border-white/60 bg-white/70 backdrop-blur-xl p-5',
        'shadow-[0_4px_24px_rgba(15,23,42,0.06)] transition-all duration-300',
        'hover:shadow-[0_12px_40px_rgba(15,23,42,0.10)] hover:-translate-y-1',
      )}>
        {/* Gradient accent bar at top */}
        <div className="absolute top-0 left-5 right-5 h-[3px] rounded-full opacity-60" style={{ background: gradient }} />

        <div className="flex items-start gap-4 mt-2">
          {/* Gradient Avatar + Name */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div
              className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-[16px] text-lg font-extrabold text-white shadow-lg"
              style={{ background: gradient }}
            >
              {initials(trainer.name)}
              {isActive && (
                <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5">
                  <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-40" />
                  <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-white" />
                </span>
              )}
            </div>
            <div className="min-w-0">
              <Link href={`/trainers/${trainer.id}`} className="hover:opacity-80 transition-opacity">
                <h3 className="text-[15px] font-bold text-[var(--text-primary)] truncate">{trainer.name}</h3>
              </Link>
              {(trainer as any).unique_id && (
                <div className="mt-0.5">
                  <CopyId id={(trainer as any).unique_id} color="#f97316" />
                </div>
              )}
              <div className="flex items-center gap-1.5 mt-0.5">
                <Award size={11} className="text-[#8B5CF6] shrink-0" />
                <span className="text-[11px] text-[var(--text-muted)] truncate">{specialty}</span>
              </div>
            </div>
          </div>

          {/* Status + Rank */}
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span className={cn(
              'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold',
              isActive
                ? 'bg-[rgba(16,185,129,0.10)] text-[#10B981] ring-1 ring-[rgba(16,185,129,0.20)]'
                : 'bg-[rgba(100,116,139,0.08)] text-[#64748B] ring-1 ring-[rgba(100,116,139,0.15)]',
            )}>
              <span className={cn('h-1.5 w-1.5 rounded-full', isActive ? 'bg-[#10B981]' : 'bg-[#64748B]')} />
              {isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        {/* KPI Chips */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="rounded-[12px] bg-[rgba(37,99,235,0.05)] p-2.5 text-center ring-1 ring-[rgba(37,99,235,0.08)]">
            <p className="text-[9px] font-bold uppercase tracking-[0.06em] text-[#2563EB]">Active</p>
            <p className="text-[16px] font-extrabold text-[var(--text-primary)] mt-0.5">{trainer.active_clients ?? 0}</p>
          </div>
          <div className="rounded-[12px] bg-[rgba(16,185,129,0.05)] p-2.5 text-center ring-1 ring-[rgba(16,185,129,0.08)]">
            <p className="text-[9px] font-bold uppercase tracking-[0.06em] text-[#10B981]">This Month</p>
            <p className="text-[16px] font-extrabold text-[var(--text-primary)] mt-0.5">{fmtINR(trainer.month_revenue)}</p>
          </div>
          <div className="rounded-[12px] bg-[rgba(139,92,246,0.05)] p-2.5 text-center ring-1 ring-[rgba(139,92,246,0.08)]">
            <p className="text-[9px] font-bold uppercase tracking-[0.06em] text-[#8B5CF6]">Total</p>
            <p className="text-[16px] font-extrabold text-[var(--text-primary)] mt-0.5">{trainer.total_clients ?? 0}</p>
          </div>
        </div>

        {/* Contact + Actions */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-[rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
            {trainer.mobile && (
              <span className="inline-flex items-center gap-1"><Phone size={11} />{trainer.mobile}</span>
            )}
            {retention !== null && (
              <span className="inline-flex items-center gap-1 text-[#10B981]">
                <Target size={11} />{retention}%
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <Link
              href={`/trainers/${trainer.id}`}
              className="flex items-center gap-1 rounded-[10px] bg-[rgba(37,99,235,0.08)] px-3 py-1.5 text-[11px] font-bold text-[#2563EB] transition-all hover:bg-[rgba(37,99,235,0.14)]"
            >
              View <ChevronRight size={12} />
            </Link>
            <Link
              href={`/trainers/${trainer.id}/edit`}
              className="flex items-center gap-1 rounded-[10px] bg-[rgba(0,0,0,0.03)] px-3 py-1.5 text-[11px] font-bold text-[var(--text-muted)] transition-all hover:bg-[rgba(0,0,0,0.06)]"
            >
              <Edit3 size={11} />
            </Link>
          </div>
        </div>
      </div>
    </m.div>
  );
}

function LeaderboardRow({ trainer, index }: { trainer: Trainer; index: number }) {
  const rank = index;
  const rankStyle = RANK_COLORS[rank];
  const revenue = Number(trainer.month_revenue ?? 0);
  const score = Math.min(100, Math.round(
    ((trainer.active_clients ?? 0) * 3 + (revenue > 50000 ? 40 : revenue > 20000 ? 30 : revenue > 5000 ? 20 : 10))
  ));

  return (
    <m.tr
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: rank * 0.04, duration: 0.25 }}
      className="group transition-colors hover:bg-[rgba(139,92,246,0.03)] cursor-pointer"
      onClick={() => window.location.href = `/trainers/${trainer.id}`}
    >
      <td className="py-3 px-4 w-12">
        {rankStyle ? (
          <div
            className="flex h-8 w-8 items-center justify-center rounded-[10px] text-sm font-extrabold transition-all"
            style={{ background: rankStyle.bg, color: rankStyle.text, boxShadow: rankStyle.glow }}
          >
            {rankStyle.label}
          </div>
        ) : (
          <span className="text-[12px] font-bold text-[var(--text-muted)]">#{rank + 1}</span>
        )}
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-[10px] text-[11px] font-bold text-white shrink-0"
            style={{ background: GRADIENTS[index % GRADIENTS.length] }}
          >
            {initials(trainer.name)}
          </div>
          <div>
            <p className="text-[13px] font-semibold text-[var(--text-primary)]">{trainer.name}</p>
            <p className="text-[10px] text-[var(--text-muted)]">{trainer.specialization || trainer.role || 'Trainer'}</p>
          </div>
        </div>
      </td>
      <td className="py-3 px-4 text-center">
        <span className="text-[13px] font-bold text-[var(--text-primary)]">{trainer.active_clients ?? 0}</span>
      </td>
      <td className="py-3 px-4 text-right">
        <span className="text-[13px] font-bold text-[var(--text-primary)]">{fmtINR(revenue)}</span>
      </td>
      <td className="py-3 px-4 text-right">
        <div className="flex items-center justify-end gap-2">
          <div className="w-16 h-1.5 rounded-full bg-[rgba(0,0,0,0.06)] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${score}%`,
                background: score >= 80
                  ? 'linear-gradient(90deg, #10B981, #059669)'
                  : score >= 50
                    ? 'linear-gradient(90deg, #F59E0B, #D97706)'
                    : 'linear-gradient(90deg, #EF4444, #DC2626)',
              }}
            />
          </div>
          <span className="text-[12px] font-bold tabular-nums w-8 text-right"
            style={{
              color: score >= 80 ? '#10B981' : score >= 50 ? '#F59E0B' : '#EF4444',
            }}
          >{score}%</span>
        </div>
      </td>
    </m.tr>
  );
}


export default function TrainersPage() {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [monthlyRevenue, setMonthlyRevenue] = useState<{ month: string; revenue: number }[]>([]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const rows = await api.trainers.list();
      setTrainers(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setError((err as Error)?.message || 'Failed to load trainers');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const year = new Date().getFullYear();
    api.reports.monthly(year).then((rows) => {
      if (!Array.isArray(rows) || rows.length === 0) return;
      const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const mapped = (rows as { month?: string | number; revenue?: number | string }[])
        .map((r) => ({
          month: typeof r.month === 'string'
            ? MONTH_LABELS[new Date(r.month + '-01').getMonth()] ?? r.month
            : MONTH_LABELS[(Number(r.month) - 1)] ?? String(r.month),
          revenue: Number(r.revenue ?? 0),
        }));
      setMonthlyRevenue(mapped.slice(-6));
    }).catch(() => { /* leave monthlyRevenue empty — chart won't render */ });
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return trainers;
    return trainers.filter(t =>
      [t.name, t.email, t.mobile, t.role, t.specialty, t.specialization]
        .filter(Boolean).join(' ').toLowerCase().includes(q)
    );
  }, [search, trainers]);

  const sortedByRevenue = useMemo(() =>
    [...filtered].sort((a, b) => Number(b.month_revenue ?? 0) - Number(a.month_revenue ?? 0)),
    [filtered]
  );

  const stats = useMemo(() => ({
    active: trainers.filter(t => t.is_active !== false).length,
    clients: trainers.reduce((s, t) => s + Number(t.active_clients || 0), 0),
    revenue: trainers.reduce((s, t) => s + Number(t.month_revenue || 0), 0),
    satisfaction: trainers.length
      ? Math.round(trainers.reduce((s, t) => s + (t.active_clients ?? 0), 0) / trainers.length * 10)
      : 0,
  }), [trainers]);

  return (
    <Guard role="admin">
      <AppShell>
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
          {/* ── Hero Section ── */}
          <m.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="relative overflow-hidden rounded-[32px] mb-8 p-[1px]"
            style={{
              background: 'linear-gradient(135deg, rgba(37,99,235,0.3), rgba(124,58,237,0.3), rgba(6,182,212,0.3))',
            }}
          >
            <div className="relative rounded-[31px] bg-gradient-to-br from-[#2563EB]/90 via-[#7C3AED]/90 to-[#06B6D4]/90 p-8 sm:p-10 overflow-hidden">
              <div className="absolute top-[-20%] right-[-5%] w-64 h-64 rounded-full bg-white/[0.06] blur-[60px]" />
              <div className="absolute bottom-[-30%] left-[-10%] w-72 h-72 rounded-full bg-[#06B6D4]/[0.08] blur-[80px]" />
              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                <div>
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[10px] font-bold text-white/80 uppercase tracking-[0.08em] mb-3">
                    <Sparkles size={12} /> Coaching Team
                  </div>
                  <h1 className="text-[28px] sm:text-[34px] font-extrabold text-white tracking-[-0.02em] leading-tight">
                    Trainers Management
                  </h1>
                  <p className="text-[14px] text-white/70 mt-1.5 max-w-[520px] leading-relaxed">
                    Manage coaching performance, client assignments, revenue, and trainer growth.
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Link href="/trainers/add">
                    <div className="inline-flex items-center gap-1.5 rounded-[14px] bg-white/20 backdrop-blur-sm px-4 py-2.5 text-[12px] font-bold text-white hover:bg-white/30 transition-all cursor-pointer">
                      <Plus size={14} /> Add Trainer
                    </div>
                  </Link>
                  <button onClick={load} className="inline-flex items-center gap-1.5 rounded-[14px] bg-white/10 backdrop-blur-sm px-4 py-2.5 text-[12px] font-bold text-white/80 hover:bg-white/20 transition-all border border-white/10">
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
                  </button>
                </div>
              </div>
            </div>
          </m.div>

          {/* ── Stats Cards ── */}
          <m.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
          >
            <KpiCard
              label="Active Trainers"
              value={loading ? '—' : stats.active}
              icon={<UserCheck size={18} />}
              accent="blue"
              hint={trainers.length > 0 ? `Out of ${trainers.length} total` : undefined}
            />
            <KpiCard
              label="Assigned Clients"
              value={loading ? '—' : stats.clients}
              icon={<Users size={18} />}
              accent="emerald"
              hint="Across all trainers"
            />
            <KpiCard
              label="Revenue This Month"
              value={loading ? '—' : fmtINR(stats.revenue)}
              icon={<DollarSign size={18} />}
              accent="purple"
              hint="Current month · combined trainer revenue"
            />
            <KpiCard
              label="Trainer Performance"
              value={loading ? '—' : `${stats.satisfaction}%`}
              icon={<Star size={18} />}
              accent="amber"
              hint="Average client load index"
            />
          </m.div>

          {/* ── Search + Filters ── */}
          <m.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="mb-6"
          >
            <GlassPanel className="p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" strokeWidth={1.5} />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search trainers by name, email, or specialization..."
                    className="w-full h-10 rounded-[12px] border border-[rgba(0,0,0,0.06)] bg-white pl-9 pr-3 text-[13px] text-[var(--text-primary)] placeholder-[#9CA3AF] outline-none transition-all focus:border-[#2563EB]/30 focus:shadow-[0_0_0_3px_rgba(37,99,235,0.08)]"
                  />
                </div>
                <span className="text-[12px] font-medium text-[var(--text-muted)] ml-auto">
                  {filtered.length} / {trainers.length} trainers
                </span>
              </div>
            </GlassPanel>
          </m.div>

          {/* ── Error State ── */}
          {error && (
            <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="mb-6 rounded-[16px] bg-[rgba(239,68,68,0.06)] border border-[rgba(239,68,68,0.15)] px-5 py-4 text-[13px] font-medium text-[#EF4444]">
              {error}
            </m.div>
          )}

          {/* ── Loading State ── */}
          {loading && !trainers.length && (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-[24px] bg-white/70 border border-white/60 p-5 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-14 rounded-[16px] bg-slate-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-32 rounded bg-slate-200" />
                      <div className="h-3 w-24 rounded bg-slate-100" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    {[1, 2, 3].map(j => <div key={j} className="h-14 rounded-[12px] bg-slate-100" />)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Trainer Cards Grid ── */}
          {!loading && filtered.length > 0 && (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 mb-8">
                <AnimatePresence>
                  {filtered.map((trainer, i) => (
                    <TrainerCard key={trainer.id} trainer={trainer} index={i} />
                  ))}
                </AnimatePresence>
              </div>

              {/* ── Analytics + Leaderboard ── */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
                {/* Revenue Trend */}
                <GlassPanel className="p-5 lg:col-span-2">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">Analytics</p>
                      <h3 className="text-[15px] font-bold text-[var(--text-primary)] mt-0.5">Revenue Trend</h3>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-muted)]">
                      <Activity size={13} /> Last 6 months
                    </div>
                  </div>
                  {monthlyRevenue.length > 0
                    ? (
                      <PremiumBarChart
                        data={monthlyRevenue as Record<string, unknown>[]}
                        xKey="month"
                        bars={[{ key: 'revenue', label: 'Revenue', color: '#6366f1' }]}
                        height={128}
                        formatValue={fmtINR}
                        className="mt-4"
                      />
                    )
                    : <div className="flex items-center justify-center h-32 text-[12px] text-[var(--text-muted)]">No historical data available</div>
                  }
                  <div className="flex items-center gap-4 mt-4 pt-3 border-t border-[rgba(0,0,0,0.04)]">
                    <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                      <div className="h-2.5 w-2.5 rounded-[4px] bg-[#6366f1]" />
                      Monthly Revenue
                    </div>
                    <span className="text-[11px] font-bold text-[var(--text-primary)] ml-auto">
                      Total: {fmtINR(stats.revenue)}
                    </span>
                  </div>
                </GlassPanel>

                {/* Quick Stats */}
                <GlassPanel className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">Insights</p>
                      <h3 className="text-[15px] font-bold text-[var(--text-primary)] mt-0.5">Team Summary</h3>
                    </div>
                    <Zap size={16} className="text-[#F97316]" />
                  </div>
                  <div className="space-y-3">
                    {[
                      { label: 'Avg Clients / Trainer', value: trainers.length ? Math.round(stats.clients / trainers.length) : 0, color: '#2563EB' },
                      { label: 'Avg Revenue / Trainer', value: fmtINR(trainers.length ? stats.revenue / trainers.length : 0), color: '#10B981' },
                      { label: 'Trainers with Revenue', value: trainers.filter(t => Number(t.month_revenue ?? 0) > 0).length, color: '#8B5CF6' },
                      { label: 'Top Performer', value: sortedByRevenue[0]?.name || '—', color: '#F59E0B' },
                    ].map(item => (
                      <div key={item.label} className="flex items-center justify-between rounded-[12px] bg-[rgba(0,0,0,0.02)] px-3.5 py-2.5">
                        <span className="text-[11px] text-[var(--text-muted)]">{item.label}</span>
                        <span className="text-[13px] font-bold" style={{ color: item.color }}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </GlassPanel>
              </div>

              {/* ── Performance Leaderboard ── */}
              {sortedByRevenue.length > 0 && (
                <GlassPanel className="overflow-hidden">
                  <div className="flex items-center justify-between p-5 pb-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">Rankings</p>
                      <h3 className="text-[15px] font-bold text-[var(--text-primary)] mt-0.5">Performance Leaderboard</h3>
                    </div>
                    <Crown size={18} className="text-[#F59E0B]" />
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-t border-b border-[rgba(0,0,0,0.04)]">
                          {['Rank', 'Trainer', 'Clients', 'Revenue (This Month)', 'Score'].map(h => (
                            <th key={h} className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--text-muted)]">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <AnimatePresence>
                          {sortedByRevenue.slice(0, 10).map((t, i) => (
                            <LeaderboardRow key={t.id} trainer={t} index={i} />
                          ))}
                        </AnimatePresence>
                      </tbody>
                    </table>
                  </div>
                </GlassPanel>
              )}
            </>
          )}

          {/* ── Empty State ── */}
          {!loading && !error && filtered.length === 0 && (
            <m.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <div className="relative mb-6">
                <div className="h-20 w-20 rounded-[24px] bg-gradient-to-br from-[#2563EB]/10 to-[#7C3AED]/10 flex items-center justify-center ring-1 ring-[rgba(37,99,235,0.1)]">
                  <Users size={36} className="text-[#2563EB]/40" strokeWidth={1.5} />
                </div>
                <div className="absolute -top-1 -right-1 h-8 w-8 rounded-full bg-gradient-to-br from-[#F97316] to-[#EC4899] flex items-center justify-center shadow-lg">
                  <Search size={14} className="text-white" />
                </div>
              </div>
              <h3 className="text-[18px] font-bold text-[var(--text-primary)] mb-1">
                {search ? 'No trainers match your search' : 'No trainers found'}
              </h3>
              <p className="text-[13px] text-[var(--text-muted)] mb-6 text-center max-w-sm">
                {search
                  ? 'Try a different name, email, or specialization.'
                  : 'Add your first trainer to start building your coaching team.'}
              </p>
              {!search && (
                <Link href="/trainers/add">
                  <div className="inline-flex items-center gap-2 rounded-[14px] bg-gradient-to-r from-[#2563EB] to-[#7C3AED] px-5 py-2.5 text-[13px] font-bold text-white shadow-[0_4px_16px_rgba(37,99,235,0.25)] hover:shadow-[0_6px_24px_rgba(37,99,235,0.35)] transition-all">
                    <Plus size={16} /> Add Your First Trainer
                  </div>
                </Link>
              )}
            </m.div>
          )}
        </div>
      </AppShell>
    </Guard>
  );
}
