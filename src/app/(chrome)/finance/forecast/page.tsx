'use client';

// Projected revenue for the year.
//
// ── What is actual and what is not ──────────────────────────────────────────
//
// The monthly series counts completed payments only (backend
// `getMonthlyRevenue`). Past months are actual. The CURRENT month is actual
// revenue so far — the month is not over — so it is labelled month to date
// rather than "Actual". Months after it are the forecast.
//
// ── The forecast, unchanged ─────────────────────────────────────────────────
//
// Every remaining month is the average of the last three actual months with a
// 5% uplift. The page states that basis instead of calling the ratio of
// remaining forecast to realised YTD a "growth rate", which it is not: with
// six months either side it reads near 105% while the model's only growth
// assumption is 5%.
//
// The `vs YTD avg` column is unchanged; it compares each row with realised
// YTD divided by the months elapsed.

import { useEffect, useMemo, useState } from 'react';
import { m } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Guard from '@/components/Guard';
import { PageContainer, PageHero, KpiCard } from '@/components/ui';
import { api } from '@/lib/api';
import { TrendingUp, CalendarRange, BarChart3, Target, RefreshCw } from 'lucide-react';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmt = (n: number | string | null | undefined) =>
  '₹' + Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

type MonthlyRow = {
  month_num?: number | string;
  revenue?: number | string;
};

const FINANCE_TABS = [
  { label: 'Dues',        href: '/finance/dues' },
  { label: 'Invoices',    href: '/finance/invoices' },
  { label: 'Forecast',    href: '/finance/forecast' },
];

export default function RevenueForecastPage() {
  return <Guard role="trainer"><Inner /></Guard>;
}

function Inner() {
  const router = useRouter();
  const year = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const [monthly, setMonthly] = useState<MonthlyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    api.insights
      .monthly(year)
      .then((r) => alive && setMonthly(Array.isArray(r) ? r as MonthlyRow[] : []))
      .catch((e) => alive && setError(e instanceof Error ? e.message : 'Failed to load revenue'))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [year, retryKey]);

  const series = useMemo(() => {
    const arr = MONTHS.map((name, i) => {
      const found = monthly.find((m) => parseInt(String(m.month_num)) === i + 1);
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
  const forecastMonths = 11 - currentMonth;
  const ytdLabel = currentMonth === 0 ? MONTHS[0] : `${MONTHS[0]}–${MONTHS[currentMonth]}`;
  const remainingLabel = forecastMonths > 0
    ? `${MONTHS[currentMonth + 1]}–${MONTHS[11]}`
    : 'Year complete';

  const ytdAvg = realisedTotal / Math.max(currentMonth + 1, 1);
  // A failed first load must not render ₹0 as if it were a real forecast.
  const unavailable = !!error && monthly.length === 0;

  return (
    <PageContainer>

      {/* ── Hero ──
          maxWidth 1280 with its own 20px of side padding, applied INSIDE
          .shell-main's gutter, and a bottom rule instead of a header.

          The hero used to carry a "N% growth rate" pill; the forecast table's
          own header states the same growth rate against the months it is
          computed from, which is where a reader looks for it. */}
      <PageHero
        icon={<TrendingUp size={20} />}
        title="Projected Revenue"

      />

      {/* ── Finance Tabs ── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--bg-card)', padding: '6px', borderRadius: 14, border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)', overflowX: 'auto', flexWrap: 'nowrap' }}>
        {FINANCE_TABS.map((tab) => {
          const active = tab.href === '/finance/forecast';
          return (
            <button key={tab.href} onClick={() => router.push(tab.href)}
              aria-current={active ? 'page' : undefined}
              style={{ minHeight: 44, padding: '8px 18px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: active ? 700 : 500, fontSize: 13, whiteSpace: 'nowrap', transition: 'all 180ms ease',
                background: active ? 'linear-gradient(135deg,var(--indigo-500),var(--indigo-600))' : 'transparent',
                color: active ? 'white' : 'var(--text-secondary)',
                boxShadow: active ? '0 2px 8px rgba(163,55,87,0.35)' : 'none',
              }}>
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Load failure ──
          Previously a red line above twelve zero rows and a ₹0 total, which
          looked like a real forecast of nothing. */}
      {error && (
        <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[14px] px-4 py-3"
          style={{ background: 'var(--red-50)', border: '1px solid var(--red-200)' }}>
          <span style={{ fontSize: 13, color: 'var(--red-700)' }}>{error}</span>
          <button type="button" onClick={() => setRetryKey((k) => k + 1)}
            className="inline-flex h-11 items-center gap-1.5 rounded-[10px] px-4 text-[12px] font-[700]"
            style={{ border: '1px solid var(--red-200)', background: '#fff', color: 'var(--red-700)', cursor: 'pointer' }}>
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Realised YTD"
          value={unavailable ? '—' : fmt(realisedTotal)}
          hint={`${ytdLabel} actual`}
          icon={<BarChart3 size={18} />}
          accent="emerald"
          loading={loading && monthly.length === 0}
        />
        <KpiCard
          label="Forecast remaining"
          value={unavailable ? '—' : fmt(forecastRest)}
          hint={forecastMonths > 0 ? `${remainingLabel} · 3-mo avg +5%` : 'No months left this year'}
          icon={<TrendingUp size={18} />}
          accent="blue"
          loading={loading && monthly.length === 0}
        />
        <KpiCard
          label="Projected full year"
          value={unavailable ? '—' : fmt(projectedYearTotal)}
          hint="Actual + forecast"
          icon={<Target size={18} />}
          accent="violet"
          loading={loading && monthly.length === 0}
        />
        <KpiCard
          label="Forecast months"
          value={unavailable ? '—' : String(forecastMonths)}
          hint={forecastMonths > 0 ? `${remainingLabel} ${year}` : 'December — year complete'}
          icon={<CalendarRange size={18} />}
          accent="amber"
          loading={loading && monthly.length === 0}
        />
      </div>

      {/* ── Forecast Table ── */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>Monthly Revenue — {year}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
            Basis: 3-month average +5%
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '32px 20px' }}>
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
        ) : error && monthly.length === 0 ? null : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-subtle)' }}>
                    {['Month', 'Type', 'Amount', 'vs YTD avg'].map((h) => (
                      <th key={h} style={{ padding: '14px 20px', textAlign: h === 'Amount' ? 'right' : 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {series.map((m, i) => {
                    const amount = m.actual ? m.revenue : (m.forecast ?? 0);
                    const diff = amount - ytdAvg;
                    const diffPct = ytdAvg > 0 ? ((diff / ytdAvg) * 100).toFixed(1) : null;
                    const isMtd = i === currentMonth;
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-card)', transition: 'background 150ms' }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ''; }}
                      >
                        <td style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text-primary)' }}>{m.month} {year}</td>
                        <td style={{ padding: '14px 20px' }}>
                          {isMtd ? (
                            <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 20, padding: '3px 10px', background: 'var(--amber-50)', color: 'var(--amber-700)', border: '1px solid var(--amber-200)', whiteSpace: 'nowrap' }}>Month to date</span>
                          ) : m.actual ? (
                            <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 20, padding: '3px 10px', background: 'var(--emerald-50)', color: 'var(--emerald-500)', border: '1px solid var(--emerald-300)' }}>Actual</span>
                          ) : (
                            <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 20, padding: '3px 10px', background: 'var(--bg-canvas)', color: 'var(--indigo-500)', border: '1px solid var(--indigo-200)' }}>Forecast</span>
                          )}
                        </td>
                        <td style={{ padding: '14px 20px', textAlign: 'right', fontWeight: 800, fontSize: 15, color: m.actual ? 'var(--emerald-500)' : 'var(--indigo-500)', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                          {fmt(amount)}
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          {diffPct && amount > 0 ? (
                            <span style={{ fontSize: 12, fontWeight: 600, color: diff >= 0 ? 'var(--emerald-500)' : 'var(--red-500)' }}>
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
                    <td style={{ padding: '14px 20px', textAlign: 'right', fontWeight: 900, fontSize: 16, color: 'var(--indigo-500)', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{fmt(projectedYearTotal)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Mobile cards: four columns do not fit at 390px without sideways
                scrolling, and the amount is the one thing that must not clip. */}
            <div className="sm:hidden">
              {series.map((m, i) => {
                const amount = m.actual ? m.revenue : (m.forecast ?? 0);
                const diff = amount - ytdAvg;
                const diffPct = ytdAvg > 0 ? ((diff / ytdAvg) * 100).toFixed(1) : null;
                const isMtd = i === currentMonth;
                return (
                  <div key={i} className="border-b px-4 py-3 last:border-b-0" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[13px] font-[700]" style={{ color: 'var(--text-primary)' }}>{m.month} {year}</span>
                      <span className="text-[15px] font-[800] tabular-nums" style={{ color: m.actual ? 'var(--emerald-500)' : 'var(--indigo-500)' }}>{fmt(amount)}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                      {isMtd ? (
                        <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 20, padding: '2px 8px', background: 'var(--amber-50)', color: 'var(--amber-700)', border: '1px solid var(--amber-200)' }}>Month to date</span>
                      ) : m.actual ? (
                        <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 20, padding: '2px 8px', background: 'var(--emerald-50)', color: 'var(--emerald-500)', border: '1px solid var(--emerald-300)' }}>Actual</span>
                      ) : (
                        <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 20, padding: '2px 8px', background: 'var(--bg-canvas)', color: 'var(--indigo-500)', border: '1px solid var(--indigo-200)' }}>Forecast</span>
                      )}
                      {diffPct && amount > 0 && (
                        <span style={{ fontSize: 11, fontWeight: 600, color: diff >= 0 ? 'var(--emerald-500)' : 'var(--red-500)' }}>
                          {diff >= 0 ? '▲' : '▼'} {Math.abs(Number(diffPct))}% vs YTD avg
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              <div className="flex items-baseline justify-between gap-3 px-4 py-3" style={{ background: 'var(--bg-subtle)', borderTop: '2px solid var(--border)' }}>
                <span className="text-[12px] font-[800] uppercase tracking-wide" style={{ color: 'var(--text-primary)' }}>Projected full year</span>
                <span className="text-[15px] font-[900] tabular-nums" style={{ color: 'var(--indigo-500)' }}>{fmt(projectedYearTotal)}</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Disclaimer */}
      <div style={{ marginTop: 12, padding: '10px 16px', background: 'var(--bg-subtle)', borderRadius: 10, border: '1px solid var(--border)' }}>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--indigo-500)' }}>Note:</strong> Only completed payments are counted.
          Past months are actual; the current month is month to date and still
          incomplete. Remaining months use the average of the last three actual
          months plus 5%. Figures are estimates only and do not model seasonal
          variation or planned business changes.
        </p>
      </div>
    </PageContainer>
  );
}
