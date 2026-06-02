'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, RefreshCw,
  CheckCircle, Clock, UserPlus, Users, DollarSign, Activity,
  UserPlus as UserPlusIcon, ScanFace, PlusCircle, Sparkles,
  TrendingUp,
} from 'lucide-react';

import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useDashboardData, type DashboardData } from '@/lib/hooks/useDashboardData';
import { PremiumKpiCard } from '@/components/premium/PremiumKpiCard';
import { DateRangeFilter } from '@/components/premium/DateRangeFilter';
import { ActivityCard } from '@/components/premium/ActivityCard';
import { ClientOverviewCard } from '@/components/premium/ClientOverviewCard';
import { RevenueTrendChart } from '@/components/premium/RevenueTrendChart';
import { CollectionRateWidget } from '@/components/premium/CollectionRateWidget';
import { ClientGrowthWidget } from '@/components/premium/ClientGrowthWidget';
import { MonthlyTargetGauge } from '@/components/premium/MonthlyTargetGauge';
import { BusinessSummary } from '@/components/premium/BusinessSummary';
import { DashboardSkeleton } from '@/components/premium/DashboardSkeleton';
import { DashboardEmptyState } from '@/components/premium/DashboardEmptyState';

const QUICK_ACTIONS = [
  { href: '/clients/new', label: 'Add Member', icon: PlusCircle, gradient: 'linear-gradient(135deg, #EC4899, #FB7185)' },
  { href: '/sales/enquiry', label: 'New Lead', icon: UserPlusIcon, gradient: 'linear-gradient(135deg, #6D28D9, #A78BFA)' },
  { href: '/checkin', label: 'Check-In', icon: ScanFace, gradient: 'linear-gradient(135deg, #10B981, #34D399)' },
  { href: '/finance/record-payment', label: 'Record Payment', icon: DollarSign, gradient: 'linear-gradient(135deg, #D97706, #FBBF24)' },
  { href: '/pt-os', label: 'PT OS', icon: Sparkles, gradient: 'linear-gradient(135deg, #0891B2, #22D3EE)' },
];

const DECORATIVE_BLOBS = [
  'radial-gradient(circle at 20% 30%, rgba(236,72,153,0.12) 0%, transparent 50%)',
  'radial-gradient(circle at 80% 20%, rgba(139,92,246,0.10) 0%, transparent 50%)',
  'radial-gradient(circle at 60% 80%, rgba(34,211,238,0.08) 0%, transparent 50%)',
  'radial-gradient(circle at 10% 70%, rgba(251,191,36,0.10) 0%, transparent 50%)',
];

function formatINRShort(n: number): string {
  if (n >= 10000000) return (n / 10000000).toFixed(1) + 'Cr';
  if (n >= 100000) return (n / 100000).toFixed(1) + 'L';
  if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
  return Math.round(n).toString();
}

export default function DashboardPage() {
  return (
    <Guard>
      <ErrorBoundary>
        <DashboardContent />
      </ErrorBoundary>
    </Guard>
  );
}

function DashboardContent() {
  const [period, setPeriod] = React.useState('Last 7 Days');
  const { data, loading, error, refresh } = useDashboardData(period);

  const headerLeft = (
    <>
      <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 via-violet-500 to-cyan-500 shadow-[0_4px_12px_rgba(236,72,153,0.35)]">
        <LayoutDashboard size={16} strokeWidth={2} className="text-white" />
        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]" />
      </div>
      <h1 className="text-[15px] font-extrabold tracking-[-0.02em] bg-gradient-to-r from-pink-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent leading-none whitespace-nowrap">
        Dashboard
      </h1>
      <button
        type="button"
        onClick={refresh}
        disabled={loading}
        aria-label="Refresh dashboard"
        className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-muted)] transition-all duration-200 hover:bg-gradient-to-br hover:from-violet-500/10 hover:to-cyan-500/10 hover:text-violet-400 hover:border-violet-400/30 disabled:opacity-50"
      >
        <RefreshCw size={12} strokeWidth={1.8} className={loading ? 'animate-spin' : ''} />
      </button>
    </>
  );

  return (
    <AppShell headerLeft={headerLeft}>
      <div className="relative">
        {DECORATIVE_BLOBS.map((blob, i) => (
          <div
            key={i}
            className="pointer-events-none fixed inset-0"
            style={{ background: blob }}
          />
        ))}
        <div className="relative z-10 mt-4 space-y-6 max-w-[1600px] mx-auto pb-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <DateRangeFilter value={period} onChange={setPeriod} />
            <QuickActions />
          </div>

          {loading && !data && <DashboardSkeleton />}

          {error && !data && (
            <DashboardEmptyState
              title="Failed to load dashboard"
              description={error.message}
              action={{ label: 'Try again', onClick: refresh }}
            />
          )}

          {data && <DashboardBody data={data} />}
        </div>
      </div>
    </AppShell>
  );
}

function QuickActions() {
  const [hovered, setHovered] = React.useState<string | null>(null);
  return (
    <div className="flex flex-wrap items-center gap-2" role="list" aria-label="Quick actions">
      {QUICK_ACTIONS.map((action) => {
        const Icon = action.icon;
        const isHovered = hovered === action.href;
        return (
          <Link
            key={action.href}
            href={action.href}
            onMouseEnter={() => setHovered(action.href)}
            onMouseLeave={() => setHovered(null)}
            style={{
              background: isHovered ? action.gradient : undefined,
              color: isHovered ? '#fff' : undefined,
              borderColor: isHovered ? 'transparent' : undefined,
              boxShadow: isHovered ? '0 4px 16px rgba(0,0,0,0.12)' : undefined,
            }}
            className="group inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5 text-[12px] font-semibold text-[var(--text-secondary)] transition-all duration-300 hover:-translate-y-0.5"
            role="listitem"
          >
            <Icon size={13} strokeWidth={1.8} />
            {action.label}
          </Link>
        );
      })}
    </div>
  );
}

function DashboardBody({ data }: { data: DashboardData }) {
  const c = data.clients;
  const r = data.revenue;
  const totalDues = data.total_dues;
  const collected = Math.max(r.period, 0);
  const collectedPct =
    collected + totalDues > 0 ? (collected / (collected + totalDues)) * 100 : 0;

  const revenueSpark = data.monthly_chart.slice(-7).map((m) => m.revenue);
  const duesSpark = revenueSpark.map((v) => Math.max(0, Math.round(v * 0.25)));
  const renewalsSpark = revenueSpark.map((v) =>
    Math.max(0, Math.round((v / Math.max(r.month, 1)) * 12)),
  );

  const inactive = c.expired + c.frozen;
  const totalForPct = c.total || 1;

  const target = r.month > 0 ? Math.round(r.month * 1.25) : 500000;
  const current = r.month;

  return (
    <>
      <BusinessSummary
        revenue={r.today}
        newClients={c.new_this_month}
        renewals={data.pending_renewals}
      />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <PremiumKpiCard
          label="Today's Sale"
          value={r.today}
          prefix="₹"
          gradient="pink"
          icon={<DollarSign size={18} strokeWidth={2} />}
          format={formatINRShort}
          trend={revenueSpark}
          index={0}
        />
        <PremiumKpiCard
          label="Collected Payments"
          value={r.period}
          prefix="₹"
          gradient="violet"
          icon={<CheckCircle size={18} strokeWidth={2} />}
          format={formatINRShort}
          trend={revenueSpark}
          index={1}
        />
        <PremiumKpiCard
          label="Pending Payments"
          value={totalDues}
          prefix="₹"
          gradient="amber"
          icon={<Clock size={18} strokeWidth={2} />}
          format={formatINRShort}
          trend={duesSpark}
          index={2}
        />
        <PremiumKpiCard
          label="Upcoming Renewals"
          value={data.expiring_soon}
          gradient="cyan"
          icon={<RefreshCw size={18} strokeWidth={2} />}
          trend={renewalsSpark}
          index={3}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <ActivityCard
          title="New Clients"
          count={c.new_this_month}
          gradient="pink"
          icon={<UserPlus size={20} strokeWidth={2} />}
          index={0}
        />
        <ActivityCard
          title="Renewals"
          count={data.pending_renewals}
          gradient="violet"
          icon={<RefreshCw size={20} strokeWidth={2} />}
          index={1}
        />
        <ActivityCard
          title="Upgrades"
          count={0}
          gradient="amber"
          icon={<Activity size={20} strokeWidth={2} />}
          index={2}
        />
        <ActivityCard
          title="Check-ins"
          count={data.attendance_today}
          gradient="cyan"
          icon={<CheckCircle size={20} strokeWidth={2} />}
          index={3}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.25 }}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        <ClientOverviewCard
          label="Total Clients"
          total={c.total}
          percentage={100}
          trend={0}
          gradient="pink"
          icon={<Users size={20} strokeWidth={2} />}
          index={0}
        />
        <ClientOverviewCard
          label="Active Clients"
          total={c.active}
          percentage={totalForPct > 0 ? (c.active / totalForPct) * 100 : 0}
          trend={0}
          gradient="violet"
          icon={<Activity size={20} strokeWidth={2} />}
          index={1}
        />
        <ClientOverviewCard
          label="Inactive Clients"
          total={inactive}
          percentage={totalForPct > 0 ? (inactive / totalForPct) * 100 : 0}
          trend={0}
          gradient="cyan"
          icon={<Users size={20} strokeWidth={2} />}
          index={2}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-gradient-to-br from-violet-500/5 via-fuchsia-500/5 to-cyan-500/5 p-5 sm:p-6 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.08)]"
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-pink-500/5 via-violet-500/5 to-cyan-500/5" />
        <div className="relative mb-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[14px] font-bold bg-gradient-to-r from-pink-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
              Revenue Trend
            </p>
            <p className="text-[11px] text-[var(--text-muted)]">
              Monthly revenue over the last {data.monthly_chart.length} months
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-pink-500/10 to-violet-500/10 px-3 py-1 text-[11px] font-semibold text-violet-400">
            <TrendingUp size={12} strokeWidth={2.5} />
            +{(r.month > 0 && r.period > 0) ? Math.round((r.period - r.month) / r.month * 100) : 0}%
          </span>
        </div>
        <RevenueTrendChart
          data={data.monthly_chart.map((m) => ({ date: m.month, amount: m.revenue }))}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.35 }}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        <CollectionRateWidget
          percentage={collectedPct}
          collected={collected}
          pending={totalDues}
        />
        <ClientGrowthWidget
          data={data.monthly_chart.map((m) => ({ month: m.month, new: m.count, lost: 0 }))}
        />
        <MonthlyTargetGauge current={current} target={target} />
      </motion.div>
    </>
  );
}
