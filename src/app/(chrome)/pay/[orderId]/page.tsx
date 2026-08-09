'use client';

/**
 * The payment page — where a member actually pays.
 *
 * Deliberately quiet: one column, generous space, a single obvious action at
 * every step. Someone reaches this screen holding a phone with their bank app
 * open; anything that competes for attention here costs a payment.
 *
 * ── Mobile vs desktop ───────────────────────────────────────────────────────
 * A `upi://` link only resolves on a device with a UPI app installed, which in
 * practice means a phone. On desktop the app buttons would do nothing at all
 * and look broken, so the QR leads and the buttons are hidden. The detection is
 * a media query rather than a user-agent sniff — what matters is whether this
 * is a handheld, and coarse pointer + small viewport answers that without
 * maintaining a UA table.
 *
 * ── Why it polls ────────────────────────────────────────────────────────────
 * After submitting a UTR the member is waiting on a human at the studio. The
 * page polls so approval lands without a refresh, and stops the moment the
 * order reaches a terminal state so an abandoned tab is not a permanent load
 * on the API.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { m, AnimatePresence } from 'framer-motion';
import {
  QrCode, Copy, Check, ArrowRight, Upload, X, Loader2, FileText,
  ShieldCheck, Info, AlertTriangle, ExternalLink, Receipt, RefreshCw, Smartphone,
} from 'lucide-react';
import Guard from '@/components/Guard';
import StudioMark from '@/components/StudioMark';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/http';
import type { UpiOrderDetail } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast';
import { Button, cn } from '@/components/ui';
import {
  AmountBreakdown, STATUS_META, UpiStatusBadge, fmtCountdown, fmtMoneyExact,
} from '@/components/payments/upi-shared';

const MAX_PROOF_BYTES = 5 * 1024 * 1024;
const POLL_MS = 8000;

/** Terminal states — nothing more will happen without the member acting. */
const SETTLED = new Set(['APPROVED', 'CANCELLED', 'EXPIRED']);

export default function PayPage() {
  return <Guard><Inner /></Guard>;
}

function Inner() {
  const { orderId } = useParams<{ orderId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  const [detail, setDetail] = useState<UpiOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async (opts: { silent?: boolean } = {}) => {
    if (!opts.silent) setLoading(true);
    try {
      const res = await api.upiPayments.status(orderId);
      setDetail(res.data);
      setLoadError(null);
    } catch (err) {
      // A silent poll must never replace a working screen with an error — the
      // member could be mid-typing. Only a foreground load surfaces failure.
      if (!opts.silent) {
        setLoadError(err instanceof ApiError ? err.message : 'Could not load this payment.');
      }
    } finally {
      if (!opts.silent) setLoading(false);
    }
  }, [orderId]);

  useEffect(() => { void load(); }, [load]);

  // Poll only while something can still change.
  const status = detail?.order.status;
  useEffect(() => {
    if (!status || SETTLED.has(status)) return;
    const id = setInterval(() => { void load({ silent: true }); }, POLL_MS);
    return () => clearInterval(id);
  }, [status, load]);

  if (loading) return <PaySkeleton />;

  if (loadError || !detail) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <div
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{ background: 'var(--danger-soft)', color: 'var(--danger-text)' }}
        >
          <AlertTriangle size={24} />
        </div>
        <h1 className="mt-4 text-[19px] font-[750]" style={{ color: 'var(--text-primary)' }}>
          Payment not found
        </h1>
        <p className="mt-2 text-[14px]" style={{ color: 'var(--text-muted)' }}>
          {loadError ?? 'This payment link is not available on your account.'}
        </p>
        <Button className="mt-6" onClick={() => router.push('/member/payments')}>
          Back to my payments
        </Button>
      </div>
    );
  }

  return (
    <PayView detail={detail} onRefresh={load} studioName={user?.organization_name ?? 'Studio'}
      studioLogo={user?.organization_logo_url ?? null} toast={toast} />
  );
}

// ════════════════════════════════════════════════════════════════════════════

function PayView({
  detail, onRefresh, studioName, studioLogo, toast,
}: {
  detail: UpiOrderDetail;
  onRefresh: (o?: { silent?: boolean }) => Promise<void>;
  studioName: string;
  studioLogo: string | null;
  toast: ReturnType<typeof useToast>['toast'];
}) {
  const { order, payment, submissions, activation } = detail;
  const meta = STATUS_META[order.status];
  const isHandheld = useIsHandheld();
  const latest = submissions[0] ?? null;

  return (
    <div className="mx-auto w-full max-w-[560px] pb-16 pt-2 sm:pt-6">
      {/* ── Studio identity ── */}
      <div className="flex flex-col items-center text-center">
        <StudioMark name={studioName} logoUrl={studioLogo} size={56} />
        <p className="mt-3 text-[12px] font-[700] uppercase tracking-[0.14em]"
          style={{ color: 'var(--text-muted)' }}>
          {studioName}
        </p>
        <h1 className="mt-1.5 text-[24px] font-[820] tracking-[-0.02em]"
          style={{ color: 'var(--text-primary)' }}>
          {order.plan_name}
        </h1>
        <p className="mt-1 text-[13.5px]" style={{ color: 'var(--text-muted)' }}>
          {order.duration_months} month{order.duration_months === 1 ? '' : 's'} · Order {order.order_no}
        </p>
        <UpiStatusBadge status={order.status} className="mt-3" />
      </div>

      {/* ── What is happening ── */}
      <p className="mt-3 text-center text-[13.5px]" style={{ color: 'var(--text-muted)' }}>
        {meta.hint}
      </p>

      {/* ── Amount ── */}
      <Panel className="mt-6">
        <AmountBreakdown
          baseAmount={order.base_amount}
          gstPercent={order.gst_percent}
          gstAmount={order.gst_amount}
          totalAmount={order.total_amount}
        />
      </Panel>

      {/* ── Approved: the end of the road ── */}
      {activation && (
        <ApprovedPanel
          activation={activation}
          orderId={order.id}
          className="mt-4"
        />
      )}

      {/* ── Pay ── */}
      {payment && (
        <>
          <PayeePanel
            className="mt-4"
            upiId={order.upi_id}
            merchantName={order.merchant_name}
            expiresAt={order.expires_at}
            toast={toast}
          />
          <PayPanel
            className="mt-4"
            payment={payment}
            isHandheld={isHandheld}
            amount={order.total_amount}
            onOpened={() => { void api.upiPayments.markOpened(order.id).catch(() => {}); }}
          />
          <UtrForm
            className="mt-4"
            orderId={order.id}
            previousRejection={latest?.status === 'REJECTED' ? latest : null}
            onSubmitted={async () => { await onRefresh(); }}
            toast={toast}
          />
        </>
      )}

      {/* ── Waiting on the studio ── */}
      {order.status === 'VERIFICATION_PENDING' && latest && (
        <WaitingPanel className="mt-4" utr={latest.utr} submittedAt={latest.submitted_at}
          onRefresh={() => onRefresh()} />
      )}

      {/* ── History of attempts ── */}
      {submissions.length > 0 && (
        <SubmissionHistory className="mt-4" submissions={submissions}
          reasons={detail.reject_reasons} />
      )}
    </div>
  );
}

// ── Layout primitive ────────────────────────────────────────────────────────

function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <m.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className={cn('rounded-2xl p-5', className)}
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

// ── Payee ───────────────────────────────────────────────────────────────────

function PayeePanel({
  upiId, merchantName, expiresAt, toast, className,
}: {
  upiId: string; merchantName: string; expiresAt: string;
  toast: ReturnType<typeof useToast>['toast']; className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState(() => fmtCountdown(expiresAt));

  // Ticks once a minute — the label only ever changes at minute granularity, so
  // a per-second timer would repaint 59 times for nothing.
  useEffect(() => {
    const id = setInterval(() => setCountdown(fmtCountdown(expiresAt)), 30_000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(upiId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error('Could not copy. Long-press the UPI ID to select it.');
    }
  };

  return (
    <Panel className={className}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11.5px] font-[700] uppercase tracking-[0.12em]"
            style={{ color: 'var(--text-muted)' }}>Paying to</p>
          <p className="mt-1 truncate text-[15px] font-[720]" style={{ color: 'var(--text-primary)' }}>
            {merchantName}
          </p>
          <button
            type="button"
            onClick={copy}
            className="mt-1 inline-flex items-center gap-1.5 rounded-lg px-1.5 py-0.5 font-mono text-[13px] transition-colors"
            style={{ color: 'var(--brand)', background: 'var(--brand-soft)' }}
          >
            {upiId}
            {copied ? <Check size={13} /> : <Copy size={13} />}
          </button>
        </div>
        <span className="shrink-0 rounded-full px-2 py-1 text-[11.5px] font-[650]"
          style={{
            background: countdown.expired ? 'var(--danger-soft)' : 'var(--bg-subtle)',
            color: countdown.expired ? 'var(--danger-text)' : 'var(--text-muted)',
          }}>
          {countdown.expired ? 'Expired' : countdown.label}
        </span>
      </div>
    </Panel>
  );
}

// ── QR + app buttons ────────────────────────────────────────────────────────

function PayPanel({
  payment, isHandheld, amount, onOpened, className,
}: {
  payment: NonNullable<UpiOrderDetail['payment']>;
  isHandheld: boolean;
  amount: string;
  onOpened: () => void;
  className?: string;
}) {
  return (
    <Panel className={className}>
      <div className="flex items-center gap-2">
        <QrCode size={16} style={{ color: 'var(--brand)' }} />
        <h2 className="text-[14px] font-[720]" style={{ color: 'var(--text-primary)' }}>
          Pay with any UPI app
        </h2>
      </div>

      {/* The QR leads on desktop and is available on mobile too — a member may
          be paying from a second phone. */}
      <div className="mt-4 flex flex-col items-center">
        <div className="rounded-2xl bg-white p-3"
          style={{ boxShadow: '0 8px 28px -12px rgba(15,23,42,0.28)' }}>
          {/* Data URI produced server-side from the stored VPA and amount, so
              what the camera reads cannot have been altered in the browser. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={payment.qr_data_url}
            alt="UPI payment QR code"
            width={216}
            height={216}
            className="block h-[216px] w-[216px]"
          />
        </div>
        <p className="mt-3 text-[13px] font-[620]" style={{ color: 'var(--text-primary)' }}>
          Scan to pay {fmtMoneyExact(amount)}
        </p>
      </div>

      {isHandheld ? (
        <>
          <Divider label="or open an app" />
          <div className="grid grid-cols-2 gap-2">
            {payment.app_intents.map((app) => (
              <a
                key={app.key}
                href={app.url}
                onClick={onOpened}
                className="flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-[13.5px] font-[650] transition-transform active:scale-[0.97]"
                style={{
                  background: 'var(--bg-subtle)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                }}
              >
                {app.label}
              </a>
            ))}
            {/* The universal intent. Listed last but it is the reliable one:
                per-app schemes are undocumented and change without notice, so
                a member must always have a route that cannot break. */}
            <a
              href={payment.intent_url}
              onClick={onOpened}
              className="col-span-2 flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-[13.5px] font-[700] text-white transition-transform active:scale-[0.97]"
              style={{ background: 'var(--brand)' }}
            >
              <Smartphone size={15} /> Other UPI apps
            </a>
          </div>
          <p className="mt-3 text-center text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
            If an app does not open, use &ldquo;Other UPI apps&rdquo; or scan the QR.
          </p>
        </>
      ) : (
        <p className="mt-4 flex items-start gap-2 rounded-xl p-3 text-[12.5px]"
          style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
          <Info size={15} className="mt-px shrink-0" />
          Open your UPI app on your phone and scan this code. App buttons are only
          shown on a phone, where they can actually launch.
        </p>
      )}
    </Panel>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="my-4 flex items-center gap-3">
      <span className="h-px flex-1" style={{ background: 'var(--border)' }} />
      <span className="text-[11px] font-[650] uppercase tracking-[0.1em]"
        style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className="h-px flex-1" style={{ background: 'var(--border)' }} />
    </div>
  );
}

// ── UTR form ────────────────────────────────────────────────────────────────

function UtrForm({
  orderId, previousRejection, onSubmitted, toast, className,
}: {
  orderId: string;
  previousRejection: UpiOrderDetail['submissions'][number] | null;
  onSubmitted: () => Promise<void>;
  toast: ReturnType<typeof useToast>['toast'];
  className?: string;
}) {
  const [utr, setUtr] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Mirrors the server's rule exactly. Validating here is a courtesy — the
  // schema, the DTO and a CHECK constraint all enforce it independently.
  const utrValid = /^[0-9]{12,16}$/.test(utr);
  const showUtrError = utr.length > 0 && !utrValid;

  const pickFile = (f: File | null) => {
    setError(null);
    if (!f) { setFile(null); return; }
    if (f.size > MAX_PROOF_BYTES) {
      setError('Screenshot must be 5 MB or smaller.');
      return;
    }
    if (!/^image\/(png|jpe?g)$|^application\/pdf$/i.test(f.type)) {
      setError('Upload a JPG, PNG or PDF.');
      return;
    }
    setFile(f);
  };

  const submit = async () => {
    if (!utrValid || busy) return;
    setBusy(true);
    setError(null);
    try {
      // Upload first so the reference and its proof land together. A failed
      // upload must not block the payment being recorded, though — the proof
      // is optional, and a member who has genuinely paid should not be stuck
      // behind a flaky image upload.
      let screenshot: { url: string; mime: string } | null = null;
      if (file) {
        try {
          const up = await api.upiPayments.uploadProof(orderId, file);
          screenshot = { url: up.data.screenshot_url, mime: up.data.mime };
        } catch {
          toast.error('Screenshot could not be uploaded — submitting the reference without it.');
        }
      }

      await api.upiPayments.submitUtr(orderId, {
        utr,
        screenshot_url: screenshot?.url ?? null,
        screenshot_mime: screenshot?.mime ?? null,
        notes: notes.trim() || null,
      });

      toast.success('Reference submitted. The studio will verify it shortly.');
      setUtr(''); setNotes(''); setFile(null);
      await onSubmitted();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Could not submit. Please try again.';
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel className={className}>
      {previousRejection && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl p-3"
          style={{ background: 'var(--danger-soft)' }}>
          <AlertTriangle size={16} className="mt-px shrink-0" style={{ color: 'var(--danger-text)' }} />
          <div className="min-w-0">
            <p className="text-[13px] font-[700]" style={{ color: 'var(--danger-text)' }}>
              Your last reference was not accepted
            </p>
            <p className="mt-0.5 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
              {previousRejection.rejected_note
                || 'Check the reference number on your UPI app and submit it again.'}
            </p>
          </div>
        </div>
      )}

      <h2 className="text-[14px] font-[720]" style={{ color: 'var(--text-primary)' }}>
        Already paid? Enter your reference
      </h2>
      <p className="mt-1 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
        Open your UPI app, find this transaction, and copy the UPI reference / UTR number.
      </p>

      <label htmlFor="utr" className="mt-4 block text-[12px] font-[650]"
        style={{ color: 'var(--text-primary)' }}>
        UPI reference number (UTR)
      </label>
      <input
        id="utr"
        // `inputMode` rather than type="number": a UTR is a digit STRING, and a
        // number input strips leading zeros and adds a spinner nobody wants.
        inputMode="numeric"
        autoComplete="off"
        value={utr}
        onChange={(e) => setUtr(e.target.value.replace(/\D/g, '').slice(0, 16))}
        placeholder="12 to 16 digits"
        aria-invalid={showUtrError}
        aria-describedby={showUtrError ? 'utr-error' : undefined}
        className="mt-1.5 w-full rounded-xl px-3.5 font-mono text-[16px] tracking-[0.02em] outline-none transition-shadow"
        style={{
          height: 52,
          background: 'var(--bg-base)',
          color: 'var(--text-primary)',
          border: `1px solid ${showUtrError ? 'var(--danger)' : 'var(--border-2)'}`,
        }}
      />
      <div className="mt-1.5 flex items-center justify-between">
        <span id="utr-error" className="text-[11.5px]"
          style={{ color: showUtrError ? 'var(--danger-text)' : 'var(--text-muted)' }}>
          {showUtrError ? 'Must be 12 to 16 digits.' : 'Numbers only.'}
        </span>
        <span className="text-[11.5px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
          {utr.length}/16
        </span>
      </div>

      {/* ── Optional proof ── */}
      <label className="mt-4 block text-[12px] font-[650]" style={{ color: 'var(--text-primary)' }}>
        Payment screenshot <span style={{ color: 'var(--text-muted)' }}>(optional)</span>
      </label>
      <input
        ref={fileInput}
        type="file"
        accept="image/png,image/jpeg,application/pdf"
        className="sr-only"
        onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
      />
      <AnimatePresence mode="wait">
        {file ? (
          <m.div
            key="picked"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="mt-1.5 flex items-center gap-2.5 rounded-xl p-3"
            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}
          >
            <FileText size={16} style={{ color: 'var(--brand)' }} />
            <span className="min-w-0 flex-1 truncate text-[13px]" style={{ color: 'var(--text-primary)' }}>
              {file.name}
            </span>
            <button type="button" aria-label="Remove screenshot"
              onClick={() => { setFile(null); if (fileInput.current) fileInput.current.value = ''; }}
              style={{ color: 'var(--text-muted)' }}>
              <X size={16} />
            </button>
          </m.div>
        ) : (
          <m.button
            key="empty"
            type="button"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => fileInput.current?.click()}
            className="mt-1.5 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-[13px] font-[600]"
            style={{
              border: '1px dashed var(--border-3)',
              color: 'var(--text-muted)',
              background: 'transparent',
            }}
          >
            <Upload size={15} /> Add a screenshot — JPG, PNG or PDF, up to 5 MB
          </m.button>
        )}
      </AnimatePresence>

      <label htmlFor="pay-notes" className="mt-4 block text-[12px] font-[650]"
        style={{ color: 'var(--text-primary)' }}>
        Note for the studio <span style={{ color: 'var(--text-muted)' }}>(optional)</span>
      </label>
      <textarea
        id="pay-notes"
        rows={2}
        value={notes}
        maxLength={500}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Anything the studio should know"
        className="mt-1.5 w-full resize-none rounded-xl px-3.5 py-2.5 text-[14px] outline-none"
        style={{
          background: 'var(--bg-base)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-2)',
        }}
      />

      {error && (
        <p className="mt-3 flex items-start gap-2 text-[12.5px]" style={{ color: 'var(--danger-text)' }}>
          <AlertTriangle size={14} className="mt-px shrink-0" /> {error}
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={!utrValid || busy}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl text-[15px] font-[700] text-white transition-all disabled:cursor-not-allowed disabled:opacity-45"
        style={{ height: 52, background: 'var(--brand)' }}
      >
        {busy ? <><Loader2 size={17} className="animate-spin" /> Submitting…</>
              : <>Submit for verification <ArrowRight size={16} /></>}
      </button>

      <p className="mt-3 flex items-start gap-2 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
        <ShieldCheck size={13} className="mt-px shrink-0" />
        Your membership activates as soon as the studio confirms the payment in its bank account.
      </p>
    </Panel>
  );
}

// ── Waiting ─────────────────────────────────────────────────────────────────

function WaitingPanel({
  utr, submittedAt, onRefresh, className,
}: { utr: string; submittedAt: string; onRefresh: () => void; className?: string }) {
  return (
    <Panel className={className}>
      <div className="flex items-start gap-3">
        <m.span
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{ background: 'color-mix(in srgb, var(--warning) 14%, transparent)', color: 'var(--warning-text)' }}
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ShieldCheck size={17} />
        </m.span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[14px] font-[720]" style={{ color: 'var(--text-primary)' }}>
            With the studio for verification
          </h2>
          <p className="mt-1 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
            Reference <span className="font-mono">{utr}</span>, submitted{' '}
            {new Date(submittedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}.
            This page updates on its own once it is checked.
          </p>
          <button type="button" onClick={onRefresh}
            className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-[650]"
            style={{ color: 'var(--brand)' }}>
            <RefreshCw size={13} /> Check now
          </button>
        </div>
      </div>
    </Panel>
  );
}

// ── Approved ────────────────────────────────────────────────────────────────

function ApprovedPanel({
  activation, orderId, className,
}: {
  activation: NonNullable<UpiOrderDetail['activation']>;
  orderId: string;
  className?: string;
}) {
  return (
    <Panel className={className}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{ background: 'var(--success-soft)', color: 'var(--success-text)' }}>
          <Check size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[14px] font-[720]" style={{ color: 'var(--text-primary)' }}>
            Membership active
          </h2>
          <p className="mt-1 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
            Valid {new Date(activation.activated_from).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
            {' – '}
            {new Date(activation.activated_to).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
            {' · '}Receipt {activation.receipt_no}
          </p>
          <a
            href={api.upiPayments.receiptUrl(orderId)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-[650]"
            style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}
          >
            <Receipt size={14} /> View receipt <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </Panel>
  );
}

// ── Attempt history ─────────────────────────────────────────────────────────

function SubmissionHistory({
  submissions, reasons, className,
}: {
  submissions: UpiOrderDetail['submissions'];
  reasons: UpiOrderDetail['reject_reasons'];
  className?: string;
}) {
  return (
    <Panel className={className}>
      <h2 className="text-[14px] font-[720]" style={{ color: 'var(--text-primary)' }}>
        Your submissions
      </h2>
      <ul className="mt-3 space-y-3">
        {submissions.map((s) => (
          <li key={s.id} className="flex items-start gap-3">
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
              style={{
                background: s.status === 'APPROVED' ? 'var(--success)'
                  : s.status === 'REJECTED' ? 'var(--danger)'
                  : 'var(--warning)',
              }} />
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[13px]" style={{ color: 'var(--text-primary)' }}>{s.utr}</p>
              <p className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
                {new Date(s.submitted_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
              {s.status === 'REJECTED' && s.rejected_reason && (
                <p className="mt-1 text-[12px]" style={{ color: 'var(--danger-text)' }}>
                  {reasons[s.rejected_reason]}{s.rejected_note ? ` — ${s.rejected_note}` : ''}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

// ── Handheld detection ──────────────────────────────────────────────────────

/**
 * True on a device where a `upi://` link can actually resolve.
 *
 * A media query rather than a user-agent test: what matters is a small screen
 * with a coarse pointer, which is exactly the device class that has UPI apps
 * installed. UA sniffing would need a table that goes stale.
 */
function useIsHandheld(): boolean {
  const [handheld, setHandheld] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 820px) and (pointer: coarse)');
    const apply = () => setHandheld(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);
  return handheld;
}

// ── Skeleton ────────────────────────────────────────────────────────────────

function PaySkeleton() {
  return (
    <div className="mx-auto w-full max-w-[560px] animate-pulse px-4 pt-6">
      <div className="flex flex-col items-center">
        <div className="h-14 w-14 rounded-2xl" style={{ background: 'var(--bg-subtle)' }} />
        <div className="mt-3 h-3 w-28 rounded" style={{ background: 'var(--bg-subtle)' }} />
        <div className="mt-2 h-6 w-48 rounded" style={{ background: 'var(--bg-subtle)' }} />
      </div>
      {[140, 96, 380].map((h, i) => (
        <div key={i} className="mt-4 rounded-2xl" style={{ height: h, background: 'var(--bg-subtle)' }} />
      ))}
    </div>
  );
}
