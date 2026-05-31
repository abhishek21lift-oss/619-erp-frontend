'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { PremiumButton } from '@/components/premium/PremiumButton';
import { PremiumModal } from '@/components/premium/PremiumModal';
import { FloatingPanel } from '@/components/premium/FloatingPanel';
import {
  IndianRupee, Search, ChevronDown, Check, X, CreditCard,
  Smartphone, Banknote, Zap, Shield, FileText, Receipt,
  CheckCircle2, SplitSquareHorizontal, Percent, Wallet,
  PenSquare, ArrowRight, User,
  RefreshCw, Link2,
  Plus, Printer,
} from 'lucide-react';
import { api } from '@/lib/api';

type PaymentMethod = 'upi' | 'card' | 'cash' | 'razorpay' | 'stripe';

interface Member {
  id: string;
  name: string;
  email: string;
  plan?: string;
}

interface Invoice {
  id: string;
  amount: number;
  date: string;
  status: string;
}

const PAYMENT_METHODS: { id: PaymentMethod; label: string; icon: React.ReactNode; color: string; bg: string }[] = [
  { id: 'upi', label: 'UPI', icon: <Smartphone className="h-5 w-5" />, color: '#7c3aed', bg: 'rgba(124,58,237,0.08)' },
  { id: 'card', label: 'Credit/Debit Card', icon: <CreditCard className="h-5 w-5" />, color: '#0ea5e9', bg: 'rgba(14,165,233,0.08)' },
  { id: 'cash', label: 'Cash', icon: <Banknote className="h-5 w-5" />, color: '#10b981', bg: 'rgba(16,185,129,0.08)' },
  { id: 'razorpay', label: 'Razorpay', icon: <Zap className="h-5 w-5" />, color: '#6366f1', bg: 'rgba(99,102,241,0.08)' },
  { id: 'stripe', label: 'Stripe', icon: <Shield className="h-5 w-5" />, color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)' },
];

const AVATAR_COLORS = ['#dc2626', '#7c3aed', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899'];

function initials(name: string): string {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function fmtCurrency(n: number): string {
  return '₹' + n.toLocaleString('en-IN');
}

export default function RecordPaymentPage() {
  const [step, setStep] = React.useState<'form' | 'success'>('form');
  const [selectedMember, setSelectedMember] = React.useState<Member | null>(null);
  const [memberSearchOpen, setMemberSearchOpen] = React.useState(false);
  const [memberQuery, setMemberQuery] = React.useState('');
  const [selectedInvoice, setSelectedInvoice] = React.useState<Invoice | null>(null);
  const [invoiceOpen, setInvoiceOpen] = React.useState(false);
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>('upi');
  const [amount, setAmount] = React.useState('');
  const [splitPayment, setSplitPayment] = React.useState(false);
  const [splitRows, setSplitRows] = React.useState<{ method: PaymentMethod; amount: string }[]>([
    { method: 'upi', amount: '' },
  ]);
  const [partialPayment, setPartialPayment] = React.useState(false);
  const [notes, setNotes] = React.useState('');
  const [generateReceipt, setGenerateReceipt] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [showInvoicePanel, setShowInvoicePanel] = React.useState(false);
  const [members, setMembers] = React.useState<Member[]>([]);
  const [invoices, setInvoices] = React.useState<Invoice[]>([]);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [clientsData, invoicesData] = await Promise.all([
          api.clients.list(),
          api.invoices.list({ status: 'pending' }),
        ]);
        const raw = clientsData as any;
        const memberList = Array.isArray(raw)
          ? raw
          : raw?.data
            ? (Array.isArray(raw.data) ? raw.data : [])
            : raw?.clients
              ? (Array.isArray(raw.clients) ? raw.clients : [])
              : [];
        setMembers(memberList as Member[]);
        setInvoices((invoicesData as { invoices: Invoice[] }).invoices || []);
      } catch (err) {
        console.error('Failed to load data', err);
      }
    };
    fetchData();
  }, []);

  const filteredMembers = members.filter((m) =>
    m.name.toLowerCase().includes(memberQuery.toLowerCase()) ||
    m.email.toLowerCase().includes(memberQuery.toLowerCase())
  );

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!selectedMember) errs.member = 'Please select a member';
    if (!amount || parseFloat(amount) <= 0) errs.amount = 'Enter a valid amount';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const paymentData: Record<string, unknown> = {
        client_id: selectedMember!.id,
        amount: parseFloat(amount),
        method: paymentMethod,
        date: new Date().toISOString().split('T')[0],
        notes: notes || undefined,
        generate_receipt: generateReceipt,
      };
      if (selectedInvoice) paymentData.invoice_id = selectedInvoice.id;
      if (splitPayment) {
        paymentData.splits = splitRows.map((r) => ({
          method: r.method,
          amount: parseFloat(r.amount),
        }));
      }
      await api.payments.create(paymentData);
      setStep('success');
      setTimeout(() => {
        setStep('form');
        setSelectedMember(null);
        setSelectedInvoice(null);
        setAmount('');
        setNotes('');
        setPartialPayment(false);
        setSplitPayment(false);
        setSplitRows([{ method: 'upi', amount: '' }]);
      }, 3000);
    } catch (err) {
      console.error('Payment failed', err);
    } finally {
      setSaving(false);
    }
  };

  const addSplitRow = () => {
    setSplitRows([...splitRows, { method: 'upi', amount: '' }]);
  };

  const updateSplitRow = (index: number, field: 'method' | 'amount', value: string) => {
    const updated = [...splitRows];
    if (field === 'method') {
      updated[index].method = value as PaymentMethod;
    } else {
      updated[index].amount = value;
    }
    setSplitRows(updated);
  };

  const removeSplitRow = (index: number) => {
    if (splitRows.length > 1) {
      setSplitRows(splitRows.filter((_, i) => i !== index));
    }
  };

  return (
    <Guard role="admin">
      <AppShell>
        <div className="min-h-screen" style={{ background: 'linear-gradient(145deg,#f8fafc 0%,#f1f5f9 50%,#fafafe 100%)' }}>
          <Header />

          <div className="mx-auto max-w-4xl px-4 pb-28 pt-6 sm:px-6">
            <AnimatePresence mode="wait">
              {step === 'success' ? (
                <SuccessAnimation key="success" />
              ) : (
                <motion.div key="form" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
                  {/* Member Selector */}
                  <SectionCard icon={<User className="h-4 w-4" />} title="Member" subtitle="Select the member making the payment" className={memberSearchOpen ? 'relative z-20' : ''}>
                    <MemberSelector
                      selected={selectedMember}
                      onSelect={(m) => { setSelectedMember(m); setMemberSearchOpen(false); }}
                      open={memberSearchOpen}
                      setOpen={setMemberSearchOpen}
                      query={memberQuery}
                      setQuery={setMemberQuery}
                      filtered={filteredMembers}
                    />
                    {errors.member && <p className="mt-1.5 text-[12px] font-[600]" style={{ color: '#ef4444' }}>{errors.member}</p>}
                  </SectionCard>

                  {/* Invoice Linking */}
                  <SectionCard icon={<Receipt className="h-4 w-4" />} title="Link Invoice" subtitle="Associate payment with an existing invoice">
                    <button
                      onClick={() => setShowInvoicePanel(true)}
                      className="flex w-full items-center gap-3 rounded-[13px] px-4 py-3.5 text-left transition-all"
                      style={{
                        background: selectedInvoice ? 'var(--bg-card)' : 'var(--bg-subtle)',
                        border: selectedInvoice ? '1.5px solid rgba(99,102,241,0.40)' : '1.5px solid rgba(15,23,42,0.09)',
                      }}
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px]" style={{ background: selectedInvoice ? 'rgba(99,102,241,0.08)' : 'var(--border)' }}>
                        {selectedInvoice ? <Receipt size={15} style={{ color: '#6366f1' }} /> : <Link2 size={15} style={{ color: 'rgb(148,163,184)' }} />}
                      </div>
                      <div className="flex-1">
                        {selectedInvoice ? (
                          <>
                            <p className="text-[13.5px] font-[620]" style={{ color: 'rgb(15,23,42)' }}>{selectedInvoice.id} — {fmtCurrency(selectedInvoice.amount)}</p>
                            <p className="text-[11.5px]" style={{ color: 'rgb(148,163,184)' }}>{selectedInvoice.date}</p>
                          </>
                        ) : (
                          <span className="text-[13px]" style={{ color: 'rgb(148,163,184)' }}>Select an invoice to link (optional)</span>
                        )}
                      </div>
                      <ChevronDown size={14} style={{ color: 'rgb(148,163,184)' }} />
                    </button>
                  </SectionCard>

                  {/* Payment Method */}
                  <SectionCard icon={<Wallet className="h-4 w-4" />} title="Payment Method" subtitle="Choose how the payment is being made">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                      {PAYMENT_METHODS.map((method) => {
                        const active = paymentMethod === method.id;
                        return (
                          <motion.button
                            key={method.id}
                            onClick={() => setPaymentMethod(method.id)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="flex flex-col items-center gap-2 rounded-[16px] p-4 text-center transition-all"
                            style={{
                              background: active ? method.bg : 'var(--bg-card)',
                              border: active ? `1.5px solid ${method.color}35` : '1px solid rgba(15,23,42,0.07)',
                              boxShadow: active ? `0 0 0 2px ${method.color}14` : '0 1px 4px rgba(15,23,42,0.04)',
                            }}
                          >
                            <div className="flex h-11 w-11 items-center justify-center rounded-[12px] transition-all"
                              style={{ background: active ? method.color : 'var(--border)', color: active ? 'white' : 'rgb(148,163,184)' }}>
                              {method.icon}
                            </div>
                            <span className="text-[11px] font-[660]" style={{ color: active ? method.color : 'rgb(100,116,139)' }}>{method.label}</span>
                            {active && <Check size={10} className="text-current" />}
                          </motion.button>
                        );
                      })}
                    </div>
                  </SectionCard>

                  {/* Amount */}
                  <SectionCard icon={<IndianRupee className="h-4 w-4" />} title="Payment Amount" subtitle={partialPayment ? 'Partial amount being paid' : 'Total payment amount'}>
                    <div className="relative">
                      <div
                        className="relative overflow-hidden rounded-[13px] transition-all"
                        style={{
                          background: 'var(--bg-subtle)',
                          border: errors.amount ? '1.5px solid rgba(239,68,68,0.40)' : '1.5px solid rgba(15,23,42,0.09)',
                          boxShadow: errors.amount ? '0 0 0 3px rgba(239,68,68,0.08)' : '0 1px 2px rgba(15,23,42,0.04)',
                        }}
                      >
                        <div className="flex items-center px-4 py-4">
                          <span className="text-[18px] font-[800]" style={{ color: 'rgb(148,163,184)' }}>₹</span>
                          <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            className="w-full bg-transparent px-3 text-[22px] font-[800] tracking-tight outline-none"
                            style={{ color: 'rgb(15,23,42)' }}
                          />
                        </div>
                      </div>
                      {errors.amount && <p className="mt-1.5 text-[12px] font-[600]" style={{ color: '#ef4444' }}>{errors.amount}</p>}
                    </div>

                    {/* Quick amounts */}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {[5000, 10000, 17500, 28500, 45000].map((val) => (
                        <motion.button
                          key={val}
                          onClick={() => setAmount(val.toString())}
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          className="rounded-full border px-3.5 py-1.5 text-[12px] font-[600] transition-all"
                          style={{
                            background: amount === val.toString() ? 'rgba(220,38,38,0.08)' : 'var(--bg-card)',
                            borderColor: amount === val.toString() ? 'rgba(220,38,38,0.25)' : 'var(--border)',
                            color: amount === val.toString() ? '#dc2626' : 'rgb(100,116,139)',
                          }}
                        >
                          {fmtCurrency(val)}
                        </motion.button>
                      ))}
                    </div>
                  </SectionCard>

                  {/* Toggles */}
                  <SectionCard icon={<SplitSquareHorizontal className="h-4 w-4" />} title="Payment Options" subtitle="Configure additional payment settings">
                    <div className="space-y-4">
                      {/* Partial Payment */}
                      <div className="flex items-center justify-between rounded-[14px] border border-zinc-200/70 bg-white/85 p-4">
                        <div className="flex items-start gap-3">
                          <Percent className="mt-0.5 h-5 w-5" style={{ color: partialPayment ? '#dc2626' : 'rgb(148,163,184)' }} />
                          <div>
                            <p className="text-[13px] font-[660]" style={{ color: 'rgb(15,23,42)' }}>Partial Payment</p>
                            <p className="text-[12px]" style={{ color: 'rgb(148,163,184)' }}>Allow paying less than the full invoice amount</p>
                          </div>
                        </div>
                        <motion.button
                          onClick={() => setPartialPayment(!partialPayment)}
                          whileTap={{ scale: 0.95 }}
                          className="flex h-7 w-12 items-center rounded-full p-1 transition-all"
                          style={{ background: partialPayment ? '#dc2626' : 'rgb(203,213,225)' }}
                        >
                          <motion.div
                            animate={{ x: partialPayment ? 20 : 0 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                            className="h-5 w-5 rounded-full bg-white shadow-sm"
                          />
                        </motion.button>
                      </div>

                      {/* Split Payment */}
                      <div className="rounded-[14px] border border-zinc-200/70 bg-white/85 p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-start gap-3">
                            <SplitSquareHorizontal className="mt-0.5 h-5 w-5" style={{ color: splitPayment ? '#dc2626' : 'rgb(148,163,184)' }} />
                            <div>
                              <p className="text-[13px] font-[660]" style={{ color: 'rgb(15,23,42)' }}>Split Payment</p>
                              <p className="text-[12px]" style={{ color: 'rgb(148,163,184)' }}>Divide payment across multiple methods</p>
                            </div>
                          </div>
                          <motion.button
                            onClick={() => setSplitPayment(!splitPayment)}
                            whileTap={{ scale: 0.95 }}
                            className="flex h-7 w-12 items-center rounded-full p-1 transition-all"
                            style={{ background: splitPayment ? '#dc2626' : 'rgb(203,213,225)' }}
                          >
                            <motion.div
                              animate={{ x: splitPayment ? 20 : 0 }}
                              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                              className="h-5 w-5 rounded-full bg-white shadow-sm"
                            />
                          </motion.button>
                        </div>

                        <AnimatePresence>
                          {splitPayment && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="mt-4 space-y-3 overflow-hidden"
                            >
                              {splitRows.map((row, i) => (
                                <div key={i} className="flex items-center gap-3">
                                  <select
                                    value={row.method}
                                    onChange={(e) => updateSplitRow(i, 'method', e.target.value)}
                                    className="rounded-[10px] border border-zinc-200 bg-white px-3 py-2.5 text-[13px] font-[500] outline-none"
                                    style={{ color: 'rgb(15,23,42)' }}
                                  >
                                    {PAYMENT_METHODS.map((m) => (
                                      <option key={m.id} value={m.id}>{m.label}</option>
                                    ))}
                                  </select>
                                  <div className="relative flex-1">
                                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] font-[600]" style={{ color: 'rgb(148,163,184)' }}>₹</span>
                                    <input
                                      type="number"
                                      value={row.amount}
                                      onChange={(e) => updateSplitRow(i, 'amount', e.target.value)}
                                      placeholder="Amount"
                                      className="w-full rounded-[10px] border border-zinc-200 bg-white px-7 py-2.5 text-[13px] font-[500] outline-none"
                                      style={{ color: 'rgb(15,23,42)' }}
                                    />
                                  </div>
                                  <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => removeSplitRow(i)}
                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] transition" style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444' }}
                                  >
                                    <X size={14} />
                                  </motion.button>
                                </div>
                              ))}
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={addSplitRow}
                                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12px] font-[660] transition-all"
                                style={{ background: 'rgba(99,102,241,0.08)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.2)' }}
                              >
                                <Plus size={13} /> Add Payment Method
                              </motion.button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Receipt Toggle */}
                      <div className="flex items-center justify-between rounded-[14px] border border-zinc-200/70 bg-white/85 p-4">
                        <div className="flex items-start gap-3">
                          <Printer className="mt-0.5 h-5 w-5" style={{ color: generateReceipt ? '#dc2626' : 'rgb(148,163,184)' }} />
                          <div>
                            <p className="text-[13px] font-[660]" style={{ color: 'rgb(15,23,42)' }}>Generate Receipt</p>
                            <p className="text-[12px]" style={{ color: 'rgb(148,163,184)' }}>Auto-generate a payment receipt for the member</p>
                          </div>
                        </div>
                        <motion.button
                          onClick={() => setGenerateReceipt(!generateReceipt)}
                          whileTap={{ scale: 0.95 }}
                          className="flex h-7 w-12 items-center rounded-full p-1 transition-all"
                          style={{ background: generateReceipt ? '#dc2626' : 'rgb(203,213,225)' }}
                        >
                          <motion.div
                            animate={{ x: generateReceipt ? 20 : 0 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                            className="h-5 w-5 rounded-full bg-white shadow-sm"
                          />
                        </motion.button>
                      </div>
                    </div>
                  </SectionCard>

                  {/* Notes */}
                  <SectionCard icon={<PenSquare className="h-4 w-4" />} title="Payment Notes" subtitle="Optional notes for this transaction">
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add a note about this payment…"
                      rows={3}
                      className="w-full rounded-[13px] border border-zinc-200 bg-white/90 px-4 py-3 text-[13px] font-[500] outline-none transition-all placeholder:text-zinc-400 focus:border-[rgba(99,102,241,0.40)] focus:ring-[3px] focus:ring-[rgba(99,102,241,0.08)]"
                      style={{ color: 'rgb(15,23,42)', resize: 'none' }}
                    />
                  </SectionCard>

                  {/* Submit */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col gap-3 rounded-[24px] border border-white/60 bg-white/90 p-5 shadow-sm backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-[14px] font-[720]" style={{ color: 'rgb(15,23,42)' }}>
                        {selectedMember ? `Recording payment for ${selectedMember.name}` : 'Ready to record payment'}
                      </p>
                      <p className="mt-1 text-[12.5px]" style={{ color: 'rgb(148,163,184)' }}>
                        {amount ? `Amount: ${fmtCurrency(parseFloat(amount || '0'))}` : 'Enter an amount to continue'}
                      </p>
                    </div>
                    <PremiumButton
                      tone="primary"
                      size="lg"
                      loading={saving}
                      glow
                      icon={saving ? undefined : <CheckCircle2 className="h-5 w-5" />}
                      onClick={handleSubmit}
                    >
                      {saving ? 'Processing Payment…' : `Record Payment ${amount ? fmtCurrency(parseFloat(amount || '0')) : ''}`}
                    </PremiumButton>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <FloatingPanel
            open={showInvoicePanel}
            onClose={() => setShowInvoicePanel(false)}
            title="Link Invoice"
            subtitle="Select an invoice to associate with this payment"
            icon={<Receipt className="h-4 w-4" />}
            size="sm"
          >
            <div className="space-y-2">
              {invoices.map((inv) => (
                <motion.button
                  key={inv.id}
                  onClick={() => { setSelectedInvoice(inv); setShowInvoicePanel(false); }}
                  whileHover={{ scale: 1.01 }}
                  className="flex w-full items-center justify-between rounded-[14px] border border-zinc-100 p-4 text-left transition-all hover:shadow-sm"
                  style={{
                    background: selectedInvoice?.id === inv.id ? 'rgba(99,102,241,0.06)' : 'white',
                    borderColor: selectedInvoice?.id === inv.id ? 'rgba(99,102,241,0.25)' : 'var(--border)',
                  }}
                >
                  <div>
                    <p className="text-[14px] font-[680]" style={{ color: 'rgb(15,23,42)' }}>{inv.id}</p>
                    <p className="mt-0.5 text-[12px]" style={{ color: 'rgb(148,163,184)' }}>{inv.date} · {inv.status}</p>
                  </div>
                  <p className="text-[15px] font-[760]" style={{ color: 'rgb(15,23,42)' }}>{fmtCurrency(inv.amount)}</p>
                </motion.button>
              ))}
              <button
                onClick={() => { setSelectedInvoice(null); setShowInvoicePanel(false); }}
                className="flex w-full items-center justify-center gap-2 rounded-[14px] py-3 text-[13px] font-[660] transition hover:bg-zinc-50"
                style={{ color: 'rgb(148,163,184)' }}
              >
                <X size={13} /> Clear selection
              </button>
            </div>
          </FloatingPanel>
        </div>
      </AppShell>
    </Guard>
  );
}

function Header() {
  return (
    <div className="border-b" style={{ background: 'var(--bg-card)', backdropFilter: 'blur(20px)', borderColor: 'var(--border)' }}>
      <div className="mx-auto max-w-4xl px-5 py-6 sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-[12px]" style={{ background: 'rgba(220,38,38,0.10)' }}>
                <Wallet size={16} style={{ color: '#dc2626' }} />
              </div>
              <h1 className="text-[22px] font-[860] tracking-[-0.03em]" style={{ color: 'rgb(15,23,42)' }}>Record Payment</h1>
            </div>
            <p className="mt-1.5 text-[13px]" style={{ color: 'rgb(148,163,184)' }}>Record and reconcile member payments.</p>
            <div className="mt-2 flex items-center gap-2 text-[12px]" style={{ color: 'rgb(148,163,184)' }}>
              <span>Finance</span>
              <ChevronDown size={10} className="-rotate-90" />
              <span style={{ color: '#dc2626', fontWeight: 600 }}>Record Payment</span>
            </div>
          </div>
          <div className="flex gap-2">
            <PremiumButton tone="secondary" icon={<RefreshCw className="h-4 w-4" />}>Reset</PremiumButton>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionCard({ icon, title, subtitle, children, className = '' }: { icon: React.ReactNode; title: string; subtitle: string; children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-[22px] bg-white/85 p-5 shadow-[0_2px_20px_rgba(15,23,42,0.06)] backdrop-blur-xl transition-all duration-200 hover:shadow-[0_6px_24px_rgba(15,23,42,0.09)] ${className}`}
      style={{ border: '1px solid rgba(255,255,255,0.95)' }}
    >
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-[10px]" style={{ background: 'rgba(220,38,38,0.08)', color: '#dc2626' }}>
          {icon}
        </div>
        <div>
          <p className="text-[14px] font-[760]" style={{ color: 'rgb(15,23,42)' }}>{title}</p>
          <p className="text-[11.5px]" style={{ color: 'rgb(148,163,184)' }}>{subtitle}</p>
        </div>
      </div>
      {children}
    </motion.div>
  );
}

function MemberSelector({
  selected, onSelect, open, setOpen, query, setQuery, filtered,
}: {
  selected: Member | null;
  onSelect: (m: Member) => void;
  open: boolean;
  setOpen: (v: boolean) => void;
  query: string;
  setQuery: (v: string) => void;
  filtered: Member[];
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 rounded-[13px] px-4 py-3.5 text-left transition-all"
        style={{
          background: open ? 'var(--bg-card)' : 'var(--bg-subtle)',
          border: open ? '1.5px solid rgba(99,102,241,0.40)' : '1.5px solid rgba(15,23,42,0.09)',
          boxShadow: open ? '0 0 0 3px rgba(99,102,241,0.08)' : '0 1px 2px rgba(15,23,42,0.04)',
        }}
      >
        {selected ? (
          <>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] text-[12px] font-[700] text-white" style={{ background: avatarColor(selected.name) }}>
              {initials(selected.name)}
            </div>
            <div className="flex-1">
              <p className="text-[13.5px] font-[620]" style={{ color: 'rgb(15,23,42)' }}>{selected.name}</p>
              <p className="text-[11.5px]" style={{ color: 'rgb(148,163,184)' }}>{selected.email}{selected.plan ? ` · ${selected.plan}` : ''}</p>
            </div>
          </>
        ) : (
          <>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px]" style={{ background: 'rgba(99,102,241,0.08)' }}>
              <User size={15} style={{ color: '#6366f1' }} />
            </div>
            <span className="text-[13px]" style={{ color: 'rgb(148,163,184)' }}>Search and select a member…</span>
          </>
        )}
        <ChevronDown size={14} style={{ color: 'rgb(148,163,184)', flexShrink: 0, transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 200ms' }} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-[14px] p-1"
            style={{ background: 'var(--bg-card)', border: '1px solid rgba(15,23,42,0.09)', boxShadow: '0 12px 32px rgba(15,23,42,0.12)' }}
          >
            <div className="flex items-center gap-2 rounded-[10px] px-3 py-2 mb-1" style={{ background: 'var(--bg-subtle)' }}>
              <Search size={12} style={{ color: 'rgb(148,163,184)' }} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search members…" className="flex-1 bg-transparent text-[12px] outline-none" style={{ color: 'rgb(30,30,40)' }} />
            </div>
            {selected && (
              <button onClick={() => { onSelect({} as Member); setOpen(false); }}
                className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-[12.5px] text-red-400 transition hover:bg-red-50">
                <X size={12} /> Clear selection
              </button>
            )}
            {filtered.map((m) => (
              <button key={m.id} onClick={() => { onSelect(m); setOpen(false); }}
                className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 transition hover:bg-slate-50"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] text-[11px] font-[700] text-white"
                  style={{ background: avatarColor(m.name) }}>{initials(m.name)}</div>
                <div className="flex-1 text-left">
                  <span className="text-[12.5px] font-[580]" style={{ color: 'rgb(30,30,40)' }}>{m.name}</span>
                  <p className="text-[10.5px]" style={{ color: 'rgb(148,163,184)' }}>{m.email}</p>
                </div>
                {selected?.id === m.id && <Check size={12} style={{ color: '#6366f1' }} />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SuccessAnimation() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 15 }}
        className="relative flex h-28 w-28 items-center justify-center rounded-[32px] mb-6"
        style={{ background: 'linear-gradient(135deg, #059669, #10b981)', boxShadow: '0 20px 60px rgba(5,150,105,0.30)' }}
      >
        <motion.div
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 0.3, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <CheckCircle2 size={56} className="text-white" strokeWidth={1.5} />
        </motion.div>
        {/* Confetti sparkles */}
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
            animate={{
              opacity: [0, 1, 0],
              x: [0, Math.cos((i * 30) * Math.PI / 180) * 80],
              y: [0, Math.sin((i * 30) * Math.PI / 180) * 80],
              scale: [0, 1.2, 0],
            }}
            transition={{ delay: 0.2 + i * 0.03, duration: 0.8, ease: 'easeOut' }}
            className="absolute h-3 w-3 rounded-full"
            style={{
              background: ['#dc2626', '#7c3aed', '#10b981', '#f59e0b', '#0ea5e9', '#ec4899'][i % 6],
            }}
          />
        ))}
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-[24px] font-[820] tracking-tight" style={{ color: 'rgb(15,23,42)' }}
      >
        Payment Recorded Successfully
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-2 text-[14px]" style={{ color: 'rgb(148,163,184)' }}
      >
        The payment has been recorded and receipt is ready.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mt-10 flex gap-3"
      >
        <PremiumButton tone="secondary" icon={<FileText className="h-4 w-4" />}>View Receipt</PremiumButton>
        <PremiumButton tone="primary" icon={<ArrowRight className="h-4 w-4" />}>Go to Invoices</PremiumButton>
      </motion.div>
    </motion.div>
  );
}
