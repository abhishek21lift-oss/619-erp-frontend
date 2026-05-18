'use client';
/**
 * Revenue Intelligence — Ultra-Premium Fintech Dashboard
 * 619 Fitness Studio · All backend APIs, state, and business logic preserved.
 * UI completely redesigned: glassmorphism, animated KPIs, premium data grid.
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
  ArrowDownRight, Filter, MoreHorizontal,
} from 'lucide-react';

/* ─── Types ─────────────────────────────────────────────── */
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

/* ─── Helpers ───────────────────────────────────────────── */
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
function isoMonthStart() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; }
function exportCSV(payments: Payment[]) {
  const headers = ['Receipt', 'Member', 'Amount', 'Method', 'Date', 'Notes'];
  const rows = payments.map((p) => [p.receipt_no ?? '', p.client_name ?? '', p.amount, p.method, p.date, p.notes ?? '']);
  const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `619_payments_${isoToday()}.csv`;
  a.click();
}

/* ─── CSS-in-JS styles object ───────────────────────────── */
const S = {
  // Surfaces
  card: {
    background: 'rgba(255,255,255,0.85)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.9)',
    borderRadius: 20,
    boxShadow: '0 1px 3px rgba(15,23,42,0.04), 0 4px 16px rgba(15,23,42,0.06)',
  } as React.CSSProperties,
  cardElevated: {
    background: 'rgba(255,255,255,0.92)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid rgba(255,255,255,0.95)',
    borderRadius: 24,
    boxShadow: '0 2px 6px rgba(15,23,42,0.04), 0 8px 32px rgba(15,23,42,0.08)',
  } as React.CSSProperties,
  // Text
  heading: { fontSize: 28, fontWeight: 800, color: '#0a0a18', letterSpacing: '-0.03em', lineHeight: 1.1 } as React.CSSProperties,
  subheading: { fontSize: 14, color: '#64748b', fontWeight: 500, lineHeight: 1.5 } as React.CSSProperties,
  label: { fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '1px' },
  // Inputs
  input: {
    width: '100%', padding: '11px 14px', borderRadius: 12,
    border: '1.5px solid rgba(100,116,139,0.15)',
    background: 'rgba(248,250,252,0.8)',
    fontSize: 14, color: '#0f172a', outline: 'none',
    boxSizing: 'border-box' as const,
    transition: 'border-color 160ms ease, box-shadow 160ms ease',
  } as React.CSSProperties,
};

/* ─── Animated Counter ──────────────────────────────────── */
function AnimatedNumber({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = value;
    if (end === 0) { setDisplay(0); return; }
    const duration = 900;
    const step = end / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setDisplay(end); clearInterval(timer); }
      else setDisplay(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [value]);
  return <>{prefix}{Number(display).toLocaleString('en-IN')}{suffix}</>;
}

/* ─── Premium KPI Card ──────────────────────────────────── */
function KpiCard({
  label, value, sub, icon, gradient, delta, deltaUp = true,
}: {
  label: string; value: string; sub?: string;
  icon: React.ReactNode; gradient: string; delta?: string; deltaUp?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...S.card,
        padding: '22px 24px',
        display: 'flex', flexDirection: 'column', gap: 14,
        cursor: 'default', position: 'relative', overflow: 'hidden',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        boxShadow: hovered
          ? '0 4px 20px rgba(15,23,42,0.10), 0 16px 48px rgba(15,23,42,0.08)'
          : S.card.boxShadow,
        transition: 'transform 200ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 200ms ease',
      }}
    >
      {/* subtle gradient background glow */}
      <div style={{
        position: 'absolute', inset: 0, opacity: hovered ? 0.06 : 0.03,
        background: gradient, borderRadius: 20, transition: 'opacity 200ms',
      }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
        <div style={{
          width: 38, height: 38, borderRadius: 11,
          background: gradient, display: 'flex', alignItems: 'center',
          justifyContent: 'center', color: 'white',
          boxShadow: `0 4px 12px rgba(0,0,0,0.15)`,
        }}>
          {icon}
        </div>
        {delta && (
          <span style={{
            fontSize: 11, fontWeight: 700, borderRadius: 20, padding: '3px 9px',
            display: 'flex', alignItems: 'center', gap: 3,
            color: deltaUp ? '#059669' : '#dc2626',
            background: deltaUp ? 'rgba(5,150,105,0.08)' : 'rgba(220,38,38,0.08)',
          }}>
            {deltaUp ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}{delta}
          </span>
        )}
      </div>
      <div style={{ position: 'relative' }}>
        <div style={{ fontSize: 24, fontWeight: 800, color: '#0a0a18', letterSpacing: '-0.03em', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 5, fontWeight: 500 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

/* ─── Method Badge ──────────────────────────────────────── */
function MethodBadge({ method }: { method: string }) {
  const map: Record<string, { bg: string; color: string; icon: React.ReactNode }> = {
    CASH:          { bg: 'rgba(5,150,105,0.08)',   color: '#059669', icon: <Banknote size={10} /> },
    UPI:           { bg: 'rgba(37,99,235,0.08)',   color: '#2563eb', icon: <Smartphone size={10} /> },
    CARD:          { bg: 'rgba(124,58,237,0.08)',  color: '#7c3aed', icon: <CreditCard size={10} /> },
    BANK_TRANSFER: { bg: 'rgba(234,88,12,0.08)',   color: '#ea580c', icon: <Building2 size={10} /> },
  };
  const s = map[method] ?? { bg: 'rgba(100,116,139,0.08)', color: '#475569', icon: null };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 11, fontWeight: 700,
      background: s.bg, color: s.color,
      borderRadius: 20, padding: '3px 9px',
      border: `1px solid ${s.color}20`,
    }}>
      {s.icon}{method.replace('_', ' ')}
    </span>
  );
}

/* ─── Skeleton ──────────────────────────────────────────── */
function SkeletonRow() {
  return (
    <tr>
      {[80, 140, 90, 80, 90, 160].map((w, i) => (
        <td key={i} style={{ padding: '15px 18px' }}>
          <div style={{
            height: 13, width: w, borderRadius: 6,
            background: 'linear-gradient(90deg,rgba(241,245,249,1) 25%,rgba(226,232,240,1) 50%,rgba(241,245,249,1) 75%)',
            backgroundSize: '200% 100%', animation: 'shimmer 1.4s ease-in-out infinite',
          }} />
        </td>
      ))}
    </tr>
  );
}

/* ─── AI Insight Banner ─────────────────────────────────── */
function AiInsightBanner({ payments, kpis }: { payments: Payment[]; kpis: { total: number; todayRev: number; monthRev: number; dueTot: number } }) {
  const rate = kpis.total + kpis.dueTot > 0 ? Math.round((kpis.total / (kpis.total + kpis.dueTot)) * 100) : null;
  const cashPct = payments.length > 0
    ? Math.round((payments.filter(p => p.method === 'CASH').length / payments.length) * 100)
    : null;

  // Build insight string without nested template literals
  let insight: string;
  if (rate !== null) {
    const dueText = kpis.dueTot > 0 ? fmtCompact(kpis.dueTot) : 'outstanding';
    const focusMsg = rate >= 80
      ? 'Strong performance — consider rewarding top payers.'
      : 'Focus on ' + dueText + ' in dues.';
    const cashMsg = cashPct !== null
      ? ' ' + String(cashPct) + '% of transactions are cash — encourage digital payments for faster reconciliation.'
      : '';
    insight = 'Collection efficiency is at ' + String(rate) + '%. ' + focusMsg + cashMsg;
  } else {
    insight = 'Add payment records to unlock AI-powered revenue insights and forecasting.';
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(124,58,237,0.07) 0%, rgba(79,70,229,0.05) 50%, rgba(14,165,233,0.05) 100%)',
      border: '1px solid rgba(124,58,237,0.15)',
      borderRadius: 16, padding: '14px 18px',
      display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 10, flexShrink: 0,
        background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 12px rgba(124,58,237,0.3)',
      }}>
        <Sparkles size={14} color="white" />
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 3 }}>
          AI Revenue Intelligence
        </div>
        <p style={{ fontSize: 13, color: '#374151', margin: 0, lineHeight: 1.6 }}>{insight}</p>
      </div>
    </div>
  );
}

/* ─── Record Payment Modal ──────────────────────────────── */
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

  const methodIcons: Record<string, React.ReactNode> = {
    CASH: <Banknote size={14} />, UPI: <Smartphone size={14} />,
    CARD: <CreditCard size={14} />, BANK_TRANSFER: <Building2 size={14} />,
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,30,0.55)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}
      onClick={onClose}
    >
      <div
        style={{ background: 'white', borderRadius: 28, width: '100%', maxWidth: 500, boxShadow: '0 32px 80px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.8)', overflow: 'hidden', animation: 'modalIn 200ms cubic-bezier(0.34,1.56,0.64,1)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '26px 28px 22px', background: 'linear-gradient(135deg,#7c3aed 0%,#4f46e5 60%,#2563eb 100%)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 120, height: 120, background: 'rgba(255,255,255,0.07)', borderRadius: '50%' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
            <div>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: 'white', margin: 0, letterSpacing: '-0.02em' }}>Record Payment</h3>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', margin: '4px 0 0' }}>Log a new collection entry</p>
            </div>
            <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}><X size={14} /></button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid rgba(220,38,38,0.15)', borderRadius: 12, padding: '10px 14px', fontSize: 13, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertCircle size={14} />{error}
              </div>
            )}

            {/* Member */}
            <div>
              <label style={{ ...S.label, display: 'block', marginBottom: 8 }}>Member *</label>
              <select style={{ ...S.input }} value={form.client_id} onChange={F('client_id')} required>
                <option value="">Select member…</option>
                {clients.map((c) => {
                  const due = Number(c.balance_due ?? c.balance_amount ?? 0);
                  return <option key={c.id} value={c.id}>{c.name}{due > 0 ? ` · Due: ${fmtAmount(due)}` : ''}</option>;
                })}
              </select>
              {balanceDue > 0 && (
                <p style={{ fontSize: 12, color: '#dc2626', marginTop: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <AlertCircle size={11} /> Outstanding balance: {fmtAmount(balanceDue)}
                </p>
              )}
            </div>

            {/* Amount + Method */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={{ ...S.label, display: 'block', marginBottom: 8 }}>Amount (₹) *</label>
                <input style={{ ...S.input }} type="number" min="1" step="1" value={form.amount} onChange={F('amount')} required placeholder={balanceDue > 0 ? String(balanceDue) : '0'} />
              </div>
              <div>
                <label style={{ ...S.label, display: 'block', marginBottom: 8 }}>Payment Method</label>
                <select style={{ ...S.input }} value={form.method} onChange={F('method')}>
                  <option>CASH</option><option>UPI</option><option>CARD</option><option>BANK_TRANSFER</option>
                </select>
              </div>
            </div>

            {/* Method quick-select pills */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['CASH','UPI','CARD','BANK_TRANSFER'].map((m) => (
                <button key={m} type="button"
                  onClick={() => setForm(f => ({ ...f, method: m }))}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                    border: '1.5px solid',
                    borderColor: form.method === m ? '#7c3aed' : 'rgba(100,116,139,0.2)',
                    background: form.method === m ? 'rgba(124,58,237,0.08)' : 'transparent',
                    color: form.method === m ? '#7c3aed' : '#64748b',
                    cursor: 'pointer', transition: 'all 140ms ease',
                  }}>
                  {methodIcons[m]}{m.replace('_', ' ')}
                </button>
              ))}
            </div>

            {/* Date */}
            <div>
              <label style={{ ...S.label, display: 'block', marginBottom: 8 }}>Date</label>
              <input style={{ ...S.input }} type="date" value={form.date} onChange={F('date')} required />
            </div>

            {/* Notes */}
            <div>
              <label style={{ ...S.label, display: 'block', marginBottom: 8 }}>Notes <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#b0bec5' }}>optional</span></label>
              <input style={{ ...S.input }} value={form.notes} onChange={F('notes')} placeholder="e.g. July membership renewal, PT package…" />
            </div>

            {/* Live preview */}
            {form.amount && form.client_id && (
              <div style={{ background: 'linear-gradient(135deg,rgba(124,58,237,0.05),rgba(79,70,229,0.05))', border: '1px solid rgba(124,58,237,0.12)', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 11, color: '#7c3aed', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Collection Preview</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#0a0a18', letterSpacing: '-0.02em', marginTop: 4 }}>{fmtAmount(Number(form.amount) || 0)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <MethodBadge method={form.method} />
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{fmtDate(form.date)}</div>
                </div>
              </div>
            )}
          </div>

          <div style={{ padding: '0 28px 26px', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding: '11px 22px', borderRadius: 13, border: '1.5px solid rgba(100,116,139,0.2)', background: 'white', fontSize: 14, fontWeight: 600, color: '#475569', cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ padding: '11px 26px', borderRadius: 13, border: 'none', background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', fontSize: 14, fontWeight: 700, color: 'white', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.75 : 1, boxShadow: saving ? 'none' : '0 4px 14px rgba(124,58,237,0.35)', transition: 'all 160ms ease' }}>
              {saving ? 'Recording…' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Revenue Hero Banner ────────────────────────────────── */
function RevenuHero({ kpis, payments, methodBreakdown, onRefresh, loading }: {
  kpis: { total: number; todayRev: number; monthRev: number; dueTot: number };
  payments: Payment[]; methodBreakdown: Record<string, number>;
  onRefresh: () => void; loading: boolean;
}) {
  const rate = kpis.total + kpis.dueTot > 0 ? Math.round((kpis.total / (kpis.total + kpis.dueTot)) * 100) : 0;
  return (
    <div style={{
      background: 'linear-gradient(135deg,#0f0c29 0%,#302b63 45%,#24243e 100%)',
      borderRadius: 28, padding: '36px 40px', marginBottom: 22,
      position: 'relative', overflow: 'hidden',
      boxShadow: '0 8px 40px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.12)',
    }}>
      {/* Ambient glows */}
      <div style={{ position: 'absolute', top: -80, right: -80, width: 280, height: 280, background: 'radial-gradient(circle,rgba(124,58,237,0.35) 0%,transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -60, left: 60, width: 200, height: 200, background: 'radial-gradient(circle,rgba(14,165,233,0.2) 0%,transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 28 }}>
        {/* Left — main metric */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Total Revenue Collected</span>
            <button onClick={onRefresh} disabled={loading} style={{ marginLeft: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', display: 'flex', padding: 4 }}>
              <RefreshCw size={12} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            </button>
          </div>
          <div style={{ fontSize: 52, fontWeight: 900, color: 'white', letterSpacing: '-0.04em', lineHeight: 1, marginBottom: 12 }}>
            {fmtCompact(kpis.total)}
          </div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: 2 }}>Today</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#a5f3fc', letterSpacing: '-0.02em' }}>{fmtCompact(kpis.todayRev)}</div>
            </div>
            <div style={{ width: 1, background: 'rgba(255,255,255,0.08)' }} />
            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: 2 }}>This Month</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#c4b5fd', letterSpacing: '-0.02em' }}>{fmtCompact(kpis.monthRev)}</div>
            </div>
            <div style={{ width: 1, background: 'rgba(255,255,255,0.08)' }} />
            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: 2 }}>Outstanding</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#fca5a5', letterSpacing: '-0.02em' }}>{fmtCompact(kpis.dueTot)}</div>
            </div>
          </div>
        </div>

        {/* Right — method breakdown + rate */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-end' }}>
          {/* Collection rate ring */}
          <div style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(10px)', borderRadius: 16, padding: '14px 20px', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center', minWidth: 130 }}>
            <div style={{ fontSize: 32, fontWeight: 900, color: rate >= 80 ? '#34d399' : rate >= 60 ? '#fbbf24' : '#f87171', letterSpacing: '-0.03em' }}>{rate}%</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', marginTop: 2 }}>Collection Rate</div>
          </div>
          {/* Method pills */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: 280 }}>
            {Object.entries(methodBreakdown).map(([method, amt]) => (
              <div key={method} style={{
                background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(8px)',
                borderRadius: 12, padding: '8px 14px',
                border: '1px solid rgba(255,255,255,0.1)',
              }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>{method.replace('_', ' ')}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'white' }}>{fmtCompact(amt)}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>
            {payments.length} transactions total
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ─────────────────────────────────────────── */
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

  const methodBreakdown = useMemo(() => {
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

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const filteredTotal = filtered.reduce((s, p) => s + Number(p.amount), 0);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.payments.delete(String(deleteTarget.id));
      setPayments((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e: any) { alert(`Delete failed: ${e.message}`); }
    finally { setDeleting(false); }
  }

  const membersWithDues = clients.filter((c) => Number(c.balance_due ?? c.balance_amount ?? 0) > 0).length;
  const collectionRate  = kpis.total + kpis.dueTot > 0 ? Math.round((kpis.total / (kpis.total + kpis.dueTot)) * 100) : 0;

  return (
    <AppShell>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @keyframes shimmer   { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes fadeInUp  { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin      { to{transform:rotate(360deg)} }
        @keyframes modalIn   { from{opacity:0;transform:scale(0.96) translateY(8px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes pulse-glow{ 0%,100%{opacity:1} 50%{opacity:0.5} }
        .ri-page { animation: fadeInUp 0.35s ease; font-family: 'Inter', sans-serif; }
        .ri-table tbody tr { transition: background 140ms ease; }
        .ri-table tbody tr:hover td { background: rgba(124,58,237,0.025); }
        .ri-method-btn { transition: all 140ms ease; }
        .ri-method-btn:hover { border-color: #7c3aed !important; color: #7c3aed !important; }
        .ri-action-btn { transition: all 160ms cubic-bezier(0.34,1.56,0.64,1); }
        .ri-action-btn:hover { transform: translateY(-1px); }
        input:focus, select:focus { border-color: rgba(124,58,237,0.5) !important; box-shadow: 0 0 0 3px rgba(124,58,237,0.08) !important; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(100,116,139,0.2); border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(100,116,139,0.35); }
      `}</style>

      <div className="ri-page" style={{
        maxWidth: 1320, margin: '0 auto',
        padding: 'clamp(16px,3vw,32px) clamp(14px,2.5vw,28px) 60px',
        background: 'linear-gradient(160deg,#f8f7ff 0%,#f0f4ff 40%,#f5f3ff 100%)',
        minHeight: '100vh',
      }}>

        {/* ── Page Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 26, flexWrap: 'wrap', gap: 14 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{ padding: '2px 10px', background: 'rgba(124,58,237,0.08)', borderRadius: 20, fontSize: 11, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.8px', border: '1px solid rgba(124,58,237,0.12)' }}>
                Finance
              </div>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>/ Revenue & Collections</span>
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0a0a18', margin: 0, letterSpacing: '-0.03em' }}>Revenue Intelligence</h1>
            <p style={{ fontSize: 13, color: '#64748b', margin: '5px 0 0', fontWeight: 500 }}>
              Payment ledger · Collection analytics · Member financials
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="ri-action-btn" onClick={() => exportCSV(filtered)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 13, border: '1.5px solid rgba(100,116,139,0.18)', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)', fontSize: 13, fontWeight: 600, color: '#374151', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <Download size={14} /> Export CSV
            </button>
            <button className="ri-action-btn" onClick={fetchAll} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 16px', borderRadius: 13, border: '1.5px solid rgba(100,116,139,0.18)', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)', fontSize: 13, fontWeight: 600, color: '#374151', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            </button>
            {isAdmin && (
              <button className="ri-action-btn" onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 22px', borderRadius: 13, border: 'none', background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', fontSize: 13, fontWeight: 700, color: 'white', cursor: 'pointer', boxShadow: '0 4px 14px rgba(124,58,237,0.35)' }}>
                <Plus size={14} /> Record Payment
              </button>
            )}
          </div>
        </div>

        {/* ── Hero Banner ── */}
        <RevenuHero kpis={kpis} payments={payments} methodBreakdown={methodBreakdown} onRefresh={fetchAll} loading={loading} />

        {/* ── KPI Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px,1fr))', gap: 14, marginBottom: 22 }}>
          <KpiCard label="Today's Collection" value={fmtCompact(kpis.todayRev)} sub={kpis.todayRev > 0 ? fmtAmount(kpis.todayRev) : 'No entries yet'} icon={<Zap size={16} />} gradient="linear-gradient(135deg,#7c3aed,#4f46e5)" delta={kpis.todayRev > 0 ? 'Today' : undefined} />
          <KpiCard label="This Month" value={fmtCompact(kpis.monthRev)} sub="Month-to-date" icon={<Calendar size={16} />} gradient="linear-gradient(135deg,#0ea5e9,#2563eb)" />
          <KpiCard label="Outstanding Dues" value={fmtCompact(kpis.dueTot)} sub={`${membersWithDues} member${membersWithDues !== 1 ? 's' : ''} pending`} icon={<AlertCircle size={16} />} gradient="linear-gradient(135deg,#ef4444,#dc2626)" delta={kpis.dueTot > 0 ? 'Attention' : undefined} deltaUp={false} />
          <KpiCard label="Collection Rate" value={collectionRate + '%'} sub="Collected vs total" icon={<Target size={16} />} gradient="linear-gradient(135deg,#059669,#10b981)" delta={collectionRate >= 80 ? 'Strong' : undefined} />
          <KpiCard label="Total Transactions" value={String(payments.length)} sub="All time" icon={<Activity size={16} />} gradient="linear-gradient(135deg,#f59e0b,#d97706)" />
          <KpiCard label="Active Members" value={String(clients.length)} sub="In system" icon={<Shield size={16} />} gradient="linear-gradient(135deg,#8b5cf6,#7c3aed)" />
        </div>

        {/* ── AI Insight ── */}
        {!loading && payments.length > 0 && <AiInsightBanner payments={payments} kpis={kpis} />}

        {/* ── Error ── */}
        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid rgba(220,38,38,0.15)', borderRadius: 14, padding: '12px 16px', fontSize: 13, color: '#dc2626', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={14} />{error}
            <button onClick={fetchAll} style={{ marginLeft: 8, fontSize: 12, color: '#7c3aed', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>Retry</button>
          </div>
        )}

        {/* ── Search & Filters ── */}
        <div style={{ ...S.card, padding: '14px 18px', marginBottom: 14, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 0 }}>
            <Search size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
            <input
              type="search" placeholder="Search member, receipt, notes…"
              value={search} onChange={(e) => setSearch(e.target.value)}
              style={{ ...S.input, paddingLeft: 34 }}
            />
          </div>

          {/* Date range */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#64748b', flexWrap: 'wrap' }}>
            <Calendar size={12} style={{ color: '#94a3b8' }} />
            <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} style={{ ...S.input, width: 'auto', fontSize: 12, padding: '8px 11px' }} />
            <span style={{ color: '#cbd5e1' }}>→</span>
            <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} style={{ ...S.input, width: 'auto', fontSize: 12, padding: '8px 11px' }} />
          </div>

          {/* Method tabs */}
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {METHODS.map((m) => (
              <button key={m} className="ri-method-btn"
                onClick={() => setFilterMethod(m)}
                style={{
                  padding: '6px 13px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                  cursor: 'pointer',
                  border: '1.5px solid',
                  borderColor: filterMethod === m ? '#7c3aed' : 'rgba(100,116,139,0.18)',
                  background: filterMethod === m ? 'linear-gradient(135deg,#7c3aed,#4f46e5)' : 'rgba(255,255,255,0.8)',
                  color: filterMethod === m ? 'white' : '#64748b',
                  boxShadow: filterMethod === m ? '0 2px 8px rgba(124,58,237,0.25)' : 'none',
                }}>
                {m === 'ALL' ? 'All Methods' : m.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Clear + total */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto', flexWrap: 'wrap' }}>
            {(filterFrom || filterTo || filterMethod !== 'ALL' || search) && (
              <button onClick={() => { setFilterFrom(''); setFilterTo(''); setFilterMethod('ALL'); setSearch(''); }}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 10, border: '1.5px solid rgba(220,38,38,0.2)', background: 'rgba(254,242,242,0.8)', fontSize: 11, fontWeight: 700, color: '#dc2626', cursor: 'pointer' }}>
                <X size={10} />Clear
              </button>
            )}
            <div style={{ fontSize: 14, fontWeight: 800, color: '#059669', letterSpacing: '-0.01em' }}>
              {fmtAmount(filteredTotal)}
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>{filtered.length} records</div>
          </div>
        </div>

        {/* ── Data Table ── */}
        <div style={{ ...S.cardElevated, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="ri-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(100,116,139,0.08)' }}>
                  {['Receipt', 'Member', 'Amount', 'Method', 'Date', 'Notes', ...(isAdmin ? [''] : [])].map((h, i) => (
                    <th key={i} style={{
                      padding: '13px 18px', textAlign: 'left',
                      fontSize: 10, fontWeight: 800, color: '#94a3b8',
                      textTransform: 'uppercase', letterSpacing: '1px',
                      background: 'rgba(248,250,252,0.7)', whiteSpace: 'nowrap',
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
                        <div style={{
                          width: 72, height: 72, borderRadius: '50%',
                          background: 'linear-gradient(135deg,rgba(124,58,237,0.08),rgba(79,70,229,0.12))',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          margin: '0 auto 18px', border: '1px solid rgba(124,58,237,0.1)',
                        }}>
                          <TrendingUp size={30} style={{ color: '#7c3aed', opacity: 0.7 }} />
                        </div>
                        <p style={{ fontSize: 16, fontWeight: 700, color: '#0a0a18', margin: '0 0 6px' }}>No payments found</p>
                        <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 20px' }}>
                          {search ? 'Try a different search term or clear filters.' : 'Record your first payment to start tracking revenue.'}
                        </p>
                        {isAdmin && (
                          <button onClick={() => setShowModal(true)} style={{ padding: '10px 22px', borderRadius: 13, border: 'none', background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', fontSize: 13, fontWeight: 700, color: 'white', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7, boxShadow: '0 4px 14px rgba(124,58,237,0.3)' }}>
                            <Plus size={13} /> Record First Payment
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginated.map((p) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid rgba(100,116,139,0.05)' }}>
                      <td style={{ padding: '14px 18px' }}>
                        <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#7c3aed', background: 'rgba(124,58,237,0.06)', borderRadius: 7, padding: '3px 8px', border: '1px solid rgba(124,58,237,0.1)' }}>
                          {p.receipt_no ?? '—'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 700, color: '#0a0a18', fontSize: 14 }}>{p.client_name ?? '—'}</div>
                        {p.trainer_name && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>via {p.trainer_name}</div>}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <span style={{ fontSize: 15, fontWeight: 800, color: '#059669', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                          {fmtAmount(p.amount)}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px' }}><MethodBadge method={p.method} /></td>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>{fmtDate(p.date)}</div>
                      </td>
                      <td style={{ padding: '14px 18px', maxWidth: 220 }}>
                        <span style={{ fontSize: 12, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                          {p.notes || '—'}
                        </span>
                      </td>
                      {isAdmin && (
                        <td style={{ padding: '14px 18px' }}>
                          <button onClick={() => setDeleteTarget(p)} style={{ width: 30, height: 30, borderRadius: 9, border: '1.5px solid rgba(220,38,38,0.18)', background: 'rgba(254,242,242,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ef4444', transition: 'all 140ms ease' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(220,38,38,0.1)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(254,242,242,0.8)'; }}>
                            <Trash2 size={12} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && filtered.length > PAGE_SIZE && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderTop: '1px solid rgba(100,116,139,0.08)', flexWrap: 'wrap', gap: 10 }}>
              <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>
                Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} payments
              </span>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
                  style={{ width: 33, height: 33, borderRadius: 10, border: '1.5px solid rgba(100,116,139,0.15)', background: page <= 1 ? 'rgba(248,250,252,0.8)' : 'white', cursor: page <= 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: page <= 1 ? '#cbd5e1' : '#374151', opacity: page <= 1 ? 0.5 : 1 }}>
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const p = totalPages <= 5 ? i + 1 : Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                  return (
                    <button key={p} onClick={() => setPage(p)}
                      style={{ minWidth: 33, height: 33, borderRadius: 10, border: '1.5px solid', borderColor: p === page ? '#7c3aed' : 'rgba(100,116,139,0.15)', background: p === page ? 'linear-gradient(135deg,#7c3aed,#4f46e5)' : 'white', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: p === page ? 'white' : '#374151', boxShadow: p === page ? '0 2px 8px rgba(124,58,237,0.25)' : 'none' }}>
                      {p}
                    </button>
                  );
                })}
                <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
                  style={{ width: 33, height: 33, borderRadius: 10, border: '1.5px solid rgba(100,116,139,0.15)', background: page >= totalPages ? 'rgba(248,250,252,0.8)' : 'white', cursor: page >= totalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: page >= totalPages ? '#cbd5e1' : '#374151', opacity: page >= totalPages ? 0.5 : 1 }}>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Bottom summary strip ── */}
        {!loading && payments.length > 0 && (
          <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {Object.entries(methodBreakdown).map(([method, amt]) => (
              <div key={method} style={{ ...S.card, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 12, flex: '1 1 180px' }}>
                <MethodBadge method={method} />
                <div style={{ fontSize: 14, fontWeight: 800, color: '#0a0a18', letterSpacing: '-0.01em' }}>{fmtCompact(amt)}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginLeft: 'auto' }}>{payments.filter(p => p.method === method).length} txns</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {showModal && (
        <RecordPaymentModal clients={clients} onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); fetchAll(); }} />
      )}

      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,30,0.55)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setDeleteTarget(null)}>
          <div style={{ background: 'white', borderRadius: 24, width: '100%', maxWidth: 400, padding: '30px', boxShadow: '0 32px 80px rgba(0,0,0,0.2)', margin: 16, animation: 'modalIn 200ms cubic-bezier(0.34,1.56,0.64,1)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg,#ef4444,#dc2626)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18, boxShadow: '0 4px 14px rgba(220,38,38,0.3)' }}>
              <Trash2 size={20} color="white" />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0a0a18', margin: '0 0 8px', letterSpacing: '-0.02em' }}>Delete Payment?</h3>
            <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 24px', lineHeight: 1.6 }}>
              This will permanently delete <strong style={{ color: '#0a0a18' }}>{fmtAmount(deleteTarget.amount)}</strong> from <strong style={{ color: '#0a0a18' }}>{deleteTarget.client_name}</strong>. The member&rsquo;s balance will be adjusted accordingly.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteTarget(null)} style={{ padding: '10px 20px', borderRadius: 12, border: '1.5px solid rgba(100,116,139,0.2)', background: 'white', fontSize: 13, fontWeight: 600, color: '#475569', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleDelete} disabled={deleting} style={{ padding: '10px 22px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#ef4444,#dc2626)', fontSize: 13, fontWeight: 700, color: 'white', cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.7 : 1, boxShadow: '0 4px 14px rgba(220,38,38,0.3)' }}>
                {deleting ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

export default function PaymentsPage() {
  return <Guard><PaymentsContent /></Guard>;
}
