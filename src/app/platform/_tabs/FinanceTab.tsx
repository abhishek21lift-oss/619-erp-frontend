'use client';

// Finance tab — billing, payments and subscription metrics.
//
// Extracted verbatim from the 3,197-line platform/page.tsx (audit H-03).
// Component bodies, props and rendered markup are unchanged.
import { useCallback, useEffect, useState } from 'react';
// `m`, not `motion` — AppShell mounts LazyMotion in strict mode.
import { m } from 'framer-motion';
import {
  Loader2, X, IndianRupee, CreditCard, Snowflake, Crown, Gift, RotateCcw, Receipt, Ticket,
  ArrowRight, TrendingUp, Wallet, FileText,
} from 'lucide-react';
import StudioMark from '@/components/StudioMark';
import { Button, Badge, EmptyState } from '@/components/ui';
import { api } from '@/lib/api';
import type {
  PlatformOverview, SubStudio, SubKpis, SubDetail, SubPlan, SubEvent, SubscriptionMetrics,
  PlanChangeQuote,
} from '@/lib/api';
import {
  SegmentedTabs, Panel, StatTile, Reveal, SectionLabel,
} from '@/components/platform/console';
import SubscriptionRequestsTab from '@/components/platform/subscription-requests';
import { useToast } from '@/lib/toast';
import { fmtDate, fmtINR, fmtWhen } from '../_shared/format';
import { InvoicesPanel } from '../_shared/panels';
import type { FinanceSubTab } from '../_shared/types';
import { Center, ErrorState, Field, IconBtn, Modal, inputCls, inputStyle } from '../_shared/ui';
import { CouponsTab } from './CouponsTab';

export function FinanceTab({ subTab, onSubTabChange }: { subTab: FinanceSubTab; onSubTabChange: (t: FinanceSubTab) => void }) {
  return (
    <div>
      <div className="mb-5 max-w-[500px]">
        <SegmentedTabs
          tabs={[
            { id: 'dashboard' as const, label: 'Dashboard', icon: <TrendingUp size={13} /> },
            { id: 'billing' as const, label: 'Billing', icon: <CreditCard size={13} /> },
            { id: 'payments' as const, label: 'Payments', icon: <Wallet size={13} /> },
            { id: 'invoices' as const, label: 'Invoices', icon: <Receipt size={13} /> },
            { id: 'coupons' as const, label: 'Coupons', icon: <Ticket size={13} /> },
          ]}
          value={subTab}
          onChange={onSubTabChange}
        />
      </div>
      <div key={subTab}>
        {subTab === 'dashboard' && <FinanceDashboardTab onNavigate={onSubTabChange} />}
        {subTab === 'billing' && <BillingTab />}
        {subTab === 'payments' && <SubscriptionRequestsTab />}
        {subTab === 'invoices' && <InvoicesPanel />}
        {subTab === 'coupons' && <CouponsTab />}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────── BILLING */
export const SUB_STATE: Record<string, { label: string; tone: 'success' | 'danger' | 'warning' | 'neutral' }> = {
  active: { label: 'Active', tone: 'success' },
  trial: { label: 'Trial', tone: 'warning' },
  trial_expired: { label: 'Trial expired', tone: 'danger' },
  expired: { label: 'Expired', tone: 'danger' },
  frozen: { label: 'Frozen', tone: 'danger' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
  suspended: { label: 'Suspended', tone: 'danger' },
};

// ── Finance Dashboard ─────────────────────────────────────────────────────────
// The run-rate view: MRR/ARR/ARPU/outstanding, the revenue trend + plan
// distribution + lifecycle breakdown already built for the old Billing tab
// (SaasMetrics, untouched), and a renewals/expiring list derived from the
// same subscriptions() call every other Finance surface uses. No LTV, no
// churn-rate percentage: this backend has no cohort/retention tracking to
// compute either honestly, and a made-up formula presented as a real metric
// is worse than not having the tile. The Lifecycle panel inside SaasMetrics
// already tells the churn story as real counts (frozen/lapsed/cancelled)
// instead of a single number that would need caveats to be true.
export function FinanceDashboardTab({ onNavigate }: { onNavigate: (t: FinanceSubTab) => void }) {
  const [kpis, setKpis] = useState<SubKpis | null>(null);
  const [studios, setStudios] = useState<SubStudio[]>([]);
  const [totals, setTotals] = useState<PlatformOverview['totals'] | null>(null);
  const [metrics, setMetrics] = useState<SubscriptionMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true); setError('');
    Promise.all([api.superAdmin.subscriptions(), api.superAdmin.overview()])
      .then(([subs, ov]) => {
        setKpis(subs.data.kpis ?? null);
        setStudios(subs.data.studios ?? []);
        setTotals(ov.data.totals);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load finance data'))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.superAdmin.subscriptionMetrics().then((r) => setMetrics(r.data)).catch(() => setMetrics(null)); }, []);

  if (loading) return <Center><Loader2 size={26} className="animate-spin" style={{ color: '#6366f1' }} /></Center>;
  if (error) return <ErrorState error={error} onRetry={load} />;

  const renewalsDue = studios
    .filter((s) => s.renewal_due || s.requested_at)
    .sort((a, b) => (a.period_days_left ?? 99) - (b.period_days_left ?? 99));

  const kpiCards = [
    { label: 'MRR', value: metrics ? fmtINR(metrics.mrr_inr) : '—', sub: metrics ? `${fmtINR(metrics.arr_inr)} ARR` : 'loading…', tone: 'positive' as const, icon: <TrendingUp size={15} /> },
    { label: 'ARPU', value: metrics ? fmtINR(metrics.arpu_inr) : '—', sub: metrics ? `${metrics.paying_studios} paying studios` : 'loading…', tone: 'brand' as const, icon: <IndianRupee size={15} /> },
    { label: 'Outstanding', value: totals ? fmtINR(totals.outstanding) : '—', sub: 'across all studios', tone: 'critical' as const, icon: <Receipt size={15} /> },
    { label: 'Founders', value: kpis && metrics ? `${kpis.founders}/${metrics.founders.limit}` : '—', sub: kpis ? `${kpis.founder_slots_remaining} slots left` : '', tone: 'caution' as const, icon: <Crown size={15} /> },
  ];

  return (
    <div className="space-y-5">
      <div>
        <SectionLabel>Run-rate</SectionLabel>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {kpiCards.map((k, i) => (
            <StatTile key={k.label} label={k.label} value={k.value} sub={k.sub}
              icon={k.icon} tone={k.tone} delay={i * 0.04} />
          ))}
        </div>
      </div>

      {metrics && <SaasMetrics data={metrics} />}

      <div>
        <SectionLabel hint={
          <button onClick={() => onNavigate('billing')} className="flex items-center gap-1 font-[650]" style={{ color: 'var(--brand)' }}>
            Manage in Billing <ArrowRight size={11} />
          </button>
        }>
          Renewals &amp; requests
        </SectionLabel>
        <Reveal delay={0.2}>
          <Panel padded={false} className="overflow-hidden">
            {renewalsDue.length === 0 ? (
              <p className="py-8 text-center text-[12.5px]" style={{ color: 'var(--text-muted)' }}>Nothing due right now.</p>
            ) : (
              renewalsDue.slice(0, 10).map((s, i) => (
                <button key={s.id} onClick={() => onNavigate('billing')}
                  className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-[12.5px] transition-colors hover:bg-black/[0.03]"
                  style={{ borderTop: i ? '1px solid var(--border)' : 'none' }}>
                  <span className="min-w-0 truncate" style={{ color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 650 }}>{s.name}</span> · {s.plan_name || 'No plan'}
                  </span>
                  <span className="flex flex-shrink-0 items-center gap-2">
                    {s.requested_at && <Badge tone="warning">requested</Badge>}
                    {s.period_days_left != null && <span className="tabular-nums" style={{ color: 'var(--text-muted)' }}>{s.period_days_left}d left</span>}
                  </span>
                </button>
              ))
            )}
          </Panel>
        </Reveal>
      </div>
    </div>
  );
}

export function BillingTab() {
  const { toast } = useToast();
  const [studios, setStudios] = useState<SubStudio[]>([]);
  const [plans, setPlans] = useState<SubPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payTarget, setPayTarget] = useState<SubStudio | null>(null);
  const [detailTarget, setDetailTarget] = useState<SubStudio | null>(null);

  const load = useCallback(() => {
    setLoading(true); setError('');
    api.superAdmin.subscriptions()
      .then((r) => { setStudios(r.data.studios ?? []); })
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

  return (
    <div className="space-y-5">
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
                  {/* Wraps rather than truncating: the studio name and its
                      status badges are the row's identity, and on a phone the
                      name was being cut to "Abhishek PT …". */}
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="text-[14.5px] font-[750] leading-tight" style={{ color: 'var(--text-primary)' }}>{s.name}</p>
                    <Badge tone={st.tone}>{st.label}</Badge>
                    {s.is_founder && (
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-[750]"
                        style={{ background: 'rgba(245,158,11,0.12)', color: '#b45309' }}>
                        <Crown size={10} /> Founder #{s.founder_number}
                      </span>
                    )}
                    {s.renewal_due && <Badge tone="neutral">renewal due</Badge>}
                    {s.requested_at && (
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-[750]"
                        style={{ background: 'rgba(245,158,11,0.14)', color: '#b45309' }}>
                        ● {s.requested_plan_name
                          ? s.requested_direction === 'downgrade' ? `Switch to ${s.requested_plan_name} requested`
                            : s.requested_direction === 'renewal' ? `Renewal (${s.requested_plan_name}) requested`
                            : s.requested_direction === 'upgrade' ? `Upgrade to ${s.requested_plan_name} requested`
                            : `Activate ${s.requested_plan_name} requested`
                          : 'Activation requested'}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11.5px] leading-snug" style={{ color: 'var(--text-muted)' }}>
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
export function RecordPaymentModal({ studio, plans, onClose, onDone }: { studio: SubStudio; plans: SubPlan[]; onClose: () => void; onDone: () => void }) {
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

// ── Execute a studio's requested plan change ──────────────────────────────────────
// Distinct from RecordPaymentModal on purpose: this calls changePlan(), which
// credits the unused value of the current period and restarts it from now —
// matching the priced quote the studio already confirmed. RecordPaymentModal's
// activateSubscription() stacks the new period on top of whatever time is
// left instead, which would double-grant days on top of a prorated charge.
export function ExecuteChangeModal({ studio, planCode, onClose, onDone }: { studio: SubStudio; planCode: string; onClose: () => void; onDone: () => void }) {
  const { toast } = useToast();
  const [quote, setQuote] = useState<PlanChangeQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('upi');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.superAdmin.changeQuote(studio.id, planCode)
      .then((r) => { if (!cancelled) { setQuote(r.data); setAmount(String(r.data.amount_due_inr || '')); } })
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Could not price this change'))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studio.id, planCode]);

  const submit = async () => {
    setSaving(true);
    try {
      await api.superAdmin.changePlan(studio.id, {
        plan_code: planCode,
        amount_inr: amount ? Number(amount) : undefined,
        method, reference: reference.trim() || undefined, notes: notes.trim() || undefined,
      });
      toast.success(`Switched ${studio.name} to ${quote?.new_plan.name || planCode}.`);
      onDone();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not execute this change'); setSaving(false); }
  };

  return (
    <Modal title={`Execute plan change · ${studio.name}`} onClose={onClose}>
      {loading || !quote ? (
        <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin" style={{ color: '#6366f1' }} /></div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-[12px] p-3 text-[12px]" style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>
            <div className="flex justify-between"><span>{quote.current_plan?.name || 'No plan'} → {quote.new_plan.name}</span><b style={{ textTransform: 'capitalize' }}>{quote.direction}</b></div>
            <div className="flex justify-between"><span>{quote.new_plan.name} plan</span><span>{fmtINR(quote.new_plan_price_inr)}</span></div>
            {quote.proration_credit_inr > 0 && (
              <div className="flex justify-between" style={{ color: '#10b981' }}><span>Unused time credited</span><span>−{fmtINR(quote.proration_credit_inr)}</span></div>
            )}
            <div className="flex justify-between" style={{ color: 'var(--text-primary)' }}><span>Quoted amount due</span><b>{fmtINR(quote.amount_due_inr)}</b></div>
          </div>
          {quote.warning && (
            <p className="rounded-[10px] p-2.5 text-[11.5px]" style={{ background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.28)', color: '#b45309' }}>{quote.warning}</p>
          )}
          <Field label="Amount received (₹)">
            <input className={inputCls} style={inputStyle} type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
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
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button loading={saving} disabled={saving} onClick={submit} style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)', color: '#fff' }}>Confirm change</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ── Subscription detail + history + overrides modal ──────────────────────────────
export function SubDetailModal({ studio, onClose, onChanged }: { studio: SubStudio; onClose: () => void; onChanged: () => void }) {
  const { toast } = useToast();
  const [detail, setDetail] = useState<SubDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [newExpiry, setNewExpiry] = useState('');
  const [showExecute, setShowExecute] = useState(false);

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
        <div className="space-y-4 max-h-[70vh] overflow-y-auto overscroll-contain">
          <div className="rounded-[12px] p-3 text-[12px]" style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>
            <div className="flex justify-between"><span>Status</span><b>{(SUB_STATE[o.effective_state]?.label) || o.effective_state}</b></div>
            <div className="flex justify-between"><span>Plan</span><b>{o.plan_name || '—'}</b></div>
            <div className="flex justify-between"><span>{onTrial ? 'Trial ends' : 'Renews'}</span><b>{fmtDate(onTrial ? o.trial_ends_at : o.current_period_end)}</b></div>
            {o.is_founder && <div className="flex justify-between" style={{ color: '#b45309' }}><span>Founder</span><b>#{o.founder_number} · ₹{o.locked_price_inr?.toLocaleString('en-IN')} locked</b></div>}
          </div>

          {/* Pending request — the studio asked for this via "Request this upgrade" /
              "Request activation". Execute here, NOT via Record Payment: that tool
              stacks the new period on top of remaining time, while this credits the
              unused time back (matching the quote the studio already saw). */}
          {studio.requested_at && studio.requested_plan_code && (
            <div className="rounded-[12px] p-3 text-[12px]" style={{ background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.28)' }}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span style={{ color: '#b45309' }}>
                  <b>{studio.requested_plan_name}</b> requested {fmtWhen(studio.requested_at)}
                  {studio.requested_direction ? ` (${studio.requested_direction})` : ''}
                </span>
                <Button onClick={() => setShowExecute(true)} style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)', color: '#fff' }}>
                  Review &amp; execute
                </Button>
              </div>
            </div>
          )}

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
              <div key={inv.id} className="flex items-center justify-between gap-2 py-1.5 text-[12px]" style={{ borderTop: '1px solid var(--border)' }}>
                <span className="min-w-0 truncate" style={{ color: 'var(--text-secondary)' }}>{inv.invoice_number} · {fmtDate(inv.issued_at)}</span>
                <span className="flex flex-shrink-0 items-center gap-2">
                  <span className="tabular-nums font-[650]" style={{ color: inv.status === 'refunded' ? '#94a3b8' : 'var(--text-primary)', textDecoration: inv.status === 'refunded' ? 'line-through' : 'none' }}>{fmtINR(inv.amount_inr)}</span>
                  {/* Reaching the document from the studio the operator is
                      already looking at, rather than making them go to Finance
                      and search for the number. */}
                  <a href={api.superAdmin.invoicePdfUrl(inv.id)} target="_blank" rel="noopener noreferrer"
                    aria-label={`Open invoice ${inv.invoice_number} as PDF`} style={{ color: 'var(--text-muted)' }}>
                    <FileText size={13} />
                  </a>
                </span>
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

          {/* Event history — every request, activation, change and reminder,
              oldest requests included, so "what did this studio ask for" is
              never just a notification the operator has to remember. */}
          <div>
            <p className="mb-1.5 text-[11px] font-[700] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>History</p>
            {detail.events.length === 0 && <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>None yet.</p>}
            {detail.events.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-2 py-1.5 text-[12px]" style={{ borderTop: '1px solid var(--border)' }}>
                <span className="min-w-0 truncate" style={{ color: 'var(--text-secondary)' }}>{eventLabel(e)}</span>
                <span className="flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{fmtWhen(e.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {showExecute && studio.requested_plan_code && (
        <ExecuteChangeModal
          studio={studio}
          planCode={studio.requested_plan_code}
          onClose={() => setShowExecute(false)}
          onDone={() => { setShowExecute(false); onChanged(); onClose(); }}
        />
      )}
    </Modal>
  );
}

// Friendly label for a raw subscription_events row — falls back to the bare
// event name for anything not called out below (e.g. new event types added
// later), so history is never a blank line.
export function eventLabel(e: SubEvent): string {
  const d = (e.data || {}) as Record<string, unknown>;
  switch (e.event) {
    case 'activation_requested': return `Activation requested${d.plan_code ? ` (${d.plan_code})` : ''}`;
    case 'change_requested': return `Plan change requested — ${d.direction || 'change'} to ${d.plan_code}${d.amount_due_inr != null ? ` · ${fmtINR(d.amount_due_inr as number)} due` : ''}`;
    case 'activated': return `Activated ${d.plan_code} · ${fmtINR(d.amount_inr as number)}`;
    case 'plan_changed': return `Plan changed ${d.from || '—'} → ${d.to} · ${fmtINR(d.charged_inr as number)}`;
    case 'downgrade_scheduled': return `Downgrade to ${d.to} scheduled for ${fmtDate(d.effective_at as string)}`;
    case 'downgrade_applied': return `Downgrade applied ${d.from || '—'} → ${d.to}`;
    case 'downgrade_cancelled': return 'Scheduled downgrade cancelled';
    case 'founder_granted': return `Founder #${d.founder_number} granted`;
    case 'frozen': return `Frozen${d.reason ? ` (${d.reason})` : ''}`;
    case 'reactivated': return 'Reactivated';
    case 'cancelled': return 'Subscription cancelled';
    case 'expired': return `Expired${d.reason ? ` (${d.reason})` : ''}`;
    case 'expiry_changed': return 'Expiry date changed';
    case 'refunded': return `Refunded ${fmtINR(d.amount_inr as number)}`;
    case 'reminder_sent': return `Reminder sent (${d.kind} · ${d.days}d)`;
    case 'trial_started': return `Trial started (${d.days}d)`;
    default: return e.event;
  }
}

// Generic "action.string" / "action_string" -> "Action string" fallback for
// anything not called out in ACTION_LABELS below — so the timeline is never a
// blank row when a new action type ships before this map is updated.
export function SaasMetrics({ data }: { data: SubscriptionMetrics }) {
  const maxRevenue = Math.max(1, ...data.revenue_trend.map((r) => r.revenue_inr));
  const planned = data.plan_distribution.filter((p) => p.studios > 0);
  const totalPlanned = planned.reduce((s, p) => s + p.studios, 0);

  const tiles = [
    { label: 'MRR', value: fmtINR(data.mrr_inr), sub: 'recurring run-rate', tone: 'positive' as const },
    { label: 'ARR', value: fmtINR(data.arr_inr), sub: 'MRR × 12', tone: 'brand' as const },
    { label: 'ARPU', value: fmtINR(data.arpu_inr), sub: `${data.paying_studios} paying`, tone: 'neutral' as const },
    {
      label: 'Trial → paid',
      value: data.trial_conversion.rate_pct == null ? '—' : `${data.trial_conversion.rate_pct}%`,
      sub: data.trial_conversion.started > 0
        ? `${data.trial_conversion.converted} of ${data.trial_conversion.started} trials`
        : 'no trials yet',
      tone: 'caution' as const,
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <SectionLabel hint="run-rate, not cash">Recurring</SectionLabel>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {tiles.map((t, i) => (
            <StatTile key={t.label} label={t.label} value={t.value} sub={t.sub} tone={t.tone} delay={i * 0.04} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Cash collected — distinct from the run-rate above. */}
        <Reveal delay={0.08}>
          <Panel className="h-full">
            <p className="text-[12.5px] font-[760]" style={{ color: 'var(--text-primary)' }}>Revenue collected</p>
            <p className="mb-3.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>Cash in, last 12 months</p>
            {data.revenue_trend.length === 0 ? (
              <p className="py-8 text-center text-[12px]" style={{ color: 'var(--text-muted)' }}>No payments recorded yet</p>
            ) : (
              <div className="flex items-end gap-1.5" style={{ height: 124 }}>
                {data.revenue_trend.map((r, i) => (
                  <div key={r.month} className="group flex flex-1 flex-col items-center gap-1.5"
                    title={`${r.label}: ${fmtINR(r.revenue_inr)} (${r.payments} payments)`}>
                    <m.div
                      className="w-full rounded-t-[4px]"
                      style={{
                        background: 'linear-gradient(180deg, #34D399 0%, #10B981 100%)',
                        transformOrigin: 'bottom',
                      }}
                      initial={{ height: 2 }}
                      animate={{ height: `${Math.max((r.revenue_inr / maxRevenue) * 96, 2)}px` }}
                      transition={{ duration: 0.5, delay: 0.12 + i * 0.03, ease: [0.16, 1, 0.3, 1] }}
                    />
                    <span className="text-[8.5px] tabular-nums" style={{ color: 'var(--text-muted)' }}>{r.label.slice(0, 3)}</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </Reveal>

        {/* Where the run-rate actually comes from. */}
        <Reveal delay={0.12}>
          <Panel className="h-full">
            <p className="text-[12.5px] font-[760]" style={{ color: 'var(--text-primary)' }}>Plan distribution</p>
            <p className="mb-3.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>Paying studios by plan</p>
            {planned.length === 0 ? (
              <p className="py-8 text-center text-[12px]" style={{ color: 'var(--text-muted)' }}>No studios on a paid plan yet</p>
            ) : (
              <div className="space-y-3">
                {planned.map((p, i) => (
                  <div key={p.code}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[12px] font-[680]" style={{ color: 'var(--text-primary)' }}>{p.name}</span>
                      <span className="text-[11.5px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
                        {p.studios} · {fmtINR(p.mrr_inr)}/mo
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--bg-subtle)' }}>
                      <m.div className="h-full rounded-full"
                        style={{ background: 'linear-gradient(90deg, var(--brand), #8B5CF6)' }}
                        initial={{ width: 0 }}
                        animate={{ width: `${totalPlanned > 0 ? (p.studios / totalPlanned) * 100 : 0}%` }}
                        transition={{ duration: 0.55, delay: 0.16 + i * 0.05, ease: [0.16, 1, 0.3, 1] }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </Reveal>
      </div>

      {/* Lifecycle spread — timestamp-aware, so a lapsed row the worker has not
          swept yet still reports as lapsed rather than active. */}
      <Reveal delay={0.16}>
      <Panel>
        <p className="mb-3 text-[12.5px] font-[760]" style={{ color: 'var(--text-primary)' }}>Lifecycle</p>
        <div className="flex flex-wrap gap-2">
          {([
            ['Active', data.states.active, '#10b981'],
            ['On trial', data.states.on_trial, '#f59e0b'],
            ['Trial lapsed', data.states.trial_lapsed, '#f97316'],
            ['Lapsed', data.states.lapsed, '#ef4444'],
            ['Frozen', data.states.frozen, '#ef4444'],
            ['Expired', data.states.expired, '#94a3b8'],
            ['Cancelled', data.states.cancelled, '#94a3b8'],
            ['Suspended', data.states.suspended, '#7c3aed'],
          ] as const).filter(([, n]) => n > 0).map(([label, n, colour]) => (
            <span key={label} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-[650]"
              style={{ background: `${colour}18`, color: colour }}>
              {label} <strong className="tabular-nums">{n}</strong>
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-[650]"
            style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
            Founders <strong className="tabular-nums">{data.founders.granted}/{data.founders.limit}</strong>
          </span>
        </div>
      </Panel>
      </Reveal>
    </div>
  );
}

