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
import { Button, PageContainer, PageHero } from '@/components/ui';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { useDialogA11y } from '@/hooks/useDialogA11y';
import { useAppForm } from '@/lib/forms/useAppForm';
import { todayISO } from '@/lib/forms/domain';
import {
  ptPaymentSchema, blankPtPayment, toPtPaymentPayload, applyKeypad, balanceAfter,
  PT_PAYMENT_FIELD_HINTS, type PtPaymentMethod,
} from '@/lib/forms/schemas/ptPayment';
import {
  TextField, TextAreaField, DateFieldControl, FormErrorBanner, visibleError,
} from '@/components/ui/form';
import { errorMessage } from '@/lib/forms/errors';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;


  const fetchAll = async () => {
    try {
      setLoading(true);
      setError('');
      const [clientRes, paymentsRes] = await Promise.all([
        api.pt.client(id),
        api.pt.payments({ client_id: id }),
      ]);
      // One assertion each, at the boundary, naming the shape this screen
      // reads. These two routes still type `data` as `unknown`, and the casts
      // used to be `as any` — which also switched off checking of every
      // property access downstream, so `client.final_amount` was unchecked all
      // the way into the balance arithmetic. §18 draws the line at API
      // boundaries specifically because of that knock-on.
      setClient((clientRes.data as PtClientDetail | null) ?? null);
      setPayments((paymentsRes.data as Payment[] | null) ?? []);
    } catch (err: unknown) {
      // mapApiError rather than err.message: a 5xx body can carry a stack or a
      // SQL error, and this screen shows the message to a studio owner.
      setError(errorMessage(err, 'Failed to load payment data'));
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

  const totalPaid = payments
    .filter(p => p.status === 'completed' || !p.status)
    .reduce((s, p) => s + Number(p.amount), 0);

  const progressPct = client && client.final_amount > 0
    ? Math.min((client.paid_amount / client.final_amount) * 100, 100)
    : 0;

  return (
    <Guard>
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
                  <input aria-label="Search payments"
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
                <select aria-label="Filter by status"
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
                <RecordPaymentSheet
                  client={client}
                  onClose={() => setShowPaymentPanel(false)}
                  onRecorded={async () => {
                    setShowPaymentPanel(false);
                    await fetchAll();
                  }}
                />
              )}
            </AnimatePresence>
          </PageContainer>
        ) : null}
      </div>
    </Guard>
  );
}

/**
 * The Record Payment sheet.
 *
 * Split out of the page and mounted only while open, which is the whole of the
 * reset contract for it (§11): the form state cannot outlive the sheet, so
 * "type ₹4,500, cancel, reopen and find ₹4,500 still there — and the keypad
 * APPENDS to it" is now unrepresentable rather than guarded against. It lived
 * on the page before and only the SUCCESS path cleared it.
 *
 * The submit guard is the in-flight ref inside useAppForm. `disabled` plus a
 * `submitting` flag was the old one, and neither survives two taps in the same
 * frame — which on a 54px keypad button, on a phone, is not a hypothetical.
 * The backend serialises concurrent writes for one client (FOR UPDATE on the
 * client row), so the two were safe; they were still two payments.
 *
 * The keypad, the pills, the hero amount, the sticky footer and every style
 * here are the sheet's own and are unchanged. What changed is where the value
 * goes: `field.handleChange` rather than a page-level `setForm`, so a keypad
 * press is dirty-tracked and validated exactly like a typed character.
 */
function RecordPaymentSheet({
  client, onClose, onRecorded,
}: {
  client: PtClientDetail;
  onClose: () => void;
  onRecorded: () => Promise<void>;
}) {
  const { toast } = useToast();
  const [showOptional, setShowOptional] = useState(false);

  const f = useAppForm({
    schema: ptPaymentSchema,
    defaultValues: blankPtPayment(),
    fieldHints: PT_PAYMENT_FIELD_HINTS,
    onSubmit: async (values) => {
      await api.pt.createPayment(
        toPtPaymentPayload(values, {
          clientId: client.id,
          trainerId: client.trainer_id ?? null,
        }),
      );
      toast.success('Payment recorded.');
    },
    onSuccess: () => { void onRecorded(); },
  });

  const { form, isSubmitting } = f;

  // Escape, focus trap and focus restore. The sheet declared
  // `aria-modal="true"` while Tab left it for the payment history table
  // behind, and it had no Escape handler, so the only way out was a click on
  // the backdrop. Escape is gated on the write being in flight — dismissing
  // mid-save would hide the outcome.
  const dialogRef = useDialogA11y({
    open: true,
    onClose,
    escapeCloses: !isSubmitting,
  });

  return (
    <>
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        data-no-pull-refresh className="fixed inset-0 z-[65]"
        style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)' }}
        onClick={() => !isSubmitting && onClose()}
      />
      <m.div
        ref={dialogRef}
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
        <form
          noValidate
          onSubmit={(e) => { e.preventDefault(); void f.submit(); }}
          className="flex min-h-0 flex-col"
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
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              aria-label="Close"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-zinc-100 disabled:opacity-50"
              style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-5 pb-4">
            <FormErrorBanner errors={f.errors} onRetry={() => void f.submit()} className="mb-3" />

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

            <form.Field name="amount">
              {(field) => {
                const typed = field.state.value;
                const asNumber = Number(typed);
                const positive = typed !== '' && Number.isFinite(asNumber) && asNumber > 0;
                const amountError = visibleError(field, f.errors.fieldErrors.amount);

                return (
                  <>
                    {/* Hero amount display. A live region rather than a plain
                        <p>: the keypad has no <input>, so a screen reader has
                        nothing to echo as the value changes and a blind user
                        would tap twelve identical buttons with no feedback. */}
                    <div className="text-center pb-4 mb-4" style={{ borderBottom: '1px solid var(--border)' }}>
                      <p
                        aria-live="polite"
                        aria-atomic="true"
                        className="text-[44px] sm:text-[54px] font-[800] tracking-[-0.04em] tabular-nums leading-none"
                        style={{ color: positive ? 'var(--text-primary)' : 'var(--text-disabled)' }}
                      >
                        ₹{typed || '0'}
                      </p>
                      {amountError && (
                        <p className="mt-2 text-[12px] font-[600]" style={{ color: 'var(--danger-text)' }}>
                          {amountError}
                        </p>
                      )}
                    </div>

                    {/* Payment method pills */}
                    <form.Field name="payment_method">
                      {(methodField) => (
                        <fieldset className="border-0 p-0">
                          <legend className="sr-only">Payment method</legend>
                          <div className="flex gap-2">
                            {[
                              { value: 'CASH', label: 'Cash', icon: Banknote, color: '#10b981' },
                              { value: 'UPI', label: 'UPI', icon: Smartphone, color: '#0067e0' },
                              { value: 'CARD', label: 'Card', icon: CreditCard, color: '#0067e0' },
                              { value: 'BANK_TRANSFER', label: 'Bank', icon: Landmark, color: '#f59e0b' },
                            ].map((pill) => {
                              const Icon = pill.icon;
                              const sel = methodField.state.value === pill.value;
                              return (
                                <button
                                  key={pill.value}
                                  type="button"
                                  aria-pressed={sel}
                                  onClick={() => methodField.handleChange(pill.value as PtPaymentMethod)}
                                  className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-full text-[11px] font-[700] transition-all"
                                  style={{
                                    background: sel ? pill.color : 'var(--bg-subtle)',
                                    color: sel ? '#fff' : 'var(--text-muted)',
                                    boxShadow: sel ? `0 4px 16px ${pill.color}40` : 'none',
                                  }}
                                >
                                  <Icon size={13} />
                                  <span className="ml-0.5">{pill.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </fieldset>
                      )}
                    </form.Field>

                    {/* Number pad. The press rules live in applyKeypad, which
                        is pure and tested — they used to be an inline reducer
                        nobody could exercise without a browser. */}
                    <div className="grid grid-cols-3 gap-2 mt-4">
                      {['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0', '⌫'].map((key) => (
                        <button
                          key={key}
                          type="button"
                          aria-label={key === '⌫' ? 'Delete last digit' : key === '.' ? 'Decimal point' : key}
                          onClick={() => field.handleChange(applyKeypad(field.state.value, key))}
                          onBlur={field.handleBlur}
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
                  </>
                );
              }}
            </form.Field>

            {/* Optional details toggle */}
            <button
              type="button"
              onClick={() => setShowOptional((v) => !v)}
              aria-expanded={showOptional}
              className="flex items-center justify-between w-full px-3.5 py-2.5 rounded-[12px] text-[11px] font-[600] transition-colors hover:bg-zinc-50 mt-4"
              style={{ color: 'var(--text-muted)', background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}
            >
              <span>Reference / Date / Notes</span>
              <span aria-hidden style={{ fontSize: '9px', display: 'inline-block', transition: 'transform 0.2s', transform: showOptional ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
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
                    <form.Field name="payment_ref">
                      {(field) => (
                        <TextField
                          field={field}
                          label="Reference"
                          placeholder="TXN / UTR"
                          maxLength={64}
                          serverError={f.errors.fieldErrors.payment_ref}
                        />
                      )}
                    </form.Field>
                    <form.Field name="date">
                      {(field) => (
                        <DateFieldControl
                          field={field}
                          label="Date"
                          required
                          max={todayISO()}
                          serverError={f.errors.fieldErrors.date}
                        />
                      )}
                    </form.Field>
                  </div>
                  <form.Field name="notes">
                    {(field) => (
                      <TextAreaField
                        field={field}
                        label="Notes (optional)"
                        rows={2}
                        maxLength={500}
                        showCount
                        serverError={f.errors.fieldErrors.notes}
                      />
                    )}
                  </form.Field>
                </m.div>
              )}
            </AnimatePresence>

            {/* Summary */}
            <form.Subscribe selector={(s) => s.values.amount}>
              {(amount) => {
                const payingNow = Number(amount);
                const safe = Number.isFinite(payingNow) ? payingNow : 0;
                const { balanceInr, overpaymentInr } = balanceAfter(
                  client.final_amount, client.paid_amount, safe,
                );
                return (
                  <div className="rounded-[14px] p-4 space-y-2.5 mt-4" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
                    <div className="flex justify-between text-[12px]">
                      <span style={{ color: 'var(--text-muted)' }}>Already paid</span>
                      <span className="font-[600] tabular-nums" style={{ color: '#10b981' }}>{fmtINR(client.paid_amount)}</span>
                    </div>
                    <div className="flex justify-between text-[12px]">
                      <span style={{ color: 'var(--text-muted)' }}>This payment</span>
                      <span className="font-[700] tabular-nums" style={{ color: safe > 0 ? 'var(--text-primary)' : 'var(--text-disabled)' }}>
                        {safe > 0 ? fmtINR(safe) : '—'}
                      </span>
                    </div>
                    <div className="h-px" style={{ background: 'var(--border)' }} />
                    <div className="flex justify-between">
                      <span className="text-[13px] font-[700]" style={{ color: 'var(--text-primary)' }}>New balance</span>
                      <span className="text-[15px] font-[800] tabular-nums" style={{
                        color: balanceInr > 0 ? '#f59e0b' : '#10b981',
                      }}>
                        {fmtINR(balanceInr)}
                      </span>
                    </div>
                    {/* The old summary clamped the balance at 0 and said
                        nothing else, so ₹50,000 against a ₹5,000 balance
                        looked exactly like paying it off exactly. Overpayment
                        is allowed — an advance is real — but it should never
                        be invisible. */}
                    {overpaymentInr > 0 && (
                      <p className="flex items-start gap-1.5 text-[11.5px] font-[600]" style={{ color: '#f59e0b' }}>
                        <AlertTriangle size={12} className="mt-px shrink-0" />
                        {fmtINR(overpaymentInr)} more than the outstanding balance. It will be recorded as paid in advance.
                      </p>
                    )}
                  </div>
                );
              }}
            </form.Subscribe>
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
            {/* The real guard is the in-flight ref inside useAppForm; disabled
                only communicates the state, and is no longer gated on validity
                — a dead button cannot say WHY it is dead. */}
            <form.Subscribe selector={(s) => s.values.amount}>
              {(amount) => {
                const ready = !isSubmitting && Number(amount) > 0;
                return (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 rounded-[18px] text-[16px] font-[800] tracking-[-0.01em] transition-all select-none"
                    style={{
                      background: ready ? 'linear-gradient(135deg, #10b981, #059669)' : 'var(--bg-subtle)',
                      color: ready ? '#ffffff' : 'var(--text-disabled)',
                      boxShadow: ready ? '0 8px 24px rgba(16,185,129,0.4)' : 'none',
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isSubmitting ? 'Recording…' : 'Record Payment'}
                  </button>
                );
              }}
            </form.Subscribe>
          </div>
        </form>
      </m.div>
    </>
  );
}
