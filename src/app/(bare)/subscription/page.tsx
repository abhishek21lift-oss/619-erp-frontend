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
//
// ── Layout ───────────────────────────────────────────────────────────────────
// The page opens on the shared navy PageHero, like every other trainer page,
// and the hero carries the studio's billing state: plan, time left, seats. The
// three things a studio comes here to learn are answered before the first
// scroll. Below it, in order of what they are for: anything that needs acting
// on (a lockout, a full roster, a scheduled switch), the plan cards, the
// priced preview of a change, the coupon, and the invoice history.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { m, useReducedMotion } from 'framer-motion';
import {
  ShieldAlert, Check, Crown, Loader2, LogOut, Clock, RefreshCw,
  ArrowUpRight, ArrowDownRight, CalendarClock, AlertTriangle, Users, X, Receipt, Flame,
  CreditCard, Sparkles, Ticket, ShieldCheck, CheckCircle2,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import StudioMark from '@/components/StudioMark';
import FounderBadge from '@/components/FounderBadge';
import { useFounder } from '@/lib/use-founder';
import { Button, HeroButton, PageContainer, PageHero } from '@/components/ui';
import { api } from '@/lib/api';
import type { SubscriptionStatus, SubPlan, SubInvoice, PlanChangeQuote, CouponValidation } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast';
import { toCodeOrNull } from '@/lib/forms/normalize';
import { errorMessage } from '@/lib/forms/errors';

const FROZEN_STATES = ['frozen', 'trial_expired', 'expired', 'cancelled', 'suspended'];
const fmtINR = (n: number) => '₹' + Number(n || 0).toLocaleString('en-IN');
const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtShortDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '';
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

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

/** Per-month price, for comparing plans of different lengths. */
const perMonth = (p: SubPlan) => (p.duration_months > 0 ? p.effective_price_inr / p.duration_months : p.effective_price_inr);

// ── Design primitives ─────────────────────────────────────────────────────────

function Reveal({ children, delay = 0, className = '' }: {
  children: React.ReactNode; delay?: number; className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <m.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.42, delay: reduce ? 0 : delay, ease: EASE_EXPO }}
    >
      {children}
    </m.div>
  );
}

/** The page's card surface: layered, hairline border, specular top edge. */
function Surface({ children, className = '', accent, style }: {
  children: React.ReactNode;
  className?: string;
  /** Coloured hairline border, so a card's meaning reads before its copy. */
  accent?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-[18px] sm:rounded-[20px] ${className}`}
      style={{
        background: 'var(--bg-elevated)',
        border: `1px solid ${accent ?? 'var(--border)'}`,
        boxShadow: 'var(--shadow-card), inset 0 1px 0 rgba(255,255,255,0.06)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function IconBadge({ icon, colour, size = 40 }: { icon: React.ReactNode; colour: string; size?: number }) {
  return (
    <span
      className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-[12px]"
      style={{
        width: size, height: size,
        background: `linear-gradient(145deg, ${colour} 0%, color-mix(in srgb, ${colour} 60%, #000) 100%)`,
        boxShadow: `0 6px 16px color-mix(in srgb, ${colour} 34%, transparent), inset 0 1px 0 rgba(255,255,255,0.3)`,
        color: '#fff',
      }}
    >
      <span aria-hidden className="pointer-events-none absolute inset-0"
        style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, transparent 55%)' }} />
      <span className="relative">{icon}</span>
    </span>
  );
}

function SectionHeading({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3 px-1">
      <h2 className="text-[15px] font-[800] tracking-[-0.01em]" style={{ color: 'var(--text-primary)' }}>{title}</h2>
      {hint && <p className="text-right text-[11.5px]" style={{ color: 'var(--text-muted)' }}>{hint}</p>}
    </div>
  );
}

// ── Hero status tiles ─────────────────────────────────────────────────────────
// Glass tiles on the navy hero. White ink throughout: they sit on the same
// dark gradient in light and dark mode, so they need no second palette.

function HeroTile({ label, value, detail, bar, barColour, className = '' }: {
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
  /** 0–1: a thin progress bar under the value. */
  bar?: number;
  barColour?: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <div
      className={`min-w-0 rounded-[12px] px-2.5 py-2.5 sm:rounded-[14px] sm:px-3.5 sm:py-3 ${className}`}
      style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.13)', backdropFilter: 'blur(6px)' }}
    >
      <p className="truncate text-[9px] font-[750] uppercase sm:text-[10px]" style={{ color: 'rgba(255,255,255,0.6)', letterSpacing: '0.1em' }}>
        {label}
      </p>
      <p className="mt-1 truncate text-[14px] font-[820] leading-tight text-white sm:text-[17px]">{value}</p>
      {bar != null && (
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.14)' }}>
          <m.div className="h-full rounded-full" style={{ background: barColour ?? '#fff' }}
            initial={reduce ? false : { width: 0 }} animate={{ width: `${Math.round(Math.min(1, Math.max(0, bar)) * 100)}%` }}
            transition={{ duration: reduce ? 0 : 0.8, ease: EASE_EXPO }} />
        </div>
      )}
      {detail && (
        // The detail line is the first thing to go on a phone: three tiles in
        // one row keep the hero compact, and every detail is restated in the
        // cards below it.
        <p className="mt-1.5 hidden truncate text-[11.5px] sm:block" style={{ color: 'rgba(255,255,255,0.7)' }}>{detail}</p>
      )}
    </div>
  );
}

// ── Plan card ─────────────────────────────────────────────────────────────────

function PlanCard({
  plan, index, isCurrent, isPendingTarget, isQuoted, bestValue, action,
}: {
  plan: SubPlan; index: number;
  isCurrent: boolean; isPendingTarget: boolean; isQuoted: boolean; bestValue: boolean;
  action: React.ReactNode;
}) {
  const isElite = plan.code === 'elite';
  const monthly = perMonth(plan);
  const border = isQuoted
    ? 'var(--success)'
    : isCurrent
      ? 'color-mix(in srgb, var(--success) 55%, var(--border))'
      : isElite
        ? 'color-mix(in srgb, #F59E0B 45%, var(--border))'
        : undefined;

  return (
    <Reveal delay={0.06 + index * 0.05} className="h-full">
      <Surface
        accent={border}
        className="flex h-full flex-col p-4 transition-shadow sm:p-5"
        style={isQuoted ? { boxShadow: '0 0 0 3px color-mix(in srgb, var(--success) 22%, transparent), var(--shadow-card)' } : undefined}
      >
        {/* Tier stripe — the same colour the operator console uses for this tier. */}
        <span aria-hidden className="absolute inset-x-0 top-0 h-[3px]" style={{ background: PLAN_ACCENT[plan.code] || NO_PLAN_ACCENT }} />

        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-[16px] font-[820] tracking-[-0.01em]" style={{ color: 'var(--text-primary)' }}>{plan.name}</h3>
            {plan.best_for && (
              <p className="mt-0.5 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>{plan.best_for}</p>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {isCurrent && (
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-[800]"
                style={{ background: 'var(--success-bg)', color: 'var(--success-text)' }}>
                <Check size={10} /> Current
              </span>
            )}
            {isPendingTarget && (
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-[800]"
                style={{ background: 'var(--info-bg)', color: 'var(--info)' }}>
                <CalendarClock size={10} /> Scheduled
              </span>
            )}
            {!isCurrent && !isPendingTarget && bestValue && (
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-[800] text-white" style={{ background: GOLD }}>
                <Sparkles size={10} /> Best value
              </span>
            )}
          </div>
        </div>

        <div className="mt-4">
          <div className="flex flex-wrap items-baseline gap-x-1.5">
            <span className="text-[28px] font-[860] leading-none tracking-[-0.03em] tabular-nums" style={{ color: 'var(--text-primary)' }}>
              {fmtINR(plan.effective_price_inr)}
            </span>
            {plan.is_launch && (
              <span className="text-[12.5px] tabular-nums line-through" style={{ color: 'var(--text-disabled)' }}>{fmtINR(plan.price_inr)}</span>
            )}
          </div>
          <p className="mt-1.5 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
            for {plural(plan.duration_months, 'month')}
            {plan.duration_months > 1 && <> · <span className="tabular-nums">{fmtINR(Math.round(monthly))}</span>/month</>}
          </p>
          {plan.is_launch && (
            <span className="mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-[800] text-white" style={{ background: GOLD }}>
              <Flame size={10} /> Launch price
            </span>
          )}
        </div>

        <ul className="mt-4 space-y-2 border-t pt-4 text-[12.5px]" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
          <li className="flex items-center gap-2">
            <Check size={13} className="shrink-0" style={{ color: 'var(--success-text)' }} />
            {plan.client_limit != null ? `Up to ${plan.client_limit} active clients` : 'Unlimited clients'}
          </li>
          <li className="flex items-center gap-2">
            <Check size={13} className="shrink-0" style={{ color: 'var(--success-text)' }} /> All premium features
          </li>
          <li className="flex items-center gap-2">
            <Check size={13} className="shrink-0" style={{ color: 'var(--success-text)' }} />
            {plan.duration_months >= 12 ? 'Priority support' : 'Standard support'}
          </li>
        </ul>

        <div className="mt-auto pt-5">{action}</div>
      </Surface>
    </Reveal>
  );
}

// ── Plan-change preview ───────────────────────────────────────────────────────
// Rendered inline rather than in a modal — it stays readable on a phone without
// a dialog layer, and the numbers belong on the page that produced them.
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
      <Surface accent={`color-mix(in srgb, ${accent} 50%, var(--border))`} className="p-4 sm:p-5">
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
        <div className="mt-4 space-y-2 rounded-[14px] p-3.5" style={{ background: 'var(--bg-subtle)' }}>
          {!isDowngrade && (
            <>
              <div className="flex items-center justify-between text-[12.5px]">
                <span style={{ color: 'var(--text-muted)' }}>{quote.new_plan.name} plan</span>
                <span className="tabular-nums" style={{ color: 'var(--text-primary)' }}>{fmtINR(quote.new_plan_price_inr)}</span>
              </div>
              {quote.proration_credit_inr > 0 && (
                <div className="flex items-center justify-between text-[12.5px]">
                  <span style={{ color: 'var(--text-muted)' }}>Unused time on your current plan</span>
                  <span className="tabular-nums" style={{ color: 'var(--success-text)' }}>−{fmtINR(quote.proration_credit_inr)}</span>
                </div>
              )}
            </>
          )}
          <div className={`flex items-center justify-between text-[14px] font-[820] ${isDowngrade ? '' : 'border-t pt-2'}`}
            style={{ borderColor: 'var(--border)' }}>
            <span style={{ color: 'var(--text-primary)' }}>Due now</span>
            <span className="tabular-nums" style={{ color: 'var(--text-primary)' }}>{isDowngrade ? '₹0' : fmtINR(quote.amount_due_inr)}</span>
          </div>
          {!isDowngrade && quote.founder_locked && (
            <p className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--warning-text)' }}>
              <Crown size={11} /> Founder pricing locked in
            </p>
          )}
        </div>

        {/* Over-limit warning. The change still goes through — no client is ever
            archived automatically — but the trainer needs to know. */}
        {quote.warning && (
          <div className="mt-3 flex gap-2.5 rounded-[12px] p-3" style={{ background: 'var(--warning-bg)' }}>
            <AlertTriangle size={15} className="mt-0.5 shrink-0" style={{ color: 'var(--warning-text)' }} />
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
      </Surface>
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
  const [refreshing, setRefreshing] = useState(false);
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
  const previewRef = useRef<HTMLDivElement>(null);

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
        coupon?.valid ? (toCodeOrNull(couponCode) ?? undefined) : undefined,
      );
      const url = `/subscription/checkout/${r.data.request.id}`;
      // Popup blocked (common on iOS Safari) — fall back to the same tab so the
      // studio still reaches the payment page rather than clicking into nothing.
      if (win) win.location.href = url;
      else window.location.href = url;
    } catch (e) {
      win?.close();
      toast.error(errorMessage(e, 'Could not start the payment'));
    } finally { setRequesting(''); }
  };

  const requestActivation = async (planCode: string) => {
    setRequesting(planCode);
    try {
      // Only send a coupon that actually validated — an unchecked string would
      // just fail later at redemption.
      const r = await api.subscription.requestActivation(
        planCode,
        coupon?.valid ? (toCodeOrNull(couponCode) ?? undefined) : undefined,
      );
      setRequested(true);
      toast.success(r.data.message);
    } catch (e) {
      toast.error(errorMessage(e, 'Could not send request'));
    } finally { setRequesting(''); }
  };

  const applyCoupon = async (planCode?: string) => {
    // `toCodeOrNull` rather than `.trim().toUpperCase()`: it also closes an
    // inner space, which `trim` leaves in place. The server compares against
    // `upper(trim(code))`, so 'LAUNCH 20' pasted out of an email would never
    // have matched and the studio would have been told their coupon is invalid.
    const code = toCodeOrNull(couponCode) ?? '';
    if (!code) return;
    setCouponChecking(true);
    try {
      const r = await api.subscription.validateCoupon(code, planCode ?? status?.plan?.code);
      setCoupon(r.data);
      if (r.data.valid) toast.success(`Coupon applied — ${fmtINR(r.data.discount_inr ?? 0)} off.`);
    } catch (e) {
      setCoupon(null);
      toast.error(errorMessage(e, 'Could not check that coupon'));
    } finally { setCouponChecking(false); }
  };

  const fetchAll = useCallback(async () => {
    const [st, pl] = await Promise.all([api.subscription.status(), api.subscription.plans()]);
    setStatus(st.data);
    setPlans(pl.data.plans ?? []);
    setSlots(pl.data.founder_slots_remaining);
    setFounderLimit(pl.data.founder_limit ?? null);
    try { setInvoices((await api.subscription.invoices()).data ?? []); } catch { /* frozen can still read */ }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try { await fetchAll(); } finally { setLoading(false); }
  }, [fetchAll]);
  useEffect(() => { load(); }, [load]);

  // The hero's refresh keeps the page on screen and says when it fails — a
  // studio pressing it is usually checking whether a payment has been
  // confirmed, and a silent failure would read as "not yet".
  const refresh = async () => {
    setRefreshing(true);
    try { await fetchAll(); } catch (e) {
      toast.error(errorMessage(e, 'Could not refresh your subscription'));
    } finally { setRefreshing(false); }
  };

  // Price a change before committing. Read-only on the backend.
  const openQuote = async (planCode: string) => {
    setQuoting(planCode);
    setQuote(null);
    try {
      const r = await api.subscription.changeQuote(planCode);
      setQuote(r.data);
    } catch (e) {
      toast.error(errorMessage(e, 'Could not price that change'));
    } finally { setQuoting(''); }
  };

  // The preview renders under the plan grid, which on a phone is four cards
  // below the button that asked for it. Bring it into view once it exists.
  useEffect(() => {
    if (!quote) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    previewRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
  }, [quote]);

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
      toast.error(errorMessage(e, 'Could not submit that change'));
    } finally { setConfirming(false); }
  };

  const cancelPending = async () => {
    setCancellingPending(true);
    try {
      await api.subscription.cancelScheduledChange();
      toast.success('Scheduled change cancelled — you stay on your current plan.');
      await load();
    } catch (e) {
      toast.error(errorMessage(e, 'Could not cancel that change'));
    } finally { setCancellingPending(false); }
  };

  const frozen = status ? FROZEN_STATES.includes(status.state) : false;
  const onTrial = status?.state === 'trial';
  const active = status?.state === 'active';

  const trialPct = useMemo(() => {
    if (!onTrial || status?.trial_days_left == null) return 0;
    return Math.min(1, Math.max(0, (7 - status.trial_days_left) / 7));
  }, [onTrial, status]);

  // Share of the current paid period already used, from its own start and end.
  const periodPct = useMemo(() => {
    if (!active || !status?.current_period_start || !status.current_period_end) return null;
    const start = new Date(status.current_period_start).getTime();
    const end = new Date(status.current_period_end).getTime();
    if (!(end > start)) return null;
    return Math.min(1, Math.max(0, (Date.now() - start) / (end - start)));
  }, [active, status]);

  // The cheapest plan per month, when there is more than one plan to compare
  // and they actually differ. A tie is no recommendation.
  const bestValueCode = useMemo(() => {
    if (plans.length < 2) return null;
    const sorted = [...plans].sort((a, b) => perMonth(a) - perMonth(b));
    return perMonth(sorted[0]) < perMonth(sorted[1]) ? sorted[0].code : null;
  }, [plans]);

  // ── Hero ────────────────────────────────────────────────────────────────────
  const heroSubtitle = frozen
    ? (status?.state === 'trial_expired' || status?.state === 'frozen' ? 'Your free trial has ended' : 'Your subscription is inactive')
    : onTrial
      ? 'Free trial · every premium feature unlocked'
      : active
        ? `${status?.plan?.name ?? 'Active'} plan${status?.is_founder && status.founder_number ? ` · Founder #${status.founder_number}` : ''}`
        : 'Plans, payments and invoices';

  const trialDays = status?.trial_days_left ?? 0;
  const used = status?.client_count ?? 0;
  const limit = status?.client_limit ?? null;
  const seatsFull = limit != null && used >= limit;
  const seatColour = seatsFull ? '#F87171' : limit != null && (status?.client_remaining ?? limit - used) <= 1 ? '#FBBF24' : '#34D399';

  const heroTiles = status && (
    <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
      <HeroTile
        label="Plan"
        value={onTrial ? 'Free trial' : status.plan?.name ?? 'No plan'}
        detail={
          active && status.plan
            ? `${fmtINR(status.locked_price_inr ?? status.plan.price_inr)} / ${plural(status.plan.duration_months, 'month')}`
            : frozen ? 'Pick a plan to reactivate' : 'All features unlocked'
        }
      />
      {onTrial ? (
        <HeroTile
          label="Trial"
          value={trialDays > 0 ? `${plural(trialDays, 'day')} left` : 'Ends today'}
          bar={trialPct}
          barColour="#FCD34D"
          detail={status.trial_ends_at ? `Ends ${fmtDate(status.trial_ends_at)}` : undefined}
        />
      ) : active ? (
        <HeroTile
          label={status.renewal_due ? 'Renews soon' : 'Renews'}
          value={status.current_period_end ? fmtShortDate(status.current_period_end) : 'No expiry'}
          bar={periodPct ?? undefined}
          barColour={status.renewal_due ? '#FCD34D' : '#7fb4ff'}
          detail={status.period_days_left != null ? `${plural(status.period_days_left, 'day')} left` : undefined}
        />
      ) : (
        <HeroTile label="Status" value="Inactive" detail="Your data is safe" />
      )}
      <HeroTile
        label="Clients"
        value={limit != null ? `${used} of ${limit}` : `${used}`}
        bar={limit != null && limit > 0 ? used / limit : undefined}
        barColour={seatColour}
        detail={limit == null ? 'Unlimited on this plan' : seatsFull ? 'Limit reached' : `${plural(status.client_remaining ?? Math.max(0, limit - used), 'slot')} free`}
      />
    </div>
  );

  const hero = (
    <PageHero
      icon={<CreditCard size={20} />}
      title="Subscription & billing"
      subtitle={heroSubtitle}
      actions={
        <HeroButton
          variant="glass"
          onClick={refresh}
          disabled={refreshing || loading}
          icon={<RefreshCw size={14} className={refreshing ? 'animate-spin' : undefined} />}
        >
          Refresh status
        </HeroButton>
      }
    >
      {heroTiles}
    </PageHero>
  );

  // ── Page body ───────────────────────────────────────────────────────────────
  const body = (
    <div className="space-y-5 sm:space-y-6">
      {hero}

      {/* ── Needs attention ─────────────────────────────────────────────────── */}
      {frozen && (
        <Reveal>
          <Surface accent="var(--danger-border)" className="p-4 sm:p-5">
            <div className="flex items-start gap-3.5">
              <IconBadge icon={<ShieldAlert size={18} />} colour="var(--danger)" />
              <div className="min-w-0">
                <h2 className="text-[16px] font-[820]" style={{ color: 'var(--text-primary)' }}>
                  {status?.state === 'trial_expired' || status?.state === 'frozen' ? 'Your trial has expired' : 'Your subscription is inactive'}
                </h2>
                <p className="mt-1 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                  {status?.reason || 'Please subscribe to continue using MY PT STUDIO.'}
                </p>
                <p className="mt-2 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
                  Your data is safe — clients, workouts, assessments and files are all preserved. Choose a plan below to reactivate.
                </p>
              </div>
            </div>
          </Surface>
        </Reveal>
      )}

      {onTrial && (
        <Reveal>
          <Surface accent="color-mix(in srgb, var(--warning) 45%, var(--border))" className="p-4 sm:p-5">
            <div className="flex items-start gap-3.5">
              <IconBadge icon={<Clock size={18} />} colour="var(--warning)" />
              <div className="min-w-0">
                <h2 className="text-[15px] font-[800]" style={{ color: 'var(--text-primary)' }}>
                  {trialDays > 0 ? `${plural(trialDays, 'day')} left in your free trial` : 'Your free trial ends today'}
                </h2>
                <p className="mt-0.5 text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
                  Pick a plan to keep every premium feature
                  {status?.trial_ends_at ? ` after ${fmtDate(status.trial_ends_at)}` : ' once your trial ends'}. Nothing you have set up is lost.
                </p>
              </div>
            </div>
          </Surface>
        </Reveal>
      )}

      {/* Roster full. Existing clients keep full access; only adding is blocked. */}
      {active && seatsFull && (
        <Reveal>
          <Surface accent="var(--danger-border)" className="flex items-start gap-3 p-4">
            <Users size={17} className="mt-0.5 shrink-0" style={{ color: 'var(--danger-text)' }} />
            <p className="text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--text-primary)' }}>You&apos;ve reached {limit} active clients.</strong>{' '}
              Archive a client to free a slot, or upgrade below. Existing clients keep full access.
            </p>
          </Surface>
        </Reveal>
      )}

      {/* A downgrade queued for period end. Nothing has changed yet. */}
      {status?.pending_change && (
        <Reveal>
          <Surface accent="color-mix(in srgb, var(--info) 45%, var(--border))" className="p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3.5">
                <IconBadge icon={<CalendarClock size={18} />} colour="var(--info)" />
                <div className="min-w-0">
                  <p className="text-[14px] font-[800]" style={{ color: 'var(--text-primary)' }}>
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
          </Surface>
        </Reveal>
      )}

      {requested && (
        <Reveal>
          <Surface accent="color-mix(in srgb, var(--success) 45%, var(--border))" className="flex items-start gap-3.5 p-4 sm:p-5">
            <IconBadge icon={<CheckCircle2 size={18} />} colour="var(--success)" />
            <div className="min-w-0">
              <p className="text-[14px] font-[800]" style={{ color: 'var(--text-primary)' }}>Request sent</p>
              <p className="mt-0.5 text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
                Your request has reached the MY PT STUDIO team — we&apos;ll confirm your payment and switch on your subscription shortly. No data is lost.
              </p>
            </div>
          </Surface>
        </Reveal>
      )}

      {/* ── Founder's Club ──────────────────────────────────────────────────── */}
      {slots != null && slots > 0 && (
        <Reveal delay={0.04}>
          <div
            className="relative overflow-hidden rounded-[18px] p-4 sm:rounded-[20px] sm:p-5"
            style={{
              background: 'linear-gradient(135deg, color-mix(in srgb, #F59E0B 14%, var(--bg-elevated)), var(--bg-elevated) 70%)',
              border: '1px solid color-mix(in srgb, #F59E0B 38%, var(--border))',
            }}
          >
            <div className="flex items-start gap-3.5">
              <IconBadge icon={<Crown size={18} />} colour="#D97706" />
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-[820]" style={{ color: 'var(--text-primary)' }}>Founder&apos;s Club</p>
                <p className="mt-0.5 text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
                  Subscribe now to lock your price for life. Only{' '}
                  <strong style={{ color: 'var(--warning-text)' }}>{plural(slots, 'spot')}</strong>
                  {founderLimit != null ? ` of ${founderLimit}` : ''} left.
                </p>
                {founderLimit != null && founderLimit > slots && (
                  <div className="mt-2.5 h-1.5 w-full max-w-[320px] overflow-hidden rounded-full" style={{ background: 'var(--bg-subtle)' }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.round(((founderLimit - slots) / founderLimit) * 100)}%`, background: GOLD }} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </Reveal>
      )}

      {/* ── Plans ───────────────────────────────────────────────────────────── */}
      <section aria-labelledby="plans-heading">
        <div className="mb-3 flex items-end justify-between gap-3 px-1">
          <h2 id="plans-heading" className="text-[15px] font-[800] tracking-[-0.01em]" style={{ color: 'var(--text-primary)' }}>
            {frozen ? 'Choose a plan to reactivate' : active ? 'Change plan' : 'Choose your plan'}
          </h2>
          <p className="text-right text-[11.5px]" style={{ color: 'var(--text-muted)' }}>Every plan includes every feature</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {plans.map((p, i) => {
            const isCurrent = status?.plan?.code === p.code && !frozen && !onTrial;
            const isPendingTarget = status?.pending_change?.plan_code === p.code;
            const isElite = p.code === 'elite';
            const ctaBase = 'inline-flex min-h-[42px] w-full items-center justify-center gap-1.5 rounded-[12px] px-4 text-[13px] font-[750] transition hover:opacity-90 disabled:opacity-50';

            let action: React.ReactNode;
            if (isCurrent) {
              action = (
                <div className="flex min-h-[42px] items-center justify-center gap-1.5 rounded-[12px] text-[12.5px] font-[700]"
                  style={{ background: 'var(--success-bg)', color: 'var(--success-text)' }}>
                  <Check size={14} /> Your current plan
                </div>
              );
            } else if (isPendingTarget) {
              action = (
                <div className="flex min-h-[42px] items-center justify-center gap-1.5 rounded-[12px] text-[12.5px] font-[700]"
                  style={{ background: 'var(--info-bg)', color: 'var(--info)' }}>
                  <CalendarClock size={14} /> Starts {fmtShortDate(status?.pending_change?.effective_at)}
                </div>
              );
            } else if (active) {
              // An active studio switching plans gets a priced preview first —
              // proration and the effective date matter here.
              action = (
                <button onClick={() => openQuote(p.code)} disabled={!!quoting || confirming}
                  className={ctaBase}
                  style={isElite
                    ? { background: GOLD, color: '#fff' }
                    : { background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                  {quoting === p.code ? <Loader2 size={14} className="animate-spin" /> : null}
                  Switch to {p.name}
                </button>
              );
            } else if (requested) {
              action = (
                <div className="flex min-h-[42px] items-center justify-center rounded-[12px] text-[12.5px] font-[700]"
                  style={{ background: 'var(--warning-bg)', color: 'var(--warning-text)' }}>
                  Request sent ✓
                </div>
              );
            } else {
              action = (
                <button
                  onClick={() => (checkoutAvailable ? startCheckout(p.code) : requestActivation(p.code))}
                  disabled={!!requesting}
                  className={ctaBase}
                  style={isElite || checkoutAvailable
                    ? { background: isElite ? GOLD : 'var(--brand)', color: '#fff' }
                    : { background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                  {requesting === p.code ? <Loader2 size={14} className="animate-spin" /> : null}
                  {checkoutAvailable ? `Pay ${fmtINR(p.effective_price_inr)}` : `Choose ${p.name}`}
                </button>
              );
            }

            return (
              <PlanCard
                key={p.code}
                plan={p}
                index={i}
                isCurrent={isCurrent}
                isPendingTarget={isPendingTarget}
                isQuoted={quote?.new_plan.code === p.code}
                bestValue={bestValueCode === p.code}
                action={action}
              />
            );
          })}
        </div>
      </section>

      {/* Priced preview of a plan change, shown once a plan is picked. */}
      {quote && (
        <div ref={previewRef} className="scroll-mt-24">
          <ChangePreview
            quote={quote}
            busy={confirming || requesting === quote.new_plan.code}
            checkoutAvailable={checkoutAvailable}
            onConfirm={confirmChange}
            onPay={() => { const code = quote.new_plan.code; setQuote(null); startCheckout(code); }}
            onDismiss={() => setQuote(null)}
          />
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] lg:items-start">
        {/* ── Coupon ────────────────────────────────────────────────────────── */}
        {/* Validating is a preview only — the binding check happens server-side
            under a lock when the operator activates, so a code exhausted in the
            meantime is still caught. Activation itself happens on the plan
            cards above: pick a plan first, then pay or request for it. */}
        {!requested && (
          <Reveal delay={0.1}>
            <Surface className="p-4 sm:p-5">
              <div className="flex items-center gap-2.5">
                <Ticket size={16} style={{ color: 'var(--brand)' }} />
                <h2 className="text-[14px] font-[800]" style={{ color: 'var(--text-primary)' }}>Have a coupon?</h2>
              </div>
              <p className="mt-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                Apply it here, then pick a plan above. It&apos;s applied when your subscription is activated.
              </p>
              <div className="mt-3 flex gap-2">
                <input
                  id="coupon-code"
                  value={couponCode}
                  onChange={(e) => { setCouponCode(e.target.value); setCoupon(null); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') applyCoupon(); }}
                  placeholder="Coupon code"
                  aria-label="Coupon code"
                  // The verdict below was on screen and silent: no association,
                  // no live region. Someone pressed Apply, a sentence appeared,
                  // and a screen reader said nothing — on the control that
                  // decides what they are about to be charged.
                  aria-describedby={coupon ? 'coupon-result' : undefined}
                  aria-invalid={coupon ? !coupon.valid : undefined}
                  className="h-10 min-w-0 flex-1 rounded-[10px] px-3 text-[13px] font-[650] uppercase tracking-wide outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
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
                <p id="coupon-result" role="status" className="mt-2 text-[11.5px]" style={{ color: coupon.valid ? 'var(--success-text)' : 'var(--danger-text)' }}>
                  {coupon.valid
                    ? `${fmtINR(coupon.discount_inr ?? 0)} off${coupon.net_amount_inr != null && coupon.gross_amount_inr > 0 ? ` — ${fmtINR(coupon.net_amount_inr)} due instead of ${fmtINR(coupon.gross_amount_inr)}` : ''}. It will be applied when your subscription is activated.`
                    : coupon.reason}
                </p>
              )}
            </Surface>
          </Reveal>
        )}

        {/* ── Invoices ──────────────────────────────────────────────────────── */}
        <Reveal delay={0.14} className={requested ? 'lg:col-span-2' : undefined}>
          <SectionHeading title="Invoice history" hint={invoices.length ? plural(invoices.length, 'invoice') : undefined} />
          <Surface>
            {invoices.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-6 py-8 text-center">
                <span className="flex h-10 w-10 items-center justify-center rounded-[12px]" style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
                  <Receipt size={17} />
                </span>
                <p className="text-[13px] font-[700]" style={{ color: 'var(--text-primary)' }}>No invoices yet</p>
                <p className="max-w-[300px] text-[12px]" style={{ color: 'var(--text-muted)' }}>
                  An invoice appears here each time a payment activates or renews your plan.
                </p>
              </div>
            ) : (
              <ul>
                {invoices.map((inv, i) => {
                  const refunded = inv.status === 'refunded';
                  const period = inv.period_start && inv.period_end
                    ? `${fmtShortDate(inv.period_start)} – ${fmtDate(inv.period_end)}`
                    : `Issued ${fmtDate(inv.issued_at)}`;
                  return (
                    <li key={inv.id} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--bg-hover)]"
                      style={{ borderTop: i ? '1px solid var(--border)' : 'none' }}>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]" style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
                        <Receipt size={15} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-[700]" style={{ color: 'var(--text-primary)' }}>{inv.invoice_number}</p>
                        <p className="truncate text-[11.5px]" style={{ color: 'var(--text-muted)' }}>{period}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[13px] font-[750] tabular-nums"
                          style={{ color: refunded ? 'var(--text-disabled)' : 'var(--text-primary)', textDecoration: refunded ? 'line-through' : 'none' }}>
                          {fmtINR(inv.amount_inr)}
                        </p>
                        <span className="mt-0.5 inline-block rounded-full px-1.5 py-px text-[9.5px] font-[800] uppercase tracking-wide"
                          style={refunded
                            ? { background: 'var(--bg-subtle)', color: 'var(--text-muted)' }
                            : { background: 'var(--success-bg)', color: 'var(--success-text)' }}>
                          {refunded ? 'Refunded' : inv.status === 'paid' ? 'Paid' : inv.status}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Surface>
        </Reveal>
      </div>

      <p className="flex items-center justify-center gap-1.5 px-4 text-center text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
        <ShieldCheck size={13} className="shrink-0" style={{ color: 'var(--success-text)' }} />
        Your clients, workouts, assessments and files are preserved whatever your plan status.
      </p>
    </div>
  );

  // ── Layout selection ────────────────────────────────────────────────────────
  // The shell is the default, including while loading: a frozen studio is the
  // rare case, and mounting the shell only after the fetch resolves would make
  // every normal visit flash a bare screen before the chrome appeared.
  if (loading && !status) {
    return (
      <AppShell>
        <PageContainer>
          <PageHero icon={<CreditCard size={20} />} title="Subscription & billing" subtitle="Loading your plan…" />
          <div className="flex min-h-[30vh] items-center justify-center">
            <Loader2 size={28} className="animate-spin" style={{ color: 'var(--brand)' }} />
          </div>
        </PageContainer>
      </AppShell>
    );
  }

  if (!frozen) {
    return <AppShell><PageContainer>{body}</PageContainer></AppShell>;
  }

  // Frozen: standalone lockout. No shell, because every nav target answers 402
  // and redirects straight back here — see handleSubscriptionInactive in
  // lib/http.ts. data-theme="dark" scopes the dark tokens to this subtree so
  // the shared body and design-system children resolve against a dark surface
  // rather than the light theme's near-black ink on a near-black background.
  return (
    <div className="min-h-dvh px-4 sm:px-6" data-theme="dark" style={{ background: 'linear-gradient(180deg,#0F172A 0%,#1e293b 100%)' }}>
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
                {/* Not an h1: the hero below is the page's heading. */}
                <p className="truncate text-[14px] font-[820] tracking-tight text-white">{user?.organization_name || 'Your studio'}</p>
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

      <div className="mx-auto max-w-5xl pb-[calc(3rem+env(safe-area-inset-bottom,0px))] pt-5">
        {body}
      </div>
    </div>
  );
}
