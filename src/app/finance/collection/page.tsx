'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { m } from 'framer-motion';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';
import { Banknote, TrendingUp, CalendarCheck, CreditCard, ChevronLeft, ChevronRight } from 'lucide-react';
import { PremiumButton } from '@/components/premium/PremiumButton';

export default function CollectionPage() {
  return <Guard role="admin"><Inner /></Guard>;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmt = (n: any) => '\u20B9' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
function fmtCompact(n: number) {
  if (n >= 10_00_000) return '\u20B9' + (n / 10_00_000).toFixed(1) + 'L';
  if (n >= 1_000) return '\u20B9' + (n / 1_000).toFixed(1) + 'K';
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
    { label: 'Best Month',       value: best?.month ?? '\u2014',        sub: fmtCompact(best?.revenue ?? 0), icon: <CalendarCheck size={18} />, accent: '#f59e0b' },
  ];

  return (
    <AppShell>
      <m.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 20px 48px' }}
      >
        {/* ── Dark Gradient Hero ── */}
        <div style={{
          background: 'linear-gradient(135deg,#0f172a,#1e293b)',
          borderRadius: 24,
          padding: '32px 36px',
          position: 'relative',
          overflow: 'hidden',
          marginBottom: 20,
        }}>
          {/* Animated Orbs */}
          <m.div
            animate={{ x: [0, 40, 0], y: [0, -30, 0], scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 8, ease: 'easeInOut' }}
            style={{
              position: 'absolute', top: '-80px', right: '10%',
              width: 350, height: 350, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(20,184,166,0.2) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />
          <m.div
            animate={{ x: [0, -30, 0], y: [0, 40, 0], scale: [1, 1.08, 1] }}
            transition={{ repeat: Infinity, duration: 10, ease: 'easeInOut' }}
            style={{
              position: 'absolute', bottom: '-60px', left: '15%',
              width: 280, height: 280, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />
          <m.div
            animate={{ x: [0, 25, 0], y: [0, -20, 0], scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
            style={{
              position: 'absolute', top: '35%', left: '50%',
              width: 200, height: 200, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          {/* Hero Content */}
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
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
                <h1 style={{
                  fontSize: 28, fontWeight: 800, margin: 0,
                  background: 'linear-gradient(135deg,#10b981,#14b8a6)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  letterSpacing: '-0.02em',
                }}>Collection</h1>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: '2px 0 0' }}>
                  Monthly revenue collected — Payment volume
                </p>
              </div>
            </div>

            {/* Year Selector — Glass Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={() => setYear(y => y - 1)}
                style={{
                  width: 36, height: 36, borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(8px)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', color: 'rgba(255,255,255,0.7)',
                  transition: 'all 0.2s',
                }}
              >
                <ChevronLeft size={16} />
              </button>
              <span style={{
                fontSize: 16, fontWeight: 700, minWidth: 48,
                textAlign: 'center', color: 'rgba(255,255,255,0.9)',
              }}>{year}</span>
              <button
                onClick={() => setYear(y => y + 1)}
                disabled={year >= new Date().getFullYear()}
                style={{
                  width: 36, height: 36, borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(8px)',
                  cursor: year >= new Date().getFullYear() ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: year >= new Date().getFullYear() ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.7)',
                  transition: 'all 0.2s',
                }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Finance Tabs — Glass-morphism ── */}
        <div style={{
          display: 'flex', gap: 4, marginBottom: 24,
          background: 'rgba(255,255,255,0.75)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          padding: '6px', borderRadius: 14,
          border: '1px solid rgba(255,255,255,0.3)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
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
                  color: active ? 'white' : 'rgba(15,23,42,0.6)',
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

        {/* ── KPI Cards (solid white) ── */}
        {!loading && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 14, marginBottom: 24,
          }}>
            {kpis.map((k, idx) => (
              <m.div
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
                    color: '#0f172a',
                    letterSpacing: '-0.02em', lineHeight: 1,
                  }}>
                    {k.value}
                  </div>
                  <div style={{
                    fontSize: 12, color: '#64748b',
                    marginTop: 4, fontWeight: 500,
                  }}>
                    {k.label}
                  </div>
                  {k.sub && (
                    <div style={{
                      fontSize: 11, color: '#94a3b8',
                      marginTop: 2,
                    }}>
                      {k.sub}
                    </div>
                  )}
                </div>
              </m.div>
            ))}
          </div>
        )}

        {/* ── Monthly Breakdown Table (solid white) ── */}
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
              color: '#0f172a',
            }}>
              Monthly Breakdown — {year}
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>
              Avg: <strong style={{ color: '#10b981' }}>{fmtCompact(avg)}</strong> / month
            </div>
          </div>

          {/* ── Loading Skeleton (framer-motion shimmer) ── */}
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
                      <m.div
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
                  <tr style={{
                    background: 'linear-gradient(135deg,#10b981,#14b8a6)',
                  }}>
                    {['Month', 'Payments', 'Collected', 'Bar'].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: '14px 20px',
                          textAlign: h === 'Collected' ? 'right' : 'left',
                          fontSize: 11, fontWeight: 700, color: 'white',
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
                  {fullYear.map((row, i) => (
                    <m.tr
                      key={i}
                      whileHover={{ backgroundColor: '#f0fdf4' }}
                      transition={{ duration: 0.15 }}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: 'white',
                        opacity: row.revenue === 0 ? 0.45 : 1,
                      }}
                    >
                      <td style={{
                        padding: '14px 20px', fontWeight: 600,
                        color: '#0f172a',
                      }}>
                        {row.month} {year}
                      </td>
                      <td style={{
                        padding: '14px 20px',
                        color: '#64748b',
                        fontVariantNumeric: 'tabular-nums',
                      }}>
                        {row.count || '\u2014'}
                      </td>
                      <td style={{
                        padding: '14px 20px', textAlign: 'right',
                        fontWeight: 800, fontSize: 15,
                        color: row.revenue > 0 ? '#10b981' : '#cbd5e1',
                        fontVariantNumeric: 'tabular-nums',
                        letterSpacing: '-0.02em',
                      }}>
                        {row.revenue > 0 ? fmt(row.revenue) : '\u2014'}
                      </td>
                      <td style={{ padding: '14px 20px', minWidth: 140 }}>
                        <div style={{
                          height: 8, background: '#f1f5f9',
                          borderRadius: 4, overflow: 'hidden',
                        }}>
                          <m.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(row.revenue / maxRevenue) * 100}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut', delay: i * 0.03 }}
                            style={{
                              height: '100%',
                              background: row.revenue === best?.revenue && row.revenue > 0
                                ? 'linear-gradient(90deg,#f59e0b,#fbbf24)'
                                : 'linear-gradient(90deg,#10b981,#34d399)',
                              borderRadius: 4,
                            }}
                          />
                        </div>
                      </td>
                    </m.tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{
                    borderTop: '2px solid #e2e8f0',
                    background: '#f8fafc',
                  }}>
                    <td style={{
                      padding: '14px 20px', fontWeight: 800,
                      color: '#0f172a',
                    }}>
                      Total
                    </td>
                    <td style={{
                      padding: '14px 20px', fontWeight: 700,
                      fontVariantNumeric: 'tabular-nums',
                      color: '#0f172a',
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
      </m.div>
    </AppShell>
  );
}
