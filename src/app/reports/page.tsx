'use client';
import { useEffect, useState } from 'react';
import Guard from '@/components/Guard';
import Sidebar from '@/components/Sidebar';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function ReportsPage() { return <Guard><ReportsContent /></Guard>; }

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function ReportsContent() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [tab,     setTab]     = useState<'monthly'|'trainers'|'dues'>('monthly');
  const [year,    setYear]    = useState(new Date().getFullYear());
  const [monthly, setMonthly] = useState<any[]>([]);
  const [trainers,setTrainers]= useState<any[]>([]);
  const [dues,    setDues]    = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  useEffect(() => {
    setLoading(true);
    const calls: Promise<any>[] = [api.reports.monthly(year)];
    if (isAdmin) calls.push(api.reports.trainerSummary());
    calls.push(api.reports.dues());

    Promise.all(calls)
      .then(([m, t, d]) => {
        setMonthly(m);
        if (isAdmin) { setTrainers(t); setDues(d); }
        else setDues(t); // dues is index 1 for trainers
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [year, isAdmin]);

  const fmt = (n: any) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  const totalRevenue = monthly.reduce((s, m) => s + Number(m.revenue), 0);
  const maxRevenue = Math.max(...monthly.map(m => Number(m.revenue)), 1);

  // Build full 12-month array
  const fullYear = MONTHS.map((name, i) => {
    const found = monthly.find(m => parseInt(m.month_num) === i + 1);
    return { month: name, revenue: found ? Number(found.revenue) : 0, count: found ? Number(found.payment_count) : 0 };
  });

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="page-main">
        <div className="topbar">
          <div>
            <div className="topbar-title">Reports</div>
            <div className="topbar-sub">Analytics & financial overview</div>
          </div>
          <select className="input select" value={year}
            onChange={e => setYear(parseInt(e.target.value))} style={{ maxWidth: 120 }}>
            {[2023, 2024, 2025, 2026].map(y => <option key={y}>{y}</option>)}
          </select>
        </div>

        <div className="page-content fade-up">
          {error && <div className="alert alert-error">{error}</div>}

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '.75rem' }}>
            {([['monthly', '📅 Monthly Revenue'], ['dues', '⚠️ Pending Dues'], ...(isAdmin ? [['trainers', '🏋️ Trainer Summary']] : [])] as [string,string][]).map(([key, label]) => (
              <button key={key} onClick={() => setTab(key as any)}
                className={`btn ${tab === key ? 'btn-primary' : 'btn-ghost'} btn-sm`}>
                {label}
              </button>
            ))}
          </div>

          {loading ? <div className="text-muted">Loading…</div> : (
            <>
              {/* Monthly Revenue */}
              {tab === 'monthly' && (
                <>
                  <div className="kpi-grid mb-3" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
                    <div className="card">
                      <div className="text-muted text-sm">Total Revenue {year}</div>
                      <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--brand2)' }}>{fmt(totalRevenue)}</div>
                    </div>
                    <div className="card">
                      <div className="text-muted text-sm">Avg Monthly</div>
                      <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--blue)' }}>
                        {fmt(totalRevenue / Math.max(monthly.length, 1))}
                      </div>
                    </div>
                    <div className="card">
                      <div className="text-muted text-sm">Best Month</div>
                      <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--success)' }}>
                        {fullYear.reduce((best, m) => m.revenue > best.revenue ? m : best, fullYear[0])?.month || '—'}
                      </div>
                    </div>
                  </div>

                  {/* Bar chart */}
                  <div className="card mb-3">
                    <div className="card-title">Monthly Revenue Chart — {year}</div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '.4rem', height: 180, paddingBottom: 28, position: 'relative' }}>
                      {fullYear.map((m, i) => (
                        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}
                          title={`${m.month}: ${fmt(m.revenue)} (${m.count} payments)`}>
                          {m.revenue > 0 && (
                            <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 'auto', marginBottom: 4, whiteSpace: 'nowrap' }}>
                              {m.revenue >= 1000 ? '₹' + (m.revenue / 1000).toFixed(0) + 'K' : '₹' + m.revenue}
                            </div>
                          )}
                          <div style={{
                            width: '100%',
                            height: `${Math.max((m.revenue / maxRevenue) * 100, m.revenue > 0 ? 3 : 0)}%`,
                            background: m.revenue > 0
                              ? 'linear-gradient(180deg,var(--brand2),var(--brand))'
                              : 'var(--border)',
                            borderRadius: '5px 5px 0 0',
                            minHeight: m.revenue > 0 ? 6 : 2,
                          }} />
                          <div style={{ position: 'absolute', bottom: 4, fontSize: 10, color: 'var(--muted)' }}
                            // Approximate positioning
                          >{/* label below */}</div>
                        </div>
                      ))}
                      {/* Month labels row */}
                    </div>
                    <div style={{ display: 'flex', gap: '.4rem' }}>
                      {fullYear.map((m, i) => (
                        <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 10, color: 'var(--muted)' }}>{m.month}</div>
                      ))}
                    </div>
                  </div>

                  {/* Monthly Table */}
                  <div className="card" style={{ padding: 0 }}>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr><th>Month</th><th>Payments</th><th>Revenue</th><th>Progress</th></tr>
                        </thead>
                        <tbody>
                          {fullYear.map((m, i) => (
                            <tr key={i} style={{ opacity: m.revenue === 0 ? 0.4 : 1 }}>
                              <td style={{ fontWeight: 600 }}>{m.month} {year}</td>
                              <td className="text-muted">{m.count || '—'}</td>
                              <td style={{ fontWeight: 700, color: m.revenue > 0 ? 'var(--success)' : 'var(--muted)' }}>
                                {m.revenue > 0 ? fmt(m.revenue) : '—'}
                              </td>
                              <td style={{ width: '30%' }}>
                                {m.revenue > 0 && (
                                  <div className="progress" style={{ width: '100%' }}>
                                    <div className="progress-fill red"
                                      style={{ width: `${(m.revenue / maxRevenue) * 100}%` }} />
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={{ borderTop: '2px solid var(--border)' }}>
                            <td style={{ fontWeight: 700 }}>Total</td>
                            <td style={{ fontWeight: 700 }}>{fullYear.reduce((s, m) => s + m.count, 0)}</td>
                            <td style={{ fontWeight: 800, color: 'var(--brand2)' }}>{fmt(totalRevenue)}</td>
                            <td />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </>
              )}

              {/* Dues Report */}
              {tab === 'dues' && (
                <div className="card" style={{ padding: 0 }}>
                  <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="card-title" style={{ marginBottom: 0 }}>Clients with Pending Dues</div>
                    <div style={{ fontWeight: 700, color: 'var(--danger)' }}>
                      Total: {fmt(dues.reduce((s: number, d: any) => s + Number(d.balance_amount), 0))}
                    </div>
                  </div>
                  <div className="table-wrap">
                    {dues.length === 0 ? (
                      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>
                        <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
                        No pending dues!
                      </div>
                    ) : (
                      <table>
                        <thead>
                          <tr><th>ID</th><th>Client</th><th>Mobile</th><th>Trainer</th><th>Balance</th><th>Expiry</th><th>Status</th></tr>
                        </thead>
                        <tbody>
                          {dues.map((d: any) => (
                            <tr key={d.id}>
                              <td className="mono text-muted text-xs">{d.client_id}</td>
                              <td style={{ fontWeight: 600 }}>{d.name}</td>
                              <td className="text-muted">{d.mobile || '—'}</td>
                              <td className="text-muted">{d.trainer_name || '—'}</td>
                              <td style={{ fontWeight: 800, color: 'var(--danger)' }}>{fmt(d.balance_amount)}</td>
                              <td className="text-muted">{d.pt_end_date || '—'}</td>
                              <td><span className={`badge badge-${d.status}`}>{d.status}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}

              {/* Trainer Summary (admin only) */}
              {tab === 'trainers' && isAdmin && (
                <div className="card" style={{ padding: 0 }}>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr><th>Trainer</th><th>Active Clients</th><th>Total Clients</th><th>Month Revenue</th><th>Total Revenue</th></tr>
                      </thead>
                      <tbody>
                        {trainers.map((t: any) => (
                          <tr key={t.id}>
                            <td style={{ fontWeight: 600 }}>{t.name}</td>
                            <td style={{ color: 'var(--success)', fontWeight: 600 }}>{t.active_clients}</td>
                            <td className="text-muted">{t.total_clients}</td>
                            <td style={{ color: 'var(--brand2)', fontWeight: 700 }}>{fmt(t.month_revenue)}</td>
                            <td style={{ fontWeight: 700 }}>{fmt(t.total_revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td style={{ fontWeight: 700 }}>Total</td>
                          <td style={{ fontWeight: 700, color: 'var(--success)' }}>{trainers.reduce((s: number, t: any) => s + Number(t.active_clients), 0)}</td>
                          <td style={{ fontWeight: 700 }}>{trainers.reduce((s: number, t: any) => s + Number(t.total_clients), 0)}</td>
                          <td style={{ fontWeight: 800, color: 'var(--brand2)' }}>{fmt(trainers.reduce((s: number, t: any) => s + Number(t.month_revenue), 0))}</td>
                          <td style={{ fontWeight: 800 }}>{fmt(trainers.reduce((s: number, t: any) => s + Number(t.total_revenue), 0))}</td>
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
