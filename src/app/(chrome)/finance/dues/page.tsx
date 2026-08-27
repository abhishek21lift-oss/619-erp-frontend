'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { m } from 'framer-motion';
import Guard from '@/components/Guard';
import ClientAvatar from '@/components/pt-os/ClientAvatar';
import { KpiCard, PageContainer, PageHero, PullToRefresh } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { DuesItem, DuesSummary } from '@/lib/api';
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
    'linear-gradient(135deg,#ef4444,#dc2626)',
    'linear-gradient(135deg,#0067e0,#0059ce)',
    'linear-gradient(135deg,#0067e0,#0059ce)',
    'linear-gradient(135deg,#f59e0b,#d97706)',
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  return palettes[Math.abs(h) % palettes.length];
}
function whatsappHref(phone?: string, name?: string, studio?: string) {
  const p = (phone ?? '').replace(/\D/g, '');
  if (!p) return '#';
  const num = p.startsWith('91') ? p : `91${p}`;
  return `https://wa.me/${num}?text=${encodeURIComponent(`Hi ${name ?? 'there'}, kindly clear your outstanding dues at ${studio || 'MY PT STUDIO'}. Thank you.`)}`;
}

// The risk bands, named once. They are sent to /dues/summary so the server
// counts with the same boundaries this function colours with — the alternative
// is the same two numbers living in two files and quietly drifting.
const RISK_HIGH = 10000;
const RISK_MEDIUM = 3000;

function riskLevel(amount: number): { label: string; color: string; bg: string } {
  if (amount >= RISK_HIGH)   return { label: 'High Risk', color: '#ef4444', bg: '#fef2f2' };
  if (amount >= RISK_MEDIUM) return { label: 'Medium',    color: '#f59e0b', bg: '#fffbeb' };
  return                       { label: 'Low',       color: '#10b981', bg: '#ecfdf5' };
}

function Inner() {
  const { user } = useAuth();
  const [dues, setDues]   = useState<DuesItem[]>([]);
  const [summary, setSummary] = useState<DuesSummary | null>(null);
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

  // ── Rows and totals come from different places, on purpose ──────────────
  //
  // /api/reports/dues is capped at 100 rows server-side. That is fine for the
  // table below, and wrong for the figures in the hero: this page used to sum
  // those rows in the browser, so a studio with more than 100 debtors saw
  // "Outstanding" showing the top hundred's balance under a label that claims
  // to be the lot. /dues/summary aggregates the identical population in SQL
  // with no cap. The thresholds are passed from RISK_HIGH/RISK_MEDIUM below so
  // the bands are defined exactly once.
  const fetchDues = () => {
    setLoading(true);
    setError('');
    return Promise.all([
      api.reports.dues(),
      api.reports.duesSummary({ high: RISK_HIGH, medium: RISK_MEDIUM }).catch(() => null),
    ])
      .then(([rows, sum]) => {
        setDues(Array.isArray(rows) ? rows : []);
        setSummary(sum);
      })
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

  // Authoritative when the summary loaded. The fallback is the old truncated
  // arithmetic and is marked as approximate in the hero, because a wrong total
  // presented as exact is what this change exists to remove.
  const shownTotal = filtered.reduce((s, d) => s + Number(d.balance_amount || 0), 0);
  const total    = summary ? summary.total_outstanding : shownTotal;
  const highRisk = summary ? summary.high_risk_count
    : filtered.filter((d) => Number(d.balance_amount || 0) >= RISK_HIGH).length;
  const medRisk  = summary ? summary.medium_risk_count
    : filtered.filter((d) => { const a = Number(d.balance_amount || 0); return a >= RISK_MEDIUM && a < RISK_HIGH; }).length;
  const debtorCount = summary ? summary.debtor_count : filtered.length;
  // The table shows at most what the API returned; say so when that is less
  // than the real number of debtors instead of letting the list imply it is all.
  const truncated = summary != null && !search && dues.length < summary.debtor_count;

  return (
    <PullToRefresh onRefresh={fetchDues}>
    <PageContainer>

      <PageHero
        icon={<AlertTriangle size={20} />}
        title="Pending Dues"
        subtitle={
          search
            ? `${filtered.length} ${filtered.length === 1 ? 'member' : 'members'} matching`
            : `${debtorCount} ${debtorCount === 1 ? 'member' : 'members'} with pending dues`
            + (truncated ? ` \u00b7 showing the ${dues.length} largest` : '')
        }
      >
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { label: summary ? 'Outstanding' : 'Outstanding (shown)', value: fmtCompact(total) },
            { label: 'High risk', value: String(highRisk) },
            { label: 'Medium', value: String(medRisk) },
          ].map((s) => (
            <div key={s.label} className="rounded-[12px] px-3 py-2.5"
              style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)' }}>
              <p className="truncate text-[17px] font-[800] tabular-nums leading-none text-white">{s.value}</p>
              <p className="mt-1.5 truncate text-[10px] font-[700] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.66)' }}>{s.label}</p>
            </div>
          ))}
        </div>
      </PageHero>

      {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 14, padding: '12px 16px', fontSize: 14, color: '#dc2626', marginBottom: 16 }}>{error}</div>}

      {/* ── Search ── */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 18, border: '1px solid var(--border)', padding: '14px 18px', marginBottom: 16, boxShadow: 'var(--shadow-xs)' }}>
        <div style={{ position: 'relative', maxWidth: 340 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-disabled)' }} />
          <input aria-label="Search member, ID or mobile" type="search" placeholder="Search member, ID or mobile" onChange={(e) => handleSearch(e.target.value)}
            style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: 12, border: '1.5px solid var(--border)', fontSize: 13, color: 'var(--text-primary)', background: 'var(--bg-card)', boxSizing: 'border-box' }} />
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
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg,#d1fae5,#a7f3d0)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #6ee7b7' }}>
              <CheckCircle2 size={36} color="#10b981" />
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
                  {['Member', 'Mobile', 'Balance Due', 'Expiry', 'Risk', 'Status', ''].map((h, i) => (
                    <th key={i} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', background: 'var(--bg-subtle)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => {
                  const amt  = Number(d.balance_amount || 0);
                  const risk = riskLevel(amt);
                  return (
                    <tr key={d.id} onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)' }} onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '' }} style={{ borderBottom: '1px solid var(--border)', transition: 'background 150ms' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <ClientAvatar name={d.name} photoUrl={d.photo_url}
                            style={{ width: 36, height: 36, borderRadius: '50%', background: nameGradient(d.name || '?'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: 'white', flexShrink: 0 }} />
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>{d.name}</div>
                            <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-disabled)' }}>{d.client_id || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{d.mobile || '—'}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontSize: 16, fontWeight: 800, background: 'linear-gradient(135deg,#ef4444,#dc2626)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.02em' }}>{fmt(amt)}</span>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-muted)' }}>{fmtDate(d.pt_end_date)}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 20, padding: '3px 10px', background: risk.bg, color: risk.color, border: `1px solid ${risk.color}25` }}>{risk.label}</span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          fontSize: 11, fontWeight: 600, borderRadius: 20, padding: '3px 10px',
                          background: d.status === 'active' ? '#ecfdf5' : '#fef2f2',
                          color: d.status === 'active' ? '#10b981' : '#dc2626',
                          border: `1px solid ${d.status === 'active' ? '#6ee7b7' : '#fecaca'}`,
                        }}>{d.status || 'lapsed'}</span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {d.mobile && (
                            <a href={whatsappHref(d.mobile, d.name, user?.organization_name || 'MY PT STUDIO')} target="_blank" rel="noopener noreferrer"
                              style={{ width: 30, height: 30, borderRadius: 10, border: '1.5px solid #a7f3d0', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', textDecoration: 'none' }}
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
    </PageContainer>
    </PullToRefresh>
  );
}
