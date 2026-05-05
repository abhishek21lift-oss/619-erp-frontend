'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { api, DashSummary, Trainer, Client } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { fmtDate } from '@/lib/format';
import { SkeletonKpi, Skeleton } from '@/components/Skeleton';
import {
  TrendingUp,
  CheckCircle2,
  Clock,
  UserPlus,
  RefreshCw,
  ArrowUpCircle,
  Scan,
  Users,
  UserCheck,
  UserX,
  Dumbbell,
  ExternalLink,
  Plus,
  Zap,
  Receipt,
  MessageSquare,
  QrCode,
  TrendingDown,
} from 'lucide-react';

export default function DashboardPage() {
  return (
    <Guard>
      <DashContent />
    </Guard>
  );
}

/* ─── helpers ─────────────────────────────────────────── */
function fmt(n: number | string) {
  return '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}
function fmtK(n: number | string) {
  const v = Number(n || 0);
  if (v >= 10000000) return '₹' + (v / 10000000).toFixed(1) + 'Cr';
  if (v >= 100000)   return '₹' + (v / 100000).toFixed(1) + 'L';
  if (v >= 1000)     return '₹' + (v / 1000).toFixed(1) + 'K';
  return '₹' + v.toLocaleString('en-IN');
}

/** Package → months divisor for monthly PT revenue calculation */
const PKG_MONTHS: Record<string, number> = {
  monthly: 1, 'Monthly': 1,
  quarterly: 3, 'Quarterly': 3,
  'half yearly': 6, 'Half Yearly': 6,
  yearly: 12, 'Yearly': 12,
  pt: 3, 'PT': 3,
  '3 months': 3, '6 months': 6, '12 months': 12,
};
function pkgMonths(pkg?: string): number {
  if (!pkg) return 1;
  return PKG_MONTHS[pkg] ?? PKG_MONTHS[pkg.toLowerCase()] ?? 1;
}

/** Per-trainer computed stats */
type TrainerStat = {
  trainer: Trainer;
  activePtClients: number;
  monthlyPtRev: number;
  incentiveRate: number;
  incentiveEarned: number;
};

function computeTrainerStats(trainers: Trainer[], clients: Client[]): TrainerStat[] {
  const today = new Date();
  const map = new Map<string, TrainerStat>();

  for (const t of trainers) {
    map.set(t.id, {
      trainer: t,
      activePtClients: 0,
      monthlyPtRev: 0,
      incentiveRate: 0,
      incentiveEarned: 0,
    });
  }

  for (const c of clients) {
    if (!c.trainer_id) continue;
    const stat = map.get(c.trainer_id);
    if (!stat) continue;

    /* Only count clients with an active PT end date */
    const ptEnd = c.pt_end_date ? new Date(c.pt_end_date) : null;
    if (ptEnd && ptEnd >= today) {
      stat.activePtClients += 1;
      const months = pkgMonths(c.package_type);
      const monthlyRev = (Number(c.final_amount) || 0) / months;
      stat.monthlyPtRev += monthlyRev;
    }
  }

  /* Apply incentive rule */
  for (const stat of map.values()) {
    stat.incentiveRate = stat.monthlyPtRev >= 50000 ? 0.5 : 0.4;
    stat.incentiveEarned = stat.monthlyPtRev * stat.incentiveRate;
  }

  return Array.from(map.values())
    .filter((s) => s.activePtClients > 0 || s.trainer.status !== 'inactive')
    .sort((a, b) => b.monthlyPtRev - a.monthlyPtRev);
}

/* ─── period tabs ─────────────────────────────────────── */
type Period = 'today' | '7d' | '15d' | '30d' | '90d' | 'custom';
const PERIOD_TABS: { id: Period; label: string }[] = [
  { id: 'today',  label: 'Today' },
  { id: '7d',     label: 'Last 7 Days' },
  { id: '15d',    label: 'Last 15 Days' },
  { id: '30d',    label: 'Last 30 Days' },
  { id: '90d',    label: 'Last 90 Days' },
  { id: 'custom', label: 'Custom Date' },
];

/* ─── main content ────────────────────────────────────── */
function DashContent() {
  const { user } = useAuth();
  const [data,     setData]     = useState<DashSummary | null>(null);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [clients,  setClients]  = useState<Client[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [period,   setPeriod]   = useState<Period>('today');
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    const p1 = api.dashboard.summary().then(setData).catch((e) => setError(e.message));
    const p2 = isAdmin
      ? Promise.all([
          api.trainers.list().then(setTrainers).catch(() => {}),
          api.clients.list({ limit: 2000 }).then((r: any) => {
            const list: Client[] = Array.isArray(r) ? r : (r?.clients ?? r?.data ?? []);
            setClients(list);
          }).catch(() => {}),
        ])
      : Promise.resolve();
    Promise.all([p1, p2]).finally(() => setLoading(false));
  }, [isAdmin]);

  const d = data;
  const trainerStats = isAdmin ? computeTrainerStats(trainers, clients) : [];

  const quickBtns = [
    { label: 'Add Enquiry',      href: '/sales/enquiry',  Icon: Plus,        cls: 'qb-outline' },
    { label: 'Quick Billing',    href: '/payments?new=1', Icon: Zap,         cls: 'qb-dark'    },
    { label: 'Receipts',         href: '/payments',       Icon: Receipt,     cls: 'qb-blue'    },
    { label: 'Follow Up',        href: '/sales/leads',    Icon: MessageSquare, cls: 'qb-green'  },
    { label: 'Face Check-in',    href: '/checkin',        Icon: Scan,        cls: 'qb-red'     },
  ];

  return (
    <AppShell>
      <div className="page-main page-enter">
        <div className="page-content">

          {/* ── Period tabs ── */}
          <div className="period-bar">
            {PERIOD_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`period-tab${period === t.id ? ' active' : ''}`}
                onClick={() => setPeriod(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          {loading ? (
            <DashSkeleton />
          ) : d ? (
            <>
              {/* ── KPI Grid Row 1 (3 cols) ── */}
              <div className="kpi-grid kpi-grid-3">
                <KpiCard
                  label="TODAY'S SALE"
                  value={fmtK(d.revenue?.today ?? d.revenue?.month ?? 0)}
                  icon={TrendingUp}
                  gradient="linear-gradient(135deg, #f97316 0%, #fb923c 100%)"
                  href="/payments"
                />
                <KpiCard
                  label="COLLECTED PAYMENTS"
                  value={fmtK(d.revenue?.month ?? 0)}
                  icon={CheckCircle2}
                  gradient="linear-gradient(135deg, #22c55e 0%, #86efac 100%)"
                  href="/finance/collection"
                />
                <KpiCard
                  label="PENDING PAYMENTS"
                  value={fmtK(d.total_dues ?? 0)}
                  icon={Clock}
                  gradient="linear-gradient(135deg, #eab308 0%, #facc15 100%)"
                  href="/finance/dues"
                />
              </div>

              {/* ── KPI Grid Row 2 (4 cols) ── */}
              <div className="kpi-grid kpi-grid-4">
                <KpiCard
                  label="NEW CLIENTS"
                  value={String(d.clients?.new_this_month ?? 0)}
                  icon={UserPlus}
                  gradient="linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)"
                  href="/clients/new"
                />
                <KpiCard
                  label="RENEWALS"
                  value={String(d.expiring_soon ?? 0)}
                  icon={RefreshCw}
                  gradient="linear-gradient(135deg, #8b5cf6 0%, #c4b5fd 100%)"
                  href="/members/expiring"
                />
                <KpiCard
                  label="UPGRADE"
                  value="0"
                  icon={ArrowUpCircle}
                  gradient="linear-gradient(135deg, #ec4899 0%, #f472b6 100%)"
                  href="/memberships/subscriptions"
                />
                <KpiCard
                  label="CHECK-INS"
                  value={String(d.attendance_today ?? 0)}
                  icon={Scan}
                  gradient="linear-gradient(135deg, #ef4444 0%, #fca5a5 100%)"
                  href="/attendance"
                />
              </div>

              {/* ── Client Stats Row ── */}
              <div className="client-stats-row">
                <div className="stat-card">
                  <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)' }}>
                    <Users size={20} color="#fff" strokeWidth={1.5} />
                  </div>
                  <div className="stat-content">
                    <div className="stat-value">{d.clients?.total ?? 0}</div>
                    <div className="stat-label">TOTAL CLIENTS</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' }}>
                    <UserCheck size={20} color="#fff" strokeWidth={1.5} />
                  </div>
                  <div className="stat-content">
                    <div className="stat-value">{d.clients?.active ?? 0}</div>
                    <div className="stat-label">ACTIVE CLIENTS</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' }}>
                    <UserX size={20} color="#fff" strokeWidth={1.5} />
                  </div>
                  <div className="stat-content">
                    <div className="stat-value">{d.clients?.expired ?? 0}</div>
                    <div className="stat-label">INACTIVE CLIENTS</div>
                  </div>
                </div>
              </div>

              {/* ── Summary Panel & Recent Payments ── */}
              <div className="summary-wrapper">
                {/* Left: Summary */}
                <div className="summary-panel">
                  <div className="summary-title">Summary</div>
                  <div className="summary-list">
                    <SummaryRow
                      label="Expired Subscriptions"
                      value={d.clients?.expired ?? 0}
                      href="/members/lapsed"
                      tone="red"
                    />
                    <SummaryRow
                      label="Subscriptions About to Expire"
                      value={d.expiring_soon ?? 0}
                      href="/members/expiring"
                      tone="amber"
                    />
                    <SummaryRow
                      label="Active PT Subscriptions"
                      value={d.active_pt_clients ?? trainerStats.reduce((s: number, t: any) => s + (t.activePtClients ?? 0), 0)}
                      href="/memberships/subscriptions"
                      tone="green"
                    />
                    <SummaryRow
                      label="Pending Renewals"
                      value={d.pending_renewals ?? d.expiring_soon ?? 0}
                      href="/members/expiring"
                      tone="orange"
                    />
                    <SummaryRow
                      label="Client Birthdays"
                      value={d.birthdays_today ?? 0}
                      href="/members/birthdays"
                    />
                    <SummaryRow
                      label="Client Anniversaries"
                      value={d.anniversaries_today ?? 0}
                      href="/members/birthdays"
                    />
                  </div>
                </div>

                {/* Right: Recent Payments Table */}
                {isAdmin && (d.recent_payments?.length ?? 0) > 0 && (
                  <div className="recent-payments-panel">
                    <div className="panel-header">
                      <span>Recent Payments</span>
                      <Link href="/payments" className="panel-link">View all</Link>
                    </div>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Member</th><th>Amount</th><th>Method</th><th>Coach</th><th>Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {d.recent_payments.map((p: any) => (
                            <tr key={p.id}>
                              <td style={{ fontWeight: 600 }}>{p.client_name || '—'}</td>
                              <td style={{ fontWeight: 700, color: 'var(--success)' }} className="tabular">{fmt(p.amount)}</td>
                              <td><span className={`badge badge-${(p.method || 'cash').toLowerCase()}`}>{p.method}</span></td>
                              <td className="text-muted">{p.trainer_name || '—'}</td>
                              <td className="text-muted">{fmtDate(p.date)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Trainer Performance Section (admin only) ── */}
              {isAdmin && trainerStats.length > 0 && (
                <TrainerPerformanceSection stats={trainerStats} />
              )}
            </>
          ) : null}

          {/* ── Quick Action Buttons ── */}
          <div className="quick-actions">
            {quickBtns.map((b) => (
              <Link key={b.href + b.label} href={b.href} className={`quick-btn ${b.cls}`} title={b.label}>
                <b.Icon size={18} strokeWidth={2} />
                <span>{b.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

/* ─── KPI Card Component ────────────────────────────────── */
function KpiCard({
  label,
  value,
  icon: Icon,
  gradient,
  href,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<any>;
  gradient: string;
  href?: string;
}) {
  const inner = (
    <div className="kpi-card lift" style={{ '--kpi-gradient': gradient } as any}>
      <div className="kpi-card-header">
        <span className="kpi-card-label">{label}</span>
        <div className="kpi-card-icon" style={{ background: gradient }}>
          <Icon size={18} strokeWidth={2} color="#fff" />
        </div>
      </div>
      <div className="kpi-card-value">{value}</div>
      {href && (
        <div className="kpi-card-footer">
          View details
          <ExternalLink size={12} style={{ marginLeft: 4 }} />
        </div>
      )}
    </div>
  );
  return href ? (
    <Link href={href} style={{ textDecoration: 'none', display: 'block' }}>
      {inner}
    </Link>
  ) : (
    inner
  );
}

/* ─── Summary Row Component ────────────────────────────── */
function SummaryRow({
  label,
  value,
  href,
  tone,
}: {
  label: string;
  value: number;
  href?: string;
  tone?: string;
}) {
  const inner = (
    <div className="summary-row">
      <span className="summary-label">{label}</span>
      <div className="summary-value-wrapper">
        {tone && <div className={`tone-dot tone-${tone}`} />}
        <span className={`summary-value${tone ? ' summary-' + tone : ''}`}>{value}</span>
      </div>
    </div>
  );
  return href ? (
    <Link href={href} style={{ textDecoration: 'none' }}>
      {inner}
    </Link>
  ) : (
    inner
  );
}

/* ─── Trainer Performance Section ────────────────────── */
const PT_THRESHOLD = 50000;

function TrainerPerformanceSection({ stats }: { stats: TrainerStat[] }) {
  const totalPtRev = stats.reduce((s, t) => s + t.monthlyPtRev, 0);
  const totalIncentive = stats.reduce((s, t) => s + t.incentiveEarned, 0);
  const totalPtClients = stats.reduce((s, t) => s + t.activePtClients, 0);
  const highPerformers = stats.filter((s) => s.monthlyPtRev >= PT_THRESHOLD).length;

  return (
    <div className="tp-section">
      {/* Section header */}
      <div className="tp-header">
        <div className="tp-header-left">
          <div className="tp-header-icon">
            <Dumbbell size={24} strokeWidth={2} />
          </div>
          <div>
            <div className="tp-header-title">Trainer Performance</div>
            <div className="tp-header-sub">Monthly PT revenue & incentive breakdown</div>
          </div>
        </div>
        <Link href="/finance/trainer-revenue" className="tp-header-link">
          Full Report
          <ExternalLink size={14} />
        </Link>
      </div>

      {/* Summary KPIs */}
      <div className="tp-kpi-row">
        <div className="tp-kpi">
          <div className="tp-kpi-label">Total PT Revenue</div>
          <div className="tp-kpi-value tp-kpi-green">{fmtK(totalPtRev)}<span className="tp-kpi-sub">/mo</span></div>
        </div>
        <div className="tp-kpi">
          <div className="tp-kpi-label">Total Incentive Payout</div>
          <div className="tp-kpi-value tp-kpi-amber">{fmtK(totalIncentive)}</div>
        </div>
        <div className="tp-kpi">
          <div className="tp-kpi-label">Active PT Clients</div>
          <div className="tp-kpi-value tp-kpi-blue">{totalPtClients}</div>
        </div>
        <div className="tp-kpi">
          <div className="tp-kpi-label">High Performers</div>
          <div className="tp-kpi-value tp-kpi-purple">{highPerformers}<span className="tp-kpi-sub"> trainers</span></div>
        </div>
      </div>

      {/* Trainer cards grid */}
      <div className="tp-cards">
        {stats.map((s) => (
          <TrainerCard key={s.trainer.id} stat={s} />
        ))}
      </div>
    </div>
  );
}

function TrainerCard({ stat }: { stat: TrainerStat }) {
  const { trainer, activePtClients, monthlyPtRev, incentiveRate, incentiveEarned } = stat;
  const isHigh = monthlyPtRev >= PT_THRESHOLD;
  const barPct = Math.min(100, (monthlyPtRev / PT_THRESHOLD) * 100);
  const initials = trainer.name
    .split(' ')
    .map((w) => w[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <Link href={`/trainers/${trainer.id}`} className="tp-card" style={{ textDecoration: 'none' }}>
      {/* Card top */}
      <div className="tp-card-top">
        <div className="tp-avatar">{initials}</div>
        <div className="tp-card-info">
          <div className="tp-card-name">{trainer.name}</div>
          <div className="tp-card-role">{trainer.role || 'Trainer'}</div>
        </div>
        <span className={`tp-badge ${isHigh ? 'tp-badge-high' : 'tp-badge-low'}`}>
          {isHigh ? '50%' : '40%'}
        </span>
      </div>

      {/* Metrics */}
      <div className="tp-card-metrics">
        <div className="tp-metric">
          <span className="tp-metric-label">PT Clients</span>
          <span className="tp-metric-val">{activePtClients}</span>
        </div>
        <div className="tp-metric">
          <span className="tp-metric-label">Monthly Rev</span>
          <span className="tp-metric-val tp-metric-green">{fmtK(monthlyPtRev)}</span>
        </div>
        <div className="tp-metric">
          <span className="tp-metric-label">Incentive</span>
          <span className={`tp-metric-val ${isHigh ? 'tp-metric-amber' : ''}`}>{fmtK(incentiveEarned)}</span>
        </div>
      </div>

      {/* Progress bar toward Rs.50K threshold */}
      <div className="tp-bar-wrap">
        <div className="tp-bar-bg">
          <div
            className={`tp-bar-fill ${isHigh ? 'tp-bar-high' : 'tp-bar-low'}`}
            style={{ width: `${barPct}%` }}
          />
        </div>
        <span className="tp-bar-label">
          {isHigh
            ? 'Above 50K threshold'
            : `${Math.round((PT_THRESHOLD - monthlyPtRev) / 1000)}K to 50% incentive`}
        </span>
      </div>
    </Link>
  );
}

/* ─── Dashboard Skeleton ──────────────────────────────── */
function DashSkeleton() {
  return (
    <div>
      <div className="kpi-grid kpi-grid-3" style={{ marginBottom: '1rem' }}>
        {[0,1,2].map(i => <SkeletonKpi key={i} />)}
      </div>
      <div className="kpi-grid kpi-grid-4" style={{ marginBottom: '1rem' }}>
        {[0,1,2,3].map(i => <SkeletonKpi key={i} />)}
      </div>
      <div className="client-stats-row">
        {[0,1,2].map(i => (
          <div key={i} className="sk-kpi">
            <Skeleton height={14} width="50%" style={{ marginBottom: 8 }} />
            <Skeleton height={28} width="40%" />
          </div>
        ))}
      </div>
    </div>
  );
}
