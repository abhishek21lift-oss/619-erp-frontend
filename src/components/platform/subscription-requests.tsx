'use client';

/**
 * Subscription payment verification — the operator's queue.
 *
 * A studio has paid MY PT STUDIO over UPI and submitted the bank reference.
 * This is where that reference is matched against the platform bank account and
 * turned into an active subscription.
 *
 * The screen is built for one physical posture: bank statement on one side,
 * this on the other. So the UTR is monospaced and select-all (it gets pasted
 * into a bank portal), the amount is large, and the studio's current
 * subscription state sits right beside the claim — an operator needs to know
 * whether they are activating a trial, renewing, or being paid twice.
 *
 * ── Approve is irreversible ─────────────────────────────────────────────────
 * Approving activates the subscription, records the payment, issues an invoice
 * and may grant a founder slot. There is no undo, so it takes a deliberate
 * confirm that restates the amount and the UTR — the two things actually being
 * asserted about the world.
 */

import { useCallback, useEffect, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, Check, X, Search, Loader2, Inbox, AlertTriangle,
  RefreshCw, Wallet, Settings2, Building2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/http';
import type {
  SubCheckoutQueueRow, SubCheckoutStats, UpiRejectReason,
  PlatformPaymentSettings,
} from '@/lib/api';
import { useToast } from '@/lib/toast';
import { EmptyState } from '@/components/ui';

const inr = (n: number) => '₹' + Number(n || 0).toLocaleString('en-IN');

const REASON_LABELS: Record<UpiRejectReason, string> = {
  PAYMENT_NOT_RECEIVED: 'Payment not received',
  WRONG_UTR: 'Wrong UTR',
  AMOUNT_MISMATCH: 'Amount mismatch',
  DUPLICATE_UTR: 'Duplicate UTR',
  FAKE_SCREENSHOT: 'Proof looks altered',
  OTHER: 'Other',
};
const REASONS = Object.keys(REASON_LABELS) as UpiRejectReason[];

const STATUS_META: Record<string, { label: string; tone: string }> = {
  AWAITING_PAYMENT: { label: 'Not paid yet', tone: 'var(--text-muted)' },
  AWAITING_VERIFICATION: { label: 'To verify', tone: 'var(--warning)' },
  APPROVED: { label: 'Approved', tone: 'var(--success)' },
  REJECTED: { label: 'Rejected', tone: 'var(--danger)' },
  CANCELLED: { label: 'Cancelled', tone: 'var(--text-muted)' },
  EXPIRED: { label: 'Expired', tone: 'var(--text-muted)' },
};

export default function SubscriptionRequestsTab() {
  const { toast } = useToast();

  const [rows, setRows] = useState<SubCheckoutQueueRow[]>([]);
  const [stats, setStats] = useState<SubCheckoutStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('AWAITING_VERIFICATION');
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [action, setAction] = useState<{ row: SubCheckoutQueueRow; kind: 'approve' | 'reject' } | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSearch(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.superAdmin.subscriptionRequests({ status, q: search || undefined, limit: 50 });
      setRows(r.data);
      setStats(r.stats);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load the payment queue.');
    } finally { setLoading(false); }
  }, [status, search]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div>
      {/* ── Counters ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Tile label="To verify" value={stats ? String(stats.awaiting_count) : '—'} tone="var(--warning)" loading={loading && !stats} />
        <Tile label="Awaiting amount" value={stats ? inr(stats.awaiting_amount_inr) : '—'} tone="var(--warning)" loading={loading && !stats} />
        <Tile label="Started, unpaid" value={stats ? String(stats.unpaid_count) : '—'} tone="var(--text-muted)" loading={loading && !stats} />
        <Tile label="Approved today" value={stats ? `${stats.approved_today} · ${inr(stats.approved_today_amount_inr)}` : '—'} tone="var(--success)" loading={loading && !stats} />
        <Tile label="Collected total" value={stats ? inr(stats.collected_inr) : '—'} tone="var(--brand)" loading={loading && !stats} />
      </div>

      {/* ── Controls ── */}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--text-muted)' }} />
          <input value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search studio, reference or UTR" aria-label="Search payment requests"
            className="w-full rounded-xl py-2.5 pl-9 pr-3 text-[14px] outline-none"
            style={{ background: 'var(--bg-base)', color: 'var(--text-primary)', border: '1px solid var(--border-2)' }} />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {(['AWAITING_VERIFICATION', 'AWAITING_PAYMENT', 'APPROVED', 'ALL'] as const).map((s) => (
            <button key={s} type="button" onClick={() => setStatus(s)}
              className="shrink-0 rounded-lg px-3 py-2 text-[12.5px] font-[650]"
              style={{
                background: status === s ? 'var(--brand)' : 'var(--bg-subtle)',
                color: status === s ? '#fff' : 'var(--text-muted)',
              }}>
              {s === 'AWAITING_VERIFICATION' ? 'To verify' : s === 'AWAITING_PAYMENT' ? 'Unpaid'
                : s === 'APPROVED' ? 'Approved' : 'All'}
            </button>
          ))}
          <button type="button" onClick={() => void load()} aria-label="Refresh"
            className="shrink-0 rounded-lg px-3 py-2"
            style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : undefined} />
          </button>
          <button type="button" onClick={() => setShowSettings(true)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-[12.5px] font-[650]"
            style={{ background: 'var(--bg-subtle)', color: 'var(--text-primary)' }}>
            <Settings2 size={14} /> My UPI
          </button>
        </div>
      </div>

      {/* ── Queue ── */}
      <div className="mt-4">
        {error ? (
          <div className="flex items-start gap-2.5 rounded-xl p-4"
            style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
            <AlertTriangle size={17} className="mt-px shrink-0" />
            <span className="text-[13.5px]">{error}</span>
          </div>
        ) : loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[128px] animate-pulse rounded-2xl" style={{ background: 'var(--bg-subtle)' }} />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState icon={<Inbox size={22} />}
            title={status === 'AWAITING_VERIFICATION' ? 'Nothing to verify' : 'No payment requests'}
            description={status === 'AWAITING_VERIFICATION'
              ? 'Every studio payment has been dealt with.'
              : 'No requests match this filter yet.'} />
        ) : (
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {rows.map((row) => (
                <RequestCard key={row.id} row={row}
                  onApprove={() => setAction({ row, kind: 'approve' })}
                  onReject={() => setAction({ row, kind: 'reject' })} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {action && (
        <ActionDialog action={action} onClose={() => setAction(null)}
          onDone={async () => { setAction(null); await load(); }} toast={toast} />
      )}
      {showSettings && <PlatformUpiDialog onClose={() => setShowSettings(false)} toast={toast} />}
    </div>
  );
}

// ── Pieces ──────────────────────────────────────────────────────────────────

function Tile({ label, value, tone, loading }: { label: string; value: string; tone: string; loading: boolean }) {
  return (
    <div className={`rounded-xl p-3.5 ${loading ? 'animate-pulse' : ''}`}
      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
      <p className="text-[11px] font-[650] uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="mt-1.5 text-[17px] font-[800] tabular-nums" style={{ color: tone }}>{value}</p>
    </div>
  );
}

function RequestCard({
  row, onApprove, onReject,
}: { row: SubCheckoutQueueRow; onApprove: () => void; onReject: () => void }) {
  const meta = STATUS_META[row.status] ?? STATUS_META.AWAITING_PAYMENT;
  const actionable = row.status === 'AWAITING_VERIFICATION';

  return (
    <m.article layout
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }} transition={{ duration: 0.22 }}
      className="overflow-hidden rounded-2xl p-4"
      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Building2 size={15} style={{ color: 'var(--text-muted)' }} />
            <h3 className="text-[15px] font-[740]" style={{ color: 'var(--text-primary)' }}>
              {row.organization_name}
            </h3>
            <span className="rounded-full px-2 py-0.5 text-[11px] font-[700]"
              style={{ background: `color-mix(in srgb, ${meta.tone} 14%, transparent)`, color: meta.tone }}>
              {meta.label}
            </span>
          </div>
          <p className="mt-0.5 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
            {row.plan_name || row.plan_code}
            {row.duration_months ? ` · ${row.duration_months} month${row.duration_months === 1 ? '' : 's'}` : ''}
            {' · '}{row.request_no}
          </p>
          {/* The operator needs to know what they are activating INTO. */}
          <p className="mt-0.5 text-[12px]" style={{ color: 'var(--text-muted)' }}>
            Currently {row.subscription_status ?? 'unknown'}
            {row.current_period_end
              ? ` · expires ${new Date(row.current_period_end).toLocaleDateString('en-IN', { dateStyle: 'medium' })}`
              : ''}
            {row.direction === 'upgrade' && row.previous_plan_code
              ? ` · Upgrade from ${row.previous_plan_code}`
              : row.direction === 'renewal' ? ' · Renewal' : ''}
          </p>
        </div>

        <div className="text-right">
          <p className="text-[21px] font-[820] tabular-nums" style={{ color: 'var(--text-primary)' }}>
            {inr(row.amount_inr)}
          </p>
          {row.discount_inr > 0 && (
            <p className="text-[11.5px]" style={{ color: 'var(--success)' }}>
              {inr(row.list_price_inr)} − {inr(row.discount_inr)}
              {row.coupon_code ? ` (${row.coupon_code})` : ''}
            </p>
          )}
          {row.submitted_at && (
            <p className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
              {new Date(row.submitted_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
            </p>
          )}
        </div>
      </div>

      {row.utr && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl px-3 py-2.5"
          style={{ background: 'var(--bg-subtle)' }}>
          <span className="text-[11px] font-[700] uppercase tracking-[0.08em]"
            style={{ color: 'var(--text-muted)' }}>UTR</span>
          {/* select-all: this gets pasted straight into a bank portal. */}
          <span className="select-all font-mono text-[15px] font-[650]"
            style={{ color: 'var(--text-primary)' }}>{row.utr}</span>
        </div>
      )}

      {row.payer_note && (
        <p className="mt-2 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>&ldquo;{row.payer_note}&rdquo;</p>
      )}

      {actionable && (
        <div className="mt-3.5 flex flex-wrap gap-2">
          <button type="button" onClick={onApprove}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-[13.5px] font-[700] text-white sm:flex-none"
            style={{ background: 'var(--success)' }}>
            <Check size={15} /> Approve &amp; activate
          </button>
          <button type="button" onClick={onReject}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-[13.5px] font-[700] sm:flex-none"
            style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
            <X size={15} /> Reject
          </button>
        </div>
      )}
    </m.article>
  );
}

// ── Approve / reject ────────────────────────────────────────────────────────

function ActionDialog({
  action, onClose, onDone, toast,
}: {
  action: { row: SubCheckoutQueueRow; kind: 'approve' | 'reject' };
  onClose: () => void;
  onDone: () => Promise<void>;
  toast: ReturnType<typeof useToast>['toast'];
}) {
  const { row, kind } = action;
  const [reason, setReason] = useState<UpiRejectReason>('PAYMENT_NOT_RECEIVED');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isApprove = kind === 'approve';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  const run = async () => {
    setBusy(true); setError(null);
    try {
      if (isApprove) {
        await api.superAdmin.approveSubscriptionRequest(row.id);
        toast.success(`${row.organization_name} is now active on ${row.plan_name || row.plan_code}.`);
      } else {
        await api.superAdmin.rejectSubscriptionRequest(row.id, reason, note.trim() || undefined);
        toast.success('Rejected. The studio can submit a corrected reference.');
      }
      await onDone();
    } catch (err) {
      // A 409 means someone else already handled it — information, not failure.
      setError(err instanceof ApiError
        ? (err.status === 409 ? `${err.message} Refresh to see the current state.` : err.message)
        : 'Something went wrong. Please try again.');
    } finally { setBusy(false); }
  };

  return (
    <AnimatePresence>
      <m.div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        role="dialog" aria-modal="true" aria-labelledby="sub-action-title">
        <div className="absolute inset-0" style={{ background: 'var(--bg-overlay)' }}
          onClick={() => !busy && onClose()} />
        <m.div className="relative w-full max-w-[440px] overflow-hidden rounded-t-3xl sm:rounded-3xl"
          initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 16, opacity: 0 }}
          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          <div className="h-1 w-full" style={{ background: isApprove ? 'var(--success)' : 'var(--danger)' }} />
          <div className="p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <h2 id="sub-action-title" className="text-[17px] font-[780]" style={{ color: 'var(--text-primary)' }}>
              {isApprove ? 'Approve and activate?' : 'Reject this payment'}
            </h2>

            <div className="mt-3 rounded-xl p-3" style={{ background: 'var(--bg-subtle)' }}>
              <p className="text-[13.5px] font-[700]" style={{ color: 'var(--text-primary)' }}>
                {row.organization_name} · {inr(row.amount_inr)}
              </p>
              <p className="mt-0.5 font-mono text-[13px]" style={{ color: 'var(--text-muted)' }}>
                UTR {row.utr ?? '—'}
              </p>
            </div>

            {isApprove ? (
              <p className="mt-3 text-[13px]" style={{ color: 'var(--text-muted)' }}>
                This activates <strong style={{ color: 'var(--text-primary)' }}>{row.plan_name || row.plan_code}</strong>,
                records the payment, issues an invoice and may grant a founder slot. It cannot be
                undone — confirm this UTR appears in your bank account first.
              </p>
            ) : (
              <>
                <p className="mt-3 text-[13px]" style={{ color: 'var(--text-muted)' }}>
                  The studio is told why and can submit a corrected reference.
                </p>
                <fieldset className="mt-3">
                  <legend className="text-[12px] font-[650]" style={{ color: 'var(--text-primary)' }}>Reason</legend>
                  <div className="mt-2 grid gap-1.5">
                    {REASONS.map((r) => (
                      <label key={r} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px]"
                        style={{
                          background: reason === r ? 'var(--brand-soft)' : 'transparent',
                          color: reason === r ? 'var(--brand)' : 'var(--text-primary)',
                        }}>
                        <input type="radio" name="sub-reject-reason" value={r}
                          checked={reason === r} onChange={() => setReason(r)} className="h-3.5 w-3.5" />
                        {REASON_LABELS[r]}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <label htmlFor="sub-note" className="mt-3 block text-[12px] font-[650]"
                  style={{ color: 'var(--text-primary)' }}>
                  Note to the studio <span style={{ color: 'var(--text-muted)' }}>(optional)</span>
                </label>
                <textarea id="sub-note" rows={2} maxLength={500} value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. We received ₹1,499 but the plan is ₹3,999."
                  className="mt-1.5 w-full resize-none rounded-xl px-3 py-2.5 text-[14px] outline-none"
                  style={{ background: 'var(--bg-base)', color: 'var(--text-primary)', border: '1px solid var(--border-2)' }} />
              </>
            )}

            {error && (
              <p className="mt-3 flex items-start gap-2 text-[12.5px]" style={{ color: 'var(--danger)' }}>
                <AlertTriangle size={14} className="mt-px shrink-0" /> {error}
              </p>
            )}

            <div className="mt-5 flex gap-2">
              <button type="button" onClick={onClose} disabled={busy}
                className="flex-1 rounded-xl py-3 text-[14px] font-[650] disabled:opacity-50"
                style={{ background: 'var(--bg-subtle)', color: 'var(--text-primary)' }}>Cancel</button>
              <button type="button" onClick={run} disabled={busy}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-[14px] font-[720] text-white disabled:opacity-60"
                style={{ background: isApprove ? 'var(--success)' : 'var(--danger)' }}>
                {busy && <Loader2 size={15} className="animate-spin" />}
                {isApprove ? 'Approve & activate' : 'Reject'}
              </button>
            </div>
          </div>
        </m.div>
      </m.div>
    </AnimatePresence>
  );
}

// ── Platform UPI settings ───────────────────────────────────────────────────

/** Mirrors the CHECK constraint in migration 113 and the server-side check. */
const VPA_RE = /^[a-zA-Z0-9._-]{2,64}@[a-zA-Z][a-zA-Z0-9.]{1,63}$/;

function PlatformUpiDialog({
  onClose, toast,
}: { onClose: () => void; toast: ReturnType<typeof useToast>['toast'] }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [upiId, setUpiId] = useState('');
  const [merchant, setMerchant] = useState('MY PT STUDIO');
  const [instructions, setInstructions] = useState('');
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    void api.superAdmin.platformPaymentSettings()
      .then((r) => {
        const d: PlatformPaymentSettings | null = r.data;
        if (d) {
          setUpiId(d.upi_id); setMerchant(d.merchant_name);
          setInstructions(d.instructions ?? ''); setEnabled(d.is_enabled);
        }
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Could not load settings.'))
      .finally(() => setLoading(false));
  }, []);

  const vpaOk = VPA_RE.test(upiId.trim());
  const canSave = vpaOk && merchant.trim().length > 0 && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true); setError(null);
    try {
      await api.superAdmin.savePlatformPaymentSettings({
        upi_id: upiId.trim(), merchant_name: merchant.trim(),
        instructions: instructions.trim() || null, is_enabled: enabled,
      });
      toast.success(enabled ? 'Saved. Studios can now pay by UPI.' : 'Saved. Self-checkout is off.');
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save.');
    } finally { setSaving(false); }
  };

  return (
    <AnimatePresence>
      <m.div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        role="dialog" aria-modal="true" aria-labelledby="upi-settings-title">
        <div className="absolute inset-0" style={{ background: 'var(--bg-overlay)' }}
          onClick={() => !saving && onClose()} />
        <m.div className="relative max-h-[92vh] w-full max-w-[440px] overflow-y-auto rounded-t-3xl sm:rounded-3xl"
          initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 16, opacity: 0 }}
          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          <div className="p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <h2 id="upi-settings-title" className="flex items-center gap-2 text-[17px] font-[780]"
              style={{ color: 'var(--text-primary)' }}>
              <Wallet size={17} style={{ color: 'var(--brand)' }} /> Your UPI details
            </h2>
            <p className="mt-1 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
              This is the account every studio pays into. It appears on their checkout QR.
            </p>

            {loading ? (
              <div className="mt-4 h-40 animate-pulse rounded-xl" style={{ background: 'var(--bg-subtle)' }} />
            ) : (
              <>
                <label htmlFor="p-upi" className="mt-4 block text-[12px] font-[650]"
                  style={{ color: 'var(--text-primary)' }}>Your UPI ID</label>
                <input id="p-upi" value={upiId} autoCapitalize="none" spellCheck={false}
                  onChange={(e) => setUpiId(e.target.value.trim())} placeholder="myptstudio@okhdfcbank"
                  className="mt-1.5 w-full rounded-xl px-3.5 font-mono text-[15px] outline-none"
                  style={{
                    height: 48, background: 'var(--bg-base)', color: 'var(--text-primary)',
                    border: `1px solid ${upiId && !vpaOk ? 'var(--danger)' : 'var(--border-2)'}`,
                  }} />
                {upiId.length > 0 && !vpaOk && (
                  <p className="mt-1.5 text-[11.5px]" style={{ color: 'var(--danger)' }}>
                    Must look like name@bank.
                  </p>
                )}

                <label htmlFor="p-name" className="mt-4 block text-[12px] font-[650]"
                  style={{ color: 'var(--text-primary)' }}>Name studios will see</label>
                <input id="p-name" value={merchant} maxLength={120}
                  onChange={(e) => setMerchant(e.target.value)}
                  className="mt-1.5 w-full rounded-xl px-3.5 text-[15px] outline-none"
                  style={{ height: 48, background: 'var(--bg-base)', color: 'var(--text-primary)', border: '1px solid var(--border-2)' }} />

                <label htmlFor="p-note" className="mt-4 block text-[12px] font-[650]"
                  style={{ color: 'var(--text-primary)' }}>
                  Note on the checkout page <span style={{ color: 'var(--text-muted)' }}>(optional)</span>
                </label>
                <textarea id="p-note" rows={2} maxLength={500} value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Payments are verified within 2 hours, 9am–9pm."
                  className="mt-1.5 w-full resize-none rounded-xl px-3.5 py-2.5 text-[14px] outline-none"
                  style={{ background: 'var(--bg-base)', color: 'var(--text-primary)', border: '1px solid var(--border-2)' }} />

                <div className="mt-4 flex items-start gap-3 rounded-xl p-3.5"
                  style={{ background: enabled ? 'var(--success-soft)' : 'var(--bg-subtle)' }}>
                  <ShieldCheck size={18} className="mt-0.5 shrink-0"
                    style={{ color: enabled ? 'var(--success)' : 'var(--text-muted)' }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-[700]" style={{ color: 'var(--text-primary)' }}>
                      {enabled ? 'Self-checkout is on' : 'Self-checkout is off'}
                    </p>
                    <p className="mt-0.5 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                      {enabled
                        ? 'Studios see a Pay button on their billing page.'
                        : 'Studios can only send an activation request.'}
                    </p>
                  </div>
                  <button type="button" role="switch" aria-checked={enabled}
                    aria-label="Enable self-checkout" onClick={() => setEnabled((v) => !v)}
                    className="relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors"
                    style={{ background: enabled ? 'var(--success)' : 'var(--border-3)' }}>
                    <m.span layout transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                      className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow"
                      style={{ left: enabled ? 22 : 2 }} />
                  </button>
                </div>

                {error && (
                  <p className="mt-3 flex items-start gap-2 text-[12.5px]" style={{ color: 'var(--danger)' }}>
                    <AlertTriangle size={14} className="mt-px shrink-0" /> {error}
                  </p>
                )}

                <div className="mt-5 flex gap-2">
                  <button type="button" onClick={onClose} disabled={saving}
                    className="flex-1 rounded-xl py-3 text-[14px] font-[650] disabled:opacity-50"
                    style={{ background: 'var(--bg-subtle)', color: 'var(--text-primary)' }}>Cancel</button>
                  <button type="button" onClick={save} disabled={!canSave}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-[14px] font-[720] text-white disabled:opacity-45"
                    style={{ background: 'var(--brand)' }}>
                    {saving && <Loader2 size={15} className="animate-spin" />} Save
                  </button>
                </div>
              </>
            )}
          </div>
        </m.div>
      </m.div>
    </AnimatePresence>
  );
}
