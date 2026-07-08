'use client';
import { useEffect, useMemo, useState, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { m } from 'framer-motion';
import Guard from '@/components/Guard';
import { api } from '@/lib/api';
import AppShell from '@/components/AppShell';
import { KpiCard } from '@/components/ui';
import { useAuth } from '@/lib/auth-context';
import {
  BarChart2, AlertCircle, Users, CalendarCheck,
  ChevronLeft, ChevronRight, Download, TrendingUp,
  Search, DollarSign, Clock, UserCheck,
} from 'lucide-react';
import { PremiumBarChart, PremiumAreaChart } from '@/components/ui';

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

const tableHeadStyle: React.CSSProperties = { padding: '10px 14px', textAlign: 'left', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' };
const tableCellStyle: React.CSSProperties = { padding: '10px 14px', fontSize: 12 };

function StatusBadge({ status, label }: { status: string; label?: string }) {
  const v = (label || status || '').toLowerCase();
  const config: Record<string, { bg: string; color: string }> = {
    active: { bg: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.06))', color: '#059669' },
    present: { bg: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.06))', color: '#059669' },
    absent: { bg: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.06))', color: '#dc2626' },
    late: { bg: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.06))', color: '#d97706' },
    expired: { bg: 'linear-gradient(135deg, rgba(107,114,128,0.12), rgba(107,114,128,0.06))', color: '#6b7280' },
  };
  const c = config[v] || { bg: 'var(--bg-subtle)', color: 'var(--text-muted)' };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, background: c.bg, color: c.color, border: `1px solid ${c.color}20` }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.color, display: 'inline-block' }} />
      {label || status}
    </span>
  );
}

function lightBox(extra: React.CSSProperties = {}): React.CSSProperties {
  return { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, boxShadow: 'var(--shadow-card)', overflow: 'hidden', ...extra };
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

  if (error) return (
    <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#dc2626', marginBottom: 20 }}>
      {error}
      <button onClick={fetchMonthly} style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#dc2626', borderRadius: 8, padding: '5px 12px', fontSize: 12, cursor: 'pointer', marginLeft: 8, fontWeight: 600 }}>Retry</button>
    </div>
  );

  return (
    <m.div variants={containerVariants} initial="hidden" animate="visible" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <m.div variants={itemVariants} style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setYear(year - 1)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 10, background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.transform = 'scale(1.05)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-subtle)'; e.currentTarget.style.transform = 'scale(1)'; }}>
            <ChevronLeft size={16} />
          </button>
          <m.span key={year} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', minWidth: 80, textAlign: 'center' }}>{year}</m.span>
          <button onClick={() => setYear(year + 1)} disabled={year >= new Date().getFullYear()}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 10, background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: year >= new Date().getFullYear() ? 'var(--text-disabled)' : 'var(--text-primary)', cursor: year >= new Date().getFullYear() ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={(e) => { if (year < new Date().getFullYear()) { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.transform = 'scale(1.05)'; }}}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-subtle)'; e.currentTarget.style.transform = 'scale(1)'; }}>
            <ChevronRight size={16} />
          </button>
        </div>
        <button onClick={exportMonthly}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, background: '#eff6ff', border: '1px solid rgba(37,99,235,0.2)', color: '#2563eb', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#dbeafe'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.transform = 'translateY(0)'; }}>
          <Download size={14} /> Export CSV
        </button>
      </m.div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
        <KpiCard label={`Total ${year}`} value={fmtAmt(totalRevenue)} icon={<DollarSign size={16} />} accent="blue" />
        <KpiCard label="Avg / Month" value={fmtAmt(avgMonthly)} icon={<TrendingUp size={16} />} accent="cyan" />
        <KpiCard label="Best Month" value={bestMonth?.month ?? '—'} icon={<BarChart2 size={16} />} accent="emerald" hint={bestMonth ? fmtAmt(bestMonth.revenue) : ''} />
        <KpiCard label={MONTHS[new Date().getMonth()]} value={fmtAmt(thisMonth?.revenue ?? 0)} icon={<Clock size={16} />} accent="amber" hint={`${thisMonth?.count ?? 0} payments`} />
      </div>

      <m.div variants={itemVariants} style={lightBox({ padding: '20px 20px 16px' })}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <div style={{ width: 3, height: 18, borderRadius: 2, background: 'linear-gradient(180deg, #6366f1, #2563eb)' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Monthly Revenue — {year}</span>
        </div>
        {loading ? (
          <div style={{ height: 200, background: 'var(--bg-subtle)', borderRadius: 10 }} />
        ) : (
          <PremiumBarChart
            data={fullYear as Record<string, unknown>[]}
            xKey="month"
            bars={[{ key: 'revenue', label: 'Revenue', color: '#6366f1' }]}
            height={200}
            formatValue={fmtAmt}
          />
        )}
      </m.div>

      <m.div variants={itemVariants} style={lightBox({ padding: '20px 20px 16px' })}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <div style={{ width: 3, height: 18, borderRadius: 2, background: 'linear-gradient(180deg, #10b981, #059669)' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Membership Growth — {year}</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>New transactions per month</span>
        </div>
        {loading ? (
          <div style={{ height: 160, background: 'var(--bg-subtle)', borderRadius: 10 }} />
        ) : (
          <PremiumAreaChart
            data={fullYear as Record<string, unknown>[]}
            xKey="month"
            areas={[{ key: 'count', label: 'New Members', color: '#10b981' }]}
            height={160}
          />
        )}
      </m.div>

      <m.div variants={itemVariants} style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)', background: 'var(--bg-card)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-subtle)' }}>
                <th style={{ ...tableHeadStyle }}>Month</th>
                <th style={{ ...tableHeadStyle }}>Payments</th>
                <th style={{ ...tableHeadStyle }}>Revenue</th>
                <th style={{ ...tableHeadStyle, width: '30%' }}>Progress</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}><td colSpan={4} style={{ padding: '12px 16px' }}><div style={{ height: 14, background: 'var(--bg-subtle)', borderRadius: 6 }} /></td></tr>
                ))
              ) : (
                fullYear.map((m, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)', opacity: m.revenue === 0 ? 0.5 : 1, transition: 'background 0.2s' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99,102,241,0.05)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}>
                    <td style={{ ...tableCellStyle, fontWeight: 600, color: 'var(--text-primary)' }}>{m.month} {year}</td>
                    <td style={{ ...tableCellStyle, color: 'var(--text-muted)' }}>{m.count || '—'}</td>
                    <td style={{ ...tableCellStyle, fontWeight: 700, color: m.revenue > 0 ? '#059669' : 'var(--text-muted)' }}>{m.revenue > 0 ? fmtAmt(m.revenue) : '—'}</td>
                    <td style={tableCellStyle}>
                      {m.revenue > 0 && (
                        <div style={{ background: 'var(--bg-subtle)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                          <div style={{ width: `${(m.revenue / maxRevenue) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #6366f1, #2563eb)', borderRadius: 4, transition: 'width 400ms' }} />
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr style={{ fontWeight: 700, background: 'var(--bg-subtle)', borderTop: '1px solid var(--border)' }}>
                <td style={tableCellStyle}>Total</td>
                <td style={tableCellStyle}>{fullYear.reduce((s, m) => s + m.count, 0)}</td>
                <td style={{ ...tableCellStyle, color: '#2563eb', fontSize: 13 }}>{fmtAmt(totalRevenue)}</td>
                <td style={tableCellStyle} />
              </tr>
            </tfoot>
          </table>
        </div>
      </m.div>
    </m.div>
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
    <m.div variants={containerVariants} initial="hidden" animate="visible" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <m.div variants={itemVariants} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-card)', borderRadius: 10, padding: '6px 14px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
          <Search size={14} color="var(--text-muted)" />
          <input type="search" placeholder="Search member or phone…" value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: 13, fontWeight: 500, outline: 'none', width: 220, padding: '4px 0' }} />
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
          <AlertCircle size={14} color="#dc2626" />
          <span style={{ fontWeight: 700, fontSize: 15, color: '#dc2626' }}>Total outstanding: {fmtAmt(totalDues)}</span>
        </div>
      </m.div>
      {error && (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#dc2626' }}>
          {error}
          <button onClick={fetchDues} style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#dc2626', borderRadius: 8, padding: '5px 12px', fontSize: 12, cursor: 'pointer', marginLeft: 8, fontWeight: 600 }}>Retry</button>
        </div>
      )}
      <m.div variants={itemVariants} style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)', background: 'var(--bg-card)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-subtle)' }}>
                {['Member', 'Phone', 'Trainer', 'Balance Due', 'Expiry', 'Status'].map((h) => (
                  <th key={h} style={{ ...tableHeadStyle }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={6} style={{ padding: '12px 16px' }}><div style={{ height: 14, background: 'var(--bg-subtle)', borderRadius: 6 }} /></td></tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(16,185,129,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(16,185,129,0.2)' }}>
                      <AlertCircle size={24} color="#34d399" />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: '#059669' }}>All Clear!</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 300 }}>No pending dues — every member has settled their balances.</div>
                  </div>
                </td></tr>
              ) : (
                filtered.map((d, i) => {
                  const due = Number(d.balance_amount || d.balance_due || 0);
                  return (
                    <tr key={d.id || i} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99,102,241,0.05)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}>
                      <td style={{ ...tableCellStyle, fontWeight: 600, color: 'var(--text-primary)' }}>{d.name}</td>
                      <td style={{ ...tableCellStyle, color: 'var(--text-muted)' }}>{d.mobile || d.phone || '—'}</td>
                      <td style={{ ...tableCellStyle, color: 'var(--text-muted)' }}>{d.trainer_name || '—'}</td>
                      <td style={{ ...tableCellStyle, fontWeight: 700, color: '#dc2626' }}>{fmtAmt(due)}</td>
                      <td style={{ ...tableCellStyle, color: 'var(--text-muted)' }}>{fmtDate(d.pt_end_date || d.expiry_date)}</td>
                      <td style={tableCellStyle}><StatusBadge status={d.status} /></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </m.div>
    </m.div>
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
    <m.div variants={containerVariants} initial="hidden" animate="visible">
      {error && (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#dc2626', marginBottom: 12 }}>
          {error}
          <button onClick={fetch_} style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#dc2626', borderRadius: 8, padding: '5px 12px', fontSize: 12, cursor: 'pointer', marginLeft: 8, fontWeight: 600 }}>Retry</button>
        </div>
      )}
      <m.div variants={itemVariants} style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)', background: 'var(--bg-card)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-subtle)' }}>
                {['Trainer', 'Active Members', 'Total Members', 'This Month', 'All-time Revenue'].map((h) => (
                  <th key={h} style={{ ...tableHeadStyle }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}><td colSpan={5} style={{ padding: '12px 16px' }}><div style={{ height: 14, background: 'var(--bg-subtle)', borderRadius: 6 }} /></td></tr>
                ))
              ) : trainers.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(99,102,241,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(99,102,241,0.15)' }}>
                      <Users size={24} color="#6366f1" />
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--text-primary)' }}>No trainer data yet</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 300 }}>Trainer summaries will appear here once members are assigned.</div>
                  </div>
                </td></tr>
              ) : (
                (trainers ?? []).map((t, i) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99,102,241,0.05)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}>
                    <td style={{ ...tableCellStyle, fontWeight: 600, color: 'var(--text-primary)' }}>{t.name}</td>
                    <td style={{ ...tableCellStyle, color: '#059669', fontWeight: 600 }}>{t.active_clients}</td>
                    <td style={{ ...tableCellStyle, color: 'var(--text-muted)' }}>{t.total_clients}</td>
                    <td style={{ ...tableCellStyle, fontWeight: 700, color: '#2563eb' }}>{fmtAmt(t.month_revenue)}</td>
                    <td style={{ ...tableCellStyle, fontWeight: 700, color: 'var(--text-primary)' }}>{fmtAmt(t.total_revenue)}</td>
                  </tr>
                ))
              )}
            </tbody>
            {!loading && trainers.length > 0 && (
              <tfoot>
                <tr style={{ fontWeight: 700, background: 'var(--bg-subtle)', borderTop: '1px solid var(--border)' }}>
                  <td style={tableCellStyle}>Total</td>
                  <td style={{ ...tableCellStyle, color: '#059669' }}>{totals.active}</td>
                  <td style={tableCellStyle}>{totals.total}</td>
                  <td style={{ ...tableCellStyle, color: '#2563eb' }}>{fmtAmt(totals.monthRev)}</td>
                  <td style={tableCellStyle}>{fmtAmt(totals.totalRev)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </m.div>
    </m.div>
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
    <m.div variants={containerVariants} initial="hidden" animate="visible" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <m.div variants={itemVariants} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-card)', borderRadius: 10, padding: '6px 14px', border: '1px solid var(--border)' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>From</span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, outline: 'none', padding: '4px 0', width: 130 }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-card)', borderRadius: 10, padding: '6px 14px', border: '1px solid var(--border)' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>To</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, outline: 'none', padding: '4px 0', width: 130 }} />
        </div>
        <Link href="/attendance/staff"
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, background: '#eff6ff', border: '1px solid rgba(37,99,235,0.2)', color: '#2563eb', fontSize: 12, fontWeight: 600, textDecoration: 'none', marginLeft: 'auto', transition: 'all 0.2s' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#dbeafe'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.transform = 'translateY(0)'; }}>
          <CalendarCheck size={13} /> Mark Staff Attendance
        </Link>
      </m.div>

      {error && <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#dc2626' }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
        <KpiCard label="Present" value={String(summary.present)} icon={<UserCheck size={16} />} accent="emerald" />
        <KpiCard label="Late" value={String(summary.late)} icon={<Clock size={16} />} accent="amber" />
        <KpiCard label="Absent" value={String(summary.absent)} icon={<AlertCircle size={16} />} accent="rose" />
        <KpiCard label="Total Marked" value={String(summary.total)} icon={<BarChart2 size={16} />} accent="cyan" />
      </div>

      <m.div variants={itemVariants} style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)', background: 'var(--bg-card)' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', background: 'var(--bg-subtle)' }}>
          <div style={{ width: 3, height: 16, borderRadius: 2, background: 'linear-gradient(180deg, #6366f1, #2563eb)', display: 'inline-block', marginRight: 10, verticalAlign: 'middle' }} />
          Per-Trainer Attendance
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-subtle)' }}>
                {['Trainer', 'Present', 'Late', 'Absent', 'Attendance %', 'Workload'].map((h) => (
                  <th key={h} style={{ ...tableHeadStyle }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}><td colSpan={6} style={{ padding: '12px 16px' }}><div style={{ height: 14, background: 'var(--bg-subtle)', borderRadius: 6 }} /></td></tr>
                ))
              ) : perStaff.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(99,102,241,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(99,102,241,0.15)' }}>
                      <CalendarCheck size={24} color="#6366f1" />
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--text-primary)' }}>No attendance data</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 300 }}>Start marking staff attendance to see reports here.</div>
                  </div>
                </td></tr>
              ) : (
                perStaff.map((s, i) => {
                  const total = s.present + s.late + s.absent;
                  const pct = total > 0 ? Math.round(((s.present + s.late) / total) * 100) : 0;
                  const pctColor = pct >= 90 ? '#059669' : pct >= 70 ? '#d97706' : '#dc2626';
                  return (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99,102,241,0.05)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}>
                      <td style={{ ...tableCellStyle, fontWeight: 600, color: 'var(--text-primary)' }}>{s.name}</td>
                      <td style={{ ...tableCellStyle, color: '#059669', fontWeight: 600 }}>{s.present}</td>
                      <td style={{ ...tableCellStyle, color: '#d97706' }}>{s.late}</td>
                      <td style={{ ...tableCellStyle, color: s.absent > 0 ? '#dc2626' : 'var(--text-muted)', fontWeight: s.absent > 0 ? 600 : 400 }}>{s.absent}</td>
                      <td style={{ ...tableCellStyle, fontWeight: 700, color: pctColor }}>{total > 0 ? `${pct}%` : '—'}</td>
                      <td style={tableCellStyle}>
                        <div style={{ background: 'var(--bg-subtle)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
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
      </m.div>

      <m.div variants={itemVariants} style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)', background: 'var(--bg-card)' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', background: 'var(--bg-subtle)' }}>
          <div style={{ width: 3, height: 16, borderRadius: 2, background: 'linear-gradient(180deg, #6366f1, #2563eb)', display: 'inline-block', marginRight: 10, verticalAlign: 'middle' }} />
          Recent Staff Check-ins
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-subtle)' }}>
                {['Date', 'Staff', 'Status', 'Check-in', 'Notes'].map((h) => (
                  <th key={h} style={{ ...tableHeadStyle }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...records]
                .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
                .slice(0, 30)
                .map((r, i) => (
                  <tr key={r.id || i} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99,102,241,0.05)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}>
                    <td style={{ ...tableCellStyle, color: 'var(--text-muted)' }}>{fmtDate(r.date)}</td>
                    <td style={{ ...tableCellStyle, fontWeight: 600, color: 'var(--text-primary)' }}>{r.ref_name || r.trainer_name || '—'}</td>
                    <td style={tableCellStyle}><StatusBadge status={r.status} /></td>
                    <td style={{ ...tableCellStyle, color: 'var(--text-muted)' }}>{r.check_in ?? r.check_in_time ?? '—'}</td>
                    <td style={{ ...tableCellStyle, color: 'var(--text-muted)' }}>{r.notes ?? '—'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </m.div>
    </m.div>
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
      <div style={{ background: 'var(--bg-subtle)', padding: '52px 32px 28px', borderRadius: '0 0 36px 36px', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 54, height: 54, borderRadius: 16, background: 'linear-gradient(135deg, #2563eb, #7c3aed)', border: '1px solid var(--border)', boxShadow: '0 8px 32px rgba(37,99,235,0.2)' }}>
            <BarChart2 size={24} color="#fff" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Reports Dashboard</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>Business analytics &amp; insights</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, borderBottom: '1px solid var(--border)', paddingBottom: 2 }}>
          {TABS.filter((t) => !t.adminOnly || isAdmin).map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ padding: '10px 20px', borderRadius: '10px 10px 0 0', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', color: tab === t.key ? 'var(--text-primary)' : 'var(--text-muted)', background: tab === t.key ? 'rgba(37,99,235,0.08)' : 'transparent', transition: 'all 0.25s', position: 'relative', letterSpacing: '0.3px' }}>
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
