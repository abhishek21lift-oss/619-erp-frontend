'use client';

import { use, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Wallet, CheckCircle, AlertTriangle, Clock,
  Award, Plus, X, Receipt, Calendar, User, Dumbbell,
  TrendingUp, TrendingDown, Banknote, Landmark, CreditCard,
  Smartphone, Search, RefreshCw,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { PremiumButton } from '@/components/premium/PremiumButton';
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
  const styles: Record<string, { label: string; bg: string; fg: string }> = {
    active: { label: 'Active', bg: '#10b98118', fg: '#10b981' },
    expired: { label: 'Expired', bg: '#f43f5e18', fg: '#f43f5e' },
    frozen: { label: 'Frozen', bg: '#3b82f618', fg: '#3b82f6' },
  };
  let s = styles[status] || { label: status, bg: '#6b728018', fg: '#6b7280' };
  if (status === 'active' && days_left !== null && days_left <= 7)
    s = { label: 'Expiring', bg: '#dc262618', fg: '#dc2626' };
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
    refunded: { label: 'Refunded', bg: '#6366f112', fg: '#6366f1' },
  };
  const c = colors[status] || { label: status, bg: '#6b728012', fg: '#6b7280' };
  return (
    <span className="text-[10px] font-bold uppercase tracking-[0.06em] px-2 py-0.5 rounded-[6px]"
      style={{ background: c.bg, color: c.fg }}>
      {c.label}
    </span>
  );
}

const paymentMethods = [
  { value: 'CASH', label: 'Cash', icon: Banknote, color: '#10b981' },
  { value: 'UPI', label: 'UPI', icon: Smartphone, color: '#6366f1' },
  { value: 'CARD', label: 'Card', icon: CreditCard, color: '#3b82f6' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer', icon: Landmark, color: '#f59e0b' },
  { value: 'CHEQUE', label: 'Cheque', icon: Receipt, color: '#8b5cf6' },
];

const GradientCard = ({ children, from, to, className = '' }: { children: React.ReactNode; from: string; to: string; className?: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    className={`rounded-[16px] p-5 relative overflow-hidden ${className}`}
    style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
  >
    <div className="absolute inset-0 opacity-10" style={{
      backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.8) 0%, transparent 60%)',
    }} />
    {children}
  </motion.div>
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
        <div className="min-h-screen" style={{ background: 'linear-gradient(145deg,#0f172a 0%,#1e293b 50%,#0f172a 100%)' }}>
          {loading ? (
            <Skeleton />
          ) : error ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-[16px] mb-4" style={{ background: 'rgba(239,68,68,0.15)' }}>
                <RefreshCw size={22} style={{ color: '#ef4444' }} />
              </div>
              <p className="text-[14px]" style={{ color: 'rgb(148,163,184)' }}>{error}</p>
              <PremiumButton tone="primary" glow icon={<RefreshCw size={13} />} onClick={fetchAll} className="mt-4">Retry</PremiumButton>
            </div>
          ) : client ? (
            <div className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6">
              {/* ── Header ── */}
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-wrap items-center justify-between gap-4 mb-6"
              >
                <div className="flex items-center gap-3">
                  <button onClick={() => router.push(`/pt-os/clients/${id}`)}
                    className="flex h-9 w-9 items-center justify-center rounded-[10px] transition-all hover:bg-white/10"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <ArrowLeft size={16} style={{ color: 'rgb(148,163,184)' }} />
                  </button>
                  <div>
                    <div className="flex items-center gap-3">
                      <h1 className="text-[22px] font-[860] tracking-[-0.03em]" style={{ color: '#f1f5f9' }}>{client.name}</h1>
                      <StatusBadge status={client.status} days_left={client.days_left} />
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <p className="text-[12px]" style={{ color: 'rgb(100,116,139)' }}>
                        {client.client_id || client.id.slice(0, 8)} · PT Payments
                      </p>
                      {client.trainer_name && (
                        <span className="flex items-center gap-1 text-[11px]" style={{ color: 'rgb(100,116,139)' }}>
                          <User size={11} /> {client.trainer_name}
                        </span>
                      )}
                      {client.package_type && (
                        <span className="flex items-center gap-1 text-[11px]" style={{ color: 'rgb(100,116,139)' }}>
                          <Dumbbell size={11} /> {client.package_type}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <PremiumButton tone="secondary" icon={<ArrowLeft size={14} />}
                    onClick={() => router.push(`/pt-os/clients/${id}`)}>
                    Profile
                  </PremiumButton>
                  <PremiumButton tone="primary" glow icon={<Plus size={14} />}
                    onClick={() => setShowPaymentPanel(true)}>
                    Record Payment
                  </PremiumButton>
                </div>
              </motion.div>

              {/* ── Summary Cards ── */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <GradientCard from="#dc2626" to="#991b1b">
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

                <GradientCard from="#8b5cf6" to="#5b21b6">
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
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="rounded-[14px] p-5 mb-6"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={14} style={{ color: '#10b981' }} />
                    <span className="text-[13px] font-[600]" style={{ color: '#e2e8f0' }}>Payment Progress</span>
                  </div>
                  <span className="text-[12px] font-[700] tabular-nums" style={{ color: '#94a3b8' }}>
                    {fmtINR(client.paid_amount)} / {fmtINR(client.final_amount)}
                  </span>
                </div>
                <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <motion.div
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
                  <span className="text-[10px]" style={{ color: 'rgb(100,116,139)' }}>
                    {progressPct < 100 ? `${progressPct.toFixed(0)}% paid` : 'Fully paid'}
                  </span>
                  <span className="text-[10px] font-[600]" style={{
                    color: client.balance_amount > 0 ? '#f59e0b' : '#10b981',
                  }}>
                    {client.balance_amount > 0 ? `${fmtINR(client.balance_amount)} remaining` : 'No balance'}
                  </span>
                </div>
              </motion.div>

              {/* ── Payment History ── */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="rounded-[18px] overflow-hidden"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.07)',
                }}
              >
                {/* Header + filters */}
                <div className="flex flex-wrap items-center gap-3 p-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center gap-2.5">
                    <Wallet size={14} style={{ color: 'rgb(148,163,184)' }} />
                    <h3 className="text-[14px] font-[700]" style={{ color: '#e2e8f0' }}>Payment History</h3>
                    <span className="text-[11px] px-2 py-0.5 rounded-[6px] font-[600]" style={{
                      background: 'rgba(99,102,241,0.12)',
                      color: '#818cf8',
                    }}>
                      {payments.length} total
                    </span>
                  </div>
                  <div className="flex-1" />
                  <div className="relative">
                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'rgb(100,116,139)' }} />
                    <input
                      type="text"
                      placeholder="Search payments..."
                      value={searchTerm}
                      onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
                      className="w-48 pl-8 pr-3 py-1.5 rounded-[8px] text-[12px] outline-none transition-all"
                      style={{
                        background: 'rgba(0,0,0,0.2)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        color: '#e2e8f0',
                      }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = '#818cf8'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(129,140,248,0.15)'; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.boxShadow = ''; }}
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
                    className="px-2.5 py-1.5 rounded-[8px] text-[12px] font-medium outline-none cursor-pointer"
                    style={{
                      background: 'rgba(0,0,0,0.2)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      color: '#94a3b8',
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
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] text-[12px] font-medium transition-all hover:bg-white/5"
                    style={{ background: 'rgba(0,0,0,0.2)', color: 'rgb(148,163,184)' }}
                  >
                    <RefreshCw size={12} />
                    Refresh
                  </button>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        {['Date', 'Method', 'Reference', 'Amount', 'Incentive', 'Status', 'Notes'].map(h => (
                          <th key={h} className="py-3 px-4 text-[10px] font-bold uppercase tracking-[0.06em]"
                            style={{ color: 'rgb(100,116,139)' }}>
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
                          <motion.tr
                            key={p.id}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.02 }}
                            style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                            className="transition-colors hover:bg-white/[0.02]"
                          >
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2">
                                <Calendar size={12} style={{ color: 'rgb(100,116,139)' }} />
                                <span className="text-[12.5px] font-[500] tabular-nums" style={{ color: '#cbd5e1' }}>
                                  {fmtDate(p.date)}
                                </span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-1.5">
                                {MethodIcon && <MethodIcon size={12} style={{ color: methodIcon?.color || 'rgb(148,163,184)' }} />}
                                <span className="text-[12px]" style={{ color: 'rgb(148,163,184)' }}>
                                  {p.payment_method?.replace(/_/g, ' ') || '—'}
                                </span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="text-[12px] font-mono" style={{ color: 'rgb(100,116,139)' }}>
                                {p.payment_ref || '—'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="text-[14px] font-[700] tabular-nums" style={{ color: '#f1f5f9' }}>
                                {fmtINR(p.amount)}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="text-[12px] tabular-nums" style={{ color: Number(p.incentive_amt) > 0 ? '#f59e0b' : 'rgb(100,116,139)' }}>
                                {Number(p.incentive_amt) > 0 ? fmtINR(p.incentive_amt) : '—'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <PaymentStatusBadge status={p.status} />
                            </td>
                            <td className="py-3.5 px-4 max-w-[160px]">
                              <span className="text-[11.5px] truncate block" style={{ color: 'rgb(100,116,139)' }}>
                                {p.notes || '—'}
                              </span>
                            </td>
                          </motion.tr>
                        );
                      }) : (
                        <tr>
                          <td colSpan={7}>
                            <div className="flex flex-col items-center justify-center py-14">
                              <div className="flex h-12 w-12 items-center justify-center rounded-[12px] mb-3"
                                style={{ background: 'rgba(255,255,255,0.04)' }}>
                                <Banknote size={22} style={{ color: 'rgb(100,116,139)' }} />
                              </div>
                              <p className="text-[13px] font-[500]" style={{ color: 'rgb(100,116,139)' }}>
                                No payments recorded yet
                              </p>
                              <p className="text-[11px] mt-1" style={{ color: 'rgb(71,85,105)' }}>
                                {searchTerm || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Record the first payment for this client'}
                              </p>
                              {!searchTerm && statusFilter === 'all' && (
                                <PremiumButton tone="primary" glow icon={<Plus size={12} />}
                                  onClick={() => setShowPaymentPanel(true)} className="mt-4">
                                  Record Payment
                                </PremiumButton>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {filteredPayments.length > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                    <span className="text-[11px]" style={{ color: 'rgb(100,116,139)' }}>
                      Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filteredPayments.length)} of {filteredPayments.length} payments
                    </span>
                    {totalPages > 1 && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setPage(p => Math.max(0, p - 1))}
                          disabled={page === 0}
                          className="px-2.5 py-1 rounded-[6px] text-[11px] font-[600] transition-all disabled:opacity-30"
                          style={{ background: 'rgba(255,255,255,0.05)', color: 'rgb(148,163,184)' }}
                        >← Prev</button>
                        <span className="text-[11px] px-2" style={{ color: 'rgb(100,116,139)' }}>
                          {page + 1} / {totalPages}
                        </span>
                        <button
                          onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                          disabled={page >= totalPages - 1}
                          className="px-2.5 py-1 rounded-[6px] text-[11px] font-[600] transition-all disabled:opacity-30"
                          style={{ background: 'rgba(255,255,255,0.05)', color: 'rgb(148,163,184)' }}
                        >Next →</button>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-[11px] font-[600]" style={{ color: '#10b981' }}>
                      <TrendingDown size={12} />
                      Total: {fmtINR(filteredPayments.reduce((s, p) => s + Number(p.amount), 0))}
                    </div>
                  </div>
                )}
              </motion.div>

              {/* ── Record Payment Slide-in Panel ── */}
              <AnimatePresence>
                {showPaymentPanel && (
                  <>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-40"
                      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
                      onClick={() => setShowPaymentPanel(false)}
                    />
                    <motion.div
                      ref={formRef}
                      initial={{ x: '100%' }}
                      animate={{ x: 0 }}
                      exit={{ x: '100%' }}
                      transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                      className="fixed right-0 top-0 bottom-0 w-full max-w-md z-50 overflow-y-auto"
                      style={{
                        background: 'linear-gradient(180deg, #1e293b, #0f172a)',
                        borderLeft: '1px solid rgba(255,255,255,0.08)',
                        boxShadow: '-8px 0 32px rgba(0,0,0,0.4)',
                      }}
                    >
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-[10px]"
                              style={{ background: 'rgba(16,185,129,0.15)' }}>
                              <Plus size={16} style={{ color: '#10b981' }} />
                            </div>
                            <h2 className="text-[16px] font-[700]" style={{ color: '#f1f5f9' }}>Record Payment</h2>
                          </div>
                          <button
                            onClick={() => setShowPaymentPanel(false)}
                            className="flex h-8 w-8 items-center justify-center rounded-[8px] transition-colors hover:bg-white/5"
                            style={{ color: 'rgb(148,163,184)' }}
                          >
                            <X size={16} />
                          </button>
                        </div>

                        <div className="space-y-5">
                          {/* Client summary */}
                          <div className="rounded-[12px] p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[11px] font-[600] uppercase tracking-wider" style={{ color: 'rgb(100,116,139)' }}>Client</span>
                              <span className="text-[12px] font-[600]" style={{ color: '#e2e8f0' }}>{client.name}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-[600] uppercase tracking-wider" style={{ color: 'rgb(100,116,139)' }}>Balance</span>
                              <span className="text-[14px] font-[700]" style={{ color: client.balance_amount > 0 ? '#f59e0b' : '#10b981' }}>
                                {fmtINR(client.balance_amount)}
                              </span>
                            </div>
                          </div>

                          {/* Amount */}
                          <div>
                            <label className="block text-[11px] font-[600] uppercase tracking-wider mb-1.5" style={{ color: 'rgb(148,163,184)' }}>
                              Amount *
                            </label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[14px] font-[700]" style={{ color: 'rgb(100,116,139)' }}>₹</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={form.amount}
                                onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))}
                                placeholder="0.00"
                                className="w-full pl-8 pr-4 py-3 rounded-[12px] text-[15px] font-[700] tabular-nums outline-none transition-all"
                                style={{
                                  background: 'rgba(0,0,0,0.25)',
                                  border: '1px solid rgba(255,255,255,0.08)',
                                  color: '#f1f5f9',
                                }}
                                onFocus={(e) => { e.currentTarget.style.borderColor = '#10b981'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.15)'; }}
                                onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.boxShadow = ''; }}
                              />
                            </div>
                          </div>

                          {/* Payment Method */}
                          <div>
                            <label className="block text-[11px] font-[600] uppercase tracking-wider mb-2" style={{ color: 'rgb(148,163,184)' }}>
                              Payment Method
                            </label>
                            <div className="grid grid-cols-5 gap-1.5">
                              {paymentMethods.map(m => {
                                const Icon = m.icon;
                                const isSelected = form.payment_method === m.value;
                                return (
                                  <button
                                    key={m.value}
                                    onClick={() => setForm(f => ({ ...f, payment_method: m.value }))}
                                    className="flex flex-col items-center gap-1 py-2.5 px-1 rounded-[10px] text-[10px] font-[500] transition-all"
                                    style={{
                                      background: isSelected ? `${m.color}18` : 'rgba(255,255,255,0.03)',
                                      border: `1px solid ${isSelected ? m.color : 'rgba(255,255,255,0.06)'}`,
                                      color: isSelected ? m.color : 'rgb(148,163,184)',
                                    }}
                                  >
                                    <Icon size={16} />
                                    {m.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            {/* Reference */}
                            <div>
                              <label className="block text-[11px] font-[600] uppercase tracking-wider mb-1.5" style={{ color: 'rgb(148,163,184)' }}>
                                Reference
                              </label>
                              <input
                                type="text"
                                value={form.payment_ref}
                                onChange={(e) => setForm(f => ({ ...f, payment_ref: e.target.value }))}
                                placeholder="TXN ID / UTR"
                                className="w-full px-3 py-2.5 rounded-[10px] text-[13px] outline-none transition-all"
                                style={{
                                  background: 'rgba(0,0,0,0.25)',
                                  border: '1px solid rgba(255,255,255,0.08)',
                                  color: '#e2e8f0',
                                }}
                                onFocus={(e) => { e.currentTarget.style.borderColor = '#818cf8'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(129,140,248,0.15)'; }}
                                onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.boxShadow = ''; }}
                              />
                            </div>

                            {/* Date */}
                            <div>
                              <label className="block text-[11px] font-[600] uppercase tracking-wider mb-1.5" style={{ color: 'rgb(148,163,184)' }}>
                                Date
                              </label>
                              <input
                                type="date"
                                value={form.date}
                                onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))}
                                className="w-full px-3 py-2.5 rounded-[10px] text-[13px] outline-none transition-all"
                                style={{
                                  background: 'rgba(0,0,0,0.25)',
                                  border: '1px solid rgba(255,255,255,0.08)',
                                  color: '#e2e8f0',
                                  colorScheme: 'dark',
                                }}
                                onFocus={(e) => { e.currentTarget.style.borderColor = '#818cf8'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(129,140,248,0.15)'; }}
                                onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.boxShadow = ''; }}
                              />
                            </div>
                          </div>

                          {/* Notes */}
                          <div>
                            <label className="block text-[11px] font-[600] uppercase tracking-wider mb-1.5" style={{ color: 'rgb(148,163,184)' }}>
                              Notes
                            </label>
                            <textarea
                              value={form.notes}
                              onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                              placeholder="Optional notes..."
                              rows={3}
                              className="w-full px-3 py-2.5 rounded-[10px] text-[13px] outline-none resize-none transition-all"
                              style={{
                                background: 'rgba(0,0,0,0.25)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                color: '#e2e8f0',
                              }}
                              onFocus={(e) => { e.currentTarget.style.borderColor = '#818cf8'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(129,140,248,0.15)'; }}
                              onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.boxShadow = ''; }}
                            />
                          </div>

                          {/* Summary */}
                          <div className="rounded-[12px] p-4 space-y-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <div className="flex justify-between text-[12px]">
                              <span style={{ color: 'rgb(148,163,184)' }}>Current Paid</span>
                              <span className="font-[600]" style={{ color: '#10b981' }}>{fmtINR(client.paid_amount)}</span>
                            </div>
                            <div className="flex justify-between text-[12px]">
                              <span style={{ color: 'rgb(148,163,184)' }}>This Payment</span>
                              <span className="font-[700]" style={{ color: '#f1f5f9' }}>
                                {form.amount ? fmtINR(form.amount) : '—'}
                              </span>
                            </div>
                            <div className="border-t pt-2" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                              <div className="flex justify-between text-[13px]">
                                <span style={{ color: 'rgb(148,163,184)' }}>New Paid Total</span>
                                <span className="font-[800]" style={{ color: '#f1f5f9' }}>
                                  {fmtINR(Number(client.paid_amount) + (Number(form.amount) || 0))}
                                </span>
                              </div>
                            </div>
                            <div className="flex justify-between text-[12px]">
                              <span style={{ color: 'rgb(148,163,184)' }}>New Balance</span>
                              <span className="font-[700]" style={{
                                color: (client.final_amount - (client.paid_amount + (Number(form.amount) || 0))) > 0 ? '#f59e0b' : '#10b981',
                              }}>
                                {fmtINR(Math.max(0, client.final_amount - (client.paid_amount + (Number(form.amount) || 0))))}
                              </span>
                            </div>
                          </div>

                          {/* Submit */}
                          <PremiumButton
                            tone="primary"
                            glow
                            icon={<Plus size={14} />}
                            onClick={handleCreatePayment}
                            disabled={!form.amount || Number(form.amount) <= 0 || submitting}
                            className="w-full justify-center !py-3"
                          >
                            {submitting ? 'Recording...' : 'Record Payment'}
                          </PremiumButton>
                        </div>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          ) : null}
        </div>
      </AppShell>
    </Guard>
  );
}
