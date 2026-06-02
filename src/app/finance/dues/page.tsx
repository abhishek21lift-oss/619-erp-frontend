'use client';

import { useEffect, useState, useMemo } from 'react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';
import {
  Search, AlertTriangle, CheckCircle2, TrendingDown,
  MessageCircle, Users, Banknote, RefreshCw,
} from 'lucide-react';

export default function OutstandingDuesPage() {
  return <Guard role="admin"><Inner /></Guard>;
}

const fmt = (n: any) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
function fmtCompact(n: number) {
  if (n >= 100_000) return '₹' + (n / 100_000).toFixed(1) + 'L';
  if (n >= 1_000)   return '₹' + (n / 1_000).toFixed(1) + 'K';
  return fmt(n);
}
function fmtDate(d?: string) {
  if (!d) return '—';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function nameGradient(name: string): string {
  const palettes = [
    'linear-gradient(135deg,#f43f5e,#e11d48)',
    'linear-gradient(135deg,#8b5cf6,#7c3aed)',
    'linear-gradient(135deg,#0ea5e9,#2563eb)',
    'linear-gradient(135deg,#f59e0b,#d97706)',
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  return palettes[Math.abs(h) % palettes.length];
}
function whatsappHref(phone?: string, name?: string) {
  const p = (phone ?? '').replace(/\D/g, '');
  if (!p) return '#';
  const num = p.startsWith('91') ? p : `91${p}`;
  return `https://wa.me/${num}?text=${encodeURIComponent(`Hi ${name ?? 'there'}, kindly clear your outstanding dues at 619 Fitness Studio. Thank you.`)}`;
}

function riskLevel(amount: number): { label: string; color: string; bg: string } {
  if (amount >= 10000) return { label: 'High Risk', color: '#ef4444', bg: '#fef2f2' };
  if (amount >= 3000)  return { label: 'Medium',    color: '#f59e0b', bg: '#fffbeb' };
  return                       { label: 'Low',       color: '#10b981', bg: '#ecfdf5' };
}

function Inner() {
  const [dues, setDues]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [search, setSearch]   = useState('');

  const fetchDues = () => {
    setLoading(true);
    setError('');
    api.reports.dues()
      .then((r) => setDues(Array.isArray(r) ? r : []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchDues(); }, []);

  const filtered = useMemo(() => {
    if (!search) return dues;
    const s = search.toLowerCase();
    return dues.filter((d: any) =>
      (d.name || '').toLowerCase().includes(s) ||
      (d.client_id || '').toLowerCase().includes(s) ||
      (d.mobile || '').includes(search)
    );
  }, [dues, search]);

  const total = filtered.reduce((s: number, d: any) => s + Number(d.balance_amount || 0), 0);
  const highRisk = filtered.filter((d: any) => Number(d.balance_amount || 0) >= 10000).length;
  const medRisk  = filtered.filter((d: any) => { const a = Number(d.balance_amount || 0); return a >= 3000 && a < 10000; }).length;

  return (
    <AppShell>
      <style>{`
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes fadeInUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .dues-page { animation: fadeInUp 0.4s ease; }
        .dues-table tr:hover td { background: #fafbff; }
      `}</style>
      <div className="dues-page" style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 20px 48px' }}>

        {/* ── Page Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 shadow-[0_4px_12px_rgba(245,158,11,0.35)]"
                style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={18} color="white" />
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}
                className="bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 bg-clip-text text-transparent">
                Pending Dues
              </h1>
            </div>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>Collections dashboard · Outstanding balances · Recovery pipeline</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={fetchDues}
              style={{ width: 36, height: 36, borderRadius: 10, border: '1.5px solid #e2e8f0', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              <RefreshCw size={15} />
            </button>
          </div>
        </div>

        {/* ── Hero Outstanding Banner ── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 p-8 mb-5 shadow-[0_8px_32px_rgba(245,158,11,0.3)]"
          style={{ borderRadius: 24, padding: '32px 36px', marginBottom: 20 }}>
          <div style={{ position: 'absolute', top: -60, right: -60, width: 220, height: 220, background: 'rgba(255,255,255,0.06)', borderRadius: '50%' }} />
          <div style={{ position: 'absolute', bottom: -40, right: 80, width: 160, height: 160, background: 'rgba(255,255,255,0.04)', borderRadius: '50%' }} />
          <div style={{ position: 'absolute', top: '30%', left: '20%', width: 100, height: 100, background: 'rgba(255,255,255,0.03)', borderRadius: '50%' }} />
          <div className="flex items-center justify-between relative" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '1.5px', margin: '0 0 8px' }}>Total Outstanding Amount</p>
              <div className="bg-gradient-to-r from-white via-amber-100 to-orange-100 bg-clip-text text-transparent"
                style={{ fontSize: 44, fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1 }}>{fmtCompact(total)}</div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: '8px 0 0' }}>{filtered.length} member{filtered.length !== 1 ? 's' : ''} with pending dues</p>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {[
                { label: 'High Risk', value: highRisk, color: 'rgba(255,255,255,0.15)' },
                { label: 'Medium', value: medRisk, color: 'rgba(255,255,255,0.12)' },
              ].map((s) => (
                <div key={s.label} style={{ background: s.color, backdropFilter: 'blur(8px)', borderRadius: 14, padding: '14px 20px', border: '1px solid rgba(255,255,255,0.15)', textAlign: 'center', minWidth: 90 }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: 'white' }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── KPI Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14, marginBottom: 24 }}>
          {[
            { label: 'Total Outstanding', value: fmtCompact(total), sub: `Full: ${fmt(total)}`, icon: <Banknote size={18} />, accent: '#f59e0b' },
            { label: 'Members with Dues', value: String(filtered.length), sub: 'Require follow-up', icon: <Users size={18} />, accent: '#f97316' },
            { label: 'High Risk Members', value: String(highRisk), sub: 'Balance ≥ ₹10,000', icon: <AlertTriangle size={18} />, accent: '#ef4444' },
            { label: 'Recovery Progress', value: dues.length > 0 ? Math.round(((dues.length - filtered.length) / (dues.length || 1)) * 100) + '%' : '—', sub: 'vs total base', icon: <TrendingDown size={18} />, accent: '#10b981' },
          ].map((k) => (
            <div key={k.label}
              style={{ background: 'white', borderRadius: 20, padding: '22px 24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: 12, position: 'relative', overflow: 'hidden', transition: 'all 200ms ease' }}
              onMouseEnter={(e) => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = '0 8px 28px rgba(0,0,0,0.1)'; el.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)'; el.style.transform = 'translateY(0)'; }}>
              <div style={{ position: 'absolute', top: 0, left: 24, right: 24, height: 3, background: `linear-gradient(90deg,${k.accent},${k.accent}88)`, borderRadius: '0 0 3px 3px', opacity: 0.8 }} />
              <div style={{ width: 40, height: 40, borderRadius: 12, background: `${k.accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: k.accent }}>{k.icon}</div>
              <div>
                <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1 }}>{k.value}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, fontWeight: 500 }}>{k.label}</div>
                {k.sub && <div style={{ fontSize: 11, color: 'var(--text-disabled)', marginTop: 2 }}>{k.sub}</div>}
              </div>
            </div>
          ))}
        </div>

        {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 14, padding: '12px 16px', fontSize: 14, color: '#dc2626', marginBottom: 16 }}>{error}</div>}

        {/* ── Search ── */}
        <div style={{ background: 'white', borderRadius: 18, border: '1px solid #f1f5f9', padding: '14px 18px', marginBottom: 16, boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
          <div style={{ position: 'relative', maxWidth: 340 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-disabled)' }} />
            <input type="search" placeholder="Search member, ID or mobile" value={search} onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: 13, color: 'var(--text-primary)', background: '#fafafa', outline: 'none', boxSizing: 'border-box' }} />
          </div>
        </div>

        {/* ── Premium Table ── */}
        <div style={{ background: 'white', borderRadius: 20, border: '1px solid #f1f5f9', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
          {loading ? (
            <div style={{ padding: '48px 32px' }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ display: 'flex', gap: 16, padding: '14px 0', borderBottom: '1px solid #f8fafc' }}>
                  {[40, 160, 100, 80, 100, 80].map((w, j) => (
                    <div key={j} style={{ height: 13, width: w, borderRadius: 6, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s ease-in-out infinite' }} />
                  ))}
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '72px 32px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg,#dcfce7,#bbf7d0)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #86efac' }}>
                <CheckCircle2 size={36} color="#16a34a" />
              </div>
              <div>
                <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px' }}>All Clear!</p>
                <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>{search ? 'No members match your search.' : 'Every member is up to date — no pending dues.'}</p>
              </div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="dues-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    {['Member', 'Mobile', 'Coach', 'Balance Due', 'Expiry', 'Risk', 'Status', ''].map((h, i) => (
                      <th key={i} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.8px', background: '#fafbff', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((d: any) => {
                    const amt  = Number(d.balance_amount || 0);
                    const risk = riskLevel(amt);
                    const initials = (d.name || '?').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
                    return (
                      <tr key={d.id} style={{ borderBottom: '1px solid #f8fafc', transition: 'background 150ms' }}>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: nameGradient(d.name || '?'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: 'white', flexShrink: 0 }}>{initials}</div>
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>{d.name}</div>
                              <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-disabled)' }}>{d.client_id || '—'}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{d.mobile || '—'}</td>
                        <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-muted)' }}>{d.trainer_name || '—'}</td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ fontSize: 16, fontWeight: 800, background: 'linear-gradient(135deg,#ef4444,#f43f5e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.02em' }}>{fmt(amt)}</span>
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-muted)' }}>{fmtDate(d.pt_end_date)}</td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 20, padding: '3px 10px', background: risk.bg, color: risk.color, border: `1px solid ${risk.color}25` }}>{risk.label}</span>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{
                            fontSize: 11, fontWeight: 600, borderRadius: 20, padding: '3px 10px',
                            background: d.status === 'active' ? '#ecfdf5' : '#fef2f2',
                            color: d.status === 'active' ? '#16a34a' : '#dc2626',
                            border: `1px solid ${d.status === 'active' ? '#86efac' : '#fecaca'}`,
                          }}>{d.status || 'lapsed'}</span>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {d.mobile && (
                              <a href={whatsappHref(d.mobile, d.name)} target="_blank" rel="noopener noreferrer"
                                style={{ width: 30, height: 30, borderRadius: 10, border: '1.5px solid #bbf7d0', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a', textDecoration: 'none' }}
                                title="Send WhatsApp reminder">
                                <MessageCircle size={13} />
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
