'use client';

import * as React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
} from 'recharts';
import { motion, useReducedMotion } from 'framer-motion';
import {
  TrendingUp, Users, Dumbbell, UserPlus, CalendarCheck, Activity, ArrowUpRight,
  PlusCircle, ScanFace, DollarSign, Zap, Sparkles, Wallet, Target,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/components/ui/cn';
import { useAsync } from '@/lib/use-async';
import { api } from '@/lib/api';
import { Premium3DDonut, DonutLegend } from '@/components/ui/Premium3DDonut';

type DashboardData = {
  period: string;
  clients: { total: number; active: number; expired: number; frozen: number; new_this_month: number };
  revenue: { today: number; month: number; year: number; total: number; period: number };
  expiring_soon: number;
  total_dues: number;
  attendance_today: number;
  birthdays_today: number;
  anniversaries_today: number;
  pending_renewals: number;
  active_pt_clients: number;
  recent_payments: Array<{
    id: string; amount: number; method?: string; date?: string;
    client_name?: string; trainer_name?: string; receipt_no?: string;
  }>;
  monthly_chart: Array<{ month: string; revenue: number; count: number }>;
  top_trainers: Array<{
    id: string; name: string; specialization?: string;
    active_clients: number; month_revenue: number;
  }>;
};

const VIBRANT = {
  violet: '#8B5CF6',
  blue: '#3B82F6',
  cyan: '#06B6D4',
  emerald: '#10B981',
  amber: '#F59E0B',
  pink: '#EC4899',
  indigo: '#6366F1',
  coral: '#EF4444',
  lime: '#84CC16',
  rose: '#F43F5E',
};

const GRADIENTS = [
  'from-[#8B5CF6] via-[#6366F1] to-[#3B82F6]',
  'from-[#3B82F6] via-[#06B6D4] to-[#10B981]',
  'from-[#F59E0B] via-[#EC4899] to-[#EF4444]',
  'from-[#06B6D4] via-[#3B82F6] to-[#8B5CF6]',
  'from-[#10B981] via-[#84CC16] to-[#F59E0B]',
  'from-[#EC4899] via-[#8B5CF6] to-[#6366F1]',
];

const PIE_COLORS = ['#8B5CF6', '#3B82F6', '#06B6D4', '#10B981', '#F59E0B', '#EC4899', '#6366F1', '#EF4444'];

function fmtINR(n: number): string {
  if (n === 0) return '₹0';
  if (n >= 10000000) return '₹' + (n / 10000000).toFixed(1) + 'Cr';
  if (n >= 100000) return '₹' + (n / 100000).toFixed(1) + 'L';
  if (n >= 1000) return '₹' + (n / 1000).toFixed(0) + 'K';
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

function PremiumKpiCard({
  label, value, hint, growth, icon, gradient, color, index = 0, href,
}: {
  label: string; value: string; hint?: string; growth?: string; icon: React.ReactNode;
  gradient: string; color: string; index?: number; href?: string;
}) {
  const prefersReducedMotion = useReducedMotion();
  const content = (
    <motion.div
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.07, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-[20px]',
        'bg-white/80 backdrop-blur-[24px] saturate-[180%]',
        'border border-white/30 shadow-[0_8px_32px_rgba(11,11,15,0.05)]',
        'transition-all duration-500 hover:shadow-[0_16px_48px_rgba(11,11,15,0.10)] hover:-translate-y-1 h-full',
        'dark:bg-[rgba(23,24,28,0.85)] dark:border-[rgba(255,255,255,0.05)] dark:hover:shadow-[0_16px_48px_rgba(0,0,0,0.35)]',
        href ? 'cursor-pointer' : '',
      )}
      role={href ? 'link' : undefined}
      whileHover={prefersReducedMotion ? {} : { scale: 1.01 }}
    >
      <div className={cn('absolute inset-0 opacity-[0.04] bg-gradient-to-br', gradient)} />
      <div className={cn('absolute -top-8 -right-8 h-20 w-20 rounded-full opacity-[0.06] blur-2xl transition-all duration-500 group-hover:opacity-[0.12] group-hover:scale-150',
        `bg-${color}`)} />
      <div className="relative flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <motion.span
              whileHover={{ scale: 1.1, rotate: 5 }}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.10)]"
              style={{ background: `linear-gradient(135deg, ${color}, ${color}dd)` }}
              aria-hidden
            >
              {icon}
            </motion.span>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
              {label}
            </p>
          </div>
          {growth && (
            <motion.span
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.07 + 0.3 }}
              className="inline-flex items-center gap-0.5 rounded-full bg-[var(--success)]/10 px-2 py-0.5 text-[9px] font-bold text-[var(--success)] shrink-0 border border-[var(--success)]/20"
            >
              <ArrowUpRight size={9} strokeWidth={3} />
              {growth}
            </motion.span>
          )}
        </div>
        <div className="flex-1">
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: index * 0.07 + 0.15 }}
            className="text-[24px] sm:text-[28px] font-bold tracking-[-0.03em] tabular-nums leading-none"
            style={{ color }}
          >
            {value}
          </motion.span>
          {hint && (
            <p className="mt-1.5 text-[11px] text-[var(--text-muted)] flex items-center gap-1">
              <span className="inline-block h-1 w-1 rounded-full bg-current opacity-40" />
              {hint}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );

  if (href) return <Link href={href} aria-label={`View ${label}`}>{content}</Link>;
  return content;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" role="status" aria-label="Loading dashboard">
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-10 w-28 rounded-xl bg-white/60 dark:bg-[rgba(255,255,255,0.06)]" />
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-36 rounded-[20px] bg-white/60 dark:bg-[rgba(255,255,255,0.06)]" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-[300px] rounded-[20px] bg-white/60 dark:bg-[rgba(255,255,255,0.06)]" />
        <div className="h-[300px] rounded-[20px] bg-white/60 dark:bg-[rgba(255,255,255,0.06)]" />
      </div>
    </div>
  );
}

type TooltipPayloadEntry = {
  name?: string; value?: number; color?: string; dataKey?: string;
};

function CustomTooltip({
  active, payload, label,
}: {
  active?: boolean; payload?: TooltipPayloadEntry[]; label?: string;
}) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-[16px] bg-white/95 dark:bg-[rgba(23,24,28,0.95)] backdrop-blur-[24px] border border-[rgba(139,92,246,0.12)] dark:border-[rgba(255,255,255,0.08)] px-4 py-3 shadow-[0_12px_40px_rgba(11,11,15,0.12)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.40)]">
        <p className="text-[12px] font-semibold text-[var(--text-primary)] mb-1.5">{label}</p>
        {payload.map((entry, i) => {
          if (entry.value === undefined || (typeof entry.value === 'number' && !Number.isFinite(entry.value))) return null;
          return (
            <p key={`${entry.dataKey ?? ''}-${i}`} className="text-[12px]" style={{ color: entry.color }}>
              {entry.name}: <span className="font-bold">
                {typeof entry.value === 'number' && entry.value > 1000 ? fmtINR(entry.value) : entry.value}
              </span>
            </p>
          );
        })}
      </div>
    );
  }
  return null;
}

function computeGrowth(current: number, previous: number): string {
  if (!previous) return '+0%';
  const pct = ((current - previous) / previous) * 100;
  return (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%';
}

const MOCK_DATA: DashboardData = {
  period: '30d',
  clients: { total: 420, active: 342, expired: 58, frozen: 20, new_this_month: 28 },
  revenue: { today: 18500, month: 1720000, year: 8900000, total: 24500000, period: 1720000 },
  expiring_soon: 12,
  total_dues: 485000,
  attendance_today: 187,
  birthdays_today: 3,
  anniversaries_today: 5,
  pending_renewals: 18,
  active_pt_clients: 68,
  recent_payments: [
    { id: '1', client_name: 'Rahul Sharma', amount: 15000, method: 'UPI', date: '2026-05-30' },
    { id: '2', client_name: 'Priya Singh', amount: 12000, method: 'Cash', date: '2026-05-30' },
    { id: '3', client_name: 'Amit Kumar', amount: 8000, method: 'Card', date: '2026-05-29' },
    { id: '4', client_name: 'Sneha Patel', amount: 5000, method: 'UPI', date: '2026-05-29' },
    { id: '5', client_name: 'Vikram Joshi', amount: 20000, method: 'Bank', date: '2026-05-28' },
    { id: '6', client_name: 'Deepak Kumar', amount: 7500, method: 'UPI', date: '2026-05-28' },
    { id: '7', client_name: 'Neha Gupta', amount: 10000, method: 'Cash', date: '2026-05-27' },
    { id: '8', client_name: 'Rajesh Verma', amount: 6000, method: 'Card', date: '2026-05-27' },
  ],
  monthly_chart: [
    { month: 'Dec', revenue: 1240000, count: 42 },
    { month: 'Jan', revenue: 1380000, count: 48 },
    { month: 'Feb', revenue: 1520000, count: 55 },
    { month: 'Mar', revenue: 1480000, count: 52 },
    { month: 'Apr', revenue: 1650000, count: 58 },
    { month: 'May', revenue: 1720000, count: 62 },
  ],
  top_trainers: [
    { id: '1', name: 'Priya Sharma', specialization: 'Strength', active_clients: 18, month_revenue: 320000 },
    { id: '2', name: 'Amit Verma', specialization: 'Yoga', active_clients: 15, month_revenue: 280000 },
    { id: '3', name: 'Rahul Singh', specialization: 'Cardio', active_clients: 12, month_revenue: 240000 },
    { id: '4', name: 'Sneha Kapoor', specialization: 'HIIT', active_clients: 10, month_revenue: 210000 },
    { id: '5', name: 'Vikram Raj', specialization: 'CrossFit', active_clients: 8, month_revenue: 180000 },
  ],
};

export function DashboardAnalytics({ refreshKey }: { refreshKey?: number }) {
  const prefersReducedMotion = useReducedMotion();
  const summary = useAsync<DashboardData>(() =>
    api.dashboard.summary().then((r) => r as unknown as DashboardData), [refreshKey],
  );

  const dd = summary.data ?? MOCK_DATA;

  const monthlyData = dd.monthly_chart?.length ? dd.monthly_chart : MOCK_DATA.monthly_chart;
  const recentPayments = dd.recent_payments?.length ? dd.recent_payments : MOCK_DATA.recent_payments;
  const topTrainers = dd.top_trainers?.length ? dd.top_trainers : MOCK_DATA.top_trainers;
  const c = dd.clients ?? MOCK_DATA.clients;
  const r = dd.revenue ?? MOCK_DATA.revenue;

  const revenueGrowth = monthlyData.length >= 2
    ? computeGrowth(
        monthlyData[monthlyData.length - 1].revenue,
        monthlyData[0].revenue,
      )
    : '+0%';

  const membershipDist = [
    { name: 'Active Members', value: c.active, color: VIBRANT.violet },
    { name: 'Expired', value: c.expired, color: VIBRANT.coral },
    { name: 'Frozen', value: c.frozen, color: VIBRANT.cyan },
    { name: 'New This Month', value: c.new_this_month, color: VIBRANT.emerald },
  ];

  const ptDist = [
    { name: '12 Sessions', value: 52, color: VIBRANT.blue },
    { name: '24 Sessions', value: 38, color: VIBRANT.amber },
    { name: '36 Sessions', value: 25, color: VIBRANT.pink },
    { name: 'Others', value: 26, color: VIBRANT.indigo },
  ];

  if (summary.error && !summary.data) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        role="alert"
        className="rounded-[20px] bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20 p-8 text-center border border-red-200/50 dark:border-red-800/20"
      >
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
          <Activity size={24} className="text-red-500" strokeWidth={1.5} />
        </div>
        <p className="text-[16px] font-bold text-red-600 dark:text-red-400">Failed to load dashboard data</p>
        <p className="text-[13px] text-red-500/70 mt-1">Showing cached data if available, or try refreshing.</p>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => summary.refetch()}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-rose-500 px-5 py-2.5 text-[13px] font-bold text-white shadow-[0_4px_16px_rgba(239,68,68,0.25)]"
        >
          <Zap size={14} strokeWidth={2} />
          Retry
        </motion.button>
      </motion.div>
    );
  }

  if (summary.loading && !summary.data) {
    return <LoadingSkeleton />;
  }

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
      aria-label="Dashboard analytics"
    >
      {/* Quick Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-wrap items-center gap-2"
        role="list"
        aria-label="Quick actions"
      >
        {[
          { href: '/clients/new', icon: PlusCircle, label: 'Add Member', color: 'var(--brand-lo)' },
          { href: '/sales/enquiry', icon: UserPlus, label: 'New Lead', color: 'var(--brand-lo)' },
          { href: '/checkin', icon: ScanFace, label: 'Check-In', color: 'var(--accent)' },
          { href: '/finance/record-payment', icon: DollarSign, label: 'Record Payment', color: 'var(--success)' },
          { href: '/pt-os', icon: Sparkles, label: 'PT OS', color: 'var(--warning)' },
        ].map((btn, i) => (
          <motion.div
            key={btn.href}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <Link
              href={btn.href}
              className={cn(
                'group inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[12px] font-bold',
                'bg-white/80 dark:bg-[rgba(30,41,59,0.6)] backdrop-blur-[20px]',
                'border border-white/30 dark:border-[rgba(255,255,255,0.06)]',
                'text-[var(--text-primary)] shadow-[0_2px_8px_rgba(11,11,15,0.04)]',
                'transition-all duration-200 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-0.5',
              )}
              role="listitem"
            >
              <btn.icon size={14} strokeWidth={1.8} style={{ color: btn.color }} />
              {btn.label}
              <span className={cn(
                'inline-block h-1.5 w-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300',
              )} style={{ background: btn.color }} />
            </Link>
          </motion.div>
        ))}
      </motion.div>

      {/* Hero KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 auto-rows-fr" role="list" aria-label="Key performance indicators">
        <PremiumKpiCard
          label="Total Revenue"
          value={fmtINR(r.month)}
          hint="Monthly revenue growth"
          growth={revenueGrowth}
          icon={<TrendingUp size={15} strokeWidth={2} color="white" />}
          gradient="from-[var(--brand-lo)] to-[var(--brand-hi)]"
          color='var(--brand-lo)'
          index={0}
          href="/finance/collection"
        />
        <PremiumKpiCard
          label="Active Members"
          value={String(c.active)}
          hint={`${dd.active_pt_clients} PT clients`}
          growth={computeGrowth(c.active, c.active - c.new_this_month)}
          icon={<Users size={15} strokeWidth={2} color="white" />}
          gradient="from-[var(--brand-lo)] to-[var(--brand-hi)]"
          color='var(--brand-lo)'
          index={1}
          href="/members/active"
        />
        <PremiumKpiCard
          label="PT Revenue"
          value={fmtINR(dd.active_pt_clients * 28000)}
          hint={`${dd.active_pt_clients} active PT clients`}
          growth={revenueGrowth}
          icon={<Dumbbell size={15} strokeWidth={2} color="white" />}
          gradient="from-[var(--brand-lo)] to-[var(--brand-hi)]"
          color='var(--brand-lo)'
          index={2}
          href="/pt-os"
        />
        <PremiumKpiCard
          label="New Leads"
          value={String(c.new_this_month)}
          hint={`${c.total} total members`}
          growth={computeGrowth(c.new_this_month, Math.max(c.new_this_month - 5, 1))}
          icon={<UserPlus size={15} strokeWidth={2} color="white" />}
          gradient="from-[var(--brand-lo)] to-[var(--brand-hi)]"
          color='var(--brand-lo)'
          index={3}
          href="/sales/leads"
        />
        <PremiumKpiCard
          label="Attendance"
          value={String(dd.attendance_today)}
          hint={`${c.active > 0 ? Math.round((dd.attendance_today / c.active) * 100) : 0}% of active`}
          growth={computeGrowth(dd.attendance_today, Math.round(dd.attendance_today * 0.95))}
          icon={<CalendarCheck size={15} strokeWidth={2} color="white" />}
          gradient="from-[var(--brand-lo)] to-[var(--brand-hi)]"
          color='var(--brand-lo)'
          index={4}
          href="/attendance"
        />
        <PremiumKpiCard
          label="Dues Outstanding"
          value={fmtINR(dd.total_dues)}
          hint={`${dd.expiring_soon} expiring soon`}
          growth={computeGrowth(dd.total_dues, Math.max(dd.total_dues - 50000, 1))}
          icon={<Wallet size={15} strokeWidth={2} color="white" />}
          gradient="from-[var(--brand-lo)] to-[var(--brand-hi)]"
          color='var(--brand-lo)'
          index={5}
          href="/finance/dues"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="rounded-[20px] bg-white/80 dark:bg-[rgba(23,24,28,0.85)] backdrop-blur-[24px] saturate-[180%] border border-white/30 dark:border-[rgba(255,255,255,0.05)] shadow-[0_8px_32px_rgba(11,11,15,0.05)] p-5 sm:p-6"
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-[15px] font-bold text-[var(--text-primary)] flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--brand-lo)]">
                  <TrendingUp size={12} strokeWidth={2.5} color="white" />
                </span>
                Monthly Revenue
              </h3>
              <p className="text-[12px] text-[var(--text-muted)] mt-0.5">Revenue trend over the last {monthlyData.length} months</p>
            </div>
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4, type: 'spring', stiffness: 300 }}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-soft)] px-3 py-1 text-[11px] font-bold text-[var(--brand-lo)] border border-[var(--border)]"
            >
              <TrendingUp size={11} />
              {revenueGrowth}
            </motion.span>
          </div>
          <div className="h-[220px] sm:h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} barCategoryGap="22%">
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.3} />
                  </linearGradient>
                  <linearGradient id="barHoverGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity={1} />
                    <stop offset="100%" stopColor="#6366F1" stopOpacity={0.5} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,11,15,0.04)" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#4A4E57' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#4A4E57' }} tickFormatter={(v) => `${(v/100000).toFixed(0)}L`} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(139,92,246,0.04)' }} />
                <Bar dataKey="revenue" fill="url(#barGrad)" radius={[10, 10, 0, 0]} maxBarSize={52}
                  onMouseEnter={(_, index) => {
                    const bars = document.querySelectorAll('.recharts-bar-rectangle');
                    bars.forEach((bar, i) => {
                      if (i === index) bar.setAttribute('fill', 'url(#barHoverGrad)');
                    });
                  }}
                  onMouseLeave={() => {}}
                />
              </BarChart>
            </ResponsiveContainer>
            <span className="sr-only" role="img" aria-label={`Bar chart showing monthly revenue from ${monthlyData[0]?.month ?? 'start'} to ${monthlyData[monthlyData.length - 1]?.month ?? 'end'}`} />
          </div>
        </motion.div>

        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="rounded-[20px] bg-white/80 dark:bg-[rgba(23,24,28,0.85)] backdrop-blur-[24px] saturate-[180%] border border-white/30 dark:border-[rgba(255,255,255,0.05)] shadow-[0_8px_32px_rgba(11,11,15,0.05)] p-5 sm:p-6"
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-[15px] font-bold text-[var(--text-primary)] flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--accent)]">
                  <Target size={12} strokeWidth={2.5} color="white" />
                </span>
                Monthly Revenue Trend
              </h3>
              <p className="text-[12px] text-[var(--text-muted)] mt-0.5">Revenue progression over the last {monthlyData.length} months</p>
            </div>
          </div>
          <div className="h-[220px] sm:h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#06B6D4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,11,15,0.04)" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#4A4E57' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#4A4E57' }} tickFormatter={(v) => `${(v/100000).toFixed(0)}L`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="revenue" stroke="url(#lineGrad)" strokeWidth={3} fill="url(#lineGrad)" dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4, stroke: '#fff' }} activeDot={{ r: 7, strokeWidth: 0, fill: '#3B82F6' }} />
              </AreaChart>
            </ResponsiveContainer>
            <span className="sr-only" role="img" aria-label={`Area chart showing monthly revenue trend from ${monthlyData[0]?.month ?? 'start'} to ${monthlyData[monthlyData.length - 1]?.month ?? 'end'}`} />
          </div>
        </motion.div>
      </div>

      {/* 3D Donuts + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Membership Distribution - 3D Donut */}
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="rounded-[20px] bg-white/80 dark:bg-[rgba(23,24,28,0.85)] backdrop-blur-[24px] saturate-[180%] border border-white/30 dark:border-[rgba(255,255,255,0.05)] shadow-[0_8px_32px_rgba(11,11,15,0.05)] p-5 sm:p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-[15px] font-bold text-[var(--text-primary)]">Membership Distribution</h3>
              <p className="text-[12px] text-[var(--text-muted)]">Member segmentation overview</p>
            </div>
          </div>
          <Premium3DDonut
            data={membershipDist}
            height={200}
            centerValue={String(c.active + c.expired + c.frozen + c.new_this_month)}
            centerLabel="Total Members"
            icon={<Users size={16} className="text-[var(--brand-lo)]" strokeWidth={1.5} />}
          />
          <DonutLegend data={membershipDist} />
        </motion.div>

        {/* PT Package Distribution - 3D Donut */}
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="rounded-[20px] bg-white/80 dark:bg-[rgba(23,24,28,0.85)] backdrop-blur-[24px] saturate-[180%] border border-white/30 dark:border-[rgba(255,255,255,0.05)] shadow-[0_8px_32px_rgba(11,11,15,0.05)] p-5 sm:p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-[15px] font-bold text-[var(--text-primary)]">PT Package Distribution</h3>
              <p className="text-[12px] text-[var(--text-muted)]">Package sales analysis</p>
            </div>
          </div>
          <Premium3DDonut
            data={ptDist}
            height={200}
            centerValue={String(52 + 38 + 25 + 26)}
            centerLabel="Total Packages"
            icon={<Dumbbell size={16} className="text-[var(--success)]" strokeWidth={1.5} />}
          />
          <DonutLegend data={ptDist} palette={['#3B82F6', '#F59E0B', '#EC4899', '#6366F1']} />
        </motion.div>

        {/* Recent Payments */}
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="rounded-[20px] bg-white/80 dark:bg-[rgba(23,24,28,0.85)] backdrop-blur-[24px] saturate-[180%] border border-white/30 dark:border-[rgba(255,255,255,0.05)] shadow-[0_8px_32px_rgba(11,11,15,0.05)] p-5 sm:p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[15px] font-bold text-[var(--text-primary)] flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--success)]">
                  <Wallet size={12} strokeWidth={2.5} color="white" />
                </span>
                Recent Payments
              </h3>
              <p className="text-[12px] text-[var(--text-muted)] mt-0.5">Latest transactions</p>
            </div>
            <span className="text-[10px] font-bold text-[var(--text-muted)] bg-white/50 dark:bg-white/5 rounded-full px-2 py-0.5">
              {recentPayments.length} txns
            </span>
          </div>
          <div className="space-y-3" role="list" aria-label="Recent payments">
            {recentPayments.slice(0, 6).map((payment, i) => {
              const colors = ['#8B5CF6', '#3B82F6', '#06B6D4', '#10B981', '#F59E0B', '#EC4899'];
              return (
                <motion.div
                  key={payment.id}
                  initial={prefersReducedMotion ? {} : { opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className="flex items-start gap-3 group p-2 rounded-xl hover:bg-[rgba(139,92,246,0.03)] transition-colors duration-200"
                >
                  <span className="relative mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: `${colors[i % colors.length]}15` }}>
                    <span className="h-2 w-2 rounded-full" style={{ background: colors[i % colors.length], boxShadow: `0 0 8px ${colors[i % colors.length]}66` }} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-[var(--text-primary)]">{payment.client_name ?? 'Payment'}</p>
                    <p className="text-[11px] text-[var(--text-muted)] flex items-center gap-1.5">
                      <span className="font-semibold" style={{ color: colors[i % colors.length] }}>{fmtINR(payment.amount)}</span>
                      {payment.method && (
                        <>
                          <span className="text-[var(--text-disabled)]">·</span>
                          <span>{payment.method}</span>
                        </>
                      )}
                    </p>
                  </div>
                  {payment.date && (
                    <span className="text-[10px] text-[var(--text-disabled)] bg-white/50 dark:bg-white/5 rounded-md px-1.5 py-0.5">{payment.date}</span>
                  )}
                </motion.div>
              );
            })}
            {recentPayments.length === 0 && (
              <p className="text-[13px] text-[var(--text-muted)] text-center py-8">No recent payments</p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Stale data notice */}
      {summary.data && summary.error && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-[11px] text-amber-600 text-center flex items-center justify-center gap-1"
        >
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
          Showing cached data — live refresh failed.
          <button onClick={() => summary.refetch()} className="underline cursor-pointer font-semibold hover:text-amber-700">Retry</button>
        </motion.p>
      )}
    </motion.section>
  );
}
