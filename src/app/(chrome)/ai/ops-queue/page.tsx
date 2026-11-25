'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, Inbox, RefreshCw, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import type { AiOpsBand, AiOpsItem, AiOpsQueue, AiOpsReason } from '@/lib/api';
import Guard from '@/components/Guard';
import {
  Badge, Button, EmptyState, FilterChips, PageActions, PageContainer, PageHero, Skeleton,
} from '@/components/ui';
import QueueCard from '@/components/ai-ops/QueueCard';
import ItemSheet, { type DismissReason } from '@/components/ai-ops/ItemSheet';
import { errorMessage } from '@/lib/forms/errors';

type FilterId = 'all' | 'renewals' | 'payments' | 'engagement' | 'training' | 'screening' | 'leads';

const FILTERS: { id: FilterId; label: string; codes?: string[] }[] = [
  { id: 'all', label: 'All' },
  { id: 'renewals', label: 'Renewals', codes: ['term_ending_7', 'term_ending_30', 'term_ended'] },
  { id: 'payments', label: 'Payments', codes: ['dues'] },
  {
    id: 'engagement',
    label: 'Engagement',
    codes: ['never_started', 'silent_21', 'silent_10', 'checkin_missing_7', 'checkin_missing_14'],
  },
  { id: 'training', label: 'Training', codes: ['no_show_recent', 'form_check_pending'] },
  { id: 'screening', label: 'Screening', codes: ['parq_missing', 'consent_missing', 'clearance_expired'] },
  { id: 'leads', label: 'Leads', codes: ['lead_due', 'lead_stale'] },
];

const FAMILIES: { key: AiOpsReason['family']; label: string }[] = [
  { key: 'churn', label: 'Churn' },
  { key: 'engagement', label: 'Engagement' },
  { key: 'training', label: 'Training' },
  { key: 'screening', label: 'Screening' },
  { key: 'leads', label: 'Leads' },
];

const BAND_ORDER: AiOpsBand[] = ['critical', 'high', 'medium', 'low'];

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return 'just now';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'just now';
  return date.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function countsFor(items: AiOpsItem[]): AiOpsQueue['counts'] {
  const by_band = Object.fromEntries(BAND_ORDER.map((band) => [band, 0])) as Record<AiOpsBand, number>;
  const by_family = Object.fromEntries(FAMILIES.map((family) => [family.key, 0])) as Record<AiOpsReason['family'], number>;

  for (const item of items) {
    if (by_band[item.priority_band] !== undefined) by_band[item.priority_band] += 1;
    const families = new Set(item.reasons.map((reason) => reason.family));
    for (const family of families) {
      if (by_family[family] !== undefined) by_family[family] += 1;
    }
  }

  return { total: items.length, by_band, by_family };
}

function noticeForQueue(queue: AiOpsQueue): string | null {
  if (queue.ai.status === 'ok') return null;
  if (queue.ai.status === 'cooldown') return null;
  return queue.ai.message ?? 'AI drafts are unavailable right now.';
}

function isQuotaError(error: unknown): boolean {
  const status = (error as { status?: number })?.status;
  const code = (error as { code?: string })?.code;
  return status === 429 || code === 'AI_QUOTA_EXCEEDED';
}

function matchesFilter(item: AiOpsItem, filter: FilterId): boolean {
  if (filter === 'all') return true;
  const codes = FILTERS.find((entry) => entry.id === filter)?.codes ?? [];
  return item.reasons.some((reason) => codes.includes(reason.code));
}

export default function AiOpsQueuePage() {
  const [queue, setQueue] = useState<AiOpsQueue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterId>('all');
  const [selected, setSelected] = useState<AiOpsItem | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [aiNotice, setAiNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [errorItemId, setErrorItemId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.ai.opsQueue.queue();
      setQueue(result.data);
    } catch (err) {
      setError(errorMessage(err, 'Could not load the queue.'));
    } finally {
      setLoading(false);
    }
  }, []);

  // The deterministic queue renders first. The AI refresh is a second,
  // fire-and-forget step: if the model, the quota or the network is down the
  // trainer still has every item and a template draft to act on.
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const first = await api.ai.opsQueue.queue();
        if (!alive) return;
        setQueue(first.data);
        setLoading(false);
      } catch (err) {
        if (!alive) return;
        setError(errorMessage(err, 'Could not load the queue.'));
        setLoading(false);
        return;
      }

      try {
        const refreshed = await api.ai.opsQueue.refresh();
        if (!alive) return;
        setQueue(refreshed.data);
        setAiNotice(noticeForQueue(refreshed.data));
      } catch (err) {
        if (!alive) return;
        setAiNotice(
          isQuotaError(err)
            ? 'AI drafts are unavailable — the monthly allowance is used up.'
            : errorMessage(err, 'AI drafts are unavailable right now.'),
        );
      }
    })();

    return () => { alive = false; };
  }, []);

  const removeItem = useCallback((id: string) => {
    setQueue((current) => {
      if (!current) return current;
      const items = current.items.filter((item) => item.id !== id);
      return { ...current, items, counts: countsFor(items) };
    });
  }, []);

  const replaceItem = useCallback((item: AiOpsItem) => {
    setQueue((current) => {
      if (!current) return current;
      const items = current.items.map((entry) => (entry.id === item.id ? item : entry));
      return { ...current, items, counts: countsFor(items) };
    });
  }, []);

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    setAiNotice(null);
    setNotice(null);
    try {
      const result = await api.ai.opsQueue.refresh();
      setQueue(result.data);
      setAiNotice(noticeForQueue(result.data));
    } catch (err) {
      setAiNotice(
        isQuotaError(err)
          ? 'AI drafts are unavailable — the monthly allowance is used up.'
          : errorMessage(err, 'AI drafts are unavailable right now.'),
      );
    } finally {
      setRefreshing(false);
    }
  };

  const handleApprove = async (item: AiOpsItem, body?: string) => {
    setBusyId(item.id);
    setActionError(null);
    setErrorItemId(null);
    setNotice(null);
    try {
      const result = await api.ai.opsQueue.approve(item.id, body);
      if (result.data.delivery.status === 'sent') {
        removeItem(item.id);
        setSelected(null);
        setNotice(`Message sent to ${item.subject.name}.`);
      } else {
        // The server reopens the item and keeps the failure on it. Keep the
        // sheet open so the trainer can retry without losing their edit.
        replaceItem(result.data.item);
        setSelected(result.data.item);
        setErrorItemId(item.id);
        setActionError(result.data.delivery.error ?? 'The message could not be sent.');
      }
    } catch (err) {
      const status = (err as { status?: number })?.status;
      const code = (err as { code?: string })?.code;
      if (status === 409 && code === 'ALREADY_ACTIONED') {
        setSelected(null);
        setNotice(errorMessage(err, 'This item was already actioned.'));
        await loadQueue();
      } else {
        setErrorItemId(item.id);
        setActionError(errorMessage(err, 'Could not send the message.'));
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleSnooze = async (item: AiOpsItem, days: 1 | 3 | 7) => {
    setBusyId(item.id);
    setActionError(null);
    setErrorItemId(null);
    try {
      await api.ai.opsQueue.snooze(item.id, days);
      removeItem(item.id);
      setSelected(null);
      setNotice(`Snoozed for ${days} day${days === 1 ? '' : 's'}.`);
    } catch (err) {
      setErrorItemId(item.id);
      setActionError(errorMessage(err, 'Could not snooze this item.'));
    } finally {
      setBusyId(null);
    }
  };

  const handleDismiss = async (item: AiOpsItem, reason: DismissReason) => {
    setBusyId(item.id);
    setActionError(null);
    setErrorItemId(null);
    try {
      await api.ai.opsQueue.dismiss(item.id, reason);
      removeItem(item.id);
      setSelected(null);
      setNotice('Dismissed. It will return only if the facts change.');
    } catch (err) {
      setErrorItemId(item.id);
      setActionError(errorMessage(err, 'Could not dismiss this item.'));
    } finally {
      setBusyId(null);
    }
  };

  const handleResolve = async (item: AiOpsItem) => {
    setBusyId(item.id);
    setActionError(null);
    setErrorItemId(null);
    try {
      await api.ai.opsQueue.resolve(item.id);
      removeItem(item.id);
      setSelected(null);
      setNotice('Marked done.');
    } catch (err) {
      setErrorItemId(item.id);
      setActionError(errorMessage(err, 'Could not mark this item done.'));
    } finally {
      setBusyId(null);
    }
  };

  // Closing the sheet returns focus to the card that opened it. The page opens
  // the dialog from state, not a DialogTrigger, so Radix has no trigger to
  // restore to on its own; without this, focus falls back to <body> and a
  // keyboard user loses their place in the queue.
  const closeSheet = useCallback(() => {
    const id = selected?.id ?? null;
    setSelected(null);
    setActionError(null);
    setErrorItemId(null);
    if (!id) return;
    requestAnimationFrame(() => {
      document.querySelector<HTMLButtonElement>(`[data-ops-open="${id}"]`)?.focus();
    });
  }, [selected]);

  const filtered = useMemo(
    () => (queue ? queue.items.filter((item) => matchesFilter(item, filter)) : []),
    [queue, filter],
  );

  const chips = useMemo(() => {
    const items = queue?.items ?? [];
    return FILTERS.map((entry) => ({
      id: entry.id,
      label: `${entry.label} ${items.filter((item) => matchesFilter(item, entry.id)).length}`,
    }));
  }, [queue]);

  const counts = queue?.counts;
  const aiBanner = aiNotice ?? (queue ? noticeForQueue(queue) : null);

  return (
    <Guard role="trainer">
      <PageContainer>
        <PageHero
          compact
          icon={<Inbox size={20} />}
          title="AI Ops Queue"
          subtitle={queue ? `As of ${formatWhen(queue.as_of)}` : 'Who needs you today, and why'}
        />

        <PageActions>
          <Button
            variant="secondary"
            size="sm"
            loading={refreshing}
            onClick={handleRefresh}
            iconLeft={!refreshing ? <RefreshCw className="h-3.5 w-3.5" aria-hidden /> : undefined}
          >
            Refresh
          </Button>
          <span className="text-[11.5px] text-[var(--text-muted)]">
            Refresh asks the AI for a new brief and drafts.
          </span>
        </PageActions>

        {aiBanner && (
          <div role="status" className="flex items-start gap-2 rounded-[16px] border border-[var(--warning)]/30 bg-[var(--warning)]/10 px-4 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--warning-text)]" aria-hidden />
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-[var(--warning-text)]">{aiBanner}</p>
              <p className="mt-0.5 text-[12px] text-[var(--text-secondary)]">
                Showing template drafts. You can still review and send.
              </p>
            </div>
          </div>
        )}

        {notice && (
          <div role="status" className="flex items-center gap-2 rounded-[16px] border border-[var(--success)]/30 bg-[var(--success)]/10 px-4 py-3 text-[13px] font-medium text-[var(--success-text)]">
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
            {notice}
          </div>
        )}

        {queue?.brief && (
          <section aria-label="Brief" className="rounded-[18px] border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <div className="flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              {queue.brief.source === 'template' ? 'Summary' : 'AI brief'}
            </div>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-[var(--text-primary)]">
              {queue.brief.text}
            </p>
          </section>
        )}

        {counts && (
          <section aria-label="Queue summary" className="flex flex-wrap items-center gap-1.5 rounded-[16px] border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2.5">
            <Badge tone="danger">Critical {counts.by_band.critical}</Badge>
            <Badge tone="warning">High {counts.by_band.high}</Badge>
            <Badge tone="neutral">Total {counts.total}</Badge>
            <span className="mx-1 hidden h-4 w-px bg-[var(--border)] sm:block" aria-hidden />
            {FAMILIES.map((family) => (
              <Badge key={family.key} tone="neutral">
                {family.label} {counts.by_family[family.key]}
              </Badge>
            ))}
          </section>
        )}

        {queue && queue.items.length > 0 && (
          <FilterChips chips={chips} value={filter} onChange={(id) => setFilter(id as FilterId)} />
        )}

        {error && !queue ? (
          <div role="alert" className="rounded-[18px] border border-[var(--danger)]/30 bg-[var(--danger)]/10 p-5 text-center">
            <p className="text-[13px] font-medium text-[var(--danger-text)]">{error}</p>
            <Button variant="secondary" size="md" className="mt-3" onClick={loadQueue} disabled={loading}>
              Retry
            </Button>
          </div>
        ) : loading && !queue ? (
          <div className="space-y-3" aria-busy="true" aria-label="Loading queue">
            {[0, 1, 2].map((index) => (
              <div key={index} className="rounded-[18px] border border-[var(--border)] bg-[var(--bg-card)] p-4">
                <div className="flex items-center gap-3">
                  <Skeleton variant="circle" width={44} height={44} />
                  <div className="flex-1 space-y-2">
                    <Skeleton width="40%" height={14} />
                    <Skeleton width="65%" height={12} />
                  </div>
                </div>
                <Skeleton className="mt-3" height={44} />
                <div className="mt-3 flex gap-2">
                  <Skeleton height={40} className="flex-1" />
                  <Skeleton height={40} className="flex-1" />
                </div>
              </div>
            ))}
          </div>
        ) : !queue || queue.items.length === 0 ? (
          <EmptyState
            icon={<Inbox size={22} />}
            title="Nothing needs you right now"
            description="When a client or lead needs attention, they will appear here with the reason and a prepared next step."
            action={
              <Link
                href="/pt-os/clients"
                className="inline-flex min-h-11 items-center rounded-[10px] bg-[var(--brand)] px-4 text-[13px] font-semibold text-white"
              >
                Open client roster
              </Link>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Inbox size={22} />}
            title="Nothing in this filter"
            description="Try another filter, or clear it to see everything that needs attention."
            action={<Button variant="secondary" size="md" onClick={() => setFilter('all')}>Show all</Button>}
          />
        ) : (
          <div className="space-y-3">
            {filtered.map((item) => (
              <QueueCard
                key={item.id}
                item={item}
                busy={busyId === item.id}
                error={errorItemId === item.id ? actionError : null}
                onOpen={(entry) => { setSelected(entry); setActionError(null); setErrorItemId(null); }}
                onApprove={handleApprove}
              />
            ))}
          </div>
        )}

        <ItemSheet
          item={selected}
          open={Boolean(selected)}
          onOpenChange={(open) => {
            if (!open) closeSheet();
          }}
          onApprove={handleApprove}
          onSnooze={handleSnooze}
          onDismiss={handleDismiss}
          onResolve={handleResolve}
          busy={Boolean(selected && busyId === selected.id)}
          error={selected && errorItemId === selected.id ? actionError : null}
        />
      </PageContainer>
    </Guard>
  );
}
