'use client';

import Link from 'next/link';
import { ArrowUpRight, MessageCircle } from 'lucide-react';
import type { AiOpsBand, AiOpsItem } from '@/lib/api';
import { Badge, Button, cn } from '@/components/ui';
import ClientAvatar from '@/components/pt-os/ClientAvatar';

const BAND_TONE: Record<AiOpsBand, 'danger' | 'warning' | 'info' | 'neutral'> = {
  critical: 'danger',
  high: 'warning',
  medium: 'info',
  low: 'neutral',
};

const BAND_LABEL: Record<AiOpsBand, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

const CHANNEL_WARNING: Record<string, string> = {
  not_connected: 'WhatsApp not connected',
  no_recipient: 'No mobile number',
  opted_out: 'Client opted out',
};

export interface QueueCardProps {
  item: AiOpsItem;
  busy?: boolean;
  error?: string | null;
  onOpen: (item: AiOpsItem) => void;
  onApprove: (item: AiOpsItem) => void;
}

export default function QueueCard({ item, busy, error, onOpen, onApprove }: QueueCardProps) {
  const action = item.recommended_action;
  const isMessage = action?.kind === 'message';
  const channelBlocked = item.channel.status !== 'connected';
  const hasDraft = Boolean(item.draft?.body?.trim());
  const approveDisabled = busy || !isMessage || channelBlocked || !hasDraft;

  const shown = item.reasons.slice(0, 2);
  const extra = item.reasons.length - shown.length;

  return (
    <article
      aria-label={`${item.subject.name} — ${BAND_LABEL[item.priority_band]} priority`}
      className="rounded-[18px] border border-[var(--border)] bg-[var(--bg-card)] p-4"
      style={{ boxShadow: 'var(--shadow-xs)' }}
    >
      <div className="flex items-start gap-3">
        <ClientAvatar
          name={item.subject.name}
          photoUrl={item.subject.photo_url}
          alt=""
          className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px] bg-[var(--action-soft)] text-[13px] font-bold text-[var(--action-text)]"
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="truncate text-[15px] font-[750] text-[var(--text-primary)]">
              {item.subject.name}
            </h3>
            {item.subject.type === 'lead' && (
              <Badge tone="info" className="shrink-0">Lead</Badge>
            )}
            <Badge tone={BAND_TONE[item.priority_band]} className="shrink-0">
              {BAND_LABEL[item.priority_band]}
            </Badge>
            <span className="text-[11px] font-semibold tabular-nums text-[var(--text-muted)]">
              {item.priority_score}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {shown.map((reason) => (
              <Badge key={`${reason.code}:${reason.label}`} tone="neutral" className="max-w-full">
                <span className="truncate">{reason.label}</span>
              </Badge>
            ))}
            {extra > 0 && (
              <Badge tone="neutral">+{extra} more</Badge>
            )}
          </div>
        </div>
      </div>

      {action && (
        <p className="mt-3 flex items-center gap-1.5 text-[12.5px] font-medium text-[var(--text-secondary)]">
          <MessageCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {action.label}
        </p>
      )}

      {item.draft?.body ? (
        <p className="mt-2 line-clamp-2 rounded-xl bg-[var(--bg-subtle)] px-3 py-2 text-[12.5px] leading-relaxed text-[var(--text-secondary)]">
          {item.draft.body}
        </p>
      ) : isMessage ? (
        <p className="mt-2 rounded-xl bg-[var(--bg-subtle)] px-3 py-2 text-[12.5px] text-[var(--text-muted)]">
          No draft yet. Open to write one.
        </p>
      ) : null}

      {channelBlocked && isMessage && (
        <p role="status" className="mt-2 text-[12px] font-medium text-[var(--warning-text)]">
          {CHANNEL_WARNING[item.channel.reason ?? ''] ?? 'Sending is unavailable for this client.'}
        </p>
      )}

      {error && (
        <div role="alert" className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-[var(--danger)]/10 px-3 py-2 text-[12.5px] text-[var(--danger-text)]">
          <span className="min-w-0 flex-1">{error}</span>
          {isMessage && !channelBlocked && (
            <Button size="sm" variant="secondary" onClick={() => onApprove(item)} disabled={busy}>
              Retry
            </Button>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="md"
          className="min-h-11 flex-1 sm:min-h-0"
          onClick={() => onOpen(item)}
        >
          Review{isMessage ? ' & send' : ''}
        </Button>

        {isMessage ? (
          <Button
            variant="primary"
            size="md"
            className="min-h-11 flex-1 sm:min-h-0"
            loading={busy}
            disabled={approveDisabled}
            onClick={() => onApprove(item)}
          >
            Approve
          </Button>
        ) : (
          <Link
            href={action?.href ?? (item.subject.type === 'lead' ? '/pt-os/leads' : `/pt-os/clients/${item.subject.id}`)}
            className={cn(
              'inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-[10px] bg-[var(--brand)] px-4 text-[13px] font-semibold text-white',
              'shadow-[0_8px_24px_var(--brand-glow)] sm:min-h-0',
            )}
          >
            Open record
            <ArrowUpRight className="h-4 w-4" aria-hidden />
          </Link>
        )}
      </div>
    </article>
  );
}
