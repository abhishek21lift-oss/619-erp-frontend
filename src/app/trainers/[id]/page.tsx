'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Guard from '@/components/Guard';
import Sidebar from '@/components/Sidebar';
import { api } from '@/lib/api';

export default function TrainerDetailPage({ params }: { params: { id: string } }) {
  return <Guard role="admin"><TrainerDetail id={params.id} /></Guard>;
}

function TrainerDetail({ id }: { id: string }) {
  const router = useRouter();
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    setLoading(true);
    api.trainers.get(id)
      .then(d => setData(d))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const fmt = (n: any) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  const fmtK = (n: any) => {
    const v = Number(n || 0);
    if (v >= 100000) return '₹' + (v / 100000).toFixed(1) + 'L';
    if (v >= 1000)   return '₹' + (v / 1000).toFixed(1) + 'K';
    return '₹' + v.toLocaleString('en-IN');
  };

  if (loading) return (
    <div className="app-layout">
      <Sidebar />
      <div className="page-main">
        <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
          <div className="text-muted pulse">Loading trainer profile…</div>
        </div>
      </div>
    </div>
  );

  if (!data || error) return (
    <div className="app-layout">
      <Sidebar />
      <div className="page-main">
        <div className="page-content">
          <div className="alert alert-error">{error || 'Trainer not found'}</div>
          <Link href="/trainers" className="btn btn-ghost">← Back to trainers</Link>
        </div>
      </div>
    </div>
  );

  const t = data;
  const stats = data.stats || {};
  const clients: any[]  = data.clients || [];
  const payments: any[] = data.payments || [];
  const monthly: any[]  = data.monthly || [];
  const initials = (t.name || 'T').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
  const maxRev = Math.max(...monthly.map((m: any) => m.revenue), 1);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="page-main">
        <div className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button onClick={() => router.back()} className="btn btn-ghost btn-sm">←</button>
            <div>
              <div className="topbar-title">{t.name}</div>
              <div className="topbar-sub">{t.role || 'Personal Trainer'} · <span className={`badge badge-${t.status === 'active' ? 'active' : 'expired'}`}>{t.status}</span></div>
            </div>
          </div>
        </div>

        <div className="page-content fade-up">
          {/* HERO — avatar, name, contact */}
          <div className="card mb-3" style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="user-avatar" style={{
              width: 88, height: 88, fontSize: 28, borderRadius: 20,
              boxShadow: '0 8px 32px rgba(255, 71, 87, 0.35)',
            }}>{initials}</div>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }}>{t.name}</div>
              <div className="text-muted text-sm" style={{ marginBottom: 8 }}>{t.role || 'Personal Trainer'}</div>
              <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', fontSize: 13 }}>
                {t.mobile && <span className="text-muted">📱 {t.mobile}</span>}
                {t.email && <span className="text-muted">📧 {t.email}</span>}
                {t.joining_date && <span className="text-muted">📅 Joined {String(t.joining_date).split('T')[0]}</span>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '.5rem' }}>
              <Link href="/trainers" className="btn btn-ghost btn-sm">All Trainers</Link>
            </div>
          </div>

          {/* KPI ROW */}
          <div className="kpi-grid mb-3">
            <KpiCard color="green" icon="👥" label="Active Clients" value={String(stats.active_clients ?? 0)} sub={`${stats.total_clients ?? 0} total enrolled`} />
            <KpiCard color="red"   icon="💰" label="Month Revenue"  value={fmtK(stats.month_revenue)} sub="This calendar month" />
            <KpiCard color="purple" icon="🎯" label="Month Incentive" value={fmtK(stats.month_incentive)} sub={`@ ${Math.round((t.incentive_rate || 0.5) * 100)}% rate`} />
            <KpiCard color="blue"  icon="🏆" label="Lifetime Revenue" value={fmtK(stats.lifetime_revenue)} sub="All-time collected" />
            <KpiCard color="yellow" icon="⚠️" label="Total Dues"    value={fmtK(stats.total_dues)} sub="Outstanding from clients" />
          </div>

          {/* 6-month revenue trend */}
          {monthly.length > 0 && (
            <div className="card mb-3">
              <div className="card-title">Revenue Trend (Last 6 months)</div>
              <div className="chart-bars">
                {monthly.map((m: any, i: number) => (
                  <div key={i} className="chart-bar-col" title={`${m.month}: ${fmt(m.revenue)}`}>
                    <div className="chart-bar-val" style={{ marginTop: 'auto', marginBottom: 4 }}>
                      {m.revenue >= 1000 ? '₹' + (m.revenue / 1000).toFixed(0) + 'K' : '₹' + m.revenue}
                    </div>
                    <div className="chart-bar" style={{ height: `${Math.max((m.revenue / maxRev) * 100, 3)}%`, minHeight: 4 }} />
                    <div style={{
                      position: 'absolute', bottom: 4, fontSize: 10, color: 'var(--muted)',
                      whiteSpace: 'nowrap',
                    }}>{m.month}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PERSONAL + EMPLOYMENT INFO */}
          <div style={{ display: 'grid', gap: '1.25rem', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', marginBottom: '1.5rem' }}>
            <div className="card">
              <div className="card-title">Personal Details</div>
              <InfoRow label="📱 Mobile"        value={t.mobile} />
              <InfoRow label="📧 Email"         value={t.email} />
              <InfoRow label="🎂 Date of Birth" value={t.dob ? String(t.dob).split('T')[0] : null} />
              <InfoRow label="⚥ Gender"        value={t.gender} />
              <InfoRow label="📍 Address"       value={t.address} />
            </div>

            <div className="card">
              <div className="card-title">Employment</div>
              <InfoRow label="🏷️ Role"            value={t.role} />
              <InfoRow label="📅 Joining Date"     value={t.joining_date ? String(t.joining_date).split('T')[0] : null} />
              <InfoRow label="💵 Salary"           value={t.salary ? fmt(t.salary) : null} />
              <InfoRow label="🎯 Incentive Rate"   value={t.incentive_rate ? Math.round(t.incentive_rate * 100) + '%' : null} />
              <InfoRow label="💼 Specialization"   value={t.specialization} />
              <InfoRow label="🎓 Certifications"   value={t.certifications} />
              {t.notes && <InfoRow label="📋 Notes" value={t.notes} />}
            </div>
          </div>

          {/* CLIENTS TABLE */}
          <div className="card mb-3" style={{ padding: 0 }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="card-title" style={{ marginBottom: 0 }}>Clients ({clients.length})</div>
              <Link href="/clients" className="btn btn-ghost btn-sm">View all clients →</Link>
            </div>
            {clients.length === 0 ? (
              <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--muted)' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>👥</div>
                No clients assigned to this trainer yet
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th><th>Name</th><th>Mobile</th>
                      <th>Package</th><th>Expires</th>
                      <th style={{ textAlign: 'right' }}>Paid</th>
                      <th style={{ textAlign: 'right' }}>Balance</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map((c: any) => (
                      <tr key={c.id}>
                        <td><span className="mono text-muted text-xs">{c.client_id}</span></td>
                        <td>
                          <Link href={`/clients/${c.id}`} style={{ fontWeight: 600, color: 'var(--brand2)' }}>
                            {c.name}
                          </Link>
                        </td>
                        <td className="text-muted">{c.mobile || '—'}</td>
                        <td>{c.package_type || '—'}</td>
                        <td className="text-muted">{c.pt_end_date || '—'}</td>
                        <td style={{ textAlign: 'right', color: 'var(--success)', fontWeight: 600 }}>{fmt(c.paid_amount)}</td>
                        <td style={{ textAlign: 'right', color: c.balance_amount > 0 ? 'var(--danger)' : 'var(--muted)', fontWeight: c.balance_amount > 0 ? 700 : 400 }}>
                          {c.balance_amount > 0 ? fmt(c.balance_amount) : '✓'}
                        </td>
                        <td><span className={`badge badge-${c.status}`}>{c.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* RECENT PAYMENTS */}
          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="card-title" style={{ marginBottom: 0 }}>Recent Payments Collected</div>
              <div className="text-muted text-sm">{payments.length} record{payments.length !== 1 ? 's' : ''}</div>
            </div>
            {payments.length === 0 ? (
              <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--muted)' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>💳</div>
                No payments recorded yet
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Receipt</th><th>Client</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                      <th>Method</th><th>Date</th>
                      <th style={{ textAlign: 'right' }}>Incentive</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p: any) => (
                      <tr key={p.id}>
                        <td><span className="mono text-muted text-xs">{p.receipt_no || '—'}</span></td>
                        <td style={{ fontWeight: 600 }}>{p.client_name || '—'}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>{fmt(p.amount)}</td>
                        <td><span className={`badge badge-${(p.method || 'cash').toLowerCase()}`}>{p.method}</span></td>
                        <td className="text-muted">{p.date}</td>
                        <td style={{ textAlign: 'right', color: 'var(--purple)', fontWeight: 600 }}>{fmt(p.incentive_amt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ color, icon, label, value, sub }: { color: string; icon: string; label: string; value: string; sub: string }) {
  return (
    <div className={`kpi-card ${color}`}>
      <div className={`kpi-icon ${color}`}>{icon}</div>
      <div className="kpi-label">{label}</div>
      <div className={`kpi-value ${color}`}>{value}</div>
      <div className="kpi-sub">{sub}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: any }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', gap: '1rem', padding: '0.5rem 0', borderBottom: '1px solid var(--glass-border)', fontSize: 13.5 }}>
      <span className="text-muted" style={{ minWidth: 140 }}>{label}</span>
      <span style={{ fontWeight: 500 }}>{value}</span>
    </div>
  );
}
