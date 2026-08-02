'use client';

/**
 * Payment verification queue — where a studio admin turns a claimed UPI
 * transfer into an active membership.
 *
 * The job this screen supports: the admin has their bank statement open on one
 * side and this on the other, and is matching a UTR and an amount. So the UTR
 * is monospaced and copyable, the amount is large, and the screenshot opens
 * without leaving the row. Everything else is secondary.
 *
 * ── Approve is irreversible ─────────────────────────────────────────────────
 * Approving activates a membership, writes a finance-ledger row and issues a
 * receipt. There is no un-approve. So it takes a deliberate confirm, and the
 * confirm restates the amount and the UTR — the two things that are actually
 * being asserted.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck, Check, X, Search, Loader2, ExternalLink, ImageIcon,
  Inbox, AlertTriangle, MessageSquareWarning, RefreshCw, Phone, ArrowUpDown,
  Plus, UserRound,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/http';
import type {
  UpiQueueRow, UpiQueueStats, UpiQueueParams, UpiRejectReason, MembershipPlan, Client,
} from '@/lib/api';
import { PLAN_DURATION_MONTHS } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { PageHeader, EmptyState, cn } from '@/components/ui';
import {
  REJECT_REASONS, REJECT_REASON_LABELS, UpiStatusBadge, fmtMoney, fmtMoneyExact,
} from '@/components/payments/upi-shared';

const PAGE_SIZE = 25;

export default function VerifyPaymentsPage() {
  return <Guard roles={['admin', 'manager']}><Inner /></Guard>;
}

function Inner() {
  const { toast } = useToast();
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  const [rows, setRows] = useState<UpiQueueRow[]>([]);
  const [stats, setStats] = useState<UpiQueueStats | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<NonNullable<UpiQueueParams['status']>>('VERIFICATION_PENDING');
  const [sort, setSort] = useState<NonNullable<UpiQueueParams['sort']>>('oldest');
  const [page, setPage] = useState(0);

  // The row currently being acted on, and which action — one dialog serves
  // approve, reject and correction so the three cannot drift apart visually.
  const [action, setAction] = useState<{ row: UpiQueueRow; kind: 'approve' | 'reject' | 'correct' } | null>(null);
  const [proof, setProof] = useState<UpiQueueRow | null>(null);

  // Debounce the search box so typing does not fire a request per keystroke.
  useEffect(() => {
    const id = setTimeout(() => { setSearch(query.trim()); setPage(0); }, 300);
    return () => clearTimeout(id);
  }, [query]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.upiPayments.pending({
        q: search || undefined, status, sort,
        limit: PAGE_SIZE, offset: page * PAGE_SIZE,
      });
      setRows(res.data);
      setStats(res.stats);
      setTotal(res.total);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load the verification queue.');
    } finally {
      setLoading(false);
    }
  }, [search, status, sort, page]);

  useEffect(() => { void load(); }, [load]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <AppShell>
      <PageHeader
        title="Verify payments"
        subtitle="Match each UPI reference against your bank statement, then approve to activate the membership."
        icon={<ShieldCheck size={19} />}
        actions={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void load()}
              aria-label="Refresh queue"
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-[650]"
              style={{ background: 'var(--bg-subtle)', color: 'var(--text-primary)' }}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : undefined} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-[700] text-white"
              style={{ background: 'var(--brand)' }}
            >
              <Plus size={15} /> New request
            </button>
          </div>
        }
      />

      <StatsRow stats={stats} loading={loading && !stats} />

      {/* ── Filters ── */}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--text-muted)' }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search member, order number or UTR"
            aria-label="Search payments"
            className="w-full rounded-xl py-2.5 pl-9 pr-3 text-[14px] outline-none"
            style={{
              background: 'var(--bg-base)', color: 'var(--text-primary)',
              border: '1px solid var(--border-2)',
            }}
          />
        </div>

        <div className="flex gap-2 overflow-x-auto">
          {(['VERIFICATION_PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => { setStatus(s); setPage(0); }}
              className={cn(
                'shrink-0 rounded-lg px-3 py-2 text-[12.5px] font-[650] transition-colors',
              )}
              style={{
                background: status === s ? 'var(--brand)' : 'var(--bg-subtle)',
                color: status === s ? '#fff' : 'var(--text-muted)',
              }}
            >
              {s === 'VERIFICATION_PENDING' ? 'Pending' : s === 'ALL' ? 'All' : s === 'APPROVED' ? 'Approved' : 'Rejected'}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSort((v) => (v === 'oldest' ? 'newest' : v === 'newest' ? 'amount_high' : v === 'amount_high' ? 'amount_low' : 'oldest'))}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-[12.5px] font-[650]"
            style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}
          >
            <ArrowUpDown size={13} />
            {{ oldest: 'Oldest first', newest: 'Newest first', amount_high: 'Highest', amount_low: 'Lowest' }[sort]}
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
              <div key={i} className="h-[132px] animate-pulse rounded-2xl"
                style={{ background: 'var(--bg-subtle)' }} />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Inbox size={22} />}
            title={status === 'VERIFICATION_PENDING' ? 'Nothing waiting' : 'No payments match'}
            description={
              status === 'VERIFICATION_PENDING'
                ? 'Every submitted payment has been dealt with.'
                : 'Try a different filter or search term.'
            }
          />
        ) : (
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {rows.map((row) => (
                <PaymentRow
                  key={row.id}
                  row={row}
                  onApprove={() => setAction({ row, kind: 'approve' })}
                  onReject={() => setAction({ row, kind: 'reject' })}
                  onCorrect={() => setAction({ row, kind: 'correct' })}
                  onViewProof={() => setProof(row)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ── Pagination ── */}
      {pageCount > 1 && (
        <div className="mt-5 flex items-center justify-between">
          <span className="text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
            {total} payment{total === 1 ? '' : 's'} · page {page + 1} of {pageCount}
          </span>
          <div className="flex gap-2">
            <PagerButton disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</PagerButton>
            <PagerButton disabled={page + 1 >= pageCount} onClick={() => setPage((p) => p + 1)}>Next</PagerButton>
          </div>
        </div>
      )}

      <ActionDialog
        action={action}
        onClose={() => setAction(null)}
        onDone={async () => { setAction(null); await load(); }}
        toast={toast}
      />
      <ProofDialog row={proof} onClose={() => setProof(null)} />
      {creating && (
        <NewRequestDialog
          onClose={() => setCreating(false)}
          onCreated={(orderId) => { setCreating(false); router.push(`/pay/${orderId}`); }}
          toast={toast}
        />
      )}
    </AppShell>
  );
}

// ── Stats ───────────────────────────────────────────────────────────────────

function StatsRow({ stats, loading }: { stats: UpiQueueStats | null; loading: boolean }) {
  const tiles = useMemo(() => [
    { label: 'Waiting now', value: stats ? String(stats.pending_count) : '—', tone: 'warning' as const },
    { label: 'Pending amount', value: stats ? fmtMoney(stats.pending_amount) : '—', tone: 'warning' as const },
    { label: 'Approved today', value: stats ? String(stats.approved_today) : '—', tone: 'success' as const },
    { label: 'Collected today', value: stats ? fmtMoney(stats.approved_today_amount) : '—', tone: 'success' as const },
    { label: 'Rejected today', value: stats ? String(stats.rejected_today) : '—', tone: 'danger' as const },
    { label: 'Total collected', value: stats ? fmtMoney(stats.total_collected) : '—', tone: 'brand' as const },
  ], [stats]);

  return (
    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {tiles.map((t) => (
        <div key={t.label} className={cn('rounded-xl p-3.5', loading && 'animate-pulse')}
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          <p className="text-[11px] font-[650] uppercase tracking-[0.08em]"
            style={{ color: 'var(--text-muted)' }}>{t.label}</p>
          <p className="mt-1.5 text-[19px] font-[800] tabular-nums"
            style={{ color: `var(--${t.tone === 'brand' ? 'brand' : t.tone})` }}>
            {t.value}
          </p>
        </div>
      ))}
    </div>
  );
}

// ── Row ─────────────────────────────────────────────────────────────────────

function PaymentRow({
  row, onApprove, onReject, onCorrect, onViewProof,
}: {
  row: UpiQueueRow;
  onApprove: () => void;
  onReject: () => void;
  onCorrect: () => void;
  onViewProof: () => void;
}) {
  const actionable = row.status === 'VERIFICATION_PENDING';

  return (
    <m.article
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.22 }}
      className="overflow-hidden rounded-2xl p-4"
      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[15px] font-[740]" style={{ color: 'var(--text-primary)' }}>
              {row.client_name}
            </h3>
            <UpiStatusBadge status={row.status} size="sm" />
          </div>
          <p className="mt-0.5 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
            {row.plan_name} · {row.duration_months} month{row.duration_months === 1 ? '' : 's'} · {row.order_no}
          </p>
          {row.client_mobile && (
            <a href={`tel:${row.client_mobile}`}
              className="mt-1 inline-flex items-center gap-1.5 text-[12.5px]"
              style={{ color: 'var(--brand)' }}>
              <Phone size={12} /> {row.client_mobile}
            </a>
          )}
        </div>

        <div className="text-right">
          <p className="text-[21px] font-[820] tabular-nums" style={{ color: 'var(--text-primary)' }}>
            {fmtMoneyExact(row.total_amount)}
          </p>
          {row.submitted_at && (
            <p className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
              submitted {new Date(row.submitted_at).toLocaleString('en-IN',
                { dateStyle: 'medium', timeStyle: 'short' })}
            </p>
          )}
        </div>
      </div>

      {/* ── The thing being verified ── */}
      {row.utr && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl px-3 py-2.5"
          style={{ background: 'var(--bg-subtle)' }}>
          <span className="text-[11px] font-[700] uppercase tracking-[0.08em]"
            style={{ color: 'var(--text-muted)' }}>UTR</span>
          {/* Selectable and monospaced: this gets pasted into a bank portal. */}
          <span className="select-all font-mono text-[15px] font-[650] tracking-[0.02em]"
            style={{ color: 'var(--text-primary)' }}>
            {row.utr}
          </span>
          {row.screenshot_url && (
            <button type="button" onClick={onViewProof}
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-[650]"
              style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>
              <ImageIcon size={13} /> Proof
            </button>
          )}
        </div>
      )}

      {row.submission_notes && (
        <p className="mt-2 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
          &ldquo;{row.submission_notes}&rdquo;
        </p>
      )}

      {row.status === 'PAYMENT_PENDING' && row.rejected_reason && (
        <p className="mt-2 flex items-start gap-1.5 text-[12.5px]" style={{ color: 'var(--danger)' }}>
          <AlertTriangle size={13} className="mt-px shrink-0" />
          Last attempt rejected: {REJECT_REASON_LABELS[row.rejected_reason]}
          {row.rejected_note ? ` — ${row.rejected_note}` : ''}
        </p>
      )}

      {actionable && (
        <div className="mt-3.5 flex flex-wrap gap-2">
          <button type="button" onClick={onApprove}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-[13.5px] font-[700] text-white sm:flex-none"
            style={{ background: 'var(--success)' }}>
            <Check size={15} /> Approve
          </button>
          <button type="button" onClick={onReject}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-[13.5px] font-[700] sm:flex-none"
            style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
            <X size={15} /> Reject
          </button>
          <button type="button" onClick={onCorrect}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-[13.5px] font-[650]"
            style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
            <MessageSquareWarning size={15} /> Ask to correct
          </button>
        </div>
      )}
    </m.article>
  );
}

// ── Action dialog ───────────────────────────────────────────────────────────

function ActionDialog({
  action, onClose, onDone, toast,
}: {
  action: { row: UpiQueueRow; kind: 'approve' | 'reject' | 'correct' } | null;
  onClose: () => void;
  onDone: () => Promise<void>;
  toast: ReturnType<typeof useToast>['toast'];
}) {
  const [reason, setReason] = useState<UpiRejectReason>('PAYMENT_NOT_RECEIVED');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset per opening, so a note typed for one payment can never be submitted
  // against the next one.
  useEffect(() => {
    if (action) { setReason('PAYMENT_NOT_RECEIVED'); setNote(''); setError(null); }
  }, [action]);

  useEffect(() => {
    if (!action) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [action, busy, onClose]);

  if (!action) return null;
  const { row, kind } = action;

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      if (kind === 'approve') {
        const res = await api.upiPayments.approve(row.id);
        toast.success(`Approved. Membership active until ${
          new Date(res.data.activation.activated_to).toLocaleDateString('en-IN', { dateStyle: 'medium' })}.`);
      } else if (kind === 'reject') {
        await api.upiPayments.reject(row.id, reason, note.trim() || undefined);
        toast.success('Rejected. The member can submit a corrected reference.');
      } else {
        await api.upiPayments.requestCorrection(row.id, reason, note.trim() || undefined);
        toast.success('Correction requested.');
      }
      await onDone();
    } catch (err) {
      // A 409 here means someone else already dealt with it — which is
      // information, not a failure, so it reads as such.
      const message = err instanceof ApiError
        ? (err.status === 409 ? `${err.message} Refresh to see the current state.` : err.message)
        : 'Something went wrong. Please try again.';
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  const isApprove = kind === 'approve';

  return (
    <AnimatePresence>
      <m.div
        className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        role="dialog" aria-modal="true" aria-labelledby="verify-dialog-title"
      >
        <div className="absolute inset-0" style={{ background: 'var(--bg-overlay)' }}
          onClick={() => !busy && onClose()} />
        <m.div
          className="relative w-full max-w-[440px] overflow-hidden rounded-t-3xl sm:rounded-3xl"
          initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 16, opacity: 0 }}
          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
        >
          <div className="h-1 w-full"
            style={{ background: isApprove ? 'var(--success)' : 'var(--danger)' }} />
          <div className="p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <h2 id="verify-dialog-title" className="text-[17px] font-[780]"
              style={{ color: 'var(--text-primary)' }}>
              {isApprove ? 'Approve this payment?'
                : kind === 'reject' ? 'Reject this payment' : 'Ask for a correction'}
            </h2>

            {/* Restate exactly what is being asserted. */}
            <div className="mt-3 rounded-xl p-3" style={{ background: 'var(--bg-subtle)' }}>
              <p className="text-[13.5px] font-[700]" style={{ color: 'var(--text-primary)' }}>
                {row.client_name} · {fmtMoneyExact(row.total_amount)}
              </p>
              <p className="mt-0.5 font-mono text-[13px]" style={{ color: 'var(--text-muted)' }}>
                UTR {row.utr ?? '—'}
              </p>
            </div>

            {isApprove ? (
              <p className="mt-3 text-[13px]" style={{ color: 'var(--text-muted)' }}>
                This activates <strong style={{ color: 'var(--text-primary)' }}>{row.plan_name}</strong> for{' '}
                {row.duration_months} month{row.duration_months === 1 ? '' : 's'}, records the payment in
                your ledger and issues a receipt. It cannot be undone — confirm the UTR appears in your
                bank account first.
              </p>
            ) : (
              <>
                <p className="mt-3 text-[13px]" style={{ color: 'var(--text-muted)' }}>
                  The member is told why and can submit a new reference.
                </p>
                <fieldset className="mt-3">
                  <legend className="text-[12px] font-[650]" style={{ color: 'var(--text-primary)' }}>
                    Reason
                  </legend>
                  <div className="mt-2 grid gap-1.5">
                    {REJECT_REASONS.map((r) => (
                      <label key={r}
                        className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px]"
                        style={{
                          background: reason === r ? 'var(--brand-soft)' : 'transparent',
                          color: reason === r ? 'var(--brand)' : 'var(--text-primary)',
                        }}>
                        <input type="radio" name="reject-reason" value={r}
                          checked={reason === r} onChange={() => setReason(r)}
                          className="h-3.5 w-3.5" />
                        {REJECT_REASON_LABELS[r]}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <label htmlFor="reject-note" className="mt-3 block text-[12px] font-[650]"
                  style={{ color: 'var(--text-primary)' }}>
                  Note to the member <span style={{ color: 'var(--text-muted)' }}>(optional)</span>
                </label>
                <textarea
                  id="reject-note" rows={2} value={note} maxLength={500}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. We received ₹9,000, not ₹10,620."
                  className="mt-1.5 w-full resize-none rounded-xl px-3 py-2.5 text-[14px] outline-none"
                  style={{
                    background: 'var(--bg-base)', color: 'var(--text-primary)',
                    border: '1px solid var(--border-2)',
                  }}
                />
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
                style={{ background: 'var(--bg-subtle)', color: 'var(--text-primary)' }}>
                Cancel
              </button>
              <button type="button" onClick={run} disabled={busy}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-[14px] font-[720] text-white disabled:opacity-60"
                style={{ background: isApprove ? 'var(--success)' : 'var(--danger)' }}>
                {busy && <Loader2 size={15} className="animate-spin" />}
                {isApprove ? 'Approve & activate' : kind === 'reject' ? 'Reject' : 'Send request'}
              </button>
            </div>
          </div>
        </m.div>
      </m.div>
    </AnimatePresence>
  );
}

// ── Proof viewer ────────────────────────────────────────────────────────────

function ProofDialog({ row, onClose }: { row: UpiQueueRow | null; onClose: () => void }) {
  useEffect(() => {
    if (!row) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [row, onClose]);

  if (!row?.screenshot_url) return null;
  const isPdf = row.screenshot_url.toLowerCase().endsWith('.pdf');

  return (
    <AnimatePresence>
      <m.div
        className="fixed inset-0 z-[110] flex items-center justify-center p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        role="dialog" aria-modal="true" aria-label="Payment proof"
      >
        <div className="absolute inset-0" style={{ background: 'rgba(15,23,42,0.82)' }} onClick={onClose} />
        <m.div
          className="relative flex max-h-[88vh] w-full max-w-[520px] flex-col overflow-hidden rounded-2xl"
          initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.98, opacity: 0 }}
          style={{ background: 'var(--bg-elevated)' }}
        >
          <div className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="min-w-0">
              <p className="truncate text-[14px] font-[700]" style={{ color: 'var(--text-primary)' }}>
                {row.client_name}
              </p>
              <p className="font-mono text-[12px]" style={{ color: 'var(--text-muted)' }}>{row.utr}</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Close"
              style={{ color: 'var(--text-muted)' }}><X size={18} /></button>
          </div>

          <div className="flex-1 overflow-auto p-3" style={{ background: 'var(--bg-subtle)' }}>
            {isPdf ? (
              // A PDF cannot render in an <img>, and embedding it inline in a
              // dialog fights the scroll container on mobile — so it opens out.
              <a href={row.screenshot_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl py-10 text-[14px] font-[650]"
                style={{ color: 'var(--brand)' }}>
                Open PDF proof <ExternalLink size={15} />
              </a>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={row.screenshot_url} alt={`Payment proof for ${row.client_name}`}
                className="mx-auto max-h-full w-auto rounded-lg" />
            )}
          </div>

          <div className="px-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>
            <a href={row.screenshot_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[13px] font-[650]"
              style={{ color: 'var(--brand)' }}>
              Open full size <ExternalLink size={13} />
            </a>
          </div>
        </m.div>
      </m.div>
    </AnimatePresence>
  );
}

// ── New payment request ─────────────────────────────────────────────────────

/**
 * Staff-side entry point: raise a payment request for a member.
 *
 * This is what makes the flow reachable at all — without it a member has no
 * order to pay against. On success it navigates straight to the payment page,
 * so the person at the desk can turn the screen around and let the member scan,
 * or copy the link and send it.
 *
 * Plans are offered when the studio has any; a studio that has not set plans up
 * can still take a payment by typing the package in. The price of a REAL plan
 * is re-read server-side either way, so what is typed here can never undercut
 * a plan's actual price.
 */
function NewRequestDialog({
  onClose, onCreated, toast,
}: {
  onClose: () => void;
  onCreated: (orderId: string) => void;
  toast: ReturnType<typeof useToast>['toast'];
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Client[]>([]);
  const [searching, setSearching] = useState(false);
  const [member, setMember] = useState<Client | null>(null);

  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [planId, setPlanId] = useState<string>('');
  const [planName, setPlanName] = useState('');
  const [months, setMonths] = useState('1');
  const [amount, setAmount] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Plans are a nicety, not a requirement — a studio with none must still be
  // able to take a payment, so a failure here is swallowed.
  useEffect(() => {
    void api.membershipPlans.list().then((rows) => setPlans(rows ?? [])).catch(() => setPlans([]));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  // Debounced member search.
  useEffect(() => {
    const q = query.trim();
    if (member || q.length < 2) { setResults([]); return; }
    let cancelled = false;
    setSearching(true);
    const id = setTimeout(() => {
      void api.clients.search(q)
        .then((rows) => { if (!cancelled) setResults((rows ?? []).slice(0, 6)); })
        .catch(() => { if (!cancelled) setResults([]); })
        .finally(() => { if (!cancelled) setSearching(false); });
    }, 300);
    return () => { cancelled = true; clearTimeout(id); };
  }, [query, member]);

  const choosePlan = (id: string) => {
    setPlanId(id);
    const plan = plans.find((p) => p.id === id);
    if (plan) {
      setPlanName(plan.name);
      setAmount(String(Number(plan.final_amount)));
      setMonths(String(PLAN_DURATION_MONTHS[plan.duration] ?? 1));
    }
  };

  const monthsNum = Number(months);
  const amountNum = Number(amount);
  const valid = Boolean(member)
    && planName.trim().length > 0
    && Number.isFinite(monthsNum) && monthsNum >= 1 && monthsNum <= 120
    && Number.isFinite(amountNum) && amountNum > 0;

  const submit = async () => {
    if (!valid || !member || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.upiPayments.create({
        client_id: member.id,
        plan_id: planId || null,
        plan_name: planName.trim(),
        duration_months: monthsNum,
        base_amount: amountNum,
      });
      if (res.data.reused) toast.info('This member already had an open request for that plan.');
      onCreated(res.data.order.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create the request.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      <m.div
        className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        role="dialog" aria-modal="true" aria-labelledby="new-request-title"
      >
        <div className="absolute inset-0" style={{ background: 'var(--bg-overlay)' }}
          onClick={() => !busy && onClose()} />
        <m.div
          className="relative max-h-[92vh] w-full max-w-[440px] overflow-y-auto overscroll-contain rounded-t-3xl sm:rounded-3xl"
          initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 16, opacity: 0 }}
          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
        >
          <div className="p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <h2 id="new-request-title" className="text-[17px] font-[780]"
              style={{ color: 'var(--text-primary)' }}>
              New payment request
            </h2>
            <p className="mt-1 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
              Raise a UPI request for a member, then show them the QR or send the link.
            </p>

            {/* ── Member ── */}
            <label className="mt-4 block text-[12px] font-[650]"
              style={{ color: 'var(--text-primary)' }}>Member</label>
            {member ? (
              <div className="mt-1.5 flex items-center gap-2.5 rounded-xl p-3"
                style={{ background: 'var(--bg-subtle)' }}>
                <UserRound size={16} style={{ color: 'var(--brand)' }} />
                <span className="min-w-0 flex-1 truncate text-[14px] font-[650]"
                  style={{ color: 'var(--text-primary)' }}>{member.name}</span>
                <button type="button" aria-label="Change member"
                  onClick={() => { setMember(null); setQuery(''); }}
                  style={{ color: 'var(--text-muted)' }}><X size={16} /></button>
              </div>
            ) : (
              <>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name or mobile"
                  aria-label="Search members"
                  className="mt-1.5 w-full rounded-xl px-3.5 text-[15px] outline-none"
                  style={{
                    height: 46, background: 'var(--bg-base)', color: 'var(--text-primary)',
                    border: '1px solid var(--border-2)',
                  }}
                />
                {searching && (
                  <p className="mt-1.5 text-[12px]" style={{ color: 'var(--text-muted)' }}>Searching…</p>
                )}
                {results.length > 0 && (
                  <ul className="mt-1.5 overflow-hidden rounded-xl"
                    style={{ border: '1px solid var(--border)' }}>
                    {results.map((c) => (
                      <li key={c.id}>
                        <button type="button" onClick={() => setMember(c)}
                          className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13.5px]"
                          style={{ color: 'var(--text-primary)' }}>
                          <span className="min-w-0 flex-1 truncate">{c.name}</span>
                          {c.mobile && (
                            <span className="shrink-0 text-[12px]"
                              style={{ color: 'var(--text-muted)' }}>{c.mobile}</span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}

            {/* ── Plan ── */}
            {plans.length > 0 && (
              <>
                <label htmlFor="plan-select" className="mt-4 block text-[12px] font-[650]"
                  style={{ color: 'var(--text-primary)' }}>Plan</label>
                <select
                  id="plan-select"
                  value={planId}
                  onChange={(e) => choosePlan(e.target.value)}
                  className="mt-1.5 w-full rounded-xl px-3 text-[15px] outline-none"
                  style={{
                    height: 46, background: 'var(--bg-base)', color: 'var(--text-primary)',
                    border: '1px solid var(--border-2)',
                  }}
                >
                  <option value="">Custom package…</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {fmtMoney(p.final_amount)} ({p.duration})
                    </option>
                  ))}
                </select>
              </>
            )}

            <label htmlFor="plan-name" className="mt-4 block text-[12px] font-[650]"
              style={{ color: 'var(--text-primary)' }}>Package name</label>
            <input
              id="plan-name" value={planName} maxLength={160}
              onChange={(e) => { setPlanName(e.target.value); setPlanId(''); }}
              placeholder="Gold — 3 months"
              className="mt-1.5 w-full rounded-xl px-3.5 text-[15px] outline-none"
              style={{
                height: 46, background: 'var(--bg-base)', color: 'var(--text-primary)',
                border: '1px solid var(--border-2)',
              }}
            />

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="months" className="block text-[12px] font-[650]"
                  style={{ color: 'var(--text-primary)' }}>Months</label>
                <input
                  id="months" inputMode="numeric" value={months}
                  onChange={(e) => setMonths(e.target.value.replace(/\D/g, ''))}
                  className="mt-1.5 w-full rounded-xl px-3.5 text-[15px] tabular-nums outline-none"
                  style={{
                    height: 46, background: 'var(--bg-base)', color: 'var(--text-primary)',
                    border: '1px solid var(--border-2)',
                  }}
                />
              </div>
              <div>
                <label htmlFor="amount" className="block text-[12px] font-[650]"
                  style={{ color: 'var(--text-primary)' }}>Amount before GST</label>
                <input
                  id="amount" inputMode="decimal" value={amount}
                  onChange={(e) => { setAmount(e.target.value.replace(/[^\d.]/g, '')); }}
                  className="mt-1.5 w-full rounded-xl px-3.5 text-[15px] tabular-nums outline-none"
                  style={{
                    height: 46, background: 'var(--bg-base)', color: 'var(--text-primary)',
                    border: '1px solid var(--border-2)',
                  }}
                />
              </div>
            </div>
            <p className="mt-1.5 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
              GST is added automatically from your UPI settings.
            </p>

            {error && (
              <p className="mt-3 flex items-start gap-2 text-[12.5px]" style={{ color: 'var(--danger)' }}>
                <AlertTriangle size={14} className="mt-px shrink-0" /> {error}
              </p>
            )}

            <div className="mt-5 flex gap-2">
              <button type="button" onClick={onClose} disabled={busy}
                className="flex-1 rounded-xl py-3 text-[14px] font-[650] disabled:opacity-50"
                style={{ background: 'var(--bg-subtle)', color: 'var(--text-primary)' }}>
                Cancel
              </button>
              <button type="button" onClick={submit} disabled={!valid || busy}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-[14px] font-[720] text-white disabled:opacity-45"
                style={{ background: 'var(--brand)' }}>
                {busy && <Loader2 size={15} className="animate-spin" />} Create & show QR
              </button>
            </div>
          </div>
        </m.div>
      </m.div>
    </AnimatePresence>
  );
}

// ── Pager ───────────────────────────────────────────────────────────────────

function PagerButton({
  children, disabled, onClick,
}: { children: React.ReactNode; disabled: boolean; onClick: () => void }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick}
      className="rounded-lg px-3 py-1.5 text-[12.5px] font-[650] disabled:opacity-40"
      style={{ background: 'var(--bg-subtle)', color: 'var(--text-primary)' }}>
      {children}
    </button>
  );
}
