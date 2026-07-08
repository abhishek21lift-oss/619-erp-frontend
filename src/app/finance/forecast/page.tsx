'use client';
import { useEffect, useMemo, useState } from 'react';
import { m } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { KpiCard } from '@/components/ui';
import { api } from '@/lib/api';
import { TrendingUp, CalendarRange, BarChart3, Target } from 'lucide-react';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmt = (n: any) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
function fmtCompact(n: number) {
  if (n >= 10_00_000) return '₹' + (n / 10_00_000).toFixed(1) + 'L';
  if (n >= 1_000) return '₹' + (n / 1_000).toFixed(1) + 'K';
  return fmt(n);
}

const FINANCE_TABS = [
  { label: 'Collection',  href: '/finance/collection' },
  { label: 'Dues',        href: '/finance/dues' },
  { label: 'Invoices',    href: '/finance/invoices' },
  { label: 'P & L',       href: '/finance/pl' },
  { label: 'Forecast',    href: '/finance/forecast' },
  { label: 'Payroll',     href: '/finance/trainer-revenue' },
];

export default function RevenueForecastPage() {
  return <Guard role="admin"><Inner /></Guard>;
}

function Inner() {
  const router = useRouter();
  const year = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const [monthly, setMonthly] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    api.reports
      .monthly(year)
      .then((r) => alive && setMonthly(Array.isArray(r) ? r : []))
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [year]);

  const series = useMemo(() => {
    const arr = MONTHS.map((name, i) => {
      const found = monthly.find((m: any) => parseInt(m.month_num) === i + 1);
      return { month: name, revenue: found ? Number(found.revenue) : 0, actual: i <= currentMonth };
    });
    const realised = arr.filter((_, i) => i <= currentMonth);
    const rolling3 = realised.slice(-3);
    const avg = rolling3.reduce((s, m) => s + m.revenue, 0) / Math.max(rolling3.length, 1);
    return arr.map((m, i) => ({ ...m, forecast: i > currentMonth ? Math.round(avg * 1.05) : null }));
  }, [monthly, currentMonth]);

  const realisedTotal = series.reduce((s, m) => s + m.revenue, 0);
  const forecastRest  = series.reduce((s, m) => s + (m.forecast || 0), 0);
  const projectedYearTotal = realisedTotal + forecastRest;
  const growthRate = realisedTotal > 0 ? ((forecastRest / Math.max(realisedTotal, 1)) * 100).toFixed(1) : '—';

  return (
    <AppShell>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 20px 48px' }}>

        {/* ── Hero ── */}
        <div style={{ padding: '24px 0', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, borderBottom: '1px solid var(--border)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
              <div style={{ width: 42, height: 42, borderRadius: 14, background: 'linear-gradient(135deg, #a855f7, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(139,92,246,0.4)' }}>
                <TrendingUp size={20} color="white" />
              </div>
              <h1 style={{ fontSize: 'clamp(16px, 3.5vw, 26px)', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>Projected Revenue (estimate)</h1>
            </div>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>Projected vs actual revenue &middot; {year} full year view</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-subtle)', borderRadius: 20, padding: '6px 14px', border: '1px solid var(--border)' }}>
            <BarChart3 size={14} color="var(--text-muted)" />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{growthRate}% growth rate</span>
          </div>
        </div>

        {/* ── Finance Tabs ── */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--bg-card)', padding: '6px', borderRadius: 14, border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)', overflowX: 'auto', flexWrap: 'nowrap' }}>
          {FINANCE_TABS.map((tab) => {
            const active = tab.href === '/finance/forecast';
            return (
              <button key={tab.href} onClick={() => router.push(tab.href)}
                style={{ padding: '8px 18px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: active ? 700 : 500, fontSize: 13, whiteSpace: 'nowrap', transition: 'all 180ms ease',
                  background: active ? 'linear-gradient(135deg,#8b5cf6,#7c3aed)' : 'transparent',
                  color: active ? 'white' : 'var(--text-secondary)',
                  boxShadow: active ? '0 2px 8px rgba(139,92,246,0.35)' : 'none',
                }}>
                {tab.label}
              </button>
            );
          })}
        </div>

        {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 14, padding: '12px 16px', fontSize: 14, color: '#dc2626', marginBottom: 16 }}>{error}</div>}

        {/* ── KPI Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14, marginBottom: 24 }}>
          <KpiCard label="Realised YTD" value={fmtCompact(realisedTotal)} icon={<BarChart3 size={16} />} accent="emerald" />
          <KpiCard label="Forecast (Remaining)" value={fmtCompact(forecastRest)} icon={<TrendingUp size={16} />} accent="sky" />
          <KpiCard label="Projected Full Year" value={fmtCompact(projectedYearTotal)} icon={<Target size={16} />} accent="violet" />
          <KpiCard label="Months Remaining" value={String(11 - currentMonth)} icon={<CalendarRange size={16} />} accent="amber" />
        </div>

        {/* ── Forecast Table ── */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>Monthly Revenue — {year}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
              Growth rate: <strong style={{ color: '#8b5cf6' }}>{growthRate}%</strong>
            </div>
          </div>
          {loading ? (
            <div style={{ padding: '32px 24px' }}>
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} style={{ display: 'flex', gap: 16, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                  {[80, 100, 120].map((w, j) => (
                    <m.div key={j}
                      animate={{ backgroundPosition: ['-200% 0%', '200% 0%'] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                      style={{ height: 13, width: w, borderRadius: 6, background: 'linear-gradient(90deg,var(--bg-subtle) 25%,var(--bg-hover) 50%,var(--bg-subtle) 75%)', backgroundSize: '200% 100%' }}
                    />
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-subtle)' }}>
                    {['Month', 'Type', 'Amount', 'vs Avg'].map((h) => (
                      <th key={h} style={{ padding: '14px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {series.map((m, i) => {
                    const amount = m.actual ? m.revenue : (m.forecast ?? 0);
                    const avg = realisedTotal / Math.max(currentMonth + 1, 1);
                    const diff = amount - avg;
                    const diffPct = avg > 0 ? ((diff / avg) * 100).toFixed(1) : null;
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-card)', transition: 'background 150ms' }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ''; }}
                      >
                        <td style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text-primary)' }}>{m.month} {year}</td>
                        <td style={{ padding: '14px 20px' }}>
                          {m.actual ? (
                            <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 20, padding: '3px 10px', background: '#ecfdf5', color: '#16a34a', border: '1px solid #86efac' }}>Actual</span>
                          ) : (
                            <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 20, padding: '3px 10px', background: '#f0f0ff', color: '#8b5cf6', border: '1px solid #c4b5fd' }}>Forecast</span>
                          )}
                        </td>
                        <td style={{ padding: '14px 20px', fontWeight: 800, fontSize: 15, color: m.actual ? '#10b981' : '#8b5cf6', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                          {fmt(amount)}
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          {diffPct && amount > 0 ? (
                            <span style={{ fontSize: 12, fontWeight: 600, color: diff >= 0 ? '#16a34a' : '#ef4444' }}>
                              {diff >= 0 ? '▲' : '▼'} {Math.abs(Number(diffPct))}%
                            </span>
                          ) : <span style={{ color: 'var(--text-disabled)', fontSize: 12 }}>—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid var(--border)', background: 'var(--bg-subtle)' }}>
                    <td style={{ padding: '14px 20px', fontWeight: 800, color: 'var(--text-primary)' }} colSpan={2}>Projected Full Year</td>
                    <td style={{ padding: '14px 20px', fontWeight: 900, fontSize: 16, color: '#7c3aed', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{fmt(projectedYearTotal)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Disclaimer */}
        <div style={{ marginTop: 12, padding: '10px 16px', background: 'var(--bg-subtle)', borderRadius: 10, border: '1px solid var(--border)' }}>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            <strong style={{ color: '#8b5cf6' }}>Note:</strong> Projection based on 3-month rolling average with a 5% uplift. Figures are estimates only and may not reflect seasonal variations or planned business changes.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
