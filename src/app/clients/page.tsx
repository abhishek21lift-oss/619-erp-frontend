'use client';
/**
 * Members Dashboard — Premium CRM Redesign
 * Apple × Stripe × Linear × Framer × Luxury Fitness CRM
 */
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';
import Guard from '@/components/Guard';
import { useAuth } from '@/lib/auth-context';
import {
  Search, UserPlus, Download, MoreHorizontal, Eye, CreditCard,
  RefreshCw, Snowflake, ScanFace, Trash2, MessageCircle,
  ChevronLeft, ChevronRight, Users, CheckCircle, XCircle,
  AlertCircle, Clock, Cake, Dumbbell, Repeat, MoveRight,
  ArrowRightLeft, TrendingUp, TrendingDown, Zap, Filter,
  X, ChevronDown, Bell, Activity, IndianRupee, Star,
  ArrowUpRight, BarChart2, Shield, Flame,
} from 'lucide-react';
import type { Client as ApiClient } from '@/lib/api';

/* ─── Types ─────────────────────────────────────────────── */
type Client = ApiClient & {
  phone?: string;
  membership_plan?: string;
  expiry_date?: string;
  balance_due?: number;
  face_enrolled?: boolean;
};

type Segment = 'all' | 'active' | 'expired' | 'frozen' | 'dues' | 'expiring' | 'birthdays';
type SortKey = 'name' | 'status' | 'expiry_date' | 'balance_due' | 'joining_date';
type SortDir = 'asc' | 'desc';

/* ─── Constants ─────────────────────────────────────────── */
const PAGE_SIZE = 50;

const SEGMENTS: { key: Segment; label: string; icon: React.ReactNode }[] = [
  { key: 'all',       label: 'All',          icon: <Users size={12} /> },
  { key: 'active',    label: 'Active',        icon: <CheckCircle size={12} /> },
  { key: 'expired',   label: 'Expired',       icon: <XCircle size={12} /> },
  { key: 'frozen',    label: 'Frozen',        icon: <Snowflake size={12} /> },
  { key: 'dues',      label: 'Has Dues',      icon: <AlertCircle size={12} /> },
  { key: 'expiring',  label: 'Expiring Soon', icon: <Clock size={12} /> },
  { key: 'birthdays', label: 'Birthdays',     icon: <Cake size={12} /> },
];

/* ─── Avatar gradient pools ─────────────────────────────── */
const GRADIENTS = [
  'linear-gradient(135deg,#667eea,#764ba2)',
  'linear-gradient(135deg,#f093fb,#f5576c)',
  'linear-gradient(135deg,#4facfe,#00f2fe)',
  'linear-gradient(135deg,#43e97b,#38f9d7)',
  'linear-gradient(135deg,#fa709a,#fee140)',
  'linear-gradient(135deg,#a18cd1,#fbc2eb)',
  'linear-gradient(135deg,#ffecd2,#fcb69f)',
  'linear-gradient(135deg,#a1c4fd,#c2e9fb)',
];
function avatarGradient(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return GRADIENTS[Math.abs(h) % GRADIENTS.length];
}
function initials(name: string) {
  return (name || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

/* ─── Helpers ───────────────────────────────────────────── */
function fmtDate(d?: string) {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtDateShort(d?: string) {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}
function daysUntil(d?: string): number {
  if (!d) return 9999;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}
function isThisMonthBirthday(dob?: string) {
  if (!dob) return false;
  return new Date(dob).getMonth() === new Date().getMonth();
}
function whatsappHref(phone?: string, name?: string) {
  if (!phone) return '#';
  const cleaned = phone.replace(/\D/g, '');
  const num = cleaned.startsWith('91') ? cleaned : `91${cleaned}`;
  const msg = encodeURIComponent(`Hi ${name ?? 'there'}, this is a message from 619 Fitness Studio.`);
  return `https://wa.me/${num}?text=${msg}`;
}
function exportCSV(clients: Client[]) {
  const headers = ['ID', 'Name', 'Email', 'Phone', 'Status', 'Plan', 'Expiry', 'Balance Due', 'Join Date'];
  const rows = (clients ?? []).map((c) => [
    c.id, c.name, c.email ?? '', c.phone ?? '',
    c.status, c.membership_plan ?? '', c.expiry_date ?? '',
    c.balance_due ?? 0, c.joining_date ?? '',
  ]);
  const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `619_members_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

/* ─── Animated Counter ──────────────────────────────────── */
function AnimatedNumber({ value, prefix = '' }: { value: number; prefix?: string }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number>(0);
  useEffect(() => {
    const target = value;
    const start = ref.current;
    const duration = 800;
    const startTime = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + (target - start) * eased));
      if (progress < 1) requestAnimationFrame(step);
      else ref.current = target;
    };
    requestAnimationFrame(step);
  }, [value]);
  return <>{prefix}{display.toLocaleString('en-IN')}</>;
}

/* ─── Status Badge ──────────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { bg: string; color: string; dot: string; label: string }> = {
    active:  { bg: 'rgba(16,185,129,0.1)',  color: '#059669', dot: '#10b981', label: 'Active' },
    expired: { bg: 'rgba(239,68,68,0.1)',   color: '#dc2626', dot: '#ef4444', label: 'Expired' },
    frozen:  { bg: 'rgba(59,130,246,0.1)',  color: '#2563eb', dot: '#3b82f6', label: 'Frozen' },
    pending: { bg: 'rgba(245,158,11,0.1)',  color: '#d97706', dot: '#f59e0b', label: 'Pending' },
  };
  const c = cfg[status] ?? { bg: 'rgba(107,114,128,0.1)', color: '#6b7280', dot: '#9ca3af', label: status };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600,
      letterSpacing: '0.02em', background: c.bg, color: c.color,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
      {c.label}
    </span>
  );
}

/* ─── Expiry Pill ────────────────────────────────────────── */
function ExpiryPill({ days, date }: { days: number; date?: string }) {
  if (!date) return <span style={{ color: '#9ca3af', fontSize: 12 }}>—</span>;
  if (days < 0) return (
    <span style={{ color: '#ef4444', fontSize: 12, fontWeight: 500 }}>
      {fmtDateShort(date)} <span style={{ opacity: 0.7 }}>({Math.abs(days)}d ago)</span>
    </span>
  );
  if (days <= 7) return (
    <span style={{ color: '#ef4444', fontSize: 12, fontWeight: 600 }}>
      {fmtDateShort(date)} <span style={{
        background: 'rgba(239,68,68,0.12)', padding: '1px 6px',
        borderRadius: 10, fontSize: 10, marginLeft: 3,
      }}>{days}d</span>
    </span>
  );
  if (days <= 30) return (
    <span style={{ color: '#f59e0b', fontSize: 12, fontWeight: 500 }}>
      {fmtDateShort(date)} <span style={{
        background: 'rgba(245,158,11,0.12)', padding: '1px 6px',
        borderRadius: 10, fontSize: 10, marginLeft: 3,
      }}>{days}d</span>
    </span>
  );
  return <span style={{ color: '#6b7280', fontSize: 12 }}>{fmtDateShort(date)}</span>;
}

/* ─── KPI Card ──────────────────────────────────────────── */
interface KpiConfig {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent: string;
  accentBg: string;
  trend?: number;
  sub?: string;
}
function KpiCard({ cfg, onClick, active }: { cfg: KpiConfig; onClick: () => void; active: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active
          ? `linear-gradient(135deg, ${cfg.accent}18, ${cfg.accent}08)`
          : 'rgba(255,255,255,0.7)',
        border: active ? `1.5px solid ${cfg.accent}40` : '1.5px solid rgba(0,0,0,0.06)',
        borderRadius: 16, padding: '18px 20px',
        textAlign: 'left', cursor: 'pointer', width: '100%',
        backdropFilter: 'blur(8px)',
        boxShadow: active
          ? `0 4px 24px ${cfg.accent}20, 0 1px 4px rgba(0,0,0,0.06)`
          : '0 1px 4px rgba(0,0,0,0.05)',
        transition: 'all 0.25s cubic-bezier(0.16,1,0.3,1)',
        transform: active ? 'translateY(-1px)' : 'none',
        position: 'relative', overflow: 'hidden',
      }}
    >
      {active && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, ${cfg.accent}, transparent)`,
        }} />
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: cfg.accentBg, display: 'flex', alignItems: 'center',
          justifyContent: 'center', color: cfg.accent,
        }}>
          {cfg.icon}
        </div>
        {cfg.trend !== undefined && (
          <span style={{
            display: 'flex', alignItems: 'center', gap: 2, fontSize: 11,
            color: cfg.trend >= 0 ? '#10b981' : '#ef4444', fontWeight: 600,
          }}>
            {cfg.trend >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {Math.abs(cfg.trend)}%
          </span>
        )}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.5px', lineHeight: 1 }}>
        <AnimatedNumber value={cfg.value} />
      </div>
      <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, fontWeight: 500 }}>{cfg.label}</div>
      {cfg.sub && <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{cfg.sub}</div>}
    </button>
  );
}

/* ─── Skeleton Row ──────────────────────────────────────── */
function SkeletonRow() {
  return (
    <tr>
      <td style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="skeleton" style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0 }} />
          <div>
            <div className="skeleton" style={{ width: 130, height: 13, borderRadius: 4, marginBottom: 5 }} />
            <div className="skeleton" style={{ width: 90, height: 10, borderRadius: 4 }} />
          </div>
        </div>
      </td>
      {[70, 80, 90, 80, 70, 100].map((w, i) => (
        <td key={i} style={{ padding: '14px 16px' }}>
          <div className="skeleton" style={{ width: w, height: 12, borderRadius: 4 }} />
        </td>
      ))}
    </tr>
  );
}

/* ─── Row Action Menu ───────────────────────────────────── */
function RowMenu({ client, onDelete }: { client: Client; onDelete: (c: Client) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const go = (path: string) => { setOpen(false); router.push(path); };

  const menuItems = [
    { label: 'View Profile', icon: <Eye size={13} />, action: () => go(`/clients/${client.id}`), group: 'primary' },
    { label: 'Renew Membership', icon: <RefreshCw size={13} />, action: () => go(`/clients/${client.id}/renew-subscription`), group: 'primary' },
    { label: 'Add Subscription', icon: <CreditCard size={13} />, action: () => go(`/clients/${client.id}/add-subscription`), group: 'primary' },
    { label: 'Extension', icon: <MoveRight size={13} />, action: () => go(`/clients/${client.id}/extension`), group: 'actions' },
    { label: 'Transfer', icon: <ArrowRightLeft size={13} />, action: () => go(`/clients/${client.id}/transfer`), group: 'actions' },
    { label: 'Freeze Membership', icon: <Snowflake size={13} />, action: () => go(`/clients/${client.id}/freeze`), group: 'actions' },
    { label: 'Assign PT', icon: <Dumbbell size={13} />, action: () => go(`/clients/${client.id}/assign-pt`), group: 'pt' },
    { label: 'Renew PT', icon: <Repeat size={13} />, action: () => go(`/clients/${client.id}/renew-pt`), group: 'pt' },
    { label: 'Enroll Face ID', icon: <ScanFace size={13} />, action: () => go(`/checkin?enroll=${client.id}`), group: 'pt' },
  ];

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        aria-label="Actions"
        style={{
          width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(0,0,0,0.08)',
          background: open ? '#f1f5f9' : 'transparent', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#64748b', transition: 'all 0.15s ease',
        }}
      >
        <MoreHorizontal size={14} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 4px)', zIndex: 100,
          background: '#fff', border: '1px solid rgba(0,0,0,0.08)',
          borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
          minWidth: 192, overflow: 'hidden', padding: '6px 0',
        }}>
          {['primary', 'actions', 'pt'].map((group, gi) => {
            const items = menuItems.filter((m) => m.group === group);
            return (
              <div key={group}>
                {gi > 0 && <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '4px 0' }} />}
                {items.map((item) => (
                  <button
                    key={item.label}
                    onClick={item.action}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 9,
                      width: '100%', padding: '8px 14px', border: 'none',
                      background: 'transparent', cursor: 'pointer', textAlign: 'left',
                      fontSize: 13, color: '#374151', transition: 'background 0.1s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span style={{ color: '#94a3b8' }}>{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>
            );
          })}
          {client.phone && (
            <>
              <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '4px 0' }} />
              <a
                href={whatsappHref(client.phone, client.name)}
                target="_blank" rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 9,
                  padding: '8px 14px', textDecoration: 'none',
                  fontSize: 13, color: '#16a34a',
                }}
              >
                <MessageCircle size={13} /> WhatsApp
              </a>
            </>
          )}
          {(user?.role === 'admin' || user?.role === 'manager') && (
            <>
              <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '4px 0' }} />
              <button
                onClick={() => { setOpen(false); onDelete(client); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 9,
                  width: '100%', padding: '8px 14px', border: 'none',
                  background: 'transparent', cursor: 'pointer', textAlign: 'left',
                  fontSize: 13, color: '#ef4444',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#fff5f5')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <Trash2 size={13} /> Delete Member
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Main Page ─────────────────────────────────────────── */
export default function ClientsPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [clients, setClients]       = useState<Client[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [search, setSearch]         = useState('');
  const [segment, setSegment]       = useState<Segment>('all');
  const [sortKey, setSortKey]       = useState<SortKey>('name');
  const [sortDir, setSortDir]       = useState<SortDir>('asc');
  const [page, setPage]             = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);
  const [deleting, setDeleting]     = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => setDebouncedSearch(search), 350);
    return () => { if (searchRef.current) clearTimeout(searchRef.current); };
  }, [search]);

  const fetchClients = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await api.clients.list();
      setClients(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message || 'Failed to load members.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  /* ── KPIs ── */
  const kpis = useMemo(() => ({
    total:     clients.length,
    active:    clients.filter((c) => c.status === 'active').length,
    expired:   clients.filter((c) => c.status === 'expired').length,
    frozen:    clients.filter((c) => c.status === 'frozen').length,
    dues:      clients.filter((c) => (c.balance_due ?? 0) > 0).length,
    expiring:  clients.filter((c) => c.status === 'active' && daysUntil(c.expiry_date) <= 30).length,
    birthdays: clients.filter((c) => isThisMonthBirthday(c.dob)).length,
  }), [clients]);

  const kpiCards: KpiConfig[] = [
    { label: 'Total Members',   value: kpis.total,     icon: <Users size={16} />,       accent: '#6366f1', accentBg: 'rgba(99,102,241,0.1)',  trend: 12, sub: 'All time registered' },
    { label: 'Active',          value: kpis.active,    icon: <CheckCircle size={16} />, accent: '#10b981', accentBg: 'rgba(16,185,129,0.1)',  trend: 5,  sub: 'Currently active' },
    { label: 'Expired',         value: kpis.expired,   icon: <XCircle size={16} />,     accent: '#ef4444', accentBg: 'rgba(239,68,68,0.1)',   trend: -3, sub: 'Needs renewal' },
    { label: 'Frozen',          value: kpis.frozen,    icon: <Snowflake size={16} />,   accent: '#3b82f6', accentBg: 'rgba(59,130,246,0.1)',  sub: 'Paused memberships' },
    { label: 'Has Dues',        value: kpis.dues,      icon: <AlertCircle size={16} />, accent: '#f59e0b', accentBg: 'rgba(245,158,11,0.1)',  sub: 'Pending payments' },
    { label: 'Expiring Soon',   value: kpis.expiring,  icon: <Clock size={16} />,       accent: '#f97316', accentBg: 'rgba(249,115,22,0.1)',  sub: 'Within 30 days' },
    { label: 'Birthdays',       value: kpis.birthdays, icon: <Cake size={16} />,        accent: '#ec4899', accentBg: 'rgba(236,72,153,0.1)',  sub: 'This month' },
    { label: 'New This Month',  value: clients.filter((c) => {
        if (!c.joining_date) return false;
        const d = new Date(c.joining_date);
        const n = new Date();
        return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
      }).length, icon: <Star size={16} />, accent: '#8b5cf6', accentBg: 'rgba(139,92,246,0.1)', trend: 8, sub: 'Joined this month' },
  ];

  /* segment→kpiCard index mapping */
  const segmentKpiMap: Partial<Record<Segment, number>> = {
    all: 0, active: 1, expired: 2, frozen: 3, dues: 4, expiring: 5, birthdays: 6,
  };

  /* ── Filter + search ── */
  const filtered = useMemo(() => {
    let list = [...clients];
    if (segment === 'active')    list = list.filter((c) => c.status === 'active');
    if (segment === 'expired')   list = list.filter((c) => c.status === 'expired');
    if (segment === 'frozen')    list = list.filter((c) => c.status === 'frozen');
    if (segment === 'dues')      list = list.filter((c) => (c.balance_due ?? 0) > 0);
    if (segment === 'expiring')  list = list.filter((c) => c.status === 'active' && daysUntil(c.expiry_date) <= 30);
    if (segment === 'birthdays') list = list.filter((c) => isThisMonthBirthday(c.dob));
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter((c) =>
        c.name.toLowerCase().includes(q) ||
        (c.email ?? '').toLowerCase().includes(q) ||
        (c.phone ?? '').includes(q)
      );
    }
    list.sort((a, b) => {
      let va: string | number = '', vb: string | number = '';
      if (sortKey === 'name')         { va = a.name; vb = b.name; }
      if (sortKey === 'status')       { va = a.status ?? ''; vb = b.status ?? ''; }
      if (sortKey === 'expiry_date')  { va = a.pt_end_date ?? a.expiry_date ?? ''; vb = b.pt_end_date ?? b.expiry_date ?? ''; }
      if (sortKey === 'balance_due')  { va = a.balance_amount ?? a.balance_due ?? 0; vb = b.balance_amount ?? b.balance_due ?? 0; }
      if (sortKey === 'joining_date') { va = a.joining_date ?? ''; vb = b.joining_date ?? ''; }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [clients, segment, debouncedSearch, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => setPage(1), [segment, debouncedSearch, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.clients.delete(String(deleteTarget.id));
      setClients((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e: any) {
      alert(`Delete failed: ${e.message}`);
    } finally {
      setDeleting(false);
    }
  }

  /* ─── Styles ─────────────────────────────────────────── */
  const SortBtn = ({ k, label }: { k: SortKey; label: string }) => (
    <button
      onClick={() => toggleSort(k)}
      style={{
        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
        display: 'flex', alignItems: 'center', gap: 4,
        color: sortKey === k ? '#0f172a' : '#64748b',
        fontWeight: sortKey === k ? 700 : 500, fontSize: 11,
        textTransform: 'uppercase', letterSpacing: '0.06em',
        transition: 'color 0.15s',
      }}
    >
      {label}
      <span style={{ opacity: sortKey === k ? 1 : 0.3, fontSize: 9 }}>
        {sortKey === k ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
      </span>
    </button>
  );

  /* ─── Render ─────────────────────────────────────────── */
  return (
    <Guard>
      <AppShell title="Members">
        <div style={{ minHeight: '100vh', background: '#f8fafc' }}>

          {/* ── Premium Page Container ── */}
          <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px 48px' }}>

            {/* ── Hero Header ── */}
            <div style={{
              padding: '32px 0 24px',
              display: 'flex', alignItems: 'flex-end',
              justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 9,
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Users size={15} color="#fff" />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#6366f1', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    Member Management
                  </span>
                </div>
                <h1 style={{
                  fontSize: 28, fontWeight: 800, color: '#0f172a',
                  letterSpacing: '-0.5px', lineHeight: 1.1, margin: 0,
                }}>
                  Members Overview
                </h1>
                <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 14, fontWeight: 400 }}>
                  {loading ? 'Loading...' : `${kpis.total.toLocaleString('en-IN')} total members · ${kpis.active.toLocaleString('en-IN')} active · ${kpis.expiring} expiring soon`}
                </p>
              </div>

              {/* Top-right actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {kpis.dues > 0 && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)',
                    borderRadius: 8, padding: '6px 12px', fontSize: 12, color: '#d97706', fontWeight: 600,
                  }}>
                    <Bell size={12} />
                    {kpis.dues} due{kpis.dues > 1 ? 's' : ''} pending
                  </div>
                )}
                <button
                  onClick={() => exportCSV(filtered)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 14px', borderRadius: 9,
                    border: '1px solid rgba(0,0,0,0.1)', background: '#fff',
                    cursor: 'pointer', fontSize: 13, color: '#374151', fontWeight: 500,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
                >
                  <Download size={13} /> Export
                </button>
                <Link
                  href="/clients/new"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 16px', borderRadius: 9,
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    color: '#fff', fontSize: 13, fontWeight: 600,
                    textDecoration: 'none', boxShadow: '0 2px 8px rgba(99,102,241,0.35)',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 4px 14px rgba(99,102,241,0.45)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.transform = 'none'; (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 2px 8px rgba(99,102,241,0.35)'; }}
                >
                  <UserPlus size={14} /> Add Member
                </Link>
              </div>
            </div>

            {/* ── KPI Grid ── */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: 12, marginBottom: 24,
            }}>
              {kpiCards.map((cfg, i) => (
                <KpiCard
                  key={cfg.label}
                  cfg={cfg}
                  active={segment === (Object.keys(segmentKpiMap) as Segment[]).find((k) => segmentKpiMap[k] === i)}
                  onClick={() => {
                    const seg = (Object.keys(segmentKpiMap) as Segment[]).find((k) => segmentKpiMap[k] === i);
                    if (seg) setSegment(seg);
                  }}
                />
              ))}
            </div>

            {/* ── Error ── */}
            {error && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 10, padding: '12px 16px', marginBottom: 16,
                color: '#dc2626', fontSize: 13,
              }}>
                <span>{error}</span>
                <button onClick={fetchClients} style={{
                  background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: 6,
                  padding: '4px 12px', cursor: 'pointer', fontSize: 12, color: '#dc2626', fontWeight: 600,
                }}>
                  Retry
                </button>
              </div>
            )}

            {/* ── Search + Filters Row ── */}
            <div style={{
              background: '#fff', borderRadius: 14,
              border: '1px solid rgba(0,0,0,0.06)',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              padding: '12px 16px', marginBottom: 8,
              display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
            }}>
              {/* Search */}
              <div style={{
                flex: '1 1 260px', position: 'relative',
                display: 'flex', alignItems: 'center',
              }}>
                <Search size={14} style={{
                  position: 'absolute', left: 12, color: searchFocused ? '#6366f1' : '#94a3b8',
                  transition: 'color 0.2s', pointerEvents: 'none',
                }} />
                <input
                  type="search"
                  placeholder="Search name, phone, email…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  style={{
                    width: '100%', padding: '8px 12px 8px 36px',
                    borderRadius: 9, border: `1.5px solid ${searchFocused ? 'rgba(99,102,241,0.4)' : 'rgba(0,0,0,0.08)'}`,
                    background: searchFocused ? 'rgba(99,102,241,0.03)' : '#f8fafc',
                    fontSize: 13, color: '#0f172a', outline: 'none',
                    transition: 'all 0.2s ease',
                    boxShadow: searchFocused ? '0 0 0 3px rgba(99,102,241,0.1)' : 'none',
                  }}
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    style={{
                      position: 'absolute', right: 10, background: 'none',
                      border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 2,
                      display: 'flex', alignItems: 'center',
                    }}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Divider */}
              <div style={{ width: 1, height: 24, background: 'rgba(0,0,0,0.08)' }} />

              {/* Segment chips */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                {SEGMENTS.map((s) => {
                  const count = kpis[s.key as keyof typeof kpis] ?? 0;
                  const isActive = segment === s.key;
                  return (
                    <button
                      key={s.key}
                      onClick={() => setSegment(s.key)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        padding: '5px 11px', borderRadius: 20,
                        border: isActive ? '1.5px solid rgba(99,102,241,0.35)' : '1.5px solid transparent',
                        background: isActive ? 'rgba(99,102,241,0.1)' : 'rgba(0,0,0,0.04)',
                        color: isActive ? '#6366f1' : '#64748b',
                        fontSize: 12, fontWeight: isActive ? 600 : 500, cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span style={{ color: isActive ? '#6366f1' : '#94a3b8' }}>{s.icon}</span>
                      {s.label}
                      {count > 0 && (
                        <span style={{
                          background: isActive ? '#6366f1' : 'rgba(0,0,0,0.12)',
                          color: isActive ? '#fff' : '#64748b',
                          borderRadius: 10, fontSize: 9, fontWeight: 700,
                          padding: '1px 5px', minWidth: 16, textAlign: 'center',
                        }}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Results count */}
              {debouncedSearch && (
                <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                  {filtered.length} result{filtered.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* ── Members Table ── */}
            <div style={{
              background: '#fff', borderRadius: 16,
              border: '1px solid rgba(0,0,0,0.06)',
              boxShadow: '0 1px 8px rgba(0,0,0,0.05)',
              overflow: 'hidden',
            }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left', background: '#f8fafc', width: '25%' }}>
                        <SortBtn k="name" label="Member" />
                      </th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', background: '#f8fafc' }}>
                        <SortBtn k="status" label="Status" />
                      </th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', background: '#f8fafc' }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Plan</span>
                      </th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', background: '#f8fafc' }}>
                        <SortBtn k="expiry_date" label="Expiry" />
                      </th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', background: '#f8fafc' }}>
                        <SortBtn k="balance_due" label="Balance" />
                      </th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', background: '#f8fafc' }}>
                        <SortBtn k="joining_date" label="Joined" />
                      </th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', background: '#f8fafc', width: 48 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} />)
                    ) : paginated.length === 0 ? (
                      <tr>
                        <td colSpan={7}>
                          <div style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                            justifyContent: 'center', padding: '64px 24px', gap: 12,
                          }}>
                            <div style={{
                              width: 56, height: 56, borderRadius: 16,
                              background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.08))',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              <Users size={24} color="#a5b4fc" />
                            </div>
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>
                                {debouncedSearch ? 'No members found' : 'No members yet'}
                              </div>
                              <div style={{ fontSize: 13, color: '#94a3b8' }}>
                                {debouncedSearch
                                  ? `No results for "${debouncedSearch}"`
                                  : 'Add your first member to get started'}
                              </div>
                            </div>
                            {!debouncedSearch && (
                              <Link
                                href="/clients/new"
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 6,
                                  padding: '9px 18px', borderRadius: 9,
                                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                  color: '#fff', fontSize: 13, fontWeight: 600,
                                  textDecoration: 'none', marginTop: 4,
                                  boxShadow: '0 2px 8px rgba(99,102,241,0.3)',
                                }}
                              >
                                <UserPlus size={14} /> Add Member
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginated.map((c) => {
                        const days = daysUntil(c.expiry_date);
                        const hasDue = (c.balance_due ?? 0) > 0;
                        return (
                          <tr
                            key={c.id}
                            onClick={() => router.push(`/clients/${c.id}`)}
                            style={{
                              cursor: 'pointer',
                              borderBottom: '1px solid rgba(0,0,0,0.04)',
                              transition: 'background 0.1s ease',
                            }}
                            onMouseEnter={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = '#fafbff')}
                            onMouseLeave={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = 'transparent')}
                          >
                            {/* Member cell */}
                            <td style={{ padding: '13px 16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                                <div style={{
                                  width: 38, height: 38, borderRadius: 11, flexShrink: 0,
                                  overflow: 'hidden', background: avatarGradient(c.name),
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: 13, fontWeight: 700, color: '#fff',
                                  boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                                }}>
                                  {c.photo_url
                                    ? <img src={c.photo_url} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    : initials(c.name)
                                  }
                                </div>
                                <div style={{ minWidth: 0 }}>
                                  <div style={{
                                    fontWeight: 600, fontSize: 14, color: '#0f172a',
                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                  }}>
                                    {c.name}
                                    {isThisMonthBirthday(c.dob) && (
                                      <span style={{ marginLeft: 6, fontSize: 12 }} title="Birthday this month">🎂</span>
                                    )}
                                  </div>
                                  <div style={{
                                    fontSize: 11, color: '#94a3b8', marginTop: 1,
                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                  }}>
                                    {c.phone ? (
                                      <a
                                        href={whatsappHref(c.phone, c.name)}
                                        target="_blank" rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        style={{ color: '#94a3b8', textDecoration: 'none' }}
                                      >
                                        {c.phone}
                                      </a>
                                    ) : c.email ?? '—'}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Status */}
                            <td style={{ padding: '13px 16px' }}>
                              <StatusBadge status={c.status ?? 'active'} />
                            </td>

                            {/* Plan */}
                            <td style={{ padding: '13px 16px' }}>
                              <span style={{
                                fontSize: 12, color: '#475569', fontWeight: 500,
                                maxWidth: 140, display: 'block',
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              }}>
                                {c.membership_plan ?? '—'}
                              </span>
                            </td>

                            {/* Expiry */}
                            <td style={{ padding: '13px 16px' }}>
                              <ExpiryPill days={days} date={c.expiry_date} />
                            </td>

                            {/* Balance */}
                            <td style={{ padding: '13px 16px' }}>
                              {hasDue ? (
                                <span style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 3,
                                  fontSize: 13, fontWeight: 700, color: '#ef4444',
                                }}>
                                  ₹{(c.balance_due ?? 0).toLocaleString('en-IN')}
                                </span>
                              ) : (
                                <span style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 3,
                                  fontSize: 11, fontWeight: 600, color: '#10b981',
                                  background: 'rgba(16,185,129,0.08)', padding: '2px 8px', borderRadius: 10,
                                }}>
                                  <CheckCircle size={9} /> Clear
                                </span>
                              )}
                            </td>

                            {/* Joined */}
                            <td style={{ padding: '13px 16px' }}>
                              <span style={{ fontSize: 12, color: '#94a3b8' }}>{fmtDate(c.joining_date)}</span>
                            </td>

                            {/* Actions */}
                            <td style={{ padding: '13px 16px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                              <RowMenu client={c} onDelete={setDeleteTarget} />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* ── Pagination ── */}
              {!loading && filtered.length > PAGE_SIZE && (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 20px', borderTop: '1px solid rgba(0,0,0,0.05)',
                  background: '#fafbff',
                }}>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>
                    Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of <strong style={{ color: '#64748b' }}>{filtered.length}</strong>
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button
                      onClick={() => setPage((p) => p - 1)} disabled={page <= 1}
                      style={{
                        width: 30, height: 30, borderRadius: 7, border: '1px solid rgba(0,0,0,0.08)',
                        background: page <= 1 ? '#f8fafc' : '#fff', cursor: page <= 1 ? 'default' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: page <= 1 ? '#cbd5e1' : '#374151', transition: 'all 0.15s',
                      }}
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <span style={{
                      padding: '4px 12px', fontSize: 12, fontWeight: 600, color: '#374151',
                      background: '#f1f5f9', borderRadius: 7,
                    }}>
                      {page} / {totalPages}
                    </span>
                    <button
                      onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages}
                      style={{
                        width: 30, height: 30, borderRadius: 7, border: '1px solid rgba(0,0,0,0.08)',
                        background: page >= totalPages ? '#f8fafc' : '#fff',
                        cursor: page >= totalPages ? 'default' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: page >= totalPages ? '#cbd5e1' : '#374151', transition: 'all 0.15s',
                      }}
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ── Footer info ── */}
            {!loading && filtered.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: 12 }}>
                <button
                  onClick={() => exportCSV(filtered)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5, background: 'none',
                    border: 'none', cursor: 'pointer', fontSize: 12, color: '#94a3b8',
                    padding: '4px 8px', borderRadius: 6, transition: 'color 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#6366f1')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                >
                  <Download size={11} /> Export {filtered.length} records
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Delete Modal ── */}
        {deleteTarget && (
          <div
            onClick={() => setDeleteTarget(null)}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)',
              backdropFilter: 'blur(4px)', zIndex: 200,
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#fff', borderRadius: 18, padding: '28px 28px 20px',
                maxWidth: 400, width: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: 'rgba(239,68,68,0.1)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', marginBottom: 16,
              }}>
                <Trash2 size={20} color="#ef4444" />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>
                Delete Member
              </h3>
              <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6, margin: '0 0 20px' }}>
                Are you sure you want to permanently delete <strong style={{ color: '#0f172a' }}>{deleteTarget.name}</strong>?
                This action cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setDeleteTarget(null)}
                  style={{
                    padding: '8px 16px', borderRadius: 9,
                    border: '1px solid rgba(0,0,0,0.1)', background: '#fff',
                    fontSize: 13, fontWeight: 600, color: '#374151', cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete} disabled={deleting}
                  style={{
                    padding: '8px 16px', borderRadius: 9, border: 'none',
                    background: deleting ? '#fca5a5' : '#ef4444', color: '#fff',
                    fontSize: 13, fontWeight: 600, cursor: deleting ? 'default' : 'pointer',
                    boxShadow: '0 2px 8px rgba(239,68,68,0.3)',
                    transition: 'all 0.15s',
                  }}
                >
                  {deleting ? 'Deleting…' : 'Delete permanently'}
                </button>
              </div>
            </div>
          </div>
        )}
      </AppShell>
    </Guard>
  );
}
