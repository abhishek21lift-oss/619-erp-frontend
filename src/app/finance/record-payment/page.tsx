'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { ChevronLeft, Search, Check, ChevronDown, CheckCircle2, Banknote, Smartphone, CreditCard, Receipt } from 'lucide-react';
import { api } from '@/lib/api';
import type { Client } from '@/lib/api';
import { useToast } from '@/lib/toast';

type Method = 'Cash' | 'UPI' | 'Card' | 'Bank';

const METHODS: { id: Method; label: string; icon: React.ReactNode }[] = [
  { id: 'Cash', label: 'Cash', icon: <Banknote size={16} /> },
  { id: 'UPI',  label: 'UPI',  icon: <Smartphone size={16} /> },
  { id: 'Card', label: 'Card', icon: <CreditCard size={16} /> },
  { id: 'Bank', label: 'Bank', icon: <Receipt size={16} /> },
];

const AVATAR_COLORS = ['#FF3B30', '#FF9500', '#34C759', '#007AFF', '#AF52DE', '#FF2D55'];
function initials(name: string): string {
  return name.split(' ').filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
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
  const router = useRouter();
  const { toast } = useToast();

  const [clients, setClients] = React.useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = React.useState(true);

  const [selected, setSelected] = React.useState<Client | null>(null);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');

  const [amount, setAmount] = React.useState('');
  const [method, setMethod] = React.useState<Method>('Cash');
  const [date, setDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = React.useState('');

  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);
  const [success, setSuccess] = React.useState<{ amount: number; name: string } | null>(null);

  React.useEffect(() => {
    api.clients.list()
      .then((list) => setClients(Array.isArray(list) ? list : []))
      .catch(() => toast.error('Failed to load clients'))
      .finally(() => setLoadingClients(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) =>
      c.name?.toLowerCase().includes(q) ||
      c.mobile?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q)
    );
  }, [clients, query]);

  const reset = () => {
    setSelected(null); setAmount(''); setMethod('Cash');
    setDate(new Date().toISOString().slice(0, 10)); setNotes(''); setErrors({});
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!selected) errs.client = 'Select a client';
    if (!amount || parseFloat(amount) <= 0) errs.amount = 'Enter a valid amount';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await api.payments.create({
        client_id: selected!.id,
        amount: parseFloat(amount),
        method,
        date,
        notes: notes.trim() || undefined,
      });
      setSuccess({ amount: parseFloat(amount), name: selected!.name });
      reset();
      setTimeout(() => setSuccess(null), 2800);
    } catch (err: any) {
      toast.error(err?.message || err?.error || 'Payment failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Guard role="admin">
      <AppShell>
        <div style={{ minHeight: '100vh', background: 'var(--bg-canvas)' }}>
          {/* ── Header ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 24px 16px', maxWidth: 560, margin: '0 auto' }}>
            <button onClick={() => router.back()} aria-label="Back"
              style={{ width: 34, height: 34, borderRadius: 10, border: 'none', background: 'var(--bg-base)', boxShadow: 'var(--shadow-xs)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}>
              <ChevronLeft size={18} />
            </button>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Record Payment</h1>
          </div>

          <div style={{ padding: '0 24px 40px', maxWidth: 560, margin: '0 auto' }}>
            <AnimatePresence mode="wait">
              {success ? (
                <motion.div key="success" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  style={{ borderRadius: 20, padding: '40px 24px', textAlign: 'center', background: 'var(--bg-base)', boxShadow: 'var(--shadow-card)' }}>
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.05 }}
                    style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <CheckCircle2 size={28} color="#fff" />
                  </motion.div>
                  <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Payment Recorded</h2>
                  <p style={{ margin: 0, fontSize: 14, color: 'var(--text-muted)' }}>{fmtCurrency(success.amount)} from {success.name}</p>
                </motion.div>
              ) : (
                <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                  {/* ── Client ── */}
                  <div style={{ borderRadius: 18, background: 'var(--bg-base)', boxShadow: 'var(--shadow-card)', overflow: 'visible', position: 'relative' }}>
                    <div style={{ padding: '14px 16px 8px', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Client</div>
                    <div style={{ padding: '0 16px 16px' }}>
                      <button onClick={() => setPickerOpen((v) => !v)}
                        style={{ width: '100%', borderRadius: 14, padding: '10px 12px', background: 'var(--bg-subtle)', border: `1px solid ${errors.client ? 'var(--danger)' : 'transparent'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'inherit' }}>
                        {selected ? (
                          <>
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: avatarColor(selected.name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                              {initials(selected.name)}
                            </div>
                            <div style={{ flex: 1, textAlign: 'left' }}>
                              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{selected.name}</div>
                              {typeof selected.balance_amount === 'number' && (
                                <div style={{ fontSize: 12, color: selected.balance_amount > 0 ? 'var(--danger)' : 'var(--success)' }}>
                                  Balance: {fmtCurrency(selected.balance_amount)}
                                </div>
                              )}
                            </div>
                          </>
                        ) : (
                          <>
                            <Search size={15} color="var(--text-disabled)" />
                            <span style={{ fontSize: 14, color: 'var(--text-disabled)' }}>Select a client</span>
                          </>
                        )}
                        <ChevronDown size={14} color="var(--text-disabled)" style={{ marginLeft: 'auto', transform: pickerOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                      </button>

                      <AnimatePresence>
                        {pickerOpen && (
                          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                            style={{ position: 'absolute', left: 16, right: 16, marginTop: 6, borderRadius: 14, background: 'var(--bg-base)', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)', zIndex: 30, overflow: 'hidden' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
                              <Search size={14} color="var(--text-disabled)" />
                              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or phone" autoFocus
                                style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: 'var(--text-primary)', fontFamily: 'inherit' }} />
                            </div>
                            <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                              {loadingClients ? (
                                <div style={{ padding: 20, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>Loading…</div>
                              ) : filtered.length === 0 ? (
                                <div style={{ padding: 20, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>No clients found</div>
                              ) : filtered.slice(0, 50).map((c) => (
                                <button key={c.id} onClick={() => { setSelected(c); setPickerOpen(false); setQuery(''); }}
                                  style={{ width: '100%', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
                                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: avatarColor(c.name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                                    {initials(c.name)}
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</div>
                                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{c.mobile || c.email || ''}</div>
                                  </div>
                                  {selected?.id === c.id && <Check size={14} color="var(--brand)" />}
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      {errors.client && <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--danger)' }}>{errors.client}</p>}
                    </div>
                  </div>

                  {/* ── Amount ── */}
                  <div style={{ borderRadius: 18, background: 'var(--bg-base)', boxShadow: 'var(--shadow-card)', padding: '14px 16px 16px' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>Amount</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                      <span style={{ fontSize: 28, fontWeight: 700, color: amount ? 'var(--text-primary)' : 'var(--text-disabled)' }}>₹</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0"
                        style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 34, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'inherit', letterSpacing: '-0.02em', minWidth: 0 }}
                      />
                    </div>
                    {errors.amount && <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--danger)' }}>{errors.amount}</p>}
                  </div>

                  {/* ── Method ── */}
                  <div style={{ borderRadius: 18, background: 'var(--bg-base)', boxShadow: 'var(--shadow-card)', padding: '14px 16px 16px' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>Method</div>
                    <div style={{ display: 'flex', gap: 6, background: 'var(--bg-subtle)', borderRadius: 12, padding: 4 }}>
                      {METHODS.map((m) => {
                        const active = method === m.id;
                        return (
                          <button key={m.id} onClick={() => setMethod(m.id)}
                            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '8px 4px', borderRadius: 9, border: 'none', cursor: 'pointer', background: active ? 'var(--bg-base)' : 'transparent', boxShadow: active ? 'var(--shadow-xs)' : 'none', color: active ? 'var(--text-primary)' : 'var(--text-muted)', fontFamily: 'inherit', transition: 'all 0.15s' }}>
                            {m.icon}
                            <span style={{ fontSize: 11, fontWeight: 600 }}>{m.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* ── Date & Notes ── */}
                  <div style={{ borderRadius: 18, background: 'var(--bg-base)', boxShadow: 'var(--shadow-card)', padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Date</div>
                      <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-subtle)', color: 'var(--text-primary)', fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Notes <span style={{ textTransform: 'none', fontWeight: 400, color: 'var(--text-disabled)' }}>(optional)</span></div>
                      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add a note…" rows={2}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-subtle)', color: 'var(--text-primary)', fontSize: 14, fontFamily: 'inherit', outline: 'none', resize: 'none' }} />
                    </div>
                  </div>

                  {/* ── Submit ── */}
                  <motion.button onClick={handleSubmit} whileTap={{ scale: 0.98 }} disabled={saving}
                    style={{ width: '100%', padding: '15px 20px', borderRadius: 16, border: 'none', cursor: saving ? 'wait' : 'pointer', background: 'var(--brand)', color: '#fff', fontSize: 16, fontWeight: 600, fontFamily: 'inherit', opacity: saving ? 0.6 : 1, transition: 'opacity 0.15s' }}>
                    {saving ? 'Recording…' : amount ? `Record ${fmtCurrency(parseFloat(amount) || 0)}` : 'Record Payment'}
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </AppShell>
    </Guard>
  );
}
