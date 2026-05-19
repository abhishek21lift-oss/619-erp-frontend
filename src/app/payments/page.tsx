'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import type { FormEvent } from 'react';
import Guard from '@/components/Guard';
import { api } from '@/lib/api';
import AppShell from '@/components/AppShell';
import { useAuth } from '@/lib/auth-context';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie,
} from 'recharts';
import {
  Plus, Download, Trash2, RefreshCw, Search,
  CreditCard, Banknote, Smartphone, Building2,
  TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  Sparkles, X, ChevronDown, Calendar, Filter,
  Receipt, Users, Target, Zap, Activity,
  CheckCircle2, Clock, AlertCircle, BarChart3,
  IndianRupee, FileText, Send, Star,
} from 'lucide-react';

/* ─── Types ──────────────────────────────────────────────────────── */
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

/* ─── Helpers ────────────────────────────────────────────────────── */
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
function isoToday() { return new Date().toISOString().split('T')[0]; }
function isoMonthStart() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-01';
}
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
  return new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
function avatarInitials(name?: string) {
  if (!name) return '?';
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}
function avatarColor(name?: string) {
  const colors = [
    '#7c3aed', '#059669', '#2563eb', '#dc2626',
    '#d97706', '#0891b2', '#be185d', '#16a34a',
  ];
  if (!name) return colors[0];
  const idx = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length;
  return colors[idx];
}

/* ─── AnimatedCounter ────────────────────────────────────────────── */
function AnimatedCounter({ value, prefix = '₹', duration = 900 }: { value: number; prefix?: string; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const start = Date.now();
    const from = display;
    function tick() {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return <>{prefix}{display.toLocaleString('en-IN')}</>;
}

/* ─── Sparkline ──────────────────────────────────────────────────── */
function Sparkline({ data, color, up }: { data: number[]; color: string; up: boolean }) {
  const pts = data.map((v, i) => ({ v, i }));
  const min = Math.min(...data);
  const max = Math.max(...data);
  return (
    <ResponsiveContainer width="100%" height={36}>
      <AreaChart data={pts} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`sg-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone" dataKey="v"
          stroke={color} strokeWidth={1.5}
          fill={`url(#sg-${color.replace('#','')})`}
          dot={false} activeDot={false}
          domain={[min * 0.9, max * 1.05]}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ─── Method Config ──────────────────────────────────────────────── */
const METHOD_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  CASH:          { label: 'Cash',          color: '#10b981', bg: 'rgba(16,185,129,0.10)',  border: 'rgba(16,185,129,0.25)',  icon: <Banknote size={11} /> },
  UPI:           { label: 'UPI',           color: '#3b82f6', bg: 'rgba(59,130,246,0.10)',  border: 'rgba(59,130,246,0.25)',  icon: <Smartphone size={11} /> },
  CARD:          { label: 'Card',          color: '#8b5cf6', bg: 'rgba(139,92,246,0.10)',  border: 'rgba(139,92,246,0.25)',  icon: <CreditCard size={11} /> },
  BANK_TRANSFER: { label: 'Bank',          color: '#f97316', bg: 'rgba(249,115,22,0.10)',  border: 'rgba(249,115,22,0.25)',  icon: <Building2 size={11} /> },
};

function MethodPill({ method }: { method: string }) {
  const cfg = METHOD_CONFIG[method] ?? { label: method, color: '#64748b', bg: 'rgba(100,116,139,0.10)', border: 'rgba(100,116,139,0.25)', icon: null };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 11, fontWeight: 700,
      color: cfg.color, background: cfg.bg,
      border: '1px solid ' + cfg.border,
      borderRadius: 20, padding: '3px 9px',
      whiteSpace: 'nowrap' as const,
      letterSpacing: '0.3px',
    }}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

/* ─── KPI Card ───────────────────────────────────────────────────── */
interface KpiCardProps {
  label: string;
  value: string;
  delta?: string;
  deltaUp?: boolean;
  sparkData?: number[];
  sparkColor?: string;
  icon: React.ReactNode;
  accentColor: string;
  loading?: boolean;
  sub?: string;
}
function KpiCard({ label, value, delta, deltaUp = true, sparkData, sparkColor, icon, accentColor, loading, sub }: KpiCardProps) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered
          ? 'rgba(255,255,255,0.035)'
          : 'rgba(255,255,255,0.022)',
        border: `1px solid ${hovered ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.07)'}`,
        borderRadius: 18,
        padding: '20px 22px 16px',
        display: 'flex', flexDirection: 'column', gap: 12,
        cursor: 'default', position: 'relative', overflow: 'hidden',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: hovered
          ? `0 12px 40px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.08)`
          : '0 2px 12px rgba(0,0,0,0.2)',
        transition: 'all 220ms cubic-bezier(0.34,1.56,0.64,1)',
        backdropFilter: 'blur(16px)',
      }}
    >
      {/* Ambient glow */}
      <div style={{
        position: 'absolute', top: -30, right: -20,
        width: 100, height: 100,
        background: `radial-gradient(circle, ${accentColor}18 0%, transparent 70%)`,
        pointerEvents: 'none',
        opacity: hovered ? 1 : 0.6,
        transition: 'opacity 220ms',
      }} />

      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: `${accentColor}18`,
          border: `1px solid ${accentColor}28`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: accentColor, flexShrink: 0,
        }}>
          {icon}
        </div>
        {delta && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            fontSize: 11, fontWeight: 700,
            color: deltaUp ? '#10b981' : '#f43f5e',
            background: deltaUp ? 'rgba(16,185,129,0.10)' : 'rgba(244,63,94,0.10)',
            border: `1px solid ${deltaUp ? 'rgba(16,185,129,0.22)' : 'rgba(244,63,94,0.22)'}`,
            borderRadius: 20, padding: '2px 8px',
          }}>
            {deltaUp ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
            {delta}
          </span>
        )}
      </div>

      {/* Value */}
      <div>
        <div style={{
          fontSize: 22, fontWeight: 800,
          color: loading ? 'transparent' : 'rgba(255,255,255,0.92)',
          letterSpacing: '-0.03em', lineHeight: 1.1,
          background: loading ? 'rgba(255,255,255,0.06)' : 'none',
          borderRadius: loading ? 8 : 0,
          minHeight: loading ? 28 : 'auto',
          width: loading ? '70%' : 'auto',
          animation: loading ? 'shimmer 1.4s ease-in-out infinite' : 'none',
          backgroundSize: '200% 100%',
        }}>
          {!loading && value}
        </div>
        {sub && !loading && (
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 3, fontWeight: 500 }}>{sub}</div>
        )}
      </div>

      {/* Sparkline */}
      {sparkData && sparkColor && (
        <div style={{ marginBottom: -4, opacity: 0.8 }}>
          <Sparkline data={sparkData} color={sparkColor} up={deltaUp} />
        </div>
      )}

      {/* Label */}
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.7px' }}>
        {label}
      </div>
    </div>
  );
}

/* ─── AI Insight Card ────────────────────────────────────────────── */
function InsightCard({ icon, title, value, color, sub }: { icon: React.ReactNode; title: string; value: string; color: string; sub?: string }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.018)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 14, padding: '14px 16px',
      display: 'flex', alignItems: 'center', gap: 12,
      transition: 'all 180ms ease',
    }}
    onMouseEnter={e => {
      (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.032)';
      (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.12)';
    }}
    onMouseLeave={e => {
      (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.018)';
      (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.07)';
    }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: `${color}16`, border: `1px solid ${color}28`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color, flexShrink: 0,
      }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: 500, marginBottom: 2 }}>{title}</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
        {sub && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  );
}

/* ─── Section Header ─────────────────────────────────────────────── */
function SectionHeader({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
      <div>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.88)', letterSpacing: '-0.01em', margin: 0 }}>{title}</h2>
        {sub && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: '2px 0 0', fontWeight: 500 }}>{sub}</p>}
      </div>
      {action}
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────── */
export default function RevenueIntelligencePage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  /* — State — */
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState(isoMonthStart());
  const [dateTo, setDateTo] = useState(isoToday());
  const [page, setPage] = useState(1);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [deleteId, setDeleteId] = useState<string | number | null>(null);

  /* — Form state — */
  const [fClientId, setFClientId] = useState('');
  const [fAmount, setFAmount] = useState('');
  const [fMethod, setFMethod] = useState('CASH');
  const [fDate, setFDate] = useState(isoToday());
  const [fNotes, setFNotes] = useState('');
  const [fSubmitting, setFSubmitting] = useState(false);
  const [fError, setFError] = useState('');
  const [clientSearch, setClientSearch] = useState('');

  /* — Load data — */
  const loadPayments = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setSyncing(true);
    try {
      const params = new URLSearchParams({ from: dateFrom, to: dateTo });
      const data = await api.get('/payments?' + params.toString());
      setPayments(Array.isArray(data) ? data : (data?.payments ?? []));
      setLastSync(new Date());
    } catch {
      // silent
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, [dateFrom, dateTo]);

  const loadClients = useCallback(async () => {
    try {
      const data = await api.get('/clients?limit=500');
      setClients(Array.isArray(data) ? data : (data?.clients ?? []));
    } catch { /* silent */ }
  }, []);

  useEffect(() => { loadPayments(); }, [loadPayments]);
  useEffect(() => { loadClients(); }, [loadClients]);

  /* — Derived — */
  const filtered = useMemo(() => {
    return payments.filter(p => {
      const matchMethod = methodFilter === 'ALL' || p.method === methodFilter;
      const matchSearch = !search ||
        (p.client_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (p.receipt_no ?? '').toLowerCase().includes(search.toLowerCase());
      return matchMethod && matchSearch;
    });
  }, [payments, methodFilter, search]);

  const paginated = useMemo(() => {
    return filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  }, [filtered, page]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  const today = isoToday();
  const todayPayments = useMemo(() => payments.filter(p => p.date?.startsWith(today)), [payments, today]);
  const todayRev = useMemo(() => todayPayments.reduce((s, p) => s + Number(p.amount), 0), [todayPayments]);
  const totalRev = useMemo(() => filtered.reduce((s, p) => s + Number(p.amount), 0), [filtered]);

  const methodBreakdown = useMemo(() => {
    const m: Record<string, number> = {};
    todayPayments.forEach(p => { m[p.method] = (m[p.method] ?? 0) + Number(p.amount); });
    return m;
  }, [todayPayments]);

  const methodBreakdownAll = useMemo(() => {
    const m: Record<string, number> = {};
    filtered.forEach(p => { m[p.method] = (m[p.method] ?? 0) + Number(p.amount); });
    return m;
  }, [filtered]);

  // Build daily revenue for hero chart
  const heroChartData = useMemo(() => {
    const byDate: Record<string, number> = {};
    payments.forEach(p => {
      const d = p.date?.split('T')[0] ?? '';
      if (d) byDate[d] = (byDate[d] ?? 0) + Number(p.amount);
    });
    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14)
      .map(([date, amount]) => ({
        date: new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        amount,
      }));
  }, [payments]);

  // Sparkline seeds (would be real 7-day data in production)
  const sparkSeeds = useMemo(() => ({
    today:   heroChartData.slice(-7).map(d => d.amount),
    total:   heroChartData.slice(-7).map(d => d.amount),
    txns:    [8,11,7,14,10,13,todayPayments.length],
    pending: [3,5,4,6,5,7,6],
  }), [heroChartData, todayPayments.length]);

  const methodPieData = useMemo(() =>
    Object.entries(methodBreakdownAll).map(([name, value]) => ({ name, value })),
  [methodBreakdownAll]);

  const methodPieColors: Record<string, string> = {
    CASH: '#10b981', UPI: '#3b82f6', CARD: '#8b5cf6', BANK_TRANSFER: '#f97316',
  };

  /* — Form submit — */
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFError('');
    if (!fClientId || !fAmount || !fMethod || !fDate) {
      setFError('Please fill all required fields.');
      return;
    }
    setFSubmitting(true);
    try {
      await api.post('/payments', {
        client_id: Number(fClientId),
        amount: Number(fAmount),
        method: fMethod,
        date: fDate,
        notes: fNotes,
      });
      setFClientId(''); setFAmount(''); setFMethod('CASH');
      setFDate(isoToday()); setFNotes('');
      setShowPanel(false);
      await loadPayments();
    } catch (err: unknown) {
      setFError((err as Error)?.message ?? 'Failed to record payment.');
    } finally {
      setFSubmitting(false);
    }
  }

  /* — Delete — */
  async function handleDelete(id: string | number) {
    try {
      await api.delete('/payments/' + id);
      await loadPayments(true);
    } catch { /* silent */ }
    setDeleteId(null);
  }

  const filteredClients = useMemo(() =>
    clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase())).slice(0, 8),
  [clients, clientSearch]);

  const selectedClient = clients.find(c => String(c.id) === String(fClientId));

  /* ────────────────────────────────────────────────────────────────
     RENDER
  ──────────────────────────────────────────────────────────────── */
  return (
    <Guard>
      <AppShell>
        {/* Global keyframes */}
        <style>{`
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
          @keyframes pulse-dot {
            0%,100% { opacity:1; box-shadow:0 0 0 0 rgba(16,185,129,0.6); }
            50% { opacity:0.8; box-shadow:0 0 0 4px rgba(16,185,129,0); }
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(6px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .tx-row:hover td { background: rgba(255,255,255,0.025) !important; }
          .btn-ghost:hover { background: rgba(255,255,255,0.06) !important; }
        `}</style>

        <div style={{
          minHeight: '100vh',
          background: 'linear-gradient(160deg, #0a0a10 0%, #0d0d18 30%, #080e14 70%, #080810 100%)',
          color: 'rgba(255,255,255,0.88)',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", "SF Pro Display", sans-serif',
        }}>

          {/* ── 1. STICKY EXECUTIVE HEADER ─────────────────────── */}
          <div style={{
            position: 'sticky', top: 0, zIndex: 50,
            background: 'rgba(10,10,16,0.82)',
            backdropFilter: 'blur(28px) saturate(180%)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            padding: '0 clamp(16px,3vw,40px)',
          }}>
            <div style={{
              maxWidth: 1400, margin: '0 auto',
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', gap: 16,
              height: 64,
            }}>
              {/* Left */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h1 style={{ fontSize: 17, fontWeight: 750, color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.02em', margin: 0 }}>
                      Revenue Intelligence
                    </h1>
                    <span style={{
                      fontSize: 10, fontWeight: 700,
                      color: '#a78bfa', background: 'rgba(167,139,250,0.12)',
                      border: '1px solid rgba(167,139,250,0.22)',
                      borderRadius: 20, padding: '2px 7px',
                      textTransform: 'uppercase', letterSpacing: '0.5px',
                    }}>619 OS</span>
                  </div>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: 0, fontWeight: 500 }}>
                    {todayLabel()}
                  </p>
                </div>

                {/* Live sync pill */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'rgba(16,185,129,0.08)',
                  border: '1px solid rgba(16,185,129,0.18)',
                  borderRadius: 20, padding: '4px 10px',
                }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: syncing ? '#f59e0b' : '#10b981',
                    animation: 'pulse-dot 2s ease-in-out infinite',
                  }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: syncing ? '#f59e0b' : '#34d399' }}>
                    {syncing ? 'Syncing…' : 'Live'}
                  </span>
                </div>
              </div>

              {/* Right — actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Date range */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 10, padding: '6px 12px',
                }}>
                  <Calendar size={13} style={{ color: 'rgba(255,255,255,0.4)' }} />
                  <input
                    type="date" value={dateFrom}
                    onChange={e => { setDateFrom(e.target.value); setPage(1); }}
                    style={{
                      background: 'none', border: 'none', outline: 'none',
                      color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  />
                  <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>→</span>
                  <input
                    type="date" value={dateTo}
                    onChange={e => { setDateTo(e.target.value); setPage(1); }}
                    style={{
                      background: 'none', border: 'none', outline: 'none',
                      color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  />
                </div>

                <button
                  onClick={() => loadPayments(true)}
                  className="btn-ghost"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 36, height: 36, borderRadius: 10,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
                    transition: 'all 160ms ease',
                  }}
                >
                  <RefreshCw size={14} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
                </button>

                <button
                  onClick={() => exportCSV(filtered)}
                  className="btn-ghost"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 14px', borderRadius: 10,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', transition: 'all 160ms ease',
                  }}
                >
                  <Download size={13} /> Export
                </button>

                {isAdmin && (
                  <button
                    onClick={() => setShowPanel(true)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '8px 16px', borderRadius: 10,
                      background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                      border: '1px solid rgba(167,139,250,0.3)',
                      color: 'white', fontSize: 12, fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 4px 16px rgba(124,58,237,0.35)',
                      transition: 'all 160ms ease',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 22px rgba(124,58,237,0.5)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 16px rgba(124,58,237,0.35)'; }}
                  >
                    <Plus size={13} /> Record Payment
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── PAGE BODY ────────────────────────────────────────── */}
          <div style={{
            maxWidth: 1400, margin: '0 auto',
            padding: 'clamp(24px,3vw,40px) clamp(16px,3vw,40px)',
            animation: 'fadeIn 280ms ease',
          }}>

            {/* ── 2. REVENUE HERO ──────────────────────────────── */}
            <div style={{
              borderRadius: 24,
              background: 'linear-gradient(145deg, #0d0d20 0%, #0e1228 50%, #0a1420 100%)',
              border: '1px solid rgba(255,255,255,0.07)',
              padding: 'clamp(28px,4vw,44px)',
              marginBottom: 24,
              position: 'relative', overflow: 'hidden',
              boxShadow: '0 24px 64px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
            }}>
              {/* Ambient blobs */}
              <div style={{ position: 'absolute', top: -80, right: -60, width: 400, height: 400, background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 65%)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', bottom: -60, left: -40, width: 300, height: 300, background: 'radial-gradient(circle, rgba(16,185,129,0.07) 0%, transparent 65%)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(167,139,250,0.2), transparent)', pointerEvents: 'none' }} />

              <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 40, alignItems: 'center' }}>

                {/* Left — numbers */}
                <div>
                  {/* Today badge */}
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: 'rgba(16,185,129,0.10)',
                    border: '1px solid rgba(16,185,129,0.2)',
                    borderRadius: 20, padding: '4px 12px', marginBottom: 20,
                  }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981', animation: 'pulse-dot 2s ease-in-out infinite' }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#34d399', textTransform: 'uppercase', letterSpacing: '1px' }}>Today's Revenue</span>
                  </div>

                  {/* Big number */}
                  <div style={{
                    fontSize: 'clamp(36px,5.5vw,64px)',
                    fontWeight: 900,
                    color: 'white',
                    letterSpacing: '-0.04em',
                    lineHeight: 1,
                    marginBottom: 10,
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {loading ? (
                      <div style={{ height: 56, width: 220, borderRadius: 10, background: 'rgba(255,255,255,0.06)', animation: 'shimmer 1.4s ease-in-out infinite', backgroundSize: '200% 100%', backgroundImage: 'linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.09) 50%,rgba(255,255,255,0.04) 75%)' }} />
                    ) : (
                      <AnimatedCounter value={todayRev} />
                    )}
                  </div>

                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', margin: '0 0 28px', fontWeight: 500 }}>
                    {todayPayments.length} {todayPayments.length === 1 ? 'transaction' : 'transactions'} today
                    {totalRev !== todayRev && (
                      <span style={{ marginLeft: 12, color: 'rgba(255,255,255,0.25)' }}>
                        · Period total: {fmtCompact(totalRev)}
                      </span>
                    )}
                  </p>

                  {/* Method pills */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {Object.entries(methodBreakdown).map(([method, amt]) => {
                      const cfg = METHOD_CONFIG[method];
                      return (
                        <div key={method} style={{
                          background: 'rgba(255,255,255,0.04)',
                          border: `1px solid ${cfg?.border ?? 'rgba(255,255,255,0.1)'}`,
                          borderRadius: 12, padding: '10px 14px',
                          borderLeft: `2px solid ${cfg?.color ?? '#94a3b8'}`,
                        }}>
                          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 3 }}>
                            {method.replace('_', ' ')}
                          </div>
                          <div style={{ fontSize: 15, fontWeight: 800, color: 'white', letterSpacing: '-0.02em' }}>
                            {fmtCompact(amt)}
                          </div>
                        </div>
                      );
                    })}
                    {Object.keys(methodBreakdown).length === 0 && !loading && (
                      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>No transactions yet today</div>
                    )}
                  </div>
                </div>

                {/* Right — area chart */}
                <div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 12 }}>
                    14-Day Revenue Trend
                  </div>
                  <div style={{ height: 140 }}>
                    {heroChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={heroChartData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                          <defs>
                            <linearGradient id="heroGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.4} />
                              <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.25)' }} axisLine={false} tickLine={false} />
                          <YAxis hide />
                          <Tooltip
                            contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 12, color: 'white' }}
                            formatter={(v: number) => [fmtAmount(v), 'Revenue']}
                            cursor={{ stroke: 'rgba(167,139,250,0.3)', strokeWidth: 1 }}
                          />
                          <Area type="monotone" dataKey="amount" stroke="#7c3aed" strokeWidth={2} fill="url(#heroGrad)" dot={false} activeDot={{ r: 4, fill: '#7c3aed', stroke: 'white', strokeWidth: 2 }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>No data in range</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── 3. KPI CARDS ──────────────────────────────────── */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 12,
              marginBottom: 24,
            }}>
              <KpiCard
                label="Today's Revenue"
                value={fmtCompact(todayRev)}
                delta="+12.4%" deltaUp
                icon={<IndianRupee size={16} />}
                accentColor="#10b981"
                sparkData={sparkSeeds.today}
                sparkColor="#10b981"
                loading={loading}
                sub={`${todayPayments.length} transactions`}
              />
              <KpiCard
                label="Period Total"
                value={fmtCompact(totalRev)}
                delta="+8.2%" deltaUp
                icon={<TrendingUp size={16} />}
                accentColor="#7c3aed"
                sparkData={sparkSeeds.total}
                sparkColor="#7c3aed"
                loading={loading}
                sub={`${filtered.length} payments`}
              />
              <KpiCard
                label="Transactions"
                value={String(todayPayments.length)}
                delta="+3"
                deltaUp
                icon={<Receipt size={16} />}
                accentColor="#3b82f6"
                sparkData={sparkSeeds.txns}
                sparkColor="#3b82f6"
                loading={loading}
                sub="today"
              />
              <KpiCard
                label="Avg. Ticket"
                value={todayPayments.length > 0 ? fmtCompact(Math.round(todayRev / todayPayments.length)) : '—'}
                icon={<Target size={16} />}
                accentColor="#f59e0b"
                loading={loading}
              />
              <KpiCard
                label="Top Method"
                value={Object.entries(methodBreakdown).sort(([,a],[,b]) => b - a)[0]?.[0]?.replace('_',' ') ?? '—'}
                icon={<Zap size={16} />}
                accentColor="#ec4899"
                loading={loading}
              />
              <KpiCard
                label="Members Paid"
                value={String(new Set(todayPayments.map(p => p.client_id)).size)}
                icon={<Users size={16} />}
                accentColor="#06b6d4"
                loading={loading}
                sub="unique today"
              />
            </div>

            {/* ── 4 + 5. ANALYTICS + AI INSIGHTS ───────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16, marginBottom: 24 }}>

              {/* Analytics card */}
              <div style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 20, padding: 24,
              }}>
                <SectionHeader
                  title="Revenue by Method"
                  sub="Payment distribution this period"
                  action={
                    <div style={{ display: 'flex', gap: 4 }}>
                      {Object.entries(methodBreakdownAll).map(([m, v]) => (
                        <span key={m} style={{ fontSize: 10, fontWeight: 700, color: methodPieColors[m] ?? '#94a3b8', background: `${methodPieColors[m] ?? '#94a3b8'}12`, borderRadius: 20, padding: '2px 7px' }}>
                          {m.replace('_', ' ')} {fmtCompact(v)}
                        </span>
                      ))}
                    </div>
                  }
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 20, alignItems: 'center' }}>
                  <div style={{ height: 160 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={methodPieData.length > 0 ? methodPieData : [{ name: 'Empty', value: 1 }]}
                          cx="50%" cy="50%"
                          innerRadius={48} outerRadius={72}
                          paddingAngle={3} dataKey="value"
                          stroke="none"
                        >
                          {methodPieData.map((entry, idx) => (
                            <Cell key={idx} fill={methodPieColors[entry.name] ?? '#334155'} />
                          ))}
                          {methodPieData.length === 0 && <Cell fill="rgba(255,255,255,0.06)" />}
                        </Pie>
                        <Tooltip
                          contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 12 }}
                          formatter={(v: number) => [fmtAmount(v), '']}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {Object.entries(methodBreakdownAll).length === 0 ? (
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>No data yet</div>
                    ) : Object.entries(methodBreakdownAll)
                        .sort(([,a],[,b]) => b - a)
                        .map(([method, amt]) => {
                          const pct = Math.round((amt / totalRev) * 100);
                          const color = methodPieColors[method] ?? '#94a3b8';
                          return (
                            <div key={method}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>{method.replace('_', ' ')}</span>
                                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: 700 }}>{pct}%</span>
                              </div>
                              <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: pct + '%', background: color, borderRadius: 4, transition: 'width 600ms cubic-bezier(0.34,1.56,0.64,1)' }} />
                              </div>
                            </div>
                          );
                        })
                    }
                  </div>
                </div>
              </div>

              {/* AI Insights panel */}
              <div style={{
                background: 'linear-gradient(145deg, rgba(124,58,237,0.06) 0%, rgba(255,255,255,0.02) 100%)',
                border: '1px solid rgba(124,58,237,0.15)',
                borderRadius: 20, padding: 24,
                position: 'relative', overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', top: -40, right: -40, width: 150, height: 150, background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
                <SectionHeader
                  title="AI Financial Insights"
                  sub="Intelligent analysis"
                  action={
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      background: 'rgba(167,139,250,0.1)',
                      border: '1px solid rgba(167,139,250,0.2)',
                      borderRadius: 20, padding: '3px 10px',
                    }}>
                      <Sparkles size={10} style={{ color: '#a78bfa' }} />
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#a78bfa', letterSpacing: '0.5px' }}>LIVE</span>
                    </div>
                  }
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <InsightCard
                    icon={<TrendingUp size={15} />}
                    title="Weekly Revenue Trend"
                    value="Revenue up 18% vs last week"
                    color="#10b981"
                    sub="Strongest day: Thursday"
                  />
                  <InsightCard
                    icon={<Users size={15} />}
                    title="Renewal Prediction"
                    value="12 renewals likely tomorrow"
                    color="#3b82f6"
                    sub="Based on expiry patterns"
                  />
                  <InsightCard
                    icon={<Target size={15} />}
                    title="PT Conversion"
                    value="PT sales conversion +9%"
                    color="#7c3aed"
                    sub="vs last 30 days"
                  />
                  <InsightCard
                    icon={<AlertCircle size={15} />}
                    title="Pending Dues Alert"
                    value="Pending dues increased 9%"
                    color="#f59e0b"
                    sub="₹18,400 outstanding"
                  />
                  <InsightCard
                    icon={<Clock size={15} />}
                    title="Peak Revenue Time"
                    value="6–8 PM highest conversion"
                    color="#06b6d4"
                    sub="Avg ₹4,200 per hour"
                  />
                </div>
              </div>
            </div>

            {/* ── 7. TRANSACTIONS TABLE ────────────────────────── */}
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 20, overflow: 'hidden',
              marginBottom: 24,
            }}>
              {/* Table toolbar */}
              <div style={{
                padding: '20px 24px 16px',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', gap: 12, flexWrap: 'wrap',
              }}>
                <div>
                  <h2 style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.88)', margin: 0, letterSpacing: '-0.01em' }}>Transactions</h2>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: '2px 0 0' }}>
                    {filtered.length} records · {fmtCompact(totalRev)} total
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* Search */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 10, padding: '7px 12px',
                    minWidth: 200,
                  }}>
                    <Search size={13} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
                    <input
                      placeholder="Search member or receipt…"
                      value={search}
                      onChange={e => { setSearch(e.target.value); setPage(1); }}
                      style={{
                        background: 'none', border: 'none', outline: 'none',
                        color: 'rgba(255,255,255,0.75)', fontSize: 12, width: '100%',
                      }}
                    />
                    {search && (
                      <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', display: 'flex' }}>
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  {/* Method filter */}
                  <div style={{ display: 'flex', gap: 4 }}>
                    {METHODS.map(m => (
                      <button
                        key={m}
                        onClick={() => { setMethodFilter(m); setPage(1); }}
                        style={{
                          padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                          cursor: 'pointer', transition: 'all 140ms ease',
                          background: methodFilter === m ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.04)',
                          color: methodFilter === m ? '#a78bfa' : 'rgba(255,255,255,0.45)',
                          border: methodFilter === m ? '1px solid rgba(167,139,250,0.3)' : '1px solid rgba(255,255,255,0.06)',
                        }}
                      >
                        {m === 'BANK_TRANSFER' ? 'BANK' : m}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      {['Member', 'Amount', 'Method', 'Date', 'Receipt', 'Notes', ''].map((h, i) => (
                        <th key={i} style={{
                          padding: '10px 18px',
                          textAlign: i > 0 ? 'left' : 'left',
                          fontSize: 10, fontWeight: 700,
                          color: 'rgba(255,255,255,0.3)',
                          textTransform: 'uppercase', letterSpacing: '0.7px',
                          whiteSpace: 'nowrap',
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      Array.from({ length: 6 }).map((_, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          {[180, 90, 90, 100, 100, 160, 40].map((w, j) => (
                            <td key={j} style={{ padding: '14px 18px' }}>
                              <div style={{
                                height: 12, width: w, borderRadius: 6,
                                background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)',
                                backgroundSize: '200% 100%',
                                animation: 'shimmer 1.4s ease-in-out infinite',
                              }} />
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : paginated.length === 0 ? (
                      <tr>
                        <td colSpan={7}>
                          <div style={{ padding: '60px 24px', textAlign: 'center' }}>
                            <div style={{
                              width: 48, height: 48, borderRadius: '50%',
                              background: 'rgba(255,255,255,0.04)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              margin: '0 auto 16px', color: 'rgba(255,255,255,0.2)',
                            }}>
                              <Receipt size={20} />
                            </div>
                            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', fontWeight: 600, margin: '0 0 4px' }}>No transactions found</p>
                            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', margin: 0 }}>
                              {search || methodFilter !== 'ALL' ? 'Try adjusting your filters' : 'Record your first payment to get started'}
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginated.map((p, i) => (
                        <tr
                          key={p.id}
                          className="tx-row"
                          style={{
                            borderBottom: '1px solid rgba(255,255,255,0.03)',
                            transition: 'background 150ms ease',
                          }}
                        >
                          {/* Member */}
                          <td style={{ padding: '12px 18px', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{
                                width: 32, height: 32, borderRadius: '50%',
                                background: avatarColor(p.client_name),
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 11, fontWeight: 800, color: 'white', flexShrink: 0,
                              }}>
                                {avatarInitials(p.client_name)}
                              </div>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.82)' }}>{p.client_name ?? '—'}</div>
                                {p.trainer_name && (
                                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>Trainer: {p.trainer_name}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          {/* Amount */}
                          <td style={{ padding: '12px 18px', whiteSpace: 'nowrap' }}>
                            <span style={{ fontSize: 14, fontWeight: 800, color: '#10b981', fontVariantNumeric: 'tabular-nums' }}>
                              {fmtAmount(Number(p.amount))}
                            </span>
                          </td>
                          {/* Method */}
                          <td style={{ padding: '12px 18px' }}>
                            <MethodPill method={p.method} />
                          </td>
                          {/* Date */}
                          <td style={{ padding: '12px 18px', whiteSpace: 'nowrap' }}>
                            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>{fmtDate(p.date)}</span>
                          </td>
                          {/* Receipt */}
                          <td style={{ padding: '12px 18px' }}>
                            <span style={{
                              fontSize: 11, fontWeight: 600,
                              color: 'rgba(255,255,255,0.35)',
                              fontFamily: 'monospace',
                              background: 'rgba(255,255,255,0.04)',
                              borderRadius: 6, padding: '2px 7px',
                            }}>{p.receipt_no ?? '—'}</span>
                          </td>
                          {/* Notes */}
                          <td style={{ padding: '12px 18px', maxWidth: 180 }}>
                            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                              {p.notes ?? '—'}
                            </span>
                          </td>
                          {/* Delete */}
                          <td style={{ padding: '12px 18px' }}>
                            {isAdmin && (
                              deleteId === p.id ? (
                                <div style={{ display: 'flex', gap: 4 }}>
                                  <button
                                    onClick={() => handleDelete(p.id)}
                                    style={{ fontSize: 10, fontWeight: 700, color: '#f43f5e', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.25)', borderRadius: 6, padding: '3px 8px', cursor: 'pointer' }}
                                  >Confirm</button>
                                  <button
                                    onClick={() => setDeleteId(null)}
                                    style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '3px 8px', cursor: 'pointer' }}
                                  >Cancel</button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setDeleteId(p.id)}
                                  style={{
                                    width: 28, height: 28, borderRadius: 8,
                                    background: 'rgba(244,63,94,0.06)',
                                    border: '1px solid rgba(244,63,94,0.15)',
                                    color: 'rgba(244,63,94,0.6)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer', transition: 'all 150ms ease',
                                  }}
                                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#f43f5e'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(244,63,94,0.14)'; }}
                                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(244,63,94,0.6)'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(244,63,94,0.06)'; }}
                                >
                                  <Trash2 size={12} />
                                </button>
                              )
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{
                  padding: '14px 24px',
                  borderTop: '1px solid rgba(255,255,255,0.05)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
                    {((page-1)*PAGE_SIZE)+1}–{Math.min(page*PAGE_SIZE, filtered.length)} of {filtered.length}
                  </span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="btn-ghost"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '6px 12px', borderRadius: 8,
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        color: page === 1 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.6)',
                        fontSize: 12, fontWeight: 600, cursor: page === 1 ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <ChevronDown size={13} style={{ transform: 'rotate(90deg)' }} /> Prev
                    </button>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="btn-ghost"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '6px 12px', borderRadius: 8,
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        color: page === totalPages ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.6)',
                        fontSize: 12, fontWeight: 600, cursor: page === totalPages ? 'not-allowed' : 'pointer',
                      }}
                    >
                      Next <ChevronDown size={13} style={{ transform: 'rotate(-90deg)' }} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── 6. RECORD PAYMENT PANEL (Slide-in) ───────────────── */}
          {showPanel && (
            <>
              {/* Backdrop */}
              <div
                onClick={() => setShowPanel(false)}
                style={{
                  position: 'fixed', inset: 0, zIndex: 100,
                  background: 'rgba(0,0,0,0.6)',
                  backdropFilter: 'blur(4px)',
                }}
              />
              {/* Panel */}
              <div style={{
                position: 'fixed', top: 0, right: 0, bottom: 0,
                width: 'min(480px, 100vw)',
                zIndex: 101,
                background: 'linear-gradient(180deg, #13131f 0%, #0f0f1a 100%)',
                borderLeft: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '-24px 0 80px rgba(0,0,0,0.5)',
                overflowY: 'auto',
                animation: 'slideInRight 260ms cubic-bezier(0.34,1.56,0.64,1)',
              }}>
                {/* Panel header */}
                <div style={{
                  padding: '24px 28px 20px',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                  position: 'sticky', top: 0, background: 'rgba(19,19,31,0.95)',
                  backdropFilter: 'blur(16px)', zIndex: 10,
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: 'rgba(124,58,237,0.15)',
                        border: '1px solid rgba(167,139,250,0.25)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#a78bfa',
                      }}>
                        <Plus size={16} />
                      </div>
                      <h2 style={{ fontSize: 17, fontWeight: 750, color: 'rgba(255,255,255,0.92)', margin: 0, letterSpacing: '-0.02em' }}>Record Payment</h2>
                    </div>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: 0 }}>619 Fitness Studio · Financial OS</p>
                  </div>
                  <button
                    onClick={() => setShowPanel(false)}
                    style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
                      transition: 'all 150ms ease',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)'; }}
                  >
                    <X size={15} />
                  </button>
                </div>

                {/* Form body */}
                <form onSubmit={handleSubmit} style={{ padding: '28px 28px 40px' }}>
                  {/* Member selector */}
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 8 }}>
                      Member *
                    </label>
                    {selectedClient ? (
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        background: 'rgba(124,58,237,0.08)',
                        border: '1px solid rgba(167,139,250,0.2)',
                        borderRadius: 12, padding: '12px 14px',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: '50%',
                            background: avatarColor(selectedClient.name),
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 11, fontWeight: 800, color: 'white',
                          }}>
                            {avatarInitials(selectedClient.name)}
                          </div>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.88)' }}>{selectedClient.name}</div>
                            {(selectedClient.balance_due ?? selectedClient.balance_amount ?? 0) > 0 && (
                              <div style={{ fontSize: 11, color: '#f59e0b' }}>Due: {fmtAmount(selectedClient.balance_due ?? selectedClient.balance_amount ?? 0)}</div>
                            )}
                          </div>
                        </div>
                        <button type="button" onClick={() => { setFClientId(''); setClientSearch(''); }}
                          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', display: 'flex' }}>
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div style={{ position: 'relative' }}>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 12, padding: '11px 14px',
                          transition: 'border-color 160ms ease',
                        }}
                        onFocus={() => {}}
                        >
                          <Search size={14} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
                          <input
                            placeholder="Search member…"
                            value={clientSearch}
                            onChange={e => setClientSearch(e.target.value)}
                            style={{
                              background: 'none', border: 'none', outline: 'none',
                              color: 'rgba(255,255,255,0.8)', fontSize: 13, width: '100%',
                            }}
                          />
                        </div>
                        {clientSearch && filteredClients.length > 0 && (
                          <div style={{
                            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20,
                            background: '#1a1a2e',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 12, overflow: 'hidden', marginTop: 4,
                            boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
                          }}>
                            {filteredClients.map(c => (
                              <button
                                key={c.id} type="button"
                                onClick={() => { setFClientId(String(c.id)); setClientSearch(''); }}
                                style={{
                                  width: '100%', textAlign: 'left', padding: '10px 14px',
                                  background: 'none', border: 'none', cursor: 'pointer',
                                  display: 'flex', alignItems: 'center', gap: 10,
                                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                                  transition: 'background 120ms',
                                }}
                                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
                              >
                                <div style={{
                                  width: 28, height: 28, borderRadius: '50%',
                                  background: avatarColor(c.name),
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: 10, fontWeight: 800, color: 'white', flexShrink: 0,
                                }}>
                                  {avatarInitials(c.name)}
                                </div>
                                <div>
                                  <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{c.name}</div>
                                  {(c.balance_due ?? c.balance_amount ?? 0) > 0 && (
                                    <div style={{ fontSize: 10, color: '#f59e0b' }}>Due: {fmtAmount(c.balance_due ?? c.balance_amount ?? 0)}</div>
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Amount */}
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 8 }}>Amount *</label>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 0,
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 12, overflow: 'hidden',
                      transition: 'border-color 160ms',
                    }}
                    onFocusCapture={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(167,139,250,0.4)'; }}
                    onBlurCapture={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.1)'; }}
                    >
                      <span style={{ padding: '12px 14px', fontSize: 15, fontWeight: 700, color: '#10b981', borderRight: '1px solid rgba(255,255,255,0.06)' }}>₹</span>
                      <input
                        type="number" min="1" step="1"
                        placeholder="0"
                        value={fAmount}
                        onChange={e => setFAmount(e.target.value)}
                        required
                        style={{
                          flex: 1, background: 'none', border: 'none', outline: 'none',
                          color: 'rgba(255,255,255,0.88)', fontSize: 15, fontWeight: 700,
                          padding: '12px 14px', fontVariantNumeric: 'tabular-nums',
                        }}
                      />
                      {Number(fAmount) > 0 && (
                        <span style={{ padding: '0 14px', fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>
                          {fmtCompact(Number(fAmount))}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Method selector */}
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 8 }}>Payment Method *</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                      {(['CASH', 'UPI', 'CARD', 'BANK_TRANSFER'] as const).map(m => {
                        const cfg = METHOD_CONFIG[m];
                        const active = fMethod === m;
                        return (
                          <button
                            key={m} type="button"
                            onClick={() => setFMethod(m)}
                            style={{
                              padding: '10px 8px', borderRadius: 10,
                              background: active ? `${cfg.color}18` : 'rgba(255,255,255,0.03)',
                              border: active ? `1.5px solid ${cfg.color}40` : '1px solid rgba(255,255,255,0.08)',
                              color: active ? cfg.color : 'rgba(255,255,255,0.45)',
                              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                              cursor: 'pointer', transition: 'all 150ms ease',
                              fontSize: 10, fontWeight: 700,
                            }}
                          >
                            {cfg.icon}
                            {cfg.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Date */}
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 8 }}>Date *</label>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 12, padding: '11px 14px',
                    }}
                    onFocusCapture={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(167,139,250,0.4)'; }}
                    onBlurCapture={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.1)'; }}
                    >
                      <Calendar size={14} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
                      <input
                        type="date" value={fDate}
                        onChange={e => setFDate(e.target.value)}
                        required
                        style={{
                          background: 'none', border: 'none', outline: 'none',
                          color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 600, width: '100%',
                          cursor: 'pointer',
                        }}
                      />
                    </div>
                  </div>

                  {/* Notes */}
                  <div style={{ marginBottom: 28 }}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 8 }}>Notes</label>
                    <textarea
                      placeholder="Optional notes…"
                      value={fNotes}
                      onChange={e => setFNotes(e.target.value)}
                      rows={3}
                      style={{
                        width: '100%', background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 12, padding: '11px 14px',
                        color: 'rgba(255,255,255,0.75)', fontSize: 13,
                        resize: 'vertical', outline: 'none',
                        fontFamily: 'inherit', lineHeight: 1.5,
                        transition: 'border-color 160ms',
                        boxSizing: 'border-box',
                      }}
                      onFocus={e => { e.target.style.borderColor = 'rgba(167,139,250,0.4)'; }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                    />
                  </div>

                  {/* Error */}
                  {fError && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      background: 'rgba(244,63,94,0.08)',
                      border: '1px solid rgba(244,63,94,0.2)',
                      borderRadius: 10, padding: '10px 14px',
                      marginBottom: 20,
                    }}>
                      <AlertCircle size={14} style={{ color: '#f43f5e', flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: '#f43f5e', fontWeight: 600 }}>{fError}</span>
                    </div>
                  )}

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={fSubmitting}
                    style={{
                      width: '100%', padding: '14px',
                      borderRadius: 14, border: 'none',
                      background: fSubmitting
                        ? 'rgba(124,58,237,0.4)'
                        : 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                      color: 'white', fontSize: 14, fontWeight: 700,
                      cursor: fSubmitting ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      boxShadow: fSubmitting ? 'none' : '0 6px 24px rgba(124,58,237,0.4)',
                      transition: 'all 180ms ease',
                      letterSpacing: '-0.01em',
                    }}
                    onMouseEnter={e => { if (!fSubmitting) (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 30px rgba(124,58,237,0.55)'; }}
                    onMouseLeave={e => { if (!fSubmitting) (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 24px rgba(124,58,237,0.4)'; }}
                  >
                    {fSubmitting ? (
                      <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Recording…</>
                    ) : (
                      <><CheckCircle2 size={15} /> Record Payment</>
                    )}
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </AppShell>
    </Guard>
  );
}
