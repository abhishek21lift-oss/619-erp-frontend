'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  LayoutDashboard, Search, Bell, RefreshCw,
  CheckCircle, Clock, UserPlus, Users, DollarSign, Activity,
  UserPlus as UserPlusIcon, ScanFace, PlusCircle, Sparkles,
} from 'lucide-react';

import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useAuth } from '@/lib/auth-context';
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
  { href: '/clients/new', label: 'Add Member', icon: PlusCircle, color: 'var(--brand-lo)' },
  { href: '/sales/enquiry', label: 'New Lead', icon: UserPlusIcon, color: 'var(--accent)' },
  { href: '/checkin', label: 'Check-In', icon: ScanFace, color: 'var(--success)' },
  { href: '/finance/record-payment', label: 'Record Payment', icon: DollarSign, color: 'var(--warning)' },
  { href: '/pt-os', label: 'PT OS', icon: Sparkles, color: 'var(--danger)' },
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
  const { user } = useAuth();
  const [period, setPeriod] = React.useState('Last 7 Days');
  const { data, loading, error, refresh } = useDashboardData(period);

  const today = React.useMemo(
    () =>
      new Date().toLocaleDateString('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    [],
  );

  const initial = React.useMemo(
    () => (user?.name || user?.email || 'A').charAt(0).toUpperCase(),
    [user?.name, user?.email],
  );

  return (
    <AppShell>
      <StickyHeader today={today} initial={initial} loading={loading} onRefresh={refresh} />
      <div className="mt-4 space-y-6 max-w-[1600px] mx-auto pb-6">
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
    </AppShell>
  );
}

function StickyHeader({
  today,
  initial,
  loading,
  onRefresh,
}: {
  today: string;
  initial: string;
  loading: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="sticky top-16 z-30 -mx-4 sm:-mx-6 lg:-mx-8 mb-4 border-b border-[var(--border)] bg-[var(--topbar-bg)] backdrop-blur-2xl">
      <div className="flex items-center gap-3 px-4 sm:px-6 lg:px-8 py-3 max-w-[1600px] mx-auto">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#8B5CF6] via-[#3B82F6] to-[#06B6D4] shadow-[0_4px_16px_rgba(139,92,246,0.25)]">
            <LayoutDashboard size={18} strokeWidth={2} className="text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-[16px] sm:text-[18px] font-extrabold tracking-[-0.02em] text-[var(--text-primary)] leading-none truncate">
              Dashboard
            </h1>
            <p className="mt-0.5 text-[11px] text-[var(--text-muted)] truncate hidden sm:block">
              {today}
            </p>
          </div>
        </div>

        <div className="hidden md:block flex-1 max-w-[480px]">
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              strokeWidth={1.8}
            />
            <input
              type="text"
              placeholder="Search clients, payments, plans..."
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] py-2 pl-10 pr-4 text-[13px] text-[var(--text-primary)] outline-none transition-all duration-200 focus:bg-[var(--bg-card)] focus:border-[var(--brand)] focus:shadow-[0_0_0_3px_var(--brand-soft)] placeholder-[var(--text-disabled)]"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            aria-label="Refresh dashboard"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] disabled:opacity-50"
          >
            <RefreshCw
              size={15}
              strokeWidth={1.8}
              className={loading ? 'animate-spin' : ''}
            />
          </button>
          <button
            type="button"
            aria-label="Notifications"
            className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
          >
            <Bell size={15} strokeWidth={1.8} />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[var(--danger)]" />
          </button>
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl text-white text-[12px] font-bold shadow-[0_4px_12px_rgba(59,130,246,0.30)]"
            style={{ background: 'linear-gradient(135deg, #3B82F6, #60A5FA)' }}
            aria-label="Profile"
          >
            {initial}
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickActions() {
  return (
    <div className="flex flex-wrap items-center gap-2" role="list" aria-label="Quick actions">
      {QUICK_ACTIONS.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.href}
            href={action.href}
            className="group inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5 text-[12px] font-semibold text-[var(--text-secondary)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_14px_rgba(0,0,0,0.06)] hover:text-[var(--text-primary)]"
            role="listitem"
          >
            <Icon size={13} strokeWidth={1.8} style={{ color: action.color }} />
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <PremiumKpiCard
          label="Today's Sale"
          value={r.today}
          prefix="₹"
          gradient="blue"
          icon={<DollarSign size={18} strokeWidth={2} />}
          format={formatINRShort}
          trend={revenueSpark}
          index={0}
        />
        <PremiumKpiCard
          label="Collected Payments"
          value={r.period}
          prefix="₹"
          gradient="green"
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
          gradient="purple"
          icon={<RefreshCw size={18} strokeWidth={2} />}
          trend={renewalsSpark}
          index={3}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ActivityCard
          title="New Clients"
          count={c.new_this_month}
          gradient="blue"
          icon={<UserPlus size={20} strokeWidth={2} />}
          index={0}
        />
        <ActivityCard
          title="Renewals"
          count={data.pending_renewals}
          gradient="green"
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
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ClientOverviewCard
          label="Total Clients"
          total={c.total}
          percentage={100}
          trend={0}
          gradient="blue"
          icon={<Users size={20} strokeWidth={2} />}
          index={0}
        />
        <ClientOverviewCard
          label="Active Clients"
          total={c.active}
          percentage={totalForPct > 0 ? (c.active / totalForPct) * 100 : 0}
          trend={0}
          gradient="green"
          icon={<Activity size={20} strokeWidth={2} />}
          index={1}
        />
        <ClientOverviewCard
          label="Inactive Clients"
          total={inactive}
          percentage={totalForPct > 0 ? (inactive / totalForPct) * 100 : 0}
          trend={0}
          gradient="purple"
          icon={<Users size={20} strokeWidth={2} />}
          index={2}
        />
      </div>

      <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-5 sm:p-6 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.08)]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-[var(--text-primary)]">
              Revenue Trend
            </p>
            <p className="text-[11px] text-[var(--text-muted)]">
              Monthly revenue over the last {data.monthly_chart.length} months
            </p>
          </div>
        </div>
        <RevenueTrendChart
          data={data.monthly_chart.map((m) => ({ date: m.month, amount: m.revenue }))}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <CollectionRateWidget
          percentage={collectedPct}
          collected={collected}
          pending={totalDues}
        />
        <ClientGrowthWidget
          data={data.monthly_chart.map((m) => ({ month: m.month, new: m.count, lost: 0 }))}
        />
        <MonthlyTargetGauge current={current} target={target} />
      </div>
    </>
  );
}
