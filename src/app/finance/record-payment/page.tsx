'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { PremiumButton } from '@/components/premium/PremiumButton';
import {
  IndianRupee, Search, ChevronDown, Check, X, CreditCard,
  Smartphone, Banknote, Zap, Shield, FileText, Receipt,
  CheckCircle2, SplitSquareHorizontal, Percent, Wallet,
  PenSquare, ArrowRight, User, RefreshCw, Link2, Plus,
  Printer, Sparkles, TrendingUp, CircleDot,
} from 'lucide-react';
import { api } from '@/lib/api';

type PaymentMethod = 'upi' | 'card' | 'cash' | 'razorpay' | 'stripe';

interface Member { id: string; name: string; email: string; plan?: string; }
interface Invoice { id: string; amount: number; date: string; status: string; }

const PAYMENT_METHODS: { id: PaymentMethod; label: string; icon: React.ReactNode; color: string; bg: string }[] = [
  { id: 'upi', label: 'UPI', icon: <Smartphone size={17} />, color: '#7c3aed', bg: 'rgba(124,58,237,0.12)' },
  { id: 'card', label: 'Card', icon: <CreditCard size={17} />, color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)' },
  { id: 'cash', label: 'Cash', icon: <Banknote size={17} />, color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  { id: 'razorpay', label: 'Razorpay', icon: <Zap size={17} />, color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
  { id: 'stripe', label: 'Stripe', icon: <Shield size={17} />, color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } }
};
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const } }
};

export default function RecordPaymentPage() {
  const [step, setStep] = React.useState<'form' | 'success'>('form');
  const [selectedMember, setSelectedMember] = React.useState<Member | null>(null);
  const [memberSearchOpen, setMemberSearchOpen] = React.useState(false);
  const [memberQuery, setMemberQuery] = React.useState('');
  const [selectedInvoice, setSelectedInvoice] = React.useState<Invoice | null>(null);
  const [showInvoicePanel, setShowInvoicePanel] = React.useState(false);
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>('upi');
  const [amount, setAmount] = React.useState('');
  const [splitPayment, setSplitPayment] = React.useState(false);
  const [splitRows, setSplitRows] = React.useState<{ method: PaymentMethod; amount: string }[]>([{ method: 'upi', amount: '' }]);
  const [partialPayment, setPartialPayment] = React.useState(false);
  const [notes, setNotes] = React.useState('');
  const [generateReceipt, setGenerateReceipt] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [members, setMembers] = React.useState<Member[]>([]);
  const [invoices, setInvoices] = React.useState<Invoice[]>([]);
  const [selectedBalance, setSelectedBalance] = React.useState<number | null>(null);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [clientsData, invoicesData] = await Promise.all([
          api.clients.list(),
          api.invoices.list({ status: 'pending' }),
        ]);
        const raw = clientsData as any;
        const memberList = Array.isArray(raw) ? raw : raw?.data ? (Array.isArray(raw.data) ? raw.data : []) : raw?.clients ? (Array.isArray(raw.clients) ? raw.clients : []) : [];
        setMembers(memberList as Member[]);
        setInvoices((invoicesData as { invoices: Invoice[] }).invoices || []);
      } catch (err) { console.error('Failed to load data', err); }
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
        client_id: selectedMember!.id, amount: parseFloat(amount), method: paymentMethod,
        date: new Date().toISOString().split('T')[0], notes: notes || undefined, generate_receipt: generateReceipt,
      };
      if (selectedInvoice) paymentData.invoice_id = selectedInvoice.id;
      if (splitPayment) paymentData.splits = splitRows.map((r) => ({ method: r.method, amount: parseFloat(r.amount) }));
      await api.payments.create(paymentData);
      setStep('success');
      setTimeout(() => {
        setStep('form'); setSelectedMember(null); setSelectedInvoice(null); setAmount(''); setNotes('');
        setPartialPayment(false); setSplitPayment(false); setSplitRows([{ method: 'upi', amount: '' }]);
      }, 3000);
    } catch (err) { console.error('Payment failed', err); }
    finally { setSaving(false); }
  };

  const addSplitRow = () => setSplitRows([...splitRows, { method: 'upi', amount: '' }]);
  const updateSplitRow = (index: number, field: 'method' | 'amount', value: string) => {
    const updated = [...splitRows];
    if (field === 'method') updated[index].method = value as PaymentMethod;
    else updated[index].amount = value;
    setSplitRows(updated);
  };
  const removeSplitRow = (index: number) => {
    if (splitRows.length > 1) setSplitRows(splitRows.filter((_, i) => i !== index));
  };

  const splitTotal = splitRows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const isValidSplit = Math.abs(splitTotal - (parseFloat(amount) || 0)) < 0.01;

  const totalInvoiced = invoices.reduce((s, i) => s + i.amount, 0);

  return (
    <Guard role="admin">
      <AppShell>
        <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
          {/* ── Hero ── */}
          <div style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, #0f0a1e 0%, #2a0a1a 25%, #1e0a2e 55%, #0f172a 100%)', padding: '40px 32px 36px', borderRadius: '0 0 40px 40px' }}>
            <motion.div style={{ position: 'absolute', top: -80, right: -20, width: 350, height: 350, borderRadius: '50%', background: 'radial-gradient(circle, rgba(220,38,38,0.12), transparent 70%)', pointerEvents: 'none' }}
              animate={{ x: [0, 30, -20, 0], y: [0, -40, 15, 0] }} transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }} />
            <motion.div style={{ position: 'absolute', bottom: -60, left: -30, width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(236,72,153,0.08), transparent 70%)', pointerEvents: 'none' }}
              animate={{ x: [0, -25, 20, 0], y: [0, 25, -10, 0] }} transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }} />
            <motion.div style={{ position: 'absolute', top: '25%', left: '50%', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.06), transparent 70%)', pointerEvents: 'none' }}
              animate={{ x: [0, 15, -10, 0], y: [0, -15, 8, 0] }} transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }} />
            <div style={{ position: 'absolute', inset: 0, opacity: 0.03, backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '22px 22px', pointerEvents: 'none' }} />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] as const }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 52, height: 52, borderRadius: 16, background: 'linear-gradient(135deg, #dc2626, #e11d48)', boxShadow: '0 8px 32px rgba(220,38,38,0.3)' }}>
                  <Wallet size={22} color="#fff" />
                </motion.div>
                <div>
                  <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #fda4af, #f43f5e, #dc2626)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Record Payment</h1>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>Record and reconcile member payments</p>
                </div>
              </div>
              <PremiumButton tone="secondary" size="sm" icon={<RefreshCw size={14} />}>Reset</PremiumButton>
            </div>
          </div>

          <div style={{ padding: '24px 32px', maxWidth: 800, margin: '0 auto' }}>
            {/* ── Quick Stats ── */}
            <motion.div variants={containerVariants} initial="hidden" animate="visible"
              style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
              {[
                { label: 'Total Members', value: members.length, icon: <User size={18} />, color: '#6366f1' },
                { label: 'Pending Invoices', value: invoices.length, icon: <FileText size={18} />, color: '#f59e0b' },
                { label: 'Total Receivable', value: fmtCurrency(totalInvoiced), icon: <TrendingUp size={18} />, color: '#10b981' },
              ].map((s, i) => (
                <motion.div key={s.label} variants={itemVariants} tabIndex={0} role="button"
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  style={{ background: 'white', borderRadius: 20, padding: '22px 24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: 12, position: 'relative', overflow: 'hidden', cursor: 'default', transition: 'all 200ms ease' }}
                  onMouseEnter={(e) => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = '0 8px 28px rgba(0,0,0,0.1)'; el.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={(e) => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)'; el.style.transform = 'translateY(0)'; }}>
                  <div style={{ position: 'absolute', top: 0, left: 24, right: 24, height: 3, background: `linear-gradient(90deg,${s.color},${s.color}88)`, borderRadius: '0 0 3px 3px', opacity: 0.8 }} />
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>{s.icon}</div>
                  <div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1 }}>{s.value}</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, fontWeight: 500 }}>{s.label}</div>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            <AnimatePresence mode="wait">
              {step === 'success' ? (
                <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  style={{ borderRadius: 24, padding: '48px 32px', textAlign: 'center', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
                    style={{ width: 64, height: 64, borderRadius: 20, background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 8px 32px rgba(16,185,129,0.3)' }}>
                    <CheckCircle2 size={28} color="#fff" />
                  </motion.div>
                  <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 800, color: '#166534' }}>Payment Recorded!</h2>
                  <p style={{ margin: 0, fontSize: 14, color: '#64748b', marginBottom: 20 }}>Payment of {fmtCurrency(parseFloat(amount || '0'))} from {selectedMember?.name || 'member'} has been recorded.</p>
                  <div style={{ display: 'flex', gap: 24, justifyContent: 'center', fontSize: 12, color: '#94a3b8' }}>
                    <span>{paymentMethod.toUpperCase()}</span>
                    <span>{generateReceipt ? 'Receipt Generated' : 'No Receipt'}</span>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* ── Member Selector ── */}
                  <div style={{ borderRadius: 18, padding: 18, background: 'white', border: '1px solid #f1f5f9', boxShadow: '0 1px 6px rgba(0,0,0,0.04)', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 3, background: 'linear-gradient(180deg,#6366f1,#6366f188)', borderRadius: 18 }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: '#6366f118', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}><User size={14} /></div>
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Member</span>
                        <span style={{ fontSize: 11, color: '#64748b', marginLeft: 8 }}>Select the member making the payment</span>
                      </div>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <div onClick={() => setMemberSearchOpen(!memberSearchOpen)}
                        style={{ borderRadius: 12, padding: '10px 14px', background: '#f8fafc', border: `1px solid ${selectedMember ? '#6366f1' : '#e2e8f0'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
                        {selectedMember ? (
                          <>
                            <div style={{ width: 32, height: 32, borderRadius: 8, background: avatarColor(selectedMember.name) + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: avatarColor(selectedMember.name) }}>
                              {initials(selectedMember.name)}
                            </div>
                            <div style={{ flex: 1 }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{selectedMember.name}</span>
                              {selectedMember.plan && <span style={{ fontSize: 11, color: '#64748b', marginLeft: 8 }}>{selectedMember.plan}</span>}
                            </div>
                            {selectedBalance !== null && (
                              <div style={{ padding: '4px 10px', borderRadius: 8, background: selectedBalance > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', fontSize: 11, fontWeight: 700, color: selectedBalance > 0 ? '#dc2626' : '#16a34a' }}>
                                Bal: {fmtCurrency(selectedBalance)}
                              </div>
                            )}
                            <ChevronDown size={14} color="#94a3b8" />
                          </>
                        ) : (
                          <>
                            <span style={{ fontSize: 13, color: '#94a3b8' }}>Search for a member...</span>
                            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, background: '#f1f5f9', borderRadius: 6, padding: '4px 8px' }}>
                              <Search size={12} color="#94a3b8" />
                            </div>
                          </>
                        )}
                      </div>
                      <AnimatePresence>
                        {memberSearchOpen && (
                          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                            style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 6, borderRadius: 14, background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 16px 48px rgba(0,0,0,0.15)', padding: 6, zIndex: 20 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 8, background: '#f1f5f9', marginBottom: 4 }}>
                              <Search size={13} color="#94a3b8" />
                              <input value={memberQuery} onChange={(e) => setMemberQuery(e.target.value)} placeholder="Type name or email..." autoFocus
                                style={{ background: 'transparent', border: 'none', color: '#0f172a', fontSize: 12, outline: 'none', flex: 1, fontFamily: 'inherit' }} />
                            </div>
                            <div style={{ maxHeight: 200, overflow: 'auto' }}>
                              {filteredMembers.map((m) => (
                                <div key={m.id} onClick={async () => {
                                  setSelectedMember(m); setMemberSearchOpen(false);
                                  try { const res = await api.pt.client(m.id) as any; setSelectedBalance(res?.data?.balance_amount ?? null); } catch { setSelectedBalance(null); }
                                }}
                                  style={{ padding: '8px 10px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'background 0.15s' }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                                  <div style={{ width: 28, height: 28, borderRadius: 7, background: avatarColor(m.name) + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: avatarColor(m.name) }}>
                                    {initials(m.name)}
                                  </div>
                                  <div>
                                    <span style={{ fontSize: 12.5, fontWeight: 600, color: '#334155' }}>{m.name}</span>
                                    <span style={{ fontSize: 10.5, color: '#94a3b8', marginLeft: 6 }}>{m.email}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    {errors.member && <p style={{ margin: '6px 0 0', fontSize: 12, fontWeight: 600, color: '#ef4444' }}>{errors.member}</p>}
                  </div>

                  {/* ── Invoice Linking ── */}
                  <div style={{ borderRadius: 18, padding: 18, background: 'white', border: '1px solid #f1f5f9', boxShadow: '0 1px 6px rgba(0,0,0,0.04)', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 3, background: 'linear-gradient(180deg,#f59e0b,#f59e0b88)', borderRadius: '0 0 0 3px' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: '#f59e0b18', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}><Link2 size={14} /></div>
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Link Invoice</span>
                        <span style={{ fontSize: 11, color: '#64748b', marginLeft: 8 }}>Associate payment with an existing invoice</span>
                      </div>
                    </div>
                    <button onClick={() => setShowInvoicePanel(true)}
                      style={{ width: '100%', borderRadius: 12, padding: '10px 14px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', border: `1px solid ${selectedInvoice ? '#6366f1' : '#e2e8f0'}`, background: '#f8fafc', color: '#0f172a', fontFamily: 'inherit', transition: 'all 0.2s' }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: selectedInvoice ? '#6366f118' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: selectedInvoice ? '#6366f1' : '#94a3b8' }}>
                        {selectedInvoice ? <Receipt size={14} /> : <Plus size={14} />}
                      </div>
                      <div style={{ flex: 1 }}>
                        {selectedInvoice ? (
                          <><span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{selectedInvoice.id}</span><span style={{ fontSize: 12, color: '#64748b', marginLeft: 8 }}>{fmtCurrency(selectedInvoice.amount)}</span></>
                        ) : (
                          <span style={{ fontSize: 13, color: '#94a3b8' }}>Select an invoice to link (optional)</span>
                        )}
                      </div>
                      <ChevronDown size={13} color="#94a3b8" />
                    </button>
                  </div>

                  {/* ── Payment Method ── */}
                  <div style={{ borderRadius: 18, padding: 18, background: 'white', border: '1px solid #f1f5f9', boxShadow: '0 1px 6px rgba(0,0,0,0.04)', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 3, background: 'linear-gradient(180deg,#10b981,#10b98188)', borderRadius: '0 0 0 3px' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: '#10b98118', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}><CircleDot size={14} /></div>
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Payment Method</span>
                        <span style={{ fontSize: 11, color: '#64748b', marginLeft: 8 }}>Choose how the payment is being made</span>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                      {PAYMENT_METHODS.map((method) => {
                        const active = paymentMethod === method.id;
                        return (
                          <motion.button key={method.id} onClick={() => setPaymentMethod(method.id)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '14px 8px', borderRadius: 14, cursor: 'pointer', border: `1px solid ${active ? `${method.color}50` : '#e2e8f0'}`, background: active ? method.bg : 'white', color: '#0f172a', fontFamily: 'inherit', transition: 'all 0.2s' }}>
                            <div style={{ width: 36, height: 36, borderRadius: 10, background: active ? method.color : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: active ? '#fff' : '#64748b' }}>
                              {method.icon}
                            </div>
                            <span style={{ fontSize: 10.5, fontWeight: 700, color: active ? method.color : '#64748b' }}>{method.label}</span>
                            {active && <Check size={10} color={method.color} />}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  {/* ── Amount ── */}
                  <div style={{ borderRadius: 18, padding: 18, background: 'white', border: '1px solid #f1f5f9', boxShadow: '0 1px 6px rgba(0,0,0,0.04)', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 3, background: 'linear-gradient(180deg,#ef4444,#ef444488)', borderRadius: '0 0 0 3px' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: '#ef444418', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}><IndianRupee size={14} /></div>
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Payment Amount</span>
                        <span style={{ fontSize: 11, color: '#64748b', marginLeft: 8 }}>{partialPayment ? 'Partial amount being paid' : 'Total payment amount'}</span>
                      </div>
                    </div>
                    <div style={{ borderRadius: 12, background: '#f8fafc', border: `1px solid ${errors.amount ? '#ef4444' : '#e2e8f0'}`, display: 'flex', alignItems: 'center', padding: '4px 14px' }}>
                      <span style={{ fontSize: 20, fontWeight: 800, color: '#94a3b8' }}>₹</span>
                      <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00"
                        style={{ flex: 1, background: 'transparent', border: 'none', padding: '10px 8px', fontSize: 24, fontWeight: 800, color: '#0f172a', outline: 'none', fontFamily: 'inherit' }} />
                    </div>
                    {errors.amount && <p style={{ margin: '6px 0 0', fontSize: 12, fontWeight: 600, color: '#ef4444' }}>{errors.amount}</p>}
                    <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
                      {[5000, 10000, 17500, 28500, 45000].map((val) => (
                        <motion.button key={val} onClick={() => setAmount(val.toString())} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                          style={{ padding: '5px 14px', borderRadius: 20, cursor: 'pointer', fontFamily: 'inherit', border: `1px solid ${amount === val.toString() ? 'rgba(239,68,68,0.3)' : '#e2e8f0'}`, background: amount === val.toString() ? 'rgba(239,68,68,0.08)' : 'white', color: amount === val.toString() ? '#dc2626' : '#64748b', fontSize: 11.5, fontWeight: 700 }}>
                          {fmtCurrency(val)}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* ── Payment Options ── */}
                  <div style={{ borderRadius: 18, padding: 18, background: 'white', border: '1px solid #f1f5f9', boxShadow: '0 1px 6px rgba(0,0,0,0.04)', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 3, background: 'linear-gradient(180deg,#ec4899,#ec489988)', borderRadius: '0 0 0 3px' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: '#ec489918', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ec4899' }}><SplitSquareHorizontal size={14} /></div>
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Payment Options</span>
                        <span style={{ fontSize: 11, color: '#64748b', marginLeft: 8 }}>Configure additional payment settings</span>
                      </div>
                    </div>

                    {/* Partial Payment Toggle */}
                    <div style={{ borderRadius: 12, padding: '12px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Percent size={14} color={partialPayment ? '#f43f5e' : '#94a3b8'} />
                        <div>
                          <span style={{ fontSize: 12.5, fontWeight: 600, color: '#334155' }}>Partial Payment</span>
                          <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 6 }}>Allow paying less than the full invoice amount</span>
                        </div>
                      </div>
                      <motion.button onClick={() => setPartialPayment(!partialPayment)} whileTap={{ scale: 0.95 }}
                        style={{ width: 44, height: 24, borderRadius: 12, padding: 2, border: 'none', cursor: 'pointer', background: partialPayment ? '#ef4444' : '#e2e8f0', display: 'flex', alignItems: 'center', transition: 'all 0.2s' }}>
                        <motion.div animate={{ x: partialPayment ? 20 : 0 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff' }} />
                      </motion.button>
                    </div>

                    {/* Split Payment */}
                    <div style={{ borderRadius: 12, padding: '12px 14px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: splitPayment ? 12 : 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <SplitSquareHorizontal size={14} color={splitPayment ? '#6366f1' : '#94a3b8'} />
                          <div>
                            <span style={{ fontSize: 12.5, fontWeight: 600, color: '#334155' }}>Split Payment</span>
                            <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 6 }}>Divide payment across multiple methods</span>
                          </div>
                        </div>
                        <motion.button onClick={() => setSplitPayment(!splitPayment)} whileTap={{ scale: 0.95 }}
                          style={{ width: 44, height: 24, borderRadius: 12, padding: 2, border: 'none', cursor: 'pointer', background: splitPayment ? '#6366f1' : '#e2e8f0', display: 'flex', alignItems: 'center', transition: 'all 0.2s' }}>
                          <motion.div animate={{ x: splitPayment ? 20 : 0 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                            style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff' }} />
                        </motion.button>
                      </div>
                      <AnimatePresence>
                        {splitPayment && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                            {splitRows.map((row, i) => (
                              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                                <div style={{ flex: 1 }}>
                                  <select value={row.method} onChange={(e) => updateSplitRow(i, 'method', e.target.value)}
                                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', color: '#0f172a', fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', outline: 'none' }}>
                                    {PAYMENT_METHODS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                                  </select>
                                </div>
                                <div style={{ position: 'relative', flex: 1 }}>
                                  <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#94a3b8', fontWeight: 700 }}>₹</span>
                                  <input type="number" value={row.amount} onChange={(e) => updateSplitRow(i, 'amount', e.target.value)} placeholder="0"
                                    style={{ width: '100%', padding: '8px 10px 8px 24px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', color: '#0f172a', fontSize: 12, fontFamily: 'inherit', outline: 'none' }} />
                                </div>
                                <button onClick={() => removeSplitRow(i)} disabled={splitRows.length <= 1}
                                  style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'rgba(239,68,68,0.1)', color: '#dc2626', cursor: splitRows.length <= 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: splitRows.length <= 1 ? 0.3 : 1 }}>
                                  <X size={13} />
                                </button>
                              </div>
                            ))}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <motion.button onClick={addSplitRow} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                style={{ padding: '6px 12px', borderRadius: 8, border: '1px dashed #cbd5e1', background: 'transparent', color: '#64748b', fontSize: 11, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Plus size={12} /> Add Method
                              </motion.button>
                              <span style={{ fontSize: 11, color: isValidSplit ? '#16a34a' : '#dc2626' }}>
                                Split: {fmtCurrency(splitTotal)} / {fmtCurrency(parseFloat(amount) || 0)}
                              </span>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* ── Notes & Receipt ── */}
                  <div style={{ borderRadius: 18, padding: 18, background: 'white', border: '1px solid #f1f5f9', boxShadow: '0 1px 6px rgba(0,0,0,0.04)', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 3, background: 'linear-gradient(180deg,#10b981,#10b98188)', borderRadius: '0 0 0 3px' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: '#10b98118', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}><PenSquare size={14} /></div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Notes & Receipt</span>
                    </div>
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add payment notes (optional)..."
                      style={{ width: '100%', minHeight: 70, padding: 10, borderRadius: 12, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#0f172a', fontSize: 12, fontFamily: 'inherit', outline: 'none', resize: 'vertical' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                      <input type="checkbox" id="receipt" checked={generateReceipt} onChange={(e) => setGenerateReceipt(e.target.checked)}
                        style={{ accentColor: '#10b981', cursor: 'pointer' }} />
                      <label htmlFor="receipt" style={{ fontSize: 12, color: '#64748b', cursor: 'pointer' }}>Generate receipt for this payment</label>
                    </div>
                  </div>

                  {/* ── Submit ── */}
                  <motion.button onClick={handleSubmit} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                    disabled={saving}
                    style={{ width: '100%', padding: '14px 20px', borderRadius: 14, border: 'none', cursor: saving ? 'wait' : 'pointer', background: 'linear-gradient(135deg, #dc2626, #e11d48)', color: '#fff', fontSize: 14, fontWeight: 700, fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 8px 32px rgba(220,38,38,0.3)', opacity: saving ? 0.7 : 1, transition: 'all 0.2s' }}>
                    {saving ? (
                      <><RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> Processing...</>
                    ) : (
                      <><Wallet size={16} /> Record Payment — {fmtCurrency(parseFloat(amount || '0'))}</>
                    )}
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div style={{ textAlign: 'center', padding: '8px 0 24px', fontSize: 11, color: '#94a3b8' }}>
            Secure payment processing • All amounts in INR
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </AppShell>
    </Guard>
  );
}
