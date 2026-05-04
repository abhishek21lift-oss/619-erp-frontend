'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { api, DashSummary, Trainer, Client } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { fmtDate } from '@/lib/format';

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
    { label: '+ Add Enquiry',       href: '/sales/enquiry',   cls: 'qb-outline' },
    { label: '⚡ Quick Billing',    href: '/payments?new=1',  cls: 'qb-dark'    },
    { label: '🧾 Receipts',         href: '/payments',        cls: 'qb-blue'    },
    { label: '↺ Quick Follow Up',  href: '/sales/leads',     cls: 'qb-green'   },
    { label: '📱 QR Codes',         href: '/settings',        cls: 'qb-teal'    },
  ];

  return (
    <AppShell>
      <div className="ydl-dash">

        {/* ── Date filter tabs ── */}
        <div className="ydl-period-bar">
          {PERIOD_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`ydl-period-tab${period === t.id ? ' active' : ''}`}
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
            <div className="ydl-dash-body">

              {/* ── Left column ── */}
              <div className="ydl-dash-left">

                {/* KPI row 1 */}
                <div className="ydl-kpi-row ydl-kpi-row-3">
                  <YdlKpi label="TODAY'S SALE"       value={fmtK(d.revenue?.today ?? d.revenue?.month ?? 0)} icon="🧾" tone="orange" href="/payments"           />
                  <YdlKpi label="COLLECTED PAYMENTS" value={fmtK(d.revenue?.month ?? 0)}                     icon="✔"  tone="green"  href="/finance/collection"  />
                  <YdlKpi label="PENDING PAYMENTS"   value={fmtK(d.total_dues ?? 0)}                         icon="⏳" tone="amber"  href="/finance/dues"         />
                </div>

                {/* KPI row 2 */}
                <div className="ydl-kpi-row ydl-kpi-row-4">
                  <YdlKpi label="NEW CLIENTS" value={String(d.clients?.new_this_month ?? 0)} icon="👥" tone="blue"   href="/clients/new"              />
                  <YdlKpi label="RENEWALS"    value={String(d.expiring_soon ?? 0)}            icon="↻"  tone="green"  href="/members/expiring"          />
                  <YdlKpi label="UPGRADE"     value="0"                                       icon="⬆"  tone="purple" href="/memberships/subscriptions" />
                  <YdlKpi label="CHECK-INS"   value={String(d.attendance_today ?? 0)}         icon="📍" tone="red"    href="/attendance"                />
                </div>

                {/* Client stat row */}
                <div className="ydl-client-stats">
                  <div className="ydl-client-stat">
                    <span className="ydl-cs-icon ydl-cs-total">👤</span>
                    <span className="ydl-cs-num">{d.clients?.total ?? 0}</span>
                    <span className="ydl-cs-label">Total Clients</span>
                  </div>
                  <div className="ydl-client-stat">
                    <span className="ydl-cs-icon ydl-cs-active">👤</span>
                    <span className="ydl-cs-num ydl-cs-active-num">{d.clients?.active ?? 0}</span>
                    <span className="ydl-cs-label">Active Clients</span>
                  </div>
                  <div className="ydl-client-stat">
                    <span className="ydl-cs-icon ydl-cs-inactive">👤</span>
                    <span className="ydl-cs-num ydl-cs-inactive-num">{d.clients?.expired ?? 0}</span>
                    <span className="ydl-cs-label">Inactive Clients</span>
                  </div>
                </div>

                {/* Enquiry stats row */}
                <div className="ydl-enquiry-row">
                  <div className="ydl-enq-stat">
                    <span className="ydl-enq-icon">ℹ</span>
                    <span className="ydl-enq-num">0</span>
                    <span className="ydl-enq-label">Total Enquiries</span>
                  </div>
                  <div className="ydl-enq-stat">
                    <span className="ydl-enq-icon ydl-enq-open">○</span>
                    <span className="ydl-enq-num">0</span>
                    <span className="ydl-enq-label">Open Enquiries</span>
                  </div>
                  <div className="ydl-enq-stat">
                    <span className="ydl-enq-icon ydl-enq-converted">✔</span>
                    <span className="ydl-enq-num">0</span>
                    <span className="ydl-enq-label">Converted Enquiries</span>
                  </div>
                  <div className="ydl-enq-stat">
                    <span className="ydl-enq-icon ydl-enq-lost">✗</span>
                    <span className="ydl-enq-num">0</span>
                    <span className="ydl-enq-label">Lost Enquiries</span>
                  </div>
                </div>

                {/* Recent payments table */}
                {isAdmin && (d.recent_payments?.length ?? 0) > 0 && (
                  <div className="ydl-panel">
                    <div className="ydl-panel-hdr">
                      <span>Recent Payments</span>
                      <Link href="/payments" className="ydl-panel-link">View all &rarr;</Link>
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

              {/* ── Right: Summary panel ── */}
              <div className="ydl-summary-panel">
                <div className="ydl-summary-title">Summary.</div>
                <div className="ydl-summary-list">
                  <SummaryRow label="Follow-Ups"                    value={0}                      href="/sales/leads"               />
                  <SummaryRow label="Appointments"                  value={0}                      href="/attendance"                />
                  <SummaryRow label="Classes"                       value={0}                      href="/attendance"                />
                  <SummaryRow label="Expired Subscriptions"         value={d.clients?.expired ?? 0} href="/members/lapsed"   tone="red"    />
                  <SummaryRow label="Subscriptions About to Expire" value={d.expiring_soon ?? 0}   href="/members/expiring" tone="amber"  />
                  <SummaryRow label="Active PT Subscriptions"       value={trainerStats.reduce((s, t) => s + t.activePtClients, 0)} href="/memberships/subscriptions" tone="green"  />
                  <SummaryRow label="Expired PT Subscriptions"      value={0}                      href="/memberships/subscriptions" tone="red"    />
                  <SummaryRow label="Pending Renewals"              value={d.expiring_soon ?? 0}   href="/members/expiring" tone="orange" />
                  <SummaryRow label="Client Birthdays"              value={0}                      href="/members/birthdays"         />
                  <SummaryRow label="Client Anniversaries"          value={0}                      href="/members/birthdays"         />
                </div>
              </div>
            </div>

            {/* ── Trainer Performance Section (admin only) ── */}
            {isAdmin && trainerStats.length > 0 && (
              <TrainerPerformanceSection stats={trainerStats} />
            )}
          </>
        ) : null}

        {/* ── Quick action buttons ── */}
        <div className="ydl-quick-btns">
          {quickBtns.map((b) => (
            <Link key={b.href + b.label} href={b.href} className={`ydl-qb ${b.cls}`}>
              {b.label}
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
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
          <span className="tp-header-icon">🏋️</span>
          <div>
            <div className="tp-header-title">Trainer Performance</div>
            <div className="tp-header-sub">Monthly PT revenue &amp; incentive breakdown</div>
          </div>
        </div>
        <Link href="/finance/trainer-revenue" className="tp-header-link">
          Full Report →
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
            ? '✓ Above ₹50K threshold'
            : `₹${Math.round((PT_THRESHOLD - monthlyPtRev) / 1000)}K to 50% incentive`}
        </span>
      </div>
    </Link>
  );
}

/* ─── Sub-components ──────────────────────────────────── */

function YdlKpi({
  label, value, icon, tone, href,
}: {
  label: string; value: string; icon: string; tone: string; href?: string;
}) {
  const body = (
    <div className={`ydl-kpi ydl-kpi-${tone}`}>
      <div className="ydl-kpi-top">
        <div className="ydl-kpi-label">{label}</div>
        <div className={`ydl-kpi-icon ydl-kpi-icon-${tone}`}>{icon}</div>
      </div>
      <div className="ydl-kpi-value">{value}</div>
      {href && <div className="ydl-kpi-link">View More</div>}
    </div>
  );
  return href ? (
    <Link href={href} style={{ textDecoration: 'none', display: 'block' }}>{body}</Link>
  ) : body;
}

function SummaryRow({
  label, value, href, tone,
}: {
  label: string; value: number; href?: string; tone?: string;
}) {
  const inner = (
    <div className="ydl-sum-row">
      <span className="ydl-sum-label">{label}</span>
      <span className={`ydl-sum-val${tone ? ' ydl-sum-' + tone : ''}`}>{value}</span>
    </div>
  );
  return href ? (
    <Link href={href} style={{ textDecoration: 'none' }}>{inner}</Link>
  ) : inner;
}

function DashSkeleton() {
  return (
    <div className="ydl-dash-body">
      <div className="ydl-dash-left">
        <div className="ydl-kpi-row ydl-kpi-row-3">
          {[0,1,2].map((i) => <div key={i} className="ydl-kpi skeleton" style={{ height: 90 }} />)}
        </div>
        <div className="ydl-kpi-row ydl-kpi-row-4">
          {[0,1,2,3].map((i) => <div key={i} className="ydl-kpi skeleton" style={{ height: 80 }} />)}
        </div>
        <div className="ydl-client-stats">
          {[0,1,2].map((i) => <div key={i} className="ydl-client-stat skeleton" style={{ height: 70, borderRadius: 8 }} />)}
        </div>
      </div>
      <div className="ydl-summary-panel">
        <div className="skeleton" style={{ height: 24, width: '60%', marginBottom: 16 }} />
        {[...Array(8)].map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 18, marginBottom: 10, borderRadius: 4 }} />
        ))}
      </div>
    </div>
  );
}
