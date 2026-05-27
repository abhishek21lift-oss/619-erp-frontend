'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Users, RefreshCw, AlertTriangle, Sparkles, ChevronRight,
  Clock, TrendingUp, TrendingDown, Zap, Phone, Mail, MessageSquare,
  CheckCircle2, XCircle, ArrowRight, UserPlus, Filter, Search,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { KpiCard } from '@/components/ui/KpiCard';
import { StatusPill } from '@/components/premium/StatusPill';
import { AIInsightCard } from '@/components/premium/AIInsightCard';
import { PremiumButton } from '@/components/premium/PremiumButton';
import { PremiumTable } from '@/components/premium/PremiumTable';
import { RevenueCard } from '@/components/premium/RevenueCard';
import { AnalyticsPanel } from '@/components/premium/AnalyticsPanel';
import { EmptyState } from '@/components/ui/EmptyState';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { useAsync } from '@/lib/use-async';

/* ────────────────────────────────────────────────────────────────────
   TYPES
──────────────────────────────────────────────────────────────────── */
type RenewalStatus = 'active' | 'pending' | 'at-risk' | 'expired';

interface RenewalMember {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
  plan: string;
  amount: number;
  expiryDate: string;
  daysLeft: number;
  status: RenewalStatus;
  coach?: string;
  phone?: string;
  autoRenew: boolean;
}

interface ChurnAlert {
  id: string;
  memberName: string;
  riskScore: number;
  reason: string;
  suggestedAction: string;
}

interface AIInsight {
  id: string;
  title: string;
  description: string;
  type: 'positive' | 'negative' | 'neutral' | 'warning';
  action?: { label: string; onClick: () => void };
}

/* ────────────────────────────────────────────────────────────────────
   API TYPES & MAPPERS
──────────────────────────────────────────────────────────────────── */
interface ApiRenewalMember {
  id: string;
  name: string;
  plan: string;
  amount: number;
  expiry_date: string;
  days_left: number;
  status: string;
  coach?: string;
  phone?: string;
  auto_renew: boolean;
}

interface ApiChurnAlert {
  id: string;
  member_name: string;
  risk_score: number;
  reason: string;
  suggested_action: string;
}

interface ApiInsight {
  id: string;
  title: string;
  description: string;
  type: string;
  action?: { label: string };
}

const AVATAR_PALETTE = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#0ea5e9', '#8b5cf6', '#dc2626', '#14b8a6'];

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

function toRenewalMember(raw: ApiRenewalMember): RenewalMember {
  return {
    id: raw.id,
    name: raw.name,
    initials: initials(raw.name),
    avatarColor: stringToColor(raw.name),
    plan: raw.plan,
    amount: raw.amount,
    expiryDate: raw.expiry_date,
    daysLeft: raw.days_left,
    status: raw.status as RenewalStatus,
    coach: raw.coach,
    phone: raw.phone,
    autoRenew: raw.auto_renew,
  };
}

function toChurnAlert(raw: ApiChurnAlert): ChurnAlert {
  return {
    id: raw.id,
    memberName: raw.member_name,
    riskScore: raw.risk_score,
    reason: raw.reason,
    suggestedAction: raw.suggested_action,
  };
}

function toAIInsight(raw: ApiInsight): AIInsight {
  return {
    id: raw.id,
    title: raw.title,
    description: raw.description,
    type: (['positive', 'negative', 'neutral', 'warning'] as const).includes(raw.type as AIInsight['type'])
      ? (raw.type as AIInsight['type'])
      : 'neutral',
    action: raw.action ? { label: raw.action.label, onClick: () => {} } : undefined,
  };
}

/* ────────────────────────────────────────────────────────────────────
   AVATAR
──────────────────────────────────────────────────────────────────── */
function MemberAvatar({ name, color, size = 40 }: { name: string; color: string; size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-[12px] text-white font-[700]"
      style={{ width: size, height: size, background: `linear-gradient(135deg,${color},${color}cc)`, fontSize: size * 0.34 }}
    >
      {initials(name)}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   MEMBER RENEWAL CARD
──────────────────────────────────────────────────────────────────── */
function MemberRenewalCard({ member, index }: { member: RenewalMember; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
      className="group relative overflow-hidden rounded-[18px] px-5 py-4 transition-all cursor-pointer"
      style={{
        background: 'rgba(255,255,255,0.80)',
        border: '1px solid rgba(15,23,42,0.07)',
        boxShadow: '0 1px 4px rgba(15,23,42,0.04)',
      }}
      whileHover={{ boxShadow: '0 4px 20px rgba(15,23,42,0.09)', borderColor: 'rgba(15,23,42,0.11)' }}
      onClick={() => setExpanded(v => !v)}
    >
      <div className="flex items-center gap-4">
        <MemberAvatar name={member.name} color={member.avatarColor} size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[14px] font-[720] tracking-[-0.01em]" style={{ color: 'rgb(15,23,42)' }}>{member.name}</p>
            <StatusPill status={member.status} />
            {member.autoRenew && (
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-[660]" style={{ background: 'rgba(16,185,129,0.08)', color: '#059669' }}>
                <RefreshCw size={9} /> Auto
              </span>
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
            <span className="text-[12px]" style={{ color: 'rgb(100,116,139)' }}>{member.plan}</span>
            <span className="text-[11px] font-[660]" style={{ color: 'rgb(220,38,38)' }}>₹{member.amount.toLocaleString('en-IN')}</span>
            {member.coach && (
              <span className="text-[11px]" style={{ color: 'rgb(148,163,184)' }}>Coach: {member.coach}</span>
            )}
          </div>
        </div>
        <div className="hidden shrink-0 text-right sm:block">
          <p className="text-[11px]" style={{ color: 'rgb(148,163,184)' }}>Expires</p>
          <p className={`text-[12.5px] font-[680] ${member.daysLeft === 0 ? 'text-red-500' : member.daysLeft <= 3 ? 'text-amber-500' : ''}`} style={{ color: member.daysLeft > 3 ? 'rgb(100,116,139)' : undefined }}>
            {member.expiryDate}
          </p>
        </div>
        <div className="shrink-0">
          <PremiumButton size="sm" tone={member.status === 'expired' ? 'danger' : 'primary'} icon={<Zap size={12} />}>
            {member.status === 'expired' ? 'Re-engage' : 'Renew'}
          </PremiumButton>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-4 flex flex-wrap items-center gap-3 border-t pt-4"
            style={{ borderColor: 'rgba(15,23,42,0.06)' }}
          >
            {member.phone && (
              <button className="flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-[11px] font-[600] transition-all hover:bg-slate-100" style={{ color: 'rgb(100,116,139)', background: 'rgba(15,23,42,0.04)' }}>
                <Phone size={11} /> Call
              </button>
            )}
            <button className="flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-[11px] font-[600] transition-all hover:bg-slate-100" style={{ color: 'rgb(100,116,139)', background: 'rgba(15,23,42,0.04)' }}>
              <Mail size={11} /> Email
            </button>
            <button className="flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-[11px] font-[600] transition-all hover:bg-slate-100" style={{ color: 'rgb(100,116,139)', background: 'rgba(15,23,42,0.04)' }}>
              <MessageSquare size={11} /> WhatsApp
            </button>
            <span className="ml-auto text-[10px]" style={{ color: 'rgb(148,163,184)' }}>Risk score: {member.status === 'at-risk' ? 'High' : member.status === 'pending' ? 'Medium' : 'Low'}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   CHURN ALERT CARD
──────────────────────────────────────────────────────────────────── */
function ChurnAlertCard({ alert, index }: { alert: ChurnAlert; index: number }) {
  const riskColor = alert.riskScore >= 80 ? '#ef4444' : alert.riskScore >= 60 ? '#f59e0b' : '#3b82f6';
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06 }}
      className="rounded-[16px] p-4"
      style={{
        background: `linear-gradient(135deg, ${riskColor}08, ${riskColor}04)`,
        border: `1px solid ${riskColor}20`,
      }}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px]" style={{ background: `${riskColor}15`, color: riskColor }}>
          <AlertTriangle size={14} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-[13px] font-[700]" style={{ color: 'rgb(15,23,42)' }}>{alert.memberName}</p>
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-[700]" style={{ background: `${riskColor}15`, color: riskColor }}>
              {alert.riskScore}% risk
            </span>
          </div>
          <p className="mt-1 text-[11.5px] leading-relaxed" style={{ color: 'rgb(100,116,139)' }}>{alert.reason}</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="flex items-center gap-1 text-[11px] font-[600]" style={{ color: riskColor }}>
              <Zap size={11} /> {alert.suggestedAction}
            </span>
          </div>
        </div>
        <button className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] transition hover:bg-slate-100" style={{ color: 'rgb(148,163,184)' }}>
          <ChevronRight size={13} />
        </button>
      </div>
    </motion.div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   SKELETON COMPONENTS
──────────────────────────────────────────────────────────────────── */
function Skeleton({ className, style, children }: { className?: string; style?: React.CSSProperties; children?: React.ReactNode }) {
  return (
    <div
      className={`animate-pulse rounded-[16px] ${className ?? ''}`}
      style={{ background: 'rgba(15,23,42,0.06)', ...style }}
    >
      {children}
    </div>
  );
}

function SkeletonLine({ width, className }: { width: string; className?: string }) {
  return (
    <div
      className={`rounded ${className ?? ''}`}
      style={{ width, height: 12, background: 'rgba(255,255,255,0.5)' }}
    />
  );
}

function SkeletonKpiCard() {
  return (
    <Skeleton className="p-4">
      <SkeletonLine width="5rem" className="mb-2" />
      <div className="h-7 w-14 rounded" style={{ background: 'rgba(255,255,255,0.5)' }} />
    </Skeleton>
  );
}

function SkeletonMemberCard() {
  return (
    <div
      className="animate-pulse rounded-[18px] px-5 py-4"
      style={{ background: 'rgba(255,255,255,0.80)', border: '1px solid rgba(15,23,42,0.07)' }}
    >
      <div className="flex items-center gap-4">
        <div className="h-11 w-11 rounded-[12px]" style={{ background: 'rgba(15,23,42,0.06)' }} />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-32 rounded" style={{ background: 'rgba(15,23,42,0.06)' }} />
          <div className="h-3 w-24 rounded" style={{ background: 'rgba(15,23,42,0.06)' }} />
        </div>
      </div>
    </div>
  );
}

function SkeletonInsightCard() {
  return (
    <div
      className="animate-pulse rounded-[20px] p-5"
      style={{ background: 'rgba(255,255,255,0.60)', border: '1px solid rgba(15,23,42,0.07)' }}
    >
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-[10px]" style={{ background: 'rgba(15,23,42,0.06)' }} />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-40 rounded" style={{ background: 'rgba(15,23,42,0.06)' }} />
          <div className="h-3 w-full rounded" style={{ background: 'rgba(15,23,42,0.06)' }} />
          <div className="h-3 w-3/4 rounded" style={{ background: 'rgba(15,23,42,0.06)' }} />
        </div>
      </div>
    </div>
  );
}

function SkeletonChurnAlertCard() {
  return (
    <div
      className="animate-pulse rounded-[16px] p-4"
      style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.10)' }}
    >
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 rounded-[9px]" style={{ background: 'rgba(239,68,68,0.10)' }} />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-28 rounded" style={{ background: 'rgba(15,23,42,0.06)' }} />
          <div className="h-3 w-full rounded" style={{ background: 'rgba(15,23,42,0.06)' }} />
          <div className="h-3 w-2/3 rounded" style={{ background: 'rgba(15,23,42,0.06)' }} />
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   ERROR BANNER
──────────────────────────────────────────────────────────────────── */
function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      className="flex items-center gap-3 rounded-[12px] p-4"
      style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}
    >
      <XCircle size={16} style={{ color: '#ef4444' }} />
      <p className="flex-1 text-[13px] font-[500]" style={{ color: '#ef4444' }}>{message}</p>
      <PremiumButton size="sm" tone="danger" onClick={onRetry}>Retry</PremiumButton>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   PAGE
──────────────────────────────────────────────────────────────────── */
export default function RenewalsPage() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<RenewalStatus | 'all'>('all');

  const pipeline = useAsync(() => api.renewals.pipeline(), []);
  const churnAsync = useAsync(() => api.renewals.churnAlerts(), []);
  const insightsAsync = useAsync(() => api.renewals.insights(), []);

  const members: RenewalMember[] = useMemo(() => {
    if (!Array.isArray(pipeline.data?.members)) return [];
    return (pipeline.data.members as ApiRenewalMember[]).map(toRenewalMember);
  }, [pipeline.data]);

  const stats = pipeline.data?.stats ?? { expiring_today: 0, likely_to_renew: 0, high_value_at_risk: 0, auto_renewals: 0 };

  const churnAlerts: ChurnAlert[] = useMemo(() => {
    if (!Array.isArray(churnAsync.data)) return [];
    return (churnAsync.data as ApiChurnAlert[]).map(toChurnAlert);
  }, [churnAsync.data]);

  const aiInsights: AIInsight[] = useMemo(() => {
    const raw = insightsAsync.data?.insights;
    if (!Array.isArray(raw)) return [];
    return (raw as ApiInsight[]).map(toAIInsight);
  }, [insightsAsync.data]);

  const filtered = useMemo(() => {
    return members
      .filter(m => filterStatus === 'all' || m.status === filterStatus)
      .filter(m => !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.plan.toLowerCase().includes(search.toLowerCase()));
  }, [filterStatus, search, members]);

  const filterChips = [
    { id: 'all' as const, label: 'All Members' },
    { id: 'active' as const, label: 'Active' },
    { id: 'pending' as const, label: 'Pending' },
    { id: 'at-risk' as const, label: 'At Risk' },
    { id: 'expired' as const, label: 'Expired' },
  ];

  return (
    <Guard>
      <AppShell>
        <div className="min-h-screen" style={{ background: 'linear-gradient(145deg,#f8fafc 0%,#f1f5f9 50%,#fafafe 100%)' }}>
          {/* ── PAGE HEADER ── */}
          <div className="border-b" style={{ background: 'rgba(255,255,255,0.78)', backdropFilter: 'blur(20px)', borderColor: 'rgba(15,23,42,0.07)' }}>
            <div className="mx-auto max-w-screen-xl px-5 py-6 sm:px-8">
              {/* Breadcrumbs */}
              <div className="flex items-center gap-1.5 text-[11px] font-[500] mb-3" style={{ color: 'rgb(148,163,184)' }}>
                <span>Members</span>
                <ChevronRight size={10} />
                <span style={{ color: 'rgb(100,116,139)' }}>Renewals</span>
              </div>

              {/* Title row */}
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-[12px]" style={{ background: 'rgba(220,38,38,0.10)' }}>
                    <Calendar size={16} style={{ color: '#dc2626' }} />
                  </div>
                  <div>
                    <h1 className="text-[22px] font-[860] tracking-[-0.03em]" style={{ color: 'rgb(15,23,42)' }}>Renewals</h1>
                    <p className="mt-0.5 text-[13px]" style={{ color: 'rgb(148,163,184)' }}>Membership renewal intelligence center</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <PremiumButton tone="secondary" size="sm" icon={<Filter size={13} />}>Filter</PremiumButton>
                  <PremiumButton tone="primary" size="sm" icon={<UserPlus size={13} />}>Send Reminders</PremiumButton>
                </div>
              </div>

              {/* KPI Cards */}
              {pipeline.error && (
                <div className="mt-5">
                  <ErrorBanner message="Failed to load renewal KPIs" onRetry={pipeline.refetch} />
                </div>
              )}
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {pipeline.loading
                  ? [1, 2, 3, 4].map(i => <SkeletonKpiCard key={i} />)
                  : (
                    <>
                      <KpiCard label="Expiring Today" value={stats.expiring_today} icon={<Calendar size={16} />} accent="rose" delta={8.2} />
                      <KpiCard label="Likely to Renew" value={stats.likely_to_renew} icon={<TrendingUp size={16} />} accent="emerald" delta={12.5} />
                      <KpiCard label="High-Value at Risk" value={stats.high_value_at_risk} icon={<AlertTriangle size={16} />} accent="amber" delta={-5.1} deltaIs="bad" />
                      <KpiCard label="Auto-Renewals" value={stats.auto_renewals} icon={<RefreshCw size={16} />} accent="sky" delta={18.3} />
                    </>
                  )}
              </div>
            </div>
          </div>

          {/* ── MAIN CONTENT ── */}
          <div className="mx-auto max-w-screen-xl px-5 py-6 sm:px-8">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
              {/* LEFT COLUMN */}
              <div className="flex flex-col gap-5">
                {/* AI Insights */}
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <Sparkles size={13} style={{ color: '#8b5cf6' }} />
                    <p className="text-[12px] font-[720] uppercase tracking-[0.04em]" style={{ color: 'rgb(148,163,184)' }}>AI Retention Insights</p>
                  </div>
                  {insightsAsync.error && (
                    <div className="mb-3">
                      <ErrorBanner message="Failed to load AI insights" onRetry={insightsAsync.refetch} />
                    </div>
                  )}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {insightsAsync.loading
                      ? [1, 2].map(i => <SkeletonInsightCard key={i} />)
                      : aiInsights.length === 0
                        ? (
                          <div className="col-span-full">
                            <EmptyState
                              icon={<Sparkles size={20} />}
                              title="No insights yet"
                              description="AI insights will appear once member data is available."
                            />
                          </div>
                        )
                        : aiInsights.map((insight, i) => (
                          <AIInsightCard key={insight.id} {...insight} index={i} />
                        ))
                    }
                  </div>
                </div>

                {/* Renewal Members Timeline */}
                <div className="rounded-[22px] p-5"
                  style={{ background: 'rgba(255,255,255,0.82)', border: '1px solid rgba(255,255,255,0.95)', boxShadow: '0 2px 20px rgba(15,23,42,0.07)' }}>
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-[9px]" style={{ background: 'rgba(220,38,38,0.10)' }}>
                        <Users size={13} style={{ color: '#dc2626' }} />
                      </div>
                      <div>
                        <p className="text-[14px] font-[760]" style={{ color: 'rgb(15,23,42)' }}>Renewal Timeline</p>
                        <p className="text-[11.5px]" style={{ color: 'rgb(148,163,184)' }}>{filtered.length} members up for renewal</p>
                      </div>
                    </div>
                    <div className="relative flex items-center gap-2.5 rounded-[13px] px-3.5 py-2"
                      style={{ background: 'rgba(248,250,252,0.9)', border: '1px solid rgba(15,23,42,0.08)' }}>
                      <Search size={12} style={{ color: 'rgb(148,163,184)' }} />
                      <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search members…"
                        className="flex-1 bg-transparent text-[12px] font-[500] outline-none min-w-[120px]" style={{ color: 'rgb(15,23,42)' }} />
                    </div>
                  </div>

                  {/* Filter chips */}
                  <div className="mb-4 flex flex-wrap gap-1.5">
                    {filterChips.map(chip => (
                      <button key={chip.id}
                        onClick={() => setFilterStatus(chip.id)}
                        className="rounded-[9px] px-2.5 py-1.5 text-[11px] font-[660] transition-all"
                        style={{
                          background: filterStatus === chip.id ? 'rgba(220,38,38,0.10)' : 'rgba(15,23,42,0.04)',
                          color: filterStatus === chip.id ? '#dc2626' : 'rgb(100,116,139)',
                          border: filterStatus === chip.id ? '1px solid rgba(220,38,38,0.20)' : '1px solid transparent',
                        }}>
                        {chip.label}
                      </button>
                    ))}
                  </div>

                  {/* Members list */}
                  {pipeline.error && !pipeline.loading && (
                    <div className="mb-3">
                      <ErrorBanner message="Failed to load members" onRetry={pipeline.refetch} />
                    </div>
                  )}
                  <div className="flex flex-col gap-2.5">
                    {pipeline.loading && members.length === 0
                      ? [1, 2, 3, 4].map(i => <SkeletonMemberCard key={i} />)
                      : (
                        <AnimatePresence>
                          {filtered.length === 0 ? (
                            <EmptyState
                              icon={<Calendar size={20} />}
                              title="No members found"
                              description="No members match the current filter criteria."
                            />
                          ) : (
                            filtered.map((member, i) => (
                              <MemberRenewalCard key={member.id} member={member} index={i} />
                            ))
                          )}
                        </AnimatePresence>
                      )
                    }
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN */}
              <div className="flex flex-col gap-5">
                {/* Revenue Card */}
                <RevenueCard
                  label="Renewal Revenue At Risk"
                  value="₹59,998"
                  trend={-12.3}
                  subtitle="vs last month"
                  icon={<TrendingDown size={16} />}
                />

                {/* AI Churn Alerts */}
                <div className="rounded-[22px] p-5"
                  style={{ background: 'rgba(255,255,255,0.82)', border: '1px solid rgba(255,255,255,0.95)', boxShadow: '0 2px 20px rgba(15,23,42,0.07)' }}>
                  <div className="mb-4 flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-[9px]" style={{ background: 'rgba(239,68,68,0.10)' }}>
                      <AlertTriangle size={13} style={{ color: '#ef4444' }} />
                    </div>
                    <div>
                      <p className="text-[14px] font-[760]" style={{ color: 'rgb(15,23,42)' }}>Churn Alerts</p>
                      <p className="text-[11.5px]" style={{ color: 'rgb(148,163,184)' }}>AI-detected churn risks</p>
                    </div>
                  </div>
                  {churnAsync.error && (
                    <div className="mb-3">
                      <ErrorBanner message="Failed to load churn alerts" onRetry={churnAsync.refetch} />
                    </div>
                  )}
                  <div className="flex flex-col gap-2.5">
                    {churnAsync.loading
                      ? [1, 2, 3].map(i => <SkeletonChurnAlertCard key={i} />)
                      : churnAlerts.length === 0
                        ? (
                          <EmptyState
                            icon={<AlertTriangle size={20} />}
                            title="No alerts"
                            description="No churn risks detected at this time."
                          />
                        )
                        : churnAlerts.map((alert, i) => (
                          <ChurnAlertCard key={alert.id} alert={alert} index={i} />
                        ))
                    }
                  </div>
                </div>

                {/* Quick Stats */}
                <AnalyticsPanel
                  title="Renewal Analytics"
                  subtitle="30-day overview"
                  columns={2}
                  metrics={[
                    { label: 'Renewal Rate', value: '84%', trend: 6.2 },
                    { label: 'Avg Response Time', value: '4.2h', trend: -18.5 },
                    { label: 'Conversion', value: '72%', trend: 3.8 },
                    { label: 'At-Risk Value', value: '₹84.5K', trend: -8.1 },
                  ]}
                />
              </div>
            </div>
          </div>

          <style>{`
            @media (prefers-reduced-motion: reduce) {
              *, *::before, *::after { animation-duration:.01ms!important; transition-duration:.01ms!important }
            }
          `}</style>
        </div>
      </AppShell>
    </Guard>
  );
}
