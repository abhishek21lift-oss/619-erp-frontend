'use client';
import { useEffect, useMemo, useState } from 'react';
import { m } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Guard from '@/components/Guard';
import { PageContainer, PageHero } from '@/components/ui';
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
  { label: 'Dues',        href: '/finance/dues' },
  { label: 'Invoices',    href: '/finance/invoices' },
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
    <PageContainer>

      {/* ── Hero ──
          maxWidth 1280 with its own 20px of side padding, applied INSIDE
          .shell-main's gutter, and a bottom rule instead of a header. */}
      <PageHero
        icon={<TrendingUp size={20} />}
        title="Projected Revenue"
        subtitle={`Projected vs actual revenue · ${year}`}
      >
        <span className="inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[12px] font-[700] text-white"
          style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.2)' }}>
          <BarChart3 size={14} /> {growthRate}% growth rate
        </span>
      </PageHero>

      {/* ── Finance Tabs ── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--bg-card)', padding: '6px', borderRadius: 14, border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)', overflowX: 'auto', flexWrap: 'nowrap' }}>
        {FINANCE_TABS.map((tab) => {
          const active = tab.href === '/finance/forecast';
          return (
            <button key={tab.href} onClick={() => router.push(tab.href)}
              style={{ padding: '8px 18px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: active ? 700 : 500, fontSize: 13, whiteSpace: 'nowrap', transition: 'all 180ms ease',
                background: active ? 'linear-gradient(135deg,#0067e0,#0059ce)' : 'transparent',
                color: active ? 'white' : 'var(--text-secondary)',
                boxShadow: active ? '0 2px 8px rgba(0,103,224,0.35)' : 'none',
              }}>
              {tab.label}
            </button>
          );
        })}
      </div>

      {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 14, padding: '12px 16px', fontSize: 14, color: '#dc2626', marginBottom: 16 }}>{error}</div>}

      {/* ── KPI Cards ──
          Small square colourful tiles rather than the wide gradient KpiCard
          "box" this page used before — same four accent colours, a fraction
          of the footprint. */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Realised YTD', value: fmtCompact(realisedTotal), icon: BarChart3, from: '#10b981', to: '#059669' },
          { label: 'Forecast Remaining', value: fmtCompact(forecastRest), icon: TrendingUp, from: '#0067e0', to: '#0059ce' },
          { label: 'Projected Full Year', value: fmtCompact(projectedYearTotal), icon: Target, from: '#0050AD', to: '#003F87' },
          { label: 'Months Remaining', value: String(11 - currentMonth), icon: CalendarRange, from: '#f59e0b', to: '#d97706' },
        ].map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label}
              className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-[20px] p-3 text-center text-white"
              style={{ background: `linear-gradient(135deg, ${k.from}, ${k.to})`, boxShadow: `0 8px 24px -8px ${k.from}66` }}>
              <span className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }}>
                <Icon size={16} />
              </span>
              <span className="text-[17px] font-[820] tracking-[-0.02em]">{k.value}</span>
              <span className="text-[9.5px] font-[700] uppercase leading-tight tracking-wide text-white/80">{k.label}</span>
            </div>
          );
        })}
      </div>

      {/* ── Forecast Table ── */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>Monthly Revenue — {year}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
            Growth rate: <strong style={{ color: '#0067e0' }}>{growthRate}%</strong>
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
                          <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 20, padding: '3px 10px', background: '#ecfdf5', color: '#10b981', border: '1px solid #6ee7b7' }}>Actual</span>
                        ) : (
                          <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 20, padding: '3px 10px', background: '#f8fafc', color: '#0067e0', border: '1px solid #b8d7ff' }}>Forecast</span>
                        )}
                      </td>
                      <td style={{ padding: '14px 20px', fontWeight: 800, fontSize: 15, color: m.actual ? '#10b981' : '#0067e0', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                        {fmt(amount)}
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        {diffPct && amount > 0 ? (
                          <span style={{ fontSize: 12, fontWeight: 600, color: diff >= 0 ? '#10b981' : '#ef4444' }}>
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
                  <td style={{ padding: '14px 20px', fontWeight: 900, fontSize: 16, color: '#0067e0', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{fmt(projectedYearTotal)}</td>
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
          <strong style={{ color: '#0067e0' }}>Note:</strong> Projection based on 3-month rolling average with a 5% uplift. Figures are estimates only and may not reflect seasonal variations or planned business changes.
        </p>
      </div>
    </PageContainer>
  );
}
