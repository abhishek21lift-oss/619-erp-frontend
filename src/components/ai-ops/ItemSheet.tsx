'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowUpRight, Clock } from 'lucide-react';
import type { AiOpsItem, AiOpsReason } from '@/lib/api';
import {
  Badge, Button, Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, TextArea,
} from '@/components/ui';

const BAND_TONE = {
  critical: 'danger',
  high: 'warning',
  medium: 'info',
  low: 'neutral',
} as const;

const BAND_LABEL = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
} as const;

const CHANNEL_LABEL: Record<string, string> = {
  not_connected: 'WhatsApp is not connected for this studio.',
  no_recipient: 'This client has no mobile number on file.',
  opted_out: 'This client has opted out of WhatsApp.',
};

const EVIDENCE_LABEL: Record<string, string> = {
  pt_end_date: 'Term ends',
  balance_amount: 'Balance',
  last_session: 'Last session',
  last_checkin: 'Last check-in',
  follow_up_date: 'Follow up',
  expiry_date: 'Expiry',
};

const DISMISS_REASONS = [
  { value: 'not_relevant', label: 'Not relevant' },
  { value: 'already_handled', label: 'Already handled' },
  { value: 'asked_not_to_contact', label: 'Asked not to contact' },
  { value: 'other', label: 'Other' },
] as const;

export type DismissReason = typeof DISMISS_REASONS[number]['value'];

function fmtDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function evidenceRows(reason: AiOpsReason): { key: string; label: string; value: string }[] {
  const rows: { key: string; label: string; value: string }[] = [];
  for (const [key, value] of Object.entries(reason.evidence ?? {})) {
    if (!(key in EVIDENCE_LABEL)) continue;
    if (!['string', 'number', 'boolean'].includes(typeof value)) continue;
    rows.push({ key, label: EVIDENCE_LABEL[key], value: String(value) });
  }
  return rows;
}

export interface ItemSheetProps {
  item: AiOpsItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: (item: AiOpsItem, body?: string) => void;
  onSnooze: (item: AiOpsItem, days: 1 | 3 | 7) => void;
  onDismiss: (item: AiOpsItem, reason: DismissReason) => void;
  onResolve: (item: AiOpsItem) => void;
  busy?: boolean;
  error?: string | null;
}

export default function ItemSheet({
  item, open, onOpenChange, onApprove, onSnooze, onDismiss, onResolve, busy, error,
}: ItemSheetProps) {
  const [body, setBody] = useState('');
  const [dismissReason, setDismissReason] = useState<DismissReason | ''>('');
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setBody(open && item ? item.draft?.body ?? '' : '');
    setDismissReason('');
  }, [open, item]);

  if (!item) return null;

  const action = item.recommended_action;
  const isMessage = action?.kind === 'message';
  const channelBlocked = item.channel.status !== 'connected';
  const channelReason = item.channel.reason;
  const canApprove = isMessage && !channelBlocked && body.trim().length > 0 && !busy;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-sm:left-0 max-sm:top-0 max-sm:h-[100dvh] max-sm:max-h-none max-sm:w-full max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none sm:max-w-xl"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          requestAnimationFrame(() => bodyRef.current?.focus());
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2 text-[18px] font-[750]">
            {item.subject.name}
            <Badge tone={BAND_TONE[item.priority_band]}>{BAND_LABEL[item.priority_band]}</Badge>
            <span className="text-[12px] font-semibold tabular-nums text-[var(--text-muted)]">
              {item.priority_score}
            </span>
          </DialogTitle>
          <DialogDescription>
            {action?.label ?? 'Review this client'}
            {item.subject.type === 'lead' ? ' · Lead' : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Link
            href={item.subject.type === 'lead' ? '/pt-os/leads' : `/pt-os/clients/${item.subject.id}`}
            className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-[var(--action-text)] hover:underline"
          >
            Open {item.subject.type === 'lead' ? 'lead' : 'client'} record
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          </Link>

          <section aria-label="Why this item is here" className="space-y-2">
            <h3 className="text-[12px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
              Why this is here
            </h3>
            <ul className="space-y-2">
              {item.reasons.map((reason) => {
                const rows = evidenceRows(reason);
                return (
                  <li
                    key={`${reason.code}:${reason.label}`}
                    className="rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] px-3 py-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-[13px] font-medium text-[var(--text-primary)]">{reason.label}</p>
                      <span className="shrink-0 text-[11px] font-semibold tabular-nums text-[var(--text-muted)]">
                        +{reason.points}
                      </span>
                    </div>
                    {rows.length > 0 && (
                      <dl className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                        {rows.map((row) => (
                          <div key={row.key} className="flex items-baseline gap-1">
                            <dt className="text-[11px] text-[var(--text-muted)]">{row.label}</dt>
                            <dd className="text-[11.5px] font-medium text-[var(--text-secondary)]">
                              {row.key.endsWith('_date') ? fmtDate(row.value) ?? row.value : row.value}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    )}
                    {reason.due_at && (
                      <p className="mt-1 flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
                        <Clock className="h-3 w-3" aria-hidden />
                        Due {fmtDate(reason.due_at)}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          {isMessage && (
            <section className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[12px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                  Message
                </span>
                <span className="text-[11px] tabular-nums text-[var(--text-muted)]">
                  {body.length}/1200
                </span>
              </div>
              <TextArea
                ref={bodyRef}
                aria-label="Message"
                rows={5}
                maxLength={1200}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="Write the WhatsApp message this client will receive."
              />
              <p className={`text-[11.5px] font-medium ${channelBlocked ? 'text-[var(--warning-text)]' : 'text-[var(--success-text)]'}`}>
                {channelBlocked
                  ? CHANNEL_LABEL[channelReason ?? ''] ?? 'Sending is unavailable for this client.'
                  : 'WhatsApp connected — this goes from your studio number.'}
              </p>
            </section>
          )}

          {!isMessage && action?.href && (
            <Link
              href={action.href}
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-[10px] bg-[var(--brand)] px-4 text-[13px] font-semibold text-white"
            >
              {action.label}
              <ArrowUpRight className="h-4 w-4" aria-hidden />
            </Link>
          )}

          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-xl bg-[var(--danger)]/10 px-3 py-2 text-[12.5px] text-[var(--danger-text)]">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span className="min-w-0 flex-1">{error}</span>
              {isMessage && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => onApprove(item, body.trim())}
                  disabled={busy || !canApprove}
                >
                  Retry
                </Button>
              )}
            </div>
          )}

          {isMessage && (
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              loading={busy}
              disabled={!canApprove}
              onClick={() => onApprove(item, body.trim())}
            >
              Approve &amp; send
            </Button>
          )}

          <section aria-label="Other actions" className="space-y-3 border-t border-[var(--border)] pt-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11.5px] font-semibold text-[var(--text-muted)]">Snooze</span>
              {([1, 3, 7] as const).map((days) => (
                <Button
                  key={days}
                  variant="outline"
                  size="sm"
                  className="min-h-11 sm:min-h-0"
                  disabled={busy}
                  onClick={() => onSnooze(item, days)}
                >
                  {days} day{days === 1 ? '' : 's'}
                </Button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="ops-dismiss-reason" className="sr-only">Dismiss reason</label>
              <select
                id="ops-dismiss-reason"
                aria-label="Dismiss reason"
                value={dismissReason}
                onChange={(event) => setDismissReason(event.target.value as DismissReason | '')}
                className="min-h-11 min-w-0 flex-1 rounded-[10px] border border-[var(--border-2)] bg-[var(--bg-card)] px-3 text-[12.5px] text-[var(--text-primary)] sm:min-h-9"
              >
                <option value="">Choose a dismiss reason…</option>
                {DISMISS_REASONS.map((reason) => (
                  <option key={reason.value} value={reason.value}>{reason.label}</option>
                ))}
              </select>
              <Button
                variant="outline"
                size="sm"
                className="min-h-11 sm:min-h-0"
                disabled={busy || !dismissReason}
                onClick={() => dismissReason && onDismiss(item, dismissReason)}
              >
                Dismiss
              </Button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="min-h-11 sm:min-h-0"
              disabled={busy}
              onClick={() => onResolve(item)}
            >
              Mark done
            </Button>
          </section>
        </div>

        <DialogFooter className="text-[11px] text-[var(--text-muted)]">
          The AI prepared this. You decide what leaves the studio.
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
