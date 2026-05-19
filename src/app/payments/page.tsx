'use client';
/**
 * Revenue Intelligence — Premium Redesign v4
 * 619 Fitness Studio · Today's Revenue Hero + Full Ledger
 * All backend APIs, state, and business logic fully preserved.
 */
import { useEffect, useState, useCallback, useMemo, FormEvent } from 'react';
import Guard from '@/components/Guard';
import { api } from '@/lib/api';
import AppShell from '@/components/AppShell';
import { useAuth } from '@/lib/auth-context';
import {
  Plus, Download, Trash2, TrendingUp, Calendar,
  AlertCircle, ChevronLeft, ChevronRight, X, Search,
  CreditCard, Banknote, Smartphone, Building2, Zap,
  BarChart3, ArrowUpRight, RefreshCw, Sparkles,
  Activity, Target, Shield, Clock, CheckCircle2,
  ArrowDownRight, Filter, MoreHorizontal, Flame,
  DollarSign, TrendingDown, Users, Receipt,
} from 'lucide-react';

/* ─── Types ──────────────────────────────────────────────── */
interface Payment {
  id: string | number;
  receipt_no?: string;
  client_id?: number | string;
  client_name?: string;
  amount: number;
  method: string;
  date: string;
  notes?: string;
  trainer_name?: string;
}
interface ClientOption {
  id: number | string;
  name: string;
  balance_due?: number;
  balance_amount?: number;
}

const METHODS = ['ALL', 'CASH', 'UPI', 'CARD', 'BANK_TRANSFER'];
const PAGE_SIZE = 50;

/* ─── Helpers ────────────────────────────────────────────── */
function fmtDate(d?: string) {
  if (!d) return '—';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtAmount(n: number) {
  return '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}
function fmtCompact(n: number) {
  if (n >= 10_000_000) return '₹' + (n / 10_000_000).toFixed(1) + 'Cr';
  if (n >= 100_000)    return '₹' + (n / 100_000).toFixed(1) + 'L';
  if (n >= 1_000)      return '₹' + (n / 1_000).toFixed(1) + 'K';
  return fmtAmount(n);
}
function isoToday()      { return new Date().toISOString().split('T')[0]; }
function isoMonthStart() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-01'; }
function exportCSV(payments: Payment[]) {
  const headers = ['Receipt', 'Member', 'Amount', 'Method', 'Date', 'Notes'];
  const rows = payments.map((p) => [p.receipt_no ?? '', p.client_name ?? '', p.amount, p.method, p.date, p.notes ?? '']);
  const csv = [headers, ...rows].map((r) => r.map((v) => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = '619_payments_' + isoToday() + '.csv';
  a.click();
}
function todayLabel() {
  return new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
}

/* ─── Animated Counter ───────────────────────────────────── */
function AnimatedNumber({ value, prefix = '', suffix = '', decimals = 0 }: { value: number; prefix?: string; suffix?: string; decimals?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    let start = 0;
    const duration = 900;
    const step = value / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= value) { setDisplay(value); clearInterval(timer); }
      else setDisplay(start);
    }, 16);
    return () => clearInterval(timer);
  }, [value]);
  const formatted = decimals > 0
    ? Number(display).toFixed(decimals)
    : Number(Math.floor(display)).toLocaleString('en-IN');
  return <>{prefix}{formatted}{suffix}</>;
}

/* ─── Method Badge ───────────────────────────────────────── */
function MethodBadge({ method, size = 'sm' }: { method: string; size?: 'sm' | 'md' }) {
  const map: Record<string, { bg: string; color: string; border: string; icon: React.ReactNode }> = {
    CASH:          { bg: 'rgba(5,150,105,0.08)',   color: '#059669', border: 'rgba(5,150,105,0.2)',   icon: <Banknote size={size === 'md' ? 12 : 10} /> },
    UPI:           { bg: 'rgba(37,99,235,0.08)',   color: '#2563eb', border: 'rgba(37,99,235,0.2)',   icon: <Smartphone size={size === 'md' ? 12 : 10} /> },
    CARD:          { bg: 'rgba(124,58,237,0.08)',  color: '#7c3aed', border: 'rgba(124,58,237,0.2)',  icon: <CreditCard size={size === 'md' ? 12 : 10} /> },
    BANK_TRANSFER: { bg: 'rgba(234,88,12,0.08)',   color: '#ea580c', border: 'rgba(234,88,12,0.2)',   icon: <Building2 size={size === 'md' ? 12 : 10} /> },
  };
  const s = map[method] ?? { bg: 'rgba(100,116,139,0.08)', color: '#475569', border: 'rgba(100,116,139,0.2)', icon: null };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: size === 'md' ? 5 : 4,
      fontSize: size === 'md' ? 12 : 11,
      fontWeight: 700,
      background: s.bg, color: s.color,
      borderRadius: 20, padding: size === 'md' ? '4px 10px' : '3px 8px',
      border: '1px solid ' + s.border,
      whiteSpace: 'nowrap' as const,
    }}>
      {s.icon}{method.replace('_', ' ')}
    </span>
  );
}

/* ─── Skeleton ───────────────────────────────────────────── */
function SkeletonRow() {
  return (
    <tr>
      {[80, 160, 90, 80, 100, 180].map((w, i) => (
        <td key={i} style={{ padding: '14px 18px' }}>
          <div style={{
            height: 12, width: w, borderRadius: 6,
            background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)',
            backgroundSize: '200% 100%', animation: 'shimmer 1.4s ease-in-out infinite',
          }} />
        </td>
      ))}
    </tr>
  );
}

/* ─── Today's Revenue Hero ───────────────────────────────── */
function TodayRevenueHero({
  todayPayments, todayRev, methodBreakdown, onAdd, isAdmin, loading, onRefresh,
}: {
  todayPayments: Payment[];
  todayRev: number;
  methodBreakdown: Record<string, number>;
  onAdd: () => void;
  isAdmin: boolean;
  loading: boolean;
  onRefresh: () => void;
}) {
  const methodColors: Record<string, string> = {
    CASH: '#10b981', UPI: '#3b82f6', CARD: '#8b5cf6', BANK_TRANSFER: '#f97316',
  };
  const totalToday = Object.values(methodBreakdown).reduce((a, b) => a + b, 0);

  return (
    <div style={{
      borderRadius: 24,
      background: 'linear-gradient(145deg, #0d0d1a 0%, #111128 40%, #0e1a2e 100%)',
      padding: 'clamp(24px,4vw,40px)',
      marginBottom: 20,
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 8px 48px rgba(0,0,0,0.22), 0 2px 8px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.06)',
    }}>
      {/* Background decoration */}
      <div style={{ position: 'absolute', top: -100, right: -80, width: 360, height: 360, background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 65%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -80, left: -40, width: 280, height: 280, background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 65%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, alignItems: 'start' }}>
        {/* Left */}
        <div>
          {/* Label row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)',
              borderRadius: 20, padding: '4px 12px',
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981', animation: 'pulseDot 2s ease-in-out infinite' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#34d399', textTransform: 'uppercase' as const, letterSpacing: '1px' }}>Today's Revenue</span>
            </div>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>{todayLabel()}</span>
            <button onClick={onRefresh} disabled={loading} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', display: 'flex', padding: 4, marginLeft: 2 }}>
              <RefreshCw size={12} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            </button>
          </div>

          {/* Main amount */}
          <div style={{ fontSize: 'clamp(40px,7vw,72px)', fontWeight: 900, color: 'white', letterSpacing: '-0.04em', lineHeight: 1, marginBottom: 10, fontVariantNumeric: 'tabular-nums' }}>
            {loading ? (
              <div style={{ height: 72, width: 260, borderRadius: 10, background: 'rgba(255,255,255,0.06)', animation: 'shimmer 1.4s ease-in-out infinite', backgroundSize: '200% 100%', backgroundImage: 'linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.09) 50%,rgba(255,255,255,0.04) 75%)' }} />
            ) : (
              <AnimatedNumber value={todayRev} prefix="₹" />
            )}
          </div>

          {/* Subtext */}
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: '0 0 28px', fontWeight: 500 }}>
            {todayPayments.length} {todayPayments.length === 1 ? 'transaction' : 'transactions'} collected today
          </p>

          {/* Method breakdown pills */}
          {totalToday > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
              {Object.entries(methodBreakdown).map(([method, amt]) => {
                const pct = Math.round((amt / totalToday) * 100);
                const color = methodColors[method] ?? '#94a3b8';
                return (
                  <div key={method} style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    backdropFilter: 'blur(8px)',
                    borderRadius: 14, padding: '10px 16px',
                    borderLeft: '3px solid ' + color,
                  }}>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.8px', marginBottom: 4 }}>
                      {method.replace('_', ' ')}
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: 'white', letterSpacing: '-0.02em' }}>{fmtCompact(amt)}</div>
                    <div style={{ fontSize: 10, color, fontWeight: 600, marginTop: 2 }}>{pct}%</div>
                  </div>
                );
              })}
              {totalToday === 0 && (
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>No transactions yet today</div>
              )}
            </div>
          )}
        </div>

        {/* Right — actions + quick stat */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-end' }}>
          {isAdmin && (
            <button
              onClick={onAdd}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '12px 22px', borderRadius: 14, border: 'none',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                fontSize: 13, fontWeight: 700, color: 'white', cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(16,185,129,0.4)',
                whiteSpace: 'nowrap' as const,
                transition: 'transform 160ms ease, box-shadow 160ms ease',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 24px rgba(16,185,129,0.5)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = ''; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 20px rgba(16,185,129,0.4)'; }}
            >
              <Plus size={15} /> Record Payment
            </button>
          )}

          {/* Transaction count badge */}
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 16, padding: '14px 20px', textAlign: 'center' as const, minWidth: 110,
          }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: todayPayments.length > 0 ? '#a5f3fc' : 'rgba(255,255,255,0.4)', letterSpacing: '-0.03em' }}>
              {todayPayments.length}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.8px', marginTop: 3 }}>
              Txns Today
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Stat Card ──────────────────────────────────────────── */
function StatCard({
  label, value, sub, icon, accent, delta, deltaUp = true,
}: {
  label: string; value: string; sub?: string;
  icon: React.ReactNode; accent: string; delta?: string; deltaUp?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'white' : 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.95)',
        borderRadius: 20,
        padding: '20px 22px',
        display: 'flex', flexDirection: 'column', gap: 12,
        cursor: 'default', position: 'relative', overflow: 'hidden',
        transform: hovered ? 'translateY(-2px)' : 'none',
        boxShadow: hovered
          ? '0 8px 32px rgba(15,23,42,0.12), 0 2px 8px rgba(15,23,42,0.06)'
          : '0 1px 4px rgba(15,23,42,0.04), 0 4px 16px rgba(15,23,42,0.05)',
        transition: 'all 200ms cubic-bezier(0.34,1.56,0.64,1)',
      }}
    >
      <div style={{
        position: 'absolute', inset: 0,
        background: accent, opacity: hovered ? 0.04 : 0.02,
        borderRadius: 20, transition: 'opacity 200ms',
        pointerEvents: 'none',
      }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
        <div style={{
          width: 36, height: 36, borderRadius: 11,
          background: accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}>
          {icon}
        </div>
        {delta && (
          <span style={{
            fontSize: 10, fontWeight: 700, borderRadius: 20, padding: '3px 8px',
            display: 'inline-flex', alignItems: 'center', gap: 2,
            color: deltaUp ? '#059669' : '#dc2626',
            background: deltaUp ? 'rgba(5,150,105,0.08)' : 'rgba(220,38,38,0.08)',
          }}>
            {deltaUp ? <ArrowUpRight size={9} /> : <ArrowDownRight size={9} />}{delta}
          </span>
        )}
      </div>
      <div style={{ position: 'relative' }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#0a0a18', letterSpacing: '-0.03em', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 5, fontWeight: 500 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

/* ─── Record Payment Modal ───────────────────────────────── */
function RecordPaymentModal({ clients, onClose, onSaved }: { clients: ClientOption[]; onClose: () => void; onSaved: () => void }) {
  const today = isoToday();
  const [form, setForm]     = useState({ client_id: '', amount: '', method: 'CASH', date: today, notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const F = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const selectedClient = clients.find((c) => String(c.id) === form.client_id);
  const balanceDue = Number(selectedClient?.balance_due ?? selectedClient?.balance_amount ?? 0);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.client_id || !form.amount) { setError('Member and Amount are required.'); return; }
    setSaving(true); setError('');
    try {
      await api.payments.create({ ...form, amount: parseFloat(form.amount as any) });
      onSaved();
    } catch (e: any) { setError(e.message || 'Failed.'); }
    finally { setSaving(false); }
  }

  const methodMeta: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
    CASH:          { icon: <Banknote size={14} />,    color: '#059669', label: 'Cash' },
    UPI:           { icon: <Smartphone size={14} />,  color: '#2563eb', label: 'UPI' },
    CARD:          { icon: <CreditCard size={14} />,  color: '#7c3aed', label: 'Card' },
    BANK_TRANSFER: { icon: <Building2 size={14} />,   color: '#ea580c', label: 'Bank Transfer' },
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,30,0.6)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}
      onClick={onClose}
    >
      <div
        style={{ background: 'white', borderRadius: 28, width: '100%', maxWidth: 500, boxShadow: '0 40px 100px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.9)', overflow: 'hidden', animation: 'modalIn 220ms cubic-bezier(0.34,1.56,0.64,1)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{
          padding: '24px 26px 20px',
          background: 'linear-gradient(145deg, #0d1117 0%, #111827 100%)',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -60, right: -60, width: 180, height: 180, background: 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 13, background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(16,185,129,0.4)' }}>
                <Plus size={18} color="white" />
              </div>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: 'white', margin: 0, letterSpacing: '-0.02em' }}>Record Payment</h3>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: '3px 0 0' }}>Log a new collection entry</p>
              </div>
            </div>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.7)' }}><X size={13} /></button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ padding: '22px 26px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid rgba(220,38,38,0.15)', borderRadius: 12, padding: '10px 14px', fontSize: 13, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertCircle size={13} />{error}
              </div>
            )}

            {/* Member */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '1px', display: 'block', marginBottom: 7 }}>Member *</label>
              <select style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: '1.5px solid rgba(100,116,139,0.15)', background: 'rgba(248,250,252,0.8)', fontSize: 14, color: '#0f172a', outline: 'none', boxSizing: 'border-box' as const }} value={form.client_id} onChange={F('client_id')} required>
                <option value="">Select member…</option>
                {clients.map((c) => {
                  const due = Number(c.balance_due ?? c.balance_amount ?? 0);
                  return <option key={c.id} value={c.id}>{c.name}{due > 0 ? ' · Due: ' + fmtAmount(due) : ''}</option>;
                })}
              </select>
              {balanceDue > 0 && (
                <p style={{ fontSize: 12, color: '#dc2626', marginTop: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <AlertCircle size={11} /> Outstanding: {fmtAmount(balanceDue)}
                </p>
              )}
            </div>

            {/* Amount + Date */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '1px', display: 'block', marginBottom: 7 }}>Amount (₹) *</label>
                <input style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: '1.5px solid rgba(100,116,139,0.15)', background: 'rgba(248,250,252,0.8)', fontSize: 14, color: '#0f172a', outline: 'none', boxSizing: 'border-box' as const }} type="number" min="1" step="1" value={form.amount} onChange={F('amount')} required placeholder={balanceDue > 0 ? String(balanceDue) : '0'} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '1px', display: 'block', marginBottom: 7 }}>Date</label>
                <input style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: '1.5px solid rgba(100,116,139,0.15)', background: 'rgba(248,250,252,0.8)', fontSize: 14, color: '#0f172a', outline: 'none', boxSizing: 'border-box' as const }} type="date" value={form.date} onChange={F('date')} required />
              </div>
            </div>

            {/* Method quick-select */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '1px', display: 'block', marginBottom: 8 }}>Payment Method</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                {(['CASH', 'UPI', 'CARD', 'BANK_TRANSFER'] as const).map((m) => {
                  const meta = methodMeta[m];
                  const active = form.method === m;
                  return (
                    <button key={m} type="button" onClick={() => setForm(f => ({ ...f, method: m }))}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                        padding: '10px 6px', borderRadius: 12,
                        border: '1.5px solid ' + (active ? meta.color : 'rgba(100,116,139,0.15)'),
                        background: active ? meta.color + '0d' : 'transparent',
                        color: active ? meta.color : '#64748b',
                        cursor: 'pointer', transition: 'all 140ms ease',
                        fontSize: 10, fontWeight: 700,
                      }}>
                      {meta.icon}
                      <span>{meta.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '1px', display: 'block', marginBottom: 7 }}>Notes <span style={{ fontWeight: 400, textTransform: 'none' as const, letterSpacing: 0, color: '#b0bec5', fontSize: 11 }}>optional</span></label>
              <input style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: '1.5px solid rgba(100,116,139,0.15)', background: 'rgba(248,250,252,0.8)', fontSize: 14, color: '#0f172a', outline: 'none', boxSizing: 'border-box' as const }} value={form.notes} onChange={F('notes')} placeholder="e.g. July membership, PT session…" />
            </div>

            {/* Live preview */}
            {form.amount && form.client_id && (
              <div style={{ background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 11, color: '#059669', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.8px' }}>Preview</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: '#0a0a18', letterSpacing: '-0.03em', marginTop: 3 }}>{fmtAmount(Number(form.amount) || 0)}</div>
                </div>
                <div style={{ textAlign: 'right' as const }}>
                  <MethodBadge method={form.method} size="md" />
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{fmtDate(form.date)}</div>
                </div>
              </div>
            )}
          </div>

          <div style={{ padding: '0 26px 24px', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding: '11px 22px', borderRadius: 13, border: '1.5px solid rgba(100,116,139,0.18)', background: 'white', fontSize: 14, fontWeight: 600, color: '#475569', cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ padding: '11px 26px', borderRadius: 13, border: 'none', background: 'linear-gradient(135deg, #10b981, #059669)', fontSize: 14, fontWeight: 700, color: 'white', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.75 : 1, boxShadow: saving ? 'none' : '0 4px 14px rgba(16,185,129,0.4)', transition: 'all 160ms ease' }}>
              {saving ? 'Recording…' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Insight Bar ────────────────────────────────────────── */
function InsightBar({ payments, kpis }: { payments: Payment[]; kpis: { total: number; todayRev: number; monthRev: number; dueTot: number } }) {
  const rate = kpis.total + kpis.dueTot > 0 ? Math.round((kpis.total / (kpis.total + kpis.dueTot)) * 100) : null;
  const cashPct = payments.length > 0 ? Math.round((payments.filter(p => p.method === 'CASH').length / payments.length) * 100) : null;
  let msg = 'Add payment records to unlock AI-powered revenue insights.';
  if (rate !== null) {
    const dueText = kpis.dueTot > 0 ? fmtCompact(kpis.dueTot) : 'all dues';
    msg = `Collection efficiency: ${rate}%. ${rate >= 80 ? 'Strong performance — maintain momentum.' : `Focus on recovering ${dueText} in outstanding dues.`}${cashPct !== null ? ` ${cashPct}% of transactions are cash — encourage digital payments for easier reconciliation.` : ''}`;
  }
  return (
    <div style={{
      background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(16px)',
      border: '1px solid rgba(139,92,246,0.12)',
      borderLeft: '3px solid #8b5cf6',
      borderRadius: '0 14px 14px 0', padding: '12px 16px',
      display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18,
      boxShadow: '0 1px 4px rgba(139,92,246,0.06)',
    }}>
      <div style={{ width: 30, height: 30, borderRadius: 9, background: 'linear-gradient(135deg,#7c3aed,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 3px 10px rgba(124,58,237,0.28)' }}>
        <Sparkles size={13} color="white" />
      </div>
      <div>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase' as const, letterSpacing: '0.9px', marginRight: 8 }}>AI Insight</span>
        <span style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>{msg}</span>
      </div>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────── */
function PaymentsContent() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'manager';
  const [payments, setPayments] = useState<Payment[]>([]);
  const [clients, setClients]   = useState<ClientOption[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [showModal, setShowModal] = useState(false);
  const [filterFrom, setFilterFrom]     = useState('');
  const [filterTo, setFilterTo]         = useState('');
  const [filterMethod, setFilterMethod] = useState('ALL');
  const [search, setSearch]             = useState('');
  const [page, setPage]                 = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<Payment | null>(null);
  const [deleting, setDeleting]         = useState(false);
  const today      = isoToday();
  const monthStart = isoMonthStart();

  const fetchAll = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams();
      if (filterFrom) params.set('from', filterFrom);
      if (filterTo)   params.set('to', filterTo);
      const [pRes, cRes] = await Promise.allSettled([
        api.payments.list(Object.fromEntries(params)),
        api.clients.list(),
      ]);
      if (pRes.status === 'fulfilled') { const d = pRes.value as any; setPayments(Array.isArray(d) ? d : (d.payments ?? [])); }
      if (cRes.status === 'fulfilled') { const d = cRes.value as any; setClients(Array.isArray(d) ? d : (d.clients ?? [])); }
    } catch (e: any) { setError(e.message || 'Failed to load.'); }
    finally { setLoading(false); }
  }, [filterFrom, filterTo]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => { setPage(1); }, [filterFrom, filterTo, filterMethod, search]);

  const kpis = useMemo(() => {
    const total    = payments.reduce((s, p) => s + Number(p.amount), 0);
    const todayRev = payments.filter((p) => p.date === today).reduce((s, p) => s + Number(p.amount), 0);
    const monthRev = payments.filter((p) => p.date >= monthStart).reduce((s, p) => s + Number(p.amount), 0);
    const dueTot   = clients.reduce((s, c) => s + Number(c.balance_due ?? c.balance_amount ?? 0), 0);
    return { total, todayRev, monthRev, dueTot };
  }, [payments, clients, today, monthStart]);

  const todayPayments = useMemo(() => payments.filter(p => p.date === today), [payments, today]);

  const todayMethodBreakdown = useMemo(() => {
    const m: Record<string, number> = {};
    todayPayments.forEach((p) => { m[p.method] = (m[p.method] ?? 0) + Number(p.amount); });
    return m;
  }, [todayPayments]);

  const allMethodBreakdown = useMemo(() => {
    const m: Record<string, number> = {};
    payments.forEach((p) => { m[p.method] = (m[p.method] ?? 0) + Number(p.amount); });
    return m;
  }, [payments]);

  const filtered = useMemo(() => {
    let list = [...payments];
    if (filterMethod !== 'ALL') list = list.filter((p) => p.method === filterMethod);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) =>
        (p.client_name ?? '').toLowerCase().includes(q) ||
        (p.receipt_no ?? '').toLowerCase().includes(q) ||
        (p.notes ?? '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [payments, filterMethod, search]);

  const totalPages   = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated    = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const filteredTotal = filtered.reduce((s, p) => s + Number(p.amount), 0);

  const membersWithDues  = clients.filter((c) => Number(c.balance_due ?? c.balance_amount ?? 0) > 0).length;
  const collectionRate   = kpis.total + kpis.dueTot > 0 ? Math.round((kpis.total / (kpis.total + kpis.dueTot)) * 100) : 0;

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.payments.delete(String(deleteTarget.id));
      setPayments((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e: any) { alert('Delete failed: ' + e.message); }
    finally { setDeleting(false); }
  }

  const cardBase: React.CSSProperties = {
    background: 'rgba(255,255,255,0.88)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255,255,255,0.95)',
    borderRadius: 20,
    boxShadow: '0 1px 4px rgba(15,23,42,0.04), 0 4px 16px rgba(15,23,42,0.05)',
  };
  const inputBase: React.CSSProperties = {
    padding: '10px 13px', borderRadius: 11,
    border: '1.5px solid rgba(100,116,139,0.15)',
    background: 'rgba(248,250,252,0.8)',
    fontSize: 13, color: '#0f172a', outline: 'none',
    boxSizing: 'border-box' as const,
    transition: 'border-color 160ms, box-shadow 160ms',
  };

  return (
    <AppShell>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @keyframes shimmer    { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes fadeInUp   { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin       { to{transform:rotate(360deg)} }
        @keyframes modalIn    { from{opacity:0;transform:scale(0.96) translateY(10px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes pulseDot   { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.6;transform:scale(0.9)} }
        .rp-page { animation: fadeInUp 0.3s ease; font-family: 'Inter', sans-serif; }
        .rp-table tbody tr { transition: background 120ms ease; }
        .rp-table tbody tr:hover td { background: rgba(16,185,129,0.025) !important; }
        .rp-row-del { opacity:0; transition: opacity 120ms ease; }
        .rp-table tbody tr:hover .rp-row-del { opacity:1; }
        input:focus, select:focus { border-color: rgba(16,185,129,0.45) !important; box-shadow: 0 0 0 3px rgba(16,185,129,0.08) !important; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(100,116,139,0.18); border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(100,116,139,0.32); }
      `}</style>

      <div className="rp-page" style={{
        maxWidth: 1320, margin: '0 auto',
        padding: 'clamp(16px,3vw,32px) clamp(14px,2.5vw,28px) 64px',
        background: 'linear-gradient(160deg, #f0faf6 0%, #f5f0ff 45%, #f0f6ff 100%)',
        minHeight: '100vh',
      }}>

        {/* ── Page header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 20, padding: '3px 10px', textTransform: 'uppercase' as const, letterSpacing: '0.8px' }}>Finance</span>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>/ Revenue &amp; Collections</span>
            </div>
            <h1 style={{ fontSize: 'clamp(20px,3vw,26px)', fontWeight: 800, color: '#0a0a18', margin: 0, letterSpacing: '-0.03em' }}>Revenue Intelligence</h1>
            <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0', fontWeight: 500 }}>Today's collections · Full ledger · Member financials</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => exportCSV(filtered)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 12, border: '1.5px solid rgba(100,116,139,0.16)', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)', fontSize: 12, fontWeight: 600, color: '#374151', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', transition: 'all 160ms ease' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = ''; }}>
              <Download size={13} /> Export
            </button>
            <button onClick={fetchAll} disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 12, border: '1.5px solid rgba(100,116,139,0.16)', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)', fontSize: 12, fontWeight: 600, color: '#374151', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <RefreshCw size={12} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            </button>
          </div>
        </div>

        {/* ── Today's Revenue Hero ── */}
        <TodayRevenueHero
          todayPayments={todayPayments}
          todayRev={kpis.todayRev}
          methodBreakdown={todayMethodBreakdown}
          onAdd={() => setShowModal(true)}
          isAdmin={isAdmin}
          loading={loading}
          onRefresh={fetchAll}
        />

        {/* ── KPI Stats ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px,1fr))', gap: 12, marginBottom: 20 }}>
          <StatCard label="This Month" value={fmtCompact(kpis.monthRev)} sub="Month-to-date" icon={<Calendar size={15} />} accent="linear-gradient(135deg,#3b82f6,#2563eb)" />
          <StatCard label="Total Collected" value={fmtCompact(kpis.total)} sub="All time" icon={<TrendingUp size={15} />} accent="linear-gradient(135deg,#10b981,#059669)" delta="All time" />
          <StatCard label="Outstanding Dues" value={fmtCompact(kpis.dueTot)} sub={membersWithDues + ' member' + (membersWithDues !== 1 ? 's' : '') + ' pending'} icon={<AlertCircle size={15} />} accent="linear-gradient(135deg,#ef4444,#dc2626)" delta={kpis.dueTot > 0 ? 'Review' : undefined} deltaUp={false} />
          <StatCard label="Collection Rate" value={collectionRate + '%'} sub="Collected vs total" icon={<Target size={15} />} accent="linear-gradient(135deg,#8b5cf6,#7c3aed)" delta={collectionRate >= 80 ? 'Strong' : undefined} />
          <StatCard label="Transactions" value={String(payments.length)} sub="All time" icon={<Receipt size={15} />} accent="linear-gradient(135deg,#f59e0b,#d97706)" />
          <StatCard label="Members" value={String(clients.length)} sub="Active in system" icon={<Users size={15} />} accent="linear-gradient(135deg,#06b6d4,#0891b2)" />
        </div>

        {/* ── Insight bar ── */}
        {!loading && payments.length > 0 && <InsightBar payments={payments} kpis={kpis} />}

        {/* ── Error ── */}
        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid rgba(220,38,38,0.12)', borderRadius: 13, padding: '11px 15px', fontSize: 13, color: '#dc2626', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={13} />{error}
            <button onClick={fetchAll} style={{ marginLeft: 8, fontSize: 12, color: '#7c3aed', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>Retry</button>
          </div>
        )}

        {/* ── Search & Filters ── */}
        <div style={{ ...cardBase, padding: '12px 16px', marginBottom: 12, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 0 }}>
            <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
            <input
              type="search" placeholder="Search member, receipt, notes…"
              value={search} onChange={(e) => setSearch(e.target.value)}
              style={{ ...inputBase, width: '100%', paddingLeft: 32 }}
            />
          </div>

          {/* Date range */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Calendar size={12} style={{ color: '#94a3b8' }} />
            <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} style={{ ...inputBase, width: 'auto', fontSize: 12, padding: '8px 10px' }} />
            <span style={{ color: '#cbd5e1', fontSize: 12 }}>→</span>
            <input type="date" value={filterTo}   onChange={(e) => setFilterTo(e.target.value)}   style={{ ...inputBase, width: 'auto', fontSize: 12, padding: '8px 10px' }} />
          </div>

          {/* Method pills */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {METHODS.map((m) => (
              <button key={m}
                onClick={() => setFilterMethod(m)}
                style={{
                  padding: '6px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  border: '1.5px solid',
                  borderColor: filterMethod === m ? '#10b981' : 'rgba(100,116,139,0.15)',
                  background: filterMethod === m ? 'linear-gradient(135deg,#10b981,#059669)' : 'rgba(255,255,255,0.8)',
                  color: filterMethod === m ? 'white' : '#64748b',
                  boxShadow: filterMethod === m ? '0 2px 8px rgba(16,185,129,0.25)' : 'none',
                  transition: 'all 140ms ease',
                }}>
                {m === 'ALL' ? 'All' : m.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Clear + total */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto', flexWrap: 'wrap' }}>
            {(filterFrom || filterTo || filterMethod !== 'ALL' || search) && (
              <button onClick={() => { setFilterFrom(''); setFilterTo(''); setFilterMethod('ALL'); setSearch(''); }}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 11px', borderRadius: 9, border: '1.5px solid rgba(220,38,38,0.18)', background: 'rgba(254,242,242,0.8)', fontSize: 11, fontWeight: 700, color: '#dc2626', cursor: 'pointer' }}>
                <X size={10} />Clear
              </button>
            )}
            <div style={{ fontSize: 15, fontWeight: 800, color: '#059669', letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums' }}>
              {fmtAmount(filteredTotal)}
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>{filtered.length} records</div>
          </div>
        </div>

        {/* ── Payments Table ── */}
        <div style={{ ...cardBase, borderRadius: 20, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="rp-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(248,250,252,0.8)', borderBottom: '1px solid rgba(100,116,139,0.08)' }}>
                  {['Receipt', 'Member', 'Amount', 'Method', 'Date', 'Notes', ...(isAdmin ? [''] : [])].map((h, i) => (
                    <th key={i} style={{
                      padding: '12px 18px', textAlign: 'left',
                      fontSize: 10, fontWeight: 800, color: '#94a3b8',
                      textTransform: 'uppercase' as const, letterSpacing: '1px',
                      whiteSpace: 'nowrap' as const,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} />)
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 7 : 6}>
                      <div style={{ padding: '72px 32px', textAlign: 'center' }}>
                        <div style={{ width: 68, height: 68, borderRadius: '50%', background: 'rgba(16,185,129,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: '1px solid rgba(16,185,129,0.12)' }}>
                          <TrendingUp size={28} style={{ color: '#10b981', opacity: 0.7 }} />
                        </div>
                        <p style={{ fontSize: 16, fontWeight: 700, color: '#0a0a18', margin: '0 0 6px' }}>No payments found</p>
                        <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 20px' }}>
                          {search ? 'Try a different search or clear filters.' : 'Record your first payment to start tracking revenue.'}
                        </p>
                        {isAdmin && (
                          <button onClick={() => setShowModal(true)} style={{ padding: '10px 22px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#10b981,#059669)', fontSize: 13, fontWeight: 700, color: 'white', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7, boxShadow: '0 4px 14px rgba(16,185,129,0.3)' }}>
                            <Plus size={13} /> Record First Payment
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginated.map((p) => {
                    const isToday = p.date === today;
                    return (
                      <tr key={p.id} style={{ borderBottom: '1px solid rgba(100,116,139,0.05)' }}>
                        <td style={{ padding: '13px 18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {isToday && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', flexShrink: 0 }} title="Today" />}
                            <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#7c3aed', background: 'rgba(124,58,237,0.06)', borderRadius: 7, padding: '3px 8px', border: '1px solid rgba(124,58,237,0.1)' }}>
                              {p.receipt_no ?? '—'}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '13px 18px' }}>
                          <div style={{ fontWeight: 700, color: '#0a0a18', fontSize: 14 }}>{p.client_name ?? '—'}</div>
                          {p.trainer_name && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>via {p.trainer_name}</div>}
                        </td>
                        <td style={{ padding: '13px 18px' }}>
                          <span style={{ fontSize: 15, fontWeight: 800, color: '#059669', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                            {fmtAmount(p.amount)}
                          </span>
                        </td>
                        <td style={{ padding: '13px 18px' }}><MethodBadge method={p.method} /></td>
                        <td style={{ padding: '13px 18px' }}>
                          <div style={{ fontSize: 13, color: '#374151', fontWeight: 500, whiteSpace: 'nowrap' as const }}>{fmtDate(p.date)}</div>
                          {isToday && <div style={{ fontSize: 10, color: '#10b981', fontWeight: 700, marginTop: 2 }}>Today</div>}
                        </td>
                        <td style={{ padding: '13px 18px', maxWidth: 200 }}>
                          <span style={{ fontSize: 12, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, display: 'block' }}>
                            {p.notes || '—'}
                          </span>
                        </td>
                        {isAdmin && (
                          <td style={{ padding: '13px 18px' }}>
                            <button className="rp-row-del" onClick={() => setDeleteTarget(p)}
                              style={{ width: 28, height: 28, borderRadius: 8, border: '1.5px solid rgba(220,38,38,0.16)', background: 'rgba(254,242,242,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ef4444' }}>
                              <Trash2 size={11} />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && filtered.length > PAGE_SIZE && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 20px', borderTop: '1px solid rgba(100,116,139,0.07)', flexWrap: 'wrap', gap: 10 }}>
              <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>
                Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
                  style={{ width: 32, height: 32, borderRadius: 10, border: '1.5px solid rgba(100,116,139,0.14)', background: 'white', cursor: page <= 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: page <= 1 ? '#cbd5e1' : '#374151', opacity: page <= 1 ? 0.5 : 1 }}>
                  <ChevronLeft size={13} />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const pg = totalPages <= 5 ? i + 1 : Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                  return (
                    <button key={pg} onClick={() => setPage(pg)}
                      style={{ minWidth: 32, height: 32, borderRadius: 10, border: '1.5px solid', borderColor: pg === page ? '#10b981' : 'rgba(100,116,139,0.14)', background: pg === page ? 'linear-gradient(135deg,#10b981,#059669)' : 'white', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: pg === page ? 'white' : '#374151', boxShadow: pg === page ? '0 2px 8px rgba(16,185,129,0.25)' : 'none' }}>
                      {pg}
                    </button>
                  );
                })}
                <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
                  style={{ width: 32, height: 32, borderRadius: 10, border: '1.5px solid rgba(100,116,139,0.14)', background: 'white', cursor: page >= totalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: page >= totalPages ? '#cbd5e1' : '#374151', opacity: page >= totalPages ? 0.5 : 1 }}>
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Method breakdown strip ── */}
        {!loading && payments.length > 0 && (
          <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {Object.entries(allMethodBreakdown).map(([method, amt]) => (
              <div key={method} style={{ ...cardBase, padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 160px', borderRadius: 14 }}>
                <MethodBadge method={method} size="md" />
                <div style={{ fontSize: 14, fontWeight: 800, color: '#0a0a18', letterSpacing: '-0.01em' }}>{fmtCompact(amt)}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginLeft: 'auto' }}>{payments.filter(p => p.method === method).length}×</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Record Payment Modal ── */}
      {showModal && (
        <RecordPaymentModal clients={clients} onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); fetchAll(); }} />
      )}

      {/* ── Delete Confirm ── */}
      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,30,0.6)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setDeleteTarget(null)}>
          <div style={{ background: 'white', borderRadius: 24, width: '100%', maxWidth: 380, padding: '28px', boxShadow: '0 40px 100px rgba(0,0,0,0.22)', margin: 16, animation: 'modalIn 220ms cubic-bezier(0.34,1.56,0.64,1)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ width: 44, height: 44, borderRadius: 13, background: 'linear-gradient(135deg,#ef4444,#dc2626)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, boxShadow: '0 4px 14px rgba(220,38,38,0.3)' }}>
              <Trash2 size={18} color="white" />
            </div>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: '#0a0a18', margin: '0 0 8px', letterSpacing: '-0.02em' }}>Delete Payment?</h3>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 8px', lineHeight: 1.6 }}>
              This will permanently remove the payment record for <strong>{deleteTarget.client_name ?? 'Unknown'}</strong>.
            </p>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 22, background: '#fef2f2', borderRadius: 10, padding: '8px 12px' }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: '#dc2626' }}>{fmtAmount(deleteTarget.amount)}</span>
              <MethodBadge method={deleteTarget.method} />
              <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 'auto' }}>{fmtDate(deleteTarget.date)}</span>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleteTarget(null)} style={{ flex: 1, padding: '11px', borderRadius: 12, border: '1.5px solid rgba(100,116,139,0.18)', background: 'white', fontSize: 14, fontWeight: 600, color: '#475569', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleDelete} disabled={deleting} style={{ flex: 1, padding: '11px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#ef4444,#dc2626)', fontSize: 14, fontWeight: 700, color: 'white', cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.75 : 1, boxShadow: '0 4px 12px rgba(220,38,38,0.3)' }}>
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

export default function PaymentsPage() {
  return (
    <Guard>
      <PaymentsContent />
    </Guard>
  );
}
