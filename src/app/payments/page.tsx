'use client';
/**
 * Payments Page — Ultra-Premium Financial Analytics Dashboard
 * 619 Fitness Studio — Luxury SaaS redesign
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
  BarChart3, ArrowUpRight, RefreshCw,
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

/* ─── Premium KPI Card ──────────────────────────────────── */
function PremiumKpiCard({
  label, value, sub, icon, accent, delta,
}: {
  label: string; value: string; sub?: string;
  icon: React.ReactNode; accent: string; delta?: string;
}) {
  return (
    <div style={{
      background: 'white',
      borderRadius: 20,
      padding: '22px 24px',
      boxShadow: '0 2px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
      border: '1px solid rgba(0,0,0,0.06)',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      transition: 'box-shadow 200ms ease, transform 200ms ease',
      position: 'relative',
      overflow: 'hidden',
    }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.boxShadow = `0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)`;
        el.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)';
        el.style.transform = 'translateY(0)';
      }}
    >
      {/* accent top bar */}
      <div style={{ position: 'absolute', top: 0, left: 24, right: 24, height: 2, background: accent, borderRadius: '0 0 2px 2px', opacity: 0.7 }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: `${accent}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: accent,
        }}>
          {icon}
        </div>
        {delta && (
          <span style={{
            fontSize: 11, fontWeight: 600, color: '#10b981',
            background: '#10b98115', borderRadius: 20, padding: '3px 8px',
            display: 'flex', alignItems: 'center', gap: 3,
          }}>
            <ArrowUpRight size={10} />{delta}
          </span>
        )}
      </div>
      <div>
        <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1 }}>
          {value}
        </div>
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, fontWeight: 500 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

/* ─── Method Badge ──────────────────────────────────────── */
function MethodBadge({ method }: { method: string }) {
  const styles: Record<string, { bg: string; color: string; icon: React.ReactNode }> = {
    CASH:          { bg: '#f0fdf4', color: '#16a34a', icon: <Banknote size={10} /> },
    UPI:           { bg: '#eff6ff', color: '#2563eb', icon: <Smartphone size={10} /> },
    CARD:          { bg: '#faf5ff', color: '#7c3aed', icon: <CreditCard size={10} /> },
    BANK_TRANSFER: { bg: '#fff7ed', color: '#ea580c', icon: <Building2 size={10} /> },
  };
  const s = styles[method] ?? { bg: '#f1f5f9', color: '#475569', icon: null };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 11, fontWeight: 600,
      background: s.bg, color: s.color,
      borderRadius: 20, padding: '3px 9px',
      border: `1px solid ${s.color}25`,
    }}>
      {s.icon}{method}
    </span>
  );
}

/* ─── Skeleton Row ──────────────────────────────────────── */
function SkeletonRow() {
  return (
    <tr>
      {[80, 140, 90, 80, 90, 120].map((w, i) => (
        <td key={i} style={{ padding: '14px 16px' }}>
          <div style={{
            height: 13, width: w, borderRadius: 6,
            background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s ease-in-out infinite',
          }} />
        </td>
      ))}
    </tr>
  );
}

/* ─── Record Payment Modal ──────────────────────────────── */
function RecordPaymentModal({ clients, onClose, onSaved }: { clients: ClientOption[]; onClose: () => void; onSaved: () => void }) {
  const today = isoToday();
  const [form, setForm]   = useState({ client_id: '', amount: '', method: 'CASH', date: today, notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const S = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
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
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }} onClick={onClose}>
      <div style={{ background: 'white', borderRadius: 24, width: '100%', maxWidth: 480, boxShadow: '0 24px 64px rgba(0,0,0,0.2)', overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: '24px 28px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>Record Payment</h3>
            <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>Log a new collection</p>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, border: '1px solid #e2e8f0', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}><X size={14} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#dc2626' }}>{error}</div>}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Member *</label>
              <select style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: 14, color: '#0f172a', background: '#fafafa', outline: 'none' }} value={form.client_id} onChange={S('client_id')} required>
                <option value="">Select member…</option>
                {clients.map((c) => { const due = Number(c.balance_due ?? c.balance_amount ?? 0); return (<option key={c.id} value={c.id}>{c.name}{due > 0 ? ` — Due: ${fmtAmount(due)}` : ''}</option>); })}
              </select>
              {balanceDue > 0 && <p style={{ fontSize: 12, color: '#dc2626', marginTop: 6 }}>⚠ Outstanding: {fmtAmount(balanceDue)}</p>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Amount (₹) *</label>
                <input style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: 14, color: '#0f172a', background: '#fafafa', outline: 'none', boxSizing: 'border-box' }} type="number" min="1" step="1" value={form.amount} onChange={S('amount')} required placeholder={balanceDue > 0 ? String(balanceDue) : '0'} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Method</label>
                <select style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: 14, color: '#0f172a', background: '#fafafa', outline: 'none' }} value={form.method} onChange={S('method')}>
                  <option>CASH</option><option>UPI</option><option>CARD</option><option>BANK_TRANSFER</option>
                </select>
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date</label>
              <input style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: 14, color: '#0f172a', background: '#fafafa', outline: 'none', boxSizing: 'border-box' }} type="date" value={form.date} onChange={S('date')} required />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Notes</label>
              <input style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: 14, color: '#0f172a', background: '#fafafa', outline: 'none', boxSizing: 'border-box' }} value={form.notes} onChange={S('notes')} placeholder="Optional note…" />
            </div>
          </div>
          <div style={{ padding: '16px 28px 24px', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding: '10px 20px', borderRadius: 12, border: '1.5px solid #e2e8f0', background: 'white', fontSize: 14, fontWeight: 600, color: '#475569', cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ padding: '10px 24px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', fontSize: 14, fontWeight: 700, color: 'white', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>{saving ? 'Saving…' : 'Record Payment'}</button>
          </div>
        </form>
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
      const [pRes, cRes] = await Promise.allSettled([api.payments.list(Object.fromEntries(params)), api.clients.list()]);
      if (pRes.status === 'fulfilled') { const d = pRes.value as any; setPayments(Array.isArray(d) ? d : (d.payments ?? [])); }
      if (cRes.status === 'fulfilled') { const d = cRes.value as any; setClients(Array.isArray(d) ? d : (d.clients ?? [])); }
    } catch (e: any) { setError(e.message || 'Failed to load.'); }
    finally { setLoading(false); }
  }, [filterFrom, filterTo]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => { setPage(1); }, [filterFrom, filterTo, filterMethod, search]);

  const kpis = useMemo(() => {
    const all = payments;
    const total    = all.reduce((s, p) => s + Number(p.amount), 0);
    const todayRev = all.filter((p) => p.date === today).reduce((s, p) => s + Number(p.amount), 0);
    const monthRev = all.filter((p) => p.date >= monthStart).reduce((s, p) => s + Number(p.amount), 0);
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
      list = list.filter((p) => (p.client_name ?? '').toLowerCase().includes(q) || (p.receipt_no ?? '').toLowerCase().includes(q) || (p.notes ?? '').toLowerCase().includes(q));
    }
    return list;
  }, [payments, filterMethod, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try { await api.payments.delete(String(deleteTarget.id)); setPayments((prev) => prev.filter((p) => p.id !== deleteTarget.id)); setDeleteTarget(null); }
    catch (e: any) { alert(`Delete failed: ${e.message}`); }
    finally { setDeleting(false); }
  }

  return (
    <AppShell>
      <style>{`
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes fadeInUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .rev-page { animation: fadeInUp 0.4s ease; }
        .rev-table tr:hover td { background: #fafbff; }
        .rev-tab-btn { padding: 7px 14px; border-radius: 20px; border: 1.5px solid #e2e8f0; background: white; font-size: 12px; font-weight: 600; color: #64748b; cursor: pointer; transition: all 160ms ease; }
        .rev-tab-btn:hover { border-color: #7c3aed; color: #7c3aed; }
        .rev-tab-btn.active { background: linear-gradient(135deg,#7c3aed,#6d28d9); border-color: transparent; color: white; }
      `}</style>
      <div className="rev-page" style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 20px 48px' }}>

        {/* ── Page Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendingUp size={18} color="white" />
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>Revenue & Collections</h1>
            </div>
            <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>Financial analytics · Payment ledger · Collection tracking</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => exportCSV(filtered)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 12, border: '1.5px solid #e2e8f0', background: 'white', fontSize: 13, fontWeight: 600, color: '#475569', cursor: 'pointer' }}>
              <Download size={14} /> Export CSV
            </button>
            {isAdmin && (
              <button onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 20px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', fontSize: 13, fontWeight: 700, color: 'white', cursor: 'pointer', boxShadow: '0 4px 12px rgba(124,58,237,0.3)' }}>
                <Plus size={14} /> Record Payment
              </button>
            )}
          </div>
        </div>

        {/* ── Hero Revenue Banner ── */}
        <div style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #3730a3 40%, #4f46e5 70%, #7c3aed 100%)',
          borderRadius: 24, padding: '32px 36px', marginBottom: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, background: 'rgba(255,255,255,0.04)', borderRadius: '50%' }} />
          <div style={{ position: 'absolute', bottom: -40, right: 80, width: 120, height: 120, background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }} />
          <div style={{ position: 'relative' }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '1.5px', margin: '0 0 8px' }}>Total Revenue Collected</p>
            <div style={{ fontSize: 44, fontWeight: 900, color: 'white', letterSpacing: '-0.03em', lineHeight: 1 }}>{fmtCompact(kpis.total)}</div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', margin: '8px 0 0' }}>{payments.length} transactions recorded</p>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', position: 'relative' }}>
            {Object.entries(methodBreakdown).map(([method, amt]) => (
              <div key={method} style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', borderRadius: 14, padding: '12px 16px', minWidth: 100, border: '1px solid rgba(255,255,255,0.15)' }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{method}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'white' }}>{fmtCompact(amt)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── KPI Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14, marginBottom: 24 }}>
          <PremiumKpiCard label="Today's Collection" value={fmtCompact(kpis.todayRev)} sub={`Full: ${fmtAmount(kpis.todayRev)}`} icon={<Zap size={18} />} accent="#7c3aed" />
          <PremiumKpiCard label="This Month" value={fmtCompact(kpis.monthRev)} sub="Month-to-date" icon={<Calendar size={18} />} accent="#0ea5e9" />
          <PremiumKpiCard label="Outstanding Dues" value={fmtCompact(kpis.dueTot)} sub={`${clients.filter((c) => Number(c.balance_due ?? c.balance_amount ?? 0) > 0).length} members`} icon={<AlertCircle size={18} />} accent="#ef4444" />
          <PremiumKpiCard label="Collection Rate" value={kpis.total + kpis.dueTot > 0 ? Math.round((kpis.total / (kpis.total + kpis.dueTot)) * 100) + '%' : '—'} sub="Collected vs total" icon={<BarChart3 size={18} />} accent="#10b981" />
        </div>

        {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 14, padding: '12px 16px', fontSize: 14, color: '#dc2626', marginBottom: 16 }}>{error} <button onClick={fetchAll} style={{ marginLeft: 8, fontSize: 12, color: '#7c3aed', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Retry</button></div>}

        {/* ── Filters & Search ── */}
        <div style={{ background: 'white', borderRadius: 18, border: '1px solid #f1f5f9', padding: '16px 20px', marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
          <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 0 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input type="search" placeholder="Search member, receipt…" value={search} onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: 13, color: '#0f172a', background: '#fafafa', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#64748b', flexWrap: 'wrap' }}>
            <span>From</span>
            <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} style={{ padding: '8px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 12, color: '#0f172a', background: '#fafafa', outline: 'none' }} />
            <span>to</span>
            <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} style={{ padding: '8px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 12, color: '#0f172a', background: '#fafafa', outline: 'none' }} />
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {METHODS.map((m) => (
              <button key={m} className={`rev-tab-btn${filterMethod === m ? ' active' : ''}`} onClick={() => setFilterMethod(m)}>
                {m === 'ALL' ? 'All' : m}
              </button>
            ))}
          </div>
          {(filterFrom || filterTo || filterMethod !== 'ALL' || search) && (
            <button onClick={() => { setFilterFrom(''); setFilterTo(''); setFilterMethod('ALL'); setSearch(''); }}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 12px', borderRadius: 10, border: '1.5px solid #fca5a5', background: '#fef2f2', fontSize: 12, fontWeight: 600, color: '#dc2626', cursor: 'pointer' }}>
              <X size={11} /> Clear filters
            </button>
          )}
          <div style={{ marginLeft: 'auto', fontWeight: 800, color: '#10b981', fontSize: 15, letterSpacing: '-0.01em' }}>
            {fmtAmount(filtered.reduce((s, p) => s + Number(p.amount), 0))}
          </div>
        </div>

        {/* ── Premium Table ── */}
        <div style={{ background: 'white', borderRadius: 20, border: '1px solid #f1f5f9', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="rev-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  {['Receipt', 'Member', 'Amount', 'Method', 'Date', 'Notes', ...(isAdmin ? [''] : [])].map((h, i) => (
                    <th key={i} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', background: '#fafbff', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
                ) : paginated.length === 0 ? (
                  <tr><td colSpan={isAdmin ? 7 : 6}>
                    <div style={{ padding: '64px 32px', textAlign: 'center' }}>
                      <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg,#ede9fe,#ddd6fe)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                        <TrendingUp size={28} color="#7c3aed" />
                      </div>
                      <p style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>No payments found</p>
                      <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>{search ? 'Try a different search term.' : 'No payments match the current filters.'}</p>
                    </div>
                  </td></tr>
                ) : (
                  paginated.map((p) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #f8fafc', transition: 'background 150ms' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#94a3b8', background: '#f8fafc', borderRadius: 6, padding: '3px 7px' }}>{p.receipt_no ?? '—'}</span>
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 600, color: '#0f172a', fontSize: 14 }}>{p.client_name ?? '—'}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontSize: 15, fontWeight: 800, color: '#10b981', letterSpacing: '-0.02em' }}>{fmtAmount(p.amount)}</span>
                      </td>
                      <td style={{ padding: '14px 16px' }}><MethodBadge method={p.method} /></td>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: '#64748b' }}>{fmtDate(p.date)}</td>
                      <td style={{ padding: '14px 16px', fontSize: 12, color: '#94a3b8', maxWidth: 200 }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{p.notes ?? '—'}</span>
                      </td>
                      {isAdmin && (
                        <td style={{ padding: '14px 16px' }}>
                          <button onClick={() => setDeleteTarget(p)} style={{ width: 28, height: 28, borderRadius: 8, border: '1.5px solid #fecaca', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ef4444' }}>
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderTop: '1px solid #f1f5f9', fontSize: 13, color: '#64748b' }}>
              <span>{((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} style={{ width: 32, height: 32, borderRadius: 10, border: '1.5px solid #e2e8f0', background: page <= 1 ? '#f8fafc' : 'white', cursor: page <= 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}><ChevronLeft size={14} /></button>
                <span style={{ padding: '4px 12px', fontWeight: 700, color: '#0f172a' }}>{page} / {totalPages}</span>
                <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} style={{ width: 32, height: 32, borderRadius: 10, border: '1.5px solid #e2e8f0', background: page >= totalPages ? '#f8fafc' : 'white', cursor: page >= totalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}><ChevronRight size={14} /></button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showModal && <RecordPaymentModal clients={clients} onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); fetchAll(); }} />}

      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }} onClick={() => setDeleteTarget(null)}>
          <div style={{ background: 'white', borderRadius: 20, width: '100%', maxWidth: 380, padding: '28px', boxShadow: '0 24px 64px rgba(0,0,0,0.2)', margin: 16 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>Delete Payment?</h3>
            <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 24px', lineHeight: 1.6 }}>Delete <strong>{fmtAmount(deleteTarget.amount)}</strong> from <strong>{deleteTarget.client_name}</strong>? The member&rsquo;s balance will be adjusted.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteTarget(null)} style={{ padding: '9px 18px', borderRadius: 12, border: '1.5px solid #e2e8f0', background: 'white', fontSize: 13, fontWeight: 600, color: '#475569', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleDelete} disabled={deleting} style={{ padding: '9px 20px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#ef4444,#dc2626)', fontSize: 13, fontWeight: 700, color: 'white', cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.7 : 1 }}>{deleting ? 'Deleting…' : 'Delete'}</button>
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
