'use client';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { m } from 'framer-motion';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { TrendingUp, DollarSign, Users, Clock, BarChart3, Percent, Search, ArrowUpRight, Calendar } from 'lucide-react';
import { api } from '@/lib/api';
import { fmtMoney } from '@/lib/format';
import { PremiumBarChart } from '@/components/ui';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmtAmt(n: any) {
  return '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function isoToday() { return new Date().toISOString().split('T')[0]; }

function isoMonthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
};
const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] } }
};

function KpiCard({ label, value, icon, gradient, sub }: {
  label: string; value: string; icon?: React.ReactNode; gradient: string; sub?: string
}) {
  return (
    <m.div variants={itemVariants}
      style={{ position: 'relative', overflow: 'hidden', borderRadius: 16, padding: '22px 20px', background: gradient, border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)', cursor: 'default', transition: 'transform 0.3s ease, box-shadow 0.3s ease' }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'; }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, position: 'relative', zIndex: 1 }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', color: 'var(--text-muted)' }}>{label}</span>
        {icon && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 12, background: 'rgba(0,0,0,0.06)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
            {icon}
          </div>
        )}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', position: 'relative', zIndex: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-disabled)', marginTop: 2, position: 'relative', zIndex: 1 }}>{sub}</div>}
    </m.div>
  );
}

const th = { padding: '12px 16px', textAlign: 'left' as const, fontWeight: 700, fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: '0.08em' };
const td = { padding: '12px 16px', fontSize: 12 };

export default function InsightsRevenuePage() {
  return (
    <Guard role="admin">
      <Inner />
    </Guard>
  );
}

function Inner() {
  const today = isoToday();
  const monthStart = isoMonthStart();
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [revenueByTrainer, setRevenueByTrainer] = useState<any[]>([]);
  const [dues, setDues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [monthlyRes, duesRes] = await Promise.allSettled([
        api.reports.monthly(new Date().getFullYear()),
        api.reports.dues(),
      ]);
      if (monthlyRes.status === 'fulfilled') setMonthlyData(Array.isArray(monthlyRes.value) ? monthlyRes.value : []);
      if (duesRes.status === 'fulfilled') setDues(Array.isArray(duesRes.value) ? duesRes.value : []);
      const trainerRes = await api.reports.trainerSummary();
      setRevenueByTrainer(Array.isArray(trainerRes) ? trainerRes : []);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fullYear = useMemo(() => MONTHS.map((name, i) => {
    const found = monthlyData.find((m) => parseInt(m.month_num) === i + 1);
    return { month: name, revenue: found ? Number(found.revenue) : 0, count: found ? Number(found.payment_count) : 0 };
  }), [monthlyData]);

  const thisMonthRevenue = fullYear[new Date().getMonth()]?.revenue || 0;
  const totalRevenue = fullYear.reduce((s, m) => s + m.revenue, 0);
  const avgRevenuePerTrainer = revenueByTrainer.length > 0 ? totalRevenue / revenueByTrainer.length : 0;
  const pendingCollections = dues.reduce((s, d) => s + Number(d.balance_amount || d.balance_due || 0), 0);
  const lastMonthRevenue = fullYear[Math.max(0, new Date().getMonth() - 1)]?.revenue || 0;
  const growthRate = lastMonthRevenue > 0 ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;
  const maxRevenue = Math.max(...fullYear.map((m) => m.revenue), 1);
  const totalRevenueAll = revenueByTrainer.reduce((s, t) => s + Number(t.total_revenue || 0), 0);

  return (
    <AppShell>
      <div style={{ background: 'var(--bg-subtle)', padding: '52px 32px 40px', borderRadius: '0 0 36px 36px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 54, height: 54, borderRadius: 16, background: '#eff6ff', border: '1px solid rgba(37,99,235,0.15)', boxShadow: 'var(--shadow-xs)' }}>
            <TrendingUp size={24} color="#2563eb" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Revenue Analytics</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>Track revenue performance across trainers and time periods</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-card)', borderRadius: 10, padding: '7px 14px', border: '1px solid #d1d5db' }}>
            <Calendar size={14} color="#9ca3af" />
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>From</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, outline: 'none', padding: '2px 0' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-card)', borderRadius: 10, padding: '7px 14px', border: '1px solid #d1d5db' }}>
            <Calendar size={14} color="#9ca3af" />
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>To</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, outline: 'none', padding: '2px 0' }} />
          </div>
        </div>
      </div>

      <div style={{ padding: '24px 32px' }}>
        {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#ef4444', marginBottom: 20 }}>{error}</div>}

        <m.div variants={containerVariants} initial="hidden" animate="visible" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
          <KpiCard label="This Month Revenue" value={fmtAmt(thisMonthRevenue)} icon={<DollarSign size={16} />} gradient="#eff6ff" />
          <KpiCard label="Avg Revenue / Trainer" value={fmtAmt(avgRevenuePerTrainer)} icon={<Users size={16} />} gradient="#f0fdf4" />
          <KpiCard label="Pending Collections" value={fmtAmt(pendingCollections)} icon={<Clock size={16} />} gradient="#fffbeb" />
          <KpiCard label="Growth Rate" value={`${growthRate >= 0 ? '+' : ''}${growthRate.toFixed(1)}%`} icon={<Percent size={16} />} gradient={growthRate >= 0 ? '#f0fdf4' : '#fef2f2'} />
        </m.div>

        <m.div variants={containerVariants} initial="hidden" animate="visible" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20, marginBottom: 24 }}>
          <m.div variants={itemVariants} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '22px 20px 18px', boxShadow: 'var(--shadow-xs)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 3, height: 18, borderRadius: 2, background: 'linear-gradient(180deg, #6366f1, #2563eb)' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Monthly Revenue — {new Date().getFullYear()}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 8, background: '#eff6ff', border: '1px solid rgba(37,99,235,0.15)' }}>
                <ArrowUpRight size={12} color="#2563eb" />
                <span style={{ fontSize: 10, fontWeight: 700, color: '#2563eb' }}>{fmtAmt(totalRevenue)}</span>
              </div>
            </div>
            {loading ? (
              <div style={{ height: 200, background: 'var(--bg-subtle)', borderRadius: 10 }} />
            ) : (
              <PremiumBarChart
                data={fullYear as Record<string, unknown>[]}
                xKey="month"
                bars={[{ key: 'revenue', label: 'Revenue', color: '#6366f1' }]}
                height={200}
                formatValue={fmtAmt}
              />
            )}
          </m.div>

          <m.div variants={itemVariants} style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)', background: 'var(--bg-card)' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 3, height: 16, borderRadius: 2, background: 'linear-gradient(180deg, #6366f1, #2563eb)', display: 'inline-block' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Revenue by Trainer</span>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'var(--bg-subtle)' }}>
                    {['Trainer', 'Clients', 'This Month', 'Total Rev', '%'].map((h) => (
                      <th key={h} style={{ ...th, color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {revenueByTrainer.length === 0 ? (
                    <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 48, height: 48, borderRadius: 14, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(99,102,241,0.15)' }}>
                          <Users size={20} color="#6366f1" />
                        </div>
                        <div style={{ fontSize: 14, color: 'var(--text-disabled)', fontWeight: 600 }}>Start tracking revenue to see insights here</div>
                      </div>
                    </td></tr>
                  ) : (
                    revenueByTrainer.map((t, i) => {
                      const pct = totalRevenueAll > 0 ? ((Number(t.total_revenue || 0) / totalRevenueAll) * 100).toFixed(1) : 0;
                      return (
                        <tr key={t.id || i} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)', transition: 'background 0.2s', background: i % 2 === 0 ? '#f9fafb' : '#fff' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99,102,241,0.05)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = i % 2 === 0 ? '#f9fafb' : '#fff'; }}>
                          <td style={{ ...td, fontWeight: 600, color: 'var(--text-primary)' }}>{t.name}</td>
                          <td style={{ ...td, color: 'var(--text-muted)' }}>{t.active_clients || 0}</td>
                          <td style={{ ...td, fontWeight: 700, color: '#2563eb' }}>{fmtAmt(t.month_revenue)}</td>
                          <td style={{ ...td, fontWeight: 600, color: 'var(--text-secondary)' }}>{fmtAmt(t.total_revenue)}</td>
                          <td style={{ ...td }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{ flex: 1, background: '#e5e7eb', borderRadius: 4, height: 5, overflow: 'hidden' }}>
                                <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #6366f1, #2563eb)', borderRadius: 4 }} />
                              </div>
                              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)' }}>{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </m.div>
        </m.div>

        <m.div variants={containerVariants} initial="hidden" animate="visible">
          <m.div variants={itemVariants} style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)', background: 'var(--bg-card)' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 3, height: 16, borderRadius: 2, background: 'linear-gradient(180deg, #6366f1, #2563eb)', display: 'inline-block' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Revenue Breakdown — {new Date().getFullYear()}</span>
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-disabled)' }}>Total: {fmtAmt(totalRevenue)}</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'var(--bg-subtle)' }}>
                    {['Month', 'Payments', 'Revenue', 'Progress'].map((h) => (
                      <th key={h} style={{ ...th, color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fullYear.map((m, i) => (
                    <tr key={i} style={{ opacity: m.revenue === 0 ? 0.35 : 1, borderBottom: '1px solid rgba(0,0,0,0.04)', transition: 'background 0.2s', background: i % 2 === 0 ? '#f9fafb' : '#fff' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99,102,241,0.05)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = i % 2 === 0 ? '#f9fafb' : '#fff'; }}>
                      <td style={{ ...td, fontWeight: 600, color: 'var(--text-primary)' }}>{m.month}</td>
                      <td style={{ ...td, color: 'var(--text-muted)' }}>{m.count || '—'}</td>
                      <td style={{ ...td, fontWeight: 700, color: m.revenue > 0 ? '#16a34a' : '#9ca3af' }}>{m.revenue > 0 ? fmtAmt(m.revenue) : '—'}</td>
                      <td style={td}>
                        {m.revenue > 0 && (
                          <div style={{ background: '#e5e7eb', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                            <div style={{ width: `${(m.revenue / maxRevenue) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #6366f1, #2563eb)', borderRadius: 4, transition: 'width 0.4s' }} />
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#eff6ff', borderTop: '1px solid rgba(37,99,235,0.15)', fontWeight: 700 }}>
                    <td style={{ ...td, color: 'var(--text-primary)' }}>Total</td>
                    <td style={{ ...td, color: 'var(--text-muted)' }}>{fullYear.reduce((s, m) => s + m.count, 0)}</td>
                    <td style={{ ...td, color: '#2563eb', fontSize: 13 }}>{fmtAmt(totalRevenue)}</td>
                    <td style={td} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </m.div>
        </m.div>
      </div>
    </AppShell>
  );
}
