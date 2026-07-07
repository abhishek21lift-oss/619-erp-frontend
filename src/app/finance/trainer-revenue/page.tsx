'use client';
import { useEffect, useState, useMemo } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';
import { Award, Users, Dumbbell, TrendingUp, BadgePercent, X } from 'lucide-react';

export default function TrainerRevenuePage() {
  return (
    <Guard role="admin">
      <Inner />
    </Guard>
  );
}

const fmt = (n: number) =>
  '\u20B9' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

const PKG_MONTHS: Record<string, number> = {
  'Monthly': 1, 'Quarterly': 3, 'Half Yearly': 6, 'Yearly': 12,
  'PT': 3, '3 months': 3, '6 months': 6, '12 months': 12,
};

function getPkgMonths(pkg: string): number {
  return PKG_MONTHS[pkg] ?? PKG_MONTHS[pkg?.toLowerCase?.()] ?? 1;
}

function inMonth(dateStr: string | undefined, year: number, month: number): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return d.getFullYear() === year && d.getMonth() + 1 === month;
}

interface TrainerData {
  id: string;
  name: string;
  photo_url?: string;
  clients_count: number;
  monthly_pt_revenue: number;
  incentive_rate: number;
  incentive_amount: number;
  revenue_percentage: number;
}

function useBreakpoint(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== 'undefined') return window.matchMedia(query).matches;
    return false;
  });
  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);
  return matches;
}

function Inner() {
  const [trainers, setTrainers] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTrainer, setSelectedTrainer] = useState<any | null>(null);

  const isSm = useBreakpoint('(min-width: 640px)');

  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth() + 1;
  const prevMonth = curMonth === 1 ? 12 : curMonth - 1;
  const prevYear = curMonth === 1 ? curYear - 1 : curYear;

  const monthLabel = (y: number, m: number) =>
    new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([
      api.trainers.list().catch((err) => { console.error(err?.message || 'Failed to load trainers'); return []; }),
      api.clients.list({ limit: 2000 }).catch((err) => { console.error(err?.message || 'Failed to load clients'); return []; }),
    ])
      .then(([td, cd]) => {
        if (!alive) return;
        const trainerList = Array.isArray(td) ? td : [];
        const clientList = Array.isArray(cd) ? cd : (cd as any)?.clients ?? (cd as any)?.data ?? [];
        setTrainers(trainerList);
        setClients(clientList);
      })
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  const trainerRevenueData = useMemo((): TrainerData[] => {
    const ptClients = clients.filter((c: any) =>
      c.trainer_id && c.pt_end_date && c.status === 'active'
    );

    const byTrainer = new Map<string, any[]>();
    ptClients.forEach((c: any) => {
      const tid = c.trainer_id;
      if (!byTrainer.has(tid)) byTrainer.set(tid, []);
      byTrainer.get(tid)!.push(c);
    });

    const metrics: TrainerData[] = (trainers ?? []).map((t: any) => {
      const tc = byTrainer.get(t.id) || [];
      let monthlyRevenue = 0;
      tc.forEach((c: any) => {
        const months = getPkgMonths(c.package_type);
        monthlyRevenue += (Number(c.final_amount) || 0) / months;
      });
      return {
        id: t.id, name: t.name, photo_url: t.photo_url,
        clients_count: tc.length,
        monthly_pt_revenue: monthlyRevenue,
        incentive_rate: Number(t.incentive_rate) || 0,
        incentive_amount: monthlyRevenue * (Number(t.incentive_rate) || 0) / 100,
        revenue_percentage: 0,
      };
    });

    const total = metrics.reduce((s, t) => s + t.monthly_pt_revenue, 0);
    return metrics.map((t) => ({
      ...t,
      revenue_percentage: total > 0 ? (t.monthly_pt_revenue / total) * 100 : 0,
    }));
  }, [trainers, clients]);

  const summaryKpis = useMemo(() => ({
    totalTrainers: trainers.length,
    totalClients: trainerRevenueData.reduce((s, t) => s + t.clients_count, 0),
    totalMonthlyRevenue: trainerRevenueData.reduce((s, t) => s + t.monthly_pt_revenue, 0),
    totalIncentives: trainerRevenueData.reduce((s, t) => s + t.incentive_amount, 0),
  }), [trainerRevenueData, trainers]);

  const sortedTrainers = useMemo(
    () => [...trainerRevenueData].sort((a, b) => b.monthly_pt_revenue - a.monthly_pt_revenue),
    [trainerRevenueData]
  );

  const detailClients = useMemo(() => {
    if (!selectedTrainer) return { cur: [], prev: [] };
    const tc = clients.filter((c: any) => c.trainer_id === selectedTrainer.id);
    const cur = tc.filter((c: any) =>
      inMonth(c.pt_start_date, curYear, curMonth) ||
      inMonth(c.joining_date, curYear, curMonth) ||
      (c.pt_end_date && new Date(c.pt_end_date) >= new Date(curYear, curMonth - 1, 1))
    );
    const prev = tc.filter((c: any) =>
      inMonth(c.pt_start_date, prevYear, prevMonth) ||
      inMonth(c.joining_date, prevYear, prevMonth)
    );
    return { cur, prev };
  }, [selectedTrainer, clients, curYear, curMonth, prevYear, prevMonth]);

  const kpis = [
    { label: 'Total Trainers', value: summaryKpis.totalTrainers, accent: '#6366f1', icon: <Users size={18} /> },
    { label: 'Active PT Clients', value: summaryKpis.totalClients, accent: '#8b5cf6', icon: <Dumbbell size={18} /> },
    { label: 'Monthly PT Revenue', value: fmt(summaryKpis.totalMonthlyRevenue), accent: '#10b981', icon: <TrendingUp size={18} /> },
    { label: 'Total Incentives', value: fmt(summaryKpis.totalIncentives), accent: '#f59e0b', icon: <BadgePercent size={18} /> },
  ];

  return (
    <AppShell>
      <div style={{ minHeight: '100vh', background: 'linear-gradient(145deg,#f8fafc 0%,#f1f5f9 50%,#fafafe 100%)' }}>

        {/* ── Dark Gradient Hero ── */}
        <div style={{
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(135deg,#0f172a,#1e293b)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          {/* Orb 1 — Indigo */}
          <m.div
            animate={{ x: [0, 40, -20, 0], y: [0, -50, 30, 0] }}
            transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
            style={{
              position: 'absolute', width: 320, height: 320, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
              top: -120, right: '10%', pointerEvents: 'none',
            }}
          />
          {/* Orb 2 — Violet */}
          <m.div
            animate={{ x: [0, -50, 40, 0], y: [0, 60, -30, 0] }}
            transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
            style={{
              position: 'absolute', width: 260, height: 260, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)',
              top: -60, left: '15%', pointerEvents: 'none',
            }}
          />
          {/* Orb 3 — Purple */}
          <m.div
            animate={{ x: [0, 30, -50, 0], y: [0, -40, 50, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
            style={{
              position: 'absolute', width: 220, height: 220, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(168,85,247,0.1) 0%, transparent 70%)',
              bottom: -40, right: '25%', pointerEvents: 'none',
            }}
          />

          {/* Hero Content */}
          <div style={{
            position: 'relative', zIndex: 1,
            maxWidth: 1280, margin: '0 auto',
            padding: isSm ? '28px 32px' : '24px 20px',
          }}>
            <div style={{
              display: 'flex', flexWrap: 'wrap',
              alignItems: 'flex-start', justifyContent: 'space-between',
              gap: 16,
            }}>
              {/* Left: Icon + Title + Subtitle */}
              <div style={{ flex: 1, minWidth: isSm ? undefined : '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    display: 'flex', height: 44, width: 44,
                    alignItems: 'center', justifyContent: 'center',
                    borderRadius: 14,
                    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                    boxShadow: '0 8px 24px rgba(99,102,241,0.25)',
                  }}>
                    <Award size={20} color="white" />
                  </div>
                  <h1 style={{
                    fontSize: 26, fontWeight: 860,
                    letterSpacing: '-0.03em', margin: 0,
                    background: 'linear-gradient(135deg,#f8fafc,#94a3b8)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}>Trainer Payouts</h1>
                </div>
                <p style={{ marginTop: 6, fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                  PT revenue, incentives & payout summaries for all trainers.
                </p>
              </div>

              {/* Right: Date badge */}
              <div style={{
                padding: '8px 14px',
                borderRadius: 12,
                background: 'rgba(255,255,255,0.06)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span style={{
                  fontSize: 12, fontWeight: 700,
                  color: 'rgba(255,255,255,0.45)',
                  letterSpacing: '0.5px', textTransform: 'uppercase',
                }}>
                  {monthLabel(curYear, curMonth)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Main Content ── */}
        <div style={{
          maxWidth: 1280, margin: '0 auto',
          padding: isSm ? '24px 32px 112px' : '24px 16px 112px',
        }}>
          {/* Error banner */}
          <AnimatePresence>
            {error && (
              <m.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{
                  background: 'rgba(254,202,202,0.15)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  border: '1px solid rgba(239,68,68,0.25)',
                  borderRadius: 14, padding: '12px 16px',
                  fontSize: 14, color: '#f87171', marginBottom: 16,
                }}
              >
                {error}
              </m.div>
            )}
          </AnimatePresence>

          {/* ── KPI Cards ── */}
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
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
                onMouseEnter={(e) => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = '0 8px 28px rgba(0,0,0,0.1)'; el.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={(e) => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)'; el.style.transform = 'translateY(0)'; }}
                style={{
                  background: 'white',
                  borderRadius: 20, padding: '22px 24px',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                  border: '1px solid rgba(0,0,0,0.06)',
                  position: 'relative', overflow: 'hidden',
                  transition: 'all 200ms ease', cursor: 'default',
                }}
              >
                <div style={{
                  position: 'absolute', top: 0, left: 24, right: 24, height: 3,
                  background: `linear-gradient(90deg,${k.accent},${k.accent}88)`,
                  borderRadius: '0 0 3px 3px', opacity: 0.8,
                }} />
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: `${k.accent}18`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: k.accent,
                }}>
                  {k.icon}
                </div>
                <div style={{ marginTop: 12 }}>
                  <div style={{
                    fontSize: 26, fontWeight: 800,
                    color: '#0f172a',
                    letterSpacing: '-0.02em', lineHeight: 1,
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {k.value}
                  </div>
                  <div style={{
                    fontSize: 12, color: 'rgba(15,23,42,0.5)',
                    marginTop: 4, fontWeight: 500,
                  }}>
                    {k.label}
                  </div>
                </div>
              </m.div>
            ))}
          </div>

          {/* ── Table + Detail Panel ── */}
          <div style={{
            display: 'flex',
            gap: '1.25rem',
            alignItems: 'flex-start',
            flexDirection: isSm ? 'row' : 'column',
          }}>

            {/* Trainer table */}
            <div style={{
              background: 'white',
              borderRadius: 20,
              border: '1px solid #f1f5f9',
              overflow: 'hidden',
              boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
              flex: selectedTrainer ? '0 0 55%' : '1',
              minWidth: 0,
            }}>
              <div style={{
                padding: '16px 24px',
                borderBottom: '1px solid rgba(241,245,249,0.6)',
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'rgba(15,23,42,0.85)' }}>
                  Trainer PT Revenue Breakdown
                </div>
                <div style={{ fontSize: 12, color: 'rgba(15,23,42,0.4)' }}>
                  {monthLabel(curYear, curMonth)}
                </div>
              </div>

              {loading ? (
                <div style={{ padding: '48px 24px' }}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} style={{
                      display: 'flex', gap: 16, padding: '14px 0',
                      borderBottom: '1px solid #f1f5f9',
                    }}>
                      {[160, 80, 100, 60, 100, 120].map((w, j) => (
                        <div key={j} style={{
                          height: 14, width: w, borderRadius: 6,
                          background: '#f1f5f9', position: 'relative',
                          overflow: 'hidden',
                        }}>
                          <m.div
                            animate={{ x: ['-100%', '200%'] }}
                            transition={{ repeat: Infinity, duration: 1.5, ease: 'linear', delay: i * 0.04 }}
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
              ) : sortedTrainers.length === 0 ? (
                <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                  <div style={{
                    display: 'flex', height: 64, width: 64,
                    alignItems: 'center', justifyContent: 'center',
                    borderRadius: 16, background: 'rgba(99,102,241,0.08)',
                    margin: '0 auto 16px',
                  }}>
                    <Users size={28} style={{ color: '#6366f1' }} />
                  </div>
                  <p style={{
                    fontSize: 16, fontWeight: 700,
                    color: 'rgba(15,23,42,0.7)',
                  }}>No PT clients assigned yet.</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{
                        background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                      }}>
                        {['Trainer', 'PT Clients', 'Monthly Revenue', 'Incentive %', 'Incentive Amount', 'Revenue Share'].map((h) => (
                          <th key={h} style={{
                            padding: '14px 20px',
                            textAlign: h === 'Monthly Revenue' || h === 'Incentive Amount' || h === 'PT Clients' || h === 'Revenue Share' ? 'right' : 'left',
                            fontSize: 11, fontWeight: 700, color: 'white',
                            textTransform: 'uppercase', letterSpacing: '0.8px',
                            whiteSpace: 'nowrap',
                          }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedTrainers.map((trainer) => (
                        <m.tr
                          key={trainer.id}
                          onClick={() => setSelectedTrainer(selectedTrainer?.id === trainer.id ? null : trainer)}
                          whileHover={{ backgroundColor: 'rgba(99,102,241,0.04)' }}
                          style={{
                            cursor: 'pointer',
                            borderBottom: '1px solid #f1f5f9',
                            backgroundColor: selectedTrainer?.id === trainer.id ? 'rgba(99,102,241,0.06)' : 'white',
                            transition: 'background-color 0.15s',
                          }}
                        >
                          <td style={{ padding: '14px 20px', fontWeight: 600 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{
                                width: 32, height: 32, borderRadius: '50%',
                                background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                                display: 'flex', alignItems: 'center',
                                justifyContent: 'center', fontSize: 12,
                                fontWeight: 700, color: '#fff', flexShrink: 0,
                              }}>
                                {trainer.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                              </div>
                              <span style={{ color: '#6366f1', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>
                                {trainer.name}
                              </span>
                            </div>
                          </td>
                          <td style={{
                            padding: '14px 20px', textAlign: 'right',
                            color: 'rgba(15,23,42,0.55)',
                            fontVariantNumeric: 'tabular-nums',
                          }}>
                            {trainer.clients_count}
                          </td>
                          <td style={{
                            padding: '14px 20px', textAlign: 'right',
                            fontWeight: 800, fontSize: 15,
                            color: '#10b981',
                            fontVariantNumeric: 'tabular-nums',
                            letterSpacing: '-0.02em',
                          }}>
                            {fmt(trainer.monthly_pt_revenue)}
                          </td>
                          <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center',
                              padding: '2px 10px',
                              borderRadius: 9999,
                              fontSize: 11, fontWeight: 700,
                              background: trainer.incentive_rate >= 50
                                ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                              color: trainer.incentive_rate >= 50
                                ? '#059669' : '#d97706',
                            }}>
                              {trainer.incentive_rate}%
                            </span>
                          </td>
                          <td style={{
                            padding: '14px 20px', textAlign: 'right',
                            fontWeight: 800, fontSize: 14,
                            color: '#10b981',
                            fontVariantNumeric: 'tabular-nums',
                          }}>
                            {fmt(trainer.incentive_amount)}
                          </td>
                          <td style={{ padding: '14px 20px', minWidth: 160 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{
                                flex: 1, height: 8,
                                background: '#f1f5f9',
                                borderRadius: 4, overflow: 'hidden',
                              }}>
                                <m.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${Math.min(trainer.revenue_percentage, 100)}%` }}
                                  transition={{ duration: 0.8, ease: 'easeOut' }}
                                  style={{
                                    height: '100%',
                                    background: 'linear-gradient(90deg,#6366f1,#8b5cf6)',
                                    borderRadius: 4,
                                  }}
                                />
                              </div>
                              <span style={{
                                fontSize: 12, fontWeight: 600,
                                color: 'rgba(15,23,42,0.5)',
                                fontVariantNumeric: 'tabular-nums',
                                minWidth: 40, textAlign: 'right',
                              }}>
                                {trainer.revenue_percentage.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                        </m.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div style={{
                padding: '12px 24px',
                borderTop: '1px solid rgba(241,245,249,0.6)',
                fontSize: 12, color: 'rgba(15,23,42,0.4)',
              }}>
                Click any trainer row to see their monthly client breakdown.
              </div>
            </div>

            {/* ── Detail Panel ── */}
            <AnimatePresence>
              {selectedTrainer && (
                <m.div
                  key={selectedTrainer.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.25 }}
                  style={{
                    background: 'white',
                    borderRadius: 20,
                    border: '1px solid #f1f5f9',
                    overflow: 'hidden',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                    flex: '1', minWidth: 0,
                  }}
                >
                  {/* Panel header */}
                  <div style={{
                    padding: '14px 20px',
                    borderBottom: '1px solid rgba(241,245,249,0.6)',
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                      display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: 13,
                      fontWeight: 700, color: '#fff', flexShrink: 0,
                    }}>
                      {selectedTrainer.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'rgba(15,23,42,0.85)' }}>
                        {selectedTrainer.name}
                      </div>
                      <div style={{ fontSize: 12, color: 'rgba(15,23,42,0.4)' }}>
                        PT Client Breakdown
                      </div>
                    </div>
                    <m.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setSelectedTrainer(null)}
                      style={{
                        background: 'rgba(241,245,249,0.7)',
                        border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center',
                        justifyContent: 'center',
                        width: 28, height: 28, borderRadius: 8,
                        color: 'rgba(100,116,139,0.7)',
                      }}
                    >
                      <X size={15} />
                    </m.button>
                  </div>

                  {/* Current month */}
                  <ClientMonthSection
                    label={`${monthLabel(curYear, curMonth)} (Current)`}
                    clients={detailClients.cur}
                    accent="#10b981"
                  />

                  {/* Previous month */}
                  <ClientMonthSection
                    label={`${monthLabel(prevYear, prevMonth)} (Previous)`}
                    clients={detailClients.prev}
                    accent="#6366f1"
                  />
                </m.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function ClientMonthSection({ label, clients, accent }: { label: string; clients: any[]; accent: string }) {
  const fmtLocal = (n: number) =>
    '\u20B9' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  const total = clients.reduce((s, c) => s + (Number(c.final_amount) || 0), 0);

  return (
    <div style={{ borderBottom: '1px solid rgba(241,245,249,0.6)' }}>
      <div style={{
        padding: '12px 20px 10px',
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{
          fontWeight: 700, fontSize: 12,
          color: accent, letterSpacing: '0.3px',
        }}>
          {label}
        </div>
        <div style={{
          fontSize: 12, fontWeight: 700,
          color: accent, fontVariantNumeric: 'tabular-nums',
        }}>
          {clients.length} clients &middot; {fmtLocal(total)}
        </div>
      </div>
      {clients.length === 0 ? (
        <div style={{
          padding: '10px 20px 16px',
          fontSize: 12, color: 'rgba(15,23,42,0.4)',
        }}>
          No clients this month.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(241,245,249,0.5)' }}>
                {['Member', 'Package', 'Amount'].map((h) => (
                  <th key={h} style={{
                    padding: '8px 20px',
                    textAlign: h === 'Amount' ? 'right' : 'left',
                    fontWeight: 600,
                    color: 'rgba(15,23,42,0.4)',
                    fontSize: 10, letterSpacing: '0.6px',
                    textTransform: 'uppercase',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(clients ?? []).map((c: any, i: number) => (
                <m.tr
                  key={c.id}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  style={{
                    borderTop: '1px solid rgba(241,245,249,0.4)',
                    backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(248,250,252,0.5)',
                  }}
                >
                  <td style={{ padding: '8px 20px', fontWeight: 600, color: 'rgba(15,23,42,0.85)' }}>
                    {c.name || c.client_name || 'Unknown'}
                  </td>
                  <td style={{ padding: '8px 20px', color: 'rgba(15,23,42,0.5)' }}>
                    {c.package_type || '\u2014'}
                  </td>
                  <td style={{
                    padding: '8px 20px', textAlign: 'right',
                    fontWeight: 800, color: '#10b981',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {fmtLocal(Number(c.final_amount) || 0)}
                  </td>
                </m.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
