'use client';
/**
 * Trainer — Form checks.
 *
 * The other half of the member's video upload: a queue of lifts to watch, the
 * video itself, and comments pinned to the second they are about. Marking a
 * check reviewed is an explicit claim, separate from leaving a comment — a
 * half-written review should stay in the queue.
 */

import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2, MessageSquarePlus, Play, Video } from 'lucide-react';
import Guard from '@/components/Guard';
import { Button, PageContainer, PageHero, Skeleton } from '@/components/ui';
import { useAsync } from '@/lib/use-async';
import { useToast } from '@/lib/toast';
import { errorMessage } from '@/lib/forms/errors';
import { api } from '@/lib/api';
import type { FormCheckComment, TrainerFormCheck } from '@/lib/api';

type StatusFilter = 'pending' | 'reviewed' | 'all';

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'all', label: 'All' },
];

const clock = (seconds: number) => {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

const day = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

export default function TrainerFormChecksPage() {
  const { toast } = useToast();
  const [status, setStatus] = useState<StatusFilter>('pending');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const queue = useAsync<TrainerFormCheck[]>(
    async () => (await api.pt.formChecks(status)).data,
    [status],
  );
  const detail = useAsync<TrainerFormCheck | null>(
    async () => (selectedId ? (await api.pt.formCheck(selectedId)).data : null),
    [selectedId],
  );

  const [atSeconds, setAtSeconds] = useState(0);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setAtSeconds(0);
    setComment('');
  }, [selectedId]);

  const rows = queue.data ?? [];

  const addComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !comment.trim()) return;
    setSaving(true);
    try {
      await api.pt.commentFormCheck(selectedId, Math.max(0, Math.floor(atSeconds)), comment.trim());
      setComment('');
      toast.success('Comment added');
      await Promise.all([detail.refetch(), queue.refetch()]);
    } catch (err) {
      toast.error(errorMessage(err, 'The comment did not save. Try again.'));
    } finally {
      setSaving(false);
    }
  };

  const markReviewed = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      await api.pt.reviewFormCheck(selectedId);
      toast.success('Marked reviewed');
      await Promise.all([detail.refetch(), queue.refetch()]);
    } catch (err) {
      toast.error(errorMessage(err, 'Could not mark it reviewed. Try again.'));
    } finally {
      setSaving(false);
    }
  };

  const useCurrentTime = () => {
    const el = video.current;
    if (el) setAtSeconds(Math.floor(el.currentTime));
  };

  const seek = (c: FormCheckComment) => {
    const el = video.current;
    if (!el) return;
    el.currentTime = c.at_seconds;
    void el.play().catch(() => { /* position is still set if autoplay is refused */ });
  };

  const check = detail.data;
  const comments = check?.comments ?? [];

  return (
    <Guard role="trainer">
      <PageContainer>
        <PageHero
          icon={<Video size={20} />}
          title="Form Checks"
          subtitle="Watch a client's lift and comment at the exact second it needs work."
        />

        <div className="mt-5 flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatus(f.value)}
              aria-pressed={status === f.value}
              className="rounded-full px-3 py-1.5 text-[11.5px] font-[700]"
              style={status === f.value
                ? { background: 'var(--gradient-brand)', color: 'white' }
                : { background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-5">
          {/* Queue */}
          <section className="lg:col-span-2" aria-label="Review queue">
            {queue.loading && !queue.data && (
              <div className="space-y-2">
                <Skeleton className="h-[76px] rounded-[18px]" />
                <Skeleton className="h-[76px] rounded-[18px]" />
              </div>
            )}

            {queue.error && !queue.data && (
              <div className="rounded-[18px] px-4 py-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <p className="text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
                  The queue did not come back.
                </p>
                <Button size="sm" variant="secondary" className="mt-2" onClick={() => void queue.refetch()}>
                  Retry
                </Button>
              </div>
            )}

            {queue.data && rows.length === 0 && (
              <div className="rounded-[18px] px-4 py-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <p className="text-[13px] font-[700]" style={{ color: 'var(--text-primary)' }}>
                  {status === 'pending' ? 'Nothing waiting for review.' : 'Nothing here.'}
                </p>
                <p className="mt-1 text-[12px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  {status === 'pending'
                    ? 'New client videos will appear here.'
                    : 'Try another filter.'}
                </p>
              </div>
            )}

            <ul className="space-y-2">
              {rows.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(row.id)}
                    aria-current={selectedId === row.id ? 'true' : undefined}
                    className="w-full rounded-[18px] px-4 py-3 text-left"
                    style={{
                      background: 'var(--bg-card)',
                      border: `1px solid ${selectedId === row.id ? 'var(--accent, #A33757)' : 'var(--border)'}`,
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[13.5px] font-[750]" style={{ color: 'var(--text-primary)' }}>
                          {row.exercise}
                        </p>
                        <p className="mt-0.5 truncate text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
                          {row.client_name} · {day(row.created_at)}
                        </p>
                      </div>
                      {row.status === 'reviewed' ? (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-[750]"
                          style={{ background: 'rgba(16,185,129,0.14)', color: 'var(--success-text)' }}>
                          <CheckCircle2 size={10} /> Reviewed
                        </span>
                      ) : (
                        <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-[750]"
                          style={{ background: 'rgba(245,158,11,0.14)', color: 'var(--warning-text)' }}>
                          Pending
                        </span>
                      )}
                    </div>
                    {(row.comment_count ?? 0) > 0 && (
                      <p className="mt-1.5 text-[10.5px] font-[650]" style={{ color: 'var(--text-muted)' }}>
                        {row.comment_count} comment{row.comment_count === 1 ? '' : 's'}
                      </p>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </section>

          {/* Review */}
          <section className="lg:col-span-3" aria-label="Review">
            {!selectedId && (
              <div className="flex min-h-[220px] items-center justify-center rounded-[22px] px-5 py-8 text-center"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div>
                  <Video size={26} className="mx-auto" style={{ color: 'var(--text-muted)' }} />
                  <p className="mt-2 text-[13px] font-[700]" style={{ color: 'var(--text-primary)' }}>
                    Pick a video from the queue
                  </p>
                  <p className="mt-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                    The clip and the client&apos;s note open here.
                  </p>
                </div>
              </div>
            )}

            {selectedId && detail.loading && !check && (
              <Skeleton className="h-[320px] rounded-[22px]" />
            )}

            {selectedId && detail.error && !check && (
              <div className="rounded-[22px] px-4 py-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <p className="text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
                  This check did not load.
                </p>
                <Button size="sm" variant="secondary" className="mt-2" onClick={() => void detail.refetch()}>
                  Retry
                </Button>
              </div>
            )}

            {check && (
              <div className="rounded-[22px] p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="text-[16px] font-[800]" style={{ color: 'var(--text-primary)' }}>
                      {check.exercise}
                    </h2>
                    <p className="mt-0.5 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                      {check.client_name} · {day(check.created_at)}
                    </p>
                  </div>
                  {check.status === 'reviewed' ? (
                    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-[750]"
                      style={{ background: 'rgba(16,185,129,0.14)', color: 'var(--success-text)' }}>
                      <CheckCircle2 size={11} /> Reviewed
                    </span>
                  ) : (
                    <Button size="sm" variant="secondary" loading={saving} onClick={() => void markReviewed()}>
                      Mark reviewed
                    </Button>
                  )}
                </div>

                {check.note && (
                  <p className="mt-2 rounded-[12px] px-3 py-2 text-[12.5px] leading-relaxed"
                    style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>
                    {check.note}
                  </p>
                )}

                {/* eslint-disable-next-line jsx-a11y/media-has-caption -- filmed on a phone; no caption track exists */}
                <video ref={video} src={check.video_url} controls playsInline preload="metadata"
                  className="mt-3 w-full rounded-[14px] bg-black" />

                <div className="mt-4 border-t border-[var(--border)] pt-3">
                  <p className="text-[10px] font-[780] uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>
                    Comments
                  </p>
                  {comments.length === 0 ? (
                    <p className="mt-1.5 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                      No comments yet.
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-1.5">
                      {comments.map((c) => (
                        <li key={c.id}>
                          <button type="button" onClick={() => seek(c)}
                            className="flex w-full items-start gap-2 rounded-[11px] px-2.5 py-2 text-left"
                            style={{ background: 'var(--bg-subtle)' }}>
                            <span className="mt-[1px] inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-[800] tabular-nums"
                              style={{ background: 'rgba(59,130,246,0.14)', color: 'var(--accent, #2563EB)' }}>
                              <Play size={9} /> {clock(c.at_seconds)}
                            </span>
                            <span className="text-[12.5px] leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                              {c.body}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  <form onSubmit={addComment} className="mt-3 space-y-2">
                    <div className="flex items-end gap-2">
                      <div className="w-[104px]">
                        <label htmlFor="fc-at" className="mb-1 block text-[10.5px] font-[700]" style={{ color: 'var(--text-muted)' }}>
                          At second
                        </label>
                        <input
                          id="fc-at" type="number" min={0} step={1} value={atSeconds}
                          onChange={(e) => setAtSeconds(Math.max(0, Number(e.target.value) || 0))}
                          className="w-full rounded-[10px] px-2.5 py-2 text-[12.5px] tabular-nums outline-none"
                          style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                        />
                      </div>
                      <Button type="button" size="sm" variant="ghost" onClick={useCurrentTime}>
                        Use current time
                      </Button>
                      <span className="pb-2 text-[11px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
                        {clock(atSeconds)}
                      </span>
                    </div>
                    <label htmlFor="fc-comment" className="sr-only">Comment</label>
                    <textarea
                      id="fc-comment" value={comment} onChange={(e) => setComment(e.target.value)}
                      rows={2} maxLength={1000} placeholder="e.g. Right knee tracks in on the way up."
                      className="w-full resize-none rounded-[11px] px-3 py-2 text-[12.5px] outline-none"
                      style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    />
                    <Button type="submit" size="sm" disabled={saving || !comment.trim()}
                      iconLeft={saving ? <Loader2 size={13} className="animate-spin" /> : <MessageSquarePlus size={13} />}>
                      Add comment
                    </Button>
                  </form>
                </div>
              </div>
            )}
          </section>
        </div>
      </PageContainer>
    </Guard>
  );
}
