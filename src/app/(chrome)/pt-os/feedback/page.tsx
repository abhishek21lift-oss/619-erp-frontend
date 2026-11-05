'use client';
/**
 * Trainer — Session feedback.
 *
 * The studio's side of the post-session rating: what clients answered, the
 * weighted score, and the sessions that need a conversation. Only submitted
 * feedback is counted — a pending request is not a bad rating.
 *
 * The KPIs and the trend come from /feedback/summary, which aggregates in
 * SQL over the whole studio. The list below is one filtered page of rows; it
 * is never summed to produce the numbers above it.
 */

import { useMemo, useState } from 'react';
import {
  AlertTriangle, ChevronDown, MessageSquare, Star, TrendingUp,
} from 'lucide-react';
import Guard from '@/components/Guard';
import {
  Button, Card, CardBody, CardHeader, CardTitle, EmptyState, FormField, KpiCard,
  PageActions, PageContainer, PageHero, SelectInput, Skeleton, TextInput,
} from '@/components/ui';
import { api } from '@/lib/api';
import type { SessionFeedback } from '@/lib/api';
import { useAsync } from '@/lib/use-async';

const ANSWER_LABELS: Record<string, string> = {
  excellent: 'Excellent', good: 'Good', average: 'Average', poor: 'Poor',
  always: 'Always', mostly: 'Mostly', sometimes: 'Sometimes', no: 'No',
  perfect: 'Perfect', too_easy: 'Too easy', too_hard: 'Too hard',
  absolutely: 'Absolutely', somewhat: 'Somewhat', not_really: 'Not really',
};

const scoreOf = (f: SessionFeedback): number | null =>
  f.score == null ? null : Number(f.score);

const scoreText = (f: SessionFeedback): string => {
  const s = scoreOf(f);
  return s == null ? '—' : s.toFixed(2);
};

const day = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const monthLabel = (ym: string): string => {
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return ym;
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short' });
};

function Stars({ value, size = 13 }: { value: number | null; size?: number }) {
  const filled = value == null ? 0 : Math.round(value);
  return (
    <span role="img" className="inline-flex items-center gap-0.5" aria-label={value == null ? 'No rating' : `${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          aria-hidden
          style={{
            color: n <= filled ? '#f59e0b' : 'var(--border-2)',
            fill: n <= filled ? '#f59e0b' : 'transparent',
          }}
        />
      ))}
    </span>
  );
}

export default function TrainerFeedbackPage() {
  return (
    <Guard role="trainer">
      <PageContainer>
        <FeedbackBody />
      </PageContainer>
    </Guard>
  );
}

function FeedbackBody() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [band, setBand] = useState<'all' | 'five' | 'low'>('all');
  const [clientId, setClientId] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const filters = useMemo(() => ({
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    ...(clientId ? { client_id: clientId } : {}),
    ...(band === 'five' ? { min_score: 4.5 } : {}),
    ...(band === 'low' ? { flagged: true } : {}),
  }), [from, to, clientId, band]);

  const summary = useAsync(async () => (await api.pt.feedbackSummary()).data, []);
  const list = useAsync(async () => api.pt.feedback(filters), [from, to, clientId, band]);
  const clients = useAsync(async () => (await api.pt.clients({ limit: 200 })).data as Array<{ id: string; name: string }>, []);

  const s = summary.data;
  const rows = list.data?.data ?? [];
  const total = list.data?.total ?? 0;
  const maxBucket = Math.max(1, ...(s?.distribution ?? []).map((d) => d.count));
  const trend = [...(s?.trend ?? [])].reverse();
  const maxTrend = Math.max(5, ...trend.map((t) => t.average));

  const retry = () => {
    void summary.refetch();
    void list.refetch();
  };

  return (
    <>
      <PageHero
        icon={<Star size={20} />}
        title="Trainer Feedback"
        subtitle="What clients said after their sessions, and what needs a follow-up."
      />
      <PageActions>
        <Button size="sm" variant="secondary" onClick={retry}>Refresh</Button>
      </PageActions>

      {(summary.error || list.error) && (
        <div role="alert" className="flex items-center gap-2 rounded-[14px] px-4 py-2.5 text-[12.5px]"
          style={{ background: 'var(--danger-soft)', color: 'var(--danger-text)' }}>
          <span className="flex-1">Feedback could not be loaded.</span>
          <button type="button" onClick={retry} className="font-[750]">Retry</button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Average rating" value={s?.average_score == null ? '—' : `${s.average_score.toFixed(2)}/5`}
          hint={s ? `${s.rated_count} rated session${s.rated_count === 1 ? '' : 's'}` : undefined}
          icon={<Star size={16} />} accent="amber" loading={summary.loading}
        />
        <KpiCard
          label="Rated sessions" value={s?.rated_count ?? '—'}
          hint={s ? `${s.pending_count} awaiting feedback` : undefined}
          icon={<MessageSquare size={16} />} accent="blue" loading={summary.loading}
        />
        <KpiCard
          label="Five-star sessions" value={s?.five_star_count ?? '—'}
          hint="Scored 4.5 or above" icon={<TrendingUp size={16} />} accent="emerald"
          loading={summary.loading}
        />
        <KpiCard
          label="Needs attention" value={s?.low_rating_count ?? '—'}
          hint="Scored 3.0 or below" icon={<AlertTriangle size={16} />} accent="coral"
          loading={summary.loading}
        />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Star distribution</CardTitle></CardHeader>
          <CardBody className="space-y-2">
            {!s && summary.loading && <Skeleton className="h-32 rounded-[12px]" />}
            {(s?.distribution ?? []).slice().reverse().map((bucket) => (
              <div key={bucket.stars} className="flex items-center gap-2.5">
                <span className="w-7 text-right text-[11px] font-[700]" style={{ color: 'var(--text-muted)' }}>
                  {bucket.stars}★
                </span>
                <span className="h-2.5 flex-1 overflow-hidden rounded-full" style={{ background: 'var(--bg-subtle)' }}>
                  <span className="block h-full rounded-full"
                    style={{
                      width: `${Math.round((bucket.count / maxBucket) * 100)}%`,
                      background: bucket.stars <= 3 ? 'var(--danger)' : 'var(--warning)',
                    }} />
                </span>
                <span className="w-6 text-right text-[11.5px] font-[750]" style={{ color: 'var(--text-primary)' }}>
                  {bucket.count}
                </span>
              </div>
            ))}
            {s && s.rated_count === 0 && (
              <p className="pt-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                No submitted ratings yet.
              </p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader><CardTitle>Average by month</CardTitle></CardHeader>
          <CardBody>
            {!s && summary.loading && <Skeleton className="h-32 rounded-[12px]" />}
            {s && trend.length === 0 && (
              <p className="py-6 text-center text-[12px]" style={{ color: 'var(--text-muted)' }}>
                The trend appears after the first submitted rating.
              </p>
            )}
            {trend.length > 0 && (
              <div className="flex h-28 items-end gap-2">
                {trend.map((t) => (
                  <div key={t.month} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                    <span className="text-[10.5px] font-[750]" style={{ color: 'var(--text-primary)' }}>
                      {t.average.toFixed(1)}
                    </span>
                    <span className="w-full rounded-t-[6px]"
                      style={{
                        height: `${Math.max(4, (t.average / maxTrend) * 72)}px`,
                        background: 'var(--gradient-brand)',
                        opacity: 0.85,
                      }} />
                    <span className="text-[10px] font-[650]" style={{ color: 'var(--text-muted)' }}>
                      {monthLabel(t.month)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader><CardTitle>Ratings</CardTitle></CardHeader>
        <CardBody className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <FormField label="Client">
              <SelectInput value={clientId} onChange={(e) => setClientId(e.target.value)}>
                <option value="">All clients</option>
                {(clients.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </SelectInput>
            </FormField>
            <FormField label="From">
              <TextInput type="date" value={from} max={to || undefined}
                onChange={(e) => setFrom(e.target.value)} />
            </FormField>
            <FormField label="To">
              <TextInput type="date" value={to} min={from || undefined}
                onChange={(e) => setTo(e.target.value)} />
            </FormField>
            <FormField label="Score">
              <SelectInput value={band} onChange={(e) => setBand(e.target.value as typeof band)}>
                <option value="all">All scores</option>
                <option value="five">Five-star (4.5+)</option>
                <option value="low">Needs attention (3.0 and below)</option>
              </SelectInput>
            </FormField>
          </div>

          {list.loading && !list.data && (
            <div className="space-y-2">
              <Skeleton className="h-16 rounded-[14px]" />
              <Skeleton className="h-16 rounded-[14px]" />
              <Skeleton className="h-16 rounded-[14px]" />
            </div>
          )}

          {list.data && rows.length === 0 && (
            <EmptyState
              icon={<MessageSquare size={20} />}
              title="No feedback matches these filters."
              description={from || to || clientId || band !== 'all'
                ? 'Widen the date range or clear the score filter.'
                : 'Ratings appear here when clients answer after a completed session.'}
            />
          )}

          <ul className="space-y-2">
            {rows.map((row) => {
              const low = (scoreOf(row) ?? 5) <= 3;
              const open = openId === row.id;
              return (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : row.id)}
                    aria-expanded={open}
                    className="w-full rounded-[14px] px-3.5 py-3 text-left"
                    style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-[750]" style={{ color: 'var(--text-primary)' }}>
                          {row.client_name}
                          {row.session_title ? <span className="font-[600]" style={{ color: 'var(--text-muted)' }}> · {row.session_title}</span> : null}
                        </p>
                        <p className="mt-0.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                          {day(row.completed_at)}
                          {row.trainer_name ? ` · ${row.trainer_name}` : ''}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <Stars value={scoreOf(row)} />
                        <span className="text-[12.5px] font-[800]" style={{ color: low ? 'var(--danger-text)' : 'var(--text-primary)' }}>
                          {scoreText(row)}
                        </span>
                        {low && (
                          <span className="rounded-full px-1.5 py-0.5 text-[9.5px] font-[800]"
                            style={{ background: 'var(--danger-soft)', color: 'var(--danger-text)' }}>
                            Flag
                          </span>
                        )}
                        <ChevronDown size={14} aria-hidden
                          style={{ color: 'var(--text-muted)', transform: open ? 'rotate(180deg)' : undefined }} />
                      </div>
                    </div>

                    {open && (
                      <div className="mt-3 grid gap-2 border-t pt-3 sm:grid-cols-2"
                        style={{ borderColor: 'var(--border)' }}>
                        {[
                          ['Trainer behaviour', row.trainer_behaviour],
                          ['Form and technique', row.form_technique],
                          ['Workout intensity', row.workout_intensity],
                          ['Motivation', row.motivation_guidance],
                        ].map(([label, value]) => (
                          <div key={label} className="flex items-baseline justify-between gap-3">
                            <span className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>{label}</span>
                            <span className="text-[12px] font-[700]" style={{ color: 'var(--text-primary)' }}>
                              {value ? ANSWER_LABELS[value] ?? value : '—'}
                            </span>
                          </div>
                        ))}
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>Overall</span>
                          <Stars value={row.overall_stars} />
                        </div>
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>Session score</span>
                          <span className="text-[12px] font-[800]" style={{ color: 'var(--text-primary)' }}>
                            {scoreText(row)} / 5
                          </span>
                        </div>
                        {row.additional_feedback && (
                          <p className="sm:col-span-2 rounded-[10px] px-3 py-2 text-[12px] leading-relaxed"
                            style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)' }}>
                            “{row.additional_feedback}”
                          </p>
                        )}
                      </div>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          {list.data && rows.length > 0 && (
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Showing {rows.length} of {total} rating{total === 1 ? '' : 's'}.
            </p>
          )}
        </CardBody>
      </Card>
    </>
  );
}
