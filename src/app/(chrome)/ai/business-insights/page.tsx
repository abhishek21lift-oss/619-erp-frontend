'use client';

import { useState } from 'react';
import {
  BarChart3, Loader2, Sparkles, TrendingUp, TrendingDown, Minus,
  AlertCircle, AlertTriangle, RefreshCw, Info,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { AiBusinessInsights, AiBusinessRawData } from '@/lib/api';
import Guard from '@/components/Guard';
import { PageContainer, PageHero } from '@/components/ui';
import { PremiumBarChart } from '@/components/visualizations';
import { errorMessage } from '@/lib/forms/errors';

const PERIODS = [
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Last 90 days', value: '90d' },
  { label: 'Last 6 months', value: '180d' },
  { label: 'Last year', value: '365d' },
];

function TrendIcon({ direction }: { direction: string }) {
  if (direction === 'up' || direction === 'increasing') return <TrendingUp className="h-4 w-4 text-green-500" />;
  if (direction === 'down' || direction === 'decreasing') return <TrendingDown className="h-4 w-4 text-red-500" />;
  return <Minus className="h-4 w-4 text-gray-400" />;
}

/** Null is "no basis", never zero — a missing KPI renders as an em dash. */
function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n}`;
}

function pct(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  return `${n}%`;
}

export default function BusinessInsightsPage() {
  const [period, setPeriod] = useState('30d');
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<AiBusinessInsights | null>(null);
  const [raw, setRaw] = useState<AiBusinessRawData | null>(null);
  const [meta, setMeta] = useState<{ model?: string; tier?: string; used_fallback?: boolean } | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    setError('');
    setLoading(true);
    // A re-run keeps the previous results on screen while loading — wiping
    // good numbers for a spinner is how a slow model call reads as data loss.
    try {
      const days = parseInt(period, 10);
      const to = new Date();
      const from = new Date(to.getTime() - days * 86400 * 1000);
      const fmtDate = (d: Date) => d.toISOString().slice(0, 10);
      const res = await api.ai.businessInsights({ from: fmtDate(from), to: fmtDate(to) });
      setInsights(res.data);
      setRaw(res.raw_data ?? null);
      setMeta({ model: res.model, tier: res.tier, used_fallback: res.used_fallback });
      setUpdatedAt(new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }));
    } catch (e: unknown) {
      const msg = errorMessage(e, 'Failed to generate insights.');
      if (msg.includes('403') || msg.toLowerCase().includes('forbidden')) {
        setError('Business Insights is available to the studio trainer only.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const kpis = insights?.kpis;
  const periodLabel = PERIODS.find((p) => p.value === period)?.label ?? '';

  return (
    <Guard role="trainer">
      <PageContainer>

        <PageHero
          icon={<BarChart3 size={20} />}
          title="AI Business Insights"
          subtitle="AI-powered analysis of your studio's performance and growth opportunities"
        />

      <div className="mx-auto w-full max-w-4xl space-y-5">

        {/* Controls */}
        <div className="space-y-4 rounded-[20px] border border-gray-200 bg-white p-5" style={{ boxShadow: 'var(--shadow-xs)' }}>
          <div className="space-y-1">
            <span id="analysis-period-label" className="text-sm font-medium text-gray-800">Analysis Period</span>
            <div role="group" aria-labelledby="analysis-period-label" className="flex flex-wrap gap-2">
              {PERIODS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPeriod(p.value)}
                  aria-pressed={period === p.value}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${period === p.value ? 'bg-blue-600 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="flex-1">{error}</span>
              <button
                onClick={handleGenerate}
                className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-0.5 text-sm font-semibold text-red-700 hover:bg-red-100"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Retry
              </button>
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? 'Analysing…' : insights ? 'Regenerate Insights' : 'Generate Insights'}
          </button>
        </div>

        {/* First-run hint */}
        {!insights && !loading && !error && (
          <div className="flex items-start gap-2 rounded-[20px] border border-blue-100 bg-blue-50 p-5 text-sm text-blue-800">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            Pick a period above and generate — the studio's real collections, renewals and dues are analysed, and every verified number is shown beside the AI's reading of it.
          </div>
        )}

        {/* Loading skeleton — only when there is nothing to show yet */}
        {loading && !insights && (
          <div className="space-y-4" aria-label="Loading insights">
            <div className="h-24 animate-pulse rounded-[20px] bg-gray-100" />
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-24 animate-pulse rounded-[20px] bg-gray-100" />
              ))}
            </div>
          </div>
        )}

        {insights && (
          <div className="animate-in fade-in slide-in-from-bottom-4 space-y-5 duration-300">
            {/* Provenance + freshness */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
              {meta && (
                <span className="flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3" />
                  Generated by <code className="rounded bg-gray-100 px-1 text-gray-700">{meta.model}</code>
                  {meta.used_fallback && <span className="text-yellow-600">(fallback model)</span>}
                </span>
              )}
              {updatedAt && <span>· Updated {updatedAt}</span>}
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="flex items-center gap-1 rounded-lg px-2 py-0.5 font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>

            {/* AI-estimate disclaimer */}
            <div className="flex items-start gap-2 rounded-[20px] border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                The findings below are <strong>AI-generated estimates</strong> — direction and
                judgement, not audited figures. Check them against the verified studio
                actuals first. Trend magnitudes have no prior-period baseline behind them.
              </span>
            </div>

            {/* Executive summary */}
            {(insights.executive_summary || insights.summary) && (
              <div className="rounded-[20px] border border-gray-200 bg-white p-5" style={{ boxShadow: 'var(--shadow-xs)' }}>
                <h2 className="text-lg font-bold text-gray-900">Executive Summary</h2>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{insights.executive_summary || insights.summary}</p>
                {(insights.period || raw?.period) && (
                  <div className="mt-2 text-xs text-gray-400">
                    Period: <strong className="text-gray-700">
                      {raw?.period ? `${raw.period.from} → ${raw.period.to}` : insights.period}
                    </strong>
                  </div>
                )}
              </div>
            )}

            {/* KPIs — AI reading, null-safe */}
            {kpis && (
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {[
                  { label: 'Collections', sub: periodLabel, value: fmt(kpis.mrr), from: '#0271EB', to: '#0067E0' },
                  { label: 'Renewal rate', sub: 'expired cohort', value: pct(kpis.renewal_rate_pct), from: '#10B981', to: '#059669' },
                  { label: 'Utilisation', sub: 'this month', value: pct(kpis.avg_session_utilisation_pct), from: '#F59E0B', to: '#D97706' },
                  { label: 'Revenue / trainer', sub: 'period', value: fmt(kpis.revenue_per_trainer), from: '#3B8DF5', to: '#0271EB' },
                ].map((k) => (
                  <div
                    key={k.label}
                    className="relative overflow-hidden rounded-[20px] border border-gray-200 bg-white p-4"
                    style={{ boxShadow: 'var(--shadow-xs)' }}
                  >
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-x-0 top-0 h-[3px]"
                      style={{ background: `linear-gradient(90deg, ${k.from}, ${k.to})` }}
                    />
                    <div className="text-xl font-bold tracking-tight text-gray-900">{k.value}</div>
                    <div className="mt-1 text-xs font-semibold text-gray-700">{k.label}</div>
                    <div className="text-xs text-gray-400">{k.sub}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Studio actuals — verified SQL numbers, the fact half of the page */}
            {raw && (
              <div className="rounded-[20px] border border-emerald-200 bg-emerald-50 p-5">
                <h3 className="font-semibold text-emerald-800">Studio actuals <span className="ml-1 text-xs font-medium text-emerald-600">(verified, this period)</span></h3>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm lg:grid-cols-4">
                  {[
                    ['Collections', fmt(raw.revenue.total_revenue)],
                    ['Payments', String(raw.revenue.total_payments)],
                    ['Active members', String(raw.members.active_members)],
                    [`New (${periodLabel.toLowerCase()})`, String(raw.members.new_members_period)],
                    ['PT sessions', String(raw.sessions.total_sessions)],
                    ['Outstanding dues', fmt(raw.outstanding_dues.total_dues)],
                    ['Renewal rate', pct(raw.renewals.renewal_rate)],
                    ['Active share', pct(raw.renewals.active_share_pct)],
                  ].map(([term, val]) => (
                    <div key={term} className="rounded-xl bg-white px-3 py-2">
                      <dt className="text-xs text-gray-500">{term}</dt>
                      <dd className="text-sm font-bold text-gray-900">{val}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {/* Revenue by month — real series from raw_data */}
            {raw && raw.monthly_revenue.length > 0 && (
              <PremiumBarChart
                data={raw.monthly_revenue.map((m) => ({ month: m.month_name || `M${m.month_num}`, revenue: m.revenue }))}
                xKey="month"
                bars={[{ key: 'revenue', label: 'Collections', color: '#0067E0' }]}
                title="Collections by month"
                subtitle="Verified payment totals for the current year"
                formatValue={(v) => fmt(v)}
              />
            )}

            {/* Trends — AI estimates: direction + reading, magnitudes only with a baseline */}
            {insights.trends?.length ? (
              <div className="space-y-3 rounded-[20px] border border-gray-200 bg-white p-5" style={{ boxShadow: 'var(--shadow-xs)' }}>
                <h3 className="font-semibold text-gray-900">Trends <span className="ml-1 text-xs font-medium text-gray-400">(AI estimates)</span></h3>
                {insights.trends.map((t, i) => (
                  <div key={i} className="flex items-center gap-3 border-b border-gray-100 py-2 last:border-0">
                    <TrendIcon direction={t.direction} />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-800">{t.metric}</div>
                      <div className="text-xs text-gray-500">{t.insight}</div>
                    </div>
                    {Number.isFinite(t.change_pct) ? (
                      <span
                        title="AI estimate — no prior-period baseline was supplied"
                        className={`text-sm font-semibold ${t.direction === 'up' || t.direction === 'increasing' ? 'text-green-600' : t.direction === 'down' || t.direction === 'decreasing' ? 'text-red-600' : 'text-gray-400'}`}
                      >
                        ~{(t.change_pct as number) > 0 ? '+' : ''}{t.change_pct}%
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-gray-400" title="No prior-period baseline was supplied">no baseline</span>
                    )}
                  </div>
                ))}
              </div>
            ) : null}

            {insights.opportunities?.length ? (
              <div className="space-y-3 rounded-[20px] border border-green-200 bg-green-50 p-5">
                <h3 className="font-semibold text-green-700">Growth Opportunities</h3>
                {insights.opportunities.map((o, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700">{i + 1}</div>
                    <div>
                      <div className="text-sm font-medium text-green-800">{o.opportunity}</div>
                      <div className="mt-0.5 flex gap-4 text-xs text-gray-500">
                        <span>Impact: {o.estimated_impact || '—'}</span>
                        <span>Effort: {o.effort || '—'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {insights.risks?.length ? (
              <div className="rounded-[20px] border border-yellow-200 bg-yellow-50 p-5">
                <div className="flex items-center gap-2 font-semibold text-yellow-700">
                  <AlertTriangle className="h-4 w-4" />
                  Business Risks
                </div>
                {insights.risks.map((r, i) => (
                  <div key={i} className="border-b border-yellow-200 pb-3 pt-3 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-yellow-800">{r.risk}</span>
                      {r.severity && (
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${r.severity === 'high' ? 'bg-red-100 text-red-700' : r.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
                          {r.severity}
                        </span>
                      )}
                    </div>
                    {r.recommended_action && <p className="mt-1 text-xs text-yellow-700">{r.recommended_action}</p>}
                  </div>
                ))}
              </div>
            ) : null}

            {insights.recommendations?.length ? (
              <div className="space-y-3 rounded-[20px] border border-gray-200 bg-white p-5" style={{ boxShadow: 'var(--shadow-xs)' }}>
                <h3 className="font-semibold text-gray-900">Action Plan</h3>
                {insights.recommendations
                  .slice()
                  .sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999))
                  .map((r, i) => (
                  <div key={i} className="flex items-start gap-3 border-b border-gray-100 py-2 last:border-0">
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600/10 text-xs font-bold text-blue-700">{r.priority ?? '–'}</div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-800">{r.action}</div>
                      {r.rationale && <div className="mt-0.5 text-xs text-gray-500">{r.rationale}</div>}
                    </div>
                    {r.timeframe && <div className="shrink-0 text-xs text-gray-400">{r.timeframe}</div>}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </div>
      </PageContainer>
    </Guard>
  );
}
