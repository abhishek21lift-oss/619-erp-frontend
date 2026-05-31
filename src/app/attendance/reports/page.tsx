'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Loader2, Download, Calendar } from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { useAsync } from '@/lib/use-async';
import { api, Attendance } from '@/lib/api';
import { Button } from '@/components/ui';

function fmtINR(n: number | null | undefined) { return '₹' + Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 }); }

export default function AttendanceReportsPage() {
  const [dateRange, setDateRange] = useState('7');
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));

  const traffic = useAsync(() => api.attendance.list({ days: dateRange }), [dateRange]);
  const monthly = useAsync(() => api.attendance.list({ months: '12' }), []);

  return (
    <Guard role="admin">
      <AppShell>
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-[24px] p-8 sm:p-10 mb-6"
            style={{ background: 'linear-gradient(135deg, #0c4a6e 0%, #0284c7 50%, #38bdf8 100%)', boxShadow: '0 20px 60px rgba(2,132,199,0.3)' }}>
            <div className="relative z-10">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-[10px]" style={{ background: 'rgba(255,255,255,0.15)' }}>
                  <BarChart3 size={16} style={{ color: '#bae6fd' }} />
                </div>
                <span className="text-[11px] font-[650] uppercase tracking-[0.08em]" style={{ color: '#bae6fd' }}>Reports</span>
              </div>
              <h1 className="text-[32px] sm:text-[40px] font-[860] tracking-[-0.03em] leading-tight" style={{ color: '#ffffff' }}>
                Attendance Reports & Analytics
              </h1>
              <p className="mt-3 max-w-xl text-[14px]" style={{ color: 'rgba(255,255,255,0.6)' }}>
                Track footfall trends, peak hours, check-in summaries, and export-ready audit reports.
              </p>
            </div>
          </motion.div>

          <div className="flex items-center gap-3 mb-6 flex-wrap">
            {['7', '30', '90'].map(d => (
              <button key={d} onClick={() => setDateRange(d)}
                className="rounded-[10px] px-4 py-2 text-[12px] font-semibold transition-all"
                style={{
                  background: dateRange === d ? 'rgba(2,132,199,0.1)' : 'rgba(255,255,255,0.7)',
                  border: `1.5px solid ${dateRange === d ? '#0284c7' : 'var(--border)'}`,
                  color: dateRange === d ? '#0284c7' : 'rgb(100,116,139)',
                  backdropFilter: 'blur(8px)',
                }}>
                Last {d} days
              </button>
            ))}
            <div className="flex-1" />
            <Button className="!rounded-[12px] !text-[12px] !font-[600]"
              style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(0,0,0,0.06)', color: 'rgb(100,116,139)' }}>
              <Download size={14} /> Export Report
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 rounded-[20px] p-6"
              style={{ background: 'var(--bg-card)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.95)', boxShadow: '0 2px 20px rgba(15,23,42,0.06)' }}>
              <h2 className="text-[18px] font-[760] mb-4" style={{ color: 'rgb(15,23,42)' }}>Footfall Trend</h2>
              {traffic.loading ? (
                <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin" /></div>
              ) : traffic.data && Array.isArray(traffic.data) && traffic.data.length > 0 ? (
                <div className="h-64 flex items-center justify-center" style={{ color: 'rgb(148,163,184)' }}>
                  <p className="text-sm font-medium">{traffic.data.length} attendance records loaded</p>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center" style={{ color: 'rgb(148,163,184)' }}>
                  <p className="text-sm">No attendance data for this period</p>
                </div>
              )}
            </div>

            <div className="rounded-[20px] p-6"
              style={{ background: 'var(--bg-card)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.95)', boxShadow: '0 2px 20px rgba(15,23,42,0.06)' }}>
              <h2 className="text-[18px] font-[760] mb-4" style={{ color: 'rgb(15,23,42)' }}>Key Metrics</h2>
              <div className="space-y-4">
                {[
                  { label: 'Total Check-Ins', value: traffic.data && Array.isArray(traffic.data) ? String(traffic.data.length) : '—', change: '—', up: true },
                  { label: 'Present', value: traffic.data && Array.isArray(traffic.data) ? String(traffic.data.filter((r: Attendance) => r.status === 'present').length) : '—', change: '—', up: true },
                  { label: 'Late', value: traffic.data && Array.isArray(traffic.data) ? String(traffic.data.filter((r: Attendance) => r.status === 'late').length) : '—', change: '—', up: false },
                  { label: 'Absent', value: traffic.data && Array.isArray(traffic.data) ? String(traffic.data.filter((r: Attendance) => r.status === 'absent').length) : '—', change: '—', up: false },
                ].map(m => (
                  <div key={m.label} className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                    <div>
                      <p className="text-[12px] font-medium" style={{ color: 'rgb(148,163,184)' }}>{m.label}</p>
                      <p className="text-[18px] font-[800] tracking-[-0.02em]" style={{ color: 'rgb(15,23,42)' }}>{m.value}</p>
                    </div>
                    <span className="text-[11px] font-semibold" style={{ color: m.up ? '#10b981' : '#ef4444' }}>{m.change}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-[20px] p-6"
            style={{ background: 'var(--bg-card)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.95)', boxShadow: '0 2px 20px rgba(15,23,42,0.06)' }}>
            <h2 className="text-[18px] font-[760] mb-4" style={{ color: 'rgb(15,23,42)' }}>Monthly Summary</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr style={{ color: 'rgb(148,163,184)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                    <th className="pb-3 font-semibold">Month</th>
                    <th className="pb-3 font-semibold">Total Check-Ins</th>
                    <th className="pb-3 font-semibold">Unique Members</th>
                    <th className="pb-3 font-semibold">Avg Daily</th>
                    <th className="pb-3 font-semibold">Peak Day</th>
                  </tr>
                </thead>
                <tbody>
                  {(monthly.data as Attendance[] || []).slice(0, 6).map((m, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                      <td className="py-3 font-medium" style={{ color: 'rgb(15,23,42)' }}>{m.date || m.ref_name || '—'}</td>
                      <td className="py-3" style={{ color: 'rgb(100,116,139)' }}>{m.status || '—'}</td>
                      <td className="py-3" style={{ color: 'rgb(100,116,139)' }}>{m.ref_name || '—'}</td>
                      <td className="py-3" style={{ color: 'rgb(100,116,139)' }}>{m.check_in || '—'}</td>
                      <td className="py-3" style={{ color: 'rgb(100,116,139)' }}>{m.ref_id || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </AppShell>
    </Guard>
  );
}
