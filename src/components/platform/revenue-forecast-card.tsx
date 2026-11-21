'use client';

// Revenue forecast — the one money card on the Revenue console that looks
// forward. Two separate models are shown side by side because they answer
// different questions and blending them would hide which one produced a
// number:
//
//   * Cash trend — least squares over completed months of collected payments.
//     Lumpy by nature (annual plans), so R² and the residual band are printed.
//   * MRR run-rate — current MRR compounded by observed net studio growth.
//     A scenario, labelled as one, clamped to ±20%/month.
//
// A model with too little history returns no forecast and a reason; the card
// renders that reason rather than a line through zero.

import { useCallback, useEffect, useState } from 'react';
import { Loader2, TrendingUp, AlertTriangle, Info } from 'lucide-react';
import { api } from '@/lib/api';
import type { RevenueForecast } from '@/lib/api';
import { errorMessage } from '@/lib/forms/errors';
import { CcCard, inrCompact } from './cc-viz';

const HORIZONS = [3, 6, 12] as const;

export default function RevenueForecastCard() {
  const [months, setMonths] = useState<number>(6);
  const [data, setData] = useState<RevenueForecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true); setError('');
    api.superAdmin.revenueForecast(months)
      .then((r) => setData(r.data))
      .catch((e) => setError(errorMessage(e, 'Could not load the revenue forecast')))
      .finally(() => setLoading(false));
  }, [months]);

  useEffect(() => { load(); }, [load]);

  const cash = data?.cash_forecast ?? [];
  const mrr = data?.mrr_forecast ?? [];
  const lastCash = cash[cash.length - 1];
  const lastMrr = mrr[mrr.length - 1];

  return (
    <CcCard
      tone="green"
      eyebrow="Forward view"
      title="Revenue forecast"
      icon={<TrendingUp size={16} />}
      action={
        <div className="flex gap-1" role="group" aria-label="Forecast horizon">
          {HORIZONS.map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => setMonths(h)}
              aria-pressed={months === h}
              className="rounded-full px-2.5 py-1 text-[11px] font-[750]"
              style={{
                background: months === h ? 'var(--text-primary)' : 'var(--bg-subtle)',
                color: months === h ? 'var(--bg-canvas)' : 'var(--text-secondary)',
                border: '1px solid var(--border)',
              }}
            >
              {h}m
            </button>
          ))}
        </div>
      }
    >
      {loading && !data ? (
        <div className="flex items-center gap-2 py-8 text-[12px]" style={{ color: 'var(--text-muted)' }}>
          <Loader2 size={15} className="animate-spin" /> Fitting the trend…
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
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: 'MRR now', value: inrCompact(data.current.mrr_inr), sub: `${data.current.paying_studios} paying` },
              { label: 'ARR now', value: inrCompact(data.current.arr_inr), sub: 'run-rate' },
              { label: `Cash · ${data.horizon_months}m out`, value: lastCash ? inrCompact(lastCash.revenue_inr) : '—', sub: lastCash ? lastCash.label : 'insufficient history' },
              { label: `MRR · ${data.horizon_months}m out`, value: lastMrr ? inrCompact(lastMrr.mrr_inr) : '—', sub: lastMrr ? lastMrr.label : 'insufficient history' },
            ].map((s) => (
              <div key={s.label} className="min-w-0 rounded-[14px] px-3 py-2.5" style={{ background: 'var(--bg-subtle)' }}>
                <p className="truncate text-[9.5px] font-[800] uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
                <p className="mt-0.5 truncate text-[18px] font-[850] tabular-nums" style={{ color: 'var(--text-primary)' }}>{s.value}</p>
                <p className="truncate text-[10px]" style={{ color: 'var(--text-muted)' }}>{s.sub}</p>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse text-left">
              <caption className="sr-only">Projected cash collections and MRR for the next {data.horizon_months} months</caption>
              <thead>
                <tr className="text-[9.5px] font-[800] uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>
                  <th scope="col" className="py-1.5 pr-3">Month</th>
                  <th scope="col" className="py-1.5 pr-3 text-right">Cash</th>
                  <th scope="col" className="py-1.5 pr-3 text-right">Range</th>
                  <th scope="col" className="py-1.5 text-right">MRR</th>
                </tr>
              </thead>
              <tbody>
                {(cash.length ? cash : mrr).map((row, i) => {
                  const m = mrr[i];
                  const c = cash[i];
                  return (
                    <tr key={row.month} className="border-t text-[12px]" style={{ borderColor: 'var(--border)' }}>
                      <th scope="row" className="py-1.5 pr-3 font-[700]" style={{ color: 'var(--text-secondary)' }}>{row.label}</th>
                      <td className="py-1.5 pr-3 text-right tabular-nums font-[750]" style={{ color: 'var(--text-primary)' }}>{c ? inrCompact(c.revenue_inr) : '—'}</td>
                      <td className="py-1.5 pr-3 text-right tabular-nums text-[10.5px]" style={{ color: 'var(--text-muted)' }}>{c ? `${inrCompact(c.low_inr)}–${inrCompact(c.high_inr)}` : '—'}</td>
                      <td className="py-1.5 text-right tabular-nums font-[750]" style={{ color: 'var(--text-primary)' }}>{m ? inrCompact(m.mrr_inr) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-[10.5px]" style={{ color: 'var(--text-muted)' }}>
            <span className="inline-flex items-center gap-1">
              <Info size={11} />
              Cash: {data.cash_model.reason ? 'not enough history' : `least squares · R² ${data.cash_model.r2 ?? '—'} · ${data.cash_model.months_fitted} months`}
            </span>
            <span className="inline-flex items-center gap-1">
              <Info size={11} />
              MRR: {data.mrr_model.reason ? 'not enough history' : `net studio growth ${data.mrr_model.monthly_growth_pct}%/mo${data.mrr_model.clamped ? ` (clamped to ±${data.mrr_model.clamp_pct}%)` : ''}`}
            </span>
          </div>
          <p className="text-[10px]" style={{ color: 'var(--text-disabled)' }}>
            Projections are a scenario, not a promise. Annual plans land in one month, so the cash band is wide by design.
          </p>
        </div>
      )}
    </CcCard>
  );
}
