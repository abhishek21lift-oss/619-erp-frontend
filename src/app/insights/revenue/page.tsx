'use client';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { TrendingUp, DollarSign, Users, Clock, BarChart3, Percent, Search, ArrowUpRight, Calendar } from 'lucide-react';
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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
};
const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] } }
};

function KpiCard({ label, value, icon, gradient, sub }: {
  label: string; value: string; icon?: React.ReactNode; gradient: string; sub?: string
}) {
  return (
    <motion.div variants={itemVariants}
      style={{ position: 'relative', overflow: 'hidden', borderRadius: 16, padding: '22px 20px', background: gradient, border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.15)', cursor: 'default', transition: 'transform 0.3s ease, box-shadow 0.3s ease' }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 16px 48px rgba(37,99,235,0.2)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.15)'; }}>
      <div style={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.08), transparent)', pointerEvents: 'none' }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, position: 'relative', zIndex: 1 }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', color: 'rgba(255,255,255,0.55)' }}>{label}</span>
        {icon && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 12, background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }}>
            {icon}
          </div>
        )}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', position: 'relative', zIndex: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2, position: 'relative', zIndex: 1 }}>{sub}</div>}
    </motion.div>
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

  const chartHovered = useState<number | null>(null);

  return (
    <AppShell>
      <div style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, #0f0a1e 0%, #0c1f5e 35%, #0f172a 65%, #0f0a1e 100%)', padding: '52px 32px 40px', borderRadius: '0 0 36px 36px' }}>
        <div style={{ position: 'absolute', top: '-120px', right: '-80px', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,99,235,0.2), transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-100px', left: '-60px', width: '250px', height: '250px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.12), transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '20%', left: '70%', width: '180px', height: '180px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.1), transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, opacity: 0.03, backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 60, left: '25%', width: 7, height: 7, borderRadius: '50%', background: 'rgba(99,102,241,0.35)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: 40, right: '15%', width: 5, height: 5, borderRadius: '50%', background: 'rgba(37,99,235,0.3)', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8, position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 54, height: 54, borderRadius: 16, background: 'linear-gradient(135deg, rgba(37,99,235,0.3), rgba(6,182,212,0.2))', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)', boxShadow: '0 8px 32px rgba(37,99,235,0.15)' }}>
            <TrendingUp size={24} color="#fff" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #fff, #93c5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Revenue Analytics</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Track revenue performance across trainers and time periods</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 20, position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '7px 14px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <Calendar size={14} color="rgba(255,255,255,0.3)" />
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>From</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, outline: 'none', padding: '2px 0' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '7px 14px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <Calendar size={14} color="rgba(255,255,255,0.3)" />
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>To</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, outline: 'none', padding: '2px 0' }} />
          </div>
        </div>
      </div>

      <div style={{ padding: '24px 32px' }}>
        {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#ef4444', marginBottom: 20 }}>{error}</div>}

        <motion.div variants={containerVariants} initial="hidden" animate="visible" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
          <KpiCard label="This Month Revenue" value={fmtAmt(thisMonthRevenue)} icon={<DollarSign size={16} />} gradient="linear-gradient(135deg, rgba(37,99,235,0.25), rgba(30,27,75,0.7))" />
          <KpiCard label="Avg Revenue / Trainer" value={fmtAmt(avgRevenuePerTrainer)} icon={<Users size={16} />} gradient="linear-gradient(135deg, rgba(16,185,129,0.2), rgba(30,27,75,0.7))" />
          <KpiCard label="Pending Collections" value={fmtAmt(pendingCollections)} icon={<Clock size={16} />} gradient="linear-gradient(135deg, rgba(245,158,11,0.2), rgba(30,27,75,0.7))" />
          <KpiCard label="Growth Rate" value={`${growthRate >= 0 ? '+' : ''}${growthRate.toFixed(1)}%`} icon={<Percent size={16} />} gradient={growthRate >= 0 ? 'linear-gradient(135deg, rgba(16,185,129,0.25), rgba(30,27,75,0.7))' : 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(30,27,75,0.7))'} />
        </motion.div>

        <motion.div variants={containerVariants} initial="hidden" animate="visible" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20, marginBottom: 24 }}>
          <motion.div variants={itemVariants} style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '22px 20px 18px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 3, height: 18, borderRadius: 2, background: 'linear-gradient(180deg, #6366f1, #2563eb)' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>Monthly Revenue — {new Date().getFullYear()}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 8, background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.15)' }}>
                <ArrowUpRight size={12} color="#60a5fa" />
                <span style={{ fontSize: 10, fontWeight: 700, color: '#60a5fa' }}>{fmtAmt(totalRevenue)}</span>
              </div>
            </div>
            {loading ? (
              <div style={{ height: 160, background: 'rgba(255,255,255,0.03)', borderRadius: 10 }} />
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 160, padding: '0 4px' }}>
                  {fullYear.map((m, i) => {
                    const pct = maxRevenue > 0 ? Math.max((m.revenue / maxRevenue) * 100, m.revenue > 0 ? 4 : 0) : 0;
                    const [hovered, setHovered] = [chartHovered[0], chartHovered[1]];
                    return (
                      <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}
                        onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
                        {hovered === i && m.revenue > 0 && (
                          <div style={{ fontSize: 10, color: '#fff', fontWeight: 700, background: 'rgba(37,99,235,0.9)', borderRadius: 6, padding: '3px 7px', marginBottom: 3, whiteSpace: 'nowrap', backdropFilter: 'blur(4px)' }}>
                            {fmtAmt(m.revenue)} ({m.count})
                          </div>
                        )}
                        {hovered !== i && (
                          <div style={{ marginTop: 'auto', fontSize: 9, color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>
                            {m.revenue > 0 ? (m.revenue >= 1000 ? `₹${(m.revenue/1000).toFixed(0)}K` : '') : ''}
                          </div>
                        )}
                        <div style={{ width: '100%', height: `${pct}%`, background: m.revenue > 0 ? 'linear-gradient(180deg, #6366f1 0%, #2563eb 50%, rgba(37,99,235,0.3) 100%)' : 'rgba(255,255,255,0.04)', borderRadius: '4px 4px 0 0', minHeight: m.revenue > 0 ? 6 : 2, transition: 'height 0.4s, opacity 0.15s', opacity: hovered !== null && hovered !== i ? 0.5 : 1, boxShadow: m.revenue > 0 ? '0 2px 8px rgba(99,102,241,0.3)' : 'none' }} />
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 10, padding: '0 4px' }}>
                  {fullYear.map((m, i) => (
                    <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 9, color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>{m.month}</div>
                  ))}
                </div>
              </>
            )}
          </motion.div>

          <motion.div variants={itemVariants} style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 3, height: 16, borderRadius: 2, background: 'linear-gradient(180deg, #6366f1, #2563eb)', display: 'inline-block' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>Revenue by Trainer</span>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.2), rgba(124,58,237,0.15))' }}>
                    {['Trainer', 'Clients', 'This Month', 'Total Rev', '%'].map((h) => (
                      <th key={h} style={{ ...th, color: '#a5b4fc' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {revenueByTrainer.length === 0 ? (
                    <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(99,102,241,0.08))', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(99,102,241,0.15)' }}>
                          <Users size={20} color="#a5b4fc" />
                        </div>
                        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>Start tracking revenue to see insights here</div>
                      </div>
                    </td></tr>
                  ) : (
                    revenueByTrainer.map((t, i) => {
                      const pct = totalRevenueAll > 0 ? ((Number(t.total_revenue || 0) / totalRevenueAll) * 100).toFixed(1) : 0;
                      return (
                        <tr key={t.id || i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.2s', background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99,102,241,0.08)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent'; }}>
                          <td style={{ ...td, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{t.name}</td>
                          <td style={{ ...td, color: 'rgba(255,255,255,0.45)' }}>{t.active_clients || 0}</td>
                          <td style={{ ...td, fontWeight: 700, color: '#60a5fa' }}>{fmtAmt(t.month_revenue)}</td>
                          <td style={{ ...td, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>{fmtAmt(t.total_revenue)}</td>
                          <td style={{ ...td }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{ flex: 1, background: 'rgba(255,255,255,0.06)', borderRadius: 4, height: 5, overflow: 'hidden' }}>
                                <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #6366f1, #2563eb)', borderRadius: 4 }} />
                              </div>
                              <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </motion.div>

        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          <motion.div variants={itemVariants} style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 3, height: 16, borderRadius: 2, background: 'linear-gradient(180deg, #6366f1, #2563eb)', display: 'inline-block' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>Revenue Breakdown — {new Date().getFullYear()}</span>
              </div>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Total: {fmtAmt(totalRevenue)}</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.2), rgba(124,58,237,0.15))' }}>
                    {['Month', 'Payments', 'Revenue', 'Progress'].map((h) => (
                      <th key={h} style={{ ...th, color: '#a5b4fc' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fullYear.map((m, i) => (
                    <tr key={i} style={{ opacity: m.revenue === 0 ? 0.35 : 1, borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.2s', background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99,102,241,0.08)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent'; }}>
                      <td style={{ ...td, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{m.month}</td>
                      <td style={{ ...td, color: 'rgba(255,255,255,0.45)' }}>{m.count || '—'}</td>
                      <td style={{ ...td, fontWeight: 700, color: m.revenue > 0 ? '#34d399' : 'rgba(255,255,255,0.35)' }}>{m.revenue > 0 ? fmtAmt(m.revenue) : '—'}</td>
                      <td style={td}>
                        {m.revenue > 0 && (
                          <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                            <div style={{ width: `${(m.revenue / maxRevenue) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #6366f1, #2563eb)', borderRadius: 4, transition: 'width 0.4s' }} />
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: 'rgba(37,99,235,0.08)', borderTop: '1px solid rgba(99,102,241,0.2)', fontWeight: 700 }}>
                    <td style={{ ...td, color: 'rgba(255,255,255,0.85)' }}>Total</td>
                    <td style={{ ...td, color: 'rgba(255,255,255,0.45)' }}>{fullYear.reduce((s, m) => s + m.count, 0)}</td>
                    <td style={{ ...td, color: '#a5b4fc', fontSize: 13 }}>{fmtAmt(totalRevenue)}</td>
                    <td style={td} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </AppShell>
  );
}
