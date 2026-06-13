'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { PremiumButton } from '@/components/premium/PremiumButton';
import { api } from '@/lib/api';
import { ChevronLeft, ChevronRight, Download, PlusCircle, Users, IndianRupee, TrendingUp, TrendingDown, PieChart, AlertTriangle } from 'lucide-react';

const fmt = (n: any) => '\u20b9' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

const FINANCE_TABS = [
  { label: 'Collection', href: '/finance/collection' },
  { label: 'Dues',       href: '/finance/dues' },
  { label: 'Invoices',   href: '/finance/invoices' },
  { label: 'P & L',      href: '/finance/pl' },
  { label: 'Forecast',   href: '/finance/forecast' },
  { label: 'Payroll',    href: '/finance/trainer-revenue' },
];

export default function ProfitAndLossPage() {
  return (
    <Guard role="admin">
      <Inner />
    </Guard>
  );
}

function Inner() {
  const router = useRouter();
  const [year, setYear] = useState(new Date().getFullYear());
  const [monthly, setMonthly] = useState<any[]>([]);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    const from = `${year}-01-01`;
    const to   = `${year}-12-31`;
    Promise.all([
      api.reports.monthly(year),
      api.trainers.list(),
      api.expenses.list({ from, to, limit: 5000 }),
    ])
      .then(([m, t, e]: any) => {
        if (!alive) return;
        setMonthly(Array.isArray(m) ? m : []);
        setTrainers(t || []);
        setExpenses(e?.expenses ?? []);
      })
      .catch((e: any) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [year]);

  const totals = useMemo(() => {
    const revenue      = monthly.reduce((s: number, m: any) => s + Number(m.revenue || 0), 0);
    const monthlySal   = trainers.reduce((s: number, t: any) => s + Number(t.salary || 0), 0);
    const annualSalary = monthlySal * 12;
    const overheads    = expenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
    const totalCost    = annualSalary + overheads;
    const profit       = revenue - totalCost;
    const margin       = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;
    return { revenue, annualSalary, overheads, totalCost, profit, margin };
  }, [monthly, trainers, expenses]);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    expenses.forEach((e: any) => {
      const cat = e.category || 'other';
      map.set(cat, (map.get(cat) || 0) + Number(e.amount || 0));
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [expenses]);

  const handleExport = () => {
    const rows = [
      ['Line Item', 'Amount'],
      ['Membership & Training Revenue', totals.revenue],
      ['Less: Coach Payroll (12 months)', -totals.annualSalary],
      ['Less: Overheads', -totals.overheads],
      ...byCategory.map(([cat, amt]) => [`  ${cat}`, -amt]),
      [totals.profit >= 0 ? 'Profit Before Tax' : 'Net Loss', Math.abs(totals.profit)],
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `pl_${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isProfit = totals.profit >= 0;

  return (
    <AppShell>
      <div className="min-h-screen" style={{ background: 'linear-gradient(145deg,#f8fafc 0%,#f1f5f9 50%,#fafafe 100%)' }}>
        {/* Premium Hero Header */}
        <div className="relative overflow-hidden rounded-none sm:rounded-[28px] mx-0 sm:mx-6 mt-0 sm:mt-6 p-6 sm:p-8"
          style={{
            background: 'linear-gradient(145deg, #0f0c29 0%, #1a1440 30%, #1e1b4b 60%, #1e40af 100%)',
            boxShadow: '0 24px 80px rgba(30,27,75,0.35)',
          }}>
          <div className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }} />
          <motion.div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full opacity-30"
            style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.5) 0%, transparent 70%)' }}
            animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.4, 0.3] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }} />
          <motion.div className="pointer-events-none absolute -bottom-32 -left-24 h-96 w-96 rounded-full opacity-25"
            style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.4) 0%, transparent 70%)' }}
            animate={{ scale: [1, 1.15, 1], opacity: [0.25, 0.35, 0.25] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }} />
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-purple-400 to-cyan-400 opacity-60" />

          <div className="relative z-10">
            {/* Finance Tabs */}
            <div className="flex flex-wrap gap-2 mb-5">
              {FINANCE_TABS.map(tab => (
                <button key={tab.href} onClick={() => router.push(tab.href)}
                  className="rounded-[10px] px-3.5 py-2 text-[11px] font-[700] uppercase tracking-[0.06em] transition-all"
                  style={{
                    background: tab.href === '/finance/pl' ? 'rgba(167,139,250,0.2)' : 'rgba(255,255,255,0.06)',
                    color: tab.href === '/finance/pl' ? '#c4b5fd' : 'rgba(255,255,255,0.6)',
                    border: tab.href === '/finance/pl' ? '1.5px solid rgba(167,139,250,0.4)' : '1.5px solid rgba(255,255,255,0.08)',
                  }}>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Title + Year Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-[26px] sm:text-[34px] font-[860] tracking-[-0.03em] leading-[1.2]" style={{ color: '#ffffff' }}>
                  Profit &{' '}
                  <span style={{ background: 'linear-gradient(135deg, #c4b5fd, #67e8f9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Loss
                  </span>
                </h1>
                <p className="mt-1 text-[13px]" style={{ color: 'rgba(255,255,255,0.6)' }}>Annual financial overview and performance metrics</p>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={() => setYear(y => y - 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-[10px] transition-all hover:bg-white/10"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <ChevronLeft size={14} style={{ color: 'rgba(255,255,255,0.7)' }} />
                </button>
                <span className="text-[15px] font-[760] min-w-[52px] text-center" style={{ color: '#ffffff' }}>{year}</span>
                <button onClick={() => setYear(y => y + 1)} disabled={year >= new Date().getFullYear()}
                  className="flex h-8 w-8 items-center justify-center rounded-[10px] transition-all hover:bg-white/10"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', opacity: year >= new Date().getFullYear() ? 0.4 : 1 }}>
                  <ChevronRight size={14} style={{ color: 'rgba(255,255,255,0.7)' }} />
                </button>
              </div>
            </div>

            {/* KPI Cards */}
            {!loading && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
                <KPICard icon={<TrendingUp size={16} />} label="Total Revenue" value={fmt(totals.revenue)} accent="#10B981" />
                <KPICard icon={<TrendingDown size={16} />} label="Total Cost" value={fmt(totals.totalCost)} accent="#F43F5E" />
                <KPICard icon={isProfit ? <IndianRupee size={16} /> : <AlertTriangle size={16} />}
                  label={isProfit ? 'Net Profit' : 'Net Loss'} value={fmt(Math.abs(totals.profit))} accent={isProfit ? '#8B5CF6' : '#F59E0B'} />
                <KPICard icon={<PieChart size={16} />} label="Profit Margin" value={`${totals.margin}%`} accent={isProfit ? '#06B6D4' : '#F43F5E'} />
              </div>
            )}
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 sm:px-8 mt-6 mb-4">
          <div className="flex gap-2">
            <PremiumButton tone="secondary" size="sm" icon={<PlusCircle size={13} />} onClick={() => router.push('/finance/record-payment')}>
              Add Expense
            </PremiumButton>
            <PremiumButton tone="secondary" size="sm" icon={<Users size={13} />} onClick={() => router.push('/finance/trainer-revenue')}>
              Payroll Detail
            </PremiumButton>
          </div>
          <PremiumButton tone="primary" glow size="sm" icon={<Download size={13} />} onClick={handleExport} disabled={loading}>
            Export CSV
          </PremiumButton>
        </div>

        {/* Error */}
        {error && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
            className="mx-5 sm:mx-8 mb-4 rounded-[13px] p-3.5 text-[13px] font-[500]"
            style={{ background: '#fff1f2', border: '1px solid #fecdd3', color: '#9f1239' }}>
            {error}
          </motion.div>
        )}

        {/* P&L Table */}
        <div className="px-5 sm:px-8 pb-8">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-[22px] overflow-hidden"
            style={{ background: 'white', border: '1px solid #f1f5f9', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-8 w-8 rounded-full border-2 border-purple-400 border-t-transparent animate-spin" />
                  <span className="text-[13px] font-[500]" style={{ color: 'rgb(148,163,184)' }}>Loading financial data...</span>
                </div>
              </div>
            ) : (
              <div className="p-5 sm:p-6">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="text-left pb-3 text-[11px] font-[700] uppercase tracking-[0.08em]" style={{ color: 'rgb(148,163,184)', borderBottom: '1px solid rgba(15,23,42,0.06)' }}>Line Item</th>
                      <th className="text-right pb-3 text-[11px] font-[700] uppercase tracking-[0.08em]" style={{ color: 'rgb(148,163,184)', borderBottom: '1px solid rgba(15,23,42,0.06)' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-3.5 text-[13px] font-[700]" style={{ color: 'rgb(15,23,42)', borderBottom: '1px solid rgba(15,23,42,0.04)' }}>
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 items-center justify-center rounded-[8px]" style={{ background: 'rgba(16,185,129,0.12)' }}>
                            <TrendingUp size={13} style={{ color: '#10B981' }} />
                          </div>
                          Membership & Training Revenue
                        </div>
                      </td>
                      <td className="py-3.5 text-[15px] font-[800] text-right tabular-nums" style={{ color: '#10B981', borderBottom: '1px solid rgba(15,23,42,0.04)' }}>
                        {fmt(totals.revenue)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3.5 text-[13px] font-[600]" style={{ color: 'rgb(71,85,105)', borderBottom: '1px solid rgba(15,23,42,0.04)' }}>
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 items-center justify-center rounded-[8px]" style={{ background: 'rgba(244,63,94,0.12)' }}>
                            <Users size={13} style={{ color: '#F43F5E' }} />
                          </div>
                          <button onClick={() => router.push('/finance/trainer-revenue')} className="underline decoration-dotted underline-offset-2 hover:no-underline" style={{ color: 'inherit' }}>
                            Less: Coach Payroll (12 months)
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 text-[14px] font-[700] text-right tabular-nums" style={{ color: '#F43F5E', borderBottom: '1px solid rgba(15,23,42,0.04)' }}>
                        ({fmt(totals.annualSalary)})
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3.5 text-[13px] font-[600]" style={{ color: 'rgb(71,85,105)', borderBottom: byCategory.length > 0 ? 'none' : '1px solid rgba(15,23,42,0.04)' }}>
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 items-center justify-center rounded-[8px]" style={{ background: 'rgba(245,158,11,0.12)' }}>
                            <IndianRupee size={13} style={{ color: '#F59E0B' }} />
                          </div>
                          <button onClick={() => router.push('/finance/collection')} className="underline decoration-dotted underline-offset-2 hover:no-underline" style={{ color: 'inherit' }}>
                            Less: Overheads
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 text-[14px] font-[700] text-right tabular-nums" style={{ color: '#F43F5E', borderBottom: byCategory.length > 0 ? 'none' : '1px solid rgba(15,23,42,0.04)' }}>
                        ({fmt(totals.overheads)})
                      </td>
                    </tr>
                    {byCategory.length > 0 && (
                      <tr>
                        <td className="pb-2" style={{ paddingLeft: 48 }}>
                          <div className="space-y-1.5">
                            {byCategory.map(([cat, amt]) => (
                              <div key={cat} className="flex justify-between text-[12.5px]" style={{ color: 'rgb(100,116,139)' }}>
                                <span className="font-[500]">{cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
                                <span className="tabular-nums font-[600]" style={{ color: '#F43F5E' }}>{fmt(amt)}</span>
                              </div>
                            ))}
                          </div>
                          <button onClick={() => router.push('/finance/dues')}
                            className="mt-2 text-[11px] font-[700] uppercase tracking-[0.06em] transition-colors hover:opacity-70"
                            style={{ color: '#8B5CF6' }}>
                            View All Expenses →
                          </button>
                        </td>
                        <td />
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td className="pt-4 text-[14px] font-[800]" style={{ borderTop: '2px solid rgba(15,23,42,0.08)', color: 'rgb(15,23,42)' }}>
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-[9px]"
                            style={{ background: isProfit ? 'rgba(139,92,246,0.12)' : 'rgba(245,158,11,0.12)' }}>
                            {isProfit ? <TrendingUp size={14} style={{ color: '#8B5CF6' }} /> : <AlertTriangle size={14} style={{ color: '#F59E0B' }} />}
                          </div>
                          {isProfit ? 'Profit Before Tax' : 'Net Loss'}
                        </div>
                      </td>
                      <td className="pt-4 text-[18px] font-[860] text-right tabular-nums"
                        style={{ borderTop: '2px solid rgba(15,23,42,0.08)', color: isProfit ? '#8B5CF6' : '#F59E0B' }}>
                        {isProfit ? '' : '('}{fmt(Math.abs(totals.profit))}{isProfit ? '' : ')'}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </AppShell>
  );
}

function KPICard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      tabIndex={0} role="button"
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; }}
      style={{
        background: 'white', borderRadius: 20, padding: '22px 24px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)',
        display: 'flex', flexDirection: 'column', gap: 12, position: 'relative',
        overflow: 'hidden', transition: 'all 200ms ease', cursor: 'default'
      }}
      onMouseEnter={(e) => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = '0 8px 28px rgba(0,0,0,0.1)'; el.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={(e) => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)'; el.style.transform = 'translateY(0)'; }}>
      <div style={{
        position: 'absolute', top: 0, left: 24, right: 24, height: 3,
        background: `linear-gradient(90deg,${accent},${accent}88)`,
        borderRadius: '0 0 3px 3px', opacity: 0.8
      }} />
      <div style={{ width: 40, height: 40, borderRadius: 12, background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, fontWeight: 500 }}>{label}</div>
      </div>
    </motion.div>
  );
}
