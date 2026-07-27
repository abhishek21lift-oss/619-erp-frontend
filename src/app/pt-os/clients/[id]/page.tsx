'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CopyId } from '@/components/ui/CopyId';
import { m, AnimatePresence } from 'framer-motion';
import {
  User, Calendar, Target,
  Dumbbell, Wallet, FileText, Activity, RefreshCw,
  CheckCircle, AlertTriangle, Clock, IndianRupee,
  Camera, Ruler, Zap, Repeat, ChevronRight,
  TrendingUp, MessageCircle, Save, Trash2, Pencil,
  Award, HeartPulse, Salad, Flag, Phone,
  ShieldCheck, FileSignature, ClipboardList,
  QrCode, Printer, PiggyBank, PieChart, Layers,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';

import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { Button, PremiumAreaChart, DonutChart } from '@/components/ui';
import { printWindowCloseButtonHtml } from '@/lib/printWindowChrome';

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
  from: string;
  to: string;
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

function getStatusConfig(status: string, days_left: number | null, pt_end_date?: string) {
  const endPassed = pt_end_date ? new Date(pt_end_date) < new Date() : (days_left !== null && days_left <= 0);
  if (endPassed) return { label: 'Inactive', color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', dot: '#64748b' };
  if (status === 'frozen') return { label: 'Frozen', color: '#60a5fa', bg: 'rgba(96,165,250,0.12)', dot: '#3b82f6' };
  if (status === 'active' && days_left !== null && days_left <= 7) return { label: 'Expiring', color: '#f87171', bg: 'rgba(248,113,113,0.12)', dot: '#ef4444' };
  if (status === 'active') return { label: 'Active', color: '#34d399', bg: 'rgba(52,211,153,0.12)', dot: '#10b981' };
  if (status === 'expired' || status === 'inactive') return { label: 'Inactive', color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', dot: '#64748b' };
  return { label: status, color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', dot: '#64748b' };
}

// Donut-chart insight card — replaces the old hand-rolled SVG ring meters
// for Payment Progress / PT Duration with the same DonutChart component the
// rest of the app's fitness dashboards (Nutrition, Fitness, Goal cards) use,
// so a client's profile reads as one system with the rest of PT OS.
function InsightDonut({
  title, icon, from, data, centerValue, centerLabel, valueFormatter, footer, delay = 0,
}: {
  title: string; icon: React.ReactNode; from: string;
  data: { name: string; value: number; color?: string }[];
  centerValue?: string; centerLabel?: string;
  valueFormatter?: (v: number) => string;
  footer?: React.ReactNode;
  delay?: number;
}) {
  return (
    <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className="rounded-[20px] p-5 bg-white"
      style={{ border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
      <div className="mb-1 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-[8px]" style={{ background: `${from}20` }}>
          <span style={{ color: from }}>{icon}</span>
        </div>
        <span className="text-[12px] font-[700] text-gray-900">{title}</span>
      </div>
      <DonutChart data={data} centerValue={centerValue} centerLabel={centerLabel} valueFormatter={valueFormatter} height={196} thin />
      {footer}
    </m.div>
  );
}

function InfoRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
      <span className="shrink-0 text-[12px] font-[500] text-slate-500">{label}</span>
      <span className="min-w-0 flex-1 break-words text-right text-[12.5px] font-[650]" style={{ color: valueColor ?? '#111827' }}>{value}</span>
    </div>
  );
}

// ── Documents card: PAR-Q + Informed Consent status at a glance ──
const DOC_STATUS_STYLE: Record<string, { label: string; bg: string; color: string }> = {
  none: { label: 'Not Started', bg: 'rgba(148,163,184,0.15)', color: '#64748b' },
  draft: { label: 'Draft', bg: 'rgba(148,163,184,0.15)', color: '#64748b' },
  submitted: { label: 'Submitted', bg: 'rgba(16,185,129,0.15)', color: '#059669' },
  reviewed: { label: 'Reviewed', bg: 'rgba(16,185,129,0.15)', color: '#059669' },
  pending_client_signature: { label: 'Pending Signature', bg: 'rgba(245,158,11,0.15)', color: '#d97706' },
  pending_trainer_signature: { label: 'Pending Signature', bg: 'rgba(245,158,11,0.15)', color: '#d97706' },
  completed: { label: 'Completed', bg: 'rgba(16,185,129,0.15)', color: '#059669' },
  revoked: { label: 'Revoked', bg: 'rgba(220,38,38,0.15)', color: '#dc2626' },
};

function DocumentRow({ icon, label, status, onClick }: { icon: React.ReactNode; label: string; status: string; onClick: () => void }) {
  const style = DOC_STATUS_STYLE[status] || DOC_STATUS_STYLE.none;
  return (
    <button onClick={onClick} className="flex w-full items-center justify-between gap-3 rounded-[12px] p-3 text-left transition hover:opacity-80"
      style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2.5">
        <span style={{ color: '#64748b' }}>{icon}</span>
        <span className="text-[12.5px] font-[650] text-gray-900">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="rounded-full px-2.5 py-1 text-[10.5px] font-[700]" style={{ background: style.bg, color: style.color }}>
          {style.label}
        </span>
        <ChevronRight size={14} style={{ color: '#cbd5e1' }} />
      </div>
    </button>
  );
}

function DocumentsCard({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [parqStatus, setParqStatus] = useState('none');
  const [consentStatus, setConsentStatus] = useState('none');

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.progress.parqForms.list({ client_id: clientId }).catch(() => ({ data: [] })),
      api.progress.informedConsent.list({ client_id: clientId }).catch(() => ({ data: [] })),
    ]).then(([parqRes, consentRes]) => {
      if (cancelled) return;
      const latestParq = parqRes?.data?.[0];
      if (latestParq) setParqStatus(String(latestParq.status || 'draft'));
      const latestConsent = consentRes?.data?.[0];
      if (latestConsent) setConsentStatus(String(latestConsent.status || 'draft'));
    });
    return () => { cancelled = true; };
  }, [clientId]);

  return (
    <DarkCard title="Documents" icon={<FileSignature size={14} />} from="#0f172a">
      <div className="space-y-2.5">
        <DocumentRow
          icon={<ShieldCheck size={15} />} label="PAR-Q Screening" status={parqStatus}
          onClick={() => router.push(`/pt-os/parq?client_id=${clientId}`)}
        />
        <DocumentRow
          icon={<FileSignature size={15} />} label="Informed Consent" status={consentStatus}
          onClick={() => router.push(`/pt-os/informed-consent?client_id=${clientId}`)}
        />
      </div>
    </DarkCard>
  );
}

// ── QR Check-in card: printable scannable code for the kiosk/scanner ──
function QrCheckinCard({ clientId, clientName }: { clientId: string; clientName: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    api.qr.generateFor('client', clientId)
      .then((res) => { if (!cancelled) setDataUrl(res.dataUrl); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to generate QR code'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [clientId]);

  const handlePrint = () => {
    if (!dataUrl) return;
    const w = window.open('', '_blank', 'width=420,height=560');
    if (!w) return;
    w.document.write(
      `<html><head><title>${clientName} — Check-in QR</title></head>` +
      `<body style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;font-family:sans-serif;">` +
      printWindowCloseButtonHtml() +
      `<img src="${dataUrl}" width="280" height="280" alt="Check-in QR code" />` +
      `<p style="margin-top:12px;font-size:16px;font-weight:700;">${clientName}</p>` +
      `<p style="margin-top:2px;font-size:12px;color:#666;">Scan at check-in kiosk</p>` +
      `</body></html>`
    );
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <DarkCard title="Check-in QR Code" icon={<QrCode size={14} />} from="#0891b2">
      {loading && <p className="text-[12px] text-gray-400">Generating…</p>}
      {error && <p className="text-[12px] text-red-500">{error}</p>}
      {dataUrl && !loading && (
        <div className="flex flex-col items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={dataUrl} alt="Check-in QR code" className="h-40 w-40 rounded-lg border border-zinc-100" />
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 rounded-[10px] px-3 py-2 text-[12px] font-[700] transition hover:opacity-80"
            style={{ background: 'rgba(8,145,178,0.10)', color: '#0891b2', border: '1px solid rgba(8,145,178,0.20)' }}
          >
            <Printer size={13} /> Print Card
          </button>
        </div>
      )}
    </DarkCard>
  );
}

function DarkCard({ title, icon, from, children, className = '' }:
  { title: string; icon: React.ReactNode; from: string; children: React.ReactNode; className?: string }) {
  return (
    <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className={`overflow-hidden rounded-xl border border-zinc-100 bg-white shadow-sm ${className}`}>
      <div className="flex items-center gap-3 px-5 pt-5 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex h-8 w-8 items-center justify-center rounded-[10px]"
          style={{ background: `${from}20`, border: `1px solid ${from}30` }}>
          <span style={{ color: from }}>{icon}</span>
        </div>
        <h3 className="text-[13.5px] font-[740] text-gray-900">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </m.div>
  );
}

interface QuickActionChild {
  label: string;
  icon: React.ReactNode;
  href: (id: string) => string;
}

interface QuickAction {
  label: string;
  icon: React.ReactNode;
  from: string;
  to: string;
  /** Flat actions navigate directly; grouped actions (e.g. "Screening")
   *  open a sub-menu instead and omit href. */
  href?: (id: string) => string;
  children?: QuickActionChild[];
}

const QUICK_ACTIONS: QuickAction[] = [
  { label: 'Baseline Setup', icon: <Flag size={16} />, href: (id) => `/pt-os/progress-tracking-setup?client_id=${id}`, from: '#0f172a', to: '#334155' },
  { label: 'Payments', icon: <Wallet size={16} />, href: (id) => `/pt-os/clients/${id}/payments`, from: '#8b5cf6', to: '#7c3aed' },
  { label: 'Workout Plans', icon: <Dumbbell size={16} />, href: (id) => `/pt-os/workout-plans?client_id=${id}`, from: '#22d3ee', to: '#06b6d4' },
  { label: 'Workout Log', icon: <ClipboardList size={16} />, href: (id) => `/pt-os/clients/${id}/workout-log`, from: '#f43f5e', to: '#e11d48' },
  {
    label: 'Screening', icon: <ShieldCheck size={16} />, from: '#0f172a', to: '#334155',
    children: [
      { label: 'Consent', icon: <FileSignature size={14} />, href: (id) => `/pt-os/informed-consent?client_id=${id}` },
      { label: 'PAR-Q', icon: <ShieldCheck size={14} />, href: (id) => `/pt-os/parq?client_id=${id}` },
      { label: 'Fitness Testing', icon: <Activity size={14} />, href: (id) => `/pt-os/assessment?client_id=${id}` },
      { label: 'Lifestyle', icon: <HeartPulse size={14} />, href: (id) => `/pt-os/lifestyle-assessment?client_id=${id}` },
    ],
  },
  { label: 'Goals', icon: <Target size={16} />, href: (id) => `/pt-os/goals?client_id=${id}`, from: '#3b82f6', to: '#2563eb' },
  { label: 'Nutrition', icon: <Salad size={16} />, href: (id) => `/pt-os/nutrition-assessment?client_id=${id}`, from: '#22c55e', to: '#16a34a' },
  { label: 'Photos', icon: <Camera size={16} />, href: (id) => `/pt-os/progress-photos?client_id=${id}`, from: '#ec4899', to: '#db2777' },
  { label: 'Strength', icon: <Zap size={16} />, href: (id) => `/pt-os/strength-tracking?client_id=${id}`, from: '#6366f1', to: '#4f46e5' },
  { label: 'Check-in', icon: <CheckCircle size={16} />, href: (id) => `/pt-os/weekly-checkin?client_id=${id}`, from: '#14b8a6', to: '#0d9488' },
  { label: 'Diet Plans', icon: <FileText size={16} />, href: (id) => `/pt-os/diet-plans?client_id=${id}`, from: '#f97316', to: '#ea580c' },
  { label: 'Sessions', icon: <Calendar size={16} />, href: (id) => `/pt-os/sessions?client_id=${id}`, from: '#0ea5e9', to: '#0284c7' },
  { label: 'Delete', icon: <Trash2 size={16} />, href: () => '#delete', from: '#ef4444', to: '#dc2626' },
];

export default function PtClientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const [client, setClient] = useState<PtClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [openAction, setOpenAction] = useState<string | null>(null);

  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [recentWeights, setRecentWeights] = useState<any[]>([]);
  const [activeGoals, setActiveGoals] = useState<any[]>([]);
  const [editNotes, setEditNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');
  const [subscriptionHistory, setSubscriptionHistory] = useState<any[]>([]);
  const [activityCounts, setActivityCounts] = useState({ payments: 0, checkins: 0, measurements: 0, goals: 0 });

  const loadData = async () => {
    try {
      setLoading(true); setError('');
      const clientRes = await api.pt.client(id);
      const c = (clientRes as any)?.data ?? null;
      if (!c) { setError('Client not found'); setLoading(false); return; }
      setClient(c); setNotesDraft(c?.notes || '');

      const [checkinsRes, assessmentsRes, goalsRes, paymentsRes, renewalsRes] = await Promise.allSettled([
        api.progress.weeklyCheckins.list({ client_id: id, limit: 5 }),
        api.progress.assessments.list({ client_id: id, limit: 10 }),
        api.progress.goals.list({ client_id: id }),
        api.pt.payments({ client_id: id }),
        api.pt.subscriptions(id),
      ]);

      const checkins = checkinsRes.status === 'fulfilled' && Array.isArray((checkinsRes.value as any)?.data) ? (checkinsRes.value as any).data : [];
      const assessments = assessmentsRes.status === 'fulfilled' && Array.isArray((assessmentsRes.value as any)?.data) ? (assessmentsRes.value as any).data : [];
      setRecentWeights(assessments.filter((a: any) => a.weight).slice(0, 6));

      const goals = goalsRes.status === 'fulfilled' && Array.isArray((goalsRes.value as any)?.data) ? (goalsRes.value as any).data : [];
      setActiveGoals(goals.filter((g: any) => g.status === 'active'));

      const rawPayments = paymentsRes.status === 'fulfilled' && Array.isArray((paymentsRes.value as any)?.data) ? (paymentsRes.value as any).data : [];

      const renewals = renewalsRes.status === 'fulfilled' && Array.isArray((renewalsRes.value as any)?.data) ? (renewalsRes.value as any).data : [];
      setSubscriptionHistory(renewals);

      // Full (unfiltered) counts, for the Activity Mix donut — timeline below
      // truncates to 10 most recent events, which would undercount totals.
      setActivityCounts({
        payments: rawPayments.length,
        checkins: checkins.length,
        measurements: assessments.length,
        goals: goals.length,
      });

      const events: TimelineEvent[] = [];
      checkins.forEach((ch: any) => events.push({
        id: `ch-${ch.id}`, type: 'checkin',
        title: 'Weekly Check-in',
        subtitle: `Adherence: ${ch.adherence || ch.workout_adherence || '—'}% · Weight: ${ch.weight || '—'}`,
        date: ch.week_start_date || ch.created_at,
        icon: <Activity size={12} />, from: '#10b981', to: '#059669',
      }));
      rawPayments.forEach((p: any) => events.push({
        id: `pmt-${p.id}`, type: 'payment',
        title: `Payment — ${fmtINR(p.amount)}`,
        subtitle: `${p.payment_method || p.method || '—'}${p.notes ? ` · ${p.notes}` : ''}`,
        date: p.date || p.created_at,
        icon: <Wallet size={12} />, from: '#8b5cf6', to: '#7c3aed', value: fmtINR(p.amount),
      }));
      assessments.forEach((a: any) => events.push({
        id: `meas-${a.id}`, type: 'measurement',
        title: a.weight ? `Weight: ${a.weight} kg` : 'Assessment recorded',
        subtitle: a.body_fat ? `Body Fat: ${a.body_fat}% · ${a.assessment_type || 'check-in'}` : (a.assessment_type || 'check-in'),
        date: a.created_at || a.assessment_date,
        icon: <Ruler size={12} />, from: '#f59e0b', to: '#d97706', value: a.weight ? `${a.weight} kg` : undefined,
      }));
      goals.filter((g: any) => g.status === 'active').forEach((g: any) => events.push({
        id: `goal-${g.id}`, type: 'goal',
        title: `Goal: ${g.goal_type || g.type || 'Fitness'}`,
        subtitle: g.target_weight ? `Target: ${g.target_weight} kg` : g.target_body_fat ? `BF target: ${g.target_body_fat}%` : 'Active goal',
        date: g.created_at,
        icon: <Target size={12} />, from: '#3b82f6', to: '#2563eb',
      }));

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

  useEffect(() => { loadData(); }, [id]);

  const [activePlanName, setActivePlanName] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    api.workouts.assignments.list({ client_id: id, status: 'active' }).then((rows) => {
      if (!cancelled) setActivePlanName(rows[0]?.plan_name ?? null);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [id]);

  const whatsappHref = (phone?: string, name?: string) => {
    const p = (phone ?? '').replace(/\D/g, '');
    if (!p) return '#';
    const num = p.startsWith('91') ? p : `91${p}`;
    return `https://wa.me/${num}?text=${encodeURIComponent(`Hi ${name ?? 'there'}, this is your trainer from MY PT STUDIO.`)}`;
  };

  const initials = (name: string) =>
    name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  const currentSub = subscriptionHistory.length > 0 ? subscriptionHistory[subscriptionHistory.length - 1] : null;
  const currentTermFee     = currentSub ? Number(currentSub.selling_price  ?? 0) : (client?.final_amount   ?? 0);
  const currentTermPaid    = currentSub ? Number(currentSub.amount_paid    ?? 0) : (client?.paid_amount    ?? 0);
  const currentTermBalance = currentSub ? Number(currentSub.balance_amount ?? 0) : (client?.balance_amount ?? 0);

  // Lifetime paid — sum of amount_paid across every PT term/renewal, not just
  // the current one. Falls back to the client's own paid_amount when there's
  // no renewal history yet (client is still on their first, only term).
  const lifetimePaid = subscriptionHistory.length > 0
    ? subscriptionHistory.reduce((s: number, t: any) => s + Number(t.amount_paid ?? 0), 0)
    : (client?.paid_amount ?? 0);
  const lifetimeTermCount = subscriptionHistory.length > 0 ? subscriptionHistory.length : 1;

  const completionPct = currentTermFee > 0
    ? Math.min(Math.round((currentTermPaid / currentTermFee) * 100), 100)
    : 0;

  // ── Donut data for the Client Insights section ──
  // Payment Breakdown: a genuine 2-part composition of the current term's
  // fee (paid vs due), not a single-ratio meter dressed up as a donut.
  const paymentBreakdownData = [
    { name: 'Paid', value: currentTermPaid, color: '#10b981' },
    { name: 'Balance Due', value: currentTermBalance, color: '#ef4444' },
  ];

  // PT Term Progress: elapsed vs remaining days of the current term.
  const totalDurationDays = client?.pt_start_date && client?.pt_end_date
    ? Math.max(1, Math.round((new Date(client.pt_end_date).getTime() - new Date(client.pt_start_date).getTime()) / 86400000))
    : 0;
  const elapsedDaysForDonut = totalDurationDays > 0 && client?.pt_start_date
    ? Math.max(0, Math.min(totalDurationDays, Math.round((Date.now() - new Date(client.pt_start_date).getTime()) / 86400000)))
    : 0;
  const remainingDaysForDonut = Math.max(0, totalDurationDays - elapsedDaysForDonut);
  const ptTermDonutData = [
    { name: 'Elapsed', value: elapsedDaysForDonut, color: '#6366f1' },
    { name: 'Remaining', value: remainingDaysForDonut, color: '#e2e8f0' },
  ];

  // Payments by Term: real part-to-whole across every renewal — only
  // meaningful (and only rendered) once a client has 2+ terms.
  const paymentsByTermData = subscriptionHistory.map((t: any, idx: number) => ({
    name: t.plan_name || `Term ${idx + 1}`,
    value: Number(t.amount_paid ?? 0),
  }));

  // Activity Mix: what kind of engagement has been logged for this client.
  // Colors match the Recent Activity timeline's own dot colors below, so the
  // donut and the timeline read as the same system rather than two palettes.
  const activityMixData = [
    { name: 'Payments', value: activityCounts.payments, color: '#8b5cf6' },
    { name: 'Check-ins', value: activityCounts.checkins, color: '#10b981' },
    { name: 'Measurements', value: activityCounts.measurements, color: '#f59e0b' },
    { name: 'Goals', value: activityCounts.goals, color: '#3b82f6' },
  ];

  const statusCfg = client ? getStatusConfig(client.status, client.days_left, client.pt_end_date) : null;

  return (
    <Guard>
      <AppShell>
        <div className="min-h-screen">

          <div className="relative mx-auto max-w-screen-lg px-4 pb-6 sm:px-6">

            {/* ── LOADING ── */}
            {loading && (
              <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
                <div className="relative h-14 w-14">
                  <div className="absolute inset-0 rounded-full"
                    style={{ border: '2px solid rgba(124,58,237,0.15)', borderTopColor: '#7c3aed', animation: 'spin 0.9s linear infinite' }} />
                </div>
                <p className="text-[13px] font-[500] text-slate-500">Loading client profile…</p>
              </div>
            )}

            {/* ── ERROR ── */}
            {!loading && error && (
              <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-[20px]"
                  style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <AlertTriangle size={26} className="text-red-400" />
                </div>
                <p className="text-[14px] text-slate-400">{error}</p>
                <button onClick={loadData}
                  className="flex items-center gap-2 rounded-[12px] px-4 py-2.5 text-[13px] font-[700] text-white"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)' }}>
                  <RefreshCw size={14} /> Retry
                </button>
              </div>
            )}

            {!loading && !error && client && (
              <>
                {/* ── HERO ── */}
                <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="relative mb-5 overflow-hidden rounded-[28px] p-6 sm:p-7"
                  style={{
                    background: 'linear-gradient(135deg, #1e1b4b 0%, #2e1065 100%)',
                    boxShadow: '0 20px 48px rgba(30,27,75,0.35)',
                  }}>

                  {/* Status pill */}
                  {statusCfg && (
                    <div className="absolute right-5 top-5 flex items-center gap-1.5 rounded-full px-3 py-1.5 sm:right-6 sm:top-6"
                      style={{ background: statusCfg.bg, border: `1px solid ${statusCfg.color}30` }}>
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: statusCfg.dot }} />
                      <span className="text-[10.5px] font-[800] uppercase tracking-wider" style={{ color: statusCfg.color }}>
                        {statusCfg.label}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-4 sm:gap-5">
                    {/* Avatar */}
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[22px] text-[24px] font-[860] text-white sm:h-24 sm:w-24 sm:text-[28px]"
                      style={{
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.14)',
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), 0 10px 24px rgba(0,0,0,0.25)',
                      }}>
                      {initials(client.name)}
                    </div>

                    {/* Identity */}
                    <div className="min-w-0 flex-1 pr-24 sm:pr-0">
                      <h1 className="truncate text-[22px] font-[880] leading-tight tracking-[-0.03em] text-white sm:text-[30px]">
                        {client.name}
                      </h1>
                      <div className="mt-2.5 flex flex-wrap items-center gap-2">
                        <CopyId id={client.unique_id || client.client_id || client.id.slice(0, 8)} color="#2dd4bf" />
                        {client.trainer_name && (
                          <span className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-[700]"
                            style={{ background: 'rgba(196,181,253,0.18)', color: '#c4b5fd' }}>
                            <User size={11} />{client.trainer_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </m.div>

                {/* ── CONTACT & ACTIONS ── */}
                <div className="mb-6 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {client.mobile && (
                      <a href={`tel:${client.mobile}`}
                        className="inline-flex items-center gap-2 rounded-[12px] px-4 py-2 text-[12.5px] font-[700] transition-all hover:opacity-80"
                        style={{ background: 'rgba(99,102,241,0.12)', color: '#4f46e5', border: '1px solid rgba(99,102,241,0.2)' }}>
                        <Phone size={14} /> {client.mobile}
                      </a>
                    )}
                    {client.mobile && (
                      <a href={whatsappHref(client.mobile, client.name)} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-[12px] px-4 py-2 text-[12.5px] font-[700] transition-all hover:opacity-80"
                        style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
                        <MessageCircle size={14} /> WhatsApp
                      </a>
                    )}
                  </div>
                  {client.email && (
                    <p className="text-[12.5px] font-[600] text-gray-500">{client.email}</p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => router.push(`/pt-os/clients/${id}/edit`)}
                      className="flex items-center gap-2 rounded-[12px] px-4 py-2.5 text-[12.5px] font-[700] text-gray-700 transition-all hover:opacity-80"
                      style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
                      <Pencil size={13} /> Edit
                    </button>
                    <button onClick={() => router.push(`/pt-os/clients/${id}/enroll`)}
                      className="flex items-center gap-2 rounded-[12px] px-4 py-2.5 text-[12.5px] font-[700] text-gray-700 transition-all hover:opacity-80"
                      style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
                      <Award size={13} /> Enroll in PT
                    </button>
                    <button onClick={() => router.push(`/pt-os/clients/${id}/renew`)}
                      className="flex items-center gap-2 rounded-[12px] px-4 py-2.5 text-[12.5px] font-[700] text-gray-700 transition-all hover:opacity-80"
                      style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
                      <Repeat size={13} /> Renew PT
                    </button>
                  </div>
                </div>

                {/* ── KPI CARDS ── */}
                <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    {
                      label: 'Total PT Fee', value: fmtINR(currentTermFee),
                      icon: <IndianRupee size={18} />, from: '#7c3aed', to: '#5b21b6',
                      sub: 'Current term fee',
                    },
                    {
                      label: 'Paid', value: fmtINR(currentTermPaid),
                      icon: <CheckCircle size={18} />, from: '#10b981', to: '#059669',
                      sub: `${completionPct}% complete`,
                    },
                    {
                      label: 'Balance', value: fmtINR(currentTermBalance),
                      icon: <AlertTriangle size={18} />,
                      from: currentTermBalance > 0 ? '#ef4444' : '#10b981',
                      to: currentTermBalance > 0 ? '#dc2626' : '#059669',
                      sub: currentTermBalance > 0 ? (client.due_status === 'OVERDUE' ? 'OVERDUE' : 'Due') : 'Cleared',
                    },
                    {
                      label: 'Total Paid (All Terms)', value: fmtINR(lifetimePaid),
                      icon: <PiggyBank size={18} />, from: '#0ea5e9', to: '#0284c7',
                      sub: `Across ${lifetimeTermCount} term${lifetimeTermCount !== 1 ? 's' : ''}`,
                    },
                  ].map((card, i) => (
                    <m.div key={card.label}
                      initial={{ opacity: 0, y: 14, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: 0.1 + i * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                      className="relative overflow-hidden rounded-[20px] p-4 bg-white"
                      style={{
                        border: `1px solid ${card.from}28`,
                        boxShadow: `0 1px 4px rgba(0,0,0,0.05)`,
                      }}>
                      <div className="flex h-9 w-9 items-center justify-center rounded-[10px] mb-3"
                        style={{ background: `linear-gradient(135deg, ${card.from}, ${card.to})`, boxShadow: `0 3px 12px ${card.from}45` }}>
                        <span className="text-white">{card.icon}</span>
                      </div>
                      <p className="text-[20px] font-[860] tracking-[-0.02em] text-gray-900">{card.value}</p>
                      <p className="text-[9.5px] font-[700] uppercase tracking-wider text-slate-500 mt-0.5">{card.label}</p>
                      <p className="text-[10px] font-[600] mt-1" style={{ color: card.from }}>{card.sub}</p>
                    </m.div>
                  ))}
                </div>

                {/* ── CLIENT INSIGHTS (donuts) ── */}
                <div className="mb-6">
                  <div className="mb-4 flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-[10px]"
                      style={{ background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.2)' }}>
                      <PieChart size={14} style={{ color: '#f97316' }} />
                    </div>
                    <h3 className="text-[13.5px] font-[740] text-gray-900">Client Insights</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    <InsightDonut
                      title="Payment Breakdown" icon={<Wallet size={13} />} from="#10b981" delay={0.2}
                      data={paymentBreakdownData}
                      centerValue={`${completionPct}%`} centerLabel="of fee paid"
                      valueFormatter={fmtINR}
                      footer={
                        <div className="mt-3 flex justify-between">
                          <span className="text-[10.5px] font-[600] text-emerald-600">{fmtINR(currentTermPaid)} paid</span>
                          <span className="text-[10.5px] font-[600] text-slate-500">{fmtINR(currentTermFee)} total</span>
                        </div>
                      }
                    />

                    <InsightDonut
                      title="PT Term Progress" icon={<Clock size={13} />} from="#6366f1" delay={0.25}
                      data={ptTermDonutData}
                      centerValue={client.days_left !== null ? String(client.days_left) : '—'} centerLabel="days left"
                      valueFormatter={(v) => `${v} day${v !== 1 ? 's' : ''}`}
                      footer={
                        <div className="mt-3 flex justify-between">
                          <span className="text-[10.5px] font-[600] text-slate-500">Start: {fmtDate(client.pt_start_date)}</span>
                          <span className="text-[10.5px] font-[600] text-slate-500">End: {fmtDate(client.pt_end_date)}</span>
                        </div>
                      }
                    />

                    {paymentsByTermData.length >= 2 && (
                      <InsightDonut
                        title="Payments by Term" icon={<Layers size={13} />} from="#0ea5e9" delay={0.3}
                        data={paymentsByTermData}
                        centerLabel="lifetime paid"
                        valueFormatter={fmtINR}
                        footer={
                          <p className="mt-3 text-[10.5px] font-[600] text-slate-500">
                            {lifetimeTermCount} terms · {fmtINR(lifetimePaid)} total
                          </p>
                        }
                      />
                    )}

                    <InsightDonut
                      title="Activity Mix" icon={<Activity size={13} />} from="#ec4899" delay={0.35}
                      data={activityMixData}
                      centerLabel="logged"
                      footer={
                        <p className="mt-3 text-[10.5px] font-[600] text-slate-500">
                          Payments, check-ins, measurements &amp; goals recorded
                        </p>
                      }
                    />
                  </div>
                </div>

                {/* ── QUICK ACTIONS GRID ── */}
                <m.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35, duration: 0.4 }}
                  className="mb-6 overflow-hidden rounded-[22px] p-5 bg-white"
                  style={{
                    border: '1px solid var(--border)',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                  }}>
                  <div className="flex items-center gap-2.5 mb-4" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                    <div className="flex h-8 w-8 items-center justify-center rounded-[10px]"
                      style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.2)' }}>
                      <Zap size={14} className="text-violet-600" />
                    </div>
                    <h3 className="text-[13.5px] font-[740] text-gray-900">Quick Actions</h3>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-11 gap-2.5">
                    {QUICK_ACTIONS.map((action, i) => (
                      <div key={action.label} className="relative">
                        <m.button
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.4 + i * 0.025 }}
                          onClick={() => {
                            if (action.children) { setOpenAction((o) => (o === action.label ? null : action.label)); return; }
                            if (action.href!(client.id) === '#delete') { setDeleteOpen(true); return; }
                            router.push(action.href!(client.id));
                          }}
                          title={action.label === 'Workout Plans' && activePlanName ? `Active plan: ${activePlanName}` : undefined}
                          className="group flex w-full flex-col items-center gap-2 rounded-[14px] p-3 transition-all duration-200 hover:-translate-y-0.5"
                          style={{ background: `${action.from}0f`, border: `1px solid ${action.from}20` }}>
                          <div className="relative flex h-9 w-9 items-center justify-center rounded-[10px] transition-all duration-200 group-hover:scale-110"
                            style={{ background: `linear-gradient(135deg, ${action.from}, ${action.to})`, boxShadow: `0 3px 10px ${action.from}40` }}>
                            <span className="text-white">{action.icon}</span>
                            {action.label === 'Workout Plans' && activePlanName && (
                              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full" style={{ background: '#10b981', border: '1.5px solid #fff' }} />
                            )}
                          </div>
                          <span className="text-[9px] font-[700] text-center leading-tight" style={{ color: action.from }}>
                            {action.label}
                          </span>
                        </m.button>

                        {action.children && openAction === action.label && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setOpenAction(null)} />
                            <m.div
                              initial={{ opacity: 0, y: -6, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                              transition={{ duration: 0.15 }}
                              className="absolute left-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-[14px] p-1.5"
                              style={{ background: '#fff', border: '1px solid var(--border)', boxShadow: '0 12px 32px rgba(15,23,42,0.16)' }}>
                              {action.children.map((child) => (
                                <button key={child.label}
                                  onClick={() => { setOpenAction(null); router.push(child.href(client.id)); }}
                                  className="flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left transition hover:bg-slate-50">
                                  <span style={{ color: action.from }}>{child.icon}</span>
                                  <span className="text-[12px] font-[650] text-gray-800">{child.label}</span>
                                </button>
                              ))}
                            </m.div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </m.div>

                {/* ── MAIN CONTENT GRID ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                  {/* ── LEFT: Activity + Weight ── */}
                  <div className="lg:col-span-2 space-y-5">

                    {/* Activity Timeline */}
                    <DarkCard title="Recent Activity" icon={<Activity size={14} />} from="#6366f1">
                      {timeline.length === 0 ? (
                        <p className="text-[13px] text-slate-500 italic">No recent activity recorded</p>
                      ) : (
                        <div>
                          {timeline.map((event, i) => (
                            <m.div key={event.id}
                              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                              className="relative flex gap-3 pb-4 pl-8 last:pb-0">
                              {/* Line */}
                              {i < timeline.length - 1 && (
                                <div className="absolute left-3.5 top-5 bottom-0 w-px"
                                  style={{ background: 'var(--bg-subtle)' }} />
                              )}
                              {/* Dot */}
                              <div className="absolute left-0 top-0.5 flex h-7 w-7 items-center justify-center rounded-full"
                                style={{ background: `linear-gradient(135deg, ${event.from}, ${event.to})`, boxShadow: `0 2px 8px ${event.from}40` }}>
                                <span className="text-white">{event.icon}</span>
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-[12.5px] font-[660] text-gray-900">{event.title}</p>
                                  <span className="shrink-0 text-[10px] font-[600] text-slate-400">{fmtDate(event.date)}</span>
                                </div>
                                <p className="text-[11px] mt-0.5 text-slate-500">{event.subtitle}</p>
                              </div>
                            </m.div>
                          ))}
                        </div>
                      )}
                    </DarkCard>

                    {/* Weight Trend */}
                    {recentWeights.length >= 2 && (
                      <DarkCard title="Weight Trend" icon={<TrendingUp size={14} />} from="#10b981">
                        <PremiumAreaChart
                          data={recentWeights.map((a: any) => ({
                            date: fmtDate(a.created_at || a.assessment_date).slice(0, 5),
                            weight: Number(a.weight),
                          })) as Record<string, unknown>[]}
                          xKey="date"
                          areas={[{ key: 'weight', label: 'Weight (kg)', color: '#10b981' }]}
                          height={100}
                          formatValue={(v) => `${v} kg`}
                        />
                      </DarkCard>
                    )}

                    {/* Active Goals */}
                    {activeGoals.length > 0 && (
                      <DarkCard title="Active Goals" icon={<Target size={14} />} from="#3b82f6">
                        <div className="space-y-2">
                          {activeGoals.slice(0, 3).map((g: any) => (
                            <div key={g.id}
                              className="flex items-center justify-between rounded-[12px] p-3"
                              style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)' }}>
                              <div>
                                <p className="text-[12.5px] font-[660] text-gray-900">{g.goal_type || g.type || 'Goal'}</p>
                                <p className="text-[10.5px] text-slate-500 mt-0.5">
                                  {g.target_weight ? `Target: ${g.target_weight} kg` : ''}
                                  {g.target_body_fat ? ` BF: ${g.target_body_fat}%` : ''}
                                </p>
                              </div>
                              <button onClick={() => router.push(`/pt-os/goals?client_id=${client.id}`)}
                                className="rounded-[8px] px-2.5 py-1.5 text-[10.5px] font-[700] transition hover:opacity-80"
                                style={{ background: 'rgba(59,130,246,0.12)', color: '#2563eb' }}>
                                View
                              </button>
                            </div>
                          ))}
                        </div>
                      </DarkCard>
                    )}

                    {/* Personal Info */}
                    <DarkCard title="Personal Info" icon={<User size={14} />} from="#db2777">
                      <InfoRow label="Gender" value={client.gender || '—'} />
                      <InfoRow label="Date of Birth" value={fmtDate(client.dob)} />
                      <InfoRow label="Phone" value={client.mobile || '—'} />
                      <InfoRow label="Email" value={client.email || '—'} />
                      <InfoRow label="Weight" value={client.weight ? `${client.weight} kg` : '—'} />
                      <InfoRow label="Joined" value={fmtDate(client.joining_date)} />
                    </DarkCard>
                  </div>

                  {/* ── RIGHT: Details ── */}
                  <div className="space-y-5">

                    {/* PT Assignment */}
                    <DarkCard title="PT Assignment" icon={<Dumbbell size={14} />} from="#7c3aed">
                      <InfoRow label="Plan" value={client.package_type || '—'} />
                      <InfoRow label="Start" value={fmtDate(client.pt_start_date)} />
                      <InfoRow label="End" value={fmtDate(client.pt_end_date)} />
                      <InfoRow label="Duration" value={client.duration_months ? `${client.duration_months} months` : '—'} />
                      <InfoRow label="Monthly Fee" value={fmtINR(client.monthly_pt_amount)} />
                      <InfoRow label="Days Left" value={client.days_left !== null ? `${client.days_left} days` : '—'}
                        valueColor={client.days_left <= 7 ? '#ef4444' : undefined} />
                    </DarkCard>

                    {/* Documents */}
                    <DocumentsCard clientId={client.id} />

                    {/* Check-in QR */}
                    <QrCheckinCard clientId={client.id} clientName={client.name} />

                    {/* Financial Details */}
                    <DarkCard title="Financials" icon={<Wallet size={14} />} from="#10b981">
                      {client.discount > 0 && (
                        <InfoRow label="Discount" value={`-${fmtINR(client.discount)}`} valueColor="#ef4444" />
                      )}
                      <InfoRow label="Total PT Fee" value={fmtINR(currentTermFee)} />
                      <InfoRow label="Paid" value={fmtINR(currentTermPaid)} valueColor="#059669" />
                      <InfoRow label="Balance" value={fmtINR(currentTermBalance)}
                        valueColor={currentTermBalance > 0 ? '#ef4444' : '#059669'} />
                      {client.due_status && client.due_status !== 'CLEAR' && (
                        <div className="mt-2 flex items-center gap-1.5 rounded-[8px] px-2.5 py-1.5"
                          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
                          <AlertTriangle size={11} className="text-red-500" />
                          <span className="text-[10px] font-[700] uppercase tracking-wider text-red-500">{client.due_status}</span>
                        </div>
                      )}
                    </DarkCard>

                    {/* Notes */}
                    <DarkCard title="Notes" icon={<FileText size={14} />} from="#f59e0b">
                      {editNotes ? (
                        <div className="space-y-3">
                          <textarea value={notesDraft} onChange={e => setNotesDraft(e.target.value)} rows={4}
                            className="w-full resize-none rounded-[12px] px-3.5 py-2.5 text-[13px] outline-none transition-all"
                            style={{
                              background: 'var(--bg-card)',
                              border: '1.5px solid rgba(245,158,11,0.3)',
                              color: 'var(--text-primary)',
                            }}
                            onFocus={e => { e.currentTarget.style.borderColor = 'rgba(245,158,11,0.6)'; }}
                            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(245,158,11,0.3)'; }}
                            placeholder="Add notes about this client…" />
                          <div className="flex gap-2">
                            <button onClick={handleSaveNotes}
                              className="flex items-center gap-1.5 rounded-[10px] px-3 py-2 text-[12px] font-[700] text-white transition hover:opacity-80"
                              style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                              <Save size={11} /> Save
                            </button>
                            <button onClick={() => { setEditNotes(false); setNotesDraft(client.notes || ''); }}
                              className="rounded-[10px] px-3 py-2 text-[12px] font-[700] text-slate-500 transition hover:text-slate-700"
                              style={{ background: 'var(--bg-subtle)' }}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div onClick={() => setEditNotes(true)} className="group cursor-pointer rounded-[12px] p-3 transition-all"
                          style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.12)' }}>
                          {client.notes ? (
                            <p className="text-[12.5px] leading-relaxed text-gray-700">{client.notes}</p>
                          ) : (
                            <>
                              <p className="text-[12.5px] italic text-slate-400 group-hover:hidden">No notes yet…</p>
                              <p className="hidden text-[12.5px] text-amber-500 group-hover:block">Click to add notes…</p>
                            </>
                          )}
                        </div>
                      )}
                    </DarkCard>

                    {/* Session Balance */}
                    <button onClick={() => router.push(`/pt-os/session-balance?client_id=${client.id}`)}
                      className="group w-full rounded-[20px] p-5 text-left transition-all duration-200 hover:-translate-y-0.5 bg-white"
                      style={{
                        border: '1px solid rgba(6,182,212,0.18)',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                      }}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-[12px]"
                            style={{ background: 'rgba(6,182,212,0.12)' }}>
                            <Calendar size={16} className="text-cyan-500" />
                          </div>
                          <div>
                            <p className="text-[13px] font-[700] text-gray-900">Session Balance</p>
                            <p className="text-[10.5px] text-slate-500 mt-0.5">Packages &amp; remaining sessions</p>
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-cyan-500 transition-transform duration-200 group-hover:translate-x-0.5" />
                      </div>
                    </button>
                  </div>
                </div>

                {/* ── SUBSCRIPTION HISTORY ── */}
                {(() => {
                  const allTerms = subscriptionHistory;
                  const useSubscriptions = allTerms.length > 0;
                  const totalTerms = useSubscriptions ? allTerms.length : 1;
                  const now = new Date();
                  const termStatus = (startDate?: string, endDate?: string) => {
                    if (!endDate) return { label: 'Active', from: '#10b981', to: '#059669', bg: 'rgba(16,185,129,0.12)', color: '#059669' };
                    const end = new Date(endDate);
                    const start = startDate ? new Date(startDate) : null;
                    if (end < now) return { label: 'Expired', from: '#64748b', to: '#475569', bg: 'rgba(100,116,139,0.10)', color: 'var(--text-muted)' };
                    if (start && start > now) return { label: 'Upcoming', from: '#3b82f6', to: '#2563eb', bg: 'rgba(59,130,246,0.12)', color: '#2563eb' };
                    return { label: 'Active', from: '#10b981', to: '#059669', bg: 'rgba(16,185,129,0.12)', color: '#059669' };
                  };
                  return (
                    <m.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="mt-5 overflow-hidden rounded-[24px] p-6 bg-white"
                      style={{
                        border: '1px solid var(--border)',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                      }}>
                      {/* Header */}
                      <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-[11px]"
                            style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)' }}>
                            <Repeat size={15} className="text-indigo-500" />
                          </div>
                          <div>
                            <h3 className="text-[14px] font-[740] text-gray-900">PT Subscription History</h3>
                            <p className="text-[10.5px] text-slate-500">{totalTerms} term{totalTerms !== 1 ? 's' : ''} total</p>
                          </div>
                        </div>
                        </div>

                      {/* Terms */}
                      <div className="space-y-3">
                        {useSubscriptions ? allTerms.map((s: any, idx: number) => {
                          const isLast = idx === allTerms.length - 1;
                          const st = termStatus(s.start_date, s.end_date);
                          return (
                            <div key={s.id ?? idx}
                              className="overflow-hidden rounded-[16px] p-4"
                              style={isLast
                                ? { background: 'rgba(99,102,241,0.06)', border: '1.5px solid rgba(99,102,241,0.18)' }
                                : { background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
                              <div className="flex items-start justify-between gap-3 mb-3">
                                <div className="flex min-w-0 items-center gap-2.5">
                                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-[800] text-indigo-600"
                                    style={{ background: 'rgba(99,102,241,0.12)' }}>{idx + 1}</span>
                                  <div className="min-w-0">
                                    <div className="flex min-w-0 items-center gap-2">
                                      <p className="min-w-0 truncate text-[13px] font-[700] text-gray-900">{s.plan_name || '—'}</p>
                                      {isLast && (
                                        <span className="shrink-0 rounded-[5px] px-1.5 py-0.5 text-[8.5px] font-[800] uppercase tracking-wider text-indigo-600"
                                          style={{ background: 'rgba(99,102,241,0.12)' }}>Current</span>
                                      )}
                                    </div>
                                    <p className="text-[10.5px] text-slate-500 mt-0.5">
                                      {s.duration_months ? `${s.duration_months}m · ` : ''}
                                      {fmtDate(s.start_date)} → {fmtDate(s.end_date)}
                                    </p>
                                  </div>
                                </div>
                                <span className="shrink-0 rounded-[7px] px-2 py-0.5 text-[9.5px] font-[700] uppercase tracking-wider"
                                  style={{ background: st.bg, color: st.color }}>{st.label}</span>
                              </div>
                              <div className={`grid gap-2 ${isLast ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3'}`}>
                                {[
                                  { label: 'Fee', value: fmtINR(s.selling_price), color: 'var(--text-primary)' },
                                  { label: 'Paid', value: fmtINR(s.amount_paid), color: '#059669' },
                                  { label: 'Balance', value: fmtINR(s.balance_amount), color: Number(s.balance_amount) > 0 ? '#ef4444' : '#059669' },
                                  ...(isLast ? [{ label: 'Days Left', value: client.days_left !== null ? `${client.days_left}d` : '—', color: '#6366f1' }] : []),
                                ].map(f => (
                                  <div key={f.label} className="rounded-[10px] p-2.5" style={{ background: 'var(--bg-subtle)' }}>
                                    <p className="text-[8.5px] font-[700] uppercase tracking-wider text-slate-500 mb-0.5">{f.label}</p>
                                    <p className="text-[12.5px] font-[760] tabular-nums" style={{ color: f.color }}>{f.value}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        }) : (() => {
                          const st = termStatus(client.pt_start_date, client.pt_end_date);
                          return (
                            <div className="rounded-[16px] p-4"
                              style={{ background: 'rgba(99,102,241,0.06)', border: '1.5px solid rgba(99,102,241,0.18)' }}>
                              <div className="flex items-start justify-between gap-3 mb-3">
                                <div className="flex min-w-0 items-center gap-2.5">
                                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-[800] text-indigo-600"
                                    style={{ background: 'rgba(99,102,241,0.12)' }}>1</span>
                                  <div className="min-w-0">
                                    <div className="flex min-w-0 items-center gap-2">
                                      <p className="min-w-0 truncate text-[13px] font-[700] text-gray-900">{client.package_type || '—'}</p>
                                      <span className="shrink-0 rounded-[5px] px-1.5 py-0.5 text-[8.5px] font-[800] uppercase tracking-wider text-indigo-600"
                                        style={{ background: 'rgba(99,102,241,0.12)' }}>Current</span>
                                    </div>
                                    <p className="text-[10.5px] text-slate-500 mt-0.5">
                                      {client.duration_months ? `${client.duration_months}m · ` : ''}
                                      {fmtDate(client.pt_start_date)} → {fmtDate(client.pt_end_date)}
                                    </p>
                                  </div>
                                </div>
                                <span className="shrink-0 rounded-[7px] px-2 py-0.5 text-[9.5px] font-[700] uppercase tracking-wider"
                                  style={{ background: st.bg, color: st.color }}>{st.label}</span>
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {[
                                  { label: 'Fee', value: fmtINR(client.final_amount), color: 'var(--text-primary)' },
                                  { label: 'Paid', value: fmtINR(client.paid_amount), color: '#059669' },
                                  { label: 'Balance', value: fmtINR(client.balance_amount), color: client.balance_amount > 0 ? '#ef4444' : '#059669' },
                                  { label: 'Days Left', value: client.days_left !== null ? `${client.days_left}d` : '—', color: '#6366f1' },
                                ].map(f => (
                                  <div key={f.label} className="rounded-[10px] p-2.5" style={{ background: 'var(--bg-subtle)' }}>
                                    <p className="text-[8.5px] font-[700] uppercase tracking-wider text-slate-500 mb-0.5">{f.label}</p>
                                    <p className="text-[12.5px] font-[760] tabular-nums" style={{ color: f.color }}>{f.value}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </m.div>
                  );
                })()}

                {/* ── DELETE MODAL ── */}
                <AnimatePresence>
                  {deleteOpen && (
                    <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
                      onClick={() => setDeleteOpen(false)}>
                      <m.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                        className="w-full max-w-sm overflow-hidden rounded-[24px] p-7 text-center bg-white"
                        style={{
                          border: '1px solid rgba(239,68,68,0.2)',
                          boxShadow: '0 24px 80px rgba(0,0,0,0.15)',
                        }}
                        onClick={e => e.stopPropagation()}>
                        <div className="mb-4 flex justify-center">
                          <div className="flex h-16 w-16 items-center justify-center rounded-full"
                            style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.2)' }}>
                            <AlertTriangle size={28} className="text-red-500" />
                          </div>
                        </div>
                        <h3 className="text-[18px] font-[800] tracking-[-0.02em] text-gray-900 mb-2">Delete Client</h3>
                        <p className="text-[13px] text-slate-500 mb-6">
                          Are you sure you want to delete <strong className="text-gray-900">{client?.name}</strong>? This cannot be undone.
                        </p>
                        <div className="flex gap-3 justify-center">
                          <button onClick={() => setDeleteOpen(false)}
                            className="rounded-[13px] px-5 py-2.5 text-[13px] font-[700] text-slate-500 transition hover:text-slate-700"
                            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
                            Cancel
                          </button>
                          <button onClick={handleDelete} disabled={deleting}
                            className="flex items-center gap-2 rounded-[13px] px-5 py-2.5 text-[13px] font-[700] text-white transition-all hover:opacity-80 disabled:opacity-60"
                            style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', boxShadow: '0 4px 16px rgba(239,68,68,0.4)' }}>
                            {deleting ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
                            {deleting ? 'Deleting…' : 'Delete Client'}
                          </button>
                        </div>
                      </m.div>
                    </m.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </div>
        </div>
      </AppShell>
    </Guard>
  );
}
