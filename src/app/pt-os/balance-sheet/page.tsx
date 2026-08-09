'use client';

import { useState, useMemo } from 'react';
import { m } from 'framer-motion';
import { Wallet, TrendingUp, AlertCircle, CheckCircle, Search, Download, Users, Clock } from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { PageContainer, PageHero, PullToRefresh } from '@/components/ui';
import { useAsync } from '@/lib/use-async';
import { api, PtClientBase } from '@/lib/api';

type BalanceItem = PtClientBase & {
  due_status: string;
  monthly_pt_amount: number;
  trainer_commission: number;
};

function fmtINR(n: number | string | null | undefined) {
  const v = Number(n ?? 0);
  if (v >= 100000) return '₹' + (v / 100000).toFixed(1) + 'L';
  if (v >= 1000) return '₹' + (v / 1000).toFixed(1) + 'K';
  return '₹' + v.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function fmtINRFull(n: number | string | null | undefined) {
  return '₹' + Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function ActiveBadge({ status }: { status: string }) {
  const active = status === 'active';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.06em', padding: '3px 10px', borderRadius: 20,
      background: active ? 'rgba(16,185,129,0.10)' : 'rgba(148,163,184,0.14)',
      color: active ? '#10b981' : '#64748b',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: active ? '#10b981' : '#94a3b8', display: 'inline-block' }} />
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const itemVariants = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] } } };

function exportCSV(rows: BalanceItem[]) {
  const headers = ['Name', 'Mobile', 'Trainer', 'Package', 'Final Amount', 'Paid Amount', 'Balance', 'Status', 'Days Left', 'PT End Date'];
  const escape = (v: unknown) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    headers.join(','),
    ...rows.map(r => [
      r.name, r.mobile ?? '', r.trainer_name ?? '', r.package_type ?? '',
      Number(r.final_amount), Number(r.paid_amount), Number(r.balance_amount),
      r.due_status, r.days_left ?? '', r.pt_end_date ?? '',
    ].map(escape).join(',')),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `balance-sheet-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function BalanceSheetPage() {
  const bs = useAsync<{ data: BalanceItem[]; total: number; total_outstanding: number }>(
    () => api.pt.balanceSheet().then((r) => r as { data: BalanceItem[]; total: number; total_outstanding: number }),
    [],
  );
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'OVERDUE' | 'DUE'>('ALL');
  const items = useMemo(() => bs.data?.data ?? [], [bs.data]);

  // Only clients who still owe something ever appear on this page — a
  // cleared client has nothing here to act on.
  const duesOnly = useMemo(() => items.filter(i => Number(i.balance_amount) > 0), [items]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return duesOnly.filter(i => {
      const matchQ = !q || i.name.toLowerCase().includes(q) || (i.mobile || '').includes(q) || (i.trainer_name || '').toLowerCase().includes(q);
      const matchF = filter === 'ALL' || i.due_status === filter;
      return matchQ && matchF;
    });
  }, [duesOnly, search, filter]);

  // Outstanding and collection rate are studio-wide figures — cleared
  // clients still paid in, and that is what collection rate measures —
  // so these stay over every client, not just the ones still owing.
  const totalOutstanding = items.reduce((s, i) => s + Number(i.balance_amount), 0);
  const totalCollected = items.reduce((s, i) => s + Number(i.paid_amount), 0);
  const totalRevenue = items.reduce((s, i) => s + Number(i.final_amount), 0);
  const collectionRate = totalRevenue > 0 ? Math.round((totalCollected / totalRevenue) * 100) : 0;
  const overdueCount = duesOnly.filter(i => i.due_status === 'OVERDUE').length;

  const KPIS = [
    { label: 'Total Outstanding', value: fmtINR(totalOutstanding), icon: AlertCircle, color: '#dc2626', bg: 'linear-gradient(135deg, rgba(220,38,38,0.12), rgba(220,38,38,0.04))', border: 'rgba(220,38,38,0.15)' },
    { label: 'Collection Rate', value: `${collectionRate}%`, icon: TrendingUp, color: '#f59e0b', bg: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.04))', border: 'rgba(245,158,11,0.15)' },
    { label: 'Clients With Dues', value: String(duesOnly.length), icon: Users, color: '#0067e0', bg: 'linear-gradient(135deg, rgba(0,103,224,0.12), rgba(0,103,224,0.04))', border: 'rgba(0,103,224,0.15)' },
    { label: 'Overdue', value: String(overdueCount), icon: Clock, color: '#ef4444', bg: 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(239,68,68,0.04))', border: 'rgba(239,68,68,0.15)' },
  ];

  return (
    <Guard role="admin">
      <AppShell>
        <PullToRefresh onRefresh={bs.refetch}>
        <PageContainer>

          {/* ── Hero ──
              maxWidth 1280 with 20px of its own padding INSIDE .shell-main's
              gutter, and then a further 40px on the header block — so the
              title sat 76px from the screen edge on a phone where the
              dashboard sits at 16. */}
          <PageHero
            icon={<Wallet size={20} />}
            title="Balance Sheet"
          >
            {overdueCount > 0 && (
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-[700]"
                  style={{ background: 'rgba(248,113,113,0.22)', border: '1px solid rgba(248,113,113,0.35)', color: '#FECACA' }}>
                  <AlertCircle size={13} /> {overdueCount} overdue
                </span>
              </div>
            )}
          </PageHero>

          {/* ── KPI Cards ── */}
          <m.div variants={containerVariants} initial="hidden" animate="visible"
            className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {KPIS.map(k => {
              const Icon = k.icon;
              return (
                <m.div key={k.label} variants={itemVariants}
                  style={{ position: 'relative', overflow: 'hidden', borderRadius: 20, padding: '20px 22px', background: k.bg, border: `1px solid ${k.border}`, boxShadow: '0 4px 20px rgba(0,0,0,0.06)', cursor: 'default', transition: 'all 0.3s ease' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 32px rgba(0,0,0,0.12)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.06)'; }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${k.color}18` }}>
                      <Icon size={16} style={{ color: k.color }} />
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>{k.label}</span>
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                    {bs.loading ? '—' : k.value}
                  </div>
                </m.div>
              );
            })}
          </m.div>

          {/* ── Search + Filter bar ── */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-disabled)', pointerEvents: 'none' }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search client, trainer, phone…"
                style={{ width: '100%', paddingLeft: 36, paddingRight: 14, paddingTop: 9, paddingBottom: 9, borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['ALL', 'OVERDUE', 'DUE'] as const).map(f => {
                const active = filter === f;
                const cfg = f === 'ALL' ? { color: '#0067e0', bg: 'rgba(0,103,224,0.1)', border: 'rgba(0,103,224,0.25)' } : f === 'OVERDUE' ? { color: '#dc2626', bg: 'rgba(220,38,38,0.1)', border: 'rgba(220,38,38,0.25)' } : { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)' };
                return (
                  <button key={f} onClick={() => setFilter(f)}
                    style={{ fontSize: 11, fontWeight: 700, padding: '7px 14px', borderRadius: 10, border: `1.5px solid ${active ? cfg.border : 'var(--border)'}`, background: active ? cfg.bg : 'transparent', color: active ? cfg.color : 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.2s' }}>
                    {f}
                  </button>
                );
              })}
            </div>
            <button style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, padding: '8px 14px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}
              onClick={() => exportCSV(filtered)}
              disabled={filtered.length === 0}>
              <Download size={13} /> Export CSV
            </button>
          </div>

          {/* ── Table ── */}
          <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            style={{ borderRadius: 20, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 2px 20px rgba(0,0,0,0.05)', background: 'var(--bg-card)' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
                    {['Client', 'Package', 'Balance', 'Status', 'Days'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-disabled)', textAlign: h === 'Balance' ? 'right' : 'left', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item, i) => (
                    <m.tr key={item.id}
                      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.015 }}
                      style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td style={{ padding: '13px 16px' }}>
                        <div style={{ fontWeight: 650, fontSize: 13, color: 'var(--text-primary)' }}>{item.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-disabled)', marginTop: 1 }}>{item.mobile || '—'}</div>
                      </td>
                      <td style={{ padding: '13px 16px' }}>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 120, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.package_type || '—'}</span>
                      </td>
                      <td style={{ padding: '13px 16px', textAlign: 'right' }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: Number(item.balance_amount) > 0 ? '#dc2626' : '#10b981', fontVariantNumeric: 'tabular-nums' }}>{fmtINRFull(item.balance_amount)}</span>
                      </td>
                      <td style={{ padding: '13px 16px' }}>
                        <ActiveBadge status={item.status} />
                      </td>
                      <td style={{ padding: '13px 16px' }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: item.days_left !== null && item.days_left <= 0 ? '#dc2626' : 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                          {item.days_left !== null ? (item.days_left <= 0 ? `${Math.abs(item.days_left)}d overdue` : `${item.days_left}d`) : '—'}
                        </span>
                      </td>
                    </m.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filtered.length === 0 && !bs.loading && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 20px' }}>
                <CheckCircle size={36} style={{ color: '#10b981', marginBottom: 14 }} />
                <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-muted)', margin: 0 }}>
                  {search || filter !== 'ALL' ? 'No matching clients' : 'No outstanding balances — all clear!'}
                </p>
              </div>
            )}

            {bs.loading && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 20px' }}>
                <div style={{ width: 24, height: 24, border: '2.5px solid #0067e0', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            )}

            {filtered.length > 0 && (
              <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-elevated)' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Showing <strong>{filtered.length}</strong> of <strong>{duesOnly.length}</strong> clients
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>
                  Filtered outstanding: <span style={{ color: '#dc2626' }}>{fmtINRFull(filtered.reduce((s, i) => s + Number(i.balance_amount), 0))}</span>
                </span>
              </div>
            )}
          </m.div>
        </PageContainer>
        </PullToRefresh>
      </AppShell>
    </Guard>
  );
}
