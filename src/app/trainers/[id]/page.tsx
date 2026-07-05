'use client';
import React, { use, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import Guard from '@/components/Guard';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import AppShell from '@/components/AppShell';
import { useAuth } from '@/lib/auth-context';
import {
  ArrowLeft, User, Phone, Mail, Edit2, Trash2, Users,
  MessageCircle, Award, Calendar, Dumbbell, CheckCircle,
  TrendingUp, DollarSign, AlertTriangle, Receipt,
  Sparkles, Activity, CreditCard,
} from 'lucide-react';
import { CopyId } from '@/components/ui/CopyId';
import { cn } from '@/components/ui/cn';
import { initialsAvatar } from '@/lib/avatar';

/* ── Types ───────────────────────────────────────────────────────────────── */
interface TrainerStats {
  total_clients: number;
  active_clients: number;
  expired_clients: number;
  total_dues: number;
  lifetime_revenue: number;
  month_revenue: number;
  month_incentive: number;
}

interface TrainerClient {
  id: number;
  client_id?: string;
  name: string;
  mobile?: string;
  package_type?: string;
  pt_end_date?: string;
  status: string;
  balance_amount?: number;
}

interface TrainerPayment {
  id: string;
  client_name: string;
  amount: number;
  method: string;
  date: string;
  receipt_no?: string;
  incentive_amt?: number;
}

interface MonthlyData { month: string; revenue: number; }

interface TrainerProfile {
  id: string;
  name: string;
  mobile?: string;
  email?: string;
  status: 'active' | 'inactive';
  joining_date?: string;
  specialization?: string;
  certifications?: string[];
  bio?: string;
  schedule?: string;
  role?: string;
  salary?: number;
  incentive_rate?: number;
  notes?: string;
  unique_id?: string;
  stats: TrainerStats;
  clients: TrainerClient[];
  payments: TrainerPayment[];
  monthly: MonthlyData[];
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */
const GRADIENTS = [
  'linear-gradient(135deg, #2563EB, #7C3AED)',
  'linear-gradient(135deg, #10B981, #06B6D4)',
  'linear-gradient(135deg, #F97316, #EC4899)',
  'linear-gradient(135deg, #7C3AED, #06B6D4)',
  'linear-gradient(135deg, #2563EB, #10B981)',
  'linear-gradient(135deg, #EC4899, #F97316)',
  'linear-gradient(135deg, #06B6D4, #7C3AED)',
  'linear-gradient(135deg, #F97316, #2563EB)',
];

function nameHash(name: string) {
  return [...(name || '?')].reduce((h, c) => ((h * 31 + c.charCodeAt(0)) | 0), 0);
}

function fmtINR(n: number | string | null | undefined) {
  const v = typeof n === 'string' ? parseFloat(n) : (n ?? 0);
  if (!Number.isFinite(v)) return '₹0';
  return '₹' + v.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function fmtDate(d?: string | null) {
  if (!d) return '—';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ── Sub-components ──────────────────────────────────────────────────────── */
function GlassPanel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(
      'rounded-[24px] border border-white/60 bg-white/70 backdrop-blur-xl',
      'shadow-[0_4px_24px_rgba(15,23,42,0.06)]',
      className,
    )}>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">{label}</span>
      <span className="text-[14px] font-medium text-[var(--text-primary)]">{value ?? '—'}</span>
    </div>
  );
}

const CLIENT_STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  active:   { bg: 'rgba(16,185,129,0.10)', color: '#10B981' },
  expired:  { bg: 'rgba(239,68,68,0.10)',  color: '#EF4444' },
  frozen:   { bg: 'rgba(59,130,246,0.10)', color: '#3B82F6' },
  pending:  { bg: 'rgba(245,158,11,0.10)', color: '#F59E0B' },
  inactive: { bg: 'rgba(100,116,139,0.08)', color: '#64748B' },
};

function ClientStatusBadge({ status }: { status: string }) {
  const s = CLIENT_STATUS_STYLES[status?.toLowerCase()] || CLIENT_STATUS_STYLES.inactive;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold capitalize"
      style={{ background: s.bg, color: s.color }}
    >
      {status}
    </span>
  );
}

const METHOD_STYLES: Record<string, { bg: string; color: string }> = {
  CASH: { bg: 'rgba(16,185,129,0.08)',  color: '#10B981' },
  UPI:  { bg: 'rgba(37,99,235,0.08)',   color: '#2563EB' },
  CARD: { bg: 'rgba(139,92,246,0.08)',  color: '#8B5CF6' },
  NEFT: { bg: 'rgba(6,182,212,0.08)',   color: '#06B6D4' },
  BANK: { bg: 'rgba(6,182,212,0.08)',   color: '#06B6D4' },
};

/* ── Main Page ───────────────────────────────────────────────────────────── */
export default function TrainerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  const [trainer, setTrainer] = useState<TrainerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'payments'>('overview');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const raw = await api.trainers.get(id) as any;
      setTrainer({
        ...raw,
        stats: raw.stats ?? {
          total_clients: 0, active_clients: 0, expired_clients: 0,
          total_dues: 0, lifetime_revenue: 0, month_revenue: 0, month_incentive: 0,
        },
        clients: Array.isArray(raw.clients) ? raw.clients : [],
        payments: Array.isArray(raw.payments) ? raw.payments : [],
        monthly: Array.isArray(raw.monthly) ? raw.monthly : [],
      });
    } catch (e: any) {
      setError(e.message || 'Failed to load trainer.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.trainers.delete(id);
      toast.success('Trainer removed');
      router.push('/trainers');
    } catch (e: any) {
      toast.error(`Failed: ${e.message}`);
      setDeleting(false);
    }
  }

  const isAdmin = user?.role === 'admin';
  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';

  const whatsappHref = () => {
    if (!trainer?.mobile) return '#';
    const n = trainer.mobile.replace(/\D/g, '');
    const num = n.startsWith('91') ? n : `91${n}`;
    return `https://wa.me/${num}?text=${encodeURIComponent(`Hi ${trainer.name}, this is a message from 619 Fitness Studio.`)}`;
  };

  /* Loading skeleton */
  if (loading) {
    return (
      <Guard roles={['admin', 'manager', 'trainer']}>
        <AppShell>
          <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
            <div className="h-10 w-32 rounded-[10px] bg-white/70 border border-white/60 animate-pulse mb-5" />
            <div className="h-52 rounded-[32px] bg-white/70 border border-white/60 animate-pulse mb-6" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 rounded-[20px] bg-white/70 border border-white/60 animate-pulse" />
              ))}
            </div>
            <div className="h-80 rounded-[24px] bg-white/70 border border-white/60 animate-pulse" />
          </div>
        </AppShell>
      </Guard>
    );
  }

  /* Error state */
  if (error || !trainer) {
    return (
      <Guard roles={['admin', 'manager', 'trainer']}>
        <AppShell>
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <div className="h-16 w-16 rounded-[20px] bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] flex items-center justify-center mb-4">
              <User size={28} className="text-[#EF4444]" />
            </div>
            <h2 className="text-[18px] font-bold text-[var(--text-primary)] mb-2">{error || 'Trainer not found'}</h2>
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-1.5 rounded-[12px] bg-[rgba(0,0,0,0.05)] border border-[rgba(0,0,0,0.08)] px-4 py-2 text-[12px] font-semibold text-[var(--text-muted)] hover:bg-[rgba(0,0,0,0.08)] transition-all"
            >
              <ArrowLeft size={13} /> Go back
            </button>
          </div>
        </AppShell>
      </Guard>
    );
  }

  const gradient = GRADIENTS[Math.abs(nameHash(trainer.name)) % GRADIENTS.length];
  const isActive = trainer.status === 'active';
  const incentivePct = Math.round(Number(trainer.incentive_rate ?? 0) * 100);

  const TABS = [
    { key: 'overview' as const, label: 'Overview' },
    { key: 'members' as const, label: `Members (${trainer.clients.length})` },
    { key: 'payments' as const, label: `Payments (${trainer.payments.length})` },
  ];

  return (
    <Guard roles={['admin', 'manager', 'trainer']}>
      <AppShell>
        <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">

          {/* ── Back ── */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <Link href="/trainers">
              <div className="inline-flex items-center gap-1.5 rounded-[10px] bg-white/70 border border-white/60 backdrop-blur-sm px-3 py-1.5 text-[11px] font-semibold text-[var(--text-muted)] hover:bg-white/90 transition-all mb-5 shadow-sm cursor-pointer">
                <ArrowLeft size={12} /> Back to Trainers
              </div>
            </Link>
          </motion.div>

          {/* ── Hero ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="relative overflow-hidden rounded-[32px] mb-6 p-[1px]"
            style={{ background: gradient.replace(')', ', 0.4)').replace('gradient(', 'gradient(') }}
          >
            <div className="relative rounded-[31px] p-6 sm:p-8 overflow-hidden" style={{ background: gradient }}>
              <div className="absolute top-[-20%] right-[-5%] w-64 h-64 rounded-full bg-white/[0.06] blur-[60px]" />
              <div className="absolute bottom-[-30%] left-[-10%] w-72 h-72 rounded-full bg-white/[0.04] blur-[80px]" />

              <div className="relative z-10 flex flex-col sm:flex-row sm:items-start gap-5">
                {/* Avatar */}
                <motion.div
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  className="relative flex h-[72px] w-[72px] sm:h-[80px] sm:w-[80px] shrink-0 items-center justify-center rounded-[20px] bg-white/20 text-[28px] font-extrabold text-white shadow-lg backdrop-blur-sm"
                >
                  {initialsAvatar(trainer.name)}
                  <span className={cn(
                    'absolute -top-1 -right-1 flex h-4 w-4',
                    isActive ? 'visible' : 'hidden'
                  )}>
                    <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-50" />
                    <span className="relative inline-flex h-4 w-4 rounded-full bg-emerald-500 border-2 border-white" />
                  </span>
                </motion.div>

                {/* Name + info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
                    <h1 className="text-[22px] sm:text-[26px] font-extrabold text-white tracking-[-0.02em] leading-tight">
                      {trainer.name}
                    </h1>
                    <span className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold',
                      isActive
                        ? 'bg-white/20 text-white ring-1 ring-white/30'
                        : 'bg-white/10 text-white/60 ring-1 ring-white/15',
                    )}>
                      <span className={cn('h-1.5 w-1.5 rounded-full', isActive ? 'bg-white' : 'bg-white/50')} />
                      {isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {(trainer.specialization || trainer.role) && (
                    <div className="flex items-center gap-1.5 text-[12px] text-white/70 mb-2">
                      <Dumbbell size={12} />
                      {trainer.specialization || trainer.role}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-4">
                    {trainer.mobile && (
                      <span className="flex items-center gap-1.5 text-[12px] text-white/65">
                        <Phone size={11} /> {trainer.mobile}
                      </span>
                    )}
                    {trainer.email && (
                      <span className="flex items-center gap-1.5 text-[12px] text-white/65">
                        <Mail size={11} /> {trainer.email}
                      </span>
                    )}
                    {trainer.joining_date && (
                      <span className="flex items-center gap-1.5 text-[12px] text-white/65">
                        <Calendar size={11} /> Joined {fmtDate(trainer.joining_date)}
                      </span>
                    )}
                  </div>

                  {trainer.unique_id && (
                    <div className="mt-2">
                      <CopyId id={trainer.unique_id} color="rgba(255,255,255,0.7)" />
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2 shrink-0">
                  {trainer.mobile && (
                    <a
                      href={whatsappHref()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-[12px] bg-white/15 backdrop-blur-sm px-3 py-2 text-[11px] font-bold text-white hover:bg-white/25 transition-all border border-white/20"
                    >
                      <MessageCircle size={13} /> WhatsApp
                    </a>
                  )}
                  {isAdminOrManager && (
                    <Link
                      href={`/trainers/${id}/edit`}
                      className="inline-flex items-center gap-1.5 rounded-[12px] bg-white/15 backdrop-blur-sm px-3 py-2 text-[11px] font-bold text-white hover:bg-white/25 transition-all border border-white/20"
                    >
                      <Edit2 size={13} /> Edit
                    </Link>
                  )}
                  {isAdmin && (
                    <button
                      onClick={() => setDeleteConfirm(true)}
                      className="inline-flex items-center gap-1.5 rounded-[12px] bg-[rgba(239,68,68,0.2)] backdrop-blur-sm px-3 py-2 text-[11px] font-bold text-white hover:bg-[rgba(239,68,68,0.35)] transition-all border border-[rgba(239,68,68,0.3)]"
                    >
                      <Trash2 size={13} /> Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* ── KPI Cards ── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
          >
            {[
              { label: 'Total Clients', value: trainer.stats.total_clients, icon: <Users size={16} />, color: '#2563EB', accent: 'rgba(37,99,235,0.08)', ring: 'rgba(37,99,235,0.12)' },
              { label: 'Active Clients', value: trainer.stats.active_clients, icon: <CheckCircle size={16} />, color: '#10B981', accent: 'rgba(16,185,129,0.08)', ring: 'rgba(16,185,129,0.12)' },
              { label: 'Month Revenue', value: fmtINR(trainer.stats.month_revenue), icon: <DollarSign size={16} />, color: '#8B5CF6', accent: 'rgba(139,92,246,0.08)', ring: 'rgba(139,92,246,0.12)' },
              { label: 'Month Incentive', value: fmtINR(trainer.stats.month_incentive), icon: <TrendingUp size={16} />, color: '#F97316', accent: 'rgba(249,115,22,0.08)', ring: 'rgba(249,115,22,0.12)' },
            ].map((card, i) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 + i * 0.05 }}
                className="rounded-[20px] p-4 border"
                style={{ background: card.accent, borderColor: card.ring }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-[10px]"
                    style={{ background: `${card.color}15`, color: card.color }}>
                    {card.icon}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--text-muted)]">{card.label}</span>
                </div>
                <p className="text-[22px] font-extrabold text-[var(--text-primary)] tabular-nums" style={{ color: card.color }}>
                  {card.value}
                </p>
              </motion.div>
            ))}
          </motion.div>

          {/* ── Tabs ── */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            <div className="inline-flex gap-1 mb-5 rounded-[14px] bg-white/70 border border-white/60 p-1 backdrop-blur-sm shadow-sm">
              {TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    'px-4 py-2 rounded-[10px] text-[12px] font-bold transition-all',
                    activeTab === tab.key
                      ? 'bg-gradient-to-r from-[#2563EB] to-[#7C3AED] text-white shadow-[0_2px_8px_rgba(37,99,235,0.3)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/50',
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </motion.div>

          {/* ── Overview Tab ── */}
          {activeTab === 'overview' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-5"
            >
              {/* Personal Details */}
              <GlassPanel className="p-6">
                <div className="flex items-center gap-2 mb-5">
                  <div className="h-7 w-7 rounded-[8px] bg-[rgba(37,99,235,0.1)] flex items-center justify-center">
                    <User size={14} className="text-[#2563EB]" />
                  </div>
                  <h3 className="text-[13px] font-bold text-[var(--text-primary)]">Personal Details</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <InfoRow label="Full Name" value={trainer.name} />
                  <InfoRow
                    label="Trainer ID"
                    value={trainer.unique_id
                      ? <CopyId id={trainer.unique_id} color="#f97316" />
                      : '—'}
                  />
                  <InfoRow label="Status" value={
                    <span className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold',
                      isActive
                        ? 'bg-[rgba(16,185,129,0.10)] text-[#10B981] ring-1 ring-[rgba(16,185,129,0.20)]'
                        : 'bg-[rgba(100,116,139,0.08)] text-[#64748B] ring-1 ring-[rgba(100,116,139,0.15)]',
                    )}>
                      <span className={cn('h-1.5 w-1.5 rounded-full', isActive ? 'bg-[#10B981]' : 'bg-[#64748B]')} />
                      {trainer.status}
                    </span>
                  } />
                  <InfoRow label="Phone" value={trainer.mobile} />
                  <InfoRow label="Email" value={trainer.email} />
                  <InfoRow label="Specialization" value={trainer.specialization} />
                  <InfoRow label="Role" value={trainer.role} />
                  <InfoRow label="Joined" value={fmtDate(trainer.joining_date)} />
                </div>
              </GlassPanel>

              {/* Revenue & Settings */}
              <GlassPanel className="p-6">
                <div className="flex items-center gap-2 mb-5">
                  <div className="h-7 w-7 rounded-[8px] bg-[rgba(139,92,246,0.1)] flex items-center justify-center">
                    <TrendingUp size={14} className="text-[#8B5CF6]" />
                  </div>
                  <h3 className="text-[13px] font-bold text-[var(--text-primary)]">Revenue & Settings</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <InfoRow label="Lifetime Revenue" value={
                    <span className="font-bold text-[#8B5CF6]">{fmtINR(trainer.stats.lifetime_revenue)}</span>
                  } />
                  <InfoRow label="Month Revenue" value={
                    <span className="font-bold text-[#10B981]">{fmtINR(trainer.stats.month_revenue)}</span>
                  } />
                  <InfoRow label="Incentive Rate" value={`${incentivePct}%`} />
                  <InfoRow label="Month Incentive" value={
                    <span className="font-bold text-[#F97316]">{fmtINR(trainer.stats.month_incentive)}</span>
                  } />
                  <InfoRow label="Total Clients" value={trainer.stats.total_clients} />
                  <InfoRow label="Active / Expired" value={`${trainer.stats.active_clients} / ${trainer.stats.expired_clients}`} />
                </div>

                {trainer.schedule && (
                  <div className="mt-5 pt-4 border-t border-[rgba(0,0,0,0.05)]">
                    <InfoRow label="Schedule / Timing" value={trainer.schedule} />
                  </div>
                )}
              </GlassPanel>

              {/* Certifications */}
              {trainer.certifications && trainer.certifications.length > 0 && (
                <GlassPanel className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-7 w-7 rounded-[8px] bg-[rgba(249,115,22,0.1)] flex items-center justify-center">
                      <Award size={14} className="text-[#F97316]" />
                    </div>
                    <h3 className="text-[13px] font-bold text-[var(--text-primary)]">Certifications</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {trainer.certifications.map((c, i) => (
                      <span key={i} className="inline-flex items-center rounded-full bg-[rgba(99,102,241,0.08)] px-3 py-1 text-[11px] font-semibold text-[#4F46E5] ring-1 ring-[rgba(99,102,241,0.15)]">
                        {c}
                      </span>
                    ))}
                  </div>
                </GlassPanel>
              )}

              {/* Bio */}
              {trainer.bio && (
                <GlassPanel className={cn('p-6', !trainer.certifications?.length && 'lg:col-span-2')}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-7 w-7 rounded-[8px] bg-[rgba(6,182,212,0.1)] flex items-center justify-center">
                      <Sparkles size={14} className="text-[#06B6D4]" />
                    </div>
                    <h3 className="text-[13px] font-bold text-[var(--text-primary)]">Bio</h3>
                  </div>
                  <p className="text-[13.5px] text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                    {trainer.bio}
                  </p>
                </GlassPanel>
              )}

              {/* Monthly revenue mini-chart */}
              {trainer.monthly.length > 0 && (
                <GlassPanel className="p-6 lg:col-span-2">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-[8px] bg-[rgba(37,99,235,0.1)] flex items-center justify-center">
                        <Activity size={14} className="text-[#2563EB]" />
                      </div>
                      <h3 className="text-[13px] font-bold text-[var(--text-primary)]">Revenue Trend (Last 6 Months)</h3>
                    </div>
                  </div>
                  <div className="flex items-end gap-3 h-28">
                    {(() => {
                      const maxVal = Math.max(...trainer.monthly.map(m => m.revenue), 1);
                      return trainer.monthly.map((m, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group/bar">
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${(m.revenue / maxVal) * 100}%` }}
                            transition={{ duration: 0.5, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                            className="w-full rounded-[6px] cursor-pointer relative"
                            style={{ background: 'linear-gradient(to top, #2563EB, #7C3AED)', minHeight: 4 }}
                          >
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#0B0B0F] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-[5px] opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap shadow-lg z-10">
                              {fmtINR(m.revenue)}
                            </div>
                          </motion.div>
                          <span className="text-[9px] font-semibold text-[var(--text-muted)]">{m.month}</span>
                        </div>
                      ));
                    })()}
                  </div>
                </GlassPanel>
              )}
            </motion.div>
          )}

          {/* ── Members Tab ── */}
          {activeTab === 'members' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <GlassPanel className="overflow-hidden">
                <div className="flex items-center justify-between p-5 pb-4 border-b border-[rgba(0,0,0,0.04)]">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-[8px] bg-[rgba(37,99,235,0.1)] flex items-center justify-center">
                      <Users size={14} className="text-[#2563EB]" />
                    </div>
                    <h3 className="text-[14px] font-bold text-[var(--text-primary)]">Assigned Clients</h3>
                    <span className="inline-flex items-center rounded-full bg-[rgba(37,99,235,0.08)] px-2 py-0.5 text-[10px] font-bold text-[#2563EB]">
                      {trainer.clients.length}
                    </span>
                  </div>
                </div>

                {trainer.clients.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 px-4">
                    <div className="h-14 w-14 rounded-[18px] bg-[rgba(37,99,235,0.08)] border border-[rgba(37,99,235,0.12)] flex items-center justify-center mb-3">
                      <Users size={24} className="text-[#2563EB]/40" strokeWidth={1.5} />
                    </div>
                    <p className="text-[14px] font-bold text-[var(--text-primary)] mb-1">No clients assigned</p>
                    <p className="text-[12px] text-[var(--text-muted)] text-center max-w-xs">
                      Assign clients to this trainer from the Members page.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-[rgba(0,0,0,0.04)]">
                          {['Name', 'Status', 'Plan', 'Expiry', 'Balance', 'Contact'].map(h => (
                            <th key={h} className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--text-muted)]">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {trainer.clients.map((c, i) => (
                          <motion.tr
                            key={c.id}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className="group border-b border-[rgba(0,0,0,0.03)] last:border-0 hover:bg-[rgba(37,99,235,0.02)] transition-colors cursor-pointer"
                            onClick={() => router.push(`/clients/${c.id}`)}
                          >
                            <td className="py-3 px-4 text-[13px] font-semibold text-[var(--text-primary)]">{c.name}</td>
                            <td className="py-3 px-4"><ClientStatusBadge status={c.status} /></td>
                            <td className="py-3 px-4 text-[12px] text-[var(--text-muted)]">{c.package_type ?? '—'}</td>
                            <td className="py-3 px-4 text-[12px] text-[var(--text-muted)]">{fmtDate(c.pt_end_date)}</td>
                            <td className="py-3 px-4 text-[12px] text-[var(--text-muted)]">
                              {c.balance_amount != null && Number(c.balance_amount) > 0
                                ? <span className="text-[#EF4444] font-semibold">{fmtINR(c.balance_amount)}</span>
                                : '—'}
                            </td>
                            <td className="py-3 px-4 text-[12px] text-[var(--text-muted)]">{c.mobile ?? '—'}</td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </GlassPanel>
            </motion.div>
          )}

          {/* ── Payments Tab ── */}
          {activeTab === 'payments' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <GlassPanel className="overflow-hidden">
                <div className="flex items-center justify-between p-5 pb-4 border-b border-[rgba(0,0,0,0.04)]">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-[8px] bg-[rgba(16,185,129,0.1)] flex items-center justify-center">
                      <Receipt size={14} className="text-[#10B981]" />
                    </div>
                    <h3 className="text-[14px] font-bold text-[var(--text-primary)]">Recent Payments</h3>
                    <span className="inline-flex items-center rounded-full bg-[rgba(16,185,129,0.08)] px-2 py-0.5 text-[10px] font-bold text-[#10B981]">
                      {trainer.payments.length}
                    </span>
                  </div>
                </div>

                {trainer.payments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 px-4">
                    <div className="h-14 w-14 rounded-[18px] bg-[rgba(16,185,129,0.08)] border border-[rgba(16,185,129,0.12)] flex items-center justify-center mb-3">
                      <CreditCard size={24} className="text-[#10B981]/40" strokeWidth={1.5} />
                    </div>
                    <p className="text-[14px] font-bold text-[var(--text-primary)] mb-1">No payments yet</p>
                    <p className="text-[12px] text-[var(--text-muted)] text-center max-w-xs">
                      Payments collected by this trainer will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-[rgba(0,0,0,0.04)]">
                          {['Client', 'Amount', 'Method', 'Incentive', 'Date', 'Receipt'].map(h => (
                            <th key={h} className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--text-muted)]">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {trainer.payments.map((p, i) => {
                          const ms = METHOD_STYLES[p.method] || { bg: 'rgba(100,116,139,0.08)', color: '#64748B' };
                          return (
                            <motion.tr
                              key={p.id}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.025 }}
                              className="border-b border-[rgba(0,0,0,0.03)] last:border-0 hover:bg-[rgba(16,185,129,0.02)] transition-colors"
                            >
                              <td className="py-3 px-4 text-[13px] font-semibold text-[var(--text-primary)]">{p.client_name}</td>
                              <td className="py-3 px-4 text-[13px] font-bold text-[#10B981]">{fmtINR(p.amount)}</td>
                              <td className="py-3 px-4">
                                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold"
                                  style={{ background: ms.bg, color: ms.color }}>
                                  {p.method}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-[12px] text-[#F97316] font-semibold">
                                {p.incentive_amt ? fmtINR(p.incentive_amt) : '—'}
                              </td>
                              <td className="py-3 px-4 text-[12px] text-[var(--text-muted)]">{fmtDate(p.date)}</td>
                              <td className="py-3 px-4 text-[11px] text-[var(--text-muted)] font-mono">{p.receipt_no ?? '—'}</td>
                            </motion.tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </GlassPanel>
            </motion.div>
          )}

          {/* ── Delete Modal ── */}
          <AnimatePresence>
            {deleteConfirm && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
                style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
                onClick={() => setDeleteConfirm(false)}
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0, y: 10 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="w-full max-w-[420px] rounded-[22px] bg-white border border-[rgba(0,0,0,0.07)] p-7 shadow-[0_24px_80px_rgba(0,0,0,0.15)]"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-[12px] bg-[rgba(239,68,68,0.1)] flex items-center justify-center">
                      <AlertTriangle size={18} className="text-[#DC2626]" />
                    </div>
                    <h3 className="text-[16px] font-bold text-[#111827]">Remove Trainer</h3>
                  </div>
                  <p className="text-[13px] text-[#6B7280] leading-relaxed mb-6">
                    Remove <strong className="text-[#111827]">{trainer.name}</strong>? Their{' '}
                    {trainer.clients.length} assigned client{trainer.clients.length !== 1 ? 's' : ''} will become unassigned.
                  </p>
                  <div className="flex gap-2.5 justify-end">
                    <button
                      onClick={() => setDeleteConfirm(false)}
                      className="px-4 py-2 rounded-[10px] border border-[#D1D5DB] bg-[#F9FAFB] text-[12px] font-600 text-[#374151] hover:bg-[#F3F4F6] transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="px-4 py-2 rounded-[10px] text-[12px] font-bold text-white transition-all cursor-pointer disabled:opacity-60"
                      style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)', boxShadow: '0 4px 16px rgba(239,68,68,0.25)' }}
                    >
                      {deleting ? 'Removing…' : 'Remove trainer'}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </AppShell>
    </Guard>
  );
}
