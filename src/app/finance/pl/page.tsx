'use client';
import { useEffect, useMemo, useState } from 'react';
import Guard from '@/components/Guard';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [overheads, setOverheads] = useState<number>(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([api.reports.monthly(year), api.trainers.list()])
      .then(([m, t]: any) => {
        if (!alive) return;
        setMonthly(Array.isArray(m) ? m : []);
        setTrainers(t || []);
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
    const totalCost = annualSalary + Number(overheads || 0);
    const profit = revenue - totalCost;
    const margin = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;
    return { revenue, annualSalary, totalCost, profit, margin };
  }, [monthly, trainers, overheads]);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="page-main">
        <TopBar
          title="Profit & Loss"
          subtitle="A simple P&L view — revenue minus payroll & overheads"
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

          <div className="kpi-grid mb-3" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
            <Stat label="Revenue" value={fmt(totals.revenue)} color="var(--success)" />
            <Stat label="Payroll (12m est)" value={fmt(totals.annualSalary)} color="var(--warning)" />
            <Stat label="Other Overheads" value={fmt(overheads)} color="var(--info)" />
            <Stat
              label={totals.profit >= 0 ? `Profit (${totals.margin}%)` : 'Loss'}
              value={fmt(Math.abs(totals.profit))}
              color={totals.profit >= 0 ? 'var(--success)' : 'var(--danger)'}
            />
          </div>

          <div className="card mb-3">
            <div className="card-title">Adjust Overheads</div>
            <p className="text-muted" style={{ fontSize: 13, marginBottom: 12 }}>
              Add rent, utilities, marketing & other annual fixed costs. The
              P&L below recalculates automatically.
            </p>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={{ marginBottom: 0 }}>Annual Overheads</label>
              <input
                className="input"
                type="number"
                value={overheads}
                onChange={(e) => setOverheads(Number(e.target.value || 0))}
                style={{ maxWidth: 220 }}
                placeholder="e.g. 600000"
              />
            </div>
          </div>

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
                      <td>Less: Overheads (rent, utilities, marketing…)</td>
                      <td style={{ textAlign: 'right', color: 'var(--danger)' }} className="tabular">
                        ({fmt(overheads)})
                      </td>
                    </tr>
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
      </div>
    </div>
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
