'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';
import { ChevronLeft, ChevronRight, Download, PlusCircle, TrendingUp, Users } from 'lucide-react';

export default function ProfitAndLossPage() {
  return (
    <Guard>
      <Inner />
    </Guard>
  );
}

const fmt = (n: any) => '\u20b9' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

const FINANCE_TABS = [
  { label: 'Collection', href: '/finance/collection' },
  { label: 'Dues',       href: '/finance/dues' },
  { label: 'Invoices',   href: '/finance/invoices' },
  { label: 'P & L',      href: '/finance/pl' },
  { label: 'Forecast',   href: '/finance/forecast' },
  { label: 'Payroll',    href: '/finance/trainer-revenue' },
];

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

  return (
    <AppShell>
      <div className="page-main">

        {/* Finance tab bar */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 20 }}>
          {FINANCE_TABS.map(tab => (
            <button
              key={tab.href}
              onClick={() => router.push(tab.href)}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                border: tab.href === '/finance/pl' ? '1.5px solid var(--brand)' : '1.5px solid var(--border)',
                background: tab.href === '/finance/pl' ? 'var(--brand)' : 'transparent',
                color: tab.href === '/finance/pl' ? '#fff' : 'var(--muted)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Header row: year selector + action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
          {/* Year selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => setYear(y => y - 1)}
              style={{ padding: '6px 10px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text)', cursor: 'pointer' }}
              aria-label="Previous year"
            >
              <ChevronLeft size={15} />
            </button>
            <span style={{ fontSize: 16, fontWeight: 700, minWidth: 52, textAlign: 'center' }}>{year}</span>
            <button
              onClick={() => setYear(y => y + 1)}
              disabled={year >= new Date().getFullYear()}
              style={{ padding: '6px 10px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'transparent', color: year >= new Date().getFullYear() ? 'var(--muted)' : 'var(--text)', cursor: year >= new Date().getFullYear() ? 'not-allowed' : 'pointer' }}
              aria-label="Next year"
            >
              <ChevronRight size={15} />
            </button>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => router.push('/finance/record-payment')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              <PlusCircle size={14} /> Add Expense
            </button>
            <button
              onClick={() => router.push('/finance/trainer-revenue')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              <Users size={14} /> Payroll Detail
            </button>
            <button
              onClick={handleExport}
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'transparent', color: loading ? 'var(--muted)' : 'var(--text)', fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              <Download size={14} /> Export CSV
            </button>
          </div>
        </div>

        {/* KPI stat cards */}
        {!loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
            <Stat label="Total Revenue"   value={fmt(totals.revenue)}    color="var(--success)" />
            <Stat label="Total Cost"      value={fmt(totals.totalCost)}  color="var(--danger)" />
            <Stat label={totals.profit >= 0 ? 'Net Profit' : 'Net Loss'}
                  value={fmt(Math.abs(totals.profit))}
                  color={totals.profit >= 0 ? 'var(--success)' : 'var(--danger)'} />
            <Stat label="Profit Margin"   value={`${totals.margin}%`}    color={totals.margin >= 0 ? 'var(--brand)' : 'var(--danger)'} />
          </div>
        )}

        {error && (
          <div style={{ color: 'var(--danger)', padding: '1rem', marginBottom: 16, borderRadius: 8, background: 'var(--danger-light, #fee)' }}>
            {error}
          </div>
        )}

        {/* P&L table */}
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrap">
            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>Loading\u2026</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Line item</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Membership & training revenue</td>
                    <td style={{ textAlign: 'right', color: 'var(--success)', fontWeight: 700 }} className="tabular">
                      {fmt(totals.revenue)}
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <button
                        onClick={() => router.push('/finance/trainer-revenue')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, textDecoration: 'underline dotted', textUnderlineOffset: 3 }}
                      >
                        Less: Coach payroll (12 months)
                      </button>
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--danger)' }} className="tabular">
                      ({fmt(totals.annualSalary)})
                    </td>
                  </tr>
                  <tr>
                    <td style={{ verticalAlign: 'top' }}>
                      <button
                        onClick={() => router.push('/finance/collection')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, textDecoration: 'underline dotted', textUnderlineOffset: 3 }}
                      >
                        Less: Overheads
                      </button>
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--danger)', verticalAlign: 'top' }} className="tabular">
                      ({fmt(totals.overheads)})
                    </td>
                  </tr>
                  {byCategory.length > 0 && (
                    <tr>
                      <td style={{ paddingLeft: 32, fontSize: 13, color: 'var(--muted)' }}>
                        {byCategory.map(([cat, amt]) => (
                          <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                            <span>{cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
                            <span className="tabular">{fmt(amt)}</span>
                          </div>
                        ))}
                        <button
                          onClick={() => router.push('/finance/dues')}
                          style={{ marginTop: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brand)', fontSize: 12, fontWeight: 600, padding: 0 }}
                        >
                          View all expenses →
                        </button>
                      </td>
                      <td />
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <td style={{ fontWeight: 700 }}>{totals.profit >= 0 ? 'Profit Before Tax' : 'Net Loss'}</td>
                    <td
                      style={{ textAlign: 'right', color: totals.profit >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 700 }}
                      className="tabular"
                    >
                      {fmt(Math.abs(totals.profit))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>

      </div>
    </AppShell>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="kpi-card">
      <div style={{ fontSize: 24, fontWeight: 800, color, letterSpacing: '-0.03em' }} className="tabular">
        {value}
      </div>
      <div
        className="text-muted"
        style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '1.4px', textTransform: 'uppercase', marginTop: 4 }}
      >
        {label}
      </div>
    </div>
  );
}
