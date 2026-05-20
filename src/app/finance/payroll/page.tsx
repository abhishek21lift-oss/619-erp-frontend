'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import {
  Users, Download, FileText, MoreHorizontal, Search, Filter,
  TrendingUp, TrendingDown, Sparkles, ChevronDown, Check, X,
  Clock, CheckCircle2, AlertCircle, Circle,
  Zap, Crown, ArrowUpRight, ArrowDownRight,
  IndianRupee, Calendar, Target, Activity,
  Play, ChevronRight, Eye, Edit3, Printer,
  Star, Award, BarChart3, Banknote, CreditCard,
  RefreshCw, Plus, Send,
} from 'lucide-react';

export default function PayrollPage() {
  return (
    <Guard>
      <AppShell>
        <Inner />
      </AppShell>
    </Guard>
  );
}

/* ────────────────────────────────────────────────────────────────
   TYPES
──────────────────────────────────────────────────────────────── */
type PayStatus = 'Paid' | 'Pending' | 'Processing';

interface StaffRow {
  id: string;
  name: string;
  role: string;
  initials: string;
  color: string;
  base: number;
  incentive: number;
  attendance: number;
  deduction: number;
  net: number;
  status: PayStatus;
  sessions?: number;
  retention?: number;
}

/* ────────────────────────────────────────────────────────────────
   SAMPLE DATA
──────────────────────────────────────────────────────────────── */
const STAFF: StaffRow[] = [
  {
    id: '1', name: 'Abhishek Katiyar', role: 'Head Trainer',
    initials: 'AK', color: '#6d28d9',
    base: 55000, incentive: 18500, attendance: 97, deduction: 2000, net: 71500,
    status: 'Paid', sessions: 148, retention: 91,
  },
  {
    id: '2', name: 'Priya Sharma', role: 'PT Coach',
    initials: 'PS', color: '#0ea5e9',
    base: 38000, incentive: 12800, attendance: 94, deduction: 1200, net: 49600,
    status: 'Paid', sessions: 112, retention: 87,
  },
  {
    id: '3', name: 'Rahul Verma', role: 'Strength Coach',
    initials: 'RV', color: '#10b981',
    base: 42000, incentive: 9200, attendance: 88, deduction: 3500, net: 47700,
    status: 'Processing', sessions: 96, retention: 82,
  },
  {
    id: '4', name: 'Neha Singh', role: 'Yoga Instructor',
    initials: 'NS', color: '#f59e0b',
    base: 32000, incentive: 6400, attendance: 91, deduction: 800, net: 37600,
    status: 'Pending', sessions: 84, retention: 89,
  },
  {
    id: '5', name: 'Vikram Patel', role: 'Cardio Trainer',
    initials: 'VP', color: '#ec4899',
    base: 36000, incentive: 7800, attendance: 79, deduction: 4200, net: 39600,
    status: 'Pending', sessions: 71, retention: 76,
  },
  {
    id: '6', name: 'Anita Desai', role: 'Reception',
    initials: 'AD', color: '#8b5cf6',
    base: 25000, incentive: 2000, attendance: 100, deduction: 0, net: 27000,
    status: 'Paid', sessions: undefined, retention: undefined,
  },
];

const WORKFLOW_STEPS = [
  { id: 1, label: 'Attendance\nCapture',  icon: <Users size={16} />,       done: true,   active: false },
  { id: 2, label: 'Performance\nReview',  icon: <Target size={16} />,      done: true,   active: false },
  { id: 3, label: 'Incentive\nCalc',      icon: <Zap size={16} />,         done: true,   active: false },
  { id: 4, label: 'Deductions\nApplied',  icon: <Activity size={16} />,    done: false,  active: true  },
  { id: 5, label: 'Salary\nGeneration',   icon: <FileText size={16} />,    done: false,  active: false },
  { id: 6, label: 'Bank\nTransfer',       icon: <Banknote size={16} />,    done: false,  active: false },
];

const AI_INSIGHTS = [
  {
    icon: <Sparkles size={14} />,
    color: '#6d28d9',
    bg: 'rgba(109,40,217,0.08)',
    title: 'Retention Bonus Opportunity',
    body: 'Trainers with >85% client retention generated 28% more renewals. Consider a ₹5,000 retention bonus for Abhishek and Priya.',
    tag: 'Recommendation',
    tagColor: '#6d28d9',
  },
  {
    icon: <AlertCircle size={14} />,
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.08)',
    title: 'Attendance Anomaly Detected',
    body: 'Vikram Patel\'s attendance dropped to 79% this month vs 94% last month. Review schedule or check for personal reasons.',
    tag: 'Anomaly',
    tagColor: '#f59e0b',
  },
  {
    icon: <TrendingUp size={14} />,
    color: '#10b981',
    bg: 'rgba(16,185,129,0.08)',
    title: 'Salary Growth Forecast',
    body: 'If current session growth continues, total payroll will reach ₹5.6L by Q3 — inline with 14% headcount expansion plan.',
    tag: 'Forecast',
    tagColor: '#10b981',
  },
  {
    icon: <Award size={14} />,
    color: '#0ea5e9',
    bg: 'rgba(14,165,233,0.08)',
    title: 'Top Performer Incentive',
    body: 'Abhishek completed 148 sessions this month — 23% above target. Auto-bonus of ₹3,500 applied based on incentive rules.',
    tag: 'Auto-Applied',
    tagColor: '#0ea5e9',
  },
];

const CALENDAR_EVENTS = [
  { date: '25 May', label: 'Salary Processing', color: '#6d28d9', type: 'salary' },
  { date: '28 May', label: 'Incentive Payout',  color: '#10b981', type: 'bonus'  },
  { date: '31 May', label: 'TDS Filing',         color: '#f59e0b', type: 'tax'   },
  { date: '01 Jun', label: 'PF Deposit',          color: '#0ea5e9', type: 'tax'   },
  { date: '05 Jun', label: 'Bonus Release',       color: '#ec4899', type: 'bonus' },
];

const EXPENSE_SLICES = [
  { label: 'Base Salaries', value: 228000, pct: 61, color: '#6d28d9' },
  { label: 'Incentives',    value: 56700,  pct: 15, color: '#0ea5e9' },
  { label: 'Bonuses',       value: 28500,  pct:  8, color: '#10b981' },
  { label: 'Taxes / PF',    value: 37600,  pct: 10, color: '#f59e0b' },
  { label: 'Operations',    value: 22200,  pct:  6, color: '#ec4899' },
];

const TOP_PERFORMERS = [
  { name: 'Abhishek Katiyar', role: 'Head Trainer', initials: 'AK', color: '#6d28d9', sessions: 148, retention: 91, earned: '₹18,500' },
  { name: 'Priya Sharma',     role: 'PT Coach',     initials: 'PS', color: '#0ea5e9', sessions: 112, retention: 87, earned: '₹12,800' },
  { name: 'Rahul Verma',      role: 'Strength Coach',initials: 'RV', color: '#10b981', sessions: 96, retention: 82, earned: '₹9,200'  },
];

/* ────────────────────────────────────────────────────────────────
   HELPERS
──────────────────────────────────────────────────────────────── */
const fmt  = (n: number) => '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
const fmtK = (n: number) => n >= 100000 ? '₹' + (n / 100000).toFixed(1) + 'L' : n >= 1000 ? '₹' + (n / 1000).toFixed(0) + 'K' : fmt(n);

const STATUS_CFG: Record<PayStatus, { label: string; color: string; bg: string; dot: string; icon: React.ReactNode }> = {
  Paid:       { label: 'Paid',       color: '#059669', bg: 'rgba(5,150,105,0.09)',  dot: '#10b981', icon: <CheckCircle2 size={11} /> },
  Pending:    { label: 'Pending',    color: '#d97706', bg: 'rgba(217,119,6,0.09)',  dot: '#f59e0b', icon: <Clock size={11} /> },
  Processing: { label: 'Processing', color: '#2563eb', bg: 'rgba(37,99,235,0.09)', dot: '#3b82f6', icon: <RefreshCw size={11} /> },
};

/* ────────────────────────────────────────────────────────────────
   DONUT CHART (SVG)
──────────────────────────────────────────────────────────────── */
function Donut({ slices }: { slices: typeof EXPENSE_SLICES }) {
  const r = 58, cx = 72, cy = 72, stroke = 18;
  const circumference = 2 * Math.PI * r;
  let offset = 0;
  const arcs = slices.map((s) => {
    const dash = (s.pct / 100) * circumference;
    const gap  = circumference - dash;
    const arc  = { offset, dash, gap, color: s.color };
    offset += dash;
    return arc;
  });

  return (
    <svg width={144} height={144} viewBox="0 0 144 144">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(15,23,42,0.06)" strokeWidth={stroke} />
      {arcs.map((a, i) => (
        <circle
          key={i} cx={cx} cy={cy} r={r} fill="none"
          stroke={a.color} strokeWidth={stroke}
          strokeDasharray={`${a.dash} ${a.gap}`}
          strokeDashoffset={-a.offset + circumference * 0.25}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
      ))}
      <text x={cx} y={cy - 6}  textAnchor="middle" fontSize={11} fill="#64748b" fontWeight={500}>Total</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize={14} fill="#0f172a" fontWeight={700}>₹3.73L</text>
    </svg>
  );
}

/* ────────────────────────────────────────────────────────────────
   MINI SPARKLINE
──────────────────────────────────────────────────────────────── */
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1;
  const w = 80, h = 28, pts = data.length;
  const points = data.map((v, i) => `${(i / (pts - 1)) * w},${h - ((v - min) / range) * h}`).join(' ');
  return (
    <svg width={w} height={h} style={{ overflow: 'visible' }}>
      <polyline fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" points={points} />
      <circle cx={(pts - 1) / (pts - 1) * w} cy={h - ((data[pts - 1] - min) / range) * h} r={3} fill={color} />
    </svg>
  );
}

/* ────────────────────────────────────────────────────────────────
   KPI CARD
──────────────────────────────────────────────────────────────── */
function KpiCard({
  label, value, sub, change, positive, sparkData, color, icon,
}: {
  label: string; value: string; sub: string; change: string;
  positive: boolean; sparkData: number[]; color: string; icon: React.ReactNode;
}) {
  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: '0 12px 40px rgba(15,23,42,0.12)' }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      style={{
        background: '#fff',
        borderRadius: 20,
        padding: '22px 24px',
        boxShadow: '0 2px 12px rgba(15,23,42,0.06), 0 1px 3px rgba(15,23,42,0.04)',
        border: '1px solid rgba(15,23,42,0.06)',
        flex: 1,
        minWidth: 0,
        cursor: 'default',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
            {icon}
          </div>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: '#64748b', letterSpacing: '0.01em' }}>{label}</span>
        </div>
        <Sparkline data={sparkData} color={color} />
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em', lineHeight: 1 }}>{value}</div>
      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: '#94a3b8' }}>{sub}</span>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 3,
          fontSize: 11.5, fontWeight: 700,
          color: positive ? '#059669' : '#dc2626',
          background: positive ? 'rgba(5,150,105,0.08)' : 'rgba(220,38,38,0.08)',
          padding: '3px 8px', borderRadius: 99,
        }}>
          {positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {change}
        </span>
      </div>
    </motion.div>
  );
}

/* ────────────────────────────────────────────────────────────────
   STATUS PILL
──────────────────────────────────────────────────────────────── */
function StatusPill({ status }: { status: PayStatus }) {
  const cfg = STATUS_CFG[status];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 10px', borderRadius: 99,
      fontSize: 11.5, fontWeight: 700,
      color: cfg.color, background: cfg.bg,
    }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

/* ────────────────────────────────────────────────────────────────
   ATTENDANCE BAR
──────────────────────────────────────────────────────────────── */
function AttBar({ pct }: { pct: number }) {
  const color = pct >= 95 ? '#10b981' : pct >= 85 ? '#3b82f6' : pct >= 75 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 5, borderRadius: 99, background: 'rgba(15,23,42,0.07)', overflow: 'hidden', minWidth: 60 }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{ height: '100%', borderRadius: 99, background: color }}
        />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 30, textAlign: 'right' }}>{pct}%</span>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   AVATAR
──────────────────────────────────────────────────────────────── */
function Avatar({ initials, color, size = 36 }: { initials: string; color: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.3,
      background: `linear-gradient(135deg, ${color}, ${color}cc)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.32, fontWeight: 800, color: '#fff', flexShrink: 0,
    }}>{initials}</div>
  );
}

/* ────────────────────────────────────────────────────────────────
   ACTION BUTTON
──────────────────────────────────────────────────────────────── */
function ActionBtn({ icon, label, onClick, accent }: { icon: React.ReactNode; label: string; onClick?: () => void; accent?: string }) {
  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -1 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 16px', borderRadius: 12, border: 'none', cursor: 'pointer',
        fontSize: 13, fontWeight: 700,
        background: accent ? `linear-gradient(135deg, ${accent}, ${accent}dd)` : 'rgba(15,23,42,0.05)',
        color: accent ? '#fff' : '#334155',
        boxShadow: accent ? `0 4px 16px ${accent}40` : 'none',
      }}
    >
      {icon} {label}
    </motion.button>
  );
}

/* ────────────────────────────────────────────────────────────────
   ICON BUTTON
──────────────────────────────────────────────────────────────── */
function IconBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick?: () => void }) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      title={label}
      style={{
        width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'transparent', color: '#94a3b8',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(15,23,42,0.06)'; (e.currentTarget as HTMLElement).style.color = '#334155'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#94a3b8'; }}
    >
      {icon}
    </motion.button>
  );
}

/* ────────────────────────────────────────────────────────────────
   SECTION HEADER
──────────────────────────────────────────────────────────────── */
function SectionHeader({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
      <div>
        <h2 style={{ fontSize: 15, fontWeight: 780, color: '#0f172a', letterSpacing: '-0.01em' }}>{title}</h2>
        {sub && <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{sub}</p>}
      </div>
      {right}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   CARD WRAPPER
──────────────────────────────────────────────────────────────── */
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 20,
      boxShadow: '0 2px 12px rgba(15,23,42,0.06), 0 1px 3px rgba(15,23,42,0.04)',
      border: '1px solid rgba(15,23,42,0.06)',
      ...style,
    }}>
      {children}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   MAIN PAGE
──────────────────────────────────────────────────────────────── */
function Inner() {
  const [search, setSearch]     = useState('');
  const [statusFilter, setStatusFilter] = useState<PayStatus | 'All'>('All');
  const [runModal, setRunModal] = useState(false);

  const filtered = useMemo(() => {
    return STAFF.filter(s =>
      (statusFilter === 'All' || s.status === statusFilter) &&
      s.name.toLowerCase().includes(search.toLowerCase()),
    );
  }, [search, statusFilter]);

  const totals = useMemo(() => ({
    payroll:   STAFF.reduce((a, s) => a + s.net, 0),
    pending:   STAFF.filter(s => s.status !== 'Paid').reduce((a, s) => a + s.net, 0),
    pendingCt: STAFF.filter(s => s.status !== 'Paid').length,
    avgInc:    Math.round(STAFF.filter(s => s.incentive).reduce((a, s) => a + s.incentive, 0) / STAFF.filter(s => s.incentive).length),
    paidPct:   Math.round((STAFF.filter(s => s.status === 'Paid').length / STAFF.length) * 100),
  }), []);

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#f8fafc 0%,#f1f5f9 60%,#f8faff 100%)' }}>

      {/* ── STICKY TOP HEADER ─────────────────────────────────── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'rgba(255,255,255,0.90)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(15,23,42,0.07)',
      }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 22, paddingBottom: 18, gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: 'linear-gradient(135deg,#6d28d9,#7c3aed)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 16px rgba(109,40,217,0.30)',
                }}>
                  <IndianRupee size={18} color="#fff" />
                </div>
                <div>
                  <h1 style={{ fontSize: 22, fontWeight: 860, color: '#0f172a', letterSpacing: '-0.03em', lineHeight: 1 }}>
                    Payroll Management
                  </h1>
                  <p style={{ fontSize: 12.5, color: '#94a3b8', marginTop: 3 }}>
                    Automated salary processing, incentives & payout intelligence
                  </p>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <ActionBtn icon={<BarChart3 size={14} />} label="Export" />
              <ActionBtn icon={<Printer size={14} />}   label="Generate Payslips" />
              <ActionBtn icon={<Download size={14} />}  label="Download" />
              <ActionBtn
                icon={<Play size={14} />}
                label="Run Payroll"
                accent="#6d28d9"
                onClick={() => setRunModal(true)}
              />
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '28px 28px 60px' }}>

        {/* ── KPI CARDS ──────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
          <KpiCard
            label="Total Payroll" value={fmtK(totals.payroll)} sub="This month"
            change="+12% vs last month" positive sparkData={[310,340,360,380,420,450,482]}
            color="#6d28d9" icon={<IndianRupee size={16} />}
          />
          <KpiCard
            label="Pending Payouts" value={fmtK(totals.pending)} sub={`${totals.pendingCt} employees pending`}
            change="-3% vs last month" positive={false} sparkData={[95,88,75,82,68,71,68]}
            color="#f59e0b" icon={<Clock size={16} />}
          />
          <KpiCard
            label="Avg Trainer Incentive" value={fmtK(totals.avgInc)} sub="Based on sessions & retention"
            change="+8% this cycle" positive sparkData={[90,100,105,108,112,120,128]}
            color="#0ea5e9" icon={<Zap size={16} />}
          />
          <KpiCard
            label="Payroll Completion" value={`${totals.paidPct}%`} sub="Processed successfully"
            change="+5% vs last month" positive sparkData={[70,75,78,80,84,88,92]}
            color="#10b981" icon={<CheckCircle2 size={16} />}
          />
        </div>

        {/* ── 2-COLUMN LAYOUT ────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>

          {/* ════════════════ LEFT COLUMN ═══════════════════ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* ── PAYROLL TABLE ───────────────────────────── */}
            <Card>
              <div style={{ padding: '22px 24px 0' }}>
                <SectionHeader
                  title="Staff Payroll Overview"
                  sub={`May 2026 — ${STAFF.length} employees`}
                  right={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '7px 12px', borderRadius: 10,
                        background: 'rgba(15,23,42,0.04)', border: '1px solid rgba(15,23,42,0.08)',
                      }}>
                        <Search size={13} color="#94a3b8" />
                        <input
                          value={search}
                          onChange={e => setSearch(e.target.value)}
                          placeholder="Search staff…"
                          style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: '#0f172a', width: 140 }}
                        />
                      </div>
                      {(['All', 'Paid', 'Processing', 'Pending'] as const).map(s => (
                        <button
                          key={s}
                          onClick={() => setStatusFilter(s)}
                          style={{
                            padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                            fontSize: 12, fontWeight: 700,
                            background: statusFilter === s ? 'rgba(109,40,217,0.10)' : 'transparent',
                            color: statusFilter === s ? '#6d28d9' : '#94a3b8',
                          }}
                        >{s}</button>
                      ))}
                    </div>
                  }
                />
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(15,23,42,0.07)' }}>
                      {['Staff', 'Role', 'Base Salary', 'Incentives', 'Attendance', 'Deductions', 'Net Pay', 'Status', ''].map((h, i) => (
                        <th key={i} style={{
                          padding: '10px 16px', textAlign: i === 0 ? 'left' : i >= 2 && i <= 6 ? 'right' : 'left',
                          fontSize: 11, fontWeight: 700, color: '#94a3b8',
                          letterSpacing: '0.06em', textTransform: 'uppercase',
                          whiteSpace: 'nowrap', background: 'rgba(248,250,252,0.8)',
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {filtered.map((s, idx) => (
                        <motion.tr
                          key={s.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ delay: idx * 0.04 }}
                          style={{ borderBottom: '1px solid rgba(15,23,42,0.05)', cursor: 'default' }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(109,40,217,0.03)'}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                        >
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                              <Avatar initials={s.initials} color={s.color} size={36} />
                              <div>
                                <div style={{ fontSize: 13.5, fontWeight: 720, color: '#0f172a' }}>{s.name}</div>
                                {s.sessions != null && (
                                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{s.sessions} sessions</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <span style={{ fontSize: 12.5, color: '#64748b', fontWeight: 600 }}>{s.role}</span>
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>{fmt(s.base)}</span>
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#059669', fontVariantNumeric: 'tabular-nums' }}>
                              {s.incentive > 0 ? `+${fmt(s.incentive)}` : '—'}
                            </span>
                          </td>
                          <td style={{ padding: '14px 16px', minWidth: 130 }}>
                            <AttBar pct={s.attendance} />
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: s.deduction > 0 ? '#dc2626' : '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
                              {s.deduction > 0 ? `-${fmt(s.deduction)}` : '—'}
                            </span>
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                            <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>{fmt(s.net)}</span>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <StatusPill status={s.status} />
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <IconBtn icon={<Eye size={13} />}     label="View" />
                              <IconBtn icon={<Edit3 size={13} />}   label="Edit" />
                              <IconBtn icon={<Printer size={13} />} label="Payslip" />
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>

                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 40,
                  padding: '14px 24px', borderTop: '2px solid rgba(15,23,42,0.08)',
                  background: 'rgba(248,250,252,0.8)',
                }}>
                  {[
                    { label: 'Total Base', value: fmt(STAFF.reduce((a,s)=>a+s.base,0)), color: '#334155' },
                    { label: 'Total Incentives', value: `+${fmt(STAFF.reduce((a,s)=>a+s.incentive,0))}`, color: '#059669' },
                    { label: 'Total Deductions', value: `-${fmt(STAFF.reduce((a,s)=>a+s.deduction,0))}`, color: '#dc2626' },
                    { label: 'Net Payroll', value: fmt(STAFF.reduce((a,s)=>a+s.net,0)), color: '#6d28d9' },
                  ].map(item => (
                    <div key={item.label} style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 10.5, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: item.color, fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* ── WORKFLOW ─────────────────────────────────── */}
            <Card style={{ padding: '22px 24px' }}>
              <SectionHeader title="Payroll Process Flow" sub="Current cycle — Step 4 of 6 in progress" />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', gap: 0 }}>
                {WORKFLOW_STEPS.map((step, idx) => (
                  <React.Fragment key={step.id}>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, flex: 1 }}
                    >
                      <div style={{
                        width: 48, height: 48, borderRadius: 16,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: step.done ? 'linear-gradient(135deg,#6d28d9,#7c3aed)'
                          : step.active ? 'rgba(109,40,217,0.10)'
                          : 'rgba(15,23,42,0.05)',
                        color: step.done ? '#fff' : step.active ? '#6d28d9' : '#94a3b8',
                        border: step.active ? '2px solid #6d28d9' : '2px solid transparent',
                        boxShadow: step.active ? '0 0 0 4px rgba(109,40,217,0.12), 0 4px 16px rgba(109,40,217,0.22)' : 'none',
                        position: 'relative', flexShrink: 0,
                        transition: 'all 0.3s ease',
                      }}>
                        {step.done ? <Check size={18} strokeWidth={3} /> : step.icon}
                        {step.active && (
                          <motion.div
                            animate={{ scale: [1, 1.4, 1] }}
                            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                            style={{
                              position: 'absolute', inset: -4, borderRadius: 20,
                              border: '2px solid rgba(109,40,217,0.35)',
                            }}
                          />
                        )}
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{
                          fontSize: 11.5, fontWeight: 700, lineHeight: 1.3,
                          color: step.done ? '#0f172a' : step.active ? '#6d28d9' : '#94a3b8',
                          whiteSpace: 'pre-line',
                        }}>{step.label}</div>
                        {step.done && (
                          <div style={{ fontSize: 10, color: '#10b981', marginTop: 2, fontWeight: 700 }}>Complete</div>
                        )}
                        {step.active && (
                          <div style={{ fontSize: 10, color: '#6d28d9', marginTop: 2, fontWeight: 700 }}>In Progress</div>
                        )}
                      </div>
                    </motion.div>

                    {idx < WORKFLOW_STEPS.length - 1 && (
                      <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', paddingBottom: 24 }}>
                        <div style={{
                          height: 2, width: 32,
                          background: step.done
                            ? 'linear-gradient(90deg,#6d28d9,#7c3aed)'
                            : 'rgba(15,23,42,0.10)',
                          borderRadius: 99,
                        }} />
                        <ChevronRight size={14} color={step.done ? '#7c3aed' : '#cbd5e1'} style={{ marginLeft: -6 }} />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </Card>

            {/* ── AI INSIGHTS ──────────────────────────────── */}
            <Card style={{ padding: '22px 24px' }}>
              <SectionHeader
                title="AI Payroll Intelligence"
                sub="Powered by 619 AI — updated this cycle"
                right={
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 12px', borderRadius: 99,
                    background: 'linear-gradient(135deg,rgba(109,40,217,0.10),rgba(124,58,237,0.06))',
                    border: '1px solid rgba(109,40,217,0.15)',
                  }}>
                    <Sparkles size={12} color="#6d28d9" />
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: '#6d28d9' }}>AI Active</span>
                  </div>
                }
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {AI_INSIGHTS.map((ins, i) => (
                  <motion.div
                    key={i}
                    whileHover={{ y: -2 }}
                    style={{
                      padding: 18, borderRadius: 16,
                      background: ins.bg,
                      border: `1px solid ${ins.color}20`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: 8,
                          background: `${ins.color}18`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: ins.color,
                        }}>{ins.icon}</div>
                        <span style={{ fontSize: 13, fontWeight: 740, color: '#0f172a' }}>{ins.title}</span>
                      </div>
                      <span style={{
                        fontSize: 10, fontWeight: 700, color: ins.tagColor,
                        background: `${ins.tagColor}14`, padding: '3px 8px',
                        borderRadius: 99, border: `1px solid ${ins.tagColor}25`,
                      }}>{ins.tag}</span>
                    </div>
                    <p style={{ fontSize: 12.5, color: '#64748b', lineHeight: 1.55 }}>{ins.body}</p>
                  </motion.div>
                ))}
              </div>
            </Card>
          </div>

          {/* ════════════════ RIGHT SIDEBAR ═════════════════ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* ── PAYROLL CALENDAR ─────────────────────── */}
            <Card style={{ padding: '20px 20px' }}>
              <SectionHeader title="Payroll Calendar" sub="May — Jun 2026" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {CALENDAR_EVENTS.map((ev, i) => (
                  <motion.div
                    key={i}
                    whileHover={{ x: 3 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 12px', borderRadius: 12,
                      background: 'rgba(248,250,252,0.8)',
                      border: '1px solid rgba(15,23,42,0.06)',
                      cursor: 'default',
                    }}
                  >
                    <div style={{
                      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                      background: `${ev.color}12`,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      border: `1px solid ${ev.color}20`,
                    }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: ev.color, lineHeight: 1 }}>{ev.date.split(' ')[0]}</span>
                      <span style={{ fontSize: 9, fontWeight: 600, color: `${ev.color}bb`, textTransform: 'uppercase' }}>{ev.date.split(' ')[1]}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{ev.label}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1, textTransform: 'capitalize' }}>{ev.type}</div>
                    </div>
                    <div style={{ width: 6, height: 6, borderRadius: 99, background: ev.color, flexShrink: 0 }} />
                  </motion.div>
                ))}
              </div>
            </Card>

            {/* ── TOP PERFORMERS ───────────────────────── */}
            <Card style={{ padding: '20px 20px' }}>
              <SectionHeader
                title="Top Performers"
                sub="This payroll cycle"
                right={<Crown size={16} color="#d97706" />}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {TOP_PERFORMERS.map((tp, i) => (
                  <motion.div
                    key={i}
                    whileHover={{ x: 2 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 14px', borderRadius: 14,
                      background: i === 0 ? 'linear-gradient(135deg,rgba(109,40,217,0.06),rgba(124,58,237,0.03))' : 'rgba(248,250,252,0.8)',
                      border: i === 0 ? '1px solid rgba(109,40,217,0.14)' : '1px solid rgba(15,23,42,0.06)',
                    }}
                  >
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <Avatar initials={tp.initials} color={tp.color} size={38} />
                      {i === 0 && (
                        <div style={{
                          position: 'absolute', top: -4, right: -4,
                          width: 16, height: 16, borderRadius: 99,
                          background: 'linear-gradient(135deg,#f59e0b,#d97706)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Crown size={8} color="#fff" />
                        </div>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 740, color: '#0f172a' }}>{tp.name}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>
                        {tp.sessions} sessions · {tp.retention}% retention
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#059669' }}>{tp.earned}</div>
                      <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>incentive</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </Card>

            {/* ── QUICK ACTIONS ────────────────────────── */}
            <Card style={{ padding: '20px 20px' }}>
              <SectionHeader title="Quick Actions" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { icon: <Plus size={14} />,       label: 'Add Bonus',          color: '#10b981' },
                  { icon: <Play size={14} />,        label: 'Process Salary',     color: '#6d28d9' },
                  { icon: <X size={14} />,           label: 'Create Deduction',   color: '#f59e0b' },
                  { icon: <Download size={14} />,    label: 'Download Reports',   color: '#0ea5e9' },
                  { icon: <Printer size={14} />,     label: 'Generate Payslips',  color: '#ec4899' },
                ].map((a, i) => (
                  <motion.button
                    key={i}
                    whileHover={{ x: 3 }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 14px', borderRadius: 12, border: '1px solid rgba(15,23,42,0.06)',
                      background: 'rgba(248,250,252,0.9)',
                      cursor: 'pointer', textAlign: 'left', width: '100%',
                    }}
                  >
                    <div style={{
                      width: 30, height: 30, borderRadius: 8,
                      background: `${a.color}12`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: a.color, flexShrink: 0,
                    }}>{a.icon}</div>
                    <span style={{ fontSize: 13, fontWeight: 680, color: '#334155' }}>{a.label}</span>
                    <ChevronRight size={14} color="#cbd5e1" style={{ marginLeft: 'auto' }} />
                  </motion.button>
                ))}
              </div>
            </Card>

            {/* ── EXPENSE BREAKDOWN ────────────────────── */}
            <Card style={{ padding: '20px 20px' }}>
              <SectionHeader title="Cost Breakdown" sub="May 2026 payroll" />
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 18 }}>
                <Donut slices={EXPENSE_SLICES} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {EXPENSE_SLICES.map((sl, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 99, background: sl.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 11.5, color: '#64748b', flex: 1 }}>{sl.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 780, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>{sl.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ borderTop: '1px solid rgba(15,23,42,0.07)', paddingTop: 14 }}>
                {EXPENSE_SLICES.map((sl, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>{sl.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#334155', fontVariantNumeric: 'tabular-nums' }}>{fmtK(sl.value)}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, marginTop: 6, borderTop: '1.5px solid rgba(15,23,42,0.10)' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Total</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#6d28d9', fontVariantNumeric: 'tabular-nums' }}>₹3.73L</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* ── RUN PAYROLL MODAL ────────────────────────────── */}
      <AnimatePresence>
        {runModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 100,
              background: 'rgba(15,23,42,0.50)',
              backdropFilter: 'blur(6px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onClick={() => setRunModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              onClick={e => e.stopPropagation()}
              style={{
                width: 480, background: '#fff', borderRadius: 24,
                padding: 32, boxShadow: '0 32px 80px rgba(15,23,42,0.22)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 14,
                  background: 'linear-gradient(135deg,#6d28d9,#7c3aed)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 8px 24px rgba(109,40,217,0.30)',
                }}>
                  <Play size={20} color="#fff" />
                </div>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>Run Payroll</h3>
                  <p style={{ fontSize: 12.5, color: '#94a3b8', marginTop: 2 }}>May 2026 — 6 employees</p>
                </div>
              </div>

              <div style={{ background: 'rgba(109,40,217,0.05)', borderRadius: 14, padding: 18, marginBottom: 20, border: '1px solid rgba(109,40,217,0.12)' }}>
                {[
                  { label: 'Total Base Salaries', value: fmt(STAFF.reduce((a,s)=>a+s.base,0)) },
                  { label: 'Total Incentives',    value: `+${fmt(STAFF.reduce((a,s)=>a+s.incentive,0))}` },
                  { label: 'Total Deductions',    value: `-${fmt(STAFF.reduce((a,s)=>a+s.deduction,0))}` },
                  { label: 'Net Payroll Amount',  value: fmt(STAFF.reduce((a,s)=>a+s.net,0)) },
                ].map((row, i, arr) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between',
                    padding: '8px 0',
                    borderTop: i > 0 ? '1px solid rgba(109,40,217,0.10)' : 'none',
                    fontWeight: i === arr.length - 1 ? 800 : 600,
                    fontSize: i === arr.length - 1 ? 15 : 13,
                    color: i === arr.length - 1 ? '#6d28d9' : '#334155',
                  }}>
                    <span style={{ color: i === arr.length - 1 ? '#6d28d9' : '#64748b' }}>{row.label}</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>{row.value}</span>
                  </div>
                ))}
              </div>

              <p style={{ fontSize: 12.5, color: '#94a3b8', marginBottom: 20, lineHeight: 1.6 }}>
                This will initiate salary transfers for all 6 employees and mark the May 2026 payroll cycle as complete.
              </p>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setRunModal(false)}
                  style={{
                    flex: 1, padding: '12px 0', borderRadius: 12, border: '1px solid rgba(15,23,42,0.10)',
                    background: 'transparent', fontSize: 14, fontWeight: 700, color: '#64748b', cursor: 'pointer',
                  }}
                >Cancel</button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setRunModal(false)}
                  style={{
                    flex: 2, padding: '12px 0', borderRadius: 12, border: 'none',
                    background: 'linear-gradient(135deg,#5b21b6,#6d28d9,#7c3aed)',
                    fontSize: 14, fontWeight: 800, color: '#fff', cursor: 'pointer',
                    boxShadow: '0 4px 20px rgba(109,40,217,0.35)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  <Send size={15} /> Confirm & Process
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @media (max-width: 1100px) {
          .payroll-grid { grid-template-columns: 1fr !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; }
        }
      `}</style>
    </div>
  );
}
