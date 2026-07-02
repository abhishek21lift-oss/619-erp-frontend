'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';
import { Banknote, TrendingUp, CalendarCheck, CreditCard, ChevronLeft, ChevronRight } from 'lucide-react';
import { PremiumButton } from '@/components/premium/PremiumButton';

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
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 20px 48px' }}
      >
        {/* ── Hero ── */}
        <div style={{ padding: '24px 0', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, borderBottom: '1px solid #f3f4f6' }}>
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
              <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, color: '#111827', letterSpacing: '-0.02em' }}>Collection</h1>
              <p style={{ fontSize: 13, color: '#6b7280', margin: '2px 0 0' }}>Monthly revenue collected — Payment volume</p>
            </div>
          </div>

          {/* Year Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => setYear(y => y - 1)}
              style={{
                width: 36, height: 36, borderRadius: 12,
                border: '1px solid #e5e7eb',
                background: '#fff',
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: '#374151',
                transition: 'all 0.2s',
              }}
            >
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: 16, fontWeight: 700, minWidth: 48, textAlign: 'center', color: '#111827' }}>{year}</span>
            <button
              onClick={() => setYear(y => y + 1)}
              disabled={year >= new Date().getFullYear()}
              style={{
                width: 36, height: 36, borderRadius: 12,
                border: '1px solid #e5e7eb',
                background: '#fff',
                cursor: year >= new Date().getFullYear() ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: year >= new Date().getFullYear() ? '#d1d5db' : '#374151',
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
          background: '#fff',
          padding: '6px', borderRadius: 14,
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
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
                  color: active ? 'white' : '#374151',
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
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: 14, padding: '12px 16px',
              fontSize: 14, color: '#dc2626', marginBottom: 16,
            }}
          >
            {error}
          </motion.div>
        )}

        {/* ── KPI Cards ── */}
        {!loading && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 14, marginBottom: 24,
          }}>
            {kpis.map((k, idx) => (
              <motion.div
                key={k.label}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08, duration: 0.4 }}
                tabIndex={0} role="button"
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; }}
                style={{
                  background: 'white',
                  borderRadius: 20, padding: '22px 24px',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                  border: '1px solid rgba(0,0,0,0.06)',
                  display: 'flex', flexDirection: 'column', gap: 12,
                  position: 'relative', overflow: 'hidden',
                  transition: 'all 200ms ease', cursor: 'default',
                }}
                onMouseEnter={(e) => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = '0 8px 28px rgba(0,0,0,0.1)'; el.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={(e) => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)'; el.style.transform = 'translateY(0)'; }}
              >
                {/* Gradient accent bar */}
                <div style={{
                  position: 'absolute', top: 0, left: 24, right: 24, height: 3,
                  background: `linear-gradient(90deg,${k.accent},${k.accent}88)`,
                  borderRadius: '0 0 3px 3px', opacity: 0.8,
                }} />
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: `${k.accent}1a`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: k.accent,
                }}>
                  {k.icon}
                </div>
                <div>
                  <div style={{
                    fontSize: 26, fontWeight: 800,
                    color: '#111827',
                    letterSpacing: '-0.02em', lineHeight: 1,
                  }}>
                    {k.value}
                  </div>
                  <div style={{
                    fontSize: 12, color: '#9ca3af',
                    marginTop: 4, fontWeight: 500,
                  }}>
                    {k.label}
                  </div>
                  {k.sub && (
                    <div style={{
                      fontSize: 11, color: '#6b7280',
                      marginTop: 2,
                    }}>
                      {k.sub}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* ── Monthly Breakdown Table ── */}
        <div style={{
          background: 'white',
          borderRadius: 20,
          border: '1px solid #f1f5f9',
          overflow: 'hidden',
          boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
        }}>
          <div style={{
            padding: '16px 24px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div style={{
              fontWeight: 700, fontSize: 15,
              color: '#111827',
            }}>
              Monthly Breakdown — {year}
            </div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>
              Avg: <strong style={{ color: '#10b981' }}>{fmtCompact(avg)}</strong> / month
            </div>
          </div>

          {/* ── Loading Skeleton ── */}
          {loading ? (
            <div style={{ padding: '32px 24px' }}>
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex', gap: 16, padding: '12px 0',
                    borderBottom: '1px solid #f8fafc',
                  }}
                >
                  {[80, 60, 120, 160].map((w, j) => (
                    <div
                      key={j}
                      style={{
                        height: 13, width: w, borderRadius: 6,
                        background: '#f1f5f9',
                        position: 'relative', overflow: 'hidden',
                      }}
                    >
                      <motion.div
                        animate={{ x: ['-100%', '200%'] }}
                        transition={{
                          repeat: Infinity, duration: 1.5, ease: 'linear',
                          delay: i * 0.04,
                        }}
                        style={{
                          position: 'absolute', inset: 0,
                          background: 'linear-gradient(90deg,transparent 30%,rgba(255,255,255,0.5) 50%,transparent 70%)',
                        }}
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
                  <tr style={{ background: '#F9FAFB' }}>
                    {['Month', 'Payments', 'Collected', 'Bar'].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: '14px 20px',
                          textAlign: h === 'Collected' ? 'right' : 'left',
                          fontSize: 11, fontWeight: 700, color: '#6b7280',
                          textTransform: 'uppercase', letterSpacing: '0.8px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fullYear.map((m, i) => (
                    <motion.tr
                      key={i}
                      whileHover={{ backgroundColor: '#f0fdf4' }}
                      transition={{ duration: 0.15 }}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: 'white',
                        opacity: m.revenue === 0 ? 0.45 : 1,
                      }}
                    >
                      <td style={{
                        padding: '14px 20px', fontWeight: 600,
                        color: '#111827',
                      }}>
                        {m.month} {year}
                      </td>
                      <td style={{
                        padding: '14px 20px',
                        color: '#9ca3af',
                        fontVariantNumeric: 'tabular-nums',
                      }}>
                        {m.count || '—'}
                      </td>
                      <td style={{
                        padding: '14px 20px', textAlign: 'right',
                        fontWeight: 800, fontSize: 15,
                        color: m.revenue > 0 ? '#10b981' : '#d1d5db',
                        fontVariantNumeric: 'tabular-nums',
                        letterSpacing: '-0.02em',
                      }}>
                        {m.revenue > 0 ? fmt(m.revenue) : '—'}
                      </td>
                      <td style={{ padding: '14px 20px', minWidth: 140 }}>
                        <div style={{
                          height: 8, background: '#f1f5f9',
                          borderRadius: 4, overflow: 'hidden',
                        }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(m.revenue / maxRevenue) * 100}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut', delay: i * 0.03 }}
                            style={{
                              height: '100%',
                              background: m.revenue === best?.revenue && m.revenue > 0
                                ? 'linear-gradient(90deg,#f59e0b,#fbbf24)'
                                : 'linear-gradient(90deg,#10b981,#34d399)',
                              borderRadius: 4,
                            }}
                          />
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{
                    borderTop: '2px solid #e2e8f0',
                    background: '#f8fafc',
                  }}>
                    <td style={{
                      padding: '14px 20px', fontWeight: 800,
                      color: '#111827',
                    }}>
                      Total
                    </td>
                    <td style={{
                      padding: '14px 20px', fontWeight: 700,
                      fontVariantNumeric: 'tabular-nums',
                      color: '#111827',
                    }}>
                      {totalCount}
                    </td>
                    <td style={{
                      padding: '14px 20px', textAlign: 'right',
                      fontWeight: 900, fontSize: 16, color: '#10b981',
                      fontVariantNumeric: 'tabular-nums',
                      letterSpacing: '-0.02em',
                    }}>
                      {fmt(total)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </motion.div>
    </AppShell>
  );
}
