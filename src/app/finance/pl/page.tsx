'use client';
import { useEffect, useMemo, useState } from 'react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';

export default function ProfitAndLossPage() {
  return (
    <Guard>
      <Inner />
    </Guard>
  );
}

const fmt = (n: any) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

function Inner() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [monthly, setMonthly] = useState<any[]>([]);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const from = `${year}-01-01`;
    const to = `${year}-12-31`;
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
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [year]);

  const totals = useMemo(() => {
    const revenue = monthly.reduce((s: number, m: any) => s + Number(m.revenue || 0), 0);
    const monthlySalary = trainers.reduce(
      (s: number, t: any) => s + Number(t.salary || 0),
      0,
    );
    const annualSalary = monthlySalary * 12;
    const overheads = expenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
    const totalCost = annualSalary + overheads;
    const profit = revenue - totalCost;
    const margin = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;
    return { revenue, annualSalary, overheads, totalCost, profit, margin };
  }, [monthly, trainers, expenses]);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    expenses.forEach((e: any) => {
      const cat = e.category || 'other';
      map.set(cat, (map.get(cat) || 0) + Number(e.amount || 0));
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [expenses]);

  return (
    <AppShell>
      <div className="page-main">

          <div className="card" style={{ padding: 0 }}>
            <div className="table-wrap">
              {loading ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>Loading…</div>
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
                      <td>Less: Coach payroll (12 months)</td>
                      <td style={{ textAlign: 'right', color: 'var(--danger)' }} className="tabular">
                        ({fmt(totals.annualSalary)})
                      </td>
                    </tr>
                    <tr>
                      <td style={{ verticalAlign: 'top' }}>Less: Overheads</td>
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
                        </td>
                        <td />
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td>{totals.profit >= 0 ? 'Profit Before Tax' : 'Net Loss'}</td>
                      <td
                        style={{
                          textAlign: 'right',
                          color: totals.profit >= 0 ? 'var(--success)' : 'var(--danger)',
                        }}
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
