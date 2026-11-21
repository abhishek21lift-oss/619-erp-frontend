'use client';

// Retention — the flow side of the revenue console.
//
// Finance already shows what the platform earns (MRR/ARR/cash). This card
// answers the two questions that decide whether that number grows or shrinks:
// how many studios leave, and how many trials become paying ones.
//
// The churn rate is 30-day cancellations over (paying now + cancelled in the
// window), which the API computes and documents. It arrives as null, never 0,
// when there is no denominator — a platform with no paying studios has no
// churn rate, and printing 0% would read as the opposite signal.
//
// Cancelled-now is a STOCK and is labelled as one. It is not a rate and must
// not be presented beside them without that distinction.

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, HeartPulse, Loader2, Users } from 'lucide-react';
import { api } from '@/lib/api';
import type { SubscriptionMetrics } from '@/lib/api';
import { errorMessage } from '@/lib/forms/errors';
import { useCommandCenterRefresh } from '@/contexts/command-center-refresh';
import { CcCard } from './cc-viz';

export default function RetentionCard() {
  const [data, setData] = useState<SubscriptionMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true); setError('');
    api.superAdmin.subscriptionMetrics()
      .then((r) => setData(r.data))
      .catch((e) => setError(errorMessage(e, 'Could not load retention data')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);
  useCommandCenterRefresh(load);

  const churn = data?.churn;
  const trial = data?.trial_conversion;
  const founders = data?.founders;
  const churnTone = churn?.rate_30d_pct == null ? 'var(--text-muted)'
    : churn.rate_30d_pct >= 10 ? 'var(--danger)'
    : churn.rate_30d_pct >= 5 ? 'var(--warning-text, #b45309)'
    : 'var(--success-text, #047857)';

  return (
    <CcCard
      tone="pink"
      eyebrow="Leakage"
      title="Churn & conversion"
      icon={<HeartPulse size={16} />}
    >
      {loading && !data ? (
        <div className="flex items-center gap-2 py-8 text-[12px]" style={{ color: 'var(--text-muted)' }}>
          <Loader2 size={15} className="animate-spin" /> Reading the last 30 days…
        </div>
      ) : error ? (
        <div className="flex items-start gap-2 rounded-[12px] p-3" style={{ background: 'var(--danger-bg, rgba(220,38,38,0.08))' }}>
          <AlertTriangle size={15} className="mt-0.5 shrink-0" style={{ color: 'var(--danger)' }} />
          <div className="min-w-0 flex-1">
            <p className="text-[12px]" style={{ color: 'var(--danger)' }}>{error}</p>
            <button onClick={load} className="mt-1 text-[11.5px] font-[750] underline" style={{ color: 'var(--danger)' }}>Retry</button>
          </div>
        </div>
      ) : !data ? null : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="min-w-0 rounded-[14px] px-3 py-2.5" style={{ background: 'var(--bg-subtle)' }}>
              <p className="truncate text-[9.5px] font-[800] uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>Churn · 30d</p>
              <p className="mt-0.5 truncate text-[22px] font-[850] tabular-nums" style={{ color: churnTone }}>
                {churn?.rate_30d_pct == null ? '—' : `${churn.rate_30d_pct}%`}
              </p>
              <p className="truncate text-[10px]" style={{ color: 'var(--text-muted)' }}>
                {churn?.rate_30d_pct == null
                  ? 'no paying base to measure'
                  : `${churn?.cancelled_30d ?? 0} cancelled · 90d: ${churn?.cancelled_90d ?? 0}`}
              </p>
            </div>
            <div className="min-w-0 rounded-[14px] px-3 py-2.5" style={{ background: 'var(--bg-subtle)' }}>
              <p className="truncate text-[9.5px] font-[800] uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>Trial → paid</p>
              <p className="mt-0.5 truncate text-[22px] font-[850] tabular-nums" style={{ color: 'var(--text-primary)' }}>
                {trial?.rate_pct == null ? '—' : `${trial.rate_pct}%`}
              </p>
              <p className="truncate text-[10px]" style={{ color: 'var(--text-muted)' }}>
                {trial?.started ? `${trial.converted} of ${trial.started} trials` : 'no trials yet'}
              </p>
            </div>
            <div className="min-w-0 rounded-[14px] px-3 py-2.5" style={{ background: 'var(--bg-subtle)' }}>
              <p className="truncate text-[9.5px] font-[800] uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>Cancelled · now</p>
              <p className="mt-0.5 truncate text-[22px] font-[850] tabular-nums" style={{ color: 'var(--text-primary)' }}>
                {churn?.currently_cancelled ?? 0}
              </p>
              <p className="truncate text-[10px]" style={{ color: 'var(--text-muted)' }}>stock, not a rate</p>
            </div>
            <div className="min-w-0 rounded-[14px] px-3 py-2.5" style={{ background: 'var(--bg-subtle)' }}>
              <p className="truncate text-[9.5px] font-[800] uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>Founder slots</p>
              <p className="mt-0.5 truncate text-[22px] font-[850] tabular-nums" style={{ color: 'var(--text-primary)' }}>
                {founders ? `${founders.slots_remaining}` : '—'}
              </p>
              <p className="truncate text-[10px]" style={{ color: 'var(--text-muted)' }}>
                {founders ? `${founders.granted} of ${founders.limit} granted` : 'unavailable'}
              </p>
            </div>
          </div>

          <div className="rounded-[12px] p-3" style={{ background: 'var(--bg-subtle)' }}>
            <p className="flex items-center gap-1.5 text-[10.5px] font-[750] uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>
              <Users size={11} /> What the rate means
            </p>
            <p className="mt-1 text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Cancellations in the last 30 days over studios paying now plus those that cancelled in the window.
              This approximates the paying base at the start of the window; nothing stores that count as of a past date.
            </p>
          </div>
        </div>
      )}
    </CcCard>
  );
}
