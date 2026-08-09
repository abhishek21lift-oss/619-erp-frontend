'use client';

/**
 * Subscription checkout — the studio admin paying MY PT STUDIO.
 *
 * Deliberately built to feel like a payment gateway rather than a page inside
 * the app: no sidebar, no topbar, no navigation at all. Once someone commits to
 * paying, every other route on screen is a way to abandon. It opens in its own
 * window from the billing page for the same reason.
 *
 * ── The amount is not a field ───────────────────────────────────────────────
 * It is rendered from the stored request and it is not editable — not disabled,
 * not read-only, simply not an input. The server computed it from the plan,
 * founder pricing and any coupon, and approval charges that same stored figure.
 * Nothing typed in this window can change what is owed.
 *
 * ── Why it polls ────────────────────────────────────────────────────────────
 * After submitting the UTR the studio is waiting on a human in the command
 * centre. Polling means approval lands without a refresh, and it stops at a
 * terminal state so an abandoned tab isn't a permanent load on the API.
 */

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { m, AnimatePresence } from 'framer-motion';
import {
  Copy, Check, ArrowRight, Loader2, ShieldCheck, Info, AlertTriangle,
  Lock, RefreshCw, Smartphone, X, PartyPopper,
} from 'lucide-react';
import Guard from '@/components/Guard';
import BrandLogo from '@/components/BrandLogo';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/http';
import type { SubCheckoutRequest, UpiPaymentView } from '@/lib/api';
import { useToast } from '@/lib/toast';

const POLL_MS = 6000;

/** Nothing more happens on its own once a request reaches one of these. */
const SETTLED = new Set(['APPROVED', 'CANCELLED', 'EXPIRED']);

type Detail = {
  request: SubCheckoutRequest & { plan_name: string | null; duration_months: number | null };
  payment: UpiPaymentView | null;
};

/** ₹ with Indian grouping. Whole rupees — this whole flow is integer paise-free. */
function inr(n: number): string {
  return '₹' + Number(n || 0).toLocaleString('en-IN');
}

export default function CheckoutPage() {
  return <Guard role="admin"><Inner /></Guard>;
}

function Inner() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async (opts: { silent?: boolean } = {}) => {
    if (!opts.silent) setLoading(true);
    try {
      const res = await api.subscription.checkout.get(id);
      setDetail(res.data);
      setLoadError(null);
    } catch (err) {
      // A silent poll must never wipe a working screen — the admin may be
      // mid-typing. Only a foreground load surfaces failure.
      if (!opts.silent) {
        setLoadError(err instanceof ApiError ? err.message : 'Could not load this payment.');
      }
    } finally {
      if (!opts.silent) setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  const status = detail?.request.status;
  useEffect(() => {
    if (!status || SETTLED.has(status)) return;
    const t = setInterval(() => { void load({ silent: true }); }, POLL_MS);
    return () => clearInterval(t);
  }, [status, load]);

  return (
    <div className="min-h-[100dvh] w-full" style={{ background: 'var(--bg-canvas)' }}>
      <div className="mx-auto w-full max-w-[520px] px-4 pb-16 pt-6">
        {/* ── Gateway chrome: brand + a lock, nothing clickable away ── */}
        <div className="flex flex-col items-center text-center">
          <BrandLogo size={46} />
          <p className="mt-3 inline-flex items-center gap-1.5 text-[11.5px] font-[700] uppercase tracking-[0.14em]"
            style={{ color: 'var(--text-muted)' }}>
            <Lock size={11} /> Secure payment
          </p>
        </div>

        {loading ? <Skeleton />
          : loadError || !detail ? <LoadFailed message={loadError} onBack={() => router.push('/subscription')} />
          : <CheckoutBody detail={detail} onRefresh={load} toast={toast} router={router} />}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════

function CheckoutBody({
  detail, onRefresh, toast, router,
}: {
  detail: Detail;
  onRefresh: (o?: { silent?: boolean }) => Promise<void>;
  toast: ReturnType<typeof useToast>['toast'];
  router: ReturnType<typeof useRouter>;
}) {
  const { request, payment } = detail;

  if (request.status === 'APPROVED') return <Approved request={request} router={router} />;
  if (request.status === 'AWAITING_VERIFICATION') {
    return <AwaitingVerification request={request} onRefresh={() => onRefresh()} router={router} />;
  }
  if (request.status === 'CANCELLED' || request.status === 'EXPIRED') {
    return <Closed request={request} router={router} />;
  }

  return (
    <>
      <OrderSummary request={request} />
      {payment && <PayBlock request={request} payment={payment} />}
      <UtrBlock request={request} onDone={onRefresh} toast={toast} router={router} />
    </>
  );
}

// ── Panels ──────────────────────────────────────────────────────────────────

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <m.section
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
      className={`rounded-2xl p-5 ${className}`}
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
      }}
    >
      {children}
    </m.section>
  );
}

function OrderSummary({ request }: { request: Detail['request'] }) {
  return (
    <Panel className="mt-6">
      <p className="text-[11.5px] font-[700] uppercase tracking-[0.12em]"
        style={{ color: 'var(--text-muted)' }}>You are paying for</p>
      <h1 className="mt-1.5 text-[22px] font-[820] tracking-[-0.02em]"
        style={{ color: 'var(--text-primary)' }}>
        {request.plan_name || request.plan_code}
      </h1>
      <p className="mt-0.5 text-[13px]" style={{ color: 'var(--text-muted)' }}>
        {request.duration_months ? `${request.duration_months} month${request.duration_months === 1 ? '' : 's'} · ` : ''}
        Ref {request.request_no}
      </p>

      <div className="mt-4 space-y-2">
        <Row label="Plan price" value={inr(request.list_price_inr)} />
        {request.discount_inr > 0 && (
          <Row
            label={`Discount${request.coupon_code ? ` (${request.coupon_code})` : ''}`}
            value={`− ${inr(request.discount_inr)}`}
            tone="success"
          />
        )}
        <div className="flex items-baseline justify-between border-t pt-3"
          style={{ borderColor: 'var(--border)' }}>
          <span className="text-[13px] font-[700]" style={{ color: 'var(--text-primary)' }}>
            Amount to pay
          </span>
          {/* Rendered, never an input. See the file header. */}
          <span className="text-[26px] font-[850] tabular-nums" style={{ color: 'var(--text-primary)' }}>
            {inr(request.amount_inr)}
          </span>
        </div>
      </div>

      <p className="mt-3 flex items-start gap-1.5 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
        <Lock size={12} className="mt-px shrink-0" />
        This amount is fixed by your plan and cannot be edited.
      </p>
    </Panel>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: 'success' }) {
  return (
    <div className="flex items-baseline justify-between text-[13.5px]">
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className="tabular-nums font-[600]"
        style={{ color: tone === 'success' ? 'var(--success-text)' : 'var(--text-primary)' }}>
        {value}
      </span>
    </div>
  );
}

// ── Pay ─────────────────────────────────────────────────────────────────────

function PayBlock({ request, payment }: { request: Detail['request']; payment: UpiPaymentView }) {
  const [copied, setCopied] = useState(false);
  const handheld = useIsHandheld();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(request.upi_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* long-press to select is the fallback */ }
  };

  return (
    <Panel className="mt-4">
      <h2 className="text-[14px] font-[720]" style={{ color: 'var(--text-primary)' }}>
        Scan &amp; pay with any UPI app
      </h2>
      <p className="mt-1 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
        The amount is already filled in — you only confirm it in your app.
      </p>

      <div className="mt-4 flex flex-col items-center">
        <div className="rounded-2xl bg-white p-3"
          style={{ boxShadow: '0 10px 30px -14px rgba(15,23,42,0.3)' }}>
          {/* Server-rendered data URI: the VPA and amount inside this code come
              from the database, not from anything the browser could alter. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={payment.qr_data_url} alt="UPI payment QR code"
            width={220} height={220} className="block h-[220px] w-[220px]" />
        </div>
        <p className="mt-3 text-[13.5px] font-[700]" style={{ color: 'var(--text-primary)' }}>
          Pay {inr(request.amount_inr)}
        </p>
        <button type="button" onClick={copy}
          className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-mono text-[12.5px]"
          style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>
          {request.upi_id} {copied ? <Check size={12} /> : <Copy size={12} />}
        </button>
        <p className="mt-1 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
          {request.merchant_name}
        </p>
      </div>

      {handheld && (
        <>
          <div className="my-4 flex items-center gap-3">
            <span className="h-px flex-1" style={{ background: 'var(--border)' }} />
            <span className="text-[11px] font-[650] uppercase tracking-[0.1em]"
              style={{ color: 'var(--text-muted)' }}>or open an app</span>
            <span className="h-px flex-1" style={{ background: 'var(--border)' }} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {payment.app_intents.map((a) => (
              <a key={a.key} href={a.url}
                className="flex items-center justify-center rounded-xl px-3 py-3 text-[13.5px] font-[650] transition-transform active:scale-[0.97]"
                style={{
                  background: 'var(--bg-subtle)', color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                }}>
                {a.label}
              </a>
            ))}
            {/* The universal intent. Listed last, but it is the reliable one —
                per-app schemes are undocumented and change without notice. */}
            <a href={payment.intent_url}
              className="col-span-2 flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-[13.5px] font-[700] text-white transition-transform active:scale-[0.97]"
              style={{ background: 'var(--brand)' }}>
              <Smartphone size={15} /> Other UPI apps
            </a>
          </div>
        </>
      )}

      {!handheld && (
        <p className="mt-4 flex items-start gap-2 rounded-xl p-3 text-[12.5px]"
          style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
          <Info size={15} className="mt-px shrink-0" />
          Open a UPI app on your phone and scan this code. App buttons appear only on
          a phone, where they can actually launch.
        </p>
      )}
    </Panel>
  );
}

// ── UTR ─────────────────────────────────────────────────────────────────────

function UtrBlock({
  request, onDone, toast, router,
}: {
  request: Detail['request'];
  onDone: () => Promise<void>;
  toast: ReturnType<typeof useToast>['toast'];
  router: ReturnType<typeof useRouter>;
}) {
  const [utr, setUtr] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Same rule the server enforces. Validating here is a courtesy; the DTO and a
  // CHECK constraint enforce it independently.
  const valid = /^[0-9]{12,16}$/.test(utr);
  const showErr = utr.length > 0 && !valid;

  const submit = async () => {
    if (!valid || busy) return;
    setBusy(true); setError(null);
    try {
      await api.subscription.checkout.submitUtr(request.id, utr, note.trim() || null);
      toast.success('Submitted. MY PT STUDIO will verify and activate your plan.');
      await onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not submit. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    try {
      await api.subscription.checkout.cancel(request.id);
      router.push('/subscription');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not cancel.');
    }
  };

  return (
    <Panel className="mt-4">
      {request.rejected_note && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl p-3" style={{ background: 'var(--danger-soft)' }}>
          <AlertTriangle size={16} className="mt-px shrink-0" style={{ color: 'var(--danger-text)' }} />
          <div>
            <p className="text-[13px] font-[700]" style={{ color: 'var(--danger-text)' }}>
              Your last reference was not accepted
            </p>
            <p className="mt-0.5 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
              {request.rejected_note}
            </p>
          </div>
        </div>
      )}

      <h2 className="text-[14px] font-[720]" style={{ color: 'var(--text-primary)' }}>
        Payment done? Enter the UTR
      </h2>
      <p className="mt-1 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
        Open your UPI app, find this transaction and copy the UPI reference / UTR number.
      </p>

      <label htmlFor="utr" className="mt-4 block text-[12px] font-[650]"
        style={{ color: 'var(--text-primary)' }}>UPI reference number (UTR)</label>
      <input
        id="utr"
        // inputMode, not type="number": a UTR is a digit STRING — a number input
        // strips leading zeros and adds a spinner nobody wants.
        inputMode="numeric"
        autoComplete="off"
        value={utr}
        onChange={(e) => setUtr(e.target.value.replace(/\D/g, '').slice(0, 16))}
        placeholder="12 to 16 digits"
        aria-invalid={showErr}
        className="mt-1.5 w-full rounded-xl px-3.5 font-mono text-[16px] outline-none"
        style={{
          height: 52, background: 'var(--bg-base)', color: 'var(--text-primary)',
          border: `1px solid ${showErr ? 'var(--danger)' : 'var(--border-2)'}`,
        }}
      />
      <div className="mt-1.5 flex items-center justify-between text-[11.5px]">
        <span style={{ color: showErr ? 'var(--danger-text)' : 'var(--text-muted)' }}>
          {showErr ? 'Must be 12 to 16 digits.' : 'Numbers only.'}
        </span>
        <span className="tabular-nums" style={{ color: 'var(--text-muted)' }}>{utr.length}/16</span>
      </div>

      <label htmlFor="note" className="mt-4 block text-[12px] font-[650]"
        style={{ color: 'var(--text-primary)' }}>
        Note <span style={{ color: 'var(--text-muted)' }}>(optional)</span>
      </label>
      <textarea id="note" rows={2} maxLength={500} value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Anything we should know"
        className="mt-1.5 w-full resize-none rounded-xl px-3.5 py-2.5 text-[14px] outline-none"
        style={{
          background: 'var(--bg-base)', color: 'var(--text-primary)',
          border: '1px solid var(--border-2)',
        }} />

      {error && (
        <p className="mt-3 flex items-start gap-2 text-[12.5px]" style={{ color: 'var(--danger-text)' }}>
          <AlertTriangle size={14} className="mt-px shrink-0" /> {error}
        </p>
      )}

      <button type="button" onClick={submit} disabled={!valid || busy}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl text-[15px] font-[720] text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-45"
        style={{ height: 52, background: 'var(--brand)' }}>
        {busy ? <><Loader2 size={17} className="animate-spin" /> Submitting…</>
              : <>Submit for verification <ArrowRight size={16} /></>}
      </button>

      <div className="mt-3 flex items-center justify-between">
        <p className="flex items-start gap-1.5 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
          <ShieldCheck size={12} className="mt-px shrink-0" />
          Activated as soon as we confirm the transfer.
        </p>
        <button type="button" onClick={cancel}
          className="text-[11.5px] font-[600] underline" style={{ color: 'var(--text-muted)' }}>
          Cancel
        </button>
      </div>
    </Panel>
  );
}

// ── Terminal states ─────────────────────────────────────────────────────────

function AwaitingVerification({
  request, onRefresh, router,
}: { request: Detail['request']; onRefresh: () => void; router: ReturnType<typeof useRouter> }) {
  return (
    <Panel className="mt-6">
      <div className="flex flex-col items-center text-center">
        <m.span className="flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{ background: 'color-mix(in srgb, var(--warning) 14%, transparent)', color: 'var(--warning-text)' }}
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}>
          <ShieldCheck size={24} />
        </m.span>
        <h1 className="mt-4 text-[19px] font-[780]" style={{ color: 'var(--text-primary)' }}>
          We&rsquo;re verifying your payment
        </h1>
        <p className="mt-2 text-[13.5px]" style={{ color: 'var(--text-muted)' }}>
          {inr(request.amount_inr)} · UTR <span className="font-mono">{request.utr}</span>
          <br />
          Your plan activates as soon as the transfer is confirmed. This page updates on its own.
        </p>
        <div className="mt-5 flex gap-2">
          <button type="button" onClick={onRefresh}
            className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-[13px] font-[650]"
            style={{ background: 'var(--bg-subtle)', color: 'var(--text-primary)' }}>
            <RefreshCw size={14} /> Check now
          </button>
          <button type="button" onClick={() => router.push('/subscription')}
            className="rounded-xl px-4 py-2.5 text-[13px] font-[650]"
            style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>
            Back to billing
          </button>
        </div>
      </div>
    </Panel>
  );
}

function Approved({ request, router }: { request: Detail['request']; router: ReturnType<typeof useRouter> }) {
  return (
    <Panel className="mt-6">
      <div className="flex flex-col items-center text-center">
        <m.span className="flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{ background: 'var(--success-soft)', color: 'var(--success-text)' }}
          initial={{ scale: 0.85 }} animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 320, damping: 18 }}>
          <PartyPopper size={24} />
        </m.span>
        <h1 className="mt-4 text-[20px] font-[800]" style={{ color: 'var(--text-primary)' }}>
          Payment confirmed
        </h1>
        <p className="mt-2 text-[13.5px]" style={{ color: 'var(--text-muted)' }}>
          Your {request.plan_name || request.plan_code} plan is active. Ref {request.request_no}.
        </p>
        <button type="button" onClick={() => router.push('/subscription')}
          className="mt-5 rounded-xl px-5 py-3 text-[14px] font-[720] text-white"
          style={{ background: 'var(--brand)' }}>
          Go to billing
        </button>
      </div>
    </Panel>
  );
}

function Closed({ request, router }: { request: Detail['request']; router: ReturnType<typeof useRouter> }) {
  const expired = request.status === 'EXPIRED';
  return (
    <Panel className="mt-6">
      <div className="flex flex-col items-center text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
          <X size={24} />
        </span>
        <h1 className="mt-4 text-[19px] font-[780]" style={{ color: 'var(--text-primary)' }}>
          {expired ? 'This payment link expired' : 'Payment cancelled'}
        </h1>
        <p className="mt-2 text-[13.5px]" style={{ color: 'var(--text-muted)' }}>
          Nothing was charged. Start again from the billing page whenever you&rsquo;re ready.
        </p>
        <button type="button" onClick={() => router.push('/subscription')}
          className="mt-5 rounded-xl px-5 py-3 text-[14px] font-[720] text-white"
          style={{ background: 'var(--brand)' }}>
          Back to billing
        </button>
      </div>
    </Panel>
  );
}

function LoadFailed({ message, onBack }: { message: string | null; onBack: () => void }) {
  return (
    <Panel className="mt-6">
      <div className="flex flex-col items-center text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{ background: 'var(--danger-soft)', color: 'var(--danger-text)' }}>
          <AlertTriangle size={24} />
        </span>
        <h1 className="mt-4 text-[19px] font-[780]" style={{ color: 'var(--text-primary)' }}>
          Payment not found
        </h1>
        <p className="mt-2 text-[13.5px]" style={{ color: 'var(--text-muted)' }}>
          {message ?? 'This payment link is not available on your account.'}
        </p>
        <button type="button" onClick={onBack}
          className="mt-5 rounded-xl px-5 py-3 text-[14px] font-[720] text-white"
          style={{ background: 'var(--brand)' }}>
          Back to billing
        </button>
      </div>
    </Panel>
  );
}

function Skeleton() {
  return (
    <div className="mt-6 animate-pulse space-y-4">
      {[150, 380, 300].map((h, i) => (
        <div key={i} className="rounded-2xl" style={{ height: h, background: 'var(--bg-subtle)' }} />
      ))}
    </div>
  );
}

// ── Handheld detection ──────────────────────────────────────────────────────

/**
 * True where a `upi://` link can actually resolve. A media query, not a
 * user-agent test: small screen + coarse pointer is exactly the device class
 * that has UPI apps installed, and it never goes stale.
 */
function useIsHandheld(): boolean {
  const [h, setH] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 820px) and (pointer: coarse)');
    const apply = () => setH(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);
  return h;
}
