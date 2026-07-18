'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { m, AnimatePresence } from 'framer-motion';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { ChevronLeft, Search, Check } from 'lucide-react';
import { api } from '@/lib/api';
import type { Client } from '@/lib/api';
import { useToast } from '@/lib/toast';

type Method = 'Cash' | 'UPI' | 'Card' | 'Bank';
const METHODS: Method[] = ['Cash', 'UPI', 'Card', 'Bank'];

const AVATAR_COLORS = ['#FF3B30', '#FF9500', '#34C759', '#007AFF', '#AF52DE', '#FF2D55'];
function initials(name: string) {
  return name.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();
}
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

export default function RecordPaymentPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [clients, setClients]         = React.useState<Client[]>([]);
  const [loadingClients, setLoading]  = React.useState(true);
  const [selected, setSelected]       = React.useState<Client | null>(null);
  const [pickerOpen, setPickerOpen]   = React.useState(false);
  const [query, setQuery]             = React.useState('');
  const [amount, setAmount]           = React.useState('');
  const [method, setMethod]           = React.useState<Method>('Cash');
  const [saving, setSaving]           = React.useState(false);
  const [done, setDone]               = React.useState<{ amount: number; name: string } | null>(null);
  const [amountError, setAmountError] = React.useState(false);
  const [clientError, setClientError] = React.useState(false);
  const searchRef = React.useRef<HTMLInputElement>(null);
  const pickerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    api.clients.list()
      .then(list => setClients(Array.isArray(list) ? list : []))
      .catch(() => toast.error('Failed to load clients'))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close picker on outside click
  React.useEffect(() => {
    if (!pickerOpen) return;
    function handle(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [pickerOpen]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(c =>
      c.name?.toLowerCase().includes(q) ||
      c.mobile?.toLowerCase().includes(q)
    );
  }, [clients, query]);

  const handleSubmit = async () => {
    const val = parseFloat(amount);
    const hasClient = !!selected;
    const hasAmount = !isNaN(val) && val > 0;
    setClientError(!hasClient);
    setAmountError(!hasAmount);
    if (!hasClient || !hasAmount) return;

    setSaving(true);
    try {
      await api.payments.create({
        client_id: selected!.id,
        amount:    val,
        method,
        date:      new Date().toISOString().slice(0, 10),
      });
      setDone({ amount: val, name: selected!.name });
      setSelected(null); setAmount(''); setMethod('Cash');
      setTimeout(() => setDone(null), 3000);
    } catch (err: any) {
      toast.error(err?.message || 'Payment failed');
    } finally {
      setSaving(false);
    }
  };

  // Digit-pad input handler
  const pad = (d: string) => {
    setAmountError(false);
    if (d === '⌫') { setAmount(a => a.slice(0, -1)); return; }
    if (d === '.' && amount.includes('.')) return;
    if (d === '.' && amount === '') { setAmount('0.'); return; }
    // Limit to 2 decimal places
    const next = amount + d;
    const parts = next.split('.');
    if (parts[1]?.length > 2) return;
    if (next.length > 10) return;
    setAmount(next);
  };

  const displayAmount = amount
    ? '₹' + parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: amount.includes('.') ? (amount.split('.')[1]?.length || 0) : 0 })
    : '₹0';

  // pt_clients carries balance_amount directly — already present on every
  // row returned by api.clients.list(), no extra fetch needed once a
  // client is picked.
  const selectedBalance = selected ? Number(selected.balance_amount ?? selected.balance_due ?? 0) : null;

  return (
    <Guard role="admin">
      <AppShell>
        <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>

          {/* ── Nav bar ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px 8px', maxWidth: 480, margin: '0 auto', width: '100%' }}>
            <button onClick={() => router.back()} aria-label="Back"
              style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0 }}>
              <ChevronLeft size={17} />
            </button>
            <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Record Payment</span>
          </div>

          <div style={{ flex: 1, padding: '4px 20px 32px', maxWidth: 480, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <AnimatePresence mode="wait">
              {done ? (
                /* ── Success state ── */
                <m.div key="done"
                  initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 40 }}>
                  <m.div
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 280, damping: 20, delay: 0.05 }}
                    style={{ width: 64, height: 64, borderRadius: '50%', background: '#34C759', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </m.div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
                      ₹{done.amount.toLocaleString('en-IN')}
                    </div>
                    <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>Recorded for {done.name}</div>
                  </div>
                </m.div>
              ) : (
                <m.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                  {/* ── Amount display ── */}
                  <div style={{ paddingTop: 24, paddingBottom: 8, textAlign: 'center' }}>
                    <div style={{
                      fontSize: 52,
                      fontWeight: 700,
                      letterSpacing: '-0.04em',
                      color: amount ? '#111827' : '#d1d5db',
                      lineHeight: 1,
                      transition: 'color 0.15s',
                    }}>
                      {displayAmount}
                    </div>
                    {amountError && (
                      <div style={{ fontSize: 12, color: '#FF3B30', marginTop: 6 }}>Enter an amount</div>
                    )}
                  </div>

                  {/* ── Grouped card: client + method ── */}
                  <div style={{ borderRadius: 18, background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'visible' }} ref={pickerRef}>

                    {/* Client row */}
                    <button onClick={() => { setPickerOpen(v => !v); setClientError(false); setTimeout(() => searchRef.current?.focus(), 50); }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', borderBottom: '1px solid var(--border)' }}>
                      {selected ? (
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: avatarColor(selected.name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                          {initials(selected.name)}
                        </div>
                      ) : (
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: clientError ? 'rgba(255,59,48,0.12)' : '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Search size={14} color={clientError ? '#FF3B30' : '#9ca3af'} />
                        </div>
                      )}
                      <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 1 }}>To</div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: selected ? '#111827' : (clientError ? '#FF3B30' : '#9ca3af'), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {selected ? selected.name : 'Select client'}
                        </div>
                      </div>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        style={{ transform: pickerOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>

                    {/* Selected client's balance — the whole reason this page exists is
                        to clear a due, so surface it immediately on selection instead of
                        making the trainer go check the client profile first. */}
                    {selected && selectedBalance !== null && (
                      <m.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                        style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderBottom: '1px solid var(--border)', background: selectedBalance > 0 ? 'rgba(255,59,48,0.06)' : 'rgba(52,199,89,0.06)' }}>
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: selectedBalance > 0 ? '#FF3B30' : '#34C759' }}>
                          {selectedBalance > 0 ? `Balance Due: ₹${selectedBalance.toLocaleString('en-IN')}` : 'Fully Paid — no balance due'}
                        </span>
                        {selectedBalance > 0 && (
                          <button onClick={() => { setAmount(String(selectedBalance)); setAmountError(false); }}
                            style={{ fontSize: 11.5, fontWeight: 700, color: '#FF3B30', background: 'rgba(255,59,48,0.12)', border: 'none', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                            Fill
                          </button>
                        )}
                      </m.div>
                    )}

                    {/* Client dropdown */}
                    <AnimatePresence>
                      {pickerOpen && (
                        <m.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.15 }}
                          style={{ position: 'absolute', left: 20, right: 20, borderRadius: 16, background: 'var(--bg-elevated)', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', border: '1px solid var(--border)', zIndex: 40, overflow: 'hidden', marginTop: 4 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
                            <Search size={13} color="#9ca3af" />
                            <input ref={searchRef} value={query} onChange={e => setQuery(e.target.value)}
                              placeholder="Search name or phone"
                              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: 'var(--text-primary)', fontFamily: 'inherit' }} />
                          </div>
                          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                            {loadingClients ? (
                              <div style={{ padding: 20, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>Loading…</div>
                            ) : filtered.length === 0 ? (
                              <div style={{ padding: 20, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>No clients found</div>
                            ) : filtered.slice(0, 50).map(c => (
                              <button key={c.id} onClick={() => { setSelected(c); setPickerOpen(false); setQuery(''); }}
                                style={{ width: '100%', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                                onMouseEnter={e => (e.currentTarget.style.background = '#F9FAFB')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                <div style={{ width: 28, height: 28, borderRadius: '50%', background: avatarColor(c.name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                                  {initials(c.name)}
                                </div>
                                <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                                  {c.mobile && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.mobile}</div>}
                                </div>
                                {selected?.id === c.id && <Check size={14} color="#007AFF" />}
                              </button>
                            ))}
                          </div>
                        </m.div>
                      )}
                    </AnimatePresence>

                    {/* Method row */}
                    <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', width: 28, flexShrink: 0 }}>Via</div>
                      <div style={{ flex: 1, display: 'flex', gap: 6 }}>
                        {METHODS.map(m => (
                          <button key={m} onClick={() => setMethod(m)}
                            style={{ flex: 1, padding: '7px 0', borderRadius: 10, border: '1.5px solid', borderColor: method === m ? '#007AFF' : '#e5e7eb', background: method === m ? 'rgba(0,122,255,0.08)' : 'transparent', fontSize: 13, fontWeight: method === m ? 700 : 500, color: method === m ? '#007AFF' : '#374151', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s' }}>
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* ── Number pad ── */}
                  <div style={{ borderRadius: 18, background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', padding: '12px 16px 4px', overflow: 'hidden' }}>
                    {[['1','2','3'],['4','5','6'],['7','8','9'],['.','0','⌫']].map((row, ri) => (
                      <div key={ri} style={{ display: 'flex', gap: 0 }}>
                        {row.map(d => (
                          <button key={d} onClick={() => pad(d)}
                            style={{ flex: 1, height: 56, border: 'none', background: 'transparent', fontSize: d === '⌫' ? 18 : 22, fontWeight: d === '⌫' ? 400 : 500, color: d === '⌫' ? '#6b7280' : '#111827', cursor: 'pointer', fontFamily: 'inherit', borderRadius: 12, transition: 'background 0.1s', letterSpacing: '-0.01em' }}
                            onMouseDown={e => (e.currentTarget.style.background = '#F3F4F6')}
                            onMouseUp={e => (e.currentTarget.style.background = 'transparent')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                            {d}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>

                  {/* ── Submit ── */}
                  <m.button onClick={handleSubmit} whileTap={{ scale: 0.98 }} disabled={saving}
                    style={{ width: '100%', height: 54, borderRadius: 16, border: 'none', cursor: saving ? 'wait' : 'pointer', background: amount && selected ? '#007AFF' : '#F3F4F6', color: amount && selected ? '#fff' : '#9ca3af', fontSize: 16, fontWeight: 600, fontFamily: 'inherit', transition: 'background 0.2s, color 0.2s', letterSpacing: '-0.01em' }}>
                    {saving ? 'Recording…' : amount ? `Record ₹${parseFloat(amount).toLocaleString('en-IN')}` : 'Record Payment'}
                  </m.button>

                </m.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </AppShell>
    </Guard>
  );
}
