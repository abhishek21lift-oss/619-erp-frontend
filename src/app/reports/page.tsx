'use client';
import { useEffect, useMemo, useState, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Guard from '@/components/Guard';
import { api } from '@/lib/api';
import AppShell from '@/components/AppShell';
import { useAuth } from '@/lib/auth-context';
import {
  BarChart2, AlertCircle, Users, CalendarCheck,
  ChevronLeft, ChevronRight, Download, TrendingUp,
  Search, DollarSign, Clock, UserCheck,
} from 'lucide-react';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
type Tab = 'monthly' | 'dues' | 'trainers' | 'staff';

function fmtDate(d?: string) {
  if (!d) return '—';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtAmt(n: any) {
  return '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function isoToday() { return new Date().toISOString().split('T')[0]; }
function iso30dAgo() {
  const d = new Date(); d.setDate(d.getDate() - 29);
  return d.toISOString().split('T')[0];
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
};
const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] } }
};

const tableHeadStyle: React.CSSProperties = { padding: '10px 14px', textAlign: 'left', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.35)' };
const tableCellStyle: React.CSSProperties = { padding: '10px 14px', fontSize: 12 };
const tableRowBorder = { borderBottom: '1px solid rgba(255,255,255,0.04)' };

function KpiCard({ label, value, icon, gradient, sub }: {
  label: string; value: string; icon?: React.ReactNode; gradient: string; sub?: string
}) {
  return (
    <motion.div variants={itemVariants}
      style={{ position: 'relative', overflow: 'hidden', borderRadius: 16, padding: '22px 20px', background: gradient, border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.15)', cursor: 'default', transition: 'transform 0.3s ease, box-shadow 0.3s ease' }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 16px 48px rgba(37,99,235,0.2)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.15)'; }}>
      <div style={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.08), transparent)', pointerEvents: 'none' }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, position: 'relative', zIndex: 1 }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', color: 'rgba(255,255,255,0.55)' }}>{label}</span>
        {icon && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 12, background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }}>
            {icon}
          </div>
        )}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', position: 'relative', zIndex: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2, position: 'relative', zIndex: 1 }}>{sub}</div>}
    </motion.div>
  );
}

function RevenueBarChart({ data, maxVal }: { data: { month: string; revenue: number; count: number }[]; maxVal: number }) {
  const [hovered, setHovered] = useState<number | null>(null);
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 160, padding: '0 4px' }}>
        {(data ?? []).map((m, i) => {
          const pct = maxVal > 0 ? Math.max((m.revenue / maxVal) * 100, m.revenue > 0 ? 4 : 0) : 0;
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}
              onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
              {hovered === i && m.revenue > 0 && (
                <div style={{ fontSize: 10, color: '#fff', fontWeight: 700, background: 'rgba(37,99,235,0.9)', borderRadius: 6, padding: '3px 7px', marginBottom: 3, whiteSpace: 'nowrap', backdropFilter: 'blur(4px)' }}>
                  {m.revenue >= 1000 ? `₹${(m.revenue/1000).toFixed(1)}K` : fmtAmt(m.revenue)}
                </div>
              )}
              {hovered !== i && (
                <div style={{ marginTop: 'auto', fontSize: 9, color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>
                  {m.revenue > 0 ? (m.revenue >= 1000 ? `₹${(m.revenue/1000).toFixed(0)}K` : '') : ''}
                </div>
              )}
              <div style={{ width: '100%', height: `${pct}%`, background: m.revenue > 0 ? 'linear-gradient(180deg, #6366f1 0%, #2563eb 50%, rgba(37,99,235,0.3) 100%)' : 'rgba(255,255,255,0.04)', borderRadius: '4px 4px 0 0', minHeight: m.revenue > 0 ? 6 : 2, transition: 'opacity 150ms, height 0.4s', opacity: hovered !== null && hovered !== i ? 0.5 : 1, boxShadow: m.revenue > 0 ? '0 2px 8px rgba(99,102,241,0.3)' : 'none' }} />
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 8, padding: '0 4px' }}>
        {(data ?? []).map((m, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>{m.month}</div>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status, label }: { status: string; label?: string }) {
  const v = (label || status || '').toLowerCase();
  const config: Record<string, { bg: string; color: string }> = {
    active: { bg: 'linear-gradient(135deg, rgba(16,185,129,0.25), rgba(16,185,129,0.1))', color: '#34d399' },
    present: { bg: 'linear-gradient(135deg, rgba(16,185,129,0.25), rgba(16,185,129,0.1))', color: '#34d399' },
    absent: { bg: 'linear-gradient(135deg, rgba(239,68,68,0.25), rgba(239,68,68,0.1))', color: '#f87171' },
    late: { bg: 'linear-gradient(135deg, rgba(245,158,11,0.25), rgba(245,158,11,0.1))', color: '#fbbf24' },
    expired: { bg: 'linear-gradient(135deg, rgba(107,114,128,0.25), rgba(107,114,128,0.1))', color: '#9ca3af' },
  };
  const c = config[v] || { bg: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, background: c.bg, color: c.color, border: `1px solid ${c.color}20` }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.color, display: 'inline-block' }} />
      {label || status}
    </span>
  );
}

function glassBox(extra: React.CSSProperties = {}): React.CSSProperties {
  return { background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.12)', overflow: 'hidden', ...extra };
}

function MonthlyTab({ year, setYear }: { year: number; setYear: (y: number) => void }) {
  const [monthly, setMonthly] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchMonthly = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await api.reports.monthly(typeof year === 'number' ? year : parseInt(String(year)));
      setMonthly(Array.isArray(data) ? data : []);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }, [year]);

  useEffect(() => { fetchMonthly(); }, [fetchMonthly]);

  const fullYear = MONTHS.map((name, i) => {
    const found = monthly.find((m) => parseInt(m.month_num) === i + 1);
    return { month: name, revenue: found ? Number(found.revenue) : 0, count: found ? Number(found.payment_count) : 0 };
  });

  const totalRevenue = fullYear.reduce((s, m) => s + m.revenue, 0);
  const avgMonthly = totalRevenue / Math.max(monthly.length, 1);
  const maxRevenue = Math.max(...fullYear.map((m) => m.revenue), 1);
  const bestMonth = fullYear.reduce((best, m) => m.revenue > best.revenue ? m : best, fullYear[0]);
  const thisMonth = fullYear[new Date().getMonth()];

  function exportMonthly() {
    const csv = ['Month,Payments,Revenue', ...fullYear.map((m) => `${m.month} ${year},${m.count},${m.revenue}`)].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `619_revenue_${year}.csv`;
    a.click();
  }

  if (error) return <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#ef4444', marginBottom: 20 }}>{error} <button onClick={fetchMonthly} style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(239,68,68,0.1))', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', borderRadius: 8, padding: '5px 12px', fontSize: 12, cursor: 'pointer', marginLeft: 8, fontWeight: 600 }}>Retry</button></div>;

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <motion.div variants={itemVariants} style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setYear(year - 1)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.14)'; e.currentTarget.style.transform = 'scale(1.05)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'scale(1)'; }}>
            <ChevronLeft size={16} />
          </button>
          <motion.span key={year} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} style={{ fontSize: 18, fontWeight: 700, color: '#fff', minWidth: 80, textAlign: 'center', background: 'linear-gradient(135deg, #6366f1, #2563eb)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{year}</motion.span>
          <button onClick={() => setYear(year + 1)} disabled={year >= new Date().getFullYear()}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: year >= new Date().getFullYear() ? 'rgba(255,255,255,0.2)' : '#fff', cursor: year >= new Date().getFullYear() ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={(e) => { if (year < new Date().getFullYear()) { e.currentTarget.style.background = 'rgba(255,255,255,0.14)'; e.currentTarget.style.transform = 'scale(1.05)'; }}}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'scale(1)'; }}>
            <ChevronRight size={16} />
          </button>
        </div>
        <button onClick={exportMonthly}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, background: 'linear-gradient(135deg, rgba(37,99,235,0.25), rgba(99,102,241,0.15))', border: '1px solid rgba(99,102,241,0.25)', color: '#a5b4fc', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(37,99,235,0.35), rgba(99,102,241,0.25))'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(37,99,235,0.25), rgba(99,102,241,0.15))'; e.currentTarget.style.transform = 'translateY(0)'; }}>
          <Download size={14} /> Export CSV
        </button>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
        <KpiCard label={`Total ${year}`} value={fmtAmt(totalRevenue)} icon={<DollarSign size={16} />} gradient="linear-gradient(135deg, rgba(37,99,235,0.25), rgba(30,27,75,0.7))" />
        <KpiCard label="Avg / Month" value={fmtAmt(avgMonthly)} icon={<TrendingUp size={16} />} gradient="linear-gradient(135deg, rgba(6,182,212,0.2), rgba(30,27,75,0.7))" />
        <KpiCard label="Best Month" value={bestMonth?.month ?? '—'} icon={<BarChart2 size={16} />} gradient="linear-gradient(135deg, rgba(16,185,129,0.2), rgba(30,27,75,0.7))" sub={bestMonth ? fmtAmt(bestMonth.revenue) : ''} />
        <KpiCard label={MONTHS[new Date().getMonth()]} value={fmtAmt(thisMonth?.revenue ?? 0)} icon={<Clock size={16} />} gradient="linear-gradient(135deg, rgba(245,158,11,0.2), rgba(30,27,75,0.7))" sub={`${thisMonth?.count ?? 0} payments`} />
      </div>

      <motion.div variants={itemVariants} style={glassBox({ padding: '20px 20px 16px' })}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <div style={{ width: 3, height: 18, borderRadius: 2, background: 'linear-gradient(180deg, #6366f1, #2563eb)' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>Monthly Revenue — {year}</span>
        </div>
        {loading ? <div style={{ height: 160, background: 'rgba(255,255,255,0.03)', borderRadius: 10 }} /> : <RevenueBarChart data={fullYear} maxVal={maxRevenue} />}
      </motion.div>

      <motion.div variants={itemVariants} style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.2), rgba(124,58,237,0.15))' }}>
                <th style={{ ...tableHeadStyle, color: '#a5b4fc' }}>Month</th>
                <th style={{ ...tableHeadStyle, color: '#a5b4fc' }}>Payments</th>
                <th style={{ ...tableHeadStyle, color: '#a5b4fc' }}>Revenue</th>
                <th style={{ ...tableHeadStyle, color: '#a5b4fc', width: '30%' }}>Progress</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}><td colSpan={4} style={{ padding: '12px 16px' }}><div style={{ height: 14, background: 'rgba(255,255,255,0.04)', borderRadius: 6 }} /></td></tr>
                ))
              ) : (
                fullYear.map((m, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', opacity: m.revenue === 0 ? 0.4 : 1, transition: 'background 0.2s', background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99,102,241,0.08)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent'; }}>
                    <td style={{ ...tableCellStyle, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{m.month} {year}</td>
                    <td style={{ ...tableCellStyle, color: 'rgba(255,255,255,0.45)' }}>{m.count || '—'}</td>
                    <td style={{ ...tableCellStyle, fontWeight: 700, color: m.revenue > 0 ? '#34d399' : 'rgba(255,255,255,0.35)' }}>{m.revenue > 0 ? fmtAmt(m.revenue) : '—'}</td>
                    <td style={tableCellStyle}>
                      {m.revenue > 0 && (
                        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                          <div style={{ width: `${(m.revenue / maxRevenue) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #6366f1, #2563eb)', borderRadius: 4, transition: 'width 400ms' }} />
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr style={{ fontWeight: 700, background: 'rgba(37,99,235,0.08)', borderTop: '1px solid rgba(99,102,241,0.2)' }}>
                <td style={tableCellStyle}>Total</td>
                <td style={tableCellStyle}>{fullYear.reduce((s, m) => s + m.count, 0)}</td>
                <td style={{ ...tableCellStyle, color: '#a5b4fc', fontSize: 13 }}>{fmtAmt(totalRevenue)}</td>
                <td style={tableCellStyle} />
              </tr>
            </tfoot>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}

function DuesTab() {
  const [dues, setDues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const fetchDues = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await api.reports.dues();
      setDues(Array.isArray(data) ? data : []);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchDues(); }, [fetchDues]);

  const filtered = search.trim()
    ? dues.filter((d) => d.name?.toLowerCase().includes(search.toLowerCase()) || (d.mobile ?? '').includes(search))
    : dues;

  const totalDues = filtered.reduce((s, d) => s + Number(d.balance_amount || d.balance_due || 0), 0);

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <motion.div variants={itemVariants} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '6px 14px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <Search size={14} color="rgba(255,255,255,0.3)" />
          <input type="search" placeholder="Search member or phone…" value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 13, fontWeight: 500, outline: 'none', width: 220, padding: '4px 0' }} />
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 10, background: 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(239,68,68,0.08))', border: '1px solid rgba(239,68,68,0.2)' }}>
          <AlertCircle size={14} color="#f87171" />
          <span style={{ fontWeight: 700, fontSize: 15, color: '#f87171' }}>Total outstanding: {fmtAmt(totalDues)}</span>
        </div>
      </motion.div>
      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#ef4444' }}>{error} <button onClick={fetchDues} style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(239,68,68,0.1))', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', borderRadius: 8, padding: '5px 12px', fontSize: 12, cursor: 'pointer', marginLeft: 8, fontWeight: 600 }}>Retry</button></div>}
      <motion.div variants={itemVariants} style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.2), rgba(124,58,237,0.15))' }}>
                {['Member', 'Phone', 'Trainer', 'Balance Due', 'Expiry', 'Status'].map((h) => (
                  <th key={h} style={{ ...tableHeadStyle, color: '#a5b4fc' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={6} style={{ padding: '12px 16px' }}><div style={{ height: 14, background: 'rgba(255,255,255,0.04)', borderRadius: 6 }} /></td></tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(16,185,129,0.08))', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(16,185,129,0.2)' }}>
                      <AlertCircle size={24} color="#34d399" />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: '#34d399' }}>All Clear!</div>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', maxWidth: 300 }}>No pending dues — every member has settled their balances.</div>
                  </div>
                </td></tr>
              ) : (
                filtered.map((d, i) => {
                  const due = Number(d.balance_amount || d.balance_due || 0);
                  return (
                    <tr key={d.id || i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.2s', background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99,102,241,0.08)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent'; }}>
                      <td style={{ ...tableCellStyle, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{d.name}</td>
                      <td style={{ ...tableCellStyle, color: 'rgba(255,255,255,0.45)' }}>{d.mobile || d.phone || '—'}</td>
                      <td style={{ ...tableCellStyle, color: 'rgba(255,255,255,0.45)' }}>{d.trainer_name || '—'}</td>
                      <td style={{ ...tableCellStyle, fontWeight: 700, color: '#f87171' }}>{fmtAmt(due)}</td>
                      <td style={{ ...tableCellStyle, color: 'rgba(255,255,255,0.45)' }}>{fmtDate(d.pt_end_date || d.expiry_date)}</td>
                      <td style={tableCellStyle}><StatusBadge status={d.status} /></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}

function TrainerSummaryTab() {
  const [trainers, setTrainers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetch_ = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await api.reports.trainerSummary();
      setTrainers(Array.isArray(data) ? data : []);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  const totals = trainers.reduce((s, t) => ({
    active: s.active + Number(t.active_clients || 0),
    total: s.total + Number(t.total_clients || 0),
    monthRev: s.monthRev + Number(t.month_revenue || 0),
    totalRev: s.totalRev + Number(t.total_revenue || 0),
  }), { active: 0, total: 0, monthRev: 0, totalRev: 0 });

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible">
      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#ef4444', marginBottom: 12 }}>{error} <button onClick={fetch_} style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(239,68,68,0.1))', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', borderRadius: 8, padding: '5px 12px', fontSize: 12, cursor: 'pointer', marginLeft: 8, fontWeight: 600 }}>Retry</button></div>}
      <motion.div variants={itemVariants} style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.2), rgba(124,58,237,0.15))' }}>
                {['Trainer', 'Active Members', 'Total Members', 'This Month', 'All-time Revenue'].map((h) => (
                  <th key={h} style={{ ...tableHeadStyle, color: '#a5b4fc' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}><td colSpan={5} style={{ padding: '12px 16px' }}><div style={{ height: 14, background: 'rgba(255,255,255,0.04)', borderRadius: 6 }} /></td></tr>
                ))
              ) : trainers.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(99,102,241,0.08))', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(99,102,241,0.2)' }}>
                      <Users size={24} color="#a5b4fc" />
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 16, color: 'rgba(255,255,255,0.6)' }}>No trainer data yet</div>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', maxWidth: 300 }}>Trainer summaries will appear here once members are assigned.</div>
                  </div>
                </td></tr>
              ) : (
                (trainers ?? []).map((t, i) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.2s', background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99,102,241,0.08)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent'; }}>
                    <td style={{ ...tableCellStyle, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{t.name}</td>
                    <td style={{ ...tableCellStyle, color: '#34d399', fontWeight: 600 }}>{t.active_clients}</td>
                    <td style={{ ...tableCellStyle, color: 'rgba(255,255,255,0.45)' }}>{t.total_clients}</td>
                    <td style={{ ...tableCellStyle, fontWeight: 700, color: '#60a5fa' }}>{fmtAmt(t.month_revenue)}</td>
                    <td style={{ ...tableCellStyle, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>{fmtAmt(t.total_revenue)}</td>
                  </tr>
                ))
              )}
            </tbody>
            {!loading && trainers.length > 0 && (
              <tfoot>
                <tr style={{ fontWeight: 700, background: 'rgba(37,99,235,0.08)', borderTop: '1px solid rgba(99,102,241,0.2)' }}>
                  <td style={tableCellStyle}>Total</td>
                  <td style={{ ...tableCellStyle, color: '#34d399' }}>{totals.active}</td>
                  <td style={tableCellStyle}>{totals.total}</td>
                  <td style={{ ...tableCellStyle, color: '#60a5fa' }}>{fmtAmt(totals.monthRev)}</td>
                  <td style={tableCellStyle}>{fmtAmt(totals.totalRev)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}

function StaffTab() {
  const [from, setFrom] = useState(iso30dAgo());
  const [to, setTo] = useState(isoToday());
  const [records, setRecords] = useState<any[]>([]);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStaff = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [rRes, tRes] = await Promise.allSettled([
        api.attendance.list({ from, to, type: 'trainer' }),
        api.trainers.list(),
      ]);
      if (rRes.status === 'fulfilled') setRecords(Array.isArray(rRes.value) ? rRes.value : []);
      if (tRes.status === 'fulfilled') setTrainers(Array.isArray(tRes.value) ? tRes.value : []);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }, [from, to]);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  const summary = useMemo(() => ({
    present: records.filter((r) => r.status === 'present').length,
    absent: records.filter((r) => r.status === 'absent').length,
    late: records.filter((r) => r.status === 'late').length,
    total: records.length,
  }), [records]);

  const perStaff = useMemo(() => {
    const map = new Map<string, { id: string; name: string; present: number; absent: number; late: number }>();
    trainers.forEach((t) => map.set(String(t.id), { id: String(t.id), name: t.name, present: 0, absent: 0, late: 0 }));
    records.forEach((r) => {
      const id = String(r.ref_id || r.trainer_id || '');
      const name = r.ref_name || r.trainer_name || '';
      const row = map.get(id) ?? (id ? { id, name, present: 0, absent: 0, late: 0 } : null);
      if (!row) return;
      if (r.status === 'present') row.present++;
      else if (r.status === 'absent') row.absent++;
      else if (r.status === 'late') row.late++;
      map.set(id, row);
    });
    return Array.from(map.values()).sort((a, b) => (b.present + b.late) - (a.present + a.late));
  }, [records, trainers]);

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <motion.div variants={itemVariants} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '6px 14px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>From</span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, outline: 'none', padding: '4px 0', width: 130 }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '6px 14px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>To</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, outline: 'none', padding: '4px 0', width: 130 }} />
        </div>
        <Link href="/attendance/staff"
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, background: 'linear-gradient(135deg, rgba(37,99,235,0.2), rgba(99,102,241,0.12))', border: '1px solid rgba(99,102,241,0.2)', color: '#a5b4fc', fontSize: 12, fontWeight: 600, textDecoration: 'none', marginLeft: 'auto', transition: 'all 0.2s' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(37,99,235,0.3), rgba(99,102,241,0.2))'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(37,99,235,0.2), rgba(99,102,241,0.12))'; e.currentTarget.style.transform = 'translateY(0)'; }}>
          <CalendarCheck size={13} /> Mark Staff Attendance
        </Link>
      </motion.div>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#ef4444' }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
        <KpiCard label="Present" value={String(summary.present)} icon={<UserCheck size={16} />} gradient="linear-gradient(135deg, rgba(16,185,129,0.25), rgba(30,27,75,0.7))" />
        <KpiCard label="Late" value={String(summary.late)} icon={<Clock size={16} />} gradient="linear-gradient(135deg, rgba(245,158,11,0.2), rgba(30,27,75,0.7))" />
        <KpiCard label="Absent" value={String(summary.absent)} icon={<AlertCircle size={16} />} gradient="linear-gradient(135deg, rgba(239,68,68,0.2), rgba(30,27,75,0.7))" />
        <KpiCard label="Total Marked" value={String(summary.total)} icon={<BarChart2 size={16} />} gradient="linear-gradient(135deg, rgba(6,182,212,0.2), rgba(30,27,75,0.7))" />
      </div>

      <motion.div variants={itemVariants} style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontWeight: 600, fontSize: 14, color: 'rgba(255,255,255,0.85)', background: 'rgba(255,255,255,0.03)' }}>
          <div style={{ width: 3, height: 16, borderRadius: 2, background: 'linear-gradient(180deg, #6366f1, #2563eb)', display: 'inline-block', marginRight: 10, verticalAlign: 'middle' }} />
          Per-Trainer Attendance
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.2), rgba(124,58,237,0.15))' }}>
                {['Trainer', 'Present', 'Late', 'Absent', 'Attendance %', 'Workload'].map((h) => (
                  <th key={h} style={{ ...tableHeadStyle, color: '#a5b4fc' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}><td colSpan={6} style={{ padding: '12px 16px' }}><div style={{ height: 14, background: 'rgba(255,255,255,0.04)', borderRadius: 6 }} /></td></tr>
                ))
              ) : perStaff.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(99,102,241,0.08))', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(99,102,241,0.2)' }}>
                      <CalendarCheck size={24} color="#a5b4fc" />
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 16, color: 'rgba(255,255,255,0.6)' }}>No attendance data</div>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', maxWidth: 300 }}>Start marking staff attendance to see reports here.</div>
                  </div>
                </td></tr>
              ) : (
                perStaff.map((s, i) => {
                  const total = s.present + s.late + s.absent;
                  const pct = total > 0 ? Math.round(((s.present + s.late) / total) * 100) : 0;
                  const pctColor = pct >= 90 ? '#34d399' : pct >= 70 ? '#fbbf24' : '#f87171';
                  return (
                    <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.2s', background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99,102,241,0.08)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent'; }}>
                      <td style={{ ...tableCellStyle, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{s.name}</td>
                      <td style={{ ...tableCellStyle, color: '#34d399', fontWeight: 600 }}>{s.present}</td>
                      <td style={{ ...tableCellStyle, color: '#fbbf24' }}>{s.late}</td>
                      <td style={{ ...tableCellStyle, color: s.absent > 0 ? '#f87171' : 'rgba(255,255,255,0.45)', fontWeight: s.absent > 0 ? 600 : 400 }}>{s.absent}</td>
                      <td style={{ ...tableCellStyle, fontWeight: 700, color: pctColor }}>{total > 0 ? `${pct}%` : '—'}</td>
                      <td style={tableCellStyle}>
                        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: pctColor, borderRadius: 4, transition: 'width 0.4s' }} />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontWeight: 600, fontSize: 14, color: 'rgba(255,255,255,0.85)', background: 'rgba(255,255,255,0.03)' }}>
          <div style={{ width: 3, height: 16, borderRadius: 2, background: 'linear-gradient(180deg, #6366f1, #2563eb)', display: 'inline-block', marginRight: 10, verticalAlign: 'middle' }} />
          Recent Staff Check-ins
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.2), rgba(124,58,237,0.15))' }}>
                {['Date', 'Staff', 'Status', 'Check-in', 'Notes'].map((h) => (
                  <th key={h} style={{ ...tableHeadStyle, color: '#a5b4fc' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...records]
                .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
                .slice(0, 30)
                .map((r, i) => (
                  <tr key={r.id || i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.2s', background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99,102,241,0.08)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent'; }}>
                    <td style={{ ...tableCellStyle, color: 'rgba(255,255,255,0.45)' }}>{fmtDate(r.date)}</td>
                    <td style={{ ...tableCellStyle, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{r.ref_name || r.trainer_name || '—'}</td>
                    <td style={tableCellStyle}><StatusBadge status={r.status} /></td>
                    <td style={{ ...tableCellStyle, color: 'rgba(255,255,255,0.45)' }}>{r.check_in ?? r.check_in_time ?? '—'}</td>
                    <td style={{ ...tableCellStyle, color: 'rgba(255,255,255,0.45)' }}>{r.notes ?? '—'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ReportsContent() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'manager';
  const sp = useSearchParams();
  const [year, setYear] = useState(new Date().getFullYear());

  const initialTab = useMemo<Tab>(() => {
    const v = (sp.get('view') ?? '').toLowerCase();
    if (v === 'dues') return 'dues';
    if (v === 'trainers' || v === 'coaches') return 'trainers';
    if (v === 'staff') return 'staff';
    return 'monthly';
  }, [sp]);

  const [tab, setTab] = useState<Tab>(initialTab);
  useEffect(() => setTab(initialTab), [initialTab]);

  const TABS: { key: Tab; label: string; adminOnly?: boolean }[] = [
    { key: 'monthly', label: 'Monthly Revenue' },
    { key: 'dues', label: 'Pending Dues' },
    { key: 'trainers', label: 'Coach Summary', adminOnly: true },
    { key: 'staff', label: 'Staff Attendance', adminOnly: true },
  ];

  return (
    <AppShell title="Reports">
      <div style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, #0f0a1e 0%, #1a1050 35%, #0f172a 65%, #0f0a1e 100%)', padding: '52px 32px 28px', borderRadius: '0 0 36px 36px', marginBottom: 24 }}>
        <div style={{ position: 'absolute', top: '-120px', right: '-80px', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,99,235,0.2), transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-100px', left: '-60px', width: '250px', height: '250px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.15), transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '30%', left: '60%', width: '200px', height: '200px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.1), transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, opacity: 0.03, backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 40, left: '15%', width: 8, height: 8, borderRadius: '50%', background: 'rgba(99,102,241,0.4)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: 30, right: '20%', width: 6, height: 6, borderRadius: '50%', background: 'rgba(37,99,235,0.3)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 20, right: '35%', width: 5, height: 5, borderRadius: '50%', background: 'rgba(124,58,237,0.3)', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 54, height: 54, borderRadius: 16, background: 'linear-gradient(135deg, rgba(37,99,235,0.3), rgba(124,58,237,0.2))', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)', boxShadow: '0 8px 32px rgba(37,99,235,0.15)' }}>
            <BarChart2 size={24} color="#fff" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #fff, #a5b4fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Reports Dashboard</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Business analytics &amp; insights</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, position: 'relative', zIndex: 1, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 2 }}>
          {TABS.filter((t) => !t.adminOnly || isAdmin).map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ padding: '10px 20px', borderRadius: '10px 10px 0 0', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', color: tab === t.key ? '#fff' : 'rgba(255,255,255,0.4)', background: tab === t.key ? 'linear-gradient(135deg, rgba(37,99,235,0.25), rgba(124,58,237,0.15))' : 'transparent', transition: 'all 0.25s', position: 'relative', letterSpacing: '0.3px' }}>
              {tab === t.key && (
                <div style={{ position: 'absolute', bottom: 0, left: '20%', right: '20%', height: 3, borderRadius: '3px 3px 0 0', background: 'linear-gradient(90deg, #6366f1, #2563eb)' }} />
              )}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '0 32px 32px' }}>
        {tab === 'monthly' && <MonthlyTab year={year} setYear={setYear} />}
        {tab === 'dues' && <DuesTab />}
        {tab === 'trainers' && isAdmin && <TrainerSummaryTab />}
        {tab === 'staff' && isAdmin && <StaffTab />}
      </div>
    </AppShell>
  );
}

export default function ReportsPage() {
  return (
    <Guard role="admin">
      <Suspense fallback={null}>
        <ReportsContent />
      </Suspense>
    </Guard>
  );
}
