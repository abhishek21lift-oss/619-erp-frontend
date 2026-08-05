'use client';

import * as React from 'react';
import ClientAvatar from '@/components/pt-os/ClientAvatar';
import { useSeededSearch } from '@/lib/use-seeded-search';
import { m, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { PremiumModal } from '@/components/premium/PremiumModal';
import { Button, KpiCard } from '@/components/ui';
import { identity } from '@/lib/palette';
import {
  FileText, Download, Send, CheckCircle2, Search,
  ChevronDown, Eye, Clock,
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
  memberPhoto: string | null;
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
  'upi': { label: 'UPI', color: '#0067e0' },
  'credit-card': { label: 'Card', color: '#0067e0' },
  'cash': { label: 'Cash', color: '#10b981' },
  'razorpay': { label: 'Razorpay', color: '#0067e0' },
  'stripe': { label: 'Stripe', color: '#0067e0' },
  'bank-transfer': { label: 'Bank Transfer', color: '#f59e0b' },
};

function fmtCurrency(n: number): string {
  return '₹' + n.toLocaleString('en-IN');
}

function initials(name: string): string {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

function Avatar({ name, photoUrl }: { name: string; photoUrl?: string | null }) {
  const colors = identity;
  const idx = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length;
  return (
    <ClientAvatar name={name} photoUrl={photoUrl} style={{
      display: 'flex',
      height: '36px',
      width: '36px',
      flexShrink: 0,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '10px',
      fontSize: '12px',
      fontWeight: 700,
      color: '#fff',
      background: colors[idx],
    }}>
      {initials(name)}
    </ClientAvatar>
  );
}

function normaliseInvoice(raw: Record<string, unknown>): Invoice {
  return {
    id: String(raw.id ?? ''),
    memberName: String(raw.client_name ?? raw.member_name ?? raw.memberName ?? ''),
    memberAvatar: String(raw.member_avatar ?? raw.memberAvatar ?? ''),
    memberPhoto: raw.client_photo ? String(raw.client_photo) : null,
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

function useBreakpoint(query: string): boolean {
  const [matches, setMatches] = React.useState(() => {
    if (typeof window !== 'undefined') return window.matchMedia(query).matches;
    return false;
  });
  React.useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);
  return matches;
}

function SkeletonCard() {
  const pulse = { opacity: [0.5, 1, 0.5] as number[] };
  const pulseTrans = { duration: 1.5, repeat: Infinity, ease: 'easeInOut' as const };

  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: '16px',
        borderRadius: '18px',
        padding: '16px 20px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: 0 }}>
        <m.div animate={pulse} transition={pulseTrans} style={{ height: '36px', width: '36px', flexShrink: 0, borderRadius: '10px', background: 'var(--bg-subtle)' }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <m.div animate={pulse} transition={pulseTrans} style={{ height: '16px', width: '176px', borderRadius: '9999px', background: 'var(--bg-subtle)' }} />
          <m.div animate={pulse} transition={pulseTrans} style={{ height: '12px', width: '256px', borderRadius: '9999px', background: 'var(--bg-subtle)' }} />
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'right' }}>
          <m.div animate={pulse} transition={pulseTrans} style={{ height: '16px', width: '80px', borderRadius: '9999px', background: 'var(--bg-subtle)', marginLeft: 'auto' }} />
          <m.div animate={pulse} transition={pulseTrans} style={{ height: '12px', width: '64px', borderRadius: '9999px', background: 'var(--bg-subtle)', marginLeft: 'auto' }} />
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <m.div animate={pulse} transition={pulseTrans} style={{ height: '32px', width: '32px', borderRadius: '10px', background: 'var(--bg-subtle)' }} />
          <m.div animate={pulse} transition={pulseTrans} style={{ height: '32px', width: '32px', borderRadius: '10px', background: 'var(--bg-subtle)' }} />
          <m.div animate={pulse} transition={pulseTrans} style={{ height: '32px', width: '32px', borderRadius: '10px', background: 'var(--bg-subtle)' }} />
        </div>
      </div>
    </m.div>
  );
}


interface CreateForm {
  memberName: string; amount: string; dueDate: string; description: string; paymentMethod: PaymentMethod;
}

function generateInvoiceHTML(invoice: Invoice): string {
  return `<!DOCTYPE html><html><head><title>Invoice ${invoice.id}</title>
<style>body{font-family:sans-serif;padding:40px;color:#0f172a}h1{font-size:24px;margin-bottom:4px}
.row{display:flex;gap:32px;margin-bottom:24px}.field{flex:1}
label{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#94a3b8;font-weight:700}
p{font-size:15px;font-weight:600;margin:4px 0}
.amount{font-size:28px;font-weight:800;color:#0f172a}
.status{display:inline-block;padding:4px 12px;border-radius:99px;font-size:12px;font-weight:700;
background:${invoice.status==='paid'?'#d1fae5':invoice.status==='overdue'?'#fee2e2':'#fef3c7'};
color:${invoice.status==='paid'?'#059669':invoice.status==='overdue'?'#dc2626':'#d97706'}}
@media print{button{display:none}}</style></head><body>
<h1>Invoice</h1><p style="color:#64748b;margin-bottom:24px">${invoice.id}</p>
<div class="row"><div class="field"><label>Bill To</label><p>${invoice.memberName}</p></div>
<div class="field"><label>Status</label><div style="margin-top:4px"><span class="status">${invoice.status.toUpperCase()}</span></div></div></div>
<div class="row"><div class="field"><label>Issue Date</label><p>${invoice.date}</p></div>
<div class="field"><label>Due Date</label><p>${invoice.dueDate}</p></div></div>
<div style="border-top:2px solid #e2e8f0;padding-top:16px;margin-bottom:24px">
<label>Description</label><p>${invoice.description}</p></div>
<div style="background:#f8fafc;border-radius:12px;padding:24px;text-align:right">
<label>Total Amount</label><div class="amount">&#8377;${invoice.amount.toLocaleString('en-IN')}</div>
${invoice.paymentMethod?`<p style="color:#64748b;font-size:13px;margin-top:8px">Via ${PAYMENT_ICONS[invoice.paymentMethod]?.label}</p>`:''}
</div></body></html>`;
}

export default function InvoicesPage() {
  const [statusTab, setStatusTab] = React.useState<InvoiceStatus | 'all'>('all');
  // Seeded from ?q= so a hit from the global search lands on that invoice.
  const [search, setSearch] = useSeededSearch();
  const [selectedInvoice, setSelectedInvoice] = React.useState<Invoice | null>(null);
  const [invoices, setInvoices] = React.useState<Invoice[]>([]);
  const [stats, setStats] = React.useState<InvoiceStats>({ total: 0, paid: 0, pending: 0, overdue: 0 });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [createForm, setCreateForm] = React.useState<CreateForm>({
    memberName: '', amount: '', dueDate: '', description: '', paymentMethod: 'upi',
  });

  const isSm = useBreakpoint('(min-width: 640px)');

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

  const handleCreateInvoice = React.useCallback(async () => {
    if (!createForm.memberName || !createForm.amount || !createForm.dueDate) return;
    setCreating(true);
    try {
      await api.invoices.create({
        member_name: createForm.memberName,
        amount: parseFloat(createForm.amount),
        due_date: createForm.dueDate,
        description: createForm.description,
        payment_method: createForm.paymentMethod,
      });
      setShowCreateModal(false);
      setCreateForm({ memberName: '', amount: '', dueDate: '', description: '', paymentMethod: 'upi' });
      fetchInvoices();
    } finally {
      setCreating(false);
    }
  }, [createForm, fetchInvoices]);

  const handleDownloadPDF = React.useCallback((invoice: Invoice) => {
    const w = window.open('', '_blank');
    if (w) { w.document.write(generateInvoiceHTML(invoice)); w.document.close(); w.focus(); w.print(); }
  }, []);

  const handleSendReminder = React.useCallback(async (invoice: Invoice) => {
    try { await api.invoices.remind(invoice.id); } catch { /* silently ignore */ }
  }, []);

  const handleMarkPaid = React.useCallback(async (invoice: Invoice) => {
    try {
      await api.invoices.markPaid(invoice.id);
      setSelectedInvoice(null);
      fetchInvoices();
    } catch { /* silently ignore */ }
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
        <div>

          {/* ── Hero ── */}
          <div style={{
            position: 'relative',
            overflow: 'hidden',
            borderBottom: '1px solid var(--border)',
          }}>

            <div style={{
              position: 'relative',
              zIndex: 1,
              maxWidth: '1280px',
              marginLeft: 'auto',
              marginRight: 'auto',
              padding: isSm ? '28px 32px' : '24px 20px',
            }}>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '16px',
              }}>
                {/* Left: Icon + Title + Subtitle + Breadcrumb */}
                <div style={{ flex: 1, minWidth: isSm ? undefined : '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      display: 'flex',
                      height: '44px',
                      width: '44px',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '14px',
                      background: 'linear-gradient(135deg, #0067e0, #0059ce)',
                      boxShadow: '0 8px 24px rgba(0,103,224,0.25)',
                    }}>
                      <FileText size={20} style={{ color: '#fff' }} />
                    </div>
                    <h1 style={{
                      fontSize: '26px',
                      fontWeight: 860,
                      letterSpacing: '-0.03em',
                      margin: 0,
                      color: 'var(--text-primary)',
                    }}>Invoices</h1>
                  </div>
                  <p style={{ marginTop: '6px', fontSize: '13px', color: 'var(--text-muted)' }}>
                    Manage billing, track payments, and send invoices.
                  </p>
                  <div style={{
                    marginTop: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '12px',
                    color: 'var(--text-disabled)',
                  }}>
                    <span>Finance</span>
                    <ChevronDown size={10} style={{ transform: 'rotate(-90deg)' }} />
                    <span style={{ color: '#7fb4ff', fontWeight: 600 }}>Invoices</span>
                  </div>
                </div>

                {/* Right: Compact Stats + Actions */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  gap: '12px',
                }}>
                  <div style={{
                    display: 'flex',
                    gap: '16px',
                    flexWrap: 'wrap',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                  }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}>Overdue</div>
                      <div style={{
                        fontSize: '17px',
                        fontWeight: 800,
                        color: '#ef4444',
                        marginTop: '2px',
                      }}>{fmtCurrency(stats.overdue)}</div>
                    </div>
                    <div style={{ width: '1px', height: '32px', background: 'rgba(0,0,0,0.1)' }} />
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}>Pending</div>
                      <div style={{
                        fontSize: '17px',
                        fontWeight: 800,
                        color: '#F59E0B',
                        marginTop: '2px',
                      }}>{fmtCurrency(stats.pending)}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Button variant="primary" iconLeft={<Plus size={16} />} onClick={() => setShowCreateModal(true)}>Create Invoice</Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Main Content ── */}
          <div style={{
            maxWidth: '1280px',
            marginLeft: 'auto',
            marginRight: 'auto',
            padding: isSm ? '24px 32px 112px' : '24px 16px 112px',
          }}>
            {/* KPI Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '14px', marginBottom: '24px' }}>
              <KpiCard label="Total Invoiced" value={fmtCurrency(stats.total)} icon={<FileText size={16} />} accent="blue" />
              <KpiCard label="Paid" value={fmtCurrency(stats.paid)} icon={<CheckCircle2 size={16} />} accent="emerald" />
              <KpiCard label="Pending" value={fmtCurrency(stats.pending)} icon={<Clock size={16} />} accent="amber" />
              <KpiCard label="Overdue" value={fmtCurrency(stats.overdue)} icon={<AlertTriangle size={16} />} accent="rose" />
            </div>

            {/* Tabs + Search + New Invoice */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '20px',
              padding: isSm ? '6px 8px' : '6px',
              borderRadius: '16px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
            }}>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {statusTabs.map((tab) => (
                  <m.button
                    key={tab.id}
                    onClick={() => setStatusTab(tab.id)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 16px',
                      borderRadius: '9999px',
                      fontSize: '13px',
                      fontWeight: 660,
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      background: statusTab === tab.id ? 'linear-gradient(135deg, rgba(0,103,224,0.12), rgba(0,103,224,0.08))' : 'transparent',
                      color: statusTab === tab.id ? '#0067e0' : 'rgba(100,116,139,0.8)',
                    }}
                  >
                    {tab.label}
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      fontSize: '11px',
                      fontWeight: 700,
                      background: statusTab === tab.id ? 'rgba(0,103,224,0.12)' : 'rgba(148,163,184,0.15)',
                      color: statusTab === tab.id ? '#0067e0' : 'rgba(100,116,139,0.6)',
                    }}>{tab.count}</span>
                  </m.button>
                ))}
              </div>

              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 14px',
                  borderRadius: '13px',
                  background: 'var(--bg-subtle)',
                  border: '1.5px solid #e2e8f0',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                }}>
                  <Search size={13} style={{ color: 'rgba(148,163,184,0.8)' }} />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search invoices\u2026"
                    style={{
                      flex: 1,
                      background: 'transparent',
                      fontSize: '13px',
                      fontWeight: 500,
                      outline: 'none',
                      border: 'none',
                      color: 'rgba(30,41,59,0.9)',
                    }}
                  />
                  {search && (
                    <button onClick={() => setSearch('')} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}>
                      <X size={12} style={{ color: 'rgba(148,163,184,0.8)' }} />
                    </button>
                  )}
                </div>
                <Button variant="primary" iconLeft={<Plus size={16} />} onClick={() => setShowCreateModal(true)}>New Invoice</Button>
              </div>
            </div>

            {/* Content Area */}
            {loading && invoices.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : error ? (
              <m.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingTop: '96px',
                  paddingBottom: '96px',
                  textAlign: 'center',
                }}
              >
                <div style={{
                  display: 'flex',
                  height: '80px',
                  width: '80px',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '24px',
                  background: 'rgba(220,38,38,0.08)',
                  marginBottom: '20px',
                }}>
                  <AlertTriangle size={36} style={{ color: '#dc2626' }} />
                </div>
                <p style={{
                  fontSize: '20px',
                  fontWeight: 780,
                  letterSpacing: '-0.03em',
                  color: 'rgba(30,41,59,0.9)',
                }}>Failed to load invoices</p>
                <p style={{
                  marginTop: '8px',
                  maxWidth: '320px',
                  fontSize: '14px',
                  color: 'rgba(148,163,184,0.8)',
                }}>{error}</p>
                <div style={{ marginTop: '24px' }}>
                  <Button variant="primary" iconLeft={<RefreshCw size={16} />} onClick={fetchInvoices}>Retry</Button>
                </div>
              </m.div>
            ) : (
              <AnimatePresence mode="wait">
                {invoices.length === 0 ? (
                  <m.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingTop: '96px',
                      paddingBottom: '96px',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      height: '80px',
                      width: '80px',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '24px',
                      background: 'rgba(0,103,224,0.08)',
                      marginBottom: '20px',
                    }}>
                      <FileText size={36} style={{ color: '#0067e0' }} />
                    </div>
                    <p style={{
                      fontSize: '20px',
                      fontWeight: 780,
                      letterSpacing: '-0.03em',
                      color: 'rgba(30,41,59,0.9)',
                    }}>No invoices found</p>
                    <p style={{
                      marginTop: '8px',
                      maxWidth: '320px',
                      fontSize: '14px',
                      color: 'rgba(148,163,184,0.8)',
                    }}>
                      {search ? 'Try adjusting your search terms.' : 'Create your first invoice to start tracking payments.'}
                    </p>
                    <div style={{ marginTop: '24px' }}>
                      <Button variant="primary" iconLeft={<Plus size={16} />} onClick={() => setShowCreateModal(true)}>Create Invoice</Button>
                    </div>
                  </m.div>
                ) : (
                  <m.div
                    key="list"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
                  >
                    {invoices.map((invoice, i) => (
                      <InvoiceCard key={invoice.id} invoice={invoice} index={i} onView={() => setSelectedInvoice(invoice)} onDownload={handleDownloadPDF} onRemind={handleSendReminder} />
                    ))}
                  </m.div>
                )}
              </AnimatePresence>
            )}
          </div>

          <PremiumModal
            open={!!selectedInvoice}
            onClose={() => setSelectedInvoice(null)}
            title={`Invoice ${selectedInvoice?.id}`}
            subtitle={selectedInvoice?.memberName}
            icon={<Receipt size={16} />}
            size="lg"
            footer={
              <>
                <Button variant="ghost" onClick={() => setSelectedInvoice(null)}>Close</Button>
                <Button variant="primary" iconLeft={<Download size={16} />} onClick={() => selectedInvoice && handleDownloadPDF(selectedInvoice)}>Download PDF</Button>
              </>
            }
          >
            {selectedInvoice && <InvoiceDetail invoice={selectedInvoice} onDownload={handleDownloadPDF} onRemind={handleSendReminder} onMarkPaid={handleMarkPaid} />}
          </PremiumModal>

          <PremiumModal
            open={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            title="Create Invoice"
            subtitle="New billing entry"
            icon={<Plus size={16} />}
            footer={
              <>
                <Button variant="ghost" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                <Button variant="primary" onClick={handleCreateInvoice} disabled={creating || !createForm.memberName || !createForm.amount || !createForm.dueDate}>
                  {creating ? 'Creating…' : 'Create Invoice'}
                </Button>
              </>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {([
                ['Member Name', 'memberName', 'text', 'e.g. Rahul Sharma'],
                ['Amount (₹)', 'amount', 'number', 'e.g. 5000'],
                ['Due Date', 'dueDate', 'date', ''],
                ['Description', 'description', 'text', 'e.g. Monthly membership fee'],
              ] as [string, keyof Omit<CreateForm, 'paymentMethod'>, string, string][]).map(([label, key, type, placeholder]) => (
                <div key={key}>
                  <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8' }}>{label}</label>
                  <input
                    type={type}
                    value={createForm[key]}
                    onChange={e => setCreateForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    style={{ display: 'block', width: '100%', marginTop: 6, padding: '10px 14px', borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none', background: 'var(--bg-subtle)', boxSizing: 'border-box' }}
                  />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8' }}>Payment Method</label>
                <select
                  value={createForm.paymentMethod}
                  onChange={e => setCreateForm(f => ({ ...f, paymentMethod: e.target.value as PaymentMethod }))}
                  style={{ display: 'block', width: '100%', marginTop: 6, padding: '10px 14px', borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none', background: 'var(--bg-subtle)' }}
                >
                  {Object.entries(PAYMENT_ICONS).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </PremiumModal>
        </div>
      </AppShell>
    </Guard>
  );
}

/* ────────── Invoice Card ────────── */

function InvoiceCard({ invoice, index, onView, onDownload, onRemind }: { invoice: Invoice; index: number; onView: () => void; onDownload: (i: Invoice) => void; onRemind: (i: Invoice) => void }) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [hoveredItem, setHoveredItem] = React.useState<string | null>(null);
  const isSm = useBreakpoint('(min-width: 640px)');

  const statusCfg: Record<InvoiceStatus, { color: string; bg: string; dot: string }> = {
    paid: { color: '#059669', bg: 'rgba(5,150,105,0.08)', dot: '#10b981' },
    pending: { color: '#d97706', bg: 'rgba(217,119,6,0.08)', dot: '#f59e0b' },
    overdue: { color: '#dc2626', bg: 'rgba(220,38,38,0.08)', dot: '#ef4444' },
    draft: { color: 'var(--text-muted)', bg: 'rgba(100,116,139,0.08)', dot: '#94a3b8' },
    cancelled: { color: 'rgba(148,163,184,0.6)', bg: 'rgba(148,163,184,0.12)', dot: '#cbd5e1' },
  };

  const cfg = statusCfg[invoice.status];

  return (
    <m.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
      layout
      style={{
        display: 'flex',
        flexDirection: isSm ? 'row' : 'column',
        alignItems: isSm ? 'center' : undefined,
        gap: '16px',
        borderRadius: '18px',
        padding: '16px 20px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
        position: 'relative',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.boxShadow = '0 8px 28px rgba(0,0,0,0.08)';
        el.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.boxShadow = '0 2px 12px rgba(0,0,0,0.04)';
        el.style.transform = 'translateY(0)';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: 0 }}>
        <Avatar name={invoice.memberName} photoUrl={invoice.memberPhoto} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
            <p style={{
              fontSize: '14px',
              fontWeight: 720,
              letterSpacing: '-0.01em',
              color: 'var(--text-primary)',
            }}>{invoice.memberName}</p>
            <span style={{
              fontSize: '11px',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '9999px',
              background: cfg.bg,
              color: cfg.color,
              border: `1px solid ${cfg.color}20`,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              <span style={{
                display: 'inline-block',
                height: '6px',
                width: '6px',
                borderRadius: '50%',
                background: cfg.dot,
              }} />
              {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
            </span>
            {invoice.paymentMethod && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px',
                borderRadius: '9999px',
                fontSize: '10px',
                fontWeight: 660,
                background: 'rgba(0,103,224,0.08)',
                color: '#0067e0',
              }}>
                <CreditCard size={9} /> {PAYMENT_ICONS[invoice.paymentMethod].label}
              </span>
            )}
          </div>
          <p style={{
            marginTop: '2px',
            fontSize: '12.5px',
            color: '#64748b',
          }}>{invoice.description}</p>
        </div>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: isSm ? '24px' : '16px',
      }}>
        <div style={{ textAlign: 'right' }}>
          <p style={{
            fontSize: '16px',
            fontWeight: 780,
            letterSpacing: '-0.02em',
            color: 'var(--text-primary)',
          }}>{fmtCurrency(invoice.amount)}</p>
          <p style={{
            fontSize: '11px',
            color: '#64748b',
          }}>{invoice.date}</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <m.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onView}
            style={{
              display: 'flex',
              height: '32px',
              width: '32px',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              background: 'var(--bg-subtle)',
            }}
            title="View Invoice"
          >
            <Eye size={14} style={{ color: 'rgba(100,116,139,0.7)' }} />
          </m.button>
          <m.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onDownload(invoice)}
            style={{
              display: 'flex',
              height: '32px',
              width: '32px',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              background: 'var(--bg-subtle)',
            }}
            title="Download PDF"
          >
            <Download size={14} style={{ color: 'rgba(100,116,139,0.7)' }} />
          </m.button>
          <div style={{ position: 'relative' }}>
            <m.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setMenuOpen((o) => !o)}
              style={{
                display: 'flex',
                height: '32px',
                width: '32px',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                background: 'var(--bg-subtle)',
              }}
            >
              <MoreHorizontal size={14} style={{ color: 'rgba(100,116,139,0.7)' }} />
            </m.button>
            <AnimatePresence>
              {menuOpen && (
                <m.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: 0.12 }}
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: '40px',
                    zIndex: 50,
                    minWidth: '180px',
                    overflow: 'hidden',
                    borderRadius: '14px',
                    padding: '4px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    boxShadow: '0 12px 32px rgba(15,23,42,0.14)',
                  }}
                >
                  {[
                    { icon: <Eye size={13} />, label: 'View Details', action: 'view', color: 'rgba(15,23,42,0.9)' },
                    { icon: <Download size={13} />, label: 'Download PDF', action: 'download', color: 'rgba(15,23,42,0.9)' },
                    { icon: <Send size={13} />, label: 'Send Reminder', action: 'remind', color: 'rgba(15,23,42,0.9)' },
                    { icon: <CheckCircle2 size={13} />, label: 'Mark as Paid', action: 'mark-paid', color: '#059669' },
                  ].map((item) => (
                    <button
                      key={item.action}
                      onClick={() => {
                        setMenuOpen(false);
                        if (item.action === 'view') onView();
                        else if (item.action === 'download') onDownload(invoice);
                        else if (item.action === 'remind') onRemind(invoice);
                      }}
                      onMouseEnter={() => setHoveredItem(item.action)}
                      onMouseLeave={() => setHoveredItem(null)}
                      style={{
                        display: 'flex',
                        width: '100%',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        fontSize: '12.5px',
                        fontWeight: 580,
                        border: 'none',
                        cursor: 'pointer',
                        background: hoveredItem === item.action ? 'rgba(241,245,249,0.8)' : 'transparent',
                        color: item.color,
                        transition: 'background 0.15s ease',
                      }}
                    >
                      {item.icon} {item.label}
                    </button>
                  ))}
                </m.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </m.div>
  );
}

/* ────────── Invoice Detail ────────── */

function InvoiceDetail({ invoice, onDownload, onRemind, onMarkPaid }: { invoice: Invoice; onDownload: (i: Invoice) => void; onRemind: (i: Invoice) => void; onMarkPaid: (i: Invoice) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '16px',
      }}>
        {[
          { label: 'Invoice ID', value: invoice.id },
          { label: 'Amount', value: fmtCurrency(invoice.amount) },
          { label: 'Issue Date', value: invoice.date },
          { label: 'Due Date', value: invoice.dueDate },
        ].map((field) => (
          <div key={field.label} style={{
            padding: '16px',
            borderRadius: '14px',
            background: 'rgba(241,245,249,0.6)',
            border: '1px solid rgba(226,232,240,0.5)',
          }}>
            <p style={{
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'rgba(148,163,184,0.8)',
            }}>{field.label}</p>
            <p style={{
              marginTop: '6px',
              fontSize: '15px',
              fontWeight: 720,
              color: 'var(--text-primary)',
            }}>{field.value}</p>
          </div>
        ))}
      </div>

      <div>
        <p style={{
          marginBottom: '12px',
          fontSize: '12px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: 'rgba(148,163,184,0.8)',
        }}>Invoice Timeline</p>
        <div style={{ position: 'relative' }}>
          {invoice.timeline.map((item, i) => (
            <m.div
              key={item.action}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              style={{
                position: 'relative',
                display: 'flex',
                gap: '16px',
                paddingBottom: i < invoice.timeline.length - 1 ? '24px' : 0,
                paddingLeft: '24px',
              }}
            >
              <div style={{
                position: 'absolute',
                left: 0,
                top: '4px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}>
                <div style={{
                  display: 'flex',
                  height: '20px',
                  width: '20px',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  background: item.done ? '#10b981' : 'transparent',
                  border: item.done ? 'none' : '2px solid rgb(203,213,225)',
                }}>
                  {item.done && <CheckCircle2 size={12} style={{ color: '#fff' }} />}
                </div>
                {i < invoice.timeline.length - 1 && (
                  <div style={{
                    marginTop: '4px',
                    width: '1px',
                    flex: 1,
                    background: item.done ? 'rgb(167,243,208)' : 'rgb(226,232,240)',
                  }} />
                )}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{
                  fontSize: '13.5px',
                  fontWeight: 640,
                  color: item.done ? '#0f172a' : 'rgba(148,163,184,0.8)',
                }}>{item.action}</p>
                <p style={{
                  marginTop: '2px',
                  fontSize: '12px',
                  color: 'rgba(148,163,184,0.8)',
                }}>{item.date}</p>
              </div>
            </m.div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <Button variant="primary" iconLeft={<Download size={16} />} size="sm" onClick={() => onDownload(invoice)}>Download PDF</Button>
        {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
          <Button variant="outline" iconLeft={<Send size={16} />} size="sm" onClick={() => onRemind(invoice)}>Send Reminder</Button>
        )}
        {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
          <Button variant="success" iconLeft={<CheckCircle2 size={16} />} size="sm" onClick={() => onMarkPaid(invoice)}>Mark as Paid</Button>
        )}
      </div>
    </div>
  );
}
