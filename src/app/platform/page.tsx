'use client';

// Platform Super Admin command centre (multi-tenant SaaS). Hidden, role='super_admin'
// only — tenant admins cannot reach it (enforced server-side by requireSuperAdmin +
// requireSuperAdminMfa, and client-side by Guard role="super_admin"). Three tabs:
//   Overview — cross-studio KPIs (revenue, clients, sessions, last activity)
//   Studios  — manage tenants and their login accounts (edit / add / remove / reset /
//              suspend / impersonate)
//   Activity — platform-wide audit feed

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import {
  Building2, Plus, Loader2, ShieldAlert, Users, Dumbbell, UserCircle,
  KeyRound, Power, X, Copy, RefreshCw, ChevronDown, ImagePlus,
  LayoutDashboard, Activity, LogIn, Pencil, Trash2, UserPlus, IndianRupee, Clock, Eye,
  CreditCard, Snowflake, Crown, Gift, RotateCcw, Receipt,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import StudioMark from '@/components/StudioMark';
import { Button, Badge, EmptyState } from '@/components/ui';
import { api } from '@/lib/api';
import type {
  Organization, OrganizationDetail, OrgUser,
  PlatformOverview, StudioOverview, ActivityEntry,
  SubStudio, SubKpis, SubDetail, SubPlan,
} from '@/lib/api';
import { setImpersonation } from '@/lib/http';
import { useToast } from '@/lib/toast';

function genPassword(len = 14): string {
  const cs = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
  const a = new Uint32Array(len);
  crypto.getRandomValues(a);
  let s = '';
  for (let i = 0; i < len; i++) s += cs[a[i] % cs.length];
  return s;
}

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

function fmtWhen(d?: string | null): string {
  if (!d) return 'never';
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return fmtDate(d);
}

function fmtINR(n: number | string | null | undefined): string {
  const v = Number(n ?? 0);
  if (v >= 100000) return '₹' + (v / 100000).toFixed(1) + 'L';
  if (v >= 1000) return '₹' + (v / 1000).toFixed(1) + 'K';
  return '₹' + v.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

const ROLE_OPTIONS = ['admin', 'manager', 'trainer', 'member'];

export default function PlatformAdminPage() {
  return (
    <Guard role="super_admin">
      <AppShell title="Platform Admin">
        <PlatformContent />
      </AppShell>
    </Guard>
  );
}

type Tab = 'overview' | 'studios' | 'billing' | 'activity';

function PlatformContent() {
  const [tab, setTab] = useState<Tab>('overview');

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={15} /> },
    { id: 'studios', label: 'Studios', icon: <Building2 size={15} /> },
    { id: 'billing', label: 'Billing', icon: <CreditCard size={15} /> },
    { id: 'activity', label: 'Activity', icon: <Activity size={15} /> },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-[14px]"
          style={{ background: 'linear-gradient(135deg,#0f172a,#334155)' }}>
          <Building2 size={20} color="#fff" />
        </div>
        <div>
          <h1 className="text-[20px] font-[840] tracking-tight" style={{ color: 'var(--text-primary)' }}>Command Centre</h1>
          <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>Manage every studio, admin, and account across the platform</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1.5 rounded-[14px] p-1" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-[10px] py-2 text-[12.5px] font-[700] transition"
            style={tab === t.id
              ? { background: 'linear-gradient(135deg,#0f172a,#334155)', color: '#fff' }
              : { color: 'var(--text-muted)' }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab />}
      {tab === 'studios' && <StudiosTab />}
      {tab === 'billing' && <BillingTab />}
      {tab === 'activity' && <ActivityTab />}
    </div>
  );
}

/* ─────────────────────────────────────────────────────── BILLING */
const SUB_STATE: Record<string, { label: string; tone: 'success' | 'danger' | 'warning' | 'neutral' }> = {
  active: { label: 'Active', tone: 'success' },
  trial: { label: 'Trial', tone: 'warning' },
  trial_expired: { label: 'Trial expired', tone: 'danger' },
  expired: { label: 'Expired', tone: 'danger' },
  frozen: { label: 'Frozen', tone: 'danger' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
  suspended: { label: 'Suspended', tone: 'danger' },
};

function BillingTab() {
  const { toast } = useToast();
  const [studios, setStudios] = useState<SubStudio[]>([]);
  const [kpis, setKpis] = useState<SubKpis | null>(null);
  const [plans, setPlans] = useState<SubPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payTarget, setPayTarget] = useState<SubStudio | null>(null);
  const [detailTarget, setDetailTarget] = useState<SubStudio | null>(null);

  const load = useCallback(() => {
    setLoading(true); setError('');
    api.superAdmin.subscriptions()
      .then((r) => { setStudios(r.data.studios ?? []); setKpis(r.data.kpis ?? null); })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load subscriptions'))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.subscription.plans().then((r) => setPlans(r.data.plans ?? [])).catch(() => {}); }, []);

  const quickFreeze = async (s: SubStudio, freeze: boolean) => {
    if (freeze && !window.confirm(`Freeze ${s.name}? Their team is signed out of protected features until they pay. No data is deleted.`)) return;
    try {
      if (freeze) await api.superAdmin.freezeSubscription(s.id);
      else await api.superAdmin.reactivateSubscription(s.id);
      toast.success(freeze ? 'Studio frozen.' : 'Studio reactivated.');
      load();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Update failed'); }
  };

  if (loading) return <Center><Loader2 size={26} className="animate-spin" style={{ color: '#6366f1' }} /></Center>;
  if (error) return <ErrorState error={error} onRetry={load} />;

  const kpiCards = kpis ? [
    { label: 'Revenue', value: fmtINR(kpis.total_revenue), sub: `${fmtINR(kpis.revenue_this_month)} this month`, color: '#10b981', icon: <IndianRupee size={18} /> },
    { label: 'Active', value: String(kpis.active), sub: `${kpis.trial} on trial`, color: '#6366f1', icon: <CreditCard size={18} /> },
    { label: 'Frozen', value: String(kpis.frozen), sub: 'need payment', color: '#ef4444', icon: <Snowflake size={18} /> },
    { label: 'Founders', value: `${kpis.founders}/50`, sub: `${kpis.founder_slots_remaining} slots left`, color: '#f59e0b', icon: <Crown size={18} /> },
  ] : [];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpiCards.map((k) => (
          <div key={k.label} className="rounded-[16px] p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="mb-2 flex items-center gap-2" style={{ color: k.color }}>{k.icon}
              <span className="text-[10px] font-[700] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{k.label}</span>
            </div>
            <p className="text-[22px] font-[840] tabular-nums" style={{ color: 'var(--text-primary)' }}>{k.value}</p>
            <p className="mt-0.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {studios.map((s) => {
          const st = SUB_STATE[s.effective_state] || { label: s.effective_state, tone: 'neutral' as const };
          const frozen = !s.allowed;
          const expiry = s.effective_state === 'trial' ? s.trial_ends_at : s.current_period_end;
          const daysLeft = s.effective_state === 'trial' ? s.trial_days_left : s.period_days_left;
          return (
            <div key={s.id} className="rounded-[18px] p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="flex flex-wrap items-center gap-3">
                <StudioMark name={s.name} logoUrl={s.logo_url} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[14.5px] font-[750]" style={{ color: 'var(--text-primary)' }}>{s.name}</p>
                    <Badge tone={st.tone}>{st.label}</Badge>
                    {s.is_founder && (
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-[750]"
                        style={{ background: 'rgba(245,158,11,0.12)', color: '#b45309' }}>
                        <Crown size={10} /> Founder #{s.founder_number}
                      </span>
                    )}
                    {s.renewal_due && <Badge tone="neutral">renewal due</Badge>}
                  </div>
                  <p className="truncate text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
                    {s.plan_name || 'No plan'}
                    {expiry ? ` · ${daysLeft != null ? `${daysLeft}d left · ` : ''}ends ${fmtDate(expiry)}` : ' · no expiry'}
                    {' · '}{s.client_count}{s.client_limit != null ? `/${s.client_limit}` : ''} clients
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={() => setPayTarget(s)}
                    className="flex h-9 items-center gap-1.5 rounded-[10px] px-3 text-[12px] font-[700] text-white transition hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg,#059669,#10b981)' }}>
                    <IndianRupee size={13} /> Record Payment
                  </button>
                  {frozen
                    ? <IconBtn title="Reactivate (comp)" onClick={() => quickFreeze(s, false)} tone="success"><RotateCcw size={12} /> Reactivate</IconBtn>
                    : <IconBtn title="Freeze" onClick={() => quickFreeze(s, true)} tone="danger"><Snowflake size={12} /> Freeze</IconBtn>}
                  <IconBtn title="Details & history" onClick={() => setDetailTarget(s)}><Receipt size={12} /> Details</IconBtn>
                </div>
              </div>
            </div>
          );
        })}
        {studios.length === 0 && <EmptyState icon={<CreditCard size={20} />} title="No studios" description="Studios will appear here once created." />}
      </div>

      {payTarget && <RecordPaymentModal studio={payTarget} plans={plans} onClose={() => setPayTarget(null)} onDone={() => { setPayTarget(null); load(); }} />}
      {detailTarget && <SubDetailModal studio={detailTarget} onClose={() => setDetailTarget(null)} onChanged={load} />}
    </div>
  );
}

// ── Record Payment (activate / renew) modal ──────────────────────────────────────
function RecordPaymentModal({ studio, plans, onClose, onDone }: { studio: SubStudio; plans: SubPlan[]; onClose: () => void; onDone: () => void }) {
  const { toast } = useToast();
  const [planCode, setPlanCode] = useState(studio.plan_code || (plans[0]?.code ?? 'starter'));
  const selected = plans.find((p) => p.code === planCode);
  const defaultAmount = studio.is_founder && studio.locked_price_inr != null ? studio.locked_price_inr : (selected?.effective_price_inr ?? selected?.price_inr ?? 0);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('upi');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { setAmount(String(defaultAmount || '')); }, [defaultAmount]);

  const submit = async () => {
    setSaving(true);
    try {
      await api.superAdmin.activateSubscription(studio.id, {
        plan_code: planCode,
        amount_inr: amount ? Number(amount) : undefined,
        method, reference: reference.trim() || undefined, notes: notes.trim() || undefined,
      });
      toast.success('Payment recorded — subscription activated.');
      onDone();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Activation failed'); setSaving(false); }
  };

  return (
    <Modal title={`Record payment · ${studio.name}`} onClose={onClose}>
      <div className="space-y-4">
        <Field label="Plan">
          <select className={inputCls} style={inputStyle} value={planCode} onChange={(e) => setPlanCode(e.target.value)}>
            {plans.map((p) => (
              <option key={p.code} value={p.code}>
                {p.name} — ₹{(p.effective_price_inr ?? p.price_inr).toLocaleString('en-IN')}{p.is_launch ? ' (launch)' : ''} / {p.duration_months}mo
                {p.client_limit != null ? ` · ${p.client_limit} clients` : ' · unlimited'}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Amount received (₹)">
          <input className={inputCls} style={inputStyle} type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          {studio.is_founder && <p className="mt-1 text-[11px]" style={{ color: '#b45309' }}>Founder — lifetime-locked price ₹{studio.locked_price_inr?.toLocaleString('en-IN')}.</p>}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Method">
            <select className={inputCls} style={inputStyle} value={method} onChange={(e) => setMethod(e.target.value)}>
              {['upi', 'bank', 'cash', 'razorpay', 'comp'].map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="Reference / UTR">
            <input className={inputCls} style={inputStyle} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="optional" />
          </Field>
        </div>
        <Field label="Notes">
          <input className={inputCls} style={inputStyle} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="optional" />
        </Field>
        {!studio.is_founder && <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>If founder slots remain, this studio becomes a Founder Member with this price locked for life.</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button loading={saving} disabled={saving} onClick={submit} style={{ background: 'linear-gradient(135deg,#059669,#10b981)', color: '#fff' }}>Activate</Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Subscription detail + history + overrides modal ──────────────────────────────
function SubDetailModal({ studio, onClose, onChanged }: { studio: SubStudio; onClose: () => void; onChanged: () => void }) {
  const { toast } = useToast();
  const [detail, setDetail] = useState<SubDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [newExpiry, setNewExpiry] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api.superAdmin.getSubscription(studio.id).then((r) => setDetail(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [studio.id]);
  useEffect(() => { load(); }, [load]);

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try { await fn(); toast.success(ok); load(); onChanged(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Action failed'); }
  };

  const o = detail?.organization;
  const onTrial = o?.subscription_status === 'trial';

  return (
    <Modal title={`Billing · ${studio.name}`} onClose={onClose}>
      {loading || !o ? (
        <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin" style={{ color: '#6366f1' }} /></div>
      ) : (
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="rounded-[12px] p-3 text-[12px]" style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>
            <div className="flex justify-between"><span>Status</span><b>{(SUB_STATE[o.effective_state]?.label) || o.effective_state}</b></div>
            <div className="flex justify-between"><span>Plan</span><b>{o.plan_name || '—'}</b></div>
            <div className="flex justify-between"><span>{onTrial ? 'Trial ends' : 'Renews'}</span><b>{fmtDate(onTrial ? o.trial_ends_at : o.current_period_end)}</b></div>
            {o.is_founder && <div className="flex justify-between" style={{ color: '#b45309' }}><span>Founder</span><b>#{o.founder_number} · ₹{o.locked_price_inr?.toLocaleString('en-IN')} locked</b></div>}
          </div>

          {/* Quick overrides */}
          <div className="flex flex-wrap gap-2">
            {!o.is_founder && <IconBtn title="Grant founder" onClick={() => act(() => api.superAdmin.grantFounder(studio.id), 'Founder granted.')} tone="success"><Gift size={12} /> Grant founder</IconBtn>}
            {o.subscription_status !== 'cancelled' && <IconBtn title="Cancel subscription" onClick={() => { if (window.confirm('Cancel this subscription? The studio will be blocked until they subscribe again.')) act(() => api.superAdmin.cancelSubscription(studio.id), 'Subscription cancelled.'); }} tone="danger"><X size={12} /> Cancel</IconBtn>}
          </div>
          <div className="flex items-end gap-2">
            <Field label={onTrial ? 'Extend trial to' : 'Change renewal date'}>
              <input className={inputCls} style={inputStyle} type="date" value={newExpiry} onChange={(e) => setNewExpiry(e.target.value)} />
            </Field>
            <Button variant="outline" disabled={!newExpiry} onClick={() => act(
              () => api.superAdmin.changeExpiry(studio.id, onTrial ? { trial_ends_at: newExpiry } : { current_period_end: newExpiry }),
              'Expiry updated.')}>Apply</Button>
          </div>

          {/* Invoices */}
          <div>
            <p className="mb-1.5 text-[11px] font-[700] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Invoices</p>
            {detail.invoices.length === 0 && <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>None yet.</p>}
            {detail.invoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between py-1.5 text-[12px]" style={{ borderTop: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{inv.invoice_number} · {fmtDate(inv.issued_at)}</span>
                <span className="tabular-nums font-[650]" style={{ color: inv.status === 'refunded' ? '#94a3b8' : 'var(--text-primary)', textDecoration: inv.status === 'refunded' ? 'line-through' : 'none' }}>{fmtINR(inv.amount_inr)}</span>
              </div>
            ))}
          </div>

          {/* Payments (with refund) */}
          <div>
            <p className="mb-1.5 text-[11px] font-[700] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Payments</p>
            {detail.payments.length === 0 && <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>None yet.</p>}
            {detail.payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 py-1.5 text-[12px]" style={{ borderTop: '1px solid var(--border)' }}>
                <span className="min-w-0 truncate" style={{ color: 'var(--text-secondary)' }}>{fmtDate(p.created_at)} · {p.method || '—'} · {fmtINR(p.amount_inr)}{p.status === 'refunded' ? ' (refunded)' : ''}</span>
                {p.status === 'paid' && <button onClick={() => { if (window.confirm('Refund this payment?')) act(() => api.superAdmin.refundPayment(p.id), 'Payment refunded.'); }} className="flex-shrink-0 text-[11px] font-[650]" style={{ color: '#dc2626' }}>Refund</button>}
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ─────────────────────────────────────────────────────── OVERVIEW */
function OverviewTab() {
  const [data, setData] = useState<PlatformOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true); setError('');
    api.superAdmin.overview()
      .then((r) => setData(r.data))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load overview'))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  if (loading) return <Center><Loader2 size={26} className="animate-spin" style={{ color: '#6366f1' }} /></Center>;
  if (error) return <ErrorState error={error} onRetry={load} />;
  if (!data) return null;

  const t = data.totals;
  const kpis = [
    { label: 'Studios', value: String(t.studios), sub: `${t.active_studios} active · ${t.suspended_studios} suspended`, color: '#6366f1', icon: <Building2 size={18} /> },
    { label: 'Total Revenue', value: fmtINR(t.revenue), sub: `${fmtINR(t.outstanding)} outstanding`, color: '#10b981', icon: <IndianRupee size={18} /> },
    { label: 'Active Clients', value: String(t.active_clients), sub: `${t.total_clients} total`, color: '#f59e0b', icon: <Users size={18} /> },
    { label: 'Sessions (mo)', value: String(t.sessions_this_month), sub: 'this month', color: '#ec4899', icon: <Clock size={18} /> },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-[16px] p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="mb-2 flex items-center gap-2" style={{ color: k.color }}>{k.icon}
              <span className="text-[10px] font-[700] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{k.label}</span>
            </div>
            <p className="text-[24px] font-[840] tabular-nums" style={{ color: 'var(--text-primary)' }}>{k.value}</p>
            <p className="mt-0.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-[16px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="border-b px-4 py-3" style={{ borderColor: 'var(--border)' }}>
          <p className="text-[13px] font-[750]" style={{ color: 'var(--text-primary)' }}>Studios at a glance</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12.5px]">
            <thead>
              <tr style={{ color: 'var(--text-muted)' }}>
                <th className="px-4 py-2.5 font-[650]">Studio</th>
                <th className="px-3 py-2.5 text-right font-[650]">Revenue</th>
                <th className="px-3 py-2.5 text-right font-[650]">Clients</th>
                <th className="px-3 py-2.5 text-right font-[650]">Sessions</th>
                <th className="px-3 py-2.5 font-[650]">Last active</th>
                <th className="px-4 py-2.5 font-[650]">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.studios.map((s: StudioOverview) => (
                <tr key={s.id} className="border-t" style={{ borderColor: 'var(--border)' }}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <StudioMark name={s.name} logoUrl={s.logo_url} size={28} />
                      <span className="font-[650]" style={{ color: 'var(--text-primary)' }}>{s.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums font-[650]" style={{ color: 'var(--text-primary)' }}>{fmtINR(s.revenue)}</td>
                  <td className="px-3 py-3 text-right tabular-nums" style={{ color: 'var(--text-secondary)' }}>{s.active_clients}<span style={{ color: 'var(--text-disabled)' }}>/{s.total_clients}</span></td>
                  <td className="px-3 py-3 text-right tabular-nums" style={{ color: 'var(--text-secondary)' }}>{s.sessions_this_month}</td>
                  <td className="px-3 py-3" style={{ color: 'var(--text-muted)' }}>{fmtWhen(s.last_login)}</td>
                  <td className="px-4 py-3"><Badge tone={s.status === 'suspended' ? 'danger' : 'success'}>{s.status}</Badge></td>
                </tr>
              ))}
              {data.studios.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center" style={{ color: 'var(--text-muted)' }}>No studios yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────── STUDIOS */
function StudiosTab() {
  const { toast } = useToast();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<OrgUser | null>(null);
  const [editTarget, setEditTarget] = useState<OrgUser | null>(null);
  const [addTarget, setAddTarget] = useState<Organization | null>(null);

  const load = useCallback(() => {
    setLoading(true); setError('');
    api.superAdmin.listOrgs()
      .then((r) => setOrgs(r.data ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load organizations'))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggleStatus = async (o: Organization) => {
    const next = o.status === 'active' ? 'suspended' : 'active';
    if (next === 'suspended' && !window.confirm(`Suspend "${o.name}"? All its logins will be signed out and blocked.`)) return;
    try {
      await api.superAdmin.updateOrg(o.id, { status: next });
      toast.success(next === 'suspended' ? 'Studio suspended.' : 'Studio reactivated.');
      load();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Update failed'); }
  };

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button iconLeft={<Plus size={14} />} onClick={() => setCreateOpen(true)}
          style={{ background: 'linear-gradient(135deg,#0f172a,#334155)', color: '#fff' }}>New Studio</Button>
      </div>

      {loading && <Center><Loader2 size={26} className="animate-spin" style={{ color: '#6366f1' }} /></Center>}
      {error && !loading && <ErrorState error={error} onRetry={load} />}
      {!loading && !error && orgs.length === 0 && (
        <EmptyState icon={<Building2 size={20} />} title="No studios yet" description="Create the first tenant workspace to onboard a trainer." />
      )}
      {!loading && !error && orgs.length > 0 && (
        <div className="space-y-3">
          {orgs.map((o) => (
            <OrgCard key={o.id} org={o}
              onToggleStatus={() => toggleStatus(o)}
              onResetPassword={setResetTarget}
              onEditUser={setEditTarget}
              onAddUser={() => setAddTarget(o)}
              onChanged={load} />
          ))}
        </div>
      )}

      {createOpen && <CreateOrgModal onClose={() => setCreateOpen(false)} onCreated={() => { setCreateOpen(false); load(); }} />}
      {resetTarget && <ResetPasswordModal user={resetTarget} onClose={() => setResetTarget(null)} />}
      {editTarget && <EditUserModal user={editTarget} onClose={() => setEditTarget(null)} onSaved={() => { setEditTarget(null); load(); }} />}
      {addTarget && <AddUserModal org={addTarget} onClose={() => setAddTarget(null)} onAdded={() => { setAddTarget(null); load(); }} />}
    </div>
  );
}

// ── Organization card (expandable to manage its users) ──────────────────────────
function OrgCard({ org, onToggleStatus, onResetPassword, onEditUser, onAddUser, onChanged }: {
  org: Organization;
  onToggleStatus: () => void;
  onResetPassword: (u: OrgUser) => void;
  onEditUser: (u: OrgUser) => void;
  onAddUser: () => void;
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<OrganizationDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [impLoading, setImpLoading] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const onLogoPick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = '';
    if (!file) return;
    setUploading(true);
    try {
      await api.superAdmin.uploadOrgLogo(org.id, file);
      toast.success('Logo updated.');
      onChanged();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Logo upload failed'); }
    finally { setUploading(false); }
  };

  const loadDetail = useCallback(() => {
    setLoadingDetail(true);
    api.superAdmin.getOrg(org.id)
      .then((r) => setDetail(r.data))
      .catch(() => {})
      .finally(() => setLoadingDetail(false));
  }, [org.id]);

  const toggleExpand = () => {
    const next = !expanded;
    setExpanded(next);
    if (next && !detail) loadDetail();
  };

  const toggleUser = async (u: OrgUser) => {
    try {
      await api.superAdmin.setUserActive(u.id, !u.is_active);
      toast.success(u.is_active ? 'Account deactivated.' : 'Account activated.');
      loadDetail(); onChanged();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Update failed'); }
  };

  const deleteUser = async (u: OrgUser) => {
    if (!window.confirm(`Remove ${u.name} (${u.email})? They will be signed out and can no longer log in.`)) return;
    try {
      await api.superAdmin.deleteUser(u.id);
      toast.success('Account removed.');
      loadDetail(); onChanged();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Delete failed'); }
  };

  const impersonate = async (mode: 'read_only' | 'full', userId?: string) => {
    if (mode === 'full' && !window.confirm(
      `Enter ${org.name} with FULL ACCESS?\n\nYou will be able to make changes to this studio's live data as its admin. Every change is recorded against you in the activity log.`
    )) return;
    const key = `${mode}:${userId || 'primary'}`;
    setImpLoading(key);
    try {
      const r = await api.superAdmin.impersonate(org.id, { userId, mode });
      const d = r.data;
      setImpersonation({
        token: d.token, readonly: d.readonly,
        adminId: d.admin.id, adminName: d.admin.name,
        orgId: d.organization.id, orgName: d.organization.name, orgLogo: d.organization.logo_url,
      });
      window.location.href = '/';
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not start impersonation');
      setImpLoading('');
    }
  };

  const suspended = org.status === 'suspended';

  return (
    <div className="rounded-[18px] overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div className="flex flex-wrap items-center gap-3 p-4">
        <div className="relative flex-shrink-0">
          <StudioMark name={org.name} logoUrl={org.logo_url} size={40} />
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={onLogoPick} />
          <button onClick={() => fileRef.current?.click()} disabled={uploading} title="Upload / change logo"
            className="absolute -bottom-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full transition hover:opacity-80"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
            {uploading ? <Loader2 size={11} className="animate-spin" /> : <ImagePlus size={11} />}
          </button>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-[14.5px] font-[750]" style={{ color: 'var(--text-primary)' }}>{org.name}</p>
            <Badge tone={suspended ? 'danger' : 'success'}>{org.status}</Badge>
          </div>
          <p className="truncate text-[11.5px]" style={{ color: 'var(--text-muted)' }}>/{org.slug} · created {fmtDate(org.created_at)}</p>
        </div>
        <div className="flex items-center gap-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>
          <span className="flex items-center gap-1"><UserCircle size={13} /> {org.user_count ?? 0}</span>
          <span className="flex items-center gap-1"><Dumbbell size={13} /> {org.trainer_count ?? 0}</span>
          <span className="flex items-center gap-1"><Users size={13} /> {org.client_count ?? 0}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => impersonate('read_only')} disabled={suspended || impLoading === 'read_only:primary'} title="View this studio as its admin (read-only)"
            className="flex h-9 items-center gap-1.5 rounded-[10px] px-3 text-[12px] font-[700] transition hover:opacity-80 disabled:opacity-40"
            style={{ background: 'rgba(99,102,241,0.10)', color: '#4f46e5', border: '1px solid rgba(99,102,241,0.25)' }}>
            {impLoading === 'read_only:primary' ? <Loader2 size={13} className="animate-spin" /> : <Eye size={13} />} View as
          </button>
          <button onClick={onToggleStatus} title={suspended ? 'Reactivate' : 'Suspend'}
            className="flex h-9 items-center gap-1.5 rounded-[10px] px-3 text-[12px] font-[700] transition hover:opacity-80"
            style={{
              background: suspended ? 'rgba(16,185,129,0.10)' : 'rgba(239,68,68,0.08)',
              color: suspended ? '#059669' : '#dc2626',
              border: `1px solid ${suspended ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.20)'}`,
            }}>
            <Power size={13} /> {suspended ? 'Reactivate' : 'Suspend'}
          </button>
          <button onClick={toggleExpand} title="Manage accounts"
            className="flex h-9 w-9 items-center justify-center rounded-[10px] transition hover:bg-black/5"
            style={{ border: '1px solid var(--border)' }}>
            <ChevronDown size={16} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: 'var(--text-muted)' }} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t px-4 py-3" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
          {loadingDetail && <div className="flex justify-center py-4"><Loader2 size={18} className="animate-spin" style={{ color: '#6366f1' }} /></div>}
          {detail && detail.users.length === 0 && <p className="py-2 text-[12px]" style={{ color: 'var(--text-muted)' }}>No login accounts.</p>}
          {detail && detail.users.map((u) => (
            <div key={u.id} className="flex flex-wrap items-center gap-2 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-[650]" style={{ color: 'var(--text-primary)' }}>
                  {u.name} <span className="font-[500]" style={{ color: 'var(--text-muted)' }}>· {u.role}</span>
                </p>
                <p className="truncate text-[11.5px]" style={{ color: 'var(--text-muted)' }}>{u.email} · last login {fmtWhen(u.last_login)}</p>
              </div>
              {!u.is_active && <Badge tone="danger">disabled</Badge>}
              {u.is_active && (
                <>
                  <IconBtn title="View as (read-only)" onClick={() => impersonate('read_only', u.id)} busy={impLoading === `read_only:${u.id}`}>
                    <Eye size={12} /> View
                  </IconBtn>
                  <IconBtn title="Act as (full access — changes are live, recorded against you)" onClick={() => impersonate('full', u.id)} busy={impLoading === `full:${u.id}`} tone="danger">
                    <LogIn size={12} /> Act as
                  </IconBtn>
                </>
              )}
              <IconBtn title="Edit" onClick={() => onEditUser(u)}><Pencil size={12} /> Edit</IconBtn>
              <IconBtn title="Reset password" onClick={() => onResetPassword(u)}><KeyRound size={12} /> Reset</IconBtn>
              <IconBtn title={u.is_active ? 'Deactivate' : 'Activate'} onClick={() => toggleUser(u)}
                tone={u.is_active ? 'danger' : 'success'}><Power size={12} /> {u.is_active ? 'Off' : 'On'}</IconBtn>
              <IconBtn title="Remove account" onClick={() => deleteUser(u)} tone="danger"><Trash2 size={12} /></IconBtn>
            </div>
          ))}
          {detail && (
            <button onClick={onAddUser}
              className="mt-2 flex items-center gap-1.5 rounded-[9px] px-2.5 py-1.5 text-[11.5px] font-[700] transition hover:bg-black/5"
              style={{ border: '1px dashed var(--border)', color: 'var(--text-secondary)' }}>
              <UserPlus size={12} /> Add account
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function IconBtn({ children, title, onClick, tone, busy }: {
  children: React.ReactNode; title: string; onClick: () => void; tone?: 'danger' | 'success'; busy?: boolean;
}) {
  const color = tone === 'danger' ? '#dc2626' : tone === 'success' ? '#059669' : 'var(--text-secondary)';
  const border = tone === 'danger' ? 'rgba(239,68,68,0.20)' : tone === 'success' ? 'rgba(16,185,129,0.25)' : 'var(--border)';
  return (
    <button onClick={onClick} title={title} disabled={busy}
      className="flex h-8 items-center gap-1.5 rounded-[9px] px-2.5 text-[11.5px] font-[650] transition hover:opacity-80 disabled:opacity-50"
      style={{ border: `1px solid ${border}`, color }}>
      {busy ? <Loader2 size={12} className="animate-spin" /> : children}
    </button>
  );
}

/* ─────────────────────────────────────────────────────── ACTIVITY */
const ACTIVITY_TONE: Record<string, string> = {
  user_impersonated: '#6366f1', user_deactivated: '#ef4444', user_deleted: '#ef4444',
  org_updated: '#f59e0b', org_created: '#10b981', user_created: '#10b981',
  user_activated: '#10b981', user_password_reset: '#f59e0b', user_updated: '#f59e0b',
};

function ActivityTab() {
  const [rows, setRows] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [orgFilter, setOrgFilter] = useState('');

  useEffect(() => { api.superAdmin.listOrgs().then((r) => setOrgs(r.data ?? [])).catch(() => {}); }, []);

  const load = useCallback(() => {
    setLoading(true); setError('');
    api.superAdmin.listActivity({ org_id: orgFilter || undefined, limit: 80 })
      .then((r) => setRows(r.data ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load activity'))
      .finally(() => setLoading(false));
  }, [orgFilter]);
  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <select value={orgFilter} onChange={(e) => setOrgFilter(e.target.value)}
          className="rounded-[10px] px-3 py-2 text-[12.5px] outline-none"
          style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
          <option value="">All studios</option>
          {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        <button onClick={load} className="flex h-9 w-9 items-center justify-center rounded-[10px] transition hover:bg-black/5"
          style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }} title="Refresh"><RefreshCw size={14} /></button>
      </div>

      {loading && <Center><Loader2 size={26} className="animate-spin" style={{ color: '#6366f1' }} /></Center>}
      {error && !loading && <ErrorState error={error} onRetry={load} />}
      {!loading && !error && rows.length === 0 && (
        <EmptyState icon={<Activity size={20} />} title="No activity" description="Nothing has been logged for this filter yet." />
      )}
      {!loading && !error && rows.length > 0 && (
        <div className="overflow-hidden rounded-[16px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          {rows.map((a, i) => (
            <div key={String(a.id)} className="flex items-center gap-3 px-4 py-2.5" style={i ? { borderTop: '1px solid var(--border)' } : undefined}>
              <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: ACTIVITY_TONE[a.action] || '#94a3b8' }} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-[650]" style={{ color: 'var(--text-primary)' }}>
                  <span className="font-[750]">{a.action.replace(/[._]/g, ' ')}</span>
                  {a.entity_type ? <span style={{ color: 'var(--text-muted)' }}> · {a.entity_type}</span> : null}
                </p>
                <p className="truncate text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  {a.user_name || 'system'}{a.organization_name ? ` · ${a.organization_name}` : ''}
                </p>
              </div>
              <span className="flex-shrink-0 text-[11px] tabular-nums" style={{ color: 'var(--text-disabled)' }}>{fmtWhen(a.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────── SHARED UI */
function Center({ children }: { children: React.ReactNode }) {
  return <div className="flex justify-center py-20">{children}</div>;
}
function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <ShieldAlert size={28} style={{ color: '#ef4444' }} />
      <p className="max-w-[420px] text-[14px] font-[600] text-slate-600">{error}</p>
      {/two-factor|2fa/i.test(error)
        ? <Button onClick={() => { window.location.href = '/settings/profile'; }}>Set up two-factor authentication</Button>
        : <Button variant="outline" iconLeft={<RefreshCw size={14} />} onClick={onRetry}>Retry</Button>}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(3px)' }} onClick={onClose}>
      <div className="w-full max-w-md rounded-[20px] p-6" onClick={(e) => e.stopPropagation()}
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 24px 60px rgba(15,23,42,0.30)' }}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[16px] font-[800]" style={{ color: 'var(--text-primary)' }}>{title}</h2>
          <button onClick={onClose} className="text-slate-400 transition hover:text-slate-600"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-[700] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</p>
      {children}
    </div>
  );
}

const inputCls = 'w-full rounded-[11px] px-3 py-2.5 text-[13.5px] outline-none';
const inputStyle: React.CSSProperties = { background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)' };

function PasswordField({ value, onChange, onGenerate }: { value: string; onChange: (v: string) => void; onGenerate: () => void }) {
  const { toast } = useToast();
  return (
    <div className="flex gap-2">
      <input className={inputCls} style={inputStyle} value={value} placeholder="Min 8 characters" onChange={(e) => onChange(e.target.value)} />
      <button onClick={onGenerate} title="Generate"
        className="flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-[11px] transition hover:bg-black/5"
        style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}><RefreshCw size={15} /></button>
      <button onClick={() => { if (value) { navigator.clipboard?.writeText(value); toast.success('Copied'); } }} title="Copy"
        className="flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-[11px] transition hover:bg-black/5"
        style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}><Copy size={15} /></button>
    </div>
  );
}

// ── Create Organization modal ───────────────────────────────────────────────────
function CreateOrgModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: '', trainer_name: '', email: '', password: '' });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.name.trim() || !form.email.trim() || form.password.length < 8) {
      toast.error('Name, a valid email, and an 8+ character password are required.'); return;
    }
    setSaving(true);
    try {
      await api.superAdmin.createOrg({
        name: form.name.trim(),
        trainer_name: form.trainer_name.trim() || undefined,
        email: form.email.trim(), password: form.password,
      });
      toast.success('Studio created.'); onCreated();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Create failed'); setSaving(false); }
  };

  return (
    <Modal title="New Studio" onClose={onClose}>
      <div className="space-y-4">
        <Field label="Studio name">
          <input className={inputCls} style={inputStyle} value={form.name} placeholder="e.g. Riya's Fitness Studio"
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </Field>
        <Field label="Owner / trainer name">
          <input className={inputCls} style={inputStyle} value={form.trainer_name} placeholder="Defaults to studio name"
            onChange={(e) => setForm((f) => ({ ...f, trainer_name: e.target.value }))} />
        </Field>
        <Field label="Login email">
          <input className={inputCls} style={inputStyle} type="email" value={form.email} placeholder="trainer@example.com"
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
        </Field>
        <Field label="Temporary password">
          <PasswordField value={form.password} onChange={(v) => setForm((f) => ({ ...f, password: v }))} onGenerate={() => setForm((f) => ({ ...f, password: genPassword() }))} />
          <p className="mt-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>Share with the owner; they change it after first login.</p>
        </Field>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button loading={saving} disabled={saving} onClick={submit} style={{ background: 'linear-gradient(135deg,#0f172a,#334155)', color: '#fff' }}>Create</Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Add User modal ──────────────────────────────────────────────────────────────
function AddUserModal({ org, onClose, onAdded }: { org: Organization; onClose: () => void; onAdded: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'admin' });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.name.trim() || !form.email.trim() || form.password.length < 8) {
      toast.error('Name, a valid email, and an 8+ character password are required.'); return;
    }
    setSaving(true);
    try {
      await api.superAdmin.addUser(org.id, { name: form.name.trim(), email: form.email.trim(), password: form.password, role: form.role });
      toast.success('Account added.'); onAdded();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Add failed'); setSaving(false); }
  };

  return (
    <Modal title={`Add account · ${org.name}`} onClose={onClose}>
      <div className="space-y-4">
        <Field label="Name">
          <input className={inputCls} style={inputStyle} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </Field>
        <Field label="Login email">
          <input className={inputCls} style={inputStyle} type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
        </Field>
        <Field label="Role">
          <select className={inputCls} style={inputStyle} value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
            {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </Field>
        <Field label="Temporary password">
          <PasswordField value={form.password} onChange={(v) => setForm((f) => ({ ...f, password: v }))} onGenerate={() => setForm((f) => ({ ...f, password: genPassword() }))} />
        </Field>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button loading={saving} disabled={saving} onClick={submit} style={{ background: 'linear-gradient(135deg,#0f172a,#334155)', color: '#fff' }}>Add</Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Edit User modal ─────────────────────────────────────────────────────────────
function EditUserModal({ user, onClose, onSaved }: { user: OrgUser; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: user.name, email: user.email, role: user.role });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.name.trim() || !form.email.trim()) { toast.error('Name and email are required.'); return; }
    setSaving(true);
    try {
      await api.superAdmin.updateUser(user.id, { name: form.name.trim(), email: form.email.trim(), role: form.role });
      toast.success('Account updated.'); onSaved();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Update failed'); setSaving(false); }
  };

  return (
    <Modal title="Edit account" onClose={onClose}>
      <div className="space-y-4">
        <Field label="Name">
          <input className={inputCls} style={inputStyle} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </Field>
        <Field label="Email">
          <input className={inputCls} style={inputStyle} type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
        </Field>
        <Field label="Role">
          <select className={inputCls} style={inputStyle} value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
            {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <p className="mt-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>Changing the role signs the account out so it re-authenticates with its new powers.</p>
        </Field>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button loading={saving} disabled={saving} onClick={submit} style={{ background: 'linear-gradient(135deg,#0f172a,#334155)', color: '#fff' }}>Save</Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Reset Password modal ─────────────────────────────────────────────────────────
function ResetPasswordModal({ user, onClose }: { user: OrgUser; onClose: () => void }) {
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (password.length < 8) { toast.error('Password must be at least 8 characters.'); return; }
    setSaving(true);
    try {
      await api.superAdmin.resetPassword(user.id, password);
      toast.success('Password reset. Existing sessions revoked.'); onClose();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Reset failed'); setSaving(false); }
  };

  return (
    <Modal title="Reset Password" onClose={onClose}>
      <p className="mb-4 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
        New password for <strong>{user.name}</strong> ({user.email}). This signs them out everywhere.
      </p>
      <Field label="New password">
        <PasswordField value={password} onChange={setPassword} onGenerate={() => setPassword(genPassword())} />
      </Field>
      <div className="flex justify-end gap-2 pt-5">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button loading={saving} disabled={saving} onClick={submit} style={{ background: 'linear-gradient(135deg,#0f172a,#334155)', color: '#fff' }}>Reset</Button>
      </div>
    </Modal>
  );
}
