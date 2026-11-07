'use client';

// Finance tab — billing, payments and subscription metrics.
//
// Extracted verbatim from the 3,197-line platform/page.tsx (audit H-03).
// Component bodies, props and rendered markup are unchanged.
import { useCallback, useEffect, useState } from 'react';
// `m`, not `motion` — AppShell mounts LazyMotion in strict mode.
import { m } from 'framer-motion';
import {
  Loader2, X, IndianRupee, CreditCard, Snowflake, Crown, Gift, RotateCcw, Receipt,
  ArrowRight, Wallet, FileText, AlertTriangle, Search, CheckCircle2,
} from 'lucide-react';
import StudioMark from '@/components/StudioMark';
import { Button, Badge, EmptyState } from '@/components/ui';
import { api } from '@/lib/api';
import type {
  SubStudio, SubDetail, SubPlan, SubEvent, SubKpis, SubscriptionMetrics,
  PlanChangeQuote,
} from '@/lib/api';
import {
  Panel, StatTile, Reveal, SectionLabel,
} from '@/components/platform/console';
import { ccTones, ccWash } from '@/components/platform/ccTheme';
import SubscriptionRequestsTab from '@/components/platform/subscription-requests';
import { useToast } from '@/lib/toast';
import { fmtDate, fmtINR, fmtWhen } from '../_shared/format';
import { InvoicesPanel } from '../_shared/panels';
import type { FinanceSubTab } from '../_shared/types';
import { Center, ConfirmDialog, ErrorState, IconBtn, MiniStat, Modal } from '../_shared/ui';
import { clientLabel, daysOverdue, filterStudios, needsAction, planPrice } from '../_shared/billing';
import type { BillingFilter, BillingSort } from '../_shared/billing';
import { FormField, SelectInput, TextInput } from '@/components/ui/form';
import { CouponsTab } from './CouponsTab';
import { errorMessage } from '@/lib/forms/errors';
import { clampNumericText } from '@/components/ui/FloatInput';

export function FinanceTab({ subTab }: { subTab: FinanceSubTab }) {
  // Phase 8: the dashboard subtab is removed. The run-rate view lived
  // here and now lives on the home (NewOverviewTab's revenue section),
  // and the brief explicitly says the home is the platform's
  // "RIGHT NOW" answer. Billing, Payments, Invoices, Coupons remain
  // here because they are operational surfaces, not a status card.
  //
  // The five-item Revenue row lives above this page (RevenueNav), so Finance
  // and Analytics share one navigation instead of stacking two.
  return (
    <div key={subTab}>
      {subTab === 'billing' && <BillingTab />}
      {subTab === 'payments' && <SubscriptionRequestsTab />}
      {subTab === 'invoices' && <InvoicesPanel />}
      {subTab === 'coupons' && <CouponsTab />}
    </div>
  );
}

/* ─────────────────────────────────────────────────────── BILLING */
export const SUB_STATE: Record<string, { label: string; tone: 'success' | 'danger' | 'warning' | 'neutral' }> = {
  active: { label: 'Active', tone: 'success' },
  trial: { label: 'Trial', tone: 'warning' },
  trial_expired: { label: 'Trial expired', tone: 'danger' },
  expired: { label: 'Expired', tone: 'danger' },
  frozen: { label: 'Frozen', tone: 'warning' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
  suspended: { label: 'Suspended', tone: 'danger' },
};

// Phase 8: the run-rate dashboard used to live here (FinanceDashboardTab).
// It was deleted in this phase. The new home (NewOverviewTab) is now the
// platform's "RIGHT NOW" answer; finance keeps the operational surfaces
// (Billing, Payments, Invoices, Coupons) but no longer duplicates the
// home's revenue view. The home already surfaces MRR, active subscriptions,
// failed payments, and expiring-in-7d — every number the old dashboard had.

export function BillingTab() {
  const { toast } = useToast();
  const [studios, setStudios] = useState<SubStudio[]>([]);
  const [plans, setPlans] = useState<SubPlan[]>([]);
  const [kpis, setKpis] = useState<SubKpis | null>(null);
  const [planError, setPlanError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payTarget, setPayTarget] = useState<SubStudio | null>(null);
  const [detailTarget, setDetailTarget] = useState<SubStudio | null>(null);
  const [changeTarget, setChangeTarget] = useState<SubStudio | null>(null);
  const [freezeTarget, setFreezeTarget] = useState<SubStudio | null>(null);
  const [freezing, setFreezing] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<BillingFilter>('all');
  const [sort, setSort] = useState<BillingSort>('attention');

  const load = useCallback(() => {
    setLoading(true); setError('');
    api.superAdmin.subscriptions()
      .then((r) => { setStudios(r.data.studios ?? []); setKpis(r.data.kpis ?? null); })
      .catch((e) => setError(errorMessage(e, 'Failed to load subscriptions')))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api.superAdmin.plans()
      .then((r) => setPlans(r.data.plans ?? []))
      .catch((e) => setPlanError(errorMessage(e, 'Could not load plans')));
  }, []);

  const confirmFreeze = async () => {
    if (!freezeTarget) return;
    setFreezing(true);
    try {
      await api.superAdmin.freezeSubscription(freezeTarget.id);
      toast.success('Studio frozen.');
      setFreezeTarget(null);
      load();
    } catch (e) { toast.error(errorMessage(e, 'Update failed')); }
    finally { setFreezing(false); }
  };

  if (loading && studios.length === 0) return <Center><div role="status"><Loader2 size={26} className="animate-spin" aria-hidden style={{ color: '#A33757' }} /><span className="sr-only">Loading studios</span></div></Center>;
  if (error) return <ErrorState error={error} onRetry={load} />;

  const attentionCount = studios.filter(needsAction).length;
  const visible = filterStudios(studios, { query, filter, sort });
  const needsYou = visible.filter(needsAction);
  const rest = visible.filter((s) => !needsAction(s));

  const renderRow = (s: SubStudio) => {
    const st = SUB_STATE[s.effective_state] || { label: s.effective_state, tone: 'neutral' as const };
    const expiry = s.effective_state === 'trial' ? s.trial_ends_at : s.current_period_end;
    const daysLeft = s.effective_state === 'trial' ? s.trial_days_left : s.period_days_left;
    const overdue = daysOverdue(s);
    const price = planPrice(s, plans);
    const priceInr = price != null ? `₹${Number(price).toLocaleString('en-IN')}` : null;
    const priceNote = priceInr
      ? s.is_founder && s.locked_price_inr != null
        ? `${priceInr} locked`
        : `${priceInr}${!s.allowed || overdue != null || s.renewal_due ? ' due' : ''}`
      : null;
    const meta = [s.plan_name || 'No plan'];
    if (priceNote) meta.push(priceNote);
    if (expiry) {
      if (overdue != null) meta.push(`${overdue}d overdue`, `ended ${fmtDate(expiry)}`);
      else {
        if (daysLeft != null) meta.push(`${daysLeft}d left`);
        meta.push(`ends ${fmtDate(expiry)}`);
      }
    } else if (s.plan_name) {
      // "no expiry" on a blocked studio read as "never expires" — the opposite
      // of a freeze. Only an allowed studio can be genuinely open-ended.
      meta.push(s.allowed ? 'no expiry' : 'no active period');
    }
    // Why a blocked studio is blocked, when the freeze event knows.
    if (s.effective_state === 'frozen') {
      const why = s.frozen_reason === 'trial_expired' ? 'trial ended'
        : s.frozen_reason ? `frozen: ${s.frozen_reason}` : 'frozen by operator';
      meta.push(why.length > 64 ? `${why.slice(0, 61)}…` : why);
      if (s.frozen_at) meta.push(`since ${fmtDate(s.frozen_at)}`);
    }
    meta.push(s.client_limit != null ? `${s.client_count}/${s.client_limit} clients` : clientLabel(s.client_count));

    const reviewRequest = Boolean(s.requested_at && s.requested_plan_code);
    const urgent = needsAction(s);

    return (
      <div key={s.id} className="rounded-[18px] p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex flex-wrap items-center gap-3">
          <StudioMark name={s.name} logoUrl={s.logo_url} size={40} />
          <div className="min-w-0 flex-1">
            {/* Wraps rather than truncating: the studio name and its
                status badges are the row's identity, and on a phone the
                name was being cut to "Abhishek PT …". */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p className="text-[14px] font-[750] leading-tight" style={{ color: 'var(--text-primary)' }}>{s.name}</p>
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
                  style={{ background: ccWash(ccTones.blue, 0.10), border: `1px solid ${ccWash(ccTones.blue, 0.24)}`, color: ccTones.blue.inkText }}>
                  <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: ccTones.blue.ink }} />
                  {s.requested_plan_name
                    ? s.requested_direction === 'downgrade' ? `Switch to ${s.requested_plan_name} requested`
                      : s.requested_direction === 'renewal' ? `Renewal (${s.requested_plan_name}) requested`
                      : s.requested_direction === 'upgrade' ? `Upgrade to ${s.requested_plan_name} requested`
                      : `Activate ${s.requested_plan_name} requested`
                    : 'Activation requested'}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[12.5px] leading-snug" style={{ color: 'var(--text-muted)' }}>
              {meta.join(' · ')}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {reviewRequest ? (
              <button onClick={() => setChangeTarget(s)} aria-label={`Review request for ${s.name}`}
                className="flex h-11 items-center gap-1.5 rounded-[10px] px-3 text-[12px] font-[700] text-white transition hover:opacity-90"
                style={{ background: '#A33757' }}>
                <ArrowRight size={13} /> Review request
              </button>
            ) : (
              <button onClick={() => setPayTarget(s)} aria-label={`Record payment for ${s.name}`}
                className="flex h-11 items-center gap-1.5 rounded-[10px] px-3 text-[12px] font-[700] transition hover:opacity-90"
                style={urgent
                  ? { background: '#A33757', color: '#fff' }
                  : { border: '1px solid rgba(163,55,87,0.28)', color: '#A33757' }}>
                <IndianRupee size={13} /> Record Payment
              </button>
            )}
            {s.allowed && !reviewRequest && (
              <IconBtn title="Freeze" label={`Freeze ${s.name}'s subscription`} onClick={() => setFreezeTarget(s)} tone="danger"><Snowflake size={12} /> Freeze</IconBtn>
            )}
            <IconBtn title="Details & history" label={`Details and history for ${s.name}`} onClick={() => setDetailTarget(s)}><Receipt size={12} /> Details</IconBtn>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {kpis && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <MiniStat icon={<IndianRupee size={13} />} value={fmtINR(kpis.revenue_this_month)} label="This month" color="#A33757" />
          <MiniStat icon={<Wallet size={13} />} value={fmtINR(kpis.total_revenue)} label="Lifetime" color="#6B2440" />
          <div className="col-span-2 sm:col-span-1">
            <MiniStat icon={<AlertTriangle size={13} />} value={attentionCount} label="Need action" color="#B45309" />
          </div>
        </div>
      )}

      {studios.length > 0 && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input value={query} onChange={(e) => setQuery(e.target.value)}
              aria-label="Search studios by name or plan" placeholder="Search studios or plans"
              className="w-full rounded-xl py-2.5 pl-9 pr-3 text-[14px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
              style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-2)', minHeight: 44 }} />
          </div>
          <div className="flex gap-2">
            <select aria-label="Filter by billing state" value={filter} onChange={(e) => setFilter(e.target.value as BillingFilter)}
              className="min-h-[44px] flex-1 rounded-xl px-3 text-[13px] font-[650] sm:flex-none"
              style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-2)' }}>
              <option value="all">All states</option>
              <option value="needs_action">Needs action</option>
              <option value="active">Active</option>
              <option value="trial">Trial</option>
              <option value="frozen">Frozen</option>
              <option value="expired">Expired</option>
            </select>
            <select aria-label="Sort studios" value={sort} onChange={(e) => setSort(e.target.value as BillingSort)}
              className="min-h-[44px] flex-1 rounded-xl px-3 text-[13px] font-[650] sm:flex-none"
              style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-2)' }}>
              <option value="attention">Attention first</option>
              <option value="name">Name A–Z</option>
              <option value="expiry">Expiry soonest</option>
            </select>
          </div>
        </div>
      )}

      {needsYou.length > 0 && (
        <section>
          <SectionLabel hint={`${needsYou.length} of ${visible.length}`}>Needs you</SectionLabel>
          <div className="space-y-3">{needsYou.map(renderRow)}</div>
        </section>
      )}

      {rest.length > 0 && (
        <section>
          <SectionLabel hint={`${rest.length} ${rest.length === 1 ? 'studio' : 'studios'}`}>No action due</SectionLabel>
          <div className="space-y-3">{rest.map(renderRow)}</div>
        </section>
      )}

      {studios.length === 0 && <EmptyState icon={<CreditCard size={20} />} title="No studios" description="Studios will appear here once created." />}
      {studios.length > 0 && visible.length === 0 && (
        <EmptyState icon={<Search size={20} />} title="No studios match"
          description="Try a different name, plan, or billing state."
          action={<Button variant="outline" onClick={() => { setQuery(''); setFilter('all'); }}>Clear filters</Button>} />
      )}

      {freezeTarget && (
        <ConfirmDialog
          title={`Freeze ${freezeTarget.name}?`}
          body="Their team is signed out of protected features until they pay. No data is deleted."
          confirmLabel="Freeze studio"
          busy={freezing}
          onConfirm={confirmFreeze}
          onClose={() => { if (!freezing) setFreezeTarget(null); }}
        />
      )}

      {payTarget && <RecordPaymentModal studio={payTarget} plans={plans} planError={planError} onClose={() => setPayTarget(null)} onDone={() => { setPayTarget(null); load(); }} />}
      {changeTarget && changeTarget.requested_plan_code && (
        <ExecuteChangeModal
          studio={changeTarget}
          planCode={changeTarget.requested_plan_code}
          onClose={() => setChangeTarget(null)}
          onDone={() => { setChangeTarget(null); load(); }}
        />
      )}
      {detailTarget && <SubDetailModal studio={detailTarget} onClose={() => setDetailTarget(null)} onChanged={load} />}
    </div>
  );
}

// ── Record Payment (activate / renew) modal ──────────────────────────────────────
export function RecordPaymentModal({ studio, plans, planError, onClose, onDone }: { studio: SubStudio; plans: SubPlan[]; planError?: string; onClose: () => void; onDone: () => void }) {
  const { toast } = useToast();
  const [planCode, setPlanCode] = useState(studio.plan_code || (plans[0]?.code ?? 'starter'));
  const selected = plans.find((p) => p.code === planCode);
  const defaultAmount = studio.is_founder && studio.locked_price_inr != null ? studio.locked_price_inr : (selected?.effective_price_inr ?? selected?.price_inr ?? 0);
  const [amount, setAmount] = useState(() => String(defaultAmount || ''));
  const [method, setMethod] = useState('upi');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [receipt, setReceipt] = useState<{
    amount: number; plan: string; periodEnd: string; invoice: string | null;
    method: string; reference: string | null;
  } | null>(null);

  useEffect(() => { setAmount(String(defaultAmount || '')); }, [defaultAmount]);

  // Anything the operator typed or chose, before it has been committed.
  const dirty = !receipt && (
    planCode !== (studio.plan_code || (plans[0]?.code ?? 'starter'))
    || amount !== String(defaultAmount || '')
    || method !== 'upi'
    || reference.trim() !== ''
    || notes.trim() !== ''
  );

  // activateSubscription() stacks the new period on any time left, so the
  // preview starts from the later of now and the current period end.
  const months = selected?.duration_months ?? 0;
  const periodEnd = (() => {
    if (!months) return null;
    const base = studio.current_period_end && new Date(studio.current_period_end).getTime() > Date.now()
      ? new Date(studio.current_period_end)
      : new Date();
    base.setMonth(base.getMonth() + months);
    return base;
  })();

  const submit = async () => {
    setSaving(true);
    try {
      const r = await api.superAdmin.activateSubscription(studio.id, {
        plan_code: planCode,
        amount_inr: amount ? Number(amount) : undefined,
        method, reference: reference.trim() || undefined, notes: notes.trim() || undefined,
      });
      setReceipt({
        amount: r.data.amount_inr,
        plan: selected?.name ?? planCode,
        periodEnd: r.data.period_end,
        invoice: r.data.invoice_number ?? null,
        method,
        reference: reference.trim() || null,
      });
      toast.success('Payment recorded — subscription activated.');
    } catch (e) { toast.error(errorMessage(e, 'Activation failed')); setSaving(false); }
  };

  // The confirmation the toast could not give: what was collected, for which
  // plan, and the date access now runs through. Shown before the list refreshes
  // so the operator can read it back against the bank statement.
  if (receipt) {
    return (
      <Modal title="Payment recorded" onClose={onDone}>
        <div className="space-y-4">
          <div role="status" className="flex items-start gap-2.5 rounded-[12px] p-3"
            style={{ background: 'rgba(4,120,87,0.08)', border: '1px solid rgba(4,120,87,0.28)', color: '#047857' }}>
            <CheckCircle2 size={18} aria-hidden className="mt-0.5 shrink-0" />
            <p className="text-[12.5px] leading-snug">
              <b>{fmtINR(receipt.amount)}</b> recorded for <b>{studio.name}</b>. Access runs through <b>{fmtDate(receipt.periodEnd)}</b>.
            </p>
          </div>
          <dl className="rounded-[12px] p-3 text-[12.5px]" style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>
            <div className="flex justify-between gap-3"><dt>Plan</dt><dd className="font-[700]">{receipt.plan}</dd></div>
            <div className="flex justify-between gap-3"><dt>Access through</dt><dd className="font-[700]">{fmtDate(receipt.periodEnd)}</dd></div>
            <div className="flex justify-between gap-3"><dt>Method</dt><dd className="font-[700] capitalize">{receipt.method}</dd></div>
            {receipt.reference && <div className="flex justify-between gap-3"><dt>Reference</dt><dd className="font-[700] break-all text-right">{receipt.reference}</dd></div>}
            {receipt.invoice && <div className="flex justify-between gap-3"><dt>Invoice</dt><dd className="font-[700]">{receipt.invoice}</dd></div>}
          </dl>
          <div className="flex justify-end">
            <Button className="min-h-[44px]" onClick={onDone} style={{ background: '#A33757', color: '#fff' }}>Done</Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={`Record payment · ${studio.name}`} onClose={onClose} dirty={dirty}
      discardMessage="Discard this payment? The amount, reference and notes you typed will be lost.">
      <div className="space-y-4">
        {planError && (
          <p role="alert" className="rounded-[10px] p-2.5 text-[11.5px]" style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)', color: '#b91c1c' }}>
            {planError} — recording a payment is blocked until the plan list loads.
          </p>
        )}
        <FormField label="Plan">
          <SelectInput value={planCode} onChange={(e) => setPlanCode(e.target.value)}>
            {plans.length === 0 && <option value={planCode}>No plans loaded</option>}
            {plans.map((p) => (
              <option key={p.code} value={p.code}>
                {p.name} — ₹{(p.effective_price_inr ?? p.price_inr).toLocaleString('en-IN')}{p.is_launch ? ' (launch)' : ''} / {p.duration_months}mo
                {p.client_limit != null ? ` · ${p.client_limit} clients` : ' · unlimited'}
              </option>
            ))}
          </SelectInput>
        </FormField>
        <FormField label="Amount received (₹)">
          <TextInput type="text" inputMode="decimal"
            value={amount} onChange={(e) => setAmount(clampNumericText(e.target.value, 'decimal'))} />
          {periodEnd && (
            <p className="mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Expected period end {fmtDate(periodEnd.toISOString())} — any time left is added on top.
            </p>
          )}
          {studio.is_founder && <p className="mt-1 text-[11px]" style={{ color: '#b45309' }}>Founder — lifetime-locked price ₹{studio.locked_price_inr?.toLocaleString('en-IN')}.</p>}
        </FormField>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField label="Method">
            <SelectInput value={method} onChange={(e) => setMethod(e.target.value)}>
              {['upi', 'bank', 'cash', 'razorpay', 'comp'].map((m) => <option key={m} value={m}>{m}</option>)}
            </SelectInput>
          </FormField>
          <FormField label="Reference / UTR">
            <TextInput value={reference} onChange={(e) => setReference(e.target.value)} />
          </FormField>
        </div>
        <FormField label="Notes">
          <TextInput value={notes} onChange={(e) => setNotes(e.target.value)} />
        </FormField>
        {!studio.is_founder && <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>If founder slots remain, this studio becomes a Founder Member with this price locked for life.</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" className="min-h-[44px]" onClick={onClose}>Cancel</Button>
          <Button className="min-h-[44px]" loading={saving} disabled={saving || plans.length === 0} onClick={submit} style={{ background: '#A33757', color: '#fff' }}>
            {amount ? `Record ₹${Number(amount).toLocaleString('en-IN')}` : 'Record payment'}
          </Button>
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
  const [receipt, setReceipt] = useState<{
    amount: number; plan: string; periodEnd: string; invoice: string | null;
    method: string; reference: string | null;
  } | null>(null);

  const dirty = !receipt && quote != null && (
    amount !== String(quote.amount_due_inr || '')
    || method !== 'upi'
    || reference.trim() !== ''
    || notes.trim() !== ''
  );

  useEffect(() => {
    let cancelled = false;
    api.superAdmin.changeQuote(studio.id, planCode)
      .then((r) => { if (!cancelled) { setQuote(r.data); setAmount(String(r.data.amount_due_inr || '')); } })
      .catch((e) => toast.error(errorMessage(e, 'Could not price this change')))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studio.id, planCode]);

  const submit = async () => {
    setSaving(true);
    try {
      const r = await api.superAdmin.changePlan(studio.id, {
        plan_code: planCode,
        amount_inr: amount ? Number(amount) : undefined,
        method, reference: reference.trim() || undefined, notes: notes.trim() || undefined,
      });
      setReceipt({
        amount: r.data.amount_inr,
        plan: r.data.new_plan?.name || quote?.new_plan.name || planCode,
        periodEnd: r.data.period_end,
        invoice: r.data.invoice_number ?? null,
        method,
        reference: reference.trim() || null,
      });
      toast.success(`Switched ${studio.name} to ${quote?.new_plan.name || planCode}.`);
    } catch (e) { toast.error(errorMessage(e, 'Could not execute this change')); setSaving(false); }
  };

  if (receipt) {
    return (
      <Modal title="Plan change recorded" onClose={onDone}>
        <div className="space-y-4">
          <div role="status" className="flex items-start gap-2.5 rounded-[12px] p-3"
            style={{ background: 'rgba(4,120,87,0.08)', border: '1px solid rgba(4,120,87,0.28)', color: '#047857' }}>
            <CheckCircle2 size={18} aria-hidden className="mt-0.5 shrink-0" />
            <p className="text-[12.5px] leading-snug">
              <b>{studio.name}</b> is now on <b>{receipt.plan}</b>. <b>{fmtINR(receipt.amount)}</b> recorded; access runs through <b>{fmtDate(receipt.periodEnd)}</b>.
            </p>
          </div>
          <dl className="rounded-[12px] p-3 text-[12.5px]" style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>
            <div className="flex justify-between gap-3"><dt>Plan</dt><dd className="font-[700]">{receipt.plan}</dd></div>
            <div className="flex justify-between gap-3"><dt>Access through</dt><dd className="font-[700]">{fmtDate(receipt.periodEnd)}</dd></div>
            <div className="flex justify-between gap-3"><dt>Method</dt><dd className="font-[700] capitalize">{receipt.method}</dd></div>
            {receipt.reference && <div className="flex justify-between gap-3"><dt>Reference</dt><dd className="font-[700] break-all text-right">{receipt.reference}</dd></div>}
            {receipt.invoice && <div className="flex justify-between gap-3"><dt>Invoice</dt><dd className="font-[700]">{receipt.invoice}</dd></div>}
          </dl>
          <div className="flex justify-end">
            <Button className="min-h-[44px]" onClick={onDone} style={{ background: '#A33757', color: '#fff' }}>Done</Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={`Execute plan change · ${studio.name}`} onClose={onClose} dirty={dirty}
      discardMessage="Discard this plan change? The amount, reference and notes you typed will be lost.">
      {loading || !quote ? (
        <div role="status" className="flex justify-center py-8"><Loader2 size={20} className="animate-spin" aria-hidden style={{ color: '#A33757' }} /><span className="sr-only">Loading plan-change quote</span></div>
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
          <FormField label="Amount received (₹)">
            <TextInput type="text" inputMode="decimal"
            value={amount} onChange={(e) => setAmount(clampNumericText(e.target.value, 'decimal'))} />
          </FormField>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label="Method">
              <SelectInput value={method} onChange={(e) => setMethod(e.target.value)}>
                {['upi', 'bank', 'cash', 'razorpay', 'comp'].map((m) => <option key={m} value={m}>{m}</option>)}
              </SelectInput>
            </FormField>
            <FormField label="Reference / UTR">
              <TextInput value={reference} onChange={(e) => setReference(e.target.value)} />
            </FormField>
          </div>
          <FormField label="Notes">
            <TextInput value={notes} onChange={(e) => setNotes(e.target.value)} />
          </FormField>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" className="min-h-[44px]" onClick={onClose}>Cancel</Button>
            <Button className="min-h-[44px]" loading={saving} disabled={saving} onClick={submit} style={{ background: '#A33757', color: '#fff' }}>Confirm change</Button>
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
  const [compOpen, setCompOpen] = useState(false);
  const [compReason, setCompReason] = useState('');
  const [compBusy, setCompBusy] = useState(false);
  const [compDone, setCompDone] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.superAdmin.getSubscription(studio.id).then((r) => setDetail(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [studio.id]);
  useEffect(() => { load(); }, [load]);

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try { await fn(); toast.success(ok); load(); onChanged(); }
    catch (e) { toast.error(errorMessage(e, 'Action failed')); }
  };

  // Comp reactivation is the only action here that grants access without
  // money changing hands, so it lives behind Details, needs a reason, and can
  // be reversed. Freeze is the exact inverse of a frozen studio's state.
  const compReactivate = async () => {
    if (!compReason.trim()) return;
    setCompBusy(true);
    try {
      await api.superAdmin.reactivateSubscription(studio.id, compReason.trim());
      toast.success('Reactivated without payment.');
      setCompOpen(false); setCompReason(''); setCompDone(true);
      load(); onChanged();
    } catch (e) { toast.error(errorMessage(e, 'Could not reactivate')); }
    finally { setCompBusy(false); }
  };

  const undoComp = async () => {
    setCompBusy(true);
    try {
      await api.superAdmin.freezeSubscription(studio.id, 'Undo comp reactivation');
      toast.success('Frozen again.');
      setCompDone(false); load(); onChanged();
    } catch (e) { toast.error(errorMessage(e, 'Could not undo')); }
    finally { setCompBusy(false); }
  };

  const o = detail?.organization;
  const onTrial = o?.subscription_status === 'trial';

  return (
    <Modal title={`Details · ${studio.name}`} onClose={onClose}>
      {loading || !o ? (
        <div role="status" className="flex justify-center py-8"><Loader2 size={20} className="animate-spin" aria-hidden style={{ color: '#A33757' }} /><span className="sr-only">Loading studio details</span></div>
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
            <div className="rounded-[12px] p-3 text-[12px]" style={{ background: ccWash(ccTones.blue, 0.08), border: `1px solid ${ccWash(ccTones.blue, 0.24)}` }}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span style={{ color: ccTones.blue.inkText }}>
                  <b>{studio.requested_plan_name}</b> requested {fmtWhen(studio.requested_at)}
                  {studio.requested_direction ? ` (${studio.requested_direction})` : ''}
                </span>
                <Button className="min-h-[44px]" onClick={() => setShowExecute(true)} style={{ background: '#A33757', color: '#fff' }}>
                  Review &amp; execute
                </Button>
              </div>
            </div>
          )}

          {/* Comp reactivation — only from frozen, because freeze is the exact
              state it reverses. It grants access with no payment, so the reason
              is required (it lands in the audit log and the studio's history)
              and the result can be undone on the spot. */}
          {o.subscription_status === 'frozen' || compDone ? (
            compDone ? (
              <div role="status" className="rounded-[12px] p-3 text-[12px]" style={{ background: 'rgba(4,120,87,0.08)', border: '1px solid rgba(4,120,87,0.28)', color: '#047857' }}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span><b>Comp reactivation applied.</b> No payment recorded.</span>
                  <Button variant="outline" className="min-h-[44px]" onClick={undoComp} disabled={compBusy}>Undo</Button>
                </div>
              </div>
            ) : compOpen ? (
              <div className="space-y-2.5 rounded-[12px] p-3" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.26)' }}>
                <p className="text-[12px] font-[700]" style={{ color: '#b45309' }}>Reactivate without payment</p>
                <p className="text-[11.5px] leading-snug" style={{ color: 'var(--text-secondary)' }}>
                  Sets the studio back to <b>active</b> and clears any cancellation. No plan or expiry is
                  set, so access stays open until you freeze or cancel it again. This is logged with your reason.
                </p>
                <FormField label="Reason (required)">
                  <TextInput value={compReason} onChange={(e) => setCompReason(e.target.value)} maxLength={500} placeholder="e.g. Goodwill after payment outage" />
                </FormField>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" className="min-h-[44px]" onClick={() => { setCompOpen(false); setCompReason(''); }} disabled={compBusy}>Cancel</Button>
                  <Button className="min-h-[44px]" onClick={compReactivate} disabled={compBusy || !compReason.trim()} loading={compBusy} style={{ background: '#A33757', color: '#fff' }}>
                    Reactivate
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <IconBtn title="Reactivate without payment" onClick={() => setCompOpen(true)}>
                  <RotateCcw size={12} /> Reactivate without payment…
                </IconBtn>
              </div>
            )
          ) : null}

          {/* Quick overrides */}
          <div className="flex flex-wrap gap-2">
            {!o.is_founder && <IconBtn title="Grant founder" onClick={() => act(() => api.superAdmin.grantFounder(studio.id), 'Founder granted.')}><Gift size={12} /> Grant founder</IconBtn>}
            {o.subscription_status !== 'cancelled' && <IconBtn title="Cancel subscription" onClick={() => { if (window.confirm('Cancel this subscription? The studio will be blocked until they subscribe again.')) act(() => api.superAdmin.cancelSubscription(studio.id), 'Subscription cancelled.'); }} tone="danger"><X size={12} /> Cancel</IconBtn>}
          </div>
          <div className="flex items-end gap-2">
            <FormField label={onTrial ? 'Extend trial to' : 'Change renewal date'}>
              <TextInput type="date" value={newExpiry} onChange={(e) => setNewExpiry(e.target.value)} />
            </FormField>
            <Button variant="outline" className="min-h-[44px]" disabled={!newExpiry} onClick={() => act(
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
                    aria-label={`Open invoice ${inv.invoice_number} as PDF`}
                    className="-m-2.5 flex items-center justify-center p-2.5" style={{ color: 'var(--text-muted)', minHeight: 44, minWidth: 44 }}>
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
                {p.status === 'paid' && <button onClick={() => { if (window.confirm('Refund this payment?')) act(() => api.superAdmin.refundPayment(p.id), 'Payment refunded.'); }} className="-my-2 flex-shrink-0 px-2 py-2 text-[11px] font-[650]" style={{ color: '#dc2626', minHeight: 44 }}>Refund</button>}
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
    case 'reactivated': return `Reactivated${d.reason ? ` (${d.reason})` : ''}`;
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
                    <span className="text-[9px] tabular-nums" style={{ color: 'var(--text-muted)' }}>{r.label.slice(0, 3)}</span>
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
                        style={{ background: 'linear-gradient(90deg, var(--brand), #A33757)' }}
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
            ['Trial lapsed', data.states.trial_lapsed, '#f59e0b'],
            ['Lapsed', data.states.lapsed, '#ef4444'],
            ['Frozen', data.states.frozen, '#ef4444'],
            ['Expired', data.states.expired, '#94a3b8'],
            ['Cancelled', data.states.cancelled, '#94a3b8'],
            ['Suspended', data.states.suspended, '#A33757'],
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

