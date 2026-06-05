'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  RefreshCw,
  CheckCircle, Clock, UserPlus, IndianRupee,
  ScanFace, Sparkles,
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
import { DashboardSkeleton } from '@/components/premium/DashboardSkeleton';
import { DashboardEmptyState } from '@/components/premium/DashboardEmptyState';

const QUICK_ACTIONS = [
  { href: '/checkin', label: 'Check-In', icon: ScanFace, gradient: 'linear-gradient(135deg, #10B981, #34D399)' },
  { href: '/finance/record-payment', label: 'Record Payment', icon: IndianRupee, gradient: 'linear-gradient(135deg, #D97706, #FBBF24)' },
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
  const router = useRouter();
  const [period, setPeriod] = React.useState('Last 7 Days');
  const { data, loading, error, refresh } = useDashboardData(period);

  const headerLeft = (
    <>
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

          {data && <DashboardBody data={data} router={router} />}
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

function DashboardBody({ data, router }: { data: DashboardData; router: ReturnType<typeof useRouter> }) {
  const c = data.clients;
  const r = data.revenue;
  const totalDues = data.total_dues;
  const collected = Math.max(r.period, 0);
  const collectedPct =
    collected + totalDues > 0 ? (collected / (collected + totalDues)) * 100 : 0;

  const inactive = c.expired + c.frozen;
  const totalForPct = c.total || 1;

  const target = r.month > 0 ? Math.round(r.month * 1.25) : 500000;
  const current = r.month;

  const dailyTarget = Math.max(r.month / 30, 500);
  const todaySalePct = Math.min(100, (r.today / dailyTarget) * 100);
  const collectedDonutPct = Math.min(100, collectedPct);
  const pendingDonutPct = Math.min(100, totalDues + collected > 0 ? (totalDues / (totalDues + collected)) * 100 : 0);
  const renewalsDonutPct = Math.min(100, (data.expiring_soon / Math.max(c.total, 1)) * 100);
  const newClientsDonutPct = Math.min(100, (c.new_this_month / Math.max(c.total, 1)) * 100);
  const renewalsActivityPct = Math.min(100, (data.pending_renewals / Math.max(c.total, 1)) * 100);
  const upgradesPct = 35;
  const checkinsDonutPct = Math.min(100, (data.attendance_today / Math.max(c.active, 1)) * 100);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4"
      >
        <PremiumKpiCard
          label="Today's Sale"
          value={r.today}
          prefix="₹"
          gradient="pink"
          icon={<IndianRupee size={8} strokeWidth={2} />}
          format={formatINRShort}
          donutPercent={todaySalePct}
          index={0}
          onClick={() => router.push('/sales/today')}
        />
        <PremiumKpiCard
          label="Collected Payments"
          value={r.period}
          prefix="₹"
          gradient="violet"
          icon={<CheckCircle size={8} strokeWidth={2} />}
          format={formatINRShort}
          donutPercent={collectedDonutPct}
          index={1}
          onClick={() => router.push('/finance/collected-payments')}
        />
        <PremiumKpiCard
          label="Pending Payments"
          value={totalDues}
          prefix="₹"
          gradient="amber"
          icon={<Clock size={8} strokeWidth={2} />}
          format={formatINRShort}
          donutPercent={pendingDonutPct}
          index={2}
          onClick={() => router.push('/finance/dues')}
        />
        <PremiumKpiCard
          label="Upcoming Renewals"
          value={data.expiring_soon}
          gradient="cyan"
          icon={<RefreshCw size={8} strokeWidth={2} />}
          donutPercent={renewalsDonutPct}
          index={3}
          onClick={() => router.push('/pt-os/clients')}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4"
      >
        <ActivityCard
          title="New Clients"
          count={c.new_this_month}
          donutPercent={newClientsDonutPct}
          gradient="pink"
          icon={<UserPlus size={8} strokeWidth={2} />}
          index={0}
          onClick={() => router.push('/pt-os/new-client')}
        />
        <ActivityCard
          title="Check-ins"
          count={data.attendance_today}
          donutPercent={checkinsDonutPct}
          gradient="cyan"
          icon={<CheckCircle size={8} strokeWidth={2} />}
          index={1}
          onClick={() => router.push('/attendance')}
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
          onClick={() => router.push('/finance/collection')}
        />
        <ClientGrowthWidget
          data={data.monthly_chart.map((m) => ({ month: m.month, new: m.count, lost: 0 }))}
          onClick={() => router.push('/insights/traffic')}
        />
        <MonthlyTargetGauge current={current} target={target} onClick={() => router.push('/finance/forecast')} />
      </motion.div>
    </>
  );
}
