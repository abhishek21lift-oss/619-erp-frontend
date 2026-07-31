'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CopyId } from '@/components/ui/CopyId';
import { m, AnimatePresence } from 'framer-motion';
import {
  User, Calendar, Target,
  Dumbbell, Wallet, FileText, Activity, RefreshCw,
  CheckCircle, AlertTriangle, Clock, IndianRupee,
  Camera, Zap, Repeat, ChevronRight,
  TrendingUp, MessageCircle, Save, Trash2, Pencil,
  Award, HeartPulse, Salad, Flag, Phone,
  ShieldCheck, FileSignature, ClipboardList,
  QrCode, Printer, ScrollText, ChevronDown, Mail, Ruler, ClipboardCheck,
  StickyNote, FileBarChart, Sparkles,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';

import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { PremiumAreaChart } from '@/components/ui';
import ClientSnapshot from '@/components/pt-os/ClientSnapshot';
import {
  ClientTabs, TabPanel, EmptyPanel, LinkPanel, type TabKey,
} from '@/components/pt-os/client/ClientTabs';
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
  status: string;
  /** Absent, not zero, for a client with no PT term — check with `!= null`. */
  days_left: number | null;
  due_status?: string;
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
  const endPassed = pt_end_date ? new Date(pt_end_date) < new Date() : (days_left != null && days_left <= 0);
  if (endPassed) return { label: 'Inactive', color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', dot: '#64748b' };
  if (status === 'frozen') return { label: 'Frozen', color: '#60a5fa', bg: 'rgba(96,165,250,0.12)', dot: '#3b82f6' };
  if (status === 'active' && days_left != null && days_left <= 7) return { label: 'Expiring', color: '#f87171', bg: 'rgba(248,113,113,0.12)', dot: '#ef4444' };
  if (status === 'active') return { label: 'Active', color: '#34d399', bg: 'rgba(52,211,153,0.12)', dot: '#10b981' };
  if (status === 'expired' || status === 'inactive') return { label: 'Inactive', color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', dot: '#64748b' };
  return { label: status, color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', dot: '#64748b' };
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
  const [open, setOpen] = useState(false);
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
      {/* Collapsed by default. This is a print-once artefact — a trainer looks
          at it when a client joins and never again — and open it took 200px of
          a rail where everything else is read on every visit. */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex h-[44px] w-full items-center justify-between gap-2 rounded-[10px] px-3 text-[12px] font-[700] transition hover:opacity-80"
        style={{ background: 'rgba(8,145,178,0.10)', color: '#0891b2', border: '1px solid rgba(8,145,178,0.20)' }}
      >
        {open ? 'Hide code' : 'Show code'}
        <ChevronDown size={14} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
      </button>
      {open && (
        <div className="mt-3">
          {loading && <p className="text-[12px] text-gray-400">Generating…</p>}
          {error && <p className="text-[12px] text-red-500">{error}</p>}
          {dataUrl && !loading && (
            <div className="flex flex-col items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={dataUrl} alt="Check-in QR code" className="h-40 w-40 rounded-lg border border-zinc-100" />
              <button
                onClick={handlePrint}
                className="flex h-[44px] items-center gap-1.5 rounded-[10px] px-3 text-[12px] font-[700] transition hover:opacity-80"
                style={{ background: 'rgba(8,145,178,0.10)', color: '#0891b2', border: '1px solid rgba(8,145,178,0.20)' }}
              >
                <Printer size={13} /> Print Card
              </button>
            </div>
          )}
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

// Baseline Setup is NOT in this list. It belongs to onboarding — once a client
// has been measured or given a goal there is nothing to set up, and leaving it
// among the everyday actions made a one-time step look like a recurring one.
// It is prepended only while `baseline_done` is false. Delete is not here
// either: a destructive action does not belong in a grid of navigation tiles
// where it sits one row from "Photos". It lives inside Edit.
export default function PtClientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const [client, setClient] = useState<PtClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  /** From the snapshot: hides the one-time Baseline Setup tile once onboarded. */
  const [baselineDone, setBaselineDone] = useState(true);
  /** Which section of the workspace is open. Overview is where you land. */
  const [tab, setTab] = useState<TabKey>('overview');

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

      // Counts for the Activity Mix donut. Unfiltered on purpose: these are
      // totals, so any truncation would undercount them.
      setActivityCounts({
        payments: rawPayments.length,
        checkins: checkins.length,
        measurements: assessments.length,
        goals: goals.length,
      });

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

  // ── PT term progress, as a percentage for the bar ──
  // Elapsed over total, clamped: a term whose end date has passed is 100%
  // through it, not 140%.
  const totalDurationDays = client?.pt_start_date && client?.pt_end_date
    ? Math.max(1, Math.round((new Date(client.pt_end_date).getTime() - new Date(client.pt_start_date).getTime()) / 86400000))
    : 0;
  const elapsedDays = totalDurationDays > 0 && client?.pt_start_date
    ? Math.max(0, Math.min(totalDurationDays, Math.round((Date.now() - new Date(client.pt_start_date).getTime()) / 86400000)))
    : 0;
  const ptTermPct = totalDurationDays > 0 ? Math.round((elapsedDays / totalDurationDays) * 100) : 0;

  const statusCfg = client ? getStatusConfig(client.status, client.days_left, client.pt_end_date) : null;

  return (
    <Guard>
      <AppShell>
        <div className="min-h-screen">

          <div className="relative mx-auto max-w-screen-lg pb-6">

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
                {/* ── PROFILE CARD ──
                    Who this is, and the one action that edits them. Nothing
                    else: contact, enrolment and money each earned their own
                    block below, because stacking four unrelated jobs on one
                    surface made a card nobody could scan. */}
                <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="relative mb-3 overflow-hidden rounded-[28px] p-6 sm:p-8"
                  style={{
                    background: 'linear-gradient(135deg, #1e1b4b 0%, #2e1065 55%, #3b1a5c 100%)',
                    boxShadow: '0 20px 48px rgba(30,27,75,0.35)',
                  }}>
                  <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full blur-3xl"
                    style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.40), transparent 70%)' }} />
                  <div className="pointer-events-none absolute -bottom-32 -left-24 h-72 w-72 rounded-full blur-3xl"
                    style={{ background: 'radial-gradient(circle, rgba(45,212,191,0.20), transparent 70%)' }} />

                  <div className="relative flex items-start gap-4 sm:gap-6">
                    <div className="flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-[24px] text-[26px] font-[860] text-white sm:h-[100px] sm:w-[100px] sm:rounded-[30px] sm:text-[32px]"
                      style={{
                        background: 'rgba(255,255,255,0.09)',
                        border: '1px solid rgba(255,255,255,0.16)',
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), 0 10px 24px rgba(0,0,0,0.28)',
                      }}>
                      {initials(client.name)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <h1 className="min-w-0 text-[22px] font-[880] leading-[1.15] tracking-[-0.03em] text-white sm:text-[34px]">
                          {client.name}
                        </h1>
                        {statusCfg && (
                          <span className="flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5"
                            style={{ background: statusCfg.bg, border: `1px solid ${statusCfg.color}30` }}>
                            <span className="h-1.5 w-1.5 rounded-full" style={{ background: statusCfg.dot }} />
                            <span className="text-[10px] font-[800] uppercase tracking-wider" style={{ color: statusCfg.color }}>
                              {statusCfg.label}
                            </span>
                          </span>
                        )}
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        <CopyId id={client.unique_id || client.client_id || client.id.slice(0, 8)} color="#2dd4bf" />
                        {client.trainer_name && (
                          <span className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-[700]"
                            style={{ background: 'rgba(196,181,253,0.18)', color: '#c4b5fd' }}>
                            <User size={11} />{client.trainer_name}
                          </span>
                        )}
                      </div>

                      {client.email && (
                        <p className="mt-2.5 truncate text-[12px] font-[600]" style={{ color: 'rgba(255,255,255,0.55)' }}>
                          {client.email}
                        </p>
                      )}

                      {/* Edit belongs to the identity, so it lives with it. */}
                      <button onClick={() => router.push(`/pt-os/clients/${id}/edit`)}
                        className="mt-4 flex h-[44px] items-center gap-2 rounded-[13px] px-4 text-[12.5px] font-[750] text-white transition-all hover:brightness-125"
                        style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)' }}>
                        <Pencil size={13} /> Edit profile
                      </button>
                    </div>
                  </div>
                </m.div>

                {/* ── THE FOUR THINGS YOU DO FROM HERE ──
                    Contact them, message them, sell them a term, renew it. One
                    row, one weight — they are peers, and burying them among the
                    identity made them read as decoration on the card. */}
                <div className="mb-3 grid grid-cols-4 gap-2">
                  {[
                    client.mobile
                      ? { key: 'call', label: client.mobile, icon: <Phone size={16} />, from: '#6366f1', to: '#4f46e5', href: `tel:${client.mobile}` }
                      : null,
                    client.mobile
                      ? { key: 'wa', label: 'WhatsApp', icon: <MessageCircle size={16} />, from: '#10b981', to: '#059669', href: whatsappHref(client.mobile, client.name), external: true }
                      : null,
                    { key: 'enroll', label: 'Enroll in PT', icon: <Award size={16} />, from: '#f59e0b', to: '#d97706', push: `/pt-os/clients/${id}/enroll` },
                    { key: 'renew', label: 'Renew PT', icon: <Repeat size={16} />, from: '#06b6d4', to: '#0891b2', push: `/pt-os/clients/${id}/renew` },
                  ].filter(Boolean).map((a) => {
                    const item = a as { key: string; label: string; icon: React.ReactNode; from: string; to: string; href?: string; push?: string; external?: boolean };
                    const inner = (
                      <>
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px]"
                          style={{ background: `linear-gradient(135deg, ${item.from}, ${item.to})`, boxShadow: `0 3px 10px ${item.from}40` }}>
                          <span className="text-white">{item.icon}</span>
                        </span>
                        {/* Wraps rather than truncates. A phone number cut to
                            "+919876…" is worse than no number at all — you
                            cannot read it and you cannot dial it. */}
                        <span className="w-full text-center text-[10px] font-[720] leading-tight text-slate-700 sm:text-[12px]"
                          style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'break-word' }}>
                          {item.label}
                        </span>
                      </>
                    );
                    const cls = 'flex min-h-[76px] w-full flex-col items-center justify-center gap-2 rounded-[18px] p-2.5 transition-all duration-200 hover:-translate-y-0.5 sm:min-h-[64px] sm:flex-row sm:gap-2.5 sm:p-3';
                    const st: React.CSSProperties = {
                      background: 'var(--bg-card)', border: '1px solid var(--border)',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                    };
                    return item.push
                      ? <button key={item.key} onClick={() => router.push(item.push!)} className={cls} style={st}>{inner}</button>
                      : (
                        <a key={item.key} href={item.href}
                          {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                          className={cls} style={st}>{inner}</a>
                      );
                  })}
                </div>

                {/* ── MONEY ──
                    The same hairline grid it has always been, on its own card
                    now. It is a different question from "who is this", and it
                    is the one a trainer is asked about at the door. */}
                <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="mb-4 overflow-hidden rounded-[24px]"
                  style={{
                    background: 'linear-gradient(135deg, #241f5c 0%, #34157a 100%)',
                    boxShadow: '0 12px 32px rgba(30,27,75,0.28)',
                  }}>
                  <div className="grid grid-cols-3 gap-px" style={{ background: 'rgba(255,255,255,0.12)' }}>
                    {[
                      { label: 'Term fee', value: fmtINR(currentTermFee), sub: 'Current term', tone: '#c4b5fd' },
                      { label: 'Paid', value: fmtINR(currentTermPaid), sub: `${completionPct}% complete`, tone: '#6ee7b7' },
                      {
                        label: 'Balance', value: fmtINR(currentTermBalance),
                        sub: currentTermBalance > 0 ? (client.due_status === 'OVERDUE' ? 'Overdue' : 'Due') : 'Cleared',
                        tone: currentTermBalance > 0 ? '#fca5a5' : '#6ee7b7',
                      },
                    ].map((k) => (
                      <div key={k.label} className="px-3 py-4 sm:px-5" style={{ background: 'rgba(255,255,255,0.04)' }}>
                        <p className="text-[9px] font-[750] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.55)' }}>
                          {k.label}
                        </p>
                        <p className="mt-1 truncate text-[18px] font-[860] tracking-[-0.02em] text-white sm:text-[22px]">
                          {k.value}
                        </p>
                        <p className="mt-0.5 truncate text-[10px] font-[700]" style={{ color: k.tone }}>{k.sub}</p>
                      </div>
                    ))}
                  </div>
                </m.div>

                {/* ── WHAT NEEDS ATTENTION, THE GOAL, THE COACH, THE RECORDS ──
                    Replaces three donuts. A ring is the right shape for a
                    share of a whole and the wrong one for progress toward a
                    target: you cannot see whether 68% is ahead or behind, and
                    there is nowhere to put the numbers that make it mean
                    something. Activity Mix went entirely — the ratio of
                    payments to check-ins is not a question anybody asks. */}
                <ClientSnapshot clientId={client.id} onLoaded={(s) => setBaselineDone(s.baseline_done)} />

                {/* PT term, as a bar. The one donut worth keeping as a figure,
                    because "days left" is what gets asked, but a bar shows how
                    far through the term they are without having to read a ring. */}
                <m.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.35 }}
                  className="mb-5 rounded-[22px] bg-white p-4 sm:p-5"
                  style={{ border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                  <div className="mb-3.5 flex items-center justify-between gap-3 pb-3.5"
                    style={{ borderBottom: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]"
                        style={{ background: 'linear-gradient(135deg, #818cf8, #6366f1)', boxShadow: '0 3px 12px #6366f145' }}>
                        <Clock size={16} className="text-white" />
                      </span>
                      <h3 className="text-[13.5px] font-[740] text-gray-900">PT term</h3>
                    </div>
                    <span className="text-[13px] font-[820] tabular-nums" style={{ color: '#6366f1' }}>
                      {client.days_left != null ? `${client.days_left} days left` : '—'}
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--bg-subtle)' }}
                    role="progressbar" aria-valuenow={ptTermPct} aria-valuemin={0} aria-valuemax={100}>
                    <m.div initial={{ width: 0 }} animate={{ width: `${ptTermPct}%` }}
                      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                      className="h-full rounded-full"
                      style={{ background: 'linear-gradient(90deg, #6366f1, #6366f1bb)' }} />
                  </div>
                  <div className="mt-2.5 flex justify-between">
                    <span className="text-[10.5px] font-[600] text-slate-500">Start {fmtDate(client.pt_start_date)}</span>
                    <span className="text-[10.5px] font-[600] text-slate-500">End {fmtDate(client.pt_end_date)}</span>
                  </div>
                </m.div>

                {/* ── WORKSPACE ──
                    Twelve sections instead of thirteen tiles. The tiles all
                    did the same thing — leave. Working on a client meant open
                    profile, tap tile, read, go back, tap the next one. Tabs
                    keep the trainer on the client, and a tab says what it
                    holds before you open it. Every destination the grid had is
                    still reachable, inside the section it belongs to. */}
                <ClientTabs active={tab} onChange={setTab} />

                <TabPanel id="overview" active={tab}>

                {/* ── DETAIL BANDS ──
                    Was a 2/1 split: a main column and a taller rail.
                    With the weight chart hidden — which it is for any
                    client with fewer than two readings, i.e. most of
                    them — the main column held one card while the rail
                    held four, so the page ended in a column-high void.
                    Full-width bands instead: each row is balanced by
                    construction and there is nothing left to run out. */}
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
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

                </div>

                <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
                  {/* Personal Info */}
                  <DarkCard title="Personal Info" icon={<User size={14} />} from="#db2777">
                    <InfoRow label="Gender" value={client.gender || '—'} />
                    <InfoRow label="Date of Birth" value={fmtDate(client.dob)} />
                    <InfoRow label="Phone" value={client.mobile || '—'} />
                    <InfoRow label="Email" value={client.email || '—'} />
                    <InfoRow label="Joined" value={fmtDate(client.joining_date)} />
                  </DarkCard>
                  {/* PT Assignment */}
                  <DarkCard title="PT Assignment" icon={<Dumbbell size={14} />} from="#7c3aed">
                    <InfoRow label="Start" value={fmtDate(client.pt_start_date)} />
                    <InfoRow label="End" value={fmtDate(client.pt_end_date)} />
                    <InfoRow label="Duration" value={client.duration_months ? `${client.duration_months} months` : '—'} />
                    <InfoRow label="Monthly Fee" value={fmtINR(client.monthly_pt_amount)} />
                    <InfoRow label="Days Left" value={client.days_left != null ? `${client.days_left} days` : '—'}
                      valueColor={client.days_left != null && client.days_left <= 7 ? '#ef4444' : undefined} />
                  </DarkCard>

                </div>

                <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {/* Check-in QR */}
                  <QrCheckinCard clientId={client.id} clientName={client.name} />

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

                </TabPanel>

                <TabPanel id="payments" active={tab}>
                  <div className="mb-4">
                    <LinkPanel
                      icon={<Wallet size={16} />}
                      title="Payments"
                      body="What has been taken, what is outstanding, and the sessions it bought."
                      links={[
                        { label: 'Payment history', href: `/pt-os/clients/${client.id}/payments`, hint: 'Every transaction' },
                        { label: 'Session balance', href: `/pt-os/session-balance?client_id=${client.id}`, hint: 'Packages and sessions left' },
                      ]}
                    />
                  </div>
                {/* ── SUBSCRIPTION HISTORY (summary → dedicated page) ── */}
                <m.button
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                  onClick={() => router.push(`/pt-os/clients/${client.id}/subscriptions`)}
                  className="group mt-5 block w-full overflow-hidden rounded-[24px] p-6 text-left transition-all duration-200 hover:-translate-y-0.5 bg-white"
                  style={{
                    border: '1px solid var(--border)',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                  }}>
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-[13px]"
                        style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)' }}>
                        <Repeat size={18} className="text-indigo-500" />
                      </div>
                      <div>
                        <h3 className="text-[14.5px] font-[760] text-gray-900">PT Subscription History</h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {lifetimeTermCount} term{lifetimeTermCount !== 1 ? 's' : ''} · {fmtINR(lifetimePaid)} lifetime paid
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {currentTermBalance > 0 ? (
                        <span className="rounded-[7px] px-2.5 py-1 text-[10px] font-[700] uppercase tracking-wider"
                          style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                          {fmtINR(currentTermBalance)} due
                        </span>
                      ) : (
                        <span className="rounded-[7px] px-2.5 py-1 text-[10px] font-[700] uppercase tracking-wider"
                          style={{ background: 'rgba(16,185,129,0.1)', color: '#059669' }}>
                          Cleared
                        </span>
                      )}
                      <ChevronRight size={18} className="text-indigo-400 transition-transform duration-200 group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </m.button>

                </TabPanel>

                {/* ── The sections whose work lives on its own screen ──
                    These do NOT re-implement the workout log, the diet
                    planner or the photo gallery. Those pages exist and work; a
                    second copy inside a tab is a second thing to keep correct,
                    and the copy is the one that drifts. Each panel says what
                    is there and sends you to the screen that owns it.

                    The empty states are not placeholders. Most of these tables
                    are empty in a new studio, and a tab that renders nothing
                    reads as a broken feature — so each says what would be here
                    and carries the control that puts it there. */}
                <TabPanel id="training" active={tab}>
                  <LinkPanel
                    icon={<Dumbbell size={16} />}
                    title="Training"
                    body={activePlanName
                      ? `Currently running "${activePlanName}".`
                      : 'No programme is assigned yet — start with a plan, then build the week.'}
                    links={[
                      { label: 'Workout programmes', href: `/pt-os/workout-plans?client_id=${client.id}`, hint: 'Design or assign a plan' },
                      { label: 'Assigned programme', href: `/pt-os/clients/${client.id}/training/assigned`, hint: 'What they are on now' },
                      { label: 'Progress analytics', href: `/pt-os/clients/${client.id}/training/analytics`, hint: 'Volume, intensity, trend' },
                      { label: 'Strength tracking', href: `/pt-os/strength-tracking?client_id=${client.id}`, hint: 'Estimated 1RM and lifts' },
                      { label: 'Sessions', href: `/pt-os/sessions?client_id=${client.id}`, hint: 'Book and review sessions' },
                      { label: 'Goals', href: `/pt-os/goals?client_id=${client.id}`, hint: 'What they are training for' },
                    ]}
                  />
                </TabPanel>

                <TabPanel id="log" active={tab}>
                  <LinkPanel
                    icon={<ScrollText size={16} />}
                    title="Workout log"
                    body="Every set that was actually performed — weight, reps, and the records they beat."
                    links={[
                      { label: 'Open the workout log', href: `/pt-os/clients/${client.id}/workout-log`, hint: 'Sets, reps, RPE, notes' },
                      { label: 'Progress analytics', href: `/pt-os/clients/${client.id}/training/analytics`, hint: 'Volume and trend over time' },
                    ]}
                  />
                </TabPanel>

                <TabPanel id="measurements" active={tab}>
                  <LinkPanel
                    icon={<Ruler size={16} />}
                    title="Measurements"
                    body="Weight and body composition come from the fitness test. Circumference tracking fills in as measurements are recorded."
                    links={[
                      { label: 'Measurements', href: `/pt-os/measurements?client_id=${client.id}`, hint: 'Weight, body fat, circumferences' },
                      { label: 'Record a fitness test', href: `/pt-os/assessment?client_id=${client.id}`, hint: 'Weight, BMI, body fat, scores' },
                      { label: 'Progress tracking setup', href: `/pt-os/progress-tracking-setup?client_id=${client.id}`, hint: 'Choose what to measure' },
                    ]}
                  />
                </TabPanel>

                <TabPanel id="nutrition" active={tab}>
                  <LinkPanel
                    icon={<Salad size={16} />}
                    title="Nutrition"
                    body="Calories, macros and compliance appear here once meals are being logged against a plan."
                    links={[
                      { label: 'Nutrition assessment', href: `/pt-os/nutrition-assessment?client_id=${client.id}`, hint: 'Habits, preferences, targets' },
                      { label: 'Diet plans', href: `/pt-os/diet-plans?client_id=${client.id}`, hint: 'Assign a meal plan' },
                    ]}
                  />
                </TabPanel>

                <TabPanel id="checkins" active={tab}>
                  <EmptyPanel
                    icon={<ClipboardCheck size={20} />}
                    title="No check-ins recorded yet"
                    body="Weekly check-ins are where mood, energy, stress, sleep and recovery come from. Without them the recovery picture stays blank — this is the single fastest way to make the profile useful."
                    actions={[{ label: 'Start a weekly check-in', href: `/pt-os/weekly-checkin?client_id=${client.id}` }]}
                  />
                </TabPanel>

                <TabPanel id="photos" active={tab}>
                  <EmptyPanel
                    icon={<Camera size={20} />}
                    title="No progress photos yet"
                    body="Front, side and back photos over time are the comparison clients respond to most. They stay private to the studio."
                    actions={[{ label: 'Add progress photos', href: `/pt-os/progress-photos?client_id=${client.id}` }]}
                  />
                </TabPanel>

                <TabPanel id="notes" active={tab}>
                  <LinkPanel
                    icon={<StickyNote size={16} />}
                    title="Notes"
                    body="Coach notes live on the Overview tab, beside the client's details — they are read alongside everything else rather than filed away."
                    links={[{ label: 'Go to Overview', href: `/pt-os/clients/${client.id}`, hint: 'Notes card is there' }]}
                  />
                </TabPanel>

                <TabPanel id="ai" active={tab}>
                  <LinkPanel
                    icon={<Sparkles size={16} />}
                    title="AI Coach"
                    body="The observations above the tabs are derived from this client's own readings. The assistant can go further — ask it about their programme, recovery or nutrition."
                    links={[
                      { label: 'AI progress analysis', href: `/ai/progress-analysis?client_id=${client.id}`, hint: 'Trend and recommendations' },
                      { label: 'AI workout generator', href: `/ai/workout-generator?client_id=${client.id}`, hint: 'Draft a programme' },
                      { label: 'AI diet generator', href: `/ai/diet-generator?client_id=${client.id}`, hint: 'Draft a meal plan' },
                      { label: 'Training brief', href: `/pt-os/workout-plans?client_id=${client.id}`, hint: 'Everything needed to design a programme' },
                    ]}
                  />
                </TabPanel>

                <TabPanel id="reports" active={tab}>
                  <LinkPanel
                    icon={<FileBarChart size={16} />}
                    title="Reports"
                    body="A shareable summary of this client's month — sessions, progress and what changed."
                    links={[{ label: 'Reports', href: `/pt-os/reports?client_id=${client.id}`, hint: 'Generate and share' }]}
                  />
                </TabPanel>

                <TabPanel id="documents" active={tab}>
                  {/* Screening. These forms were reachable only from the old
                      grid's Screening submenu, so removing the grid would have
                      stranded lifestyle, posture and mobility — assessments the
                      training brief reads from and nothing else links to. */}
                  <div className="mb-4">
                    <LinkPanel
                      icon={<ShieldCheck size={16} />}
                      title="Screening &amp; assessments"
                      body="The forms the training brief is assembled from."
                      links={[
                        { label: 'PAR-Q', href: `/pt-os/parq?client_id=${client.id}`, hint: 'Medical clearance' },
                        { label: 'Informed consent', href: `/pt-os/informed-consent?client_id=${client.id}`, hint: 'Signed agreement' },
                        { label: 'Lifestyle assessment', href: `/pt-os/lifestyle-assessment?client_id=${client.id}`, hint: 'Sleep, stress, recovery' },
                        { label: 'Posture assessment', href: `/pt-os/posture-assessment?client_id=${client.id}`, hint: 'Alignment findings' },
                        { label: 'Mobility assessment', href: `/pt-os/mobility-assessment?client_id=${client.id}`, hint: 'Restriction and pain' },
                        { label: 'Fitness testing', href: `/pt-os/assessment?client_id=${client.id}`, hint: 'Strength, cardio, flexibility' },
                      ]}
                    />
                  </div>
                {/* ── DOCUMENTS ──
                    At the bottom on purpose. PAR-Q and consent are a status you
                    check once when onboarding and then only if something is
                    wrong; sitting at the top of the rail it pushed the notes a
                    trainer actually reads on every visit below the fold. */}
                <div className="mt-5">
                  <DocumentsCard clientId={client.id} />
                </div>
                </TabPanel>

              </>
            )}
          </div>
        </div>
      </AppShell>
    </Guard>
  );
}
