'use client';
import { useState } from 'react';
import { m } from 'framer-motion';
import { BarChart3, Loader2, Download, Calendar, Users, CheckCircle, Clock, AlertTriangle, TrendingUp, QrCode, ScanFace, Fingerprint, ClipboardList } from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { useAsync } from '@/lib/use-async';
import { api, Attendance } from '@/lib/api';
import { Button } from '@/components/ui';

function fmtINR(n: number | null | undefined) { return '₹' + Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 }); }

const KPIS = [
  { label: 'Total Check-Ins', icon: <BarChart3 size={18} />, accent: '#06b6d4', key: 'total' as const },
  { label: 'Present', icon: <CheckCircle size={18} />, accent: '#10b981', key: 'present' as const },
  { label: 'Late', icon: <Clock size={18} />, accent: '#f59e0b', key: 'late' as const },
  { label: 'Absent', icon: <AlertTriangle size={18} />, accent: '#ef4444', key: 'absent' as const },
];

function getKPIValue(data: Attendance[] | null | undefined, key: string) {
  if (!data || !Array.isArray(data)) return '—';
  const n = data.length;
  if (key === 'total') return String(n);
  return String(data.filter((r: Attendance) => r.status === key).length);
}

function exportCSV(records: Attendance[], days: string) {
  const header = ['Date', 'Member', 'Status', 'Check-In Time', 'Check-Out Time'];
  const rows = records.map(r => [
    r.date ?? '',
    r.ref_name ?? r.ref_id ?? '',
    r.status ?? '',
    r.check_in ?? '',
    r.check_out ?? '',
  ]);
  const csv = [header, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `attendance-report-${days}days-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AttendanceReportsPage() {
  const [dateRange, setDateRange] = useState('7');

  const traffic = useAsync(() => api.attendance.list({ days: dateRange }), [dateRange]);
  const monthly = useAsync(() => api.attendance.list({ months: '12' }), []);

  const records = traffic.data && Array.isArray(traffic.data) ? traffic.data as Attendance[] : [];

  return (
    <Guard role="admin">
      <AppShell>
        <div style={{ background: 'linear-gradient(145deg,#f8fafc 0%,#f1f5f9 50%,#fafafe 100%)', minHeight: '100vh' }}>
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">

            {/* ═══════ HERO SECTION ═══════ */}
            <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              style={{
                position: 'relative',
                overflow: 'hidden',
                borderRadius: 24,
                padding: '36px 40px',
                marginBottom: 24,
                background: 'linear-gradient(135deg, #0c4a6e 0%, #0284c7 50%, #38bdf8 100%)',
                boxShadow: '0 24px 80px rgba(2,132,199,0.35)',
              }}>

              {/* Grid overlay */}
              <div style={{
                position: 'absolute', inset: 0, opacity: 0.035, pointerEvents: 'none',
                backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                backgroundSize: '40px 40px',
              }} />

              {/* Floating orbs */}
              <m.div style={{ position: 'absolute', right: -100, top: -100, width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle, rgba(56,189,248,0.35) 0%, transparent 70%)', pointerEvents: 'none' }}
                animate={{ scale: [1, 1.12, 1], opacity: [0.3, 0.45, 0.3] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }} />
              <m.div style={{ position: 'absolute', left: -60, bottom: -100, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)', pointerEvents: 'none' }}
                animate={{ scale: [1, 1.18, 1], opacity: [0.2, 0.35, 0.2] }} transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }} />
              <m.div style={{ position: 'absolute', left: '50%', top: -40, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.2) 0%, transparent 70%)', pointerEvents: 'none' }}
                animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.3, 0.15] }} transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }} />

              {/* Top accent glow bar */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)', opacity: 0.5 }} />

              <div style={{ position: 'relative', zIndex: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#06b6d4,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(6,182,212,0.35)' }}>
                    <BarChart3 size={17} color="white" />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#bae6fd' }}>Reports</span>
                </div>
                <h1 style={{
                  fontSize: 32, fontWeight: 860, letterSpacing: '-0.03em', lineHeight: 1.2, margin: 0,
                  background: 'linear-gradient(135deg, #ffffff, #bae6fd, #7dd3fc)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>
                  Reports & Dashboard
                </h1>
                <p style={{ marginTop: 8, fontSize: 14, color: 'rgba(255,255,255,0.6)', maxWidth: 520 }}>
                  Unified footfall trends across all check-in methods — QR, face, passkey, manual, and biometric.
                </p>
              </div>
            </m.div>

            {/* ═══════ DATE RANGE PILLS ═══════ */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
              {['7', '30', '90'].map(d => {
                const active = dateRange === d;
                return (
                  <button key={d} onClick={() => setDateRange(d)}
                    style={{
                      padding: '10px 22px', borderRadius: 100, fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer',
                      transition: 'all 0.25s cubic-bezier(0.16,1,0.3,1)',
                      background: active
                        ? 'linear-gradient(135deg, #0284c7, #0ea5e9)'
                        : 'rgba(255,255,255,0.8)',
                      color: active ? '#fff' : '#64748b',
                      boxShadow: active
                        ? '0 4px 16px rgba(2,132,199,0.3)'
                        : '0 1px 4px rgba(0,0,0,0.04)',
                    }}>
                    Last {d} days
                  </button>
                );
              })}
              <div style={{ flex: 1 }} />
              <Button className="!rounded-[100px] !text-[12px] !font-[700]"
                onClick={() => exportCSV(records, dateRange)}
                style={{
                  background: 'rgba(255,255,255,0.85)',
                  border: '1px solid rgba(0,0,0,0.06)',
                  color: '#64748b',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                  paddingLeft: 20,
                  paddingRight: 20,
                }}>
                <Download size={14} /> Export Report
              </Button>
            </div>

            {/* ═══════ KPI CARDS ROW ═══════ */}
            <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
              {KPIS.map((kpi) => {
                const val = getKPIValue(traffic.data as Attendance[] | null, kpi.key);
                return (
                  <m.div key={kpi.key} tabIndex={0} role="button"
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    style={{
                      background: 'white',
                      borderRadius: 20,
                      padding: '22px 24px',
                      boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                      border: '1px solid rgba(0,0,0,0.06)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                      position: 'relative',
                      overflow: 'hidden',
                      transition: 'all 200ms ease',
                      cursor: 'default',
                    }}
                    onMouseEnter={(e) => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = '0 8px 28px rgba(0,0,0,0.1)'; el.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={(e) => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)'; el.style.transform = 'translateY(0)'; }}>
                    <div style={{ position: 'absolute', top: 0, left: 24, right: 24, height: 3, background: `linear-gradient(90deg,${kpi.accent},${kpi.accent}88)`, borderRadius: '0 0 3px 3px', opacity: 0.8 }} />
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: `${kpi.accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: kpi.accent }}>
                      {kpi.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1 }}>{val}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, fontWeight: 500 }}>{kpi.label}</div>
                    </div>
                  </m.div>
                );
              })}
            </m.div>

            {/* ═══════ METHOD BREAKDOWN ═══════ */}
            {records.length > 0 && (() => {
              const METHOD_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
                qr:        { label: 'QR Code',      icon: <QrCode size={14} />,       color: '#06b6d4' },
                face:      { label: 'Face',          icon: <ScanFace size={14} />,     color: '#6366f1' },
                face_id:   { label: 'Face ID',       icon: <ScanFace size={14} />,     color: '#6366f1' },
                touch_id:  { label: 'Touch ID',      icon: <Fingerprint size={14} />,  color: '#10b981' },
                fingerprint:{ label: 'Fingerprint',  icon: <Fingerprint size={14} />,  color: '#10b981' },
                passkey:   { label: 'Passkey',       icon: <Fingerprint size={14} />,  color: '#8b5cf6' },
                biometric: { label: 'Biometric',     icon: <Fingerprint size={14} />,  color: '#f59e0b' },
                manual:    { label: 'Manual',        icon: <ClipboardList size={14} />,color: '#94a3b8' },
              };
              const methodCounts = records.reduce((acc: Record<string, number>, r) => {
                const method = (r as any).check_in_method || 'manual';
                acc[method] = (acc[method] || 0) + 1;
                return acc;
              }, {});
              const total = records.length || 1;
              return (
                <m.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                  style={{ background: 'white', borderRadius: 20, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)', marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, left: 24, right: 24, height: 3, background: 'linear-gradient(90deg,#6366f1,#06b6d4)', borderRadius: '0 0 3px 3px', opacity: 0.5 }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: '#6366f118', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}>
                      <BarChart3 size={16} />
                    </div>
                    <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Check-In Methods</h2>
                    <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 4 }}>Last {dateRange} days</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    {Object.entries(methodCounts).sort((a, b) => b[1] - a[1]).map(([method, count]) => {
                      const meta = METHOD_META[method] || { label: method, icon: <ClipboardList size={14} />, color: '#94a3b8' };
                      const pct = Math.round((count / total) * 100);
                      return (
                        <div key={method} style={{ flex: '1 1 140px', background: '#f8fafc', borderRadius: 14, padding: '14px 16px', border: '1px solid #f1f5f9' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                            <div style={{ width: 28, height: 28, borderRadius: 8, background: `${meta.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: meta.color }}>
                              {meta.icon}
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{meta.label}</span>
                          </div>
                          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{count}</div>
                          <div style={{ marginTop: 8, height: 4, borderRadius: 2, background: '#e2e8f0' }}>
                            <m.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.7, ease: 'easeOut' }}
                              style={{ height: '100%', borderRadius: 2, background: `linear-gradient(90deg, ${meta.color}, ${meta.color}99)` }} />
                          </div>
                          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{pct}% of check-ins</div>
                        </div>
                      );
                    })}
                  </div>
                </m.div>
              );
            })()}

            {/* ═══════ FOOTFALL TREND + METRICS GRID ═══════ */}
            <div className="rg-2" style={{ gap: 20, marginBottom: 24, alignItems: 'start' }}>

              {/* Footfall Trend Card */}
              <m.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
                style={{
                  background: 'white',
                  borderRadius: 20,
                  padding: 24,
                  boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                  border: '1px solid rgba(0,0,0,0.06)',
                  position: 'relative',
                  overflow: 'hidden',
                }}>
                <div style={{ position: 'absolute', top: 0, left: 24, right: 24, height: 3, background: 'linear-gradient(90deg,#06b6d4,#3b82f6)', borderRadius: '0 0 3px 3px', opacity: 0.5 }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: '#06b6d418', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#06b6d4' }}>
                    <TrendingUp size={16} />
                  </div>
                  <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Footfall Trend</h2>
                </div>
                {traffic.loading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}><Loader2 size={20} className="animate-spin" /></div>
                ) : records.length > 0 ? (
                  <div style={{ padding: '40px 0', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 4 }}>
                    {(() => {
                      const statusCounts = records.reduce((acc: Record<string, number>, r) => {
                        acc[r.status] = (acc[r.status] || 0) + 1;
                        return acc;
                      }, {});
                      const maxCount = Math.max(...Object.values(statusCounts), 1);
                      const colors: Record<string, string> = { present: '#10b981', late: '#f59e0b', absent: '#ef4444', unmarked: '#94a3b8' };
                      return Object.entries(statusCounts).map(([status, count], i) => {
                        const barHeight = 20 + (count / maxCount) * 80;
                        return (
                          <m.div key={status} initial={{ height: 0 }} animate={{ height: barHeight }}
                            transition={{ duration: 0.6, delay: i * 0.03, ease: 'easeOut' }}
                            style={{ width: 40, borderRadius: '6px 6px 0 0', background: `linear-gradient(180deg, ${colors[status] || '#06b6d4'}, #1e293b)`, opacity: 0.6 + (i / Math.max(Object.keys(statusCounts).length, 1)) * 0.4 }}
                            title={`${status}: ${count}`} />
                        );
                      });
                    })()}
                  </div>
                ) : (
                  <div style={{ padding: '48px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                    <p style={{ fontSize: 13, fontWeight: 500 }}>No attendance data for this period</p>
                  </div>
                )}
                <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                  {records.length} record{records.length !== 1 ? 's' : ''} · {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </div>
              </m.div>

              {/* Monthly Summary Card */}
              <m.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
                style={{
                  background: 'white',
                  borderRadius: 20,
                  boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                  border: '1px solid rgba(0,0,0,0.06)',
                  overflow: 'hidden',
                  position: 'relative',
                }}>
                <div style={{ position: 'absolute', top: 0, left: 24, right: 24, height: 3, background: 'linear-gradient(90deg,#10b981,#06b6d4)', borderRadius: '0 0 3px 3px', opacity: 0.5 }} />
                <div style={{ padding: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: '#10b98118', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                      <Calendar size={16} />
                    </div>
                    <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Monthly Summary</h2>
                  </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr>
                        {['Month', 'Check-Ins', 'Members', 'Avg Daily', 'Peak Day'].map((h, i) => (
                          <th key={i} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '0.8px', background: 'linear-gradient(135deg,#0c4a6e,#0284c7,#38bdf8)', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const byMonth: Record<string, { checkins: number; members: Set<string>; present: number }> = {};
                        (monthly.data as Attendance[] || []).forEach((m) => {
                          const date = m.date || '';
                          const monthKey = date.slice(0, 7);
                          if (!byMonth[monthKey]) byMonth[monthKey] = { checkins: 0, members: new Set(), present: 0 };
                          byMonth[monthKey].checkins++;
                          byMonth[monthKey].members.add(m.ref_id);
                          if (m.status === 'present') byMonth[monthKey].present++;
                        });
                        const entries = Object.entries(byMonth).sort().reverse().slice(0, 6);
                        return entries.length > 0 ? (
                          entries.map(([month, data], i) => (
                            <tr key={month}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#f8fafc' }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '' }}
                              style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 150ms' }}>
                              <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <m.div initial={{ width: 0 }} animate={{ width: Math.min(60, (data.present / Math.max(data.checkins, 1)) * 60) }}
                                    transition={{ duration: 0.8, delay: i * 0.05, ease: 'easeOut' }}
                                    style={{ height: 6, borderRadius: 3, background: 'linear-gradient(90deg,#06b6d4,#3b82f6)' }} />
                                  {month}
                                </div>
                              </td>
                              <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>{data.checkins}</td>
                              <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>{data.members.size}</td>
                              <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>{Math.round(data.checkins / Math.max((monthly.data as Attendance[] || []).filter(m => (m.date || '').startsWith(month)).length, 1))}</td>
                              <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>{Math.round((data.present / Math.max(data.checkins, 1)) * 100)}%</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No monthly data available</td>
                          </tr>
                        )
                      })()}
                    </tbody>
                  </table>
                </div>
              </m.div>
            </div>
          </div>
        </div>
      </AppShell>
    </Guard>
  );
}
