'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { m } from 'framer-motion';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { KpiCard, PullToRefresh } from '@/components/ui';
import { api } from '@/lib/api';
import type { DuesItem } from '@/lib/api';
import {
  Search, AlertTriangle, CheckCircle2, TrendingDown,
  MessageCircle, Users, Banknote,
} from 'lucide-react';

export default function OutstandingDuesPage() {
  return <Guard role="admin"><Inner /></Guard>;
}

const fmt = (n: number | string) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
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
  return `https://wa.me/${num}?text=${encodeURIComponent(`Hi ${name ?? 'there'}, kindly clear your outstanding dues at Coach Abhishek. Thank you.`)}`;
}

function riskLevel(amount: number): { label: string; color: string; bg: string } {
  if (amount >= 10000) return { label: 'High Risk', color: '#ef4444', bg: '#fef2f2' };
  if (amount >= 3000)  return { label: 'Medium',    color: '#f59e0b', bg: '#fffbeb' };
  return                       { label: 'Low',       color: '#10b981', bg: '#ecfdf5' };
}

function Inner() {
  const [dues, setDues]   = useState<DuesItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [search, setSearch]   = useState('');
  const searchRef = useRef('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback((val: string) => {
    searchRef.current = val;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(searchRef.current);
    }, 250);
  }, []);

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const fetchDues = () => {
    setLoading(true);
    setError('');
    return api.reports.dues()
      .then((r) => setDues(Array.isArray(r) ? r : []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchDues(); }, []);

  const filtered = useMemo(() => {
    if (!search) return dues;
    const s = search.toLowerCase();
    return dues.filter((d) =>
      (d.name || '').toLowerCase().includes(s) ||
      (d.client_id || '').toLowerCase().includes(s) ||
      (d.mobile || '').includes(search)
    );
  }, [dues, search]);

  const total = filtered.reduce((s, d) => s + Number(d.balance_amount || 0), 0);
  const highRisk = filtered.filter((d) => Number(d.balance_amount || 0) >= 10000).length;
  const medRisk  = filtered.filter((d) => { const a = Number(d.balance_amount || 0); return a >= 3000 && a < 10000; }).length;

  return (
    <AppShell>
      <PullToRefresh onRefresh={fetchDues}>
      <m.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 20px 48px' }}>

        {/* ── Hero ── */}
        <div style={{ padding: '24px 0', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, borderBottom: '1px solid var(--border)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#f59e0b,#f97316,#f43f5e)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(245,158,11,0.35)' }}>
                <AlertTriangle size={18} color="white" />
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>Pending Dues</h1>
            </div>
            <h2 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.5px', margin: '0 0 4px' }}>Total Outstanding Amount</h2>
            <div style={{ fontSize: 'clamp(28px, 8vw, 44px)', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1 }}>{fmtCompact(total)}</div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '8px 0 0' }}>{filtered.length} member{filtered.length !== 1 ? 's' : ''} with pending dues</p>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {[
              { label: 'High Risk', value: highRisk },
              { label: 'Medium', value: medRisk },
            ].map((s) => (
              <div key={s.label} style={{ background: 'var(--bg-subtle)', borderRadius: 14, padding: '14px 20px', border: '1px solid var(--border)', textAlign: 'center', minWidth: 90 }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-primary)' }}>{s.value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── KPI Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14, marginBottom: 24 }}>
          <KpiCard label="Total Outstanding" value={fmtCompact(total)} hint={`Full: ${fmt(total)}`} icon={<Banknote size={16} />} accent="amber" />
          <KpiCard label="Members with Dues" value={String(filtered.length)} hint="Require follow-up" icon={<Users size={16} />} accent="orange" />
          <KpiCard label="High Risk Members" value={String(highRisk)} hint="Balance ≥ ₹10,000" icon={<AlertTriangle size={16} />} accent="rose" />
          <KpiCard
            label="Recovery Progress"
            value={dues.length > 0 ? Math.round(((dues.length - filtered.length) / (dues.length || 1)) * 100) + '%' : '—'}
            hint="vs total base"
            icon={<TrendingDown size={16} />}
            accent="emerald"
          />
        </div>

        {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 14, padding: '12px 16px', fontSize: 14, color: '#dc2626', marginBottom: 16 }}>{error}</div>}

        {/* ── Search ── */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 18, border: '1px solid var(--border)', padding: '14px 18px', marginBottom: 16, boxShadow: 'var(--shadow-xs)' }}>
          <div style={{ position: 'relative', maxWidth: 340 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-disabled)' }} />
            <input type="search" placeholder="Search member, ID or mobile" onChange={(e) => handleSearch(e.target.value)}
              style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: 12, border: '1.5px solid var(--border)', fontSize: 13, color: 'var(--text-primary)', background: 'var(--bg-card)', outline: 'none', boxSizing: 'border-box' }} />
          </div>
        </div>

        {/* ── Table ── */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
          {loading ? (
            <div style={{ padding: '48px 32px' }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ display: 'flex', gap: 16, padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
                  {[40, 160, 100, 80, 100, 80].map((w, j) => (
                    <m.div key={j} style={{ height: 13, width: w, borderRadius: 6, background: 'linear-gradient(90deg,var(--bg-subtle) 25%,var(--bg-hover) 50%,var(--bg-subtle) 75%)', backgroundSize: '200% 100%' }}
                      animate={{ backgroundPosition: ['0% 0%', '200% 0%'] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }} />
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
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Member', 'Mobile', 'Coach', 'Balance Due', 'Expiry', 'Risk', 'Status', ''].map((h, i) => (
                      <th key={i} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', background: 'var(--bg-subtle)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((d) => {
                    const amt  = Number(d.balance_amount || 0);
                    const risk = riskLevel(amt);
                    const initials = (d.name || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
                    return (
                      <tr key={d.id} onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)' }} onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '' }} style={{ borderBottom: '1px solid var(--border)', transition: 'background 150ms' }}>
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
      </m.div>
      </PullToRefresh>
    </AppShell>
  );
}
