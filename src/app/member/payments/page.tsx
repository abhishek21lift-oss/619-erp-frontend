'use client';

/**
 * Payment history.
 *
 * Serves two audiences from one screen, deliberately:
 *   • a member, who sees only their own rows (the API enforces that, not this
 *     page — a member cannot widen the query by editing the URL);
 *   • staff, who see the studio's rows and can jump into any of them.
 *
 * Each row answers the only three questions anyone has here: how much, what
 * state is it in, and what can I do about it now.
 */

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { m } from 'framer-motion';
import {
  Receipt, ArrowRight, Inbox, AlertTriangle, RefreshCw, Ban, ExternalLink,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/http';
import type { UpiHistoryRow } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast';
import { PageHeader, EmptyState } from '@/components/ui';
import { UpiStatusBadge, fmtMoneyExact } from '@/components/payments/upi-shared';

const PAGE_SIZE = 25;

/** States where the member still has something to do. */
const RESUMABLE = new Set(['CREATED', 'PAYMENT_PENDING']);

export default function MemberPaymentsPage() {
  return <Guard><Inner /></Guard>;
}

function Inner() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const isMember = user?.role === 'member';

  const [rows, setRows] = useState<UpiHistoryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.upiPayments.history({ limit: PAGE_SIZE, offset: page * PAGE_SIZE });
      setRows(res.data);
      setTotal(res.total);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load your payments.');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { void load(); }, [load]);

  const cancel = async (id: string) => {
    setCancelling(id);
    try {
      await api.upiPayments.cancel(id);
      toast.success('Payment request cancelled.');
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not cancel this request.');
    } finally {
      setCancelling(null);
    }
  };

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <AppShell>
      <PageHeader
        title={isMember ? 'My payments' : 'Member payments'}
        subtitle={isMember
          ? 'Every membership payment you have made, and where each one stands.'
          : 'UPI payments members have submitted, across the studio.'}
        icon={<Receipt size={19} />}
        actions={
          <button type="button" onClick={() => void load()}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-[650]"
            style={{ background: 'var(--bg-subtle)', color: 'var(--text-primary)' }}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : undefined} /> Refresh
          </button>
        }
      />

      <div className="mt-5">
        {error ? (
          <div className="flex items-start gap-2.5 rounded-xl p-4"
            style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
            <AlertTriangle size={17} className="mt-px shrink-0" />
            <span className="text-[13.5px]">{error}</span>
          </div>
        ) : loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[108px] animate-pulse rounded-2xl"
                style={{ background: 'var(--bg-subtle)' }} />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Inbox size={22} />}
            title="No payments yet"
            description={isMember
              ? 'Membership payments you make will appear here with their receipts.'
              : 'Nothing has been submitted through UPI yet.'}
          />
        ) : (
          <div className="space-y-3">
            {rows.map((row, i) => (
              <m.article
                key={row.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, delay: Math.min(i * 0.03, 0.2) }}
                className="rounded-2xl p-4"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[15px] font-[740]" style={{ color: 'var(--text-primary)' }}>
                        {row.plan_name}
                      </h3>
                      <UpiStatusBadge status={row.status} size="sm" />
                    </div>
                    <p className="mt-0.5 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
                      {!isMember && <>{row.client_name} · </>}
                      {row.order_no} · {new Date(row.created_at).toLocaleDateString('en-IN',
                        { dateStyle: 'medium' })}
                    </p>
                    {row.utr && (
                      <p className="mt-1 font-mono text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
                        UTR {row.utr}
                      </p>
                    )}
                    {row.activated_to && (
                      <p className="mt-1 text-[12.5px]" style={{ color: 'var(--success)' }}>
                        Active until {new Date(row.activated_to).toLocaleDateString('en-IN',
                          { dateStyle: 'medium' })}
                      </p>
                    )}
                    {row.status === 'PAYMENT_PENDING' && row.rejected_reason && (
                      <p className="mt-1 text-[12.5px]" style={{ color: 'var(--danger)' }}>
                        Last reference was not accepted{row.rejected_note ? ` — ${row.rejected_note}` : ''}
                      </p>
                    )}
                  </div>
                  <p className="text-[19px] font-[800] tabular-nums"
                    style={{ color: 'var(--text-primary)' }}>
                    {fmtMoneyExact(row.total_amount)}
                  </p>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {RESUMABLE.has(row.status) && (
                    <>
                      <button type="button" onClick={() => router.push(`/pay/${row.id}`)}
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-[700] text-white"
                        style={{ background: 'var(--brand)' }}>
                        {row.status === 'CREATED' ? 'Pay now' : 'Submit reference'}
                        <ArrowRight size={14} />
                      </button>
                      <button type="button" disabled={cancelling === row.id}
                        onClick={() => void cancel(row.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-[650] disabled:opacity-50"
                        style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
                        <Ban size={13} /> Cancel
                      </button>
                    </>
                  )}
                  {row.status === 'VERIFICATION_PENDING' && (
                    <button type="button" onClick={() => router.push(`/pay/${row.id}`)}
                      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-[650]"
                      style={{ background: 'var(--bg-subtle)', color: 'var(--text-primary)' }}>
                      Track status <ArrowRight size={14} />
                    </button>
                  )}
                  {row.receipt_no && (
                    <a href={api.upiPayments.receiptUrl(row.id)} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-[650]"
                      style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>
                      <Receipt size={13} /> Receipt {row.receipt_no} <ExternalLink size={11} />
                    </a>
                  )}
                </div>
              </m.article>
            ))}
          </div>
        )}
      </div>

      {pageCount > 1 && (
        <div className="mt-5 flex items-center justify-between">
          <span className="text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
            Page {page + 1} of {pageCount}
          </span>
          <div className="flex gap-2">
            <button type="button" disabled={page === 0} onClick={() => setPage((p) => p - 1)}
              className="rounded-lg px-3 py-1.5 text-[12.5px] font-[650] disabled:opacity-40"
              style={{ background: 'var(--bg-subtle)', color: 'var(--text-primary)' }}>Previous</button>
            <button type="button" disabled={page + 1 >= pageCount} onClick={() => setPage((p) => p + 1)}
              className="rounded-lg px-3 py-1.5 text-[12.5px] font-[650] disabled:opacity-40"
              style={{ background: 'var(--bg-subtle)', color: 'var(--text-primary)' }}>Next</button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
