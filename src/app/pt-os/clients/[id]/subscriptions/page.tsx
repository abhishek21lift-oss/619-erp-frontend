'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { m } from 'framer-motion';
import {
  ArrowLeft, Repeat, Layers, PiggyBank, IndianRupee, AlertTriangle,
  CheckCircle, RefreshCw, User, Dumbbell, Calendar,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { Button, DonutChart } from '@/components/ui';
import { api } from '@/lib/api';

interface PtSubscriptionTerm {
  id: string;
  plan_name?: string;
  start_date?: string;
  end_date?: string;
  duration_months?: number;
  selling_price: number;
  amount_paid: number;
  balance_amount: number;
  trainer_name?: string;
  status: string;
  source?: string;
  created_at?: string;
}

interface PtClientDetail {
  id: string; client_id?: string; unique_id?: string; name: string;
  trainer_id?: string; trainer_name?: string;
  package_type?: string;
  final_amount: number; paid_amount: number; balance_amount: number;
  status: string; days_left: number | null; due_status?: string;
  pt_start_date?: string; pt_end_date?: string;
}

function fmtINR(n: number | string | null | undefined) {
  return '₹' + Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function fmtDate(d?: string) {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function StatusBadge({ status, days_left }: { status: string; days_left: number | null }) {
  const styles: Record<string, { label: string; bg: string; fg: string }> = {
    active: { label: 'Active', bg: '#10b98118', fg: '#10b981' },
    expired: { label: 'Expired', bg: '#f43f5e18', fg: '#ef4444' },
    frozen: { label: 'Frozen', bg: '#3b82f618', fg: '#0067e0' },
  };
  let s = styles[status] || { label: status, bg: '#6b728018', fg: '#64748b' };
  if (status === 'active' && days_left !== null && days_left <= 7)
    s = { label: 'Expiring', bg: '#dc262618', fg: '#dc2626' };
  return (
    <span className="text-[11px] font-bold uppercase tracking-[0.06em] px-2.5 py-1 rounded-[8px]"
      style={{ background: s.bg, color: s.fg }}>
      {s.label}
    </span>
  );
}

function termStatus(startDate?: string, endDate?: string) {
  const now = new Date();
  if (!endDate) return { label: 'Active', bg: 'rgba(16,185,129,0.12)', color: '#059669' };
  const end = new Date(endDate);
  const start = startDate ? new Date(startDate) : null;
  if (end < now) return { label: 'Expired', bg: 'rgba(100,116,139,0.10)', color: '#64748b' };
  if (start && start > now) return { label: 'Upcoming', bg: 'rgba(0,103,224,0.12)', color: '#0067e0' };
  return { label: 'Active', bg: 'rgba(16,185,129,0.12)', color: '#059669' };
}

const GradientCard = ({ children, from, to }: { children: React.ReactNode; from: string; to: string }) => (
  <m.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    className="rounded-[16px] p-5 relative overflow-hidden"
    style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
  >
    <div className="absolute inset-0 opacity-10" style={{
      backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.8) 0%, transparent 60%)',
    }} />
    {children}
  </m.div>
);

function Skeleton() {
  return (
    <div className="animate-pulse space-y-5 p-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-[18px] p-5 h-28" style={{ background: 'var(--bg-card)' }} />
      ))}
    </div>
  );
}

export default function PtClientSubscriptionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [client, setClient] = useState<PtClientDetail | null>(null);
  const [terms, setTerms] = useState<PtSubscriptionTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError('');
      const [clientRes, subsRes] = await Promise.all([
        api.pt.client(id),
        api.pt.subscriptions(id),
      ]);
      setClient((clientRes as any)?.data ?? null);
      setTerms(Array.isArray((subsRes as any)?.data) ? (subsRes as any).data : []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load subscription history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [id]);

  const totalTerms = terms.length;
  const lifetimeFee = terms.reduce((s, t) => s + Number(t.selling_price ?? 0), 0);
  const lifetimePaid = terms.reduce((s, t) => s + Number(t.amount_paid ?? 0), 0);
  const lifetimeBalance = terms.reduce((s, t) => s + Number(t.balance_amount ?? 0), 0);

  const paymentsByTermData = terms.map((t, idx) => ({
    name: t.plan_name || `Term ${idx + 1}`,
    value: Number(t.amount_paid ?? 0),
  }));

  return (
    <Guard>
      <AppShell>
        <div className="min-h-screen">
          {loading ? (
            <Skeleton />
          ) : error ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-[16px] mb-4" style={{ background: 'rgba(239,68,68,0.10)' }}>
                <RefreshCw size={22} style={{ color: '#ef4444' }} />
              </div>
              <p className="text-[14px]" style={{ color: 'var(--text-muted)' }}>{error}</p>
              <Button variant="primary" iconLeft={<RefreshCw size={13} />} onClick={fetchAll} className="mt-4">Retry</Button>
            </div>
          ) : client ? (
            <div className="mx-auto max-w-screen-xl py-6">
              {/* ── Header ── */}
              <m.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-wrap items-center justify-between gap-4 mb-6"
              >
                <div className="flex items-center gap-3">
                  <button onClick={() => router.push(`/pt-os/clients/${id}`)}
                    className="flex h-9 w-9 items-center justify-center rounded-[10px] transition-all hover:bg-zinc-100"
                    style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
                    <ArrowLeft size={16} style={{ color: 'var(--text-muted)' }} />
                  </button>
                  <div>
                    <div className="flex items-center gap-3">
                      <h1 className="text-[22px] font-[860] tracking-[-0.03em]" style={{ color: 'var(--text-primary)' }}>{client.name}</h1>
                      <StatusBadge status={client.status} days_left={client.days_left} />
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <p className="text-[12px]" style={{ color: 'var(--text-disabled)' }}>
                        {client.client_id || client.unique_id || client.id.slice(0, 8)} · PT Subscription History
                      </p>
                      {client.trainer_name && (
                        <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-disabled)' }}>
                          <User size={11} /> {client.trainer_name}
                        </span>
                      )}
                      {client.package_type && (
                        <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-disabled)' }}>
                          <Dumbbell size={11} /> {client.package_type}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" iconLeft={<ArrowLeft size={14} />}
                    onClick={() => router.push(`/pt-os/clients/${id}`)}>
                    Profile
                  </Button>
                  <Button variant="primary" iconLeft={<Repeat size={14} />}
                    onClick={() => router.push(`/pt-os/clients/${id}/renew`)}>
                    Renew PT
                  </Button>
                </div>
              </m.div>

              {/* ── Summary Cards ── */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <GradientCard from="#0067e0" to="#0067e0">
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-[9px]" style={{ background: 'rgba(255,255,255,0.15)' }}>
                        <Layers size={15} style={{ color: 'rgba(255,255,255,0.9)' }} />
                      </div>
                    </div>
                    <p className="text-[11px] font-[600] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.65)' }}>Total Terms</p>
                    <p className="text-[22px] font-[800] tracking-[-0.02em] mt-0.5" style={{ color: '#fff' }}>{totalTerms}</p>
                  </div>
                </GradientCard>

                <GradientCard from="#0067e0" to="#0059ce">
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-[9px]" style={{ background: 'rgba(255,255,255,0.15)' }}>
                        <PiggyBank size={15} style={{ color: 'rgba(255,255,255,0.9)' }} />
                      </div>
                    </div>
                    <p className="text-[11px] font-[600] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.65)' }}>Lifetime Paid</p>
                    <p className="text-[22px] font-[800] tracking-[-0.02em] mt-0.5" style={{ color: '#fff' }}>{fmtINR(lifetimePaid)}</p>
                  </div>
                </GradientCard>

                <GradientCard from="#0067e0" to="#0067e0">
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-[9px]" style={{ background: 'rgba(255,255,255,0.15)' }}>
                        <IndianRupee size={15} style={{ color: 'rgba(255,255,255,0.9)' }} />
                      </div>
                    </div>
                    <p className="text-[11px] font-[600] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.65)' }}>Lifetime Fee</p>
                    <p className="text-[22px] font-[800] tracking-[-0.02em] mt-0.5" style={{ color: '#fff' }}>{fmtINR(lifetimeFee)}</p>
                  </div>
                </GradientCard>

                <GradientCard
                  from={lifetimeBalance > 0 ? '#f59e0b' : '#10b981'}
                  to={lifetimeBalance > 0 ? '#92400e' : '#065f46'}
                >
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-[9px]" style={{ background: 'rgba(255,255,255,0.15)' }}>
                        {lifetimeBalance > 0
                          ? <AlertTriangle size={15} style={{ color: 'rgba(255,255,255,0.9)' }} />
                          : <CheckCircle size={15} style={{ color: 'rgba(255,255,255,0.9)' }} />}
                      </div>
                    </div>
                    <p className="text-[11px] font-[600] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.65)' }}>Outstanding Balance</p>
                    <p className="text-[22px] font-[800] tracking-[-0.02em] mt-0.5" style={{ color: '#fff' }}>{fmtINR(lifetimeBalance)}</p>
                  </div>
                </GradientCard>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* ── Term-by-term list ── */}
                <m.div
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                  className="lg:col-span-2 rounded-[18px] p-6"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
                >
                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-[11px]"
                      style={{ background: 'rgba(0,103,224,0.12)', border: '1px solid rgba(0,103,224,0.2)' }}>
                      <Repeat size={15} className="text-indigo-500" />
                    </div>
                    <div>
                      <h3 className="text-[14px] font-[740]" style={{ color: 'var(--text-primary)' }}>Term-by-Term History</h3>
                      <p className="text-[10.5px]" style={{ color: 'var(--text-muted)' }}>{totalTerms} term{totalTerms !== 1 ? 's' : ''} total, oldest first</p>
                    </div>
                  </div>

                  {totalTerms === 0 ? (
                    <div className="flex flex-col items-center justify-center py-14">
                      <div className="flex h-12 w-12 items-center justify-center rounded-[12px] mb-3" style={{ background: 'var(--bg-subtle)' }}>
                        <Repeat size={22} style={{ color: 'var(--text-disabled)' }} />
                      </div>
                      <p className="text-[13px] font-[500]" style={{ color: 'var(--text-muted)' }}>No subscription terms recorded yet</p>
                      <p className="text-[11px] mt-1" style={{ color: 'var(--text-disabled)' }}>Enroll or renew this client's PT to start their history</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {terms.map((t, idx) => {
                        const isLast = idx === terms.length - 1;
                        const st = termStatus(t.start_date, t.end_date);
                        return (
                          <m.div key={t.id ?? idx}
                            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}
                            className="overflow-hidden rounded-[16px] p-4"
                            style={isLast
                              ? { background: 'rgba(0,103,224,0.06)', border: '1.5px solid rgba(0,103,224,0.18)' }
                              : { background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div className="flex min-w-0 items-center gap-2.5">
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-[800] text-indigo-600"
                                  style={{ background: 'rgba(0,103,224,0.12)' }}>{idx + 1}</span>
                                <div className="min-w-0">
                                  <div className="flex min-w-0 items-center gap-2">
                                    <p className="min-w-0 truncate text-[13px] font-[700]" style={{ color: 'var(--text-primary)' }}>{t.plan_name || '—'}</p>
                                    {isLast && (
                                      <span className="shrink-0 rounded-[5px] px-1.5 py-0.5 text-[8.5px] font-[800] uppercase tracking-wider text-indigo-600"
                                        style={{ background: 'rgba(0,103,224,0.12)' }}>Current</span>
                                    )}
                                  </div>
                                  <p className="text-[10.5px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                    {t.duration_months ? `${t.duration_months}m · ` : ''}
                                    {fmtDate(t.start_date)} → {fmtDate(t.end_date)}
                                    {t.trainer_name ? ` · ${t.trainer_name}` : ''}
                                  </p>
                                </div>
                              </div>
                              <span className="shrink-0 rounded-[7px] px-2 py-0.5 text-[9.5px] font-[700] uppercase tracking-wider"
                                style={{ background: st.bg, color: st.color }}>{st.label}</span>
                            </div>
                            <div className={`grid gap-2 ${isLast ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3'}`}>
                              {[
                                { label: 'Fee', value: fmtINR(t.selling_price), color: 'var(--text-primary)' },
                                { label: 'Paid', value: fmtINR(t.amount_paid), color: '#059669' },
                                { label: 'Balance', value: fmtINR(t.balance_amount), color: Number(t.balance_amount) > 0 ? '#ef4444' : '#059669' },
                                ...(isLast ? [{ label: 'Days Left', value: client.days_left !== null ? `${client.days_left}d` : '—', color: '#0067e0' }] : []),
                              ].map((f) => (
                                <div key={f.label} className="rounded-[10px] p-2.5" style={{ background: 'var(--bg-card)' }}>
                                  <p className="text-[8.5px] font-[700] uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>{f.label}</p>
                                  <p className="text-[12.5px] font-[760] tabular-nums" style={{ color: f.color }}>{f.value}</p>
                                </div>
                              ))}
                            </div>
                          </m.div>
                        );
                      })}
                    </div>
                  )}
                </m.div>

                {/* ── Payments by Term donut ── */}
                <m.div
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                  className="rounded-[18px] p-6"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex h-7 w-7 items-center justify-center rounded-[8px]" style={{ background: 'rgba(0,103,224,0.12)' }}>
                      <PiggyBank size={13} style={{ color: '#0067e0' }} />
                    </div>
                    <span className="text-[12px] font-[700]" style={{ color: 'var(--text-primary)' }}>Payments by Term</span>
                  </div>
                  {paymentsByTermData.length < 2 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <Calendar size={26} style={{ color: 'var(--text-disabled)', opacity: 0.5 }} className="mb-2" />
                      <p className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
                        {totalTerms === 0 ? 'No terms to chart yet.' : 'Renew this client to see the split across terms.'}
                      </p>
                    </div>
                  ) : (
                    <DonutChart data={paymentsByTermData} centerLabel="lifetime paid" valueFormatter={fmtINR} height={220} thin />
                  )}
                  <p className="mt-3 text-[10.5px]" style={{ color: 'var(--text-muted)' }}>
                    {totalTerms} term{totalTerms !== 1 ? 's' : ''} · {fmtINR(lifetimePaid)} total paid
                  </p>
                </m.div>
              </div>
            </div>
          ) : null}
        </div>
      </AppShell>
    </Guard>
  );
}
