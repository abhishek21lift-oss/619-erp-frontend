'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Wallet, TrendingUp, AlertCircle, CheckCircle, Search, Download, IndianRupee, Users, Clock } from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
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

const STATUS_CFG: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  OVERDUE: { label: 'Overdue',  bg: 'rgba(220,38,38,0.10)',  color: '#dc2626', dot: '#dc2626' },
  DUE:     { label: 'Due',      bg: 'rgba(245,158,11,0.10)', color: '#f59e0b', dot: '#f59e0b' },
  CLEAR:   { label: 'Clear',    bg: 'rgba(16,185,129,0.10)', color: '#10b981', dot: '#10b981' },
};

function DueBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.DUE;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '3px 10px', borderRadius: 20, background: cfg.bg, color: cfg.color }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.dot, display: 'inline-block' }} />
      {cfg.label}
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
  const [filter, setFilter] = useState<'ALL' | 'OVERDUE' | 'DUE' | 'CLEAR'>('ALL');
  const items = bs.data?.data ?? [];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter(i => {
      const matchQ = !q || i.name.toLowerCase().includes(q) || (i.mobile || '').includes(q) || (i.trainer_name || '').toLowerCase().includes(q);
      const matchF = filter === 'ALL' || i.due_status === filter;
      return matchQ && matchF;
    });
  }, [items, search, filter]);

  const totalOutstanding = items.reduce((s, i) => s + Number(i.balance_amount), 0);
  const totalCollected = items.reduce((s, i) => s + Number(i.paid_amount), 0);
  const totalRevenue = items.reduce((s, i) => s + Number(i.final_amount), 0);
  const collectionRate = totalRevenue > 0 ? Math.round((totalCollected / totalRevenue) * 100) : 0;
  const overdueCount = items.filter(i => i.due_status === 'OVERDUE').length;
  const clearCount = items.filter(i => i.due_status === 'CLEAR').length;

  const KPIS = [
    { label: 'Total Outstanding', value: fmtINR(totalOutstanding), icon: AlertCircle, color: '#dc2626', bg: 'linear-gradient(135deg, rgba(220,38,38,0.12), rgba(220,38,38,0.04))', border: 'rgba(220,38,38,0.15)' },
    { label: 'Collected', value: fmtINR(totalCollected), icon: CheckCircle, color: '#10b981', bg: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.04))', border: 'rgba(16,185,129,0.15)' },
    { label: 'Total Revenue', value: fmtINR(totalRevenue), icon: IndianRupee, color: '#6366f1', bg: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(99,102,241,0.04))', border: 'rgba(99,102,241,0.15)' },
    { label: 'Collection Rate', value: `${collectionRate}%`, icon: TrendingUp, color: '#f59e0b', bg: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.04))', border: 'rgba(245,158,11,0.15)' },
    { label: 'PT Clients', value: String(items.length), icon: Users, color: '#8b5cf6', bg: 'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(139,92,246,0.04))', border: 'rgba(139,92,246,0.15)' },
    { label: 'Overdue', value: String(overdueCount), icon: Clock, color: '#ef4444', bg: 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(239,68,68,0.04))', border: 'rgba(239,68,68,0.15)' },
  ];

  return (
    <Guard role="admin">
      <AppShell>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 20px' }}>

          {/* ── Hero ── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            style={{ position: 'relative', overflow: 'hidden', borderRadius: 24, padding: '40px 44px', marginBottom: 28,
              background: 'linear-gradient(135deg, #0a0f1a 0%, #0c1a2e 30%, #14213d 60%, #0a1628 100%)',
              boxShadow: '0 20px 60px rgba(10,15,26,0.5)', border: '1px solid rgba(99,102,241,0.12)' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(600px circle at 30% 50%, rgba(99,102,241,0.10), transparent 70%)' }} />
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(99,102,241,0.06) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
            <div style={{ position: 'relative', zIndex: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(79,70,229,0.1))', backdropFilter: 'blur(8px)' }}>
                  <Wallet size={22} color="#6366f1" />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Finance · PT OS</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
                <div>
                  <h1 style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, color: '#ffffff', margin: '0 0 8px' }}>Balance Sheet</h1>
                  <p style={{ maxWidth: 500, fontSize: 14, lineHeight: 1.6, color: 'rgba(255,255,255,0.50)' }}>
                    Track outstanding dues, collection rates, and payment status across all PT clients.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                  {clearCount > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)' }}>
                      <CheckCircle size={12} color="#10b981" />
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#10b981' }}>{clearCount} cleared</span>
                    </div>
                  )}
                  {overdueCount > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.2)' }}>
                      <AlertCircle size={12} color="#dc2626" />
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#dc2626' }}>{overdueCount} overdue</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* ── KPI Cards ── */}
          <motion.div variants={containerVariants} initial="hidden" animate="visible"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
            {KPIS.map(k => {
              const Icon = k.icon;
              return (
                <motion.div key={k.label} variants={itemVariants}
                  style={{ position: 'relative', overflow: 'hidden', borderRadius: 20, padding: '20px 22px', background: k.bg, border: `1px solid ${k.border}`, boxShadow: '0 4px 20px rgba(0,0,0,0.06)', cursor: 'default', transition: 'all 0.3s ease' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 32px rgba(0,0,0,0.12)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.06)'; }}>
                  <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: `radial-gradient(circle, ${k.color}15, transparent)` }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${k.color}18` }}>
                      <Icon size={16} style={{ color: k.color }} />
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>{k.label}</span>
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                    {bs.loading ? '—' : k.value}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

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
              {(['ALL', 'OVERDUE', 'DUE', 'CLEAR'] as const).map(f => {
                const active = filter === f;
                const cfg = f === 'ALL' ? { color: '#6366f1', bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.25)' } : f === 'OVERDUE' ? { color: '#dc2626', bg: 'rgba(220,38,38,0.1)', border: 'rgba(220,38,38,0.25)' } : f === 'DUE' ? { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)' } : { color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.25)' };
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
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            style={{ borderRadius: 20, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 2px 20px rgba(0,0,0,0.05)', background: 'var(--bg-card)' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
                    {['Client', 'Trainer', 'Package', 'Final', 'Paid', 'Balance', 'Status', 'Days'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-disabled)', textAlign: h === 'Final' || h === 'Paid' || h === 'Balance' ? 'right' : 'left', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item, i) => (
                    <motion.tr key={item.id}
                      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.015 }}
                      style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td style={{ padding: '13px 16px' }}>
                        <div style={{ fontWeight: 650, fontSize: 13, color: 'var(--text-primary)' }}>{item.name}</div>
                        {item.unique_id && <div style={{ fontSize: 10, color: '#6366f1', fontWeight: 700, letterSpacing: '0.05em' }}>{item.unique_id}</div>}
                        <div style={{ fontSize: 11, color: 'var(--text-disabled)', marginTop: 1 }}>{item.mobile || '—'}</div>
                      </td>
                      <td style={{ padding: '13px 16px' }}>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.trainer_name || '—'}</span>
                      </td>
                      <td style={{ padding: '13px 16px' }}>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 120, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.package_type || '—'}</span>
                      </td>
                      <td style={{ padding: '13px 16px', textAlign: 'right' }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{fmtINRFull(item.final_amount)}</span>
                      </td>
                      <td style={{ padding: '13px 16px', textAlign: 'right' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#10b981', fontVariantNumeric: 'tabular-nums' }}>{fmtINRFull(item.paid_amount)}</span>
                      </td>
                      <td style={{ padding: '13px 16px', textAlign: 'right' }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: Number(item.balance_amount) > 0 ? '#dc2626' : '#10b981', fontVariantNumeric: 'tabular-nums' }}>{fmtINRFull(item.balance_amount)}</span>
                      </td>
                      <td style={{ padding: '13px 16px' }}>
                        <DueBadge status={item.due_status} />
                      </td>
                      <td style={{ padding: '13px 16px' }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: item.days_left !== null && item.days_left <= 0 ? '#dc2626' : 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                          {item.days_left !== null ? (item.days_left <= 0 ? `${Math.abs(item.days_left)}d overdue` : `${item.days_left}d`) : '—'}
                        </span>
                      </td>
                    </motion.tr>
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
                <div style={{ width: 24, height: 24, border: '2.5px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            )}

            {filtered.length > 0 && (
              <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-elevated)' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Showing <strong>{filtered.length}</strong> of <strong>{items.length}</strong> clients
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>
                  Filtered outstanding: <span style={{ color: '#dc2626' }}>{fmtINRFull(filtered.reduce((s, i) => s + Number(i.balance_amount), 0))}</span>
                </span>
              </div>
            )}
          </motion.div>
        </div>
      </AppShell>
    </Guard>
  );
}
