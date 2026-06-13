'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileBarChart, Download, Calendar, ChevronDown, Check,
  FileText, FileSpreadsheet, FileJson, TrendingUp,
  User, Clock, AlertTriangle, RefreshCw, ArrowUpRight,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { PremiumButton } from '@/components/premium/PremiumButton';
import { api } from '@/lib/api';

type ReportRange = 'daily' | 'weekly' | 'monthly';
type ExportFormat = 'pdf' | 'excel' | 'csv';

const RANGE_OPTIONS: { id: ReportRange; label: string }[] = [
  { id: 'daily', label: 'Daily Report' },
  { id: 'weekly', label: 'Weekly Report' },
  { id: 'monthly', label: 'Monthly Report' },
];

const EXPORT_ICONS: Record<ExportFormat, React.ReactNode> = {
  pdf: <FileText size={14} />,
  excel: <FileSpreadsheet size={14} />,
  csv: <FileJson size={14} />,
};

export default function ReportsPage() {
  return (
    <Guard>
      <AppShell>
        <ReportsContent />
      </AppShell>
    </Guard>
  );
}

function ReportsContent() {
  const [range, setRange] = useState<ReportRange>('daily');
  const [memberId, setMemberId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [error, setError] = useState('');

  const params = {
    range,
    date,
    ...(memberId.trim() ? { member_id: memberId.trim() } : {}),
  };

  const handleExport = async (format: ExportFormat) => {
    setExporting(format);
    setExportOpen(false);
    try {
      const res = await api.biometricAttend.report({ ...params, format } as any) as any;
      if (res?.url) {
        window.open(res.url, '_blank');
      } else {
        setError('Export URL not available.');
      }
    } catch (err: any) {
      setError(err?.message || 'Export failed.');
    }
    finally { setExporting(null); }
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(145deg,#f8fafc 0%,#f1f5f9 50%,#fafafe 100%)' }}>
      {/* Hero */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg,#0f0a1e 0%,#1e0a2e 25%,#2a0a1a 55%,#0f172a 100%)', padding: '36px 32px 32px', borderRadius: '0 0 36px 36px' }}>
        <div className="pointer-events-none absolute inset-0" style={{ maskImage: 'linear-gradient(to bottom, black 40%, transparent 90%)' }}>
          <motion.div className="absolute -top-16 -left-8 w-64 h-64 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #f59e0b, transparent 70%)' }}
            animate={{ x: [0, 25, -15, 0], y: [0, -30, 10, 0] }} transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }} />
          <motion.div className="absolute -bottom-16 -right-8 w-72 h-72 rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #ec4899, transparent 70%)' }}
            animate={{ x: [0, -20, 15, 0], y: [0, 20, -8, 0] }} transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }} />
        </div>
        <div className="relative z-10 mx-auto" style={{ maxWidth: 800 }}>
          <div className="flex items-center gap-4">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="flex items-center justify-center w-[48px] h-[48px] rounded-[14px]"
              style={{ background: 'linear-gradient(135deg,#f59e0b,#ec4899)', boxShadow: '0 8px 28px rgba(245,158,11,0.3)' }}>
              <FileBarChart size={20} color="#fff" />
            </motion.div>
            <div>
              <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="text-[24px] font-[860] tracking-[-0.03em]"
                style={{ background: 'linear-gradient(135deg,#fde68a,#f9a8d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Attendance Reports
              </motion.h1>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
                className="text-[12px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
                Generate and export attendance reports
              </motion.p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto px-5 py-6 sm:px-8" style={{ maxWidth: 800 }}>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-[22px] p-6 sm:p-8" style={{ background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 2px 20px rgba(0,0,0,0.07)' }}>
          {/* Range Toggle */}
          <div className="inline-flex rounded-[12px] p-1 mb-6" style={{ background: '#f1f5f9' }}>
            {RANGE_OPTIONS.map((opt) => (
              <button key={opt.id} onClick={() => setRange(opt.id)}
                className="rounded-[9px] px-4 py-2 text-[12px] font-[660] transition-all"
                style={{ background: range === opt.id ? 'white' : 'transparent', color: range === opt.id ? 'rgb(15,23,42)' : 'rgb(148,163,184)', boxShadow: range === opt.id ? '0 1px 4px rgba(0,0,0,0.06)' : 'none' }}>
                {opt.label}
              </button>
            ))}
          </div>

          <div className="space-y-4 mb-6">
            {/* Date */}
            <div>
              <p className="mb-1.5 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>Date</p>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-[11px] px-3.5 py-2.5 text-[13px] outline-none"
                style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', color: 'rgb(15,23,42)', fontFamily: 'inherit' }} />
            </div>

            {/* Member ID */}
            <div>
              <p className="mb-1.5 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>Member ID (optional)</p>
              <input value={memberId} onChange={(e) => setMemberId(e.target.value)} placeholder="Leave empty for all members"
                className="w-full rounded-[11px] px-3.5 py-2.5 text-[13px] outline-none"
                style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', color: 'rgb(15,23,42)', fontFamily: 'inherit' }} />
              <p className="mt-1 text-[11px]" style={{ color: 'rgb(203,213,225)' }}>Enter to filter by specific member</p>
            </div>
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="rounded-[11px] p-3 mb-4 text-[12px] font-[500] flex items-center gap-2"
                style={{ background: '#fff1f2', border: '1px solid #fecdd3', color: '#9f1239' }}>
                <AlertTriangle size={13} /> {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Export */}
          <div>
            <p className="mb-2.5 text-[13px] font-[700]" style={{ color: 'rgb(15,23,42)' }}>
              <Download size={14} className="inline mr-1.5" style={{ color: '#f59e0b' }} />
              Export Report
            </p>
            <div className="relative">
              <button onClick={() => setExportOpen(!exportOpen)}
                className="flex w-full items-center justify-between rounded-[13px] px-4 py-3 text-[13px] font-[500] transition-all"
                style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', color: 'rgb(148,163,184)', fontFamily: 'inherit' }}>
                <span>Choose export format</span>
                <ChevronDown size={14} style={{ transform: exportOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 200ms' }} />
              </button>
              <AnimatePresence>
                {exportOpen && (
                  <motion.div initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    className="absolute left-0 right-0 top-full z-20 mt-1.5 overflow-hidden rounded-[14px] p-1"
                    style={{ background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 12px 32px rgba(0,0,0,0.12)' }}>
                    {(['pdf', 'excel', 'csv'] as ExportFormat[]).map((fmt) => (
                      <button key={fmt} onClick={() => handleExport(fmt)} disabled={exporting === fmt}
                        className="flex w-full items-center gap-3 rounded-[10px] px-3.5 py-2.5 text-[12.5px] font-[580] transition hover:bg-slate-50"
                        style={{ color: 'rgb(30,30,40)', opacity: exporting === fmt ? 0.5 : 1, cursor: exporting === fmt ? 'not-allowed' : 'pointer' }}>
                        <span style={{ color: fmt === 'pdf' ? '#ef4444' : fmt === 'excel' ? '#10b981' : '#6366f1' }}>{EXPORT_ICONS[fmt]}</span>
                        {fmt.toUpperCase()}
                        {exporting === fmt && <RefreshCw size={12} className="ml-auto" style={{ animation: 'spin 1s linear infinite' }} />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Info */}
          <div className="mt-6 rounded-[13px] p-4 text-[12px] leading-relaxed" style={{ background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.12)', color: 'rgb(100,116,139)' }}>
            <strong style={{ color: '#f59e0b' }}>Available Reports:</strong>
            <ul className="mt-1.5 ml-4 space-y-0.5 list-disc">
              <li><strong>Daily:</strong> Full day attendance with check-in/out times</li>
              <li><strong>Weekly:</strong> 7-day summary with totals and averages</li>
              <li><strong>Monthly:</strong> Complete month overview with trends</li>
              <li><strong>Member History:</strong> Filter by member ID for individual report</li>
              <li><strong>Late Arrivals:</strong> Automatically included in all reports</li>
            </ul>
          </div>
        </motion.div>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
