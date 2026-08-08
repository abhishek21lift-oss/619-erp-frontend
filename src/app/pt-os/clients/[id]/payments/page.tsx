'use client';

import { use, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { m, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Wallet, CheckCircle, AlertTriangle, Clock,
  Award, Plus, X, Receipt, Calendar, User, Dumbbell,
  TrendingUp, TrendingDown, Banknote, Landmark, CreditCard,
  Smartphone, Search, RefreshCw,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { Button, PageContainer, PageHero } from '@/components/ui';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';

interface Payment {
  id: string; client_id: string; trainer_id: string;
  amount: number; incentive_amt: number;
  payment_method: string; payment_ref: string;
  date: string; status: string; notes: string;
  client_name: string; trainer_name: string;
  created_at: string;
}

interface PtClientDetail {
  id: string; client_id?: string; name: string;
  email?: string; mobile?: string; gender?: string;
  trainer_id?: string; trainer_name?: string;
  package_type?: string;
  base_amount: number; discount: number; final_amount: number;
  paid_amount: number; balance_amount: number;
  duration_months?: number; monthly_pt_amount: number;
  trainer_commission: number; status: string; days_left: number;
  due_status?: string; pt_start_date?: string; pt_end_date?: string;
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

function fmtDateTime(d?: string) {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function StatusBadge({ status, days_left }: { status: string; days_left: number | null }) {
  // Alpha bumped from the 18 (~9%) this used when it sat on a light card —
  // on the navy hero the tint needs more presence to still read as a pill
  // rather than plain coloured text. This component has one caller.
  const styles: Record<string, { label: string; bg: string; fg: string }> = {
    active: { label: 'Active', bg: '#10b98133', fg: '#10b981' },
    expired: { label: 'Expired', bg: '#f43f5e33', fg: '#ef4444' },
    frozen: { label: 'Frozen', bg: '#3b82f633', fg: '#0067e0' },
  };
  let s = styles[status] || { label: status, bg: '#6b728033', fg: '#64748b' };
  if (status === 'active' && days_left !== null && days_left <= 7)
    s = { label: 'Expiring', bg: '#dc262633', fg: '#dc2626' };
  return (
    <span className="text-[11px] font-bold uppercase tracking-[0.06em] px-2.5 py-1 rounded-[8px]"
      style={{ background: s.bg, color: s.fg }}>
      {s.label}
    </span>
  );
}

function PaymentStatusBadge({ status }: { status: string }) {
  const colors: Record<string, { label: string; bg: string; fg: string }> = {
    completed: { label: 'Completed', bg: '#10b98112', fg: '#10b981' },
    pending: { label: 'Pending', bg: '#f59e0b12', fg: '#f59e0b' },
    failed: { label: 'Failed', bg: '#ef444412', fg: '#ef4444' },
    refunded: { label: 'Refunded', bg: '#6366f112', fg: '#0067e0' },
  };
  const c = colors[status] || { label: status, bg: '#6b728012', fg: '#64748b' };
  return (
    <span className="text-[10px] font-bold uppercase tracking-[0.06em] px-2 py-0.5 rounded-[6px]"
      style={{ background: c.bg, color: c.fg }}>
      {c.label}
    </span>
  );
}

const paymentMethods = [
  { value: 'CASH', label: 'Cash', icon: Banknote, color: '#10b981' },
  { value: 'UPI', label: 'UPI', icon: Smartphone, color: '#0067e0' },
  { value: 'CARD', label: 'Card', icon: CreditCard, color: '#0067e0' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer', icon: Landmark, color: '#f59e0b' },
  { value: 'CHEQUE', label: 'Cheque', icon: Receipt, color: '#0067e0' },
];

const GradientCard = ({ children, from, to, className = '' }: { children: React.ReactNode; from: string; to: string; className?: string }) => (
  <m.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    className={`rounded-[16px] p-5 relative overflow-hidden ${className}`}
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
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="rounded-[18px] p-5 h-32" style={{ background: 'var(--bg-card)' }} />
      ))}
    </div>
  );
}

export default function PtClientPaymentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();

  const [client, setClient] = useState<PtClientDetail | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPaymentPanel, setShowPaymentPanel] = useState(false);
  const [showOptional, setShowOptional] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const formRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({
    amount: '',
    payment_method: 'CASH',
    payment_ref: '',
    date: new Date().toISOString().slice(0, 10),
    notes: '',
  });

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError('');
      const [clientRes, paymentsRes] = await Promise.all([
        api.pt.client(id),
        api.pt.payments({ client_id: id }),
      ]);
      setClient((clientRes as any)?.data ?? null);
      setPayments((paymentsRes as any)?.data ?? []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load payment data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [id]);

  const filteredPayments = payments.filter(p => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      if (!p.payment_method?.toLowerCase().includes(q) &&
          !p.payment_ref?.toLowerCase().includes(q) &&
          !p.trainer_name?.toLowerCase().includes(q)) return false;
    }
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    return true;
  });

  const totalPages = Math.ceil(filteredPayments.length / PAGE_SIZE);
  const pagedPayments = filteredPayments.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleCreatePayment = async () => {
    if (!form.amount || Number(form.amount) <= 0) return;
    setSubmitting(true);
    try {
      const payload = {
        client_id: id,
        trainer_id: client?.trainer_id || null,
        amount: Number(form.amount),
        incentive_amt: 0,
        payment_method: form.payment_method,
        payment_ref: form.payment_ref || null,
        date: form.date,
        notes: form.notes || null,
      };
      await api.pt.createPayment(payload);
      setShowPaymentPanel(false);
      setForm({
        amount: '',
        payment_method: 'CASH',
        payment_ref: '',
        date: new Date().toISOString().slice(0, 10),
        notes: '',
      });
      await fetchAll();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  const totalPaid = payments
    .filter(p => p.status === 'completed' || !p.status)
    .reduce((s, p) => s + Number(p.amount), 0);

  const progressPct = client && client.final_amount > 0
    ? Math.min((client.paid_amount / client.final_amount) * 100, 100)
    : 0;

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
            <PageContainer>
              <PageHero
                icon={<Wallet size={20} />}
                title={client.name}
                subtitle={`${client.client_id || client.id.slice(0, 8)} · PT Payments`}
                actions={
                  <div className="flex gap-2">
                    <button type="button" onClick={() => router.push(`/pt-os/clients/${id}`)}
                      className="inline-flex items-center gap-1.5 rounded-full h-9 px-3.5 text-[12px] font-semibold transition active:scale-95"
                      style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)', color: '#fff' }}>
                      <ArrowLeft size={14} /> Profile
                    </button>
                    <button type="button" onClick={() => setShowPaymentPanel(true)}
                      className="inline-flex items-center gap-1.5 rounded-full h-9 px-3.5 text-[12px] font-semibold transition active:scale-95"
                      style={{ background: '#fff', color: '#0F172A' }}>
                      <Plus size={14} /> Record Payment
                    </button>
                  </div>
                }
              >
                <div className="flex flex-wrap items-center gap-3">
                  <StatusBadge status={client.status} days_left={client.days_left} />
                  {client.trainer_name && (
                    <span className="flex items-center gap-1 text-[11px]" style={{ color: 'rgba(255,255,255,0.7)' }}>
                      <User size={11} /> {client.trainer_name}
                    </span>
                  )}
                  {client.package_type && (
                    <span className="flex items-center gap-1 text-[11px]" style={{ color: 'rgba(255,255,255,0.7)' }}>
                      <Dumbbell size={11} /> {client.package_type}
                    </span>
                  )}
                </div>
              </PageHero>

              {/* ── Summary Cards ── */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <GradientCard from="#F59E0B" to="#D97706">
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-[9px]" style={{ background: 'rgba(255,255,255,0.15)' }}>
                        <Wallet size={15} style={{ color: 'rgba(255,255,255,0.9)' }} />
                      </div>
                    </div>
                    <p className="text-[11px] font-[600] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.65)' }}>Final Amount</p>
                    <p className="text-[22px] font-[800] tracking-[-0.02em] mt-0.5" style={{ color: '#fff' }}>{fmtINR(client.final_amount)}</p>
                  </div>
                </GradientCard>

                <GradientCard from="#10b981" to="#065f46">
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-[9px]" style={{ background: 'rgba(255,255,255,0.15)' }}>
                        <CheckCircle size={15} style={{ color: 'rgba(255,255,255,0.9)' }} />
                      </div>
                    </div>
                    <p className="text-[11px] font-[600] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.65)' }}>Total Paid</p>
                    <p className="text-[22px] font-[800] tracking-[-0.02em] mt-0.5" style={{ color: '#fff' }}>{fmtINR(client.paid_amount)}</p>
                    <p className="text-[10px] mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      {payments.length} transaction{payments.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </GradientCard>

                <GradientCard
                  from={client.balance_amount > 0 ? '#f59e0b' : '#10b981'}
                  to={client.balance_amount > 0 ? '#92400e' : '#065f46'}
                >
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-[9px]" style={{ background: 'rgba(255,255,255,0.15)' }}>
                        {client.balance_amount > 0
                          ? <AlertTriangle size={15} style={{ color: 'rgba(255,255,255,0.9)' }} />
                          : <CheckCircle size={15} style={{ color: 'rgba(255,255,255,0.9)' }} />}
                      </div>
                    </div>
                    <p className="text-[11px] font-[600] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.65)' }}>Balance</p>
                    <p className="text-[22px] font-[800] tracking-[-0.02em] mt-0.5" style={{ color: '#fff' }}>{fmtINR(client.balance_amount)}</p>
                    {client.balance_amount > 0 && client.due_status && (
                      <span className="inline-flex items-center gap-1 mt-1.5 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-[4px]"
                        style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)' }}>
                        <Clock size={10} /> {client.due_status}
                      </span>
                    )}
                  </div>
                </GradientCard>

                <GradientCard from="#0067e0" to="#0067e0">
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-[9px]" style={{ background: 'rgba(255,255,255,0.15)' }}>
                        <Award size={15} style={{ color: 'rgba(255,255,255,0.9)' }} />
                      </div>
                    </div>
                    <p className="text-[11px] font-[600] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.65)' }}>Commission</p>
                    <p className="text-[22px] font-[800] tracking-[-0.02em] mt-0.5" style={{ color: '#fff' }}>{fmtINR(client.trainer_commission)}</p>
                  </div>
                </GradientCard>
              </div>

              {/* ── Payment Progress Bar ── */}
              <m.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="rounded-[14px] p-5"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={14} style={{ color: '#10b981' }} />
                    <span className="text-[13px] font-[600]" style={{ color: 'var(--text-primary)' }}>Payment Progress</span>
                  </div>
                  <span className="text-[12px] font-[700] tabular-nums" style={{ color: 'var(--text-muted)' }}>
                    {fmtINR(client.paid_amount)} / {fmtINR(client.final_amount)}
                  </span>
                </div>
                <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: 'var(--bg-subtle)' }}>
                  <m.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPct}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{
                      background: progressPct >= 100
                        ? 'linear-gradient(90deg, #10b981, #34d399)'
                        : progressPct >= 50
                        ? 'linear-gradient(90deg, #f59e0b, #10b981)'
                        : 'linear-gradient(90deg, #ef4444, #f59e0b)',
                    }}
                  />
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-[10px]" style={{ color: 'var(--text-disabled)' }}>
                    {progressPct < 100 ? `${progressPct.toFixed(0)}% paid` : 'Fully paid'}
                  </span>
                  <span className="text-[10px] font-[600]" style={{
                    color: client.balance_amount > 0 ? '#f59e0b' : '#10b981',
                  }}>
                    {client.balance_amount > 0 ? `${fmtINR(client.balance_amount)} remaining` : 'No balance'}
                  </span>
                </div>
              </m.div>

              {/* ── Payment History ── */}
              <m.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="rounded-[18px] overflow-hidden"
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                }}
              >
                {/* Header + filters */}
                <div className="flex flex-wrap items-center gap-3 p-4 border-b" style={{ borderColor: '#f1f5f9' }}>
                  <div className="flex items-center gap-2.5">
                    <Wallet size={14} style={{ color: 'var(--text-muted)' }} />
                    <h3 className="text-[14px] font-[700]" style={{ color: 'var(--text-primary)' }}>Payment History</h3>
                    <span className="text-[11px] px-2 py-0.5 rounded-[6px] font-[600]" style={{
                      background: 'rgba(0,103,224,0.10)',
                      color: '#0067e0',
                    }}>
                      {payments.length} total
                    </span>
                  </div>
                  <div className="flex-1" />
                  <div className="relative">
                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-disabled)' }} />
                    <input
                      type="text"
                      placeholder="Search payments..."
                      value={searchTerm}
                      onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
                      className="w-48 pl-8 pr-3 py-1.5 rounded-[8px] text-[12px] outline-none transition-all"
                      style={{
                        background: 'var(--bg-card)',
                        border: '1px solid #cbd5e1',
                        color: 'var(--text-primary)',
                      }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = '#7fb4ff'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(127,180,255,0.15)'; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.boxShadow = ''; }}
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
                    className="px-2.5 py-1.5 rounded-[8px] text-[12px] font-medium outline-none cursor-pointer"
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid #cbd5e1',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <option value="all">All Status</option>
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                    <option value="refunded">Refunded</option>
                  </select>
                  <button
                    onClick={fetchAll}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] text-[12px] font-medium transition-all hover:bg-zinc-50"
                    style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                  >
                    <RefreshCw size={12} />
                    Refresh
                  </button>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-zinc-50" style={{ borderBottom: '1px solid var(--border)' }}>
                        {['Date', 'Method', 'Reference', 'Amount', 'Incentive', 'Status', 'Notes'].map(h => (
                          <th key={h} className="py-3 px-4 text-[10px] font-bold uppercase tracking-[0.06em]"
                            style={{ color: 'var(--text-muted)' }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pagedPayments.length > 0 ? pagedPayments.map((p, i) => {
                        const methodIcon = paymentMethods.find(m => m.value === p.payment_method);
                        const MethodIcon = methodIcon?.icon || Banknote;
                        return (
                          <m.tr
                            key={p.id}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.02 }}
                            className="border-t border-zinc-100 hover:bg-zinc-50/60 transition-colors"
                          >
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2">
                                <Calendar size={12} style={{ color: 'var(--text-disabled)' }} />
                                <span className="text-[12.5px] font-[500] tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                                  {fmtDate(p.date)}
                                </span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-1.5">
                                {MethodIcon && <MethodIcon size={12} style={{ color: methodIcon?.color || '#64748b' }} />}
                                <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                                  {p.payment_method?.replace(/_/g, ' ') || '—'}
                                </span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="text-[12px] font-mono" style={{ color: 'var(--text-disabled)' }}>
                                {p.payment_ref || '—'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="text-[14px] font-[700] tabular-nums" style={{ color: 'var(--text-primary)' }}>
                                {fmtINR(p.amount)}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="text-[12px] tabular-nums" style={{ color: Number(p.incentive_amt) > 0 ? '#f59e0b' : '#94a3b8' }}>
                                {Number(p.incentive_amt) > 0 ? fmtINR(p.incentive_amt) : '—'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <PaymentStatusBadge status={p.status} />
                            </td>
                            <td className="py-3.5 px-4 max-w-[160px]">
                              <span className="text-[11.5px] truncate block" style={{ color: 'var(--text-disabled)' }}>
                                {p.notes || '—'}
                              </span>
                            </td>
                          </m.tr>
                        );
                      }) : (
                        <tr>
                          <td colSpan={7}>
                            <div className="flex flex-col items-center justify-center py-14">
                              <div className="flex h-12 w-12 items-center justify-center rounded-[12px] mb-3"
                                style={{ background: 'var(--bg-subtle)' }}>
                                <Banknote size={22} style={{ color: 'var(--text-disabled)' }} />
                              </div>
                              <p className="text-[13px] font-[500]" style={{ color: 'var(--text-muted)' }}>
                                No payments recorded yet
                              </p>
                              <p className="text-[11px] mt-1" style={{ color: 'var(--text-disabled)' }}>
                                {searchTerm || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Record the first payment for this client'}
                              </p>
                              {!searchTerm && statusFilter === 'all' && (
                                <Button variant="primary" iconLeft={<Plus size={12} />}
                                  onClick={() => setShowPaymentPanel(true)} className="mt-4">
                                  Record Payment
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {filteredPayments.length > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t" style={{ borderColor: '#f1f5f9' }}>
                    <span className="text-[11px]" style={{ color: 'var(--text-disabled)' }}>
                      Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filteredPayments.length)} of {filteredPayments.length} payments
                    </span>
                    {totalPages > 1 && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setPage(p => Math.max(0, p - 1))}
                          disabled={page === 0}
                          className="px-2.5 py-1 rounded-[6px] text-[11px] font-[600] transition-all disabled:opacity-30"
                          style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                        >← Prev</button>
                        <span className="text-[11px] px-2" style={{ color: 'var(--text-disabled)' }}>
                          {page + 1} / {totalPages}
                        </span>
                        <button
                          onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                          disabled={page >= totalPages - 1}
                          className="px-2.5 py-1 rounded-[6px] text-[11px] font-[600] transition-all disabled:opacity-30"
                          style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                        >Next →</button>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-[11px] font-[600]" style={{ color: '#10b981' }}>
                      <TrendingDown size={12} />
                      Total: {fmtINR(filteredPayments.reduce((s, p) => s + Number(p.amount), 0))}
                    </div>
                  </div>
                )}
              </m.div>

              {/* ── Record Payment — bottom sheet on mobile, centered modal on desktop ── */}
              <AnimatePresence>
                {showPaymentPanel && (
                  <>
                    <m.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      data-no-pull-refresh className="fixed inset-0 z-[65]"
                      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)' }}
                      onClick={() => setShowPaymentPanel(false)}
                    />
                    <m.div
                      ref={formRef}
                      initial={{ opacity: 0, y: 40 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 40 }}
                      transition={{ type: 'spring', damping: 30, stiffness: 320 }}
                      role="dialog"
                      aria-modal="true"
                      aria-label="Record payment"
                      className="fixed z-[70] flex flex-col overflow-hidden
                                 inset-x-0 bottom-0 max-h-[94dvh] rounded-t-[26px]
                                 sm:inset-0 sm:m-auto sm:h-fit sm:max-h-[88vh] sm:max-w-md sm:rounded-[24px]"
                      style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        boxShadow: '0 -12px 48px rgba(0,0,0,0.20)',
                      }}
                    >
                      {/* Grab handle (mobile only) */}
                      <div className="flex shrink-0 justify-center pt-2.5 sm:hidden">
                        <span className="h-1.5 w-11 rounded-full" style={{ background: 'var(--border)' }} />
                      </div>

                      {/* Header (fixed) */}
                      <div className="flex shrink-0 items-start justify-between gap-3 px-5 pt-3 pb-3">
                        <div className="min-w-0">
                          <p className="text-[10px] font-[700] uppercase tracking-[0.12em]" style={{ color: 'var(--text-disabled)' }}>Record Payment</p>
                          <p className="truncate text-[19px] font-[800] tracking-[-0.025em] mt-0.5" style={{ color: 'var(--text-primary)' }}>{client.name}</p>
                        </div>
                        <button
                          onClick={() => setShowPaymentPanel(false)}
                          aria-label="Close"
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-zinc-100"
                          style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}
                        >
                          <X size={16} />
                        </button>
                      </div>

                      {/* Scrollable body */}
                      <div className="flex-1 overflow-y-auto px-5 pb-4">
                        {/* Balance chip */}
                        <div className="mb-3">
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-[600]"
                            style={{
                              background: client.balance_amount > 0 ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)',
                              color: client.balance_amount > 0 ? '#f59e0b' : '#10b981',
                            }}>
                            <Wallet size={12} />
                            {client.balance_amount > 0 ? `Balance due: ${fmtINR(client.balance_amount)}` : 'Fully paid'}
                          </div>
                        </div>

                        {/* Hero amount display */}
                        <div className="text-center pb-4 mb-4" style={{ borderBottom: '1px solid var(--border)' }}>
                          <p className="text-[44px] sm:text-[54px] font-[800] tracking-[-0.04em] tabular-nums leading-none" style={{
                            color: form.amount && Number(form.amount) > 0 ? 'var(--text-primary)' : 'var(--text-disabled)',
                          }}>
                            ₹{form.amount || '0'}
                          </p>
                        </div>

                        {/* Payment method pills */}
                        <div className="flex gap-2">
                          {[
                            { value: 'CASH', label: 'Cash', icon: Banknote, color: '#10b981' },
                            { value: 'UPI', label: 'UPI', icon: Smartphone, color: '#0067e0' },
                            { value: 'CARD', label: 'Card', icon: CreditCard, color: '#0067e0' },
                            { value: 'BANK_TRANSFER', label: 'Bank', icon: Landmark, color: '#f59e0b' },
                          ].map(m => {
                            const Icon = m.icon;
                            const sel = form.payment_method === m.value;
                            return (
                              <button
                                key={m.value}
                                onClick={() => setForm(f => ({ ...f, payment_method: m.value }))}
                                className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-full text-[11px] font-[700] transition-all"
                                style={{
                                  background: sel ? m.color : 'var(--bg-subtle)',
                                  color: sel ? '#fff' : 'var(--text-muted)',
                                  boxShadow: sel ? `0 4px 16px ${m.color}40` : 'none',
                                }}
                              >
                                <Icon size={13} />
                                <span className="ml-0.5">{m.label}</span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Number pad */}
                        <div className="grid grid-cols-3 gap-2 mt-4">
                          {['7','8','9','4','5','6','1','2','3','.','0','⌫'].map(key => (
                            <button
                              key={key}
                              onClick={() => {
                                setForm(f => {
                                  if (key === '⌫') return { ...f, amount: f.amount.slice(0, -1) };
                                  if (key === '.') return f.amount.includes('.') ? f : { ...f, amount: (f.amount || '0') + '.' };
                                  const next = f.amount === '' || f.amount === '0' ? key : f.amount + key;
                                  if (next.includes('.') && next.split('.')[1].length > 2) return f;
                                  return { ...f, amount: next };
                                });
                              }}
                              className="h-[54px] sm:h-[58px] rounded-[16px] font-[500] transition-all active:scale-90 select-none"
                              style={{
                                background: key === '⌫' ? 'rgba(239,68,68,0.08)' : 'var(--bg-subtle)',
                                color: key === '⌫' ? '#ef4444' : 'var(--text-primary)',
                                fontSize: key === '⌫' ? '18px' : '22px',
                              }}
                            >
                              {key}
                            </button>
                          ))}
                        </div>

                        {/* Optional details toggle */}
                        <button
                          onClick={() => setShowOptional(v => !v)}
                          className="flex items-center justify-between w-full px-3.5 py-2.5 rounded-[12px] text-[11px] font-[600] transition-colors hover:bg-zinc-50 mt-4"
                          style={{ color: 'var(--text-muted)', background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}
                        >
                          <span>Reference / Date / Notes</span>
                          <span style={{ fontSize: '9px', display: 'inline-block', transition: 'transform 0.2s', transform: showOptional ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                        </button>
                        <AnimatePresence>
                          {showOptional && (
                            <m.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              style={{ overflow: 'hidden' }}
                              className="space-y-3 mt-3"
                            >
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[10px] font-[600] uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Reference</label>
                                  <input type="text" value={form.payment_ref}
                                    onChange={(e) => setForm(f => ({ ...f, payment_ref: e.target.value }))}
                                    placeholder="TXN / UTR"
                                    className="w-full px-3 py-2 rounded-[9px] text-[12px] outline-none"
                                    style={{ background: 'var(--bg-card)', border: '1px solid #cbd5e1', color: 'var(--text-primary)' }}
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-[600] uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Date</label>
                                  <input type="date" value={form.date}
                                    onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-[9px] text-[12px] outline-none"
                                    style={{ background: 'var(--bg-card)', border: '1px solid #cbd5e1', color: 'var(--text-primary)', colorScheme: 'light' }}
                                  />
                                </div>
                              </div>
                              <textarea value={form.notes}
                                onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                                placeholder="Notes (optional)"
                                rows={2}
                                className="w-full px-3 py-2 rounded-[9px] text-[12px] outline-none resize-none"
                                style={{ background: 'var(--bg-card)', border: '1px solid #cbd5e1', color: 'var(--text-primary)' }}
                              />
                            </m.div>
                          )}
                        </AnimatePresence>

                        {/* Summary */}
                        <div className="rounded-[14px] p-4 space-y-2.5 mt-4" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
                          <div className="flex justify-between text-[12px]">
                            <span style={{ color: 'var(--text-muted)' }}>Already paid</span>
                            <span className="font-[600] tabular-nums" style={{ color: '#10b981' }}>{fmtINR(client.paid_amount)}</span>
                          </div>
                          <div className="flex justify-between text-[12px]">
                            <span style={{ color: 'var(--text-muted)' }}>This payment</span>
                            <span className="font-[700] tabular-nums" style={{ color: form.amount && Number(form.amount) > 0 ? 'var(--text-primary)' : 'var(--text-disabled)' }}>
                              {form.amount && Number(form.amount) > 0 ? fmtINR(form.amount) : '—'}
                            </span>
                          </div>
                          <div className="h-px" style={{ background: 'var(--border)' }} />
                          <div className="flex justify-between">
                            <span className="text-[13px] font-[700]" style={{ color: 'var(--text-primary)' }}>New balance</span>
                            <span className="text-[15px] font-[800] tabular-nums" style={{
                              color: Math.max(0, client.final_amount - (client.paid_amount + (Number(form.amount) || 0))) > 0 ? '#f59e0b' : '#10b981',
                            }}>
                              {fmtINR(Math.max(0, client.final_amount - (client.paid_amount + (Number(form.amount) || 0))))}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Sticky footer — always visible above the tab bar / home indicator */}
                      <div
                        className="shrink-0 px-5 pt-3"
                        style={{
                          borderTop: '1px solid var(--border)',
                          background: 'var(--bg-card)',
                          paddingBottom: 'calc(env(safe-area-inset-bottom) + 14px)',
                        }}
                      >
                        <button
                          onClick={handleCreatePayment}
                          disabled={!form.amount || Number(form.amount) <= 0 || submitting}
                          className="w-full py-4 rounded-[18px] text-[16px] font-[800] tracking-[-0.01em] transition-all select-none"
                          style={{
                            background: !form.amount || Number(form.amount) <= 0 || submitting
                              ? 'var(--bg-subtle)'
                              : 'linear-gradient(135deg, #10b981, #059669)',
                            color: !form.amount || Number(form.amount) <= 0 || submitting
                              ? 'var(--text-disabled)'
                              : '#ffffff',
                            boxShadow: !form.amount || Number(form.amount) <= 0 || submitting
                              ? 'none'
                              : '0 8px 24px rgba(16,185,129,0.4)',
                            cursor: !form.amount || Number(form.amount) <= 0 || submitting ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {submitting ? 'Recording…' : 'Record Payment'}
                        </button>
                      </div>
                    </m.div>
                  </>
                )}
              </AnimatePresence>
            </PageContainer>
          ) : null}
        </div>
      </AppShell>
    </Guard>
  );
}
