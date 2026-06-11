'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { RevenueCard } from '@/components/premium/RevenueCard';
import { PremiumModal } from '@/components/premium/PremiumModal';
import { PremiumButton } from '@/components/premium/PremiumButton';
import {
  FileText, Download, Send, CheckCircle2, Search,
  ChevronDown, Eye, Clock, IndianRupee, Filter,
  AlertTriangle, X, CreditCard,
  Receipt, Plus,
  MoreHorizontal, RefreshCw,
} from 'lucide-react';

type InvoiceStatus = 'paid' | 'pending' | 'overdue' | 'draft' | 'cancelled';
type PaymentMethod = 'upi' | 'credit-card' | 'cash' | 'razorpay' | 'stripe' | 'bank-transfer';

interface Invoice {
  id: string;
  memberName: string;
  memberAvatar: string;
  amount: number;
  date: string;
  dueDate: string;
  status: InvoiceStatus;
  paymentMethod?: PaymentMethod;
  description: string;
  timeline: { action: string; date: string; done: boolean }[];
}

interface InvoiceStats {
  total: number;
  paid: number;
  pending: number;
  overdue: number;
}

const PAYMENT_ICONS: Record<PaymentMethod, { label: string; color: string }> = {
  'upi': { label: 'UPI', color: '#7c3aed' },
  'credit-card': { label: 'Card', color: '#0ea5e9' },
  'cash': { label: 'Cash', color: '#10b981' },
  'razorpay': { label: 'Razorpay', color: '#6366f1' },
  'stripe': { label: 'Stripe', color: '#8b5cf6' },
  'bank-transfer': { label: 'Bank Transfer', color: '#f59e0b' },
};

function fmtCurrency(n: number): string {
  return '₹' + n.toLocaleString('en-IN');
}

function initials(name: string): string {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

function Avatar({ name }: { name: string }) {
  const colors = ['#dc2626', '#7c3aed', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899'];
  const idx = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length;
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-[12px] font-[700] text-white" style={{ background: colors[idx] }}>
      {initials(name)}
    </div>
  );
}

function normaliseInvoice(raw: Record<string, unknown>): Invoice {
  return {
    id: String(raw.id ?? ''),
    memberName: String(raw.member_name ?? raw.memberName ?? ''),
    memberAvatar: String(raw.member_avatar ?? raw.memberAvatar ?? ''),
    amount: Number(raw.amount ?? 0),
    date: String(raw.date ?? ''),
    dueDate: String(raw.due_date ?? raw.dueDate ?? ''),
    status: (raw.status as InvoiceStatus) ?? 'draft',
    paymentMethod: (raw.payment_method ?? raw.paymentMethod ?? undefined) as PaymentMethod | undefined,
    description: String(raw.description ?? raw.description ?? ''),
    timeline: Array.isArray(raw.timeline)
      ? raw.timeline.map((t: Record<string, unknown>) => ({
          action: String(t.action ?? ''),
          date: String(t.date ?? ''),
          done: Boolean(t.done),
        }))
      : [],
  };
}

function SkeletonCard() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col gap-4 rounded-[18px] px-5 py-4 sm:flex-row sm:items-center"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="h-9 w-9 shrink-0 rounded-[10px] bg-slate-200 animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-44 rounded-full bg-slate-200 animate-pulse" />
          <div className="h-3 w-64 rounded-full bg-slate-100 animate-pulse" />
        </div>
      </div>
      <div className="flex items-center gap-4 sm:gap-6">
        <div className="space-y-2 text-right">
          <div className="h-4 w-20 rounded-full bg-slate-200 animate-pulse ml-auto" />
          <div className="h-3 w-16 rounded-full bg-slate-100 animate-pulse ml-auto" />
        </div>
        <div className="flex gap-1.5">
          <div className="h-8 w-8 rounded-[10px] bg-slate-200 animate-pulse" />
          <div className="h-8 w-8 rounded-[10px] bg-slate-200 animate-pulse" />
          <div className="h-8 w-8 rounded-[10px] bg-slate-200 animate-pulse" />
        </div>
      </div>
    </motion.div>
  );
}

const KPI_CONFIG = [
  { label: 'Total Invoiced', key: 'total' as const, icon: <FileText className="h-4 w-4" />, trend: 12.5 },
  { label: 'Paid', key: 'paid' as const, icon: <CheckCircle2 className="h-4 w-4" />, trend: 8.3 },
  { label: 'Pending', key: 'pending' as const, icon: <Clock className="h-4 w-4" />, trend: -3.2 },
  { label: 'Overdue', key: 'overdue' as const, icon: <AlertTriangle className="h-4 w-4" />, trend: -5.1 },
];

export default function InvoicesPage() {
  const [statusTab, setStatusTab] = React.useState<InvoiceStatus | 'all'>('all');
  const [search, setSearch] = React.useState('');
  const [selectedInvoice, setSelectedInvoice] = React.useState<Invoice | null>(null);
  const [invoices, setInvoices] = React.useState<Invoice[]>([]);
  const [stats, setStats] = React.useState<InvoiceStats>({ total: 0, paid: 0, pending: 0, overdue: 0 });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchInvoices = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = { limit: 100 };
      if (statusTab !== 'all') params.status = statusTab;
      if (search) params.search = search;
      const res = await api.invoices.list(params);
      setInvoices((res.invoices as Record<string, unknown>[]).map(normaliseInvoice));
      setStats(res.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, [statusTab, search]);

  React.useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const statusTabs = React.useMemo(() => {
    const counts: Record<string, number> = { all: invoices.length, paid: 0, pending: 0, overdue: 0, draft: 0, cancelled: 0 };
    invoices.forEach((i) => { if (i.status in counts) counts[i.status]++; });
    return [
      { id: 'all' as const, label: 'All Invoices', count: counts.all },
      { id: 'paid' as const, label: 'Paid', count: counts.paid },
      { id: 'pending' as const, label: 'Pending', count: counts.pending },
      { id: 'overdue' as const, label: 'Overdue', count: counts.overdue },
      { id: 'draft' as const, label: 'Draft', count: counts.draft },
    ];
  }, [invoices]);

  return (
    <Guard role="admin">
      <AppShell>
        <div className="min-h-screen" style={{ background: 'linear-gradient(145deg,#f8fafc 0%,#f1f5f9 50%,#fafafe 100%)' }}>
          <Header stats={stats} />
          <div className="mx-auto max-w-7xl px-4 pb-28 pt-6 sm:px-6 lg:px-8">
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {KPI_CONFIG.map((kpi, i) => (
                <RevenueCard key={kpi.label} label={kpi.label} value={fmtCurrency(stats[kpi.key])} trend={kpi.trend} icon={kpi.icon} index={i} />
              ))}
            </div>

            <div className="mb-5 flex flex-wrap items-center gap-3">
              {statusTabs.map((tab) => (
                <motion.button
                  key={tab.id}
                  onClick={() => setStatusTab(tab.id)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="relative flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-[660] transition-all"
                  style={{
                    background: statusTab === tab.id ? 'rgba(220,38,38,0.08)' : 'var(--bg-card)',
                    border: statusTab === tab.id ? '1.5px solid rgba(220,38,38,0.25)' : '1px solid var(--border)',
                    color: statusTab === tab.id ? '#dc2626' : 'var(--text-muted)',
                    boxShadow: statusTab === tab.id ? '0 0 0 2px rgba(220,38,38,0.06)' : '0 1px 3px rgba(15,23,42,0.04)',
                  }}
                >
                  {tab.label}
                  <span className="inline-flex items-center justify-center rounded-full bg-current/10 px-2 py-0.5 text-[11px] font-[700] text-current">{tab.count}</span>
                </motion.button>
              ))}
              <div className="ml-auto flex items-center gap-2">
                <div className="relative flex items-center gap-2 rounded-[13px] px-3.5 py-2.5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-2)', boxShadow: '0 1px 4px rgba(15,23,42,0.04)' }}>
                  <Search size={13} style={{ color: 'var(--text-disabled)' }} />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search invoices…" className="flex-1 bg-transparent text-[13px] font-[500] outline-none" style={{ color: 'var(--text-primary)' }} />
                  {search && <button onClick={() => setSearch('')}><X size={12} style={{ color: 'var(--text-disabled)' }} /></button>}
                </div>
                <PremiumButton tone="primary" icon={<Plus className="h-4 w-4" />}>New Invoice</PremiumButton>
              </div>
            </div>

            {loading && invoices.length === 0 ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : error ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-24 text-center"
              >
                <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-[24px]" style={{ background: 'rgba(220,38,38,0.08)' }}>
                  <AlertTriangle size={36} style={{ color: '#dc2626' }} />
                </div>
                <p className="text-[20px] font-[780] tracking-tight" style={{ color: 'var(--text-primary)' }}>Failed to load invoices</p>
                <p className="mt-2 max-w-xs text-[14px]" style={{ color: 'var(--text-disabled)' }}>{error}</p>
                <PremiumButton tone="primary" icon={<RefreshCw className="h-4 w-4" />} className="mt-6" onClick={fetchInvoices}>
                  Retry
                </PremiumButton>
              </motion.div>
            ) : (
              <AnimatePresence mode="wait">
                {invoices.length === 0 ? (
                  <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center py-24 text-center"
                  >
                    <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-[24px]" style={{ background: 'rgba(220,38,38,0.08)' }}>
                      <FileText size={36} style={{ color: '#dc2626' }} />
                    </div>
                    <p className="text-[20px] font-[780] tracking-tight" style={{ color: 'var(--text-primary)' }}>No invoices found</p>
                    <p className="mt-2 max-w-xs text-[14px]" style={{ color: 'var(--text-disabled)' }}>{search ? 'Try adjusting your search terms.' : 'Create your first invoice to start tracking payments.'}</p>
                    <PremiumButton tone="primary" icon={<Plus className="h-4 w-4" />} className="mt-6">Create Invoice</PremiumButton>
                  </motion.div>
                ) : (
                  <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                    {invoices.map((invoice, i) => (
                      <InvoiceCard key={invoice.id} invoice={invoice} index={i} onView={() => setSelectedInvoice(invoice)} />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>

          <PremiumModal
            open={!!selectedInvoice}
            onClose={() => setSelectedInvoice(null)}
            title={`Invoice ${selectedInvoice?.id}`}
            subtitle={selectedInvoice?.memberName}
            icon={<Receipt className="h-4 w-4" />}
            size="lg"
            footer={
              <>
                <PremiumButton tone="ghost" onClick={() => setSelectedInvoice(null)}>Close</PremiumButton>
                <PremiumButton tone="primary" icon={<Download className="h-4 w-4" />}>Download PDF</PremiumButton>
              </>
            }
          >
            {selectedInvoice && <InvoiceDetail invoice={selectedInvoice} />}
          </PremiumModal>
        </div>
      </AppShell>
    </Guard>
  );
}

function Header({ stats }: { stats: InvoiceStats }) {
  return (
    <div className="border-b" style={{ background: 'var(--bg-card)', backdropFilter: 'blur(20px)', borderColor: 'var(--border)' }}>
      <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-[12px]" style={{ background: 'rgba(220,38,38,0.10)' }}>
                <FileText size={16} style={{ color: '#dc2626' }} />
              </div>
              <h1 className="text-[22px] font-[860] tracking-[-0.03em]" style={{ color: 'var(--text-primary)' }}>Invoices</h1>
            </div>
            <p className="mt-1.5 text-[13px]" style={{ color: 'var(--text-disabled)' }}>Manage billing, track payments, and send invoices.</p>
            <div className="mt-2 flex items-center gap-2 text-[12px]" style={{ color: 'var(--text-disabled)' }}>
              <span>Finance</span>
              <ChevronDown size={10} className="-rotate-90" />
              <span style={{ color: '#dc2626', fontWeight: 600 }}>Invoices</span>
            </div>
          </div>
          <div className="flex gap-2">
            <PremiumButton tone="secondary" icon={<Filter className="h-4 w-4" />}>Filter</PremiumButton>
            <PremiumButton tone="primary" icon={<Plus className="h-4 w-4" />}>Create Invoice</PremiumButton>
          </div>
        </div>
      </div>
    </div>
  );
}

function InvoiceCard({ invoice, index, onView }: { invoice: Invoice; index: number; onView: () => void }) {
  const [menuOpen, setMenuOpen] = React.useState(false);

  const statusCfg: Record<InvoiceStatus, { color: string; bg: string; dot: string }> = {
    paid: { color: '#059669', bg: 'rgba(5,150,105,0.08)', dot: '#10b981' },
    pending: { color: '#d97706', bg: 'rgba(217,119,6,0.08)', dot: '#f59e0b' },
    overdue: { color: '#dc2626', bg: 'rgba(220,38,38,0.08)', dot: '#ef4444' },
    draft: { color: '#6b7280', bg: 'rgba(107,114,128,0.08)', dot: '#9ca3af' },
    cancelled: { color: 'var(--text-disabled)', bg: 'rgba(148,163,184,0.12)', dot: '#cbd5e1' },
  };

  const cfg = statusCfg[invoice.status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
      layout
      className="group relative flex flex-col gap-4 rounded-[18px] px-5 py-4 transition-all sm:flex-row sm:items-center"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(15,23,42,0.04)' }}
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <Avatar name={invoice.memberName} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[14px] font-[720] tracking-[-0.01em]" style={{ color: 'var(--text-primary)' }}>{invoice.memberName}</p>
            <span className="text-[11px] font-[600] rounded-full px-2 py-0.5" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}20` }}>
              <span className={`inline-block h-1.5 w-1.5 rounded-full mr-1.5`} style={{ background: cfg.dot }} />
              {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
            </span>
            {invoice.paymentMethod && (
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-[660]" style={{ background: 'rgba(99,102,241,0.08)', color: '#6366f1' }}>
                <CreditCard size={9} /> {PAYMENT_ICONS[invoice.paymentMethod].label}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[12.5px]" style={{ color: 'var(--text-disabled)' }}>{invoice.description}</p>
        </div>
      </div>

      <div className="flex items-center gap-4 sm:gap-6">
        <div className="text-right">
          <p className="text-[16px] font-[780] tracking-[-0.02em]" style={{ color: 'var(--text-primary)' }}>{fmtCurrency(invoice.amount)}</p>
          <p className="text-[11px]" style={{ color: 'var(--text-disabled)' }}>{invoice.date}</p>
        </div>

        <div className="flex items-center gap-1.5">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onView}
            className="flex h-8 w-8 items-center justify-center rounded-[10px] transition" style={{ background: 'var(--bg-subtle)' }}
            title="View Invoice"
          >
            <Eye size={14} style={{ color: 'var(--text-muted)' }} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex h-8 w-8 items-center justify-center rounded-[10px] transition" style={{ background: 'var(--bg-subtle)' }}
            title="Download PDF"
          >
            <Download size={14} style={{ color: 'var(--text-muted)' }} />
          </motion.button>
          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setMenuOpen((o) => !o)}
              className="flex h-8 w-8 items-center justify-center rounded-[10px] transition" style={{ background: 'var(--bg-subtle)' }}
            >
              <MoreHorizontal size={14} style={{ color: 'var(--text-muted)' }} />
            </motion.button>
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 top-10 z-50 min-w-[180px] overflow-hidden rounded-[14px] p-1"
                  style={{ background: 'var(--bg-card)', border: '1px solid rgba(15,23,42,0.09)', boxShadow: '0 12px 32px rgba(15,23,42,0.14)' }}
                >
                  {[
                    { icon: <Eye size={13} />, label: 'View Details', action: 'view', color: 'rgb(30,30,40)' },
                    { icon: <Download size={13} />, label: 'Download PDF', action: 'download', color: 'rgb(30,30,40)' },
                    { icon: <Send size={13} />, label: 'Send Reminder', action: 'remind', color: 'rgb(30,30,40)' },
                    { icon: <CheckCircle2 size={13} />, label: 'Mark as Paid', action: 'mark-paid', color: '#059669' },
                  ].map((item) => (
                    <button key={item.action}
                      onClick={() => setMenuOpen(false)}
                      className="flex w-full items-center gap-2.5 rounded-[10px] px-3.5 py-2.5 text-[12.5px] font-[580] transition-colors hover:bg-slate-50"
                      style={{ color: item.color }}
                    >
                      {item.icon} {item.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function InvoiceDetail({ invoice }: { invoice: Invoice }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-[14px] border border-zinc-100 p-4" style={{ background: 'var(--bg-subtle)' }}>
          <p className="text-[11px] font-[700] uppercase tracking-wider" style={{ color: 'var(--text-disabled)' }}>Invoice ID</p>
          <p className="mt-1.5 text-[15px] font-[720]" style={{ color: 'var(--text-primary)' }}>{invoice.id}</p>
        </div>
        <div className="rounded-[14px] border border-zinc-100 p-4" style={{ background: 'var(--bg-subtle)' }}>
          <p className="text-[11px] font-[700] uppercase tracking-wider" style={{ color: 'var(--text-disabled)' }}>Amount</p>
          <p className="mt-1.5 text-[15px] font-[720]" style={{ color: 'var(--text-primary)' }}>{fmtCurrency(invoice.amount)}</p>
        </div>
        <div className="rounded-[14px] border border-zinc-100 p-4" style={{ background: 'var(--bg-subtle)' }}>
          <p className="text-[11px] font-[700] uppercase tracking-wider" style={{ color: 'var(--text-disabled)' }}>Issue Date</p>
          <p className="mt-1.5 text-[15px] font-[720]" style={{ color: 'var(--text-primary)' }}>{invoice.date}</p>
        </div>
        <div className="rounded-[14px] border border-zinc-100 p-4" style={{ background: 'var(--bg-subtle)' }}>
          <p className="text-[11px] font-[700] uppercase tracking-wider" style={{ color: 'var(--text-disabled)' }}>Due Date</p>
          <p className="mt-1.5 text-[15px] font-[720]" style={{ color: 'var(--text-primary)' }}>{invoice.dueDate}</p>
        </div>
      </div>

      <div>
        <p className="mb-3 text-[12px] font-[700] uppercase tracking-wider" style={{ color: 'var(--text-disabled)' }}>Invoice Timeline</p>
        <div className="relative space-y-0">
          {invoice.timeline.map((item, i) => (
            <motion.div
              key={item.action}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="relative flex gap-4 pb-6 pl-6 last:pb-0"
            >
              <div className="absolute left-0 top-1 flex flex-col items-center">
                <div className={`flex h-5 w-5 items-center justify-center rounded-full ${item.done ? 'bg-emerald-500' : 'border-2'}`}
                  style={{ borderColor: item.done ? undefined : 'rgb(203,213,225)' }}>
                  {item.done && <CheckCircle2 size={12} className="text-white" />}
                </div>
                {i < invoice.timeline.length - 1 && (
                  <div className="mt-1 w-px flex-1" style={{ background: item.done ? 'rgb(167,243,208)' : 'rgb(226,232,240)' }} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-[640]" style={{ color: item.done ? 'var(--text-primary)' : 'var(--text-disabled)' }}>{item.action}</p>
                <p className="mt-0.5 text-[12px]" style={{ color: 'var(--text-disabled)' }}>{item.date}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <PremiumButton tone="primary" icon={<Download className="h-4 w-4" />} size="sm">Download PDF</PremiumButton>
        {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
          <PremiumButton tone="secondary" icon={<Send className="h-4 w-4" />} size="sm">Send Reminder</PremiumButton>
        )}
        {invoice.status === 'pending' && (
          <PremiumButton tone="success" icon={<CheckCircle2 className="h-4 w-4" />} size="sm">Mark as Paid</PremiumButton>
        )}
      </div>
    </div>
  );
}
