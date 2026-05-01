'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Guard from '@/components/Guard';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import { api, DashSummary } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function DashboardPage() {
  return (
    <Guard>
      <DashContent />
    </Guard>
  );
}

// ─── helpers ────────────────────────────────────────────────────────
function fmt(n: number | string) {
  return '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}
function fmtK(n: number | string) {
  const v = Number(n || 0);
  if (v >= 10000000) return '₹' + (v / 10000000).toFixed(1) + 'Cr';
  if (v >= 100000) return '₹' + (v / 100000).toFixed(1) + 'L';
  if (v >= 1000) return '₹' + (v / 1000).toFixed(1) + 'K';
  return '₹' + v.toLocaleString('en-IN');
}
function pctDelta(curr: number, prev: number): number | null {
  if (!prev) return curr > 0 ? 100 : null;
  return ((curr - prev) / prev) * 100;
}

// ─── content ────────────────────────────────────────────────────────
function DashContent() {
  const { user } = useAuth();
  const [data, setData] = useState<DashSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    api.dashboard
      .summary()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const derived = useMemo(() => {
    if (!data) return null;
    const chart: Array<{ month: string; revenue: number; count: number }> =
      data.monthly_chart || [];
    const last = chart[chart.length - 1];
    const prev = chart[chart.length - 2];
    const revenueDelta = last && prev ? pctDelta(last.revenue, prev.revenue) : null;
    const checkinDelta = null;
    const memberDelta = null;
    const revSeries = chart.map((c) => c.revenue);

    const alerts: Array<{
      id: string;
      tone: 'warning' | 'danger' | 'info';
      title: string;
      cta?: { label: string; href: string };
    }> = [];

    if (data.expiring_soon > 0) {
      alerts.push({
        id: 'al-exp',
        tone: 'warning',
        title: `${data.expiring_soon} membership${
          data.expiring_soon > 1 ? 's' : ''
        } expire in the next 7 days. Lock in renewals before they lapse.`,
        cta: { label: 'View list', href: '/clients?segment=expiring' },
      });
    }
    if (Number(data.total_dues || 0) > 0) {
      alerts.push({
        id: 'al-dues',
        tone: 'danger',
        title: `${fmtK(data.total_dues)} in outstanding dues across the studio.`,
        cta: { label: 'Send reminders', href: '/reports?view=dues' },
      });
    }
    if (revenueDelta !== null && revenueDelta < -5) {
      alerts.push({
        id: 'al-rev',
        tone: 'warning',
        title: `Revenue is tracking ${Math.abs(revenueDelta).toFixed(0)}% below last month — push renewals to recover.`,
        cta: { label: 'Open revenue', href: '/reports?view=collection' },
      });
    }
    if (Number(data.attendance_today || 0) === 0) {
      alerts.push({
        id: 'al-att',
        tone: 'info',
        title: 'No check-ins captured yet today — verify the front desk is logging attendance.',
        cta: { label: 'Open attendance', href: '/attendance' },
      });
    }

    const total = Number(data.clients?.total || 0);
    const active = Number(data.clients?.active || 0);
    const expired = Number(data.clients?.expired || 0);
    const expiring = Number(data.expiring_soon || 0);
    const funnel = [
      { label: 'Enrolled (all-time)', value: total, tone: 'brand' },
      { label: 'Active members', value: active, tone: 'success' },
      { label: 'At-risk (expiring)', value: expiring, tone: 'warning' },
      { label: 'Lapsed', value: expired, tone: 'danger' },
    ];

    const actions = [
      data.expiring_soon > 0 && {
        id: 'q-renew',
        icon: '⚠',
        label: 'Renewals expiring this week',
        count: data.expiring_soon,
        href: '/clients?segment=expiring',
      },
      Number(data.total_dues || 0) > 0 && {
        id: 'q-dues',
        icon: '◈',
        label: 'Members with outstanding dues',
        count: '—',
        href: '/reports?view=dues',
      },
      Number(data.clients?.expired || 0) > 0 && {
        id: 'q-lapsed',
        icon: '◐',
        label: 'Lapsed members to win back',
        count: data.clients.expired,
        href: '/clients?segment=expired',
      },
      {
        id: 'q-attend',
        icon: '◧',
        label: "Mark today's attendance",
        count: data.attendance_today || 0,
        href: '/attendance',
      },
    ].filter(Boolean) as Array<{
      id: string;
      icon: string;
      label: string;
      count: number | string;
      href: string;
    }>;

    return { revenueDelta, checkinDelta, memberDelta, revSeries, alerts, funnel, actions };
  }, [data]);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="page-main">
        <TopBar
          hideBreadcrumbs
          actions={
            isAdmin ? (
              <Link href="/clients/new" className="btn btn-primary btn-sm">
                + New Member
              </Link>
            ) : null
          }
        />

        <div className="page-content fade-up">
          {error && <div className="alert alert-error">{error}</div>}

          {loading && <LoadingSkeleton />}

          {!loading && data && derived && (
            <>
              {derived.alerts.length > 0 && (
                <div className="alert-stack mb-3">
                  {derived.alerts.map((a) => (
                    <div key={a.id} className={`alert-banner tone-${a.tone}`}>
                      <span className="alert-banner-text">{a.title}</span>
                      {a.cta && (
                        <Link href={a.cta.href} className="alert-banner-cta">
                          {a.cta.label} →
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="kpi-grid mb-3">
                <KpiCard
                  color="red"
                  icon="₹"
                  label="Revenue (this month)"
                  value={fmtK(data.revenue.month)}
                  sub={`Year: ${fmtK(data.revenue.year)}`}
                  delta={derived.revenueDelta}
                  spark={derived.revSeries}
                  href="/reports?view=collection"
                />
                <KpiCard
                  color="green"
                  icon="◉"
                  label="Active Members"
                  value={String(data.clients.active)}
                  sub={`${data.clients.total} total enrolled`}
                  delta={derived.memberDelta}
                  href="/clients?segment=active"
                />
                <KpiCard
                  color="purple"
                  icon="◧"
                  label="Today’s Check-ins"
                  value={String(data.attendance_today || 0)}
                  sub="Members in the studio today"
                  delta={derived.checkinDelta}
                  href="/attendance"
                />
                <KpiCard
                  color="yellow"
                  icon="⚠"
                  label="Renewals (next 7d)"
                  value={String(data.expiring_soon)}
                  sub="Memberships expiring soon"
                  href="/clients?segment=expiring"
                />
                <KpiCard
                  color="blue"
                  icon="◈"
                  label="Outstanding Dues"
                  value={fmtK(data.total_dues || 0)}
                  sub="Total to collect"
                  href="/reports?view=dues"
                />
              </div>

              <div className="dash-grid-2 mb-3">
                <div className="card">
                  <div className="card-header">
                    <div>
                      <div className="card-title" style={{ marginBottom: 2 }}>
                        Revenue Trend
                      </div>
                      <div className="text-muted text-sm">Last 6 months</div>
                    </div>
                    <div
                      style={{
                        fontSize: 20,
                        fontWeight: 800,
                        color: 'var(--brand-hi)',
                        letterSpacing: '-0.03em',
                      }}
                    >
                      {fmtK(data.revenue.month)}
                    </div>
                  </div>
                  {data.monthly_chart?.length > 0 ? (
                    <BarChart data={data.monthly_chart} />
                  ) : (
                    <EmptyState msg="No payment data yet" />
                  )}
                </div>

                <div className="card">
                  <div className="card-header">
                    <div>
                      <div className="card-title" style={{ marginBottom: 2 }}>
                        Membership Funnel
                      </div>
                      <div className="text-muted text-sm">Where members are right now</div>
                    </div>
                  </div>
                  <FunnelWidget steps={derived.funnel} />
                </div>
              </div>

              <div className="dash-grid-2 mb-3">
                <div className="card" style={{ padding: 0 }}>
                  <div
                    className="card-header"
                    style={{
                      padding: '1rem 1.4rem',
                      borderBottom: '1px solid var(--line)',
                      marginBottom: 0,
                    }}
                  >
                    <div className="card-title" style={{ marginBottom: 0 }}>
                      Today&apos;s Action Queue
                    </div>
                    <Link href="/clients" className="btn btn-ghost btn-sm">
                      All members →
                    </Link>
                  </div>
                  <div className="action-queue">
                    {derived.actions.map((a) => (
                      <Link key={a.id} href={a.href} className="action-row">
                        <span className="action-icon">{a.icon}</span>
                        <span className="action-label">{a.label}</span>
                        <span className="action-count">{a.count}</span>
                        <span className="action-chev">›</span>
                      </Link>
                    ))}
                    {derived.actions.length === 0 && (
                      <div
                        style={{
                          padding: '2rem',
                          textAlign: 'center',
                          color: 'var(--muted)',
                        }}
                      >
                        ✦ No pending actions — clean slate.
                      </div>
                    )}
                  </div>
                </div>

                {isAdmin && data.top_trainers?.length > 0 ? (
                  <div className="card">
                    <div className="card-header">
                      <div className="card-title" style={{ marginBottom: 0 }}>
                        Top Coaches This Month
                      </div>
                      <Link href="/trainers" className="btn btn-ghost btn-sm">
                        All →
                      </Link>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '.7rem' }}>
                      {data.top_trainers.map((t: any, i: number) => {
                        const max = data.top_trainers[0].month_revenue || 1;
                        const medals = ['◆', '◇', '◈'];
                        return (
                          <Link
                            key={t.id}
                            href={`/trainers/${t.id}`}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '.75rem',
                              textDecoration: 'none',
                            }}
                          >
                            <div
                              style={{
                                width: 30,
                                height: 30,
                                borderRadius: 8,
                                flexShrink: 0,
                                background:
                                  i === 0
                                    ? 'linear-gradient(135deg,#f5c518,#a07b00)'
                                    : i === 1
                                    ? 'linear-gradient(135deg,#cbd5e1,#64748b)'
                                    : i === 2
                                    ? 'linear-gradient(135deg,#b45309,#7c2d12)'
                                    : 'var(--bg-3)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 13,
                                fontWeight: 800,
                                color: i < 3 ? '#0a0a0a' : 'var(--muted)',
                                border: '1px solid var(--line)',
                              }}
                            >
                              {i < 3 ? medals[i] : i + 1}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div
                                style={{
                                  fontWeight: 600,
                                  fontSize: 13,
                                  marginBottom: 4,
                                  color: 'var(--text)',
                                }}
                                className="truncate"
                              >
                                {t.name}
                              </div>
                              <div className="progress">
                                <div
                                  className="progress-fill red"
                                  style={{ width: `${(t.month_revenue / max) * 100}%` }}
                                />
                              </div>
                            </div>
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <div
                                style={{
                                  fontWeight: 700,
                                  color: 'var(--brand-hi)',
                                  fontSize: 13,
                                }}
                              >
                                {fmtK(t.month_revenue)}
                              </div>
                              <div className="text-muted text-xs">
                                {t.active_clients} clients
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="card">
                    <div className="card-title mb-2">Quick Actions</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                      <Link
                        href="/clients/new"
                        className="btn btn-primary"
                        style={{ justifyContent: 'flex-start' }}
                      >
                        + Add Member
                      </Link>
                      <Link
                        href="/payments"
                        className="btn btn-ghost"
                        style={{ justifyContent: 'flex-start' }}
                      >
                        ◈ Record Payment
                      </Link>
                      <Link
                        href="/attendance"
                        className="btn btn-ghost"
                        style={{ justifyContent: 'flex-start' }}
                      >
                        ◧ Mark Attendance
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              <div className="dash-grid-2-3-1">
                <div className="card" style={{ padding: 0 }}>
                  <div
                    className="card-header"
                    style={{
                      padding: '1rem 1.4rem',
                      borderBottom: '1px solid var(--line)',
                      marginBottom: 0,
                    }}
                  >
                    <div className="card-title" style={{ marginBottom: 0 }}>
                      Recent Payments
                    </div>
                    <Link href="/payments" className="btn btn-ghost btn-sm">
                      View all →
                    </Link>
                  </div>
                  {data.recent_payments?.length === 0 ? (
                    <div style={{ padding: '2rem' }}>
                      <EmptyState msg="No payments recorded yet" />
                    </div>
                  ) : (
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Member</th>
                            <th>Amount</th>
                            <th>Method</th>
                            {isAdmin && <th>Coach</th>}
                            <th>Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.recent_payments.map((p: any) => (
                            <tr key={p.id}>
                              <td style={{ fontWeight: 600 }}>{p.client_name || '—'}</td>
                              <td
                                style={{ fontWeight: 700, color: 'var(--success)' }}
                                className="tabular"
                              >
                                {fmt(p.amount)}
                              </td>
                              <td>
                                <span
                                  className={`badge badge-${(p.method || 'cash').toLowerCase()}`}
                                >
                                  {p.method}
                                </span>
                              </td>
                              {isAdmin && (
                                <td className="text-muted">{p.trainer_name || '—'}</td>
                              )}
                              <td className="text-muted">{p.date}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="card">
                  <div className="card-title mb-2">Studio Overview</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '.85rem' }}>
                    <MiniStat
                      label="Active Members"
                      value={data.clients.active}
                      color="var(--success)"
                      max={Number(data.clients.total)}
                    />
                    <MiniStat
                      label="Lapsed Members"
                      value={data.clients.expired}
                      color="var(--danger)"
                      max={Number(data.clients.total)}
                    />
                    <MiniStat
                      label="Expiring (7d)"
                      value={data.expiring_soon}
                      color="var(--warning)"
                      max={Number(data.clients.active) || 1}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── sub-components ────────────────────────────────────────────────

function KpiCard({
  color,
  icon,
  label,
  value,
  sub,
  delta,
  spark,
  href,
}: {
  color: string;
  icon: string;
  label: string;
  value: string;
  sub: string;
  delta?: number | null;
  spark?: number[];
  href?: string;
}) {
  const body = (
    <div className={`kpi-card v2 ${color}`}>
      <div className="kpi-top">
        <div className={`kpi-icon ${color}`}>{icon}</div>
        {delta !== null && delta !== undefined && (
          <span className={`kpi-delta ${delta >= 0 ? 'pos' : 'neg'}`}>
            {delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(0)}%
          </span>
        )}
      </div>
      <div className="kpi-label">{label}</div>
      <div className={`kpi-value ${color}`}>{value}</div>
      <div className="kpi-bottom">
        <span className="kpi-sub">{sub}</span>
        {spark && spark.length >= 2 && <Sparkline data={spark} color={color} />}
      </div>
    </div>
  );
  return href ? (
    <Link href={href} style={{ textDecoration: 'none' }}>
      {body}
    </Link>
  ) : (
    body
  );
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const W = 70;
  const H = 22;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * W;
      const y = H - ((v - min) / range) * H;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const stroke =
    ({
      red: 'var(--brand-hi)',
      green: 'var(--success)',
      blue: 'var(--info)',
      yellow: 'var(--warning)',
      purple: 'var(--purple)',
    } as any)[color] || 'var(--brand-hi)';
  return (
    <svg
      className="kpi-spark"
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      aria-hidden
    >
      <polyline
        points={pts}
        fill="none"
        stroke={stroke}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FunnelWidget({
  steps,
}: {
  steps: Array<{ label: string; value: number; tone: string }>;
}) {
  const max = Math.max(...steps.map((s) => s.value), 1);
  return (
    <div className="funnel">
      {steps.map((s) => {
        const pct = (s.value / max) * 100;
        return (
          <div key={s.label} className="funnel-row">
            <div className="funnel-label">{s.label}</div>
            <div className="funnel-bar-wrap">
              <div
                className={`funnel-bar tone-${s.tone}`}
                style={{ width: `${Math.max(pct, 6)}%` }}
              >
                <span className="funnel-bar-value">
                  {s.value.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BarChart({
  data,
}: {
  data: { month: string; revenue: number; count: number }[];
}) {
  const max = Math.max(...data.map((d) => d.revenue), 1);
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '.5rem', height: 160 }}>
        {data.map((d, i) => (
          <div
            key={i}
            title={`${d.month}: ₹${d.revenue.toLocaleString('en-IN')}`}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              height: '100%',
              gap: 4,
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: 'var(--muted)',
                marginTop: 'auto',
                whiteSpace: 'nowrap',
                fontWeight: 600,
              }}
              className="tabular"
            >
              {d.revenue >= 1000
                ? '₹' + (d.revenue / 1000).toFixed(0) + 'K'
                : d.revenue
                ? '₹' + d.revenue
                : ''}
            </div>
            <div
              className="chart-bar"
              style={{
                width: '100%',
                height: `${Math.max((d.revenue / max) * 100, 3)}%`,
                minHeight: 4,
              }}
            />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '.5rem', marginTop: 8 }}>
        {data.map((d, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              textAlign: 'center',
              fontSize: 10.5,
              color: 'var(--muted)',
              fontWeight: 600,
              letterSpacing: '0.4px',
              textTransform: 'uppercase',
            }}
          >
            {d.month}
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  color,
  max,
}: {
  label: string;
  value: any;
  color: string;
  max: number;
}) {
  const pct = max > 0 ? Math.min((Number(value) / max) * 100, 100) : 0;
  const cls =
    color === 'var(--success)' ? 'green' : color === 'var(--danger)' ? 'red' : 'yellow';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span className="text-muted text-sm">{label}</span>
        <span style={{ fontWeight: 700, color }} className="tabular">
          {value}
        </span>
      </div>
      <div className="progress">
        <div className={`progress-fill ${cls}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function EmptyState({ msg }: { msg: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>
      <div style={{ fontSize: 26, marginBottom: 8, opacity: 0.55 }}>◐</div>
      <div style={{ fontSize: 12.5 }}>{msg}</div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <>
      <div className="kpi-grid mb-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="kpi-card v2" style={{ height: 140 }}>
            <div
              className="skeleton"
              style={{ width: 38, height: 38, borderRadius: 9, marginBottom: 12 }}
            />
            <div
              className="skeleton"
              style={{ width: '60%', height: 11, marginBottom: 8 }}
            />
            <div
              className="skeleton"
              style={{ width: '80%', height: 28, marginBottom: 8 }}
            />
            <div className="skeleton" style={{ width: '50%', height: 10 }} />
          </div>
        ))}
      </div>
      <div className="dash-grid-2">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="card" style={{ height: 220 }}>
            <div
              className="skeleton"
              style={{ width: '50%', height: 16, marginBottom: 16 }}
            />
            <div className="skeleton" style={{ height: 150 }} />
          </div>
        ))}
      </div>
    </>
  );
}
