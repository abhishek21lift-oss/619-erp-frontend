'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CopyId } from '@/components/ui/CopyId';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, User, Phone, Mail, Calendar, Hash, Target,
  Dumbbell, Wallet, FileText, Activity, RefreshCw,
  CheckCircle, AlertTriangle, Clock, Award, IndianRupee,
  Camera, Ruler, Zap, Repeat, ChevronRight,
  TrendingUp, MessageCircle, Save, Trash2, Pencil,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { PremiumButton } from '@/components/premium/PremiumButton';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';

interface PtClientDetail {
  id: string; unique_id?: string; client_id?: string; name: string;
  email?: string; mobile?: string; gender?: string; dob?: string;
  address?: string; photo_url?: string;
  emergency_contact?: string;
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

interface TimelineEvent {
  id: string;
  type: 'payment' | 'checkin' | 'session' | 'measurement' | 'goal' | 'strength' | 'photo';
  title: string;
  subtitle: string;
  date: string;
  icon: React.ReactNode;
  color: string;
  value?: string;
}

const fmtINR = (n: number | string | null | undefined) =>
  '₹' + Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

const fmtDate = (d?: string) => {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

function StatusBadge({ status, days_left, pt_end_date }: { status: string; days_left: number | null; pt_end_date?: string }) {
  const s = (() => {
    const endPassed = pt_end_date ? new Date(pt_end_date) < new Date() : (days_left !== null && days_left <= 0);
    if (endPassed)
      return { label: 'Inactive', bg: '#6b728018', fg: '#6b7280' };
    if (status === 'active' && days_left !== null && days_left <= 7)
      return { label: 'Expiring', bg: '#dc262618', fg: '#dc2626' };
    if (status === 'active') return { label: 'Active', bg: '#10b98118', fg: '#10b981' };
    if (status === 'expired' || status === 'inactive')
      return { label: 'Inactive', bg: '#6b728018', fg: '#6b7280' };
    if (status === 'frozen') return { label: 'Frozen', bg: '#3b82f618', fg: '#3b82f6' };
    return { label: status, bg: '#6b728018', fg: '#6b7280' };
  })();
  return (
    <span className="text-[11px] font-bold uppercase tracking-[0.06em] px-2.5 py-1 rounded-[8px]"
      style={{ background: s.bg, color: s.fg }}>
      {s.label}
    </span>
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

function SectionCard({ title, icon, children, accent }: { title: string; icon: React.ReactNode; children: React.ReactNode; accent?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-[18px] p-5"
      style={{
        background: 'rgba(255,255,255,0.7)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.8)',
        boxShadow: '0 2px 20px rgba(15,23,42,0.06)',
      }}>
      <div className="flex items-center gap-2.5 mb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-[9px]"
          style={{ background: `${accent || '#dc2626'}14` }}>
          {icon}
        </div>
        <h3 className="text-[14px] font-[700]" style={{ color: 'rgb(15,23,42)' }}>{title}</h3>
      </div>
      {children}
    </motion.div>
  );
}

export default function PtClientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const [client, setClient] = useState<PtClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [recentCheckins, setRecentCheckins] = useState<any[]>([]);
  const [recentWeights, setRecentWeights] = useState<any[]>([]);
  const [activeGoals, setActiveGoals] = useState<any[]>([]);
  const [editNotes, setEditNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');
  const [totalEarnedCommission, setTotalEarnedCommission] = useState(0);
  const [renewalHistory, setRenewalHistory] = useState<any[]>([]);

  const fetch = async () => {
    try {
      setLoading(true);
      setError('');

      // Essential: client data must succeed or we show error
      const clientRes = await api.pt.client(id);
      const c = (clientRes as any)?.data ?? null;
      if (!c) { setError('Client not found'); setLoading(false); return; }
      setClient(c);
      setNotesDraft(c?.notes || '');

      // Secondary: load in parallel, failures are silently ignored
      const [checkinsRes, assessmentsRes, goalsRes, paymentsRes, renewalsRes] = await Promise.allSettled([
        api.progress.weeklyCheckins.list({ client_id: id, limit: 5 }),
        api.progress.assessments.list({ client_id: id, limit: 10 }),
        api.progress.goals.list({ client_id: id }),
        api.pt.payments({ client_id: id }),
        api.clients.renewalHistory(id),
      ]);

      const checkins = checkinsRes.status === 'fulfilled' && Array.isArray((checkinsRes.value as any)?.data) ? (checkinsRes.value as any).data : [];
      setRecentCheckins(checkins);

      const assessments = assessmentsRes.status === 'fulfilled' && Array.isArray((assessmentsRes.value as any)?.data) ? (assessmentsRes.value as any).data : [];
      setRecentWeights(assessments.filter((a: any) => a.weight).slice(0, 5));

      const goals = goalsRes.status === 'fulfilled' && Array.isArray((goalsRes.value as any)?.data) ? (goalsRes.value as any).data : [];
      setActiveGoals(goals.filter((g: any) => g.status === 'active'));

      const rawPayments = paymentsRes.status === 'fulfilled' && Array.isArray((paymentsRes.value as any)?.data) ? (paymentsRes.value as any).data : [];
      setTotalEarnedCommission(rawPayments.reduce((sum: number, p: any) => sum + Number(p.incentive_amt || 0), 0));

      const renewals = renewalsRes.status === 'fulfilled' && Array.isArray((renewalsRes.value as any)?.data) ? (renewalsRes.value as any).data : [];
      setRenewalHistory(renewals);

      const events: TimelineEvent[] = [];

      checkins.forEach((ch: any) => {
        events.push({
          id: `ch-${ch.id}`,
          type: 'checkin',
          title: `Weekly Check-in`,
          subtitle: `Adherence: ${ch.adherence || ch.workout_adherence || '—'}% · Weight: ${ch.weight || '—'}`,
          date: ch.week_start_date || ch.created_at,
          icon: <Activity size={13} />,
          color: '#10b981',
        });
      });

      rawPayments.forEach((p: any) => {
        events.push({
          id: `pmt-${p.id}`,
          type: 'payment',
          title: `Payment of ${fmtINR(p.amount)}`,
          subtitle: `${p.payment_method || p.method || '—'} · ${p.notes || ''}`,
          date: p.date || p.created_at,
          icon: <Wallet size={13} />,
          color: '#8b5cf6',
          value: fmtINR(p.amount),
        });
      });

      assessments.forEach((a: any) => {
        events.push({
          id: `meas-${a.id}`,
          type: 'measurement',
          title: a.weight ? `Weight: ${a.weight} kg` : 'Assessment recorded',
          subtitle: a.body_fat ? `Body Fat: ${a.body_fat}% · ${a.assessment_type || 'check-in'}` : a.assessment_type || 'check-in',
          date: a.created_at || a.assessment_date,
          icon: <Ruler size={13} />,
          color: '#f59e0b',
          value: a.weight ? `${a.weight} kg` : undefined,
        });
      });

      goals.filter((g: any) => g.status === 'active').forEach((g: any) => {
        events.push({
          id: `goal-${g.id}`,
          type: 'goal',
          title: `Goal: ${g.goal_type || g.type || 'Fitness'}`,
          subtitle: g.target_weight ? `Target: ${g.target_weight} kg` : g.target_body_fat ? `Target BF: ${g.target_body_fat}%` : 'Active',
          date: g.created_at,
          icon: <Target size={13} />,
          color: '#3b82f6',
        });
      });

      events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTimeline(events.slice(0, 10));
    } catch (err: any) {
      setError(err?.message || 'Failed to load client');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotes = async () => {
    try {
      await api.clients.update(id, { notes: notesDraft });
      setEditNotes(false);
      setClient(prev => prev ? { ...prev, notes: notesDraft } : prev);
    } catch { toast.error('Failed to save notes'); }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await api.pt.deleteClient(id);
      router.push('/pt-os/clients');
    } catch { toast.error('Failed to delete client'); setDeleting(false); }
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

  const whatsappHref = (phone?: string, name?: string) => {
    const p = (phone ?? '').replace(/\D/g, '');
    if (!p) return '#';
    const num = p.startsWith('91') ? p : `91${p}`;
    return `https://wa.me/${num}?text=${encodeURIComponent(`Hi ${name ?? 'there'}, this is your trainer from 619 Fitness Studio.`)}`;
  };

  const initials = (name: string) =>
    name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  const avatarColors = ['#dc2626', '#7c3aed', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899'];
  const avatarColor = (name: string) => {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0;
    return avatarColors[Math.abs(h) % avatarColors.length];
  };

  const completionPct = client
    ? Math.min(Math.round((client.paid_amount / Math.max(client.final_amount, 1)) * 100), 100)
    : 0;

  return (
    <Guard>
      <AppShell>
        <div className="min-h-screen" style={{ background: 'linear-gradient(145deg,#f8fafc 0%,#f1f5f9 50%,#fafafe 100%)' }}>
          {loading ? (
            <div className="animate-pulse space-y-6 p-6 max-w-screen-lg mx-auto">
              <div className="rounded-[22px] h-48" style={{ background: 'linear-gradient(135deg,#0f172a,#1e293b)' }} />
              {[1,2,3].map(i => (
                <div key={i} className="rounded-[18px] p-5 h-32" style={{ background: 'rgba(255,255,255,0.7)' }} />
              ))}
            </div>
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

              {/* ── Dark Gradient Hero ── */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                style={{
                  position: 'relative', overflow: 'hidden', borderRadius: 24,
                  background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                  padding: '32px 36px', marginBottom: 24,
                  boxShadow: '0 8px 32px rgba(15,23,42,0.35)',
                }}>
                <motion.div style={{ position: 'absolute', top: -60, right: -30, width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.2), transparent 70%)', pointerEvents: 'none' }}
                  animate={{ x: [0, 20, -15, 0], y: [0, -30, 15, 0] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }} />
                <motion.div style={{ position: 'absolute', bottom: -40, left: '20%', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.15), transparent 70%)', pointerEvents: 'none' }}
                  animate={{ x: [0, -25, 30, 0], y: [0, 20, -15, 0] }} transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }} />

                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div className="flex items-center gap-2 mb-4">
                    <button onClick={() => router.back()}
                      className="flex h-8 w-8 items-center justify-center rounded-[9px] transition-all hover:bg-white/10"
                      style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <ArrowLeft size={14} style={{ color: 'rgba(255,255,255,0.7)' }} />
                    </button>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Client Profile</span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[18px] text-[26px] font-[800] text-white"
                      style={{ background: `linear-gradient(135deg, ${avatarColor(client.name)}, ${avatarColor(client.name.split('').reverse().join(''))})`, boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
                      {initials(client.name)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-[26px] font-[860] tracking-[-0.03em]" style={{ color: '#ffffff' }}>{client.name}</h1>
                        <StatusBadge status={client.status} days_left={client.days_left} pt_end_date={client.pt_end_date} />
                      </div>
                      <p className="mt-1 text-[13px] flex items-center gap-2 flex-wrap" style={{ color: 'rgba(255,255,255,0.5)' }}>
                        <CopyId id={client.unique_id || client.client_id || client.id.slice(0, 8)} color="rgba(255,255,255,0.7)" />
                        <span>· PT Client{client.trainer_name ? ` · Trained by ${client.trainer_name}` : ''}</span>
                      </p>
                      <div className="flex flex-wrap gap-3 mt-3">
                        {client.mobile && (
                          <a href={whatsappHref(client.mobile, client.name)} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-[11px] font-[600] transition-all hover:bg-white/15"
                            style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <MessageCircle size={12} /> WhatsApp
                          </a>
                        )}
                        {client.email && (
                          <a href={`mailto:${client.email}`}
                            className="inline-flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-[11px] font-[600] transition-all hover:bg-white/15"
                            style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <Mail size={12} /> Email
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <PremiumButton tone="ghost" size="sm" icon={<Pencil size={13} />} onClick={() => router.push(`/pt-os/clients/${id}/edit`)}>
                        Edit
                      </PremiumButton>
                      <PremiumButton tone="success" glow size="sm" icon={<Repeat size={13} />} onClick={() => router.push(`/pt-os/clients/${id}/renew`)}>
                        Renew PT
                      </PremiumButton>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* ── Progress Dashboard ── */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                  style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)', borderRadius: 16, padding: '16px 18px', border: '1px solid rgba(255,255,255,0.7)', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <Wallet size={14} style={{ color: '#dc2626' }} />
                    <span className="text-[10px] font-[700] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>Final Amount</span>
                  </div>
                  <p className="text-[20px] font-[800]" style={{ color: 'rgb(15,23,42)' }}>{fmtINR(client.final_amount)}</p>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                  style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)', borderRadius: 16, padding: '16px 18px', border: '1px solid rgba(255,255,255,0.7)', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle size={14} style={{ color: '#10b981' }} />
                    <span className="text-[10px] font-[700] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>Paid</span>
                  </div>
                  <p className="text-[20px] font-[800]" style={{ color: '#10b981' }}>{fmtINR(client.paid_amount)}</p>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                  style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)', borderRadius: 16, padding: '16px 18px', border: '1px solid rgba(255,255,255,0.7)', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle size={14} style={{ color: client.balance_amount > 0 ? '#f59e0b' : '#10b981' }} />
                    <span className="text-[10px] font-[700] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>Balance</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-[20px] font-[800]" style={{ color: client.balance_amount > 0 ? '#f59e0b' : '#10b981' }}>{fmtINR(client.balance_amount)}</p>
                    <DueBadge status={client.due_status} />
                  </div>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                  style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)', borderRadius: 16, padding: '16px 18px', border: '1px solid rgba(255,255,255,0.7)', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <Award size={14} style={{ color: '#8b5cf6' }} />
                    <span className="text-[10px] font-[700] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>Commission</span>
                  </div>
                  <p className="text-[20px] font-[800]" style={{ color: '#8b5cf6' }}>{fmtINR(client.trainer_commission)}</p>
                  <p className="text-[10px] font-[600]" style={{ color: 'rgb(148,163,184)' }}>
                    {fmtINR(totalEarnedCommission)} earned from payments
                  </p>
                </motion.div>
              </div>

              {/* ── Progress Bars ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-[16px] p-4"
                  style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.7)', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-[700] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>Payment Progress</span>
                    <span className="text-[12px] font-[700]" style={{ color: '#10b981' }}>{completionPct}%</span>
                  </div>
                  <div className="h-2 rounded-full" style={{ background: 'rgba(15,23,42,0.06)' }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${completionPct}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{ background: 'linear-gradient(90deg, #10b981, #34d399)' }} />
                  </div>
                  <div className="flex justify-between mt-1.5">
                    <span className="text-[11px]" style={{ color: 'rgb(148,163,184)' }}>Paid: {fmtINR(client.paid_amount)}</span>
                    <span className="text-[11px]" style={{ color: 'rgb(148,163,184)' }}>Total: {fmtINR(client.final_amount)}</span>
                  </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-[16px] p-4"
                  style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.7)', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-[700] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>PT Duration</span>
                    <span className="text-[12px] font-[700]" style={{ color: client.days_left <= 7 && client.days_left >= 0 ? '#dc2626' : '#6366f1' }}>
                      {client.days_left !== null ? `${client.days_left} days left` : '—'}
                    </span>
                  </div>
                  <div className="h-2 rounded-full" style={{ background: 'rgba(15,23,42,0.06)' }}>
                    {client.duration_months && client.pt_start_date && client.pt_end_date ? (
                      (() => {
                        const start = new Date(client.pt_start_date!).getTime();
                        const end = new Date(client.pt_end_date!).getTime();
                        const now = Date.now();
                        const progress = Math.min(Math.max(((now - start) / (end - start)) * 100, 0), 100);
                        return (
                          <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                            className="h-full rounded-full"
                            style={{ background: 'linear-gradient(90deg, #6366f1, #8b5cf6)' }} />
                        );
                      })()
                    ) : null}
                  </div>
                  <div className="flex justify-between mt-1.5">
                    <span className="text-[11px]" style={{ color: 'rgb(148,163,184)' }}>Start: {fmtDate(client.pt_start_date)}</span>
                    <span className="text-[11px]" style={{ color: 'rgb(148,163,184)' }}>End: {fmtDate(client.pt_end_date)}</span>
                  </div>
                </motion.div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  {/* ── Activity Timeline ── */}
                  <SectionCard title="Recent Activity" icon={<Activity size={16} />} accent="#6366f1">
                    {timeline.length === 0 ? (
                      <p className="text-[13px]" style={{ color: 'rgb(148,163,184)', fontStyle: 'italic' }}>No recent activity</p>
                    ) : (
                      <div className="space-y-0">
                        {timeline.map((event, i) => (
                          <motion.div key={event.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                            className="relative flex gap-3 pb-4 pl-6 last:pb-0">
                            <div className="absolute left-0 top-1 flex flex-col items-center">
                              <div className="flex h-5 w-5 items-center justify-center rounded-full" style={{ background: `${event.color}18` }}>
                                <span style={{ color: event.color }}>{event.icon}</span>
                              </div>
                              {i < timeline.length - 1 && <div className="mt-1 w-px flex-1" style={{ background: 'rgba(15,23,42,0.06)' }} />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-[12.5px] font-[640]" style={{ color: 'rgb(15,23,42)' }}>{event.title}</p>
                                <span className="text-[10px] whitespace-nowrap" style={{ color: 'rgb(148,163,184)' }}>{fmtDate(event.date)}</span>
                              </div>
                              {event.subtitle && <p className="text-[11.5px] mt-0.5" style={{ color: 'rgb(148,163,184)' }}>{event.subtitle}</p>}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </SectionCard>

                  {/* ── Personal Info ── */}
                  <SectionCard title="Personal Info" icon={<User size={16} />}>
                    <InfoRow label="Gender" value={client.gender || '—'} />
                    <InfoRow label="DOB" value={fmtDate(client.dob)} />
                    <InfoRow label="Phone" value={client.mobile || '—'} />
                    <InfoRow label="Email" value={client.email || '—'} />
                    <InfoRow label="Weight" value={client.weight ? `${client.weight} kg` : '—'} />
                    <InfoRow label="Joined" value={fmtDate(client.joining_date)} />
                  </SectionCard>

                  {/* ── Assessent & Health History - mini weight trend ── */}
                  {recentWeights.length >= 2 && (
                    <SectionCard title="Weight Trend" icon={<TrendingUp size={16} />} accent="#10b981">
                      <div className="flex items-end gap-2 h-24 pt-2">
                        {recentWeights.slice(0, 6).map((a: any, i: number) => {
                          const maxW = Math.max(...recentWeights.map((w: any) => Number(w.weight)));
                          const barH = (Number(a.weight) / maxW) * 80;
                          return (
                            <div key={i} className="flex-1 flex flex-col items-center gap-1">
                              <motion.div initial={{ height: 0 }} animate={{ height: barH }} transition={{ duration: 0.5, delay: i * 0.05 }}
                                className="w-full rounded-[4px]"
                                style={{ background: 'linear-gradient(180deg, #10b981, #34d399)', minHeight: 4 }} />
                              <span className="text-[9px] font-[600]" style={{ color: 'rgb(148,163,184)' }}>
                                {a.weight}
                              </span>
                              <span className="text-[8px]" style={{ color: 'rgb(203,213,225)' }}>
                                {fmtDate(a.created_at || a.assessment_date).slice(0, 5)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </SectionCard>
                  )}

                  {/* ── Goals ── */}
                  {activeGoals.length > 0 && (
                    <SectionCard title="Active Goals" icon={<Target size={16} />} accent="#3b82f6">
                      <div className="space-y-3">
                        {activeGoals.slice(0, 3).map((g: any) => (
                          <div key={g.id} className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'rgba(15,23,42,0.04)' }}>
                            <div>
                              <p className="text-[13px] font-[600]" style={{ color: 'rgb(15,23,42)' }}>{g.goal_type || g.type || 'Goal'}</p>
                              <p className="text-[11px]" style={{ color: 'rgb(148,163,184)' }}>
                                {g.target_weight ? `Target: ${g.target_weight} kg` : ''}
                                {g.target_body_fat ? ` · BF: ${g.target_body_fat}%` : ''}
                              </p>
                            </div>
                            <button onClick={() => router.push(`/pt-os/goals?client_id=${client.id}`)}
                              className="text-[11px] font-[600] px-3 py-1.5 rounded-[8px] transition hover:opacity-70"
                              style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>
                              View
                            </button>
                          </div>
                        ))}
                      </div>
                    </SectionCard>
                  )}
                </div>

                <div className="space-y-6">
                  {/* ── PT Assignment ── */}
                  <SectionCard title="PT Assignment" icon={<Dumbbell size={16} />}>
                    <InfoRow label="Trainer" value={client.trainer_name || '—'} />
                    <InfoRow label="Plan" value={client.package_type || '—'} />
                    <InfoRow label="Start Date" value={fmtDate(client.pt_start_date)} />
                    <InfoRow label="End Date" value={fmtDate(client.pt_end_date)} />
                    <InfoRow label="Duration" value={client.duration_months ? `${client.duration_months} months` : '—'} />
                    <InfoRow label="Monthly PT Fee" value={fmtINR(client.monthly_pt_amount)} />
                    <InfoRow label="Days Left" value={client.days_left !== null ? `${client.days_left} days` : '—'} />
                  </SectionCard>

                  {/* ── Financial Details ── */}
                  <SectionCard title="Financial Details" icon={<Wallet size={16} />}>
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

                  {/* ── Notes (editable) ── */}
                  <SectionCard title="Notes" icon={<FileText size={16} />}>
                    {editNotes ? (
                      <div className="space-y-3">
                        <textarea value={notesDraft} onChange={(e) => setNotesDraft(e.target.value)}
                          rows={4}
                          className="w-full rounded-[12px] border border-zinc-200 bg-white/80 px-3.5 py-2.5 text-[13px] outline-none transition-all focus:border-[rgba(99,102,241,0.4)]"
                          style={{ color: 'rgb(15,23,42)', resize: 'none' }}
                          placeholder="Add notes about this client..." />
                        <div className="flex gap-2">
                          <PremiumButton tone="primary" size="sm" icon={<Save size={12} />} onClick={handleSaveNotes}>Save</PremiumButton>
                          <PremiumButton tone="ghost" size="sm" onClick={() => { setEditNotes(false); setNotesDraft(client.notes || ''); }}>Cancel</PremiumButton>
                        </div>
                      </div>
                    ) : (
                      <div onClick={() => setEditNotes(true)} className="cursor-pointer group">
                        {client.notes ? (
                          <p className="text-[13px] leading-relaxed" style={{ color: 'rgb(71,85,105)' }}>{client.notes}</p>
                        ) : (
                          <p className="text-[13px]" style={{ color: 'rgb(148,163,184)', fontStyle: 'italic' }}>
                            <span className="group-hover:hidden">No notes recorded</span>
                            <span className="hidden group-hover:inline" style={{ color: '#6366f1', fontStyle: 'normal' }}>Click to add notes...</span>
                          </p>
                        )}
                      </div>
                    )}
                  </SectionCard>

                  {/* ── Session Balance Summary ── */}
                  <SectionCard title="Session Balance" icon={<Calendar size={16} />} accent="#f59e0b">
                    <button onClick={() => router.push(`/pt-os/session-balance?client_id=${client.id}`)}
                      className="flex items-center justify-between w-full py-2 px-3 rounded-[10px] transition hover:bg-zinc-50"
                      style={{ background: 'rgba(245,158,11,0.06)' }}>
                      <div>
                        <p className="text-[13px] font-[600]" style={{ color: 'rgb(15,23,42)' }}>View Session Packages</p>
                        <p className="text-[11px]" style={{ color: 'rgb(148,163,184)' }}>Check remaining sessions &amp; validity</p>
                      </div>
                      <ChevronRight size={14} style={{ color: 'rgb(148,163,184)' }} />
                    </button>
                  </SectionCard>
                </div>
              </div>

              {/* ── Quick Actions ── */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                className="mt-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {[
                  { label: 'Payments', icon: <Wallet size={15} />, href: `/pt-os/clients/${client.id}/payments`, color: '#8b5cf6' },
                  { label: 'Workout Plans', icon: <Dumbbell size={15} />, href: `/pt-os/workout-plans?client_id=${client.id}`, color: '#dc2626' },
                  { label: 'Assessment', icon: <Activity size={15} />, href: `/pt-os/assessment?client_id=${client.id}`, color: '#10b981' },
                  { label: 'Goals', icon: <Target size={15} />, href: `/pt-os/goals?client_id=${client.id}`, color: '#3b82f6' },
                  { label: 'Measurements', icon: <Ruler size={15} />, href: `/pt-os/measurements?client_id=${client.id}`, color: '#f59e0b' },
                  { label: 'Photos', icon: <Camera size={15} />, href: `/pt-os/progress-photos?client_id=${client.id}`, color: '#ec4899' },
                  { label: 'Strength', icon: <Zap size={15} />, href: `/pt-os/strength-tracking?client_id=${client.id}`, color: '#6366f1' },
                  { label: 'Check-in', icon: <Activity size={15} />, href: `/pt-os/weekly-checkin?client_id=${client.id}`, color: '#14b8a6' },
                  { label: 'Diet Plans', icon: <FileText size={15} />, href: `/pt-os/diet-plans?client_id=${client.id}`, color: '#f97316' },
                  { label: 'Sessions', icon: <Calendar size={15} />, href: `/pt-os/sessions?client_id=${client.id}`, color: '#0ea5e9' },
                  { label: 'Delete', icon: <Trash2 size={15} />, href: '#delete', color: '#ef4444' },
                ].map((action, i) => (
                  <motion.button key={action.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                    onClick={() => action.href === '#delete' ? setDeleteOpen(true) : router.push(action.href)}
                    className="flex flex-col items-center gap-2 rounded-[16px] p-4 text-center transition-all hover:shadow-md"
                    style={{
                      background: 'rgba(255,255,255,0.7)',
                      backdropFilter: 'blur(8px)',
                      border: '1px solid rgba(255,255,255,0.7)',
                    }}>
                    <div className="flex h-10 w-10 items-center justify-center rounded-[11px]" style={{ background: `${action.color}14` }}>
                      <span style={{ color: action.color }}>{action.icon}</span>
                    </div>
                    <span className="text-[11px] font-[660]" style={{ color: 'rgb(71,85,105)' }}>{action.label}</span>
                  </motion.button>
                ))}
              </motion.div>

              {/* ── PT Subscription History (all terms) ── */}
              {(() => {
                // Build full term list: initial term (from pt_clients) + each renewal
                // Renewals are stored newest-first; reverse to show oldest first
                const pastTerms = [...renewalHistory].reverse();
                const totalTerms = 1 + pastTerms.length;
                const now = new Date();

                const termStatus = (startDate: string | null | undefined, endDate: string | null | undefined) => {
                  if (!endDate) return { label: 'Active', bg: '#10b98118', fg: '#10b981' };
                  const end = new Date(endDate);
                  const start = startDate ? new Date(startDate) : null;
                  if (end < now) return { label: 'Expired', bg: '#6b728018', fg: '#6b7280' };
                  if (start && start > now) return { label: 'Upcoming', bg: '#3b82f618', fg: '#3b82f6' };
                  return { label: 'Active', bg: '#10b98118', fg: '#10b981' };
                };

                return (
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    className="mt-8 rounded-[20px] p-5"
                    style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.8)', boxShadow: '0 2px 20px rgba(15,23,42,0.06)' }}>

                    {/* Header */}
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-[9px]" style={{ background: 'rgba(99,102,241,0.12)' }}>
                          <Repeat size={15} style={{ color: '#6366f1' }} />
                        </div>
                        <div>
                          <h3 className="text-[14px] font-[700]" style={{ color: 'rgb(15,23,42)' }}>PT Subscription History</h3>
                          <p className="text-[11px]" style={{ color: 'rgb(148,163,184)' }}>{totalTerms} term{totalTerms !== 1 ? 's' : ''} total</p>
                        </div>
                      </div>
                      <button onClick={() => router.push(`/pt-os/clients/${client.id}/renew`)}
                        className="flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-[11px] font-[700] transition hover:opacity-80"
                        style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
                        <Repeat size={11} /> New Term
                      </button>
                    </div>

                    {/* Term cards */}
                    <div className="space-y-3">

                      {/* Past terms from renewals (oldest first) */}
                      {pastTerms.map((r: any, idx: number) => {
                        const st = termStatus(r.new_start_date, r.new_end_date);
                        const termNum = idx + 1;
                        return (
                          <div key={r.id} className="rounded-[14px] p-4"
                            style={{ background: 'rgba(15,23,42,0.025)', border: '1px solid rgba(15,23,42,0.06)' }}>
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-[800]"
                                  style={{ background: 'rgba(99,102,241,0.12)', color: '#6366f1' }}>{termNum}</span>
                                <div>
                                  <p className="text-[13px] font-[700]" style={{ color: 'rgb(15,23,42)' }}>{r.new_package || r.old_package || '—'}</p>
                                  <p className="text-[11px]" style={{ color: 'rgb(148,163,184)' }}>
                                    {r.duration_months ? `${r.duration_months} months · ` : ''}
                                    {r.new_start_date ? new Date(r.new_start_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                    {' → '}
                                    {r.new_end_date ? new Date(r.new_end_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                  </p>
                                </div>
                              </div>
                              <span className="text-[10px] font-[700] uppercase tracking-wider px-2 py-0.5 rounded-[6px]"
                                style={{ background: st.bg, color: st.fg }}>{st.label}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              {[
                                { label: 'Final', value: fmtINR(r.final_amount), color: 'rgb(15,23,42)' },
                                { label: 'Paid', value: fmtINR(r.paid_amount), color: '#10b981' },
                                { label: 'Balance', value: fmtINR(r.balance_amount), color: Number(r.balance_amount) > 0 ? '#dc2626' : '#10b981' },
                              ].map(f => (
                                <div key={f.label} className="rounded-[10px] px-3 py-2"
                                  style={{ background: 'rgba(255,255,255,0.8)' }}>
                                  <p className="text-[9px] font-[700] uppercase tracking-wider mb-0.5" style={{ color: 'rgb(148,163,184)' }}>{f.label}</p>
                                  <p className="text-[13px] font-[700]" style={{ color: f.color }}>{f.value}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}

                      {/* Current term (always shown, always last/latest) */}
                      {(() => {
                        const st = termStatus(client.pt_start_date, client.pt_end_date);
                        const termNum = totalTerms;
                        return (
                          <div className="rounded-[14px] p-4"
                            style={{ background: 'rgba(99,102,241,0.04)', border: '1.5px solid rgba(99,102,241,0.2)' }}>
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-[800]"
                                  style={{ background: 'rgba(99,102,241,0.15)', color: '#6366f1' }}>{termNum}</span>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="text-[13px] font-[700]" style={{ color: 'rgb(15,23,42)' }}>{client.package_type || '—'}</p>
                                    <span className="text-[9px] font-[800] uppercase tracking-wider px-1.5 py-0.5 rounded-[4px]"
                                      style={{ background: 'rgba(99,102,241,0.12)', color: '#6366f1' }}>Current</span>
                                  </div>
                                  <p className="text-[11px]" style={{ color: 'rgb(148,163,184)' }}>
                                    {client.duration_months ? `${client.duration_months} months · ` : ''}
                                    {fmtDate(client.pt_start_date)} → {fmtDate(client.pt_end_date)}
                                  </p>
                                </div>
                              </div>
                              <span className="text-[10px] font-[700] uppercase tracking-wider px-2 py-0.5 rounded-[6px]"
                                style={{ background: st.bg, color: st.fg }}>{st.label}</span>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                              {[
                                { label: 'Final', value: fmtINR(client.final_amount), color: 'rgb(15,23,42)' },
                                { label: 'Paid', value: fmtINR(client.paid_amount), color: '#10b981' },
                                { label: 'Balance', value: fmtINR(client.balance_amount), color: client.balance_amount > 0 ? '#dc2626' : '#10b981' },
                                { label: 'Days Left', value: client.days_left !== null ? `${client.days_left}d` : '—', color: '#6366f1' },
                              ].map(f => (
                                <div key={f.label} className="rounded-[10px] px-3 py-2"
                                  style={{ background: 'rgba(255,255,255,0.8)' }}>
                                  <p className="text-[9px] font-[700] uppercase tracking-wider mb-0.5" style={{ color: 'rgb(148,163,184)' }}>{f.label}</p>
                                  <p className="text-[13px] font-[700]" style={{ color: f.color }}>{f.value}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </motion.div>
                );
              })()}

              {/* ── Delete Confirmation Modal ── */}
              <AnimatePresence>
                {deleteOpen && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
                    onClick={() => setDeleteOpen(false)}>
                    <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                      className="w-full max-w-sm rounded-[22px] p-6 text-center"
                      style={{ background: 'var(--bg-card)', boxShadow: '0 24px 80px rgba(0,0,0,0.2)' }}
                      onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-center mb-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full" style={{ background: '#ef444418' }}>
                          <AlertTriangle size={26} style={{ color: '#ef4444' }} />
                        </div>
                      </div>
                      <h3 className="text-[17px] font-[760] mb-2" style={{ color: 'rgb(15,23,42)' }}>Delete Client</h3>
                      <p className="text-[13px] mb-6" style={{ color: 'rgb(100,116,139)' }}>
                        Are you sure you want to delete <strong>{client?.name}</strong>? This action cannot be undone.
                      </p>
                      <div className="flex gap-3 justify-center">
                        <PremiumButton tone="secondary" onClick={() => setDeleteOpen(false)}>Cancel</PremiumButton>
                        <PremiumButton tone="danger" glow onClick={handleDelete} loading={deleting}>
                          <Trash2 size={13} /> Delete
                        </PremiumButton>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : null}
        </div>
      </AppShell>
    </Guard>
  );
}
