'use client';
import { useEffect, useState } from 'react';
import Guard from '@/components/Guard';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function ReportsPage() {
  return (
    <Guard>
      <ReportsContent />
    </Guard>
  );
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function ReportsContent() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [tab, setTab] = useState<'monthly' | 'trainers' | 'dues'>('monthly');
  const [year, setYear] = useState(new Date().getFullYear());
  const [monthly, setMonthly] = useState<any[]>([]);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [dues, setDues] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.reports.monthly(year),
      api.reports.dues(),
      isAdmin ? api.reports.trainerSummary() : Promise.resolve([] as any[]),
    ])
      .then(([m, d, t]) => {
        setMonthly(m);
        setDues(d);
        setTrainers(t);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [year, isAdmin]);

  const fmt = (n: any) =>
    '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  const totalRevenue = monthly.reduce((s, m) => s + Number(m.revenue), 0);
  const maxRevenue = Math.max(...monthly.map((m) => Number(m.revenue)), 1);

  const fullYear = MONTHS.map((name, i) => {
    const found = monthly.find((m) => parseInt(m.month_num) === i + 1);
    return {
      month: name,
      revenue: found ? Number(found.revenue) : 0,
      count: found ? Number(found.payment_count) : 0,
    };
  });

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="page-main">
        <TopBar
          title="Reports"
          subtitle="Analytics & financial overview"
          actions={
            <select
              className="input select"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              style={{ maxWidth: 110 }}
            >
              {[2023, 2024, 2025, 2026, 2027].map((y) => (
                <option key={y}>{y}</option>
              ))}
            </select>
          }
        />

        <div className="page-content fade-up">
          {error && <div className="alert alert-error">{error}</div>}

          <div
            style={{
              display: 'flex',
              gap: '.4rem',
              marginBottom: '1.25rem',
              borderBottom: '1px solid var(--line)',
              paddingBottom: '.65rem',
              flexWrap: 'wrap',
            }}
          >
            {(
              [
                ['monthly', 'Monthly Revenue'],
                ['dues', 'Pending Dues'],
                ...(isAdmin ? [['trainers', 'Coach Summary']] : []),
              ] as [string, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key as any)}
                className={`btn ${tab === key ? 'btn-primary' : 'btn-ghost'} btn-sm`}
              >
                {label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-muted">Loading…</div>
          ) : (
            <>
              {tab === 'monthly' && (
                <>
                  <div
                    className="kpi-grid mb-3"
                    style={{ gridTemplateColumns: 'repeat(3,1fr)' }}
                  >
                    <div className="card">
                      <div
                        className="text-muted"
                        style={{
                          fontSize: 10.5,
                          fontWeight: 700,
                          letterSpacing: '1.4px',
                          textTransform: 'uppercase',
                        }}
                      >
                        Total Revenue · {year}
                      </div>
                      <div
                        style={{
                          fontSize: 28,
                          fontWeight: 800,
                          color: 'var(--brand-hi)',
                          marginTop: 6,
                          letterSpacing: '-0.035em',
                        }}
                        className="tabular"
                      >
                        {fmt(totalRevenue)}
                      </div>
                    </div>
                    <div className="card">
                      <div
                        className="text-muted"
                        style={{
                          fontSize: 10.5,
                          fontWeight: 700,
                          letterSpacing: '1.4px',
                          textTransform: 'uppercase',
                        }}
                      >
                        Avg Monthly
                      </div>
                      <div
                        style={{
                          fontSize: 28,
                          fontWeight: 800,
                          color: 'var(--info)',
                          marginTop: 6,
                          letterSpacing: '-0.035em',
                        }}
                        className="tabular"
                      >
                        {fmt(totalRevenue / Math.max(monthly.length, 1))}
                      </div>
                    </div>
                    <div className="card">
                      <div
                        className="text-muted"
                        style={{
                          fontSize: 10.5,
                          fontWeight: 700,
                          letterSpacing: '1.4px',
                          textTransform: 'uppercase',
                        }}
                      >
                        Best Month
                      </div>
                      <div
                        style={{
                          fontSize: 28,
                          fontWeight: 800,
                          color: 'var(--success)',
                          marginTop: 6,
                          letterSpacing: '-0.035em',
                        }}
                      >
                        {fullYear.reduce(
                          (best, m) => (m.revenue > best.revenue ? m : best),
                          fullYear[0],
                        )?.month || '—'}
                      </div>
                    </div>
                  </div>

                  <div className="card mb-3">
                    <div className="card-title">Monthly Revenue · {year}</div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-end',
                        gap: '.4rem',
                        height: 180,
                      }}
                    >
                      {fullYear.map((m, i) => (
                        <div
                          key={i}
                          title={`${m.month}: ${fmt(m.revenue)} (${m.count} payments)`}
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
                            {m.revenue > 0
                              ? m.revenue >= 1000
                                ? '₹' + (m.revenue / 1000).toFixed(0) + 'K'
                                : '₹' + m.revenue
                              : ''}
                          </div>
                          <div
                            style={{
                              width: '100%',
                              height: `${Math.max(
                                (m.revenue / maxRevenue) * 100,
                                m.revenue > 0 ? 3 : 0,
                              )}%`,
                              background:
                                m.revenue > 0
                                  ? 'linear-gradient(180deg, var(--brand-hi), var(--brand-lo))'
                                  : 'var(--bg-3)',
                              borderRadius: '4px 4px 0 0',
                              minHeight: m.revenue > 0 ? 6 : 2,
                              transition: 'filter .15s, height .4s',
                            }}
                          />
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: '.4rem', marginTop: 10 }}>
                      {fullYear.map((m, i) => (
                        <div
                          key={i}
                          style={{
                            flex: 1,
                            textAlign: 'center',
                            fontSize: 10,
                            color: 'var(--muted)',
                            fontWeight: 600,
                            letterSpacing: '0.5px',
                            textTransform: 'uppercase',
                          }}
                        >
                          {m.month}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="card" style={{ padding: 0 }}>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Month</th>
                            <th>Payments</th>
                            <th>Revenue</th>
                            <th>Progress</th>
                          </tr>
                        </thead>
                        <tbody>
                          {fullYear.map((m, i) => (
                            <tr key={i} style={{ opacity: m.revenue === 0 ? 0.4 : 1 }}>
                              <td style={{ fontWeight: 600 }}>
                                {m.month} {year}
                              </td>
                              <td className="text-muted tabular">{m.count || '—'}</td>
                              <td
                                style={{
                                  fontWeight: 700,
                                  color:
                                    m.revenue > 0
                                      ? 'var(--success)'
                                      : 'var(--muted)',
                                }}
                                className="tabular"
                              >
                                {m.revenue > 0 ? fmt(m.revenue) : '—'}
                              </td>
                              <td style={{ width: '32%' }}>
                                {m.revenue > 0 && (
                                  <div className="progress" style={{ width: '100%' }}>
                                    <div
                                      className="progress-fill red"
                                      style={{
                                        width: `${(m.revenue / maxRevenue) * 100}%`,
                                      }}
                                    />
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td>Total</td>
                            <td className="tabular">
                              {fullYear.reduce((s, m) => s + m.count, 0)}
                            </td>
                            <td style={{ color: 'var(--brand-hi)' }} className="tabular">
                              {fmt(totalRevenue)}
                            </td>
                            <td />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </>
              )}

              {tab === 'dues' && (
                <div className="card" style={{ padding: 0 }}>
                  <div
                    style={{
                      padding: '0.95rem 1.4rem',
                      borderBottom: '1px solid var(--line)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div className="card-title" style={{ marginBottom: 0 }}>
                      Members with Pending Dues
                    </div>
                    <div
                      style={{ fontWeight: 700, color: 'var(--danger)' }}
                      className="tabular"
                    >
                      Total:{' '}
                      {fmt(
                        dues.reduce((s: number, d: any) => s + Number(d.balance_amount), 0),
                      )}
                    </div>
                  </div>
                  <div className="table-wrap">
                    {dues.length === 0 ? (
                      <div
                        style={{
                          padding: '3rem',
                          textAlign: 'center',
                          color: 'var(--muted)',
                        }}
                      >
                        <div style={{ fontSize: 26, marginBottom: 8, opacity: 0.55 }}>✓</div>
                        No pending dues
                      </div>
                    ) : (
                      <table>
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Member</th>
                            <th>Mobile</th>
                            <th>Coach</th>
                            <th>Balance</th>
                            <th>Expiry</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dues.map((d: any) => (
                            <tr key={d.id}>
                              <td>
                                <span className="id-chip">{d.client_id}</span>
                              </td>
                              <td style={{ fontWeight: 600 }}>{d.name}</td>
                              <td className="text-muted tabular">{d.mobile || '—'}</td>
                              <td className="text-muted">{d.trainer_name || '—'}</td>
                              <td
                                style={{ fontWeight: 700, color: 'var(--danger)' }}
                                className="tabular"
                              >
                                {fmt(d.balance_amount)}
                              </td>
                              <td className="text-muted tabular">
                                {d.pt_end_date || '—'}
                              </td>
                              <td>
                                <span className={`badge badge-${d.status}`}>
                                  {d.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}

              {tab === 'trainers' && isAdmin && (
                <div className="card" style={{ padding: 0 }}>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Coach</th>
                          <th>Active</th>
                          <th>Total</th>
                          <th>Month Revenue</th>
                          <th>Total Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trainers.map((t: any) => (
                          <tr key={t.id}>
                            <td style={{ fontWeight: 600 }}>{t.name}</td>
                            <td
                              style={{ color: 'var(--success)', fontWeight: 600 }}
                              className="tabular"
                            >
                              {t.active_clients}
                            </td>
                            <td className="text-muted tabular">{t.total_clients}</td>
                            <td
                              style={{ color: 'var(--brand-hi)', fontWeight: 700 }}
                              className="tabular"
                            >
                              {fmt(t.month_revenue)}
                            </td>
                            <td style={{ fontWeight: 700 }} className="tabular">
                              {fmt(t.total_revenue)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td>Total</td>
                          <td
                            style={{ color: 'var(--success)' }}
                            className="tabular"
                          >
                            {trainers.reduce(
                              (s: number, t: any) => s + Number(t.active_clients),
                              0,
                            )}
                          </td>
                          <td className="tabular">
                            {trainers.reduce(
                              (s: number, t: any) => s + Number(t.total_clients),
                              0,
                            )}
                          </td>
                          <td
                            style={{ color: 'var(--brand-hi)' }}
                            className="tabular"
                          >
                            {fmt(
                              trainers.reduce(
                                (s: number, t: any) => s + Number(t.month_revenue),
                                0,
                              ),
                            )}
                          </td>
                          <td className="tabular">
                            {fmt(
                              trainers.reduce(
                                (s: number, t: any) => s + Number(t.total_revenue),
                                0,
                              ),
                            )}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
