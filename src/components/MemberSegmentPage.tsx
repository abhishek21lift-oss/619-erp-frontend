'use client';
/**
 * MemberSegmentPage — Ultra-Premium CRM Dashboard
 * 619 Fitness Studio — Luxury SaaS redesign
 * Segments: active | expiring | lapsed | birthdays
 */
import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';
import {
  Search, RefreshCw, MessageCircle, Eye, Users,
  Grid3x3, List, Cake, Clock, UserX, CheckCircle,
  ArrowUpRight, Zap, Shield,
} from 'lucide-react';

/* ─── Types ─────────────────────────────────────────────── */
interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  mobile?: string;
  status?: string;
  membership_plan?: string;
  package_type?: string;
  expiry_date?: string;
  pt_end_date?: string;
  dob?: string;
  trainer_name?: string;
  member_code?: string;
  client_id?: string;
  photo_url?: string;
}
type Segment = 'active' | 'expiring' | 'lapsed' | 'birthdays';

/* ─── Segment config ─────────────────────────────────────── */
const SEGMENT_META: Record<Segment, {
  title: string; subtitle: string;
  icon: React.ReactNode;
  emptyTitle: string; emptyDesc: string;
  heroGradient: string; accentColor: string; accentLight: string;
}> = {
  active: {
    title: 'Active Members', subtitle: 'Currently subscribed athletes',
    icon: <CheckCircle size={18} />,
    emptyTitle: 'No active members yet', emptyDesc: 'Add members and assign active subscriptions.',
    heroGradient: 'linear-gradient(135deg, #064e3b 0%, #065f46 40%, #047857 70%, #10b981 100%)',
    accentColor: '#10b981', accentLight: '#ecfdf5',
  },
  expiring: {
    title: 'Renewals Due', subtitle: 'Memberships expiring in the next 30 days',
    icon: <Clock size={18} />,
    emptyTitle: 'No renewals due', emptyDesc: 'No memberships are expiring in the next 30 days.',
    heroGradient: 'linear-gradient(135deg, #78350f 0%, #92400e 40%, #b45309 70%, #f59e0b 100%)',
    accentColor: '#f59e0b', accentLight: '#fffbeb',
  },
  lapsed: {
    title: 'Pending Dues', subtitle: 'Lapsed memberships — collection required',
    icon: <UserX size={18} />,
    emptyTitle: 'No lapsed members', emptyDesc: 'All members are currently active.',
    heroGradient: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 40%, #b91c1c 70%, #ef4444 100%)',
    accentColor: '#ef4444', accentLight: '#fef2f2',
  },
  birthdays: {
    title: 'Birthday Members', subtitle: 'Members celebrating birthdays this month',
    icon: <Cake size={18} />,
    emptyTitle: 'No birthdays this month', emptyDesc: 'No member birthdays found for this month.',
    heroGradient: 'linear-gradient(135deg, #4c1d95 0%, #5b21b6 40%, #6d28d9 70%, #8b5cf6 100%)',
    accentColor: '#8b5cf6', accentLight: '#f5f3ff',
  },
};

/* ─── Helpers ───────────────────────────────────────────── */
function fmtDate(d?: string) {
  if (!d) return '—';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function daysUntil(d?: string): number {
  if (!d) return 9999;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}
function expiryStatus(days: number): { color: string; bg: string; label: string } {
  if (days < 0)  return { color: '#ef4444', bg: '#fef2f2', label: `Expired ${Math.abs(days)}d ago` };
  if (days === 0) return { color: '#ef4444', bg: '#fef2f2', label: 'Expires today!' };
  if (days <= 7)  return { color: '#ef4444', bg: '#fef2f2', label: `${days}d left` };
  if (days <= 30) return { color: '#f59e0b', bg: '#fffbeb', label: `${days}d left` };
  return { color: '#10b981', bg: '#ecfdf5', label: `${days}d left` };
}
function nameGradient(name: string): string {
  const palettes = [
    'linear-gradient(135deg,#dc2626,#b91c1c)',
    'linear-gradient(135deg,#7c3aed,#6d28d9)',
    'linear-gradient(135deg,#0ea5e9,#2563eb)',
    'linear-gradient(135deg,#10b981,#059669)',
    'linear-gradient(135deg,#f59e0b,#d97706)',
    'linear-gradient(135deg,#ec4899,#a855f7)',
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  return palettes[Math.abs(h) % palettes.length];
}
function whatsappHref(phone?: string, name?: string) {
  const p = (phone ?? '').replace(/\D/g, '');
  if (!p) return '#';
  const num = p.startsWith('91') ? p : `91${p}`;
  return `https://wa.me/${num}?text=${encodeURIComponent(`Hi ${name ?? 'there'}, this is a message from 619 Fitness Studio.`)}`;
}
function getExpiry(c: Client) { return c.expiry_date ?? c.pt_end_date; }
function getPhone(c: Client)  { return c.phone ?? c.mobile; }
function getPlan(c: Client)   { return c.membership_plan ?? c.package_type; }

/* ─── Premium Member Card ───────────────────────────────── */
function MemberCard({ c, accent }: { c: Client; accent: string }) {
  const router = useRouter();
  const initials = c.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const expiry = getExpiry(c);
  const days   = daysUntil(expiry);
  const phone  = getPhone(c);
  const exp    = expiryStatus(days);

  return (
    <div
      style={{
        background: 'white',
        borderRadius: 20,
        padding: '20px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
        border: '1px solid rgba(0,0,0,0.06)',
        cursor: 'pointer',
        position: 'relative',
        transition: 'all 200ms ease',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
      onClick={() => router.push(`/clients/${c.id}`)}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.boxShadow = '0 8px 28px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)';
        el.style.transform = 'translateY(-3px)';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.boxShadow = '0 2px 10px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)';
        el.style.transform = 'translateY(0)';
      }}
    >
      {/* Status glow dot */}
      <div style={{
        position: 'absolute', top: 14, right: 14,
        width: 8, height: 8, borderRadius: '50%',
        background: c.status === 'active' ? '#10b981' : c.status === 'frozen' ? '#3b82f6' : '#ef4444',
        boxShadow: `0 0 0 3px ${c.status === 'active' ? '#d1fae5' : c.status === 'frozen' ? '#dbeafe' : '#fee2e2'}`,
      }} />

      {/* Avatar */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        {c.photo_url ? (
          <img src={c.photo_url} alt={c.name} style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${accent}30` }} />
        ) : (
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: nameGradient(c.name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, color: '#fff', border: `2px solid ${accent}30`, flexShrink: 0 }}>
            {initials}
          </div>
        )}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 14, lineHeight: 1.3 }}>{c.name}</div>
          {(c.member_code ?? c.client_id) && (
            <div style={{ fontSize: 11, color: 'var(--text-disabled)', marginTop: 2, fontFamily: 'monospace' }}>{c.member_code ?? c.client_id}</div>
          )}
        </div>
      </div>

      {/* Meta pills */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {getPlan(c) && (
          <div style={{ background: `${accent}12`, borderRadius: 20, padding: '4px 10px', fontSize: 11, fontWeight: 600, color: accent, textAlign: 'center', border: `1px solid ${accent}25` }}>
            {getPlan(c)}
          </div>
        )}
        {expiry && (
          <div style={{ background: exp.bg, borderRadius: 20, padding: '4px 10px', fontSize: 11, fontWeight: 700, color: exp.color, textAlign: 'center', border: `1px solid ${exp.color}25` }}>
            {fmtDate(expiry)} · {exp.label}
          </div>
        )}
        {c.trainer_name && (
          <div style={{ fontSize: 11, color: 'var(--text-disabled)', textAlign: 'center' }}>👤 {c.trainer_name}</div>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 6 }} onClick={(e) => e.stopPropagation()}>
        <Link href={`/clients/${c.id}`} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '8px', borderRadius: 12, border: '1.5px solid #e2e8f0', background: 'white', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textDecoration: 'none', transition: 'all 150ms ease' }}>
          <Eye size={11} /> View
        </Link>
        <Link href={`/clients/${c.id}/renew-subscription`} style={{ width: 34, height: 34, borderRadius: 12, border: `1.5px solid ${accent}30`, background: `${accent}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent, textDecoration: 'none' }}>
          <RefreshCw size={12} />
        </Link>
        {phone && (
          <a href={whatsappHref(phone, c.name)} target="_blank" rel="noopener noreferrer" style={{ width: 34, height: 34, borderRadius: 12, border: '1.5px solid #bbf7d0', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a', textDecoration: 'none' }} onClick={(e) => e.stopPropagation()}>
            <MessageCircle size={12} />
          </a>
        )}
      </div>
    </div>
  );
}

/* ─── Skeleton Card ─────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div style={{ background: 'white', borderRadius: 20, padding: 20, border: '1px solid #f1f5f9' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s ease-in-out infinite' }} />
        <div style={{ height: 13, width: 120, borderRadius: 6, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s ease-in-out infinite' }} />
      </div>
      {[100, 80].map((w, i) => (
        <div key={i} style={{ height: 10, width: w, borderRadius: 6, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s ease-in-out infinite', marginBottom: 8 }} />
      ))}
    </div>
  );
}

/* ─── Skeleton Row ──────────────────────────────────────── */
function SkeletonRow() {
  return (
    <tr>
      {[140, 90, 80, 90, 70].map((w, i) => (
        <td key={i} style={{ padding: '14px 16px' }}>
          <div style={{ height: 13, width: w, borderRadius: 6, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s ease-in-out infinite' }} />
        </td>
      ))}
      <td />
    </tr>
  );
}

/* ─── Premium Empty State ────────────────────────────────── */
function PremiumEmptyState({ title, desc, accent, icon }: { title: string; desc: string; accent: string; icon: React.ReactNode }) {
  return (
    <div style={{ padding: '72px 32px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div style={{ width: 72, height: 72, borderRadius: '50%', background: `linear-gradient(135deg, ${accent}25, ${accent}10)`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${accent}20` }}>
        <div style={{ color: accent, transform: 'scale(1.5)' }}>{icon}</div>
      </div>
      <div>
        <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px' }}>{title}</p>
        <p style={{ fontSize: 14, color: 'var(--text-disabled)', margin: 0, maxWidth: 320 }}>{desc}</p>
      </div>
    </div>
  );
}

/* ─── Inner ─────────────────────────────────────────────── */
function Inner({ segment }: { segment: Segment }) {
  const router = useRouter();
  const [clients, setClients]   = useState<Client[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [search, setSearch]     = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const meta = SEGMENT_META[segment];

  const fetchClients = useCallback(async () => {
    setLoading(true); setError('');
    try { const data = await api.clients.list(); setClients(Array.isArray(data) ? data : []); }
    catch (e: any) { setError(e.message || 'Failed to load members.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  const visible = useMemo(() => {
    let pool: Client[];
    switch (segment) {
      case 'active':    pool = clients.filter((c) => c.status === 'active'); break;
      case 'lapsed':    pool = clients.filter((c) => c.status === 'expired'); break;
      case 'expiring':  pool = clients.filter((c) => c.status === 'active' && daysUntil(getExpiry(c)) <= 30); break;
      case 'birthdays': { const now = new Date(); pool = clients.filter((c) => { if (!c.dob) return false; const d = new Date(c.dob); return d.getMonth() === now.getMonth(); }); break; }
      default: pool = clients;
    }
    if (!search.trim()) return pool;
    const q = search.toLowerCase();
    return pool.filter((c) => c.name.toLowerCase().includes(q) || (getPhone(c) ?? '').includes(q) || (c.email ?? '').toLowerCase().includes(q) || (c.member_code ?? c.client_id ?? '').toLowerCase().includes(q));
  }, [clients, segment, search]);

  return (
    <AppShell title={meta.title}>
      <style>{`
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes fadeInUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .seg-page { animation: fadeInUp 0.4s ease; }
        .seg-list-table tr:hover td { background: #fafbff; }
        .seg-view-btn { width:36px;height:36px;border-radius:10px;border:1.5px solid #e2e8f0;background:white;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#64748b;transition:all 150ms; }
        .seg-view-btn:hover { border-color:#7c3aed;color:#7c3aed; }
        .seg-view-btn.active { background:linear-gradient(135deg,#7c3aed,#6d28d9);border-color:transparent;color:white; }
      `}</style>
      <div className="seg-page" style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 20px 48px' }}>

        {/* ── Hero Banner ── */}
        <div style={{
          background: meta.heroGradient,
          borderRadius: 24, padding: '32px 36px', marginBottom: 28,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }} />
          <div style={{ position: 'absolute', bottom: -60, right: 120, width: 200, height: 200, background: 'rgba(255,255,255,0.03)', borderRadius: '50%' }} />
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                {meta.icon}
              </div>
              <h1 style={{ fontSize: 28, fontWeight: 900, color: 'white', margin: 0, letterSpacing: '-0.02em' }}>{meta.title}</h1>
            </div>
            <p style={{ fontSize: 14, color: 'var(--text-primary)', margin: 0 }}>{meta.subtitle}</p>
          </div>
          <div style={{ display: 'flex', gap: 12, position: 'relative', flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', borderRadius: 16, padding: '16px 20px', border: '1px solid rgba(255,255,255,0.2)', textAlign: 'center', minWidth: 90 }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: 'white', letterSpacing: '-0.02em' }}>{loading ? '—' : visible.length}</div>
              <div style={{ fontSize: 11, color: 'var(--text-primary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 2 }}>Members</div>
            </div>
          </div>
        </div>

        {/* ── Controls bar ── */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 240px', minWidth: 0 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-disabled)' }} />
            <input type="search" placeholder="Search name, phone, email…" value={search} onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: 14, border: '1.5px solid #e2e8f0', fontSize: 13, color: 'var(--text-primary)', background: 'white', outline: 'none', boxSizing: 'border-box', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }} />
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 'auto' }}>
            {!loading && <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>{visible.length} member{visible.length !== 1 ? 's' : ''}</span>}
            <button onClick={fetchClients} disabled={loading} style={{ width: 36, height: 36, borderRadius: 10, border: '1.5px solid #e2e8f0', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: loading ? 'not-allowed' : 'pointer', color: 'var(--text-muted)' }}>
              <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            </button>
            <button className={`seg-view-btn${viewMode === 'grid' ? ' active' : ''}`} onClick={() => setViewMode('grid')}><Grid3x3 size={15} /></button>
            <button className={`seg-view-btn${viewMode === 'list' ? ' active' : ''}`} onClick={() => setViewMode('list')}><List size={15} /></button>
          </div>
        </div>

        {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 14, padding: '12px 16px', fontSize: 14, color: '#dc2626', marginBottom: 16 }}>{error} <button onClick={fetchClients} style={{ marginLeft: 8, fontSize: 12, color: '#7c3aed', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Retry</button></div>}

        {/* ── GRID view ── */}
        {viewMode === 'grid' && (
          loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
              {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : visible.length === 0 ? (
            <div style={{ background: 'white', borderRadius: 20, border: '1px solid #f1f5f9', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
              <PremiumEmptyState title={meta.emptyTitle} desc={search ? 'Try a different search term.' : meta.emptyDesc} accent={meta.accentColor} icon={meta.icon} />
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
              {visible.map((c) => <MemberCard key={c.id} c={c} accent={meta.accentColor} />)}
            </div>
          )
        )}

        {/* ── LIST view ── */}
        {viewMode === 'list' && (
          <div style={{ background: 'white', borderRadius: 20, border: '1px solid #f1f5f9', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="seg-list-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    {['Member', 'Status', 'Plan', 'Expiry', 'Trainer', ''].map((h, i) => (
                      <th key={i} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.8px', background: '#fafbff', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
                  ) : visible.length === 0 ? (
                    <tr><td colSpan={6}>
                      <PremiumEmptyState title={meta.emptyTitle} desc={search ? 'Try a different search.' : meta.emptyDesc} accent={meta.accentColor} icon={meta.icon} />
                    </td></tr>
                  ) : (
                    visible.map((c) => {
                      const expiry = getExpiry(c);
                      const days   = daysUntil(expiry);
                      const phone  = getPhone(c);
                      const exp    = expiryStatus(days);
                      const initials = c.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
                      return (
                        <tr key={c.id} style={{ borderBottom: '1px solid #f8fafc', cursor: 'pointer', transition: 'background 150ms' }} onClick={() => router.push(`/clients/${c.id}`)}>
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              {c.photo_url ? (
                                <img src={c.photo_url} alt={c.name} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                              ) : (
                                <div style={{ width: 36, height: 36, borderRadius: '50%', background: nameGradient(c.name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: 'white', flexShrink: 0 }}>{initials}</div>
                              )}
                              <div>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>{c.name}</div>
                                {phone && <div style={{ fontSize: 11, color: 'var(--text-disabled)' }}>{phone}</div>}
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, borderRadius: 20, padding: '3px 10px', background: c.status === 'active' ? '#ecfdf5' : c.status === 'frozen' ? '#eff6ff' : '#fef2f2', color: c.status === 'active' ? '#16a34a' : c.status === 'frozen' ? '#2563eb' : '#dc2626' }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
                              {c.status ?? 'active'}
                            </span>
                          </td>
                          <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-muted)' }}>{getPlan(c) ?? '—'}</td>
                          <td style={{ padding: '14px 16px' }}>
                            {expiry ? (
                              <span style={{ fontSize: 12, fontWeight: 600, color: exp.color, background: exp.bg, borderRadius: 20, padding: '3px 10px' }}>{fmtDate(expiry)} · {exp.label}</span>
                            ) : <span style={{ fontSize: 13, color: 'var(--text-disabled)' }}>—</span>}
                          </td>
                          <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-muted)' }}>{c.trainer_name ?? '—'}</td>
                          <td style={{ padding: '14px 16px' }} onClick={(e) => e.stopPropagation()}>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <Link href={`/clients/${c.id}`} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: 'white', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textDecoration: 'none' }}><Eye size={11} /> View</Link>
                              {phone && (
                                <a href={whatsappHref(phone, c.name)} target="_blank" rel="noopener noreferrer" style={{ width: 30, height: 30, borderRadius: 10, border: '1.5px solid #bbf7d0', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a', textDecoration: 'none' }}>
                                  <MessageCircle size={12} />
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function MemberSegmentPage({ segment }: { segment: Segment }) {
  return <Guard role="admin"><Inner segment={segment} /></Guard>;
}
