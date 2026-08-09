'use client';

// Studio-facing subscription screen — current plan/trial state, the plan
// catalogue with live launch pricing, and invoice history. Activation is
// handled by the platform team (admin-activated billing), so the CTA is
// "request activation", not a checkout.
//
// ── Two layouts, one body ────────────────────────────────────────────────────
// Normally this renders inside AppShell like every other page: app top bar,
// sidebar, mobile bottom nav. It is a page of the app and should feel like one.
//
// The exception is a FROZEN studio (trial expired / subscription lapsed). The
// backend answers 402 SUBSCRIPTION_INACTIVE on every other endpoint and
// http.ts redirects straight back here, so the shell's navigation would be
// entirely dead — every link bounces the user back to this page. That state
// gets a standalone, full-bleed lockout screen instead, which is honest about
// there being exactly one thing to do.
//
// Both layouts render the SAME body, built on the app's semantic tokens, so it
// is correct in light and dark without a second set of components.
//
// That conditional is why this page is the one staff route still under (bare),
// mounting AppShell itself. Everything under (chrome) inherits the shell from
// its layout and cannot opt out — and opting out is precisely what the frozen
// branch has to do.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { m } from 'framer-motion';
import {
  ShieldAlert, Check, Crown, Loader2, LogOut, Clock, ArrowRight,
  ArrowUpRight, ArrowDownRight, CalendarClock, AlertTriangle, Users, X, Receipt, Flame,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import StudioMark from '@/components/StudioMark';
import FounderBadge from '@/components/FounderBadge';
import { useFounder } from '@/lib/use-founder';
import { Button, PageTitle } from '@/components/ui';
import { api } from '@/lib/api';
import type { SubscriptionStatus, SubPlan, SubInvoice, PlanChangeQuote, CouponValidation } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast';

const FROZEN_STATES = ['frozen', 'trial_expired', 'expired', 'cancelled', 'suspended'];
const fmtINR = (n: number) => '₹' + Number(n || 0).toLocaleString('en-IN');
const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const EASE_EXPO = [0.16, 1, 0.3, 1] as const;

// Plan-tier accent — the same mapping the Command Centre uses for studio
// cards, keyed by plan_code (stable) rather than plan_name (a display string),
// so a studio's own billing screen and the operator's view of it agree on what
// colour each tier is.
const PLAN_ACCENT: Record<string, string> = {
  starter: 'linear-gradient(90deg,#64748b,#475569)',
  growth: 'linear-gradient(90deg,#0067e0,#0059ce)',
  professional: 'linear-gradient(90deg,#0067e0,#0059ce)',
  elite: 'linear-gradient(90deg,#f59e0b,#d97706)',
};
const NO_PLAN_ACCENT = 'linear-gradient(90deg,var(--border),var(--border))';
const GOLD = 'linear-gradient(135deg,#F59E0B,#D97706)';

// ── Design primitives ─────────────────────────────────────────────────────────
// Same material language as the Command Centre's console primitives (layered
// surface, hairline border, specular top edge, expo-out entrance) but local to
// this route, because these carry an accent/glow treatment the shared Panel
// deliberately does not have.

function Reveal({ children, delay = 0, className = '' }: {
  children: React.ReactNode; delay?: number; className?: string;
}) {
  return (
    <m.div
      className={className}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, delay, ease: EASE_EXPO }}
    >
      {children}
    </m.div>
  );
}

function Panel({ children, className = '', accent, glow }: {
  children: React.ReactNode;
  className?: string;
  /** Coloured hairline border — used by the state hero so its meaning reads
      before the copy does. */
  accent?: string;
  /** Soft ambient wash in the top-right corner. */
  glow?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-[18px] sm:rounded-[20px] ${className}`}
      style={{
        background: 'var(--bg-elevated)',
        border: `1px solid ${accent ?? 'var(--border)'}`,
        boxShadow: 'var(--shadow-card), inset 0 1px 0 rgba(255,255,255,0.06)',
      }}
    >
      {glow && (
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full"
          style={{ background: `radial-gradient(circle, ${glow} 0%, transparent 70%)`, opacity: 0.18, filter: 'blur(36px)' }}
        />
      )}
      {children}
    </div>
  );
}

function IconBadge({ icon, colour }: { icon: React.ReactNode; colour: string }) {
  return (
    <span
      className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[13px]"
      style={{
        background: `linear-gradient(145deg, ${colour} 0%, color-mix(in srgb, ${colour} 60%, #000) 100%)`,
        boxShadow: `0 6px 16px color-mix(in srgb, ${colour} 38%, transparent), inset 0 1px 0 rgba(255,255,255,0.3)`,
        color: '#fff',
      }}
    >
      <span aria-hidden className="pointer-events-none absolute inset-0"
        style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, transparent 55%)' }} />
      <span className="relative">{icon}</span>
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-2.5 px-1 text-[10.5px] font-[750] uppercase"
      style={{ color: 'var(--text-muted)', letterSpacing: '0.14em' }}>
      {children}
    </h2>
  );
}

// ── Seat usage meter ──────────────────────────────────────────────────────────
// Counts ACTIVE clients only, matching what the backend enforces, so this can
// never disagree with the 403 a trainer hits when adding a client.
function SeatMeter({ used, limit, remaining }: {
  used: number; limit: number | null; remaining: number | null;
}) {
  if (limit == null) {
    return (
      <div className="flex items-center gap-2 text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
        <Users size={14} style={{ color: 'var(--success)' }} />
        <span><strong style={{ color: 'var(--text-primary)' }}>{used}</strong> active clients · unlimited</span>
      </div>
    );
  }
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const full = used >= limit;
  const near = !full && remaining != null && remaining <= 1;
  const colour = full ? 'var(--danger)' : near ? 'var(--warning)' : 'var(--success)';

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
          <Users size={14} style={{ color: colour }} />
          <span><strong style={{ color: 'var(--text-primary)' }}>{used}</strong> of {limit} active clients</span>
        </div>
        <span className="text-[11.5px] font-[700] tabular-nums" style={{ color: colour }}>
          {full ? 'Limit reached' : `${remaining ?? Math.max(0, limit - used)} left`}
        </span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--bg-subtle)' }}>
        <m.div className="h-full rounded-full" style={{ background: colour }}
          initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.7, ease: EASE_EXPO }} />
      </div>
      {full && (
        <p className="mt-2 text-[11.5px]" style={{ color: 'var(--danger)' }}>
          Archive a client to free a slot, or upgrade below. Existing clients keep full access.
        </p>
      )}
    </div>
  );
}

// ── Plan-change preview ───────────────────────────────────────────────────────
// Rendered inline rather than in a modal — it stays readable on a phone without
// a dialog layer, and the numbers belong next to the plan that produced them.
function ChangePreview({ quote, busy, checkoutAvailable, onConfirm, onPay, onDismiss }: {
  quote: PlanChangeQuote; busy: boolean; checkoutAvailable: boolean;
  onConfirm: () => void; onPay: () => void; onDismiss: () => void;
}) {
  const isDowngrade = quote.direction === 'downgrade';
  const accent = isDowngrade ? 'var(--info)' : 'var(--success)';
  const Icon = isDowngrade ? ArrowDownRight : ArrowUpRight;

  const heading = isDowngrade
    ? `Switch down to ${quote.new_plan.name}`
    : quote.direction === 'renewal'
      ? `Renew ${quote.new_plan.name}`
      : `Upgrade to ${quote.new_plan.name}`;

  return (
    <Reveal>
      {/* No box — a left accent bar plus top/bottom rules, matching the flat
          rhythm of the rest of the page. Only the Hero keeps a full container. */}
      <div className="py-5 pl-4"
        style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', borderLeft: `3px solid ${accent}` }}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <IconBadge icon={<Icon size={18} />} colour={accent} />
            <div className="min-w-0">
              <h3 className="text-[16px] font-[820]" style={{ color: 'var(--text-primary)' }}>{heading}</h3>
              <p className="mt-0.5 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
                {isDowngrade
                  ? `Takes effect ${fmtDate(quote.effective_at)}, when your current period ends. Nothing changes before then.`
                  : 'Takes effect as soon as your payment is confirmed.'}
              </p>
            </div>
          </div>
          <button onClick={onDismiss} aria-label="Dismiss"
            className="shrink-0 rounded-full p-1.5 transition-colors hover:bg-[var(--bg-hover)]"
            style={{ color: 'var(--text-muted)' }}>
            <X size={15} />
          </button>
        </div>

        {/* Money breakdown — only meaningful when something is actually charged. */}
        {!isDowngrade && (
          <div className="mt-4 space-y-2 border-t pt-3" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between text-[12.5px]">
              <span style={{ color: 'var(--text-muted)' }}>{quote.new_plan.name} plan</span>
              <span className="tabular-nums" style={{ color: 'var(--text-primary)' }}>{fmtINR(quote.new_plan_price_inr)}</span>
            </div>
            {quote.proration_credit_inr > 0 && (
              <div className="flex items-center justify-between text-[12.5px]">
                <span style={{ color: 'var(--text-muted)' }}>Unused time on your current plan</span>
                <span className="tabular-nums" style={{ color: 'var(--success)' }}>−{fmtINR(quote.proration_credit_inr)}</span>
              </div>
            )}
            <div className="flex items-center justify-between border-t pt-2 text-[13.5px] font-[800]"
              style={{ borderColor: 'var(--border)' }}>
              <span style={{ color: 'var(--text-primary)' }}>Due now</span>
              <span className="tabular-nums" style={{ color: 'var(--text-primary)' }}>{fmtINR(quote.amount_due_inr)}</span>
            </div>
            {quote.founder_locked && (
              <p className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--warning)' }}>
                <Crown size={11} /> Founder pricing locked in
              </p>
            )}
          </div>
        )}

        {isDowngrade && (
          <div className="mt-4 flex items-center justify-between border-t pt-3 text-[12.5px]" style={{ borderColor: 'var(--border)' }}>
            <span style={{ color: 'var(--text-muted)' }}>Due now</span>
            <span className="tabular-nums font-[800]" style={{ color: 'var(--text-primary)' }}>₹0</span>
          </div>
        )}

        {/* Over-limit warning. The change still goes through — no client is ever
            archived automatically — but the trainer needs to know. */}
        {quote.warning && (
          <div className="mt-3 flex gap-2.5 pl-3" style={{ borderLeft: '3px solid var(--warning)' }}>
            <AlertTriangle size={15} className="mt-0.5 shrink-0" style={{ color: 'var(--warning)' }} />
            <p className="text-[12px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{quote.warning}</p>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          {/* A downgrade is free and scheduled — nothing to pay, so it never
              goes near checkout. An upgrade/renewal DOES cost money: when
              self-checkout is on, the confirm action opens the same Pay+UTR
              window a fresh subscription uses, instead of filing a free-text
              request the operator would have to take on faith. Falls back to
              the old manual request only when checkout isn't configured yet,
              so billing never dead-ends. */}
          {isDowngrade ? (
            <Button onClick={onConfirm} loading={busy} disabled={busy}>
              Schedule this change
            </Button>
          ) : checkoutAvailable ? (
            <Button onClick={onPay} loading={busy} disabled={busy} style={{ background: GOLD, color: '#fff' }}>
              Pay {fmtINR(quote.amount_due_inr)}
            </Button>
          ) : (
            <Button onClick={onConfirm} loading={busy} disabled={busy} style={{ background: GOLD, color: '#fff' }}>
              Request this upgrade
            </Button>
          )}
          <Button variant="outline" onClick={onDismiss} disabled={busy}>Not now</Button>
        </div>
      </div>
    </Reveal>
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
  const founderNumber = useFounder();
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
  const [couponCode, setCouponCode] = useState('');
  const [coupon, setCoupon] = useState<CouponValidation | null>(null);
  const [couponChecking, setCouponChecking] = useState(false);

  // Is UPI self-checkout switched on by the platform operator? When it is, a
  // plan button opens a real payment window; when it is not, it falls back to
  // the original "request activation" flow so billing never dead-ends.
  const [checkoutAvailable, setCheckoutAvailable] = useState(false);
  useEffect(() => {
    void api.subscription.checkout.settings()
      .then((r) => setCheckoutAvailable(Boolean(r.data.available)))
      .catch(() => setCheckoutAvailable(false));
  }, []);

  /**
   * Open the payment window for a plan.
   *
   * The window is opened SYNCHRONOUSLY on the click and its URL set afterwards:
   * every mobile browser blocks window.open() called later from inside a
   * promise, which would silently do nothing on exactly the devices most
   * likely to be paying.
   *
   * Deliberately WITHOUT noopener/noreferrer. Those cause window.open() to
   * return null in Chromium- and WebKit-based browsers — there is no `win` to
   * navigate later, so the popup we just opened is abandoned as a permanent
   * blank tab while the fallback branch quietly navigates the WRONG window.
   * That combination is exactly what left studios staring at an about:blank
   * tab. Safe to drop here: the destination is our own same-origin route, not
   * an external link, so there is no tab-nabbing risk from keeping the
   * opener/referrer link.
   */
  const startCheckout = async (planCode: string) => {
    setRequesting(planCode);
    const win = window.open('', '_blank', 'width=520,height=860');
    try {
      const r = await api.subscription.checkout.open(
        planCode,
        coupon?.valid ? couponCode.trim().toUpperCase() : undefined,
      );
      const url = `/subscription/checkout/${r.data.request.id}`;
      // Popup blocked (common on iOS Safari) — fall back to the same tab so the
      // studio still reaches the payment page rather than clicking into nothing.
      if (win) win.location.href = url;
      else window.location.href = url;
    } catch (e) {
      win?.close();
      toast.error(e instanceof Error ? e.message : 'Could not start the payment');
    } finally { setRequesting(''); }
  };

  const requestActivation = async (planCode: string) => {
    setRequesting(planCode);
    try {
      // Only send a coupon that actually validated — an unchecked string would
      // just fail later at redemption.
      const r = await api.subscription.requestActivation(
        planCode,
        coupon?.valid ? couponCode.trim().toUpperCase() : undefined,
      );
      setRequested(true);
      toast.success(r.data.message);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not send request');
    } finally { setRequesting(''); }
  };

  const applyCoupon = async (planCode?: string) => {
    const code = couponCode.trim();
    if (!code) return;
    setCouponChecking(true);
    try {
      const r = await api.subscription.validateCoupon(code, planCode ?? status?.plan?.code);
      setCoupon(r.data);
      if (r.data.valid) toast.success(`Coupon applied — ${fmtINR(r.data.discount_inr ?? 0)} off.`);
    } catch (e) {
      setCoupon(null);
      toast.error(e instanceof Error ? e.message : 'Could not check that coupon');
    } finally { setCouponChecking(false); }
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

  // ── Page body ───────────────────────────────────────────────────────────────
  const body = (
    <div className="space-y-6">
      {/* Hero — frozen vs trial vs active */}
      {frozen && (
        <Reveal>
          <Panel accent="var(--danger-border)" glow="var(--danger)" className="p-6 text-center sm:p-7">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full" style={{ background: 'var(--danger-soft)' }}>
              <ShieldAlert size={26} style={{ color: 'var(--danger)' }} />
            </div>
            <h2 className="text-[22px] font-[860] tracking-[-0.02em] sm:text-[24px]" style={{ color: 'var(--text-primary)' }}>
              {status?.state === 'trial_expired' || status?.state === 'frozen' ? 'Your trial has expired' : 'Your subscription is inactive'}
            </h2>
            <p className="mx-auto mt-2 max-w-[440px] text-[14px]" style={{ color: 'var(--text-secondary)' }}>
              {status?.reason || 'Please subscribe to continue using MY PT STUDIO.'}
            </p>
            <p className="mx-auto mt-3 max-w-[440px] text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
              Your data is safe — clients, workouts, assessments and files are all preserved. Choose a plan below and contact us to reactivate instantly.
            </p>
          </Panel>
        </Reveal>
      )}

      {onTrial && (
        <Reveal>
          <Panel accent="var(--warning-border)" glow="var(--warning)" className="p-5 sm:p-6">
            <div className="flex items-center gap-3.5">
              <IconBadge icon={<Clock size={18} />} colour="var(--warning)" />
              <div className="min-w-0">
                <h2 className="text-[17px] font-[820] sm:text-[18px]" style={{ color: 'var(--text-primary)' }}>
                  {status?.trial_days_left ?? 0} {status?.trial_days_left === 1 ? 'day' : 'days'} left in your free trial
                </h2>
                <p className="text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
                  All premium features are unlocked. Pick a plan to keep them after your trial ends on {fmtDate(status?.trial_ends_at)}.
                </p>
              </div>
            </div>
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full" style={{ background: 'var(--bg-subtle)' }}>
              <m.div className="h-full rounded-full" style={{ background: GOLD }}
                initial={{ width: 0 }} animate={{ width: `${trialPct * 100}%` }} transition={{ duration: 0.8, ease: EASE_EXPO }} />
            </div>
          </Panel>
        </Reveal>
      )}

      {active && status && (
        <Reveal>
          <Panel accent="var(--success-border)" glow="var(--success)" className="p-5 sm:p-6">
            <div className="flex items-center gap-3.5">
              <IconBadge icon={<Crown size={18} />} colour={status.is_founder ? 'var(--warning)' : 'var(--success)'} />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-[17px] font-[820] sm:text-[18px]" style={{ color: 'var(--text-primary)' }}>
                    {status.plan?.name || 'Active'} plan
                  </h2>
                  {status.is_founder && (
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-[750]"
                      style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>
                      <Crown size={10} /> Founder #{status.founder_number}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
                  {status.current_period_end
                    ? `${status.renewal_due ? 'Renews soon — ' : ''}Renews on ${fmtDate(status.current_period_end)}${status.period_days_left != null ? ` · ${status.period_days_left} days left` : ''}`
                    : 'Active · no expiry'}
                </p>
              </div>
            </div>

            <div className="mt-4 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
              <SeatMeter
                used={status.client_count ?? 0}
                limit={status.client_limit ?? null}
                remaining={status.client_remaining ?? null}
              />
            </div>
          </Panel>
        </Reveal>
      )}

      {/* A downgrade queued for period end. Nothing has changed yet. No box —
          a left accent bar and hairline rules, same flat language as the rest
          of the page below the Hero. */}
      {status?.pending_change && (
        <Reveal>
          <div className="flex flex-wrap items-center justify-between gap-3 py-4 pl-4"
            style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', borderLeft: '3px solid var(--info)' }}>
            <div className="flex min-w-0 items-start gap-3">
              <CalendarClock size={18} className="mt-0.5 shrink-0" style={{ color: 'var(--info)' }} />
              <div className="min-w-0">
                <p className="text-[13.5px] font-[780]" style={{ color: 'var(--text-primary)' }}>
                  Switching to {status.pending_change.plan_name} on {fmtDate(status.pending_change.effective_at)}
                </p>
                <p className="mt-0.5 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
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
        </Reveal>
      )}

      {/* Founder banner — plain text, no pill container. */}
      {slots != null && slots > 0 && (
        <Reveal delay={0.05}>
          <p className="flex items-center justify-center gap-2 text-center text-[12px] font-[700]" style={{ color: 'var(--warning)' }}>
            <Flame size={13} />
            Founder&apos;s Club — only {slots}{founderLimit != null ? ` of ${founderLimit}` : ''} lifetime-locked-price spots left.
          </p>
        </Reveal>
      )}

      {/* Pricing — a flat, divided list rather than four boxed cards. Hierarchy
          comes from typography, the tier dot, and hairline row dividers; a
          quoted plan gets a full-width tint (no border/shadow/radius) so it
          reads as a highlighted row, not a card. */}
      <div>
        <SectionLabel>Plans</SectionLabel>

        {/* Column header, desktop only — mobile stacks each row's own labels. */}
        <div className="hidden pb-2.5 text-[10.5px] font-[750] uppercase sm:flex"
          style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
          <span className="w-[220px] shrink-0">Plan</span>
          <span className="w-[150px] shrink-0">Price</span>
          <span className="flex-1">Included</span>
          <span className="w-[160px] shrink-0 text-right">Action</span>
        </div>

        <div style={{ borderBottom: '1px solid var(--border)' }}>
          {plans.map((p, i) => {
            const isCurrent = status?.plan?.code === p.code;
            const isPendingTarget = status?.pending_change?.plan_code === p.code;
            const isQuoted = quote?.new_plan.code === p.code;
            const isElite = p.code === 'elite';
            return (
              <Reveal key={p.code} delay={i * 0.04}>
                <div
                  className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:gap-4"
                  style={{
                    borderTop: i ? '1px solid var(--border)' : 'none',
                    background: isQuoted ? 'color-mix(in srgb, var(--success) 6%, transparent)' : undefined,
                  }}
                >
                  <div className="flex items-center gap-3 sm:w-[220px] sm:shrink-0">
                    <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: PLAN_ACCENT[p.code] || NO_PLAN_ACCENT }} />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-[13.5px] font-[750]" style={{ color: 'var(--text-primary)' }}>{p.name}</p>
                        {p.is_launch && (
                          <span className="rounded-full px-1.5 py-0.5 text-[9px] font-[800] text-white" style={{ background: GOLD }}>LAUNCH</span>
                        )}
                      </div>
                      <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{p.best_for}</p>
                    </div>
                  </div>

                  <div className="flex items-baseline gap-1.5 sm:w-[150px] sm:shrink-0">
                    <span className="text-[20px] font-[860] tabular-nums" style={{ color: 'var(--text-primary)' }}>{fmtINR(p.effective_price_inr)}</span>
                    {p.is_launch && <span className="text-[11.5px] line-through" style={{ color: 'var(--text-disabled)' }}>{fmtINR(p.price_inr)}</span>}
                    <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>/{p.duration_months}mo</span>
                  </div>

                  <div className="flex flex-1 flex-wrap gap-x-4 gap-y-1 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                    <span className="flex items-center gap-1.5"><Check size={12} className="shrink-0" style={{ color: 'var(--success)' }} /> {p.client_limit != null ? `Up to ${p.client_limit} clients` : 'Unlimited clients'}</span>
                    <span className="flex items-center gap-1.5"><Check size={12} className="shrink-0" style={{ color: 'var(--success)' }} /> All premium features</span>
                    <span className="flex items-center gap-1.5"><Check size={12} className="shrink-0" style={{ color: 'var(--success)' }} /> {p.duration_months >= 12 ? 'Priority support' : 'Standard support'}</span>
                  </div>

                  <div className="sm:w-[160px] sm:shrink-0 sm:text-right">
                    {isCurrent ? (
                      <span className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11.5px] font-[700]" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>
                        <Check size={12} /> Current plan
                      </span>
                    ) : isPendingTarget ? (
                      <span className="inline-flex items-center rounded-full px-3 py-1.5 text-[11.5px] font-[700]" style={{ background: 'var(--info-bg)', color: 'var(--info)' }}>Scheduled</span>
                    ) : active ? (
                      // An active studio switching plans gets a priced preview
                      // first — proration and the effective date matter here.
                      <button onClick={() => openQuote(p.code)} disabled={!!quoting || confirming}
                        className="inline-flex min-h-[36px] w-full items-center justify-center gap-1.5 rounded-full px-4 text-[12px] font-[750] transition hover:opacity-90 disabled:opacity-50 sm:w-auto"
                        style={isElite
                          ? { background: GOLD, color: '#fff' }
                          : { background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                        {quoting === p.code ? <Loader2 size={13} className="animate-spin" /> : null}
                        Switch to {p.name}
                      </button>
                    ) : requested ? (
                      <span className="inline-flex items-center rounded-full px-3 py-1.5 text-[11.5px] font-[700]" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>Request sent ✓</span>
                    ) : (
                      <button
                        onClick={() => (checkoutAvailable ? startCheckout(p.code) : requestActivation(p.code))}
                        disabled={!!requesting}
                        className="inline-flex min-h-[36px] w-full items-center justify-center gap-1.5 rounded-full px-4 text-[12px] font-[750] transition hover:opacity-90 disabled:opacity-50 sm:w-auto"
                        style={isElite || checkoutAvailable
                          ? { background: isElite ? GOLD : 'var(--brand)', color: '#fff' }
                          : { background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                        {requesting === p.code ? <Loader2 size={13} className="animate-spin" /> : null}
                        {checkoutAvailable ? `Pay ${fmtINR(p.effective_price_inr)}` : `Choose ${p.name}`}
                      </button>
                    )}
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>

      {/* Priced preview of a plan change, shown once a plan is picked. */}
      {quote && (
        <ChangePreview
          quote={quote}
          busy={confirming || requesting === quote.new_plan.code}
          checkoutAvailable={checkoutAvailable}
          onConfirm={confirmChange}
          onPay={() => { const code = quote.new_plan.code; setQuote(null); startCheckout(code); }}
          onDismiss={() => setQuote(null)}
        />
      )}

      {/* Coupon + status refresh. Activation itself happens on the plan card
          above — Pay opens the checkout window, or (when self-checkout isn't
          configured yet) falls back to a plan-specific request. There is no
          plan-less "request activation" button here: the flow is pick a
          plan first, then pay or request for that plan — never the other
          way round. */}
      <Reveal delay={0.1}>
        <div className="flex flex-col items-center gap-3 py-6 text-center" style={{ borderTop: '1px solid var(--border)' }}>
          <p className="text-[14px] font-[750]" style={{ color: 'var(--text-primary)' }}>
            Ready to {frozen ? 'reactivate' : active ? 'renew or upgrade' : 'subscribe'}?
          </p>
          <p className="max-w-[460px] text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
            {requested
              ? 'Thanks! Your request has reached the MY PT STUDIO team — we’ll confirm your payment and switch on your subscription shortly. No data is lost.'
              : 'Have a coupon? Apply it below, then pick a plan above.'}
          </p>
          {/* Coupon. Validating is a preview only — the binding check happens
              server-side under a lock when the operator activates, so a code
              exhausted in the meantime is still caught. */}
          {!requested && (
            <div className="w-full max-w-[420px]">
              <div className="flex gap-2">
                <input
                  value={couponCode}
                  onChange={(e) => { setCouponCode(e.target.value); setCoupon(null); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') applyCoupon(); }}
                  placeholder="Coupon code"
                  aria-label="Coupon code"
                  className="h-9 min-w-0 flex-1 rounded-[10px] px-3 text-[12.5px] font-[650] uppercase tracking-wide outline-none"
                  style={{
                    background: 'var(--bg-subtle)',
                    border: `1px solid ${coupon ? (coupon.valid ? 'var(--success)' : 'var(--danger)') : 'var(--border)'}`,
                    color: 'var(--text-primary)',
                  }}
                />
                <Button variant="outline" onClick={() => applyCoupon()}
                  loading={couponChecking} disabled={couponChecking || !couponCode.trim()}>
                  Apply
                </Button>
              </div>
              {coupon && (
                <p className="mt-2 text-[11.5px]" style={{ color: coupon.valid ? 'var(--success)' : 'var(--danger)' }}>
                  {coupon.valid
                    ? `${fmtINR(coupon.discount_inr ?? 0)} off${coupon.net_amount_inr != null && coupon.gross_amount_inr > 0 ? ` — ${fmtINR(coupon.net_amount_inr)} due instead of ${fmtINR(coupon.gross_amount_inr)}` : ''}. It will be applied when your subscription is activated.`
                    : coupon.reason}
                </p>
              )}
            </div>
          )}

          <Button variant="outline" onClick={() => load()} iconLeft={<ArrowRight size={14} />}>Refresh status</Button>
        </div>
      </Reveal>

      {/* Invoices */}
      {invoices.length > 0 && (
        <Reveal delay={0.14}>
          <SectionLabel>Invoice history</SectionLabel>
          <div style={{ borderTop: '1px solid var(--border)' }}>
            {invoices.map((inv, i) => (
              <div key={inv.id} className="flex items-center gap-3 py-3 text-[12.5px] transition-colors hover:bg-[var(--bg-hover)]"
                style={{ borderTop: i ? '1px solid var(--border)' : 'none' }}>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px]" style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
                  <Receipt size={13} />
                </span>
                <span className="min-w-0 flex-1 truncate" style={{ color: 'var(--text-secondary)' }}>{inv.invoice_number} · {fmtDate(inv.issued_at)}</span>
                <span className="shrink-0 tabular-nums font-[650]"
                  style={{ color: inv.status === 'refunded' ? 'var(--text-disabled)' : 'var(--text-primary)', textDecoration: inv.status === 'refunded' ? 'line-through' : 'none' }}>
                  {fmtINR(inv.amount_inr)}
                </span>
              </div>
            ))}
          </div>
        </Reveal>
      )}
    </div>
  );

  // ── Layout selection ────────────────────────────────────────────────────────
  // The shell is the default, including while loading: a frozen studio is the
  // rare case, and mounting the shell only after the fetch resolves would make
  // every normal visit flash a bare screen before the chrome appeared.
  if (loading) {
    return (
      <AppShell>
        <PageTitle>Subscription &amp; billing</PageTitle>
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 size={30} className="animate-spin" style={{ color: 'var(--brand)' }} />
        </div>
      </AppShell>
    );
  }

  if (!frozen) {
    return <AppShell><PageTitle>Subscription &amp; billing</PageTitle>{body}</AppShell>;
  }

  // Frozen: standalone lockout. No shell, because every nav target answers 402
  // and redirects straight back here — see handleSubscriptionInactive in
  // lib/http.ts. data-theme="dark" scopes the dark tokens to this subtree so
  // the shared body and design-system children resolve against a dark surface
  // rather than the light theme's near-black ink on a near-black background.
  return (
    <div className="min-h-dvh" data-theme="dark" style={{ background: 'linear-gradient(180deg,#0F172A 0%,#1e293b 100%)' }}>
      {/* Floor the notch reserve rather than trusting env() alone: an installed
          PWA with statusBarStyle 'black-translucent' reports a 0 top inset on
          iOS while still painting under the status bar, which put the studio
          name directly behind the clock. Same guard the login screen uses. */}
      <div style={{
        paddingTop: 'max(env(safe-area-inset-top), 2.75rem)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 pb-4">
          <div className="flex min-w-0 items-center gap-3">
            <StudioMark name={user?.organization_name || 'PT Studio'} logoUrl={user?.organization_logo_url} size={38} radius={11} />
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <h1 className="truncate text-[14.5px] font-[820] tracking-tight text-white">{user?.organization_name || 'Your studio'}</h1>
                {/* The billing screen is where the founder price is locked, so
                    here the badge is an explanation rather than a decoration. */}
                <FounderBadge number={founderNumber} size="sm" />
              </div>
              <p className="text-[11px]" style={{ color: '#94a3b8' }}>Subscription &amp; billing</p>
            </div>
          </div>
          <button onClick={() => logout()}
            className="flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-[650] text-slate-300 transition hover:bg-white/5">
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-5xl pb-[calc(3rem+env(safe-area-inset-bottom,0px))] pt-6">
        {body}
      </div>
    </div>
  );
}
