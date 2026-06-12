'use client';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { TrendingUp, DollarSign, Users, Clock, BarChart3, Percent } from 'lucide-react';
import { api } from '@/lib/api';
import { fmtMoney } from '@/lib/format';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmtAmt(n: any) {
  return '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function isoToday() { return new Date().toISOString().split('T')[0]; }

function isoMonthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;
}

function fadeUp(i: number) {
  return { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { delay: i * 0.08, duration: 0.4, ease: 'easeOut' } };
}

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
    setLoading(true);
    setError('');
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
      <div style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, #0f172a, #1e293b)', padding: '48px 32px 40px', borderRadius: '0 0 32px 32px' }}>
        <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '200px', height: '200px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.15), transparent)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-40px', left: '-40px', width: '160px', height: '160px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.1), transparent)', pointerEvents: 'none' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8, position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: 16, background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)' }}>
            <TrendingUp size={22} color="#fff" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>Revenue Analytics</h1>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>Track revenue performance across trainers and time periods</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 20, position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '6px 14px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>From</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, outline: 'none', padding: '2px 0' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '6px 14px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>To</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, outline: 'none', padding: '2px 0' }} />
          </div>
        </div>
      </div>

      <div style={{ padding: '24px 32px' }}>
        {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#ef4444', marginBottom: 20 }}>{error}</div>}

        <motion.div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }} {...fadeUp(0)}>
          {[
            { label: 'This Month Revenue', value: fmtAmt(thisMonthRevenue), icon: <DollarSign size={16} />, color: '#3b82f6' },
            { label: 'Avg Revenue / Trainer', value: fmtAmt(avgRevenuePerTrainer), icon: <Users size={16} />, color: '#10b981' },
            { label: 'Pending Collections', value: fmtAmt(pendingCollections), icon: <Clock size={16} />, color: '#f59e0b' },
            { label: 'Growth Rate', value: `${growthRate >= 0 ? '+' : ''}${growthRate.toFixed(1)}%`, icon: <Percent size={16} />, color: growthRate >= 0 ? '#10b981' : '#ef4444' },
          ].map((kpi, i) => (
            <motion.div key={i} style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '18px 20px' }} {...fadeUp(i + 1)}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', color: 'rgba(255,255,255,0.45)' }}>{kpi.label}</span>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 10, background: `${kpi.color}20`, color: kpi.color }}>
                  {kpi.icon}
                </div>
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em' }}>{kpi.value}</div>
            </motion.div>
          ))}
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20, marginBottom: 24 }}>
          <motion.div style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '20px 20px 16px' }} {...fadeUp(5)}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <BarChart3 size={16} color="rgba(255,255,255,0.6)" />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>Monthly Revenue — {new Date().getFullYear()}</span>
              </div>
            </div>
            {loading ? (
              <div style={{ height: 160, background: 'rgba(255,255,255,0.03)', borderRadius: 10, animation: 'pulse 1.5s infinite' }} />
            ) : (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 160, padding: '0 4px' }}>
                {fullYear.map((m, i) => {
                  const pct = maxRevenue > 0 ? Math.max((m.revenue / maxRevenue) * 100, m.revenue > 0 ? 4 : 0) : 0;
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
                      <div style={{ marginTop: 'auto', fontSize: 9, color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>{m.revenue > 0 ? (m.revenue >= 1000 ? `₹${(m.revenue/1000).toFixed(0)}K` : '') : ''}</div>
                      <div style={{ width: '100%', height: `${pct}%`, background: m.revenue > 0 ? 'linear-gradient(180deg, #3b82f6, rgba(59,130,246,0.3))' : 'rgba(255,255,255,0.04)', borderRadius: '4px 4px 0 0', minHeight: m.revenue > 0 ? 6 : 2, transition: 'height 0.4s' }} />
                    </div>
                  );
                })}
              </div>
            )}
            <div style={{ display: 'flex', gap: 6, marginTop: 10, padding: '0 4px' }}>
              {fullYear.map((m, i) => (
                <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 9, color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>{m.month}</div>
              ))}
            </div>
          </motion.div>

          <motion.div style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden' }} {...fadeUp(6)}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>Revenue by Trainer</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {['Trainer', 'Clients', 'This Month', 'Total Rev', '%'].map((h) => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.35)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {revenueByTrainer.length === 0 ? (
                    <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>No trainer data available</td></tr>
                  ) : (
                    revenueByTrainer.map((t, i) => {
                      const pct = totalRevenueAll > 0 ? ((Number(t.total_revenue || 0) / totalRevenueAll) * 100).toFixed(1) : 0;
                      return (
                        <tr key={t.id || i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '10px 12px', fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{t.name}</td>
                          <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.5)' }}>{t.active_clients || 0}</td>
                          <td style={{ padding: '10px 12px', fontWeight: 700, color: '#3b82f6' }}>{fmtAmt(t.month_revenue)}</td>
                          <td style={{ padding: '10px 12px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>{fmtAmt(t.total_revenue)}</td>
                          <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.5)' }}>{pct}%</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>

        <motion.div style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden' }} {...fadeUp(7)}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>Revenue Breakdown — {new Date().getFullYear()}</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Total: {fmtAmt(totalRevenue)}</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.35)' }}>Month</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.35)' }}>Payments</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.35)' }}>Revenue</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.35)' }}>Progress</th>
                </tr>
              </thead>
              <tbody>
                {fullYear.map((m, i) => (
                  <tr key={i} style={{ opacity: m.revenue === 0 ? 0.35 : 1, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{m.month}</td>
                    <td style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.45)' }}>{m.count || '—'}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: m.revenue > 0 ? '#10b981' : 'rgba(255,255,255,0.35)' }}>{m.revenue > 0 ? fmtAmt(m.revenue) : '—'}</td>
                    <td style={{ padding: '10px 14px' }}>
                      {m.revenue > 0 && (
                        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                          <div style={{ width: `${(m.revenue / maxRevenue) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #3b82f6, #10b981)', borderRadius: 4, transition: 'width 0.4s' }} />
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '1px solid rgba(255,255,255,0.1)', fontWeight: 700 }}>
                  <td style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.85)' }}>Total</td>
                  <td style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.45)' }}>{fullYear.reduce((s, m) => s + m.count, 0)}</td>
                  <td style={{ padding: '10px 14px', color: '#3b82f6', fontSize: 13 }}>{fmtAmt(totalRevenue)}</td>
                  <td style={{ padding: '10px 14px' }} />
                </tr>
              </tfoot>
            </table>
          </div>
        </motion.div>
      </div>
    </AppShell>
  );
}
