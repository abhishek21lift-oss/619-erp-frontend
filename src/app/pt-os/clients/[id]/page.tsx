'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft, User, Phone, Mail, Calendar, Hash, Target,
  Dumbbell, Wallet, FileText, Activity, RefreshCw,
  CheckCircle, AlertTriangle, Clock, Award, IndianRupee,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { PremiumButton } from '@/components/premium/PremiumButton';
import { api } from '@/lib/api';

interface PtClientDetail {
  id: string; client_id?: string; name: string;
  email?: string; mobile?: string; gender?: string; dob?: string;
  address?: string; photo_url?: string;
  trainer_id?: string; trainer_name?: string;
  package_type?: string;
  base_amount: number; discount: number; final_amount: number;
  paid_amount: number; balance_amount: number;
  joining_date?: string; pt_start_date?: string; pt_end_date?: string;
  duration_months?: number; monthly_pt_amount: number;
  trainer_commission: number; weight?: number; notes?: string;
  status: string; days_left: number;
  due_status?: string;
}

function fmtINR(n: number | string | null | undefined) {
  return '₹' + Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function fmtDate(d?: string) {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function StatusBadge({ status, days_left }: { status: string; days_left: number | null }) {
  const styles: Record<string, { label: string; bg: string; fg: string }> = {
    active:  { label: 'Active',  bg: '#10b98118', fg: '#10b981' },
    expired: { label: 'Expired', bg: '#f43f5e18', fg: '#f43f5e' },
    frozen:  { label: 'Frozen',  bg: '#3b82f618', fg: '#3b82f6' },
  };
  let s = styles[status] || { label: status, bg: '#6b728018', fg: '#6b7280' };
  if (status === 'active' && days_left !== null && days_left <= 7)
    s = { label: 'Expiring', bg: '#dc262618', fg: '#dc2626' };
  return (
    <span className="text-[11px] font-bold uppercase tracking-[0.06em] px-2.5 py-1 rounded-[8px]"
      style={{ background: s.bg, color: s.fg }}>
      {s.label}
    </span>
  );
}

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-[14px] p-4 flex items-center gap-3"
      style={{ background: 'var(--bg-card)', border: '1px solid rgba(15,23,42,0.07)' }}>
      <div className="flex h-10 w-10 items-center justify-center rounded-[11px]"
        style={{ background: `${accent || '#dc2626'}14` }}>
        {icon}
      </div>
      <div>
        <p className="text-[11px] font-[600] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>{label}</p>
        <p className="text-[15px] font-[760]" style={{ color: accent || 'rgb(15,23,42)' }}>{value}</p>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2.5 border-b" style={{ borderColor: 'rgba(15,23,42,0.05)' }}>
      <span className="text-[12.5px] font-[500]" style={{ color: 'rgb(148,163,184)' }}>{label}</span>
      <span className="text-[12.5px] font-[650]" style={{ color: 'rgb(15,23,42)', textAlign: 'right' }}>{value}</span>
    </div>
  );
}

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-[18px] p-5" style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.95)', boxShadow: '0 2px 16px rgba(15,23,42,0.06)' }}>
      <div className="flex items-center gap-2.5 mb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-[9px]" style={{ background: 'rgba(220,38,38,0.10)' }}>
          {icon}
        </div>
        <h3 className="text-[14px] font-[700]" style={{ color: 'rgb(15,23,42)' }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-6 p-6">
      {[1,2,3].map(i => (
        <div key={i} className="rounded-[18px] p-5 h-40" style={{ background: 'var(--bg-card)' }} />
      ))}
    </div>
  );
}

export default function PtClientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [client, setClient] = useState<PtClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetch = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.pt.client(id);
      setClient((res as any)?.data ?? null);
    } catch (err: any) {
      setError(err?.message || 'Failed to load client');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, [id]);

  const DueBadge = ({ status }: { status?: string }) => {
    if (!status || status === 'CLEAR') return null;
    const cfg = status === 'OVERDUE'
      ? { label: 'OVERDUE', bg: '#dc262618', fg: '#dc2626', icon: <AlertTriangle size={12} /> }
      : { label: 'DUE', bg: '#f59e0b18', fg: '#f59e0b', icon: <Clock size={12} /> };
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[6px]"
        style={{ background: cfg.bg, color: cfg.fg }}>
        {cfg.icon}{cfg.label}
      </span>
    );
  };

  return (
    <Guard>
      <AppShell>
        <div className="min-h-screen" style={{ background: 'linear-gradient(145deg,#f8fafc 0%,#f1f5f9 50%,#fafafe 100%)' }}>
          {loading ? (
            <Skeleton />
          ) : error ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-[16px] mb-4" style={{ background: 'rgba(220,38,38,0.10)' }}>
                <RefreshCw size={22} style={{ color: '#dc2626' }} />
              </div>
              <p className="text-[14px]" style={{ color: 'rgb(148,163,184)' }}>{error}</p>
              <PremiumButton tone="primary" glow icon={<RefreshCw size={13} />} onClick={fetch} className="mt-4">Retry</PremiumButton>
            </div>
          ) : client ? (
            <div className="mx-auto max-w-screen-lg px-4 py-6 sm:px-6">
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <button onClick={() => router.back()}
                    className="flex h-9 w-9 items-center justify-center rounded-[10px] transition-colors hover:bg-white/80"
                    style={{ background: 'var(--bg-card)', border: '1px solid rgba(15,23,42,0.07)' }}>
                    <ArrowLeft size={16} style={{ color: 'rgb(71,85,105)' }} />
                  </button>
                  <div>
                    <div className="flex items-center gap-3">
                      <h1 className="text-[22px] font-[860] tracking-[-0.03em]" style={{ color: 'rgb(15,23,42)' }}>{client.name}</h1>
                      <StatusBadge status={client.status} days_left={client.days_left} />
                    </div>
                    <p className="text-[12px]" style={{ color: 'rgb(148,163,184)' }}>
                      {client.client_id || client.id.slice(0, 8)} · PT Client
                    </p>
                  </div>
                </div>
                <PremiumButton tone="secondary" icon={<ArrowLeft size={14} />} onClick={() => router.push('/pt-os/clients')}>
                  Back to Clients
                </PremiumButton>
              </div>

              {/* Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <StatCard icon={<Wallet size={18} style={{ color: '#dc2626' }} />}
                  label="Final Amount" value={fmtINR(client.final_amount)} />
                <StatCard icon={<CheckCircle size={18} style={{ color: '#10b981' }} />}
                  label="Paid" value={fmtINR(client.paid_amount)} accent="#10b981" />
                <StatCard icon={<AlertTriangle size={18} style={{ color: client.balance_amount > 0 ? '#f59e0b' : '#10b981' }} />}
                  label="Balance" value={fmtINR(client.balance_amount)}
                  accent={client.balance_amount > 0 ? '#f59e0b' : '#10b981'} />
                <StatCard icon={<Award size={18} style={{ color: '#8b5cf6' }} />}
                  label="Commission" value={fmtINR(client.trainer_commission)} accent="#8b5cf6" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Personal Info */}
                <SectionCard title="Personal Info" icon={<User size={16} style={{ color: '#dc2626' }} />}>
                  <InfoRow label="Gender" value={client.gender || '—'} />
                  <InfoRow label="DOB" value={fmtDate(client.dob)} />
                  <InfoRow label="Phone" value={client.mobile || '—'} />
                  <InfoRow label="Email" value={client.email || '—'} />
                  <InfoRow label="Weight" value={client.weight ? `${client.weight} kg` : '—'} />
                  <InfoRow label="Joined" value={fmtDate(client.joining_date)} />
                </SectionCard>

                {/* PT Assignment */}
                <SectionCard title="PT Assignment" icon={<Dumbbell size={16} style={{ color: '#dc2626' }} />}>
                  <InfoRow label="Trainer" value={client.trainer_name || '—'} />
                  <InfoRow label="Package" value={client.package_type || '—'} />
                  <InfoRow label="Start Date" value={fmtDate(client.pt_start_date)} />
                  <InfoRow label="End Date" value={fmtDate(client.pt_end_date)} />
                  <InfoRow label="Duration" value={client.duration_months ? `${client.duration_months} months` : '—'} />
                  <InfoRow label="Monthly PT Fee" value={fmtINR(client.monthly_pt_amount)} />
                  <InfoRow label="Days Left" value={client.days_left !== null ? `${client.days_left} days` : '—'} />
                </SectionCard>

                {/* Financial Details */}
                <SectionCard title="Financial Details" icon={<Wallet size={16} style={{ color: '#dc2626' }} />}>
                  <InfoRow label="Base Amount" value={fmtINR(client.base_amount)} />
                  <InfoRow label="Discount" value={client.discount ? `-${fmtINR(client.discount)}` : '—'} />
                  <InfoRow label="Final Amount" value={fmtINR(client.final_amount)} />
                  <InfoRow label="Paid Amount" value={fmtINR(client.paid_amount)} />
                  <div className="flex justify-between py-2.5">
                    <span className="text-[12.5px] font-[500]" style={{ color: 'rgb(148,163,184)' }}>Balance</span>
                    <span className="flex items-center gap-2 text-[12.5px] font-[650]"
                      style={{ color: client.balance_amount > 0 ? '#dc2626' : '#10b981' }}>
                      {fmtINR(client.balance_amount)}
                      {client.balance_amount > 0 && <DueBadge status={client.due_status} />}
                    </span>
                  </div>
                </SectionCard>

                {/* Notes */}
                <SectionCard title="Notes" icon={<FileText size={16} style={{ color: '#dc2626' }} />}>
                  {client.notes ? (
                    <p className="text-[13px] leading-relaxed" style={{ color: 'rgb(71,85,105)' }}>{client.notes}</p>
                  ) : (
                    <p className="text-[13px]" style={{ color: 'rgb(148,163,184)', fontStyle: 'italic' }}>No notes recorded</p>
                  )}
                </SectionCard>
              </div>

              {/* Quick Actions */}
              <div className="mt-8 flex flex-wrap gap-3">
                <PremiumButton tone="primary" glow icon={<Wallet size={14} />}
                  onClick={() => router.push(`/pt-os/clients/${client.id}/payments`)}>
                  Payments
                </PremiumButton>
                <PremiumButton tone="primary" glow icon={<Dumbbell size={14} />}
                  onClick={() => router.push(`/pt-os/workout-plans?client_id=${client.id}`)}>
                  Workout Plans
                </PremiumButton>
                <PremiumButton tone="primary" glow icon={<Activity size={14} />}
                  onClick={() => router.push(`/pt-os/assessment?client_id=${client.id}`)}>
                  Assessment
                </PremiumButton>
                <PremiumButton tone="primary" glow icon={<Target size={14} />}
                  onClick={() => router.push(`/pt-os/goals?client_id=${client.id}`)}>
                  Goals
                </PremiumButton>
              </div>
            </div>
          ) : null}
        </div>
      </AppShell>
    </Guard>
  );
}
