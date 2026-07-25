'use client';

// Studio-facing subscription screen. Standalone (no AppShell) so a frozen studio
// gets a clean, self-contained page instead of a half-broken dashboard. Shows the
// current trial/subscription state, the plan catalogue with live launch pricing,
// and the studio's invoice history. Activation is handled by the platform team
// (admin-activated billing), so the CTA is "contact to subscribe", not a checkout.

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ShieldAlert, Check, Crown, Loader2, LogOut, Sparkles, Clock, ArrowRight,
  ArrowUpRight, ArrowDownRight, CalendarClock, AlertTriangle, Users, X,
} from 'lucide-react';
import Guard from '@/components/Guard';
import { Button } from '@/components/ui';
import { api } from '@/lib/api';
import type { SubscriptionStatus, SubPlan, SubInvoice, PlanChangeQuote } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast';

const FROZEN_STATES = ['frozen', 'trial_expired', 'expired', 'cancelled', 'suspended'];
const fmtINR = (n: number) => '₹' + Number(n || 0).toLocaleString('en-IN');
const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// ── Seat usage meter ──────────────────────────────────────────────────────────
// Counts ACTIVE clients only, matching what the backend enforces, so this can
// never disagree with the 403 a trainer hits when adding a client.
function SeatMeter({ used, limit, remaining }: {
  used: number; limit: number | null; remaining: number | null;
}) {
  if (limit == null) {
    return (
      <div className="flex items-center gap-2 text-[12.5px]" style={{ color: '#cbd5e1' }}>
        <Users size={14} style={{ color: '#34d399' }} />
        <span><strong className="text-white">{used}</strong> active clients · unlimited</span>
      </div>
    );
  }
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const full = used >= limit;
  const near = !full && remaining != null && remaining <= 1;
  const colour = full ? '#f87171' : near ? '#fbbf24' : '#34d399';

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[12.5px]" style={{ color: '#cbd5e1' }}>
          <Users size={14} style={{ color: colour }} />
          <span><strong className="text-white">{used}</strong> of {limit} active clients</span>
        </div>
        <span className="text-[11.5px] font-[700] tabular-nums" style={{ color: colour }}>
          {full ? 'Limit reached' : `${remaining ?? Math.max(0, limit - used)} left`}
        </span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.10)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: colour }} />
      </div>
      {full && (
        <p className="mt-2 text-[11.5px]" style={{ color: '#fca5a5' }}>
          Archive a client to free a slot, or upgrade below. Existing clients keep full access.
        </p>
      )}
    </div>
  );
}

// ── Plan-change preview ───────────────────────────────────────────────────────
// Rendered inline rather than in a modal: this page is a standalone dark screen
// and stays readable on a phone without a dialog layer.
function ChangePreview({ quote, busy, onConfirm, onDismiss }: {
  quote: PlanChangeQuote; busy: boolean; onConfirm: () => void; onDismiss: () => void;
}) {
  const isDowngrade = quote.direction === 'downgrade';
  const accent = isDowngrade ? '#38bdf8' : '#34d399';
  const Icon = isDowngrade ? ArrowDownRight : ArrowUpRight;

  const heading = isDowngrade
    ? `Switch down to ${quote.new_plan.name}`
    : quote.direction === 'renewal'
      ? `Renew ${quote.new_plan.name}`
      : `Upgrade to ${quote.new_plan.name}`;

  return (
    <div className="mt-6 rounded-[20px] p-5 sm:p-6"
      style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${accent}44` }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px]"
            style={{ background: `${accent}22`, color: accent }}>
            <Icon size={17} />
          </span>
          <div className="min-w-0">
            <h3 className="text-[16px] font-[820] text-white">{heading}</h3>
            <p className="mt-0.5 text-[12.5px]" style={{ color: '#94a3b8' }}>
              {isDowngrade
                ? `Takes effect ${fmtDate(quote.effective_at)}, when your current period ends. Nothing changes before then.`
                : 'Takes effect as soon as your payment is confirmed.'}
            </p>
          </div>
        </div>
        <button onClick={onDismiss} aria-label="Dismiss"
          className="shrink-0 rounded-full p-1.5 transition hover:bg-white/10" style={{ color: '#94a3b8' }}>
          <X size={15} />
        </button>
      </div>

      {/* Money breakdown — only meaningful when something is actually charged. */}
      {!isDowngrade && (
        <div className="mt-4 space-y-2 rounded-[14px] p-3.5" style={{ background: 'rgba(0,0,0,0.25)' }}>
          <div className="flex items-center justify-between text-[12.5px]">
            <span style={{ color: '#94a3b8' }}>{quote.new_plan.name} plan</span>
            <span className="tabular-nums text-white">{fmtINR(quote.new_plan_price_inr)}</span>
          </div>
          {quote.proration_credit_inr > 0 && (
            <div className="flex items-center justify-between text-[12.5px]">
              <span style={{ color: '#94a3b8' }}>Unused time on your current plan</span>
              <span className="tabular-nums" style={{ color: '#34d399' }}>−{fmtINR(quote.proration_credit_inr)}</span>
            </div>
          )}
          <div className="flex items-center justify-between border-t pt-2 text-[13.5px] font-[800]"
            style={{ borderColor: 'rgba(255,255,255,0.10)' }}>
            <span className="text-white">Due now</span>
            <span className="tabular-nums text-white">{fmtINR(quote.amount_due_inr)}</span>
          </div>
          {quote.founder_locked && (
            <p className="flex items-center gap-1.5 text-[11px]" style={{ color: '#fcd34d' }}>
              <Crown size={11} /> Founder pricing locked in
            </p>
          )}
        </div>
      )}

      {isDowngrade && (
        <div className="mt-4 flex items-center justify-between rounded-[14px] p-3.5 text-[12.5px]"
          style={{ background: 'rgba(0,0,0,0.25)' }}>
          <span style={{ color: '#94a3b8' }}>Due now</span>
          <span className="tabular-nums font-[800] text-white">₹0</span>
        </div>
      )}

      {/* Over-limit warning. The change still goes through — no client is ever
          archived automatically — but the trainer needs to know. */}
      {quote.warning && (
        <div className="mt-3 flex gap-2.5 rounded-[14px] p-3.5"
          style={{ background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.28)' }}>
          <AlertTriangle size={15} className="mt-0.5 shrink-0" style={{ color: '#fbbf24' }} />
          <p className="text-[12px] leading-relaxed" style={{ color: '#fde68a' }}>{quote.warning}</p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <Button onClick={onConfirm} loading={busy} disabled={busy}
          style={{ background: isDowngrade ? 'rgba(56,189,248,0.18)' : 'linear-gradient(135deg,#F59E0B,#D97706)', color: '#fff' }}>
          {isDowngrade ? 'Schedule this change' : 'Request this upgrade'}
        </Button>
        <Button variant="outline" onClick={onDismiss} disabled={busy}>Not now</Button>
      </div>
    </div>
  );
}

export default function SubscriptionPage() {
  return (
    <Guard>
      <SubscriptionScreen />
    </Guard>
  );
}

function SubscriptionScreen() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [plans, setPlans] = useState<SubPlan[]>([]);
  const [slots, setSlots] = useState<number | null>(null);
  const [founderLimit, setFounderLimit] = useState<number | null>(null);
  const [invoices, setInvoices] = useState<SubInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState('');
  const [requested, setRequested] = useState(false);
  // Plan-change flow: preview the quote, then confirm.
  const [quote, setQuote] = useState<PlanChangeQuote | null>(null);
  const [quoting, setQuoting] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [cancellingPending, setCancellingPending] = useState(false);

  const requestActivation = async (planCode?: string) => {
    setRequesting(planCode || 'general');
    try {
      const r = await api.subscription.requestActivation(planCode);
      setRequested(true);
      toast.success(r.data.message);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not send request');
    } finally { setRequesting(''); }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [st, pl] = await Promise.all([api.subscription.status(), api.subscription.plans()]);
      setStatus(st.data);
      setPlans(pl.data.plans ?? []);
      setSlots(pl.data.founder_slots_remaining);
      setFounderLimit(pl.data.founder_limit ?? null);
      try { setInvoices((await api.subscription.invoices()).data ?? []); } catch { /* frozen can still read */ }
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  // Price a change before committing. Read-only on the backend.
  const openQuote = async (planCode: string) => {
    setQuoting(planCode);
    setQuote(null);
    try {
      const r = await api.subscription.changeQuote(planCode);
      setQuote(r.data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not price that change');
    } finally { setQuoting(''); }
  };

  // A downgrade is scheduled outright (costs nothing); an upgrade goes to the
  // operator queue, since billing is admin-activated.
  const confirmChange = async () => {
    if (!quote) return;
    setConfirming(true);
    try {
      const r = await api.subscription.requestChange(quote.new_plan.code);
      toast.success(r.data.message);
      setQuote(null);
      if (r.data.scheduled) await load(); else setRequested(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not submit that change');
    } finally { setConfirming(false); }
  };

  const cancelPending = async () => {
    setCancellingPending(true);
    try {
      await api.subscription.cancelScheduledChange();
      toast.success('Scheduled change cancelled — you stay on your current plan.');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not cancel that change');
    } finally { setCancellingPending(false); }
  };

  const frozen = status ? FROZEN_STATES.includes(status.state) : false;
  const onTrial = status?.state === 'trial';
  const active = status?.state === 'active';

  const trialPct = useMemo(() => {
    if (!onTrial || status?.trial_days_left == null) return 0;
    return Math.min(1, Math.max(0, (7 - status.trial_days_left) / 7));
  }, [onTrial, status]);

  if (loading) {
    return <div className="flex min-h-dvh items-center justify-center" style={{ background: '#050816' }}>
      <Loader2 size={30} className="animate-spin" style={{ color: '#F59E0B' }} />
    </div>;
  }

  return (
    // data-theme="dark" scopes the dark design tokens to this subtree. The page
    // paints its own dark background with inline styles, but design-system
    // children (Button, etc.) read --text-primary / --border-2, which would
    // otherwise resolve to the LIGHT theme's near-black ink and render
    // invisibly here — "Keep current plan" and "Not now" disappeared entirely.
    <div className="min-h-dvh" data-theme="dark" style={{ background: 'linear-gradient(180deg,#050816 0%,#0b1020 100%)' }}>
      {/* Top bar */}
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-[11px]" style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)' }}>
            <Sparkles size={17} color="#fff" />
          </div>
          <div>
            <p className="text-[14px] font-[820] tracking-tight text-white">MY PT STUDIO</p>
            <p className="text-[11px]" style={{ color: '#94a3b8' }}>{user?.organization_name || 'Your studio'}</p>
          </div>
        </div>
        <button onClick={() => logout()} className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-[650] text-slate-300 transition hover:bg-white/5">
          <LogOut size={13} /> Sign out
        </button>
      </div>

      <div className="mx-auto max-w-5xl px-5 pb-16">
        {/* Hero — frozen vs trial vs active */}
        {frozen && (
          <div className="mb-8 rounded-[22px] p-7 text-center" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full" style={{ background: 'rgba(239,68,68,0.15)' }}>
              <ShieldAlert size={26} style={{ color: '#f87171' }} />
            </div>
            <h1 className="text-[24px] font-[860] tracking-[-0.02em] text-white">{status?.state === 'trial_expired' || status?.state === 'frozen' ? 'Your trial has expired' : 'Your subscription is inactive'}</h1>
            <p className="mx-auto mt-2 max-w-[440px] text-[14px]" style={{ color: '#cbd5e1' }}>
              {status?.reason || 'Please subscribe to continue using MY PT STUDIO.'}
            </p>
            <p className="mx-auto mt-3 max-w-[440px] text-[12.5px]" style={{ color: '#94a3b8' }}>
              Your data is safe — clients, workouts, assessments and files are all preserved. Choose a plan below and contact us to reactivate instantly.
            </p>
          </div>
        )}

        {onTrial && (
          <div className="mb-8 rounded-[22px] p-6" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <Clock size={20} style={{ color: '#fbbf24' }} />
                <div>
                  <h1 className="text-[19px] font-[820] text-white">{status?.trial_days_left ?? 0} {status?.trial_days_left === 1 ? 'day' : 'days'} left in your free trial</h1>
                  <p className="text-[12.5px]" style={{ color: '#cbd5e1' }}>All premium features are unlocked. Pick a plan to keep them after your trial ends on {fmtDate(status?.trial_ends_at)}.</p>
                </div>
              </div>
            </div>
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.10)' }}>
              <div className="h-full rounded-full" style={{ width: `${trialPct * 100}%`, background: 'linear-gradient(90deg,#F59E0B,#fbbf24)' }} />
            </div>
          </div>
        )}

        {active && status && (
          <div className="mb-8 rounded-[22px] p-6" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.22)' }}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-[19px] font-[820] text-white">{status.plan?.name || 'Active'} plan</h1>
                  {status.is_founder && (
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-[750]" style={{ background: 'rgba(245,158,11,0.18)', color: '#fcd34d' }}>
                      <Crown size={10} /> Founder #{status.founder_number}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[12.5px]" style={{ color: '#cbd5e1' }}>
                  {status.current_period_end
                    ? `${status.renewal_due ? 'Renews soon — ' : ''}Renews on ${fmtDate(status.current_period_end)}${status.period_days_left != null ? ` · ${status.period_days_left} days left` : ''}`
                    : 'Active · no expiry'}
                </p>
              </div>
            </div>

            <div className="mt-4 border-t pt-4" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <SeatMeter
                used={status.client_count ?? 0}
                limit={status.client_limit ?? null}
                remaining={status.client_remaining ?? null}
              />
            </div>
          </div>
        )}

        {/* A downgrade queued for period end. Nothing has changed yet. */}
        {status?.pending_change && (
          <div className="mb-8 rounded-[22px] p-5"
            style={{ background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.25)' }}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <CalendarClock size={18} className="mt-0.5 shrink-0" style={{ color: '#38bdf8' }} />
                <div className="min-w-0">
                  <p className="text-[13.5px] font-[780] text-white">
                    Switching to {status.pending_change.plan_name} on {fmtDate(status.pending_change.effective_at)}
                  </p>
                  <p className="mt-0.5 text-[12px]" style={{ color: '#cbd5e1' }}>
                    You keep your current plan and limits until then
                    {status.pending_change.client_limit != null
                      ? `, after which your limit becomes ${status.pending_change.client_limit} active clients.`
                      : '.'}
                  </p>
                </div>
              </div>
              <Button variant="outline" onClick={cancelPending} loading={cancellingPending} disabled={cancellingPending}>
                Keep current plan
              </Button>
            </div>
          </div>
        )}

        {/* Founder banner */}
        {slots != null && slots > 0 && (
          <p className="mb-4 text-center text-[12.5px] font-[650]" style={{ color: '#fcd34d' }}>
            🔥 Founder&apos;s Club — only {slots}{founderLimit != null ? ` of ${founderLimit}` : ''} lifetime-locked-price spots left.
          </p>
        )}

        {/* Pricing */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((p) => {
            const isCurrent = status?.plan?.code === p.code;
            const isPendingTarget = status?.pending_change?.plan_code === p.code;
            const isQuoted = quote?.new_plan.code === p.code;
            return (
              <div key={p.code} className="relative flex flex-col rounded-[20px] p-5"
                style={{
                  background: p.code === 'elite' ? 'rgba(245,158,11,0.06)' : 'rgba(255,255,255,0.03)',
                  border: isQuoted
                    ? '1px solid rgba(52,211,153,0.55)'
                    : p.code === 'elite' ? '1px solid rgba(245,158,11,0.35)' : '1px solid rgba(255,255,255,0.10)',
                }}>
                {p.is_launch && (
                  <span className="absolute -top-2.5 left-5 rounded-full px-2.5 py-0.5 text-[10px] font-[800] text-white" style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)' }}>LAUNCH OFFER</span>
                )}
                <p className="text-[13px] font-[750] text-white">{p.name}</p>
                <p className="mt-0.5 text-[11px]" style={{ color: '#94a3b8' }}>{p.best_for}</p>
                <div className="mt-3 flex items-end gap-1.5">
                  <span className="text-[26px] font-[860] text-white">{fmtINR(p.effective_price_inr)}</span>
                  {p.is_launch && <span className="mb-1 text-[13px] line-through" style={{ color: '#64748b' }}>{fmtINR(p.price_inr)}</span>}
                </div>
                <p className="text-[11.5px]" style={{ color: '#94a3b8' }}>for {p.duration_months} {p.duration_months === 1 ? 'month' : 'months'}</p>
                <div className="mt-4 space-y-2 text-[12.5px]" style={{ color: '#cbd5e1' }}>
                  <p className="flex items-center gap-2"><Check size={13} style={{ color: '#34d399' }} /> {p.client_limit != null ? `Up to ${p.client_limit} clients` : 'Unlimited clients'}</p>
                  <p className="flex items-center gap-2"><Check size={13} style={{ color: '#34d399' }} /> All premium features</p>
                  <p className="flex items-center gap-2"><Check size={13} style={{ color: '#34d399' }} /> {p.duration_months >= 12 ? 'Priority support' : 'Standard support'}</p>
                </div>
                <div className="mt-auto pt-4">
                  {isCurrent ? (
                    <div className="rounded-[12px] py-2 text-center text-[12px] font-[700]" style={{ background: 'rgba(16,185,129,0.12)', color: '#34d399' }}>Current plan</div>
                  ) : isPendingTarget ? (
                    <div className="rounded-[12px] py-2 text-center text-[12px] font-[700]" style={{ background: 'rgba(56,189,248,0.12)', color: '#38bdf8' }}>Scheduled</div>
                  ) : active ? (
                    // An active studio switching plans gets a priced preview
                    // first — proration and the effective date matter here.
                    <button onClick={() => openQuote(p.code)} disabled={!!quoting || confirming}
                      className="flex w-full items-center justify-center gap-1.5 rounded-[12px] py-2 text-[12px] font-[750] text-white transition hover:opacity-90 disabled:opacity-50"
                      style={{ background: p.code === 'elite' ? 'linear-gradient(135deg,#F59E0B,#D97706)' : 'rgba(255,255,255,0.10)' }}>
                      {quoting === p.code ? <Loader2 size={13} className="animate-spin" /> : null}
                      Switch to {p.name}
                    </button>
                  ) : requested ? (
                    <div className="rounded-[12px] py-2 text-center text-[12px] font-[700]" style={{ background: 'rgba(245,158,11,0.12)', color: '#fbbf24' }}>Request sent ✓</div>
                  ) : (
                    <button onClick={() => requestActivation(p.code)} disabled={!!requesting}
                      className="flex w-full items-center justify-center gap-1.5 rounded-[12px] py-2 text-[12px] font-[750] text-white transition hover:opacity-90 disabled:opacity-50"
                      style={{ background: p.code === 'elite' ? 'linear-gradient(135deg,#F59E0B,#D97706)' : 'rgba(255,255,255,0.10)' }}>
                      {requesting === p.code ? <Loader2 size={13} className="animate-spin" /> : null}
                      Choose {p.name}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Priced preview of a plan change, shown once a plan is picked. */}
        {quote && (
          <ChangePreview
            quote={quote}
            busy={confirming}
            onConfirm={confirmChange}
            onDismiss={() => setQuote(null)}
          />
        )}

        {/* Request / status CTA */}
        <div className="mt-8 flex flex-col items-center gap-3 rounded-[18px] p-6 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-[14px] font-[750] text-white">Ready to {frozen ? 'reactivate' : active ? 'renew or upgrade' : 'subscribe'}?</p>
          <p className="max-w-[460px] text-[12.5px]" style={{ color: '#94a3b8' }}>
            {requested
              ? 'Thanks! Your request has reached the MY PT STUDIO team — we’ll confirm your payment and switch on your subscription shortly. No data is lost.'
              : 'Pick a plan above (or tap below) to request activation. Our team confirms your payment and switches on your subscription — usually within a few hours.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {!requested && (
              <Button onClick={() => requestActivation()} loading={requesting === 'general'} disabled={!!requesting}
                style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)', color: '#fff' }}>
                Request activation
              </Button>
            )}
            <Button variant="outline" onClick={() => load()} iconLeft={<ArrowRight size={14} />}>Refresh status</Button>
          </div>
        </div>

        {/* Invoices */}
        {invoices.length > 0 && (
          <div className="mt-8">
            <p className="mb-2 text-[12px] font-[700] uppercase tracking-wider" style={{ color: '#64748b' }}>Invoice history</p>
            <div className="overflow-hidden rounded-[16px]" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              {invoices.map((inv, i) => (
                <div key={inv.id} className="flex items-center justify-between px-4 py-3 text-[12.5px]" style={{ background: 'rgba(255,255,255,0.02)', borderTop: i ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                  <span style={{ color: '#cbd5e1' }}>{inv.invoice_number} · {fmtDate(inv.issued_at)}</span>
                  <span className="tabular-nums font-[650]" style={{ color: inv.status === 'refunded' ? '#64748b' : '#fff', textDecoration: inv.status === 'refunded' ? 'line-through' : 'none' }}>{fmtINR(inv.amount_inr)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
