'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { m } from 'framer-motion';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';
import { Banknote, TrendingUp, CalendarCheck, CreditCard, ChevronLeft, ChevronRight } from 'lucide-react';
import { KpiCard } from '@/components/ui';

export default function CollectionPage() {
  return <Guard role="admin"><Inner /></Guard>;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmt = (n: any) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
function fmtCompact(n: number) {
  if (n >= 10_00_000) return '₹' + (n / 10_00_000).toFixed(1) + 'L';
  if (n >= 1_000) return '₹' + (n / 1_000).toFixed(1) + 'K';
  return fmt(n);
}

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api.reports
      .monthly(year)
      .then((r) => alive && setMonthly(Array.isArray(r) ? r : []))
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [year]);

  const fullYear = useMemo(
    () =>
      MONTHS.map((name, i) => {
        const found = monthly.find((m: any) => parseInt(m.month_num) === i + 1);
        return {
          month: name,
          revenue: found ? Number(found.revenue) : 0,
          count: found ? Number(found.payment_count) : 0,
        };
      }),
    [monthly],
  );

  const total = fullYear.reduce((s, m) => s + m.revenue, 0);
  const totalCount = fullYear.reduce((s, m) => s + m.count, 0);
  const activeMonths = fullYear.filter((m) => m.revenue > 0).length;
  const avg = activeMonths > 0 ? Math.round(total / activeMonths) : 0;
  const best = fullYear.reduce((a, b) => (b.revenue > a.revenue ? b : a), fullYear[0]);
  const maxRevenue = Math.max(...fullYear.map((m) => m.revenue), 1);


  return (
    <AppShell>
      <m.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 20px 48px' }}
      >
        {/* ── Hero ── */}
        <div style={{ padding: '24px 0', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 16,
              background: 'linear-gradient(135deg,#10b981,#14b8a6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(16,185,129,0.3)',
            }}>
              <Banknote size={24} color="white" />
            </div>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Collection</h1>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '2px 0 0' }}>Monthly revenue collected — Payment volume</p>
            </div>
          </div>

          {/* Year Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => setYear(y => y - 1)}
              style={{
                width: 36, height: 36, borderRadius: 12,
                border: '1px solid var(--border)',
                background: 'var(--bg-card)',
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: 'var(--text-secondary)',
                transition: 'all 0.2s',
              }}
            >
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: 16, fontWeight: 700, minWidth: 48, textAlign: 'center', color: 'var(--text-primary)' }}>{year}</span>
            <button
              onClick={() => setYear(y => y + 1)}
              disabled={year >= new Date().getFullYear()}
              style={{
                width: 36, height: 36, borderRadius: 12,
                border: '1px solid var(--border)',
                background: 'var(--bg-card)',
                cursor: year >= new Date().getFullYear() ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: year >= new Date().getFullYear() ? 'var(--text-disabled)' : 'var(--text-secondary)',
                transition: 'all 0.2s',
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* ── Finance Tabs ── */}
        <div style={{
          display: 'flex', gap: 4, marginBottom: 24,
          background: 'var(--bg-card)',
          padding: '6px', borderRadius: 14,
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-xs)',
          overflowX: 'auto', flexWrap: 'nowrap',
        }}>
          {FINANCE_TABS.map((tab) => {
            const active = tab.href === '/finance/collection';
            return (
              <button
                key={tab.href}
                onClick={() => router.push(tab.href)}
                style={{
                  padding: '8px 18px', borderRadius: 10, border: 'none',
                  cursor: 'pointer', fontWeight: active ? 700 : 500,
                  fontSize: 13, whiteSpace: 'nowrap', transition: 'all 180ms ease',
                  background: active
                    ? 'linear-gradient(135deg,#10b981,#059669)'
                    : 'transparent',
                  color: active ? 'white' : 'var(--text-secondary)',
                  boxShadow: active ? '0 2px 8px rgba(16,185,129,0.35)' : 'none',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── Error Banner ── */}
        {error && (
          <m.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: 14, padding: '12px 16px',
              fontSize: 14, color: '#dc2626', marginBottom: 16,
            }}
          >
            {error}
          </m.div>
        )}

        {/* ── KPI Cards ── */}
        {!loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14, marginBottom: 24 }}>
            <KpiCard label="Total Collected" value={fmtCompact(total)} hint={fmt(total)} icon={<Banknote size={16} />} accent="emerald" />
            <KpiCard label="Monthly Average" value={fmtCompact(avg)} hint={`${activeMonths} active months`} icon={<TrendingUp size={16} />} accent="sky" />
            <KpiCard label="Total Payments" value={String(totalCount)} hint="transactions" icon={<CreditCard size={16} />} accent="violet" />
            <KpiCard label="Best Month" value={best?.month ?? '—'} hint={fmtCompact(best?.revenue ?? 0)} icon={<CalendarCheck size={16} />} accent="amber" />
          </div>
        )}

        {/* ── Monthly Breakdown Table ── */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
              Monthly Breakdown — {year}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Avg: <strong style={{ color: '#10b981' }}>{fmtCompact(avg)}</strong> / month
            </div>
          </div>

          {/* ── Loading Skeleton ── */}
          {loading ? (
            <div style={{ padding: '32px 24px' }}>
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} style={{ display: 'flex', gap: 16, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                  {[80, 60, 120, 160].map((w, j) => (
                    <div key={j} style={{ height: 13, width: w, borderRadius: 6, background: 'var(--bg-subtle)', position: 'relative', overflow: 'hidden' }}>
                      <m.div
                        animate={{ x: ['-100%', '200%'] }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: 'linear', delay: i * 0.04 }}
                        style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,transparent 30%,var(--bg-hover) 50%,transparent 70%)' }}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-subtle)' }}>
                    {['Month', 'Payments', 'Collected', 'Bar'].map((h) => (
                      <th key={h} style={{ padding: '14px 20px', textAlign: h === 'Collected' ? 'right' : 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fullYear.map((row, i) => (
                    <m.tr
                      key={i}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-hover)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = ''; }}
                      style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', opacity: row.revenue === 0 ? 0.45 : 1, transition: 'background-color 0.15s' }}
                    >
                      <td style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text-primary)' }}>{row.month} {year}</td>
                      <td style={{ padding: '14px 20px', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{row.count || '—'}</td>
                      <td style={{ padding: '14px 20px', textAlign: 'right', fontWeight: 800, fontSize: 15, color: row.revenue > 0 ? '#10b981' : 'var(--text-disabled)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
                        {row.revenue > 0 ? fmt(row.revenue) : '—'}
                      </td>
                      <td style={{ padding: '14px 20px', minWidth: 140 }}>
                        <div style={{ height: 8, background: 'var(--bg-subtle)', borderRadius: 4, overflow: 'hidden' }}>
                          <m.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(row.revenue / maxRevenue) * 100}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut', delay: i * 0.03 }}
                            style={{ height: '100%', background: row.revenue === best?.revenue && row.revenue > 0 ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' : 'linear-gradient(90deg,#10b981,#34d399)', borderRadius: 4 }}
                          />
                        </div>
                      </td>
                    </m.tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid var(--border)', background: 'var(--bg-subtle)' }}>
                    <td style={{ padding: '14px 20px', fontWeight: 800, color: 'var(--text-primary)' }}>Total</td>
                    <td style={{ padding: '14px 20px', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--text-primary)' }}>{totalCount}</td>
                    <td style={{ padding: '14px 20px', textAlign: 'right', fontWeight: 900, fontSize: 16, color: '#10b981', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>{fmt(total)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </m.div>
    </AppShell>
  );
}
