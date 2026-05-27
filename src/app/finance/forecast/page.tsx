'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
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
  return <Guard><Inner /></Guard>;
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
    const avg = realised.reduce((s, m) => s + m.revenue, 0) / Math.max(realised.length, 1);
    return arr.map((m, i) => ({ ...m, forecast: i > currentMonth ? Math.round(avg * 1.05) : null }));
  }, [monthly, currentMonth]);

  const realisedTotal = series.reduce((s, m) => s + m.revenue, 0);
  const forecastRest  = series.reduce((s, m) => s + (m.forecast || 0), 0);
  const projectedYearTotal = realisedTotal + forecastRest;
  const growthRate = realisedTotal > 0 ? ((forecastRest / Math.max(realisedTotal, 1)) * 100).toFixed(1) : '—';

  const kpis = [
    { label: 'Realised YTD',       value: fmtCompact(realisedTotal),       icon: <BarChart3 size={18} />,    accent: '#10b981' },
    { label: 'Forecast (Remaining)', value: fmtCompact(forecastRest),       icon: <TrendingUp size={18} />,   accent: '#0ea5e9' },
    { label: 'Projected Full Year', value: fmtCompact(projectedYearTotal),  icon: <Target size={18} />,       accent: '#8b5cf6' },
    { label: 'Months Remaining',    value: String(11 - currentMonth),       icon: <CalendarRange size={18} />, accent: '#f59e0b' },
  ];

  return (
    <AppShell>
      <style>{`
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes fadeInUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .forecast-page { animation: fadeInUp 0.4s ease; }
        .forecast-table tr:hover td { background: #fafbff; }
      `}</style>
      <div className="forecast-page" style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 20px 48px' }}>

        {/* Page Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendingUp size={18} color="white" />
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>Revenue Forecast</h1>
            </div>
            <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>Projected vs actual revenue · {year} full year view</p>
          </div>
        </div>

        {/* Finance Tab Bar */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'white', padding: '6px', borderRadius: 14, border: '1px solid #f1f5f9', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflowX: 'auto', flexWrap: 'nowrap' }}>
          {FINANCE_TABS.map((tab) => {
            const active = tab.href === '/finance/forecast';
            return (
              <button key={tab.href} onClick={() => router.push(tab.href)}
                style={{ padding: '8px 18px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: active ? 700 : 500, fontSize: 13, whiteSpace: 'nowrap', transition: 'all 180ms ease',
                  background: active ? 'linear-gradient(135deg,#8b5cf6,#7c3aed)' : 'transparent',
                  color: active ? 'white' : '#64748b',
                  boxShadow: active ? '0 2px 8px rgba(139,92,246,0.35)' : 'none',
                }}>
                {tab.label}
              </button>
            );
          })}
        </div>

        {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 14, padding: '12px 16px', fontSize: 14, color: '#dc2626', marginBottom: 16 }}>{error}</div>}

        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14, marginBottom: 24 }}>
          {kpis.map((k) => (
            <div key={k.label} style={{ background: 'white', borderRadius: 20, padding: '22px 24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: 12, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 24, right: 24, height: 2, background: k.accent, borderRadius: '0 0 2px 2px', opacity: 0.7 }} />
              <div style={{ width: 40, height: 40, borderRadius: 12, background: `${k.accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: k.accent }}>{k.icon}</div>
              <div>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1 }}>{k.value}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, fontWeight: 500 }}>{k.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Forecast Table */}
        <div style={{ background: 'white', borderRadius: 20, border: '1px solid #f1f5f9', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>Monthly Revenue — {year}</div>
            <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>
              Forecast growth rate: <strong style={{ color: '#8b5cf6' }}>{growthRate}%</strong>
            </div>
          </div>
          {loading ? (
            <div style={{ padding: '32px 24px' }}>
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} style={{ display: 'flex', gap: 16, padding: '12px 0', borderBottom: '1px solid #f8fafc' }}>
                  {[80, 100, 120].map((w, j) => (
                    <div key={j} style={{ height: 13, width: w, borderRadius: 6, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s ease-in-out infinite' }} />
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="forecast-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    {['Month', 'Type', 'Amount', 'vs Avg'].map((h) => (
                      <th key={h} style={{ padding: '14px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', background: '#fafbff', whiteSpace: 'nowrap' }}>{h}</th>
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
                      <tr key={i} style={{ borderBottom: '1px solid #f8fafc', transition: 'background 150ms' }}>
                        <td style={{ padding: '14px 20px', fontWeight: 600, color: '#0f172a' }}>{m.month} {year}</td>
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
                          ) : <span style={{ color: '#cbd5e1', fontSize: 12 }}>—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid #f1f5f9', background: '#fafbff' }}>
                    <td style={{ padding: '14px 20px', fontWeight: 800, color: '#0f172a' }} colSpan={2}>Projected Full Year</td>
                    <td style={{ padding: '14px 20px', fontWeight: 900, fontSize: 16, color: '#8b5cf6', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{fmt(projectedYearTotal)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
