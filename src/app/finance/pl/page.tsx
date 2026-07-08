'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { m } from 'framer-motion';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { Button, KpiCard } from '@/components/ui';
import { api } from '@/lib/api';
import { ChevronLeft, ChevronRight, Download, PlusCircle, Users, IndianRupee, TrendingUp, TrendingDown, PieChart, AlertTriangle } from 'lucide-react';

const fmt = (n: any) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

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
      <div className="min-h-screen" style={{ background: 'var(--bg-subtle)' }}>
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-none sm:rounded-[28px] mx-0 sm:mx-6 mt-0 sm:mt-6 p-6 sm:p-8"
          style={{
            background: 'var(--bg-card)',
            borderBottom: '1px solid var(--border)',
          }}>
          <div className="relative">
            {/* Finance Tabs */}
            <div className="flex flex-wrap gap-2 mb-5">
              {FINANCE_TABS.map(tab => {
                const active = tab.href === '/finance/pl';
                return (
                  <button key={tab.href} onClick={() => router.push(tab.href)}
                    className="rounded-[10px] px-3.5 py-2 text-[11px] font-[700] uppercase tracking-[0.06em] transition-all"
                    style={{
                      background: active ? 'rgba(99,102,241,0.1)' : 'transparent',
                      color: active ? 'var(--brand)' : 'var(--text-muted)',
                      border: active ? '1.5px solid rgba(99,102,241,0.3)' : '1.5px solid var(--border)',
                    }}>
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Title + Year Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-[26px] sm:text-[34px] font-[860] tracking-[-0.03em] leading-[1.2]" style={{ color: 'var(--text-primary)' }}>
                  Profit &{' '}
                  <span style={{ color: 'var(--brand)' }}>
                    Loss
                  </span>
                </h1>
                <p className="mt-1 text-[13px]" style={{ color: 'var(--text-muted)' }}>Annual financial overview and performance metrics</p>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={() => setYear(y => y - 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-[10px] transition-all hover:opacity-70"
                  style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
                  <ChevronLeft size={14} style={{ color: 'var(--text-muted)' }} />
                </button>
                <span className="text-[15px] font-[760] min-w-[52px] text-center" style={{ color: 'var(--text-primary)' }}>{year}</span>
                <button onClick={() => setYear(y => y + 1)} disabled={year >= new Date().getFullYear()}
                  className="flex h-8 w-8 items-center justify-center rounded-[10px] transition-all hover:opacity-70"
                  style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', opacity: year >= new Date().getFullYear() ? 0.4 : 1 }}>
                  <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                </button>
              </div>
            </div>

            {/* KPI Cards */}
            {!loading && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
                <KpiCard icon={<TrendingUp size={16} />} label="Total Revenue" value={fmt(totals.revenue)} accent="emerald" />
                <KpiCard icon={<TrendingDown size={16} />} label="Total Cost" value={fmt(totals.totalCost)} accent="coral" />
                <KpiCard
                  icon={isProfit ? <IndianRupee size={16} /> : <AlertTriangle size={16} />}
                  label={isProfit ? 'Net Profit' : 'Net Loss'}
                  value={fmt(Math.abs(totals.profit))}
                  accent={isProfit ? 'violet' : 'amber'}
                />
                <KpiCard icon={<PieChart size={16} />} label="Profit Margin" value={`${totals.margin}%`} accent={isProfit ? 'cyan' : 'coral'} />
              </div>
            )}
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 sm:px-8 mt-6 mb-4">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" iconLeft={<PlusCircle size={13} />} onClick={() => router.push('/finance/record-payment')}>
              Add Expense
            </Button>
            <Button variant="outline" size="sm" iconLeft={<Users size={13} />} onClick={() => router.push('/finance/trainer-revenue')}>
              Payroll Detail
            </Button>
          </div>
          <Button variant="primary" size="sm" iconLeft={<Download size={13} />} onClick={handleExport} disabled={loading}>
            Export CSV
          </Button>
        </div>

        {/* Error */}
        {error && (
          <m.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
            className="mx-5 sm:mx-8 mb-4 rounded-[13px] p-3.5 text-[13px] font-[500]"
            style={{ background: '#fff1f2', border: '1px solid #fecdd3', color: '#9f1239' }}>
            {error}
          </m.div>
        )}

        {/* P&L Table */}
        <div className="px-5 sm:px-8 pb-8">
          <m.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-[22px] overflow-hidden"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-8 w-8 rounded-full border-2 border-purple-400 border-t-transparent animate-spin" />
                  <span className="text-[13px] font-[500]" style={{ color: 'var(--text-muted)' }}>Loading financial data...</span>
                </div>
              </div>
            ) : (
              <div className="p-5 sm:p-6">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="text-left pb-3 text-[11px] font-[700] uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>Line Item</th>
                      <th className="text-right pb-3 text-[11px] font-[700] uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-3.5 text-[13px] font-[700]" style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border)' }}>
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 items-center justify-center rounded-[8px]" style={{ background: 'rgba(16,185,129,0.12)' }}>
                            <TrendingUp size={13} style={{ color: '#10B981' }} />
                          </div>
                          Membership & Training Revenue
                        </div>
                      </td>
                      <td className="py-3.5 text-[15px] font-[800] text-right tabular-nums" style={{ color: '#10B981', borderBottom: '1px solid var(--border)' }}>
                        {fmt(totals.revenue)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3.5 text-[13px] font-[600]" style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 items-center justify-center rounded-[8px]" style={{ background: 'rgba(244,63,94,0.12)' }}>
                            <Users size={13} style={{ color: '#F43F5E' }} />
                          </div>
                          <button onClick={() => router.push('/finance/trainer-revenue')} className="underline decoration-dotted underline-offset-2 hover:no-underline" style={{ color: 'inherit' }}>
                            Less: Coach Payroll (12 months)
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 text-[14px] font-[700] text-right tabular-nums" style={{ color: '#F43F5E', borderBottom: '1px solid var(--border)' }}>
                        ({fmt(totals.annualSalary)})
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3.5 text-[13px] font-[600]" style={{ color: 'var(--text-secondary)', borderBottom: byCategory.length > 0 ? 'none' : '1px solid var(--border)' }}>
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 items-center justify-center rounded-[8px]" style={{ background: 'rgba(245,158,11,0.12)' }}>
                            <IndianRupee size={13} style={{ color: '#F59E0B' }} />
                          </div>
                          <button onClick={() => router.push('/finance/collection')} className="underline decoration-dotted underline-offset-2 hover:no-underline" style={{ color: 'inherit' }}>
                            Less: Overheads
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 text-[14px] font-[700] text-right tabular-nums" style={{ color: '#F43F5E', borderBottom: byCategory.length > 0 ? 'none' : '1px solid var(--border)' }}>
                        ({fmt(totals.overheads)})
                      </td>
                    </tr>
                    {byCategory.length > 0 && (
                      <tr>
                        <td className="pb-2" style={{ paddingLeft: 48 }}>
                          <div className="space-y-1.5">
                            {byCategory.map(([cat, amt]) => (
                              <div key={cat} className="flex justify-between text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
                                <span className="font-[500]">{cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
                                <span className="tabular-nums font-[600]" style={{ color: '#F43F5E' }}>{fmt(amt)}</span>
                              </div>
                            ))}
                          </div>
                          <button onClick={() => router.push('/expenses')}
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
                      <td className="pt-4 text-[14px] font-[800]" style={{ borderTop: '2px solid var(--border)', color: 'var(--text-primary)' }}>
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-[9px]"
                            style={{ background: isProfit ? 'rgba(139,92,246,0.12)' : 'rgba(245,158,11,0.12)' }}>
                            {isProfit ? <TrendingUp size={14} style={{ color: '#8B5CF6' }} /> : <AlertTriangle size={14} style={{ color: '#F59E0B' }} />}
                          </div>
                          {isProfit ? 'Profit Before Tax' : 'Net Loss'}
                        </div>
                      </td>
                      <td className="pt-4 text-[18px] font-[860] text-right tabular-nums"
                        style={{ borderTop: '2px solid var(--border)', color: isProfit ? '#8B5CF6' : '#F59E0B' }}>
                        {isProfit ? '' : '('}{fmt(Math.abs(totals.profit))}{isProfit ? '' : ')'}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </m.div>
        </div>
      </div>
    </AppShell>
  );
}
