'use client';

/**
 * Who may leave, why, and what to do next.
 *
 * The Today card lists the sweep's signals. This page ranks the same roster
 * against money and term, drops the clients the trainer already handled, and
 * gives each remaining client one next action. The list is deterministic:
 * every point traces to a reason, and the page never asks a model to compute
 * one. The model is offered only through **Explain this list**, one call per
 * press — a refresh loop cannot spend tokens.
 */

import { useState } from 'react';
import { AlertTriangle, RotateCw, Sparkles } from 'lucide-react';
import Guard from '@/components/Guard';
import { Button, Disclosure, PageContainer, PageHero, Skeleton } from '@/components/ui';
import ChurnRow from '@/components/pt-os/ChurnRow';
import { useAsync } from '@/lib/use-async';
import { useToast } from '@/lib/toast';
import { errorMessage } from '@/lib/forms/errors';
import { api } from '@/lib/api';
import type { ChurnInsight, ChurnRiskResult } from '@/lib/api';

const fmtDay = (iso: string) => {
  const d = new Date(`${iso}T00:00:00Z`);
  return isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
};

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex min-w-[74px] flex-col">
      <span className="text-[22px] font-[800] leading-none tabular-nums" style={{ color: 'var(--text-primary)' }}>
        {value}
      </span>
      <span className="mt-1 text-[9.5px] font-[750] uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
    </div>
  );
}

export default function AtRiskClientsPage() {
  const { toast } = useToast();
  const churn = useAsync<ChurnRiskResult>(async () => {
    const res = await api.pt.churnRisk();
    return res.data;
  }, []);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [insight, setInsight] = useState<ChurnInsight | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightError, setInsightError] = useState<string | null>(null);

  const mark = async (id: string, outcome: 'contacted' | 'snoozed', date?: string) => {
    setBusyId(id);
    try {
      await api.pt.markChurnFollowup(id, {
        outcome,
        ...(date ? { snooze_until: date } : {}),
      });
      toast.success(
        outcome === 'contacted'
          ? 'Marked contacted — hidden for seven days.'
          : 'Snoozed — it returns early only if the risk rises.',
      );
      await churn.refetch();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not update this client.'));
    } finally {
      setBusyId(null);
    }
  };

  const explain = async () => {
    setInsightLoading(true);
    setInsightError(null);
    try {
      const res = await api.pt.churnInsight();
      setInsight(res.data);
    } catch (err) {
      setInsightError(errorMessage(err, 'The briefing did not come back. Try again.'));
    } finally {
      setInsightLoading(false);
    }
  };

  const result = churn.data;
  const rows = result?.rows ?? [];

  return (
    <Guard role="trainer">
      <PageContainer>
        <PageHero
          icon={<AlertTriangle size={20} />}
          title="At-risk Clients"
          subtitle="Ranked by who is most likely to leave, with the reason and one next action."
        />

        {churn.loading && !result && (
          <div className="mt-6 space-y-3">
            <Skeleton className="h-[92px] rounded-[22px]" />
            <Skeleton className="h-[160px] rounded-[22px]" />
            <Skeleton className="h-[160px] rounded-[22px]" />
          </div>
        )}

        {churn.error && !result && (
          <div
            className="mt-6 flex items-center gap-3 rounded-[22px] px-4 py-4 sm:px-5"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <span
              aria-hidden
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
              style={{ background: 'rgba(217,119,6,0.14)', color: 'var(--warning-text)' }}
            >
              <AlertTriangle size={16} />
            </span>
            <p className="min-w-0 flex-1 text-[12.5px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              The risk list did not come back. Nobody has been cleared &mdash; this list is unknown, not empty.
            </p>
            <Button size="sm" variant="secondary" onClick={() => void churn.refetch()}>
              <RotateCw size={13} aria-hidden /> Retry
            </Button>
          </div>
        )}

        {result && (
          <>
            <section
              className="mt-6 rounded-[22px] px-4 py-4 sm:px-5"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}
              aria-label="Sweep summary"
            >
              <div className="flex flex-wrap items-center gap-x-7 gap-y-3">
                <Stat value={result.assessed} label="assessed" />
                <Stat value={result.flagged} label="flagged" />
                <Stat value={result.bands.critical ?? 0} label="critical" />
                <Stat value={result.bands.high ?? 0} label="high" />
                <span className="ml-auto text-[11px] font-[650]" style={{ color: 'var(--text-muted)' }}>
                  as of {fmtDay(result.as_of)}
                </span>
              </div>

              {result.flagged > 0 && (
                <div className="mt-3 border-t border-[var(--border)] pt-3">
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={insightLoading}
                    disabled={insightLoading}
                    onClick={() => void explain()}
                    iconLeft={<Sparkles size={13} aria-hidden />}
                  >
                    {insight ? 'Explain again' : 'Explain this list'}
                  </Button>

                  {insightError && (
                    <p role="alert" className="mt-2 text-[12px] leading-relaxed" style={{ color: 'var(--danger-text)' }}>
                      {insightError}
                    </p>
                  )}

                  {insight && (
                    <div className="mt-3">
                      <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        {insight.summary}
                      </p>
                      {insight.themes.length > 0 && (
                        <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Themes">
                          {insight.themes.map((t) => (
                            <li
                              key={t}
                              className="rounded-full px-2.5 py-[3px] text-[11px] font-[650]"
                              style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}
                            >
                              {t}
                            </li>
                          ))}
                        </ul>
                      )}
                      {insight.this_week.length > 0 && (
                        <ul className="mt-2 list-disc space-y-0.5 pl-5 text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
                          {insight.this_week.map((t) => <li key={t}>{t}</li>)}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              )}
            </section>

            {rows.length === 0 ? (
              <div
                className="mt-4 flex items-start gap-3 rounded-[22px] px-4 py-5 sm:px-5"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
              >
                <span
                  aria-hidden
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                  style={{ background: 'rgba(16,185,129,0.14)', color: 'var(--success-text)' }}
                >
                  <Sparkles size={16} />
                </span>
                <p className="text-[12.5px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {result.assessed === 0
                    ? 'No clients on the roster to sweep.'
                    : `Swept ${result.assessed} client${result.assessed === 1 ? '' : 's'} — nothing to flag today.`}
                </p>
              </div>
            ) : (
              <section
                className="mt-4 overflow-hidden rounded-[22px]"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}
                aria-label="Clients at risk"
              >
                {rows.map((row) => (
                  <ChurnRow key={row.client_id} row={row} onMark={mark} busy={busyId === row.client_id} />
                ))}
              </section>
            )}

            {result.handled.length > 0 && (
              <div className="mt-4 px-1">
                <Disclosure summary={`Handled recently (${result.handled.length})`}>
                  <ul className="space-y-1.5">
                    {result.handled.map((row) => (
                      <li key={row.client_id} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-[700]" style={{ color: 'var(--text-secondary)' }}>
                          {row.client_name}
                        </span>
                        <span>
                          {row.outcome} until {row.hide_until}
                        </span>
                        {row.risk_increased && (
                          <span className="rounded-full px-2 py-[2px] text-[10.5px] font-[700]"
                            style={{ background: 'rgba(217,119,6,0.14)', color: 'var(--warning-text)' }}>
                            risk rose after you acted
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </Disclosure>
              </div>
            )}
          </>
        )}
      </PageContainer>
    </Guard>
  );
}
