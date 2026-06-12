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

function fadeUp(i: number) {
  return { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { delay: i * 0.08, duration: 0.4, ease: 'easeOut' } };
}

const cardStyle = { background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '20px 20px 16px' };

const tableHeadStyle = { padding: '10px 14px', textAlign: 'left' as const, fontWeight: 700, fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.35)' };
const tableCellStyle = { padding: '10px 14px', fontSize: 12 };
const tableRowBorder = { borderBottom: '1px solid rgba(255,255,255,0.04)' };

function KpiCard({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '18px 20px', borderTop: `3px solid ${color}` }}>
      <div style={{ fontSize: 26, fontWeight: 800, color, letterSpacing: '-0.03em' }}>{value}</div>
      <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{sub}</div>}
    </div>
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
            <div key={i} title={`${m.month}: ${fmtAmt(m.revenue)} (${m.count} payments)`}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}
              onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
              {hovered === i && m.revenue > 0 && (
                <div style={{ fontSize: 10, color: '#fff', fontWeight: 700, background: 'rgba(0,0,0,0.6)', borderRadius: 4, padding: '2px 5px', marginBottom: 2, whiteSpace: 'nowrap' }}>
                  {m.revenue >= 1000 ? `₹${(m.revenue/1000).toFixed(1)}K` : fmtAmt(m.revenue)}
                </div>
              )}
              {hovered !== i && (
                <div style={{ marginTop: 'auto', fontSize: 9, color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>
                  {m.revenue > 0 ? (m.revenue >= 1000 ? `₹${(m.revenue/1000).toFixed(0)}K` : '') : ''}
                </div>
              )}
              <div style={{ width: '100%', height: `${pct}%`, background: m.revenue > 0 ? 'linear-gradient(180deg, #3b82f6, rgba(59,130,246,0.3))' : 'rgba(255,255,255,0.04)', borderRadius: '4px 4px 0 0', minHeight: m.revenue > 0 ? 6 : 2, transition: 'opacity 150ms', opacity: hovered !== null && hovered !== i ? 0.5 : 1 }} />
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

  if (error) return <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#ef4444', marginBottom: 20 }}>{error} <button onClick={fetchMonthly} style={{ background: 'none', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer', marginLeft: 8 }}>Retry</button></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setYear(year - 1)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', cursor: 'pointer' }}><ChevronLeft size={15} /></button>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{year}</span>
          <button onClick={() => setYear(year + 1)} disabled={year >= new Date().getFullYear()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: year >= new Date().getFullYear() ? 'rgba(255,255,255,0.2)' : '#fff', cursor: year >= new Date().getFullYear() ? 'not-allowed' : 'pointer' }}><ChevronRight size={15} /></button>
        </div>
        <button onClick={exportMonthly} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.2)', color: '#93c5fd', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}><Download size={14} /> Export CSV</button>
      </div>

      <motion.div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }} {...fadeUp(0)}>
        <KpiCard label={`Total ${year}`} value={fmtAmt(totalRevenue)} color="#3b82f6" />
        <KpiCard label="Avg / Month" value={fmtAmt(avgMonthly)} color="#06b6d4" />
        <KpiCard label="Best Month" value={bestMonth?.month ?? '—'} color="#10b981" sub={bestMonth ? fmtAmt(bestMonth.revenue) : ''} />
        <KpiCard label={MONTHS[new Date().getMonth()]} value={fmtAmt(thisMonth?.revenue ?? 0)} color="#f59e0b" sub={`${thisMonth?.count ?? 0} payments`} />
      </motion.div>

      <motion.div style={cardStyle} {...fadeUp(4)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <BarChart2 size={16} color="rgba(255,255,255,0.6)" />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>Monthly Revenue — {year}</span>
        </div>
        {loading ? <div style={{ height: 160, background: 'rgba(255,255,255,0.03)', borderRadius: 10 }} /> : <RevenueBarChart data={fullYear} maxVal={maxRevenue} />}
      </motion.div>

      <motion.div style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden' }} {...fadeUp(5)}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <th style={tableHeadStyle}>Month</th>
                <th style={tableHeadStyle}>Payments</th>
                <th style={tableHeadStyle}>Revenue</th>
                <th style={{ ...tableHeadStyle, width: '30%' }}>Progress</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}><td colSpan={4} style={{ padding: '10px 14px' }}><div style={{ height: 13, background: 'rgba(255,255,255,0.04)', borderRadius: 4 }} /></td></tr>
                ))
              ) : (
                fullYear.map((m, i) => (
                  <tr key={i} style={{ ...tableRowBorder, opacity: m.revenue === 0 ? 0.45 : 1 }}>
                    <td style={{ ...tableCellStyle, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{m.month} {year}</td>
                    <td style={{ ...tableCellStyle, color: 'rgba(255,255,255,0.45)' }}>{m.count || '—'}</td>
                    <td style={{ ...tableCellStyle, fontWeight: 700, color: m.revenue > 0 ? '#10b981' : 'rgba(255,255,255,0.35)' }}>{m.revenue > 0 ? fmtAmt(m.revenue) : '—'}</td>
                    <td style={tableCellStyle}>
                      {m.revenue > 0 && (
                        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                          <div style={{ width: `${(m.revenue / maxRevenue) * 100}%`, height: '100%', background: '#3b82f6', borderRadius: 4, transition: 'width 400ms' }} />
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr style={{ fontWeight: 700, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <td style={tableCellStyle}>Total</td>
                <td style={tableCellStyle}>{fullYear.reduce((s, m) => s + m.count, 0)}</td>
                <td style={{ ...tableCellStyle, color: '#3b82f6' }}>{fmtAmt(totalRevenue)}</td>
                <td style={tableCellStyle} />
              </tr>
            </tfoot>
          </table>
        </div>
      </motion.div>
    </div>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '4px 12px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <input type="search" placeholder="Search member, phone…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 13, fontWeight: 500, outline: 'none', width: 200, padding: '4px 0' }} />
        </div>
        <div style={{ marginLeft: 'auto', fontWeight: 700, fontSize: 15, color: '#ef4444' }}>Total outstanding: {fmtAmt(totalDues)}</div>
      </div>
      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#ef4444' }}>{error} <button onClick={fetchDues} style={{ background: 'none', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer', marginLeft: 8 }}>Retry</button></div>}
      <motion.div style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden' }} {...fadeUp(0)}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Member', 'Phone', 'Trainer', 'Balance Due', 'Expiry', 'Status'].map((h) => (
                  <th key={h} style={tableHeadStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={6} style={{ padding: '10px 14px' }}><div style={{ height: 13, background: 'rgba(255,255,255,0.04)', borderRadius: 4 }} /></td></tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
                  <div><AlertCircle size={28} style={{ color: '#10b981', marginBottom: 8 }} /></div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>No pending dues</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>All members have cleared their balances.</div>
                </td></tr>
              ) : (
                filtered.map((d, i) => {
                  const due = Number(d.balance_amount || d.balance_due || 0);
                  const statusColor = d.status === 'active' ? '#10b981' : '#ef4444';
                  return (
                    <tr key={d.id || i} style={tableRowBorder}>
                      <td style={{ ...tableCellStyle, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{d.name}</td>
                      <td style={{ ...tableCellStyle, color: 'rgba(255,255,255,0.45)' }}>{d.mobile || d.phone || '—'}</td>
                      <td style={{ ...tableCellStyle, color: 'rgba(255,255,255,0.45)' }}>{d.trainer_name || '—'}</td>
                      <td style={{ ...tableCellStyle, fontWeight: 700, color: '#ef4444' }}>{fmtAmt(due)}</td>
                      <td style={{ ...tableCellStyle, color: 'rgba(255,255,255,0.45)' }}>{fmtDate(d.pt_end_date || d.expiry_date)}</td>
                      <td style={tableCellStyle}>
                        <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: d.status === 'active' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: statusColor }}>{d.status}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
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
    <div>
      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#ef4444', marginBottom: 12 }}>{error} <button onClick={fetch_} style={{ background: 'none', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer', marginLeft: 8 }}>Retry</button></div>}
      <motion.div style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden' }} {...fadeUp(0)}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Trainer', 'Active Members', 'Total Members', 'This Month', 'All-time Revenue'].map((h) => (
                  <th key={h} style={tableHeadStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}><td colSpan={5} style={{ padding: '10px 14px' }}><div style={{ height: 13, background: 'rgba(255,255,255,0.04)', borderRadius: 4 }} /></td></tr>
                ))
              ) : trainers.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
                  <div><Users size={28} style={{ marginBottom: 8, color: 'rgba(255,255,255,0.3)' }} /></div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>No trainer data</div>
                </td></tr>
              ) : (
                (trainers ?? []).map((t) => (
                  <tr key={t.id} style={tableRowBorder}>
                    <td style={{ ...tableCellStyle, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{t.name}</td>
                    <td style={{ ...tableCellStyle, color: '#10b981', fontWeight: 600 }}>{t.active_clients}</td>
                    <td style={{ ...tableCellStyle, color: 'rgba(255,255,255,0.45)' }}>{t.total_clients}</td>
                    <td style={{ ...tableCellStyle, fontWeight: 700, color: '#3b82f6' }}>{fmtAmt(t.month_revenue)}</td>
                    <td style={{ ...tableCellStyle, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>{fmtAmt(t.total_revenue)}</td>
                  </tr>
                ))
              )}
            </tbody>
            {!loading && trainers.length > 0 && (
              <tfoot>
                <tr style={{ fontWeight: 700, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <td style={tableCellStyle}>Total</td>
                  <td style={{ ...tableCellStyle, color: '#10b981' }}>{totals.active}</td>
                  <td style={tableCellStyle}>{totals.total}</td>
                  <td style={{ ...tableCellStyle, color: '#3b82f6' }}>{fmtAmt(totals.monthRev)}</td>
                  <td style={tableCellStyle}>{fmtAmt(totals.totalRev)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </motion.div>
    </div>
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

  const BadgeStatus = ({ s }: { s?: string }) => {
    const v = (s ?? '').toLowerCase();
    const c = v === 'present' ? '#10b981' : v === 'absent' ? '#ef4444' : v === 'late' ? '#f59e0b' : 'rgba(255,255,255,0.3)';
    const bg = v === 'present' ? 'rgba(16,185,129,0.15)' : v === 'absent' ? 'rgba(239,68,68,0.15)' : v === 'late' ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.06)';
    return <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: bg, color: c }}>{s ?? '—'}</span>;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>From</span>
        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '4px 12px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 13, fontWeight: 500, outline: 'none', padding: '4px 0', width: 130 }} />
        </div>
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>to</span>
        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '4px 12px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 13, fontWeight: 500, outline: 'none', padding: '4px 0', width: 130 }} />
        </div>
        <Link href="/attendance/staff" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 600, textDecoration: 'none', marginLeft: 'auto' }}>
          <CalendarCheck size={13} /> Mark Staff Attendance
        </Link>
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#ef4444' }}>{error}</div>}

      <motion.div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }} {...fadeUp(0)}>
        <KpiCard label="Present" value={String(summary.present)} color="#10b981" />
        <KpiCard label="Late" value={String(summary.late)} color="#f59e0b" />
        <KpiCard label="Absent" value={String(summary.absent)} color="#ef4444" />
        <KpiCard label="Total Marked" value={String(summary.total)} color="#06b6d4" />
      </motion.div>

      <motion.div style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden' }} {...fadeUp(4)}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontWeight: 600, fontSize: 14, color: 'rgba(255,255,255,0.85)' }}>Per-Trainer Attendance</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Trainer', 'Present', 'Late', 'Absent', 'Attendance %', 'Workload'].map((h) => (
                  <th key={h} style={tableHeadStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}><td colSpan={6} style={{ padding: '10px 14px' }}><div style={{ height: 13, background: 'rgba(255,255,255,0.04)', borderRadius: 4 }} /></td></tr>
                ))
              ) : perStaff.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
                  <div><CalendarCheck size={28} style={{ marginBottom: 8, color: 'rgba(255,255,255,0.3)' }} /></div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>No attendance records</div>
                </td></tr>
              ) : (
                perStaff.map((s) => {
                  const total = s.present + s.late + s.absent;
                  const pct = total > 0 ? Math.round(((s.present + s.late) / total) * 100) : 0;
                  const pctColor = pct >= 90 ? '#10b981' : pct >= 70 ? '#f59e0b' : '#ef4444';
                  return (
                    <tr key={s.id} style={tableRowBorder}>
                      <td style={{ ...tableCellStyle, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{s.name}</td>
                      <td style={{ ...tableCellStyle, color: '#10b981', fontWeight: 600 }}>{s.present}</td>
                      <td style={{ ...tableCellStyle, color: '#f59e0b' }}>{s.late}</td>
                      <td style={{ ...tableCellStyle, color: s.absent > 0 ? '#ef4444' : 'rgba(255,255,255,0.45)', fontWeight: s.absent > 0 ? 600 : 400 }}>{s.absent}</td>
                      <td style={{ ...tableCellStyle, fontWeight: 700, color: pctColor }}>{total > 0 ? `${pct}%` : '—'}</td>
                      <td style={tableCellStyle}>
                        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: pctColor, borderRadius: 4 }} />
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

      <motion.div style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden' }} {...fadeUp(5)}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontWeight: 600, fontSize: 14, color: 'rgba(255,255,255,0.85)' }}>Recent Staff Check-ins</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Date', 'Staff', 'Status', 'Check-in', 'Notes'].map((h) => (
                  <th key={h} style={tableHeadStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...records]
                .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
                .slice(0, 30)
                .map((r, i) => (
                  <tr key={r.id || i} style={tableRowBorder}>
                    <td style={{ ...tableCellStyle, color: 'rgba(255,255,255,0.45)' }}>{fmtDate(r.date)}</td>
                    <td style={{ ...tableCellStyle, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{r.ref_name || r.trainer_name || '—'}</td>
                    <td style={tableCellStyle}><BadgeStatus s={r.status} /></td>
                    <td style={{ ...tableCellStyle, color: 'rgba(255,255,255,0.45)' }}>{r.check_in ?? r.check_in_time ?? '—'}</td>
                    <td style={{ ...tableCellStyle, color: 'rgba(255,255,255,0.45)' }}>{r.notes ?? '—'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
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
      <div style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, #0f172a, #1e293b)', padding: '48px 32px 24px', borderRadius: '0 0 32px 32px', marginBottom: 24 }}>
        <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '200px', height: '200px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.15), transparent)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-40px', left: '-40px', width: '160px', height: '160px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.1), transparent)', pointerEvents: 'none' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: 16, background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)' }}>
            <BarChart2 size={22} color="#fff" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>Reports Dashboard</h1>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>Business analytics &amp; insights</p>
          </div>
        </div>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, position: 'relative', zIndex: 1 }}>
          {TABS.filter((t) => !t.adminOnly || isAdmin).map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ padding: '8px 18px', borderRadius: 10, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', color: tab === t.key ? '#fff' : 'rgba(255,255,255,0.5)', background: tab === t.key ? 'rgba(255,255,255,0.1)' : 'transparent', transition: 'all 0.2s' }}>
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
