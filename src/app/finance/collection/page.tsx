'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';
import { Banknote, TrendingUp, CalendarCheck, CreditCard } from 'lucide-react';

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

  const kpis = [
    { label: 'Total Collected',  value: fmtCompact(total),         sub: fmt(total),           icon: <Banknote size={18} />,     accent: '#10b981' },
    { label: 'Monthly Average',  value: fmtCompact(avg),           sub: `${activeMonths} active months`, icon: <TrendingUp size={18} />, accent: '#0ea5e9' },
    { label: 'Total Payments',   value: String(totalCount),        sub: 'transactions',       icon: <CreditCard size={18} />,   accent: '#8b5cf6' },
    { label: 'Best Month',       value: best?.month ?? '—',        sub: fmtCompact(best?.revenue ?? 0), icon: <CalendarCheck size={18} />, accent: '#f59e0b' },
  ];

  return (
    <AppShell>
      <style>{`
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes fadeInUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .collection-page { animation: fadeInUp 0.4s ease; }
        .collection-table tr:hover td { background: #fafbff; }
      `}</style>
      <div className="collection-page" style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 20px 48px' }}>

        {/* Page Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#10b981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Banknote size={18} color="white" />
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>Collection</h1>
            </div>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>Monthly revenue collected · Payment volume · {year} view</p>
          </div>
          {/* Year selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => setYear(y => y - 1)}
              style={{ width: 34, height: 34, borderRadius: 10, border: '1.5px solid #e2e8f0', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              ‹
            </button>
            <span style={{ fontSize: 15, fontWeight: 700, minWidth: 48, textAlign: 'center', color: 'var(--text-primary)' }}>{year}</span>
            <button onClick={() => setYear(y => y + 1)}
              disabled={year >= new Date().getFullYear()}
              style={{ width: 34, height: 34, borderRadius: 10, border: '1.5px solid #e2e8f0', background: 'white', cursor: year >= new Date().getFullYear() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: year >= new Date().getFullYear() ? '#cbd5e1' : 'var(--text-muted)' }}>
              ›
            </button>
          </div>
        </div>

        {/* Finance Tab Bar */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'white', padding: '6px', borderRadius: 14, border: '1px solid #f1f5f9', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflowX: 'auto', flexWrap: 'nowrap' }}>
          {FINANCE_TABS.map((tab) => {
            const active = tab.href === '/finance/collection';
            return (
              <button key={tab.href} onClick={() => router.push(tab.href)}
                style={{ padding: '8px 18px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: active ? 700 : 500, fontSize: 13, whiteSpace: 'nowrap', transition: 'all 180ms ease',
                  background: active ? 'linear-gradient(135deg,#10b981,#059669)' : 'transparent',
                  color: active ? 'white' : 'var(--text-muted)',
                  boxShadow: active ? '0 2px 8px rgba(16,185,129,0.35)' : 'none',
                }}>
                {tab.label}
              </button>
            );
          })}
        </div>

        {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 14, padding: '12px 16px', fontSize: 14, color: '#dc2626', marginBottom: 16 }}>{error}</div>}

        {/* KPI Cards */}
        {!loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14, marginBottom: 24 }}>
            {kpis.map((k) => (
              <div key={k.label} style={{ background: 'white', borderRadius: 20, padding: '22px 24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: 12, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 24, right: 24, height: 2, background: k.accent, borderRadius: '0 0 2px 2px', opacity: 0.7 }} />
                <div style={{ width: 40, height: 40, borderRadius: 12, background: `${k.accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: k.accent }}>{k.icon}</div>
                <div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1 }}>{k.value}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, fontWeight: 500 }}>{k.label}</div>
                  {k.sub && <div style={{ fontSize: 11, color: 'var(--text-disabled)', marginTop: 2 }}>{k.sub}</div>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Table */}
        <div style={{ background: 'white', borderRadius: 20, border: '1px solid #f1f5f9', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>Monthly Breakdown — {year}</div>
            <div style={{ fontSize: 12, color: 'var(--text-disabled)' }}>Avg: <strong style={{ color: '#10b981' }}>{fmtCompact(avg)}</strong> / month</div>
          </div>
          {loading ? (
            <div style={{ padding: '32px 24px' }}>
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} style={{ display: 'flex', gap: 16, padding: '12px 0', borderBottom: '1px solid #f8fafc' }}>
                  {[80, 60, 120, 160].map((w, j) => (
                    <div key={j} style={{ height: 13, width: w, borderRadius: 6, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s ease-in-out infinite' }} />
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="collection-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    {['Month', 'Payments', 'Collected', 'Bar'].map((h) => (
                      <th key={h} style={{ padding: '14px 20px', textAlign: h === 'Collected' ? 'right' : 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.8px', background: '#fafbff', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fullYear.map((m, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f8fafc', transition: 'background 150ms', opacity: m.revenue === 0 ? 0.45 : 1 }}>
                      <td style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text-primary)' }}>{m.month} {year}</td>
                      <td style={{ padding: '14px 20px', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{m.count || '—'}</td>
                      <td style={{ padding: '14px 20px', textAlign: 'right', fontWeight: 800, fontSize: 15, color: m.revenue > 0 ? '#10b981' : '#cbd5e1', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
                        {m.revenue > 0 ? fmt(m.revenue) : '—'}
                      </td>
                      <td style={{ padding: '14px 20px', minWidth: 140 }}>
                        <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ width: `${(m.revenue / maxRevenue) * 100}%`, height: '100%', background: m.revenue === best?.revenue && m.revenue > 0 ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' : 'linear-gradient(90deg,#10b981,#34d399)', borderRadius: 4, transition: 'width 0.6s ease' }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid #f1f5f9', background: '#fafbff' }}>
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
      </div>
    </AppShell>
  );
}
