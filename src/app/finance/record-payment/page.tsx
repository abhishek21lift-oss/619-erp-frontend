'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { m, AnimatePresence } from 'framer-motion';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { ArrowLeft, Search, Check, Smartphone, Banknote, CreditCard, Wallet, Delete } from 'lucide-react';
import { api } from '@/lib/api';
import type { Client } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { identity } from '@/lib/palette';

type Method = 'Cash' | 'UPI' | 'Card' | 'Bank';
const METHODS: Method[] = ['Cash', 'UPI', 'Card', 'Bank'];

const METHOD_ICONS: Record<Method, React.ReactNode> = {
  Cash: <Banknote size={14} />,
  UPI: <Smartphone size={14} />,
  Card: <CreditCard size={14} />,
  Bank: <Wallet size={14} />,
};

// Same method → gradient mapping as /sales/today, so a payment method reads
// as the same colour everywhere it appears in the app.
const METHOD_COLORS: Record<Method, string> = {
  Cash: 'from-emerald-500 to-green-500',
  UPI: 'from-violet-500 to-purple-500',
  Card: 'from-blue-500 to-cyan-500',
  Bank: 'from-amber-500 to-orange-500',
};

const AVATAR_COLORS = identity;
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
        <div className="relative z-10 mt-1 max-w-[560px] mx-auto pb-8">

          {/* ── Nav row ── */}
          <div className="flex items-center pt-2 pb-2">
            <button onClick={() => router.back()} aria-label="Back"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-muted)] transition-all duration-200 hover:bg-gradient-to-br hover:from-indigo-500/10 hover:to-violet-500/10 hover:text-indigo-400">
              <ArrowLeft size={16} />
            </button>
          </div>

          <AnimatePresence mode="wait">
            {done ? (
              /* ── Success state ── */
              <m.div key="done"
                initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/10 p-10 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.08)] flex flex-col items-center justify-center gap-3 text-center"
              >
                <m.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 280, damping: 20, delay: 0.05 }}
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg"
                >
                  <Check size={28} strokeWidth={2.5} className="text-white" />
                </m.div>
                <div>
                  <div className="text-[32px] font-extrabold tracking-[-0.03em] bg-gradient-to-br from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent tabular-nums leading-none">
                    ₹{done.amount.toLocaleString('en-IN')}
                  </div>
                  <div className="mt-2 text-[13px] text-[var(--text-muted)]">Recorded for {done.name}</div>
                </div>
              </m.div>
            ) : (
              <m.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-4">

                {/* ── Amount hero ── */}
                <div className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-gradient-to-br from-indigo-500/10 via-violet-500/10 to-purple-500/10 p-6 sm:p-8 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.08)] text-center">
                  {/* Corner glows as ONE unfiltered gradient layer, replacing two
                      `blur-3xl` circles. `filter: blur()` promotes a child to its own
                      compositing layer, and WebKit then applies this card's rounded
                      `overflow-hidden` clip to that layer as a RECTANGLE — so the blob's
                      square corner paints outside the rounded corner. Reported on iOS
                      against the client profile card, which had the identical pattern.
                      A gradient needs no filter, so nothing is promoted and the clip holds.
                      240px, and the averaged colour for each two-tone blob, were fitted
                      against the old rendering by pixel comparison: 0.99/255 mean
                      difference, where two offset radials per blob scored 2.10. */}
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                      backgroundImage: [
                        'radial-gradient(circle 240px at calc(100% - 32px) 32px, rgba(148,161,249,0.2), transparent 70%)',
                        'radial-gradient(circle 240px at 32px calc(100% - 32px), rgba(180,157,251,0.2), transparent 70%)',
                      ].join(', '),
                    }}
                    aria-hidden
                  />
                  <p className="relative text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                    Amount
                  </p>
                  <div
                    className="relative mt-2 text-[48px] sm:text-[56px] font-extrabold tracking-[-0.03em] leading-none tabular-nums"
                    style={amount
                      ? undefined
                      : { color: 'var(--text-disabled)' }}
                  >
                    <span className={amount ? 'bg-gradient-to-br from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent' : ''}>
                      {displayAmount}
                    </span>
                  </div>
                  {amountError && (
                    <div className="relative mt-2 text-[12px] font-semibold text-rose-500">Enter an amount</div>
                  )}
                </div>

                {/* ── Client + method card ── */}
                <div ref={pickerRef} className="relative z-20 overflow-visible rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.05)] divide-y divide-[var(--border)]">

                  {/* Client row */}
                  <button onClick={() => { setPickerOpen(v => !v); setClientError(false); setTimeout(() => searchRef.current?.focus(), 50); }}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[var(--bg-hover)] rounded-t-3xl">
                    {selected ? (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white"
                        style={{ background: avatarColor(selected.name) }}>
                        {initials(selected.name)}
                      </div>
                    ) : (
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${clientError ? 'bg-rose-500/12' : 'bg-[var(--bg-subtle)]'}`}>
                        <Search size={14} className={clientError ? 'text-rose-500' : 'text-[var(--text-muted)]'} />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-[12.5px] font-medium text-[var(--text-muted)]">To</div>
                      <div className={`truncate text-[15px] font-semibold ${selected ? 'text-[var(--text-primary)]' : clientError ? 'text-rose-500' : 'text-[var(--text-disabled)]'}`}>
                        {selected ? selected.name : 'Select client'}
                      </div>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      className={`shrink-0 text-[var(--text-muted)] transition-transform duration-200 ${pickerOpen ? 'rotate-180' : ''}`}>
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  {/* Selected client's balance — the whole reason this page exists is
                      to clear a due, so surface it immediately on selection instead of
                      making the trainer go check the client profile first. */}
                  {selected && selectedBalance !== null && (
                    <m.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                      className={`flex items-center justify-between gap-2.5 px-4 py-2.5 ${selectedBalance > 0 ? 'bg-rose-500/6' : 'bg-emerald-500/6'}`}>
                      <span className={`text-[12.5px] font-semibold ${selectedBalance > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                        {selectedBalance > 0 ? `Balance Due: ₹${selectedBalance.toLocaleString('en-IN')}` : 'Fully Paid — no balance due'}
                      </span>
                      {selectedBalance > 0 && (
                        <button onClick={() => { setAmount(String(selectedBalance)); setAmountError(false); }}
                          className="shrink-0 rounded-lg bg-rose-500/12 px-2.5 py-1 text-[11.5px] font-bold text-rose-500 transition-colors hover:bg-rose-500/20">
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
                        className="absolute left-4 right-4 z-40 mt-1 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] shadow-[0_16px_48px_rgba(0,0,0,0.15)]">
                        <div className="flex items-center gap-2 border-b border-[var(--border)] px-3.5 py-2.5">
                          <Search size={13} className="text-[var(--text-muted)]" />
                          <input ref={searchRef} value={query} onChange={e => setQuery(e.target.value)}
                            placeholder="Search name or phone"
                            className="flex-1 border-none bg-transparent text-[14px] text-[var(--text-primary)] outline-none" />
                        </div>
                        <div className="max-h-[240px] overflow-y-auto overscroll-contain">
                          {loadingClients ? (
                            <div className="px-4 py-5 text-center text-[13px] text-[var(--text-muted)]">Loading…</div>
                          ) : filtered.length === 0 ? (
                            <div className="px-4 py-5 text-center text-[13px] text-[var(--text-muted)]">No clients found</div>
                          ) : filtered.slice(0, 50).map(c => (
                            <button key={c.id} onClick={() => { setSelected(c); setPickerOpen(false); setQuery(''); }}
                              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors hover:bg-[var(--bg-hover)]">
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                                style={{ background: avatarColor(c.name) }}>
                                {initials(c.name)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-[14px] font-semibold text-[var(--text-primary)]">{c.name}</div>
                                {c.mobile && <div className="text-[12px] text-[var(--text-muted)]">{c.mobile}</div>}
                              </div>
                              {selected?.id === c.id && <Check size={14} className="text-indigo-500" />}
                            </button>
                          ))}
                        </div>
                      </m.div>
                    )}
                  </AnimatePresence>

                  {/* Method row */}
                  <div className="flex items-center gap-2 px-4 py-3">
                    <div className="w-7 shrink-0 text-[12.5px] font-medium text-[var(--text-muted)]">Via</div>
                    <div className="flex flex-1 gap-1.5">
                      {METHODS.map(m => (
                        <button key={m} onClick={() => setMethod(m)}
                          className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2 text-[12.5px] font-semibold transition-all ${
                            method === m
                              ? `border-transparent bg-gradient-to-r ${METHOD_COLORS[m]} text-white shadow-md`
                              : 'border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--bg-hover)]'
                          }`}>
                          {METHOD_ICONS[m]}
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ── Number pad ── */}
                <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.05)] p-2">
                  {[['1','2','3'],['4','5','6'],['7','8','9'],['.','0','⌫']].map((row, ri) => (
                    <div key={ri} className="flex">
                      {row.map(d => (
                        <button key={d} onClick={() => pad(d)}
                          className="flex flex-1 items-center justify-center rounded-2xl text-[22px] font-medium tracking-[-0.01em] text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)] active:bg-[var(--bg-subtle)]"
                          style={{ height: 56 }}>
                          {d === '⌫' ? <Delete size={18} className="text-[var(--text-muted)]" /> : d}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>

                {/* ── Submit ── */}
                <m.button onClick={handleSubmit} whileTap={{ scale: 0.98 }} disabled={saving}
                  className={`w-full rounded-2xl text-[16px] font-bold tracking-[-0.01em] transition-all duration-200 ${
                    amount && selected
                      ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-[0_4px_16px_rgba(99,102,241,0.35)] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(99,102,241,0.45)]'
                      : 'bg-[var(--bg-subtle)] text-[var(--text-disabled)]'
                  } ${saving ? 'cursor-wait' : 'cursor-pointer'}`}
                  style={{ height: 54 }}>
                  {saving ? 'Recording…' : amount ? `Record ₹${parseFloat(amount).toLocaleString('en-IN')}` : 'Record Payment'}
                </m.button>

              </m.div>
            )}
          </AnimatePresence>
        </div>
      </AppShell>
    </Guard>
  );
}
